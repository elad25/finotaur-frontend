// =====================================================
// FINOTAUR WAR ZONE - INSTITUTIONAL GOLD v1.0
// =====================================================
// Place in: src/pages/landing/NewsletterSignup.tsx
//
// DESIGN SYSTEM:
// - Deep black background with subtle gold gradients
// - Gold Primary: #D4AF37
// - Gold Gradient: #C9A646 → #E7C873
// - Luxury gray text: #C4C4C4
// - Institutional premium aesthetic
// - Clean typography with generous spacing
//
// Route: /warzone-signup (public, no auth required)
// =====================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
  Swords, 
  CheckCircle2, 
  ArrowRight,
  Loader2,
  AlertCircle,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  Globe,
  Activity,
  Zap,
  Brain,
  LineChart,
  Clock,
  Star,
  X,
  AlertTriangle,
  Target,
  Cpu,
  Database,
  FileText,
  Send,
  ExternalLink,
  Check,
  TrendingUp,
  Users,
  Shield,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// CONFIGURATION
// ============================================

const WHOP_NEWSLETTER_PLAN_ID = 'plan_LCBG5yJpoNtW3';
const WHOP_CHECKOUT_BASE_URL = `https://whop.com/checkout/${WHOP_NEWSLETTER_PLAN_ID}`;
const REDIRECT_URL = 'https://www.finotaur.com/app/all-markets/warzone';

// ============================================
// DESIGN TOKENS - INSTITUTIONAL GOLD
// ============================================

const COLORS = {
  // Gold palette
  gold: '#D4AF37',
  goldLight: '#E7C873',
  goldDark: '#C9A646',
  goldMuted: 'rgba(212, 175, 55, 0.15)',
  goldGlow: 'rgba(212, 175, 55, 0.25)',
  goldBorder: 'rgba(212, 175, 55, 0.2)',
  goldBorderLight: 'rgba(212, 175, 55, 0.3)',
  
  // Backgrounds
  dark: '#0C0C0C',
  darkAlt: '#1A1A1A',
  card: 'rgba(255, 255, 255, 0.02)',
  cardHover: 'rgba(255, 255, 255, 0.04)',
  
  // Text
  white: '#FFFFFF',
  whiteMuted: 'rgba(255, 255, 255, 0.8)',
  gray: '#C4C4C4',
  grayDark: '#8A8A8A',
  
  // Accents
  danger: '#7A2424',
  dangerLight: 'rgba(122, 36, 36, 0.15)',
  success: 'rgba(212, 175, 55, 0.2)',
  
  // Borders
  border: 'rgba(255, 255, 255, 0.06)',
  borderLight: 'rgba(255, 255, 255, 0.1)',
};

// ============================================
// TYPES
// ============================================

interface SpecialMessage {
  type: 'premium' | 'subscribed' | 'exists';
  title: string;
  message: string;
}

// ============================================
// COUNTDOWN HOOK
// ============================================

const useCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, urgent: false });

  useEffect(() => {
    const calculate = () => {
      const now = new Date();
      const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      let target = new Date(nyTime);
      target.setHours(9, 0, 0, 0);
      if (nyTime >= target) target.setDate(target.getDate() + 1);
      const diff = target.getTime() - nyTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      return {
        hours,
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        urgent: hours < 3,
      };
    };
    const timer = setInterval(() => setTimeLeft(calculate()), 1000);
    setTimeLeft(calculate());
    return () => clearInterval(timer);
  }, []);

  return timeLeft;
};

// ============================================
// INSTITUTIONAL BACKGROUND
// ============================================

