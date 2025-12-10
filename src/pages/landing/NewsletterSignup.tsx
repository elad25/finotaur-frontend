// =====================================================
// FINOTAUR WAR ZONE - FINAL OPTIMIZED v7.0
// =====================================================
// Place in: src/pages/landing/NewsletterSignup.tsx
//
// OPTIMIZATIONS:
// - Deep gradient background with noise & vignette
// - AI-vibe form with metallic border & glow
// - Larger dashboard with glowing outline
// - "Who This Is For" section
// - Mobile-optimized order: FOMO content earlier
// - Better spacing and bullet points
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// CONFIGURATION
// ============================================

const WHOP_NEWSLETTER_PLAN_ID = 'plan_LCBG5yJpoNtW3';
const WHOP_CHECKOUT_BASE_URL = `https://whop.com/checkout/${WHOP_NEWSLETTER_PLAN_ID}`;
const REDIRECT_URL = 'https://www.finotaur.com/app/all-markets/warzone';

// ============================================
// DESIGN TOKENS
// ============================================

const COLORS = {
  primary: '#00D4AA',
  primaryGlow: 'rgba(0, 212, 170, 0.2)',
  danger: '#EF4444',
  warning: '#F59E0B',
  dark: '#020508',
  card: '#0A0D12',
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.1)',
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
// DEEP BACKGROUND WITH NOISE & VIGNETTE
// ============================================

const DeepBackground = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden">
    {/* Base deep gradient */}
    <div 
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(180deg, #020508 0%, #000000 50%, #010203 100%)',
      }}
    />
    
    {/* Noise texture */}
    <div 
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
    
    {/* Vignette effect */}
    <div 
      className="absolute inset-0"
      style={{
        background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.8) 100%)',
      }}
    />
    
    {/* Subtle grid */}
    <div 
      className="absolute inset-0 opacity-[0.02]"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
      }}
    />
    
    {/* Top glow */}
    <div 
      className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px]"
      style={{
        background: `radial-gradient(ellipse at center, ${COLORS.primaryGlow} 0%, transparent 60%)`,
        opacity: 0.5,
      }}
    />
  </div>
);

// ============================================
// COUNTDOWN BADGE
// ============================================

const CountdownBadge = ({ countdown }: { countdown: { hours: number; minutes: number; seconds: number; urgent: boolean } }) => {
  const isUrgent = countdown.urgent;
  
  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold",
        isUrgent && "animate-pulse"
      )}
      style={{ 
        background: isUrgent ? 'rgba(239,68,68,0.15)' : 'rgba(0,212,170,0.1)', 
        border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.4)' : 'rgba(0,212,170,0.3)'}`,
        color: isUrgent ? '#EF4444' : COLORS.primary,
        boxShadow: isUrgent ? '0 0 20px rgba(239,68,68,0.2)' : '0 0 20px rgba(0,212,170,0.15)',
      }}
    >
      <Clock className="w-4 h-4" />
      <span>Next Report: </span>
      <span className="tabular-nums font-bold">
        {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
      </span>
    </div>
  );
};

// ============================================
// TODAY'S REPORT PREVIEW (FOMO) - COMPACT
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
      className="rounded-xl p-4"
      style={{ 
        background: 'rgba(0,212,170,0.05)', 
        border: '1px solid rgba(0,212,170,0.2)',
        boxShadow: '0 0 30px rgba(0,212,170,0.08)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4" style={{ color: COLORS.warning }} />
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: COLORS.warning }}>
          Today's Report Includes
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: COLORS.primary }} />
            <span className="text-gray-300">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ============================================
// PAIN POINTS (FOMO) - COMPACT
// ============================================

