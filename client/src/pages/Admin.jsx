/**
 * Admin Page - User Management
 * 
 * Only accessible by ADMIN users.
 * Manages users, roles, allowed emails, and system statistics.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_COLORS } from '../constants/roles';
import { Plus, Trash2, Mail, UserPlus, Users, CheckCircle, XCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  
  // New email form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState({ email: '', name: '', role: 'VIEWER', note: '' });
  const [addingEmail, setAddingEmail] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  // Fetch data
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchAllowedEmails();
      fetchStats();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('שגיאה בטעינת המשתמשים');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllowedEmails = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/allowed-emails`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setAllowedEmails(data);
      }
    } catch (err) {
      console.error('Error fetching allowed emails:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'שגיאה בעדכון התפקיד');
      }
      
      fetchUsers();
      setEditingUser(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    if (!confirm(currentStatus ? 'האם לבטל את המשתמש?' : 'האם להפעיל את המשתמש?')) {
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'שגיאה בעדכון הסטטוס');
      }
      
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const addAllowedEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.email) return;
    
    setAddingEmail(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/allowed-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newEmail)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'שגיאה בהוספת המייל');
      }
      
      setNewEmail({ email: '', name: '', role: 'VIEWER', note: '' });
      setShowAddForm(false);
      fetchAllowedEmails();
      fetchStats();
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingEmail(false);
    }
  };

  const deleteAllowedEmail = async (id, email) => {
    if (!confirm(`האם למחוק את ${email} מרשימת המורשים?`)) {
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/admin/allowed-emails/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'שגיאה במחיקת המייל');
      }
      
      fetchAllowedEmails();
      fetchStats();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ניהול מערכת
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            ניהול משתמשים והרשאות
          </p>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="משתמשים רשומים" value={stats.users.total} icon="👥" />
          <StatCard title="משתמשים פעילים" value={stats.users.active} icon="✅" />
          <StatCard title="מיילים מורשים" value={stats.allowedEmails || 0} icon="📧" />
          <StatCard title="סלעים" value={stats.content.rocks} icon="🎯" />
          <StatCard title="משימות" value={stats.content.stories} icon="📋" />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Users size={18} className="inline ml-2" />
            משתמשים רשומים ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('allowed')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'allowed'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Mail size={18} className="inline ml-2" />
            מיילים מורשים ({allowedEmails.length})
          </button>
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              משתמשים שנרשמו למערכת
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              משתמשים שהתחברו לפחות פעם אחת עם Google
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">טוען...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              אין משתמשים רשומים עדיין
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">משתמש</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">אימייל</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">תפקיד</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">סטטוס</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">הצטרף</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map(user => (
                    <tr key={user.id} className={!user.isActive ? 'opacity-50' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.picture ? (
                            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                              <span className="text-sm font-medium">{user.name?.charAt(0)}</span>
                            </div>
                          )}
                          <span className="font-medium text-gray-900 dark:text-white">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                      <td className="px-4 py-3">
                        {editingUser === user.id ? (
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value)}
                            onBlur={() => setEditingUser(null)}
                            autoFocus
                            className="text-sm rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                          >
                            {Object.values(ROLES).map(role => (
                              <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                            ))}
                          </select>
                        ) : (
                          <span 
                            className={`px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 ${ROLE_COLORS[user.role]}`}
                            onClick={() => setEditingUser(user.id)}
                          >
                            {ROLE_LABELS[user.role]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.isActive 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {user.isActive ? 'פעיל' : 'מושבת'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleUserStatus(user.id, user.isActive)}
                          className={`text-sm px-2 py-1 rounded ${
                            user.isActive
                              ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                        >
                          {user.isActive ? 'השבת' : 'הפעל'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Allowed Emails Tab */}
      {activeTab === 'allowed' && (
        <div className="space-y-4">
          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              💡 איך זה עובד?
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              רק מיילים שברשימה הזו יכולים להירשם למערכת. כשמשתמש מנסה להתחבר עם Google, 
              המערכת בודקת אם המייל שלו ברשימה. אם כן - הוא יכול להיכנס. אם לא - הוא יקבל הודעת שגיאה.
            </p>
          </div>

          {/* Add Email Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <UserPlus size={18} />
                הוסף מייל מורשה
              </button>
            ) : (
              <form onSubmit={addAllowedEmail} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      אימייל *
                    </label>
                    <input
                      type="email"
                      value={newEmail.email}
                      onChange={(e) => setNewEmail({ ...newEmail, email: e.target.value })}
                      placeholder="user@example.com"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      שם (אופציונלי)
                    </label>
                    <input
                      type="text"
                      value={newEmail.name}
                      onChange={(e) => setNewEmail({ ...newEmail, name: e.target.value })}
                      placeholder="ישראל ישראלי"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      תפקיד
                    </label>
                    <select
                      value={newEmail.role}
                      onChange={(e) => setNewEmail({ ...newEmail, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      {Object.values(ROLES).map(role => (
                        <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      הערה (אופציונלי)
                    </label>
                    <input
                      type="text"
                      value={newEmail.note}
                      onChange={(e) => setNewEmail({ ...newEmail, note: e.target.value })}
                      placeholder="מחלקת פיתוח"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={addingEmail}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <Plus size={18} />
                    {addingEmail ? 'מוסיף...' : 'הוסף'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewEmail({ email: '', name: '', role: 'VIEWER', note: '' });
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Allowed Emails List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                רשימת מיילים מורשים
              </h2>
            </div>

            {allowedEmails.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Mail size={48} className="mx-auto mb-4 opacity-30" />
                <p>אין מיילים מורשים עדיין</p>
                <p className="text-sm mt-2">הוסף מיילים כדי לאפשר למשתמשים להירשם</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">אימייל</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">שם</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">תפקיד</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">סטטוס</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">הערה</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">נוסף</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {allowedEmails.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Mail size={16} className="text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">{item.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {item.name || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${ROLE_COLORS[item.role]}`}>
                            {ROLE_LABELS[item.role]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.isRegistered ? (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                              <CheckCircle size={16} />
                              נרשם
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-400 text-sm">
                              <XCircle size={16} />
                              ממתין
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {item.note || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(item.createdAt).toLocaleDateString('he-IL')}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => deleteAllowedEmail(item.id, item.email)}
                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                            title="הסר מהרשימה"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Role Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">רמות הרשאה</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.values(ROLES).map(role => (
            <div key={role} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[role]}`}>
                {ROLE_LABELS[role]}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {ROLE_DESCRIPTIONS[role]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Statistics Card Component
function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
        </div>
      </div>
    </div>
  );
}