const InstitutionalBackground = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden">
    {/* Base gradient - deep black */}
    <div 
      className="absolute inset-0"
      style={{
        background: `linear-gradient(180deg, ${COLORS.dark} 0%, #000000 40%, ${COLORS.darkAlt} 100%)`,
      }}
    />
    
    {/* Subtle noise texture */}
    <div 
      className="absolute inset-0 opacity-[0.015]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
    
    {/* Vignette */}
    <div 
      className="absolute inset-0"
      style={{
        background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.7) 100%)',
      }}
    />
    
    {/* Top gold glow - very subtle */}
    <div 
      className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
      style={{
        background: `radial-gradient(ellipse at center, ${COLORS.goldMuted} 0%, transparent 70%)`,
        opacity: 0.4,
      }}
    />
    
    {/* Subtle grid pattern */}
    <div 
      className="absolute inset-0 opacity-[0.015]"
      style={{
        backgroundImage: `linear-gradient(rgba(212,175,55,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }}
    />
  </div>
);

// ============================================
// SECTION DIVIDER
// ============================================

const SectionDivider = () => (
  <div 
    className="h-px my-8 mx-auto max-w-[200px]"
    style={{ 
      background: `linear-gradient(90deg, transparent, ${COLORS.goldBorder}, transparent)` 
    }}
  />
);

// ============================================
// COUNTDOWN BADGE - GOLD
// ============================================

const CountdownBadge = ({ countdown }: { countdown: { hours: number; minutes: number; seconds: number; urgent: boolean } }) => {
  const isUrgent = countdown.urgent;
  
  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-medium tracking-wide",
        isUrgent && "animate-pulse"
      )}
      style={{ 
        background: isUrgent ? COLORS.dangerLight : COLORS.goldMuted, 
        border: `1px solid ${isUrgent ? 'rgba(122,36,36,0.4)' : COLORS.goldBorder}`,
        color: isUrgent ? '#EF4444' : COLORS.gold,
        boxShadow: isUrgent ? '0 0 30px rgba(239,68,68,0.1)' : `0 0 30px ${COLORS.goldMuted}`,
      }}
    >
      <Clock className="w-4 h-4" />
      <span className="opacity-80">Next Report</span>
      <span className="tabular-nums font-bold">
        {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
      </span>
    </div>
  );
};

// ============================================
// TODAY'S REPORT PREVIEW - GOLD
// ============================================

const TodaysReportPreview = () => {
  const items = [
    'Fed rate expectations & yield curve analysis',
    'Large UOA: TSLA $280C, NVDA $145C sweep',
    'ES/NQ key levels with liquidity zones',
    'AI-detected reversal pattern on SPY',
  ];

  return (
    <div 
      className="rounded-2xl p-5"
      style={{ 
        background: COLORS.card, 
        border: `1px solid ${COLORS.goldBorder}`,
        boxShadow: `0 0 40px ${COLORS.goldMuted}`,
      }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: COLORS.goldMuted }}
        >
          <Zap className="w-4 h-4" style={{ color: COLORS.gold }} />
        </div>
        <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>
          Today's Report
        </span>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: COLORS.gold }} />
            <span style={{ color: COLORS.gray }}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ============================================
// PAIN POINTS - GOLD ACCENT
// ============================================

const PainPointsCompact = () => {
  const points = [
    "Missing early liquidity shifts",
    "Trading without macro context",
    "Zero visibility on smart money",
    "Not seeing structure behind moves",
  ];

  return (
    <div 
      className="rounded-2xl p-5"
      style={{ 
        background: COLORS.dangerLight, 
        border: `1px solid rgba(122,36,36,0.25)`,
      }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(122,36,36,0.3)' }}
        >
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        <span className="text-sm font-semibold uppercase tracking-widest text-red-400">
          Without War Zone
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
        {points.map((point, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <X className="w-4 h-4 text-red-500/50 flex-shrink-0 mt-0.5" />
            <span style={{ color: COLORS.grayDark }}>{point}</span>
          </li>
        ))}
      </ul>
      {/* Gold underline accent */}
      <div 
        className="h-0.5 mt-4 rounded-full"
        style={{ background: `linear-gradient(90deg, ${COLORS.goldBorder}, transparent)` }}
      />
    </div>
  );
};

// ============================================
// WHO THIS IS FOR - GOLD CARDS
// ============================================

const WhoThisIsFor = () => {
  const audiences = [
    { icon: TrendingUp, text: 'Day Traders', desc: 'Pre-market edge' },
    { icon: LineChart, text: 'Swing Traders', desc: 'Macro context' },
    { icon: Activity, text: 'Options Traders', desc: 'Unusual flow' },
    { icon: Clock, text: 'Professionals', desc: 'Time-efficient' },
  ];

  return (
    <div className="py-2">
      <h3 className="text-center font-bold text-xl mb-2" style={{ color: COLORS.white }}>
        Who This Is <span style={{ color: COLORS.gold }}>For</span>
      </h3>
      <p className="text-center text-sm mb-6" style={{ color: COLORS.grayDark }}>
        Is this you?
      </p>
      <div className="grid grid-cols-2 gap-3">
        {audiences.map((a, i) => (
          <div 
            key={i}
            className="p-4 rounded-xl text-center transition-all duration-300 hover:scale-[1.02]"
            style={{ 
              background: COLORS.card, 
              border: `1px solid ${COLORS.goldBorder}`,
              boxShadow: `0 4px 20px rgba(0,0,0,0.2)`,
            }}
          >
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2"
              style={{ background: COLORS.goldMuted }}
            >
              <a.icon className="w-5 h-5" style={{ color: COLORS.gold }} />
            </div>
            <p className="font-semibold text-sm" style={{ color: COLORS.white }}>{a.text}</p>
            <p className="text-xs mt-0.5" style={{ color: COLORS.grayDark }}>{a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// DASHBOARD MOCKUP - GOLD THEME
// ============================================

const DashboardMockup = () => (
  <div className="relative">
    {/* Outer glow */}
    <div 
      className="absolute -inset-3 rounded-3xl opacity-50 blur-2xl"
      style={{ background: COLORS.goldGlow }}
    />
    
    <div 
      className="relative rounded-2xl overflow-hidden"
      style={{ 
        background: 'linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(12,12,12,0.98) 100%)', 
        border: `1px solid ${COLORS.goldBorderLight}`,
        boxShadow: `0 0 60px ${COLORS.goldMuted}, 0 25px 80px rgba(0,0,0,0.6)`,
      }}
    >
      {/* Window Header */}
      <div 
        className="flex items-center gap-2 px-5 py-3 border-b"
        style={{ borderColor: COLORS.border, background: 'rgba(0,0,0,0.3)' }}
      >
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        </div>
        <span className="text-xs ml-2" style={{ color: COLORS.grayDark }}>War Zone Intelligence</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: COLORS.gold }} />
          <span className="text-[10px] font-medium" style={{ color: COLORS.gold }}>LIVE</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-5">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'SPY Bias', value: 'Bullish', highlight: true },
            { label: 'VIX Level', value: '14.2', highlight: false },
            { label: 'Net Flow', value: '+$2.4M', highlight: true },
          ].map((s, i) => (
            <div 
              key={i} 
              className="p-3 rounded-xl text-center"
              style={{ 
                background: COLORS.card, 
                border: `1px solid ${s.highlight ? COLORS.goldBorder : COLORS.border}` 
              }}
            >
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: COLORS.grayDark }}>{s.label}</p>
              <p className="font-bold text-sm" style={{ color: s.highlight ? COLORS.gold : COLORS.white }}>{s.value}</p>
            </div>
          ))}
        </div>
        
        {/* Chart */}
        <div 
          className="h-28 sm:h-32 rounded-xl flex items-end justify-between px-4 pb-4"
          style={{ 
            background: COLORS.card, 
            border: `1px solid ${COLORS.border}` 
          }}
        >
          {[35, 50, 40, 70, 45, 80, 55, 85, 60, 95, 70, 90, 65, 88].map((h, i) => (
            <div 
              key={i}
              className="w-2 sm:w-2.5 rounded-t transition-all"
              style={{ 
                height: `${h}%`, 
                background: i === 13 
                  ? `linear-gradient(180deg, ${COLORS.goldLight}, ${COLORS.goldDark})` 
                  : 'rgba(212,175,55,0.2)',
                boxShadow: i === 13 ? `0 0 15px ${COLORS.goldGlow}` : 'none',
              }}
            />
          ))}
        </div>
        
        {/* Alert */}
        <div 
          className="mt-4 p-4 rounded-xl flex items-start gap-3"
          style={{ 
            background: COLORS.goldMuted, 
            border: `1px solid ${COLORS.goldBorder}` 
          }}
        >
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(212,175,55,0.2)' }}
          >
            <Zap className="w-4 h-4" style={{ color: COLORS.gold }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: COLORS.white }}>Large NVDA Call Flow Detected</p>
            <p className="text-xs mt-0.5" style={{ color: COLORS.gray }}>$2.4M in 140C Jan expiry — Smart money</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// AI PIPELINE - GOLD
// ============================================

const AIPipelineCompact = () => {
  const steps = [
    { icon: Database, label: 'Data' },
    { icon: Cpu, label: 'Analysis' },
    { icon: Brain, label: 'AI' },
    { icon: FileText, label: 'Report' },
  ];

  return (
    <div className="py-2">
      <h3 className="text-center font-bold text-xl mb-2" style={{ color: COLORS.white }}>
        AI-Powered <span style={{ color: COLORS.gold }}>Intelligence</span>
      </h3>
      <p className="text-center text-sm mb-6" style={{ color: COLORS.grayDark }}>
        Multi-agent system working overnight
      </p>
      
      <div className="flex items-center justify-center gap-3 sm:gap-5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3 sm:gap-5">
            <div className="text-center">
              <div 
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mx-auto mb-2"
                style={{ 
                  background: COLORS.goldMuted, 
                  border: `1px solid ${COLORS.goldBorder}`,
                  boxShadow: `0 4px 15px rgba(0,0,0,0.3)`,
                }}
              >
                <step.icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: COLORS.gold }} />
              </div>
              <p className="text-[10px] sm:text-xs" style={{ color: COLORS.gray }}>{step.label}</p>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="w-4 h-4" style={{ color: COLORS.goldBorder }} />
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <span style={{ color: COLORS.gray }} className="text-sm">Delivered daily at </span>
        <span className="font-bold" style={{ color: COLORS.gold }}>9:00 AM ET</span>
      </div>
    </div>
  );
};

// ============================================
// GOLD CTA BUTTON
// ============================================

const GoldButton = ({ 
  children, 
  onClick, 
  disabled, 
  className,
  size = 'default',
}: { 
  children: React.ReactNode; 
  onClick?: (e: React.FormEvent) => void; 
  disabled?: boolean;
  className?: string;
  size?: 'default' | 'large';
}) => (
  <button
    type="submit"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-full rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300",
      "hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
      size === 'large' ? 'py-4 text-base' : 'py-3.5 text-sm',
      className
    )}
    style={{ 
      background: `linear-gradient(135deg, ${COLORS.goldDark}, ${COLORS.gold}, ${COLORS.goldLight})`,
      color: COLORS.dark,
      boxShadow: `0 4px 25px ${COLORS.goldGlow}, 0 0 50px ${COLORS.goldMuted}`,
    }}
  >
    {children}
  </button>
);

// ============================================
// AI-VIBE SIGNUP FORM - GOLD
// ============================================

const SignupForm = ({
  firstName, setFirstName,
  email, setEmail,
  password, setPassword,
  showPassword, setShowPassword,
  isLoading, error, handleSignup,
}: {
  firstName: string; setFirstName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  showPassword: boolean; setShowPassword: (v: boolean) => void;
  isLoading: boolean; error: string | null; handleSignup: (e: React.FormEvent) => void;
}) => (
  <form onSubmit={handleSignup} className="space-y-4">
    {error && (
      <div 
        className="p-4 rounded-xl flex items-center gap-3"
        style={{ background: COLORS.dangerLight, border: `1px solid rgba(122,36,36,0.3)` }}
      >
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )}

    {/* Premium Form Container */}
    <div 
      className="relative rounded-2xl p-5 space-y-4"
      style={{ 
        background: 'linear-gradient(180deg, rgba(20,20,20,0.9) 0%, rgba(12,12,12,0.95) 100%)',
        border: `1px solid ${COLORS.goldBorder}`,
        boxShadow: `
          0 0 40px ${COLORS.goldMuted},
          inset 0 1px 0 rgba(255,255,255,0.02),
          inset 0 -1px 0 rgba(0,0,0,0.2)
        `,
      }}
    >
      {/* Gold top edge accent */}
      <div 
        className="absolute top-0 left-6 right-6 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${COLORS.goldBorderLight}, transparent)` }}
      />

      <div className="relative">
        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.grayDark }} />
        <input
          type="text"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={isLoading}
          className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/40 border text-white placeholder-gray-500 focus:outline-none transition-all text-sm"
          style={{ 
            borderColor: COLORS.border,
          }}
          onFocus={(e) => e.target.style.borderColor = COLORS.goldBorder}
          onBlur={(e) => e.target.style.borderColor = COLORS.border}
        />
      </div>

      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.grayDark }} />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/40 border text-white placeholder-gray-500 focus:outline-none transition-all text-sm"
          style={{ borderColor: COLORS.border }}
          onFocus={(e) => e.target.style.borderColor = COLORS.goldBorder}
          onBlur={(e) => e.target.style.borderColor = COLORS.border}
        />
      </div>

      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.grayDark }} />
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Password (6+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-black/40 border text-white placeholder-gray-500 focus:outline-none transition-all text-sm"
          style={{ borderColor: COLORS.border }}
          onFocus={(e) => e.target.style.borderColor = COLORS.goldBorder}
          onBlur={(e) => e.target.style.borderColor = COLORS.border}
        />
        <button 
          type="button" 
          onClick={() => setShowPassword(!showPassword)} 
          className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80"
        >
          {showPassword 
            ? <EyeOff className="w-4 h-4" style={{ color: COLORS.grayDark }} /> 
            : <Eye className="w-4 h-4" style={{ color: COLORS.grayDark }} />
          }
        </button>
      </div>

      <GoldButton disabled={isLoading}>
        {isLoading ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Creating Account...</>
        ) : (
          <>
            <Award className="w-5 h-5" />
            Unlock Today's Report
          </>
        )}
      </GoldButton>
    </div>

    {/* Trust indicators */}
    <div className="flex items-center justify-center gap-4 text-xs" style={{ color: COLORS.grayDark }}>
      <span className="flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5" style={{ color: COLORS.gold }} />
        7-Day Free
      </span>
      <span>•</span>
      <span>No Card Now</span>
      <span>•</span>
      <span>Cancel Anytime</span>
    </div>
    
    <p className="text-center text-xs" style={{ color: COLORS.grayDark }}>
      Have an account?{' '}
      <a href="/login" className="font-semibold hover:underline transition-colors" style={{ color: COLORS.gold }}>
        Log in
      </a>
    </p>
  </form>
);

