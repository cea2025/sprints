import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  Mountain, 
  Zap, 
  ListTodo, 
  Users,
  CheckCircle2,
  Clock,
  Ban,
  TrendingUp,
  ArrowLeft,
  Target,
  AlertTriangle,
  Link as LinkIcon,
  User,
  Building2,
  Settings,
  CheckSquare,
  Circle
} from 'lucide-react';
import { SkeletonStatCards, SkeletonRockCard } from '../components/ui/Skeleton';
import { Battery, BatteryCompact } from '../components/ui/Battery';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

function Dashboard() {
  const [data, setData] = useState(null);
  const [orphans, setOrphans] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('user'); // 'user' or 'all'
  const [sprints, setSprints] = useState([]);
  const [showSprintSelector, setShowSprintSelector] = useState(false);
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { slug } = useParams();
  
  // Base path for links
  const basePath = slug ? `/${slug}` : '';

  useEffect(() => {
    // Wait for organization to be set before fetching
    if (!currentOrganization?.id) return;
    
    console.log('📊 [Dashboard] Fetching data for org:', currentOrganization.name, currentOrganization.id);
    
    setLoading(true);
    
    // Build query params
    const params = new URLSearchParams();
    if (viewMode === 'user' && user?.teamMemberId) {
      params.append('userId', user.teamMemberId);
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    // Fetch dashboard data, orphans summary, sprints and tasks in parallel
    Promise.all([
      apiFetch(`/api/dashboard${queryString}`, { organizationId: currentOrganization.id }),
      apiFetch('/api/orphans/summary', { organizationId: currentOrganization.id }),
      apiFetch('/api/sprints', { organizationId: currentOrganization.id }),
      apiFetch('/api/tasks/my', { organizationId: currentOrganization.id })
    ])
      .then(async ([dashRes, orphansRes, sprintsRes, tasksRes]) => {
        if (!dashRes.ok) throw new Error('Failed to fetch dashboard');
        const dashData = await dashRes.json();
        setData(dashData);
        
        if (orphansRes.ok) {
          const orphansData = await orphansRes.json();
          setOrphans(orphansData);
        }
        
        if (sprintsRes.ok) {
          const sprintsData = await sprintsRes.json();
          setSprints(Array.isArray(sprintsData) ? sprintsData : []);
        }
        
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setMyTasks(Array.isArray(tasksData) ? tasksData : []);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [currentOrganization?.id, viewMode, user?.teamMemberId]);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <SkeletonStatCards />
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => <SkeletonRockCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-2xl border border-red-200 dark:border-red-800">
        <p className="font-medium">שגיאה בטעינת הנתונים</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  const { currentQuarter, currentSprint, rocks = [], objectives = [], overallStats = {}, userMilestones = [], userRocks = [] } = data || {};
  
  // Use user-specific data - same layout for both modes
  const displayRocks = viewMode === 'user' ? userRocks : rocks;
  const displayMilestones = userMilestones; // Always show user milestones in the side panel

  const handleSetCurrentSprint = async (sprintId) => {
    try {
      const res = await fetch('/api/organizations/current-sprint', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Organization-Id': currentOrganization.id
        },
        credentials: 'include',
        body: JSON.stringify({ sprintId })
      });
      
      if (res.ok) {
        // Refresh dashboard data
        window.location.reload();
      }
    } catch (err) {
      console.error('Error setting current sprint:', err);
    }
    setShowSprintSelector(false);
  };

  const handleTaskStatusToggle = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'DONE' ? 'TODO' : currentStatus === 'TODO' ? 'IN_PROGRESS' : 'DONE';
    try {
      const res = await apiFetch(`/api/tasks/${taskId}/status`, {
        organizationId: currentOrganization.id,
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        setMyTasks(myTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      }
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-slide-in-up flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">דשבורד</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            רבעון {currentQuarter?.quarter || 4} / {currentQuarter?.year || 2025}
          </p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 shadow-sm">
          <button
            onClick={() => setViewMode('user')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'user'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <User size={14} />
            <span>שלי</span>
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'all'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Building2 size={14} />
            <span>הכל</span>
          </button>
        </div>
      </div>

      {/* Stats Cards - Order: פרויקטים, סלעים, אבני דרך, משימות */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="פרויקטים"
          value={overallStats.totalObjectives}
          icon={Target}
          gradient="from-purple-500 to-purple-600"
          delay={0}
        />
        <StatCard
          title="סלעים"
          value={overallStats.completedRocks}
          total={overallStats.totalRocks}
          icon={Mountain}
          gradient="from-blue-500 to-blue-600"
          delay={1}
        />
        <StatCard
          title="אבני דרך"
          value={overallStats.totalStories}
          icon={ListTodo}
          gradient="from-orange-500 to-orange-600"
          delay={2}
        />
        <StatCard
          title="משימות"
          value={myTasks.filter(t => t.status !== 'DONE').length}
          total={myTasks.length}
          icon={CheckSquare}
          gradient="from-emerald-500 to-teal-600"
          delay={3}
        />
      </div>

      {/* Side by Side - Milestones (Right) | Tasks (Left) - Same layout for both modes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-in-up" style={{ animationDelay: '0.15s' }}>
        {/* אבני דרך - Right Side */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 order-1 lg:order-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                <ListTodo className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {viewMode === 'user' ? 'אבני הדרך שלי' : 'אבני דרך'}
              </h2>
            </div>
            <Link
              to={`${basePath}/stories`}
              className="flex items-center gap-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm font-medium group"
            >
              <span>הכל</span>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>

          {displayMilestones.length === 0 ? (
            <div className="text-center py-8">
              <ListTodo className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {viewMode === 'user' ? 'אין אבני דרך מוקצות' : 'אין אבני דרך'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayMilestones.slice(0, 5).map((milestone) => (
                <div
                  key={milestone.id}
                  className={`p-3 rounded-xl border ${
                    milestone.isBlocked 
                      ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' 
                      : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  } transition-all`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {milestone.code && (
                      <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded font-mono">
                        {milestone.code}
                      </span>
                    )}
                    <h3 className={`font-medium text-sm flex-1 truncate ${milestone.isBlocked ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      {milestone.title}
                    </h3>
                    {milestone.isBlocked && <span className="text-red-500 text-xs">🚫</span>}
                  </div>
                  <Battery progress={milestone.progress || 0} size="xs" />
                </div>
              ))}
              {displayMilestones.length > 5 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                  +{displayMilestones.length - 5} נוספות
                </p>
              )}
            </div>
          )}
        </div>

        {/* משימות - Left Side */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 order-2 lg:order-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {viewMode === 'user' ? 'המשימות שלי' : 'משימות'}
              </h2>
            </div>
            <Link
              to={`${basePath}/tasks`}
              className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium group"
            >
              <span>הכל</span>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>

          {myTasks.filter(t => t.status !== 'DONE').length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">אין משימות פתוחות</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myTasks.filter(t => t.status !== 'DONE').slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
                >
                  <button
                    onClick={() => handleTaskStatusToggle(task.id, task.status)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      task.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-emerald-600'
                    }`}
                    title={task.status === 'TODO' ? 'התחל' : 'סיים'}
                  >
                    {task.status === 'IN_PROGRESS' ? <Clock className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{task.title}</p>
                    {task.story && (
                      <p className="text-xs text-purple-600 dark:text-purple-400 truncate">📋 {task.story.title}</p>
                    )}
                  </div>

                  {task.priority > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      task.priority === 2 ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                    }`}>
                      {task.priority === 2 ? 'דחוף' : 'גבוה'}
                    </span>
                  )}
                </div>
              ))}
              
              {myTasks.filter(t => t.status !== 'DONE').length > 5 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                  +{myTasks.filter(t => t.status !== 'DONE').length - 5} נוספות
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Orphans Widget */}
      {orphans && orphans.total > 0 && (
        <OrphansWidget orphans={orphans} basePath={basePath} />
      )}

      {/* Current Sprint - with selector */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 animate-slide-in-up border border-gray-100 dark:border-gray-700" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {currentSprint?.name || 'אין ספרינט נוכחי'}
                </h2>
                <div className="relative">
                  <button
                    onClick={() => setShowSprintSelector(!showSprintSelector)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="בחר ספרינט נוכחי"
                  >
                    <Settings size={16} />
                  </button>
                  
                  {/* Sprint Selector Dropdown */}
                  {showSprintSelector && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 min-w-[200px] max-h-64 overflow-y-auto">
                      <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">בחר ספרינט נוכחי</span>
                      </div>
                      {sprints.map(sprint => (
                        <button
                          key={sprint.id}
                          onClick={() => handleSetCurrentSprint(sprint.id)}
                          className={`w-full text-right px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                            currentSprint?.id === sprint.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {sprint.name}
                        </button>
                      ))}
                      {sprints.length === 0 && (
                        <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                          אין ספרינטים
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {currentSprint?.goal && (
                <p className="text-gray-500 dark:text-gray-400 mt-1">{currentSprint.goal}</p>
              )}
            </div>
          </div>
          <Link
            to={`${basePath}/stories`}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium group"
          >
            <span>צפה באבני דרך</span>
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Sprint Stats */}
        {currentSprint?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SprintStatCard
              label="לביצוע"
              value={currentSprint.stats.todo}
              icon={Clock}
              color="gray"
            />
            <SprintStatCard
              label="בתהליך"
              value={currentSprint.stats.inProgress}
              icon={TrendingUp}
              color="blue"
            />
            <SprintStatCard
              label="חסום"
              value={currentSprint.stats.blocked}
              icon={Ban}
              color="red"
            />
            <SprintStatCard
              label="הושלם"
              value={currentSprint.stats.done}
              icon={CheckCircle2}
              color="green"
            />
          </div>
        )}
        
        {!currentSprint && (
          <div className="text-center py-8">
            <Zap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-3">אין ספרינט נוכחי מוגדר</p>
            <button
              onClick={() => setShowSprintSelector(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              בחר ספרינט
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

function StatCard({ title, value, total, icon: Icon, gradient, delay }) {
  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 animate-slide-in-up border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
      style={{ animationDelay: `${delay * 0.1}s` }}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon size={24} className="text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
            {total !== undefined && (
              <span className="text-base font-normal text-gray-400 dark:text-gray-500">
                /{total}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function SprintStatCard({ label, value, icon: Icon, color }) {
  const colors = {
    gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  };

  return (
    <div className={`rounded-xl p-4 ${colors[color]} transition-all hover:scale-105`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={18} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function RockCard({ rock, index }) {
  return (
    <div 
      className="border dark:border-gray-700 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all animate-slide-in-up bg-white dark:bg-gray-800/50"
      style={{ animationDelay: `${0.4 + index * 0.05}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
              {rock.code}
            </span>
            {rock.isCarriedOver && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                ↪ גלש מ-Q{rock.carriedFromQuarter}
              </span>
            )}
            {rock.objective && (
              <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                🎯 {rock.objective.code}
              </span>
            )}
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white">{rock.name}</h3>
        </div>
        {rock.owner && (
          <span className="text-sm text-gray-500 dark:text-gray-400">{rock.owner.name}</span>
        )}
      </div>

      {/* Progress with Battery */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">התקדמות</span>
          <span className="text-xs text-gray-400">
            {rock.doneStories}/{rock.totalStories} אבני דרך
            {rock.blockedStories > 0 && (
              <span className="text-red-500 mr-2">({rock.blockedStories} חסומות)</span>
            )}
          </span>
        </div>
        <Battery progress={rock.progress || 0} size="md" />
      </div>
    </div>
  );
}

function MilestoneCard({ milestone, index }) {
  return (
    <div 
      className={`border rounded-xl p-4 hover:shadow-md transition-all animate-slide-in-up ${
        milestone.isBlocked 
          ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' 
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'
      }`}
      style={{ animationDelay: `${0.3 + index * 0.05}s` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className={`font-medium ${
              milestone.isBlocked 
                ? 'text-red-800 dark:text-red-300' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {milestone.title}
            </h3>
            {milestone.isBlocked && (
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-full">
                🚫 חסום
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {milestone.rock && (
              <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg">
                🪨 {milestone.rock.code}
              </span>
            )}
            {milestone.sprint && (
              <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
                🏃 {milestone.sprint.name}
              </span>
            )}
          </div>
        </div>
        <div className="mr-4">
          <BatteryCompact progress={milestone.progress || 0} isBlocked={milestone.isBlocked} />
        </div>
      </div>
    </div>
  );
}

function OrphansWidget({ orphans, basePath }) {
  const items = [
    { 
      key: 'objectivesWithoutRocks',
      label: 'פרויקטים ללא סלעים', 
      count: orphans.objectivesWithoutRocks, 
      icon: '🎯',
      link: `${basePath}/objectives?filter=no-rocks`,
      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
    },
    { 
      key: 'rocksWithoutObjective',
      label: 'סלעים ללא פרויקט', 
      count: orphans.rocksWithoutObjective, 
      icon: '🪨',
      link: `${basePath}/rocks?filter=no-objective`,
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    },
    { 
      key: 'rocksWithoutStories',
      label: 'סלעים ללא אבנ"ד', 
      count: orphans.rocksWithoutStories, 
      icon: '🪨',
      link: `${basePath}/rocks?filter=no-stories`,
      color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
    },
    { 
      key: 'storiesWithoutRock',
      label: 'אבנ"ד ללא סלע', 
      count: orphans.storiesWithoutRock, 
      icon: '📋',
      link: `${basePath}/stories?filter=no-rock`,
      color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
    },
    { 
      key: 'storiesWithoutSprint',
      label: 'אבנ"ד בהמתנה', 
      count: orphans.storiesWithoutSprint, 
      icon: '⏳',
      link: `${basePath}/stories?filter=backlog`,
      color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
    }
  ].filter(item => item.count > 0);

  if (items.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-800 animate-slide-in-up" style={{ animationDelay: '0.15s' }}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
        <h3 className="font-semibold text-amber-800 dark:text-amber-300">
          ישויות לא מקושרות ({orphans.total})
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <Link
            key={item.key}
            to={item.link}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105 hover:shadow-md ${item.color}`}
          >
            <span>{item.icon}</span>
            <span>{item.count}</span>
            <span className="hidden sm:inline">{item.label}</span>
            <LinkIcon size={12} className="opacity-50" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
