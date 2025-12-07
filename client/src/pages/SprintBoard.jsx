import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Plus, GripVertical, X } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { SkeletonKanban } from '../components/ui/Skeleton';
import { BatteryCompact, ProgressInput } from '../components/ui/Battery';

// Columns based on progress ranges
const columns = [
  { id: 'todo', title: 'לביצוע', color: 'gray', gradient: 'from-gray-400 to-gray-500', filter: s => s.progress === 0 && !s.isBlocked },
  { id: 'inProgress', title: 'בתהליך', color: 'blue', gradient: 'from-blue-400 to-blue-600', filter: s => s.progress > 0 && s.progress < 100 && !s.isBlocked },
  { id: 'blocked', title: 'חסום', color: 'red', gradient: 'from-red-400 to-red-600', filter: s => s.isBlocked },
  { id: 'done', title: 'הושלם', color: 'green', gradient: 'from-green-400 to-green-600', filter: s => s.progress === 100 }
];

function SprintBoard() {
  const { id } = useParams();
  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rocks, setRocks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [draggedStory, setDraggedStory] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    progress: 0,
    isBlocked: false,
    rockId: '',
    ownerId: ''
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/sprints/${id}`, { credentials: 'include' }).then(r => r.json()),
      fetch('/api/rocks', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/team', { credentials: 'include' }).then(r => r.json())
    ])
      .then(([sprintData, rocksData, teamData]) => {
        setSprint(sprintData);
        setRocks(rocksData);
        setTeamMembers(teamData);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleProgressChange = async (storyId, progress, isBlocked = false) => {
    const res = await fetch(`/api/stories/${storyId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ progress, isBlocked })
    });

    if (res.ok) {
      const updatedStory = await res.json();
      const stories = Array.isArray(sprint?.stories) ? sprint.stories : [];
      setSprint({
        ...sprint,
        stories: stories.map(s => 
          s.id === storyId ? updatedStory : s
        )
      });
      toast.success('התקדמות עודכנה');
    } else {
      toast.error('שגיאה בעדכון');
    }
  };

  // Map column drops to progress changes
  const handleColumnDrop = async (storyId, columnId) => {
    let progress = 0;
    let isBlocked = false;

    switch (columnId) {
      case 'todo':
        progress = 0;
        isBlocked = false;
        break;
      case 'inProgress':
        progress = 50;
        isBlocked = false;
        break;
      case 'blocked':
        isBlocked = true;
        break;
      case 'done':
        progress = 100;
        isBlocked = false;
        break;
    }

    await handleProgressChange(storyId, progress, isBlocked);
  };

  // Drag & Drop handlers
  const handleDragStart = (e, story) => {
    setDraggedStory(story);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      e.target.classList.add('opacity-50');
    }, 0);
  };

  const handleDragEnd = (e) => {
    setDraggedStory(null);
    setDragOverColumn(null);
    e.target.classList.remove('opacity-50');
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (draggedStory) {
      handleColumnDrop(draggedStory.id, columnId);
    }
  };

  const handleAddStory = async (e) => {
    e.preventDefault();

    if (!formData.ownerId) {
      toast.error('אחראי הוא שדה חובה');
      return;
    }
    
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ...formData,
        sprintId: id
      })
    });

    if (res.ok) {
      const story = await res.json();
      setSprint({
        ...sprint,
        stories: [...sprint.stories, story]
      });
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        progress: 0,
        isBlocked: false,
        rockId: '',
        ownerId: ''
      });
      toast.success('אבן הדרך נוצרה בהצלחה!');
    } else {
      const error = await res.json();
      toast.error(error.error || 'שגיאה ביצירת אבן הדרך');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <SkeletonKanban />
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">ספרינט לא נמצא</p>
        <Link to="/sprints" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
          חזרה לרשימת ספרינטים
        </Link>
      </div>
    );
  }

  const getStoriesByColumn = (column) => {
    const stories = sprint?.stories || [];
    return Array.isArray(stories) ? stories.filter(column.filter) : [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/sprints"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
          >
            <ArrowRight size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{sprint.name}</h1>
            {sprint.goal && (
              <p className="text-gray-500 dark:text-gray-400 mt-1">{sprint.goal}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all transform hover:-translate-y-0.5"
        >
          <Plus size={20} />
          <span className="font-medium">אבן דרך חדשה</span>
        </button>
      </div>

      {/* Add Story Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in">
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white">אבן דרך חדשה</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddStory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  כותרת <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תיאור
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  אחראי <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.ownerId}
                  onChange={e => setFormData({...formData, ownerId: e.target.value})}
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white transition-all"
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
                  סלע (אופציונלי)
                </label>
                <select
                  value={formData.rockId}
                  onChange={e => setFormData({...formData, rockId: e.target.value})}
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white transition-all"
                >
                  <option value="">ללא שיוך לסלע</option>
                  {rocks.map(rock => (
                    <option key={rock.id} value={rock.id}>
                      {rock.code} - {rock.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  התקדמות התחלתית
                </label>
                <ProgressInput
                  value={formData.progress}
                  onChange={progress => setFormData({...formData, progress})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  צור אבן דרך
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all dark:text-white"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => (
          <div 
            key={column.id} 
            className={`
              bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-4 transition-all duration-200
              ${dragOverColumn === column.id ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-gray-900' : ''}
            `}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${column.gradient}`} />
                <h3 className="font-bold text-gray-700 dark:text-gray-200">{column.title}</h3>
              </div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-0.5 rounded-lg">
                {getStoriesByColumn(column).length}
              </span>
            </div>
            
            <div className="space-y-3 min-h-[200px]">
              {getStoriesByColumn(column).map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onProgressChange={handleProgressChange}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoryCard({ story, onDragStart, onDragEnd, onProgressChange }) {
  const [editingProgress, setEditingProgress] = useState(false);
  const [tempProgress, setTempProgress] = useState(story.progress);

  const handleProgressSubmit = () => {
    if (tempProgress !== story.progress) {
      onProgressChange(story.id, tempProgress);
    }
    setEditingProgress(false);
  };

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, story)}
      onDragEnd={onDragEnd}
      className={`bg-white dark:bg-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${
        story.isBlocked ? 'border-2 border-red-400 dark:border-red-500' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className={`font-medium text-sm flex-1 ${
          story.isBlocked ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'
        }`}>
          {story.title}
        </h4>
        <GripVertical size={16} className="text-gray-300 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
      
      {story.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{story.description}</p>
      )}

      {/* Progress */}
      <div className="mb-3">
        {editingProgress ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              value={tempProgress}
              onChange={e => setTempProgress(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              onBlur={handleProgressSubmit}
              onKeyDown={e => e.key === 'Enter' && handleProgressSubmit()}
              className="w-16 px-2 py-1 text-sm border dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white text-center"
              autoFocus
            />
            <span className="text-xs text-gray-400">%</span>
          </div>
        ) : (
          <div 
            onClick={() => setEditingProgress(true)}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <BatteryCompact progress={story.progress || 0} isBlocked={story.isBlocked} />
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {story.isBlocked && (
            <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
              🚫 חסום
            </span>
          )}
          {story.rock && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              {story.rock.code}
            </span>
          )}
        </div>
        {story.owner && (
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <span className="text-[10px] text-white font-bold">{story.owner.name?.charAt(0)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SprintBoard;
