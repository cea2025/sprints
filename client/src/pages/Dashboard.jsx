import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Link as LinkIcon
} from 'lucide-react';
import { SkeletonStatCards, SkeletonRockCard } from '../components/ui/Skeleton';
import { Battery, BatteryCompact } from '../components/ui/Battery';
import { useOrganization } from '../context/OrganizationContext';
import { apiFetch } from '../utils/api';

function Dashboard() {
  const [data, setData] = useState(null);
  const [orphans, setOrphans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    // Wait for organization to be set before fetching
    if (!currentOrganization?.id) return;
    
    console.log('📊 [Dashboard] Fetching data for org:', currentOrganization.name, currentOrganization.id);
    
    setLoading(true);
    
    // Fetch dashboard data and orphans summary in parallel
    Promise.all([
      apiFetch('/api/dashboard', { organizationId: currentOrganization.id }),
      apiFetch('/api/orphans/summary', { organizationId: currentOrganization.id })
    ])
      .then(async ([dashRes, orphansRes]) => {
        if (!dashRes.ok) throw new Error('Failed to fetch dashboard');
        const dashData = await dashRes.json();
        setData(dashData);
        
        if (orphansRes.ok) {
          const orphansData = await orphansRes.json();
          setOrphans(orphansData);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [currentOrganization?.id]);

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

  const { currentQuarter, currentSprint, rocks = [], objectives = [], overallStats = {} } = data || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-slide-in-up">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">דשבורד</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          רבעון {currentQuarter?.quarter || 4} / {currentQuarter?.year || 2025}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="סלעים"
          value={overallStats.completedRocks}
          total={overallStats.totalRocks}
          icon={Mountain}
          gradient="from-blue-500 to-blue-600"
          delay={0}
        />
        <StatCard
          title="אבני דרך"
          value={overallStats.totalStories}
          icon={ListTodo}
          gradient="from-emerald-500 to-emerald-600"
          delay={1}
        />
        <StatCard
          title="מטרות-על"
          value={overallStats.totalObjectives}
          icon={Target}
          gradient="from-purple-500 to-purple-600"
          delay={2}
        />
        <StatCard
          title="ספרינט נוכחי"
          value={currentSprint?.name || 'אין'}
          icon={Zap}
          gradient="from-orange-500 to-orange-600"
          delay={3}
        />
      </div>

      {/* Orphans Widget */}
      {orphans && orphans.total > 0 && (
        <OrphansWidget orphans={orphans} />
      )}

      {/* Current Sprint */}
      {currentSprint && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 animate-slide-in-up border border-gray-100 dark:border-gray-700" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentSprint.name}
              </h2>
              {currentSprint.goal && (
                <p className="text-gray-500 dark:text-gray-400 mt-1">{currentSprint.goal}</p>
              )}
            </div>
            <Link
              to="/stories"
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium group"
            >
              <span>צפה באבני דרך</span>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Sprint Stats */}
          {currentSprint.stats && (
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
        </div>
      )}

      {/* Rocks */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 animate-slide-in-up border border-gray-100 dark:border-gray-700" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            סלעים - Q{currentQuarter.quarter}
          </h2>
          <Link
            to="/rocks"
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium group"
          >
            <span>כל הסלעים</span>
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </Link>
        </div>

        {rocks.length === 0 ? (
          <div className="text-center py-12">
            <Mountain className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              אין סלעים לרבעון הנוכחי
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rocks.map((rock, index) => (
              <RockCard key={rock.id} rock={rock} index={index} />
            ))}
          </div>
        )}
      </div>

      {/* Objectives */}
      {objectives && objectives.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 animate-slide-in-up border border-gray-100 dark:border-gray-700" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              מטרות-על
            </h2>
            <Link
              to="/objectives"
              className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium group"
            >
              <span>כל המטרות</span>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {objectives.slice(0, 4).map((obj) => (
              <div
                key={obj.id}
                className="border dark:border-gray-700 rounded-xl p-4 hover:border-purple-300 dark:hover:border-purple-600 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded font-medium">
                    {obj.code}
                  </span>
                  <span className="text-xs text-gray-400">
                    {obj.rocksCount} סלעים
                  </span>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  {obj.name}
                </h3>
                <Battery progress={obj.progress || 0} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}
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

function OrphansWidget({ orphans }) {
  const items = [
    { 
      key: 'objectivesWithoutRocks',
      label: 'מטרות ללא סלעים', 
      count: orphans.objectivesWithoutRocks, 
      icon: '🎯',
      link: '/objectives?filter=no-rocks',
      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
    },
    { 
      key: 'rocksWithoutObjective',
      label: 'סלעים ללא מטרה', 
      count: orphans.rocksWithoutObjective, 
      icon: '🪨',
      link: '/rocks?filter=no-objective',
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    },
    { 
      key: 'rocksWithoutStories',
      label: 'סלעים ללא אבנ"ד', 
      count: orphans.rocksWithoutStories, 
      icon: '🪨',
      link: '/rocks?filter=no-stories',
      color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
    },
    { 
      key: 'storiesWithoutRock',
      label: 'אבנ"ד ללא סלע', 
      count: orphans.storiesWithoutRock, 
      icon: '📋',
      link: '/stories?filter=no-rock',
      color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
    },
    { 
      key: 'storiesWithoutSprint',
      label: 'אבנ"ד בהמתנה', 
      count: orphans.storiesWithoutSprint, 
      icon: '⏳',
      link: '/stories?filter=backlog',
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
