import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, Calendar, Target, Zap, X } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { Skeleton } from '../components/ui/Skeleton';

function Sprints() {
  const [sprints, setSprints] = useState([]);
  const [rocks, setRocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);
  const toast = useToast();
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
        toast.success('הספרינט עודכן בהצלחה');
      } else {
        setSprints([sprint, ...sprints]);
        toast.success('הספרינט נוצר בהצלחה');
      }
      resetForm();
    } else {
      toast.error('שגיאה בשמירת הספרינט');
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
      toast.success('הספרינט נמחק');
    } else {
      toast.error('שגיאה במחיקת הספרינט');
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48 mb-4" />
              <Skeleton className="h-4 w-64" />
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">ספרינטים</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">מחזורי עבודה</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>ספרינט חדש</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-bold dark:text-white">
                {editingSprint ? 'עריכת ספרינט' : 'ספרינט חדש'}
              </h2>
              <button onClick={resetForm} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שם
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="25-Q1-S1"
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  מטרה
                </label>
                <input
                  type="text"
                  value={formData.goal}
                  onChange={e => setFormData({...formData, goal: e.target.value})}
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    תאריך התחלה
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    תאריך סיום
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  אבן דרך ראשית
                </label>
                <select
                  value={formData.mainRockId}
                  onChange={e => setFormData({...formData, mainRockId: e.target.value})}
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

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  {editingSprint ? 'שמור שינויים' : 'צור ספרינט'}
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

      {/* Sprints List */}
      {sprints.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 sm:p-12 text-center">
          <Zap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">אין ספרינטים עדיין</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
          >
            צור את הספרינט הראשון
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sprints.map((sprint, index) => (
            <div
              key={sprint.id}
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6 border-r-4 animate-slide-in-up hover:shadow-md transition-all ${
                isCurrentSprint(sprint) ? 'border-r-green-500' : 'border-r-gray-200 dark:border-r-gray-700'
              }`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Mobile Layout */}
              <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{sprint.name}</h3>
                      {isCurrentSprint(sprint) && (
                        <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium">
                          פעיל
                        </span>
                      )}
                    </div>
                    {sprint.goal && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{sprint.goal}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(sprint)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(sprint.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Info Row */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>{formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}</span>
                  </div>
                  {sprint.mainRock && (
                    <div className="flex items-center gap-2">
                      <Target size={16} />
                      <span>{sprint.mainRock.code}</span>
                    </div>
                  )}
                </div>

                {/* Stats + Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t dark:border-gray-700">
                  {/* Stats */}
                  {sprint.stats && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      <div className="text-center px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg min-w-[60px]">
                        <div className="font-bold text-gray-700 dark:text-gray-300">{sprint.stats.todo}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">לביצוע</div>
                      </div>
                      <div className="text-center px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg min-w-[60px]">
                        <div className="font-bold text-blue-700 dark:text-blue-400">{sprint.stats.inProgress}</div>
                        <div className="text-xs text-blue-500 dark:text-blue-400">בתהליך</div>
                      </div>
                      <div className="text-center px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg min-w-[60px]">
                        <div className="font-bold text-red-700 dark:text-red-400">{sprint.stats.blocked}</div>
                        <div className="text-xs text-red-500 dark:text-red-400">חסום</div>
                      </div>
                      <div className="text-center px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg min-w-[60px]">
                        <div className="font-bold text-green-700 dark:text-green-400">{sprint.stats.done}</div>
                        <div className="text-xs text-green-500 dark:text-green-400">הושלם</div>
                      </div>
                    </div>
                  )}

                  <Link
                    to={`/sprints/${sprint.id}`}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:shadow-lg transition-all text-center"
                  >
                    לוח קנבאן
                  </Link>
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
