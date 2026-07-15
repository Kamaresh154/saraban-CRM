import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getBaseUrl } from '@/lib/baseUrl';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${getBaseUrl(req)}/?verify=error&message=Missing_token`);
  }

  try {
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return NextResponse.redirect(`${getBaseUrl(req)}/?verify=error&message=Invalid_or_expired_token`);
    }

    // Verify User Email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    return NextResponse.redirect(`${getBaseUrl(req)}/?verify=success`);
  } catch (error) {
    console.error('Email verification callback error:', error);
    return NextResponse.redirect(`${getBaseUrl(req)}/?verify=error&message=Server_error`);
  }
}


