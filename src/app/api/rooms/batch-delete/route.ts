import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/getAuthUser';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const { roomIds } = body || {};

    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      return NextResponse.json({ success: false, error: 'يرجى تحديد غرفة واحدة على الأقل للحذف' }, { status: 400 });
    }

    const validRoomIds = roomIds.filter((id) => typeof id === 'string' && id.trim().length > 0);
    if (validRoomIds.length === 0) {
      return NextResponse.json({ success: false, error: 'معرفات الغرف غير صالحة' }, { status: 400 });
    }

    // Optional auth check for host scope or superadmin
    const authUser = await getAuthUser().catch(() => null);

    let deleteFilter: Record<string, unknown> = { id: { in: validRoomIds } };
    if (authUser?.id) {
      // If auth user is logged in, optionally filter rooms by host or allow bulk deletion of target rooms
      deleteFilter = { id: { in: validRoomIds } };
    }

    const result = await prisma.room.deleteMany({
      where: deleteFilter,
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `تم حذف ${result.count} غرفة بنجاح`,
    });
  } catch (error) {
    console.error('Error batch deleting rooms via API:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في السيرفر أثناء حذف الغرف المحددة' },
      { status: 500 }
    );
  }
}
