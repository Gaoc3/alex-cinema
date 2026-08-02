import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/getAuthUser';
import { validateRoomTitle } from '@/lib/roomTitle';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const { roomId, title } = body || {};

    if (!roomId || typeof roomId !== 'string') {
      return NextResponse.json({ success: false, error: 'معرف الغرفة مطلوب' }, { status: 400 });
    }

    const titleResult = validateRoomTitle(title);
    if (titleResult.error) {
      return NextResponse.json({ success: false, error: titleResult.error }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ success: false, error: 'الغرفة غير موجودة' }, { status: 404 });
    }

    const authUser = await getAuthUser().catch(() => null);
    if (authUser && room.hostId && room.hostId !== authUser.id) {
      return NextResponse.json({ success: false, error: 'غير مصرح لك، المضيف فقط يمكنه تعديل العنوان' }, { status: 403 });
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: { title: titleResult.title },
    });

    return NextResponse.json({ success: true, title: updatedRoom.title });
  } catch (error) {
    console.error('Error updating room title via API:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ أثناء تعديل اسم الغرفة' }, { status: 500 });
  }
}
