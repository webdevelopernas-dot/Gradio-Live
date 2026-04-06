import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Timeslot } from '../types';
import { Calendar, Clock, User, Radio, Video } from 'lucide-react';
import { format } from 'date-fns';

const Schedule = () => {
  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'timeslots'),
      orderBy('startTime', 'asc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const slots = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Timeslot[];
      setTimeslots(slots);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-red-500" />
          <h2 className="text-2xl font-bold tracking-tight">Broadcast Schedule</h2>
        </div>
        <div className="text-xs text-zinc-500 font-medium">Next 10 Shows</div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {timeslots.length > 0 ? (
          timeslots.map((slot) => (
            <div 
              key={slot.id}
              className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 hover:border-zinc-700 transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 group-hover:bg-zinc-700 transition-colors">
                    {slot.mode === 'video' ? <Video className="w-6 h-6 text-zinc-400" /> : <Radio className="w-6 h-6 text-zinc-400" />}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-lg">{slot.title}</h4>
                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        <span>{slot.djName}</span>
                      </div>
                      <div className="w-1 h-1 bg-zinc-700 rounded-full" />
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{format(slot.startTime.toDate(), 'HH:mm')} - {format(slot.endTime.toDate(), 'HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <div className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Date</div>
                    <div className="text-sm font-medium text-zinc-400">{format(slot.startTime.toDate(), 'MMM dd, yyyy')}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${slot.mode === 'video' ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-800 text-zinc-500'}`}>
                    {slot.mode}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl text-zinc-500">
            No upcoming shows scheduled.
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule;
