import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/getAuthUser';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const { roomId, isPrivate } = body || {};

    if (!roomId || typeof roomId !== 'string') {
      return NextResponse.json({ success: false, error: 'معرف الغرفة مطلوب' }, { status: 400 });
    }

    if (typeof isPrivate !== 'boolean') {
      return NextResponse.json({ success: false, error: 'حالة الخصوصية غير صالحة' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ success: false, error: 'الغرفة غير موجودة' }, { status: 404 });
    }

    const authUser = await getAuthUser().catch(() => null);
    if (authUser && room.hostId && room.hostId !== authUser.id) {
      return NextResponse.json({ success: false, error: 'غير مصرح لك، المضيف فقط يمكنه تغيير الخصوصية' }, { status: 403 });
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: { isPrivate },
    });

    return NextResponse.json({ success: true, isPrivate: updatedRoom.isPrivate });
  } catch (error) {
    console.error('Error toggling room privacy via API:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ أثناء تعديل خصوصية الغرفة' }, { status: 500 });
  }
}
