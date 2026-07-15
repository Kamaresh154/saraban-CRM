import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { comparePassword } from '@/lib/hash';

// Fetch current session details
export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: sessionCookie.value },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        mustChangePassword: true,
        emailVerified: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Even if session is active, if email is not verified, restrict access
    if (!user.emailVerified) {
      return NextResponse.json({ authenticated: false, reason: 'EMAIL_UNVERIFIED' }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, user });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

// Login and Logout handler
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'logout') {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.delete('vd_session');
    return response;
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 1. Fetch User Record
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return generic error to prevent email enumeration attacks
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    // 2. Brute Force Lockout Check
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json({
        error: 'LOCKOUT',
        message: `Account temporarily locked due to repeated failed login attempts. Please try again in ${minutesLeft} minutes.`
      }, { status: 423 }); // 423 Locked
    }

    // 3. Password Cryptographic Validation
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed attempts
      const newAttempts = user.failedAttempts + 1;
      const shouldLock = newAttempts >= 5;
      const lockoutUntil = shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null; // 15 mins

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: newAttempts,
          lockoutUntil,
        },
      });

      if (shouldLock) {
        return NextResponse.json({
          error: 'LOCKOUT',
          message: 'Account locked for 15 minutes due to too many failed attempts.'
        }, { status: 423 });
      }

      const remaining = 5 - newAttempts;
      return NextResponse.json({
        error: 'INVALID_CREDENTIALS',
        message: `Invalid email or password. ${remaining} attempts remaining before account lockout.`
      }, { status: 401 });
    }

    // 4. Email Verification Check
    if (!user.emailVerified) {
      return NextResponse.json({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Your email address is not verified. Please verify your email before logging in.'
      }, { status: 403 });
    }

    // 5. Successful Login: Reset Lockout State
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockoutUntil: null,
      },
    });

    // 6. Set Session Cookie
    const response = NextResponse.json({
      success: true,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });

    response.cookies.set('vd_session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Authentication API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
