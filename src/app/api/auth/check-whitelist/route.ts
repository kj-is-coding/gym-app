import { NextRequest, NextResponse } from 'next/server';
import { isEmailWhitelisted } from '@/lib/invite-operations';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const isWhitelisted = await isEmailWhitelisted(email);

    return NextResponse.json({ isWhitelisted });
  } catch (error) {
    console.error('Error checking whitelist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
