import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Battery, BatteryCompact, ProgressInput } from '../components/ui/Battery';
import { Skeleton } from '../components/ui/Skeleton';

export default function Stories() {
  const [stories, setStories] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [rocks, setRocks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [filters, setFilters] = useState({
    sprintId: '',
    rockId: '',
    isBlocked: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    progress: 0,
    isBlocked: false,
    sprintId: '',
    rockId: '',
    ownerId: ''
  });

  const { loading, request } = useApi();

  useEffect(() => {
    fetchStories();
    fetchSprints();
    fetchRocks();
    fetchTeamMembers();
  }, [filters]);

  const fetchStories = async () => {
    let url = '/api/stories';
    const params = new URLSearchParams();
    if (filters.sprintId) params.append('sprintId', filters.sprintId);
    if (filters.rockId) params.append('rockId', filters.rockId);
    if (filters.isBlocked) params.append('isBlocked', filters.isBlocked);
    if (params.toString()) url += `?${params.toString()}`;

    const data = await request(url, { showToast: false });
    if (data) setStories(data);
  };

  const fetchSprints = async () => {
    const data = await request('/api/sprints', { showToast: false });
    if (data) setSprints(data);
  };

  const fetchRocks = async () => {
    const data = await request('/api/rocks', { showToast: false });
    if (data) setRocks(data);
  };

  const fetchTeamMembers = async () => {
    const data = await request('/api/team', { showToast: false });
    if (data) setTeamMembers(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.sprintId) {
      alert('ספרינט הוא שדה חובה');
      return;
    }
    if (!formData.ownerId) {
      alert('אחראי הוא שדה חובה');
      return;
    }

    const url = editingStory ? `/api/stories/${editingStory.id}` : '/api/stories';
    const method = editingStory ? 'PUT' : 'POST';

    const result = await request(url, {
      method,
      body: formData,
      successMessage: editingStory ? 'אבן דרך עודכנה בהצלחה' : 'אבן דרך נוצרה בהצלחה'
    });

    if (result) {
      setIsModalOpen(false);
      resetForm();
      fetchStories();
    }
  };

  const handleEdit = (story) => {
    setEditingStory(story);
    setFormData({
      title: story.title,
      description: story.description || '',
      progress: story.progress || 0,
      isBlocked: story.isBlocked || false,
      sprintId: story.sprintId,
      rockId: story.rockId || '',
      ownerId: story.ownerId
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את אבן הדרך?')) return;

    const result = await request(`/api/stories/${id}`, {
      method: 'DELETE',
      successMessage: 'אבן דרך נמחקה בהצלחה'
    });

    if (result) fetchStories();
  };

  const handleProgressUpdate = async (storyId, progress) => {
    const result = await request(`/api/stories/${storyId}/progress`, {
      method: 'PUT',
      body: { progress },
      successMessage: 'התקדמות עודכנה'
    });

    if (result) {
      setStories(stories.map(s => 
        s.id === storyId ? { ...s, progress } : s
      ));
    }
  };

  const handleBlockToggle = async (story) => {
    const result = await request(`/api/stories/${story.id}/block`, {
      method: 'PUT',
      successMessage: story.isBlocked ? 'אבן דרך שוחררה' : 'אבן דרך סומנה כחסומה'
    });

    if (result) {
      setStories(stories.map(s => 
        s.id === story.id ? { ...s, isBlocked: !s.isBlocked } : s
      ));
    }
  };

  const resetForm = () => {
    setEditingStory(null);
    setFormData({
      title: '',
      description: '',
      progress: 0,
      isBlocked: false,
      sprintId: filters.sprintId || '',
      rockId: filters.rockId || '',
      ownerId: ''
    });
  };

  const openNewModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  if (loading && stories.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl" />
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">אבני דרך</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            משימות ויחידות עבודה בתוך ספרינטים
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all shadow-lg shadow-orange-500/25"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>אבן דרך חדשה</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <select
          value={filters.sprintId}
          onChange={e => setFilters({...filters, sprintId: e.target.value})}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">כל הספרינטים</option>
          {sprints.map(sprint => (
            <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
          ))}
        </select>

        <select
          value={filters.rockId}
          onChange={e => setFilters({...filters, rockId: e.target.value})}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">כל הסלעים</option>
          {rocks.map(rock => (
            <option key={rock.id} value={rock.id}>{rock.code} - {rock.name}</option>
          ))}
        </select>

        <select
          value={filters.isBlocked}
          onChange={e => setFilters({...filters, isBlocked: e.target.value})}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">כל הסטטוסים</option>
          <option value="true">חסומות בלבד</option>
          <option value="false">לא חסומות</option>
        </select>

        <span className="flex items-center text-sm text-gray-500 dark:text-gray-400 mr-auto">
          {stories.length} אבני דרך
        </span>
      </div>

      {/* Stories List */}
      {stories.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            אין אבני דרך
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            צור את אבן הדרך הראשונה שלך
          </p>
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            צור אבן דרך
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {stories.map((story) => (
            <div
              key={story.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border ${
                story.isBlocked 
                  ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' 
                  : 'border-gray-200 dark:border-gray-700'
              } p-4 hover:shadow-md transition-all`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Title & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className={`font-medium ${
                      story.isBlocked 
                        ? 'text-red-800 dark:text-red-300' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {story.title}
                    </h3>
                    {story.isBlocked && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-full flex items-center gap-1">
                        <span>🚫</span> חסום
                      </span>
                    )}
                  </div>
                  {story.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">
                      {story.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {story.sprint && (
                      <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
                        🏃 {story.sprint.name}
                      </span>
                    )}
                    {story.rock && (
                      <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg">
                        🪨 {story.rock.code}
                        {story.rock.objective && (
                          <span className="mr-1 opacity-75">({story.rock.objective.code})</span>
                        )}
                      </span>
                    )}
                    {story.owner && (
                      <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <div className="w-5 h-5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-[10px] font-medium">
                          {story.owner.name?.charAt(0)}
                        </div>
                        {story.owner.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress & Actions */}
                <div className="flex items-center gap-4">
                  <BatteryCompact 
                    progress={story.progress || 0} 
                    isBlocked={story.isBlocked} 
                  />
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleBlockToggle(story)}
                      title={story.isBlocked ? 'שחרר חסימה' : 'סמן כחסום'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        story.isBlocked
                          ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                          : 'text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(story)}
                      className="p-1.5 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(story.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
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
              {editingStory ? 'עריכת אבן דרך' : 'אבן דרך חדשה'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  כותרת <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="שם אבן הדרך"
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
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
                  placeholder="תיאור אבן הדרך..."
                  rows={2}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

              {/* Sprint - Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ספרינט <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.sprintId}
                  onChange={e => setFormData({...formData, sprintId: e.target.value})}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">בחר ספרינט</option>
                  {sprints.map(sprint => (
                    <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
                  ))}
                </select>
              </div>

              {/* Owner - Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  אחראי <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.ownerId}
                  onChange={e => setFormData({...formData, ownerId: e.target.value})}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">בחר אחראי</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              {/* Rock - Optional */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  סלע (אופציונלי)
                </label>
                <select
                  value={formData.rockId}
                  onChange={e => setFormData({...formData, rockId: e.target.value})}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">ללא שיוך לסלע</option>
                  {rocks.map(rock => (
                    <option key={rock.id} value={rock.id}>{rock.code} - {rock.name}</option>
                  ))}
                </select>
              </div>

              {/* Progress */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  התקדמות
                </label>
                <ProgressInput
                  value={formData.progress}
                  onChange={progress => setFormData({...formData, progress})}
                  disabled={formData.isBlocked}
                  isBlocked={formData.isBlocked}
                />
              </div>

              {/* Blocked */}
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <input
                  type="checkbox"
                  id="isBlocked"
                  checked={formData.isBlocked}
                  onChange={e => setFormData({...formData, isBlocked: e.target.checked})}
                  className="w-5 h-5 rounded text-red-600 focus:ring-red-500"
                />
                <label htmlFor="isBlocked" className="flex-1 cursor-pointer">
                  <span className="font-medium text-red-800 dark:text-red-300">חסום</span>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    סמן אם אבן הדרך תקועה ולא ניתן להתקדם
                  </p>
                </label>
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
                  className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'שומר...' : (editingStory ? 'עדכן' : 'צור')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
