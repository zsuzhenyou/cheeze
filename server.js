const express = require("express");
const http = require("http");
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

const rooms = {};

function leaveRoom(socket) {
  const roomId = socket.roomId;
  const room = roomId && rooms[roomId];

  if (!room) return;

  socket.leave(roomId);
  socket.to(roomId).emit("opponentDisconnected");
  delete rooms[roomId];
  socket.roomId = null;
  socket.color = null;
}

io.on("connection", (socket) => {
  console.log("玩家已連線：", socket.id);

  socket.on("createRoom", (callback) => {
    leaveRoom(socket);
    let roomId;

    do {
      roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (rooms[roomId]);

    rooms[roomId] = {
      chess: new Chess(),
      players: {
        white: socket.id,
        black: null,
      },
    };

    socket.join(roomId);
    socket.roomId = roomId;
    socket.color = "white";

    callback({
      success: true,
      roomId,
      color: "white",
      fen: rooms[roomId].chess.fen(),
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
    });

    io.to(roomId).emit("gameStarted", {
      fen: room.chess.fen(),
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

      io.to(socket.roomId).emit("moveMade", {
        move,
        fen: room.chess.fen(),
        turn: room.chess.turn(),
      });

      callback({
        success: true,
      });

      if (room.chess.isGameOver()) {
        io.to(socket.roomId).emit("gameOver", {
          message: "棋局結束",
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
