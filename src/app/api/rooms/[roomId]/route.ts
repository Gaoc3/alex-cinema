import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { prisma } from '@/lib/prisma';

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
