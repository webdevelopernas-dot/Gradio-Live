import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Video, VideoOff, Maximize, Minimize, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StreamState } from '../types';
import { io, Socket } from 'socket.io-client';

interface PlayerProps {
  streamState: StreamState;
  currentShowTitle?: string;
  djName?: string;
}

const Player: React.FC<PlayerProps> = ({ streamState, currentShowTitle, djName }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [mode, setMode] = useState<'audio' | 'video'>(streamState.mode);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    setMode(streamState.mode);
  }, [streamState.mode]);

  useEffect(() => {
    if (streamState.isLive) {
      initWebRTC();
    } else {
      cleanupWebRTC();
    }

    return () => cleanupWebRTC();
  }, [streamState.isLive]);

  const initWebRTC = () => {
    socketRef.current = io();
    socketRef.current.emit('join-room', 'broadcast-room');

    socketRef.current.on('answer', async ({ from, answer }) => {
      console.log('Received answer from DJ:', from);
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socketRef.current.on('ice-candidate', async ({ from, candidate }) => {
      console.log('Received ICE candidate from DJ:', from);
      if (pcRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // Start connection by sending offer
    startConnection();
  };

  const startConnection = async () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      console.log('Received remote track');
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', { roomId: 'broadcast-room', candidate: event.candidate });
      }
    };

    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await pc.setLocalDescription(offer);
    socketRef.current?.emit('offer', { roomId: 'broadcast-room', offer });
  };

  const cleanupWebRTC = () => {
    pcRef.current?.close();
    pcRef.current = null;
    socketRef.current?.disconnect();
    socketRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (videoRef.current) {
      if (!isPlaying) videoRef.current.play().catch(console.error);
      else videoRef.current.pause();
    }
  };
  const toggleMute = () => setIsMuted(!isMuted);

  return (
    <div className="bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-zinc-800 shadow-2xl relative group transition-all duration-500 hover:border-zinc-700">
      {/* Video/Audio Display Area */}
      <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {mode === 'video' && streamState.isLive ? (
            <motion.div 
              key="video"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full h-full relative"
            >
              <video 
                ref={videoRef}
                className="w-full h-full object-cover"
                poster="https://picsum.photos/seed/radio/1280/720?blur=10"
                autoPlay
                playsInline
                muted={isMuted}
              />
              
              {/* Cinematic Overlays */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
                <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
                
                {/* CRT Scanline Effect */}
                <div className="absolute inset-0 overflow-hidden opacity-20">
                  <div className="w-full h-[2px] bg-white/10 absolute top-0 animate-[scanline_4s_linear_infinite]" />
                </div>
              </div>

              {/* Advanced UI Overlays */}
              <div className="absolute top-8 left-8 flex flex-col gap-3">
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="flex items-center gap-3"
                >
                  <div className="bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded flex items-center gap-1.5 shadow-lg shadow-red-600/40">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                  <div className="bg-black/60 backdrop-blur-xl px-4 py-1.5 rounded-xl border border-white/10 text-xs font-bold tracking-tight text-white shadow-2xl">
                    {currentShowTitle || "Live Broadcast"}
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg border border-white/5 text-[10px] font-medium text-zinc-300 w-fit"
                >
                  <div className="w-1 h-1 bg-green-500 rounded-full" />
                  HD STREAM • 60FPS
                </motion.div>
              </div>

              {/* Corner Accents */}
              <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-white/20 rounded-tr-xl pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-white/20 rounded-bl-xl pointer-events-none" />
            </motion.div>
          ) : (
            <motion.div 
              key="audio"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-12 text-center relative overflow-hidden"
            >
              {/* Dynamic Background */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full animate-[bounce_10s_infinite]" />
              </div>

              <div className="relative z-10">
                <motion.div 
                  animate={{ 
                    rotate: isPlaying ? 360 : 0,
                    scale: isPlaying ? [1, 1.02, 1] : 1
                  }}
                  transition={{ 
                    rotate: { repeat: Infinity, duration: 10, ease: "linear" },
                    scale: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                  }}
                  className="relative group/disc"
                >
                  <div className="absolute inset-0 bg-red-500/30 blur-3xl rounded-full opacity-0 group-hover/disc:opacity-100 transition-opacity duration-700" />
                  <div className="w-48 h-48 bg-zinc-900 rounded-full flex items-center justify-center border-8 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <img 
                      src={`https://picsum.photos/seed/${currentShowTitle || 'radio'}/400/400`} 
                      alt="Cover" 
                      className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
                      referrerPolicy="no-referrer"
                    />
                    <div className="w-12 h-12 bg-zinc-950 rounded-full border-4 border-zinc-800 z-10 flex items-center justify-center">
                      <div className="w-2 h-2 bg-zinc-800 rounded-full" />
                    </div>
                    {/* Vinyl Grooves */}
                    <div className="absolute inset-0 rounded-full border border-white/5 scale-90" />
                    <div className="absolute inset-0 rounded-full border border-white/5 scale-75" />
                    <div className="absolute inset-0 rounded-full border border-white/5 scale-50" />
                  </div>
                </motion.div>

                <div className="mt-10 space-y-3">
                  <motion.h2 
                    layout
                    className="text-4xl font-black tracking-tighter text-white"
                  >
                    {currentShowTitle || "Radio Stream"}
                  </motion.h2>
                  <motion.p 
                    layout
                    className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-xs"
                  >
                    {djName || "Studio DJ"}
                  </motion.p>
                </div>
                
                {/* Advanced Visualizer */}
                <div className="flex items-end justify-center gap-1.5 h-16 mt-12">
                  {[...Array(32)].map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ 
                        height: isPlaying ? [12, Math.random() * 60 + 10, 20, Math.random() * 50 + 15, 12] : 6,
                        backgroundColor: isPlaying ? ['#ef4444', '#f87171', '#ef4444'] : '#27272a'
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 0.4 + (i * 0.02), 
                        ease: "easeInOut" 
                      }}
                      className="w-1.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Status Badges */}
        <div className="absolute bottom-8 right-8 flex items-center gap-4 z-20">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2.5 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 text-xs font-bold shadow-2xl"
          >
            <Users className="w-4 h-4 text-red-500" />
            <span className="text-white">{streamState.viewerCount.toLocaleString()}</span>
          </motion.div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-8 bg-zinc-900/90 backdrop-blur-2xl border-t border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={togglePlay}
            className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center shadow-xl shadow-white/5 transition-all hover:shadow-white/10"
          >
            {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
          </motion.button>

          <div className="flex items-center gap-4 px-5 py-3 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
            <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={volume} 
              onChange={(e) => setVolume(parseInt(e.target.value))}
              className="w-32 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-950/50 p-1.5 rounded-2xl border border-zinc-800/50 backdrop-blur-md">
          <button 
            onClick={() => setMode('audio')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${mode === 'audio' ? 'bg-zinc-800 text-white shadow-xl border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Audio</span>
          </button>
          <button 
            onClick={() => setMode('video')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${mode === 'video' ? 'bg-zinc-800 text-white shadow-xl border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Video className="w-4 h-4" />
            <span>Video</span>
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline {
          from { top: 0; }
          to { top: 100%; }
        }
      `}} />
    </div>
  );
};

export default Player;
