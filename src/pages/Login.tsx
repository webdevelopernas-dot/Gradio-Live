import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Radio, LogIn, ShieldCheck, Music } from 'lucide-react';
import { motion } from 'motion/react';

const Login = () => {
  const { user, isDJ, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  if (loading) return null;
  if (user && isDJ) return <Navigate to={from} replace />;

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-zinc-900 rounded-[2.5rem] border border-zinc-800 p-10 shadow-2xl relative overflow-hidden"
      >
        {/* Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/10 blur-[80px] rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full" />

        <div className="relative z-10 text-center space-y-8">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center border border-zinc-700 shadow-xl">
              <Radio className="w-10 h-10 text-red-500" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tighter text-white">CMS ACCESS</h1>
            <p className="text-zinc-500 text-sm font-medium">Authentication required for DJ & Admin panels</p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col items-center gap-2">
              <Music className="w-5 h-5 text-zinc-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">DJ Access</span>
            </div>
            <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-zinc-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Admin Panel</span>
            </div>
          </div>

          <button 
            onClick={handleLogin}
            className="w-full bg-white text-black py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 active:scale-[0.98]"
          >
            <LogIn className="w-5 h-5" />
            <span>Sign in with Google</span>
          </button>

          <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">
            Authorized personnel only • WE RADIO LIVE
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
