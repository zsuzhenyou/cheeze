const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const { Chess } = require("chess.js");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.get("/health", (_request, response) => {
  response.status(200).send("ok");
});

app.get("/api/reactions", (_request, response) => {
  const reactionRoot = path.join(__dirname, "public", "assets", "reactions");
  const getReactionFiles = (folder) => {
    try {
      return fs.readdirSync(path.join(reactionRoot, folder))
        .filter((fileName) => /\.(gif|mp4)$/i.test(fileName));
    } catch (_error) {
      return [];
    }
  };

  response.json({
    threatening: getReactionFiles("threatening"),
    underThreat: getReactionFiles("under-threat"),
  });
});

const rooms = {};

const TIME_PRESETS = { bullet: 1, rapid: 5, slow: 15 };

function normalizeTimeControl(value = {}) {
  const preset = value.preset;
  if (preset === "unlimited") return { preset: "unlimited", minutes: null, enabled: false };
  const minutes = preset === "custom" ? Number(value.minutes) : TIME_PRESETS[preset];
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 120) {
    return { preset: "unlimited", minutes: null, enabled: false };
  }
  return { preset, minutes: Math.round(minutes), enabled: true };
}

function createClock(timeControl) {
  const milliseconds = timeControl.enabled ? timeControl.minutes * 60 * 1000 : null;
  return { enabled: timeControl.enabled, white: milliseconds, black: milliseconds, active: "w", lastUpdated: null, timer: null };
}

function clearRoomClock(room) {
  if (room?.clock?.timer) clearTimeout(room.clock.timer);
  if (room?.clock) room.clock.timer = null;
}

function syncRoomClock(room) {
  if (!room.clock.enabled || !room.started || room.finished || !room.clock.lastUpdated) return false;
  const now = Date.now();
  const color = room.clock.active === "w" ? "white" : "black";
  room.clock[color] = Math.max(0, room.clock[color] - (now - room.clock.lastUpdated));
  room.clock.lastUpdated = now;
  return room.clock[color] === 0;
}

function clockSnapshot(room) {
  syncRoomClock(room);
  return {
    enabled: room.clock.enabled,
    white: room.clock.white,
    black: room.clock.black,
    active: room.clock.active,
  };
}

function endRoomOnTime(roomId) {
  const room = rooms[roomId];
  if (!room || room.finished) return;
  syncRoomClock(room);
  const timedOut = room.clock.active === "w" ? "white" : "black";
  if (room.clock[timedOut] > 0) {
    scheduleRoomClock(roomId);
    return;
  }
  room.finished = true;
  clearRoomClock(room);
  io.to(roomId).emit("gameOver", {
    message: `${timedOut === "white" ? "白方" : "黑方"}時間到`,
    reason: "timeout",
    clock: clockSnapshot(room),
  });
}

function scheduleRoomClock(roomId) {
  const room = rooms[roomId];
  if (!room || !room.clock.enabled || !room.started || room.finished) return;
  clearRoomClock(room);
  syncRoomClock(room);
  const activeColor = room.clock.active === "w" ? "white" : "black";
  room.clock.timer = setTimeout(() => endRoomOnTime(roomId), room.clock[activeColor] + 25);
}

function leaveRoom(socket) {
  const roomId = socket.roomId;
  const room = roomId && rooms[roomId];

  if (!room) return;

  clearRoomClock(room);

  socket.leave(roomId);
  socket.to(roomId).emit("opponentDisconnected");
  delete rooms[roomId];
  socket.roomId = null;
  socket.color = null;
}

io.on("connection", (socket) => {
  console.log("玩家已連線：", socket.id);

  socket.on("createRoom", (data, callback) => {
    if (typeof data === "function") {
      callback = data;
      data = {};
    }
    leaveRoom(socket);
    let roomId;

    do {
      roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (rooms[roomId]);

    rooms[roomId] = {
      chess: new Chess(),
      timeControl: normalizeTimeControl(data?.timeControl),
      clock: null,
      started: false,
      finished: false,
      players: {
        white: socket.id,
        black: null,
      },
    };
    rooms[roomId].clock = createClock(rooms[roomId].timeControl);

    socket.join(roomId);
    socket.roomId = roomId;
    socket.color = "white";

    callback({
      success: true,
      roomId,
      color: "white",
      fen: rooms[roomId].chess.fen(),
      timeControl: rooms[roomId].timeControl,
      clock: clockSnapshot(rooms[roomId]),
    });

    console.log(`房間 ${roomId} 已建立`);
  });

  socket.on("joinRoom", (roomId, callback) => {
    if (typeof roomId !== "string") {
      callback({ success: false, message: "房間 ID 格式錯誤" });
      return;
    }

    roomId = roomId.trim().toUpperCase();
    const room = rooms[roomId];

    if (!room) {
      callback({
        success: false,
        message: "找不到這個房間",
      });
      return;
    }

    if (room.players.black) {
      callback({
        success: false,
        message: "房間已經額滿",
      });
      return;
    }

    leaveRoom(socket);
    room.players.black = socket.id;

    socket.join(roomId);
    socket.roomId = roomId;
    socket.color = "black";

    callback({
      success: true,
      roomId,
      color: "black",
      fen: room.chess.fen(),
      timeControl: room.timeControl,
      clock: clockSnapshot(room),
    });

    room.started = true;
    room.clock.active = room.chess.turn();
    room.clock.lastUpdated = Date.now();
    scheduleRoomClock(roomId);

    io.to(roomId).emit("gameStarted", {
      fen: room.chess.fen(),
      timeControl: room.timeControl,
      clock: clockSnapshot(room),
    });

    console.log(`玩家加入房間 ${roomId}`);
  });

  socket.on("submitMove", (data, callback) => {
    const room = rooms[socket.roomId];

    if (!room) {
      callback({
        success: false,
        message: "你目前不在任何房間",
      });
      return;
    }

    if (room.finished) {
      callback({ success: false, message: "棋局已結束" });
      return;
    }

    if (syncRoomClock(room)) {
      endRoomOnTime(socket.roomId);
      callback({ success: false, message: "時間到" });
      return;
    }

    const currentTurn = room.chess.turn();
    const playerTurn = socket.color === "white" ? "w" : "b";

    if (currentTurn !== playerTurn) {
      callback({
        success: false,
        message: "現在不是你的回合",
      });
      return;
    }

    try {
      const move = room.chess.move({
        from: data.from,
        to: data.to,
        promotion: data.promotion || "q",
      });

      if (room.clock.enabled) {
        room.clock.active = room.chess.turn();
        room.clock.lastUpdated = Date.now();
        scheduleRoomClock(socket.roomId);
      }

      io.to(socket.roomId).emit("moveMade", {
        move,
        fen: room.chess.fen(),
        turn: room.chess.turn(),
        clock: clockSnapshot(room),
      });

      callback({
        success: true,
      });

      if (room.chess.isGameOver()) {
        room.finished = true;
        clearRoomClock(room);
        io.to(socket.roomId).emit("gameOver", {
          message: "棋局結束",
          clock: clockSnapshot(room),
        });
      }
    } catch (error) {
      callback({
        success: false,
        message: "不合法的棋步",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("玩家離線：", socket.id);
    leaveRoom(socket);
  });

  socket.on("leaveRoom", () => leaveRoom(socket));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`伺服器已啟動：http://localhost:${PORT}`);
});
