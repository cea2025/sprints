import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const statusLabels = {
  PLANNED: 'מתוכנן',
  IN_PROGRESS: 'בתהליך',
  AT_RISK: 'בסיכון',
  DONE: 'הושלם'
};

const statusColors = {
  PLANNED: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  AT_RISK: 'bg-red-100 text-red-700',
  DONE: 'bg-green-100 text-green-700',
};

function Rocks() {
  const [rocks, setRocks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRock, setEditingRock] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    status: 'PLANNED',
    ownerId: ''
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/rocks', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/team', { credentials: 'include' }).then(r => r.json())
    ])
      .then(([rocksData, teamData]) => {
        setRocks(rocksData);
        setTeamMembers(teamData);
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
      } else {
        setRocks([rock, ...rocks]);
      }
      resetForm();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את אבן הדרך?')) return;
    
    const res = await fetch(`/api/rocks/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (res.ok) {
      setRocks(rocks.filter(r => r.id !== id));
    }
  };

  const handleEdit = (rock) => {
    setEditingRock(rock);
    setFormData({
      code: rock.code,
      name: rock.name,
      description: rock.description || '',
      year: rock.year,
      quarter: rock.quarter,
      status: rock.status,
      ownerId: rock.ownerId || ''
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
      year: new Date().getFullYear(),
      quarter: Math.ceil((new Date().getMonth() + 1) / 3),
      status: 'PLANNED',
      ownerId: ''
    });
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
          <h1 className="text-3xl font-bold text-gray-900">אבני דרך</h1>
          <p className="text-gray-500 mt-1">יעדים רבעוניים אסטרטגיים</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>אבן דרך חדשה</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingRock ? 'עריכת אבן דרך' : 'אבן דרך חדשה'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    קוד
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    placeholder="25-Q1-1"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
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
              </div>

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
                  תיאור
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    שנה
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    רבעון
                  </label>
                  <select
                    value={formData.quarter}
                    onChange={e => setFormData({...formData, quarter: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>Q1</option>
                    <option value={2}>Q2</option>
                    <option value={3}>Q3</option>
                    <option value={4}>Q4</option>
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
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingRock ? 'שמור שינויים' : 'צור אבן דרך'}
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

      {/* Rocks List */}
      {rocks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500">אין אבני דרך עדיין</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            צור את אבן הדרך הראשונה
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">קוד</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">שם</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">רבעון</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">סטטוס</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">אחראי</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">התקדמות</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rocks.map((rock) => (
                <tr key={rock.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm text-gray-500">{rock.code}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{rock.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    Q{rock.quarter}/{rock.year}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[rock.status]}`}>
                      {statusLabels[rock.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {rock.owner?.name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${rock.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500">{rock.progress || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(rock)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(rock.id)}
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

export default Rocks;
