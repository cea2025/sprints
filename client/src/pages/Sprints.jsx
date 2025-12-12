import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useOrganization } from '../context/OrganizationContext';
import { Battery, BatteryCompact } from '../components/ui/Battery';
import { Skeleton } from '../components/ui/Skeleton';
import { usePermissions } from '../hooks/usePermissions';
import ResizableTextarea from '../components/ui/ResizableTextarea';

const QUARTERS = [
  { value: 1, label: 'Q1' },
  { value: 2, label: 'Q2' },
  { value: 3, label: 'Q3' },
  { value: 4, label: 'Q4' }
];

const YEARS = [2024, 2025, 2026, 2027];

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

export default function Sprints() {
  const [sprints, setSprints] = useState([]);
  const [rocks, setRocks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [openSectionsBySprint, setOpenSectionsBySprint] = useState({}); // sprintId -> { rocks, stories, tasks }
  const [detailsBySprintId, setDetailsBySprintId] = useState({}); // sprintId -> sprint detail payload
  const [loadingDetailsBySprintId, setLoadingDetailsBySprintId] = useState({}); // sprintId -> boolean
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3)
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    goal: '',
    startDate: '',
    endDate: '',
    rockIds: [],
    teamId: ''
  });

  const { loading, request } = useApi();
  const { currentOrganization } = useOrganization();
  const { isAdmin } = usePermissions();
  const { slug } = useParams();
  const location = useLocation();
  const basePath = slug ? `/${slug}` : '';
  const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);

  useEffect(() => {
    if (!currentOrganization) return;
    fetchSprints();
    fetchRocks();
    if (isAdmin) fetchTeams();
  }, [filters.year, filters.quarter, currentOrganization?.id]);

  const fetchSprints = async () => {
    let url = '/api/sprints';
    const params = new URLSearchParams();
    if (filters.year) params.append('year', filters.year);
    if (filters.quarter) params.append('quarter', filters.quarter);
    if (params.toString()) url += `?${params.toString()}`;

    const data = await request(url, { showToast: false });
    if (data && Array.isArray(data)) setSprints(data);
  };

  const fetchRocks = async () => {
    const data = await request(`/api/rocks?year=${filters.year}&quarter=${filters.quarter}`, { showToast: false });
    if (data && Array.isArray(data)) setRocks(data);
  };

  const fetchTeams = async () => {
    const data = await request('/api/teams', { showToast: false });
    if (data && Array.isArray(data)) setTeams(data);
  };

  const ensureSprintDetails = async (sprintId) => {
    if (!sprintId) return null;
    if (detailsBySprintId[sprintId]) return detailsBySprintId[sprintId];
    if (loadingDetailsBySprintId[sprintId]) return null;

    setLoadingDetailsBySprintId(prev => ({ ...prev, [sprintId]: true }));
    try {
      const data = await request(
        `/api/sprints/${sprintId}?storiesLimit=20&linkedTasksLimit=20&tasksLimit=20`,
        { showToast: false }
      );
      if (data) {
        setDetailsBySprintId(prev => ({ ...prev, [sprintId]: data }));
        return data;
      }
      return null;
    } finally {
      setLoadingDetailsBySprintId(prev => ({ ...prev, [sprintId]: false }));
    }
  };

  const toggleSection = async (sprintId, sectionKey) => {
    if (!sprintId) return;
    const isOpening = !(openSectionsBySprint[sprintId]?.[sectionKey]);

    setOpenSectionsBySprint(prev => ({
      ...prev,
      [sprintId]: {
        rocks: false,
        stories: false,
        tasks: false,
        ...(prev[sprintId] || {}),
        [sectionKey]: isOpening
      }
    }));

    if (isOpening) {
      await ensureSprintDetails(sprintId);
    }
  };

  const loadMoreStories = async (sprintId) => {
    const current = detailsBySprintId[sprintId];
    if (!current?.storiesNextCursor) return;
    const data = await request(
      `/api/sprints/${sprintId}?storiesLimit=20&storiesCursor=${encodeURIComponent(current.storiesNextCursor)}&linkedTasksLimit=0&tasksLimit=0`,
      { showToast: false }
    );
    if (!data) return;
    setDetailsBySprintId(prev => ({
      ...prev,
      [sprintId]: {
        ...current,
        stories: [...(current.stories || []), ...(data.stories || [])],
        storiesNextCursor: data.storiesNextCursor ?? null
      }
    }));
  };

  const loadMoreLinkedTasks = async (sprintId) => {
    const current = detailsBySprintId[sprintId];
    if (!current?.linkedTasksNextCursor) return;
    const data = await request(
      `/api/sprints/${sprintId}?storiesLimit=0&linkedTasksLimit=20&linkedTasksCursor=${encodeURIComponent(current.linkedTasksNextCursor)}&tasksLimit=0`,
      { showToast: false }
    );
    if (!data) return;
    setDetailsBySprintId(prev => ({
      ...prev,
      [sprintId]: {
        ...current,
        linkedTasks: [...(current.linkedTasks || []), ...(data.linkedTasks || [])],
        linkedTasksNextCursor: data.linkedTasksNextCursor ?? null
      }
    }));
  };

  const loadMoreStandaloneTasks = async (sprintId) => {
    const current = detailsBySprintId[sprintId];
    if (!current?.standaloneTasksNextCursor) return;
    const data = await request(
      `/api/sprints/${sprintId}?storiesLimit=0&linkedTasksLimit=0&tasksLimit=20&tasksCursor=${encodeURIComponent(current.standaloneTasksNextCursor)}`,
      { showToast: false }
    );
    if (!data) return;
    setDetailsBySprintId(prev => ({
      ...prev,
      [sprintId]: {
        ...current,
        standaloneTasks: [...(current.standaloneTasks || []), ...(data.standaloneTasks || [])],
        standaloneTasksNextCursor: data.standaloneTasksNextCursor ?? null
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const url = editingSprint ? `/api/sprints/${editingSprint.id}` : '/api/sprints';
    const method = editingSprint ? 'PUT' : 'POST';

    const result = await request(url, {
      method,
      body: formData,
      successMessage: editingSprint ? 'ספרינט עודכן בהצלחה' : 'ספרינט נוצר בהצלחה'
    });

    if (result) {
      setIsModalOpen(false);
      resetForm();
      fetchSprints();
    }
  };

  const handleEdit = (sprint) => {
    setEditingSprint(sprint);
    setFormData({
      name: sprint.name || '',
      goal: sprint.goal || '',
      startDate: sprint.startDate?.slice(0, 10) || '',
      endDate: sprint.endDate?.slice(0, 10) || '',
      rockIds: sprint.rocks?.map(r => r.id) || [],
      teamId: sprint.teamId || sprint.team?.id || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את הספרינט?')) return;

    const result = await request(`/api/sprints/${id}`, {
      method: 'DELETE',
      successMessage: 'ספרינט נמחק בהצלחה'
    });

    if (result) fetchSprints();
  };

  const resetForm = () => {
    setEditingSprint(null);
    setFormData({
      name: '',
      goal: '',
      startDate: '',
      endDate: '',
      rockIds: [],
      teamId: ''
    });
  };

  const openNewModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const toggleRock = (rockId) => {
    setFormData(prev => ({
      ...prev,
      rockIds: prev.rockIds.includes(rockId)
        ? prev.rockIds.filter(id => id !== rockId)
        : [...prev.rockIds, rockId]
    }));
  };

  if (loading && sprints.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ספרינטים</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            תקופות עבודה קצובות (בד"כ שבועיים)
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/25"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>ספרינט חדש</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <select
          value={filters.year}
          onChange={e => setFilters({...filters, year: parseInt(e.target.value)})}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          {YEARS.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <select
          value={filters.quarter}
          onChange={e => setFilters({...filters, quarter: parseInt(e.target.value)})}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          {QUARTERS.map(q => (
            <option key={q.value} value={q.value}>{q.label}</option>
          ))}
        </select>

        <span className="flex items-center text-sm text-gray-500 dark:text-gray-400 mr-auto">
          {sprints.length} ספרינטים
        </span>
      </div>

      {/* Sprints Grid */}
      {sprints.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-4">🏃‍♂️</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            אין ספרינטים ב-{filters.year} Q{filters.quarter}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            צור את הספרינט הראשון לרבעון זה
          </p>
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            צור ספרינט
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sprints.map((sprint) => (
            <div
              key={sprint.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{sprint.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <span dir="ltr">
                      {formatDateIL(sprint.startDate)} - {formatDateIL(sprint.endDate)}
                    </span>
                  </p>
                </div>
                <div className="flex gap-1">
                  <Link
                    to={`${basePath}/stories?new=1&prefillSprintId=${sprint.id}&returnTo=${returnTo}`}
                    className="p-1.5 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                    title="אבן דרך חדשה בספרינט"
                  >
                    <Plus className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleEdit(sprint)}
                    className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(sprint.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Goal */}
              {sprint.goal && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  🎯 {sprint.goal}
                </p>
              )}

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">התקדמות</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {sprint.completedStories || 0}/{sprint.totalStories || 0} אבני דרך
                  </span>
                </div>
                <Battery progress={sprint.progress || 0} size="md" showLabel={true} />
              </div>

              {/* Time */}
              {sprint.startDate && sprint.endDate && (() => {
                const meta = getSprintTimeMeta(sprint.startDate, sprint.endDate);
                if (meta.state === 'invalid') return null;
                return (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">זמן</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {meta.state === 'upcoming'
                          ? 'עוד לא התחיל'
                          : meta.state === 'ended'
                            ? 'הסתיים'
                            : `${meta.percent}% עבר`}
                        {meta.state === 'active' && typeof meta.daysRemaining === 'number'
                          ? ` • נשארו ${meta.daysRemaining} ימים`
                          : ''}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-2 bg-gradient-to-r from-green-600 to-emerald-600"
                        style={{ width: `${meta.percent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Collapsible sections (default closed) */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
                {/* Rocks */}
                <button
                  type="button"
                  onClick={() => toggleSection(sprint.id, 'rocks')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                    {openSectionsBySprint[sprint.id]?.rocks ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span>סלעים</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({Array.isArray(sprint.rocks) ? sprint.rocks.length : 0})
                  </span>
                </button>

                {openSectionsBySprint[sprint.id]?.rocks && (
                  <div className="px-3 pb-2">
                    {(Array.isArray(sprint.rocks) ? sprint.rocks : []).length === 0 ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400">לחץ כדי לפתוח/לסגור</div>
                    ) : (
                      <div className="space-y-2">
                        {(Array.isArray(sprint.rocks) ? sprint.rocks : []).map((r) => (
                          <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                                  {r.code}
                                </span>
                                <span className="text-sm text-gray-900 dark:text-white truncate">{r.name}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <BatteryCompact progress={r.progress || 0} />
                              <Link
                                to={`${basePath}/rocks?edit=${r.id}&returnTo=${returnTo}`}
                                className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title="עריכת סלע"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Stories */}
                <button
                  type="button"
                  onClick={() => toggleSection(sprint.id, 'stories')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                    {openSectionsBySprint[sprint.id]?.stories ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span>אבני דרך</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">({sprint.totalStories || 0})</span>
                </button>

                {openSectionsBySprint[sprint.id]?.stories && (
                  <div className="px-3 pb-2">
                    {loadingDetailsBySprintId[sprint.id] && !detailsBySprintId[sprint.id] ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400">טוען…</div>
                    ) : ((detailsBySprintId[sprint.id]?.stories || []).length === 0) ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400">אין אבני דרך בספרינט.</div>
                    ) : (
                      <div className="space-y-2">
                        {(detailsBySprintId[sprint.id]?.stories || []).map((st) => (
                          <div key={st.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-900 dark:text-white truncate">{st.title}</span>
                                {st.isBlocked && (
                                  <span className="text-xs px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                    חסום
                                  </span>
                                )}
                              </div>
                              <div className="mt-2">
                                <Battery progress={st.progress || 0} size="xs" />
                              </div>
                            </div>
                            <Link
                              to={`${basePath}/stories?edit=${st.id}&returnTo=${returnTo}`}
                              className="p-1.5 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                              title="עריכת אבן דרך"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </Link>
                          </div>
                        ))}

                        {detailsBySprintId[sprint.id]?.storiesNextCursor && (
                          <button
                            type="button"
                            onClick={() => loadMoreStories(sprint.id)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                          >
                            טען עוד אבני דרך
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tasks */}
                <button
                  type="button"
                  onClick={() => toggleSection(sprint.id, 'tasks')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                    {openSectionsBySprint[sprint.id]?.tasks ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span>משימות</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {detailsBySprintId[sprint.id]
                      ? `(${(detailsBySprintId[sprint.id]?.linkedTasks || []).length + (detailsBySprintId[sprint.id]?.standaloneTasks || []).length})`
                      : '(—)'}
                  </span>
                </button>

                {openSectionsBySprint[sprint.id]?.tasks && (
                  <div className="px-3 pb-2 space-y-3">
                    {loadingDetailsBySprintId[sprint.id] && !detailsBySprintId[sprint.id] ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400">טוען…</div>
                    ) : (
                      <>
                        <div>
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">משימות באבני דרך</div>
                          {(detailsBySprintId[sprint.id]?.linkedTasks || []).length === 0 ? (
                            <div className="text-sm text-gray-500 dark:text-gray-400">אין משימות שמקושרות לאבני דרך בספרינט.</div>
                          ) : (
                            <div className="space-y-2">
                              {(detailsBySprintId[sprint.id]?.linkedTasks || []).map((t) => (
                                <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      {t.code && (
                                        <span className="text-xs px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                                          {t.code}
                                        </span>
                                      )}
                                      <span className="text-sm text-gray-900 dark:text-white truncate">{t.title}</span>
                                      {t.story?.title && (
                                        <span className="text-xs px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 truncate max-w-[10rem]">
                                          📋 {t.story.title}
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">סטטוס: {t.status}</div>
                                  </div>
                                  <Link
                                    to={`${basePath}/tasks?edit=${t.id}&returnTo=${returnTo}`}
                                    className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                    title="עריכת משימה"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </Link>
                                </div>
                              ))}
                            </div>
                          )}

                          {detailsBySprintId[sprint.id]?.linkedTasksNextCursor && (
                            <button
                              type="button"
                              onClick={() => loadMoreLinkedTasks(sprint.id)}
                              className="mt-3 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                            >
                              טען עוד משימות (אבני דרך)
                            </button>
                          )}
                        </div>

                        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">משימות עצמאיות בספרינט</div>
                          {(detailsBySprintId[sprint.id]?.standaloneTasks || []).length === 0 ? (
                            <div className="text-sm text-gray-500 dark:text-gray-400">אין משימות עצמאיות שמקושרות לספרינט.</div>
                          ) : (
                            <div className="space-y-2">
                              {(detailsBySprintId[sprint.id]?.standaloneTasks || []).map((t) => (
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
                                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">סטטוס: {t.status}</div>
                                  </div>
                                  <Link
                                    to={`${basePath}/tasks?edit=${t.id}&returnTo=${returnTo}`}
                                    className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                    title="עריכת משימה"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </Link>
                                </div>
                              ))}
                            </div>
                          )}

                          {detailsBySprintId[sprint.id]?.standaloneTasksNextCursor && (
                            <button
                              type="button"
                              onClick={() => loadMoreStandaloneTasks(sprint.id)}
                              className="mt-3 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                            >
                              טען עוד משימות
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {editingSprint ? 'עריכת ספרינט' : 'ספרינט חדש'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Sprint code (sp-XX) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  קוד ספרינט (sp-XX)
                </label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={editingSprint ? 'sp-01' : 'ריק = יווצר אוטומטית'}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  אם משאירים ריק—המערכת תבחר אוטומטית את הקוד הבא (sp-01, sp-02, ...). ניתן לשינוי ידני.
                </p>
                {editingSprint?.legacyName && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    שם ישן: <span className="font-mono">{editingSprint.legacyName}</span>
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    תאריך התחלה <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    תאריך סיום <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Goal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  מטרת הספרינט
                </label>
                <ResizableTextarea
                  value={formData.goal}
                  onChange={e => setFormData({...formData, goal: e.target.value})}
                  placeholder="מה אנחנו רוצים להשיג בספרינט הזה?"
                  minRows={2}
                  maxRows={6}
                  className="focus:ring-green-500"
                />
              </div>

              {/* Team (MANAGER+) */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    צוות
                  </label>
                  <select
                    value={formData.teamId}
                    onChange={e => setFormData({ ...formData, teamId: e.target.value })}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">ברירת מחדל</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Linked Rocks */}
              {rocks.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    סלעים מקושרים
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    {rocks.map(rock => (
                      <label
                        key={rock.id}
                        className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.rockIds.includes(rock.id)}
                          onChange={() => toggleRock(rock.id)}
                          className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                            {rock.code}
                          </span>
                          <span className="mr-2 text-sm text-gray-700 dark:text-gray-300 truncate">
                            {rock.name}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'שומר...' : (editingSprint ? 'עדכן' : 'צור')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
