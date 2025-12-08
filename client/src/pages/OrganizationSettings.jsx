/**
 * Organization Settings Page
 * מסך הגדרות ארגון - ניהול לוגו, שם, favicon ועוד
 */

import { useState, useEffect } from 'react';
import { useOrganization } from '../context/OrganizationContext';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/ui/Toast';
import { usePermissions } from '../hooks/usePermissions';
import { 
  Building2, 
  Image, 
  Globe, 
  Save, 
  Link2, 
  Users, 
  Palette,
  Upload,
  Trash2,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

export default function OrganizationSettings() {
  const { currentOrganization, refreshOrganizations } = useOrganization();
  const { request } = useApi();
  const { addToast } = useToast();
  const { isAdmin } = usePermissions();
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo: ''
  });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    if (currentOrganization) {
      setFormData({
        name: currentOrganization.name || '',
        slug: currentOrganization.slug || '',
        logo: currentOrganization.logo || ''
      });
      fetchMembers();
    }
  }, [currentOrganization]);

  const fetchMembers = async () => {
    if (!currentOrganization) return;
    
    setLoadingMembers(true);
    try {
      const data = await request(`/api/organizations/${currentOrganization.id}`, { showToast: false });
      if (data?.members) {
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentOrganization || !isAdmin) return;

    setSaving(true);
    try {
      await request(`/api/organizations/${currentOrganization.id}`, {
        method: 'PUT',
        body: formData
      });
      
      addToast('הגדרות נשמרו בהצלחה', 'success');
      refreshOrganizations();
    } catch (error) {
      console.error('Error saving settings:', error);
      addToast('שגיאה בשמירת הגדרות', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${currentOrganization?.slug}/dashboard`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('הקישור הועתק', 'success');
  };

  if (!currentOrganization) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">לא נבחר ארגון</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">רק מנהלים יכולים לגשת להגדרות</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          הגדרות ארגון
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          נהל את הגדרות הארגון שלך
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              פרטי הארגון
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שם הארגון
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  כתובת URL
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-100 dark:bg-gray-600 dark:text-gray-400 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg">
                    {window.location.origin}/
                  </span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                    dir="ltr"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  רק אותיות באנגלית קטנות, מספרים ומקפים
                </p>
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  לוגו (URL)
                </label>
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={formData.logo}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    dir="ltr"
                  />
                  {formData.logo && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logo: '' })}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                {/* Logo Preview */}
                {formData.logo && (
                  <div className="mt-3 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-700">
                      <img
                        src={formData.logo}
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '';
                          e.target.alt = 'Error loading image';
                        }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      תצוגה מקדימה
                    </p>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'שומר...' : 'שמור שינויים'}
                </button>
              </div>
            </form>
          </div>

          {/* Organization Link */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-purple-600" />
              קישור לארגון
            </h2>

            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Globe className="w-5 h-5 text-gray-400" />
              <code className="flex-1 text-sm text-gray-600 dark:text-gray-300 font-mono">
                {window.location.origin}/{currentOrganization.slug}/dashboard
              </code>
              <button
                onClick={handleCopyLink}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title="העתק קישור"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-500" />
                )}
              </button>
              <a
                href={`/${currentOrganization.slug}/dashboard`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title="פתח בכרטיסייה חדשה"
              >
                <ExternalLink className="w-5 h-5 text-gray-500" />
              </a>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Members Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              חברי הארגון
            </h2>

            {loadingMembers ? (
              <div className="text-center py-4 text-gray-500">טוען...</div>
            ) : (
              <div className="space-y-3">
                {members.slice(0, 5).map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    {member.user?.picture ? (
                      <img
                        src={member.user.picture}
                        alt={member.user.name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                        {member.user?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {member.user?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {member.role === 'ADMIN' ? 'מנהל' :
                         member.role === 'MANAGER' ? 'מנהל פרויקט' :
                         member.role === 'MEMBER' ? 'חבר צוות' : 'צופה'}
                      </p>
                    </div>
                  </div>
                ))}

                {members.length > 5 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center pt-2">
                    +{members.length - 5} נוספים
                  </p>
                )}

                {members.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    אין חברים בארגון
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Theme Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-600" />
              תצוגה מקדימה
            </h2>

            <div className="aspect-video rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex items-center gap-3">
                {formData.logo ? (
                  <img
                    src={formData.logo}
                    alt="Logo"
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-white font-bold">
                      {formData.name.charAt(0) || '?'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {formData.name || 'שם הארגון'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    /{formData.slug || 'slug'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

