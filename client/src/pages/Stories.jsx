import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useOrganization } from '../context/OrganizationContext';
import { Battery, BatteryCompact, ProgressInput } from '../components/ui/Battery';
import { Skeleton } from '../components/ui/Skeleton';
import { SearchFilter, useSearch } from '../components/ui/SearchFilter';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import DateTooltip from '../components/ui/DateTooltip';
import { ListTodo, Plus, Edit2, Trash2, CheckSquare, Circle, CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import LabelMultiSelect from '../components/ui/LabelMultiSelect';
import LabelChips from '../components/ui/LabelChips';
import ResizableTextarea from '../components/ui/ResizableTextarea';

export default function Stories() {
  const [stories, setStories] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [rocks, setRocks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [labels, setLabels] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expandedStories, setExpandedStories] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [labelFilterIds, setLabelFilterIds] = useState([]);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({
    sprintId: '',
    rockId: '',
    isBlocked: '',
    orphanFilter: '' // 'no-rock', 'backlog'
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  // Task modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskForStory, setTaskForStory] = useState(null); // Which story we're adding a task to
  const [taskFormData, setTaskFormData] = useState({
    code: '',
    title: '',
    description: '',
    status: 'TODO',
    ownerId: '',
    dueDate: ''
  });
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    progress: 0,
    isBlocked: false,
    sprintId: '',
    rockId: '',
    ownerId: '',
    teamId: '',
    labelIds: []
  });

  const { loading, request } = useApi();
  const { currentOrganization } = useOrganization();
  const { isAdmin } = usePermissions();

  // חיפוש בשדות
  const filteredStories = useSearch(stories, ['title', 'description', 'owner.name', 'sprint.name', 'rock.code', 'rock.name'], searchTerm);

  useEffect(() => {
    if (!currentOrganization) return;
    fetchStories();
    fetchSprints();
    fetchRocks();
    fetchTeamMembers();
    fetchTasks();
    if (isAdmin) fetchTeams();
    fetchLabels();
  }, [filters, currentOrganization?.id, sortBy, sortOrder, labelFilterIds.join(',')]);
  const fetchTeams = async () => {
    const data = await request('/api/teams', { showToast: false });
    if (data && Array.isArray(data)) setTeams(data);
  };

  const fetchLabels = async () => {
    const data = await request('/api/labels', { showToast: false });
    if (data && Array.isArray(data)) setLabels(data);
  };

  const fetchStories = async () => {
    let url = '/api/stories';
    const params = new URLSearchParams();
    if (filters.sprintId) params.append('sprintId', filters.sprintId);
    if (filters.rockId) params.append('rockId', filters.rockId);
    if (filters.isBlocked) params.append('isBlocked', filters.isBlocked);
    if (filters.orphanFilter) params.append('orphanFilter', filters.orphanFilter);
    if (labelFilterIds.length > 0) params.append('labelIds', labelFilterIds.join(','));
    params.append('labelMode', 'or');
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    params.append('limit', '30'); // Optimized for performance
    if (params.toString()) url += `?${params.toString()}`;

    const data = await request(url, { showToast: false });
    // Handle both array and paginated response formats
    if (data) {
      if (Array.isArray(data)) {
        setStories(data);
      } else if (data.data && Array.isArray(data.data)) {
        setStories(data.data);
      }
    }
  };

  const fetchSprints = async () => {
    const data = await request('/api/sprints', { showToast: false });
    if (data && Array.isArray(data)) setSprints(data);
  };

  const fetchRocks = async () => {
    const data = await request('/api/rocks', { showToast: false });
    if (data && Array.isArray(data)) setRocks(data);
  };

  const fetchTeamMembers = async () => {
    const data = await request('/api/team', { showToast: false });
    if (data && Array.isArray(data)) setTeamMembers(data);
  };

  const fetchTasks = async () => {
    const data = await request('/api/tasks', { showToast: false });
    if (data && Array.isArray(data)) setTasks(data);
  };

  // Get tasks for a specific story
  const getStoryTasks = (storyId) => {
    return tasks.filter(task => task.storyId === storyId);
  };

  // Toggle story expansion
  const toggleStoryExpansion = (storyId) => {
    setExpandedStories(prev => ({
      ...prev,
      [storyId]: !prev[storyId]
    }));
  };

  // Task status icon
  const getTaskStatusIcon = (status) => {
    switch (status) {
      case 'DONE': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'IN_PROGRESS': return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Generate next task code
  const generateNextTaskCode = () => {
    if (tasks.length === 0) return 'm-01';
    const numericCodes = tasks
      .map(task => {
        const match = task.code?.match(/^m-(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(num => num !== null);
    if (numericCodes.length === 0) return 'm-01';
    const maxCode = Math.max(...numericCodes);
    return `m-${(maxCode + 1).toString().padStart(2, '0')}`;
  };

  // Open task modal for a story
  const openTaskModal = (storyId) => {
    setTaskForStory(storyId);
    // Pre-select the story's owner as default owner for the task
    const story = stories.find(s => s.id === storyId);
    const defaultOwner = story?.ownerId || (teamMembers.length > 0 ? teamMembers[0].id : '');
    setTaskFormData({
      code: generateNextTaskCode(),
      title: '',
      description: '',
      status: 'TODO',
      ownerId: defaultOwner,
      dueDate: ''
    });
    setIsTaskModalOpen(true);
  };

  // Handle task form submission
  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    
    if (!taskFormData.title.trim()) {
      alert('שם המשימה הוא שדה חובה');
      return;
    }
    
    if (!taskFormData.ownerId) {
      alert('יש לבחור אחראי למשימה');
      return;
    }

    const result = await request('/api/tasks', {
      method: 'POST',
      body: {
        ...taskFormData,
        storyId: taskForStory,
        isStandalone: false
      },
      successMessage: 'משימה נוספה בהצלחה'
    });

    if (result) {
      setIsTaskModalOpen(false);
      setTaskForStory(null);
      fetchTasks();
      // Make sure the story is expanded to show the new task
      setExpandedStories(prev => ({ ...prev, [taskForStory]: true }));
    }
  };

  // Toggle task status: TODO -> IN_PROGRESS -> DONE -> TODO
  const handleTaskStatusToggle = async (task) => {
    const statusOrder = ['TODO', 'IN_PROGRESS', 'DONE'];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

    const result = await request(`/api/tasks/${task.id}/status`, {
      method: 'PATCH',
      body: { status: nextStatus },
      showToast: false
    });

    if (result) {
      // Update local tasks state
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.sprintId) {
      alert('ספרינט הוא שדה חובה');
      return;
    }

    const url = editingStory ? `/api/stories/${editingStory.id}` : '/api/stories';
    const method = editingStory ? 'PUT' : 'POST';

    const result = await request(url, {
      method,
      body: formData,
      successMessage: editingStory ? 'אבן דרך עודכנה בהצלחה' : 'אבן דרך נוצרה בהצלחה'
    });

    if (result) {
      const storyId = editingStory?.id || result.id;
      if (storyId) {
        await request(`/api/stories/${storyId}/labels`, {
          method: 'POST',
          body: { labelIds: formData.labelIds || [] },
          showToast: false
        });
      }
      setIsModalOpen(false);
      resetForm();
      fetchStories();
    }
  };

  const handleEdit = (story) => {
    setEditingStory(story);
    setFormData({
      code: story.code || '',
      title: story.title,
      description: story.description || '',
      progress: story.progress || 0,
      isBlocked: story.isBlocked || false,
      // Handle both flat IDs and nested objects from API
      sprintId: story.sprintId || story.sprint?.id || '',
      rockId: story.rockId || story.rock?.id || '',
      ownerId: story.ownerId || story.owner?.id || '',
      teamId: story.teamId || story.team?.id || '',
      labelIds: Array.isArray(story.labels) ? story.labels.map(l => l.id) : []
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את אבן הדרך?')) return;

    const result = await request(`/api/stories/${id}`, {
      method: 'DELETE',
      successMessage: 'אבן דרך נמחקה בהצלחה'
    });

    if (result) fetchStories();
  };

  const handleProgressUpdate = async (storyId, progress) => {
    // Optimistic update - update UI immediately
    const previousStories = [...stories];
    setStories(stories.map(s => 
      s.id === storyId ? { ...s, progress } : s
    ));
    
    const result = await request(`/api/stories/${storyId}/progress`, {
      method: 'PUT',
      body: { progress },
      successMessage: 'התקדמות עודכנה'
    });

    // Rollback if failed
    if (!result) {
      setStories(previousStories);
    }
  };

  const handleBlockToggle = async (story) => {
    // Optimistic update - update UI immediately
    const previousStories = [...stories];
    setStories(stories.map(s => 
      s.id === story.id ? { ...s, isBlocked: !s.isBlocked } : s
    ));
    
    const result = await request(`/api/stories/${story.id}/block`, {
      method: 'PUT',
      successMessage: story.isBlocked ? 'אבן דרך שוחררה' : 'אבן דרך סומנה כחסומה'
    });

    // Rollback if failed
    if (!result) {
      setStories(previousStories);
    }
  };

  // Generate next available code (ed-01, ed-02, ed-03...)
  const generateNextCode = () => {
    if (stories.length === 0) return 'ed-01';
    
    // Extract numeric codes from ed-XX format and find the max
    const numericCodes = stories
      .map(story => {
        const match = story.code?.match(/^ed-(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(num => num !== null);
    
    if (numericCodes.length === 0) return 'ed-01';
    
    const maxCode = Math.max(...numericCodes);
    const nextCode = maxCode + 1;
    return `ed-${nextCode.toString().padStart(2, '0')}`;
  };

  const resetForm = () => {
    setEditingStory(null);
    // Pre-select the first team member as default owner for better UX
    const defaultOwner = teamMembers.length > 0 ? teamMembers[0].id : '';
    setFormData({
      code: '',
      title: '',
      description: '',
      progress: 0,
      isBlocked: false,
      sprintId: filters.sprintId || '',
      rockId: filters.rockId || '',
      ownerId: defaultOwner,
      teamId: '',
      labelIds: []
    });
  };

  const openNewModal = () => {
    resetForm();
    // Set suggested next code
    setFormData(prev => ({
      ...prev,
      code: generateNextCode()
    }));
    setIsModalOpen(true);
  };

  if (loading && stories.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl" />
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
          <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg">
            <ListTodo className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">אבני דרך</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              משימות ויחידות עבודה בתוך ספרינטים
            </p>
          </div>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all shadow-lg shadow-orange-500/25"
        >
          <Plus className="w-5 h-5" />
          <span>אבן דרך חדשה</span>
        </button>
      </div>

      {/* Search */}
      <SearchFilter
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="חיפוש לפי כותרת, תיאור, אחראי, ספרינט או סלע..."
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <select
          value={filters.sprintId}
          onChange={e => setFilters({...filters, sprintId: e.target.value})}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">כל הספרינטים</option>
          {sprints.map(sprint => (
            <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
          ))}
        </select>

        <select
          value={filters.rockId}
          onChange={e => setFilters({...filters, rockId: e.target.value})}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">כל הסלעים</option>
          {rocks.map(rock => (
            <option key={rock.id} value={rock.id}>{rock.code} - {rock.name}</option>
          ))}
        </select>

        <select
          value={filters.isBlocked}
          onChange={e => setFilters({...filters, isBlocked: e.target.value})}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">כל הסטטוסים</option>
          <option value="true">חסומות בלבד</option>
          <option value="false">לא חסומות</option>
        </select>

        <select
          value={filters.orphanFilter}
          onChange={e => setFilters({...filters, orphanFilter: e.target.value})}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">כל הקישורים</option>
          <option value="no-rock">📋 ללא סלע</option>
          <option value="backlog">⏳ בהמתנה (ללא ספרינט)</option>
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
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="createdAt:desc">חדש → ישן</option>
          <option value="createdAt:asc">ישן → חדש</option>
          <option value="updatedAt:desc">עודכן לאחרונה</option>
          <option value="title:asc">כותרת א׳ → ת׳</option>
          <option value="title:desc">כותרת ת׳ → א׳</option>
        </select>

        <span className="flex items-center text-sm text-gray-500 dark:text-gray-400 mr-auto">
          {filteredStories.length} אבני דרך
        </span>
      </div>

      {/* Stories List */}
      {stories.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            אין אבני דרך
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            צור את אבן הדרך הראשונה שלך
          </p>
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            צור אבן דרך
          </button>
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            לא נמצאו תוצאות
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            נסה לשנות את מילות החיפוש
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStories.map((story) => (
            <div
              key={story.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border ${
                story.isBlocked 
                  ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' 
                  : 'border-gray-200 dark:border-gray-700'
              } p-4 hover:shadow-md transition-all`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Title & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <DateTooltip createdAt={story.createdAt} updatedAt={story.updatedAt}>
                      <h3 className={`font-medium ${
                        story.isBlocked 
                          ? 'text-red-800 dark:text-red-300' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {story.title}
                      </h3>
                    </DateTooltip>
                    {story.isBlocked && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-full flex items-center gap-1">
                        <span>🚫</span> חסום
                      </span>
                    )}
                  </div>
                  {story.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">
                      {story.description}
                    </p>
                  )}
                  <LabelChips labels={story.labels} />
                  <div className="flex flex-wrap gap-2 text-xs">
                    {story.sprint && (
                      <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
                        🏃 {story.sprint.name}
                      </span>
                    )}
                    {story.rock && (
                      <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg">
                        🪨 {story.rock.code}
                        {story.rock.objective && (
                          <span className="mr-1 opacity-75">({story.rock.objective.code})</span>
                        )}
                      </span>
                    )}
                    {story.owner && (
                      <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <div className="w-5 h-5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-[10px] font-medium">
                          {story.owner.name?.charAt(0)}
                        </div>
                        {story.owner.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress & Actions */}
                <div className="flex items-center gap-4">
                  <BatteryCompact 
                    progress={story.progress || 0} 
                    isBlocked={story.isBlocked} 
                  />
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleBlockToggle(story)}
                      title={story.isBlocked ? 'שחרר חסימה' : 'סמן כחסום'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        story.isBlocked
                          ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                          : 'text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(story)}
                      className="p-1.5 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(story.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    {/* Tasks expand button - always show */}
                    <button
                      onClick={() => toggleStoryExpansion(story.id)}
                      className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                        getStoryTasks(story.id).length > 0
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                          : 'text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                      }`}
                      title={getStoryTasks(story.id).length > 0 ? 'הצג/הסתר משימות' : 'הוסף משימות'}
                    >
                      <CheckSquare className="w-4 h-4" />
                      {getStoryTasks(story.id).length > 0 && (
                        <span className="text-xs">{getStoryTasks(story.id).length}</span>
                      )}
                      {expandedStories[story.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Tasks List - Expandable */}
              {expandedStories[story.id] && (
                <div className="border-t border-gray-100 dark:border-gray-700 mt-3 pt-3">
                  <div className="space-y-2">
                    {getStoryTasks(story.id).map(task => (
                      <div
                        key={task.id}
                        className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleTaskStatusToggle(task)}
                            className="hover:scale-110 transition-transform cursor-pointer"
                            title={`סטטוס: ${task.status === 'TODO' ? 'לעשות' : task.status === 'IN_PROGRESS' ? 'בתהליך' : 'הושלם'} - לחץ לשינוי`}
                          >
                            {getTaskStatusIcon(task.status)}
                          </button>
                          <div className="flex-1">
                            <span className={task.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}>
                              {task.code && <span className="text-emerald-600 dark:text-emerald-400 ml-1 font-mono text-xs">{task.code}</span>}
                              {task.title}
                            </span>
                            {task.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>
                            )}
                          </div>
                          {task.owner && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {task.owner.name}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Add new task button */}
                    <button
                      onClick={() => openTaskModal(story.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors border border-dashed border-emerald-300 dark:border-emerald-600"
                    >
                      <Plus className="w-4 h-4" />
                      <span>הוסף משימה</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingStory ? 'עריכת אבן דרך' : 'אבן דרך חדשה'}
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
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    placeholder="ed-01"
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    כותרת <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="שם אבן הדרך"
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תיאור
                </label>
                <ResizableTextarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="תיאור אבן הדרך..."
                  minRows={2}
                  maxRows={8}
                  className="focus:ring-orange-500"
                />
              </div>

              {/* Sprint - Required with Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ספרינט <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={sprints}
                  value={formData.sprintId}
                  onChange={(value) => setFormData({...formData, sprintId: value})}
                  placeholder="בחר ספרינט"
                  searchPlaceholder="חפש ספרינט..."
                  emptyMessage="לא נמצאו ספרינטים"
                  getLabel={(sprint) => sprint.name}
                  getValue={(sprint) => sprint.id}
                  getSearchText={(sprint) => sprint.name}
                  allowClear={false}
                />
              </div>

              {/* Owner - Optional with Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  אחראי
                </label>
                <SearchableSelect
                  options={teamMembers}
                  value={formData.ownerId}
                  onChange={(value) => setFormData({...formData, ownerId: value})}
                  placeholder="ללא אחראי"
                  searchPlaceholder="חפש איש צוות..."
                  emptyMessage="לא נמצאו אנשי צוות"
                  getLabel={(member) => member.name}
                  getValue={(member) => member.id}
                  getSearchText={(member) => `${member.name} ${member.role || ''}`}
                  allowClear={true}
                />
              </div>

              {/* Rock - Optional with Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  סלע (אופציונלי)
                </label>
                <SearchableSelect
                  options={rocks}
                  value={formData.rockId}
                  onChange={(value) => setFormData({...formData, rockId: value})}
                  placeholder="ללא שיוך לסלע"
                  searchPlaceholder="חפש סלע לפי קוד או שם..."
                  emptyMessage="לא נמצאו סלעים"
                  getLabel={(rock) => `${rock.code} - ${rock.name}`}
                  getValue={(rock) => rock.id}
                  getSearchText={(rock) => `${rock.code} ${rock.name} ${rock.objective?.code || ''} ${rock.objective?.name || ''}`}
                  allowClear={true}
                />
              </div>

              {/* Team (MANAGER+) */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    צוות
                  </label>
                  <SearchableSelect
                    options={teams}
                    value={formData.teamId}
                    onChange={(value) => setFormData({ ...formData, teamId: value })}
                    placeholder="ברירת מחדל"
                    searchPlaceholder="חפש צוות..."
                    emptyMessage="לא נמצאו צוותים"
                    getLabel={(team) => team.name}
                    getValue={(team) => team.id}
                    getSearchText={(team) => team.name}
                    allowClear={true}
                  />
                </div>
              )}

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

              {/* Progress */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  התקדמות
                </label>
                <ProgressInput
                  value={formData.progress}
                  onChange={progress => setFormData({...formData, progress})}
                  disabled={formData.isBlocked}
                  isBlocked={formData.isBlocked}
                />
              </div>

              {/* Blocked */}
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <input
                  type="checkbox"
                  id="isBlocked"
                  checked={formData.isBlocked}
                  onChange={e => setFormData({...formData, isBlocked: e.target.checked})}
                  className="w-5 h-5 rounded text-red-600 focus:ring-red-500"
                />
                <label htmlFor="isBlocked" className="flex-1 cursor-pointer">
                  <span className="font-medium text-red-800 dark:text-red-300">חסום</span>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    סמן אם אבן הדרך תקועה ולא ניתן להתקדם
                  </p>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'שומר...' : (editingStory ? 'עדכן' : 'צור')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                משימה חדשה
              </h2>
            </div>

            <form onSubmit={handleTaskSubmit} className="space-y-4">
              {/* Code and Title Row */}
              <div className="flex gap-3">
                <div className="w-20">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    קוד
                  </label>
                  <input
                    type="text"
                    value={taskFormData.code}
                    onChange={e => setTaskFormData({...taskFormData, code: e.target.value})}
                    placeholder="m-01"
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    שם המשימה <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taskFormData.title}
                    onChange={e => setTaskFormData({...taskFormData, title: e.target.value})}
                    placeholder="מה צריך לעשות?"
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תיאור
                </label>
                <ResizableTextarea
                  value={taskFormData.description}
                  onChange={e => setTaskFormData({...taskFormData, description: e.target.value})}
                  placeholder="פרטים נוספים על המשימה..."
                  minRows={2}
                  maxRows={8}
                  className="focus:ring-emerald-500"
                />
              </div>

              {/* Owner - Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  אחראי <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={teamMembers}
                  value={taskFormData.ownerId}
                  onChange={(value) => setTaskFormData({...taskFormData, ownerId: value})}
                  placeholder="בחר אחראי"
                  searchPlaceholder="חפש איש צוות..."
                  emptyMessage="לא נמצאו אנשי צוות"
                  getLabel={(member) => member.name}
                  getValue={(member) => member.id}
                  getSearchText={(member) => `${member.name} ${member.role || ''}`}
                  allowClear={false}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  סטטוס
                </label>
                <select
                  value={taskFormData.status}
                  onChange={e => setTaskFormData({...taskFormData, status: e.target.value})}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="TODO">לעשות</option>
                  <option value="IN_PROGRESS">בתהליך</option>
                  <option value="DONE">הושלם</option>
                  <option value="BLOCKED">חסום</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תאריך יעד
                </label>
                <input
                  type="date"
                  value={taskFormData.dueDate}
                  onChange={e => setTaskFormData({...taskFormData, dueDate: e.target.value})}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsTaskModalOpen(false); setTaskForStory(null); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'שומר...' : 'צור משימה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
