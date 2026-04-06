import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Real-time signaling and chat
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room: ${roomId}`);
    });

    // WebRTC Signaling
    socket.on("offer", ({ roomId, to, offer }) => {
      if (to) {
        io.to(to).emit("offer", { from: socket.id, offer });
      } else {
        socket.to(roomId).emit("offer", { from: socket.id, offer });
      }
    });

    socket.on("answer", ({ roomId, to, answer }) => {
      if (to) {
        io.to(to).emit("answer", { from: socket.id, answer });
      } else {
        socket.to(roomId).emit("answer", { from: socket.id, answer });
      }
    });

    socket.on("ice-candidate", ({ roomId, to, candidate }) => {
      if (to) {
        io.to(to).emit("ice-candidate", { from: socket.id, candidate });
      } else {
        socket.to(roomId).emit("ice-candidate", { from: socket.id, candidate });
      }
    });

    // Chat
    socket.on("send-message", ({ roomId, message, user }) => {
      io.to(roomId).emit("receive-message", {
        id: Date.now().toString(),
        text: message,
        user,
        timestamp: new Date().toISOString()
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
