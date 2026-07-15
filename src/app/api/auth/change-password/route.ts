import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { comparePassword, hashPassword } from '@/lib/hash';

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 });
    }

    // Enforce Password Strength: Minimum 8 characters
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const userId = sessionCookie.value;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isCurrentValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json({ error: 'Invalid current password' }, { status: 400 });
    }

    // Prevent reuse of same password
    const isSame = await comparePassword(newPassword, user.passwordHash);
    if (isSame) {
      return NextResponse.json({ error: 'New password cannot be the same as your current password' }, { status: 400 });
    }

    // Hash and save new password
    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password reset endpoint error:', error);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
