import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Objectives from './pages/Objectives';
import Rocks from './pages/Rocks';
import Sprints from './pages/Sprints';
import SprintBoard from './pages/SprintBoard';
import Stories from './pages/Stories';
import Team from './pages/Team';
import Admin from './pages/Admin';
import DataManagement from './pages/DataManagement';
import SelectOrganization from './pages/SelectOrganization';
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthContext } from './context/AuthContext';

// Re-export useAuth from context
export { useAuth } from './context/AuthContext';

// Loading Component
function LoadingScreen() {
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

// Protected Route Component - uses AuthContext
function ProtectedRoute({ children }) {
  const [authContext] = useState(() => {
    // This will be populated by the parent App component
    return null;
  });
  
  // We need to access the context from the provider
  return <ProtectedRouteInner>{children}</ProtectedRouteInner>;
}

function ProtectedRouteInner({ children }) {
  const { user, loading } = useAuthFromContext();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// Public Route - redirects to dashboard if logged in
function PublicRoute({ children }) {
  return <PublicRouteInner>{children}</PublicRouteInner>;
}

function PublicRouteInner({ children }) {
  const { user, loading } = useAuthFromContext();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

// Catch-all Route - redirects based on auth state
function CatchAllRoute() {
  const { user, loading } = useAuthFromContext();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  return <Navigate to={user ? "/dashboard" : "/"} replace />;
}

// Hook to use auth from context (must be used inside AuthContext.Provider)
function useAuthFromContext() {
  const context = React.useContext(AuthContext);
  return context || { user: null, loading: true };
}

import React from 'react';

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
        setUser(null);
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

  // Show loading while checking auth
  if (loading) {
    return (
      <ThemeProvider>
        <LoadingScreen />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthContext.Provider value={{ user, setUser, loading, logout }}>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={
                user ? <Navigate to="/dashboard" replace /> : <Home />
              } />
              
              <Route path="/login" element={
                user ? <Navigate to="/dashboard" replace /> : <Login />
              } />

              {/* Organization Selection - Protected but no layout */}
              <Route path="/select-organization" element={
                user ? <SelectOrganization /> : <Navigate to="/login" replace />
              } />
              
              {/* Protected Routes - App Layout */}
              <Route element={
                user ? <Layout /> : <Navigate to="/login" replace />
              }>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/objectives" element={<Objectives />} />
                <Route path="/rocks" element={<Rocks />} />
                <Route path="/sprints" element={<Sprints />} />
                <Route path="/sprints/:id" element={<SprintBoard />} />
                <Route path="/stories" element={<Stories />} />
                <Route path="/team" element={<Team />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/data" element={<DataManagement />} />
              </Route>

              {/* Catch all - redirect based on auth */}
              <Route path="*" element={
                <Navigate to={user ? "/dashboard" : "/"} replace />
              } />
            </Routes>
          </BrowserRouter>
        </AuthContext.Provider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;

