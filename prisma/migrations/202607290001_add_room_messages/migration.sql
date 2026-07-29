-- Persist room chat and add indexes used by room/favorite listings.
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "currentEpisodeId" TEXT;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "currentSeason" TEXT;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "currentEpisode" TEXT;
ALTER TABLE "Room" ALTER COLUMN "isActive" SET DEFAULT false;

CREATE TABLE IF NOT EXISTS "RoomMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderName" VARCHAR(120) NOT NULL,
    "text" VARCHAR(1000) NOT NULL,
    "clientNonce" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RoomMessage_roomId_clientNonce_key"
ON "RoomMessage"("roomId", "clientNonce");

CREATE INDEX IF NOT EXISTS "RoomMessage_roomId_createdAt_idx"
ON "RoomMessage"("roomId", "createdAt");

CREATE INDEX IF NOT EXISTS "RoomMessage_createdAt_idx"
ON "RoomMessage"("createdAt");

CREATE INDEX IF NOT EXISTS "Room_hostId_updatedAt_idx"
ON "Room"("hostId", "updatedAt");

CREATE INDEX IF NOT EXISTS "Room_isActive_isPrivate_updatedAt_idx"
ON "Room"("isActive", "isPrivate", "updatedAt");

CREATE INDEX IF NOT EXISTS "Favorite_userId_createdAt_idx"
ON "Favorite"("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RoomMessage_roomId_fkey') THEN
    ALTER TABLE "RoomMessage"
    ADD CONSTRAINT "RoomMessage_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "Room"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RoomMessage_senderId_fkey') THEN
    ALTER TABLE "RoomMessage"
    ADD CONSTRAINT "RoomMessage_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
