// =====================================================
// FINOTAUR WAR ZONE LANDING PAGE - OPTIMIZED v3.0
// 
// 🔥 OPTIMIZATIONS:
// - External CSS (browser cached)
// - React.memo on all sub-components
// - useMemo/useCallback for expensive operations
// - Code splitting for modals (lazy loaded)
// - Reduced re-renders
// 
// ✅ 100% SAME UI & LOGIC - Just faster!
// =====================================================

import { useState, useCallback, memo, lazy, Suspense, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/providers/AuthProvider';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { 
  Shield, Clock, ArrowRight, FileText,
  Loader2, Globe, Sparkles, Crown, Rocket, 
  TrendingUp, Check, Target, BarChart3, Zap, Activity,
  ChevronDown, XCircle, Headphones,
} from 'lucide-react';

// 🔥 Use the ORIGINAL hooks from useUserStatus
import { useWarZoneStatus, useTopSecretStatus, useUserMeta } from '@/hooks/useUserStatus';

// Visual components (same folder)
import { 
  ParticleBackground, 
  SparkleEffect, 
  GoldenDivider, 
  DiscordIcon, 
  CompassIcon,
  BellIcon,
  FullPageLoader,
} from './VisualComponents';

// Sub-components (same folder)
import {
  CONFIG,
  YEARLY_SAVINGS,
  BillingToggle,
  StatsBar,
  FeatureIcons,
  type BillingInterval,
} from './WarzonelandingComponents';

// Active subscriber view (same folder)
import ActiveSubscriberView from './ActiveSubscriberView';

// Lazy load modals (code splitting) - from modals subfolder
const DisclaimerPopup = lazy(() => import('./modals/DisclaimerPopup'));
const LoginRequiredPopup = lazy(() => import('./modals/LoginRequiredPopup'));
const CancelSubscriptionModal = lazy(() => import('./modals/CancelSubscriptionModal'));

// Import external CSS
import '@/styles/warzone.css';

// ============================================
// DATA CONSTANTS
// ============================================

const TESTIMONIALS = [
  { id: 1, name: "David Chen", role: "Hedge Fund Manager", avatar: "DC", text: "The daily briefing is something I genuinely wait for every morning. The level of analysis here is institutional-grade.", highlight: "something I genuinely wait for every morning" },
  { id: 2, name: "Sarah Mitchell", role: "Day Trader", avatar: "SM", text: "WAR ZONE gave me the edge I was missing. After one week I realized this is the best investment I made this year.", highlight: "the best investment I made this year" },
  { id: 3, name: "Michael Rodriguez", role: "Prop Trader", avatar: "MR", text: "I pay thousands per month for research subscriptions. WAR ZONE beats them all in value-for-money.", highlight: "beats them all in value-for-money" },
  { id: 4, name: "Emily Watson", role: "Portfolio Manager", avatar: "EW", text: "Finally someone who understands I don't need more data, I need conclusions. These briefings save me hours every day.", highlight: "save me hours every day" },
  { id: 5, name: "James Kim", role: "Swing Trader", avatar: "JK", text: "The writing quality and depth of analysis here is something I haven't found anywhere else.", highlight: "something I haven't found anywhere else" },
  { id: 6, name: "Rachel Green", role: "Options Trader", avatar: "RG", text: "WAR ZONE is like someone turned on the lights in a dark room. Now I see the full picture before market open.", highlight: "turned on the lights in a dark room" },
  { id: 7, name: "Alex Thompson", role: "Crypto Investor", avatar: "AT", text: "I tried the free trial and canceled all my other subscriptions. WAR ZONE is all I need now.", highlight: "canceled all my other subscriptions" },
  { id: 8, name: "Lisa Anderson", role: "Forex Trader", avatar: "LA", text: "The macro analysis here is better than anything I got from Bloomberg Terminal. And I'm not joking.", highlight: "better than anything I got from Bloomberg" },
];

const BEFORE_AFTER = {
  before: [
    "Wake up to 50+ headlines and zero clarity",
    "React to moves you should have anticipated",
    "Miss sector rotations until it is too late",
    "Trade on noise instead of conviction",
    "Second-guess every decision"
  ],
  after: [
    "Wake up knowing exactly what matters",
    "Position before the crowd reacts",
    "Catch rotations as they begin",
    "Trade with institutional-grade conviction",
    "Execute with clarity and confidence"
  ]
};

const DAILY_FEATURES = [
  { icon: Globe, title: 'Global Macro Analysis', desc: 'Key market drivers from Asia to Europe before US opens.' },
  { icon: Activity, title: 'Sector Rotation Intel', desc: 'Where money is flowing and where it is leaving.' },
  { icon: Target, title: 'Actionable Trade Ideas', desc: 'Specific setups with clear entry, target, and risk levels.' },
  { icon: BarChart3, title: 'Technical + Fundamental', desc: 'Charts meet catalysts for complete market context.' }
];

const FAQS = [
  { q: "How does the 7-day free trial work?", a: "Full access for 7 days. Cancel in one click, pay nothing. Only available on monthly plan." },
  { q: "When do I receive the daily briefing?", a: "Every trading day at 9:00 AM New York time — before the market opens. You'll have everything you need to start your day with clarity." },
  { q: "What do I get with my subscription?", a: "Daily market briefing, weekly tactical review, access to our private Discord community with 847+ traders, and the Finotaur Trading Room with live analysis." },
  { q: "Is this just another stock newsletter?", a: "No. WAR ZONE is a professional-grade market briefing — the same style institutional trading desks use. Not stock picks. Not hype. Pure market intelligence." },
  { q: "Can I cancel anytime?", a: "Absolutely. No contracts, no commitments, no questions asked. Cancel with one click from your account settings." }
];

const STATS = [
  { value: '9:00 AM', label: 'Daily Delivery' },
  { value: '847+', label: 'Active Traders' },
  { value: '7 Days', label: 'Free Trial' },
  { value: '24/7', label: 'Discord Access' }
];

// ============================================
// SOCIAL PROOF COMPONENT (Scrolling Testimonials)
// ============================================

