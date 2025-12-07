import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Mountain, X, ArrowRight, AlertTriangle } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { SkeletonRockCard } from '../components/ui/Skeleton';

const statusLabels = {
  PLANNED: 'מתוכנן',
  IN_PROGRESS: 'בתהליך',
  AT_RISK: 'בסיכון',
  DONE: 'הושלם'
};

const statusColors = {
  PLANNED: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  AT_RISK: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  DONE: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

const healthLabels = {
  GREEN: 'במסלול',
  YELLOW: 'בסיכון',
  RED: 'חריגה'
};

const healthColors = {
  GREEN: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  YELLOW: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  RED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const progressColors = {
  GREEN: 'bg-green-500',
  YELLOW: 'bg-yellow-500',
  RED: 'bg-red-500',
};

function Rocks() {
  const [rocks, setRocks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRock, setEditingRock] = useState(null);
  const toast = useToast();
  
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    yearOfRecord: currentYear,
    originalQuarter: currentQuarter,
    currentQuarter: currentQuarter,
    status: 'PLANNED',
    health: 'GREEN',
    committedPoints: 0,
    ownerId: '',
    objectiveId: ''
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/rocks', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/team', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/objectives', { credentials: 'include' }).then(r => r.json())
    ])
      .then(([rocksData, teamData, objectivesData]) => {
        setRocks(Array.isArray(rocksData) ? rocksData : []);
        setTeamMembers(Array.isArray(teamData) ? teamData : []);
        setObjectives(Array.isArray(objectivesData) ? objectivesData : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const url = editingRock 
      ? `/api/rocks/${editingRock.id}` 
      : '/api/rocks';
    const method = editingRock ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      const rock = await res.json();
      if (editingRock) {
        setRocks(rocks.map(r => r.id === rock.id ? rock : r));
        toast.success('הסלע עודכן בהצלחה');
      } else {
        setRocks([rock, ...rocks]);
        toast.success('הסלע נוצר בהצלחה');
      }
      resetForm();
    } else {
      toast.error('שגיאה בשמירת הסלע');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את הסלע?')) return;
    
    const res = await fetch(`/api/rocks/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (res.ok) {
      setRocks(rocks.filter(r => r.id !== id));
      toast.success('הסלע נמחק');
    } else {
      toast.error('שגיאה במחיקת הסלע');
    }
  };

  const handleCarryOver = async (rock) => {
    if (!confirm(`האם להעביר את הסלע "${rock.name}" לרבעון הבא?`)) return;
    
    const res = await fetch(`/api/rocks/${rock.id}/carry-over`, {
      method: 'POST',
      credentials: 'include'
    });

    if (res.ok) {
      const updatedRock = await res.json();
      setRocks(rocks.map(r => r.id === updatedRock.id ? updatedRock : r));
      toast.success('הסלע הועבר לרבעון הבא');
    } else {
      toast.error('שגיאה בהעברת הסלע');
    }
  };

  const handleEdit = (rock) => {
    setEditingRock(rock);
    setFormData({
      code: rock.code,
      name: rock.name,
      description: rock.description || '',
      yearOfRecord: rock.yearOfRecord,
      originalQuarter: rock.originalQuarter,
      currentQuarter: rock.currentQuarter,
      status: rock.status,
      health: rock.health || 'GREEN',
      committedPoints: rock.committedPoints || 0,
      ownerId: rock.ownerId || '',
      objectiveId: rock.objectiveId || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingRock(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      yearOfRecord: currentYear,
      originalQuarter: currentQuarter,
      currentQuarter: currentQuarter,
      status: 'PLANNED',
      health: 'GREEN',
      committedPoints: 0,
      ownerId: '',
      objectiveId: ''
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <SkeletonRockCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">סלעים</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">יעדים רבעוניים אסטרטגיים</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>סלע חדש</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-bold dark:text-white">
                {editingRock ? 'עריכת סלע' : 'סלע חדש'}
              </h2>
              <button onClick={resetForm} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    קוד
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    placeholder="25-Q1-1"
                    className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שם
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
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
                  rows={2}
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Quarter & Year */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    שנה
                  </label>
                  <input
                    type="number"
                    value={formData.yearOfRecord}
                    onChange={e => setFormData({...formData, yearOfRecord: parseInt(e.target.value)})}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    רבעון מקורי
                  </label>
                  <select
                    value={formData.originalQuarter}
                    onChange={e => {
                      const q = parseInt(e.target.value);
                      setFormData({...formData, originalQuarter: q, currentQuarter: q});
                    }}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={1}>Q1</option>
                    <option value={2}>Q2</option>
                    <option value={3}>Q3</option>
                    <option value={4}>Q4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    רבעון נוכחי
                  </label>
                  <select
                    value={formData.currentQuarter}
                    onChange={e => setFormData({...formData, currentQuarter: parseInt(e.target.value)})}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={1}>Q1</option>
                    <option value={2}>Q2</option>
                    <option value={3}>Q3</option>
                    <option value={4}>Q4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    בריאות
                  </label>
                  <select
                    value={formData.health}
                    onChange={e => setFormData({...formData, health: e.target.value})}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {Object.entries(healthLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Points & Owner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    נקודות התחייבות
                  </label>
                  <input
                    type="number"
                    value={formData.committedPoints}
                    onChange={e => setFormData({...formData, committedPoints: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
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
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  {editingRock ? 'שמור שינויים' : 'צור סלע'}
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

      {/* Rocks List - Cards for Mobile */}
      {rocks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 sm:p-12 text-center">
          <Mountain className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">אין סלעים עדיין</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
          >
            צור את הסלע הראשון
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {rocks.map((rock, index) => {
            const isCarryOver = rock.originalQuarter !== rock.currentQuarter;
            
            return (
              <div 
                key={rock.id} 
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-700 animate-slide-in-up hover:shadow-md transition-all"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {rock.code}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[rock.status]}`}>
                        {statusLabels[rock.status]}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${healthColors[rock.health]}`}>
                        {healthLabels[rock.health]}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        Q{rock.currentQuarter}/{rock.yearOfRecord}
                      </span>
                      {isCarryOver && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          גלישה מ-Q{rock.originalQuarter}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-1">{rock.name}</h3>
                    {rock.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{rock.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                      {rock.owner && <span>אחראי: {rock.owner.name}</span>}
                      {rock.objective && <span>מטרה: {rock.objective.code}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start">
                    {rock.status !== 'DONE' && (
                      <button
                        onClick={() => handleCarryOver(rock)}
                        title="העבר לרבעון הבא"
                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                      >
                        <ArrowRight size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(rock)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(rock.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-gray-400">
                      התקדמות ({rock.donePoints || 0}/{rock.committedPoints || 0} נק')
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{rock.progress || 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${progressColors[rock.health]} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(rock.progress || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Rocks;