const PainPointsCompact = () => {
  const points = [
    "Missing early liquidity shifts",
    "Trading without macro context",
    "Zero visibility on smart money flow",
    "Not seeing structure behind moves",
  ];

  return (
    <div 
      className="rounded-xl p-4"
      style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <span className="text-xs font-bold uppercase tracking-wide text-red-400">
          Without War Zone, You're:
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {points.map((point, i) => (
          <li key={i} className="flex items-start gap-1.5 text-sm">
            <X className="w-3.5 h-3.5 text-red-500/60 flex-shrink-0 mt-0.5" />
            <span className="text-gray-500">{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ============================================
// WHO THIS IS FOR
// ============================================

const WhoThisIsFor = () => {
  const audiences = [
    { icon: TrendingUp, text: 'Day Traders', desc: 'who need pre-market edge' },
    { icon: LineChart, text: 'Swing Traders', desc: 'looking for macro context' },
    { icon: Activity, text: 'Options Traders', desc: 'tracking unusual flow' },
    { icon: Clock, text: 'Busy Professionals', desc: 'no time to analyze' },
  ];

  return (
    <div className="py-6">
      <h3 className="text-center text-white font-bold text-lg mb-1">
        Who This Is For
      </h3>
      <p className="text-center text-gray-500 text-sm mb-5">
        Is this you?
      </p>
      <div className="grid grid-cols-2 gap-3">
        {audiences.map((a, i) => (
          <div 
            key={i}
            className="p-3 rounded-lg text-center"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            <a.icon className="w-5 h-5 mx-auto mb-2" style={{ color: COLORS.primary }} />
            <p className="text-white text-sm font-medium">{a.text}</p>
            <p className="text-gray-500 text-xs">{a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// DASHBOARD MOCKUP - LARGER WITH GLOW
// ============================================

const DashboardMockup = () => (
  <div className="relative">
    {/* Outer glow */}
    <div 
      className="absolute -inset-2 rounded-2xl opacity-60 blur-xl"
      style={{ background: `linear-gradient(135deg, ${COLORS.primaryGlow}, rgba(99,102,241,0.15))` }}
    />
    
    <div 
      className="relative rounded-xl overflow-hidden"
      style={{ 
        background: COLORS.card, 
        border: '1px solid rgba(0,212,170,0.3)',
        boxShadow: `0 0 40px rgba(0,212,170,0.15), 0 20px 60px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Window Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: COLORS.border }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <span className="text-gray-500 text-xs ml-2">War Zone Intelligence — Live</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-500 text-[10px] font-medium">LIVE</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'SPY Bias', value: 'Bullish', color: COLORS.primary },
            { label: 'VIX Level', value: '14.2', color: COLORS.warning },
            { label: 'Net Flow', value: '+$2.4M', color: '#8B5CF6' },
          ].map((s, i) => (
            <div 
              key={i} 
              className="p-2.5 rounded-lg text-center"
              style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}` }}
            >
              <p className="text-gray-500 text-[10px] uppercase tracking-wide">{s.label}</p>
              <p className="font-bold text-sm mt-0.5" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
        
        {/* Chart */}
        <div 
          className="h-24 sm:h-28 rounded-lg flex items-end justify-between px-3 pb-3"
          style={{ background: 'rgba(0,212,170,0.03)', border: `1px solid ${COLORS.border}` }}
        >
          {[35, 50, 40, 70, 45, 80, 55, 85, 60, 95, 70, 90, 65, 88].map((h, i) => (
            <div 
              key={i}
              className="w-2 sm:w-2.5 rounded-t transition-all"
              style={{ 
                height: `${h}%`, 
                background: i === 13 ? COLORS.primary : 'rgba(0,212,170,0.25)',
                boxShadow: i === 13 ? `0 0 10px ${COLORS.primaryGlow}` : 'none',
              }}
            />
          ))}
        </div>
        
        {/* Alert */}
        <div 
          className="mt-3 p-3 rounded-lg flex items-start gap-2"
          style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)' }}
        >
          <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: COLORS.primary }} />
          <div>
            <p className="text-white text-sm font-medium">Large NVDA Call Flow Detected</p>
            <p className="text-gray-400 text-xs">$2.4M in 140C Jan expiry — Smart money</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// AI PIPELINE - COMPACT
// ============================================

const AIPipelineCompact = () => {
  const steps = [
    { icon: Database, label: 'Data', color: '#3B82F6' },
    { icon: Cpu, label: 'Analysis', color: '#8B5CF6' },
    { icon: Brain, label: 'AI', color: '#EC4899' },
    { icon: FileText, label: 'Report', color: COLORS.primary },
  ];

  return (
    <div className="py-6">
      <h3 className="text-center text-white font-bold text-lg mb-1">
        AI-Powered Intelligence Pipeline
      </h3>
      <p className="text-center text-gray-500 text-sm mb-5">
        Multi-agent system working overnight
      </p>
      
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2 sm:gap-4">
            <div className="text-center">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mx-auto mb-1"
                style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}
              >
                <step.icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: step.color }} />
              </div>
              <p className="text-gray-400 text-[10px] sm:text-xs">{step.label}</p>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 text-center">
        <span className="text-gray-400 text-sm">Delivered daily at </span>
        <span className="font-bold" style={{ color: COLORS.warning }}>9:00 AM ET</span>
      </div>
    </div>
  );
};

// ============================================
// AI-VIBE SIGNUP FORM
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
  <form onSubmit={handleSignup} className="space-y-3">
    {error && (
      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )}

    {/* AI-Vibe Form Container */}
    <div 
      className="relative rounded-xl p-4 space-y-3"
      style={{ 
        background: 'linear-gradient(180deg, rgba(10,13,18,0.95) 0%, rgba(5,8,12,0.98) 100%)',
        border: '1px solid rgba(0,212,170,0.2)',
        boxShadow: `
          0 0 30px rgba(0,212,170,0.08),
          inset 0 1px 0 rgba(255,255,255,0.03),
          inset 0 -1px 0 rgba(0,0,0,0.3)
        `,
      }}
    >
      {/* Metallic top edge */}
      <div 
        className="absolute top-0 left-4 right-4 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,170,0.3), transparent)' }}
      />

      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={isLoading}
          className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/50 border text-white placeholder-gray-500 focus:outline-none focus:border-[#00D4AA]/50 text-sm"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        />
      </div>

      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/50 border text-white placeholder-gray-500 focus:outline-none focus:border-[#00D4AA]/50 text-sm"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        />
      </div>

      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Password (6+ chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className="w-full pl-10 pr-10 py-3 rounded-lg bg-black/50 border text-white placeholder-gray-500 focus:outline-none focus:border-[#00D4AA]/50 text-sm"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        />
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
          {showPassword ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
        </button>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 rounded-lg font-bold text-black flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
        style={{ 
          background: `linear-gradient(135deg, ${COLORS.primary}, #00E5B8)`,
          boxShadow: `0 4px 20px ${COLORS.primaryGlow}, 0 0 40px rgba(0,212,170,0.15)`,
        }}
      >
        {isLoading ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
        ) : (
          <>🔥 Unlock Today's Report</>
        )}
      </button>
    </div>

    <p className="text-center text-gray-500 text-xs">
      ✓ 7-Day Free &nbsp;•&nbsp; No Card Now &nbsp;•&nbsp; Cancel Anytime
    </p>
    
    <p className="text-center text-gray-600 text-xs">
      Have an account? <a href="/login" className="font-medium hover:underline" style={{ color: COLORS.primary }}>Log in</a>
    </p>
  </form>
);

// ============================================
// TESTIMONIAL
// ============================================

const TestimonialCard = ({ text, author, role }: { text: string; author: string; role: string }) => (
  <div 
    className="p-4 rounded-xl"
    style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
  >
    <div className="flex gap-0.5 mb-2">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
      ))}
    </div>
    <p className="text-gray-300 text-sm mb-3">"{text}"</p>
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600" />
      <div>
        <p className="text-white text-xs font-medium">{author}</p>
        <p className="text-gray-500 text-[10px]">{role}</p>
      </div>
    </div>
  </div>
);

// ============================================
// WELCOME POPUP
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
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
      <div className="relative rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <div className="p-6 text-center border-b" style={{ borderColor: COLORS.border }}>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ background: 'rgba(0,212,170,0.15)' }}>
            <CheckCircle2 className="w-6 h-6" style={{ color: COLORS.primary }} />
          </div>
          <h2 className="text-xl font-bold text-white">Welcome, {userName}! 🎉</h2>
          <p className="text-gray-400 text-sm mt-1">Your account is ready</p>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            {['Complete 7-day free trial', 'First report tomorrow 9 AM ET', 'Private Discord access'].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="w-4 h-4" style={{ color: COLORS.primary }} />
                <span className="text-gray-300 text-sm">{item}</span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg text-xs text-gray-400" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <strong className="text-yellow-500">Disclaimer:</strong> Educational only. You're responsible for your trades.
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <div className={cn("w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all mt-0.5", agreed ? "border-transparent" : "border-gray-600")} style={agreed ? { background: COLORS.primary } : {}}>
              {agreed && <Check className="w-3 h-3 text-black" />}
            </div>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="sr-only" />
            <span className="text-gray-400 text-sm">I understand and accept</span>
          </label>
        </div>

        <div className="p-5 pt-0">
          <a
            href={agreed ? checkoutUrl : '#'}
            onClick={(e) => !agreed && e.preventDefault()}
            className={cn("w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all text-sm", agreed ? "text-black hover:opacity-90" : "bg-gray-800 text-gray-500 cursor-not-allowed")}
            style={agreed ? { background: COLORS.primary } : {}}
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
      <DeepBackground />
      <WelcomePopup isOpen={showWelcome} userName={firstName} checkoutUrl={checkoutUrl} />

      <div className="relative z-10 px-4 py-6 sm:py-10">
        <div className="max-w-md mx-auto">

          {/* ============ HERO ============ */}
          <section className="text-center mb-5">
            <div className="mb-4">
              <CountdownBadge countdown={countdown} />
            </div>

            <div className="relative inline-block mb-4">
              <div className="absolute inset-[-10px] rounded-full blur-[25px] opacity-50" style={{ background: COLORS.primary }} />
              <div 
                className="relative w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.25)' }}
              >
                <Swords className="w-7 h-7" style={{ color: COLORS.primary }} />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-3">
              Stop Trading Blind.
              <br />
              <span style={{ color: COLORS.primary }}>Get an Unfair Advantage.</span>
            </h1>

            <p className="text-gray-400 text-sm sm:text-base mb-4">
              Daily intelligence to spot reversals & liquidity shifts — 
              <span className="text-white"> before they're obvious.</span>
            </p>
          </section>

          {/* ============ CTA FORM ============ */}
          <section className="mb-5">
            {specialMessage ? (
              <div className="rounded-xl p-5 text-center" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ background: 'rgba(0,212,170,0.15)' }}>
                  <CheckCircle2 className="w-6 h-6" style={{ color: COLORS.primary }} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{specialMessage.title}</h3>
                <p className="text-gray-400 text-sm mb-4">{specialMessage.message}</p>
                <a href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-black font-semibold text-sm" style={{ background: COLORS.primary }}>
                  Log In <ArrowRight className="w-4 h-4" />
                </a>
                <button onClick={() => setSpecialMessage(null)} className="block w-full text-gray-500 text-xs mt-3">
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

          {/* ============ TODAY'S REPORT (HIGH CONVERSION) ============ */}
          <section className="mb-5">
            <TodaysReportPreview />
          </section>

          {/* ============ PAIN POINTS (FOMO - EARLY) ============ */}
          <section className="mb-6">
            <PainPointsCompact />
          </section>

          {/* ============ DASHBOARD (LARGER WITH GLOW) ============ */}
          <section className="mb-8 px-2">
            <DashboardMockup />
          </section>

          {/* ============ WHO THIS IS FOR ============ */}
          <section className="mb-6">
            <WhoThisIsFor />
          </section>

          {/* ============ AI PIPELINE ============ */}
          <section className="mb-8">
            <AIPipelineCompact />
          </section>

          {/* ============ TESTIMONIALS ============ */}
          <section className="mb-8">
            <h3 className="text-white font-bold text-center text-sm uppercase tracking-wide mb-4">Trader Reviews</h3>
            <div className="space-y-3">
              {testimonials.map((t, i) => (
                <TestimonialCard key={i} text={t.text} author={t.author} role={t.role} />
              ))}
            </div>
          </section>

          {/* ============ SOCIAL PROOF ============ */}
          <section className="text-center mb-8">
            <div className="flex justify-center gap-0.5 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              ))}
            </div>
            <p className="text-gray-400 text-sm">
              <span className="text-white font-bold">847+</span> traders • <span className="text-white font-bold">94%</span> renewal rate
            </p>
          </section>

          {/* ============ FINAL CTA ============ */}
          <section className="mb-6">
            <div 
              className="rounded-xl p-5 text-center"
              style={{ 
                background: 'rgba(0,212,170,0.05)', 
                border: '1px solid rgba(0,212,170,0.2)',
                boxShadow: '0 0 30px rgba(0,212,170,0.08)',
              }}
            >
              <h3 className="text-white font-bold text-lg mb-1">
                Don't Fall Behind
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                While others guess, you'll have the map.
              </p>
              <a 
                href="#"
                onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-black"
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.primary}, #00E5B8)`,
                  boxShadow: `0 4px 20px ${COLORS.primaryGlow}`,
                }}
              >
                🔥 Unlock Today's Report
              </a>
            </div>
          </section>

        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-5 px-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <p className="text-center text-gray-600 text-xs">
          © {new Date().getFullYear()} Finotaur • 
          <a href="/legal/terms" className="text-gray-500 hover:text-gray-400 mx-1">Terms</a> • 
          <a href="/legal/privacy" className="text-gray-500 hover:text-gray-400 mx-1">Privacy</a>
        </p>
      </footer>
    </div>
  );
}