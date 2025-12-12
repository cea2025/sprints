import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/ui/Skeleton';
import { SearchFilter, useSearch } from '../components/ui/SearchFilter';
import DateTooltip from '../components/ui/DateTooltip';
import { usePermissions } from '../hooks/usePermissions';
import LabelMultiSelect from '../components/ui/LabelMultiSelect';
import LabelChips from '../components/ui/LabelChips';
import ResizableTextarea from '../components/ui/ResizableTextarea';
import AsyncSearchableSelect from '../components/ui/AsyncSearchableSelect';
import { useEntityModalQuery } from '../hooks/useEntityModalQuery';
import { 
  CheckSquare, 
  Plus, 
  Circle, 
  Clock, 
  CheckCircle2, 
  XCircle,
  User,
  Calendar,
  Link as LinkIcon,
  MoreVertical,
  Edit2,
  Trash2,
  AlertCircle
} from 'lucide-react';

const STATUS_CONFIG = {
  TODO: { label: 'לעשות', icon: Circle, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700' },
  IN_PROGRESS: { label: 'בתהליך', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  DONE: { label: 'הושלם', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  CANCELLED: { label: 'בוטל', icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' }
};

const PRIORITY_CONFIG = {
  0: { label: 'רגיל', color: 'text-gray-500' },
  1: { label: 'גבוה', color: 'text-orange-500' },
  2: { label: 'דחוף', color: 'text-red-500' }
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [stories, setStories] = useState([]);
  const [labels, setLabels] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [labelFilterIds, setLabelFilterIds] = useState([]);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({
    status: '',
    ownerId: '',
    type: '' // 'standalone' or ''
  });
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    storyId: '',
    ownerId: '',
    priority: 0,
    dueDate: '',
    labelIds: []
  });

  const { loading, request } = useApi();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { isAdmin } = usePermissions();

  const filteredTasks = useSearch(tasks, ['title', 'description', 'owner.name', 'story.title'], searchTerm);

  useEffect(() => {
    if (!currentOrganization) return;
    fetchTasks();
    fetchTeamMembers();
    fetchStories();
    fetchLabels();
  }, [currentOrganization?.id, filters, sortBy, sortOrder, labelFilterIds.join(',')]);

  const fetchLabels = async () => {
    const data = await request('/api/labels', { showToast: false });
    if (data && Array.isArray(data)) setLabels(data);
  };

  const fetchTasks = async () => {
    let url = '/api/tasks';
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.ownerId) params.append('ownerId', filters.ownerId);
    if (filters.type === 'standalone') params.append('standalone', 'true');
    if (labelFilterIds.length > 0) params.append('labelIds', labelFilterIds.join(','));
    params.append('labelMode', 'or');
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    if (params.toString()) url += `?${params.toString()}`;

    const data = await request(url);
    if (data && Array.isArray(data)) setTasks(data);
  };

  const fetchTeamMembers = async () => {
    const data = await request('/api/team', { showToast: false });
    if (data && Array.isArray(data)) setTeamMembers(data);
  };

  const fetchStories = async () => {
    const data = await request('/api/stories?limit=50', { showToast: false });
    // Handle both array and paginated response formats
    if (data) {
      if (Array.isArray(data)) {
        setStories(data);
      } else if (data.data && Array.isArray(data.data)) {
        setStories(data.data);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const url = editingTask
      ? `/api/tasks/${editingTask.id}`
      : '/api/tasks';
    const method = editingTask ? 'PUT' : 'POST';

    const result = await request(url, {
      method,
      body: {
        ...formData,
        storyId: formData.storyId || null,
        dueDate: formData.dueDate || null
      },
      successMessage: editingTask ? 'משימה עודכנה בהצלחה' : 'משימה נוצרה בהצלחה'
    });

    if (result) {
      const taskId = editingTask?.id || result.id;
      if (taskId) {
        await request(`/api/tasks/${taskId}/labels`, {
          method: 'POST',
          body: { labelIds: formData.labelIds || [] },
          showToast: false
        });
      }
      closeAndClear();
      fetchTasks();
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    // Optimistic update - update UI immediately for instant feedback
    const previousTasks = [...tasks];
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    
    // Then send request to server
    const result = await request(`/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: { status: newStatus },
      showToast: false
    });

    // Rollback if failed
    if (!result) {
      setTasks(previousTasks);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      code: task.code || '',
      title: task.title,
      description: task.description || '',
      // Handle both flat IDs and nested objects from API
      storyId: task.storyId || task.story?.id || '',
      ownerId: task.ownerId || task.owner?.id || '',
      priority: task.priority || 0,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      labelIds: Array.isArray(task.labels) ? task.labels.map(l => l.id) : []
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את המשימה?')) return;

    const result = await request(`/api/tasks/${id}`, {
      method: 'DELETE',
      successMessage: 'משימה נמחקה בהצלחה'
    });

    if (result) {
      fetchTasks();
    }
  };

  // Generate next available code (m-01, m-02, m-03...)
  const generateNextCode = () => {
    if (tasks.length === 0) return 'm-01';
    
    // Extract numeric codes from m-XX format and find the max
    const numericCodes = tasks
      .map(task => {
        const match = task.code?.match(/^m-(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(num => num !== null);
    
    if (numericCodes.length === 0) return 'm-01';
    
    const maxCode = Math.max(...numericCodes);
    const nextCode = maxCode + 1;
    return `m-${nextCode.toString().padStart(2, '0')}`;
  };

  const resetForm = () => {
    setEditingTask(null);
    setFormData({
      code: '',
      title: '',
      description: '',
      storyId: '',
      ownerId: '',
      priority: 0,
      dueDate: '',
      labelIds: []
    });
  };

  const openNewModal = () => {
    resetForm();
    // Set default owner to current user's team member
    const currentTeamMember = teamMembers.find(tm => tm.userId === user?.id);
    // Set suggested next code
    setFormData(prev => ({ 
      ...prev, 
      code: generateNextCode(),
      ownerId: currentTeamMember?.id || ''
    }));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // Deep-link modal open: /tasks?new=1&prefillStoryId=... OR /tasks?edit=<id>
  const { closeAndClear } = useEntityModalQuery({
    isReady: !!currentOrganization?.id,
    getPrefillFromQuery: (params) => ({
      storyId: params.get('prefillStoryId') || '',
    }),
    onNew: (prefill) => {
      resetForm();
      const currentTeamMember = teamMembers.find(tm => tm.userId === user?.id);
      setFormData(prev => ({
        ...prev,
        code: generateNextCode(),
        ownerId: currentTeamMember?.id || '',
        storyId: prefill?.storyId || '',
      }));
      setIsModalOpen(true);
    },
    onEdit: async (id) => {
      const existing = tasks.find(t => t.id === id);
      if (existing) {
        handleEdit(existing);
        return;
      }
      const fetched = await request(`/api/tasks/${id}`, { showToast: false });
      if (fetched) handleEdit(fetched);
    },
    onClose: closeModal,
  });

  // Group tasks by status for display
  const tasksByStatus = {
    TODO: filteredTasks.filter(t => t.status === 'TODO'),
    IN_PROGRESS: filteredTasks.filter(t => t.status === 'IN_PROGRESS'),
    DONE: filteredTasks.filter(t => t.status === 'DONE'),
    CANCELLED: filteredTasks.filter(t => t.status === 'CANCELLED')
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
            <CheckSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">משימות</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ניהול משימות יום-יומיות
            </p>
          </div>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
        >
          <Plus className="w-5 h-5" />
          <span>משימה חדשה</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <SearchFilter
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="חיפוש משימות..."
          />
        </div>

        <select
          value={filters.status}
          onChange={e => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">כל הסטטוסים</option>
          <option value="TODO">לעשות</option>
          <option value="IN_PROGRESS">בתהליך</option>
          <option value="DONE">הושלם</option>
        </select>

        <select
          value={filters.type}
          onChange={e => setFilters({ ...filters, type: e.target.value })}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">כל המשימות</option>
          <option value="standalone">משימות עצמאיות</option>
        </select>

        <div className="min-w-64">
          <LabelMultiSelect
            options={labels}
            value={labelFilterIds}
            onChange={setLabelFilterIds}
            placeholder="סינון לפי תוויות"
          />
        </div>

        <select
          value={`${sortBy}:${sortOrder}`}
          onChange={(e) => {
            const [sb, so] = e.target.value.split(':');
            setSortBy(sb);
            setSortOrder(so);
          }}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="createdAt:desc">חדש → ישן</option>
          <option value="createdAt:asc">ישן → חדש</option>
          <option value="updatedAt:desc">עודכן לאחרונה</option>
          <option value="dueDate:asc">דדליין קרוב → רחוק</option>
          <option value="dueDate:desc">דדליין רחוק → קרוב</option>
          <option value="title:asc">כותרת א׳ → ת׳</option>
          <option value="title:desc">כותרת ת׳ → א׳</option>
        </select>

        <span className="text-sm text-gray-500 dark:text-gray-400">
          {filteredTasks.length} משימות
        </span>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            אין עדיין משימות
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            צור את המשימה הראשונה שלך
          </p>
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            צור משימה
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const statusConfig = STATUS_CONFIG[task.status];
            const StatusIcon = statusConfig.icon;
            const priorityConfig = PRIORITY_CONFIG[task.priority || 0];

            return (
              <div
                key={task.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all ${
                  task.status === 'DONE' ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Status Toggle */}
                  <button
                    onClick={() => handleStatusChange(
                      task.id,
                      task.status === 'DONE' ? 'TODO' : task.status === 'TODO' ? 'IN_PROGRESS' : 'DONE'
                    )}
                    className={`p-1.5 rounded-lg ${statusConfig.bg} hover:scale-110 transition-transform`}
                    title={statusConfig.label}
                  >
                    <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <DateTooltip createdAt={task.createdAt} updatedAt={task.updatedAt}>
                          <h3 className={`font-medium text-gray-900 dark:text-white ${
                            task.status === 'DONE' ? 'line-through' : ''
                          }`}>
                            {task.title}
                          </h3>
                        </DateTooltip>
                        {task.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                        <LabelChips labels={task.labels} />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(task)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
                      {/* Priority */}
                      {task.priority > 0 && (
                        <span className={`flex items-center gap-1 ${priorityConfig.color}`}>
                          <AlertCircle className="w-3.5 h-3.5" />
                          {priorityConfig.label}
                        </span>
                      )}

                      {/* Owner */}
                      {task.owner && (
                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <User className="w-3.5 h-3.5" />
                          {task.owner.name}
                        </span>
                      )}

                      {/* Due Date */}
                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(task.dueDate).toLocaleDateString('he-IL')}
                        </span>
                      )}

                      {/* Linked Story */}
                      {task.story && (
                        <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                          <LinkIcon className="w-3.5 h-3.5" />
                          {task.story.title}
                        </span>
                      )}

                      {/* Standalone Badge */}
                      {!task.storyId && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                          עצמאית
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingTask ? 'עריכת משימה' : 'משימה חדשה'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Code and Title Row */}
              <div className="flex gap-3">
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    קוד
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="m-01"
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    כותרת <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="מה צריך לעשות?"
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תיאור
                </label>
                <ResizableTextarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="פרטים נוספים..."
                  minRows={2}
                  maxRows={8}
                  className="focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  אחראי <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.ownerId}
                  onChange={e => setFormData({ ...formData, ownerId: e.target.value })}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">בחר אחראי</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  קשורה לאבן דרך
                </label>
                <AsyncSearchableSelect
                  value={formData.storyId}
                  onChange={(value) => setFormData({ ...formData, storyId: value })}
                  placeholder="משימה עצמאית"
                  searchPlaceholder="חפש אבן דרך לפי שם/קוד/סלע..."
                  emptyMessage="לא נמצאו אבני דרך"
                  allowClear={true}
                  getLabel={(story) => `${story.title}${story.rock?.code ? ` (${story.rock.code})` : ''}`}
                  getValue={(story) => story.id}
                  getSearchText={(story) =>
                    `${story.title} ${story.code || ''} ${story.rock?.code || ''} ${story.rock?.name || ''}`
                  }
                  loadOptions={async (term) => {
                    const params = new URLSearchParams();
                    if (term && term.trim()) params.append('search', term.trim());
                    params.append('limit', '20');
                    const data = await request(`/api/stories?${params.toString()}`, { showToast: false });
                    if (Array.isArray(data)) return data;
                    if (data?.data && Array.isArray(data.data)) return data.data;
                    return [];
                  }}
                  loadById={async (id) => {
                    const data = await request(`/api/stories/${id}`, { showToast: false });
                    return data || null;
                  }}
                  minSearchLength={0}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תוויות
                </label>
                <LabelMultiSelect
                  options={labels}
                  value={formData.labelIds}
                  onChange={(vals) => setFormData({ ...formData, labelIds: vals })}
                  placeholder="בחר תוויות..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    עדיפות
                  </label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={0}>רגיל</option>
                    <option value={1}>גבוה</option>
                    <option value={2}>דחוף</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    תאריך יעד
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeAndClear}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'שומר...' : (editingTask ? 'עדכן' : 'צור')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

