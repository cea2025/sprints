import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Target, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { SkeletonCard } from '../components/ui/Skeleton';

const healthColors = {
  GREEN: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  YELLOW: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  RED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

function Objectives() {
  const [objectives, setObjectives] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingObjective, setEditingObjective] = useState(null);
  const [expandedObjective, setExpandedObjective] = useState(null);
  const toast = useToast();
  
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    timeframe: currentYear.toString(),
    targetValue: '',
    metric: '',
    ownerId: ''
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/objectives', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/team', { credentials: 'include' }).then(r => r.json())
    ])
      .then(([objectivesData, teamData]) => {
        setObjectives(objectivesData);
        setTeamMembers(teamData);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const url = editingObjective 
      ? `/api/objectives/${editingObjective.id}` 
      : '/api/objectives';
    const method = editingObjective ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      const objective = await res.json();
      if (editingObjective) {
        setObjectives(objectives.map(o => o.id === objective.id ? objective : o));
        toast.success('מטרת-על עודכנה בהצלחה');
      } else {
        setObjectives([objective, ...objectives]);
        toast.success('מטרת-על נוצרה בהצלחה');
      }
      resetForm();
    } else {
      toast.error('שגיאה בשמירת מטרת-על');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את מטרת-העל?')) return;
    
    const res = await fetch(`/api/objectives/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (res.ok) {
      setObjectives(objectives.filter(o => o.id !== id));
      toast.success('מטרת-על נמחקה');
    } else {
      toast.error('שגיאה במחיקת מטרת-על');
    }
  };

  const handleEdit = (objective) => {
    setEditingObjective(objective);
    setFormData({
      code: objective.code,
      name: objective.name,
      description: objective.description || '',
      timeframe: objective.timeframe,
      targetValue: objective.targetValue || '',
      metric: objective.metric || '',
      ownerId: objective.ownerId || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingObjective(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      timeframe: currentYear.toString(),
      targetValue: '',
      metric: '',
      ownerId: ''
    });
  };

  const getProgressColor = (progress) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">מטרות-על</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">יעדים שנתיים וחצי-שנתיים אסטרטגיים</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>מטרת-על חדשה</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-bold dark:text-white">
                {editingObjective ? 'עריכת מטרת-על' : 'מטרת-על חדשה'}
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
                    placeholder="25-OBJ-1"
                    className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    מסגרת זמן
                  </label>
                  <select
                    value={formData.timeframe}
                    onChange={e => setFormData({...formData, timeframe: e.target.value})}
                    className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={`${currentYear}`}>{currentYear} (שנה מלאה)</option>
                    <option value={`H1-${currentYear}`}>H1-{currentYear} (חציון 1)</option>
                    <option value={`H2-${currentYear}`}>H2-{currentYear} (חציון 2)</option>
                    <option value={`${currentYear + 1}`}>{currentYear + 1} (שנה מלאה)</option>
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
                  placeholder="שם המטרה"
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    מדד (KR)
                  </label>
                  <input
                    type="text"
                    value={formData.metric}
                    onChange={e => setFormData({...formData, metric: e.target.value})}
                    placeholder="לדוג': אחוז שימור לקוחות"
                    className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    יעד
                  </label>
                  <input
                    type="number"
                    value={formData.targetValue}
                    onChange={e => setFormData({...formData, targetValue: e.target.value})}
                    placeholder="90"
                    className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  אחראי
                </label>
                <select
                  value={formData.ownerId}
                  onChange={e => setFormData({...formData, ownerId: e.target.value})}
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
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
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  {editingObjective ? 'שמור שינויים' : 'צור מטרת-על'}
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

      {/* Objectives List */}
      {objectives.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 sm:p-12 text-center">
          <Target className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">אין מטרות-על עדיין</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-purple-600 dark:text-purple-400 hover:text-purple-700 font-medium"
          >
            צור את מטרת-העל הראשונה
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {objectives.map((objective, index) => (
            <div 
              key={objective.id} 
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-slide-in-up hover:shadow-md transition-all"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Main Info */}
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {objective.code}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                        {objective.timeframe}
                      </span>
                      {objective.rocksCount > 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {objective.rocksCount} סלעים
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-1">{objective.name}</h3>
                    {objective.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{objective.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                      {objective.metric && (
                        <span>
                          {objective.metric}{objective.targetValue ? `: ${objective.targetValue}` : ''}
                        </span>
                      )}
                      {objective.owner && (
                        <span>אחראי: {objective.owner.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start">
                    <button
                      onClick={() => setExpandedObjective(expandedObjective === objective.id ? null : objective.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {expandedObjective === objective.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <button
                      onClick={() => handleEdit(objective)}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(objective.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-gray-400">התקדמות</span>
                    <span className="font-medium text-gray-900 dark:text-white">{objective.progress || 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(objective.progress || 0)} rounded-full transition-all duration-500`}
                      style={{ width: `${objective.progress || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded - Rocks List */}
              {expandedObjective === objective.id && objective.rocks && objective.rocks.length > 0 && (
                <div className="border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">סלעים מקושרים:</h4>
                  <div className="space-y-2">
                    {objective.rocks.map(rock => (
                      <div key={rock.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400">{rock.code}</span>
                          <span className="text-sm text-gray-900 dark:text-white">{rock.name}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${healthColors[rock.health] || healthColors.GREEN}`}>
                          Q{rock.currentQuarter}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Objectives;

