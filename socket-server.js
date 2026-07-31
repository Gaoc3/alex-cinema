/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const { Server } = require('socket.io');

try {
  if (typeof process.loadEnvFile === 'function') process.loadEnvFile('.env');
} catch {
  // PM2 may already provide the environment directly.
}

const PORT = Number(process.env.SOCKET_PORT) || 4000;
const HOST = process.env.SOCKET_HOST || '0.0.0.0';
const TRUST_PROXY = process.env.SOCKET_TRUST_PROXY === 'true';
const ROOM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISSUER = 'alex-cinema';
const AUDIENCE = 'alex-room-socket';
const MAX_MESSAGE_LENGTH = 1000;
const MAX_MESSAGE_BYTES = 4096;
const CHAT_WINDOW_MS = 60_000;
const CHAT_LIMIT_PER_WINDOW = 30;
const CHAT_DELETE_LIMIT_PER_WINDOW = 20;
const MAX_CONNECTIONS_PER_IDENTITY = 5;
const IP_CHAT_LIMIT_PER_WINDOW = 120;
const IP_CHAT_DELETE_LIMIT_PER_WINDOW = 80;
const MAX_CONNECTIONS_PER_IP = 50;
const MAX_MEMBERS_PER_ROOM = 200;
const MESSAGE_RETENTION_DAYS = 90;
const MAX_MESSAGES_PER_ROOM = 500;
const MESSAGE_PRUNE_INTERVAL = 25;

const prisma = new PrismaClient();
const rooms = new Map();
const chatRateLimits = new Map();
const chatDeleteRateLimits = new Map();
const roomMessageCounts = new Map();
const presenceUpdates = new Map();
let roomAuditTimer = null;
let rateLimitCleanupTimer = null;
let roomAuditRunning = false;

const configuredOrigin = process.env.APP_ORIGIN || 'https://cinax.live';
const allowedOrigins = new Set([
  configuredOrigin.replace(/\/$/, ''),
  'https://cinax.live',
  'https://www.cinax.live',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  try {
    return allowedOrigins.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

const server = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/healthz') {
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Not found');
});

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      callback(isAllowedOrigin(origin) ? null : new Error('Origin not allowed'), isAllowedOrigin(origin));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 16 * 1024,
  pingInterval: 25_000,
  pingTimeout: 20_000,
});

function getMembersArray(room) {
  return room ? Array.from(room.members.values()) : [];
}

function toISOString(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function cleanAvatarUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function toChatMessage(message, hostUserId, canDelete = false) {
  const isDeleted = Boolean(message.deletedAt);
  const replyIsDeleted = Boolean(message.replyTo?.deletedAt);
  return {
    id: message.id,
    senderId: message.senderId || null,
    sender: message.senderName,
    avatarUrl: cleanAvatarUrl(message.sender?.imageUrl),
    text: isDeleted ? '' : message.text,
    createdAt: toISOString(message.createdAt),
    isHost: Boolean(message.senderId && message.senderId === hostUserId),
    canDelete,
    isDeleted,
    deletedAt: toISOString(message.deletedAt),
    replyTo: message.replyTo
      ? {
        id: message.replyTo.id,
        sender: message.replyTo.senderName,
        text: replyIsDeleted ? '' : message.replyTo.text,
        isDeleted: replyIsDeleted,
      }
      : null,
  };
}

function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\r\n?/g, '\n')
    .trim();
}

function canSendChat(socket) {
  const now = Date.now();
  const consume = (key, limit) => {
    const recent = (chatRateLimits.get(key) || []).filter((time) => now - time < CHAT_WINDOW_MS);
    if (recent.length >= limit) {
      chatRateLimits.set(key, recent);
      return false;
    }
    recent.push(now);
    chatRateLimits.set(key, recent);
    return true;
  };
  return consume(socket.data.rateLimitKey, CHAT_LIMIT_PER_WINDOW)
    && consume(socket.data.ipRateLimitKey, IP_CHAT_LIMIT_PER_WINDOW);
}