// ============================================
// TESTIMONIAL - GOLD ACCENT
// ============================================

const TestimonialCard = ({ text, author, role }: { text: string; author: string; role: string }) => (
  <div 
    className="p-5 rounded-2xl transition-all duration-300 hover:scale-[1.01]"
    style={{ 
      background: COLORS.card, 
      border: `1px solid ${COLORS.goldBorder}`,
      boxShadow: `0 4px 20px rgba(0,0,0,0.2)`,
    }}
  >
    <div className="flex gap-0.5 mb-3">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="w-4 h-4" style={{ fill: COLORS.gold, color: COLORS.gold }} />
      ))}
    </div>
    <p className="text-sm mb-4 leading-relaxed" style={{ color: COLORS.gray }}>"{text}"</p>
    <div className="flex items-center gap-3">
      <div 
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${COLORS.goldDark}, ${COLORS.gold})` }}
      >
        <span className="text-xs font-bold" style={{ color: COLORS.dark }}>{author.charAt(0)}</span>
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: COLORS.white }}>{author}</p>
        <p className="text-[11px]" style={{ color: COLORS.grayDark }}>{role}</p>
      </div>
    </div>
  </div>
);

// ============================================
// WELCOME POPUP - GOLD
// ============================================

const WelcomePopup = ({ 
  isOpen, userName, checkoutUrl 
}: { 
  isOpen: boolean; userName: string; checkoutUrl: string;
}) => {
  const [agreed, setAgreed] = useState(false);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" />
      <div 
        className="relative rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        style={{ 
          background: 'linear-gradient(180deg, #1A1A1A 0%, #0C0C0C 100%)', 
          border: `1px solid ${COLORS.goldBorder}`,
          boxShadow: `0 0 80px ${COLORS.goldMuted}`,
        }}
      >
        <div className="p-6 text-center border-b" style={{ borderColor: COLORS.border }}>
          <div 
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: COLORS.goldMuted }}
          >
            <CheckCircle2 className="w-7 h-7" style={{ color: COLORS.gold }} />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: COLORS.white }}>
            Welcome, <span style={{ color: COLORS.gold }}>{userName}</span>! 🎉
          </h2>
          <p className="text-sm mt-2" style={{ color: COLORS.gray }}>Your account is ready</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-3">
            {['Complete 7-day free trial', 'First report tomorrow 9 AM ET', 'Private Discord access'].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: COLORS.goldMuted }}
                >
                  <Check className="w-4 h-4" style={{ color: COLORS.gold }} />
                </div>
                <span className="text-sm" style={{ color: COLORS.gray }}>{item}</span>
              </div>
            ))}
          </div>

          <div 
            className="p-4 rounded-xl text-xs leading-relaxed"
            style={{ background: COLORS.card, color: COLORS.grayDark }}
          >
            <span style={{ color: COLORS.gold }} className="font-semibold">Disclaimer:</span> Educational only. You're responsible for your trades.
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <div 
              className={cn(
                "w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-all mt-0.5"
              )}
              style={{ 
                borderColor: agreed ? COLORS.gold : COLORS.grayDark,
                background: agreed ? COLORS.gold : 'transparent',
              }}
            >
              {agreed && <Check className="w-3.5 h-3.5" style={{ color: COLORS.dark }} />}
            </div>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="sr-only" />
            <span className="text-sm" style={{ color: COLORS.gray }}>I understand and accept</span>
          </label>
        </div>

        <div className="p-6 pt-0">
          <a
            href={agreed ? checkoutUrl : '#'}
            onClick={(e) => !agreed && e.preventDefault()}
            className={cn(
              "w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm"
            )}
            style={{ 
              background: agreed ? `linear-gradient(135deg, ${COLORS.goldDark}, ${COLORS.gold})` : COLORS.card,
              color: agreed ? COLORS.dark : COLORS.grayDark,
              cursor: agreed ? 'pointer' : 'not-allowed',
              boxShadow: agreed ? `0 4px 25px ${COLORS.goldGlow}` : 'none',
            }}
          >
            Start Free Trial <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function NewsletterSignup() {
  const navigate = useNavigate();
  const countdown = useCountdown();
  
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [specialMessage, setSpecialMessage] = useState<SpecialMessage | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const source = urlParams.get('source') || urlParams.get('utm_source') || 'instagram';

  const validateForm = (): boolean => {
    if (!firstName.trim()) { setError('Enter your first name'); return false; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email'); return false; }
    if (!password || password.length < 6) { setError('Password must be 6+ characters'); return false; }
    return true;
  };

  const buildCheckoutUrl = (userId: string, userEmail: string): string => {
    const params = new URLSearchParams();
    params.set('email', userEmail);
    params.set('metadata[finotaur_user_id]', userId);
    params.set('metadata[source]', source);
    params.set('redirect_url', `${REDIRECT_URL}?payment=success`);
    return `${WHOP_CHECKOUT_BASE_URL}?${params.toString()}`;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedFirstName = firstName.trim();

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, account_type, newsletter_enabled')
        .eq('email', trimmedEmail)
        .single();

      if (existingProfile) {
        if (existingProfile.account_type === 'PREMIUM') {
          setSpecialMessage({ type: 'premium', title: "You're Premium", message: 'War Zone included in your subscription.' });
        } else if (existingProfile.newsletter_enabled) {
          setSpecialMessage({ type: 'subscribed', title: 'Already Subscribed', message: "You're receiving War Zone." });
        } else {
          setSpecialMessage({ type: 'exists', title: 'Account Exists', message: 'Log in to subscribe.' });
        }
        setIsLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: password,
        options: { data: { first_name: trimmedFirstName, signup_source: 'newsletter_landing' } },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setSpecialMessage({ type: 'exists', title: 'Account Exists', message: 'Log in to subscribe.' });
          return;
        }
        throw authError;
      }

      if (!authData.user) throw new Error('Failed to create account');

      await supabase.from('profiles').update({
        first_name: trimmedFirstName,
        newsletter_signup_source: source,
        newsletter_signed_up_at: new Date().toISOString(),
      }).eq('id', authData.user.id);

      setCheckoutUrl(buildCheckoutUrl(authData.user.id, trimmedEmail));
      setShowWelcome(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const testimonials = [
    { text: "This report became my morning weapon. I don't trade without it.", author: "Mike T.", role: "Day Trader" },
    { text: "The UOA alerts paid for a year of subscription in one trade.", author: "Sarah K.", role: "Swing Trader" },
    { text: "Better than $500/mo services. Finally, institutional research I can afford.", author: "David R.", role: "Options Trader" },
  ];

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen relative" style={{ background: COLORS.dark }}>
      <InstitutionalBackground />
      <WelcomePopup isOpen={showWelcome} userName={firstName} checkoutUrl={checkoutUrl} />

      <div className="relative z-10 px-4 py-8 sm:py-12">
        <div className="max-w-md mx-auto">

          {/* ============ HERO ============ */}
          <section className="text-center mb-8">
            <div className="mb-6">
              <CountdownBadge countdown={countdown} />
            </div>

            <div className="relative inline-block mb-6">
              <div 
                className="absolute inset-[-15px] rounded-full blur-[30px] opacity-60"
                style={{ background: COLORS.gold }} 
              />
              <div 
                className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ 
                  background: COLORS.goldMuted, 
                  border: `1px solid ${COLORS.goldBorder}`,
                  boxShadow: `0 0 40px ${COLORS.goldGlow}`,
                }}
              >
                <Swords className="w-8 h-8" style={{ color: COLORS.gold }} />
              </div>
            </div>

            <h1 
              className="text-3xl sm:text-4xl font-bold leading-tight mb-4"
              style={{ color: COLORS.white }}
            >
              Stop Trading Blind.
              <br />
              <span style={{ color: COLORS.gold }}>Get an Unfair Advantage.</span>
            </h1>

            <p className="text-base sm:text-lg leading-relaxed" style={{ color: COLORS.gray }}>
              Daily intelligence to spot reversals & liquidity shifts —{' '}
              <span style={{ color: COLORS.white }}>before they're obvious.</span>
            </p>
          </section>

          {/* ============ CTA FORM ============ */}
          <section className="mb-8">
            {specialMessage ? (
              <div 
                className="rounded-2xl p-6 text-center"
                style={{ 
                  background: 'linear-gradient(180deg, rgba(20,20,20,0.9) 0%, rgba(12,12,12,0.95) 100%)', 
                  border: `1px solid ${COLORS.goldBorder}`,
                  boxShadow: `0 0 40px ${COLORS.goldMuted}`,
                }}
              >
                <div 
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                  style={{ background: COLORS.goldMuted }}
                >
                  <CheckCircle2 className="w-7 h-7" style={{ color: COLORS.gold }} />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.white }}>{specialMessage.title}</h3>
                <p className="text-sm mb-5" style={{ color: COLORS.gray }}>{specialMessage.message}</p>
                <a 
                  href="/login" 
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
                  style={{ 
                    background: `linear-gradient(135deg, ${COLORS.goldDark}, ${COLORS.gold})`,
                    color: COLORS.dark,
                    boxShadow: `0 4px 20px ${COLORS.goldGlow}`,
                  }}
                >
                  Log In <ArrowRight className="w-4 h-4" />
                </a>
                <button 
                  onClick={() => setSpecialMessage(null)} 
                  className="block w-full text-xs mt-4 transition-colors hover:opacity-80"
                  style={{ color: COLORS.grayDark }}
                >
                  Use different email
                </button>
              </div>
            ) : (
              <SignupForm 
                firstName={firstName} setFirstName={setFirstName}
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                showPassword={showPassword} setShowPassword={setShowPassword}
                isLoading={isLoading} error={error} handleSignup={handleSignup}
              />
            )}
          </section>

          <SectionDivider />

          {/* ============ TODAY'S REPORT (HIGH CONVERSION) ============ */}
          <section className="mb-8">
            <TodaysReportPreview />
          </section>

          {/* ============ PAIN POINTS (FOMO - EARLY) ============ */}
          <section className="mb-8">
            <PainPointsCompact />
          </section>

          <SectionDivider />

          {/* ============ DASHBOARD (LARGER WITH GLOW) ============ */}
          <section className="mb-10 px-1">
            <DashboardMockup />
          </section>

          <SectionDivider />

          {/* ============ WHO THIS IS FOR ============ */}
          <section className="mb-8">
            <WhoThisIsFor />
          </section>

          <SectionDivider />

          {/* ============ AI PIPELINE ============ */}
          <section className="mb-8">
            <AIPipelineCompact />
          </section>

          <SectionDivider />

          {/* ============ TESTIMONIALS ============ */}
          <section className="mb-8">
            <h3 
              className="text-center text-sm font-semibold uppercase tracking-widest mb-5"
              style={{ color: COLORS.gold }}
            >
              Trader Reviews
            </h3>
            <div className="space-y-4">
              {testimonials.map((t, i) => (
                <TestimonialCard key={i} text={t.text} author={t.author} role={t.role} />
              ))}
            </div>
          </section>

          {/* ============ SOCIAL PROOF ============ */}
          <section className="text-center mb-10">
            <div className="flex justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5" style={{ fill: COLORS.gold, color: COLORS.gold }} />
              ))}
            </div>
            <p className="text-sm" style={{ color: COLORS.gray }}>
              <span className="font-bold" style={{ color: COLORS.gold }}>847+</span> traders •{' '}
              <span className="font-bold" style={{ color: COLORS.gold }}>94%</span> renewal rate
            </p>
          </section>

          {/* ============ FINAL CTA ============ */}
          <section className="mb-8">
            <div 
              className="rounded-2xl p-6 text-center"
              style={{ 
                background: COLORS.goldMuted, 
                border: `1px solid ${COLORS.goldBorder}`,
                boxShadow: `0 0 50px ${COLORS.goldMuted}`,
              }}
            >
              <h3 className="font-bold text-xl mb-2" style={{ color: COLORS.white }}>
                Don't Fall <span style={{ color: COLORS.gold }}>Behind</span>
              </h3>
              <p className="text-sm mb-5" style={{ color: COLORS.gray }}>
                While others guess, you'll have the map.
              </p>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold transition-all hover:scale-[1.02] hover:shadow-lg"
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.goldDark}, ${COLORS.gold}, ${COLORS.goldLight})`,
                  color: COLORS.dark,
                  boxShadow: `0 4px 30px ${COLORS.goldGlow}`,
                }}
              >
                <Award className="w-5 h-5" />
                Unlock Today's Report
              </button>
            </div>
          </section>

        </div>
      </div>

      {/* Footer */}
      <footer 
        className="relative z-10 py-6 px-4"
        style={{ borderTop: `1px solid ${COLORS.border}` }}
      >
        <p className="text-center text-xs" style={{ color: COLORS.grayDark }}>
          © {new Date().getFullYear()} Finotaur •{' '}
          <a href="/legal/terms" className="transition-colors hover:opacity-80" style={{ color: COLORS.gray }}>Terms</a> •{' '}
          <a href="/legal/privacy" className="transition-colors hover:opacity-80" style={{ color: COLORS.gray }}>Privacy</a>
        </p>
      </footer>
    </div>
  );
}