const SocialProof = memo(function SocialProof() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollPositionRef = useRef(0);
  
  const duplicatedTestimonials = useMemo(() => [...TESTIMONIALS, ...TESTIMONIALS], []);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    
    const scrollSpeed = 0.5;
    const cardWidth = 400;
    const totalWidth = cardWidth * TESTIMONIALS.length;
    
    let animationId: number;
    
    const animate = () => {
      if (!isPaused) {
        scrollPositionRef.current += scrollSpeed;
        if (scrollPositionRef.current >= totalWidth) scrollPositionRef.current = 0;
        if (scrollContainer) scrollContainer.scrollLeft = scrollPositionRef.current;
      }
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused]);

  const highlightText = useCallback((text: string, highlight: string) => {
    if (!highlight) return text;
    const parts = text.split(highlight);
    return <>{parts[0]}<span className="text-[#C9A646] font-semibold">{highlight}</span>{parts[1]}</>;
  }, []);

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100d08] to-[#0a0a0a]"/>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent"/>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent"/>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#C9A646]/[0.12] rounded-full blur-[150px]"/>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 heading-serif italic">What Traders Are Saying</h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">Join hundreds of professional traders who rely on WAR ZONE for daily market intelligence</p>
        </motion.div>
        
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none"/>
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none"/>
          
          <div 
            ref={scrollRef} 
            className="flex gap-6 overflow-x-hidden" 
            onMouseEnter={() => setIsPaused(true)} 
            onMouseLeave={() => setIsPaused(false)}
          >
            {duplicatedTestimonials.map((t, index) => (
              <div 
                key={`${t.id}-${index}`} 
                className="flex-shrink-0 w-[380px] p-6 rounded-2xl relative group transition-all duration-300"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.05), rgba(20,20,20,0.8))', 
                  border: '1px solid rgba(201,166,70,0.2)', 
                  backdropFilter: 'blur(10px)' 
                }}
              >
                <svg className="absolute top-4 right-4 w-8 h-8 text-[#C9A646]/20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                </svg>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 fill-[#C9A646] text-[#C9A646]" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">"{highlightText(t.text, t.highlight)}"</p>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, #C9A646, #B8963F)', color: '#0a0a0a' }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-slate-500 text-xs">{t.role}</p>
                  </div>
                </div>
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ boxShadow: '0 0 30px rgba(201,166,70,0.3)' }}
                />
              </div>
            ))}
          </div>
          
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: isPaused ? 0 : 0.5 }} 
            className="text-center text-slate-600 text-sm mt-6"
          >
            Hover to pause
          </motion.p>
        </div>
      </div>
    </section>
  );
});

// ============================================
// BEFORE/AFTER SECTION
// ============================================

const BeforeAfterSection = memo(function BeforeAfterSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0a08] to-[#0a0a0a]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />
      <div className="absolute top-1/4 right-1/4 w-[600px] h-[500px] bg-[#C9A646]/[0.08] rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 left-1/5 w-[500px] h-[450px] bg-[#D4AF37]/[0.07] rounded-full blur-[130px]" />
      
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-white heading-serif">The Difference Between </span>
            <span className="heading-serif text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] to-[#F4D97B]">
              Reacting and Anticipating
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Most traders start their day overwhelmed. WAR ZONE traders start with clarity.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BEFORE Card */}
          <div
            className="rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.05) 0%, rgba(0,0,0,0.3) 100%)',
              border: '1px solid rgba(239,68,68,0.15)',
            }}
          >
            <div className="flex items-center gap-4 px-6 py-5 border-b border-red-500/10">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-white font-bold text-lg">Without WAR ZONE</h3>
            </div>
            <div className="px-6 py-6 space-y-4">
              {BEFORE_AFTER.before.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <XCircle className="w-5 h-5 text-red-400/50 flex-shrink-0" />
                  <span className="text-slate-400 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* AFTER Card */}
          <div
            className="rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(0,0,0,0.3) 100%)',
              border: '1px solid rgba(201,166,70,0.2)',
            }}
          >
            <div className="flex items-center gap-4 px-6 py-5 border-b border-[#C9A646]/15">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-white font-bold text-lg">With WAR ZONE</h3>
            </div>
            <div className="px-6 py-6 space-y-4">
              {BEFORE_AFTER.after.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-slate-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

// ============================================
// NOT A NEWSLETTER SECTION
// ============================================

const NotANewsletterSection = memo(function NotANewsletterSection() {
  return (
    <section className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100c08] to-[#0a0a0a]"/>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent"/>
      <div className="absolute top-1/4 left-[16%] w-[500px] h-[400px] bg-[#C9A646]/[0.08] rounded-full blur-[140px]"/>
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-[#D4AF37]/[0.07] rounded-full blur-[120px]"/>
      <div className="absolute top-1/2 right-[16%] w-[400px] h-[350px] bg-[#F4D97B]/[0.05] rounded-full blur-[130px]"/>
      
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16">
            <CompassIcon className="w-full h-full" />
          </div>
        </div>
        
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
            <span className="text-white heading-serif">This Is Not a Newsletter.</span>
          </h2>
          <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            <span className="heading-serif text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] to-[#F4D97B]">It is a Daily Market Briefing.</span>
          </h3>
          <p className="text-slate-400 text-lg">
            Most traders consume <span className="text-slate-300">information</span>.
            <br />
            Professionals consume <span className="text-white font-medium italic">interpretation</span>.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {DAILY_FEATURES.map((f, i) => (
            <div 
              key={i} 
              className="p-6 rounded-2xl transition-all hover:border-[#C9A646]/40"
              style={{ 
                background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
                border: '1px solid rgba(201,166,70,0.15)',
              }}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: 'rgba(201,166,70,0.1)',
                    border: '1px solid rgba(201,166,70,0.2)'
                  }}
                >
                  <f.icon className="w-5 h-5 text-[#C9A646]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-base mb-1">{f.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-center">
          <div 
            className="inline-flex items-center gap-4 px-6 py-4 rounded-xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(201,166,70,0.1), rgba(201,166,70,0.02))',
              border: '1px solid rgba(201,166,70,0.2)',
            }}
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ 
                background: 'rgba(201,166,70,0.1)',
                border: '1px solid rgba(201,166,70,0.3)'
              }}
            >
              <Clock className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">Delivered Every Trading Day</p>
              <p className="text-slate-500 text-xs">9:00 AM New York Time — before the market opens</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

// ============================================
// MORE THAN A BRIEFING SECTION
// ============================================

const MoreThanBriefingSection = memo(function MoreThanBriefingSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0a08] to-[#0a0a0a]"/>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent"/>
      <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-[#C9A646]/[0.05] rounded-full blur-[130px]"/>
      
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] to-[#F4D97B]">More</span>
            <span className="heading-serif italic text-white"> Than Just a Briefing</span>
          </h2>
          <p className="text-slate-400 text-lg">Join a community of serious traders and get exclusive trading room access.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Discord Card */}
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
              border: '1px solid rgba(201,166,70,0.15)',
            }}
          >
            <div className="flex items-start gap-4">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: 'rgba(88,101,242,0.1)',
                  border: '1px solid rgba(88,101,242,0.3)'
                }}
              >
                <DiscordIcon className="w-7 h-7 text-[#5865F2]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-white font-bold text-lg">Private Discord Community</h4>
                  <span 
                    className="px-3 py-1 rounded-md text-[10px] font-bold tracking-wider"
                    style={{ 
                      background: 'rgba(201,166,70,0.1)',
                      border: '1px solid rgba(201,166,70,0.3)',
                      color: '#C9A646'
                    }}
                  >
                    EXCLUSIVE
                  </span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">Not beginners. Real traders who were already paying for research — now sharing in real-time.</p>
              </div>
            </div>
          </div>
          
          {/* Trading Room Card */}
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
              border: '1px solid rgba(201,166,70,0.15)',
            }}
          >
            <div className="flex items-start gap-4">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: 'rgba(201,166,70,0.1)',
                  border: '1px solid rgba(201,166,70,0.3)'
                }}
              >
                <BellIcon className="w-7 h-7 text-[#C9A646]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-white font-bold text-lg">Finotaur Trading Room</h4>
                  <span 
                    className="px-3 py-1 rounded-md text-[10px] font-bold tracking-wider"
                    style={{ 
                      background: 'rgba(201,166,70,0.1)',
                      border: '1px solid rgba(201,166,70,0.3)',
                      color: '#C9A646'
                    }}
                  >
                    EXCLUSIVE
                  </span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">Live analysis, real-time alerts, and the context behind every move.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