function canDeleteChat(socket) {
  const now = Date.now();
  const consume = (key, limit) => {
    const recent = (chatDeleteRateLimits.get(key) || []).filter((time) => now - time < CHAT_WINDOW_MS);
    if (recent.length >= limit) {
      chatDeleteRateLimits.set(key, recent);
      return false;
    }
    recent.push(now);
    chatDeleteRateLimits.set(key, recent);
    return true;
  };
  return consume(socket.data.rateLimitKey, CHAT_DELETE_LIMIT_PER_WINDOW)
    && consume(socket.data.ipRateLimitKey, IP_CHAT_DELETE_LIMIT_PER_WINDOW);
}

function getClientAddress(socket) {
  const peerAddress = cleanText(socket.handshake.address || 'unknown').slice(0, 128);
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  const fromTrustedProxy = TRUST_PROXY
    || /^(?:127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)$/.test(peerAddress);
  return cleanText(fromTrustedProxy && firstForwarded ? firstForwarded : peerAddress).slice(0, 128);
}

function countConnectionsByKey(room, dataKey, value) {
  let count = 0;
  for (const socketId of room.members.keys()) {
    const memberSocket = io.sockets.sockets.get(socketId);
    if (memberSocket?.data[dataKey] === value) count += 1;
  }
  return count;
}

