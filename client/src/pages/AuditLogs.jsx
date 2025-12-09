/**
 * Audit Logs Page
 * 
 * View and filter system audit logs.
 * Accessible by ADMIN and MANAGER users.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { useOrganization } from '../context/OrganizationContext';
import { apiFetch } from '../utils/api';
import AlertConfigManager from '../components/audit/AlertConfigManager';
import { 
  Search, Filter, Download, RefreshCw, ChevronDown, ChevronUp,
  User, Calendar, Activity, Clock, Eye, FileText, Bell,
  ArrowUpDown, X, Info, AlertTriangle, CheckCircle, Trash2, Edit, Plus
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

// Action icons and colors
const ACTION_CONFIG = {
  CREATE: { icon: Plus, color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400', label: 'יצירה' },
  UPDATE: { icon: Edit, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400', label: 'עדכון' },
  DELETE: { icon: Trash2, color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400', label: 'מחיקה' },
  LOGIN: { icon: User, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400', label: 'כניסה' },
  LOGOUT: { icon: User, color: 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400', label: 'יציאה' },
  EXPORT: { icon: Download, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400', label: 'ייצוא' },
  VIEW: { icon: Eye, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400', label: 'צפייה' },
  DEFAULT: { icon: Activity, color: 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400', label: 'פעולה' }
};

// Entity type labels in Hebrew
const ENTITY_LABELS = {
  Sprint: 'ספרינט',
  Rock: 'סלע',
  Story: 'אבן דרך',
  Objective: 'יעד',
  TeamMember: 'חבר צוות',
  Organization: 'ארגון',
  User: 'משתמש',
  AllowedEmail: 'מייל מורשה',
  AuditLog: 'לוג ביקורת'
};

export default function AuditLogs() {
  const navigate = useNavigate();
  const { isAdmin, isManager } = usePermissions();
  const { currentOrganization } = useOrganization();
  
  // State
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' | 'alerts'
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedLog, setExpandedLog] = useState(null);
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    entityType: '',
    userId: '',
    startDate: '',
    endDate: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  // Check permissions
  useEffect(() => {
    if (!isAdmin && !isManager) {
      navigate(-1);
    }
  }, [isAdmin, isManager, navigate]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });
      
      // Add filters
      if (filters.search) params.append('search', filters.search);
      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const res = await apiFetch(`${API_URL}/api/audit?${params}`);
      
      if (!res.ok) {
        throw new Error('שגיאה בטעינת הלוגים');
      }
      
      const data = await res.json();
      setLogs(data.logs || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        totalPages: data.totalPages || 1
      }));
      
    } catch (err) {
      setError(err.message);
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id, pagination.page, pagination.limit, filters]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!currentOrganization?.id || !isAdmin) return;
    
    try {
      const res = await apiFetch(`${API_URL}/api/audit/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching audit stats:', err);
    }
  }, [currentOrganization?.id, isAdmin]);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  // Export to CSV
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const res = await apiFetch(`${API_URL}/api/audit/export/csv?${params}`);
      
      if (!res.ok) {
        throw new Error('שגיאה בייצוא');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      alert(err.message);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      search: '',
      action: '',
      entityType: '',
      userId: '',
      startDate: '',
      endDate: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Get action config
  const getActionConfig = (action) => {
    const baseAction = action?.split('_')[0] || 'DEFAULT';
    return ACTION_CONFIG[baseAction] || ACTION_CONFIG.DEFAULT;
  };

  if (!isAdmin && !isManager) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="text-3xl">📋</span>
            לוג ביקורת
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            מעקב אחר כל הפעולות במערכת
          </p>
        </div>
        
        {activeTab === 'logs' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              רענון
            </button>
            
            {isAdmin && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download size={18} />
                ייצוא CSV
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      {isAdmin && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'logs'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <FileText size={18} className="inline ml-2" />
              לוגים
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'alerts'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <Bell size={18} className="inline ml-2" />
              הגדרות התראות
            </button>
          </nav>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && isAdmin && (
        <AlertConfigManager />
      )}

      {/* Logs Tab - Stats Cards */}
      {activeTab === 'logs' && (
        <>
        {/* Stats Cards */}
      {stats && isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="פעולות היום" 
            value={stats.today || 0} 
            icon="📊" 
            color="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" 
          />
          <StatCard 
            title="פעולות השבוע" 
            value={stats.thisWeek || 0} 
            icon="📈" 
            color="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
          />
          <StatCard 
            title="משתמשים פעילים" 
            value={stats.activeUsers || 0} 
            icon="👥" 
            color="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" 
          />
          <StatCard 
            title="סה״כ רשומות" 
            value={pagination.total} 
            icon="📝" 
            color="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800" 
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Filter size={20} className="text-gray-500" />
            <span className="font-medium text-gray-900 dark:text-white">סינון וחיפוש</span>
            {Object.values(filters).some(v => v) && (
              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                פילטרים פעילים
              </span>
            )}
          </div>
          {showFilters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {/* Filter Form */}
        {showFilters && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  חיפוש חופשי
                </label>
                <div className="relative">
                  <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="חפש לפי שם, פעולה..."
                    className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              
              {/* Action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  סוג פעולה
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">הכל</option>
                  <option value="CREATE">יצירה</option>
                  <option value="UPDATE">עדכון</option>
                  <option value="DELETE">מחיקה</option>
                  <option value="LOGIN">כניסה</option>
                  <option value="LOGOUT">יציאה</option>
                  <option value="EXPORT">ייצוא</option>
                </select>
              </div>
              
              {/* Entity Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  סוג ישות
                </label>
                <select
                  value={filters.entityType}
                  onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">הכל</option>
                  <option value="Sprint">ספרינט</option>
                  <option value="Rock">סלע</option>
                  <option value="Story">אבן דרך</option>
                  <option value="Objective">יעד</option>
                  <option value="TeamMember">חבר צוות</option>
                  <option value="Organization">ארגון</option>
                  <option value="User">משתמש</option>
                </select>
              </div>
              
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  מתאריך
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  עד תאריך
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            
            {/* Filter Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              >
                <X size={16} />
                נקה פילטרים
              </button>
              <button
                onClick={() => { setPagination(prev => ({ ...prev, page: 1 })); fetchLogs(); }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                החל פילטרים
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">טוען לוגים...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <p className="text-red-500 font-medium">{error}</p>
            <button
              onClick={fetchLogs}
              className="mt-4 px-4 py-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
            >
              נסה שוב
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">לא נמצאו רשומות</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              נסה לשנות את הפילטרים
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      תאריך ושעה
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      משתמש
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      פעולה
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      ישות
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      פרטים
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-12">
                      
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {logs.map((log) => {
                    const actionConfig = getActionConfig(log.action);
                    const ActionIcon = actionConfig.icon;
                    const isExpanded = expandedLog === log.id;
                    
                    return (
                      <React.Fragment key={log.id}>
                        <tr 
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                            isExpanded ? 'bg-purple-50 dark:bg-purple-900/10' : ''
                          }`}
                        >
                          {/* Date */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar size={14} className="text-gray-400" />
                              <span className="text-gray-900 dark:text-white">
                                {new Date(log.createdAt).toLocaleDateString('he-IL')}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">
                                {new Date(log.createdAt).toLocaleTimeString('he-IL', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                          </td>
                          
                          {/* User */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                                {log.userName?.charAt(0) || '?'}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {log.userName || 'לא ידוע'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {log.userEmail}
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          {/* Action */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${actionConfig.color}`}>
                              <ActionIcon size={12} />
                              {actionConfig.label}
                            </span>
                          </td>
                          
                          {/* Entity */}
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              <span className="text-gray-500 dark:text-gray-400">
                                {ENTITY_LABELS[log.entityType] || log.entityType}
                              </span>
                              {log.entityName && (
                                <div className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                                  {log.entityName}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {/* Changes Summary */}
                          <td className="px-4 py-3">
                            {log.changedFields && log.changedFields.length > 0 ? (
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {log.changedFields.slice(0, 3).join(', ')}
                                {log.changedFields.length > 3 && ` +${log.changedFields.length - 3}`}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          
                          {/* Expand Button */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            >
                              {isExpanded ? <ChevronUp size={18} /> : <Eye size={18} />}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Expanded Details */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 bg-gray-50 dark:bg-gray-800/50">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Old Values */}
                                {log.oldValues && Object.keys(log.oldValues).length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                      <span className="text-red-500">◄</span> ערכים קודמים
                                    </h4>
                                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-sm font-mono overflow-auto max-h-48">
                                      <pre className="text-red-700 dark:text-red-300 whitespace-pre-wrap">
                                        {JSON.stringify(log.oldValues, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                                
                                {/* New Values */}
                                {log.newValues && Object.keys(log.newValues).length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                      <span className="text-green-500">►</span> ערכים חדשים
                                    </h4>
                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm font-mono overflow-auto max-h-48">
                                      <pre className="text-green-700 dark:text-green-300 whitespace-pre-wrap">
                                        {JSON.stringify(log.newValues, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Metadata */}
                                <div className="md:col-span-2">
                                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                    מידע נוסף
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">ID:</span>
                                      <span className="mr-2 font-mono text-gray-900 dark:text-white text-xs">
                                        {log.id.slice(0, 8)}...
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Entity ID:</span>
                                      <span className="mr-2 font-mono text-gray-900 dark:text-white text-xs">
                                        {log.entityId?.slice(0, 8) || '-'}...
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">IP:</span>
                                      <span className="mr-2 font-mono text-gray-900 dark:text-white">
                                        {log.ipAddress || '-'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">User Agent:</span>
                                      <span className="mr-2 text-gray-900 dark:text-white truncate">
                                        {log.userAgent?.slice(0, 30) || '-'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                מציג {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} מתוך {pagination.total}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  הקודם
                </button>
                
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  עמוד {pagination.page} מתוך {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  הבא
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      </>
      )}
    </div>
  );
}

// Import React for Fragment
import React from 'react';

// Stats Card Component
function StatCard({ title, value, icon, color }) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
        </div>
      </div>
    </div>
  );
}

