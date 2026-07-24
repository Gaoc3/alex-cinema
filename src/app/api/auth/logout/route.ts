import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('telegram_session');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /api/auth/logout Error]:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
