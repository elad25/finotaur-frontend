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
  Shield, Clock, ArrowRight,
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
  { q: "What do I get with my subscription?", a: "Daily market briefing, weekly tactical review, access to our private trading community, and the Finotaur Trading Room with live analysis." },
  { q: "Is this just another stock newsletter?", a: "No. WAR ZONE is a professional-grade market briefing — the same style institutional trading desks use. Not stock picks. Not hype. Pure market intelligence." },
  { q: "Can I cancel anytime?", a: "Absolutely. No contracts, no commitments, no questions asked. Cancel with one click from your account settings." }
];

const STATS = [
  { value: '9:00 AM', label: 'Daily Delivery' },
  { value: 'Desk', label: 'Style Research' },
  { value: '7 Days', label: 'Free Trial' },
  { value: 'Live', label: 'Trading Room' }
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
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 heading-serif">Trusted Morning Intelligence</h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">Real feedback from traders who start the day with a structured market brief instead of scattered headlines.</p>
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
    <section id="warzone-pricing" className="py-24 px-6 relative overflow-hidden">
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
    <section id="warzone-pricing" className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0a08] to-[#0a0a0a]"/>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent"/>
      <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-[#C9A646]/[0.05] rounded-full blur-[130px]"/>
      
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-white heading-serif block">More Than Just a Briefing</span>
            <span className="heading-serif text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] to-[#F4D97B]">Join the Community</span>
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
            <span className="text-white heading-serif block">Frequently Asked</span>
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
  isTopSecretMember = false,
  onBundleSubscribe,
  onBundleYearlySubscribe,
}: {
  onSubscribe: () => void;
  setBillingInterval: (interval: BillingInterval) => void;
  isTopSecretMember?: boolean;
  onBundleSubscribe?: () => void;
  onBundleYearlySubscribe?: () => void;
}) {
  const [pricingInterval, setPricingInterval] = useState<BillingInterval>('monthly');
  const isYearly = pricingInterval === 'yearly';
  const platformPrice = isYearly ? 999 : 109;
  const platformPeriod = isYearly ? '/year' : '/month';
  const warZonePrice = isYearly ? CONFIG.YEARLY_PRICE : CONFIG.MONTHLY_PRICE;
  const warZonePeriod = isYearly ? '/year' : '/month';

  const selectInterval = useCallback((interval: BillingInterval) => {
    setPricingInterval(interval);
    setBillingInterval(interval);
  }, [setBillingInterval]);

  const handleWarZoneCheckout = useCallback(() => {
    setBillingInterval(pricingInterval);
    onSubscribe();
  }, [onSubscribe, pricingInterval, setBillingInterval]);

  const handlePlatformCheckout = useCallback(() => {
    setBillingInterval(pricingInterval);
    if (pricingInterval === 'yearly') {
      onBundleYearlySubscribe?.();
      return;
    }
    onBundleSubscribe?.();
  }, [onBundleSubscribe, onBundleYearlySubscribe, pricingInterval, setBillingInterval]);

  const pricingCards = [
    {
      badge: 'WAR ZONE',
      title: 'Daily Market Briefing',
      copy: 'Institutional-grade market intelligence before the opening bell.',
      price: warZonePrice,
      period: warZonePeriod,
      note: isYearly ? `Save $${YEARLY_SAVINGS} versus monthly` : '7-day free trial. Cancel anytime.',
      cta: 'START WAR ZONE',
      action: handleWarZoneCheckout,
      icon: Target,
      featured: false,
      features: [
        'Daily briefing before the market opens',
        'Macro, sector flow, risk tone and key levels',
        'Actionable market context in one clear morning read',
        'Private community and trading room access',
      ],
    },
    {
      badge: 'FINOTAUR PLATFORM',
      title: 'Complete Trading Ecosystem',
      copy: 'The wider Finotaur platform for traders who want the full operating layer.',
      price: platformPrice,
      period: platformPeriod,
      note: isYearly ? 'Master Plan annual platform price' : 'Includes the broader platform suite.',
      cta: 'START FINOTAUR',
      action: handlePlatformCheckout,
      icon: Crown,
      featured: true,
      features: [
        'Everything in War Zone',
        'Top Secret research and premium reports',
        'Journal Premium and trading workflow tools',
        'AI tools, platform intelligence and broader trader suite',
      ],
    },
  ];

  return (
    <section id="warzone-pricing" className="relative overflow-hidden px-6 py-24 md:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_0%,rgba(235,195,92,0.30),transparent_25%),radial-gradient(circle_at_48%_18%,rgba(201,166,70,0.16),transparent_34%),linear-gradient(180deg,#10100d_0%,#050505_52%,#080705_100%)]" />
      <div className="absolute -left-24 -top-28 h-[520px] w-[520px] opacity-40">
        <div className="absolute inset-0 rounded-full border border-[#C9A646]/24" />
        <div className="absolute inset-5 rounded-full border border-[#C9A646]/20" />
        <div className="absolute inset-10 rounded-full border border-[#C9A646]/18" />
        <div className="absolute inset-16 rounded-full border border-[#C9A646]/14" />
        <div className="absolute inset-24 rounded-full border border-[#C9A646]/10" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/42 to-transparent" />
      <div className="absolute left-1/2 top-[34%] h-[660px] w-[980px] -translate-x-1/2 rounded-full bg-[#C9A646]/[0.07] blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-[1040px]">
        <div className="mx-auto mb-8 max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-[#C9A646]/44 bg-black/24 px-5 py-2.5 shadow-[0_0_32px_rgba(201,166,70,0.13)] backdrop-blur-md">
            <Crown className="h-4 w-4 text-[#E8C766]" />
            <span className="luxury-kicker text-sm text-[#E8C766]">Choose Your Access</span>
          </div>
          <h2 className="heading-serif text-5xl font-semibold leading-[0.95] text-white md:text-6xl lg:text-7xl">
            War Zone Alone.
            <span className="block">
              Or the <span className="text-[#D6AA3E]">Full Platform.</span>
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#E7DEC8]/74">
            Pick the intelligence layer you need now.
            <span className="block">Upgrade when you want the complete Finotaur ecosystem around it.</span>
          </p>
        </div>

        <div className="relative mb-8 flex justify-center">
          <div className="grid grid-cols-2 rounded-full border border-[#C9A646]/34 bg-black/42 p-1 shadow-[0_18px_48px_rgba(0,0,0,0.48)] backdrop-blur-xl">
            {(['monthly', 'yearly'] as BillingInterval[]).map((interval) => (
              <button
                key={interval}
                type="button"
                onClick={() => selectInterval(interval)}
                className={cn(
                  'h-12 min-w-[132px] rounded-full px-8 text-sm font-semibold transition-all duration-300',
                  pricingInterval === interval
                    ? 'border border-[#F4D97B]/42 bg-[linear-gradient(180deg,#F4D97B_0%,#C79B32_100%)] text-black shadow-[0_12px_30px_rgba(201,166,70,0.28)]'
                    : 'text-[#E8DCC4]/76 hover:text-[#F4D97B]'
                )}
              >
                {interval === 'monthly' ? 'Monthly' : 'Yearly'}
              </button>
            ))}
          </div>
          <div className="absolute left-[calc(50%+160px)] top-1 hidden items-center gap-3 text-[#D6AA3E] lg:flex">
            <div className="h-px w-12 rotate-[-12deg] bg-[#D6AA3E]/70" />
            <p className="heading-serif text-lg italic leading-tight">Save more<br />with yearly</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {pricingCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.badge}
                className={cn(
                  'relative min-h-[560px] overflow-hidden rounded-[26px] border p-8 md:p-10',
                  card.featured
                    ? 'border-[#D6AA3E]/80 bg-[linear-gradient(145deg,rgba(27,25,20,0.94),rgba(9,10,10,0.98))] shadow-[0_0_58px_rgba(201,166,70,0.16)]'
                    : 'border-[#D6AA3E]/58 bg-[linear-gradient(145deg,rgba(19,19,17,0.94),rgba(7,8,8,0.98))]'
                )}
              >
                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#F4D97B]/72 to-transparent" />
                {card.featured && (
                  <div className="absolute right-7 top-6 rounded-lg border border-[#F4D97B]/28 bg-[linear-gradient(180deg,#F4D97B,#B88422)] px-4 py-2 text-xs font-black text-black shadow-[0_10px_24px_rgba(201,166,70,0.22)]">
                    BEST VALUE
                  </div>
                )}

                <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-full border border-[#D6AA3E]/55 bg-[radial-gradient(circle_at_35%_24%,rgba(244,217,123,0.46),rgba(201,166,70,0.14)_42%,rgba(0,0,0,0.2)_100%)] shadow-[0_0_28px_rgba(201,166,70,0.18)]">
                  <Icon className="h-6 w-6 text-[#E8C766]" />
                </div>

                <div className="mb-7 border-b border-[#C9A646]/20 pb-6">
                  <p className="luxury-kicker mb-3 text-sm text-[#C9A646]">{card.badge}</p>
                  <h3 className="heading-serif text-3xl font-semibold leading-tight text-white md:text-[2.45rem]">{card.title}</h3>
                  <p className="mt-3 max-w-[360px] text-base leading-7 text-[#E7DEC8]/70">{card.copy}</p>
                </div>

                <div className="mb-5">
                  <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                    <span className="heading-serif text-5xl font-semibold leading-none text-white md:text-6xl">
                      ${card.price.toLocaleString()}
                    </span>
                    <span className="pb-2 text-lg font-medium text-[#E7DEC8]/68">{card.period}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#D6AA3E]">{card.note}</p>
                </div>

                <button
                  type="button"
                  onClick={card.action}
                  className="mb-8 flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-[#F4D97B]/26 bg-[linear-gradient(180deg,#E3BD55_0%,#B98627_100%)] px-6 text-sm font-black uppercase tracking-[0.04em] text-black shadow-[0_18px_42px_rgba(201,166,70,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(201,166,70,0.28)]"
                >
                  {card.cta}
                  <ArrowRight className="h-4 w-4" />
                </button>

                <div className="space-y-4">
                  {card.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-[#D6AA3E]/70">
                        <Check className="h-3.5 w-3.5 text-[#E8C766]" />
                      </span>
                      <span className="text-sm font-medium leading-relaxed text-[#F5EAD0]/78">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-7 text-[#E7DEC8]/68">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#C9A646]/38 bg-[#C9A646]/8">
              <Shield className="h-4 w-4 text-[#E8C766]" />
            </span>
            <span className="text-sm">Secure payment</span>
          </div>
          <div className="hidden h-6 w-px bg-[#C9A646]/30 sm:block" />
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#C9A646]/38 bg-[#C9A646]/8">
              <Clock className="h-4 w-4 text-[#E8C766]" />
            </span>
            <span className="text-sm">Free trial available</span>
          </div>
          <div className="hidden h-6 w-px bg-[#C9A646]/30 sm:block" />
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#C9A646]/38 bg-[#C9A646]/8">
              <XCircle className="h-4 w-4 text-[#E8C766]" />
            </span>
            <span className="text-sm">Cancel anytime</span>
          </div>
        </div>
      </div>
    </section>
  );

  // 🔥 If Top Secret member - show BUNDLE ONLY pricing
  if (isTopSecretMember && onBundleSubscribe) {
    return (
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0a08] to-[#0a0a0a]"/>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent"/>
        
        {/* Enhanced Gold Orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-[#C9A646]/[0.12] rounded-full blur-[150px]"/>
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#D4AF37]/[0.10] rounded-full blur-[100px]"/>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-8">
            {/* Special Badge for Top Secret Members */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                 style={{ background: 'rgba(201,166,70,0.15)', border: '1px solid rgba(201,166,70,0.3)' }}>
              <Sparkles className="w-4 h-4 text-[#C9A646]" />
              <span className="text-[#C9A646] text-sm font-semibold">Exclusive Offer for Top Secret Members</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              <span className="text-white heading-serif block">Add War Zone to Your Arsenal</span>
              <span className="heading-serif text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] to-[#F4D97B]">Get the Ultimate Bundle</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              As a Top Secret member, get War Zone + Top Secret together and save $50.98/month
            </p>
          </div>

          {/* Bundle Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Monthly Bundle Card */}
            <div
              className="relative p-8 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.98) 100%)',
                border: '2px solid rgba(201,166,70,0.5)',
                boxShadow: '0 0 50px rgba(201,166,70,0.2)'
              }}
            >
              {/* Badge */}
              <div className="absolute -top-3 left-8">
                <div className="px-4 py-1.5 rounded-full text-sm font-bold shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                    color: '#000'
                  }}
                >
                  🔥 BEST VALUE
                </div>
              </div>

              <div className="pt-6">
                {/* Bundle Header */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
                     style={{
                       background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.1) 100%)',
                       border: '1px solid rgba(201,166,70,0.4)'
                     }}>
                  <Crown className="w-4 h-4 text-[#C9A646]" />
                  <span className="text-[#C9A646] text-sm font-semibold">Finotaur Platform</span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">
                  Complete Trading Ecosystem
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  War Zone + Top Secret + Journal Premium + Full Platform
                </p>

                {/* Price Comparison */}
                <div className="space-y-2 mb-4 p-3 rounded-xl bg-white/5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">War Zone Newsletter</span>
                    <span className="text-slate-300 line-through">$69.99</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Top Secret Reports</span>
                    <span className="text-slate-300 line-through">$89.99</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Journal Premium</span>
                    <span className="text-slate-300 line-through">$40.00</span>
                  </div>
                  <div className="border-t border-slate-700 my-2" />
                  <div className="flex justify-between">
                    <span className="text-slate-300">Separately:</span>
                    <span className="text-slate-200 line-through">$199.98/mo</span>
                  </div>
                </div>

                {/* Bundle Price */}
                <div className="mb-4">
                  <div className="flex items-baseline justify-start gap-2 mb-1">
                    <span className="text-5xl font-bold text-white">$109</span>
                    <span className="text-xl text-slate-400">/month</span>
                  </div>
                  <p className="text-emerald-400 text-base font-semibold">
                    Save $90.98/month! 🎉
                  </p>
                </div>

                {/* Trial Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4"
                     style={{
                       background: 'rgba(16,185,129,0.15)',
                       border: '1px solid rgba(16,185,129,0.3)'
                     }}>
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-semibold">14-Day Free Trial</span>
                </div>

                {/* Bundle CTA */}
                <button
                  onClick={onBundleSubscribe}
                  className="w-full py-5 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] mb-3 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #B8963F 0%, #C9A646 30%, #F4D97B 50%, #C9A646 70%, #B8963F 100%)',
                    color: '#000',
                    boxShadow: '0 8px 32px rgba(201,166,70,0.4)'
                  }}
                >
                  <Crown className="w-5 h-5" />
                  GET BUNDLE — $109/mo
                </button>

                <p className="text-xs text-center text-slate-500 mb-4">
                  7-day free trial. Cancel anytime.
                </p>

                {/* What's Included */}
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <p className="text-xs text-slate-500 font-medium mb-2">WHAT'S INCLUDED:</p>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#C9A646] flex-shrink-0" />
                    <span className="text-sm text-slate-300">War Zone Newsletter (Daily)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#C9A646] flex-shrink-0" />
                    <span className="text-sm text-slate-300">Top Secret Reports (10/month)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#C9A646] flex-shrink-0" />
                    <span className="text-sm text-slate-300">🎁 Journal Premium INCLUDED</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#C9A646] flex-shrink-0" />
                    <span className="text-sm text-slate-300">Full Platform + AI Tools</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Yearly Bundle Card */}
            <div
              className="relative p-8 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.98) 100%)',
                border: '2px solid rgba(201,166,70,0.5)',
                boxShadow: '0 0 50px rgba(201,166,70,0.2)'
              }}
            >
              {/* Badge */}
              <div className="absolute -top-3 right-8">
                <div className="px-4 py-1.5 rounded-full text-sm font-bold shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                    color: '#000'
                  }}
                >
                  ⚡ ULTIMATE
                </div>
              </div>

              <div className="pt-6">
                {/* Bundle Yearly Header */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
                     style={{
                       background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.1) 100%)',
                       border: '1px solid rgba(201,166,70,0.4)'
                     }}>
                  <Zap className="w-4 h-4 text-[#C9A646]" />
                  <span className="text-[#C9A646] text-sm font-semibold">Finotaur Annual</span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  Finotaur Platform
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Full year access to the complete trading ecosystem
                </p>

                {/* Price Comparison */}
                <div className="space-y-2 mb-4 p-3 rounded-xl bg-white/5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Monthly Bundle × 12</span>
                    <span className="text-slate-200 line-through">$1,308</span>
                  </div>
                </div>

                {/* Bundle Yearly Price */}
                <div className="mb-4">
                  <div className="flex items-baseline justify-start gap-2 mb-1">
                    <span className="text-5xl font-bold text-white">$1,090</span>
                    <span className="text-xl text-slate-400">/year</span>
                  </div>
                  <p className="text-emerald-400 text-base font-semibold">
                    Just $90.83/month — Save $218!
                  </p>
                </div>

                {/* Benefits */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0" />
                    <span className="text-sm text-slate-300 font-medium">War Zone Newsletter (Full Year)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0" />
                    <span className="text-sm text-slate-300 font-medium">Top Secret Reports (Full Year)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0" />
                    <span className="text-sm text-slate-300 font-medium">🎁 Journal Premium INCLUDED</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0" />
                    <span className="text-sm text-slate-300 font-medium">Full Platform + AI Tools</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0" />
                    <span className="text-sm text-slate-300 font-medium">Founding Members badge</span>
                  </div>
                </div>

                {/* Bundle Yearly CTA */}
                <button
                  onClick={() => { setBillingInterval('yearly'); onBundleSubscribe?.(); }}
                  className="w-full py-5 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] mb-3 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #B8963F 0%, #C9A646 30%, #F4D97B 50%, #C9A646 70%, #B8963F 100%)',
                    color: '#000',
                    boxShadow: '0 8px 32px rgba(201,166,70,0.4)'
                  }}
                >
                  GET BUNDLE ANNUAL
                  <ArrowRight className="w-5 h-5" />
                </button>

                <p className="text-xs text-center text-slate-500">
                  Locked price. Cancel anytime.
                </p>
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
  }

  // 🔥 Regular users - show standard War Zone pricing
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
            <span className="text-white heading-serif block">You are Already in the Market.</span>
            <span className="heading-serif text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] to-[#F4D97B]">Why Do It Without WAR ZONE?</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Monthly Card */}
          <div
            className="relative p-8 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.98) 100%)',
              border: '2px solid rgba(201,166,70,0.4)',
              boxShadow: '0 0 40px rgba(201,166,70,0.15)'
            }}
          >
            {/* Badge */}
            <div className="absolute -top-3 left-8">
              <div className="px-4 py-1.5 rounded-full text-sm font-bold shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: '#000'
                }}
              >
                MONTHLY
              </div>
            </div>
            
            <div className="pt-6">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold text-white">${CONFIG.MONTHLY_PRICE}</span>
                  <span className="text-xl text-slate-400">/month</span>
                </div>
                <p className="text-sm font-bold text-emerald-400 mb-1">FREE 7 DAY TRIAL</p>
              </div>
              
