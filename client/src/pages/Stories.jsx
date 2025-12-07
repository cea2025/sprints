import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Filter, ListTodo, X, ChevronDown } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { Skeleton } from '../components/ui/Skeleton';

const statusLabels = {
  TODO: 'לביצוע',
  IN_PROGRESS: 'בתהליך',
  BLOCKED: 'חסום',
  DONE: 'הושלם'
};

const statusColors = {
  TODO: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  BLOCKED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  DONE: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

const priorityLabels = {
  LOW: 'נמוכה',
  MEDIUM: 'בינונית',
  HIGH: 'גבוהה'
};

const priorityColors = {
  LOW: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  MEDIUM: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  HIGH: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
};

function Stories() {
  const [stories, setStories] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [rocks, setRocks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const toast = useToast();
  const [filters, setFilters] = useState({
    status: '',
    sprintId: '',
    rockId: '',
    ownerId: ''
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    estimate: '',
    sprintId: '',
    rockId: '',
    ownerId: ''
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/stories', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/sprints', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/rocks', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/team', { credentials: 'include' }).then(r => r.json())
    ])
      .then(([storiesData, sprintsData, rocksData, teamData]) => {
        setStories(storiesData);
        setSprints(sprintsData);
        setRocks(rocksData);
        setTeamMembers(teamData);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const url = editingStory 
      ? `/api/stories/${editingStory.id}` 
      : '/api/stories';
    const method = editingStory ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      const story = await res.json();
      if (editingStory) {
        setStories(stories.map(s => s.id === story.id ? story : s));
        toast.success('המשימה עודכנה בהצלחה');
      } else {
        setStories([story, ...stories]);
        toast.success('המשימה נוצרה בהצלחה');
      }
      resetForm();
    } else {
      toast.error('שגיאה בשמירת המשימה');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את המשימה?')) return;
    
    const res = await fetch(`/api/stories/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (res.ok) {
      setStories(stories.filter(s => s.id !== id));
      toast.success('המשימה נמחקה');
    } else {
      toast.error('שגיאה במחיקת המשימה');
    }
  };

  const handleEdit = (story) => {
    setEditingStory(story);
    setFormData({
      title: story.title,
      description: story.description || '',
      status: story.status,
      priority: story.priority,
      estimate: story.estimate || '',
      sprintId: story.sprintId || '',
      rockId: story.rockId || '',
      ownerId: story.ownerId || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingStory(null);
    setFormData({
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      estimate: '',
      sprintId: '',
      rockId: '',
      ownerId: ''
    });
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      sprintId: '',
      rockId: '',
      ownerId: ''
    });
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const filteredStories = stories.filter(story => {
    if (filters.status && story.status !== filters.status) return false;
    if (filters.sprintId && story.sprintId !== filters.sprintId) return false;
    if (filters.rockId && story.rockId !== filters.rockId) return false;
    if (filters.ownerId && story.ownerId !== filters.ownerId) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4">
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-32 mb-3" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">משימות</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">כל המשימות במערכת</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>משימה חדשה</span>
        </button>
      </div>

      {/* Filters - Collapsible on Mobile */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        {/* Filter Toggle Button (Mobile) */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between p-4 sm:hidden"
        >
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <Filter size={18} />
            <span>סינון</span>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <ChevronDown size={18} className={`text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {/* Filter Content */}
        <div className={`p-4 border-t dark:border-gray-700 sm:border-t-0 ${showFilters ? 'block' : 'hidden sm:block'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap">
            <div className="hidden sm:flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Filter size={18} />
              <span>סינון:</span>
            </div>
            
            <div className="grid grid-cols-2 sm:flex gap-3 flex-wrap">
              <select
                value={filters.status}
                onChange={e => setFilters({...filters, status: e.target.value})}
                className="px-3 py-2 border dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white"
              >
                <option value="">כל הסטטוסים</option>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              
              <select
                value={filters.sprintId}
                onChange={e => setFilters({...filters, sprintId: e.target.value})}
                className="px-3 py-2 border dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white"
              >
                <option value="">כל הספרינטים</option>
                {sprints.map(sprint => (
                  <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
                ))}
              </select>
              
              <select
                value={filters.rockId}
                onChange={e => setFilters({...filters, rockId: e.target.value})}
                className="px-3 py-2 border dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white"
              >
                <option value="">כל הסלעים</option>
                {rocks.map(rock => (
                  <option key={rock.id} value={rock.id}>{rock.code} - {rock.name}</option>
                ))}
              </select>
              
              <select
                value={filters.ownerId}
                onChange={e => setFilters({...filters, ownerId: e.target.value})}
                className="px-3 py-2 border dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white"
              >
                <option value="">כל האחראים</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 font-medium"
              >
                נקה סינון
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-4 sm:p-6 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white">
                {editingStory ? 'עריכת משימה' : 'משימה חדשה'}
              </h2>
              <button onClick={resetForm} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  כותרת
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                  rows={3}
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    סטטוס
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    עדיפות
                  </label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {Object.entries(priorityLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  הערכה (נקודות)
                </label>
                <input
                  type="number"
                  value={formData.estimate}
                  onChange={e => setFormData({...formData, estimate: e.target.value})}
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ספרינט
                  </label>
                  <select
                    value={formData.sprintId}
                    onChange={e => setFormData({...formData, sprintId: e.target.value})}
                    className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">ללא</option>
                    {sprints.map(sprint => (
                      <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    סלע
                  </label>
                  <select
                    value={formData.rockId}
                    onChange={e => setFormData({...formData, rockId: e.target.value})}
                    className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">ללא</option>
                    {rocks.map(rock => (
                      <option key={rock.id} value={rock.id}>
                        {rock.code} - {rock.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  אחראי
                </label>
                <select
                  value={formData.ownerId}
                  onChange={e => setFormData({...formData, ownerId: e.target.value})}
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">ללא</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  {editingStory ? 'שמור שינויים' : 'צור משימה'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 border dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stories List - Cards Layout */}
      {filteredStories.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 sm:p-12 text-center">
          <ListTodo className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {activeFiltersCount > 0 ? 'אין משימות התואמות לסינון' : 'אין משימות'}
          </p>
          {activeFiltersCount === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
            >
              צור את המשימה הראשונה
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredStories.map((story, index) => (
            <div 
              key={story.id} 
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all animate-slide-in-up"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{story.title}</h3>
                    {story.estimate && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        {story.estimate} נק׳
                      </span>
                    )}
                  </div>
                  
                  {story.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                      {story.description}
                    </p>
                  )}
                  
                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${statusColors[story.status]}`}>
                      {statusLabels[story.status]}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-lg ${priorityColors[story.priority]}`}>
                      {priorityLabels[story.priority]}
                    </span>
                    {story.sprint && (
                      <span className="text-xs px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg">
                        {story.sprint.name}
                      </span>
                    )}
                    {story.rock && (
                      <span className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg">
                        {story.rock.code} - {story.rock.name}
                      </span>
                    )}
                    {story.rock?.objective && (
                      <span className="text-xs px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg">
                        🎯 {story.rock.objective.name}
                      </span>
                    )}
                    {story.owner && (
                      <span className="text-xs px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg">
                        {story.owner.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 self-start">
                  <button
                    onClick={() => handleEdit(story)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(story.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Count */}
      {filteredStories.length > 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          מציג {filteredStories.length} מתוך {stories.length} משימות
        </p>
      )}
    </div>
  );
}

export default Stories;
