import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, ShieldAlert } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { ChatMessage } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const Chat = () => {
  const { user, profile, isAdmin } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'chat'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'chat'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        text: newMessage,
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'chat', id));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-red-500" />
          <h3 className="font-bold">Live Chat</h3>
        </div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Real-time</div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-zinc-400">{msg.userName}</span>
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all"
                  >
                    <ShieldAlert className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-sm text-zinc-200 mt-0.5 leading-relaxed bg-zinc-800/50 p-2 rounded-xl rounded-tl-none border border-zinc-700/50">
                {msg.text}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {user ? (
        <form onSubmit={handleSendMessage} className="p-4 bg-zinc-900 border-t border-zinc-800">
          <div className="relative">
            <input 
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Say something..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-red-500 transition-colors"
            />
            <button 
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-red-500 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 bg-zinc-950 text-center text-xs text-zinc-500 border-t border-zinc-800">
          Please login to join the chat
        </div>
      )}
    </div>
  );
};

export default Chat;
