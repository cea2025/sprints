import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Plus, User, GripVertical, X } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { SkeletonKanban } from '../components/ui/Skeleton';

const columns = [
  { id: 'TODO', title: 'לביצוע', color: 'gray', gradient: 'from-gray-400 to-gray-500' },
  { id: 'IN_PROGRESS', title: 'בתהליך', color: 'blue', gradient: 'from-blue-400 to-blue-600' },
  { id: 'BLOCKED', title: 'חסום', color: 'red', gradient: 'from-red-400 to-red-600' },
  { id: 'DONE', title: 'הושלם', color: 'green', gradient: 'from-green-400 to-green-600' }
];

const priorityLabels = {
  LOW: 'נמוכה',
  MEDIUM: 'בינונית',
  HIGH: 'גבוהה'
};

const priorityColors = {
  LOW: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  MEDIUM: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  HIGH: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
};

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
    status: 'TODO',
    priority: 'MEDIUM',
    estimate: '',
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

  const handleStatusChange = async (storyId, newStatus) => {
    const res = await fetch(`/api/stories/${storyId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      const updatedStory = await res.json();
      setSprint({
        ...sprint,
        stories: sprint.stories.map(s => 
          s.id === storyId ? updatedStory : s
        )
      });
      toast.success(`המשימה הועברה ל${columns.find(c => c.id === newStatus)?.title}`);
    } else {
      toast.error('שגיאה בעדכון המשימה');
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e, story) => {
    setDraggedStory(story);
    e.dataTransfer.effectAllowed = 'move';
    // Add a slight delay to show the dragging state
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
    
    if (draggedStory && draggedStory.status !== columnId) {
      handleStatusChange(draggedStory.id, columnId);
    }
  };

  const handleAddStory = async (e) => {
    e.preventDefault();
    
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
        status: 'TODO',
        priority: 'MEDIUM',
        estimate: '',
        rockId: '',
        ownerId: ''
      });
      toast.success('המשימה נוצרה בהצלחה!');
    } else {
      toast.error('שגיאה ביצירת המשימה');
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

  const getStoriesByStatus = (status) => {
    return sprint.stories.filter(s => s.status === status);
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
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
        >
          <Plus size={20} />
          <span className="font-medium">משימה חדשה</span>
        </button>
      </div>

      {/* Add Story Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in">
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white">משימה חדשה</h2>
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
                  כותרת
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
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
                  rows={3}
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    עדיפות
                  </label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                  >
                    <option value="LOW">נמוכה</option>
                    <option value="MEDIUM">בינונית</option>
                    <option value="HIGH">גבוהה</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    הערכה (נקודות)
                  </label>
                  <input
                    type="number"
                    value={formData.estimate}
                    onChange={e => setFormData({...formData, estimate: e.target.value})}
                    className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    אבן דרך
                  </label>
                  <select
                    value={formData.rockId}
                    onChange={e => setFormData({...formData, rockId: e.target.value})}
                    className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                  >
                    <option value="">ללא</option>
                    {rocks.map(rock => (
                      <option key={rock.id} value={rock.id}>
                        {rock.code} - {rock.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    אחראי
                  </label>
                  <select
                    value={formData.ownerId}
                    onChange={e => setFormData({...formData, ownerId: e.target.value})}
                    className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
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
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  צור משימה
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
              ${dragOverColumn === column.id ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900' : ''}
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
                {getStoriesByStatus(column.id).length}
              </span>
            </div>
            
            <div className="space-y-3 min-h-[200px]">
              {getStoriesByStatus(column.id).map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoryCard({ story, onDragStart, onDragEnd }) {
  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, story)}
      onDragEnd={onDragEnd}
      className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 dark:text-white text-sm flex-1">{story.title}</h4>
        <GripVertical size={16} className="text-gray-300 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
      
      {story.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{story.description}</p>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-lg ${priorityColors[story.priority]}`}>
            {priorityLabels[story.priority]}
          </span>
          {story.estimate && (
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 rounded">
              {story.estimate} נק׳
            </span>
          )}
        </div>
        {story.owner && (
          <div className="flex items-center gap-1">
            {story.owner.picture ? (
              <img src={story.owner.picture} alt={story.owner.name} className="w-5 h-5 rounded-full" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <span className="text-[10px] text-white font-bold">{story.owner.name?.charAt(0)}</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {story.rock && (
        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-lg inline-block">
          {story.rock.code}
        </div>
      )}
    </div>
  );
}

export default SprintBoard;
