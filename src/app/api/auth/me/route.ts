import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        clerkId: user.clerkId,
        name: user.name,
        imageUrl: user.imageUrl,
      },
    });
  } catch (error: any) {
    console.error('[API /api/auth/me Error]:', error);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
