export const DEFAULT_ROOM_TITLE = 'روم مشاهدة جماعية';
export const MAX_ROOM_TITLE_LENGTH = 60;

export function normalizeRoomTitle(value: unknown) {
  if (typeof value !== 'string') return '';

  return value
    // Strip control and invisible formatting characters so a room title can
    // never look empty or disguise its visual direction.
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateRoomTitle(value: unknown): { title: string; error?: string } {
  const title = normalizeRoomTitle(value);
  if (!title) return { title: DEFAULT_ROOM_TITLE };
  if (title.length > MAX_ROOM_TITLE_LENGTH) {
    return { title: '', error: `يجب ألا يتجاوز اسم الغرفة ${MAX_ROOM_TITLE_LENGTH} حرفًا` };
  }
  return { title };
}
