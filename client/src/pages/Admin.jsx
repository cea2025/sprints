/**
 * Admin Page - User Management
 * 
 * Only accessible by ADMIN users.
 * Manages users, roles, and system statistics.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_COLORS } from '../constants/roles';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, can } = usePermissions();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  // Fetch data
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
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
      
      // Refresh users
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="סה״כ משתמשים" 
            value={stats.users.total} 
            icon="👥"
          />
          <StatCard 
            title="משתמשים פעילים" 
            value={stats.users.active} 
            icon="✅"
          />
          <StatCard 
            title="אבני דרך" 
            value={stats.content.rocks} 
            icon="🎯"
          />
          <StatCard 
            title="משימות" 
            value={stats.content.stories} 
            icon="📋"
          />
        </div>
      )}

      {/* Role Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          רמות הרשאה
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.values(ROLES).map(role => (
            <div 
              key={role}
              className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
            >
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

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            משתמשים ({users.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">טוען...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    משתמש
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    אימייל
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    תפקיד
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    סטטוס
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    הצטרף
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map(user => (
                  <tr key={user.id} className={!user.isActive ? 'opacity-50' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.picture ? (
                          <img 
                            src={user.picture} 
                            alt={user.name}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                              {user.name?.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      {editingUser === user.id ? (
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          onBlur={() => setEditingUser(null)}
                          autoFocus
                          className="text-sm rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          {Object.values(ROLES).map(role => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span 
                          className={`px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 ${ROLE_COLORS[user.role]}`}
                          onClick={() => setEditingUser(user.id)}
                          title="לחץ לעריכה"
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
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {title}
          </p>
        </div>
      </div>
    </div>
  );
}

