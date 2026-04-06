import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Timeslot, StreamState } from '../types';
import { Mic, MicOff, Video, VideoOff, Play, Square, Settings, Users, Radio } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { motion } from 'motion/react';

const DJPanel = () => {
  const { user, profile } = useAuth();
  const [mySlots, setMySlots] = useState<Timeslot[]>([]);
  const [currentSlot, setCurrentSlot] = useState<Timeslot | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [streamMode, setStreamMode] = useState<'audio' | 'video'>('audio');
  const [streamSource, setStreamSource] = useState<'camera' | 'file'>('camera');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const fileVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnections = useRef<{ [socketId: string]: RTCPeerConnection }>({});

  useEffect(() => {
    if (!user) return;

    // Fetch DJ's timeslots
    const q = query(collection(db, 'timeslots'), where('djId', '==', user.uid));
    const unsubSlots = onSnapshot(q, (snapshot) => {
      setMySlots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Timeslot[]);
    });

    // Listen for current stream state
    const unsubStream = onSnapshot(doc(db, 'system', 'stream'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as StreamState;
        setIsLive(data.isLive);
        setViewerCount(data.viewerCount);
      }
    });

    // Socket.io initialization
    socketRef.current = io();
    socketRef.current.emit('join-room', 'broadcast-room');

    // Handle WebRTC signaling from viewers
    socketRef.current.on('offer', async ({ from, offer }) => {
      console.log('Received offer from:', from);
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit('answer', { roomId: 'broadcast-room', to: from, answer });
    });

    socketRef.current.on('ice-candidate', async ({ from, candidate }) => {
      console.log('Received ICE candidate from:', from);
      const pc = peerConnections.current[from];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
    return () => {
      unsubSlots();
      unsubStream();
      socketRef.current?.disconnect();
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, [user]);

  const createPeerConnection = (socketId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnections.current[socketId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', { roomId: 'broadcast-room', to: socketId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        delete peerConnections.current[socketId];
      }
    };
    return pc;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (fileVideoRef.current) {
        fileVideoRef.current.src = URL.createObjectURL(file);
      }
    }
  };

  const startBroadcast = async () => {
    try {
      setError(null);
      let stream: MediaStream;

      if (streamSource === 'camera') {
        stream = await navigator.mediaDevices.getUserMedia({
          video: streamMode === 'video',
          audio: true
        });
      } else {
        if (!selectedFile) {
          setError("Please select a video file first.");
          return;
        }
        if (!fileVideoRef.current) return;
        
        fileVideoRef.current.play();
        // @ts-ignore - captureStream is not in all type definitions
        stream = fileVideoRef.current.captureStream ? fileVideoRef.current.captureStream() : (fileVideoRef.current as any).mozCaptureStream();
        
        // If it's a video file, we might still want mic access for commentary
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
        } catch (e) {
          console.warn("Could not add microphone to file stream:", e);
        }
      }
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Update Firebase State
      await setDoc(doc(db, 'system', 'stream'), {
        isLive: true,
        currentTimeslotId: currentSlot?.id || 'quick-live',
        mode: streamMode,
        viewerCount: 0,
        djName: profile?.displayName || user?.displayName || 'Studio DJ'
      });

      setIsLive(true);
    } catch (error) {
      console.error("Error starting broadcast:", error);
      setError("Could not access camera/microphone or file. Please check permissions.");
    }
  };

  const stopBroadcast = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (fileVideoRef.current) {
      fileVideoRef.current.pause();
    }

    await updateDoc(doc(db, 'system', 'stream'), {
      isLive: false,
      currentTimeslotId: null
    });

    setIsLive(false);
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current && streamMode === 'video') {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOn(videoTrack.enabled);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Broadcast Controls */}
      <div className="lg:col-span-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-xl">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">DJ Broadcast Panel</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-2xl border border-zinc-800">
              <Users className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-bold">{viewerCount} Listeners</span>
            </div>
            <div className={`px-4 py-2 rounded-2xl text-xs font-bold border ${isLive ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
              {isLive ? 'ON AIR' : 'OFFLINE'}
            </div>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-2xl text-sm font-bold flex items-center gap-3"
          >
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {error}
          </motion.div>
        )}

        <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl">
          <div className="aspect-video bg-black relative flex items-center justify-center">
            {/* Hidden video for file processing */}
            <video ref={fileVideoRef} className="hidden" loop muted playsInline />
            
            {streamMode === 'video' ? (
              <video 
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-6">
                <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center animate-pulse">
                  <Radio className="w-12 h-12 text-red-500" />
                </div>
                <p className="text-zinc-500 font-medium">Audio-only Broadcast Mode</p>
              </div>
            )}
            
            {isLive && (
              <div className="absolute top-6 left-6 flex items-center gap-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
            )}
          </div>

          <div className="p-8 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleMic}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isMicOn ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-red-500 text-white hover:bg-red-600'}`}
              >
                {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>
              {streamMode === 'video' && (
                <button 
                  onClick={toggleCam}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isCamOn ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-red-500 text-white hover:bg-red-600'}`}
                >
                  {isCamOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {!isLive ? (
                <button 
                  onClick={startBroadcast}
                  className="bg-white text-black px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-zinc-200 transition-all shadow-xl shadow-white/10"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Go Live</span>
                </button>
              ) : (
                <button 
                  onClick={stopBroadcast}
                  className="bg-red-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-xl shadow-red-600/20"
                >
                  <Square className="w-5 h-5 fill-current" />
                  <span>Stop Stream</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar: Timeslots & Settings */}
      <div className="lg:col-span-4 space-y-8">
        <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-zinc-500" />
            Stream Settings
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Select Timeslot (Optional)</label>
              <select 
                value={currentSlot?.id || ''}
                onChange={(e) => setCurrentSlot(mySlots.find(s => s.id === e.target.value) || null)}
                disabled={isLive}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-red-500 transition-colors disabled:opacity-50"
              >
                <option value="">Quick Live Session</option>
                {mySlots.map(slot => (
                  <option key={slot.id} value={slot.id}>{slot.title}</option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-600 font-medium">If no slot is selected, a "Quick Live Session" will start.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Stream Source</label>
              <div className="flex gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                <button 
                  onClick={() => setStreamSource('camera')}
                  disabled={isLive}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${streamSource === 'camera' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Camera
                </button>
                <button 
                  onClick={() => setStreamSource('file')}
                  disabled={isLive}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${streamSource === 'file' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Local File
                </button>
              </div>
            </div>

            {streamSource === 'file' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Select Video File</label>
                <input 
                  type="file" 
                  accept="video/*"
                  onChange={handleFileChange}
                  disabled={isLive}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-xs text-zinc-400 file:mr-4 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 transition-all"
                />
                {selectedFile && <p className="text-[10px] text-zinc-500 truncate">Selected: {selectedFile.name}</p>}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Broadcast Mode</label>
              <div className="flex gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                <button 
                  onClick={() => setStreamMode('audio')}
                  disabled={isLive}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${streamMode === 'audio' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Audio Only
                </button>
                <button 
                  onClick={() => setStreamMode('video')}
                  disabled={isLive}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${streamMode === 'video' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Video + Audio
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 space-y-4">
          <h3 className="font-bold">Your Upcoming Shows</h3>
          <div className="space-y-3">
            {mySlots.length > 0 ? mySlots.map(slot => (
              <div key={slot.id} className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm">{slot.title}</div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">{slot.mode}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-zinc-400">Today</div>
                </div>
              </div>
            )) : (
              <p className="text-xs text-zinc-500 text-center py-4">No shows assigned to you.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DJPanel;
