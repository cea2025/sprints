/**
 * Select Organization Page
 * מסך בחירת ארגון - מוצג כשמשתמש שייך לכמה ארגונים
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { Building2, ChevronLeft, Plus, Users, Loader2 } from 'lucide-react';

export default function SelectOrganization() {
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selecting, setSelecting] = useState(null);
  const { user } = useAuth();
  const { request } = useApi();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setIsLoading(true);
    try {
      const data = await request('/api/organizations', { showToast: false });
      if (data && Array.isArray(data)) {
        setOrganizations(data);
        
        // אם יש רק ארגון אחד, בחר אותו אוטומטית
        if (data.length === 1) {
          handleSelect(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (org) => {
    setSelecting(org.id);
    try {
      const result = await request('/api/organizations/select', {
        method: 'POST',
        body: { organizationId: org.id },
        showToast: false
      });
      
      if (result) {
        // Navigate to dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Failed to select organization:', error);
    } finally {
      setSelecting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-purple-200">טוען ארגונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mb-4 shadow-xl shadow-purple-500/30">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">בחר ארגון</h1>
          <p className="text-purple-200">
            שלום {user?.name}, בחר את הארגון שברצונך לעבוד בו
          </p>
        </div>

        {/* Organizations List */}
        {organizations.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/10">
            <Building2 className="w-16 h-16 text-purple-300 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-white mb-2">
              אין ארגונים
            </h3>
            <p className="text-purple-200 mb-6">
              עדיין לא הצטרפת לאף ארגון
            </p>
            <button
              onClick={() => navigate('/organizations/new')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              צור ארגון חדש
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSelect(org)}
                disabled={selecting === org.id}
                className={`w-full bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-right border border-white/10 hover:bg-white/20 hover:border-purple-500/50 transition-all group ${
                  selecting === org.id ? 'opacity-50 cursor-wait' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Logo/Icon */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {org.logo ? (
                      <img src={org.logo} alt={org.name} className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      org.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-right">
                    <h3 className="text-lg font-semibold text-white mb-1">{org.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-purple-200">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        org.role === 'ADMIN' ? 'bg-red-500/20 text-red-300' :
                        org.role === 'MANAGER' ? 'bg-yellow-500/20 text-yellow-300' :
                        org.role === 'MEMBER' ? 'bg-green-500/20 text-green-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {org.role === 'ADMIN' ? 'מנהל' :
                         org.role === 'MANAGER' ? 'מנהל פרויקט' :
                         org.role === 'MEMBER' ? 'חבר צוות' : 'צופה'}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                    {selecting === org.id ? (
                      <Loader2 className="w-5 h-5 text-purple-300 animate-spin" />
                    ) : (
                      <ChevronLeft className="w-5 h-5 text-purple-300 group-hover:text-white transition-colors" />
                    )}
                  </div>
                </div>
              </button>
            ))}

            {/* Create new organization */}
            <button
              onClick={() => navigate('/organizations/new')}
              className="w-full bg-white/5 backdrop-blur-sm rounded-2xl p-6 text-center border border-dashed border-white/20 hover:bg-white/10 hover:border-purple-500/50 transition-all group"
            >
              <div className="flex items-center justify-center gap-3 text-purple-300 group-hover:text-white">
                <Plus className="w-5 h-5" />
                <span>צור ארגון חדש</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

