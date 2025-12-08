import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import React from 'react';

// Pages
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

// Providers
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { OrganizationProvider } from './context/OrganizationContext';

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

// No Organization Page
function NoOrganization() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🏢</div>
        <h1 className="text-2xl font-bold text-white mb-4">אין ארגון</h1>
        <p className="text-purple-200 mb-8">
          עדיין לא הצטרפת לאף ארגון. צור ארגון חדש או בקש מהמנהל להוסיף אותך.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/create-organization')}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
          >
            צור ארגון חדש
          </button>
          <button
            onClick={() => {
              fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
              window.location.href = '/';
            }}
            className="w-full px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
          >
            התנתק
          </button>
        </div>
      </div>
    </div>
  );
}

// Super Admin Dashboard (placeholder)
function SuperAdminDashboard() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/super-admin/organizations', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setOrganizations(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🛡️ Super Admin</h1>
          <p className="text-gray-600 dark:text-gray-400">ניהול כל הארגונים בפלטפורמה</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map(org => (
            <div
              key={org.id}
              onClick={() => navigate(`/${org.slug}/dashboard`)}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-4 mb-4">
                {org.logo ? (
                  <img src={org.logo} alt={org.name} className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                    {org.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{org.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">/{org.slug}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                  <div className="font-semibold text-gray-900 dark:text-white">{org._count?.members || 0}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs">חברים</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                  <div className="font-semibold text-gray-900 dark:text-white">{org._count?.rocks || 0}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs">סלעים</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                  <div className="font-semibold text-gray-900 dark:text-white">{org._count?.stories || 0}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs">אבני דרך</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {organizations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">אין ארגונים בפלטפורמה</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Organization Context Wrapper - sets org based on URL slug
function OrganizationRouteWrapper({ children }) {
  const { slug } = useParams();
  const { setCurrentOrganizationBySlug } = useContext(OrganizationContext) || {};
  
  useEffect(() => {
    if (slug && setCurrentOrganizationBySlug) {
      setCurrentOrganizationBySlug(slug);
    }
  }, [slug, setCurrentOrganizationBySlug]);
  
  return children;
}

// Organization Context for slug-based routing
const OrganizationContext = createContext(null);

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
          <OrganizationProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={
                  user ? <Navigate to={getDefaultRedirect(user)} replace /> : <Home />
                } />
                
                <Route path="/login" element={
                  user ? <Navigate to={getDefaultRedirect(user)} replace /> : <Login />
                } />

                {/* No Organization */}
                <Route path="/no-organization" element={
                  user ? <NoOrganization /> : <Navigate to="/login" replace />
                } />

                {/* Select Organization */}
                <Route path="/select-organization" element={
                  user ? <SelectOrganization /> : <Navigate to="/login" replace />
                } />

                {/* Super Admin Routes */}
                <Route path="/super-admin" element={
                  user?.isSuperAdmin ? <SuperAdminDashboard /> : <Navigate to="/" replace />
                } />

                {/* Organization Routes - with slug prefix */}
                <Route path="/:slug" element={
                  user ? <Layout /> : <Navigate to="/login" replace />
                }>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="objectives" element={<Objectives />} />
                  <Route path="rocks" element={<Rocks />} />
                  <Route path="sprints" element={<Sprints />} />
                  <Route path="sprints/:id" element={<SprintBoard />} />
                  <Route path="stories" element={<Stories />} />
                  <Route path="team" element={<Team />} />
                  <Route path="admin" element={<Admin />} />
                  <Route path="data" element={<DataManagement />} />
                  <Route path="settings" element={<div>Settings Page (TBD)</div>} />
                </Route>

                {/* Legacy routes - redirect to select organization */}
                <Route path="/dashboard" element={
                  user ? <RedirectToOrganization user={user} /> : <Navigate to="/login" replace />
                } />

                {/* Catch all */}
                <Route path="*" element={
                  <Navigate to={user ? getDefaultRedirect(user) : "/"} replace />
                } />
              </Routes>
            </BrowserRouter>
          </OrganizationProvider>
        </AuthContext.Provider>
      </ToastProvider>
    </ThemeProvider>
  );
}

// Helper to get default redirect URL
function getDefaultRedirect(user) {
  if (!user) return '/';
  if (user.isSuperAdmin) return '/super-admin';
  if (user.organizationCount === 0) return '/no-organization';
  if (user.organizationCount === 1 && user.organizations?.[0]?.slug) {
    return `/${user.organizations[0].slug}/dashboard`;
  }
  return '/select-organization';
}

// Component to redirect legacy /dashboard to proper org URL
function RedirectToOrganization({ user }) {
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user?.isSuperAdmin) {
      navigate('/super-admin', { replace: true });
    } else if (user?.organizationCount === 0) {
      navigate('/no-organization', { replace: true });
    } else if (user?.organizationCount === 1 && user?.organizations?.[0]?.slug) {
      navigate(`/${user.organizations[0].slug}/dashboard`, { replace: true });
    } else {
      navigate('/select-organization', { replace: true });
    }
  }, [user, navigate]);
  
  return <LoadingScreen />;
}

export default App;
