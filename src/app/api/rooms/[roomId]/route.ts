import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { prisma } from '@/lib/prisma';
import { getVideoDetails, getSeriesSeasons, getSeriesEpisodes } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'معرف الغرفة مطلوب' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ success: false, error: 'الغرفة غير موجودة' }, { status: 404 });
    }

    const authUser = await getAuthUser().catch(() => null);
    const currentUserId = authUser?.id || null;
    const isHostUser = Boolean(currentUserId && currentUserId === room.hostId);

    let video: any = null;
    let seasons: any[] = [];
    let episodes: any[] = [];

    if (room.movieId) {
      video = await getVideoDetails(room.movieId).catch(() => null);
      if (video) {
        video.ar_title = video.ar_title || video.en_title || room.movieTitle || 'عمل سينمائي';
        if (video.kind === '2' || video.seriesId) {
          const targetSeriesId = String(video.seriesId || video.fatherId || room.movieId);
          const [s, e] = await Promise.allSettled([
            getSeriesSeasons(targetSeriesId),
            getSeriesEpisodes(targetSeriesId),
          ]);
          if (s.status === 'fulfilled' && Array.isArray(s.value)) seasons = s.value;
          if (e.status === 'fulfilled' && Array.isArray(e.value)) episodes = e.value;
        }
      } else {
        video = {
          nb: room.movieId,
          ar_title: room.movieTitle || 'عمل سينمائي',
          en_title: room.movieTitle || 'Movie',
          kind: room.kind || '1',
        };
      }
    }

    return NextResponse.json({
      success: true,
      room,
      currentUserId,
      isHostUser,
      video,
      seasons,
      episodes,
    });
  } catch (error) {
    console.error('Error fetching room via API:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء جلب بيانات الغرفة' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    }

    if (room.hostId !== authUser.id) {
      return NextResponse.json({ success: false, error: 'Forbidden: Only host can delete room' }, { status: 403 });
    }

    await prisma.room.delete({ where: { id: roomId } });

    return NextResponse.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    console.error("Error deleting room API:", error);
    return NextResponse.json({ success: false, error: 'Failed to delete room' }, { status: 500 });
  }
}
