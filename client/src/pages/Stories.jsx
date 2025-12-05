import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Filter } from 'lucide-react';

const statusLabels = {
  TODO: 'לביצוע',
  IN_PROGRESS: 'בתהליך',
  BLOCKED: 'חסום',
  DONE: 'הושלם'
};

const statusColors = {
  TODO: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  BLOCKED: 'bg-red-100 text-red-700',
  DONE: 'bg-green-100 text-green-700',
};

const priorityLabels = {
  LOW: 'נמוכה',
  MEDIUM: 'בינונית',
  HIGH: 'גבוהה'
};

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700'
};

function Stories() {
  const [stories, setStories] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [rocks, setRocks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
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
      } else {
        setStories([story, ...stories]);
      }
      resetForm();
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

  const filteredStories = stories.filter(story => {
    if (filters.status && story.status !== filters.status) return false;
    if (filters.sprintId && story.sprintId !== filters.sprintId) return false;
    if (filters.rockId && story.rockId !== filters.rockId) return false;
    if (filters.ownerId && story.ownerId !== filters.ownerId) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">משימות</h1>
          <p className="text-gray-500 mt-1">כל המשימות במערכת</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>משימה חדשה</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-gray-500">
            <Filter size={18} />
            <span>סינון:</span>
          </div>
          <select
            value={filters.status}
            onChange={e => setFilters({...filters, status: e.target.value})}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="">כל הסטטוסים</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filters.sprintId}
            onChange={e => setFilters({...filters, sprintId: e.target.value})}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="">כל הספרינטים</option>
            {sprints.map(sprint => (
              <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
            ))}
          </select>
          <select
            value={filters.rockId}
            onChange={e => setFilters({...filters, rockId: e.target.value})}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="">כל אבני הדרך</option>
            {rocks.map(rock => (
              <option key={rock.id} value={rock.id}>{rock.code}</option>
            ))}
          </select>
          <select
            value={filters.ownerId}
            onChange={e => setFilters({...filters, ownerId: e.target.value})}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="">כל האחראים</option>
            {teamMembers.map(member => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold">
                {editingStory ? 'עריכת משימה' : 'משימה חדשה'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  כותרת
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תיאור
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    סטטוס
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    עדיפות
                  </label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(priorityLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  הערכה (נקודות)
                </label>
                <input
                  type="number"
                  value={formData.estimate}
                  onChange={e => setFormData({...formData, estimate: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ספרינט
                </label>
                <select
                  value={formData.sprintId}
                  onChange={e => setFormData({...formData, sprintId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">ללא</option>
                  {sprints.map(sprint => (
                    <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  אבן דרך
                </label>
                <select
                  value={formData.rockId}
                  onChange={e => setFormData({...formData, rockId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">ללא</option>
                  {rocks.map(rock => (
                    <option key={rock.id} value={rock.id}>
                      {rock.code} - {rock.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  אחראי
                </label>
                <select
                  value={formData.ownerId}
                  onChange={e => setFormData({...formData, ownerId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">ללא</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingStory ? 'שמור שינויים' : 'צור משימה'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stories List */}
      {filteredStories.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500">אין משימות</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            צור את המשימה הראשונה
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">כותרת</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">סטטוס</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">עדיפות</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">ספרינט</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">אבן דרך</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">אחראי</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredStories.map((story) => (
                <tr key={story.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{story.title}</div>
                      {story.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {story.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[story.status]}`}>
                      {statusLabels[story.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[story.priority]}`}>
                      {priorityLabels[story.priority]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {story.sprint?.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {story.rock?.code || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {story.owner?.name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(story)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(story.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Stories;
