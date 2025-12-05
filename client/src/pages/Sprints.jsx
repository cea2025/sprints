import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, Calendar, Target } from 'lucide-react';

function Sprints() {
  const [sprints, setSprints] = useState([]);
  const [rocks, setRocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    goal: '',
    startDate: '',
    endDate: '',
    mainRockId: ''
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/sprints', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/rocks', { credentials: 'include' }).then(r => r.json())
    ])
      .then(([sprintsData, rocksData]) => {
        setSprints(sprintsData);
        setRocks(rocksData);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const url = editingSprint 
      ? `/api/sprints/${editingSprint.id}` 
      : '/api/sprints';
    const method = editingSprint ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      const sprint = await res.json();
      if (editingSprint) {
        setSprints(sprints.map(s => s.id === sprint.id ? sprint : s));
      } else {
        setSprints([sprint, ...sprints]);
      }
      resetForm();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את הספרינט?')) return;
    
    const res = await fetch(`/api/sprints/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (res.ok) {
      setSprints(sprints.filter(s => s.id !== id));
    }
  };

  const handleEdit = (sprint) => {
    setEditingSprint(sprint);
    setFormData({
      name: sprint.name,
      goal: sprint.goal || '',
      startDate: sprint.startDate.split('T')[0],
      endDate: sprint.endDate.split('T')[0],
      mainRockId: sprint.mainRockId || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingSprint(null);
    setFormData({
      name: '',
      goal: '',
      startDate: '',
      endDate: '',
      mainRockId: ''
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  const isCurrentSprint = (sprint) => {
    const today = new Date();
    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    return today >= start && today <= end;
  };

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
          <h1 className="text-3xl font-bold text-gray-900">ספרינטים</h1>
          <p className="text-gray-500 mt-1">מחזורי עבודה</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>ספרינט חדש</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingSprint ? 'עריכת ספרינט' : 'ספרינט חדש'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="25-Q1-S1"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מטרה
                </label>
                <input
                  type="text"
                  value={formData.goal}
                  onChange={e => setFormData({...formData, goal: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    תאריך התחלה
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    תאריך סיום
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  אבן דרך ראשית
                </label>
                <select
                  value={formData.mainRockId}
                  onChange={e => setFormData({...formData, mainRockId: e.target.value})}
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

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingSprint ? 'שמור שינויים' : 'צור ספרינט'}
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

      {/* Sprints List */}
      {sprints.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500">אין ספרינטים עדיין</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            צור את הספרינט הראשון
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sprints.map((sprint) => (
            <div
              key={sprint.id}
              className={`bg-white rounded-xl shadow-sm p-6 border-r-4 ${
                isCurrentSprint(sprint) ? 'border-r-green-500' : 'border-r-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{sprint.name}</h3>
                    {isCurrentSprint(sprint) && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        פעיל
                      </span>
                    )}
                  </div>
                  {sprint.goal && (
                    <p className="text-gray-600 mb-3">{sprint.goal}</p>
                  )}
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>
                        {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                      </span>
                    </div>
                    {sprint.mainRock && (
                      <div className="flex items-center gap-2">
                        <Target size={16} />
                        <span>{sprint.mainRock.code}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Stats */}
                  {sprint.stats && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="text-center px-3 py-1 bg-gray-100 rounded">
                        <div className="font-bold text-gray-700">{sprint.stats.todo}</div>
                        <div className="text-xs text-gray-500">לביצוע</div>
                      </div>
                      <div className="text-center px-3 py-1 bg-blue-100 rounded">
                        <div className="font-bold text-blue-700">{sprint.stats.inProgress}</div>
                        <div className="text-xs text-blue-500">בתהליך</div>
                      </div>
                      <div className="text-center px-3 py-1 bg-green-100 rounded">
                        <div className="font-bold text-green-700">{sprint.stats.done}</div>
                        <div className="text-xs text-green-500">הושלם</div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mr-4">
                    <Link
                      to={`/sprints/${sprint.id}`}
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      לוח קנבאן
                    </Link>
                    <button
                      onClick={() => handleEdit(sprint)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(sprint.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Sprints;
