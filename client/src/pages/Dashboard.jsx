import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Mountain, 
  Zap, 
  ListTodo, 
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban
} from 'lucide-react';

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        שגיאה בטעינת הנתונים: {error}
      </div>
    );
  }

  const { currentQuarter, currentSprint, rocks, overallStats } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">דשבורד</h1>
        <p className="text-gray-500 mt-1">
          רבעון {currentQuarter.quarter} / {currentQuarter.year}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="אבני דרך"
          value={overallStats.completedRocks}
          total={overallStats.totalRocks}
          icon={Mountain}
          color="blue"
        />
        <StatCard
          title="משימות"
          value={overallStats.totalStories}
          icon={ListTodo}
          color="green"
        />
        <StatCard
          title="חברי צוות"
          value={overallStats.activeTeamMembers}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="ספרינט נוכחי"
          value={currentSprint?.name || 'אין'}
          icon={Zap}
          color="orange"
        />
      </div>

      {/* Current Sprint */}
      {currentSprint && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {currentSprint.name}
              </h2>
              {currentSprint.goal && (
                <p className="text-gray-500 mt-1">{currentSprint.goal}</p>
              )}
            </div>
            <Link
              to={`/sprints/${currentSprint.id}`}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              צפה בלוח →
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
                icon={Zap}
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
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            אבני דרך - Q{currentQuarter.quarter}
          </h2>
          <Link
            to="/rocks"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            כל אבני הדרך →
          </Link>
        </div>

        {rocks.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            אין אבני דרך לרבעון הנוכחי
          </p>
        ) : (
          <div className="space-y-4">
            {rocks.map((rock) => (
              <RockCard key={rock.id} rock={rock} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, total, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value}
            {total !== undefined && (
              <span className="text-base font-normal text-gray-400">
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
    gray: 'bg-gray-100 text-gray-600',
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
  };

  return (
    <div className={`rounded-lg p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={18} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function RockCard({ rock }) {
  const statusColors = {
    PLANNED: 'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    AT_RISK: 'bg-red-100 text-red-700',
    DONE: 'bg-green-100 text-green-700',
  };

  return (
    <div className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-gray-400">{rock.code}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[rock.status]}`}>
              {rockStatusLabels[rock.status]}
            </span>
          </div>
          <h3 className="font-medium text-gray-900">{rock.name}</h3>
        </div>
        {rock.owner && (
          <span className="text-sm text-gray-500">{rock.owner.name}</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-500">התקדמות</span>
          <span className="font-medium">{rock.progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${rock.progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {rock.doneStories} מתוך {rock.totalStories} משימות
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
