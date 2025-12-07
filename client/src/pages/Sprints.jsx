import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Battery } from '../components/ui/Battery';
import { Skeleton } from '../components/ui/Skeleton';

const QUARTERS = [
  { value: 1, label: 'Q1' },
  { value: 2, label: 'Q2' },
  { value: 3, label: 'Q3' },
  { value: 4, label: 'Q4' }
];

const YEARS = [2024, 2025, 2026, 2027];
const SPRINT_NUMBERS = [1, 2, 3, 4, 5, 6];

export default function Sprints() {
  const [sprints, setSprints] = useState([]);
  const [rocks, setRocks] = useState([]);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3)
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    sprintNumber: 1,
    goal: '',
    startDate: '',
    endDate: '',
    rockIds: []
  });

  const { loading, request } = useApi();

  useEffect(() => {
    fetchSprints();
    fetchRocks();
  }, [filters.year, filters.quarter]);

  const fetchSprints = async () => {
    let url = '/api/sprints';
    const params = new URLSearchParams();
    if (filters.year) params.append('year', filters.year);
    if (filters.quarter) params.append('quarter', filters.quarter);
    if (params.toString()) url += `?${params.toString()}`;

    const data = await request(url, { showToast: false });
    if (data) setSprints(data);
  };

  const fetchRocks = async () => {
    const data = await request(`/api/rocks?year=${filters.year}&quarter=${filters.quarter}`, { showToast: false });
    if (data) setRocks(data);
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
      year: sprint.year,
      quarter: sprint.quarter,
      sprintNumber: sprint.sprintNumber,
      goal: sprint.goal || '',
      startDate: sprint.startDate?.slice(0, 10) || '',
      endDate: sprint.endDate?.slice(0, 10) || '',
      rockIds: sprint.rocks?.map(r => r.id) || []
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
    // Find next available sprint number
    const existingNumbers = sprints
      .filter(s => s.year === filters.year && s.quarter === filters.quarter)
      .map(s => s.sprintNumber);
    const nextNumber = SPRINT_NUMBERS.find(n => !existingNumbers.includes(n)) || 1;

    setFormData({
      year: filters.year,
      quarter: filters.quarter,
      sprintNumber: nextNumber,
      goal: '',
      startDate: '',
      endDate: '',
      rockIds: []
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

  // Generate sprint name preview
  const sprintNamePreview = `${formData.year}-Q${formData.quarter}-S${formData.sprintNumber}`;

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
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {sprint.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(sprint.startDate).toLocaleDateString('he-IL')} - {new Date(sprint.endDate).toLocaleDateString('he-IL')}
                  </p>
                </div>
                <div className="flex gap-1">
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

              {/* Rocks */}
              {sprint.rocks && sprint.rocks.length > 0 && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">סלעים מקושרים:</p>
                  <div className="flex flex-wrap gap-2">
                    {sprint.rocks.map(rock => (
                      <span
                        key={rock.id}
                        className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg"
                      >
                        {rock.code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stories Stats */}
              {sprint.blockedStories > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-red-600 dark:text-red-400">
                    ⚠ {sprint.blockedStories} אבני דרך חסומות
                  </span>
                </div>
              )}
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
            
            {/* Sprint Name Preview */}
            <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-xs text-green-600 dark:text-green-400">שם הספרינט:</span>
              <span className="block text-lg font-semibold text-green-700 dark:text-green-300">
                {sprintNamePreview}
              </span>
              <span className="text-xs text-green-600 dark:text-green-400">
                (נוצר אוטומטית מהשנה, רבעון ומספר ספרינט)
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Year, Quarter, Sprint Number */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    שנה
                  </label>
                  <select
                    value={formData.year}
                    onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-sm"
                  >
                    {YEARS.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    רבעון
                  </label>
                  <select
                    value={formData.quarter}
                    onChange={e => setFormData({...formData, quarter: parseInt(e.target.value)})}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-sm"
                  >
                    {QUARTERS.map(q => (
                      <option key={q.value} value={q.value}>{q.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    מספר
                  </label>
                  <select
                    value={formData.sprintNumber}
                    onChange={e => setFormData({...formData, sprintNumber: parseInt(e.target.value)})}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-sm"
                  >
                    {SPRINT_NUMBERS.map(n => (
                      <option key={n} value={n}>S{n}</option>
                    ))}
                  </select>
                </div>
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
                <textarea
                  value={formData.goal}
                  onChange={e => setFormData({...formData, goal: e.target.value})}
                  placeholder="מה אנחנו רוצים להשיג בספרינט הזה?"
                  rows={2}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

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
