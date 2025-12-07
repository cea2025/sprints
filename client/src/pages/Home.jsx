/**
 * Home Page - Landing Page for visitors
 * 
 * This is the first page users see when they visit the app.
 * Shows features and login CTA.
 */

import { Link } from 'react-router-dom';
import { 
  Mountain, 
  Zap, 
  Users, 
  BarChart3, 
  CheckCircle2,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: Mountain,
      title: 'סלעים (Rocks)',
      description: 'הגדר יעדים אסטרטגיים רבעוניים ועקוב אחר ההתקדמות שלהם'
    },
    {
      icon: Zap,
      title: 'ספרינטים',
      description: 'נהל ספרינטים דו-שבועיים עם אבני דרך ברורות וממוקדות'
    },
    {
      icon: Users,
      title: 'ניהול צוות',
      description: 'הקצה אבני דרך לחברי צוות ועקוב אחר הקיבולת שלהם'
    },
    {
      icon: BarChart3,
      title: 'דשבורד מתקדם',
      description: 'קבל תמונה ברורה של סטטוס הפרויקט בזמן אמת'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
            <Mountain className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">ספרינטים</span>
        </div>
        <Link
          to="/login"
          className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium transition-all border border-white/20"
        >
          <span>התחברות</span>
          <ArrowLeft size={18} />
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-purple-200 text-sm mb-8 border border-white/10">
          <Sparkles size={16} />
          <span>מערכת ניהול אבני דרך לצוותים</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          נהל את הצוות שלך
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            בצורה חכמה יותר
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10">
          מערכת לניהול סלעים, ספרינטים ואבני דרך.
          עקוב אחר ההתקדמות של הצוות שלך בזמן אמת.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/login"
            className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold text-lg shadow-xl shadow-purple-500/25 transition-all transform hover:scale-105"
          >
            <span>התחל עכשיו</span>
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center group-hover:from-blue-600/30 group-hover:to-purple-600/30 transition-all">
                <feature.icon className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
            למה לבחור בספרינטים?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'ממשק פשוט ואינטואיטיבי',
              'תמיכה מלאה בעברית ו-RTL',
              'מצב בהיר וכהה',
              'עובד מכל מכשיר',
              'הרשאות גמישות לצוות',
              'עדכונים בזמן אמת'
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-3 text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} ספרינטים. כל הזכויות שמורות.
        </div>
      </footer>
    </div>
  );
}

