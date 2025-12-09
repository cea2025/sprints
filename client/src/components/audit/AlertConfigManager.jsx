/**
 * Alert Configuration Manager
 * 
 * UI component for managing audit alert configurations.
 * Allows admins to create, edit, and delete alert rules.
 */

import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { 
  Bell, Plus, Edit, Trash2, Check, X, Save,
  Mail, Webhook, Smartphone, AlertTriangle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

// Available actions for alerts
const AVAILABLE_ACTIONS = [
  { value: 'CREATE', label: 'יצירה' },
  { value: 'UPDATE', label: 'עדכון' },
  { value: 'DELETE', label: 'מחיקה' },
  { value: 'LOGIN', label: 'כניסה' },
  { value: 'LOGIN_FAILED', label: 'כניסה נכשלה' },
  { value: 'EXPORT_CSV', label: 'ייצוא CSV' }
];

// Available entity types
const AVAILABLE_ENTITIES = [
  { value: '*', label: 'הכל' },
  { value: 'Rock', label: 'סלעים' },
  { value: 'Story', label: 'אבני דרך' },
  { value: 'Sprint', label: 'ספרינטים' },
  { value: 'Objective', label: 'מטרות' },
  { value: 'TeamMember', label: 'חברי צוות' },
  { value: 'User', label: 'משתמשים' }
];

// Roles for notifications
const NOTIFY_ROLES = [
  { value: 'ADMIN', label: 'מנהל' },
  { value: 'MANAGER', label: 'מנהל פרויקט' },
  { value: 'MEMBER', label: 'חבר' }
];

export default function AlertConfigManager() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingConfig, setEditingConfig] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerActions: [],
    triggerEntities: ['*'],
    notifyRoles: ['ADMIN'],
    notifyUserIds: [],
    channelInApp: true,
    channelEmail: false,
    channelWebhook: false,
    webhookUrl: '',
    webhookSecret: '',
    cooldownMinutes: 5,
    isActive: true
  });

  // Fetch configs
  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/api/audit/alerts`);
      if (res.ok) {
        const data = await res.json();
        setConfigs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError('שגיאה בטעינת הגדרות ההתראות');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      triggerActions: [],
      triggerEntities: ['*'],
      notifyRoles: ['ADMIN'],
      notifyUserIds: [],
      channelInApp: true,
      channelEmail: false,
      channelWebhook: false,
      webhookUrl: '',
      webhookSecret: '',
      cooldownMinutes: 5,
      isActive: true
    });
    setEditingConfig(null);
    setShowForm(false);
  };

  const handleEdit = (config) => {
    setFormData({
      name: config.name || '',
      description: config.description || '',
      triggerActions: config.triggerActions || [],
      triggerEntities: config.triggerEntities || ['*'],
      notifyRoles: config.notifyRoles || ['ADMIN'],
      notifyUserIds: config.notifyUserIds || [],
      channelInApp: config.channelInApp ?? true,
      channelEmail: config.channelEmail ?? false,
      channelWebhook: config.channelWebhook ?? false,
      webhookUrl: config.webhookUrl || '',
      webhookSecret: config.webhookSecret || '',
      cooldownMinutes: config.cooldownMinutes || 5,
      isActive: config.isActive ?? true
    });
    setEditingConfig(config);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name || formData.triggerActions.length === 0) {
      alert('יש למלא שם ולבחור לפחות פעולה אחת');
      return;
    }

    try {
      const url = editingConfig 
        ? `${API_URL}/api/audit/alerts/${editingConfig.id}`
        : `${API_URL}/api/audit/alerts`;
      
      const res = await apiFetch(url, {
        method: editingConfig ? 'PUT' : 'POST',
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'שגיאה בשמירה');
      }

      resetForm();
      fetchConfigs();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את הגדרת ההתראה?')) return;

    try {
      const res = await apiFetch(`${API_URL}/api/audit/alerts/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('שגיאה במחיקה');
      }

      fetchConfigs();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleActive = async (config) => {
    try {
      const res = await apiFetch(`${API_URL}/api/audit/alerts/${config.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...config, isActive: !config.isActive })
      });

      if (res.ok) {
        fetchConfigs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleArrayItem = (array, item) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    }
    return [...array, item];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-orange-500" />
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              הגדרות התראות
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              קבל התראות על פעולות חשובות במערכת
            </p>
          </div>
        </div>
        
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            הוסף התראה
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingConfig ? 'עריכת התראה' : 'התראה חדשה'}
          </h3>

          <div className="space-y-4">
            {/* Name & Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שם ההתראה *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="למשל: מחיקת סלעים"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תיאור
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="תיאור קצר של ההתראה"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Trigger Actions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                פעולות שמפעילות התראה *
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ACTIONS.map(action => (
                  <button
                    key={action.value}
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      triggerActions: toggleArrayItem(formData.triggerActions, action.value)
                    })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.triggerActions.includes(action.value)
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Trigger Entities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                סוגי ישויות
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ENTITIES.map(entity => (
                  <button
                    key={entity.value}
                    type="button"
                    onClick={() => {
                      if (entity.value === '*') {
                        setFormData({ ...formData, triggerEntities: ['*'] });
                      } else {
                        const newEntities = formData.triggerEntities.filter(e => e !== '*');
                        setFormData({
                          ...formData,
                          triggerEntities: toggleArrayItem(newEntities, entity.value)
                        });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.triggerEntities.includes(entity.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {entity.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notify Roles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                למי לשלוח התראה
              </label>
              <div className="flex flex-wrap gap-2">
                {NOTIFY_ROLES.map(role => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      notifyRoles: toggleArrayItem(formData.notifyRoles, role.value)
                    })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.notifyRoles.includes(role.value)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Channels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ערוצי התראה
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.channelInApp}
                    onChange={(e) => setFormData({ ...formData, channelInApp: e.target.checked })}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <Smartphone size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">באפליקציה</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.channelEmail}
                    onChange={(e) => setFormData({ ...formData, channelEmail: e.target.checked })}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <Mail size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">אימייל</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.channelWebhook}
                    onChange={(e) => setFormData({ ...formData, channelWebhook: e.target.checked })}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <Webhook size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Webhook</span>
                </label>
              </div>
            </div>

            {/* Webhook Settings */}
            {formData.channelWebhook && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    placeholder="https://example.com/webhook"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Secret (לחתימה)
                  </label>
                  <input
                    type="password"
                    value={formData.webhookSecret}
                    onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                    placeholder="optional"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            {/* Cooldown */}
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                השהייה בין התראות (דקות)
              </label>
              <input
                type="number"
                min="0"
                max="1440"
                value={formData.cooldownMinutes}
                onChange={(e) => setFormData({ ...formData, cooldownMinutes: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Save size={18} />
                {editingConfig ? 'עדכן' : 'שמור'}
              </button>
              <button
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={18} />
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configs List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">טוען...</div>
        ) : configs.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">אין התראות מוגדרות</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              הוסף התראה כדי לקבל עדכונים על פעולות במערכת
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {configs.map(config => (
              <div 
                key={config.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  !config.isActive ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {config.name}
                      </h4>
                      {!config.isActive && (
                        <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded">
                          מושבת
                        </span>
                      )}
                    </div>
                    {config.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {config.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {/* Actions */}
                      {config.triggerActions?.map(action => (
                        <span 
                          key={action}
                          className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded"
                        >
                          {AVAILABLE_ACTIONS.find(a => a.value === action)?.label || action}
                        </span>
                      ))}
                      {/* Entities */}
                      {config.triggerEntities?.filter(e => e !== '*').map(entity => (
                        <span 
                          key={entity}
                          className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded"
                        >
                          {AVAILABLE_ENTITIES.find(e => e.value === entity)?.label || entity}
                        </span>
                      ))}
                      {config.triggerEntities?.includes('*') && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                          כל הישויות
                        </span>
                      )}
                      {/* Channels */}
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded flex items-center gap-1">
                        {config.channelInApp && <Smartphone size={10} />}
                        {config.channelEmail && <Mail size={10} />}
                        {config.channelWebhook && <Webhook size={10} />}
                      </span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(config)}
                      className={`p-2 rounded-lg transition-colors ${
                        config.isActive 
                          ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                          : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={config.isActive ? 'השבת' : 'הפעל'}
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => handleEdit(config)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="ערוך"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="מחק"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

