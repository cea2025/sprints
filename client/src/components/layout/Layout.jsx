import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useOrganization } from '../../context/OrganizationContext';
import { usePermissions } from '../../hooks/usePermissions';
import { ROLE_LABELS, ROLE_COLORS } from '../../constants/roles';
import { 
  LayoutDashboard, 
  Target,
  Mountain, 
  Zap, 
  ListTodo,
  CheckSquare,
  Users, 
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Shield,
  CheckCircle,
  Database,
  Building2,
  ChevronDown,
  Settings,
  Crown,
  FileText
} from 'lucide-react';
import { useState, useEffect } from 'react';

function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentOrganization, organizations, selectOrganization, setCurrentOrganizationBySlug, hasMultipleOrgs } = useOrganization();
  const { isAdmin, role } = usePermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);
  const navigate = useNavigate();
  const { slug } = useParams();

  // Set organization based on URL slug
  useEffect(() => {
    if (slug && setCurrentOrganizationBySlug) {
      setCurrentOrganizationBySlug(slug);
    }
  }, [slug, setCurrentOrganizationBySlug]);

  // Get base path for navigation (includes slug)
  const basePath = slug ? `/${slug}` : '';

  const navigation = [
    { name: 'דשבורד', href: `${basePath}/dashboard`, icon: LayoutDashboard },
    { name: 'פרויקטים', href: `${basePath}/objectives`, icon: Target },
    { name: 'סלעים', href: `${basePath}/rocks`, icon: Mountain },
    { name: 'אבני דרך', href: `${basePath}/stories`, icon: ListTodo },
    { name: 'משימות', href: `${basePath}/tasks`, icon: CheckSquare },
    { name: 'ספרינטים', href: `${basePath}/sprints`, icon: Zap },
    { name: 'צוות', href: `${basePath}/team`, icon: Users },
    { name: 'ניהול נתונים', href: `${basePath}/data`, icon: Database },
    // Admin links - only shown for admins/managers
    ...(isAdmin ? [
      { name: 'ניהול מערכת', href: `${basePath}/admin`, icon: Shield },
      { name: 'לוג ביקורת', href: `${basePath}/audit`, icon: FileText }
    ] : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleOrgSwitch = (org) => {
    selectOrganization(org);
    setOrgPickerOpen(false);
    navigate(`/${org.slug}/dashboard`);
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      isActive
        ? 'bg-gradient-to-l from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 right-0 h-full w-72 bg-white dark:bg-gray-800 shadow-2xl z-40
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 border-l border-gray-200 dark:border-gray-700
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {/* Organization Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          {/* Super Admin Badge */}
          {user?.isSuperAdmin && (
            <div className="mb-3 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center gap-2 text-white text-sm">
              <Crown size={14} />
              <span className="font-medium">Super Admin</span>
              <button
                onClick={() => navigate('/super-admin')}
                className="mr-auto text-xs bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded transition-colors"
              >
                לוח בקרה
              </button>
            </div>
          )}

          {/* Organization Selector */}
          <div className="relative mb-3">
            <button
              onClick={() => (hasMultipleOrgs || user?.isSuperAdmin) && setOrgPickerOpen(!orgPickerOpen)}
              className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${
                (hasMultipleOrgs || user?.isSuperAdmin)
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer' 
                  : ''
              }`}
            >
              {currentOrganization?.logo ? (
                <img 
                  src={currentOrganization.logo} 
                  alt={currentOrganization.name}
                  className="w-10 h-10 rounded-xl object-cover shadow-md ring-2 ring-white dark:ring-gray-700"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
              ) : null}
              <div className={`${currentOrganization?.logo ? 'hidden' : 'flex'} w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 items-center justify-center shadow-md ring-2 ring-white dark:ring-gray-700`}>
                {currentOrganization ? (
                  <span className="text-white font-bold text-lg">
                    {currentOrganization.name.charAt(0)}
                  </span>
                ) : (
                  <Building2 className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1 text-right">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {currentOrganization?.name || 'בחר ארגון'}
                </h2>
                {(hasMultipleOrgs || user?.isSuperAdmin) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">לחץ להחלפה</p>
                )}
              </div>
              {(hasMultipleOrgs || user?.isSuperAdmin) && (
                <ChevronDown 
                  size={18} 
                  className={`text-gray-400 transition-transform ${orgPickerOpen ? 'rotate-180' : ''}`} 
                />
              )}
            </button>

            {/* Org Picker Dropdown */}
            {orgPickerOpen && (hasMultipleOrgs || user?.isSuperAdmin) && (
              <div className="absolute top-full right-0 left-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden max-h-64 overflow-y-auto">
                {organizations.map(org => (
                  <button
                    key={org.id}
                    onClick={() => handleOrgSwitch(org)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      currentOrganization?.id === org.id ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                    }`}
                  >
                    {org.logo ? (
                      <img src={org.logo} alt={org.name} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{org.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1 text-right">
                      <span className="font-medium text-gray-900 dark:text-white text-sm block">{org.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">/{org.slug}</span>
                    </div>
                    {currentOrganization?.id === org.id && (
                      <CheckCircle size={16} className="text-purple-600" />
                    )}
                  </button>
                ))}
                
                {user?.isSuperAdmin && (
                  <button
                    onClick={() => {
                      setOrgPickerOpen(false);
                      navigate('/super-admin');
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors border-t border-gray-100 dark:border-gray-700 text-amber-600 dark:text-amber-400"
                  >
                    <Crown size={16} />
                    <span className="text-sm font-medium">כל הארגונים (Super Admin)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* App Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
              <Mountain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ספרינטים
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">ניהול אבני דרך צוות</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigation.map((item, index) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={navLinkClass}
              onClick={() => setSidebarOpen(false)}
              end={item.href.endsWith('/dashboard')}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
          
          {/* Organization Settings Link */}
          {isAdmin && (
            <NavLink
              to={`${basePath}/settings`}
              className={navLinkClass}
              onClick={() => setSidebarOpen(false)}
            >
              <Settings size={20} />
              <span className="font-medium">הגדרות ארגון</span>
            </NavLink>
          )}
        </nav>

        {/* Theme Toggle */}
        <div className="px-4 py-3">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-1 flex">
            <button
              onClick={() => theme !== 'light' && toggleTheme()}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                theme === 'light' 
                  ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Sun size={16} className={theme === 'light' ? 'text-yellow-500' : ''} />
              <span>בהיר</span>
            </button>
            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                theme === 'dark' 
                  ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Moon size={16} className={theme === 'dark' ? 'text-purple-500' : ''} />
              <span>כהה</span>
            </button>
          </div>
        </div>

        {/* User section */}
        <div className="absolute bottom-0 right-0 left-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3 mb-3">
            {user?.picture ? (
              <img 
                src={user.picture} 
                alt={user.name}
                className="w-10 h-10 rounded-xl ring-2 ring-white dark:ring-gray-700 shadow-lg"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold">
                  {user?.name?.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {role && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[role]}`}>
                    {ROLE_LABELS[role]}
                  </span>
                )}
                {user?.isSuperAdmin && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    SA
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors font-medium"
          >
            <LogOut size={18} />
            <span>התנתק</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:mr-72 min-h-screen transition-all duration-300">
        <div className="p-4 pt-16 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
