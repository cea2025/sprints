import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Plus, User } from 'lucide-react';

const columns = [
  { id: 'TODO', title: 'לביצוע', color: 'gray' },
  { id: 'IN_PROGRESS', title: 'בתהליך', color: 'blue' },
  { id: 'BLOCKED', title: 'חסום', color: 'red' },
  { id: 'DONE', title: 'הושלם', color: 'green' }
];

const priorityLabels = {
  LOW: 'נמוכה',
  MEDIUM: 'בינונית',
  HIGH: 'גבוהה'
};

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700'
};

function SprintBoard() {
  const { id } = useParams();
  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rocks, setRocks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
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
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">ספרינט לא נמצא</p>
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
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowRight size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{sprint.name}</h1>
            {sprint.goal && (
              <p className="text-gray-500 mt-1">{sprint.goal}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>משימה חדשה</span>
        </button>
      </div>

      {/* Add Story Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">משימה חדשה</h2>
            </div>
            <form onSubmit={handleAddStory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  כותרת
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    עדיפות
                  </label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="LOW">נמוכה</option>
                    <option value="MEDIUM">בינונית</option>
                    <option value="HIGH">גבוהה</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    הערכה (נקודות)
                  </label>
                  <input
                    type="number"
                    value={formData.estimate}
                    onChange={e => setFormData({...formData, estimate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    אבן דרך
                  </label>
                  <select
                    value={formData.rockId}
                    onChange={e => setFormData({...formData, rockId: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  צור משימה
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
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
          <div key={column.id} className="bg-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-700">{column.title}</h3>
              <span className="text-sm text-gray-500">
                {getStoriesByStatus(column.id).length}
              </span>
            </div>
            
            <div className="space-y-3">
              {getStoriesByStatus(column.id).map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onStatusChange={handleStatusChange}
                  columns={columns}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoryCard({ story, onStatusChange, columns }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 text-sm">{story.title}</h4>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-400 hover:text-gray-600 text-xs"
          >
            ⋮
          </button>
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute left-0 top-6 bg-white border rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
                {columns.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => {
                      onStatusChange(story.id, col.id);
                      setShowMenu(false);
                    }}
                    className={`w-full text-right px-3 py-1 text-sm hover:bg-gray-50 ${
                      story.status === col.id ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    {col.title}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      
      {story.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{story.description}</p>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[story.priority]}`}>
            {priorityLabels[story.priority]}
          </span>
          {story.estimate && (
            <span className="text-xs text-gray-400">{story.estimate} נק׳</span>
          )}
        </div>
        {story.owner && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <User size={12} />
            <span>{story.owner.name}</span>
          </div>
        )}
      </div>
      
      {story.rock && (
        <div className="mt-2 text-xs text-blue-600">
          {story.rock.code}
        </div>
      )}
    </div>
  );
}

export default SprintBoard;
