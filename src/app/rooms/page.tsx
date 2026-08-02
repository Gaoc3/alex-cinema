import { getActiveRooms } from '@/app/actions/room.actions';
import RoomsListClient from '@/components/rooms/RoomsListClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RoomsPage() {
  const res = await getActiveRooms();
  const rooms = res.success && res.rooms ? res.rooms : [];
  const loadError = res.success ? null : (res.error || 'تعذر تحميل الغرف');

  return <RoomsListClient initialRooms={rooms} loadError={loadError} />;
}
