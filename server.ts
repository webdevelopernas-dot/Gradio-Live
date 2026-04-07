import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";
import { createServer } from "http";
import { Server } from "socket.io";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  app.use(express.json());
  const PORT = 3000;

  // Socket.io stream handling
  io.on("connection", (socket) => {
    let inputStream: PassThrough | null = null;
    let ffmpegProcess: any = null;

    socket.on("start-rtmp", ({ rtmpUrl, rtmpKey, videoPreset }) => {
      inputStream = new PassThrough();
      
      const preset = {
        '720p30': { width: 1280, height: 720, fps: 30, bitrate: '2500k' },
        '1080p30': { width: 1920, height: 1080, fps: 30, bitrate: '4500k' },
        '1080p60': { width: 1920, height: 1080, fps: 60, bitrate: '6000k' },
      }[videoPreset as '720p30' | '1080p30' | '1080p60'] || { width: 1920, height: 1080, fps: 30, bitrate: '4500k' };

      // Robust handling: If inputs are swapped, fix them
      let actualUrl = rtmpUrl;
      let actualKey = rtmpKey;
      if (rtmpUrl.startsWith('FB-') && rtmpKey.startsWith('rtmps://')) {
          actualUrl = rtmpKey;
          actualKey = rtmpUrl;
      }
      
      // If the URL already contains the key, don't append it again
      if (actualUrl.endsWith(actualKey)) {
        actualKey = '';
      }
      
      ffmpegProcess = ffmpeg(inputStream)
        .inputFormat('webm')
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset veryfast',
          '-tune zerolatency',
          `-s ${preset.width}x${preset.height}`,
          `-r ${preset.fps}`,
          `-g ${preset.fps * 2}`,
          `-keyint_min ${preset.fps * 2}`,
          '-sc_threshold 0',
          '-pix_fmt yuv420p',
          `-b:v ${preset.bitrate}`,
          `-maxrate:v ${preset.bitrate}`,
          `-bufsize:v ${parseInt(preset.bitrate) * 2}k`,
          '-f flv'
        ])
        .output(`${actualUrl}${actualKey ? (actualUrl.endsWith('/') ? '' : '/') + actualKey : ''}`)
        .on('start', (cmd) => console.log('FFmpeg started:', cmd))
        .on('error', (err: Error) => {
          console.error('FFmpeg error:', err.message);
          // If available, log the stderr output
          if ((err as any).stderr) {
            console.error('FFmpeg stderr:', (err as any).stderr);
          }
          socket.emit('rtmp-error', err.message);
        })
        .run();
    });

    socket.on("stream-data", (data) => {
      if (inputStream) {
        inputStream.write(data);
      }
    });

    socket.on("stop-rtmp", () => {
      if (inputStream) {
        inputStream.end();
        inputStream = null;
      }
    });
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
