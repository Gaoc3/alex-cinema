import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/getAuthUser';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const body = await req.json();
    const { title, movieTitle, moviePoster, isPublic } = body;

    const newRoom = await prisma.room.create({
      data: {
        title: title || 'روم مشاهدة جماعية',
        movieTitle,
        moviePoster,
        isPrivate: isPublic !== undefined ? !isPublic : false,
        hostId: authUser.id,
      }
    });

    return NextResponse.json({ success: true, roomId: newRoom.id });
  } catch (error) {
    console.error("Error creating room via API:", error);
    return NextResponse.json({ success: false, error: 'حدث خطأ أثناء إنشاء الروم' }, { status: 500 });
  }
}