{/* CTA Button */}
              <button 
                onClick={onSubscribe} 
                className="w-full py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 mb-3"
                style={{ 
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)', 
                  color: '#000', 
                  boxShadow: '0 8px 32px rgba(201,166,70,0.4)' 
                }}
              >
                START FREE TRIAL <ArrowRight className="w-5 h-5"/>
              </button>
              <p className="text-xs text-center text-slate-500 mb-6">Risk-free. Cancel anytime.</p>
              
              {/* Features */}
              <div className="space-y-4 border-t border-slate-800 pt-6">
                <div>
                  <div className="flex items-start gap-2 mb-1">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0 mt-0.5"/>
                    <span className="text-base font-bold text-white">Daily Market Briefing</span>
                  </div>
                  <p className="text-sm text-slate-400 ml-7">Every trading day at 9:00 AM NY. Know exactly what matters before the market opens.</p>
                </div>
                
                <div>
                  <div className="flex items-start gap-2 mb-1">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0 mt-0.5"/>
                    <span className="text-base font-bold text-white">Sector Rotation Intel</span>
                  </div>
                  <p className="text-sm text-slate-400 ml-7">Where institutional money is flowing — and where it is leaving. Position before the crowd.</p>
                </div>
                
                <div>
                  <div className="flex items-start gap-2 mb-1">
                    <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0 mt-0.5"/>
                    <span className="text-base font-bold text-white">Private Discord + Trading Room</span>
                  </div>
                  <p className="text-sm text-slate-400 ml-7">24/7 access to serious traders and real-time market discussion.</p>
                </div>
              </div>
            </div>
          </div>

