import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Battery, BatteryCompact } from '../components/ui/Battery';
import { Skeleton } from '../components/ui/Skeleton';

export default function Objectives() {
  const [objectives, setObjectives] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    ownerId: ''
  });
  
  const { loading, request } = useApi();

  useEffect(() => {
    fetchObjectives();
    fetchTeamMembers();
  }, []);

  const fetchObjectives = async () => {
    const data = await request('/api/objectives');
    if (data && Array.isArray(data)) setObjectives(data);
  };

  const fetchTeamMembers = async () => {
    const data = await request('/api/team', { showToast: false });
    if (data && Array.isArray(data)) setTeamMembers(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const url = editingObjective 
      ? `/api/objectives/${editingObjective.id}`
      : '/api/objectives';
    const method = editingObjective ? 'PUT' : 'POST';

    const result = await request(url, {
      method,
      body: formData,
      successMessage: editingObjective ? 'מטרת-על עודכנה בהצלחה' : 'מטרת-על נוצרה בהצלחה'
    });

    if (result) {
      setIsModalOpen(false);
      resetForm();
      fetchObjectives();
    }
  };

  const handleEdit = (objective) => {
    setEditingObjective(objective);
    setFormData({
      code: objective.code,
      name: objective.name,
      description: objective.description || '',
      ownerId: objective.ownerId || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את מטרת-העל?')) return;

    const result = await request(`/api/objectives/${id}`, {
      method: 'DELETE',
      successMessage: 'מטרת-על נמחקה בהצלחה'
    });

    if (result) {
      fetchObjectives();
    }
  };

  const resetForm = () => {
    setEditingObjective(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      ownerId: ''
    });
  };

  const openNewModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  if (loading && objectives.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">מטרות-על</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            מטרות אסטרטגיות שמאגדות סלעים
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/25"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>מטרת-על חדשה</span>
        </button>
      </div>

      {/* Objectives Grid */}
      {objectives.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            אין עדיין מטרות-על
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            צור את מטרת-העל הראשונה שלך
          </p>
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            צור מטרת-על
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {objectives.map((objective) => (
            <div
              key={objective.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-lg mb-2">
                    {objective.code}
                  </span>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {objective.name}
                  </h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(objective)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(objective.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Description */}
              {objective.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                  {objective.description}
                </p>
              )}

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">התקדמות כוללת</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{objective.rocksCount || 0} סלעים</span>
                </div>
                <Battery progress={objective.progress || 0} size="md" showLabel={true} />
              </div>

              {/* Owner */}
              {objective.owner && (
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-xs font-medium">
                    {objective.owner.name?.charAt(0)}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{objective.owner.name}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingObjective ? 'עריכת מטרת-על' : 'מטרת-על חדשה'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  קוד <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  placeholder="OBJ-01"
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">מזהה ייחודי למטרה</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שם <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="שם מטרת-העל"
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תיאור
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="תיאור מטרת-העל..."
                  rows={3}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  אחראי
                </label>
                <select
                  value={formData.ownerId}
                  onChange={e => setFormData({...formData, ownerId: e.target.value})}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">ללא</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

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
                  className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'שומר...' : (editingObjective ? 'עדכן' : 'צור')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
