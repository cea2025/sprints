import { useState, useEffect } from 'react';
import { Plus, Edit2, UserX, UserCheck, Users, X, Trash2 } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { Skeleton } from '../components/ui/Skeleton';

function Team() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    capacity: ''
  });

  useEffect(() => {
    fetch('/api/team', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTeamMembers(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const url = editingMember 
      ? `/api/team/${editingMember.id}` 
      : '/api/team';
    const method = editingMember ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      const member = await res.json();
      if (editingMember) {
        setTeamMembers(prev => Array.isArray(prev) ? prev.map(m => m.id === member.id ? member : m) : [member]);
        toast.success('חבר הצוות עודכן בהצלחה');
      } else {
        setTeamMembers(prev => Array.isArray(prev) ? [...prev, member] : [member]);
        toast.success('חבר הצוות נוסף בהצלחה');
      }
      resetForm();
    } else {
      toast.error('שגיאה בשמירת חבר הצוות');
    }
  };

  const handleToggleActive = async (member) => {
    const res = await fetch(`/api/team/${member.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...member, isActive: !member.isActive })
    });

    if (res.ok) {
      const updated = await res.json();
      setTeamMembers(prev => Array.isArray(prev) ? prev.map(m => m.id === updated.id ? updated : m) : [updated]);
      toast.success(updated.isActive ? 'חבר הצוות הופעל' : 'חבר הצוות הושבת');
    } else {
      toast.error('שגיאה בעדכון חבר הצוות');
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      role: member.role,
      capacity: member.capacity || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (member) => {
    if (!confirm(`האם למחוק את ${member.name}?`)) return;

    const res = await fetch(`/api/team/${member.id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (res.ok) {
      setTeamMembers(prev => Array.isArray(prev) ? prev.filter(m => m.id !== member.id) : []);
      toast.success('חבר הצוות נמחק בהצלחה');
    } else {
      toast.error('שגיאה במחיקת חבר הצוות');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingMember(null);
    setFormData({
      name: '',
      role: '',
      capacity: ''
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activeMembers = teamMembers.filter(m => m.isActive);
  const inactiveMembers = teamMembers.filter(m => !m.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">צוות</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">ניהול חברי הצוות</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>חבר צוות חדש</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md animate-scale-in">
            <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white">
                {editingMember ? 'עריכת חבר צוות' : 'חבר צוות חדש'}
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
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תפקיד
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  placeholder="מפתח, אנליסט, מנהל מוצר..."
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  קיבולת לספרינט (נקודות)
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={e => setFormData({...formData, capacity: e.target.value})}
                  placeholder="לדוגמה: 20"
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  {editingMember ? 'שמור שינויים' : 'הוסף לצוות'}
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

      {/* Active Members */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users size={20} className="text-blue-600" />
          חברי צוות פעילים ({activeMembers.length})
        </h2>
        
        {activeMembers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">אין חברי צוות פעילים</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
            >
              הוסף חבר צוות ראשון
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeMembers.map((member, index) => (
              <MemberCard
                key={member.id}
                member={member}
                onEdit={handleEdit}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inactive Members */}
      {inactiveMembers.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-4">
            חברי צוות לא פעילים ({inactiveMembers.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveMembers.map((member, index) => (
              <MemberCard
                key={member.id}
                member={member}
                onEdit={handleEdit}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
                inactive
                index={index}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberCard({ member, onEdit, onToggleActive, onDelete, inactive, index }) {
  return (
    <div 
      className={`rounded-2xl p-4 border transition-all hover:shadow-md animate-slide-in-up ${
        inactive 
          ? 'bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600' 
          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
      }`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {member.user?.picture ? (
            <img 
              src={member.user.picture} 
              alt={member.name}
              className="w-12 h-12 rounded-full ring-2 ring-white dark:ring-gray-600 shadow"
            />
          ) : (
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow ${
              inactive 
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400' 
                : 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
            }`}>
              <span className="text-lg font-bold">
                {member.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <h3 className={`font-medium truncate ${inactive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
              {member.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.role}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(member)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="עריכה"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onToggleActive(member)}
            className={`p-2 rounded-lg transition-colors ${
              inactive 
                ? 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' 
                : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
            }`}
            title={inactive ? 'הפעל' : 'השבת'}
          >
            {inactive ? <UserCheck size={16} /> : <UserX size={16} />}
          </button>
          <button
            onClick={() => onDelete(member)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="מחק"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        {member.capacity && (
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded-lg">
            <span className="font-medium text-gray-700 dark:text-gray-300">{member.capacity}</span>
            <span className="text-gray-500 dark:text-gray-400">נק׳/ספרינט</span>
          </div>
        )}
        {member._count && (
          <>
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="font-medium text-blue-700 dark:text-blue-400">{member._count.ownedRocks}</span>
              <span className="text-blue-600 dark:text-blue-400">סלעים</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <span className="font-medium text-purple-700 dark:text-purple-400">{member._count.ownedStories}</span>
              <span className="text-purple-600 dark:text-purple-400">אבני דרך</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Team;
