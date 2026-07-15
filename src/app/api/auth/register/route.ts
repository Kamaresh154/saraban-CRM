import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/hash';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    // 1. Password Strength Validation
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    // 2. Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    // 3. Hash password
    const hashed = await hashPassword(password);
    
    // 4. Generate verification token
    const token = `verify_${Buffer.from(Math.random().toString()).toString('base64')}_${Date.now()}`;

    // 5. Create user (unverified by default)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashed,
        role: 'MEMBER',
        emailVerified: false, // Unverified
        verificationToken: token,
      },
    });

    // 6. Return registration result & simulated token for local evaluation
    const verifyLink = `${req.nextUrl.origin}/api/auth/verify?token=${token}`;

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Verification token generated.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      verifyLink, // Expose for testing sandbox convenience
    });
  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json({ error: 'Registration failed due to server error' }, { status: 500 });
  }
}
