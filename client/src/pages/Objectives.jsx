import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useOrganization } from '../context/OrganizationContext';
import { Battery } from '../components/ui/Battery';
import { Skeleton } from '../components/ui/Skeleton';
import { SearchFilter, useSearch } from '../components/ui/SearchFilter';
import { Target, Plus, Edit2, Trash2, User } from 'lucide-react';

export default function Objectives() {
  const [objectives, setObjectives] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [orphanFilter, setOrphanFilter] = useState(''); // 'no-rocks'
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    ownerId: ''
  });
  
  const { loading, request } = useApi();
  const { currentOrganization } = useOrganization();

  // חיפוש בשדות
  const filteredObjectives = useSearch(objectives, ['code', 'name', 'description', 'owner.name'], searchTerm);

  useEffect(() => {
    if (!currentOrganization) return;
    fetchObjectives();
    fetchTeamMembers();
  }, [currentOrganization?.id, orphanFilter]);

  const fetchObjectives = async () => {
    let url = '/api/objectives';
    if (orphanFilter) url += `?orphanFilter=${orphanFilter}`;
    const data = await request(url);
    if (data && Array.isArray(data)) setObjectives(data);
  };

  const fetchTeamMembers = async () => {
    const data = await request('/api/team', { showToast: false });
    if (data && Array.isArray(data)) setTeamMembers(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const url = editingObjective 
      ? `/api/objectives/${editingObjective.id}`
      : '/api/objectives';
    const method = editingObjective ? 'PUT' : 'POST';

    const result = await request(url, {
      method,
      body: formData,
      successMessage: editingObjective ? 'פרויקט עודכן בהצלחה' : 'פרויקט נוצר בהצלחה'
    });

    if (result) {
      setIsModalOpen(false);
      resetForm();
      fetchObjectives();
    }
  };

  const handleEdit = (objective) => {
    setEditingObjective(objective);
    setFormData({
      code: objective.code,
      name: objective.name,
      description: objective.description || '',
      ownerId: objective.ownerId || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את הפרויקט?')) return;

    const result = await request(`/api/objectives/${id}`, {
      method: 'DELETE',
      successMessage: 'פרויקט נמחקה בהצלחה'
    });

    if (result) {
      fetchObjectives();
    }
  };

  const resetForm = () => {
    setEditingObjective(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      ownerId: ''
    });
  };

  // Generate next available code (p-01, p-02, p-03...)
  const generateNextCode = () => {
    if (objectives.length === 0) return 'p-01';
    
    // Extract numeric codes from p-XX format and find the max
    const numericCodes = objectives
      .map(obj => {
        const match = obj.code?.match(/^p-(\d+)$/);
        return match ? parseInt(match[1], 10) : parseInt(obj.code, 10);
      })
      .filter(num => !isNaN(num));
    
    if (numericCodes.length === 0) return 'p-01';
    
    const maxCode = Math.max(...numericCodes);
    const nextCode = maxCode + 1;
    return `p-${nextCode.toString().padStart(2, '0')}`;
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

  if (loading && objectives.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
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
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">פרויקטים</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              פרויקטים שמאגדים סלעים
            </p>
          </div>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/25"
        >
          <Plus className="w-5 h-5" />
          <span>פרויקט חדש</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <SearchFilter
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="חיפוש לפי קוד, שם, תיאור או אחראי..."
          />
        </div>
        
        <select
          value={orphanFilter}
          onChange={e => setOrphanFilter(e.target.value)}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">כל הפרויקטים</option>
          <option value="no-rocks">🎯 ללא סלעים</option>
        </select>
        
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {filteredObjectives.length} פרויקטים
        </span>
      </div>

      {/* Results count */}
      {searchTerm && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          נמצאו {filteredObjectives.length} תוצאות
        </p>
      )}

      {/* Objectives List */}
      {objectives.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            אין עדיין פרויקטים
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            צור את הפרויקט הראשונה שלך
          </p>
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            צור פרויקט
          </button>
        </div>
      ) : filteredObjectives.length === 0 ? (
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
          {filteredObjectives.map((objective) => (
            <div
              key={objective.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="hidden sm:flex p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-block px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-lg">
                          {objective.code}
                        </span>
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {objective.name}
                        </h3>
                      </div>
                      {objective.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                          {objective.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEdit(objective)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(objective.id)}
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
                      <Battery progress={objective.progress || 0} size="sm" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {objective.rocksCount || 0} סלעים
                      </span>
                    </div>

                    {/* Owner */}
                    {objective.owner && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {objective.owner.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingObjective ? 'עריכת פרויקט' : 'פרויקט חדש'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  קוד <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  placeholder="p-01"
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">מספר רץ (01, 02, 03...)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שם <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="שם הפרויקט"
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
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
                  placeholder="תיאור הפרויקט..."
                  rows={3}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  אחראי
                </label>
                <select
                  value={formData.ownerId}
                  onChange={e => setFormData({...formData, ownerId: e.target.value})}
                  className="w-full px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">ללא</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

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
                  className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'שומר...' : (editingObjective ? 'עדכן' : 'צור')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
