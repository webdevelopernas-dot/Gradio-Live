import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Home from './pages/Home';
import Admin from './pages/Admin';
import DJPanel from './pages/DJPanel';
import Login from './pages/Login';
import Navbar from './components/Navbar';

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: 'admin' | 'dj' }) => {
  const { user, profile, loading, isAdmin, isDJ } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex items-center justify-center h-screen bg-zinc-950 text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (role === 'admin' && !isAdmin) return <Navigate to="/" />;
  if (role === 'dj' && !isDJ) return <Navigate to="/" />;

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
          <Navbar />
          <main className="flex-1 container mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute role="admin">
                    <Admin />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dj" 
                element={
                  <ProtectedRoute role="dj">
                    <DJPanel />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
