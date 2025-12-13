import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Swords, 
  CheckCircle2, 
  Shield,
  Clock,
  Users,
  Star,
  ArrowRight,
  LineChart,
  FileText,
  Activity,
  Loader2,
  BarChart3,
  Globe,
  ExternalLink,
  Flame,
  Award,
  MessageSquare,
  Headphones,
  Calendar,
  PieChart,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  Zap,
  TrendingUp,
  Crown,
  Target,
  Radio,
  MessagesSquare,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// 🔥 WHOP CONFIGURATION
// ============================================
const WHOP_NEWSLETTER_PLAN_ID = 'plan_LCBG5yJpoNtW3';
const WHOP_CHECKOUT_BASE_URL = `https://whop.com/checkout/${WHOP_NEWSLETTER_PLAN_ID}`;
const REDIRECT_URL = 'https://www.finotaur.com/app/all-markets/warzone';

// ============================================
// PASSWORD VALIDATION HELPERS
// ============================================
const validatePassword = (password: string) => {
  return {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?!]/.test(password),
  };
};

const getPasswordStrength = (password: string) => {
  if (!password) return { label: '', color: '', bgColor: '', progress: 0 };
  
  const validation = validatePassword(password);
  const score = Object.values(validation).filter(Boolean).length;
  
  if (score === 4) return { label: 'Strong', color: 'text-green-400', bgColor: 'bg-green-500', progress: 100 };
  if (score === 3) return { label: 'Good', color: 'text-yellow-400', bgColor: 'bg-yellow-500', progress: 75 };
  if (score === 2) return { label: 'Fair', color: 'text-orange-400', bgColor: 'bg-orange-500', progress: 50 };
  return { label: 'Weak', color: 'text-red-400', bgColor: 'bg-red-500', progress: 25 };
};

const validateEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ============================================
// REGISTRATION FORM COMPONENT
// ============================================
const RegistrationForm = ({ 
  onSubmit, 
  isLoading 
}: { 
  onSubmit: (data: { firstName: string; email: string; password: string }) => void;
  isLoading: boolean;
}) => {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordRules, setShowPasswordRules] = useState(false);

  const passwordValidation = validatePassword(password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const isEmailValid = validateEmail(email);
  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isEmailValid) {
      alert('Please enter a valid email address');
      return;
    }
    
    if (!isPasswordValid) {
      alert('Password does not meet security requirements');
      return;
    }
    
    onSubmit({ firstName, email, password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* First Name */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
          <User className="w-5 h-5" />
        </div>
        <input
          type="text"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#0d0d18] border border-gray-800 text-white placeholder-gray-500 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/30 transition-all"
        />
      </div>

      {/* Email */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
          <Mail className="w-5 h-5" />
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={cn(
            "w-full pl-12 pr-10 py-4 rounded-xl bg-[#0d0d18] border text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all",
            email && (isEmailValid 
              ? "border-green-500/50 focus:border-green-500/50 focus:ring-green-500/30" 
              : "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30"),
            !email && "border-gray-800 focus:border-yellow-500/50 focus:ring-yellow-500/30"
          )}
        />
        {email && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {isEmailValid ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <X className="w-5 h-5 text-red-500" />
            )}
          </div>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
            <Lock className="w-5 h-5" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setShowPasswordRules(true)}
            required
            className="w-full pl-12 pr-12 py-4 rounded-xl bg-[#0d0d18] border border-gray-800 text-white placeholder-gray-500 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/30 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400 transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* Password Strength Bar */}
        {password && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Password strength</span>
              <span className={cn("text-xs font-semibold", passwordStrength.color)}>
                {passwordStrength.label}
              </span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-500", passwordStrength.bgColor)}
                style={{ width: `${passwordStrength.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Password Requirements */}
        {showPasswordRules && password && (
          <div className="p-3 bg-[#080812] border border-gray-800 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-gray-400">Requirements:</p>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                {passwordValidation.minLength ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                )}
                <span className={cn("text-xs", passwordValidation.minLength ? "text-green-400" : "text-gray-500")}>
                  8+ characters
                </span>
              </div>

              <div className="flex items-center gap-2">
                {passwordValidation.hasUpperCase ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                )}
                <span className={cn("text-xs", passwordValidation.hasUpperCase ? "text-green-400" : "text-gray-500")}>
                  Uppercase (A-Z)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {passwordValidation.hasNumber ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                )}
                <span className={cn("text-xs", passwordValidation.hasNumber ? "text-green-400" : "text-gray-500")}>
                  Number (0-9)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {passwordValidation.hasSpecialChar ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                )}
                <span className={cn("text-xs", passwordValidation.hasSpecialChar ? "text-green-400" : "text-gray-500")}>
                  Special (@#$%...)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !isPasswordValid || !isEmailValid || !firstName}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Lock className="w-5 h-5" />
            Unlock Today's Report
          </>
        )}
      </button>

      {/* Trust Badges */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-gray-500 text-xs sm:text-sm pt-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>7-Day Free</span>
        </div>
        <span className="text-gray-700 hidden sm:inline">•</span>
        <span>No Card Now</span>
        <span className="text-gray-700 hidden sm:inline">•</span>
        <span>Cancel Anytime</span>
      </div>

      {/* Login Link */}
      <div className="text-center text-gray-500 text-sm">
        Have an account?{' '}
        <a href="/login" className="text-yellow-500 hover:text-yellow-400 font-medium">
          Log in
        </a>
      </div>
    </form>
  );
};

// ============================================
// DISCLAIMER POPUP COMPONENT
// ============================================
const DisclaimerPopup = ({ 
  isOpen, 
  onClose, 
  onAccept 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAccept: () => void;
}) => {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#0d0d18] border border-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#080812]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            </div>
            <h2 className="text-lg font-semibold text-white">Important Disclaimer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="bg-[#080812] rounded-xl p-5 border border-gray-800 mb-6">
            <h3 className="text-yellow-500 font-bold text-sm uppercase tracking-wide mb-3">
              FINOTAUR MARKET INTELLIGENCE DISCLAIMER
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              This report is for <span className="text-white">informational and educational purposes only</span>. 
              It does not constitute investment advice, trading advice, or a recommendation to buy or sell any security. 
              All content represents general market commentary and does not consider individual financial circumstances.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed mt-3">
              Finotaur is <span className="text-white">not a licensed investment adviser, broker-dealer, or financial institution</span>. 
              Users are solely responsible for their own investment decisions.
            </p>
          </div>

          {/* Trial Info */}
          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-400 font-medium text-sm">7-Day Free Trial</p>
                <p className="text-gray-400 text-sm mt-1">
                  You won't be charged for the first 7 days. Cancel anytime during the trial period — no questions asked.
                </p>
              </div>
            </div>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                "w-5 h-5 rounded border-2 transition-all flex items-center justify-center",
                agreed 
                  ? "bg-green-500 border-green-500" 
                  : "border-gray-600 group-hover:border-gray-500"
              )}>
                {agreed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
            </div>
            <span className="text-gray-300 text-sm leading-relaxed">
              I have read and understood the disclaimer above. I acknowledge that Finotaur provides educational content only and I am responsible for my own trading decisions.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-[#080812]">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onAccept}
              disabled={!agreed}
              className={cn(
                "flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
                agreed
                  ? "bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              )}
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// LIVE DASHBOARD PREVIEW COMPONENT
// ============================================
const LiveDashboardPreview = () => {
  return (
    <div className="relative">
      {/* Window Frame */}
      <div className="bg-[#0d0d18] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        {/* Window Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#080812] border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-gray-400 text-sm ml-2">War Zone Intelligence</span>
          </div>
          <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-5">
          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-[#080812] rounded-xl p-3 border border-gray-800">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">SPY Bias</div>
              <div className="text-green-400 font-bold text-lg">Bullish</div>
            </div>
            <div className="bg-[#080812] rounded-xl p-3 border border-gray-800">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">VIX Level</div>
              <div className="text-white font-bold text-lg">14.2</div>
            </div>
            <div className="bg-[#080812] rounded-xl p-3 border border-gray-800">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Net Flow</div>
              <div className="text-green-400 font-bold text-lg">+$2.4M</div>
            </div>
          </div>

          {/* Chart Bars */}
          <div className="flex items-end gap-1.5 h-24 mb-4">
            {[40, 55, 45, 70, 60, 85, 75, 90, 65, 80, 70, 95, 85, 100, 90].map((height, i) => (
              <div 
                key={i}
                className="flex-1 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t opacity-80"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>

          {/* Alert Box */}
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/30">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-blue-400 font-semibold text-sm">Large NVDA Call Flow Detected</p>
              <p className="text-gray-500 text-xs mt-0.5">$2.4M in 140C Jan expiry — Smart money</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ELITE COMMUNITY SECTION COMPONENT
// ============================================
const EliteCommunitySection = () => {
  const communityFeatures = [
    {
      icon: Globe,
      title: 'Global Network',
      description: 'Connect with traders from New York, London, Tokyo, and beyond'
    },
    {
      icon: Zap,
      title: 'Real-Time Alerts',
      description: 'Instant notifications on market-moving events and opportunities'
    },
    {
      icon: Target,
      title: 'Trade Ideas',
      description: 'Daily setups shared by experienced traders in the community'
    },
    {
      icon: MessagesSquare,
      title: 'Live Discussions',
      description: '24/7 market chat with professionals who speak your language'
    }
  ];

  const memberLocations = [
    { flag: '🇺🇸', country: 'USA', members: '312' },
    { flag: '🇬🇧', country: 'UK', members: '156' },
    { flag: '🇮🇱', country: 'Israel', members: '89' },
    { flag: '🇩🇪', country: 'Germany', members: '67' },
    { flag: '🇦🇺', country: 'Australia', members: '54' },
    { flag: '🇨🇦', country: 'Canada', members: '48' },
  ];

  return (
    <div className="relative py-20 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#080812] via-purple-900/10 to-[#080812]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-3xl" />
      
      <div className="relative max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/40 mb-6">
            <Crown className="w-4 h-4 text-purple-400" />
            <span className="text-purple-400 text-sm font-semibold">EXCLUSIVE ACCESS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Join the <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">ELITE</span> Community
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            A private network of serious traders and investors from around the world. 
            No noise, no pump and dumps — just real value.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          
          {/* Left Side - Discord Preview Card */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-3xl blur-xl" />
            <div className="relative bg-[#0d0d18] rounded-3xl border border-purple-500/30 overflow-hidden">
              {/* Discord-style Header */}
              <div className="bg-[#080812] px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-semibold">Finotaur Elite</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-green-400 text-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    847 Online
                  </span>
                </div>
              </div>

              {/* Channel List */}
              <div className="p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-2">
                  💬 Trading Channels
                </div>
                <div className="space-y-1">
                  {[
                    { name: '# market-analysis', active: true, unread: 12 },
                    { name: '# trade-ideas', active: false, unread: 5 },
                    { name: '# options-flow', active: false, unread: 3 },
                    { name: '# macro-intel', active: false, unread: 0 },
                    { name: '# earnings-plays', active: false, unread: 8 },
                  ].map((channel, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg transition-all",
                        channel.active ? "bg-purple-500/20 text-white" : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-300"
                      )}
                    >
                      <span className="text-sm">{channel.name}</span>
                      {channel.unread > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                          {channel.unread}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-6 px-2">
                  🎙️ Voice Channels
                </div>
                <div className="space-y-1">
                  {[
                    { name: '🔊 Trading Room', users: 23 },
                    { name: '🔊 Market Open Call', users: 0 },
                  ].map((channel, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-gray-300 transition-all"
                    >
                      <span className="text-sm">{channel.name}</span>
                      {channel.users > 0 && (
                        <span className="flex items-center gap-1 text-green-400 text-xs">
                          <Users className="w-3 h-3" />
                          {channel.users}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Sample Message Preview */}
                <div className="mt-6 p-4 bg-[#080812] rounded-xl border border-gray-800">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      M
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-400 font-semibold text-sm">Mike_NYC</span>
                        <span className="text-xs text-gray-600">Today at 9:32 AM</span>
                      </div>
                      <p className="text-gray-300 text-sm mt-1">
                        SPY showing strong support at 580. Watching for a break above 582 with volume for a potential move to 585. 
                        Anyone else seeing the unusual call activity? 🎯
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">🔥 12</span>
                        <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs">👀 8</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Features & Stats */}
          <div className="space-y-6">
            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {communityFeatures.map((feature, i) => (
                <div 
                  key={i}
                  className="p-4 rounded-2xl bg-[#0d0d18] border border-gray-800 hover:border-purple-500/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 group-hover:bg-purple-500/20 transition-colors">
                    <feature.icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <h4 className="text-white font-semibold mb-1">{feature.title}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Global Members Card */}
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-[#0d0d18] to-purple-900/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-purple-400" />
                <h4 className="text-white font-semibold">Global Trading Network</h4>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {memberLocations.map((loc, i) => (
                  <div 
                    key={i}
                    className="text-center p-2 sm:p-3 rounded-xl bg-[#080812] border border-gray-800"
                  >
                    <div className="text-xl sm:text-2xl mb-1">{loc.flag}</div>
                    <div className="text-white font-bold text-base sm:text-lg">{loc.members}</div>
                    <div className="text-gray-500 text-xs">{loc.country}</div>
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-sm text-center mt-4">
                + traders from 40+ more countries
              </p>
            </div>

            {/* Live Activity Indicator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0d0d18] border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Radio className="w-5 h-5 text-green-400" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500 animate-ping" />
                </div>
                <div>
                  <p className="text-white font-medium">Live Trading Room</p>
                  <p className="text-gray-500 text-sm">Active during US market hours</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-green-400 ml-8 sm:ml-0">
                <Users className="w-4 h-4" />
                <span className="font-semibold">23 live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Value Props */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: Shield, label: 'Verified Traders Only', color: 'text-green-400' },
            { icon: MessageSquare, label: '24/7 Active Chat', color: 'text-blue-400' },
            { icon: TrendingUp, label: 'Daily Trade Ideas', color: 'text-orange-400' },
            { icon: Headphones, label: 'Voice Trading Room', color: 'text-purple-400' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-[#0d0d18]/50 border border-gray-800/50">
              <item.icon className={cn("w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0", item.color)} />
              <span className="text-gray-300 text-xs sm:text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function WarZoneLanding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // 🔥 NEW: Store pending user data after registration (before Whop checkout)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingUserEmail, setPendingUserEmail] = useState<string | null>(null);

  // Calculate countdown to next report (9:00 AM ET)
  const [countdown, setCountdown] = useState('');
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const etOffset = -5; // ET offset from UTC
      const utcHours = now.getUTCHours();
      const etHours = (utcHours + etOffset + 24) % 24;
      
      let hoursUntil = 9 - etHours;
      if (hoursUntil <= 0) hoursUntil += 24;
      
      const minutesUntil = 60 - now.getMinutes();
      const secondsUntil = 60 - now.getSeconds();
      
      if (minutesUntil === 60) {
        setCountdown(`${String(hoursUntil).padStart(2, '0')}:00:${String(secondsUntil).padStart(2, '0')}`);
      } else {
        setCountdown(`${String(hoursUntil - 1).padStart(2, '0')}:${String(minutesUntil).padStart(2, '0')}:${String(secondsUntil).padStart(2, '0')}`);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check for payment success from redirect
  useEffect(() => {
    if (searchParams.get('payment') === 'success' || searchParams.get('checkout_status') === 'success') {
      setPaymentSuccess(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('profiles')
          .select('newsletter_enabled')
          .eq('id', user.id)
          .single();
        setIsSubscribed(data?.newsletter_enabled ?? false);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkSubscription();
  }, [user?.id]);

  // 🔥 FIXED: Handle registration form submission - save user ID for Whop
  const handleRegistration = async (data: { firstName: string; email: string; password: string }) => {
    setIsRegistering(true);
    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
          }
        }
      });

      if (authError) throw authError;

      // 🔥 IMPORTANT: Save the user ID and email for Whop checkout
      // This ensures we can identify the user even if they use different email in Whop
      if (authData.user?.id) {
        setPendingUserId(authData.user.id);
        setPendingUserEmail(data.email);
        console.log('✅ User registered, saved ID for Whop:', authData.user.id);
      }

      // Show disclaimer after registration
      setShowDisclaimer(true);
    } catch (error: any) {
      console.error('Registration error:', error);
      alert(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  // 🔥 FIXED: After accepting disclaimer, go to Whop with correct user ID
  const handleAcceptDisclaimer = () => {
    setShowDisclaimer(false);
    
    const params = new URLSearchParams();
    
    // Use user from AuthProvider (if logged in) OR pending data from registration
    const userId = user?.id || pendingUserId;
    const userEmail = user?.email || pendingUserEmail;
    
    // Pre-fill email
    if (userEmail) {
      params.set('email', userEmail);
    }
    
    // 🔥 CRITICAL: Add finotaur_user_id for webhook identification
    if (userId) {
      params.set('metadata[finotaur_user_id]', userId);
      console.log('✅ Sending to Whop with user ID:', userId);
    } else {
      console.warn('⚠️ No user ID available for Whop checkout!');
    }
    
    params.set('redirect_url', `${REDIRECT_URL}?payment=success`);
    
    const checkoutUrl = `${WHOP_CHECKOUT_BASE_URL}?${params.toString()}`;
    console.log('🔗 Checkout URL:', checkoutUrl);
    
    window.open(checkoutUrl, '_blank');
  };

  // ====================================
  // CONTENT DATA
  // ====================================

  const todaysReportItems = [
    'Fed rate expectations & yield curve analysis',
    'Large UOA: TSLA $280C, NVDA $145C sweep',
    'ES/NQ key levels with liquidity zones',
    'AI-detected reversal pattern on SPY'
  ];

  const withoutWarzoneProblems = [
    { text: 'Missing early liquidity shifts', icon: X },
    { text: 'Zero visibility on smart money', icon: X },
    { text: 'Trading without macro context', icon: X },
    { text: 'Not seeing structure behind moves', icon: X },
  ];

  const targetAudience = [
    { icon: TrendingUp, title: 'Day Traders', subtitle: 'Pre-market edge' },
    { icon: LineChart, title: 'Swing Traders', subtitle: 'Macro context' },
    { icon: Activity, title: 'Options Traders', subtitle: 'Unusual flow' },
    { icon: Clock, title: 'Professionals', subtitle: 'Time-efficient' },
  ];

  const testimonials = [
    {
      text: "This report became my morning weapon. I don't trade without it.",
      author: "Mike T.",
      role: "Day Trader",
      avatar: "M"
    },
    {
      text: "The UOA alerts paid for a year of subscription in one trade.",
      author: "Sarah K.",
      role: "Swing Trader",
      avatar: "S"
    },
    {
      text: "Better than $500/mo services. Finally, institutional research I can afford.",
      author: "David R.",
      role: "Options Trader",
      avatar: "D"
    }
  ];

  const faqs = [
    {
      q: "How does the 7-day free trial work?",
      a: "You get full access to everything — daily reports, Discord community, and trading room — for 7 days completely free. You won't be charged during this period. If you decide it's not for you, simply cancel before day 7 and you'll never be charged. After 7 days, your subscription continues at $20/month."
    },
    {
      q: "What exactly do I get with my subscription?",
      a: "Every trading day you receive: (1) A comprehensive 8-14 page PDF with institutional-grade macro analysis, market structure breakdown, UOA tracking, technical outlook, and earnings intel. (2) Access to our private Discord community with professional traders. (3) Entry to the Finotaur Live Trading Room with real-time alerts. All delivered at 9:00 AM NY time."
    },
    {
      q: "How is this different from other newsletters?",
      a: "Most newsletters give you surface-level analysis or just stock picks. We deliver Wall Street desk-level intelligence: the same quality of research that institutional traders pay thousands for. We show you HOW to think about markets, not just what to trade."
    },
    {
      q: "What's the Discord community like?",
      a: "Our Discord is a curated community of serious traders - no meme stocks, no pump and dumps. Members share trade ideas, discuss market structure, and help each other improve. Many members say it's the most valuable part of their subscription."
    },
    {
      q: "When do I receive the daily report?",
      a: "The PDF is delivered to your inbox every trading day at 9:00 AM New York time - giving you everything you need before market open. Breaking alerts are sent throughout the day via Discord."
    },
    {
      q: "Can I cancel anytime?",
      a: "Absolutely. Cancel with one click, no questions asked. During your 7-day trial, cancel anytime and pay nothing. After that, you'll keep access until the end of your billing period."
    }
  ];

  const stats = [
    { value: '847+', label: 'traders' },
    { value: '94%', label: 'renewal rate' },
  ];

  // ====================================
  // RENDER
  // ====================================

  return (
    <div className="min-h-screen bg-[#080812]">
      
      {/* Disclaimer Popup */}
      <DisclaimerPopup 
        isOpen={showDisclaimer}
        onClose={() => setShowDisclaimer(false)}
        onAccept={handleAcceptDisclaimer}
      />

      {/* Payment Success Banner */}
      {paymentSuccess && !isSubscribed && (
        <div className="bg-green-500/10 border-b border-green-500/30 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <p className="text-green-400 text-sm font-medium">
              Payment successful! Your access is being activated. Please refresh in a moment.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="text-green-400 underline text-sm hover:text-green-300"
            >
              Refresh now
            </button>
          </div>
        </div>
      )}

      {/* ============ HERO SECTION ============ */}
      <div className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 via-transparent to-amber-900/10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-yellow-500/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-12 sm:py-16">
          
          {/* Countdown Timer */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#0d0d18] border border-gray-800">
              <Clock className="w-4 h-4 text-green-400" />
              <span className="text-gray-400 text-sm">Next Report</span>
              <span className="text-yellow-500 font-mono font-bold">{countdown}</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Side - Content */}
            <div className="text-center lg:text-left">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 mb-6 shadow-xl shadow-yellow-500/10">
                <Swords className="w-10 h-10 text-yellow-500" />
              </div>
              
              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                Stop Trading Blind.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500">
                  Get an Unfair Advantage.
                </span>
              </h1>
              
              {/* Subheadline */}
              <p className="text-base sm:text-lg text-gray-400 mb-8 leading-relaxed">
                Daily intelligence to spot reversals & liquidity shifts
                <br className="hidden sm:block" />
                <span className="sm:hidden"> </span>
                <span className="text-white font-medium">— before they're obvious.</span>
              </p>

              {/* Registration Form */}
              {isLoading ? (
                <div className="flex justify-center lg:justify-start">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                </div>
              ) : isSubscribed ? (
                <div className="inline-flex flex-col items-center gap-4 p-6 rounded-2xl bg-[#0d0d18] border border-green-500/30 max-w-md">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                  <h3 className="text-xl font-bold text-white">Welcome to War Zone ⚔️</h3>
                  <p className="text-gray-400 text-sm">Check your email and Discord for today's intel.</p>
                  <a 
                    href="https://discord.gg/finotaur" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium flex items-center gap-2 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Join Discord
                  </a>
                </div>
              ) : (
                <div className="max-w-md mx-auto lg:mx-0">
                  <div className="bg-[#0a0a14] rounded-2xl border border-gray-800 p-6">
                    <RegistrationForm 
                      onSubmit={handleRegistration}
                      isLoading={isRegistering}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Side - Dashboard Preview (Desktop) */}
            <div className="hidden lg:block">
              <LiveDashboardPreview />
            </div>
          </div>

          {/* Dashboard Preview (Mobile) - shown below form */}
          <div className="lg:hidden mt-10">
            <LiveDashboardPreview />
          </div>
        </div>
      </div>

      {/* ============ TODAY'S REPORT SECTION ============ */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Today's Report Card */}
          <div className="p-6 rounded-2xl bg-[#0d0d18] border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-yellow-500 text-sm font-semibold uppercase tracking-wide">Today's Report</span>
            </div>
            <div className="space-y-3">
              {todaysReportItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Without War Zone Card */}
          <div className="p-6 rounded-2xl bg-[#0d0d18] border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-400 text-sm font-semibold uppercase tracking-wide">Without War Zone</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {withoutWarzoneProblems.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-500 text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============ WHO THIS IS FOR SECTION ============ */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Who This Is <span className="text-yellow-500">For</span>
          </h2>
          <p className="text-gray-500">Is this you?</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {targetAudience.map((item, i) => (
            <div 
              key={i}
              className="p-5 rounded-2xl bg-[#0d0d18] border border-gray-800 text-center hover:border-yellow-500/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-yellow-500/20 transition-colors">
                <item.icon className="w-6 h-6 text-yellow-500" />
              </div>
              <h4 className="text-white font-semibold mb-1">{item.title}</h4>
              <p className="text-gray-500 text-sm">{item.subtitle}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ============ ELITE COMMUNITY SECTION ============ */}
      <EliteCommunitySection />

      {/* ============ TESTIMONIALS ============ */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <span className="text-yellow-500 text-sm font-semibold uppercase tracking-wide">Trader Reviews</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="p-6 rounded-2xl bg-[#0d0d18] border border-gray-800">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
              <p className="text-gray-300 italic mb-6 leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-black font-bold">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-white font-medium">{t.author}</p>
                  <p className="text-gray-500 text-sm">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-10 text-gray-500 text-sm">
          <div className="flex gap-1">
            {[...Array(5)].map((_, j) => (
              <Star key={j} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            ))}
          </div>
          <span className="mx-1 sm:mx-2">•</span>
          <span>{stats[0].value} {stats[0].label}</span>
          <span className="mx-1 sm:mx-2">•</span>
          <span>{stats[1].value} {stats[1].label}</span>
        </div>
      </div>

      {/* ============ FINAL CTA ============ */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-yellow-500/20 via-[#0d0d18] to-amber-500/10 border border-yellow-500/30 overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
          
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Don't Fall <span className="text-yellow-500">Behind</span>
            </h2>
            <p className="text-gray-400 mb-8">
              While others guess, you'll have the map.
            </p>
            
            <button
              onClick={() => setShowDisclaimer(true)}
              className="w-full sm:w-auto px-6 sm:px-8 py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black text-base sm:text-lg font-bold transition-all inline-flex items-center justify-center gap-2 sm:gap-3 shadow-2xl shadow-yellow-500/20 hover:scale-105"
            >
              <Lock className="w-5 h-5" />
              Unlock Today's Report
            </button>
          </div>
        </div>
      </div>

      {/* ============ FAQ ============ */}
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-10">
          Frequently Asked Questions
        </h2>
        
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div 
              key={i}
              className="rounded-xl bg-[#0d0d18] border border-gray-800 overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <h3 className="text-white font-medium pr-4">{faq.q}</h3>
                {openFaq === i ? (
                  <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              {openFaq === i && (
                <div className="px-6 pb-4">
                  <p className="text-gray-400 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ============ FOOTER ============ */}
      <div className="border-t border-gray-800 bg-[#0a0a14] py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gray-600 text-sm">
            © 2025 Finotaur • <a href="/terms" className="hover:text-gray-400">Terms</a> • <a href="/privacy" className="hover:text-gray-400">Privacy</a>
          </p>
        </div>
      </div>
    </div>
  );
}