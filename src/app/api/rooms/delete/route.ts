import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/getAuthUser';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const { roomId } = body || {};

    if (!roomId || typeof roomId !== 'string') {
      return NextResponse.json({ success: false, error: 'معرف الغرفة مطلوب' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ success: false, error: 'الغرفة غير موجودة' }, { status: 404 });
    }

    const authUser = await getAuthUser().catch(() => null);
    if (authUser && room.hostId && room.hostId !== authUser.id) {
      return NextResponse.json({ success: false, error: 'غير مصرح لك، المضيف فقط يمكنه إغلاق الغرفة' }, { status: 403 });
    }

    await prisma.room.delete({ where: { id: roomId } }).catch(() => null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting room via API:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ أثناء إغلاق الغرفة' }, { status: 500 });
  }
}
