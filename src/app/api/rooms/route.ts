import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/getAuthUser';
import { validateRoomTitle } from '@/lib/roomTitle';

const MAX_ROOMS_PER_USER = 25;
const INACTIVE_ROOM_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'بيانات الغرفة غير صالحة' }, { status: 400 });
    }

    const titleResult = validateRoomTitle(body.title);
    if (titleResult.error) {
      return NextResponse.json({ success: false, error: titleResult.error }, { status: 400 });
    }
    const movieTitle = typeof body.movieTitle === 'string' ? body.movieTitle.trim().slice(0, 200) : null;
    const moviePoster = typeof body.moviePoster === 'string' ? body.moviePoster.trim().slice(0, 2048) : null;
    const isPrivate = body.isPrivate === true;

    const inactiveBefore = new Date(Date.now() - INACTIVE_ROOM_RETENTION_MS);
    const newRoom = await prisma.$transaction(async (tx) => {
      await tx.room.deleteMany({
        where: {
          hostId: authUser.id,
          isActive: false,
          updatedAt: { lt: inactiveBefore },
        },
      });

      const existingRoomCount = await tx.room.count({
        where: { hostId: authUser.id },
      });
      if (existingRoomCount >= MAX_ROOMS_PER_USER) return null;

      return tx.room.create({
        data: {
          title: titleResult.title,
          movieTitle,
          moviePoster,
          isPrivate,
          isActive: false,
          hostId: authUser.id,
        },
      });
    }, { isolationLevel: 'Serializable' });

    if (!newRoom) {
      return NextResponse.json({ success: false, error: 'وصلت إلى الحد الأقصى المسموح للغرف' }, { status: 429 });
    }

    return NextResponse.json({ success: true, roomId: newRoom.id });
  } catch (error) {
    console.error("Error creating room via API:", error);
    return NextResponse.json({ success: false, error: 'حدث خطأ أثناء إنشاء الروم' }, { status: 500 });
  }
}
