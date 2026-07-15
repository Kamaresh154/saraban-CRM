import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${req.nextUrl.origin}/?verify=error&message=Missing_token`);
  }

  try {
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return NextResponse.redirect(`${req.nextUrl.origin}/?verify=error&message=Invalid_or_expired_token`);
    }

    // Verify User Email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    return NextResponse.redirect(`${req.nextUrl.origin}/?verify=success`);
  } catch (error) {
    console.error('Email verification callback error:', error);
    return NextResponse.redirect(`${req.nextUrl.origin}/?verify=error&message=Server_error`);
  }
}
