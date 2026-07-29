import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/getAuthUser';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const mediaIdParam = req.nextUrl.searchParams.get('mediaId');
    const mediaTypeParam = req.nextUrl.searchParams.get('mediaType');

    if (mediaIdParam !== null || mediaTypeParam !== null) {
      const mediaId = mediaIdParam?.trim() || '';
      const mediaType = mediaTypeParam === 'movie' || mediaTypeParam === 'tv' ? mediaTypeParam : '';
      if (!mediaId || mediaId.length > 128 || !mediaType) {
        return NextResponse.json({ success: false, error: 'Invalid favorite query' }, { status: 400 });
      }

      const favorite = await prisma.favorite.findUnique({
        where: {
          userId_mediaId_mediaType: {
            userId: authUser.id,
            mediaId,
            mediaType,
          },
        },
        select: { id: true },
      });

      return NextResponse.json({ success: true, isFavorite: Boolean(favorite) });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, favorites });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json({ success: false, error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid favorite data' }, { status: 400 });
    }
    const { mediaId, mediaType, title, posterPath, isFavorite } = body;
    const normalizedMediaId = typeof mediaId === 'string' || typeof mediaId === 'number'
      ? String(mediaId).trim().slice(0, 128)
      : '';
    const normalizedType = mediaType === 'movie' || mediaType === 'tv' ? mediaType : '';
    const normalizedTitle = typeof title === 'string' ? title.trim().slice(0, 300) : '';
    const normalizedPoster = typeof posterPath === 'string' ? posterPath.trim().slice(0, 2048) : null;

    if (!normalizedMediaId || !normalizedType || !normalizedTitle) {
      return NextResponse.json({ success: false, error: 'Invalid favorite data' }, { status: 400 });
    }

    if (typeof isFavorite === 'boolean') {
      if (isFavorite) {
        await prisma.favorite.upsert({
          where: {
            userId_mediaId_mediaType: {
              userId: authUser.id,
              mediaId: normalizedMediaId,
              mediaType: normalizedType,
            },
          },
          create: {
            userId: authUser.id,
            mediaId: normalizedMediaId,
            mediaType: normalizedType,
            title: normalizedTitle,
            posterPath: normalizedPoster,
          },
          update: { title: normalizedTitle, posterPath: normalizedPoster },
        });
        return NextResponse.json({ success: true, action: 'added' });
      }

      await prisma.favorite.deleteMany({
        where: { userId: authUser.id, mediaId: normalizedMediaId, mediaType: normalizedType },
      });
      return NextResponse.json({ success: true, action: 'removed' });
    }

    // Backward-compatible toggle for older clients.
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_mediaId_mediaType: {
          userId: authUser.id,
          mediaId: normalizedMediaId,
          mediaType: normalizedType,
        }
      }
    });

    if (existing) {
      await prisma.favorite.deleteMany({ where: { id: existing.id, userId: authUser.id } });
      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      await prisma.favorite.upsert({
        where: {
          userId_mediaId_mediaType: {
            userId: authUser.id,
            mediaId: normalizedMediaId,
            mediaType: normalizedType,
          },
        },
        create: {
          userId: authUser.id,
          mediaId: normalizedMediaId,
          mediaType: normalizedType,
          title: normalizedTitle,
          posterPath: normalizedPoster,
        },
        update: { title: normalizedTitle, posterPath: normalizedPoster },
      });
      return NextResponse.json({ success: true, action: 'added' });
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return NextResponse.json({ success: false, error: 'Failed to toggle favorite' }, { status: 500 });
  }
}
