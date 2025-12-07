import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Battery, ProgressInput } from '../components/ui/Battery';
import { Skeleton } from '../components/ui/Skeleton';

const QUARTERS = [
  { value: 1, label: 'Q1' },
  { value: 2, label: 'Q2' },
  { value: 3, label: 'Q3' },
  { value: 4, label: 'Q4' }
];

const YEARS = [2024, 2025, 2026, 2027];

export default function Rocks() {
  const [rocks, setRocks] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    objectiveId: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRock, setEditingRock] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    progress: 0,
    ownerId: '',
    objectiveId: ''
  });

  const { loading, request } = useApi();

  useEffect(() => {
    fetchRocks();
    fetchObjectives();
    fetchTeamMembers();
  }, [filters.year, filters.quarter, filters.objectiveId]);

  const fetchRocks = async () => {
    let url = '/api/rocks';
    const params = new URLSearchParams();
    if (filters.year) params.append('year', filters.year);
    if (filters.quarter) params.append('quarter', filters.quarter);
    if (filters.objectiveId) params.append('objectiveId', filters.objectiveId);
    if (params.toString()) url += `?${params.toString()}`;

    const data = await request(url, { showToast: false });
    if (data) setRocks(data);
  };

  const fetchObjectives = async () => {
    const data = await request('/api/objectives', { showToast: false });
    if (data) setObjectives(data);
  };

  const fetchTeamMembers = async () => {
    const data = await request('/api/team', { showToast: false });
    if (data) setTeamMembers(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const url = editingRock ? `/api/rocks/${editingRock.id}` : '/api/rocks';
    const method = editingRock ? 'PUT' : 'POST';

    const result = await request(url, {
      method,
      body: formData,
      successMessage: editingRock ? 'סלע עודכן בהצלחה' : 'סלע נוצר בהצלחה'
    });

    if (result) {
      setIsModalOpen(false);
      resetForm();
      fetchRocks();
    }
  };

  const handleEdit = (rock) => {
    setEditingRock(rock);
    setFormData({
      code: rock.code,
      name: rock.name,
      description: rock.description || '',
      year: rock.year,
      quarter: rock.quarter,
      progress: rock.progress || 0,
      ownerId: rock.ownerId || '',
      objectiveId: rock.objectiveId || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את הסלע?')) return;

    const result = await request(`/api/rocks/${id}`, {
      method: 'DELETE',
      successMessage: 'סלע נמחק בהצלחה'
    });

    if (result) fetchRocks();
  };

  const handleCarryOver = async (rock) => {
    if (!confirm(`האם להעביר את "${rock.name}" לרבעון הבא?`)) return;

    const result = await request(`/api/rocks/${rock.id}/carry-over`, {
      method: 'POST',
      successMessage: 'סלע הועבר לרבעון הבא'
    });

    if (result) fetchRocks();
  };

  const handleProgressUpdate = async (rockId, progress) => {
    const result = await request(`/api/rocks/${rockId}/progress`, {
      method: 'PUT',
      body: { progress },
      successMessage: 'התקדמות עודכנה'
    });

    if (result) {
      setRocks(rocks.map(r => 
        r.id === rockId ? { ...r, progress, effectiveProgress: progress } : r
      ));
    }
  };

  const resetForm = () => {
    setEditingRock(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      year: filters.year,
      quarter: filters.quarter,
      progress: 0,
      ownerId: '',
      objectiveId: ''
    });
  };

  const openNewModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const generateCode = () => {
    const existingCodes = rocks.map(r => r.code);
    let num = 1;
    let code;
    do {
      code = `${formData.year}-Q${formData.quarter}-${String(num).padStart(2, '0')}`;
      num++;
    } while (existingCodes.includes(code));
    setFormData({ ...formData, code });
  };

  if (loading && rocks.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64 rounded-xl" />
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">סלעים</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            יעדים רבעוניים אסטרטגיים
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/25"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>סלע חדש</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <select
          value={filters.year}
          onChange={e => setFilters({...filters, year: parseInt(e.target.value)})}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          {YEARS.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <select
          value={filters.quarter}
          onChange={e => setFilters({...filters, quarter: parseInt(e.target.value)})}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          {QUARTERS.map(q => (
            <option key={q.value} value={q.value}>{q.label}</option>
          ))}
        </select>

        <select
          value={filters.objectiveId}
          onChange={e => setFilters({...filters, objectiveId: e.target.value})}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">כל מטרות-העל</option>
          {objectives.map(obj => (
            <option key={obj.id} value={obj.id}>{obj.code} - {obj.name}</option>
          ))}
        </select>

        <span className="flex items-center text-sm text-gray-500 dark:text-gray-400 mr-auto">
          {rocks.length} סלעים
        </span>
      </div>

      {/* Rocks Grid */}
      {rocks.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-4">🪨</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            אין סלעים ב-{filters.year} Q{filters.quarter}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            צור את הסלע הראשון לרבעון זה
          </p>
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            צור סלע
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rocks.map((rock) => (
            <div
              key={rock.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-lg">
                      {rock.code}
                    </span>
                    {rock.isCarriedOver && (
                      <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-lg flex items-center gap-1">
                        <span>↪</span> גלש מ-Q{rock.carriedFromQuarter}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {rock.name}
                  </h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleCarryOver(rock)}
                    title="העבר לרבעון הבא"
                    className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleEdit(rock)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(rock.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Description */}
              {rock.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                  {rock.description}
                </p>
              )}

              {/* Progress with Battery */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">התקדמות</span>
                  {rock.calculatedProgress !== rock.effectiveProgress && (
                    <span className="text-xs text-gray-400" title="מחושב מאבני דרך">
                      (מחושב: {rock.calculatedProgress}%)
                    </span>
                  )}
                </div>
                <Battery progress={rock.effectiveProgress || 0} size="md" showLabel={true} />
              </div>

              {/* Stories Summary */}
              <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                <span>{rock.totalStories || 0} אבני דרך</span>
                {rock.completedStories > 0 && (
                  <span className="text-green-600 dark:text-green-400">✓ {rock.completedStories} הושלמו</span>
                )}
                {rock.blockedStories > 0 && (
                  <span className="text-red-600 dark:text-red-400">⚠ {rock.blockedStories} חסומות</span>
                )}
              </div>

              {/* Meta */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                {rock.objective && (
                  <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-lg">
                    🎯 {rock.objective.code}
                  </span>
                )}
                {rock.owner && (
                  <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-[10px] font-medium">
                      {rock.owner.name?.charAt(0)}
                    </div>
                    {rock.owner.name}
                  </span>
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingRock ? 'עריכת סלע' : 'סלע חדש'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Code with auto-generate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  קוד <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    placeholder="2025-Q4-01"
                    className="flex-1 px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={generateCode}
                    className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                  >
                    צור אוטומטית
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  פורמט: שנה-רבעון-מספר (מזהה ייחודי קבוע)
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שם <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="שם הסלע"
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תיאור
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="תיאור הסלע..."
                  rows={2}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

              {/* Year & Quarter */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    שנה <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.year}
                    onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {YEARS.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    רבעון <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.quarter}
                    onChange={e => setFormData({...formData, quarter: parseInt(e.target.value)})}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {QUARTERS.map(q => (
                      <option key={q.value} value={q.value}>{q.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Progress */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  התקדמות
                </label>
                <ProgressInput
                  value={formData.progress}
                  onChange={progress => setFormData({...formData, progress})}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  מחושב אוטומטית מאבני הדרך, ניתן לשינוי ידני
                </p>
              </div>

              {/* Owner */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  אחראי
                </label>
                <select
                  value={formData.ownerId}
                  onChange={e => setFormData({...formData, ownerId: e.target.value})}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">ללא</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              {/* Objective */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  מטרת-על
                </label>
                <select
                  value={formData.objectiveId}
                  onChange={e => setFormData({...formData, objectiveId: e.target.value})}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">ללא</option>
                  {objectives.map(obj => (
                    <option key={obj.id} value={obj.id}>{obj.code} - {obj.name}</option>
                  ))}
                </select>
              </div>

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
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'שומר...' : (editingRock ? 'עדכן' : 'צור')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
