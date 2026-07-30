-- Persist reply relationships and soft-deletion tombstones for room chat.
ALTER TABLE "RoomMessage"
ADD COLUMN IF NOT EXISTS "senderIdentity" VARCHAR(180),
ADD COLUMN IF NOT EXISTS "replyToId" TEXT,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ(3);

CREATE INDEX IF NOT EXISTS "RoomMessage_roomId_replyToId_idx"
ON "RoomMessage"("roomId", "replyToId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'RoomMessage_replyToId_fkey'
  ) THEN
    ALTER TABLE "RoomMessage"
    ADD CONSTRAINT "RoomMessage_replyToId_fkey"
    FOREIGN KEY ("replyToId") REFERENCES "RoomMessage"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
