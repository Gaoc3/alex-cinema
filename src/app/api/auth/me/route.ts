import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
};

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { headers: noStoreHeaders }
      );
    }

    const telegramId = user.clerkId.startsWith('telegram_')
      ? user.clerkId.slice('telegram_'.length)
      : null;

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        clerkId: user.clerkId,
        name: user.name,
        imageUrl: user.imageUrl,
        authProvider: telegramId ? 'telegram' : 'clerk',
        telegramId,
      },
    }, { headers: noStoreHeaders });
  } catch (error) {
    console.error('[API /api/auth/me Error]:', error);
    return NextResponse.json(
      { authenticated: false, user: null, error: 'تعذر التحقق من الجلسة.' },
      { status: 503, headers: noStoreHeaders }
    );
  }
}