// ============================================
// FAQ SECTION
// ============================================

const FAQSection = memo(function FAQSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100c08] to-[#0a0a0a]"/>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent"/>
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#C9A646]/[0.04] rounded-full blur-[120px]"/>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-white heading-serif">Frequently Asked </span>
            <span className="heading-serif text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] to-[#F4D97B]">Questions</span>
          </h2>
          <p className="text-slate-400 text-base">Everything you need to know before joining the War Zone.</p>
        </div>
        
        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <div 
              key={i} 
              className={cn(
                "rounded-xl overflow-hidden transition-all duration-300",
                openFaq === i ? "ring-1 ring-[#C9A646]/30" : ""
              )}
              style={{ 
                background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
                border: '1px solid rgba(201,166,70,0.15)',
              }}
            >
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)} 
                className="w-full flex items-center justify-between px-6 py-5 text-left group"
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300"
                    style={{ 
                      background: openFaq === i ? 'rgba(233,169,49,0.2)' : 'rgba(201,166,70,0.1)',
                      border: `1px solid ${openFaq === i ? 'rgba(233,169,49,0.4)' : 'rgba(201,166,70,0.2)'}`
                    }}
                  >
                    <span className="text-[#E9A931] font-bold text-sm">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className={cn(
                    "font-semibold text-base md:text-lg transition-colors duration-300",
                    openFaq === i ? "text-white" : "text-[#E8DCC4]"
                  )}>
                    {faq.q}
                  </h3>
                </div>
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ml-4",
                    openFaq === i ? "bg-[#E9A931]/20 rotate-180" : "bg-[#C9A646]/10"
                  )}
                  style={{ 
                    border: `1px solid ${openFaq === i ? 'rgba(233,169,49,0.4)' : 'rgba(201,166,70,0.2)'}`
                  }}
                >
                  <ChevronDown className={cn(
                    "w-5 h-5 transition-all duration-300",
                    openFaq === i ? "text-[#E9A931]" : "text-[#C9A646]/60"
                  )} />
                </div>
              </button>
              
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                openFaq === i ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              )}>
                <div className="px-6 pb-6 pt-0">
                  <div className="pl-14">
                    <p className="text-[#C9A646]/80 leading-relaxed text-base">{faq.a}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-[#C9A646]/60 text-sm">
            Still have questions? <a href="mailto:support@finotaur.com" className="text-[#E9A931] hover:underline font-medium">Contact us</a>
          </p>
        </div>
      </div>
    </section>
  );
});

// ============================================
// PRICING SECTION
// ============================================

