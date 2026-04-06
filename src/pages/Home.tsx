import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Timeslot, StreamState } from '../types';
import Player from '../components/Player';
import Chat from '../components/Chat';
import Schedule from '../components/Schedule';
import { motion } from 'motion/react';

const Home = () => {
  const [streamState, setStreamState] = useState<StreamState>({
    isLive: false,
    currentTimeslotId: null,
    mode: 'audio',
    viewerCount: 0
  });
  const [currentShow, setCurrentShow] = useState<Timeslot | null>(null);

  useEffect(() => {
    // Listen for global stream state
    const unsubStream = onSnapshot(doc(db, 'system', 'stream'), (snapshot) => {
      if (snapshot.exists()) {
        setStreamState(snapshot.data() as StreamState);
      }
    });

    return () => unsubStream();
  }, []);

  useEffect(() => {
    if (streamState.currentTimeslotId && streamState.currentTimeslotId !== 'quick-live') {
      const unsubShow = onSnapshot(doc(db, 'timeslots', streamState.currentTimeslotId), (snapshot) => {
        if (snapshot.exists()) {
          setCurrentShow({ id: snapshot.id, ...snapshot.data() } as Timeslot);
        }
      });
      return () => unsubShow();
    } else {
      setCurrentShow(null);
    }
  }, [streamState.currentTimeslotId]);

  const displayTitle = currentShow?.title || (streamState.currentTimeslotId === 'quick-live' ? 'Quick Live Session' : 'Radio Stream');
  const displayDJ = currentShow?.djName || streamState.djName || 'Studio DJ';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Player & Info */}
      <div className="lg:col-span-8 space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Player 
            streamState={streamState} 
            currentShowTitle={displayTitle}
            djName={displayDJ}
          />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 space-y-4">
            <h3 className="text-xl font-bold tracking-tight">About the Show</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              {streamState.isLive ? (
                `Currently broadcasting ${displayTitle} with ${displayDJ}. Tune in for the best live radio experience.`
              ) : (
                "We are currently off-air. Check the schedule below for upcoming shows and live broadcasts."
              )}
            </p>
          </div>
          <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 space-y-4">
            <h3 className="text-xl font-bold tracking-tight">Live Stats</h3>
            <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
              <span className="text-sm text-zinc-500">Status</span>
              <span className={`text-xs font-bold px-2 py-1 rounded ${streamState.isLive ? 'bg-red-500/10 text-red-500' : 'bg-zinc-800 text-zinc-500'}`}>
                {streamState.isLive ? 'ON AIR' : 'OFFLINE'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
              <span className="text-sm text-zinc-500">Mode</span>
              <span className="text-xs font-bold text-zinc-300 uppercase">{streamState.mode}</span>
            </div>
          </div>
        </div>

        <Schedule />
      </div>

      {/* Right Column: Chat */}
      <div className="lg:col-span-4 h-[calc(100vh-12rem)] sticky top-24">
        <Chat />
      </div>
    </div>
  );
};

export default Home;
