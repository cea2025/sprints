/**
 * Data Management Page
 * ניהול נתוני מערכת: חברי צוות, מיילים מורשים
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { useApi } from '../hooks/useApi';
import { 
  Users, Mail, Plus, Trash2, Edit2, UserCheck, UserX, X, 
  Database, ChevronDown, ChevronUp 
} from 'lucide-react';
import { ROLES, ROLE_LABELS, ROLE_COLORS } from '../constants/roles';

export default function DataManagement() {
  const navigate = useNavigate();
  const { isAdmin, isManager } = usePermissions();
  const { loading, request } = useApi();
  
  const [activeSection, setActiveSection] = useState('team');
  
  // Team Members
  const [teamMembers, setTeamMembers] = useState([]);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [teamFormData, setTeamFormData] = useState({ name: '', role: '', capacity: '' });
  
  // Allowed Emails
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailFormData, setEmailFormData] = useState({ email: '', name: '', role: 'VIEWER', note: '' });

  // Redirect if not admin/manager
  useEffect(() => {
    if (!isAdmin && !isManager) {
      navigate('/dashboard');
    }
  }, [isAdmin, isManager, navigate]);

  useEffect(() => {
    fetchTeamMembers();
    if (isAdmin) {
      fetchAllowedEmails();
    }
  }, [isAdmin]);

  // ==================== Team Members ====================
  
  const fetchTeamMembers = async () => {
    const data = await request('/api/team', { showToast: false });
    if (data && Array.isArray(data)) setTeamMembers(data);
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    const url = editingMember ? `/api/team/${editingMember.id}` : '/api/team';
    const method = editingMember ? 'PUT' : 'POST';

    const result = await request(url, {
      method,
      body: teamFormData,
      successMessage: editingMember ? 'חבר צוות עודכן' : 'חבר צוות נוסף'
    });

    if (result) {
      resetTeamForm();
      fetchTeamMembers();
    }
  };

  const handleDeleteMember = async (member) => {
    if (!confirm(`למחוק את ${member.name}?`)) return;
    
    const result = await request(`/api/team/${member.id}`, {
      method: 'DELETE',
      successMessage: 'חבר צוות נמחק'
    });

    if (result) fetchTeamMembers();
  };

  const handleToggleActive = async (member) => {
    const result = await request(`/api/team/${member.id}`, {
      method: 'PUT',
      body: { ...member, isActive: !member.isActive },
      successMessage: member.isActive ? 'חבר צוות הושבת' : 'חבר צוות הופעל'
    });

    if (result) fetchTeamMembers();
  };

  const resetTeamForm = () => {
    setShowTeamForm(false);
    setEditingMember(null);
    setTeamFormData({ name: '', role: '', capacity: '' });
  };

  // ==================== Allowed Emails ====================
  
  const fetchAllowedEmails = async () => {
    const data = await request('/api/admin/allowed-emails', { showToast: false });
    if (data && Array.isArray(data)) setAllowedEmails(data);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    const result = await request('/api/admin/allowed-emails', {
      method: 'POST',
      body: emailFormData,
      successMessage: 'מייל נוסף לרשימה'
    });

    if (result) {
      setShowEmailForm(false);
      setEmailFormData({ email: '', name: '', role: 'VIEWER', note: '' });
      fetchAllowedEmails();
    }
  };

  const handleDeleteEmail = async (item) => {
    if (!confirm(`להסיר את ${item.email} מהרשימה?`)) return;
    
    const result = await request(`/api/admin/allowed-emails/${item.id}`, {
      method: 'DELETE',
      successMessage: 'מייל הוסר מהרשימה'
    });

    if (result) fetchAllowedEmails();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
          <Database className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ניהול נתונים</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">ניהול חברי צוות ומיילים מורשים</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <button
          onClick={() => setActiveSection('team')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            activeSection === 'team'
              ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Users size={18} />
          <span>חברי צוות ({teamMembers.length})</span>
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveSection('emails')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              activeSection === 'emails'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Mail size={18} />
            <span>מיילים מורשים ({allowedEmails.length})</span>
          </button>
        )}
      </div>

      {/* Team Members Section */}
      {activeSection === 'team' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={18} className="text-indigo-500" />
              חברי צוות
            </h2>
            <button
              onClick={() => setShowTeamForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} />
              הוסף
            </button>
          </div>

          {/* Team Form */}
          {showTeamForm && (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800">
              <form onSubmit={handleTeamSubmit} className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">שם</label>
                  <input
                    type="text"
                    value={teamFormData.name}
                    onChange={e => setTeamFormData({...teamFormData, name: e.target.value})}
                    className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">תפקיד</label>
                  <input
                    type="text"
                    value={teamFormData.role}
                    onChange={e => setTeamFormData({...teamFormData, role: e.target.value})}
                    className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">קיבולת</label>
                  <input
                    type="number"
                    value={teamFormData.capacity}
                    onChange={e => setTeamFormData({...teamFormData, capacity: e.target.value})}
                    className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                    {editingMember ? 'עדכן' : 'הוסף'}
                  </button>
                  <button type="button" onClick={resetTeamForm} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Team List */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {teamMembers.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>אין חברי צוות</p>
              </div>
            ) : (
              teamMembers.map(member => (
                <div 
                  key={member.id} 
                  className={`p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    !member.isActive ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      member.isActive ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-gray-400'
                    }`}>
                      {member.name?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{member.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{member.role}</div>
                    </div>
                    {member.capacity && (
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        {member.capacity} נק'
                      </span>
                    )}
                    {!member.isActive && (
                      <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                        לא פעיל
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingMember(member);
                        setTeamFormData({ name: member.name, role: member.role, capacity: member.capacity || '' });
                        setShowTeamForm(true);
                      }}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                      title="עריכה"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(member)}
                      className={`p-2 rounded-lg ${
                        member.isActive
                          ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                      title={member.isActive ? 'השבת' : 'הפעל'}
                    >
                      {member.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      title="מחק"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Allowed Emails Section */}
      {activeSection === 'emails' && isAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Mail size={18} className="text-green-500" />
              מיילים מורשים
            </h2>
            <button
              onClick={() => setShowEmailForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus size={16} />
              הוסף
            </button>
          </div>

          {/* Email Form */}
          {showEmailForm && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800">
              <form onSubmit={handleEmailSubmit} className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">אימייל</label>
                  <input
                    type="email"
                    value={emailFormData.email}
                    onChange={e => setEmailFormData({...emailFormData, email: e.target.value})}
                    className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">שם (אופציונלי)</label>
                  <input
                    type="text"
                    value={emailFormData.name}
                    onChange={e => setEmailFormData({...emailFormData, name: e.target.value})}
                    className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">תפקיד</label>
                  <select
                    value={emailFormData.role}
                    onChange={e => setEmailFormData({...emailFormData, role: e.target.value})}
                    className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    {Object.values(ROLES).map(role => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                    הוסף
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setShowEmailForm(false); setEmailFormData({ email: '', name: '', role: 'VIEWER', note: '' }); }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Email List */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {allowedEmails.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Mail className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>אין מיילים מורשים</p>
              </div>
            ) : (
              allowedEmails.map(item => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white">
                      <Mail size={18} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{item.email}</div>
                      {item.name && <div className="text-sm text-gray-500 dark:text-gray-400">{item.name}</div>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${ROLE_COLORS[item.role]}`}>
                      {ROLE_LABELS[item.role]}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteEmail(item)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="הסר"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

