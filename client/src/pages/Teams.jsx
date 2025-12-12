import { useEffect, useMemo, useState } from 'react';
import { Users, Plus, Trash2, Edit2, UserPlus, X } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { usePermissions } from '../hooks/usePermissions';
import SearchableSelect from '../components/ui/SearchableSelect';
import ResizableTextarea from '../components/ui/ResizableTextarea';

export default function Teams() {
  const { request } = useApi();
  const { isAdmin } = usePermissions(); // Admin OR Manager in current app semantics

  const [teams, setTeams] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamForm, setTeamForm] = useState({ name: '', description: '' });

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [membershipToAdd, setMembershipToAdd] = useState('');

  const canManage = isAdmin;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [teamsRes, membersRes] = await Promise.all([
        request('/api/teams', { showToast: false }),
        request('/api/teams/memberships', { showToast: false })
      ]);

      setTeams(Array.isArray(teamsRes) ? teamsRes : []);
      setMemberships(Array.isArray(membersRes) ? membersRes : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canManage) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  const selectedTeamId = selectedTeam?.id;

  const fetchTeamDetails = async (teamId) => {
    const team = await request(`/api/teams/${teamId}`, { showToast: false });
    if (team) setSelectedTeam(team);
  };

  const openCreate = () => {
    setEditingTeam(null);
    setTeamForm({ name: '', description: '' });
    setIsTeamModalOpen(true);
  };

  const openEdit = (team) => {
    setEditingTeam(team);
    setTeamForm({ name: team.name || '', description: team.description || '' });
    setIsTeamModalOpen(true);
  };

  const submitTeam = async (e) => {
    e.preventDefault();
    if (!teamForm.name.trim()) return;

    if (editingTeam) {
      const updated = await request(`/api/teams/${editingTeam.id}`, {
        method: 'PUT',
        body: { name: teamForm.name, description: teamForm.description }
      });
      if (updated) {
        await fetchAll();
        if (selectedTeamId === editingTeam.id) await fetchTeamDetails(editingTeam.id);
        setIsTeamModalOpen(false);
      }
    } else {
      const created = await request('/api/teams', {
        method: 'POST',
        body: { name: teamForm.name, description: teamForm.description }
      });
      if (created) {
        await fetchAll();
        setIsTeamModalOpen(false);
      }
    }
  };

  const removeMember = async (teamId, membershipId) => {
    if (!confirm('להסיר את המשתמש מהצוות?')) return;
    const res = await request(`/api/teams/${teamId}/members/${membershipId}`, {
      method: 'DELETE',
      showToast: false
    });
    if (res?.ok || res?.ok === undefined) {
      await fetchTeamDetails(teamId);
    }
  };

  const addMember = async () => {
    if (!selectedTeamId || !membershipToAdd) return;
    const res = await request(`/api/teams/${selectedTeamId}/members`, {
      method: 'POST',
      body: { membershipId: membershipToAdd }
    });
    if (res) {
      setMembershipToAdd('');
      await fetchTeamDetails(selectedTeamId);
    }
  };

  const membershipOptions = useMemo(() => {
    return memberships.map((m) => ({
      value: m.id,
      label: `${m.name} (${m.email})`,
      description: m.role
    }));
  }, [memberships]);

  if (!canManage) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">צוותים</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400">אין לך הרשאה לנהל צוותים.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="text-purple-600" />
            צוותים
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ניהול צוותים ושיוך משתמשים לצוותים
          </p>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
        >
          <Plus size={18} />
          צוות חדש
        </button>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          טוען...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teams list */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">
              צוותים ({teams.length})
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => fetchTeamDetails(t.id)}
                  className={`w-full text-right p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedTeamId === t.id ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white truncate">{t.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {t.description || '—'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t._count?.members ?? 0}
                    </div>
                  </div>
                </button>
              ))}
              {teams.length === 0 && (
                <div className="p-4 text-sm text-gray-500 dark:text-gray-400">אין צוותים.</div>
              )}
            </div>
          </div>

          {/* Team details */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            {!selectedTeam ? (
              <div className="p-6 text-gray-600 dark:text-gray-400">בחר צוות כדי לראות פרטים.</div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTeam.name}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTeam.description || '—'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(selectedTeam)}
                      className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title="עריכה"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Add member */}
                <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3 font-semibold text-gray-900 dark:text-white">
                    <UserPlus size={18} />
                    הוסף משתמש לצוות
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <SearchableSelect
                        value={membershipToAdd}
                        onChange={setMembershipToAdd}
                        options={membershipOptions}
                        placeholder="בחר משתמש..."
                      />
                    </div>
                    <button
                      onClick={addMember}
                      disabled={!membershipToAdd}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white disabled:opacity-50"
                    >
                      הוסף
                    </button>
                  </div>
                </div>

                {/* Members list */}
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white mb-3">חברי צוות</div>
                  <div className="space-y-2">
                    {(selectedTeam.members || []).map((m) => (
                      <div
                        key={m.membershipId}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {m.membership?.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {m.membership?.email} • {m.membership?.role}
                          </div>
                        </div>
                        <button
                          onClick={() => removeMember(selectedTeam.id, m.membershipId)}
                          className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                          title="הסר"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {(selectedTeam.members || []).length === 0 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">אין חברים בצוות.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team modal */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="font-bold text-gray-900 dark:text-white">
                {editingTeam ? 'עריכת צוות' : 'צוות חדש'}
              </div>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitTeam} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">שם צוות</label>
                <input
                  value={teamForm.name}
                  onChange={(e) => setTeamForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">תיאור</label>
                <ResizableTextarea
                  value={teamForm.description}
                  onChange={(e) => setTeamForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="תיאור הצוות..."
                  minRows={3}
                  maxRows={6}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                >
                  שמור
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


