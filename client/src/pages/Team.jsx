import { useState, useEffect } from 'react';
import { Plus, Edit2, UserX, UserCheck } from 'lucide-react';

function Team() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    capacity: ''
  });

  useEffect(() => {
    fetch('/api/team', { credentials: 'include' })
      .then(r => r.json())
      .then(setTeamMembers)
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
        setTeamMembers(teamMembers.map(m => m.id === member.id ? member : m));
      } else {
        setTeamMembers([...teamMembers, member]);
      }
      resetForm();
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
      setTeamMembers(teamMembers.map(m => m.id === updated.id ? updated : m));
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeMembers = teamMembers.filter(m => m.isActive);
  const inactiveMembers = teamMembers.filter(m => !m.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">צוות</h1>
          <p className="text-gray-500 mt-1">ניהול חברי הצוות</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>חבר צוות חדש</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingMember ? 'עריכת חבר צוות' : 'חבר צוות חדש'}
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תפקיד
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  placeholder="מפתח, אנליסט, מנהל מוצר..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  קיבולת לספרינט (נקודות)
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={e => setFormData({...formData, capacity: e.target.value})}
                  placeholder="לדוגמה: 20"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingMember ? 'שמור שינויים' : 'הוסף לצוות'}
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

      {/* Active Members */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          חברי צוות פעילים ({activeMembers.length})
        </h2>
        
        {activeMembers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            אין חברי צוות פעילים
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onEdit={handleEdit}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inactive Members */}
      {inactiveMembers.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-500 mb-4">
            חברי צוות לא פעילים ({inactiveMembers.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onEdit={handleEdit}
                onToggleActive={handleToggleActive}
                inactive
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberCard({ member, onEdit, onToggleActive, inactive }) {
  return (
    <div className={`rounded-lg p-4 border ${inactive ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {member.user?.picture ? (
            <img 
              src={member.user.picture} 
              alt={member.name}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              inactive ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-600'
            }`}>
              <span className="text-lg font-medium">
                {member.name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h3 className={`font-medium ${inactive ? 'text-gray-500' : 'text-gray-900'}`}>
              {member.name}
            </h3>
            <p className="text-sm text-gray-500">{member.role}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(member)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onToggleActive(member)}
            className={`p-1.5 rounded ${
              inactive 
                ? 'text-gray-400 hover:text-green-600 hover:bg-green-50' 
                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
            }`}
            title={inactive ? 'הפעל' : 'השבת'}
          >
            {inactive ? <UserCheck size={16} /> : <UserX size={16} />}
          </button>
        </div>
      </div>
      
      <div className="mt-4 flex items-center gap-4 text-sm">
        {member.capacity && (
          <div className="text-gray-500">
            <span className="font-medium">{member.capacity}</span> נק׳/ספרינט
          </div>
        )}
        {member._count && (
          <>
            <div className="text-gray-500">
              <span className="font-medium">{member._count.ownedRocks}</span> אבני דרך
            </div>
            <div className="text-gray-500">
              <span className="font-medium">{member._count.ownedStories}</span> משימות
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Team;
