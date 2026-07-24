const { Server } = require("socket.io");
const http = require("http");

// Use port 4000 for the socket server
const PORT = process.env.SOCKET_PORT || 4000;

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to your domain
    methods: ["GET", "POST"]
  }
});

// In-memory store for rooms
const rooms = {};

// Helper to get members array
function getMembersArray(roomId) {
  if (!rooms[roomId] || !rooms[roomId].members) return [];
  return Object.values(rooms[roomId].members);
}

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create or Join Room
  socket.on("join_room", ({ roomId, isHost, videoId, kind, season, episode, username }) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      // Create new room state
      rooms[roomId] = {
        hostId: isHost ? socket.id : null,
        videoId: videoId,
        kind: kind,
        season: season,
        episode: episode,
        state: {
          time: 0,
          playing: false,
          lastUpdated: Date.now()
        },
        members: {} // Use object for easy lookup: { socketId: { id, name, isHost } }
      };
    }

    // If a user claims to be host and there's no host yet, assign them
    if (isHost && !rooms[roomId].hostId) {
      rooms[roomId].hostId = socket.id;
    }

    const isUserHost = rooms[roomId].hostId === socket.id;

    // Add member
    rooms[roomId].members[socket.id] = {
      id: socket.id,
      name: username || `مشاهد ${Math.floor(Math.random() * 1000)}`,
      isHost: isUserHost
    };

    // Send the current state of the room to the joined user
    socket.emit("room_state", {
      isHost: isUserHost,
      videoId: rooms[roomId].videoId,
      kind: rooms[roomId].kind,
      season: rooms[roomId].season,
      episode: rooms[roomId].episode,
      state: rooms[roomId].state,
      members: getMembersArray(roomId)
    });

    // Broadcast updated members list
    io.to(roomId).emit("room_members", getMembersArray(roomId));
    
    console.log(`User ${socket.id} (${username}) joined room ${roomId}. Host: ${rooms[roomId].hostId}`);
  });

  // Host sends sync update
  socket.on("sync_update", ({ roomId, time, playing }) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
      room.state = {
        time: time,
        playing: playing,
        lastUpdated: Date.now()
      };
      // Broadcast to all other users in the room
      socket.to(roomId).emit("sync_update", room.state);
    }
  });

  // Host changes the video (Lobby selection)
  socket.on("change_video", ({ roomId, videoId, kind, season, episode }) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
      room.videoId = videoId;
      room.kind = kind;
      room.season = season;
      room.episode = episode;
      room.state = { time: 0, playing: false, lastUpdated: Date.now() };

      // Broadcast new video to all users in the room
      io.to(roomId).emit("change_video", { videoId, kind, season, episode });
    }
  });

  // Host kicks a user
  socket.on("kick_user", ({ roomId, targetSocketId }) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
      if (room.members[targetSocketId]) {
        // Prevent kicking the host
        if (targetSocketId === room.hostId) return;

        // Emit kicked event to the specific user
        io.to(targetSocketId).emit("kicked");
        
        // Disconnect their socket forcefully from server side
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.leave(roomId);
          // Wait briefly before disconnect to ensure message is received
          setTimeout(() => targetSocket.disconnect(true), 500); 
        }

        // Remove from members
        delete room.members[targetSocketId];
        
        // Broadcast updated list
        io.to(roomId).emit("room_members", getMembersArray(roomId));
        console.log(`User ${targetSocketId} was kicked from room ${roomId} by host`);
      }
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Find rooms this user was in
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.members[socket.id]) {
        delete room.members[socket.id];
        
        // Broadcast updated list
        socket.to(roomId).emit("room_members", getMembersArray(roomId));

        if (room.hostId === socket.id) {
          // Host left! Pause the room for everyone
          room.state.playing = false;
          socket.to(roomId).emit("host_left");
          socket.to(roomId).emit("sync_update", room.state);
        }

        // Clean up empty rooms
        if (Object.keys(room.members).length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted (empty)`);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Socket.io Server running on port ${PORT}`);
});
