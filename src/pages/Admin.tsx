import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Timeslot, UserProfile } from '../types';
import { Plus, Trash2, Edit2, Calendar, Clock, User, Radio, Video, Save, X, Sparkles } from 'lucide-react';
import { format, addDays, setHours, setMinutes } from 'date-fns';

const Admin = () => {
  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [newSlot, setNewSlot] = useState({
    title: '',
    djId: '',
    startTime: '',
    endTime: '',
    mode: 'audio' as 'audio' | 'video',
  });

  useEffect(() => {
    const unsubSlots = onSnapshot(query(collection(db, 'timeslots'), orderBy('startTime', 'asc')), (snapshot) => {
      setTimeslots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Timeslot[]);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[]);
    });

    return () => { unsubSlots(); unsubUsers(); };
  }, []);

  const handleAutoSchedule = async () => {
    setIsScheduling(true);
    const djsToCreate = [
      { name: 'Dj TESHA', email: 'tesha@weradio.live' },
      { name: 'Dj Duero', email: 'duero@weradio.live' },
      { name: 'Dj mark', email: 'mark@weradio.live' }
    ];

    try {
      const djProfiles: { uid: string, name: string }[] = [];

      // 1. Ensure DJs exist in the system
      for (const dj of djsToCreate) {
        const existing = users.find(u => u.displayName === dj.name || u.email === dj.email);
        if (existing) {
          djProfiles.push({ uid: existing.uid, name: existing.displayName || dj.name });
        } else {
          // Create placeholder DJ (they can link their Google account later)
          const newDjId = `placeholder_${dj.name.replace(/\s+/g, '_').toLowerCase()}`;
          const newProfile: UserProfile = {
            uid: newDjId,
            displayName: dj.name,
            email: dj.email,
            role: 'dj',
            photoURL: null
          };
          await setDoc(doc(db, 'users', newDjId), newProfile);
          djProfiles.push({ uid: newDjId, name: dj.name });
        }
      }

      // 2. Generate slots for the next 3 days
      const shows = [
        { title: 'Morning Mix', startH: 9, endH: 12, mode: 'audio' as const },
        { title: 'Afternoon Vibes', startH: 14, endH: 17, mode: 'video' as const },
        { title: 'Night Drive', startH: 20, endH: 23, mode: 'audio' as const }
      ];

      const now = new Date();
      for (let i = 0; i < 3; i++) {
        const day = addDays(now, i);
        for (let j = 0; j < 3; j++) {
          const dj = djProfiles[j];
          const show = shows[j];
          
          const start = setMinutes(setHours(day, show.startH), 0);
          const end = setMinutes(setHours(day, show.endH), 0);

          await addDoc(collection(db, 'timeslots'), {
            title: show.title,
            djId: dj.uid,
            djName: dj.name,
            startTime: Timestamp.fromDate(start),
            endTime: Timestamp.fromDate(end),
            mode: show.mode,
            createdAt: serverTimestamp(),
          });
        }
      }
      alert("Auto-scheduling complete! 9 slots created for the next 3 days.");
    } catch (error) {
      console.error("Auto-scheduling failed:", error);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const dj = users.find(u => u.uid === newSlot.djId);
    if (!dj) return;

    try {
      await addDoc(collection(db, 'timeslots'), {
        title: newSlot.title,
        djId: newSlot.djId,
        djName: dj.displayName || dj.email,
        startTime: Timestamp.fromDate(new Date(newSlot.startTime)),
        endTime: Timestamp.fromDate(new Date(newSlot.endTime)),
        mode: newSlot.mode,
        createdAt: serverTimestamp(),
      });
      setIsAdding(false);
      setNewSlot({ title: '', djId: '', startTime: '', endTime: '', mode: 'audio' });
    } catch (error) {
      console.error("Error adding timeslot:", error);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this timeslot?")) {
      await deleteDoc(doc(db, 'timeslots', id));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-xl">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleAutoSchedule}
            disabled={isScheduling}
            className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-6 py-3 rounded-2xl font-bold hover:bg-zinc-700 transition-all border border-zinc-700 disabled:opacity-50"
          >
            <Sparkles className={`w-5 h-5 ${isScheduling ? 'animate-spin' : ''}`} />
            <span>{isScheduling ? 'Scheduling...' : 'Auto-Schedule'}</span>
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >
            {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            <span>{isAdding ? 'Cancel' : 'Add Timeslot'}</span>
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAddSlot} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Show Title</label>
            <input 
              type="text" 
              required
              value={newSlot.title}
              onChange={e => setNewSlot({...newSlot, title: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Morning Mix"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Select DJ</label>
            <select 
              required
              value={newSlot.djId}
              onChange={e => setNewSlot({...newSlot, djId: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-red-500 transition-colors"
            >
              <option value="">Select DJ</option>
              {users.filter(u => u.role === 'dj' || u.role === 'admin').map(u => (
                <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Start Time</label>
            <input 
              type="datetime-local" 
              required
              value={newSlot.startTime}
              onChange={e => setNewSlot({...newSlot, startTime: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">End Time</label>
            <input 
              type="datetime-local" 
              required
              value={newSlot.endTime}
              onChange={e => setNewSlot({...newSlot, endTime: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Broadcast Mode</label>
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setNewSlot({...newSlot, mode: 'audio'})}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${newSlot.mode === 'audio' ? 'bg-zinc-800 border-red-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
              >
                <Radio className="w-4 h-4" />
                <span>Audio Only</span>
              </button>
              <button 
                type="button"
                onClick={() => setNewSlot({...newSlot, mode: 'video'})}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${newSlot.mode === 'video' ? 'bg-zinc-800 border-red-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
              >
                <Video className="w-4 h-4" />
                <span>Video + Audio</span>
              </button>
            </div>
          </div>
          <div className="flex items-end">
            <button 
              type="submit"
              className="w-full bg-white text-black py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              <span>Save Timeslot</span>
            </button>
          </div>
        </form>
      )}

      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
          <h3 className="font-bold">Scheduled Timeslots</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
                <th className="px-6 py-4">Show</th>
                <th className="px-6 py-4">DJ</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Mode</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {timeslots.map((slot) => (
                <tr key={slot.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold">{slot.title}</td>
                  <td className="px-6 py-4 text-zinc-400">{slot.djName}</td>
                  <td className="px-6 py-4 text-zinc-400">
                    <div className="text-sm">{format(slot.startTime.toDate(), 'MMM dd, HH:mm')}</div>
                    <div className="text-xs text-zinc-600">to {format(slot.endTime.toDate(), 'HH:mm')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${slot.mode === 'video' ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-800 text-zinc-500'}`}>
                      {slot.mode}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Admin;
