import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, ArrowRight, Sparkles, Users, Target, Zap, Check, AlertCircle } from 'lucide-react';

function CreateOrganization() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Generate slug from name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      // Auto-generate slug only if not manually edited
      slug: slugManuallyEdited ? prev.slug : generateSlug(name)
    }));
    if (errors.name) setErrors(prev => ({ ...prev, name: null }));
  };

  const handleSlugChange = (e) => {
    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData(prev => ({ ...prev, slug }));
    setSlugManuallyEdited(true);
    if (errors.slug) setErrors(prev => ({ ...prev, slug: null }));
  };

  const handleLogoChange = (e) => {
    setFormData(prev => ({ ...prev, logo: e.target.value }));
    if (errors.logo) setErrors(prev => ({ ...prev, logo: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'שם הארגון הוא שדה חובה';
    } else if (formData.name.length > 100) {
      newErrors.name = 'שם הארגון חייב להיות עד 100 תווים';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'מזהה URL הוא שדה חובה';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'מזהה URL חייב להכיל רק אותיות קטנות באנגלית, מספרים ומקפים';
    } else if (formData.slug.length > 50) {
      newErrors.slug = 'מזהה URL חייב להיות עד 50 תווים';
    }

    if (formData.logo && formData.logo.trim()) {
      try {
        new URL(formData.logo);
      } catch {
        newErrors.logo = 'כתובת הלוגו חייבת להיות URL תקין';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          logo: formData.logo.trim() || null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error?.includes('slug')) {
          setErrors({ slug: 'מזהה URL זה כבר תפוס, נסה אחר' });
        } else {
          setErrors({ general: data.error || 'שגיאה ביצירת הארגון' });
        }
        return;
      }

      const organization = await response.json();
      
      // Navigate to the new organization's dashboard
      navigate(`/${organization.slug}/dashboard`);
    } catch (error) {
      console.error('Error creating organization:', error);
      setErrors({ general: 'שגיאה בחיבור לשרת' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
        {/* Floating orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Back Link */}
      <div className="absolute top-6 right-6 z-20">
        <Link 
          to="/no-organization"
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-white text-sm transition-all border border-white/20"
        >
          <span>חזרה</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Benefits */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-16 text-white">
          <div className="animate-slide-in-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl">
                <Building2 className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                צור ארגון חדש
              </h1>
            </div>
            <p className="text-xl text-indigo-200 mb-12">
              התחל לנהל את הצוות שלך בצורה חכמה ויעילה
            </p>
          </div>

          <div className="space-y-6">
            {[
              { icon: Users, title: 'ניהול צוות', desc: 'הזמן חברי צוות ונהל הרשאות בקלות' },
              { icon: Target, title: 'מעקב יעדים', desc: 'הגדר פרויקטים, סלעים ואבני דרך' },
              { icon: Zap, title: 'ספרינטים', desc: 'נהל מחזורי עבודה ועקוב אחר התקדמות' },
              { icon: Sparkles, title: 'תובנות', desc: 'קבל תמונת מצב ברורה על ביצועי הצוות' },
            ].map((feature, index) => (
              <div 
                key={feature.title}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 animate-slide-in-up"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-indigo-200">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md animate-scale-in">
            {/* Error Alert */}
            {errors.general && (
              <div className="mb-6 p-4 rounded-2xl border backdrop-blur-xl bg-red-500/20 border-red-500/30 animate-shake">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-300" />
                  <p className="text-red-200">{errors.general}</p>
                </div>
              </div>
            )}

            {/* Glass Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              {/* Header for mobile */}
              <div className="lg:hidden text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl mb-4 shadow-lg">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">צור ארגון חדש</h1>
              </div>

              {/* Welcome text */}
              <div className="text-center mb-8 hidden lg:block">
                <h2 className="text-2xl font-bold text-white mb-2">
                  בואו נתחיל! 🚀
                </h2>
                <p className="text-indigo-200">
                  מלא את הפרטים ליצירת הארגון שלך
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Organization Name */}
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">
                    שם הארגון *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="לדוגמה: חברת הייטק בע״מ"
                    className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-all ${
                      errors.name 
                        ? 'border-red-500/50 focus:ring-red-500/50' 
                        : 'border-white/20 focus:ring-indigo-500/50 focus:border-indigo-500/50'
                    }`}
                    dir="rtl"
                  />
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-300 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">
                    מזהה URL *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={handleSlugChange}
                      placeholder="company-name"
                      className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-all font-mono text-left ${
                        errors.slug 
                          ? 'border-red-500/50 focus:ring-red-500/50' 
                          : 'border-white/20 focus:ring-indigo-500/50 focus:border-indigo-500/50'
                      }`}
                      dir="ltr"
                    />
                  </div>
                  <p className="mt-2 text-xs text-indigo-300">
                    הכתובת תהיה: <span className="font-mono bg-white/10 px-2 py-0.5 rounded">/{formData.slug || 'your-org'}/dashboard</span>
                  </p>
                  {errors.slug && (
                    <p className="mt-2 text-sm text-red-300 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.slug}
                    </p>
                  )}
                </div>

                {/* Logo URL (optional) */}
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">
                    לוגו (אופציונלי)
                  </label>
                  <input
                    type="url"
                    value={formData.logo}
                    onChange={handleLogoChange}
                    placeholder="https://example.com/logo.png"
                    className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-all font-mono text-left ${
                      errors.logo 
                        ? 'border-red-500/50 focus:ring-red-500/50' 
                        : 'border-white/20 focus:ring-indigo-500/50 focus:border-indigo-500/50'
                    }`}
                    dir="ltr"
                  />
                  {errors.logo && (
                    <p className="mt-2 text-sm text-red-300 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.logo}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 rounded-xl text-white font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>יוצר ארגון...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      <span>צור ארגון</span>
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-indigo-200 text-sm">💡</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>

              {/* Info */}
              <p className="text-center text-sm text-indigo-200">
                לאחר יצירת הארגון, תוכל להזמין חברי צוות נוספים
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateOrganization;