const PricingSection = memo(function PricingSection({
  onSubscribe,
  setBillingInterval,
}: {
  onSubscribe: () => void;
  setBillingInterval: (interval: BillingInterval) => void;
}) {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0a08] to-[#0a0a0a]"/>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent"/>
      
      {/* Enhanced Gold Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-[#C9A646]/[0.12] rounded-full blur-[150px]"/>
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#D4AF37]/[0.10] rounded-full blur-[100px]"/>
      <div className="absolute bottom-1/4 left-[20%] w-[450px] h-[450px] bg-[#F4D97B]/[0.08] rounded-full blur-[120px]"/>
      <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-[#C9A646]/[0.15] rounded-full blur-[80px]"/>
      <div className="absolute bottom-1/3 right-[20%] w-[400px] h-[400px] bg-[#D4AF37]/[0.12] rounded-full blur-[90px]"/>
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
            <span className="heading-serif italic text-white block">You are Already in the Market.</span>
          </h2>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            <span className="heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">Why Do It Without WAR ZONE?</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Monthly Card */}
          <div
            className="rounded-2xl relative overflow-hidden"
            style={{ 
              background: 'linear-gradient(180deg, rgba(30,28,24,0.95) 0%, rgba(20,18,14,0.98) 100%)', 
              border: '1px solid rgba(201,166,70,0.3)', 
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)' 
            }}
          >
            <div className="absolute top-5 left-5">
              <span 
                className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wider"
                style={{ background: 'linear-gradient(135deg, #C9A646, #F4D97B)', color: '#000' }}
              >
                MONTHLY
              </span>
            </div>
            
            <div className="p-6 pt-16">
              <div className="mb-5">
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-bold text-white">${CONFIG.MONTHLY_PRICE}</span>
                  <span className="text-slate-400 text-lg">/month</span>
                </div>
                <p className="text-green-400 font-bold text-sm mt-2 tracking-wide">FREE 7 DAY TRIAL</p>
              </div>
              
              <button 
                onClick={onSubscribe} 
                className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 mb-3 transition-all hover:scale-[1.02]"
                style={{ 
                  background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)', 
                  color: '#000', 
                  boxShadow: '0 4px 20px rgba(201,166,70,0.4)' 
                }}
              >
                START FREE TRIAL <ArrowRight className="w-5 h-5"/>
              </button>
              <p className="text-slate-500 text-sm text-center mb-8">Risk-free. Cancel anytime.</p>
              
              <div className="space-y-6">
                <div>
                  <div className="flex items-start gap-3 mb-2">
                    <Check className="w-5 h-5 text-[#C9A646] mt-0.5 flex-shrink-0"/>
                    <h4 className="text-white font-bold">Daily Market Briefing</h4>
                  </div>
                  <p className="text-slate-400 text-sm pl-8 leading-relaxed">Every trading day at 9:00 AM NY. Know exactly what matters before the market opens.</p>
                </div>
                
                <div>
                  <div className="flex items-start gap-3 mb-2">
                    <Check className="w-5 h-5 text-[#C9A646] mt-0.5 flex-shrink-0"/>
                    <h4 className="text-white font-bold">Sector Rotation Intel</h4>
                  </div>
                  <p className="text-slate-400 text-sm pl-8 leading-relaxed">Where institutional money is flowing — and where it is leaving. Position before the crowd.</p>
                </div>
                
                <div>
                  <div className="flex items-start gap-3 mb-2">
                    <Check className="w-5 h-5 text-[#C9A646] mt-0.5 flex-shrink-0"/>
                    <h4 className="text-white font-bold">Private Discord + Trading Room</h4>
                  </div>
                  <p className="text-slate-400 text-sm pl-8 leading-relaxed">24/7 access to serious traders and real-time market discussion.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Yearly Card */}
          <div
            className="rounded-2xl relative overflow-hidden"
            style={{ 
              background: 'linear-gradient(180deg, rgba(35,30,22,0.98) 0%, rgba(22,18,12,0.99) 100%)', 
              border: '2px solid rgba(201,166,70,0.5)', 
              boxShadow: '0 0 40px rgba(201,166,70,0.15), 0 8px 40px rgba(0,0,0,0.5)' 
            }}
          >
            <div 
              className="absolute top-0 left-0 right-0 h-1"
              style={{ background: 'linear-gradient(90deg, transparent, #C9A646, transparent)' }}
            />
            
            <div className="absolute top-5 left-5">
              <span 
                className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wider"
                style={{ background: 'linear-gradient(135deg, #C9A646, #F4D97B)', color: '#000' }}
              >
                YEARLY
              </span>
            </div>
            
            <div className="absolute top-5 right-5">
              <span className="px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider bg-green-500 text-white shadow-lg shadow-green-500/30">
                🔥 BEST DEAL
              </span>
            </div>
            
            <div className="p-6 pt-16">
              <div className="mb-5">
                <div className="flex items-baseline gap-3">
                  <span className="text-6xl font-bold text-white">${CONFIG.YEARLY_PRICE}</span>
                  <span className="text-slate-400 text-lg">/year</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-slate-500 line-through text-sm">${Math.round(CONFIG.MONTHLY_PRICE * 12)}/year</span>
                  <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-bold">SAVE ${YEARLY_SAVINGS}</span>
                </div>
                <p className="text-[#C9A646] font-semibold text-sm mt-2">→ That's only ${Math.round(CONFIG.YEARLY_PRICE / 12)}/month</p>
              </div>
              
              <div className="bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-xl p-3 mb-5">
                <p className="text-[#C9A646] text-sm font-medium text-center">⚡ Lock in this price before it increases</p>
              </div>
              
              <button 
                onClick={() => { setBillingInterval('yearly'); onSubscribe(); }} 
                className="w-full py-5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 mb-3 transition-all hover:scale-[1.02]"
                style={{ 
                  background: 'linear-gradient(135deg, #C9A646, #D4AF37, #F4D97B, #D4AF37, #C9A646)', 
                  color: '#000', 
                  boxShadow: '0 4px 25px rgba(201,166,70,0.5)' 
                }}
              >
                GET 2 MONTHS FREE <ArrowRight className="w-5 h-5"/>
              </button>
              <p className="text-slate-500 text-sm text-center mb-6">Locked price forever. Cancel anytime.</p>
              
              <div className="space-y-5">
                <div>
                  <div className="flex items-start gap-3 mb-1">
                    <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0"/>
                    <h4 className="text-white font-bold">Everything in Monthly</h4>
                  </div>
                  <p className="text-slate-400 text-sm pl-8 leading-relaxed">Daily briefing, sector intel, Discord & Trading Room — all included.</p>
                </div>
                
                <div>
                  <div className="flex items-start gap-3 mb-1">
                    <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0"/>
                    <h4 className="text-white font-bold">Price Locked Forever</h4>
                  </div>
                  <p className="text-slate-400 text-sm pl-8 leading-relaxed">Your rate never increases — even when prices go up for new members.</p>
                </div>
                
                <div>
                  <div className="flex items-start gap-3 mb-1">
                    <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0"/>
                    <h4 className="text-white font-bold">Founding Member Status</h4>
                  </div>
                  <p className="text-slate-400 text-sm pl-8 leading-relaxed">Early access to new features & priority support.</p>
                </div>
              </div>
              
              <div className="mt-6 pt-5 border-t border-white/10 text-center">
                <p className="text-slate-500 text-xs">Trusted by <span className="text-[#C9A646] font-semibold">847+ traders</span> worldwide</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#C9A646]"/>
            <span className="text-sm">Secure payment</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block"/>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-400"/>
            <span className="text-sm">7-Day Free Trial</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block"/>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#C9A646]"/>
            <span className="text-sm">Cancel anytime</span>
          </div>
        </div>
      </div>
    </section>
  );
});

