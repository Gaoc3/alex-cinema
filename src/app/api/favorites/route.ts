import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/getAuthUser';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    console.log('[API /api/favorites] authUser:', authUser);

    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' }
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

    const body = await req.json();
    const { mediaId, mediaType, title, posterPath } = body;

    // Check if it already exists
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_mediaId_mediaType: {
          userId: authUser.id,
          mediaId: String(mediaId),
          mediaType: String(mediaType),
        }
      }
    });

    if (existing) {
      // Remove favorite
      await prisma.favorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      // Add favorite
      await prisma.favorite.create({
        data: {
          userId: authUser.id,
          mediaId: String(mediaId),
          mediaType: String(mediaType),
          title: String(title),
          posterPath: posterPath ? String(posterPath) : null,
        }
      });
      return NextResponse.json({ success: true, action: 'added' });
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return NextResponse.json({ success: false, error: 'Failed to toggle favorite' }, { status: 500 });
  }
}
