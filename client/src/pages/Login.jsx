import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Mountain, Zap, Target, Users, ArrowLeft, ArrowRight, AlertTriangle, XCircle } from 'lucide-react';

// Error messages mapping
const ERROR_MESSAGES = {
  'oauth_not_configured': {
    title: 'המערכת לא מוגדרת',
    message: 'התחברות עם Google לא הוגדרה במערכת. פנה למנהל המערכת.',
    type: 'warning'
  },
  'auth_failed': {
    title: 'ההתחברות נכשלה',
    message: 'אירעה שגיאה בתהליך ההתחברות. נסה שוב.',
    type: 'error'
  },
  'unauthorized': {
    title: 'אינך מורשה',
    message: 'אינך מורשה להתחבר למערכת זו. פנה למנהל המערכת כדי לקבל גישה.',
    type: 'error'
  },
  'account_disabled': {
    title: 'החשבון מושבת',
    message: 'החשבון שלך הושבת. פנה למנהל המערכת לקבלת מידע נוסף.',
    type: 'error'
  },
  'server_error': {
    title: 'שגיאת שרת',
    message: 'אירעה שגיאה בשרת. נסה שוב מאוחר יותר.',
    type: 'error'
  },
  'login_failed': {
    title: 'ההתחברות נכשלה',
    message: 'לא ניתן היה להשלים את ההתחברות. נסה שוב.',
    type: 'error'
  },
  'access_denied': {
    title: 'גישה נדחתה',
    message: 'הגישה לחשבון Google נדחתה. ייתכן שלא אישרת את ההרשאות הנדרשות.',
    type: 'warning'
  }
};

function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const errorCode = searchParams.get('error');
    if (errorCode) {
      // Get error message or use default
      const errorInfo = ERROR_MESSAGES[errorCode] || {
        title: 'שגיאה',
        message: 'אירעה שגיאה בתהליך ההתחברות. נסה שוב.',
        type: 'error'
      };
      setError(errorInfo);
      
      // Clear error from URL after showing it
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('error');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleGoogleLogin = () => {
    setError(null);
    window.location.href = '/api/auth/google';
  };

  const dismissError = () => {
    setError(null);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Floating orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
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

      {/* Back to Home Link */}
      <div className="absolute top-6 right-6 z-20">
        <Link 
          to="/"
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-white text-sm transition-all border border-white/20"
        >
          <span>חזרה לדף הבית</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Features */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-16 text-white">
          <div className="animate-slide-in-up">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              ספרינטים
            </h1>
            <p className="text-xl text-purple-200 mb-12">
              מערכת ניהול משימות צוות מתקדמת
            </p>
          </div>

          <div className="space-y-6">
            {[
              { icon: Mountain, title: 'סלעים', desc: 'הגדר יעדים רבעוניים אסטרטגיים' },
              { icon: Zap, title: 'ספרינטים', desc: 'נהל מחזורי עבודה של 1-2 שבועות' },
              { icon: Target, title: 'משימות', desc: 'עקוב אחר פריטי עבודה קונקרטיים' },
              { icon: Users, title: 'צוות', desc: 'נהל חברי צוות וקיבולת' },
            ].map((feature, index) => (
              <div 
                key={feature.title}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 animate-slide-in-up"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-purple-200">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Login Card */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md animate-scale-in">
            {/* Error Alert */}
            {error && (
              <div className={`mb-6 p-4 rounded-2xl border backdrop-blur-xl animate-shake ${
                error.type === 'error' 
                  ? 'bg-red-500/20 border-red-500/30' 
                  : 'bg-yellow-500/20 border-yellow-500/30'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    error.type === 'error' ? 'bg-red-500/30' : 'bg-yellow-500/30'
                  }`}>
                    {error.type === 'error' 
                      ? <XCircle className="w-5 h-5 text-red-300" />
                      : <AlertTriangle className="w-5 h-5 text-yellow-300" />
                    }
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold ${
                      error.type === 'error' ? 'text-red-200' : 'text-yellow-200'
                    }`}>
                      {error.title}
                    </h3>
                    <p className={`text-sm mt-1 ${
                      error.type === 'error' ? 'text-red-300' : 'text-yellow-300'
                    }`}>
                      {error.message}
                    </p>
                  </div>
                  <button 
                    onClick={dismissError}
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Glass Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              {/* Logo for mobile */}
              <div className="lg:hidden text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mb-4 shadow-lg">
                  <Mountain className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">ספרינטים</h1>
              </div>

              {/* Welcome text */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  ברוכים הבאים! 👋
                </h2>
                <p className="text-purple-200">
                  התחבר כדי להמשיך לניהול המשימות שלך
          </p>
        </div>

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 group"
        >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
                <span className="text-gray-700 font-semibold text-lg">
                  התחבר עם Google
                </span>
                <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:translate-x-[-4px] transition-transform" />
        </button>

              {/* Divider */}
              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-purple-200 text-sm">גישה מאובטחת</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>

              {/* Info */}
              <div className="text-center space-y-4">
                <p className="text-sm text-purple-200">
                  ההתחברות מוגנת באמצעות Google OAuth 2.0
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-purple-300">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span>כל הנתונים מוצפנים ומאובטחים</span>
                </div>
              </div>
            </div>

        {/* Footer */}
            <p className="text-center text-sm text-purple-300 mt-6">
          גישה למשתמשים מורשים בלבד
        </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
