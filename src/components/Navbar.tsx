import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, LayoutDashboard, Mic2, LogIn, LogOut, User, Activity } from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { useAuth } from '../AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { StreamState } from '../types';

const Navbar = () => {
  const { user, profile, isAdmin, isDJ } = useAuth();
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'stream'), (snapshot) => {
      if (snapshot.exists()) {
        setIsLive((snapshot.data() as StreamState).isLive);
      }
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tighter text-white">
        <div className="bg-red-600 p-1.5 rounded-lg">
          <Radio className="w-6 h-6" />
        </div>
        <span>WE RADIO <span className="text-red-500">LIVE</span></span>
        {isLive && (
          <div className="flex items-center gap-1.5 bg-red-600/10 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-600/20 animate-pulse ml-2">
            <Activity className="w-3 h-3" />
            ON AIR
          </div>
        )}
      </Link>

      <div className="flex items-center gap-6">
        <Link to="/" className="text-zinc-400 hover:text-white transition-colors">Home</Link>
        {isDJ && (
          <Link to="/dj" className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors">
            <Mic2 className="w-4 h-4" />
            <span>DJ Panel</span>
          </Link>
        )}
        {isAdmin && (
          <Link to="/admin" className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors">
            <LayoutDashboard className="w-4 h-4" />
            <span>Admin</span>
          </Link>
        )}

        <div className="h-6 w-px bg-zinc-800 mx-2" />

        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-zinc-700" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <User className="w-4 h-4 text-zinc-500" />
                </div>
              )}
              <span className="text-sm font-medium hidden sm:inline">{user.displayName}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <Link 
            to="/login"
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-semibold hover:bg-zinc-200 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>Login</span>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