// ============================================
// HERO SECTION - MOBILE
// ============================================

const HeroMobile = memo(function HeroMobile({
  billingInterval,
  setBillingInterval,
  onSubscribe,
}: {
  billingInterval: BillingInterval;
  setBillingInterval: (interval: BillingInterval) => void;
  onSubscribe: () => void;
}) {
  return (
    <div className="lg:hidden relative z-10 min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center px-6 pt-4">
        {/* Title */}
        <h1 className="text-[1.5rem] sm:text-[1.8rem] font-bold leading-[1.05] tracking-tight text-center mb-3">
          <span className="text-white block heading-serif italic">Every Morning</span>
          <span className="text-white block heading-serif italic">You Wake Up</span>
          <span className="relative inline-block mt-1">
            <span className="heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">Blind to What Moves</span>
          </span>
          <span className="relative inline-block">
            <span className="heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">the Market.</span>
          </span>
        </h1>

        {/* Mobile Bull */}
        <div className="relative w-full flex justify-center my-2">
          <div className="absolute inset-0 overflow-hidden z-0">
            <ParticleBackground />
          </div>
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[320px] h-[80px] z-10"
            style={{ 
              background: 'radial-gradient(ellipse, rgba(255,140,30,0.4) 0%, rgba(200,100,20,0.15) 50%, transparent 80%)', 
              filter: 'blur(20px)' 
            }}
          />
          <img 
            src={CONFIG.BULL_IMAGE}
            alt="War Zone Bull" 
            className="relative z-20 w-[200px] sm:w-[240px] h-auto" 
            style={{ 
              filter: 'drop-shadow(0 0 40px rgba(255,150,50,0.3))',
              mixBlendMode: 'lighten'
            }}
          />
        </div>

        {/* Description */}
        <p className="text-[#C9A646]/70 text-sm leading-relaxed text-center mb-4 max-w-sm">
          <span className="text-[#C9A646] font-bold">WAR ZONE</span> gives you the same institutional market briefing Wall Street desks use — <span className="text-[#E8DCC4] font-medium">before the market opens.</span> Every single day.
        </p>

        {/* Billing Toggle */}
        <BillingToggle selected={billingInterval} onChange={setBillingInterval} className="mb-3" />

        {/* CTA Button */}
        <button 
          onClick={onSubscribe} 
          className="group px-8 py-4 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 mb-6"
          style={{ 
            background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)', 
            color: '#000', 
            boxShadow: '0 4px 24px rgba(201,166,70,0.4)' 
          }}
        >
          {billingInterval === 'monthly' ? 'Start 7-Day Free Trial' : `Get WAR ZONE for $${CONFIG.YEARLY_PRICE}/year`}
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </button>

        {/* Feature Icons */}
        <FeatureIcons isMobile />
      </div>

      {/* Mobile Stats */}
      <div className="mt-auto relative z-50">
        <GoldenDivider />
        <div className="bg-[#0a0806] py-5 px-4 relative z-50">
          <div className="grid grid-cols-4 gap-2">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-lg sm:text-xl font-bold heading-serif italic text-[#C9A646] whitespace-nowrap">{stat.value}</div>
                <div className="text-slate-400 text-[8px] sm:text-[9px] mt-1 tracking-wide uppercase">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================
// HERO SECTION - DESKTOP
// ============================================

const HeroDesktop = memo(function HeroDesktop({
  billingInterval,
  setBillingInterval,
  onSubscribe,
}: {
  billingInterval: BillingInterval;
  setBillingInterval: (interval: BillingInterval) => void;
  onSubscribe: () => void;
}) {
  return (
    <div className="hidden lg:block relative z-10 min-h-screen">
      <div className="flex min-h-screen">
        {/* Left Column */}
        <div className="w-1/2 bg-[#0a0806] flex flex-col justify-center pl-20 xl:pl-28 2xl:pl-36 pr-12 relative overflow-hidden">
          <div className="absolute inset-0 z-1 opacity-20">
            <SparkleEffect />
          </div>
          
          <h1 className="text-[2.8rem] xl:text-[3.2rem] 2xl:text-[3.8rem] font-bold leading-[1.05] tracking-tight mb-8 relative z-20 pl-2">
            <span className="text-white block heading-serif italic">Every Morning</span>
            <span className="text-white block heading-serif italic">You Wake Up</span>
            <span className="relative inline-block mt-2">
              <span className="absolute inset-0 blur-3xl opacity-40 bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] animate-pulse" style={{animationDuration:'4s'}}/>
              <span className="relative heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">Blind to What Moves</span>
            </span>
            <span className="relative inline-block">
              <span className="heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">the Market.</span>
            </span>
          </h1>

          <p className="text-[#C9A646]/80 text-lg leading-relaxed mb-8 max-w-xl relative z-20">
            <span className="font-bold" style={{ color: '#E9A931' }}>WAR ZONE</span> gives you the same institutional market briefing Wall Street desks use — <span className="text-[#E8DCC4] font-medium">before the market opens.</span> Every single day.
          </p>

          <BillingToggle selected={billingInterval} onChange={setBillingInterval} className="mb-6 justify-start relative z-20" />

          <div className="flex flex-wrap items-center gap-4 mb-8 relative z-20">
            <button 
              onClick={onSubscribe} 
              className="group px-8 py-4 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
              style={{ 
                background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)', 
                color: '#000', 
                boxShadow: '0 4px 24px rgba(201,166,70,0.4)' 
              }}
            >
              {billingInterval === 'monthly' ? 'Start 7-Day Free Trial' : `Get WAR ZONE for $${CONFIG.YEARLY_PRICE}/year`}
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="relative z-20">
            <FeatureIcons />
          </div>
        </div>

        {/* Right Column - Bull */}
        <div className="w-1/2 relative flex items-center justify-center overflow-hidden bg-[#0a0806]">
          <div className="absolute inset-0 z-0">
            <ParticleBackground />
          </div>
          
          <div className="absolute inset-0 z-10">
            <SparkleEffect />
          </div>
          
          <div 
            className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-[700px] h-[200px] z-10"
            style={{ 
              background: 'radial-gradient(ellipse, rgba(255,130,30,0.4) 0%, rgba(200,100,20,0.15) 40%, transparent 70%)', 
              filter: 'blur(40px)' 
            }}
          />
          
          <div 
            className="relative z-20"
            style={{
              maskImage: 'radial-gradient(ellipse 75% 80% at 45% 50%, black 30%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.2) 70%, transparent 85%)',
              WebkitMaskImage: 'radial-gradient(ellipse 75% 80% at 45% 50%, black 30%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.2) 70%, transparent 85%)',
            }}
          >
            <img 
              src={CONFIG.BULL_IMAGE}
              alt="War Zone Bull" 
              className="w-[500px] xl:w-[580px] 2xl:w-[650px] h-auto object-contain"
              style={{ filter: 'drop-shadow(0 0 80px rgba(255,150,50,0.3))' }}
            />
          </div>
          
          {/* Edge gradients */}
          <div className="absolute inset-y-0 left-0 w-40 z-30" style={{ background: 'linear-gradient(90deg, #0a0806 0%, rgba(10,8,6,0.8) 30%, transparent 100%)' }} />
          <div className="absolute inset-x-0 top-0 h-32 z-30" style={{ background: 'linear-gradient(180deg, #0a0806 0%, rgba(10,8,6,0.5) 40%, transparent 100%)' }} />
          <div className="absolute inset-y-0 right-0 w-40 z-30" style={{ background: 'linear-gradient(270deg, #0a0806 0%, rgba(10,8,6,0.8) 30%, transparent 100%)' }} />
          <div className="absolute inset-x-0 bottom-0 h-32 z-30" style={{ background: 'linear-gradient(0deg, #0a0806 0%, rgba(10,8,6,0.5) 40%, transparent 100%)' }} />
        </div>
      </div>

      {/* Desktop Stats Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-40">
        <div className="relative w-full h-[1px]">
          <div 
            className="absolute inset-0"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(201,166,70,0.5) 20%, rgba(244,217,123,0.8) 50%, rgba(201,166,70,0.5) 80%, transparent 100%)' }}
          />
        </div>
        
        <div 
          className="relative z-50"
          style={{ background: 'linear-gradient(180deg, rgba(15,12,8,0.98) 0%, rgba(10,8,6,0.99) 100%)' }}
        >
          <div className="max-w-5xl mx-auto px-6 py-8">
            <StatsBar />
          </div>
        </div>
        
        <div className="relative w-full h-[1px]">
          <div 
            className="absolute inset-0"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(201,166,70,0.5) 20%, rgba(244,217,123,0.8) 50%, rgba(201,166,70,0.5) 80%, transparent 100%)' }}
          />
        </div>
      </div>
    </div>
  );
});

// ============================================
// LANDING VIEW (Complete - All Sections)
// ============================================

const LandingView = memo(function LandingView({
  onSubscribe,
  billingInterval,
  setBillingInterval,
  isProcessing,
}: {
  onSubscribe: () => void;
  billingInterval: BillingInterval;
  setBillingInterval: (interval: BillingInterval) => void;
  isProcessing: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#0a0806] overflow-hidden relative">
      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');
        .heading-serif{font-family:'Playfair Display',Georgia,serif}
        @keyframes hero-orb{0%,100%{transform:scale(1);opacity:0.08}50%{transform:scale(1.1);opacity:0.12}}
        .hero-orb{animation:hero-orb 8s ease-in-out infinite}
        @keyframes particle-rise { 0% { transform: translateY(0) scale(1); opacity: 0; } 10% { opacity: 0.7; } 80% { opacity: 0.5; } 100% { transform: translateY(-85vh) scale(0.3); opacity: 0; } }
        @keyframes sparkle { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* HERO SECTION */}
      <section className="relative min-h-screen">
        {/* Base Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#080808] via-[#0d0b08] to-[#080808]" />
        
        {/* Animated Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-[#C9A646]/[0.08] rounded-full blur-[150px] hero-orb"/>
        <div className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] bg-[#D4BF8E]/[0.06] rounded-full blur-[140px] hero-orb" style={{animationDelay:'3s'}}/>
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-[#F4D97B]/[0.04] rounded-full blur-[130px] hero-orb" style={{animationDelay:'5s'}}/>

        <HeroMobile 
          billingInterval={billingInterval}
          setBillingInterval={setBillingInterval}
          onSubscribe={onSubscribe}
        />
        
        <HeroDesktop 
          billingInterval={billingInterval}
          setBillingInterval={setBillingInterval}
          onSubscribe={onSubscribe}
        />
      </section>

      {/* SOCIAL PROOF */}
      <SocialProof />

      {/* BEFORE/AFTER */}
      <BeforeAfterSection />

      {/* NOT A NEWSLETTER */}
      <NotANewsletterSection />

      {/* MORE THAN A BRIEFING */}
      <MoreThanBriefingSection />

      {/* FAQ */}
      <FAQSection />

      {/* PRICING */}
      <PricingSection 
        onSubscribe={onSubscribe}
        setBillingInterval={setBillingInterval}
      />

      {/* FOOTER */}
      <footer className="border-t border-[#C9A646]/10 py-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#C9A646]/40 text-sm">
            Questions? <a href="mailto:support@finotaur.com" className="text-[#C9A646] hover:underline">support@finotaur.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
});

// ============================================
// TYPES
// ============================================

interface WarzonelandingProps {
  previewMode?: 'landing' | 'subscriber' | null;
}

// ============================================
// MAIN COMPONENT
// ============================================

function Warzonelanding({ previewMode = null }: WarzonelandingProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // State
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showBundlePopup, setShowBundlePopup] = useState(false);

  // 🔥 Use the ORIGINAL hooks from useUserStatus
  const { 
    isActive: isWarZoneActive, 
    isInTrial: isWarZoneInTrial,
    status: warZoneStatusStr,
    membershipId: warZoneMembershipId,
    trialDaysRemaining: warZoneTrialDaysRemaining,
    isLoading: isWarZoneLoading,
    refresh: refreshWarZone,
  } = useWarZoneStatus();

  const {
    isActive: isTopSecretActive,
    membershipId: topSecretMembershipId,
    isLoading: isTopSecretLoading,
  } = useTopSecretStatus();

  const { isTester } = useUserMeta();

  // Derived values
  const isLoading = isWarZoneLoading || isTopSecretLoading;
  const isTopSecretMember = isTopSecretActive;
  
  // Subscriber check - same as original
  const realIsSubscriber = isWarZoneActive || isWarZoneInTrial;
  
  // Preview mode overrides
  const isSubscriber = previewMode === 'subscriber' ? true : previewMode === 'landing' ? false : realIsSubscriber;

  // Handle payment success redirect - SAME AS ORIGINAL
  useEffect(() => { 
    const paymentSuccess = searchParams.get('payment') === 'success';
    const fromWhop = searchParams.get('source') === 'whop';
    
    if (paymentSuccess || fromWhop) {
      console.log('[WAR ZONE] 🎉 Returning from successful payment, refreshing status...');
      // 🔥 Use the hook's refresh instead of polling
      setTimeout(() => refreshWarZone(), 1000);
      setTimeout(() => refreshWarZone(), 3000);
      setTimeout(() => refreshWarZone(), 5000);
    }
  }, [searchParams, refreshWarZone]);

  // Subscribe handler - Always show disclaimer popup (handles all cases internally)
  const handleSubscribeClick = useCallback(() => {
    if (!user) {
      setShowLoginPopup(true);
      return;
    }
    
    // Show the plan selection popup - it handles:
    // 1. Regular users: Shows both WAR ZONE + Bundle side by side
    // 2. Top Secret members: Shows Bundle-only upgrade offer
    // 3. Yearly billing: Shows single WAR ZONE option
    setShowDisclaimer(true);
  }, [user]);

// 🔥 Handler for Bundle checkout from popup
  const handleBundleCheckout = useCallback(async () => {
    if (!user?.id || !user?.email) {
      setShowBundlePopup(false);
      setShowLoginPopup(true);
      return;
    }
    
    setShowBundlePopup(false);
    setIsProcessing(true);
    
    try {
      const checkoutToken = crypto.randomUUID();
      
      // Save pending checkout
      await supabase.from('pending_checkouts').insert({
        user_id: user.id,
        user_email: user.email,
        checkout_token: checkoutToken,
        product_type: 'bundle',
        billing_interval: 'monthly',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
      console.log('✅ Pending checkout saved for Bundle');
      
      // Get access token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      // Bundle plan ID - $97/month
      const bundlePlanId = 'plan_ujyQUPIi7UIvN';
      
      // Try Edge Function first
      if (accessToken) {
        try {
          const response = await supabase.functions.invoke('create-whop-checkout', {
            body: {
              plan_id: bundlePlanId,
              email: user.email,
              user_id: user.id,
              subscription_category: 'bundle',
            },
          });
          
          if (response.data?.checkout_url) {
            console.log('✅ Using Edge Function checkout URL for Bundle');
            window.location.href = response.data.checkout_url;
            return;
          }
        } catch (err) {
          console.warn('⚠️ Edge Function failed, falling back to direct URL:', err);
        }
      }
      
      // Fallback: Direct URL
      const checkoutBaseUrl = `https://whop.com/checkout/${bundlePlanId}`;
      const params = new URLSearchParams();
      params.set('email', user.email);
      params.set('lock_email', 'true');
      params.set('metadata[finotaur_user_id]', user.id);
      params.set('metadata[finotaur_email]', user.email);
      params.set('metadata[checkout_token]', checkoutToken);
      params.set('metadata[product_type]', 'bundle');
      params.set('redirect_url', `${CONFIG.REDIRECT_URL}?payment=success&bundle=true`);
      
      window.location.href = `${checkoutBaseUrl}?${params.toString()}`;
    } catch (e) {
      console.error('Bundle checkout error:', e);
      setIsProcessing(false);
      alert('Error starting checkout. Please try again.');
    }
  }, [user]);

  // Login redirect handler
  const handleLoginRedirect = useCallback(() => {
    sessionStorage.setItem('return_after_login', window.location.pathname);
    navigate('/login');
  }, [navigate]);

  // Proceed to Whop checkout - ORIGINAL LOGIC
  const handleProceedToCheckout = useCallback(async () => {
    if (!user?.id || !user?.email) { 
      setShowDisclaimer(false); 
      setShowLoginPopup(true); 
      return; 
    }
    
    setIsProcessing(true);
    
    try {
      // Save unsubscribe token if missing
      const { data: profile } = await supabase.from('profiles').select('newsletter_unsubscribe_token').eq('id', user.id).single();
      if (!profile?.newsletter_unsubscribe_token) {
        await supabase.from('profiles').update({ 
          newsletter_unsubscribe_token: crypto.randomUUID(), 
          updated_at: new Date().toISOString() 
        }).eq('id', user.id);
      }
      
      const isYearly = billingInterval === 'yearly';
      const isTopSecretDiscount = billingInterval === 'monthly' && isTopSecretMember;
      
      // Generate unique checkout token
      const checkoutToken = crypto.randomUUID();
      
      // Save pending checkout BEFORE redirecting to Whop
      await supabase.from('pending_checkouts').insert({
        user_id: user.id,
        user_email: user.email,
        checkout_token: checkoutToken,
        product_type: 'newsletter',
        billing_interval: billingInterval,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
      console.log('✅ Pending checkout saved for War Zone');
      
      // Get access token for Edge Function
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      // Determine which plan to use
      let planId: string;
      if (isYearly) {
        planId = CONFIG.WHOP_YEARLY_PLAN_ID;
      } else if (isTopSecretDiscount) {
        planId = CONFIG.WHOP_MONTHLY_PLAN_ID_TOPSECRET;
      } else {
        planId = CONFIG.WHOP_MONTHLY_PLAN_ID;
      }
      
      // Try Edge Function first
      if (accessToken) {
        try {
          const response = await supabase.functions.invoke('create-whop-checkout', {
            body: {
              plan_id: planId,
              email: user.email,
              user_id: user.id,
              subscription_category: 'journal',
            },
          });
          
          if (response.data?.checkout_url) {
            console.log('✅ Using Edge Function checkout URL');
            setShowDisclaimer(false);
            window.location.href = response.data.checkout_url;
            return;
          }
        } catch (err) {
          console.warn('⚠️ Edge Function failed, falling back to direct URL:', err);
        }
      }
      
      // Fallback: Direct URL
      console.warn('⚠️ Using direct Whop URL fallback');
      let checkoutBaseUrl: string;
      if (isYearly) {
        checkoutBaseUrl = CONFIG.WHOP_CHECKOUT_BASE_URL_YEARLY;
      } else if (isTopSecretDiscount) {
        checkoutBaseUrl = `https://whop.com/checkout/${CONFIG.WHOP_MONTHLY_PLAN_ID_TOPSECRET}`;
      } else {
        checkoutBaseUrl = CONFIG.WHOP_CHECKOUT_BASE_URL_MONTHLY;
      }
      
      const params = new URLSearchParams(); 
      params.set('email', user.email); 
      params.set('lock_email', 'true');
      params.set('metadata[finotaur_user_id]', user.id);
      params.set('metadata[finotaur_email]', user.email);
      params.set('metadata[checkout_token]', checkoutToken);
      params.set('metadata[billing_interval]', billingInterval);
      params.set('metadata[is_topsecret_member]', String(isTopSecretMember));
      if (topSecretMembershipId) {
        params.set('metadata[topsecret_membership_id]', topSecretMembershipId);
      }
      params.set('redirect_url', `${CONFIG.REDIRECT_URL}?payment=success`);
      
      setShowDisclaimer(false);
      window.location.href = `${checkoutBaseUrl}?${params.toString()}`;
    } catch (e) {
      console.error('Checkout error:', e);
      setIsProcessing(false);
      alert('Error starting checkout. Please try again.');
    }
  }, [user, billingInterval, isTopSecretMember, topSecretMembershipId]);

  // Cancel subscription handler - ORIGINAL LOGIC
  const handleCancelSubscription = useCallback(async () => {
    if (!user?.id) return;
    
    setIsCancelling(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('newsletter-cancel', {
        body: { action: 'cancel' }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        refreshWarZone();
        setShowCancelModal(false);
      } else {
        throw new Error(data?.error || 'Failed');
      }
    } catch (e) {
      alert('Failed. Contact support@finotaur.com');
    } finally {
      setIsCancelling(false);
    }
  }, [user?.id, refreshWarZone]);

// 🔥 Bundle Upgrade Popup Component
  const BundleUpgradePopup = () => {
    if (!showBundlePopup) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowBundlePopup(false)}
        />
        
        {/* Popup Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-sm rounded-2xl overflow-hidden max-h-[calc(100vh-120px)]"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
            border: '1px solid rgba(201,166,70,0.3)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 60px rgba(201,166,70,0.2)'
          }}
        >
          {/* Header */}
          <div 
            className="px-5 py-3 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.05) 100%)',
              borderBottom: '1px solid rgba(201,166,70,0.2)'
            }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2"
                 style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-xs font-semibold">Special Offer for Top Secret Members</span>
            </div>
            <h3 className="text-xl font-bold text-white">Upgrade to Bundle</h3>
          </div>
          
          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-slate-400 text-center text-sm mb-4">
              Get <span className="text-white font-semibold">both War Zone + Top Secret</span> for one low price!
            </p>
            
            {/* Price Comparison */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/5">
                <span className="text-slate-400 text-sm">War Zone Newsletter</span>
                <span className="text-slate-500 line-through text-sm">$69.99/mo</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/5">
                <span className="text-slate-400 text-sm">Top Secret Reports</span>
                <span className="text-slate-500 line-through text-sm">$89.99/mo</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg"
                   style={{ 
                     background: 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.05) 100%)',
                     border: '1px solid rgba(201,166,70,0.3)'
                   }}>
                <div>
                  <span className="text-[#C9A646] font-bold">Bundle Price</span>
                  <p className="text-emerald-400 text-xs">Save $62.98/month!</p>
                </div>
                <span className="text-[#C9A646] font-bold text-xl">$97/mo</span>
              </div>
            </div>
            
            {/* What You Get */}
            <div className="space-y-1.5 mb-4">
              <p className="text-slate-500 text-xs font-medium mb-1">What you'll get:</p>
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>War Zone Newsletter (Daily Signals)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Top Secret Reports (10 Monthly)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>7-Day Free Trial</span>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleBundleCheckout}
                disabled={isProcessing}
                className="w-full py-3 text-base font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: '#000',
                  boxShadow: '0 8px 32px rgba(201,166,70,0.4)'
                }}
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    Get Bundle for $97/month
                  </>
                )}
              </button>
              
              <button
                onClick={() => setShowBundlePopup(false)}
                className="w-full py-2 text-slate-500 hover:text-slate-400 transition-colors text-sm"
              >
                No thanks, I'll pass
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  // Loading state
  if (isLoading && !previewMode) {
    return <FullPageLoader text="Loading War Zone..." />;
  }

  // Subscriber view
  if (isSubscriber) {
    return (
      <>
        <ActiveSubscriberView onCancelClick={() => setShowCancelModal(true)} />
        
        <Suspense fallback={null}>
          <CancelSubscriptionModal
            isOpen={showCancelModal}
            onClose={() => setShowCancelModal(false)}
            onConfirm={handleCancelSubscription}
            isProcessing={isCancelling}
            trialDaysRemaining={warZoneTrialDaysRemaining}
          />
        </Suspense>
      </>
    );
  }

  // Landing view
  return (
    <>
      <LandingView
        onSubscribe={handleSubscribeClick}
        billingInterval={billingInterval}
        setBillingInterval={setBillingInterval}
        isProcessing={isProcessing}
      />

      {/* Modals */}
      <Suspense fallback={null}>
        <DisclaimerPopup
          isOpen={showDisclaimer}
          onClose={() => setShowDisclaimer(false)}
          onAccept={handleProceedToCheckout}
          isProcessing={isProcessing}
          billingInterval={billingInterval}
          isTopSecretMember={isTopSecretMember}
          onSelectBundle={handleBundleCheckout}
        />
      </Suspense>

      <Suspense fallback={null}>
        <LoginRequiredPopup
          isOpen={showLoginPopup}
          onClose={() => setShowLoginPopup(false)}
          onLogin={handleLoginRedirect}
        />
      </Suspense>
      
      {/* 🔥 Bundle Upgrade Popup */}
      <BundleUpgradePopup />
    </>
  );
}

export default memo(Warzonelanding);