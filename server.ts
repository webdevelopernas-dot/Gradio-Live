import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.post("/api/stream/rtmp", (req, res) => {
    const { rtmpUrl, rtmpKey } = req.body;
    
    // This is a placeholder for the RTMP bridge logic.
    // In a real production environment, you would pipe the WebRTC stream
    // to this endpoint and use ffmpeg to push it to the RTMP URL.
    console.log(`Starting RTMP stream to: ${rtmpUrl}/${rtmpKey}`);
    
    res.json({ status: "streaming" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
