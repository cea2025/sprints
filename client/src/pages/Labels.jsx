import { useEffect, useMemo, useState } from 'react';
import { Tag, Plus, Edit2, Trash2, X } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { usePermissions } from '../hooks/usePermissions';
import { useOrganization } from '../context/OrganizationContext';

function normalizeColor(color) {
  if (!color) return '';
  return color.startsWith('#') ? color : `#${color}`;
}

export default function Labels() {
  const { request, loading } = useApi();
  const { isAdmin } = usePermissions();
  const { currentOrganization } = useOrganization();

  const [labels, setLabels] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', color: '#7C3AED', isActive: true });

  const fetchLabels = async () => {
    const qs = includeInactive ? '?includeInactive=true' : '';
    const data = await request(`/api/labels${qs}`, { showToast: false });
    if (Array.isArray(data)) setLabels(data);
  };

  useEffect(() => {
    if (!isAdmin || !currentOrganization?.id) return;
    fetchLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, currentOrganization?.id, includeInactive]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return labels;
    return labels.filter((l) => (l.name || '').toLowerCase().includes(q));
  }, [labels, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', color: '#7C3AED', isActive: true });
    setIsModalOpen(true);
  };

  const openEdit = (label) => {
    setEditing(label);
    setForm({
      name: label.name || '',
      color: normalizeColor(label.color) || '#7C3AED',
      isActive: label.isActive !== false
    });
    setIsModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const body = {
      name: form.name.trim(),
      color: form.color || null,
      isActive: !!form.isActive
    };

    const result = editing
      ? await request(`/api/labels/${editing.id}`, { method: 'PUT', body })
      : await request('/api/labels', { method: 'POST', body });

    if (result) {
      setIsModalOpen(false);
      await fetchLabels();
    }
  };

  const softDelete = async (label) => {
    if (!confirm('לכבות את התווית? (ניתן להחזיר אח\"כ)')) return;
    const res = await request(`/api/labels/${label.id}`, { method: 'DELETE' });
    if (res) await fetchLabels();
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          אין לך הרשאה לנהל תוויות.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="text-purple-600" />
            תוויות
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            תוויות מוגדרות מראש לסינון ומיון
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
        >
          <Plus size={18} />
          תווית חדשה
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש תווית..."
          className="w-full sm:w-72 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          הצג גם כבויות
        </label>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filtered.map((l) => (
            <div key={l.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-gray-200 dark:border-gray-700"
                  style={{ backgroundColor: normalizeColor(l.color) || '#CBD5E1' }}
                />
                <div className="min-w-0">
                  <div className={`font-semibold truncate ${l.isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 line-through'}`}>
                    {l.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{l.color || '—'}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(l)}
                  className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="עריכה"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => softDelete(l)}
                  className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="כיבוי"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              אין תוויות להצגה
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="font-bold text-gray-900 dark:text-white">
                {editing ? 'עריכת תווית' : 'תווית חדשה'}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={save} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">שם</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                  required
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">צבע</label>
                  <input
                    type="color"
                    value={form.color || '#7C3AED'}
                    onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                    className="h-10 w-16 p-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mt-6">
                  <input
                    type="checkbox"
                    checked={!!form.isActive}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  />
                  פעילה
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-50"
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


