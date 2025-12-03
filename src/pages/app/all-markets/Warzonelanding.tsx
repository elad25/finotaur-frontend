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
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// 🔥 WHOP CONFIGURATION
// ============================================
const WHOP_NEWSLETTER_PLAN_ID = 'plan_LCBG5yJpoNtW3';
const WHOP_CHECKOUT_BASE_URL = `https://whop.com/checkout/${WHOP_NEWSLETTER_PLAN_ID}`;
const REDIRECT_URL = 'https://www.finotaur.com/app/all-markets/warzone';

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
                  ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white"
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

  // Check for payment success from redirect
  useEffect(() => {
    if (searchParams.get('payment') === 'success' || searchParams.get('checkout_status') === 'success') {
      setPaymentSuccess(true);
      // Remove the query param from URL
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

  // Open disclaimer popup instead of going directly to Whop
  const handleSubscribeClick = () => {
    setShowDisclaimer(true);
  };

  // After accepting disclaimer, go to Whop
  const handleAcceptDisclaimer = () => {
    setShowDisclaimer(false);
    
    // Build checkout URL with all parameters
    const params = new URLSearchParams();
    
    // Pre-fill email if logged in
    if (user?.email) {
      params.set('email', user.email);
    }
    
    // 🔥 IMPORTANT: Add finotaur_user_id for webhook identification
    // This ensures we can identify the user even if they use a different email
    if (user?.id) {
      params.set('metadata[finotaur_user_id]', user.id);
    }
    
    // Redirect URL after successful payment
    params.set('redirect_url', `${REDIRECT_URL}?payment=success`);
    
    const checkoutUrl = `${WHOP_CHECKOUT_BASE_URL}?${params.toString()}`;
    window.open(checkoutUrl, '_blank');
  };

  // ====================================
  // CONTENT DATA
  // ====================================

  const dailyIntelligence = [
    {
      icon: Globe,
      title: 'Institutional Macro Breakdown',
      description: 'Wall Street desk-level analysis: global growth, inflation, yield curves, FX trends, commodities, and geopolitical risk mapping.',
      tag: 'DAILY',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      icon: BarChart3,
      title: 'US Market Structure Analysis',
      description: 'Who\'s leading (Tech/AI), who\'s weakening. Breadth, flows, ETF rotation, and real institutional positioning.',
      tag: 'DAILY',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      icon: Calendar,
      title: 'Economic Calendar Playbook',
      description: 'Every major event decoded: why it matters, risk scenarios, how options/stocks/bonds will react, and actionable plays.',
      tag: 'DAILY',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      icon: Activity,
      title: 'Unusual Options Activity (UOA)',
      description: 'Institutional flow tracking: call sweeps, put blocks, large transactions, and follow-through probability analysis.',
      tag: 'DAILY',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    },
    {
      icon: LineChart,
      title: 'Technical Market Outlook',
      description: '24-72h outlook: liquidity pockets, breakout vs fakeout logic, volatility triggers, and long/short playbooks.',
      tag: 'DAILY',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10'
    },
    {
      icon: FileText,
      title: 'Earnings & Corporate Intel',
      description: 'Winners, losers, competitive impact, sector read-throughs, execution risks, and catalyst timelines.',
      tag: 'DAILY',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
  ];

  const exclusiveAccess = [
    {
      icon: MessageSquare,
      title: 'Private Discord Community',
      description: 'Connect with professional traders, share ideas, and get real-time market discussions.',
      highlight: true
    },
    {
      icon: Headphones,
      title: 'Finotaur Trading Room',
      description: 'Exclusive access to our live trading room with real-time alerts and analysis.',
      highlight: true
    },
    {
      icon: FileText,
      title: 'Daily PDF Report (8-14 pages)',
      description: 'Comprehensive institutional-grade analysis delivered to your inbox at 9:00 AM NY time.',
      highlight: false
    },
    {
      icon: PieChart,
      title: 'Chart Pack Blueprint',
      description: 'SPX vs Rates, sector leadership, BTC risk proxy, earnings overlays, and breadth charts.',
      highlight: false
    },
  ];

  const comparisons = [
    { service: 'Goldman Morning Note', price: '$2,000+/mo', included: true },
    { service: 'JPM Daily Brief', price: '$1,500+/mo', included: true },
    { service: 'UOA Services', price: '$79/mo', included: true },
    { service: 'Macro Research', price: '$150-300/mo', included: true },
    { service: 'Discord Trading Community', price: '$50-100/mo', included: true },
    { service: 'Live Trading Room', price: '$100-200/mo', included: true },
  ];

  const testimonials = [
    {
      text: "I was paying $300/month for macro research that wasn't half as good as this. The UOA section alone is worth the subscription.",
      author: "David K.",
      role: "Hedge Fund Analyst",
      avatar: "D"
    },
    {
      text: "The daily PDF is my trading bible. I read it every morning before the open. My win rate has improved significantly since joining.",
      author: "Sarah M.",
      role: "Full-Time Trader",
      avatar: "S"
    },
    {
      text: "The Discord community is incredible. Real traders sharing real ideas. No pump and dump garbage, just quality analysis.",
      author: "James R.",
      role: "Portfolio Manager",
      avatar: "J"
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
    { value: '847', label: 'Active Members' },
    { value: '94%', label: 'Renewal Rate' },
    { value: '4.9/5', label: 'Member Rating' },
    { value: '85%', label: 'Open Rate' },
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
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 via-transparent to-orange-900/20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          
          {/* Limited Spots Banner */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-red-400 text-sm font-semibold">🔥 Limited to 1,000 Members — 153 Spots Remaining</span>
            </div>
          </div>

          <div className="text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-28 h-28 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/40 mb-8 shadow-2xl shadow-red-500/20">
              <Swords className="w-14 h-14 text-red-500" />
            </div>
            
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Stop Guessing.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">
                Start Trading Like an Institution.
              </span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto mb-4 leading-relaxed">
              Get the same market intelligence that Wall Street pays <span className="text-white font-semibold">$2,000+/month</span> for — 
              delivered to your inbox every morning.
            </p>
            
            <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
              Daily institutional-grade analysis • Private Discord community • Live trading room access
            </p>

            {/* Free Trial Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-500/10 border border-green-500/40 mb-8">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-green-400 font-semibold">Start Your 7-Day Free Trial — No Credit Card Charge</span>
            </div>

            {/* CTA Section */}
            {isLoading ? (
              <div className="inline-flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
              </div>
            ) : isSubscribed ? (
              <div className="inline-flex flex-col items-center gap-4 p-8 rounded-2xl bg-[#0d0d18] border border-green-500/30 max-w-md mx-auto">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <h3 className="text-2xl font-bold text-white">Welcome to the War Zone ⚔️</h3>
                <p className="text-gray-400">Check your email and Discord for today's intel.</p>
                <div className="flex gap-3 mt-2">
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
              </div>
            ) : (
              <div className="inline-flex flex-col items-center gap-4">
                <button
                  onClick={handleSubscribeClick}
                  className="group px-8 py-5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-xl font-bold transition-all flex items-center gap-3 shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 active:scale-100"
                >
                  <Swords className="w-6 h-6" />
                  Start Free Trial — Then $20/mo
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-gray-500 text-sm">
                  No charge for 7 days • Cancel anytime during trial
                </p>
              </div>
            )}

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-6 mt-10 text-gray-500 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span>7-Day Free Trial</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Cancel Anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span>No Questions Asked</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ SOCIAL PROOF STATS ============ */}
      <div className="border-y border-gray-800 bg-[#0a0a14]">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ WHAT YOU GET - DAILY INTELLIGENCE ============ */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-6">
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">Daily 8-14 Page PDF Report</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Institutional-Grade Intelligence,<br/>Delivered Every Morning
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Everything you need to trade with confidence — the same research that hedge funds pay thousands for.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dailyIntelligence.map((item, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-[#0d0d18] border border-gray-800 hover:border-gray-700 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", item.bgColor)}>
                  <item.icon className={cn("w-6 h-6", item.color)} />
                </div>
                <span className="px-2 py-1 rounded text-xs font-bold bg-gray-800 text-gray-400">
                  {item.tag}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ============ EXCLUSIVE ACCESS SECTION ============ */}
      <div className="bg-gradient-to-b from-[#080812] via-[#0d0d18] to-[#080812] py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 mb-6">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 text-sm font-medium">Members-Only Access</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              More Than Just a Newsletter
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Join a community of serious traders and get access to our exclusive trading room.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exclusiveAccess.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "p-6 rounded-2xl border transition-all",
                  item.highlight 
                    ? "bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30 hover:border-purple-500/50" 
                    : "bg-[#0d0d18] border-gray-800 hover:border-gray-700"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                    item.highlight ? "bg-purple-500/20" : "bg-gray-800"
                  )}>
                    <item.icon className={cn("w-7 h-7", item.highlight ? "text-purple-400" : "text-gray-400")} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                      {item.title}
                      {item.highlight && <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">EXCLUSIVE</span>}
                    </h3>
                    <p className="text-gray-400 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ VALUE COMPARISON ============ */}
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            The Real Value
          </h2>
          <p className="text-gray-400 text-lg">
            What you'd pay separately vs. what you get with War Zone
          </p>
        </div>

        <div className="bg-[#0d0d18] rounded-2xl border border-gray-800 overflow-hidden">
          <div className="divide-y divide-gray-800">
            {comparisons.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-gray-300">{item.service}</span>
                </div>
                <span className="text-gray-500 line-through">{item.price}</span>
              </div>
            ))}
          </div>
          
          <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 px-6 py-6 border-t border-red-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Value</p>
                <p className="text-2xl font-bold text-white">$4,000+/month</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Your Price (after trial)</p>
                <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">$20/month</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <button
            onClick={handleSubscribeClick}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-lg font-bold transition-all inline-flex items-center gap-3 shadow-lg shadow-red-500/25"
          >
            <Shield className="w-5 h-5" />
            Start 7-Day Free Trial
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-gray-500 text-sm mt-3">
            Try everything free for 7 days • Cancel anytime
          </p>
        </div>
      </div>

      {/* ============ TESTIMONIALS ============ */}
      <div className="bg-[#0a0a14] py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">What Members Are Saying</h2>
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
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold">
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
        </div>
      </div>

      {/* ============ FINAL CTA ============ */}
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-red-500/20 via-[#0d0d18] to-orange-500/20 border border-red-500/40 overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/40 mb-6">
              <Flame className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm font-semibold">Only 153 Spots Remaining</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Trade Like a Professional?
            </h2>
            <p className="text-gray-400 text-lg mb-4 max-w-xl mx-auto">
              Join 847 traders who start every day with War Zone intelligence. 
              Your edge starts tomorrow morning.
            </p>

            {/* Trial Explanation Box */}
            <div className="inline-block bg-[#080812]/80 rounded-xl p-4 mb-8 border border-gray-800 text-left max-w-md">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="text-white font-semibold">How the Free Trial Works:</span>
              </div>
              <ul className="space-y-1 text-sm text-gray-400">
                <li>✓ <span className="text-green-400">Days 1-7:</span> Full access, no charge</li>
                <li>✓ <span className="text-yellow-400">Cancel anytime</span> during trial = pay nothing</li>
                <li>✓ <span className="text-gray-300">After 7 days:</span> $20/month (cancel anytime)</li>
              </ul>
            </div>
            
            <button
              onClick={handleSubscribeClick}
              className="px-10 py-5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-xl font-bold transition-all inline-flex items-center gap-3 shadow-2xl shadow-red-500/30 hover:scale-105"
            >
              <Swords className="w-6 h-6" />
              Start Your Free Trial
              <ExternalLink className="w-5 h-5" />
            </button>
            
            <p className="text-gray-500 text-sm mt-6">
              ✓ 7 Days Free &nbsp; ✓ Cancel Anytime &nbsp; ✓ Instant Access
            </p>
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

      {/* ============ FOOTER CTA ============ */}
      <div className="border-t border-gray-800 bg-[#0a0a14] py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gray-400 mb-4">
            Questions? Email us at <span className="text-white">support@finotaur.com</span>
          </p>
          <button
            onClick={handleSubscribeClick}
            className="px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors inline-flex items-center gap-2"
          >
            Start Free Trial
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}