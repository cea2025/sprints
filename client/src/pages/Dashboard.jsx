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
  ArrowLeft
} from 'lucide-react';
import { SkeletonStatCards, SkeletonRockCard } from '../components/ui/Skeleton';

// Hebrew translations
const statusLabels = {
  TODO: 'לביצוע',
  IN_PROGRESS: 'בתהליך',
  BLOCKED: 'חסום',
  DONE: 'הושלם'
};

const rockStatusLabels = {
  PLANNED: 'מתוכנן',
  IN_PROGRESS: 'בתהליך',
  AT_RISK: 'בסיכון',
  DONE: 'הושלם'
};

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/dashboard', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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

  const { currentQuarter, currentSprint, rocks, overallStats } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-slide-in-up">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">דשבורד</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          רבעון {currentQuarter.quarter} / {currentQuarter.year}
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
          title="משימות"
          value={overallStats.totalStories}
          icon={ListTodo}
          gradient="from-emerald-500 to-emerald-600"
          delay={1}
        />
        <StatCard
          title="חברי צוות"
          value={overallStats.activeTeamMembers}
          icon={Users}
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
              to={`/sprints/${currentSprint.id}`}
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium group"
            >
              <span>צפה בלוח</span>
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
            <span>כל אבני הדרך</span>
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
  const statusColors = {
    PLANNED: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    IN_PROGRESS: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    AT_RISK: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    DONE: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  };

  const progressColors = {
    PLANNED: 'bg-gray-400',
    IN_PROGRESS: 'bg-blue-500',
    AT_RISK: 'bg-red-500',
    DONE: 'bg-green-500',
  };

  return (
    <div 
      className="border dark:border-gray-700 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all animate-slide-in-up bg-white dark:bg-gray-800/50"
      style={{ animationDelay: `${0.4 + index * 0.05}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
              {rock.code}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[rock.status]}`}>
              {rockStatusLabels[rock.status]}
            </span>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white">{rock.name}</h3>
        </div>
        {rock.owner && (
          <span className="text-sm text-gray-500 dark:text-gray-400">{rock.owner.name}</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-500 dark:text-gray-400">התקדמות</span>
          <span className="font-medium text-gray-900 dark:text-white">{rock.progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressColors[rock.status]} rounded-full transition-all duration-500`}
            style={{ width: `${rock.progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {rock.doneStories} מתוך {rock.totalStories} משימות
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
