import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronRight, Pencil, Plus, RefreshCw } from 'lucide-react';
import { BatteryCompact } from '../components/ui/Battery';
import { Skeleton } from '../components/ui/Skeleton';
import { useOrganization } from '../context/OrganizationContext';
import { apiFetch } from '../utils/api';

function formatDateIL(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('he-IL');
  } catch {
    return '';
  }
}

function getSprintTimeMeta(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { percent: 0, daysRemaining: null, state: 'invalid' };
  }

  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = Math.min(totalMs, Math.max(0, now.getTime() - start.getTime()));
  const percent = Math.round((elapsedMs / totalMs) * 100);

  const msRemaining = end.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

  const state = now < start ? 'upcoming' : now > end ? 'ended' : 'active';
  return { percent, daysRemaining, state };
}

function SprintBoard() {
  const { id, slug } = useParams();
  const { currentOrganization } = useOrganization();
  
  const [loading, setLoading] = useState(true);
  const [loadingMoreStories, setLoadingMoreStories] = useState(false);
  const [loadingMoreTasks, setLoadingMoreTasks] = useState(false);

  const [sprint, setSprint] = useState(null);
  const [sectionsOpen, setSectionsOpen] = useState({
    rocks: true,
    stories: true,
    tasks: true
  });

  const [expandedStoryIds, setExpandedStoryIds] = useState(() => new Set());
  const [storyTasks, setStoryTasks] = useState({}); // storyId -> { loading, tasks }

  const timeMeta = useMemo(() => {
    if (!sprint?.startDate || !sprint?.endDate) return null;
    return getSprintTimeMeta(sprint.startDate, sprint.endDate);
  }, [sprint?.startDate, sprint?.endDate]);

  const fetchSprint = async (opts = {}) => {
    if (!currentOrganization?.id) return;

    const params = new URLSearchParams();
    if (opts.storiesLimit !== undefined) params.set('storiesLimit', String(opts.storiesLimit));
    if (opts.storiesCursor) params.set('storiesCursor', String(opts.storiesCursor));
    if (opts.tasksLimit !== undefined) params.set('tasksLimit', String(opts.tasksLimit));
    if (opts.tasksCursor) params.set('tasksCursor', String(opts.tasksCursor));

    const url = `/api/sprints/${id}${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await apiFetch(url, { organizationId: currentOrganization.id });
    if (!res.ok) return null;
    return res.json();
  };

  useEffect(() => {
    if (!currentOrganization?.id) return;
    setLoading(true);
    fetchSprint({ storiesLimit: 20, tasksLimit: 20 })
      .then((data) => setSprint(data))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentOrganization?.id]);

  const toggleSection = (key) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const loadMoreStories = async () => {
    if (!sprint?.storiesNextCursor) return;
    setLoadingMoreStories(true);
    try {
      const data = await fetchSprint({ storiesLimit: 20, storiesCursor: sprint.storiesNextCursor, tasksLimit: 0 });
      if (!data) return;
      setSprint((prev) => ({
        ...prev,
        stories: [...(prev?.stories || []), ...(data.stories || [])],
        storiesNextCursor: data.storiesNextCursor ?? null
      }));
    } finally {
      setLoadingMoreStories(false);
    }
  };

  const loadMoreStandaloneTasks = async () => {
    if (!sprint?.standaloneTasksNextCursor) return;
    setLoadingMoreTasks(true);
    try {
      const data = await fetchSprint({ storiesLimit: 0, tasksLimit: 20, tasksCursor: sprint.standaloneTasksNextCursor });
      if (!data) return;
      setSprint((prev) => ({
        ...prev,
        standaloneTasks: [...(prev?.standaloneTasks || []), ...(data.standaloneTasks || [])],
        standaloneTasksNextCursor: data.standaloneTasksNextCursor ?? null
      }));
    } finally {
      setLoadingMoreTasks(false);
    }
  };

  const toggleStoryExpanded = async (storyId) => {
    setExpandedStoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) next.delete(storyId);
      else next.add(storyId);
      return next;
    });

    if (storyTasks[storyId]?.tasks || storyTasks[storyId]?.loading) return;
    setStoryTasks((prev) => ({ ...prev, [storyId]: { loading: true, tasks: [] } }));

    const res = await apiFetch(`/api/tasks/story/${storyId}`, { organizationId: currentOrganization.id });
    if (!res.ok) {
      setStoryTasks((prev) => ({ ...prev, [storyId]: { loading: false, tasks: [] } }));
      return;
    }
    const tasks = await res.json();
    setStoryTasks((prev) => ({ ...prev, [storyId]: { loading: false, tasks: Array.isArray(tasks) ? tasks : [] } }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">ספרינט לא נמצא</p>
        <Link to={slug ? `/${slug}/sprints` : '/select-organization'} className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
          חזרה לרשימת ספרינטים
        </Link>
      </div>
    );
  }

  const rocks = Array.isArray(sprint.rocks) ? sprint.rocks : [];
  const stories = Array.isArray(sprint.stories) ? sprint.stories : [];
  const standaloneTasks = Array.isArray(sprint.standaloneTasks) ? sprint.standaloneTasks : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            to={slug ? `/${slug}/sprints` : '/select-organization'}
            className="mt-1 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
          >
            <ArrowRight size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{sprint.name}</h1>
              <Link
                to={slug ? `/${slug}/sprints?edit=${sprint.id}` : '/select-organization'}
                className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                title="עריכת ספרינט"
              >
                <Pencil size={16} />
              </Link>
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {formatDateIL(sprint.startDate)} - {formatDateIL(sprint.endDate)}
            </div>
            {sprint.goal && (
              <p className="text-gray-600 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                🎯 {sprint.goal}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={slug ? `/${slug}/stories?new=1&prefillSprintId=${sprint.id}` : '/select-organization'}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all"
            title="אבן דרך חדשה"
          >
            <Plus size={18} />
            <span className="font-medium">אבן דרך חדשה</span>
          </Link>
        <button
            onClick={() => {
              setLoading(true);
              fetchSprint({ storiesLimit: 20, tasksLimit: 20 })
                .then((data) => setSprint(data))
                .finally(() => setLoading(false));
            }}
            className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            title="רענן"
          >
            <RefreshCw size={18} />
        </button>
        </div>
      </div>

      {/* Time */}
      {timeMeta && timeMeta.state !== 'invalid' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-900 dark:text-white">זמן ספרינט</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {timeMeta.state === 'upcoming'
                ? 'עוד לא התחיל'
                : timeMeta.state === 'ended'
                  ? 'הסתיים'
                  : `${timeMeta.percent}% עבר • נשארו ${timeMeta.daysRemaining} ימים`}
            </div>
              </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-green-600 to-emerald-600"
              style={{ width: `${timeMeta.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Rocks */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('rocks')}
          className="w-full flex items-center justify-between px-5 py-4"
        >
              <div className="flex items-center gap-2">
            {sectionsOpen.rocks ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span className="font-semibold text-gray-900 dark:text-white">סלעים</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">({rocks.length})</span>
              </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">לחץ כדי לפתוח/לסגור</div>
        </button>

        {sectionsOpen.rocks && (
          <div className="px-5 pb-5">
            {rocks.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">אין סלעים מקושרים לספרינט.</div>
            ) : (
              <div className="space-y-3">
                {rocks.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                          {r.code}
              </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.name}</span>
                      </div>
                      {r.objective && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                          פרויקט: {r.objective.code} • {r.objective.name}
                        </div>
                      )}
            </div>
                    <div className="flex items-center gap-3">
                      <BatteryCompact progress={r.progress || 0} />
                      <Link
                        to={slug ? `/${slug}/rocks?edit=${r.id}` : '/select-organization'}
                        className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="עריכת סלע"
                      >
                        <Pencil size={16} />
                      </Link>
            </div>
          </div>
        ))}
      </div>
            )}
    </div>
        )}
      </div>
      
      {/* Stories */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('stories')}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-2">
            {sectionsOpen.stories ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span className="font-semibold text-gray-900 dark:text-white">אבני דרך</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">({stories.length})</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">לחץ כדי לפתוח/לסגור</div>
        </button>

        {sectionsOpen.stories && (
          <div className="px-5 pb-5 space-y-3">
            {stories.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">אין אבני דרך בספרינט.</div>
            ) : (
              stories.map((s) => {
                const isExpanded = expandedStoryIds.has(s.id);
                const tasksState = storyTasks[s.id];
                return (
                  <div key={s.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-800/60">
                      <button
                        onClick={() => toggleStoryExpanded(s.id)}
                        className="flex items-center gap-2 min-w-0 text-left"
                        title="הצג/הסתר משימות"
                      >
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.title}</span>
                            {s.isBlocked && (
                              <span className="text-xs px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                חסום
                              </span>
                            )}
                            {s.rock && (
                              <span className="text-xs px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                {s.rock.code}
                              </span>
                            )}
                          </div>
                          {s.description && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{s.description}</div>
                          )}
                        </div>
                      </button>

                      <div className="flex items-center gap-3">
                        <BatteryCompact progress={s.progress || 0} isBlocked={s.isBlocked} />
                        <Link
                          to={slug ? `/${slug}/stories?edit=${s.id}` : '/select-organization'}
                          className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="עריכת אבן דרך"
                        >
                          <Pencil size={16} />
                        </Link>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 bg-white dark:bg-gray-800">
                        {tasksState?.loading ? (
                          <div className="text-sm text-gray-500 dark:text-gray-400">טוען משימות…</div>
                        ) : (tasksState?.tasks || []).length === 0 ? (
                          <div className="text-sm text-gray-500 dark:text-gray-400">אין משימות באבן דרך.</div>
                        ) : (
                          <div className="space-y-2">
                            {(tasksState?.tasks || []).map((t) => (
                              <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    {t.code && (
                                      <span className="text-xs px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                                        {t.code}
                                      </span>
                                    )}
                                    <span className="text-sm text-gray-900 dark:text-white truncate">{t.title}</span>
                                  </div>
                                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    סטטוס: {t.status}
                                  </div>
                                </div>
                                <Link
                                  to={slug ? `/${slug}/tasks?edit=${t.id}` : '/select-organization'}
                                  className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                  title="עריכת משימה"
                                >
                                  <Pencil size={16} />
                                </Link>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {sprint.storiesNextCursor && (
              <button
                onClick={loadMoreStories}
                disabled={loadingMoreStories}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 disabled:opacity-50"
              >
                {loadingMoreStories ? 'טוען…' : 'טען עוד אבני דרך'}
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Tasks (standalone) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('tasks')}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-2">
            {sectionsOpen.tasks ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span className="font-semibold text-gray-900 dark:text-white">משימות עצמאיות בספרינט</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">({standaloneTasks.length})</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">לחץ כדי לפתוח/לסגור</div>
        </button>

        {sectionsOpen.tasks && (
          <div className="px-5 pb-5 space-y-3">
            {standaloneTasks.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">אין משימות עצמאיות שמקושרות לספרינט.</div>
            ) : (
              standaloneTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {t.code && (
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                          {t.code}
            </span>
          )}
                      <span className="text-sm text-gray-900 dark:text-white truncate">{t.title}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      סטטוס: {t.status}
                    </div>
        </div>
                  <Link
                    to={slug ? `/${slug}/tasks?edit=${t.id}` : '/select-organization'}
                    className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    title="עריכת משימה"
                  >
                    <Pencil size={16} />
                  </Link>
            </div>
              ))
            )}

            {sprint.standaloneTasksNextCursor && (
              <button
                onClick={loadMoreStandaloneTasks}
                disabled={loadingMoreTasks}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 disabled:opacity-50"
              >
                {loadingMoreTasks ? 'טוען…' : 'טען עוד משימות'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SprintBoard;
