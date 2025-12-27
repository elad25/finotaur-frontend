// =====================================================
// FINOTAUR WAR ZONE LANDING PAGE - v5.0.0 PREMIUM DESIGN
// =====================================================
// 
// Path: src/pages/app/journal/all-markets/WarZoneLandingSimple.tsx
// 
// v5.0.0 Changes:
// ✅ Complete redesign in Backtest Landing style
// ✅ Animated grid background with golden glow
// ✅ Shimmer text effects and premium badges
// ✅ Enhanced feature cards with hover effects
// ✅ Professional comparison table
// ✅ Animated orbs and particles
// ✅ Premium CTA sections with glass morphism
// 
// IMPORTANT: Discord access is managed by Whop automatically!
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Swords, 
  CheckCircle2, 
  Shield,
  Clock,
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
  LogIn,
  XCircle,
  CreditCard,
  Lock,
  Mail,
  RefreshCw,
  Crown,
  Rocket,
  Target,
  Zap,
  TrendingUp,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// 🔥 CONFIGURATION
// ============================================
const WHOP_NEWSLETTER_PLAN_ID = 'plan_LCBG5yJpoNtW3';
const WHOP_CHECKOUT_BASE_URL = `https://whop.com/checkout/${WHOP_NEWSLETTER_PLAN_ID}`;
const REDIRECT_URL = 'https://www.finotaur.com/app/all-markets/warzone';
const DISCORD_INVITE_URL = 'https://whop.com/joined/finotaur/discord-UJWtnrAZQebLPC/app/';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================
// TYPES
// ============================================
interface NewsletterStatus {
  newsletter_enabled: boolean;
  newsletter_status: string;
  newsletter_whop_membership_id: string | null;
  newsletter_started_at: string | null;
  newsletter_expires_at: string | null;
  newsletter_trial_ends_at: string | null;
  newsletter_cancel_at_period_end: boolean;
  days_until_expiry: number | null;
  days_until_trial_ends: number | null;
  is_in_trial: boolean;
  is_active: boolean;
}
interface NewsletterReport {
  id: string;
  date: string;
  subject: string;
  html: string;
  generatedAt: string;
}
// ============================================
// CSS ANIMATIONS (Inline Style)
// ============================================
const AnimationStyles = () => (
  <style>{`
    @keyframes gridMove {
      0% { transform: translateY(0); }
      100% { transform: translateY(50px); }
    }
    
    @keyframes shimmer {
      0% { background-position: 200% center; }
      100% { background-position: -200% center; }
    }
    
    .animate-shimmer {
      animation: shimmer 3s linear infinite;
    }
    
    .animate-bounce-slow {
      animation: bounce 3s infinite;
    }
    
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    
    @keyframes pulse-glow {
      0%, 100% { 
        box-shadow: 0 0 20px rgba(201,166,70,0.3);
      }
      50% { 
        box-shadow: 0 0 40px rgba(201,166,70,0.6);
      }
    }
    
    .animate-pulse-glow {
      animation: pulse-glow 2s ease-in-out infinite;
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    
    .animate-float {
      animation: float 6s ease-in-out infinite;
    }
    
    .delay-500 { animation-delay: 0.5s; }
    .delay-1000 { animation-delay: 1s; }
    .delay-1500 { animation-delay: 1.5s; }
  `}</style>
);
// ============================================
// REPORT VIEWER MODAL
// ============================================
const ReportViewerModal = ({
  isOpen,
  onClose,
  report,
  isLoading,
  error,
  onRefresh
}: {
  isOpen: boolean;
  onClose: () => void;
  report: NewsletterReport | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-md"
        onClick={onClose}
      />
      
      <div className={cn(
        "relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border-2 border-[#C9A646]/30 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300",
        isFullscreen ? "w-full h-full max-w-none max-h-none rounded-none" : "max-w-4xl w-full max-h-[90vh]"
      )}
           style={{ boxShadow: '0 0 60px rgba(201,166,70,0.2)' }}>
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-[#C9A646]/20 border border-[#C9A646]/30">
              <FileText className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isLoading ? 'Loading Report...' : report?.subject || 'Daily Intelligence Report'}
              </h2>
              {report && (
                <p className="text-zinc-500 text-sm">{formatDate(report.date)}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
              title="Refresh report"
            >
              <RefreshCw className={cn("w-5 h-5 text-zinc-400", isLoading && "animate-spin")} />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5 text-zinc-400" />
              ) : (
                <Maximize2 className="w-5 h-5 text-zinc-400" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={cn(
          "overflow-y-auto",
          isFullscreen ? "h-[calc(100%-72px)]" : "max-h-[calc(90vh-72px)]"
        )}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-[#C9A646]" />
                <div className="absolute inset-0 w-12 h-12 rounded-full blur-xl bg-[#C9A646]/30 animate-pulse" />
              </div>
              <p className="mt-4 text-zinc-500">Loading latest report...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="p-4 rounded-full bg-red-500/20 mb-4">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Failed to Load Report</h3>
              <p className="text-zinc-500 text-center max-w-md mb-6">{error}</p>
              <button
                onClick={onRefresh}
                className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          ) : !report ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="p-4 rounded-full bg-[#C9A646]/20 mb-4">
                <Clock className="w-10 h-10 text-[#C9A646]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No Reports Yet</h3>
              <p className="text-zinc-500 text-center max-w-md">
                The first report will be available tomorrow at 9:00 AM NY time.
              </p>
            </div>
          ) : (
            <div 
              className="report-content"
              dangerouslySetInnerHTML={{ __html: report.html }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
// ============================================
// PAYMENT SUCCESS MODAL - Premium Style
// ============================================
const PaymentSuccessModal = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      />
      
      <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border-2 border-[#C9A646]/30 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
           style={{ boxShadow: '0 0 60px rgba(201,166,70,0.3)' }}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-zinc-800 transition-colors z-10"
        >
          <X className="w-5 h-5 text-zinc-400" />
        </button>

        {/* Header with Animation */}
        <div className="relative px-6 py-10 text-center bg-gradient-to-br from-[#C9A646]/20 via-transparent to-green-500/10 border-b border-zinc-800">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-4 left-8 w-2 h-2 bg-[#C9A646] rounded-full animate-ping" />
            <div className="absolute top-12 right-12 w-1.5 h-1.5 bg-green-400 rounded-full animate-ping delay-300" />
            <div className="absolute bottom-8 left-16 w-1 h-1 bg-blue-400 rounded-full animate-ping delay-500" />
          </div>
          
          <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-6 animate-pulse-glow"
               style={{
                 background: 'linear-gradient(135deg, rgba(201,166,70,0.3) 0%, rgba(201,166,70,0.1) 100%)',
                 border: '2px solid rgba(201,166,70,0.5)'
               }}>
            <CheckCircle2 className="w-12 h-12 text-[#C9A646]" />
          </div>
          
          <h2 className="text-3xl font-black text-white mb-2">
            Welcome to <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">War Zone</span> ⚔️
          </h2>
          <p className="text-zinc-400">
            Your subscription is now active
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-zinc-900/80 rounded-xl p-5 border border-zinc-800 mb-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C9A646]" />
              What Happens Next?
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Check Your Email</p>
                  <p className="text-zinc-500 text-xs">Your first report arrives tomorrow at 9:00 AM NY time</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Join the Discord</p>
                  <p className="text-zinc-500 text-xs">Click below to join - Whop will grant your access automatically</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center border border-green-500/30">
                  <Calendar className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">7-Day Free Trial</p>
                  <p className="text-zinc-500 text-xs">You won't be charged during your trial period</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-[#C9A646]/10 rounded-xl p-4 border border-[#C9A646]/30 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#C9A646] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[#C9A646] font-semibold text-sm">Discord Access via Whop</p>
                <p className="text-zinc-400 text-sm mt-1">
                  Use the same email you subscribed with. Whop automatically manages your Discord role.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#5865F2]/30"
            >
              <MessageSquare className="w-5 h-5" />
              Join Discord Community
              <ExternalLink className="w-4 h-4" />
            </a>
            
            <button
              onClick={onClose}
              className="group w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                backgroundSize: '200% auto',
                color: 'black',
                boxShadow: '0 0 30px rgba(201,166,70,0.4)'
              }}
            >
              Continue to War Zone
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// DISCLAIMER POPUP - Premium Style
// ============================================
const DisclaimerPopup = ({ 
  isOpen, 
  onClose, 
  onAccept,
  isProcessing
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAccept: () => void;
  isProcessing: boolean;
}) => {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      />
      
      <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border-2 border-zinc-700 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#C9A646]/20 border border-[#C9A646]/30">
              <AlertCircle className="w-5 h-5 text-[#C9A646]" />
            </div>
            <h2 className="text-lg font-bold text-white">Important Disclaimer</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="bg-zinc-900/80 rounded-xl p-5 border border-zinc-800 mb-6">
            <h3 className="text-[#C9A646] font-bold text-sm uppercase tracking-wide mb-3">
              FINOTAUR MARKET INTELLIGENCE DISCLAIMER
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              This report is for <span className="text-white font-semibold">informational and educational purposes only</span>. 
              It does not constitute investment advice, trading advice, or a recommendation to buy or sell any security.
            </p>
            <p className="text-zinc-400 text-sm leading-relaxed mt-3">
              Finotaur is <span className="text-white font-semibold">not a licensed investment adviser, broker-dealer, or financial institution</span>. 
              Users are solely responsible for their own investment decisions.
            </p>
          </div>

          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-400 font-semibold text-sm">7-Day Free Trial</p>
                <p className="text-zinc-400 text-sm mt-1">
                  You won't be charged for the first 7 days. Cancel anytime during the trial period.
                </p>
              </div>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={isProcessing}
                className="sr-only"
              />
              <div className={cn(
                "w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center",
                agreed 
                  ? "bg-[#C9A646] border-[#C9A646]" 
                  : "border-zinc-600 group-hover:border-zinc-500"
              )}>
                {agreed && <CheckCircle2 className="w-4 h-4 text-black" />}
              </div>
            </div>
            <span className="text-zinc-300 text-sm leading-relaxed">
              I have read and understood the disclaimer above. I am responsible for my own trading decisions.
            </span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-3 rounded-xl border-2 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onAccept}
              disabled={!agreed || isProcessing}
              className={cn(
                "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                agreed && !isProcessing
                  ? "text-black shadow-lg"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
              style={agreed && !isProcessing ? {
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                boxShadow: '0 0 30px rgba(201,166,70,0.4)'
              } : {}}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  Start Free Trial
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// LOGIN REQUIRED POPUP - Premium Style
// ============================================
const LoginRequiredPopup = ({ 
  isOpen, 
  onClose,
  onLogin
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onLogin: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      />
      
      <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border-2 border-zinc-700 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30">
              <LogIn className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Login Required</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-zinc-400 text-center mb-6">
            Please login or create an account to subscribe to War Zone Intelligence.
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={onLogin}
              className="group w-full py-4 rounded-xl font-bold text-black transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                boxShadow: '0 0 30px rgba(201,166,70,0.4)'
              }}
            >
              <LogIn className="w-5 h-5" />
              Login / Sign Up
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl border-2 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// CANCEL SUBSCRIPTION MODAL - Premium Style
// ============================================
const CancelSubscriptionModal = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
  trialDaysRemaining
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  trialDaysRemaining: number | null;
}) => {
  if (!isOpen) return null;

  const isInTrial = trialDaysRemaining !== null && trialDaysRemaining > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      />
      
      <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border-2 border-red-500/30 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
           style={{ boxShadow: '0 0 40px rgba(239,68,68,0.2)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/30">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Cancel Subscription</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6">
          {isInTrial ? (
            <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30 mb-6">
              <p className="text-green-400 font-semibold text-sm">
                You're still in your free trial ({trialDaysRemaining} days remaining)
              </p>
              <p className="text-zinc-400 text-sm mt-1">
                Cancel now and you won't be charged anything.
              </p>
            </div>
          ) : (
            <div className="bg-[#C9A646]/10 rounded-xl p-4 border border-[#C9A646]/30 mb-6">
              <p className="text-[#C9A646] font-semibold text-sm">
                Your subscription will remain active until the end of your billing period.
              </p>
            </div>
          )}

          <p className="text-zinc-400 text-center mb-6">
            Are you sure you want to cancel? You'll lose access to:
          </p>

          <ul className="space-y-3 mb-6">
            {[
              'Daily institutional-grade reports',
              'Private Discord community (role removed)',
              'Live trading room access'
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-zinc-400 text-sm">
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                </div>
                {item}
              </li>
            ))}
          </ul>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-full py-4 rounded-xl font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                boxShadow: '0 0 30px rgba(201,166,70,0.4)'
              }}
            >
              Keep My Subscription
            </button>
            
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="w-full py-3 rounded-xl border-2 border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/50 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Subscription'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ACTIVE SUBSCRIBER VIEW - Premium Style
// ============================================
const ActiveSubscriberView = ({
  newsletterStatus,
  onCancelClick,
  onViewReport,
  isLoadingReport
}: {
  newsletterStatus: NewsletterStatus;
  onCancelClick: () => void;
  onViewReport: () => void;
  isLoadingReport: boolean;
}) => {
  const isInTrial = newsletterStatus.is_in_trial;
  const trialDaysRemaining = newsletterStatus.days_until_trial_ends;
  const expiresAt = newsletterStatus.newsletter_expires_at;
  const isCancelScheduled = newsletterStatus.newsletter_cancel_at_period_end;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimationStyles />
      
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
        <div 
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(201,166,70,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(201,166,70,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite'
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C9A646]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Trial Banner */}
      {isInTrial && trialDaysRemaining !== null && (
        <div className="relative z-10 bg-[#C9A646]/10 border-b border-[#C9A646]/30 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
            <Clock className="w-5 h-5 text-[#C9A646]" />
            <p className="text-[#C9A646] text-sm font-semibold">
              {trialDaysRemaining > 0 
                ? `Your free trial ends in ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''}`
                : 'Your free trial ends today'}
            </p>
          </div>
        </div>
      )}

      {/* Cancel Scheduled Banner */}
      {isCancelScheduled && (
        <div className="relative z-10 bg-red-500/10 border-b border-red-500/30 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400 text-sm font-semibold">
              Your subscription will be cancelled at the end of the billing period
            </p>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        {/* Welcome Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full mb-8 animate-pulse-glow"
               style={{
                 background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.05) 100%)',
                 border: '2px solid rgba(201,166,70,0.3)'
               }}>
            <Crown className="w-5 h-5 text-[#C9A646]" />
            <span className="text-sm font-bold text-[#C9A646]">
              {isInTrial ? 'TRIAL ACTIVE' : 'SUBSCRIPTION ACTIVE'}
            </span>
          </div>
          
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-2xl mb-8 animate-float"
               style={{
                 background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.05) 100%)',
                 border: '2px solid rgba(201,166,70,0.4)',
                 boxShadow: '0 0 60px rgba(201,166,70,0.3)'
               }}>
            <Swords className="w-14 h-14 text-[#C9A646]" />
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
              Welcome to the
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent animate-shimmer bg-[length:200%_auto]">
              War Zone ⚔️
            </span>
          </h1>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Discord */}
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group p-8 rounded-2xl border border-[#5865F2]/30 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all duration-300 hover:border-[#5865F2]/60 hover:shadow-xl hover:shadow-[#5865F2]/10"
          >
            <div className="w-14 h-14 rounded-xl bg-[#5865F2]/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-[#5865F2]/30">
              <MessageSquare className="w-7 h-7 text-[#5865F2]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              Discord Community
              <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-[#5865F2] transition-colors" />
            </h3>
            <p className="text-zinc-400 leading-relaxed text-sm mb-2">
              Join 847+ traders in real-time discussions
            </p>
            <p className="text-xs text-zinc-600">Use your Whop email to get access</p>
          </a>

          {/* Latest Report */}
          <button
            onClick={onViewReport}
            disabled={isLoadingReport}
            className="group p-8 rounded-2xl border border-[#C9A646]/30 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all duration-300 hover:border-[#C9A646]/60 hover:shadow-xl hover:shadow-[#C9A646]/10 text-left disabled:opacity-50"
          >
            <div className="w-14 h-14 rounded-xl bg-[#C9A646]/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-[#C9A646]/30">
              {isLoadingReport ? (
                <Loader2 className="w-7 h-7 text-[#C9A646] animate-spin" />
              ) : (
                <FileText className="w-7 h-7 text-[#C9A646]" />
              )}
            </div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              Latest Report
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-[#C9A646] transition-colors" />
            </h3>
            <p className="text-zinc-400 text-sm">
              {isLoadingReport ? 'Loading...' : "View today's market intelligence"}
            </p>
          </button>

          {/* Trading Room */}
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group p-8 rounded-2xl border border-purple-500/30 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all duration-300 hover:border-purple-500/60 hover:shadow-xl hover:shadow-purple-500/10"
          >
            <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-purple-500/30">
              <Headphones className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              Trading Room
              <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 transition-colors" />
            </h3>
            <p className="text-zinc-400 text-sm">
              Live analysis and real-time alerts
            </p>
          </a>
        </div>

        {/* Subscription Info Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden mb-10">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-zinc-400" />
              <h3 className="text-white font-bold">Subscription Details</h3>
            </div>
            <span className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold",
              isCancelScheduled 
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : isInTrial 
                  ? "bg-[#C9A646]/20 text-[#C9A646] border border-[#C9A646]/30" 
                  : "bg-green-500/20 text-green-400 border border-green-500/30"
            )}>
              {isCancelScheduled ? 'CANCELLING' : isInTrial ? 'FREE TRIAL' : 'ACTIVE'}
            </span>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-zinc-500 text-sm mb-1">Plan</p>
                <p className="text-white font-semibold">War Zone Intelligence</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm mb-1">Price</p>
                <p className="text-white font-semibold">
                  {isInTrial ? '$0.00 (Trial)' : '$20.00/month'}
                </p>
              </div>
              {isInTrial && trialDaysRemaining !== null && (
                <div>
                  <p className="text-zinc-500 text-sm mb-1">Trial Ends</p>
                  <p className="text-[#C9A646] font-semibold">
                    {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining
                  </p>
                </div>
              )}
              {expiresAt && !isInTrial && (
                <div>
                  <p className="text-zinc-500 text-sm mb-1">
                    {isCancelScheduled ? 'Access Until' : 'Next Billing'}
                  </p>
                  <p className={cn(
                    "font-semibold",
                    isCancelScheduled ? "text-red-400" : "text-white"
                  )}>
                    {new Date(expiresAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Cancel Section */}
            <div className="mt-6 pt-6 border-t border-zinc-800">
              {!isCancelScheduled ? (
                <button
                  onClick={onCancelClick}
                  className="text-zinc-600 hover:text-red-400 text-sm transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Subscription
                </button>
              ) : (
                <p className="text-zinc-600 text-sm">
                  Your subscription will end on {expiresAt && new Date(expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* What's Included */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C9A646]" />
            What's Included
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              'Daily 8-14 page PDF report',
              'Institutional macro breakdown',
              'Unusual Options Activity (UOA)',
              'Technical outlook (24-72h)',
              'Private Discord community',
              'Finotaur Trading Room',
              'Real-time alerts',
              'Earnings & corporate intel'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                </div>
                <span className="text-zinc-400 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Support */}
        <div className="mt-10 text-center">
          <p className="text-zinc-600 text-sm">
            Questions? Email us at{' '}
            <a href="mailto:support@finotaur.com" className="text-[#C9A646] hover:underline transition-colors">
              support@finotaur.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function WarZoneLandingSimple() {
const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [newsletterStatus, setNewsletterStatus] = useState<NewsletterStatus | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  
  // Report Viewer State
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [currentReport, setCurrentReport] = useState<NewsletterReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // Check subscription status
  const checkSubscriptionStatus = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('get_newsletter_status', {
        p_user_id: user.id
      });
      
      if (error) {
        console.error('Error checking subscription:', error);
        const { data: profile } = await supabase
          .from('profiles')
          .select('newsletter_enabled, newsletter_status, newsletter_trial_ends_at, newsletter_expires_at, newsletter_whop_membership_id, newsletter_cancel_at_period_end')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          const trialEndsAt = profile.newsletter_trial_ends_at 
            ? new Date(profile.newsletter_trial_ends_at) 
            : null;
          const now = new Date();
          
          setNewsletterStatus({
            newsletter_enabled: profile.newsletter_enabled ?? false,
            newsletter_status: profile.newsletter_status ?? 'inactive',
            newsletter_whop_membership_id: profile.newsletter_whop_membership_id,
            newsletter_started_at: null,
            newsletter_expires_at: profile.newsletter_expires_at,
            newsletter_trial_ends_at: profile.newsletter_trial_ends_at,
            newsletter_cancel_at_period_end: profile.newsletter_cancel_at_period_end ?? false,
            days_until_expiry: null,
            days_until_trial_ends: trialEndsAt 
              ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
              : null,
            is_in_trial: profile.newsletter_status === 'trial',
            is_active: profile.newsletter_enabled && ['active', 'trial'].includes(profile.newsletter_status ?? '')
          });
        }
      } else if (data && data.length > 0) {
        setNewsletterStatus(data[0]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Check for payment success from redirect
  useEffect(() => {
    const paymentParam = searchParams.get('payment');
    const checkoutStatus = searchParams.get('checkout_status');
    
    if (paymentParam === 'success' || checkoutStatus === 'success') {
      console.log('🎉 Payment success detected');
      setShowSuccessModal(true);
      window.history.replaceState({}, '', window.location.pathname);
      setPollCount(1);
    }
  }, [searchParams]);

  // Poll for subscription status after payment
  useEffect(() => {
    if (pollCount > 0 && pollCount <= 15) {
      const timer = setTimeout(() => {
        checkSubscriptionStatus().then(() => {
          if (newsletterStatus?.is_active) {
            console.log('✅ Subscription active, stopping poll');
            setPollCount(0);
          } else {
            console.log(`🔄 Polling attempt ${pollCount}/15...`);
            setPollCount(prev => prev + 1);
          }
        });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [pollCount, newsletterStatus?.is_active, checkSubscriptionStatus]);

  // Initial load
  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  // Fetch Latest Report
// Fetch Latest Report
  const fetchLatestReport = useCallback(async () => {
    setIsLoadingReport(true);
    setReportError(null);
    
    try {
      // Get session directly from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setReportError('Please login to view reports');
        setIsLoadingReport(false);
        return;
      }
      
      const response = await fetch(`${API_BASE}/api/newsletter/latest`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.requiresSubscription) {
          setReportError('You need an active subscription to view reports');
        } else {
          setReportError(data.error || 'Failed to load report');
        }
        return;
      }
      
      if (data.success && data.data) {
        setCurrentReport(data.data);
      } else {
        setCurrentReport(null);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      setReportError('Failed to load report. Please try again.');
    } finally {
      setIsLoadingReport(false);
    }
  }, []);

  // Handlers
  const handleSubscribeClick = () => {
    if (!user) {
      setShowLoginRequired(true);
      return;
    }
    setShowDisclaimer(true);
  };

  const handleLoginRedirect = () => {
    sessionStorage.setItem('return_after_login', window.location.pathname);
    navigate('/login');
  };

  const handleAcceptDisclaimer = async () => {
    if (!user?.id || !user?.email) {
      setShowDisclaimer(false);
      setShowLoginRequired(true);
      return;
    }

    setIsProcessing(true);
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('newsletter_unsubscribe_token')
        .eq('id', user.id)
        .single();
      
      if (!profile?.newsletter_unsubscribe_token) {
        await supabase
          .from('profiles')
          .update({ 
            newsletter_unsubscribe_token: crypto.randomUUID(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }
      
      const params = new URLSearchParams();
      params.set('email', user.email);
      params.set('metadata[finotaur_user_id]', user.id);
      params.set('redirect_url', `${REDIRECT_URL}?payment=success`);
      
      const checkoutUrl = `${WHOP_CHECKOUT_BASE_URL}?${params.toString()}`;
      
      console.log('✅ Redirecting to Whop:', { userId: user.id, email: user.email });
      
      setShowDisclaimer(false);
      window.location.href = checkoutUrl;
      
    } catch (error) {
      console.error('Error:', error);
      setIsProcessing(false);
      alert('An error occurred. Please try again.');
    }
  };

 const handleCancelSubscription = async () => {
  if (!user?.id || !newsletterStatus?.newsletter_whop_membership_id) return;
  
  setIsCancelling(true);
  
  try {
    const { data, error } = await supabase.functions.invoke('newsletter-cancel', {
      body: {
        userId: user.id,
        membershipId: newsletterStatus.newsletter_whop_membership_id
      }
    });

    if (error) throw error;
    
    if (data?.success) {
      await checkSubscriptionStatus();
      setShowCancelModal(false);
      alert('Your subscription has been cancelled. You will retain access until the end of your billing period.');
    } else {
      throw new Error(data?.error || 'Failed to cancel');
    }
  } catch (error) {
    console.error('Cancel error:', error);
    alert('Failed to cancel subscription. Please contact support@finotaur.com');
  } finally {
    setIsCancelling(false);
  }
};

const handleViewReport = () => {
    setShowReportViewer(true);
    fetchLatestReport();
  };

  // ====================================
  // CONTENT DATA
  // ====================================
  const dailyIntelligence = [
    {
      icon: Globe,
      title: 'Institutional Macro Breakdown',
      description: 'Wall Street desk-level analysis: global growth, inflation, yield curves, FX trends.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30'
    },
    {
      icon: BarChart3,
      title: 'US Market Structure',
      description: "Who's leading, who's weakening. Breadth, flows, ETF rotation.",
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30'
    },
    {
      icon: Calendar,
      title: 'Economic Calendar',
      description: 'Every major event decoded with risk scenarios and actionable plays.',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30'
    },
    {
      icon: Activity,
      title: 'Unusual Options Activity',
      description: 'Institutional flow tracking: call sweeps, put blocks, large transactions.',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30'
    },
    {
      icon: LineChart,
      title: 'Technical Outlook',
      description: '24-72h outlook: liquidity pockets, breakout logic, volatility triggers.',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30'
    },
    {
      icon: TrendingUp,
      title: 'Earnings Intel',
      description: 'Winners, losers, competitive impact, sector read-throughs.',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30'
    },
  ];

  const exclusiveAccess = [
    {
      icon: MessageSquare,
      title: 'Private Discord Community',
      description: 'Connect with professional traders and get real-time discussions.',
      highlight: true,
      color: 'text-[#5865F2]',
      bgColor: 'bg-[#5865F2]/10',
      borderColor: 'border-[#5865F2]/30'
    },
    {
      icon: Headphones,
      title: 'Finotaur Trading Room',
      description: 'Exclusive access to live trading room with real-time alerts.',
      highlight: true,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30'
    },
    {
      icon: FileText,
      title: 'Daily PDF Report (8-14 pages)',
      description: 'Institutional-grade analysis at 9:00 AM NY time.',
      highlight: false,
      color: 'text-[#C9A646]',
      bgColor: 'bg-[#C9A646]/10',
      borderColor: 'border-[#C9A646]/30'
    },
    {
      icon: PieChart,
      title: 'Chart Pack Blueprint',
      description: 'SPX vs Rates, sector leadership, BTC risk proxy, breadth charts.',
      highlight: false,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30'
    },
  ];

  const comparisons = [
    { service: 'Goldman Morning Note', price: '$2,000+/mo' },
    { service: 'JPM Daily Brief', price: '$1,500+/mo' },
    { service: 'UOA Services', price: '$79/mo' },
    { service: 'Macro Research', price: '$150-300/mo' },
    { service: 'Discord Trading Community', price: '$50-100/mo' },
    { service: 'Live Trading Room', price: '$100-200/mo' },
  ];

  const testimonials = [
    {
      text: "I was paying $300/month for macro research that wasn't half as good. The UOA section alone is worth it.",
      author: "David K.",
      role: "Hedge Fund Analyst",
      avatar: "D"
    },
    {
      text: "The daily PDF is my trading bible. My win rate has improved significantly since joining.",
      author: "Sarah M.",
      role: "Full-Time Trader",
      avatar: "S"
    },
    {
      text: "The Discord community is incredible. Real traders sharing real ideas. No pump and dump garbage.",
      author: "James R.",
      role: "Portfolio Manager",
      avatar: "J"
    }
  ];

  const faqs = [
    {
      q: "How does the 7-day free trial work?",
      a: "You get full access to everything for 7 days completely free. Cancel before day 7 and you'll never be charged."
    },
    {
      q: "What exactly do I get?",
      a: "Daily 8-14 page PDF, private Discord, trading room access, real-time alerts. Delivered at 9:00 AM NY time."
    },
    {
      q: "How do I get Discord access?",
      a: "After subscribing, click the Discord link and use the same email you subscribed with. Whop automatically grants your role."
    },
    {
      q: "What happens to my Discord access if I cancel?",
      a: "Whop automatically removes your Discord role when your subscription ends. You can always resubscribe to regain access."
    },
    {
      q: "When do I receive the daily report?",
      a: "Every trading day at 9:00 AM New York time. Breaking alerts come via Discord throughout the day."
    },
    {
      q: "Can I cancel anytime?",
      a: "Absolutely. Cancel with one click, no questions asked. During trial, cancel anytime and pay nothing."
    }
  ];

  const stats = [
    { value: '847', label: 'Active Members' },
    { value: '94%', label: 'Renewal Rate' },
    { value: '4.9/5', label: 'Member Rating' },
    { value: '85%', label: 'Open Rate' },
  ];

  // ====================================
  // RENDER - LOADING
  // ====================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="w-14 h-14 animate-spin text-[#C9A646]" />
            <div className="absolute inset-0 w-14 h-14 rounded-full blur-xl bg-[#C9A646]/30 animate-pulse" />
          </div>
          <p className="text-zinc-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // ====================================
  // RENDER - ACTIVE SUBSCRIBER VIEW
  // ====================================
  if (newsletterStatus?.is_active) {
    return (
      <>
        <PaymentSuccessModal 
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
        />
        
        <CancelSubscriptionModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelSubscription}
          isProcessing={isCancelling}
          trialDaysRemaining={newsletterStatus.days_until_trial_ends}
        />
                {/* 🔥 הוסף את זה! */}
        <ReportViewerModal
          isOpen={showReportViewer}
          onClose={() => setShowReportViewer(false)}
          report={currentReport}
          isLoading={isLoadingReport}
          error={reportError}
          onRefresh={fetchLatestReport}
        />
        <ActiveSubscriberView
          newsletterStatus={newsletterStatus}
          onCancelClick={() => setShowCancelModal(true)}
          onViewReport={handleViewReport}
          isLoadingReport={isLoadingReport}
        />
      </>
    );
  }

  // ====================================
  // RENDER - LANDING PAGE (Non-subscribers)
  // ====================================
  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimationStyles />
      
      {/* 🌟 ANIMATED BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
        {/* Animated grid */}
        <div 
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(201,166,70,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(201,166,70,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite'
          }}
        />
        
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C9A646]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Modals */}
      <PaymentSuccessModal 
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          checkSubscriptionStatus();
        }}
      />
      
      <DisclaimerPopup 
        isOpen={showDisclaimer}
        onClose={() => setShowDisclaimer(false)}
        onAccept={handleAcceptDisclaimer}
        isProcessing={isProcessing}
      />
      
      <LoginRequiredPopup
        isOpen={showLoginRequired}
        onClose={() => setShowLoginRequired(false)}
        onLogin={handleLoginRedirect}
      />

      {/* ============ HERO SECTION ============ */}
      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-6 pt-6 pb-10">
          
          {/* Limited Spots Banner */}
          <div className="flex justify-center mb-5">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full"
                 style={{
                   background: 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(249,115,22,0.1) 100%)',
                   border: '2px solid rgba(239,68,68,0.4)',
                   boxShadow: '0 0 25px rgba(239,68,68,0.3)'
                 }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-red-400 text-sm font-bold">🔥 Limited to 1,000 Members — 153 Spots Remaining</span>
            </div>
          </div>

          <div className="text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5"
                 style={{
                   background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.05) 100%)',
                   border: '2px solid rgba(201,166,70,0.4)',
                   boxShadow: '0 0 50px rgba(201,166,70,0.4)'
                 }}>
              <Swords className="w-10 h-10 text-[#C9A646]" />
            </div>
            
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight">
              <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
                Stop Guessing.
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent animate-shimmer bg-[length:200%_auto]">
                Start Trading Like an Institution.
              </span>
            </h1>
            
            <p className="text-lg lg:text-xl text-zinc-300 max-w-3xl mx-auto mb-3 leading-relaxed">
              Get the same market intelligence that Wall Street pays <span className="text-white font-bold">$2,000+/month</span> for — 
              delivered to your inbox every morning.
            </p>
            
            <p className="text-base text-zinc-500 max-w-2xl mx-auto mb-6">
              Daily institutional-grade analysis • Private Discord community • Live trading room access
            </p>

            {/* Trial Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-500/10 border-2 border-green-500/40 mb-6"
                 style={{ boxShadow: '0 0 20px rgba(34,197,94,0.2)' }}>
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-green-400 font-bold text-sm">Start Your 7-Day Free Trial — No Credit Card Charge</span>
            </div>

            {/* CTA Section */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <button
                onClick={handleSubscribeClick}
                className="group relative px-8 py-4 rounded-xl font-black text-lg text-black overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  backgroundSize: '200% auto',
                  boxShadow: '0 0 50px rgba(201,166,70,0.6), inset 0 2px 0 rgba(255,255,255,0.3)'
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Swords className="w-5 h-5" />
                  Start Free Trial — Then $20/mo
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
              <p className="text-zinc-500 text-xs">
                {user ? 'No charge for 7 days • Cancel anytime' : 'Login required • No charge for 7 days'}
              </p>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-6 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>7-Day Free Trial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Cancel Anytime</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>No Questions Asked</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ SOCIAL PROOF STATS ============ */}
      <div className="relative z-10 border-y border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-[#C9A646] to-[#F4D97B] bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-zinc-500 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ WHAT YOU GET - DAILY INTELLIGENCE ============ */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-500/10 border border-blue-500/30 mb-6">
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-bold">Daily 8-14 Page PDF Report</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
            Institutional-Grade Intelligence,
            <br />
            <span className="bg-gradient-to-r from-[#C9A646] to-[#F4D97B] bg-clip-text text-transparent">
              Delivered Every Morning
            </span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Everything you need to trade with confidence — the same research hedge funds pay thousands for.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dailyIntelligence.map((item, i) => (
            <div
              key={i}
              className={cn(
                "group p-8 rounded-2xl border bg-zinc-900/50 hover:bg-zinc-900/80 transition-all duration-300 hover:shadow-xl",
                item.borderColor
              )}
              style={{
                boxShadow: `0 0 0 rgba(201,166,70,0)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 20px 40px rgba(201,166,70,0.1)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `0 0 0 rgba(201,166,70,0)`;
              }}
            >
              <div className="flex items-start justify-between mb-6">
                <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border", item.bgColor, item.borderColor)}>
                  <item.icon className={cn("w-7 h-7", item.color)} />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-800 text-[#C9A646] border border-[#C9A646]/30">
                  DAILY
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ============ EXCLUSIVE ACCESS SECTION ============ */}
      <div className="relative z-10 py-20 bg-gradient-to-b from-transparent via-zinc-950/50 to-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-500/10 border border-purple-500/30 mb-6">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 text-sm font-bold">Members-Only Access</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
              More Than Just a Newsletter
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Join a community of serious traders and get exclusive trading room access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exclusiveAccess.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "group p-8 rounded-2xl border transition-all duration-300 hover:shadow-xl",
                  item.highlight 
                    ? "bg-gradient-to-br from-purple-500/10 via-zinc-900/50 to-blue-500/10 border-purple-500/30 hover:border-purple-500/50" 
                    : `bg-zinc-900/50 ${item.borderColor} hover:bg-zinc-900/80`
                )}
              >
                <div className="flex items-start gap-5">
                  <div className={cn(
                    "w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform border",
                    item.bgColor,
                    item.borderColor
                  )}>
                    <item.icon className={cn("w-8 h-8", item.color)} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                      {item.title}
                      {item.highlight && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold">EXCLUSIVE</span>
                      )}
                    </h3>
                    <p className="text-zinc-400 leading-relaxed">{item.description}</p>
                    
                    {/* Discord Lock */}
                    {item.title.includes('Discord') && (
                      <div className="mt-4 flex items-center gap-2 text-zinc-600">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm">Subscribe to unlock access</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ VALUE COMPARISON ============ */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            The Real Value
          </h2>
          <p className="text-lg text-zinc-400">
            What you'd pay separately vs. what you get with War Zone
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                {comparisons.map((item, i) => (
                  <tr key={i} className="border-b border-zinc-800 last:border-0">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center border border-green-500/30">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </div>
                        <span className="text-zinc-300 font-medium">{item.service}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-zinc-500 line-through font-medium">{item.price}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-8 border-t border-[#C9A646]/30"
               style={{
                 background: 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.05) 100%)'
               }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm mb-1">Total Value</p>
                <p className="text-3xl font-black text-white">$4,000+/month</p>
              </div>
              <div className="text-right">
                <p className="text-zinc-400 text-sm mb-1">Your Price (after trial)</p>
                <p className="text-4xl font-black bg-gradient-to-r from-[#C9A646] to-[#F4D97B] bg-clip-text text-transparent">$20/month</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={handleSubscribeClick}
            className="group px-10 py-5 rounded-xl font-bold text-lg text-black transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl inline-flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
              boxShadow: '0 0 40px rgba(201,166,70,0.5)'
            }}
          >
            <Shield className="w-6 h-6" />
            Start 7-Day Free Trial
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-zinc-500 text-sm mt-4">
            {user ? 'Try everything free for 7 days • Cancel anytime' : 'Login required • Try free for 7 days'}
          </p>
        </div>
      </div>

      {/* ============ TESTIMONIALS ============ */}
      <div className="relative z-10 py-20 bg-zinc-950/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-white mb-4">What Members Are Saying</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-[#C9A646]/30 transition-all">
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 fill-[#C9A646] text-[#C9A646]" />
                  ))}
                </div>
                <p className="text-zinc-300 italic mb-8 leading-relaxed text-lg">"{t.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-black font-black text-lg"
                       style={{
                         background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)'
                       }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white font-bold">{t.author}</p>
                    <p className="text-zinc-500 text-sm">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ FINAL CTA ============ */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <div className="relative p-10 lg:p-14 rounded-3xl overflow-hidden"
             style={{
               background: 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.05) 50%, rgba(0,0,0,0.3) 100%)',
               backdropFilter: 'blur(20px)',
               border: '2px solid rgba(201,166,70,0.3)',
               boxShadow: '0 20px 60px rgba(201,166,70,0.3)'
             }}>
          {/* Animated glow */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#C9A646]/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          
          <div className="relative text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500/20 border border-red-500/40 mb-8">
              <Flame className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm font-bold">Only 153 Spots Remaining</span>
            </div>
            
            <h2 className="text-3xl lg:text-4xl font-black text-white mb-6">
              Ready to Trade Like a Professional?
            </h2>
            <p className="text-lg text-zinc-400 mb-6 max-w-xl mx-auto">
              Join 847 traders who start every day with War Zone intelligence.
            </p>

            <div className="inline-block bg-zinc-950/80 rounded-xl p-6 mb-10 border border-zinc-800 text-left max-w-md">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="text-white font-bold">How the Free Trial Works:</span>
              </div>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>✓ <span className="text-green-400 font-medium">Days 1-7:</span> Full access, no charge</li>
                <li>✓ <span className="text-[#C9A646] font-medium">Cancel anytime</span> during trial = pay nothing</li>
                <li>✓ <span className="text-zinc-300 font-medium">After 7 days:</span> $20/month (cancel anytime)</li>
              </ul>
            </div>
            
            <button
              onClick={handleSubscribeClick}
              className="group px-12 py-6 rounded-xl font-black text-xl text-black transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl inline-flex items-center gap-3"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                backgroundSize: '200% auto',
                boxShadow: '0 0 60px rgba(201,166,70,0.7), inset 0 2px 0 rgba(255,255,255,0.4)'
              }}
            >
              <Rocket className="w-7 h-7" />
              Start Your Free Trial
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <p className="text-zinc-500 text-sm mt-8">
              {user 
                ? '✓ 7 Days Free   ✓ Cancel Anytime   ✓ Instant Access'
                : '✓ Login Required   ✓ 7 Days Free   ✓ Cancel Anytime'}
            </p>
          </div>
        </div>
      </div>

      {/* ============ FAQ ============ */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-black text-white text-center mb-12">
          Frequently Asked Questions
        </h2>
        
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div 
              key={i}
              className="rounded-xl bg-zinc-900/50 border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <h3 className="text-white font-bold pr-4">{faq.q}</h3>
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                  openFaq === i ? "bg-[#C9A646]/20" : "bg-zinc-800"
                )}>
                  {openFaq === i ? (
                    <ChevronUp className="w-5 h-5 text-[#C9A646]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-zinc-500" />
                  )}
                </div>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5">
                  <p className="text-zinc-400 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ============ FOOTER CTA ============ */}
      <div className="relative z-10 border-t border-zinc-800 bg-zinc-950/50 py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-zinc-500 mb-6">
            Questions? Email us at{' '}
            <a href="mailto:support@finotaur.com" className="text-[#C9A646] hover:underline font-medium">
              support@finotaur.com
            </a>
          </p>
          <button
            onClick={handleSubscribeClick}
            className="px-8 py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors inline-flex items-center gap-2 border border-zinc-700 hover:border-[#C9A646]/50"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 🔒 BOTTOM BADGE */}
      <div className="relative z-10 text-center pb-12">
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-zinc-900/50 border border-zinc-800">
          <Shield className="w-5 h-5 text-[#C9A646]" />
          <span className="text-sm text-zinc-500">
            Bank-grade security • Your data stays yours • Cancel anytime
          </span>
        </div>
      </div>
    </div>
  );
}