{/* Yearly Card */}
          <div
            className="relative p-8 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.98) 100%)',
              border: '2px solid rgba(201,166,70,0.5)',
              boxShadow: '0 0 50px rgba(201,166,70,0.2)'
            }}
          >
            {/* Badge - Left */}
            <div className="absolute -top-3 left-8">
              <div className="px-4 py-1.5 rounded-full text-sm font-bold shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: '#000'
                }}
              >
                YEARLY
              </div>
            </div>
            
            {/* Badge - Right */}
            <div className="absolute -top-3 right-8">
              <div className="px-3 py-1.5 rounded-full text-xs font-bold shadow-lg bg-emerald-500 text-white">
                🔥 BEST DEAL
              </div>
            </div>
            <div className="pt-6">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold text-white">${CONFIG.YEARLY_PRICE}</span>
                  <span className="text-xl text-slate-400">/year</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-slate-500 line-through text-sm">${Math.round(CONFIG.MONTHLY_PRICE * 12)}/year</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">SAVE ${YEARLY_SAVINGS}</span>
                </div>
                <p className="text-emerald-400 text-base font-semibold">→ That's only ${Math.round(CONFIG.YEARLY_PRICE / 12)}/month</p>
              </div>
              
              <div className="bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-xl p-3 mb-5">
                <p className="text-[#C9A646] text-sm font-medium text-center flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" />
                  Lock in this price before it increases
                </p>
              </div>
              
              {/* CTA Button */}
              <button 
                onClick={() => { setBillingInterval('yearly'); onSubscribe(); }} 
                className="w-full py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 mb-3"
                style={{ 
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)', 
                  color: '#000', 
                  boxShadow: '0 8px 32px rgba(201,166,70,0.4)' 
                }}
              >
                GET 2 MONTHS FREE <ArrowRight className="w-5 h-5"/>
              </button>
              <p className="text-xs text-center text-slate-500 mb-6">Locked price forever. Cancel anytime.</p>
              
              {/* Features */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0"/>
                  <span className="text-sm text-slate-300 font-medium">Everything in Monthly</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0"/>
                  <span className="text-sm text-slate-300 font-medium">Price Locked Forever</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0"/>
                  <span className="text-sm text-slate-300 font-medium">Founding Member Status</span>
                </div>
              </div>
              
              {/* Additional Perks */}
              <div className="space-y-2 border-t border-slate-800 pt-6">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#C9A646] flex-shrink-0"/>
                  <span className="text-sm text-slate-400">Cancel anytime</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#C9A646] flex-shrink-0"/>
                  <span className="text-sm text-slate-400">Best yearly value</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#C9A646] flex-shrink-0"/>
                  <span className="text-sm text-slate-400">No lock-in contracts</span>
                </div>
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
// HERO CINEMATIC VISUAL
// ============================================

const WarZoneBriefingMockup = memo(function WarZoneBriefingMockup({ compact = false }: { compact?: boolean }) {
  const levels = [
    ['SPX', '5,300', 'Resistance'],
    ['QQQ', '438', 'Support'],
    ['DXY', '104.32', 'Watch'],
  ];

  const sectors = [
    ['Tech', '+0.64%', 'w-[78%]', 'bg-emerald-300'],
    ['Energy', '-0.18%', 'w-[46%]', 'bg-rose-300'],
    ['Banks', '+0.31%', 'w-[63%]', 'bg-emerald-300'],
  ];

  return (
    <div className={cn('relative mx-auto w-full', compact ? 'max-w-[390px] h-[390px]' : 'max-w-[760px] h-[640px]')}>
      <div className="absolute inset-0 rounded-full bg-[#C9A646]/10 blur-[120px]" />
      <div className="absolute left-1/2 top-1/2 h-[84%] w-[84%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#C9A646]/12" />
      <div className="absolute left-[8%] top-[10%] h-[76%] w-[84%] rounded-[32px] border border-[#C9A646]/10 bg-[#C9A646]/[0.035] blur-sm" />

      <div
        className={cn(
          'absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rotate-[-2deg] rounded-[30px] border border-[#D8B65A]/34 bg-[linear-gradient(145deg,rgba(20,18,12,0.96),rgba(6,6,5,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.68),0_0_80px_rgba(201,166,70,0.16)] backdrop-blur-xl',
          compact ? 'w-[350px] p-5' : 'w-[610px] p-7'
        )}
      >
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#F4D97B]/70 to-transparent" />
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#C9A646]/16 pb-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C9A646]/24 bg-[#C9A646]/10 px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 text-[#E8C766]" />
              <span className="luxury-kicker text-xs text-[#E8C766]">9:00 AM ET</span>
            </div>
            <h3 className={cn('heading-serif font-semibold leading-none text-white', compact ? 'text-3xl' : 'text-5xl')}>
              Daily Market
              <span className="block text-[#E8C766]">Briefing</span>
            </h3>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#C9A646]/30 bg-[#C9A646]/10">
            <BarChart3 className="h-6 w-6 text-[#E8C766]" />
          </div>
        </div>

        <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-[1.1fr_0.9fr]')}>
          <div className="rounded-2xl border border-[#C9A646]/16 bg-black/26 p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="luxury-kicker text-sm text-[#E8C766]">Market Map</p>
              <Activity className="h-4 w-4 text-emerald-300" />
            </div>
            <p className={cn('font-semibold text-white', compact ? 'text-lg' : 'text-2xl')}>Before the opening bell</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {['Macro', 'Flow', 'Levels', 'Risk', 'Sector', 'Catalyst'].map((item, index) => (
                <div key={item} className="rounded-xl border border-[#C9A646]/12 bg-[#0D0C09]/80 p-3">
                  <p className="text-[11px] font-semibold text-[#D9CCAE]/48">{item}</p>
                  <p className={cn('mt-2 font-black', index === 3 ? 'text-rose-300' : 'text-emerald-300')}>
                    {index === 3 ? 'High' : 'Clear'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#C9A646]/16 bg-black/26 p-4">
              <p className="luxury-kicker mb-3 text-sm text-[#E8C766]">Sector Flow</p>
              <div className="space-y-3">
                {sectors.map(([name, value, width, color]) => (
                  <div key={name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-bold text-white">{name}</span>
                      <span className={cn('font-semibold', value.startsWith('+') ? 'text-emerald-300' : 'text-rose-300')}>{value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className={cn('h-full rounded-full', width, color)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!compact && (
              <div className="rounded-2xl border border-[#C9A646]/16 bg-black/26 p-4">
                <p className="luxury-kicker mb-3 text-sm text-[#E8C766]">Key Levels</p>
                <div className="space-y-2">
                  {levels.map(([symbol, value, label]) => (
                    <div key={symbol} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2">
                      <div>
                        <p className="text-sm font-black text-white">{symbol}</p>
                        <p className="text-xs text-[#D9CCAE]/48">{label}</p>
                      </div>
                      <p className="heading-serif text-lg font-semibold text-[#E8C766]">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {!compact && (
          <div className="mt-4 rounded-2xl border border-[#C9A646]/16 bg-black/26 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#E8C766]" />
              <p className="luxury-kicker text-sm text-[#E8C766]">Briefing Timeline</p>
            </div>
            <div className="grid gap-3">
              {['Asia close confirms risk tone', 'Dollar strength sets the range', 'Premarket movers ranked by catalyst'].map((item, index) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#C9A646]/20 bg-[#C9A646]/8 text-xs font-bold text-[#E8C766]">
                    {index + 1}
                  </div>
                  <p className="text-sm font-medium text-[#F5EAD0]/82">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={cn('absolute z-20 rounded-2xl border border-[#C9A646]/26 bg-black/48 p-4 backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.45)]', compact ? 'bottom-1 left-5 right-5' : 'bottom-10 right-4 w-[250px]')}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#C9A646]/28 bg-[#C9A646]/10">
            <Target className="h-5 w-5 text-[#E8C766]" />
          </div>
          <div>
            <p className="heading-serif text-lg font-semibold text-white">Ready at 9:00 AM</p>
            <p className="mt-1 text-sm leading-relaxed text-[#E5D8B7]/68">Macro, flow, levels and trade context in one clear morning brief.</p>
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================
// HERO SECTION - MOBILE
// ============================================

const HeroMobile = memo(function HeroMobile({}: {
  onSubscribe: () => void;
}) {
  const scrollToPricing = useCallback(() => {
    document.getElementById('warzone-pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="lg:hidden relative z-10 min-h-screen flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_8%,rgba(201,166,70,0.12),transparent_45%)] pointer-events-none" />
      <div className="flex-1 flex flex-col items-center px-5 pt-7 relative">
        <div 
          className="mb-5 inline-flex items-center gap-2 self-center rounded-full px-4 py-2"
          style={{
            background: 'linear-gradient(135deg, rgba(201,166,70,0.18), rgba(201,166,70,0.04))',
            border: '1px solid rgba(201,166,70,0.34)',
            boxShadow: '0 0 30px rgba(201,166,70,0.12)'
          }}
        >
          <BarChart3 className="h-4 w-4 text-[#C9A646]" />
          <span className="luxury-kicker text-[12px] text-[#C9A646]">Daily Briefing</span>
        </div>

        {/* Title */}
        <h1 className="text-[2.2rem] sm:text-[2.55rem] font-bold leading-[0.98] tracking-tight text-center mb-4 drop-shadow-[0_10px_38px_rgba(0,0,0,0.45)]">
          <span className="text-white block heading-serif">Before the Bell.</span>
          <span className="text-white block heading-serif">Know the</span>
          <span className="relative inline-block mt-1">
            <span className="heading-serif text-transparent bg-clip-text bg-gradient-to-r from-[#B9912E] via-[#F4D97B] to-[#C9A646]">Battlefield.</span>
          </span>
        </h1>
        {/* Description */}
        <p className="text-[#E5D8B7]/70 text-sm leading-7 text-center mb-5 max-w-sm">
          <span className="text-[#C9A646] font-bold">WAR ZONE</span> gives you the same institutional market briefing Wall Street desks use — <span className="text-[#E8DCC4] font-medium">before the market opens.</span> Every single day.
        </p>

        <WarZoneBriefingMockup compact />

        {/* CTA Button */}
        <button 
          onClick={scrollToPricing} 
          className="group mt-5 px-7 py-3.5 text-sm font-bold rounded-full transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2.5 mb-7 uppercase tracking-[0.08em]"
          style={{ 
            background: 'linear-gradient(180deg, #F6E7A7 0%, #D9B84F 48%, #A97820 100%)', 
            color: '#090704', 
            border: '1px solid rgba(255,240,177,0.38)',
            boxShadow: '0 12px 34px rgba(201,166,70,0.22), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(79,49,5,0.28)' 
          }}
        >
          TRY NOW FOR FREE
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
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

const HeroDesktop = memo(function HeroDesktop({}: {
  onSubscribe: () => void;
}) {
  const scrollToPricing = useCallback(() => {
    document.getElementById('warzone-pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="hidden lg:block relative z-10 min-h-screen">
      <div className="flex min-h-screen">
        {/* Left Column */}
        <div className="w-[47%] bg-[#070604] flex flex-col justify-center pl-20 xl:pl-28 2xl:pl-36 pr-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_28%_42%,rgba(201,166,70,0.105),transparent_58%)]" />
          <div className="absolute left-20 top-[18%] h-px w-56 luxury-hairline" />
          <div className="absolute inset-0 z-1 opacity-20">
            <SparkleEffect />
          </div>
          
          <div 
            className="relative z-20 mb-8 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.045) 100%)',
              border: '1px solid rgba(201,166,70,0.38)',
              boxShadow: '0 0 40px rgba(201,166,70,0.14), inset 0 1px 0 rgba(255,255,255,0.08)'
            }}
          >
            <BarChart3 className="h-5 w-5 text-[#C9A646]" />
            <span className="luxury-kicker text-sm text-[#C9A646]">Daily Briefing</span>
          </div>

          <h1 className="text-[3.4rem] xl:text-[4.15rem] 2xl:text-[4.85rem] font-bold leading-[0.96] tracking-tight mb-8 relative z-20 drop-shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
            <span className="text-white block heading-serif">Before the Bell.</span>
            <span className="text-white block heading-serif">Know the</span>
            <span className="relative inline-block mt-2">
              <span className="absolute inset-0 blur-3xl opacity-28 bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]" />
              <span className="relative heading-serif text-transparent bg-clip-text bg-gradient-to-r from-[#B9912E] via-[#F1D36E] to-[#C9A646]">Battlefield.</span>
            </span>
          </h1>

          <p className="text-[#E5D8B7]/72 text-lg leading-8 mb-8 max-w-xl relative z-20">
            <span className="font-bold" style={{ color: '#E9A931' }}>WAR ZONE</span> gives you the same institutional market briefing Wall Street desks use — <span className="text-[#E8DCC4] font-medium">before the market opens.</span> Every single day.
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-8 relative z-20">
            <button 
              onClick={scrollToPricing} 
              className="group px-7 py-3.5 text-sm font-bold rounded-full transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2.5 uppercase tracking-[0.08em]"
              style={{ 
                background: 'linear-gradient(180deg, #F6E7A7 0%, #D9B84F 48%, #A97820 100%)', 
                color: '#090704', 
                border: '1px solid rgba(255,240,177,0.38)',
                boxShadow: '0 14px 38px rgba(201,166,70,0.22), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(79,49,5,0.28)' 
              }}
            >
              TRY NOW FOR FREE
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="relative z-20">
            <FeatureIcons />
          </div>
        </div>

        {/* Right Column - Intelligence Preview */}
        <div className="w-[53%] relative flex items-center justify-center overflow-hidden bg-[#060504] px-10">
          <div className="absolute inset-0 z-0">
            <ParticleBackground />
          </div>
          <div className="absolute inset-0 z-[5] bg-[radial-gradient(ellipse_at_54%_44%,rgba(201,166,70,0.13),rgba(6,5,4,0.55)_46%,rgba(6,5,4,0.92)_100%)]" />
          
          <div className="absolute inset-0 z-10">
            <SparkleEffect />
          </div>
          
          <div 
            className="absolute bottom-[16%] left-1/2 -translate-x-1/2 w-[780px] h-[240px] z-10"
            style={{ 
              background: 'radial-gradient(ellipse, rgba(232,199,102,0.26) 0%, rgba(201,166,70,0.1) 42%, transparent 72%)', 
              filter: 'blur(40px)' 
            }}
          />
          
          <div className="relative z-20 w-full">
            <WarZoneBriefingMockup />
          </div>
          
          {/* Edge gradients */}
          <div className="absolute inset-y-0 left-0 w-64 z-30" style={{ background: 'linear-gradient(90deg, #070604 0%, rgba(7,6,4,0.95) 35%, rgba(7,6,4,0.58) 72%, transparent 100%)' }} />
          <div className="absolute inset-x-0 top-0 h-48 z-30" style={{ background: 'linear-gradient(180deg, #0a0806 0%, rgba(10,8,6,0.9) 30%, rgba(10,8,6,0.5) 60%, transparent 100%)' }} />
          <div className="absolute inset-y-0 right-0 w-56 z-30" style={{ background: 'linear-gradient(270deg, #0a0806 0%, rgba(10,8,6,0.95) 25%, rgba(10,8,6,0.5) 60%, transparent 100%)' }} />
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
  isTopSecretMember = false,
  onBundleSubscribe,
  onBundleYearlySubscribe,
}: {
  onSubscribe: () => void;
  billingInterval: BillingInterval;
  setBillingInterval: (interval: BillingInterval) => void;
  isProcessing: boolean;
  isTopSecretMember?: boolean;
  onBundleSubscribe?: () => void;
  onBundleYearlySubscribe?: () => void;
}) {
  return (
    <div className="warzone-luxury-page min-h-screen bg-[#070604] overflow-hidden relative">
      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');
        .heading-serif,.heading-formal{font-family:'Playfair Display',Georgia,serif;font-style:normal;letter-spacing:-0.018em}
        .warzone-luxury-page h1,
        .warzone-luxury-page h2,
        .warzone-luxury-page h3,
        .warzone-luxury-page h4,
        .warzone-luxury-page .heading-serif,
        .warzone-luxury-page .heading-formal{
          font-family:'Playfair Display',Georgia,serif;
          font-style:normal!important;
          font-weight:600;
          letter-spacing:-0.018em;
        }
        .warzone-luxury-page h1{letter-spacing:-0.024em}
        .warzone-luxury-page h2{letter-spacing:-0.02em}
        .warzone-luxury-page h3,
        .warzone-luxury-page h4{letter-spacing:-0.006em}
        .warzone-luxury-page .luxury-kicker{
          font-family:'Playfair Display',Georgia,serif;
          font-weight:600;
          letter-spacing:.045em;
          text-transform:none;
        }
        .luxury-hairline{background:linear-gradient(90deg,transparent,rgba(232,199,102,.58),transparent)}
        @keyframes hero-orb{0%,100%{transform:scale(1);opacity:0.08}50%{transform:scale(1.1);opacity:0.12}}
        .hero-orb{animation:hero-orb 8s ease-in-out infinite}
        @keyframes particle-rise { 0% { transform: translateY(0) scale(1); opacity: 0; } 10% { opacity: 0.7; } 80% { opacity: 0.5; } 100% { transform: translateY(-85vh) scale(0.3); opacity: 0; } }
        @keyframes sparkle { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* HERO SECTION */}
      <section className="relative min-h-screen">
        {/* Base Background */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#050504_0%,#090805_42%,#050504_100%)]" />
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(201,166,70,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(201,166,70,0.035)_1px,transparent_1px)] [background-size:140px_110px]" />
        
        {/* Animated Orbs */}
        <div className="absolute top-[10%] left-[-10%] w-[700px] h-[700px] bg-[#C9A646]/[0.06] rounded-full blur-[150px] hero-orb"/>
        <div className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] bg-[#D4BF8E]/[0.045] rounded-full blur-[140px] hero-orb" style={{animationDelay:'3s'}}/>
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-[#F4D97B]/[0.03] rounded-full blur-[130px] hero-orb" style={{animationDelay:'5s'}}/>

        <HeroMobile onSubscribe={onSubscribe} />
        
        {/* Seam cover - gradient that hides the column boundary */}
        <div className="hidden lg:block absolute inset-0 z-[35] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 45%, #070604 49%, #070604 51%, transparent 55%)',
          }}
        />
        
        <HeroDesktop onSubscribe={onSubscribe} />
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
        isTopSecretMember={isTopSecretMember}
        onBundleSubscribe={onBundleSubscribe}
        onBundleYearlySubscribe={onBundleYearlySubscribe}
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
        product_type: 'platform_finotaur',
        billing_interval: 'monthly',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
      console.log('✅ Pending checkout saved for Finotaur Platform');
      
      // Get access token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
// Finotaur Platform plan ID - $109/month with 14-day trial
const finotaurPlanId = 'plan_ICooR8aqtdXad';
      
      // Try Edge Function first
      if (accessToken) {
        try {
          const response = await supabase.functions.invoke('create-whop-checkout', {
            body: {
              plan_id: finotaurPlanId,
              email: user.email,
              user_id: user.id,
              subscription_category: 'platform',
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
      const checkoutBaseUrl = `https://whop.com/checkout/${finotaurPlanId}`;
      const params = new URLSearchParams();
      params.set('email', user.email);
      params.set('lock_email', 'true');
      params.set('metadata[finotaur_user_id]', user.id);
      params.set('metadata[finotaur_email]', user.email);
      params.set('metadata[checkout_token]', checkoutToken);
      params.set('metadata[product_type]', 'platform_finotaur');
      params.set('metadata[subscription_category]', 'platform');
      params.set('redirect_url', `${CONFIG.REDIRECT_URL}?payment=success&plan=platform_finotaur`);
      
      window.location.href = `${checkoutBaseUrl}?${params.toString()}`;
    } catch (e) {
      console.error('Bundle checkout error:', e);
      setIsProcessing(false);
      alert('Error starting checkout. Please try again.');
    }
  }, [user]);

  // 🔥 Handler for Bundle YEARLY checkout from popup
  const handleBundleYearlyCheckout = useCallback(async () => {
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
        product_type: 'platform_finotaur',
        billing_interval: 'yearly',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
      console.log('✅ Pending checkout saved for Finotaur Platform Yearly');
      
      // Get access token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      // Finotaur Platform Yearly plan ID - $1090/year (no trial)
      const finotaurYearlyPlanId = 'plan_M2zS1EoNXJF10';
      
      // Try Edge Function first
      if (accessToken) {
        try {
          const response = await supabase.functions.invoke('create-whop-checkout', {
            body: {
              plan_id: finotaurYearlyPlanId,
              email: user.email,
              user_id: user.id,
              subscription_category: 'bundle',
            },
          });
          
          if (response.data?.checkout_url) {
            console.log('✅ Using Edge Function checkout URL for Bundle Yearly');
            window.location.href = response.data.checkout_url;
            return;
          }
        } catch (err) {
          console.warn('⚠️ Edge Function failed, falling back to direct URL:', err);
        }
      }
      
      // Fallback: Direct URL
      const checkoutBaseUrl = `https://whop.com/checkout/${finotaurYearlyPlanId}`;
      const params = new URLSearchParams();
      params.set('email', user.email);
      params.set('lock_email', 'true');
      params.set('metadata[finotaur_user_id]', user.id);
      params.set('metadata[finotaur_email]', user.email);
      params.set('metadata[checkout_token]', checkoutToken);
      params.set('metadata[product_type]', 'platform_finotaur');
      params.set('metadata[subscription_category]', 'platform');
      params.set('metadata[billing_interval]', 'yearly');
      params.set('redirect_url', `${CONFIG.REDIRECT_URL}?payment=success&plan=platform_finotaur`);
      
      window.location.href = `${checkoutBaseUrl}?${params.toString()}`;
    } catch (e) {
      console.error('Bundle Yearly checkout error:', e);
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

// 🔥 Bundle Upgrade Popup Component - v2.0 with Monthly + Yearly tabs
  const BundleUpgradePopup = () => {
    const [bundleTab, setBundleTab] = useState<'monthly' | 'yearly'>('monthly');

    if (!showBundlePopup) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ top: '90px' }}>
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowBundlePopup(false)}
        />
        
        {/* Premium Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(15,15,15,0.98) 100%)',
            border: '2px solid rgba(201,166,70,0.4)',
            boxShadow: '0 0 60px rgba(201,166,70,0.2), 0 25px 50px -12px rgba(0,0,0,0.8)'
          }}
        >
          {/* Top Gold Line */}
          <div 
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: 'linear-gradient(90deg, transparent, #C9A646, #F4D97B, #C9A646, transparent)' }}
          />
          
          {/* Close Button */}
          <button 
            onClick={() => setShowBundlePopup(false)}
            className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors z-10"
          >
            <XCircle className="w-5 h-5 text-slate-400 hover:text-white" />
          </button>

          {/* Header */}
          <div className="px-6 pt-6 pb-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
                 style={{ background: 'rgba(201,166,70,0.15)', border: '1px solid rgba(201,166,70,0.3)' }}>
              <Sparkles className="w-4 h-4 text-[#C9A646]" />
              <span className="text-[#C9A646] text-sm font-semibold">🚀 Upgrade to Finotaur Platform</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Get the Complete Trading Ecosystem</h3>
            <p className="text-slate-400 text-sm">
              <span className="text-white font-semibold">War Zone + Top Secret + Journal Premium + Full Platform</span> — all included
            </p>
          </div>

          {/* Monthly / Yearly Tabs */}
          <div className="px-6 pb-4">
            <div className="flex rounded-xl overflow-hidden border border-[#C9A646]/30">
              <button
                onClick={() => setBundleTab('monthly')}
                className="flex-1 py-2.5 text-sm font-semibold transition-all"
                style={bundleTab === 'monthly' ? {
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)',
                  color: '#000',
                } : {
                  background: 'transparent',
                  color: '#C9A646',
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBundleTab('yearly')}
                className="flex-1 py-2.5 text-sm font-semibold transition-all relative"
                style={bundleTab === 'yearly' ? {
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)',
                  color: '#000',
                } : {
                  background: 'transparent',
                  color: '#C9A646',
                }}
              >
                Yearly
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={bundleTab === 'yearly' ? {
                    background: 'rgba(0,0,0,0.2)',
                    color: '#000',
                  } : {
                    background: 'rgba(16,185,129,0.2)',
                    color: '#10B981',
                  }}
                >
                  SAVE $218
                </span>
              </button>
            </div>
          </div>
          
          {/* Price Section — Changes based on tab */}
          <div className="px-6 pb-4">
            {bundleTab === 'monthly' ? (
              <>
                {/* Monthly Trial Badge */}
                <div className="flex justify-center mb-3">
                  <div className="px-4 py-1.5 rounded-full text-xs font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#fff',
                      boxShadow: '0 4px 15px rgba(16,185,129,0.5)'
                    }}
                  >
                    7-DAY FREE TRIAL
                  </div>
                </div>

                <div 
                  className="p-4 rounded-xl text-center mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.02) 100%)',
                    border: '1px solid rgba(201,166,70,0.2)'
                  }}
                >
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-slate-500 line-through text-sm">$69.99</span>
                    <span className="text-slate-600">+</span>
                    <span className="text-slate-500 line-through text-sm">$89.99</span>
                    <span className="text-slate-600">=</span>
                    <span className="text-slate-500 line-through text-sm">$159.98/mo</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >$109</span>
                    <span className="text-slate-400">/month</span>
                  </div>
                  <p className="text-emerald-400 text-sm font-semibold mt-1">
                    Save $50.98/month!
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Yearly — Best Value Badge */}
                <div className="flex justify-center mb-3">
                  <div className="px-4 py-1.5 rounded-full text-xs font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                      color: '#000',
                      boxShadow: '0 4px 12px rgba(201,166,70,0.4)'
                    }}
                  >
                    BEST VALUE
                  </div>
                </div>

                <div 
                  className="p-4 rounded-xl text-center mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.02) 100%)',
                    border: '1px solid rgba(201,166,70,0.2)'
                  }}
                >
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-slate-500 text-sm">Monthly Bundle × 12</span>
                    <span className="text-slate-600">=</span>
                    <span className="text-slate-500 line-through text-sm">$1,308/yr</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >$1,090</span>
                    <span className="text-slate-400">/year</span>
                  </div>
                  <p className="text-emerald-400 text-sm font-semibold mt-1">
                    Just $90.83/mo — Save $218/year!
                  </p>
                </div>
              </>
            )}
          </div>
          
          {/* Features */}
          <div className="px-6 pb-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>War Zone Daily Intelligence</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Top Secret Reports (10/mo)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>🎁 Journal Premium INCLUDED</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Full Platform Access</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>AI Scanner & Options Flow</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{bundleTab === 'monthly' ? '14-Day Free Trial' : 'Full Year Access'}</span>
              </div>
              {bundleTab === 'yearly' && (
                <>
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Check className="w-4 h-4 text-[#C9A646] flex-shrink-0" />
                    <span>Locked price 12 months</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Check className="w-4 h-4 text-[#C9A646] flex-shrink-0" />
                    <span>Founding member badge</span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* CTA Button */}
          <div className="px-6 pb-6">
            <button
              onClick={bundleTab === 'monthly' ? handleBundleCheckout : handleBundleYearlyCheckout}
              disabled={isProcessing}
              className="w-full py-4 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
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
                  <Crown className="w-5 h-5" />
                  {bundleTab === 'monthly' ? 'Start 14-Day Free Trial — $109/mo' : 'Get Finotaur Yearly — $1,090/yr'}
                </>
              )}
            </button>
            
            {/* Only show skip button if user is NOT a Top Secret member */}
            {!isTopSecretMember && (
              <button
                onClick={() => setShowBundlePopup(false)}
                className="w-full py-3 text-slate-500 hover:text-slate-400 transition-colors text-sm mt-2"
              >
                No thanks, I'll pass
              </button>
            )}
          </div>
          
          {/* Bottom Gold Line */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(201,166,70,0.5), transparent)' }}
          />
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
        isTopSecretMember={isTopSecretMember}
        onBundleSubscribe={handleBundleCheckout}
        onBundleYearlySubscribe={handleBundleYearlyCheckout}
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
          onSelectBundleYearly={handleBundleYearlyCheckout}
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