async function pruneRoomMessages(roomId) {
  const stale = await prisma.roomMessage.findMany({
    where: { roomId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: MAX_MESSAGES_PER_ROOM,
    take: 1_000,
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.roomMessage.deleteMany({ where: { id: { in: stale.map((message) => message.id) } } });
  }
}

async function closeInMemoryRoom(roomId) {
  if (!rooms.has(roomId)) return;
  io.to(roomId).emit('room_deleted');
  const socketsInRoom = await io.in(roomId).fetchSockets();
  for (const roomSocket of socketsInRoom) roomSocket.disconnect(true);
  rooms.delete(roomId);
  roomMessageCounts.delete(roomId);
}

async function auditLiveRooms() {
  if (roomAuditRunning || rooms.size === 0) return;
  roomAuditRunning = true;
  try {
    const liveIds = Array.from(rooms.keys());
    const existing = await prisma.room.findMany({
      where: { id: { in: liveIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((room) => room.id));
    for (const roomId of liveIds) {
      if (!existingIds.has(roomId)) await closeInMemoryRoom(roomId);
    }
  } catch (error) {
    console.error('Failed to audit live rooms:', error);
  } finally {
    roomAuditRunning = false;
  }
}

function queueRoomPresence(roomId, isActive) {
  const previous = presenceUpdates.get(roomId) || Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => prisma.room.updateMany({ where: { id: roomId }, data: { isActive } }))
    .catch((error) => {
      console.error(`Failed to set room ${roomId} presence:`, error);
    })
    .finally(() => {
      if (presenceUpdates.get(roomId) === next) presenceUpdates.delete(roomId);
    });
  presenceUpdates.set(roomId, next);
  return next;
}

function isRoomHost(socket, room) {
  return Boolean(socket.data.userId && socket.data.userId === room.hostUserId);
}

function canDeleteChatMessage(socket, room, message) {
  if (isRoomHost(socket, room)) return true;
  return Boolean(
    (socket.data.userId && message.senderId === socket.data.userId)
    || (socket.data.senderIdentity && message.senderIdentity === socket.data.senderIdentity),
  );
}

function emitChatMessageToRoom(room, message) {
  for (const socketId of room.members.keys()) {
    const roomSocket = io.sockets.sockets.get(socketId);
    if (!roomSocket) continue;
    roomSocket.emit(
      'chat_message',
      toChatMessage(message, room.hostUserId, canDeleteChatMessage(roomSocket, room, message)),
    );
  }
}

function safeAck(callback, payload) {
  if (typeof callback === 'function') callback(payload);
}

async function start() {
  const secret = process.env.SOCKET_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SOCKET_AUTH_SECRET must contain at least 32 characters');
  }

  const { jwtVerify } = await import('jose');
  const signingKey = new TextEncoder().encode(secret);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (typeof token !== 'string' || token.length > 4096) {
        return next(new Error('AUTH_REQUIRED'));
      }

      const { payload } = await jwtVerify(token, signingKey, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ['HS256'],
      });

      const roomId = typeof payload.roomId === 'string' ? payload.roomId : '';
      const userId = typeof payload.userId === 'string' ? payload.userId : null;
      if (!ROOM_ID_PATTERN.test(roomId)) return next(new Error('INVALID_ROOM'));

      const [room, user] = await Promise.all([
        prisma.room.findUnique({
          where: { id: roomId },
          select: {
            id: true,
            hostId: true,
            movieId: true,
            currentEpisodeId: true,
            currentSeason: true,
            currentEpisode: true,
          },
        }),
        userId
          ? prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, imageUrl: true } })
          : Promise.resolve(null),
      ]);

      if (!room) return next(new Error('ROOM_NOT_FOUND'));
      if (userId && !user) return next(new Error('AUTH_INVALID'));

      socket.data.roomId = room.id;
      socket.data.userId = user?.id || null;
      socket.data.name = cleanText(user?.name || payload.name).slice(0, 120) || 'مشاهد';
      socket.data.imageUrl = cleanAvatarUrl(user?.imageUrl);
      socket.data.roomRecord = room;
      const subject = typeof payload.sub === 'string' ? payload.sub.slice(0, 180) : '';
      if (!user && !subject.startsWith('guest:')) return next(new Error('AUTH_INVALID'));
      const identity = user?.id ? `user:${user.id}` : subject;
      const clientAddress = getClientAddress(socket);
      socket.data.senderIdentity = identity;
      socket.data.rateLimitKey = `${room.id}:${identity}`;
      socket.data.ipRateLimitKey = `${room.id}:ip:${clientAddress}`;
      return next();
    } catch (error) {
      const code = error && error.code === 'ERR_JWT_EXPIRED' ? 'AUTH_EXPIRED' : 'AUTH_INVALID';
      return next(new Error(code));
    }
  });

  io.on('connection', (socket) => {
    const roomId = socket.data.roomId;
    console.log(`Authenticated socket connected: ${socket.id} -> ${roomId}`);

    socket.on('join_room', async (payload, callback) => {
      try {
        if (socket.data.joinedRoom) {
          safeAck(callback, { ok: true });
          return;
        }
        if (!payload || payload.roomId !== roomId) {
          safeAck(callback, { ok: false, error: 'INVALID_ROOM' });
          return;
        }

        const roomRecord = await prisma.room.findUnique({
          where: { id: roomId },
          select: {
            id: true,
            hostId: true,
            movieId: true,
            currentEpisodeId: true,
            currentSeason: true,
            currentEpisode: true,
          },
        });
        if (!roomRecord) {
          socket.emit('room_deleted');
          socket.disconnect(true);
          return;
        }

        let room = rooms.get(roomId);
        if (!room) {
          room = {
            hostUserId: roomRecord.hostId,
            videoId: roomRecord.movieId,
            kind: null,
            season: roomRecord.currentSeason,
            episode: roomRecord.currentEpisode,
            episodeId: roomRecord.currentEpisodeId,
            state: { time: 0, playing: false, lastUpdated: Date.now() },
            members: new Map(),
          };
          rooms.set(roomId, room);
        } else {
          room.hostUserId = roomRecord.hostId;
          const databaseMediaChanged = room.videoId !== roomRecord.movieId;
          const databaseEpisodeChanged = room.episodeId !== roomRecord.currentEpisodeId;
          room.videoId = roomRecord.movieId;
          room.episodeId = roomRecord.currentEpisodeId;
          room.season = roomRecord.currentSeason;
          room.episode = roomRecord.currentEpisode;
          if (databaseMediaChanged) {
            room.state = { time: 0, playing: false, lastUpdated: Date.now() };
            io.to(roomId).emit('change_video', { videoId: room.videoId, episodeId: room.episodeId });
          } else if (databaseEpisodeChanged) {
            room.state = { time: 0, playing: false, lastUpdated: Date.now() };
            io.to(roomId).emit('change_episode', {
              episodeId: room.episodeId,
              season: room.season,
              episode: room.episode,
            });
          }
        }

        if (room.members.size >= MAX_MEMBERS_PER_ROOM) {
          safeAck(callback, { ok: false, error: 'الغرفة ممتلئة حالياً' });
          socket.disconnect(true);
          return;
        }

        const identityConnections = countConnectionsByKey(room, 'rateLimitKey', socket.data.rateLimitKey);
        const ipConnections = countConnectionsByKey(room, 'ipRateLimitKey', socket.data.ipRateLimitKey);
        if (identityConnections >= MAX_CONNECTIONS_PER_IDENTITY || ipConnections >= MAX_CONNECTIONS_PER_IP) {
          safeAck(callback, { ok: false, error: 'عدد الاتصالات من هذا الجهاز كبير جداً' });
          socket.disconnect(true);
          return;
        }

        socket.join(roomId);
        socket.data.joinedRoom = true;
        const isHost = isRoomHost(socket, room);
        room.members.set(socket.id, {
          id: socket.id,
          name: socket.data.name,
          avatarUrl: socket.data.imageUrl,
          isHost,
        });

        const hasConnectedHost = getMembersArray(room).some((member) => member.isHost);
        await queueRoomPresence(roomId, hasConnectedHost);

        socket.emit('room_state', {
          isHost,
          videoId: room.videoId,
          kind: room.kind,
          season: room.season,
          episode: room.episode,
          episodeId: room.episodeId,
          state: room.state,
          members: getMembersArray(room),
        });

        if (!roomMessageCounts.has(roomId)) {
          await pruneRoomMessages(roomId);
          roomMessageCounts.set(roomId, 0);
        }
        const history = await prisma.roomMessage.findMany({
          where: { roomId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 50,
          include: {
            sender: {
              select: { imageUrl: true },
            },
            replyTo: {
              select: { id: true, senderName: true, text: true, deletedAt: true },
            },
          },
        });
        socket.emit('chat_history', history.reverse().map((message) => (
          toChatMessage(message, room.hostUserId, canDeleteChatMessage(socket, room, message))
        )));
        io.to(roomId).emit('room_members', getMembersArray(room));
        safeAck(callback, { ok: true });
      } catch (error) {
        console.error('join_room failed:', error);
        safeAck(callback, { ok: false, error: 'JOIN_FAILED' });
      }
    });

    socket.on('chat_send', async (payload, callback) => {
      try {
        const room = rooms.get(roomId);
        if (!room || !socket.data.joinedRoom) {
          safeAck(callback, { ok: false, error: 'يجب دخول الغرفة أولاً' });
          return;
        }

        const text = cleanText(payload && payload.text);
        const clientMessageId = payload && (payload.clientMessageId || payload.clientNonce);
        const replyToId = payload && payload.replyToId;
        if (!text || text.length > MAX_MESSAGE_LENGTH || Buffer.byteLength(text, 'utf8') > MAX_MESSAGE_BYTES) {
          safeAck(callback, { ok: false, error: 'الرسالة فارغة أو طويلة جداً' });
          return;
        }
        if (typeof clientMessageId !== 'string' || !UUID_PATTERN.test(clientMessageId)) {
          safeAck(callback, { ok: false, error: 'تعذر إرسال الرسالة' });
          return;
        }
        if (replyToId != null && (typeof replyToId !== 'string' || !UUID_PATTERN.test(replyToId))) {
          safeAck(callback, { ok: false, error: 'الرسالة المشار إليها غير صالحة' });
          return;
        }
        if (!canSendChat(socket)) {
          safeAck(callback, { ok: false, error: 'أرسلت رسائل كثيرة، انتظر قليلاً' });
          return;
        }

        let savedMessage;
        try {
          savedMessage = await prisma.$transaction(async (transaction) => {
            if (replyToId) {
              const replyTargets = await transaction.$queryRaw`
                SELECT "id"
                FROM "RoomMessage"
                WHERE "id" = ${replyToId}
                  AND "roomId" = ${roomId}
                  AND "deletedAt" IS NULL
                FOR SHARE
              `;
              if (!Array.isArray(replyTargets) || replyTargets.length !== 1) {
                const error = new Error('Invalid reply target');
                error.code = 'INVALID_REPLY_TARGET';
                throw error;
              }
            }

            return transaction.roomMessage.create({
              data: {
                roomId,
                senderId: socket.data.userId,
                senderIdentity: socket.data.senderIdentity,
                senderName: socket.data.name,
                text,
                clientNonce: clientMessageId,
                replyToId: replyToId || null,
              },
              include: {
                sender: {
                  select: { imageUrl: true },
                },
                replyTo: {
                  select: { id: true, senderName: true, text: true, deletedAt: true },
                },
              },
            });
          });
        } catch (error) {
          if (error && error.code === 'INVALID_REPLY_TARGET') {
            safeAck(callback, { ok: false, error: 'الرسالة المشار إليها غير موجودة' });
            return;
          }
          if (error && error.code === 'P2002') {
            savedMessage = await prisma.roomMessage.findUnique({
              where: { roomId_clientNonce: { roomId, clientNonce: clientMessageId } },
              include: {
                sender: {
                  select: { imageUrl: true },
                },
                replyTo: {
                  select: { id: true, senderName: true, text: true, deletedAt: true },
                },
              },
            });
          } else {
            throw error;
          }
        }

        if (!savedMessage) throw new Error('Message persistence failed');
        const publicMessage = toChatMessage(savedMessage, room.hostUserId);
        emitChatMessageToRoom(room, savedMessage);
        safeAck(callback, { ok: true, id: publicMessage.id, clientMessageId });

        const savedCount = (roomMessageCounts.get(roomId) || 0) + 1;
        roomMessageCounts.set(roomId, savedCount);
        if (savedCount % MESSAGE_PRUNE_INTERVAL === 0) {
          void pruneRoomMessages(roomId).catch((error) => console.error('Message pruning failed:', error));
        }
      } catch (error) {
        console.error('chat_send failed:', error);
        safeAck(callback, { ok: false, error: 'تعذر حفظ الرسالة' });
      }
    });

    socket.on('chat_delete', async (payload, callback) => {
      try {
        const room = rooms.get(roomId);
        const messageId = payload && payload.messageId;
        if (!room || !socket.data.joinedRoom) {
          safeAck(callback, { ok: false, error: 'يجب دخول الغرفة أولاً' });
          return;
        }
        if (typeof messageId !== 'string' || !UUID_PATTERN.test(messageId)) {
          safeAck(callback, { ok: false, error: 'تعذر حذف الرسالة' });
          return;
        }
        if (!canDeleteChat(socket)) {
          safeAck(callback, { ok: false, error: 'طلبات حذف كثيرة، انتظر قليلاً' });
          return;
        }

        const message = await prisma.roomMessage.findFirst({
          where: { id: messageId, roomId },
          select: { senderId: true, senderIdentity: true, deletedAt: true },
        });
        if (!message) {
          safeAck(callback, { ok: false, error: 'الرسالة غير موجودة' });
          return;
        }

        if (!canDeleteChatMessage(socket, room, message)) {
          safeAck(callback, { ok: false, error: 'غير مصرح' });
          return;
        }

        if (message.deletedAt) {
          safeAck(callback, {
            ok: true,
            messageId,
            deletedAt: toISOString(message.deletedAt),
          });
          return;
        }

        const deletedAt = new Date();
        const deleteResult = await prisma.roomMessage.updateMany({
          where: { id: messageId, roomId, deletedAt: null },
          data: { deletedAt },
        });
        if (deleteResult.count !== 1) {
          const current = await prisma.roomMessage.findFirst({
            where: { id: messageId, roomId },
            select: { deletedAt: true },
          });
          if (!current?.deletedAt) throw new Error('Message deletion failed');
          safeAck(callback, {
            ok: true,
            messageId,
            deletedAt: toISOString(current.deletedAt),
          });
          return;
        }

        const publicDeletedAt = deletedAt.toISOString();
        io.to(roomId).emit('chat_message_deleted', { messageId, deletedAt: publicDeletedAt });
        safeAck(callback, { ok: true, messageId, deletedAt: publicDeletedAt });
      } catch (error) {
        console.error('chat_delete failed:', error);
        safeAck(callback, { ok: false, error: 'تعذر حذف الرسالة' });
      }
    });

    socket.on('sync_update', (payload) => {
      const room = rooms.get(roomId);
      const time = Number(payload && payload.time);
      const playing = payload && payload.playing;
      if (!room || !isRoomHost(socket, room) || !Number.isFinite(time) || time < 0 || time > 172_800 || typeof playing !== 'boolean') return;

      room.state = { time, playing, lastUpdated: Date.now() };
      socket.to(roomId).emit('sync_update', room.state);
    });

    socket.on('change_video', async (payload, callback) => {
      try {
        const room = rooms.get(roomId);
        const videoId = cleanText(payload && payload.videoId).slice(0, 128);
        if (!room || !isRoomHost(socket, room) || !videoId) {
          safeAck(callback, { ok: false, error: 'غير مصرح' });
          return;
        }

        const kind = cleanText(payload && payload.kind).slice(0, 16) || null;
        const updateResult = await prisma.room.updateMany({
          where: { id: roomId, hostId: socket.data.userId },
          data: {
            movieId: videoId,
            currentEpisodeId: null,
            currentSeason: null,
            currentEpisode: null,
          },
        });
        if (updateResult.count !== 1) throw new Error('Room no longer exists');

        room.videoId = videoId;
        room.kind = kind;
        room.season = null;
        room.episode = null;
        room.episodeId = null;
        room.state = { time: 0, playing: false, lastUpdated: Date.now() };

        io.to(roomId).emit('change_video', {
          videoId: room.videoId,
          kind: room.kind,
          season: room.season,
          episode: room.episode,
          episodeId: null,
        });
        safeAck(callback, { ok: true });
      } catch (error) {
        console.error('change_video failed:', error);
        safeAck(callback, { ok: false, error: 'تعذر تغيير المحتوى' });
      }
    });

    socket.on('change_episode', async (payload, callback) => {
      try {
        const room = rooms.get(roomId);
        const episodeId = cleanText(payload && payload.episodeId).slice(0, 128);
        if (!room || !isRoomHost(socket, room) || !episodeId) {
          safeAck(callback, { ok: false, error: 'غير مصرح' });
          return;
        }

        const season = cleanText(payload && payload.season).slice(0, 16) || null;
        const episode = cleanText(payload && payload.episode).slice(0, 16) || null;
        const updateResult = await prisma.room.updateMany({
          where: { id: roomId, hostId: socket.data.userId },
          data: {
            currentEpisodeId: episodeId,
            currentSeason: season,
            currentEpisode: episode,
          },
        });
        if (updateResult.count !== 1) throw new Error('Room no longer exists');

        room.episodeId = episodeId;
        room.season = season;
        room.episode = episode;
        room.state = { time: 0, playing: false, lastUpdated: Date.now() };
        io.to(roomId).emit('change_episode', {
          episodeId: room.episodeId,
          season: room.season,
          episode: room.episode,
        });
        safeAck(callback, { ok: true });
      } catch (error) {
        console.error('change_episode failed:', error);
        safeAck(callback, { ok: false, error: 'تعذر تغيير الحلقة' });
      }
    });

    socket.on('kick_user', (payload) => {
      const room = rooms.get(roomId);
      const targetSocketId = payload && payload.targetSocketId;
      if (!room || !isRoomHost(socket, room) || typeof targetSocketId !== 'string') return;
      if (!room.members.has(targetSocketId) || targetSocketId === socket.id) return;

      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (!targetSocket || isRoomHost(targetSocket, room)) return;
      targetSocket.emit('kicked');
      room.members.delete(targetSocketId);
      targetSocket.leave(roomId);
      setTimeout(() => targetSocket.disconnect(true), 250);
      io.to(roomId).emit('room_members', getMembersArray(room));
    });

    socket.on('delete_room', async (callback) => {
      const room = rooms.get(roomId);
      if (!room || !isRoomHost(socket, room)) {
        safeAck(callback, { ok: false, error: 'غير مصرح' });
        return;
      }

      safeAck(callback, { ok: true });
      await closeInMemoryRoom(roomId);
    });

    socket.on('disconnect', async () => {
      const room = rooms.get(roomId);
      if (!room || !room.members.has(socket.id)) return;

      room.members.delete(socket.id);
      io.to(roomId).emit('room_members', getMembersArray(room));

      if (isRoomHost(socket, room)) {
        const anotherHostIsPresent = Array.from(room.members.keys()).some((socketId) => {
          const candidate = io.sockets.sockets.get(socketId);
          return candidate && isRoomHost(candidate, room);
        });
        if (!anotherHostIsPresent) {
          room.state.playing = false;
          room.state.lastUpdated = Date.now();
          io.to(roomId).emit('host_left');
          io.to(roomId).emit('sync_update', room.state);
          await queueRoomPresence(roomId, false);
        }
      }

      if (room.members.size === 0) {
        rooms.delete(roomId);
        roomMessageCounts.delete(roomId);
        await queueRoomPresence(roomId, false);
      }
    });
  });

  const retentionCutoff = new Date(Date.now() - MESSAGE_RETENTION_DAYS * 24 * 60 * 60 * 1_000);
  await prisma.roomMessage.deleteMany({ where: { createdAt: { lt: retentionCutoff } } });
  await prisma.room.updateMany({ data: { isActive: false } });
  roomAuditTimer = setInterval(() => void auditLiveRooms(), 10_000);
  roomAuditTimer.unref?.();
  rateLimitCleanupTimer = setInterval(() => {
    const cutoff = Date.now() - CHAT_WINDOW_MS;
    for (const [key, timestamps] of chatRateLimits) {
      const recent = timestamps.filter((timestamp) => timestamp >= cutoff);
      if (recent.length === 0) chatRateLimits.delete(key);
      else chatRateLimits.set(key, recent);
    }
    for (const [key, timestamps] of chatDeleteRateLimits) {
      const recent = timestamps.filter((timestamp) => timestamp >= cutoff);
      if (recent.length === 0) chatDeleteRateLimits.delete(key);
      else chatDeleteRateLimits.set(key, recent);
    }
  }, CHAT_WINDOW_MS);
  rateLimitCleanupTimer.unref?.();
  server.listen(PORT, HOST, () => {
    console.log(`Authenticated Socket.io server running on ${HOST}:${PORT}`);
  });
}

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down socket server`);
  if (roomAuditTimer) clearInterval(roomAuditTimer);
  if (rateLimitCleanupTimer) clearInterval(rateLimitCleanupTimer);
  io.close();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

start().catch(async (error) => {
  console.error('Socket server failed to start:', error);
  await prisma.$disconnect();
  process.exit(1);
});
