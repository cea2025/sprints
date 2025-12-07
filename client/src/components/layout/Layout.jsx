import { Outlet, NavLink, useNavigate } from 'react-router-dom';
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
  ChevronDown
} from 'lucide-react';
import { useState } from 'react';

function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentOrganization, organizations, selectOrganization, hasMultipleOrgs } = useOrganization();
  const { isAdmin, role } = usePermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);
  const navigate = useNavigate();

  const navigation = [
    { name: 'דשבורד', href: '/dashboard', icon: LayoutDashboard },
    { name: 'מטרות-על', href: '/objectives', icon: Target },
    { name: 'סלעים', href: '/rocks', icon: Mountain },
    { name: 'ספרינטים', href: '/sprints', icon: Zap },
    { name: 'אבני דרך', href: '/stories', icon: ListTodo },
    { name: 'צוות', href: '/team', icon: Users },
    { name: 'ניהול נתונים', href: '/data', icon: Database },
    // Admin link - only shown for admins
    ...(isAdmin ? [{ name: 'ניהול מערכת', href: '/admin', icon: Shield }] : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
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
          {/* Organization Selector */}
          <div className="relative mb-3">
            <button
              onClick={() => hasMultipleOrgs && setOrgPickerOpen(!orgPickerOpen)}
              className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${
                hasMultipleOrgs 
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
                {hasMultipleOrgs && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">לחץ להחלפה</p>
                )}
              </div>
              {hasMultipleOrgs && (
                <ChevronDown 
                  size={18} 
                  className={`text-gray-400 transition-transform ${orgPickerOpen ? 'rotate-180' : ''}`} 
                />
              )}
            </button>

            {/* Org Picker Dropdown */}
            {orgPickerOpen && hasMultipleOrgs && (
              <div className="absolute top-full right-0 left-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                {organizations.map(org => (
                  <button
                    key={org.id}
                    onClick={() => {
                      selectOrganization(org);
                      setOrgPickerOpen(false);
                    }}
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
                    <span className="font-medium text-gray-900 dark:text-white text-sm">{org.name}</span>
                    {currentOrganization?.id === org.id && (
                      <CheckCircle size={16} className="mr-auto text-purple-600" />
                    )}
                  </button>
                ))}
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
              end={item.href === '/dashboard'}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
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
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
              </div>
              {role && (
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[role]}`}>
                  {ROLE_LABELS[role]}
                </span>
              )}
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
