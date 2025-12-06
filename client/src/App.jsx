import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Rocks from './pages/Rocks';
import Sprints from './pages/Sprints';
import SprintBoard from './pages/SprintBoard';
import Stories from './pages/Stories';
import Team from './pages/Team';
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './context/ThemeContext';

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-500 rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>
          </div>
          <p className="mt-6 text-purple-200 font-medium animate-pulse">טוען...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { 
      method: 'POST',
      credentials: 'include' 
    });
    setUser(null);
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthContext.Provider value={{ user, setUser, loading, logout }}>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={
                user ? <Navigate to="/" replace /> : <Login />
              } />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="rocks" element={<Rocks />} />
                <Route path="sprints" element={<Sprints />} />
                <Route path="sprints/:id" element={<SprintBoard />} />
                <Route path="stories" element={<Stories />} />
                <Route path="team" element={<Team />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthContext.Provider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;