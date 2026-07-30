"use server";

import { prisma } from '@/lib/prisma';
import { syncUser } from './user.actions';
import { validateRoomTitle } from '@/lib/roomTitle';

const MAX_ROOMS_PER_USER = 25;
const INACTIVE_ROOM_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function createRoom(data: {
  title: string;
  movieId?: string;
  movieTitle?: string;
  moviePoster?: string;
  isPrivate?: boolean;
}) {
  try {
    const titleResult = validateRoomTitle(data.title);
    if (titleResult.error) return { success: false, error: titleResult.error };

    const userSync = await syncUser();
    if (!userSync.success || !userSync.user) {
      return { success: false, error: userSync.error || 'يجب تسجيل الدخول لإنشاء روم' };
    }

    const inactiveBefore = new Date(Date.now() - INACTIVE_ROOM_RETENTION_MS);
    const newRoom = await prisma.$transaction(async (tx) => {
      await tx.room.deleteMany({
        where: {
          hostId: userSync.user.id,
          isActive: false,
          updatedAt: { lt: inactiveBefore },
        },
      });

      const existingRoomCount = await tx.room.count({
        where: { hostId: userSync.user.id },
      });
      if (existingRoomCount >= MAX_ROOMS_PER_USER) return null;

      return tx.room.create({
        data: {
          title: titleResult.title,
          movieId: data.movieId?.trim().slice(0, 128),
          movieTitle: data.movieTitle?.trim().slice(0, 200),
          moviePoster: data.moviePoster?.trim().slice(0, 2048),
          isPrivate: data.isPrivate ?? false,
          isActive: false,
          hostId: userSync.user.id,
        },
      });
    }, { isolationLevel: 'Serializable' });

    if (!newRoom) {
      return { success: false, error: 'وصلت إلى الحد الأقصى المسموح للغرف' };
    }

    return { success: true, roomId: newRoom.id };
  } catch (error) {
    console.error("Error creating room:", error);
    return { success: false, error: 'حدث خطأ أثناء إنشاء الروم' };
  }
}

export async function getRoom(roomId: string) {
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        }
      }
    });

    if (!room) {
      return { success: false, error: 'الروم غير موجود' };
    }

    return { success: true, room };
  } catch (error) {
    console.error("Error fetching room:", error);
    return { success: false, error: 'حدث خطأ أثناء جلب الروم' };
  }
}

export async function updateRoomVideo(roomId: string, data: {
  movieId: string;
  movieTitle: string;
  moviePoster?: string;
}) {
  try {
    const userSync = await syncUser();
    if (!userSync.success || !userSync.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verify host
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.hostId !== userSync.user.id) {
      return { success: false, error: 'غير مصرح لك بتعديل الروم' };
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: {
        movieId: data.movieId.trim().slice(0, 128),
        movieTitle: data.movieTitle.trim().slice(0, 200),
        moviePoster: data.moviePoster?.trim().slice(0, 2048),
        currentEpisodeId: null,
        currentSeason: null,
        currentEpisode: null,
      }
    });

    return { success: true, room: updatedRoom };
  } catch (error) {
    console.error("Error updating room:", error);
    return { success: false, error: 'حدث خطأ أثناء تحديث الروم' };
  }
}

export async function toggleRoomPrivacy(roomId: string, isPrivate: boolean) {
  try {
    const userSync = await syncUser();
    if (!userSync.success || !userSync.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.hostId !== userSync.user.id) {
      return { success: false, error: 'غير مصرح لك بتعديل الروم' };
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: { isPrivate }
    });

    return { success: true, isPrivate: updatedRoom.isPrivate };
  } catch (error) {
    console.error("Error toggling privacy:", error);
    return { success: false, error: 'حدث خطأ أثناء تحديث الإعدادات' };
  }
}

export async function getActiveRooms() {
  try {
    const rooms = await prisma.room.findMany({
      where: {
        isPrivate: false,
        isActive: true,
        movieId: { not: null } // Only show rooms that actually selected a movie
      },
      include: {
        host: {
          select: {
            name: true,
            imageUrl: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 24 // Limit for safety
    });

    return { success: true, rooms };
  } catch (error) {
    console.error("Error fetching active rooms:", error);
    return { success: false, error: 'حدث خطأ أثناء جلب الرومات' };
  }
}

export async function getUserRooms() {
  try {
    const userSync = await syncUser();
    if (!userSync.success || !userSync.user) {
      return { success: false, error: 'يجب تسجيل الدخول لجلب روماتك' };
    }

    const rooms = await prisma.room.findMany({
      where: {
        hostId: userSync.user.id
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return { success: true, rooms };
  } catch (error) {
    console.error("Error fetching user rooms:", error);
    return { success: false, error: 'حدث خطأ أثناء جلب رومات المستخدم' };
  }
}

export async function deleteRoom(roomId: string) {
  try {
    const userSync = await syncUser();
    if (!userSync.success || !userSync.user) {
      return { success: false, error: 'يجب تسجيل الدخول لإجراء هذه العملية' };
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return { success: false, error: 'الروم غير موجود' };
    }

    if (room.hostId !== userSync.user.id) {
      return { success: false, error: 'غير مصرح لك بحذف هذا الروم' };
    }

    await prisma.room.delete({ where: { id: roomId } });

    return { success: true };
  } catch (error) {
    console.error("Error deleting room:", error);
    return { success: false, error: 'حدث خطأ أثناء حذف الروم' };
  }
}

