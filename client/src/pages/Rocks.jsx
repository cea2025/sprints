import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useOrganization } from '../context/OrganizationContext';
import { Battery, ProgressInput } from '../components/ui/Battery';
import { Skeleton } from '../components/ui/Skeleton';
import { SearchFilter, useSearch } from '../components/ui/SearchFilter';
import LinkedItemsSection from '../components/ui/LinkedItemsSection';
import DateTooltip from '../components/ui/DateTooltip';
import { Mountain, Plus, Edit2, Trash2, User, Target, ChevronLeft } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';

const QUARTERS = [
  { value: 1, label: 'Q1' },
  { value: 2, label: 'Q2' },
  { value: 3, label: 'Q3' },
  { value: 4, label: 'Q4' }
];

const YEARS = [2024, 2025, 2026, 2027];

export default function Rocks() {
  const [rocks, setRocks] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [stories, setStories] = useState([]); // כל אבני הדרך לצורך קישור
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    objectiveId: '',
    orphanFilter: '' // 'no-objective', 'no-stories'
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRock, setEditingRock] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    progress: 0,
    ownerId: '',
    objectiveId: '',
    teamId: ''
  });

  const { loading, request } = useApi();
  const { currentOrganization, basePath } = useOrganization();
  const { isAdmin } = usePermissions();

  // חיפוש בשדות
  const filteredRocks = useSearch(rocks, ['code', 'name', 'description', 'owner.name', 'objective.name'], searchTerm);

  useEffect(() => {
    if (!currentOrganization) return;
    fetchRocks();
    fetchObjectives();
    fetchTeamMembers();
    fetchStories();
    if (isAdmin) fetchTeams();
  }, [filters.year, filters.quarter, filters.objectiveId, currentOrganization?.id]);
  const fetchTeams = async () => {
    const data = await request('/api/teams', { showToast: false });
    if (data && Array.isArray(data)) setTeams(data);
  };

  const fetchRocks = async () => {
    let url = '/api/rocks';
    const params = new URLSearchParams();
    if (filters.year) params.append('year', filters.year);
    if (filters.quarter) params.append('quarter', filters.quarter);
    if (filters.objectiveId) params.append('objectiveId', filters.objectiveId);
    if (filters.orphanFilter) params.append('orphanFilter', filters.orphanFilter);
    if (params.toString()) url += `?${params.toString()}`;

    const data = await request(url, { showToast: false });
    if (data && Array.isArray(data)) setRocks(data);
  };

  const fetchObjectives = async () => {
    const data = await request('/api/objectives', { showToast: false });
    if (data && Array.isArray(data)) setObjectives(data);
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

  // קישור אבן דרך לסלע
  const handleLinkStory = async (storyId, rockId) => {
    const result = await request(`/api/stories/${storyId}`, {
      method: 'PUT',
      body: { rockId },
      successMessage: 'אבן דרך קושרה בהצלחה'
    });
    if (result) {
      fetchRocks();
      fetchStories();
    }
  };

  // ניתוק אבן דרך מסלע
  const handleUnlinkStory = async (storyId) => {
    const result = await request(`/api/stories/${storyId}`, {
      method: 'PUT',
      body: { rockId: null },
      successMessage: 'אבן דרך נותקה בהצלחה'
    });
    if (result) {
      fetchRocks();
      fetchStories();
    }
  };

  // קבלת אבני דרך המקושרות לסלע מסוים
  const getStoriesForRock = (rockId) => {
    // Use rock.id since the API returns rock object, not rockId
    return stories.filter(story => story.rock?.id === rockId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const url = editingRock ? `/api/rocks/${editingRock.id}` : '/api/rocks';
    const method = editingRock ? 'PUT' : 'POST';

    const result = await request(url, {
      method,
      body: formData,
      successMessage: editingRock ? 'סלע עודכן בהצלחה' : 'סלע נוצר בהצלחה'
    });

    if (result) {
      setIsModalOpen(false);
      resetForm();
      fetchRocks();
    }
  };

  const handleEdit = (rock) => {
    setEditingRock(rock);
    setFormData({
      code: rock.code,
      name: rock.name,
      description: rock.description || '',
      year: rock.year,
      quarter: rock.quarter,
      progress: rock.progress || 0,
      // Handle both flat IDs and nested objects from API
      ownerId: rock.ownerId || rock.owner?.id || '',
      objectiveId: rock.objectiveId || rock.objective?.id || '',
      teamId: rock.teamId || rock.team?.id || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את הסלע?')) return;

    const result = await request(`/api/rocks/${id}`, {
      method: 'DELETE',
      successMessage: 'סלע נמחק בהצלחה'
    });

    if (result) fetchRocks();
  };

  const handleCarryOver = async (rock) => {
    if (!confirm(`האם להעביר את "${rock.name}" לרבעון הבא?`)) return;

    const result = await request(`/api/rocks/${rock.id}/carry-over`, {
      method: 'POST',
      successMessage: 'סלע הועבר לרבעון הבא'
    });

    if (result) fetchRocks();
  };

  const resetForm = () => {
    setEditingRock(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      year: filters.year,
      quarter: filters.quarter,
      progress: 0,
      ownerId: '',
      objectiveId: ''
    });
  };

  // Generate next available code (s-01, s-02, s-03...)
  const generateNextCode = () => {
    if (rocks.length === 0) return 's-01';
    
    // Extract numeric codes from s-XX format and find the max
    const numericCodes = rocks
      .map(rock => {
        const match = rock.code?.match(/^s-(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(num => num !== null);
    
    if (numericCodes.length === 0) return 's-01';
    
    const maxCode = Math.max(...numericCodes);
    const nextCode = maxCode + 1;
    return `s-${nextCode.toString().padStart(2, '0')}`;
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

  if (loading && rocks.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
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
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
            <Mountain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">סלעים</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              יעדים רבעוניים אסטרטגיים
            </p>
          </div>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/25"
        >
          <Plus className="w-5 h-5" />
          <span>סלע חדש</span>
        </button>
      </div>

      {/* Search */}
      <SearchFilter
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="חיפוש לפי קוד, שם, תיאור, אחראי או פרויקט..."
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <select
          value={filters.year}
          onChange={e => setFilters({...filters, year: parseInt(e.target.value)})}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          {YEARS.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <select
          value={filters.quarter}
          onChange={e => setFilters({...filters, quarter: parseInt(e.target.value)})}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          {QUARTERS.map(q => (
            <option key={q.value} value={q.value}>{q.label}</option>
          ))}
        </select>

        <select
          value={filters.objectiveId}
          onChange={e => setFilters({...filters, objectiveId: e.target.value})}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">כל הפרויקטים</option>
          {objectives.map(obj => (
            <option key={obj.id} value={obj.id}>{obj.code} - {obj.name}</option>
          ))}
        </select>

        <select
          value={filters.orphanFilter}
          onChange={e => setFilters({...filters, orphanFilter: e.target.value})}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">כל הקישורים</option>
          <option value="no-objective">🪨 ללא פרויקט</option>
          <option value="no-stories">🪨 ללא אבני דרך</option>
        </select>

        <span className="flex items-center text-sm text-gray-500 dark:text-gray-400 mr-auto">
          {filteredRocks.length} סלעים
        </span>
      </div>

      {/* Rocks List */}
      {rocks.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-4">🪨</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            אין סלעים ב-{filters.year} Q{filters.quarter}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            צור את הסלע הראשון לרבעון זה
          </p>
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            צור סלע
          </button>
        </div>
      ) : filteredRocks.length === 0 ? (
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
          {filteredRocks.map((rock) => (
            <div
              key={rock.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="hidden sm:flex p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Mountain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-lg">
                          {rock.code}
                        </span>
                        {rock.isCarriedOver && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-lg flex items-center gap-1">
                            <span>↪</span> גלש מ-Q{rock.carriedFromQuarter}
                          </span>
                        )}
                        <DateTooltip createdAt={rock.createdAt} updatedAt={rock.updatedAt}>
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {rock.name}
                          </h3>
                        </DateTooltip>
                      </div>
                      {rock.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                          {rock.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCarryOver(rock)}
                        title="העבר לרבעון הבא"
                        className="p-2 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(rock)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rock.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    {/* Progress */}
                    <div className="flex items-center gap-2">
                      <Battery progress={rock.effectiveProgress || 0} size="sm" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {rock.totalStories || 0} אבני דרך
                      </span>
                    </div>

                    {/* Objective */}
                    {rock.objective && (
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-xs text-purple-600 dark:text-purple-400">
                          {rock.objective.code}
                        </span>
                      </div>
                    )}

                    {/* Owner */}
                    {rock.owner && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {rock.owner.name}
                        </span>
                      </div>
                    )}

                    {/* Stats */}
                    {rock.completedStories > 0 && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        ✓ {rock.completedStories} הושלמו
                      </span>
                    )}
                    {rock.blockedStories > 0 && (
                      <span className="text-xs text-red-600 dark:text-red-400">
                        ⚠ {rock.blockedStories} חסומות
                      </span>
                    )}
                  </div>

                  {/* Linked Stories Section */}
                  <LinkedItemsSection
                    title="אבני דרך מקושרות"
                    items={getStoriesForRock(rock.id)}
                    availableItems={stories}
                    parentId={rock.id}
                    linkField="rockId"
                    onLink={handleLinkStory}
                    onUnlink={handleUnlinkStory}
                    basePath={basePath}
                    itemPath="stories"
                    emptyMessage="אין אבני דרך מקושרות לסלע זה"
                    showCode={true}
                    showProgress={true}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingRock ? 'עריכת סלע' : 'סלע חדש'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Code with auto-generate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  קוד <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    placeholder="s-01"
                    className="flex-1 px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, code: generateNextCode() }))}
                    className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                  >
                    צור אוטומטית
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  פורמט: שנה-רבעון-מספר (מזהה ייחודי קבוע)
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שם <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="שם הסלע"
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תיאור
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="תיאור הסלע..."
                  rows={2}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

              {/* Year & Quarter */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    שנה <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.year}
                    onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {YEARS.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    רבעון <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.quarter}
                    onChange={e => setFormData({...formData, quarter: parseInt(e.target.value)})}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {QUARTERS.map(q => (
                      <option key={q.value} value={q.value}>{q.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Progress */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  התקדמות
                </label>
                <ProgressInput
                  value={formData.progress}
                  onChange={progress => setFormData({...formData, progress})}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  מחושב אוטומטית מאבני הדרך, ניתן לשינוי ידני
                </p>
              </div>

              {/* Owner */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  אחראי
                </label>
                <select
                  value={formData.ownerId}
                  onChange={e => setFormData({...formData, ownerId: e.target.value})}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">ללא</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              {/* Objective */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  פרויקט
                </label>
                <select
                  value={formData.objectiveId}
                  onChange={e => setFormData({...formData, objectiveId: e.target.value})}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">ללא</option>
                  {objectives.map(obj => (
                    <option key={obj.id} value={obj.id}>{obj.code} - {obj.name}</option>
                  ))}
                </select>
              </div>

              {/* Team (MANAGER+) */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    צוות
                  </label>
                  <select
                    value={formData.teamId}
                    onChange={e => setFormData({ ...formData, teamId: e.target.value })}
                    className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">ברירת מחדל</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

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
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'שומר...' : (editingRock ? 'עדכן' : 'צור')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
