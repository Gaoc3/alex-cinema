import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ROOM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISSUER = 'alex-cinema';
const AUDIENCE = 'alex-room-socket';

function getSigningKey() {
  const secret = process.env.SOCKET_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SOCKET_AUTH_SECRET must contain at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

function cleanDisplayName(value: string | null | undefined, guestId: string) {
  const cleaned = (value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return cleaned || `ضيف ${guestId.slice(0, 4)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as { roomId?: unknown } | null;
    const roomId = typeof body?.roomId === 'string' ? body.roomId : '';

    if (!ROOM_ID_PATTERN.test(roomId)) {
      return NextResponse.json({ error: 'معرّف الغرفة غير صالح' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true },
    });

    if (!room) {
      return NextResponse.json({ error: 'الغرفة غير موجودة' }, { status: 404 });
    }

    const user = await getAuthUser();
    const cookieGuestId = request.cookies.get('alex_guest_id')?.value || '';
    const guestId = ROOM_ID_PATTERN.test(cookieGuestId) ? cookieGuestId : randomUUID();
    const subject = user?.id || `guest:${guestId}`;
    const name = cleanDisplayName(user?.name, guestId);

    const token = await new SignJWT({
      roomId,
      userId: user?.id || null,
      name,
      guest: !user,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject(subject)
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(getSigningKey());

    const response = NextResponse.json(
      { token },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
    if (!user && cookieGuestId !== guestId) {
      response.cookies.set('alex_guest_id', guestId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
      });
    }
    return response;
  } catch (error) {
    console.error('[realtime/token] Failed to issue socket token:', error);
    return NextResponse.json({ error: 'تعذر بدء الاتصال المباشر' }, { status: 500 });
  }
}
