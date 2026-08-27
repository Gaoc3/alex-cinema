import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/getAuthUser';
import { getVideoDetails } from '@/lib/api';

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

    // Background auto-heal for any legacy favorites missing posterPath without blocking the HTTP response
    const missingPosters = favorites.filter(
      (fav) => (!fav.posterPath || fav.posterPath === 'null' || fav.posterPath === 'undefined') && fav.mediaId
    );

    if (missingPosters.length > 0) {
      Promise.allSettled(
        missingPosters.map(async (fav) => {
          try {
            const details = await getVideoDetails(fav.mediaId);
            if (details) {
              const healedPoster = details.img || details.imgThumb || details.imgMediumThumb || null;
              const healedTitle = details.ar_title || details.en_title || fav.title;
              if (healedPoster) {
                await prisma.favorite.update({
                  where: { id: fav.id },
                  data: { posterPath: healedPoster, title: healedTitle },
                });
              }
            }
          } catch {}
        })
      ).catch(() => {});
    }

    return NextResponse.json({ success: true, favorites });
  } catch (error) {
    console.error('Error fetching favorites:', error);
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
    let normalizedPoster = typeof posterPath === 'string' && posterPath.trim() !== 'null' && posterPath.trim() !== 'undefined'
      ? posterPath.trim().slice(0, 2048)
      : null;

    if (!normalizedMediaId || !normalizedType) {
      return NextResponse.json({ success: false, error: 'Invalid favorite data' }, { status: 400 });
    }

    // Auto-fetch details if title or poster is missing
    let finalTitle = normalizedTitle;
    if (!finalTitle || !normalizedPoster) {
      try {
        const details = await getVideoDetails(normalizedMediaId);
        if (details) {
          if (!finalTitle) finalTitle = details.ar_title || details.en_title || 'عمل فني';
          if (!normalizedPoster) normalizedPoster = details.img || details.imgThumb || details.imgMediumThumb || null;
        }
      } catch {}
    }

    if (!finalTitle) finalTitle = 'عمل فني';

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
            title: finalTitle,
            posterPath: normalizedPoster,
          },
          update: { title: finalTitle, posterPath: normalizedPoster },
        });
        return NextResponse.json({ success: true, action: 'added' });
      }

      await prisma.favorite.deleteMany({
        where: { userId: authUser.id, mediaId: normalizedMediaId, mediaType: normalizedType },
      });
      return NextResponse.json({ success: true, action: 'removed' });
    }

    // Backward-compatible toggle
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_mediaId_mediaType: {
          userId: authUser.id,
          mediaId: normalizedMediaId,
          mediaType: normalizedType,
        },
      },
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
          title: finalTitle,
          posterPath: normalizedPoster,
        },
        update: { title: finalTitle, posterPath: normalizedPoster },
      });
      return NextResponse.json({ success: true, action: 'added' });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json({ success: false, error: 'Failed to toggle favorite' }, { status: 500 });
  }
}
