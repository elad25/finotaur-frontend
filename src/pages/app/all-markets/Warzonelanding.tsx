// =====================================================
// FINOTAUR WAR ZONE LANDING PAGE - EXACT DESIGN MATCH
// Uses real Bull image from /assets/Bull-WarZone.png
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { ChevronRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle2, Shield, Clock, ArrowRight, LineChart, FileText,
  Activity, Loader2, Globe, ExternalLink,
  Headphones, Calendar, Sparkles, ChevronDown, ChevronUp, X, AlertCircle,
  LogIn, XCircle, CreditCard, Mail, RefreshCw, Crown, Rocket,
  TrendingUp, Maximize2, Minimize2, Eye, EyeOff, Check, Send, Target,
  BarChart3, Star, Quote, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// PERFORMANCE OPTIMIZATION - Caching & Throttling
// ============================================
import { useMemo } from 'react';

// Cache System
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class ReportCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ENTRIES = 50;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}

const reportCache = new ReportCache();

// Fetch Configuration
const FETCH_CONFIG = {
  REPORTS_CACHE_TTL: 5 * 60 * 1000,
  PROFILE_CACHE_TTL: 2 * 60 * 1000,
  MIN_FETCH_INTERVAL: 10 * 1000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  REALTIME_DEBOUNCE: 2000,
  AUTO_REFRESH_INTERVAL: 60 * 1000,
};

// Bull image path - located in public/assets folder
const BullWarZone = '/assets/Bull-WarZone.png';

// Hero background for ActiveSubscriberView
const WarZoneHeroBg = '/assets/WarZone-Hero-Bg.png';

// ============================================
// CONFIGURATION - v2.0.0
// ============================================
const WHOP_MONTHLY_PLAN_ID = 'plan_U6lF2eO5y9469';
const WHOP_YEARLY_PLAN_ID = 'plan_bp2QTGuwfpj0A';
const WHOP_MONTHLY_PLAN_ID_TOPSECRET = 'plan_BPJdT6Tyjmzcx';
const MONTHLY_PRICE = 69.99;
const YEARLY_PRICE = 699;
const MONTHLY_PRICE_TOPSECRET = 30;
const YEARLY_MONTHLY_EQUIVALENT = 58.25;
const YEARLY_SAVINGS = Math.round((MONTHLY_PRICE * 12) - YEARLY_PRICE);
const WHOP_CHECKOUT_BASE_URL_MONTHLY = `https://whop.com/checkout/${WHOP_MONTHLY_PLAN_ID}`;
const WHOP_CHECKOUT_BASE_URL_YEARLY = `https://whop.com/checkout/${WHOP_YEARLY_PLAN_ID}`;
const REDIRECT_URL = 'https://www.finotaur.com/app/all-markets/warzone';
const DISCORD_INVITE_URL = 'https://whop.com/joined/finotaur/discord-UJWtnrAZQebLPC/app/';
const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';


// ============================================
// TYPES
// ============================================
type BillingInterval = 'monthly' | 'yearly';

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

interface TopSecretStatus {
  is_active: boolean;
  membership_id: string | null;
}
interface DailyReport {
  id: string;
  report_date: string;
  report_title: string;
  markdown_content: string | null;
  html_content: string | null;
  pdf_url: string | null;
  pdf_path: string | null;
  qa_score: number;
  created_at: string;
  updated_at: string;
}

interface WeeklyReport {
  id: string;
  report_date: string;
  report_title: string;
  markdown_content: string | null;
  html_content: string | null;
  pdf_url: string | null;
  pdf_path: string | null;
  qa_score: number;
  created_at: string;
}
interface NewsletterReport {
  id: string;
  date: string;
  subject: string;
  html: string;
  generatedAt: string;
}

// ============================================
// ICONS
// ============================================
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const BellIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const CompassIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none">
    <defs>
      <linearGradient id="compassGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F4D97B" />
        <stop offset="100%" stopColor="#C9A646" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="42" stroke="url(#compassGold)" strokeWidth="2" fill="none" />
    <circle cx="50" cy="50" r="32" stroke="url(#compassGold)" strokeWidth="1" fill="none" opacity="0.5" />
    <path d="M50 12 L54 28 L50 22 L46 28 Z" fill="url(#compassGold)" />
    <path d="M50 88 L54 72 L50 78 L46 72 Z" fill="url(#compassGold)" opacity="0.6" />
    <path d="M12 50 L28 54 L22 50 L28 46 Z" fill="url(#compassGold)" opacity="0.6" />
    <path d="M88 50 L72 54 L78 50 L72 46 Z" fill="url(#compassGold)" opacity="0.6" />
    <circle cx="50" cy="50" r="4" fill="url(#compassGold)" />
  </svg>
);

// ============================================
// SPARKLE EFFECTS
// ============================================
const SparkleEffect = () => {
  const sparkles = useMemo(() => 
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: `${10 + Math.random() * 80}%`,
      top: `${10 + Math.random() * 80}%`,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 4,
      duration: Math.random() * 3 + 2,
    })), []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {sparkles.map((s) => (
        <div
          key={s.id}
          className="absolute"
          style={{
            left: s.left,
            top: s.top,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animation: `sparkle ${s.duration}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }}
        >
          {/* 4-point star sparkle */}
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <path
              d="M12 0L13.5 10.5L24 12L13.5 13.5L12 24L10.5 13.5L0 12L10.5 10.5L12 0Z"
              fill="rgba(255,200,100,0.6)"
            />
          </svg>
        </div>
      ))}
    </div>
  );
};

// ============================================
// PARTICLE BACKGROUND - Orange/Gold colors matching the bull
// ============================================
const ParticleBackground = () => {
  const particles = useMemo(() => 
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 12 + 8,
      delay: Math.random() * 15,
      opacity: Math.random() * 0.6 + 0.2,
      color: Math.random() > 0.5 
        ? `rgba(255, ${140 + Math.random() * 60}, ${20 + Math.random() * 40}, 1)`
        : `rgba(${200 + Math.random() * 55}, ${160 + Math.random() * 50}, ${50 + Math.random() * 30}, 1)`,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            animation: `particle-rise ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
};

// ============================================
// GLOWING DUST - Very subtle, only for hero section
// ============================================
const GlowingDust = () => {
  const dustParticles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 10 + 8,
    delay: Math.random() * 8,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
      {dustParticles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `rgba(201, 166, 70, 0.4)`,
            boxShadow: `0 0 ${p.size * 2}px rgba(201, 166, 70, 0.2)`,
            animation: `dust-float ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

// ============================================
// GOLDEN DIVIDER LINE
// ============================================
const GoldenDivider = () => (
  <div className="relative w-full h-[2px] my-0">
    <div 
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, #C9A646 20%, #F4D97B 50%, #C9A646 80%, transparent 100%)',
        boxShadow: '0 0 20px rgba(201,166,70,0.6), 0 0 40px rgba(201,166,70,0.4), 0 0 60px rgba(201,166,70,0.2)',
      }}
    />
  </div>
);

// ============================================
// GLOWING BADGE COMPONENT
// ============================================
const GlowingBadge = ({ className }: { className?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }} 
    transition={{ duration: 0.6 }}
    className={cn("relative inline-flex flex-col items-center gap-1 px-10 py-5 rounded-xl overflow-hidden", className)} 
    style={{ 
      background: 'linear-gradient(180deg, rgba(30,25,18,0.95) 0%, rgba(20,16,12,0.95) 100%)', 
      boxShadow: '0 0 40px rgba(201,166,70,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' 
    }}>
    {/* Top glowing line */}
    <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ 
      background: 'linear-gradient(90deg, transparent 0%, rgba(201,166,70,0.8) 15%, rgba(244,217,123,1) 50%, rgba(201,166,70,0.8) 85%, transparent 100%)', 
      boxShadow: '0 0 15px rgba(201,166,70,0.8), 0 3px 12px rgba(201,166,70,0.5)' 
    }} />
    {/* Bottom glowing line */}
    <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ 
      background: 'linear-gradient(90deg, transparent 0%, rgba(201,166,70,0.8) 15%, rgba(244,217,123,1) 50%, rgba(201,166,70,0.8) 85%, transparent 100%)', 
      boxShadow: '0 0 15px rgba(201,166,70,0.8), 0 -3px 12px rgba(201,166,70,0.5)' 
    }} />
    <div className="flex items-center gap-3">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
      </span>
      <span className="text-[#C9A646] text-base font-bold tracking-wide">153 of 1,000 Seats Remaining</span>
    </div>
    <span className="text-[#C9A646]/60 text-sm">Daily Market Intelligence</span>
  </motion.div>
);
// ============================================
// SCROLLING TESTIMONIALS DATA
// ============================================
const scrollingTestimonials = [
  { id: 1, name: "David Chen", role: "Hedge Fund Manager", avatar: "DC", text: "The daily briefing is something I genuinely wait for every morning. The level of analysis here is institutional-grade.", highlight: "something I genuinely wait for every morning" },
  { id: 2, name: "Sarah Mitchell", role: "Day Trader", avatar: "SM", text: "WAR ZONE gave me the edge I was missing. After one week I realized this is the best investment I made this year.", highlight: "the best investment I made this year" },
  { id: 3, name: "Michael Rodriguez", role: "Prop Trader", avatar: "MR", text: "I pay thousands per month for research subscriptions. WAR ZONE beats them all in value-for-money.", highlight: "beats them all in value-for-money" },
  { id: 4, name: "Emily Watson", role: "Portfolio Manager", avatar: "EW", text: "Finally someone who understands I don't need more data, I need conclusions. These briefings save me hours every day.", highlight: "save me hours every day" },
  { id: 5, name: "James Kim", role: "Swing Trader", avatar: "JK", text: "The writing quality and depth of analysis here is something I haven't found anywhere else.", highlight: "something I haven't found anywhere else" },
  { id: 6, name: "Rachel Green", role: "Options Trader", avatar: "RG", text: "WAR ZONE is like someone turned on the lights in a dark room. Now I see the full picture before market open.", highlight: "turned on the lights in a dark room" },
  { id: 7, name: "Alex Thompson", role: "Crypto Investor", avatar: "AT", text: "I tried the free trial and canceled all my other subscriptions. WAR ZONE is all I need now.", highlight: "canceled all my other subscriptions" },
  { id: 8, name: "Lisa Anderson", role: "Forex Trader", avatar: "LA", text: "The macro analysis here is better than anything I got from Bloomberg Terminal. And I'm not joking.", highlight: "better than anything I got from Bloomberg" },
];

const duplicatedTestimonials = [...scrollingTestimonials, ...scrollingTestimonials];

// ============================================
// SOCIAL PROOF COMPONENT
// ============================================
const SocialProof = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    
    const scrollSpeed = 0.5;
    const cardWidth = 400;
    const totalWidth = cardWidth * scrollingTestimonials.length;
    
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

  const highlightText = (text: string, highlight: string) => {
    if (!highlight) return text;
    const parts = text.split(highlight);
    return <>{parts[0]}<span className="text-[#C9A646] font-semibold">{highlight}</span>{parts[1]}</>;
  };

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
          <div ref={scrollRef} className="flex gap-6 overflow-x-hidden" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} style={{ scrollBehavior: 'auto' }}>
            {duplicatedTestimonials.map((t, index) => (
              <div key={`${t.id}-${index}`} className="flex-shrink-0 w-[380px] p-6 rounded-2xl relative group transition-all duration-300" style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.05), rgba(20,20,20,0.8))', border: '1px solid rgba(201,166,70,0.2)', backdropFilter: 'blur(10px)' }}>
                <svg className="absolute top-4 right-4 w-8 h-8 text-[#C9A646]/20" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
                <div className="flex gap-1 mb-4">{[...Array(5)].map((_, i) => <svg key={i} className="w-4 h-4 fill-[#C9A646] text-[#C9A646]" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}</div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">"{highlightText(t.text, t.highlight)}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(135deg, #C9A646, #B8963F)', color: '#0a0a0a' }}>{t.avatar}</div>
                  <div><p className="text-white font-semibold text-sm">{t.name}</p><p className="text-slate-500 text-xs">{t.role}</p></div>
                </div>
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ boxShadow: '0 0 30px rgba(201,166,70,0.3)' }}/>
              </div>
            ))}
          </div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: isPaused ? 0 : 0.5 }} className="text-center text-slate-600 text-sm mt-6">Hover to pause</motion.p>
        </div>
      </div>
    </section>
  );
};

// ============================================
// BILLING TOGGLE - NEW!
// ============================================
const BillingToggle = ({ selected, onChange, className }: { selected: BillingInterval; onChange: (interval: BillingInterval) => void; className?: string }) => (
  <div className={cn("flex items-center justify-center gap-3", className)}>
    <button 
      onClick={() => onChange('monthly')} 
      className={cn(
        "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300", 
        selected === 'monthly' 
          ? "bg-gradient-to-r from-[#C9A646] to-[#F4D97B] text-black shadow-lg shadow-[#C9A646]/30" 
          : "bg-white/[0.03] border border-[#C9A646]/30 text-slate-300 hover:border-[#C9A646]/50"
      )}
    >
      Monthly
    </button>
    <button 
      onClick={() => onChange('yearly')} 
      className={cn(
        "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 relative", 
        selected === 'yearly' 
          ? "bg-gradient-to-r from-[#C9A646] to-[#F4D97B] text-black shadow-lg shadow-[#C9A646]/30" 
          : "bg-white/[0.03] border border-[#C9A646]/30 text-slate-300 hover:border-[#C9A646]/50"
      )}
    >
      Yearly
      <span className={cn(
        "absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold", 
        selected === 'yearly' 
          ? "bg-green-500 text-white" 
          : "bg-green-500/20 text-green-400 border border-green-500/30"
      )}>
        Save ${YEARLY_SAVINGS}
      </span>
    </button>
  </div>
);
// ============================================
// TEST REPORT CARD WITH PUBLISH BUTTON
// ============================================
const TestReportCard = ({ 
  testDailyReport, 
  formatReportDate, 
  formatReportTime, 
  handleReportClick,
  onPublishSuccess,
  clearTestReport
}: { 
  testDailyReport: DailyReport;
  formatReportDate: (dateStr: string) => string;
  formatReportTime: (createdAt: string) => string;
  handleReportClick: (report: DailyReport, type: 'daily' | 'weekly') => void;
  onPublishSuccess: () => void;
  clearTestReport: () => void;
}) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

const handlePublishToLive = async () => {
    setIsPublishing(true);
    try {
      const testReportDate = testDailyReport.report_date.split('T')[0];
      console.log('[WAR ZONE] 📅 Publishing test report for date:', testReportDate);
      console.log('[WAR ZONE] 📤 Calling API endpoint with service role...');

      const response = await fetch(`${API_BASE}/api/reports/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportId: testDailyReport.id,
          reportDate: testReportDate,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('[WAR ZONE] ❌ API publish failed:', data.error);
        alert(`Failed to publish report: ${data.error || 'Unknown error'}`);
        return;
      }

      console.log('[WAR ZONE] ✅ Report published to PUBLIC via API:', testDailyReport.id);
      
      // Invalidate cache after publish
      reportCache.invalidateAll();
      
      // FIX v3.0: Wait for database transaction to complete
      console.log('[WAR ZONE] ⏳ Waiting for DB transaction...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setShowConfirmModal(false);
      
      // Clear the test report from state immediately
      clearTestReport();
      
      // Refetch reports
      console.log('[WAR ZONE] 🔄 Refetching reports...');
      onPublishSuccess();
    } catch (err) {
      console.error('[WAR ZONE] ❌ Error publishing report:', err);
      alert('Error publishing report. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };
  return (
    <>
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-gradient-to-br from-[#1a1410] via-[#12100c] to-[#0a0806] border border-green-500/30 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Send className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Publish to Live</h3>
                <p className="text-[#C9A646]/60 text-sm">This action will make the report visible to all subscribers</p>
              </div>
            </div>
            
            <div className="bg-[#1a1410] rounded-xl p-4 mb-6 border border-[#C9A646]/20">
              <p className="text-[#C9A646]/80 text-sm mb-2">Report Details:</p>
              <p className="text-white font-semibold">{formatReportDate(testDailyReport.report_date)}</p>
              <p className="text-[#C9A646]/50 text-xs">ID: {testDailyReport.id}</p>
            </div>

          <div className="bg-yellow-500/10 rounded-xl p-4 mb-6 border border-yellow-500/30">
  <p className="text-yellow-400 text-sm flex items-center gap-2">
    <AlertCircle className="w-4 h-4" />
    This will REPLACE the current LIVE report and archive the old one
  </p>
</div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:bg-[#C9A646]/10"
                style={{ 
                  background: 'rgba(201,166,70,0.08)',
                  border: '1px solid rgba(201,166,70,0.3)',
                  color: '#C9A646'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePublishToLive}
                disabled={isPublishing}
                className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                style={{ 
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
                  color: 'white'
                }}
              >
                {isPublishing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Publish Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Report Card */}
      <div className="mt-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-1 rounded-md text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
            🧪 TESTER ONLY
          </span>
          <span className="text-[#C9A646]/50 text-sm">This report is visible only to testers</span>
        </div>
        
        <div
          className="group relative w-full p-5 rounded-2xl transition-all duration-300"
          style={{ 
            background: 'linear-gradient(135deg, rgba(147,51,234,0.15) 0%, rgba(88,28,135,0.1) 100%)',
            border: '2px solid rgba(147,51,234,0.4)',
            boxShadow: '0 4px 20px rgba(147,51,234,0.2)'
          }}
        >
          <div className="flex items-start justify-between">
            <button
              onClick={() => handleReportClick(testDailyReport, 'daily')}
              className="flex items-center gap-3 text-left flex-1"
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ 
                  background: 'rgba(147,51,234,0.2)',
                  border: '1px solid rgba(147,51,234,0.4)'
                }}
              >
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold">
                    🧪 TEST: {formatReportDate(testDailyReport.created_at)}
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse">
                    PENDING REVIEW
                  </span>
                </div>
                <p className="text-purple-400/60 text-xs">
                  Generated at {formatReportTime(testDailyReport.updated_at || testDailyReport.created_at)} ET • {testDailyReport.id}
                </p>
              </div>
            </button>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-4">
              {/* Publish to Live Button */}
              <button
                onClick={() => setShowConfirmModal(true)}
                className="px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all hover:scale-[1.02]"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(22,163,74,0.15) 100%)',
                  border: '1px solid rgba(34,197,94,0.5)',
                  color: '#22c55e'
                }}
              >
                <Send className="w-4 h-4" />
                Publish to Live
              </button>
              
              {/* Download Button */}
              <button
                onClick={() => handleReportClick(testDailyReport, 'daily')}
                className="p-2 rounded-xl transition-all hover:bg-purple-500/20"
                style={{ 
                  border: '1px solid rgba(147,51,234,0.3)'
                }}
              >
                <ChevronRight className="w-5 h-5 text-purple-400" />
              </button>
            </div>
          </div>
          <div 
            className="absolute bottom-0 left-4 right-4 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(147,51,234,0.5), transparent)' }}
          />
        </div>
      </div>
    </>
  );
};

// ============================================
// MODALS
// ============================================
const ReportViewerModal = ({ isOpen, onClose, report, isLoading, error, onRefresh }: { isOpen: boolean; onClose: () => void; report: NewsletterReport | null; isLoading: boolean; error: string | null; onRefresh: () => void; }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose} />
      <div className={cn("relative bg-gradient-to-br from-[#1a1410] via-[#12100c] to-[#0a0806] border border-[#C9A646]/30 rounded-2xl overflow-hidden", isFullscreen ? "w-full h-full rounded-none" : "max-w-4xl w-full max-h-[90vh]")}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[#C9A646]/20 bg-[#0a0806]/90">
          <div className="flex items-center gap-4"><div className="p-2.5 rounded-xl bg-[#C9A646]/10"><FileText className="w-5 h-5 text-[#C9A646]" /></div><h2 className="text-lg font-bold text-white">{isLoading ? 'Loading...' : report?.subject || 'Daily Report'}</h2></div>
          <div className="flex items-center gap-2">
            <button onClick={onRefresh} disabled={isLoading} className="p-2 rounded-lg hover:bg-[#C9A646]/10"><RefreshCw className={cn("w-5 h-5 text-[#C9A646]/60", isLoading && "animate-spin")} /></button>
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 rounded-lg hover:bg-[#C9A646]/10">{isFullscreen ? <Minimize2 className="w-5 h-5 text-[#C9A646]/60" /> : <Maximize2 className="w-5 h-5 text-[#C9A646]/60" />}</button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#C9A646]/10"><X className="w-5 h-5 text-[#C9A646]/60" /></button>
          </div>
        </div>
        <div className={cn("overflow-y-auto", isFullscreen ? "h-[calc(100%-72px)]" : "max-h-[calc(90vh-72px)]")}>
          {isLoading ? <div className="flex flex-col items-center justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-[#C9A646]" /></div> : error ? <div className="flex flex-col items-center justify-center py-20"><AlertCircle className="w-10 h-10 text-red-400 mb-4" /><p className="text-[#C9A646]/60 mb-6">{error}</p><button onClick={onRefresh} className="px-6 py-3 rounded-xl bg-[#C9A646]/10 text-[#C9A646]">Try Again</button></div> : report ? <div className="report-content" dangerouslySetInnerHTML={{ __html: report.html }} /> : <div className="flex flex-col items-center justify-center py-20"><Clock className="w-10 h-10 text-[#C9A646] mb-4" /><p className="text-[#C9A646]/60">First report tomorrow 9:00 AM NY.</p></div>}
        </div>
      </div>
    </div>
  );
};

// ============================================
// WAR ZONE DISCLAIMER POPUP - FINAL VERSION
// Matches the premium gold/black design reference
// Replace the existing DisclaimerPopup component with this code
// ============================================

const TERMS_URL = '/terms-and-disclaimer'; // UPDATE THIS TO YOUR ACTUAL URL

// ============================================
// WAR ZONE POPUP WITH TERMS MODAL
// Copy this entire code to your project
// ============================================

// ============================================
// TERMS MODAL COMPONENT - Add this above DisclaimerPopup
// ============================================
const TermsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden" style={{ 
        background: 'linear-gradient(180deg, rgba(30,25,18,0.99) 0%, rgba(15,12,8,1) 100%)',
        border: '1px solid rgba(201,166,70,0.4)',
        boxShadow: '0 0 60px rgba(201,166,70,0.2), 0 25px 50px rgba(0,0,0,0.5)'
      }}>
        {/* Top gold line */}
        <div className="absolute top-0 left-4 right-4 h-[1px]" style={{ 
          background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.6), transparent)'
        }} />
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[#C9A646]/20" style={{
          background: 'linear-gradient(180deg, rgba(30,25,18,0.99) 0%, rgba(25,20,15,0.99) 100%)'
        }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ 
              background: 'linear-gradient(135deg, rgba(201,166,70,0.25) 0%, rgba(201,166,70,0.1) 100%)',
              border: '1px solid rgba(201,166,70,0.4)'
            }}>
              <FileText className="w-5 h-5 text-[#C9A646]" />
            </div>
            <h2 className="text-xl font-bold text-white">Legal Disclaimer & Terms of Use</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5 text-[#C9A646]/60" />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          {/* Section 1 */}
          <div>
            <h3 className="text-[#C9A646] font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#C9A646]/20 flex items-center justify-center text-sm">1</span>
              General Information Only
            </h3>
            <p className="text-[#B8B0A0] text-sm leading-relaxed mb-3">
              The content, data, analysis, reports, newsletters, tools, dashboards, and any other materials provided by FINOTAUR ("the Platform") are provided for <span className="text-white font-medium">informational and educational purposes only</span>.
            </p>
            <p className="text-[#B8B0A0] text-sm leading-relaxed mb-2">Nothing on this Platform constitutes, or should be interpreted as:</p>
            <ul className="text-[#8B8175] text-sm space-y-1 ml-4">
              <li>• Investment advice</li>
              <li>• Financial advice</li>
              <li>• Trading advice</li>
              <li>• Legal advice</li>
              <li>• Tax advice</li>
              <li>• Or any other form of professional advice</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div>
            <h3 className="text-[#C9A646] font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#C9A646]/20 flex items-center justify-center text-sm">2</span>
              No Investment Advisory Relationship
            </h3>
            <p className="text-[#B8B0A0] text-sm leading-relaxed mb-2">
              FINOTAUR is <span className="text-white font-medium">not a registered investment adviser</span>, broker-dealer, or financial institution in any jurisdiction.
            </p>
            <p className="text-[#B8B0A0] text-sm leading-relaxed">
              Use of the Platform does not create any fiduciary relationship, advisory relationship, or client–advisor relationship between FINOTAUR and the user.
            </p>
          </div>

          {/* Section 3 */}
          <div>
            <h3 className="text-[#C9A646] font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#C9A646]/20 flex items-center justify-center text-sm">3</span>
              No Recommendations or Solicitations
            </h3>
            <p className="text-[#B8B0A0] text-sm leading-relaxed mb-2">At no time does FINOTAUR:</p>
            <ul className="text-[#8B8175] text-sm space-y-1 ml-4 mb-3">
              <li>• Recommend buying, selling, or holding any security, asset, or financial instrument</li>
              <li>• Provide personalized investment recommendations</li>
              <li>• Solicit trades or transactions</li>
            </ul>
            <p className="text-[#B8B0A0] text-sm leading-relaxed">
              Any references to securities, markets, assets, indicators, strategies, or scenarios are <span className="text-white font-medium">illustrative and analytical only</span>, and should not be considered actionable instructions.
            </p>
          </div>

          {/* Section 4 */}
          <div>
            <h3 className="text-[#C9A646] font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#C9A646]/20 flex items-center justify-center text-sm">4</span>
              General & Non-Personalized Content
            </h3>
            <p className="text-[#B8B0A0] text-sm leading-relaxed mb-2">All content provided by FINOTAUR is:</p>
            <ul className="text-[#8B8175] text-sm space-y-1 ml-4 mb-3">
              <li>• General in nature</li>
              <li>• Not tailored to any individual's financial situation, objectives, or risk tolerance</li>
            </ul>
            <p className="text-[#B8B0A0] text-sm leading-relaxed">
              Users are solely responsible for evaluating whether any information is appropriate for their personal circumstances.
            </p>
          </div>

          {/* Section 5 */}
          <div>
            <h3 className="text-[#C9A646] font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#C9A646]/20 flex items-center justify-center text-sm">5</span>
              User Responsibility & Assumption of Risk
            </h3>
            <p className="text-[#B8B0A0] text-sm leading-relaxed mb-3">
              Investing and trading in financial markets involves <span className="text-red-400 font-medium">significant risk</span>, including the potential loss of capital.
            </p>
            <p className="text-[#B8B0A0] text-sm leading-relaxed mb-2">By using FINOTAUR, you acknowledge and agree that:</p>
            <ul className="text-[#8B8175] text-sm space-y-1 ml-4">
              <li>• You are solely responsible for your investment decisions</li>
              <li>• FINOTAUR bears no responsibility for losses, damages, or missed opportunities</li>
              <li>• Past performance is not indicative of future results</li>
            </ul>
          </div>

          {/* Section 6 */}
          <div>
            <h3 className="text-[#C9A646] font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#C9A646]/20 flex items-center justify-center text-sm">6</span>
              AI-Generated & Analytical Tools
            </h3>
            <p className="text-[#B8B0A0] text-sm leading-relaxed mb-2">Any AI-based tools, analytics, summaries, or insights provided by FINOTAUR:</p>
            <ul className="text-[#8B8175] text-sm space-y-1 ml-4 mb-3">
              <li>• Are based on probabilistic models and historical or available data</li>
              <li>• May be incomplete, delayed, inaccurate, or subject to change</li>
              <li>• Do not predict future outcomes</li>
            </ul>
            <p className="text-[#B8B0A0] text-sm leading-relaxed">
              AI outputs are <span className="text-white font-medium">analytical aids only</span>, not instructions or recommendations.
            </p>
          </div>

          {/* Section 7 */}
          <div>
            <h3 className="text-[#C9A646] font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#C9A646]/20 flex items-center justify-center text-sm">7</span>
              No Guarantees
            </h3>
            <p className="text-[#B8B0A0] text-sm leading-relaxed mb-2">FINOTAUR makes no representations or warranties regarding:</p>
            <ul className="text-[#8B8175] text-sm space-y-1 ml-4">
              <li>• Accuracy</li>
              <li>• Completeness</li>
              <li>• Timeliness</li>
              <li>• Profitability</li>
              <li>• Reliability</li>
            </ul>
            <p className="text-[#B8B0A0] text-sm leading-relaxed mt-2">of any content or analysis provided.</p>
          </div>

          {/* Section 8 */}
          <div>
            <h3 className="text-[#C9A646] font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#C9A646]/20 flex items-center justify-center text-sm">8</span>
              Limitation of Liability
            </h3>
            <p className="text-[#B8B0A0] text-sm leading-relaxed mb-2">To the maximum extent permitted by law, FINOTAUR shall not be liable for:</p>
            <ul className="text-[#8B8175] text-sm space-y-1 ml-4">
              <li>• Direct or indirect losses</li>
              <li>• Incidental or consequential damages</li>
              <li>• Loss of profits, data, or capital</li>
            </ul>
            <p className="text-[#B8B0A0] text-sm leading-relaxed mt-2">arising from the use of, or reliance on, the Platform or its content.</p>
          </div>

          {/* Section 9 */}
          <div>
            <h3 className="text-[#C9A646] font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#C9A646]/20 flex items-center justify-center text-sm">9</span>
              External Data & Third-Party Sources
            </h3>
            <p className="text-[#B8B0A0] text-sm leading-relaxed">
              FINOTAUR may rely on third-party data providers and public sources. FINOTAUR does not guarantee the accuracy or availability of such data and is not responsible for errors originating from external sources.
            </p>
          </div>

          {/* Section 10 */}
          <div>
            <h3 className="text-[#C9A646] font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#C9A646]/20 flex items-center justify-center text-sm">10</span>
              Acceptance of Terms
            </h3>
            <p className="text-[#B8B0A0] text-sm leading-relaxed mb-2">By accessing or using FINOTAUR, you confirm that you:</p>
            <ul className="text-[#8B8175] text-sm space-y-1 ml-4 mb-3">
              <li>• Have read and understood this Disclaimer</li>
              <li>• Accept these terms in full</li>
              <li>• Agree to use the Platform at your own discretion and risk</li>
            </ul>
            <p className="text-[#B8B0A0] text-sm leading-relaxed">
              If you do not agree with these terms, you must discontinue use of the Platform.
            </p>
          </div>

          {/* Section 11 */}
          <div>
            <h3 className="text-[#C9A646] font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#C9A646]/20 flex items-center justify-center text-sm">11</span>
              Jurisdiction
            </h3>
            <p className="text-[#B8B0A0] text-sm leading-relaxed">
              These terms shall be governed by and interpreted in accordance with the laws of the applicable jurisdiction, without regard to conflict-of-law principles.
            </p>
          </div>

          {/* Close Button */}
          <div className="pt-4 border-t border-[#C9A646]/20">
            <button 
              onClick={onClose}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.01]"
              style={{ 
                background: 'linear-gradient(135deg, #A68A3A 0%, #C9A646 25%, #F4D97B 50%, #C9A646 75%, #A68A3A 100%)',
                boxShadow: '0 4px 20px rgba(201,166,70,0.4)',
                color: '#1a1510'
              }}
            >
              I Understand
            </button>
          </div>
        </div>
        
        {/* Bottom gold line */}
        <div className="absolute bottom-0 left-4 right-4 h-[1px]" style={{ 
          background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.4), transparent)'
        }} />
      </div>
    </div>
  );
};

// ============================================
// DISCLAIMER POPUP - Replace your existing one with this
// ============================================
const DisclaimerPopup = ({ isOpen, onClose, onAccept, isProcessing, billingInterval, isTopSecretMember }: { isOpen: boolean; onClose: () => void; onAccept: () => void; isProcessing: boolean; billingInterval: BillingInterval; isTopSecretMember: boolean }) => {
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const isMonthly = billingInterval === 'monthly';
  const displayPrice = isMonthly ? (isTopSecretMember ? MONTHLY_PRICE_TOPSECRET : MONTHLY_PRICE) : YEARLY_PRICE;
  const originalPrice = isMonthly ? MONTHLY_PRICE : null;
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Terms Modal - renders on top when open */}
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-sm" 
        style={{ background: 'radial-gradient(ellipse at center, rgba(26,21,16,0.95) 0%, rgba(0,0,0,0.98) 100%)' }}
        onClick={onClose} 
      />
      
      {/* Popup Card */}
      <div className="relative w-full max-w-md">
        {/* Outer glow */}
        <div className="absolute -inset-1 rounded-2xl opacity-50" style={{
          background: 'linear-gradient(135deg, rgba(201,166,70,0.3) 0%, transparent 50%, rgba(201,166,70,0.2) 100%)',
          filter: 'blur(20px)'
        }} />
        
        {/* Main card */}
        <div className="relative rounded-2xl overflow-hidden" style={{ 
          background: 'linear-gradient(180deg, rgba(30,25,18,0.98) 0%, rgba(15,12,8,0.99) 100%)',
          border: '1px solid rgba(201,166,70,0.4)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 25px 50px rgba(0,0,0,0.5)'
        }}>
          
          {/* Top border glow line */}
          <div className="absolute top-0 left-4 right-4 h-[1px]" style={{ 
            background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.6), transparent)'
          }} />

          {/* Content */}
          <div className="px-6 pt-5 pb-6">
            
            {/* Header Row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ 
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.25) 0%, rgba(201,166,70,0.1) 100%)',
                  border: '1px solid rgba(201,166,70,0.4)'
                }}>
                  <Crown className="w-6 h-6 text-[#C9A646]" />
                </div>
                <h2 className="text-xl font-semibold text-white tracking-wide">WAR ZONE {isMonthly ? 'Monthly' : 'Annual'}</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                <X className="w-5 h-5 text-[#C9A646]/60" />
              </button>
            </div>

{/* Price Section */}
            <div className="text-center mb-6">
              {isMonthly && isTopSecretMember && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3" style={{ 
                  background: 'linear-gradient(135deg, rgba(147,51,234,0.2) 0%, rgba(147,51,234,0.1) 100%)',
                  border: '1px solid rgba(147,51,234,0.4)'
                }}>
                  <Crown className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-300 text-sm font-semibold">TOP SECRET Member Discount</span>
                </div>
              )}
              <div className="flex items-baseline justify-center gap-2 mb-1">
                {isMonthly && isTopSecretMember && originalPrice && (
                  <span className="text-2xl text-[#C9A646]/40 line-through">${originalPrice}</span>
                )}
                <span className="text-5xl font-bold" style={{ 
                  background: 'linear-gradient(180deg, #F4D97B 0%, #C9A646 50%, #A68A3A 100%)', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent',
                }}>${displayPrice}</span>
                <span className="text-[#C9A646]/60 text-lg font-medium">/{isMonthly ? 'month' : 'year'}</span>
              </div>
              {!isMonthly && (
                <p className="text-[#C9A646]/80 text-sm">~${Math.round(YEARLY_MONTHLY_EQUIVALENT)}/month • Save ${YEARLY_SAVINGS}/year</p>
              )}
              {isMonthly && isTopSecretMember && (
                <p className="text-green-400 text-sm font-semibold">You save ${(MONTHLY_PRICE - MONTHLY_PRICE_TOPSECRET).toFixed(2)}/month as a TOP SECRET member!</p>
              )}
              {isMonthly && !isTopSecretMember && (
                <p className="text-[#C9A646]/60 text-sm">Billed monthly</p>
              )}
              <p className="text-[#8B8175] text-sm mt-2">Everything you need to trade with confidence</p>
            </div>

            {/* What's Included Box */}
            <div className="rounded-xl p-4 mb-4" style={{ 
              background: 'linear-gradient(180deg, rgba(26,21,16,0.8) 0%, rgba(20,16,12,0.9) 100%)',
              border: '1px solid rgba(201,166,70,0.25)'
            }}>
              <h4 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C9A646]" />
                What's Included:
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {/* Daily Report */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ 
                    background: 'rgba(201,166,70,0.1)', 
                    border: '1px solid rgba(201,166,70,0.25)' 
                  }}>
                    <FileText className="w-5 h-5 text-[#C9A646]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Daily Market Report</p>
                    <p className="text-[#8B8175] text-xs">9:00 AM NY time</p>
                  </div>
                </div>
                
                {/* Weekly Review */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ 
                    background: 'rgba(201,166,70,0.1)', 
                    border: '1px solid rgba(201,166,70,0.25)' 
                  }}>
                    <Calendar className="w-5 h-5 text-[#C9A646]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Weekly Review</p>
                    <p className="text-[#8B8175] text-xs">Every Sunday</p>
                  </div>
                </div>
                
                {/* Discord */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ 
                    background: 'rgba(201,166,70,0.1)', 
                    border: '1px solid rgba(201,166,70,0.25)' 
                  }}>
                    <DiscordIcon className="w-5 h-5 text-[#C9A646]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Discord Community</p>
                    <p className="text-[#8B8175] text-xs">847+ traders</p>
                  </div>
                </div>
                
                {/* Trading Room */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ 
                    background: 'rgba(201,166,70,0.1)', 
                    border: '1px solid rgba(201,166,70,0.25)' 
                  }}>
                    <Activity className="w-5 h-5 text-[#C9A646]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Trading Room</p>
                    <p className="text-[#8B8175] text-xs">Live analysis</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Value/Trial Badge */}
            {isMonthly ? (
              <div className="relative flex items-center gap-4 px-4 py-3.5 rounded-xl mb-4" style={{ 
                background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)', 
                border: '1px solid rgba(34,197,94,0.35)'
              }}>
                <div className="relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.3)'
                }}>
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-green-400 font-bold text-sm">7-Day Free Trial</p>
                  <p className="text-[#8B8175] text-xs">Full access • Cancel anytime • No charge during trial</p>
                </div>
              </div>
            ) : (
              <div className="relative flex items-center gap-4 px-4 py-3.5 rounded-xl mb-4" style={{ 
                background: 'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.05) 100%)', 
                border: '1px solid rgba(201,166,70,0.35)'
              }}>
                <div className="relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{
                  background: 'rgba(201,166,70,0.15)',
                  border: '1px solid rgba(201,166,70,0.3)'
                }}>
                  <TrendingUp className="w-6 h-6 text-[#C9A646]" />
                </div>
                <div>
                  <p className="text-[#C9A646] font-bold text-sm">Best Value - Save ${YEARLY_SAVINGS}!</p>
                  <p className="text-[#8B8175] text-xs">Lock in your price • Full year access • Instant activation</p>
                </div>
              </div>
            )}

            {/* Legal Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer mb-5 group">
              <div className="relative flex-shrink-0 mt-0.5">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="sr-only" />
                <div 
                  className={cn("w-6 h-6 rounded-md flex items-center justify-center transition-all", !agreed && "group-hover:border-[#C9A646]/60")}
                  style={{ 
                    background: agreed ? 'linear-gradient(135deg, #C9A646, #F4D97B)' : 'transparent',
                    border: agreed ? 'none' : '2px solid rgba(201,166,70,0.4)'
                  }}
                >
                  {agreed && <Check className="w-4 h-4 text-black" />}
                </div>
              </div>
              <span className="text-[#B8B0A0] text-sm leading-relaxed">
                I acknowledge that FINOTAUR does not provide investment advice and that all content is for informational purposes only. I agree to the{' '}
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowTerms(true);
                  }}
                  className="text-[#C9A646] hover:text-[#F4D97B] underline underline-offset-2 transition-colors font-medium"
                >
                  Terms & Disclaimer
                </button>
              </span>
            </label>

            {/* Buttons */}
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all hover:bg-[#C9A646]/10"
                style={{ 
                  background: 'rgba(201,166,70,0.08)',
                  border: '1px solid rgba(201,166,70,0.3)',
                  color: '#C9A646'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={onAccept}
                disabled={!agreed || isProcessing}
                className={cn(
                  "flex-[1.3] py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                  agreed ? "hover:scale-[1.02] active:scale-[0.98]" : "cursor-not-allowed opacity-50"
                )}
                style={agreed ? { 
                  background: 'linear-gradient(135deg, #A68A3A 0%, #C9A646 25%, #F4D97B 50%, #C9A646 75%, #A68A3A 100%)',
                  boxShadow: '0 4px 20px rgba(201,166,70,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                  color: '#1a1510'
                } : {
                  background: 'rgba(201,166,70,0.2)',
                  color: 'rgba(201,166,70,0.4)'
                }}
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                {isProcessing ? 'Processing...' : isMonthly ? 'Start 7-Day Free Trial' : 'Subscribe Now'}
              </button>
            </div>
          </div>
          
          {/* Bottom border glow line */}
          <div className="absolute bottom-0 left-4 right-4 h-[1px]" style={{ 
            background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.4), transparent)'
          }} />
        </div>
      </div>
    </div>
  );
};

const LoginRequiredPopup = ({ isOpen, onClose, onLogin }: { isOpen: boolean; onClose: () => void; onLogin: () => void; }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-gradient-to-br from-[#1a1410] via-[#12100c] to-[#0a0806] border border-[#C9A646]/30 rounded-2xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C9A646]/20">
          <div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-[#C9A646]/10"><LogIn className="w-5 h-5 text-[#C9A646]" /></div><h2 className="text-lg font-bold text-white">Login Required</h2></div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#C9A646]/10"><X className="w-5 h-5 text-[#C9A646]/60" /></button>
        </div>
        <div className="p-6">
          <p className="text-[#C9A646]/70 text-center mb-6">Please login to subscribe.</p>
          <button onClick={onLogin} className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-[#C9A646] to-[#F4D97B] text-black flex items-center justify-center gap-2"><LogIn className="w-5 h-5" /> Login / Sign Up</button>
        </div>
      </div>
    </div>
  );
};

const CancelSubscriptionModal = ({ isOpen, onClose, onConfirm, isProcessing, trialDaysRemaining }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; isProcessing: boolean; trialDaysRemaining: number | null; }) => {
  if (!isOpen) return null;
  const isInTrial = trialDaysRemaining !== null && trialDaysRemaining > 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-gradient-to-br from-[#1a1410] via-[#12100c] to-[#0a0806] border border-red-500/30 rounded-2xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-500/20">
          <div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-red-500/10"><XCircle className="w-5 h-5 text-red-400" /></div><h2 className="text-lg font-bold text-white">Cancel Subscription</h2></div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-red-500/10"><X className="w-5 h-5 text-red-400/60" /></button>
        </div>
        <div className="p-6">
          {isInTrial && <div className="bg-green-500/5 rounded-xl p-4 border border-green-500/20 mb-6"><p className="text-green-400 font-semibold text-sm">Free trial - {trialDaysRemaining} days left. Cancel = no charge.</p></div>}
          <p className="text-[#C9A646]/70 text-center mb-6">Are you sure?</p>
          <div className="flex flex-col gap-3">
            <button onClick={onClose} className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-[#C9A646] to-[#F4D97B] text-black">Keep Subscription</button>
            <button onClick={onConfirm} disabled={isProcessing} className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 font-semibold flex items-center justify-center gap-2">{isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes, Cancel'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ACTIVE SUBSCRIBER VIEW
// ============================================
// ============================================
// ACTIVE SUBSCRIBER VIEW - PREMIUM DASHBOARD
// ============================================
const ActiveSubscriberView = ({ newsletterStatus, onCancelClick }: { newsletterStatus: NewsletterStatus; onCancelClick: () => void; }) => {
  // State for reports from DB
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  
  // NEW: Tester state for TEST reports
  const [isTester, setIsTester] = useState(false);
  const [testDailyReport, setTestDailyReport] = useState<DailyReport | null>(null);
  
  // ⭐ State for current reports (top row)
  const [currentDayReport, setCurrentDayReport] = useState<DailyReport | null>(null);
  const [currentWeeklyReport, setCurrentWeeklyReport] = useState<WeeklyReport | null>(null);
  
  // ⭐ State for previous reports (bottom row - always available)
  const [previousDayReport, setPreviousDayReport] = useState<DailyReport | null>(null);
  const [previousWeeklyReport, setPreviousWeeklyReport] = useState<WeeklyReport | null>(null);
  
  // NEW: Track if new report is available
  const [hasNewReport, setHasNewReport] = useState(false);
  const [lastFetchedDailyId, setLastFetchedDailyId] = useState<string | null>(null);
  const [lastFetchedWeeklyId, setLastFetchedWeeklyId] = useState<string | null>(null);
  
  // Track if we're in "waiting" period for reports
  const [isBeforeDailyReportTime, setIsBeforeDailyReportTime] = useState(false);
  const [isBeforeWeeklyReportTime, setIsBeforeWeeklyReportTime] = useState(false);
  
  // Countdown timers for both reports
  const [dailyCountdown, setDailyCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [weeklyCountdown, setWeeklyCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

// ============================================
  // HELPER: Normalize date to YYYY-MM-DD
  // ============================================
  const normalizeDate = useCallback((dateStr: string | Date | null): string => {
    if (!dateStr) return '';
    const str = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
    return str.split('T')[0];
  }, []);
  // ============================================
  // FETCH REPORTS FUNCTION
  // ============================================
 const lastFetchTimeRef = useRef<number>(0);

const fetchReports = useCallback(async (showLoading = true) => {
    // Throttle: Don't fetch more than once every 10 seconds
    const now = Date.now();
    if (now - lastFetchTimeRef.current < FETCH_CONFIG.MIN_FETCH_INTERVAL) {
      console.log('[WAR ZONE] ⏱️ Fetch throttled, skipping...');
      return;
    }
    lastFetchTimeRef.current = now;
    
    if (showLoading) setIsLoadingReports(true);
    
    try {
      // OPTIMIZATION: Parallel fetch - get user and reports at the same time
      const [userResult, dailyResult, weeklyResult] = await Promise.all([
  supabase.auth.getUser(),
  supabase
    .from('daily_reports')
    .select('*')
    .eq('visibility', 'live')
    .order('report_date', { ascending: false })
    .limit(5),
  supabase
    .from('weekly_reports')
    .select('*')
    .eq('visibility', 'live')
    .order('report_date', { ascending: false })
    .limit(2),
]);

      console.log('[WAR ZONE] 📅 Weekly query result:', weeklyResult);

      // Process user/tester status
      let currentIsTester = isTester;
      const user = userResult.data?.user;
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_tester, role, email')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          currentIsTester = profile.is_tester || 
                           profile.role === 'admin' || 
                           profile.role === 'super_admin' ||
                           profile.email === 'elad2550@gmail.com';
          if (currentIsTester !== isTester) {
            setIsTester(currentIsTester);
          }
        }
      }
      console.log('[WAR ZONE] 👤 Tester status:', currentIsTester);
      
      const timestamp = new Date().toISOString();
      console.log(`[WAR ZONE] 🔄 Fetching reports... (${timestamp})`);
      
      // Get today's date in NY timezone
      const now = new Date();
      const nyTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
      const nyTime = new Date(nyTimeStr);
      const todayNY = nyTime.toISOString().split('T')[0]; // YYYY-MM-DD
      
      console.log(`[WAR ZONE] 📅 Today in NY: ${todayNY}`);
      
// Process daily reports (already fetched in parallel above)
      const dailyData = dailyResult.data;
      const dailyError = dailyResult.error;
      
    if (dailyError) {
  console.error('[WAR ZONE] ❌ Error fetching daily reports:', dailyError);
} else {
  console.log('[WAR ZONE] 📊 Daily reports from DB:', {
    count: dailyData?.length || 0,
    reports: dailyData?.map(r => ({
      id: r.id,
      date: r.report_date,
      visibility: r.visibility,
      pdf_path: r.pdf_path
    }))
  });
}

if (dailyData && dailyData.length > 0) {
  // =====================================================
  // FIX v3.0: Double-filter to ensure no test/archived
  // This catches any that might slip through RLS
  // =====================================================
  const liveReports = dailyData.filter((report: DailyReport) => {
    const vis = (report as any).visibility;
    return vis === 'live';
  });

  console.log('[WAR ZONE] 📊 After filter:', {
    originalCount: dailyData.length,
    filteredCount: liveReports.length,
    reports: liveReports.map((r: DailyReport) => ({
      id: r.id,
      date: r.report_date,
      visibility: (r as any).visibility
    }))
  });
        
  // Store only LIVE reports (not test)
  setDailyReports(liveReports);
        
  // =====================================================
  // ASSIGNMENT LOGIC - DATE BASED
  // =====================================================
  // Current (1) = דוח עם תאריך של היום (NY timezone)
  // Previous (0) = הדוח הראשון עם תאריך שונה מהיום
  //
  // כשעובר חצות NY:
  //   - todayNY משתנה → Current מתרוקן
  //   - מה שהיה Current הופך ל-Previous
  //
  // כשמייצר דוח חדש באותו יום:
  //   - מחליף את Current (כי אותו תאריך)
  // =====================================================
        
        // =====================================================
// FIX v5.0: CORRECT ASSIGNMENT
// currentDayReport = Report for TODAY only (for top button)
// previousDayReport = Most recent LIVE report (for bottom card - always shows something)
//
// When midnight passes in NY:
//   - todayNY changes → currentDayReport becomes null → top button shows "Coming at 9:00 AM"
//   - previousDayReport still shows the most recent report (which was yesterday's)
// =====================================================

console.log('[WAR ZONE] 🔍 All report dates:', liveReports.map((r: DailyReport) => ({
  id: r.id,
  report_date: r.report_date,
  normalized: normalizeDate(r.report_date),
  todayNY: todayNY,
  isToday: normalizeDate(r.report_date) === todayNY
})));

// =====================================================
// DAILY REPORT ASSIGNMENT LOGIC v7.0
// Top button: Today's report (null if before 9 AM NY or no report yet)
// Bottom card: Yesterday's report (always available for download)
// =====================================================
const nyHour = nyTime.getHours();
const isBeforeReportTime = nyHour < 9; // Before 9:00 AM NY
setIsBeforeDailyReportTime(isBeforeReportTime);

// Today's report - only show if after 9 AM AND report exists for today
const todaysReport = isBeforeReportTime 
  ? null
  : liveReports.find((r: DailyReport) => 
      normalizeDate(r.report_date) === todayNY
    ) || null;

// Previous report - find the most recent report that is NOT today's
const previousReport = liveReports.find((r: DailyReport) => 
  normalizeDate(r.report_date) !== todayNY
) || null;

console.log('[WAR ZONE] 📌 Daily Report Assignment (v7.0):', {
  todayNY,
  nyHour,
  isBeforeReportTime,
  currentDaily: todaysReport ? normalizeDate(todaysReport.report_date) : 'WAITING',
  previousDaily: previousReport ? normalizeDate(previousReport.report_date) : 'NONE'
});

setCurrentDayReport(todaysReport);
setPreviousDayReport(previousReport);
        
        // DEBUG: Log what we found
        console.log('[WAR ZONE] 📊 Reports found:', {
          totalFromDB: dailyData.length,
          liveOnly: liveReports.length,
          todaysReport: todaysReport?.id || 'none',
          todaysDate: todaysReport ? normalizeDate(todaysReport.report_date) : 'N/A',
          previousReport: previousReport?.id || 'none', 
          previousDate: previousReport ? normalizeDate(previousReport.report_date) : 'N/A',
          allLiveDates: liveReports.map((r: DailyReport) => normalizeDate(r.report_date))
        });
        
        console.log('[WAR ZONE] 📅 Report assignment (DATE-BASED):', {
          todayNY,
          current: todaysReport ? normalizeDate(todaysReport.report_date) : 'none (no report for today yet)',
          previous: previousReport ? normalizeDate(previousReport.report_date) : 'none',
        });
        
        // New report detection
        const latestDailyId = dailyData[0]?.id;
        if (lastFetchedDailyId && latestDailyId && latestDailyId !== lastFetchedDailyId) {
          setHasNewReport(true);
          setTimeout(() => setHasNewReport(false), 5000);
        }
        setLastFetchedDailyId(latestDailyId || null);
      } else {
        console.warn('[WAR ZONE] ⚠️ No daily reports returned');
        setCurrentDayReport(null);
        setPreviousDayReport(null);
      }
      
      // =====================================================
      // PROCESS WEEKLY REPORTS - v6.2 FIX
      // =====================================================
      const weeklyData = weeklyResult.data;
      const weeklyError = weeklyResult.error;
      
      console.log('[WAR ZONE] 📅 Weekly query raw result:', {
        data: weeklyData,
        error: weeklyError,
        count: weeklyData?.length || 0
      });
      
            if (weeklyError) {
        console.error('[WAR ZONE] ❌ Error fetching weekly report:', weeklyError);
        setCurrentWeeklyReport(null);
        setPreviousWeeklyReport(null);
      } else if (weeklyData && weeklyData.length > 0) {
        console.log('[WAR ZONE] ✅ Weekly reports found:', weeklyData.length);
        
        // =====================================================
        // WEEKLY REPORT ASSIGNMENT LOGIC v8.0 - SIMPLIFIED
        // Top button: Most recent LIVE report (null only if waiting period)
        // Bottom card: Second most recent report
        // =====================================================
        const dayOfWeekNY = nyTime.getDay(); // 0 = Sunday, 6 = Saturday
        const hourNY = nyTime.getHours();
        
        // Waiting period: Saturday 6PM to Sunday 10 AM NY (when new report is being generated)
        const isWeeklyWaiting = (dayOfWeekNY === 6 && hourNY >= 18) || (dayOfWeekNY === 0 && hourNY < 10);
        setIsBeforeWeeklyReportTime(isWeeklyWaiting);
        
        console.log('[WAR ZONE] 📅 Weekly report time check v8.0:', {
          dayOfWeekNY,
          hourNY,
          isWeeklyWaiting,
          weeklyDataCount: weeklyData?.length || 0,
          firstReport: weeklyData?.[0]?.id || 'NONE'
        });
        
        // Current weekly: Simply take the FIRST (most recent) live report
        // Only null during waiting period
        const thisWeeksReport = isWeeklyWaiting 
          ? null 
          : (weeklyData && weeklyData.length > 0 ? weeklyData[0] : null);
        
        // Previous weekly: Second report in list, OR first if we're waiting
        const prevWeeklyReport = weeklyData && weeklyData.length > 1 
          ? weeklyData[1] 
          : (isWeeklyWaiting && weeklyData && weeklyData.length > 0 ? weeklyData[0] : null);
        
        console.log('[WAR ZONE] 📌 Weekly Report Assignment (v8.0):', {
          currentWeekly: thisWeeksReport?.id || 'WAITING/NONE',
          currentWeeklyDate: thisWeeksReport ? normalizeDate(thisWeeksReport.report_date) : 'N/A',
          previousWeekly: prevWeeklyReport?.id || 'NONE'
        });
        
        setCurrentWeeklyReport(thisWeeksReport);
        setPreviousWeeklyReport(prevWeeklyReport);
        
        // Track new report notification
        const latestWeeklyId = weeklyData[0]?.id;
        if (lastFetchedWeeklyId && latestWeeklyId && latestWeeklyId !== lastFetchedWeeklyId) {
          setHasNewReport(true);
          setTimeout(() => setHasNewReport(false), 5000);
        }
        setLastFetchedWeeklyId(latestWeeklyId || null);
      } else {
        console.log('[WAR ZONE] ⚠️ No live weekly reports found');
        setCurrentWeeklyReport(null);
        setPreviousWeeklyReport(null);
      }
      
      // ============================================
      // FETCH TEST REPORTS (ONLY FOR TESTERS)
      // Always show the most recently CREATED test report (regardless of report_date)
      // ============================================
      if (currentIsTester || isTester) {
        console.log('[WAR ZONE] 🧪 Fetching TEST reports for tester...');
                const { data: testData, error: testError } = await supabase
          .from('daily_reports')
          .select('*')
          .eq('visibility', 'test')
          .order('updated_at', { ascending: false })  // Always get the latest updated
          .limit(1);
        
        if (testError) {
          console.error('[WAR ZONE] ❌ Error fetching test reports:', testError);
        } else if (testData && testData.length > 0) {
          console.log('[WAR ZONE] 🧪 Found TEST report:', testData[0].id);
          setTestDailyReport(prevState => {
            // Only update if different to prevent race conditions
            if (!prevState || prevState.id !== testData[0].id) {
              return testData[0];
            }
            return prevState;
          });
        } else {
          console.log('[WAR ZONE] 🧪 No TEST reports found');
          setTestDailyReport(null);
        }
      }
    } catch (error) {
      console.error('[WAR ZONE] ❌ Fatal error:', error);
    } finally {
      setIsLoadingReports(false);
      setInitialLoadComplete(true);
    }
  }, [lastFetchedDailyId, lastFetchedWeeklyId, normalizeDate, isTester]);

  // ============================================
  // MIDNIGHT REFRESH
  // ============================================
  useEffect(() => {
    const scheduleNextMidnightRefresh = (): NodeJS.Timeout => {
      const now = new Date();
      const nyTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
      const nyTime = new Date(nyTimeStr);
      
      const nextMidnight = new Date(nyTime);
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 5, 0); // 12:00:05 AM
      
      const msUntilMidnight = nextMidnight.getTime() - nyTime.getTime();
      
      console.log('[WAR ZONE] ⏰ Next midnight refresh in', 
        Math.floor(msUntilMidnight / 1000 / 60 / 60), 'h',
        Math.floor((msUntilMidnight / 1000 / 60) % 60), 'm'
      );
      
      return setTimeout(() => {
        console.log('[WAR ZONE] 🌙 Midnight - invalidating cache and refreshing...');
        reportCache.invalidateAll();
        fetchReports(false);
        scheduleNextMidnightRefresh();
      }, msUntilMidnight);
    };
    
    const timeout = scheduleNextMidnightRefresh();
    return () => clearTimeout(timeout);
  }, [fetchReports]);
// ============================================
  // INITIAL FETCH ON MOUNT
  // ============================================
  useEffect(() => {
    fetchReports(true);
  }, [fetchReports]);

  // ============================================
  // AUTO-REFRESH DURING GENERATION WINDOW
  // ============================================
  useEffect(() => {
    const checkIfShouldRefresh = (): boolean => {
      const now = new Date();
      const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const hour = nyTime.getHours();
      const minute = nyTime.getMinutes();
      const dayOfWeek = nyTime.getDay();
      
      // Daily: 8:55-9:10 AM NY (Mon-Fri)
      const isDailyWindow = dayOfWeek >= 1 && dayOfWeek <= 5 && 
        ((hour === 8 && minute >= 55) || (hour === 9 && minute <= 10));
      
      // Weekly: 10:00-10:10 AM NY (Sunday)
      const isWeeklyWindow = dayOfWeek === 0 && hour === 10 && minute <= 10;
      
      return isDailyWindow || isWeeklyWindow;
    };
    
    const interval = setInterval(() => {
      if (checkIfShouldRefresh()) {
        console.log('[WAR ZONE] 🕐 In generation window - checking...');
        reportCache.invalidate(`daily_reports_${new Date().toISOString().split('T')[0]}`);
        fetchReports(false);
      }
    }, 60 * 1000); // Changed from 30s to 60s
    
    return () => clearInterval(interval);
  }, [fetchReports]);

  // ============================================
  // REAL-TIME SUBSCRIPTION FOR INSTANT UPDATES
  // ============================================
 // ============================================
  // REAL-TIME SUBSCRIPTION
  // ============================================
  useEffect(() => {
    // OPTIMIZATION: Single channel for all report changes
    console.log('[WAR ZONE] 📡 Setting up real-time subscription...');
    
    const reportsSub = supabase
      .channel('reports_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_reports'
      }, (payload) => {
        const newRecord = payload.new as Record<string, any> | null;
        console.log('[WAR ZONE] 🔔 Daily report change:', payload.eventType, newRecord?.id);
        fetchReports(false);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'weekly_reports'
      }, (payload) => {
        const newRecord = payload.new as Record<string, any> | null;
        console.log('[WAR ZONE] 🔔 New weekly report:', newRecord?.id);
        fetchReports(false);
      })
      .subscribe();

    return () => {
      reportsSub.unsubscribe();
    };
  }, [fetchReports]);
  
  useEffect(() => {
    const calculateCountdowns = () => {
      const now = new Date();
      const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      
      // =====================================================
      // DAILY COUNTDOWN - Next 9:00 AM NY (Mon-Fri)
      // =====================================================
      const dailyTarget = new Date(nyTime);
      dailyTarget.setHours(9, 0, 0, 0);
      
      if (nyTime >= dailyTarget) {
        dailyTarget.setDate(dailyTarget.getDate() + 1);
      }
      
      // Skip weekends for daily
      while (dailyTarget.getDay() === 0 || dailyTarget.getDay() === 6) {
        dailyTarget.setDate(dailyTarget.getDate() + 1);
      }
      
      const dailyDiff = dailyTarget.getTime() - nyTime.getTime();
      const dailyHours = Math.floor(dailyDiff / (1000 * 60 * 60));
      const dailyMinutes = Math.floor((dailyDiff % (1000 * 60 * 60)) / (1000 * 60));
      const dailySeconds = Math.floor((dailyDiff % (1000 * 60)) / 1000);
      
      // =====================================================
      // WEEKLY COUNTDOWN - Next Sunday 10:00 AM NY
      // =====================================================
      const weeklyTarget = new Date(nyTime);
      const dayOfWeek = nyTime.getDay();
      
      // Calculate days until next Sunday
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      weeklyTarget.setDate(nyTime.getDate() + daysUntilSunday);
      weeklyTarget.setHours(10, 0, 0, 0);
      
      // If we're past Sunday 10 AM, go to next Sunday
      if (nyTime >= weeklyTarget) {
        weeklyTarget.setDate(weeklyTarget.getDate() + 7);
      }
      
      const weeklyDiff = weeklyTarget.getTime() - nyTime.getTime();
      const weeklyHours = Math.floor(weeklyDiff / (1000 * 60 * 60));
      const weeklyMinutes = Math.floor((weeklyDiff % (1000 * 60 * 60)) / (1000 * 60));
      const weeklySeconds = Math.floor((weeklyDiff % (1000 * 60)) / 1000);
      
      return {
        daily: { hours: dailyHours, minutes: dailyMinutes, seconds: dailySeconds },
        weekly: { hours: weeklyHours, minutes: weeklyMinutes, seconds: weeklySeconds }
      };
    };
    
    const countdowns = calculateCountdowns();
    setDailyCountdown(countdowns.daily);
    setWeeklyCountdown(countdowns.weekly);
    
    const interval = setInterval(() => {
      const countdowns = calculateCountdowns();
      setDailyCountdown(countdowns.daily);
      setWeeklyCountdown(countdowns.weekly);
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Format date for display
const formatReportDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

const formatReportTime = (createdAt: string) => {
  const date = new Date(createdAt);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  });
};

  // Handle report click
// Handle report click - Download PDF directly
const handleReportClick = async (report: DailyReport | WeeklyReport, reportType: 'daily' | 'weekly') => {
  console.log('[WAR ZONE] 📥 handleReportClick called:', { 
    reportType, 
    id: report.id,
    date: report.report_date,
    pdf_path: report.pdf_path,
    pdf_url: report.pdf_url 
  });
  
  // Normalize date for filename
  const dateStr = typeof report.report_date === 'string' 
    ? report.report_date.split('T')[0]
    : String(report.report_date);
  
  const filename = reportType === 'daily' 
    ? `daily-report-${dateStr}.pdf`
    : `weekly-report-${dateStr}.pdf`;
  
  // Helper to download PDF
  const downloadPdf = async (url: string, source: string) => {
    console.log(`[WAR ZONE] ✅ Downloading PDF via ${source}:`, url);
    
    try {
      // Fetch the PDF as blob
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      window.URL.revokeObjectURL(blobUrl);
      console.log(`[WAR ZONE] ✅ Download initiated: ${filename}`);
    } catch (error) {
      console.error(`[WAR ZONE] ❌ Download failed via ${source}:`, error);
      // Don't try to open/download a failed URL
      console.error(`[WAR ZONE] ❌ All download methods failed for ${filename}`);
    }
  };

  // ===========================================
  // WEEKLY REPORTS - Download from Supabase Storage (same as daily)
  // ===========================================
  if (reportType === 'weekly') {
    console.log('[WAR ZONE] 📅 Weekly report - downloading from storage');
    console.log('[WAR ZONE] 📊 Weekly report details:', {
      id: report.id,
      date: report.report_date,
      pdf_path: report.pdf_path,
      pdf_url: report.pdf_url
    });
    
    const weeklyDateStr = typeof report.report_date === 'string' 
      ? report.report_date.split('T')[0]
      : String(report.report_date);
    
    const weeklyFilename = `Finotaur_Weekly_Report_${weeklyDateStr}.pdf`;
    
    // Helper to download PDF (same as daily)
    const downloadWeeklyPdf = async (url: string, source: string) => {
      console.log(`[WAR ZONE] ✅ Downloading weekly PDF via ${source}:`, url);
      
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        
        if (blob.size < 1000) {
          console.error('[WAR ZONE] ❌ Weekly PDF too small:', blob.size, 'bytes');
          throw new Error('Invalid PDF file');
        }
        
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = weeklyFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        
        console.log(`[WAR ZONE] ✅ Weekly download initiated: ${weeklyFilename}`);
        return true;
      } catch (error) {
        console.error(`[WAR ZONE] ❌ Weekly download failed via ${source}:`, error);
        return false;
      }
    };

    // METHOD 1: Direct pdf_url (full Supabase URL)
    if (report.pdf_url && report.pdf_url.includes('supabase.co')) {
      const success = await downloadWeeklyPdf(report.pdf_url, 'direct pdf_url');
      if (success) return;
    }
    
    // METHOD 2: pdf_path with signed URL
    if (report.pdf_path) {
      console.log('[WAR ZONE] 🔑 Trying weekly pdf_path:', report.pdf_path);
      
      try {
        const { data, error } = await supabase.storage
          .from('reports')
          .createSignedUrl(report.pdf_path, 300);
        
        if (data?.signedUrl) {
          const success = await downloadWeeklyPdf(data.signedUrl, 'pdf_path signed URL');
          if (success) return;
        }
        
        console.warn('[WAR ZONE] ⚠️ Failed to create weekly signed URL:', error?.message);
      } catch (err) {
        console.error('[WAR ZONE] ❌ Error creating weekly signed URL:', err);
      }
    }
    
    // METHOD 3: Construct path from report_date (with YYYY/MM subfolder structure)
    const [yearPart, monthPart] = weeklyDateStr.split('-');
    const constructedWeeklyPath = `weekly-reports/${yearPart}/${monthPart}/weekly-report-${weeklyDateStr}.pdf`;
    console.log('[WAR ZONE] 🔧 Trying constructed weekly path:', constructedWeeklyPath);
    
    try {
      const { data, error } = await supabase.storage
        .from('reports')
        .createSignedUrl(constructedWeeklyPath, 300);
      
      if (data?.signedUrl) {
        const success = await downloadWeeklyPdf(data.signedUrl, 'constructed path signed URL');
        if (success) return;
      }
      
      console.warn('[WAR ZONE] ⚠️ Constructed weekly path failed:', error?.message);
    } catch (err) {
      console.error('[WAR ZONE] ❌ Error with constructed weekly path:', err);
    }
    
    // METHOD 4: List bucket and find file (with YYYY/MM subfolder structure)
    // Weekly reports are stored in: weekly-reports/YYYY/MM/weekly-YYYY-MM-DD-timestamp.pdf
    const [year, month] = weeklyDateStr.split('-');
    const weeklySearchPath = `weekly-reports/${year}/${month}`;
    console.log('[WAR ZONE] 📂 Listing weekly-reports bucket folder:', weeklySearchPath);
    
    try {
      const { data: files, error } = await supabase.storage
        .from('reports')
        .list(weeklySearchPath, {
          limit: 10,
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (files && files.length > 0) {
        console.log('[WAR ZONE] 📂 Weekly files found:', files.map(f => f.name));
        
        // Find file matching our date
        const matchingFile = files.find(f => f.name.includes(weeklyDateStr));
        
        if (matchingFile) {
          const fullPath = `${weeklySearchPath}/${matchingFile.name}`;
          console.log('[WAR ZONE] 🎯 Found matching weekly file:', fullPath);
          
          const { data: signedData, error: signError } = await supabase.storage
            .from('reports')
            .createSignedUrl(fullPath, 300);
          
          if (signedData?.signedUrl) {
            const success = await downloadWeeklyPdf(signedData.signedUrl, 'bucket listing match');
            if (success) return;
          }
        } else {
          // Try the most recent file
          const latestFile = files[0];
          const fullPath = `${weeklySearchPath}/${latestFile.name}`;
          console.log('[WAR ZONE] 📄 Using latest weekly file:', fullPath);
          
          const { data: signedData } = await supabase.storage
            .from('reports')
            .createSignedUrl(fullPath, 300);
          
          if (signedData?.signedUrl) {
            const success = await downloadWeeklyPdf(signedData.signedUrl, 'latest file in bucket');
            if (success) return;
          }
        }
      } else {
        console.warn('[WAR ZONE] ⚠️ No weekly files in bucket folder:', weeklySearchPath, error?.message);
      }
    } catch (err) {
      console.error('[WAR ZONE] ❌ Weekly bucket listing failed:', err);
    }
    
    // ALL METHODS FAILED
    console.error('[WAR ZONE] ❌ ALL WEEKLY PDF METHODS FAILED');
    console.error('[WAR ZONE] Debug info:', {
      report_id: report.id,
      report_date: report.report_date,
      pdf_path: report.pdf_path,
      pdf_url: report.pdf_url
    });
    
    alert(`Weekly PDF not available for ${weeklyDateStr}. Please try again in a few minutes or contact support.`);
    return;
  }

  // ===========================================
  // METHOD 1: Direct pdf_url (full Supabase URL)
  // ===========================================
  if (report.pdf_url && report.pdf_url.includes('supabase.co')) {
    await downloadPdf(report.pdf_url, 'direct pdf_url');
    return;
  }
  
  // ===========================================
  // METHOD 2: pdf_path with signed URL
  // ===========================================
  if (report.pdf_path) {
    console.log('[WAR ZONE] 🔑 Trying pdf_path:', report.pdf_path);
    
    try {
      const { data, error } = await supabase.storage
        .from('reports')
        .createSignedUrl(report.pdf_path, 300); // 5 minutes
      
      if (data?.signedUrl) {
        await downloadPdf(data.signedUrl, 'pdf_path signed URL');
        return;
      }
      
      console.warn('[WAR ZONE] ⚠️ Failed to create signed URL:', error?.message);
    } catch (err) {
      console.error('[WAR ZONE] ❌ Error creating signed URL:', err);
    }
  }
  
  // ===========================================
  // METHOD 3: Construct path from report_date
  // ===========================================
  const constructedPath = reportType === 'daily' 
    ? `daily-reports/daily-report-${dateStr}.pdf`
    : `weekly-reports/weekly-report-${dateStr}.pdf`;
  
  console.log('[WAR ZONE] 🔧 Trying constructed path:', constructedPath);
  
  try {
    const { data, error } = await supabase.storage
      .from('reports')
      .createSignedUrl(constructedPath, 300);
    
    if (data?.signedUrl) {
      await downloadPdf(data.signedUrl, 'constructed path signed URL');
      return;
    }
    
    console.warn('[WAR ZONE] ⚠️ Constructed path failed:', error?.message);
  } catch (err) {
    console.error('[WAR ZONE] ❌ Error with constructed path:', err);
  }
  
  // ===========================================
  // METHOD 4: API endpoint fallback (daily only)
  // ===========================================
  if (reportType === 'daily') {
    const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';
    console.log('[WAR ZONE] 🌐 Trying API endpoint:', `${API_BASE}/api/newsletter/pdf`);
    
    try {
      const response = await fetch(`${API_BASE}/api/newsletter/pdf`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('[WAR ZONE] ✅ Download via API endpoint');
        return;
      }
      
      console.warn('[WAR ZONE] ⚠️ API endpoint failed:', response.status, response.statusText);
    } catch (err) {
      console.error('[WAR ZONE] ❌ API fetch failed:', err);
    }
  }
  
  // ===========================================
  // METHOD 5: List bucket and find file
  // ===========================================
  const folderPath = reportType === 'daily' ? 'daily-reports' : 'weekly-reports';
  console.log('[WAR ZONE] 📂 Listing bucket folder:', folderPath);
  
  try {
    const { data: files, error } = await supabase.storage
      .from('reports')
      .list(folderPath, {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (files && files.length > 0) {
      console.log('[WAR ZONE] 📂 Files found:', files.map(f => f.name));
      
      // Find file matching our date
      const matchingFile = files.find(f => f.name.includes(dateStr));
      
      if (matchingFile) {
        const fullPath = `${folderPath}/${matchingFile.name}`;
        console.log('[WAR ZONE] 🎯 Found matching file:', fullPath);
        
        const { data: signedData } = await supabase.storage
          .from('reports')
          .createSignedUrl(fullPath, 300);
        
        if (signedData?.signedUrl) {
          await downloadPdf(signedData.signedUrl, 'bucket listing match');
          return;
        }
      } else {
        // Try the most recent file
        const latestFile = files[0];
        const fullPath = `${folderPath}/${latestFile.name}`;
        console.log('[WAR ZONE] 📄 Using latest file:', fullPath);
        
        const { data: signedData } = await supabase.storage
          .from('reports')
          .createSignedUrl(fullPath, 300);
        
        if (signedData?.signedUrl) {
          await downloadPdf(signedData.signedUrl, 'latest file in bucket');
          return;
        }
      }
    } else {
      console.warn('[WAR ZONE] ⚠️ No files in bucket folder:', error?.message);
    }
  } catch (err) {
    console.error('[WAR ZONE] ❌ Bucket listing failed:', err);
  }
  
  // ===========================================
  // ALL METHODS FAILED
  // ===========================================
  console.error('[WAR ZONE] ❌ ALL PDF METHODS FAILED');
  console.error('[WAR ZONE] Debug info:', {
    report_id: report.id,
    report_date: report.report_date,
    pdf_path: report.pdf_path,
    pdf_url: report.pdf_url,
    reportType
  });
  
  alert(`PDF not available for ${dateStr}. Please try again in a few minutes or contact support.`);
};


return (
    <div className="min-h-screen bg-[#0a0806] relative overflow-hidden">
<style>{`
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap');
  .heading-serif{font-family:'Playfair Display',Georgia,serif}
`}</style>

      {/* Trial Banner */}
      {newsletterStatus.is_in_trial && newsletterStatus.days_until_trial_ends !== null && (
        <div className="relative z-50 bg-gradient-to-r from-[#C9A646]/20 via-[#C9A646]/10 to-[#C9A646]/20 border-b border-[#C9A646]/30 px-4 py-3 text-center">
          <p className="text-[#C9A646] text-sm font-semibold flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            Free trial ends in {newsletterStatus.days_until_trial_ends} day{newsletterStatus.days_until_trial_ends !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Hero Section with Bull */}
<div className="relative">
  {/* Gold Ambient Glow - Left Side */}
  <div 
    className="absolute top-1/4 left-0 w-[800px] h-[800px] rounded-full pointer-events-none"
    style={{
      background: 'radial-gradient(circle, rgba(201,166,70,0.35) 0%, rgba(201,166,70,0.15) 30%, rgba(201,166,70,0.05) 50%, transparent 70%)',
      filter: 'blur(100px)',
      transform: 'translateX(-40%)',
    }}
  />
  
  {/* Particle Background */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 60 }, (_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                bottom: '-10px',
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                background: Math.random() > 0.5 
                  ? `rgba(255, ${140 + Math.random() * 60}, ${20 + Math.random() * 40}, 1)`
                  : `rgba(${200 + Math.random() * 55}, ${160 + Math.random() * 50}, ${50 + Math.random() * 30}, 1)`,
                boxShadow: `0 0 ${Math.random() * 6 + 2}px currentColor`,
                animation: `particle-rise ${Math.random() * 10 + 6}s linear infinite`,
                animationDelay: `${Math.random() * 10}s`,
                opacity: Math.random() * 0.5 + 0.2,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-12 pb-8">
          {/* Header with Bull */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 mb-12 min-h-[400px] lg:min-h-[500px]">
{/* Left: Text Content - Institutional Research Style */}
<div className="text-center lg:text-left lg:flex-1 lg:max-w-xl">
  {/* Welcome to the - white italic serif */}
  <h1 className="font-bold leading-[1.05] tracking-tight mb-6" style={{ letterSpacing: '-0.03em' }}>
    <span className="text-3xl md:text-4xl lg:text-5xl text-white block heading-serif italic mb-2">
      Welcome to the
    </span>
    
    {/* WAR ZONE - large gold gradient, NOT italic */}
    <span className="text-5xl md:text-6xl lg:text-7xl block bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent font-bold tracking-tight">
      WAR ZONE
    </span>
  </h1>
  
  {/* Subtitle - muted gold/cream */}
  <p className="text-[#9A9080] text-sm md:text-base leading-relaxed max-w-md mb-8">
    The same market intelligence that hedge funds pay
    <span className="text-[#C9A646] font-medium"> $2,000+/month </span>
    for — now available for serious traders who want an edge.
  </p>

  {/* Two Action Buttons - Current Reports */}
  <div className="flex flex-col sm:flex-row gap-3 mb-6">
    {/* Open Today's Report - Gold Button OR Waiting State */}
    {currentDayReport ? (
      <button
        onClick={() => handleReportClick(currentDayReport, 'daily')}
        disabled={isLoadingReports}
        className="group px-6 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ 
          background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)', 
          color: '#000', 
          boxShadow: '0 4px 20px rgba(201,166,70,0.4)' 
        }}
      >
        {isLoadingReports ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <FileText className="w-5 h-5" />
            Open Today's Report
          </>
        )}
      </button>
    ) : (
      <div 
        className="px-8 py-4 rounded-xl font-semibold text-base flex items-center gap-4"
        style={{ 
          background: 'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.05) 100%)',
          border: '1px solid rgba(201,166,70,0.25)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}
      >
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ 
            background: 'rgba(201,166,70,0.15)',
            border: '1px solid rgba(201,166,70,0.3)'
          }}
        >
          <Clock className="w-6 h-6 text-[#C9A646] animate-pulse" />
        </div>
        <div className="text-left">
          <span className="block text-[#C9A646] font-bold text-base">Today's Report Coming Soon</span>
          <span className="block text-[#C9A646]/60 text-sm">
            Available at 9:00 AM ET • {dailyCountdown.hours}h {dailyCountdown.minutes}m remaining
          </span>
        </div>
      </div>
    )}
    
    {/* View Weekly Review - Gold Button OR Waiting State */}
    {currentWeeklyReport ? (
      <button
        onClick={() => handleReportClick(currentWeeklyReport, 'weekly')}
        disabled={isLoadingReports}
        className="group px-6 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ 
          background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)', 
          color: '#000', 
          boxShadow: '0 4px 20px rgba(201,166,70,0.4)' 
        }}
      >
        {isLoadingReports ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Calendar className="w-5 h-5" />
            View Weekly Review
          </>
        )}
      </button>
    ) : (
      <div 
        className="px-8 py-4 rounded-xl font-semibold text-base flex items-center gap-4"
        style={{ 
          background: 'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.05) 100%)',
          border: '1px solid rgba(201,166,70,0.25)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}
      >
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ 
            background: 'rgba(201,166,70,0.15)',
            border: '1px solid rgba(201,166,70,0.3)'
          }}
        >
          <Clock className="w-6 h-6 text-[#C9A646] animate-pulse" />
        </div>
        <div className="text-left">
          <span className="block text-[#C9A646] font-bold text-base">Weekly Review Coming Soon</span>
          <span className="block text-[#C9A646]/60 text-sm">
            Available Sunday 10:00 AM ET • {weeklyCountdown.hours}h {weeklyCountdown.minutes}m remaining
          </span>
        </div>
      </div>
    )}
  </div>

  {/* Report Schedule Info */}
  <p className="text-[#C9A646]/60 text-sm flex items-center gap-2 justify-center lg:justify-start">
    <Clock className="w-4 h-4 text-[#C9A646]" />
    New report every trading day • 9:10 AM ET • Bookmark this page
  </p>
</div>


{/* Right: Bull Image - clean without fire effects */}
<div className="relative flex-shrink-0 lg:flex-1 flex justify-center lg:justify-end -mr-8 lg:-mr-16">
{/* Bull container - fades into background on all edges */}
<div
  className="relative z-10 overflow-hidden"
  style={{
    maskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 30%, transparent 70%)',
    WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 30%, transparent 70%)',
  }}
>
  <img 
    src={BullWarZone} 
    alt="War Zone Bull" 
    className="w-[500px] md:w-[600px] lg:w-[700px] h-auto"
    style={{ 
      filter: 'drop-shadow(0 0 80px rgba(255,130,30,0.8)) drop-shadow(0 0 40px rgba(255,100,20,0.6))',
      mixBlendMode: 'lighten',
      marginTop: '-22%',
      marginBottom: '-45%',
    }}
  />
</div>
</div>
          </div>

          {/* Reports Section */}
          <div className="mb-8">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="heading-font text-2xl text-[#E8DCC4] italic">Your Reports</h3>
              
              {/* Report Schedule */}
              <div className="flex items-center gap-2 text-[#C9A646]/70 text-sm">
                <Clock className="w-4 h-4 text-[#C9A646]" />
                <span>Daily: 9:00 AM ET</span>
                <span className="text-[#C9A646]/50">•</span>
                <span>Weekly: Sunday 10:00 AM ET</span>
              </div>
            </div>

{/* Previous Reports Section - Always Available */}
<div className="mb-8">
  {/* Section Header */}
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
    <h3 className="heading-font text-xl text-[#E8DCC4]/80 italic">Previous Reports</h3>
    <p className="text-[#C9A646]/50 text-sm">Always available for download</p>
  </div>

  {/* Previous Report Cards Grid - 2 COLUMNS */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    
    {/* LEFT CARD: Previous Daily Report */}
    <div
      className={cn(
        "group relative p-5 rounded-2xl text-left transition-all duration-300",
        previousDayReport && "hover:scale-[1.02] cursor-pointer"
      )}
      style={{ 
        background: 'linear-gradient(135deg, rgba(25,20,15,0.9) 0%, rgba(35,28,20,0.8) 100%)',
        border: '1px solid rgba(201,166,70,0.25)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}
      onClick={() => previousDayReport && handleReportClick(previousDayReport, 'daily')}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              background: 'rgba(201,166,70,0.15)',
              border: '1px solid rgba(201,166,70,0.3)'
            }}
          >
            {isLoadingReports ? (
              <Loader2 className="w-5 h-5 text-[#C9A646] animate-spin" />
            ) : (
              <FileText className="w-5 h-5 text-[#C9A646]" />
            )}
          </div>
          <div>
            <p className="text-white font-semibold">
              {isLoadingReports 
                ? 'Loading...' 
                : previousDayReport 
                  ? formatReportDate(previousDayReport.report_date)
                  : 'No previous report'
              }
            </p>
            <p className="text-[#C9A646]/50 text-xs">
              {isLoadingReports 
                ? 'Please wait...'
                : previousDayReport 
                  ? `Published at ${formatReportTime(previousDayReport.updated_at || previousDayReport.created_at)} ET`
                  : 'Check back later'
              }
            </p>
          </div>
        </div>
        {previousDayReport && (
          <ChevronRight className="w-5 h-5 text-[#C9A646] transition-transform group-hover:translate-x-1" />
        )}
      </div>
      {previousDayReport && (
        <div 
          className="absolute bottom-0 left-4 right-4 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(201,166,70,0.5), transparent)' }}
        />
      )}
    </div>

    {/* RIGHT CARD: Previous Weekly Report */}
    <div
      className={cn(
        "group relative p-5 rounded-2xl text-left transition-all duration-300",
        previousWeeklyReport && "hover:scale-[1.02] cursor-pointer"
      )}
      style={{ 
        background: 'linear-gradient(135deg, rgba(25,20,15,0.9) 0%, rgba(35,28,20,0.8) 100%)',
        border: '1px solid rgba(201,166,70,0.25)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}
      onClick={() => previousWeeklyReport && handleReportClick(previousWeeklyReport, 'weekly')}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              background: 'rgba(201,166,70,0.15)',
              border: '1px solid rgba(201,166,70,0.3)'
            }}
          >
            {isLoadingReports ? (
              <Loader2 className="w-5 h-5 text-[#C9A646] animate-spin" />
            ) : (
              <Calendar className="w-5 h-5 text-[#C9A646]" />
            )}
          </div>
          <div>
            <p className="text-[#C9A646] font-semibold italic">
              {isLoadingReports 
                ? 'Loading...' 
                : previousWeeklyReport 
                  ? `Week of ${new Date(previousWeeklyReport.report_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
                  : 'No previous report'
              }
            </p>
            <p className="text-[#C9A646]/50 text-xs">
              {isLoadingReports 
                ? 'Please wait...'
                : previousWeeklyReport 
                  ? `Published at ${formatReportTime(previousWeeklyReport.created_at)} ET`
                  : 'Check back later'
              }
            </p>
          </div>
        </div>
        {previousWeeklyReport && (
          <ChevronRight className="w-5 h-5 text-[#C9A646] transition-transform group-hover:translate-x-1" />
        )}
      </div>
      {previousWeeklyReport && (
        <div 
          className="absolute bottom-0 left-4 right-4 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(201,166,70,0.5), transparent)' }}
        />
      )}
    </div>
  </div>
</div>
          </div>

{/* TEST REPORT ROW - ONLY FOR TESTERS */}
{isTester && testDailyReport && (
  <TestReportCard 
    testDailyReport={testDailyReport}
    formatReportDate={formatReportDate}
    formatReportTime={formatReportTime}
    handleReportClick={handleReportClick}
    onPublishSuccess={() => fetchReports(false)}
    clearTestReport={() => setTestDailyReport(null)}
  />
)}

          {/* Intel Message */}
          <p className="text-center text-[#C9A646]/60 text-lg heading-font italic mb-10">
            Stay sharp. stay informed. Here's your intel for today.
          </p>

          {/* Bottom Cards: Discord, Trading Room */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Discord Community */}
            <a 
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
              style={{ 
                background: 'linear-gradient(135deg, rgba(25,20,15,0.9) 0%, rgba(35,28,20,0.8) 100%)',
                border: '1px solid rgba(201,166,70,0.25)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ 
                    background: 'rgba(88,101,242,0.15)',
                    border: '1px solid rgba(88,101,242,0.3)'
                  }}
                >
                  <DiscordIcon className="w-6 h-6 text-[#5865F2]" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Discord Community</h4>
                  <p className="text-[#C9A646]/50 text-sm">Join 847+ active traders</p>
                </div>
              </div>
              <button 
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
                style={{ 
                  background: 'rgba(88,101,242,0.15)',
                  border: '1px solid rgba(88,101,242,0.4)',
                  color: '#5865F2'
                }}
              >
                Join Now
              </button>
            </a>

            {/* Trading Room */}
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
              style={{ 
                background: 'linear-gradient(135deg, rgba(25,20,15,0.9) 0%, rgba(35,28,20,0.8) 100%)',
                border: '1px solid rgba(201,166,70,0.25)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ 
                    background: 'rgba(168,85,247,0.15)',
                    border: '1px solid rgba(168,85,247,0.3)'
                  }}
                >
                  <Headphones className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Trading Room</h4>
                  <p className="text-[#C9A646]/50 text-sm">Live market analysis now</p>
                </div>
              </div>
              <button 
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
                style={{ 
                  background: 'rgba(168,85,247,0.15)',
                  border: '1px solid rgba(168,85,247,0.4)',
                  color: '#A855F7'
                }}
              >
                Join Now
              </button>
            </a>
          </div>
        </div>

 {/* Bottom fire glow effect */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ 
            background: 'linear-gradient(180deg, transparent 0%, rgba(201,166,70,0.05) 50%, rgba(255,140,30,0.1) 100%)'
          }}
        />
      </div>

      {/* CSS Animation for slideDown */}
      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
interface WarZoneLandingProps {
  previewMode?: 'landing' | 'subscriber' | null;
}

export default function WarZoneLandingSimple({ previewMode = null }: WarZoneLandingProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(previewMode ? false : true);
  
  // Mock status for preview modes
  const mockActiveStatus: NewsletterStatus = {
    newsletter_enabled: true,
    newsletter_status: 'active',
    newsletter_whop_membership_id: 'preview_mock',
    newsletter_started_at: new Date().toISOString(),
    newsletter_expires_at: null,
    newsletter_trial_ends_at: null,
    newsletter_cancel_at_period_end: false,
    days_until_expiry: null,
    days_until_trial_ends: null,
    is_in_trial: false,
    is_active: true,
  };
  
  const [newsletterStatus, setNewsletterStatus] = useState<NewsletterStatus | null>(
    previewMode === 'subscriber' ? mockActiveStatus : null
  );
  const [topSecretStatus, setTopSecretStatus] = useState<TopSecretStatus>({ is_active: false, membership_id: null });
const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [currentReport, setCurrentReport] = useState<NewsletterReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  

const checkSubscriptionStatus = useCallback(async () => {
    if (!user?.id) { setIsLoading(false); return; }
    try {
      // Check Top Secret status
      const { data: topSecretData } = await supabase
        .from('profiles')
        .select('top_secret_enabled, top_secret_status, top_secret_whop_membership_id')
        .eq('id', user.id)
        .single();
      
      if (topSecretData) {
        setTopSecretStatus({
          is_active: topSecretData.top_secret_enabled && ['active', 'trial'].includes(topSecretData.top_secret_status ?? ''),
          membership_id: topSecretData.top_secret_whop_membership_id
        });
      }

      const { data, error } = await supabase.rpc('get_newsletter_status', { p_user_id: user.id });
      if (error) {
        const { data: profile } = await supabase.from('profiles').select('newsletter_enabled, newsletter_status, newsletter_trial_ends_at, newsletter_expires_at, newsletter_whop_membership_id, newsletter_cancel_at_period_end').eq('id', user.id).single();
        if (profile) {
          const trialEndsAt = profile.newsletter_trial_ends_at ? new Date(profile.newsletter_trial_ends_at) : null;
          const now = new Date();
          setNewsletterStatus({ newsletter_enabled: profile.newsletter_enabled ?? false, newsletter_status: profile.newsletter_status ?? 'inactive', newsletter_whop_membership_id: profile.newsletter_whop_membership_id, newsletter_started_at: null, newsletter_expires_at: profile.newsletter_expires_at, newsletter_trial_ends_at: profile.newsletter_trial_ends_at, newsletter_cancel_at_period_end: profile.newsletter_cancel_at_period_end ?? false, days_until_expiry: null, days_until_trial_ends: trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null, is_in_trial: profile.newsletter_status === 'trial', is_active: profile.newsletter_enabled && ['active', 'trial'].includes(profile.newsletter_status ?? '') });
        }
      } else if (data && data.length > 0) { setNewsletterStatus(data[0]); }
    } catch (error) { console.error('Error:', error); } finally { setIsLoading(false); }
  }, [user?.id]);

  useEffect(() => { if (pollCount > 0 && pollCount <= 15) { const t = setTimeout(() => { checkSubscriptionStatus().then(() => { if (newsletterStatus?.is_active) setPollCount(0); else setPollCount(p => p + 1); }); }, 2000); return () => clearTimeout(t); } }, [pollCount, newsletterStatus?.is_active, checkSubscriptionStatus]);
  useEffect(() => { checkSubscriptionStatus(); }, [checkSubscriptionStatus]);

  const fetchLatestReport = useCallback(async () => { setIsLoadingReport(true); setReportError(null); try { const { data: { session } } = await supabase.auth.getSession(); if (!session?.access_token) { setReportError('Please login'); setIsLoadingReport(false); return; } const r = await fetch(`${API_BASE}/api/newsletter/latest`, { headers: { 'Authorization': `Bearer ${session.access_token}` } }); const d = await r.json(); if (!r.ok) { setReportError(d.error || 'Failed'); return; } if (d.success && d.data) setCurrentReport(d.data); else setCurrentReport(null); } catch (e) { setReportError('Failed to load'); } finally { setIsLoadingReport(false); } }, []);

  const handleSubscribeClick = () => { if (!user) { setShowLoginRequired(true); return; } setShowDisclaimer(true); };
  const handleLoginRedirect = () => { sessionStorage.setItem('return_after_login', window.location.pathname); navigate('/login'); };
const handleAcceptDisclaimer = async () => { 
  if (!user?.id || !user?.email) { setShowDisclaimer(false); setShowLoginRequired(true); return; } 
  setIsProcessing(true); 
  try { 
    const { data: profile } = await supabase.from('profiles').select('newsletter_unsubscribe_token').eq('id', user.id).single(); 
    if (!profile?.newsletter_unsubscribe_token) await supabase.from('profiles').update({ newsletter_unsubscribe_token: crypto.randomUUID(), updated_at: new Date().toISOString() }).eq('id', user.id); 
    const isYearly = billingInterval === 'yearly';
    const isTopSecretDiscount = billingInterval === 'monthly' && topSecretStatus.is_active;
    
    let checkoutBaseUrl: string;
    if (isYearly) {
      checkoutBaseUrl = WHOP_CHECKOUT_BASE_URL_YEARLY;
    } else if (isTopSecretDiscount) {
      checkoutBaseUrl = `https://whop.com/checkout/${WHOP_MONTHLY_PLAN_ID_TOPSECRET}`;
    } else {
      checkoutBaseUrl = WHOP_CHECKOUT_BASE_URL_MONTHLY;
    }
    
    const params = new URLSearchParams(); 
    params.set('email', user.email); 
    params.set('metadata[finotaur_user_id]', user.id);
    params.set('metadata[finotaur_email]', user.email);
    params.set('metadata[billing_interval]', billingInterval);
    params.set('metadata[is_topsecret_member]', String(topSecretStatus.is_active));
    if (topSecretStatus.membership_id) {
      params.set('metadata[topsecret_membership_id]', topSecretStatus.membership_id);
    }
    params.set('redirect_url', `${REDIRECT_URL}?payment=success`); 
    setShowDisclaimer(false); 
    window.location.href = `${checkoutBaseUrl}?${params.toString()}`; 
  } catch (e) { console.error('Checkout error:', e); setIsProcessing(false); alert('Error starting checkout. Please try again.'); } 
};  const handleCancelSubscription = async () => { 
  if (!user?.id) return; 
  setIsCancelling(true); 
  try { 
    const { data, error } = await supabase.functions.invoke('newsletter-cancel', { 
      body: { 
        action: 'cancel'
      } 
    }); 
    if (error) throw error; 
    if (data?.success) { 
      await checkSubscriptionStatus(); 
      setShowCancelModal(false); 
    } else throw new Error(data?.error || 'Failed'); 
  } catch (e) { 
    alert('Failed. Contact support@finotaur.com'); 
  } finally { 
    setIsCancelling(false); 
  } 
};
const handleViewReport = () => { setShowReportViewer(true); fetchLatestReport(); };

  const stats = [
  { value: '9:00 AM', label: 'Daily Delivery' },
  { value: '847+', label: 'Active Traders' },
  { value: '7 Days', label: 'Free Trial' },
  { value: '24/7', label: 'Discord Access' }
];
  const beforeAfter = {
  before: ["Wake up to 50+ headlines and zero clarity", "React to moves you should have anticipated", "Miss sector rotations until it is too late", "Trade on noise instead of conviction", "Second-guess every decision"],
  after: ["Wake up knowing exactly what matters", "Position before the crowd reacts", "Catch rotations as they begin", "Trade with institutional-grade conviction", "Execute with clarity and confidence"]
};
  const dailyFeatures = [
  { icon: Globe, title: 'Global Macro Analysis', desc: 'Key market drivers from Asia to Europe before US opens.' },
  { icon: Activity, title: 'Sector Rotation Intel', desc: 'Where money is flowing and where it is leaving.' },
  { icon: Target, title: 'Actionable Trade Ideas', desc: 'Specific setups with clear entry, target, and risk levels.' },
  { icon: BarChart3, title: 'Technical + Fundamental', desc: 'Charts meet catalysts for complete market context.' }
];
const faqs = [
  { q: "How does the 7-day free trial work?", a: "Full access for 7 days. Cancel in one click, pay nothing. Only available on monthly plan." },
  { q: "When do I receive the daily briefing?", a: "Every trading day at 9:00 AM New York time — before the market opens. You'll have everything you need to start your day with clarity." },
  { q: "What do I get with my subscription?", a: "Daily market briefing, weekly tactical review, access to our private Discord community with 847+ traders, and the Finotaur Trading Room with live analysis." },
  { q: "Is this just another stock newsletter?", a: "No. WAR ZONE is a professional-grade market briefing — the same style institutional trading desks use. Not stock picks. Not hype. Pure market intelligence." },
  { q: "Can I cancel anytime?", a: "Absolutely. No contracts, no commitments, no questions asked. Cancel with one click from your account settings." }
];

// ============================================
// SCROLLING TESTIMONIALS DATA
// ============================================
const scrollingTestimonials = [
  { id: 1, name: "David Chen", role: "Hedge Fund Manager", avatar: "DC", text: "The daily briefing is something I genuinely wait for every morning. The level of analysis here is institutional-grade.", highlight: "something I genuinely wait for every morning" },
  { id: 2, name: "Sarah Mitchell", role: "Day Trader", avatar: "SM", text: "WAR ZONE gave me the edge I was missing. After one week I realized this is the best investment I made this year.", highlight: "the best investment I made this year" },
  { id: 3, name: "Michael Rodriguez", role: "Prop Trader", avatar: "MR", text: "I pay thousands per month for research subscriptions. WAR ZONE beats them all in value-for-money.", highlight: "beats them all in value-for-money" },
  { id: 4, name: "Emily Watson", role: "Portfolio Manager", avatar: "EW", text: "Finally someone who understands I don't need more data, I need conclusions. These briefings save me hours every day.", highlight: "save me hours every day" },
  { id: 5, name: "James Kim", role: "Swing Trader", avatar: "JK", text: "The writing quality and depth of analysis here is something I haven't found anywhere else.", highlight: "something I haven't found anywhere else" },
  { id: 6, name: "Rachel Green", role: "Options Trader", avatar: "RG", text: "WAR ZONE is like someone turned on the lights in a dark room. Now I see the full picture before market open.", highlight: "turned on the lights in a dark room" },
  { id: 7, name: "Alex Thompson", role: "Crypto Investor", avatar: "AT", text: "I tried the free trial and canceled all my other subscriptions. WAR ZONE is all I need now.", highlight: "canceled all my other subscriptions" },
  { id: 8, name: "Lisa Anderson", role: "Forex Trader", avatar: "LA", text: "The macro analysis here is better than anything I got from Bloomberg Terminal. And I'm not joking.", highlight: "better than anything I got from Bloomberg" },
];

const duplicatedTestimonials = [...scrollingTestimonials, ...scrollingTestimonials];
  // Preview mode overrides
  if (previewMode === 'landing') {
    // Force show landing page regardless of actual status
    // Continue to render landing page below
  } else if (previewMode === 'subscriber') {
    // Force show subscriber view
    return (
      <ActiveSubscriberView 
        newsletterStatus={mockActiveStatus} 
        onCancelClick={() => alert('Cancel disabled in preview mode')} 
      />
    );
  } else {
    // Normal flow
    if (isLoading) return <div className="min-h-screen bg-[#0a0806] flex items-center justify-center"><Loader2 className="w-14 h-14 animate-spin text-[#C9A646]" /></div>;
    if (newsletterStatus?.is_active) return (<><CancelSubscriptionModal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} onConfirm={handleCancelSubscription} isProcessing={isCancelling} trialDaysRemaining={newsletterStatus.days_until_trial_ends} /><ActiveSubscriberView newsletterStatus={newsletterStatus} onCancelClick={() => setShowCancelModal(true)} /></>);
  }
  // ====================================
  // LANDING PAGE - EXACT DESIGN MATCH
  // ====================================
  return (
    <div className="min-h-screen bg-[#0a0806] overflow-hidden relative">
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');
        .heading-serif{font-family:'Playfair Display',Georgia,serif}
        @keyframes hero-orb{0%,100%{transform:scale(1);opacity:0.08}50%{transform:scale(1.1);opacity:0.12}}.hero-orb{animation:hero-orb 8s ease-in-out infinite}
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes particle-rise { 0% { transform: translateY(0) scale(1); opacity: 0; } 10% { opacity: 0.7; } 80% { opacity: 0.5; } 100% { transform: translateY(-85vh) scale(0.3); opacity: 0; } }
        @keyframes sparkle { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes twinkle { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        @keyframes dust-float { 
          0%, 100% { transform: translate(0, 0); opacity: 0.15; } 
          50% { transform: translate(3px, -3px); opacity: 0.35; } 
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .stats-font { font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; font-weight: 400; font-style: italic; }
        .text-cream { color: #E8DCC4; }
        .text-gold { color: #E9A931; }
        .sparkle { animation: sparkle 2s ease-in-out infinite; }
        .twinkle { animation: twinkle 1.5s ease-in-out infinite; }
      `}</style>

      <DisclaimerPopup isOpen={showDisclaimer} onClose={() => setShowDisclaimer(false)} onAccept={handleAcceptDisclaimer} isProcessing={isProcessing} billingInterval={billingInterval} isTopSecretMember={topSecretStatus.is_active} />

      {/* ============ HERO SECTION ============ */}
      <section className="relative min-h-screen">
        {/* Base Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#080808] via-[#0d0b08] to-[#080808]" />
        
        {/* Animated Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-[#C9A646]/[0.08] rounded-full blur-[150px] hero-orb"/>
        <div className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] bg-[#D4BF8E]/[0.06] rounded-full blur-[140px] hero-orb" style={{animationDelay:'3s'}}/>
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-[#F4D97B]/[0.04] rounded-full blur-[130px] hero-orb" style={{animationDelay:'5s'}}/>

        {/* ===== MOBILE LAYOUT ===== */}
        <div className="lg:hidden relative z-10 min-h-screen flex flex-col">
          {/* Mobile Content */}
          <div className="flex-1 flex flex-col items-center px-6 pt-4">
            {/* Title */}
            <h1 className="text-[1.5rem] sm:text-[1.8rem] font-bold leading-[1.05] tracking-tight text-center mb-3">
              <span className="text-white block heading-serif italic">Every Morning</span>
              <span className="text-white block heading-serif italic">You Wake Up</span>
              <span className="relative inline-block mt-1">
                <span className="heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">Blind to What Moves</span>
              </span>
              <span className="relative inline-block"><span className="heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">the Market.</span></span>
            </h1>

            {/* Mobile Bull with particles - seamless blend */}
            <div className="relative w-full flex justify-center my-2">
              {/* Particles behind bull */}
              <div className="absolute inset-0 overflow-hidden z-0">
                <ParticleBackground />
              </div>
              {/* Ground glow */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[320px] h-[80px] z-10" style={{ background: 'radial-gradient(ellipse, rgba(255,140,30,0.4) 0%, rgba(200,100,20,0.15) 50%, transparent 80%)', filter: 'blur(20px)' }} />
              <img 
                src={BullWarZone} 
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
              <span className="text-[#C9A646] font-bold">WAR ZONE</span> gives you the same institutional market briefing Wall Street desks use — <span className="text-cream font-medium">before the market opens.</span> Every single day.
            </p>

            {/* Billing Toggle */}
<BillingToggle selected={billingInterval} onChange={setBillingInterval} className="mb-3" />

{/* CTA Button - GOLD - Mobile */}
<button 
  onClick={handleSubscribeClick} 
  className="group px-8 py-4 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 mb-6"
  style={{ 
    background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)', 
    color: '#000', 
    boxShadow: '0 4px 24px rgba(201,166,70,0.4)' 
  }}
>
  {billingInterval === 'monthly' ? 'Start 7-Day Free Trial' : `Get WAR ZONE for $${YEARLY_PRICE}/year`}
  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
</button>

{/* Feature Icons Row - Mobile (stacked on very small screens) */}
<div className="flex flex-wrap items-center justify-center gap-4 text-xs">
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
      <FileText className="w-3.5 h-3.5 text-[#C9A646]" strokeWidth={1.5} />
    </div>
    <div>
      <div className="text-white font-bold">Daily Briefing</div>
      <div className="text-slate-400 text-[10px]">9:00 AM NY</div>
    </div>
  </div>
  
  <div className="w-px h-8 bg-[#C9A646]/30 hidden sm:block" />
  
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
      <Shield className="w-3.5 h-3.5 text-[#C9A646]" strokeWidth={1.5} />
    </div>
    <div>
      <div className="text-white font-bold">Institutional</div>
      <div className="text-slate-400 text-[10px]">Grade Intel</div>
    </div>
  </div>
  
  <div className="w-px h-8 bg-[#C9A646]/30 hidden sm:block" />
  
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
      <Target className="w-3.5 h-3.5 text-[#C9A646]" strokeWidth={1.5} />
    </div>
    <div>
      <div className="text-white font-bold">Actionable</div>
      <div className="text-slate-400 text-[10px]">Trade Ideas</div>
    </div>
  </div>
</div>
          </div>

          {/* Mobile Stats */}
          <div className="mt-auto relative z-50">
            <GoldenDivider />
            <div className="bg-[#0a0806] py-5 px-4 relative z-50">
              <div className="grid grid-cols-4 gap-2">
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-lg sm:text-xl font-bold heading-serif italic text-[#C9A646] whitespace-nowrap">{stat.value}</div>
                    <div className="text-slate-400 text-[8px] sm:text-[9px] mt-1 tracking-wide uppercase">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ===== DESKTOP LAYOUT ===== */}
        <div className="hidden lg:block relative z-10 min-h-screen">
          {/* Two Column Layout */}
          <div className="flex min-h-screen">
            {/* Left Column - Text (with very subtle sparkles) */}
            <div className="w-1/2 bg-[#0a0806] flex flex-col justify-center pl-20 xl:pl-28 2xl:pl-36 pr-12 relative overflow-hidden">
              
              {/* Very subtle sparkle effects - only here */}
              <div className="absolute inset-0 z-1 opacity-20">
                <SparkleEffect />
              </div>
              
<h1 className="text-[2.8rem] xl:text-[3.2rem] 2xl:text-[3.8rem] font-bold leading-[1.05] tracking-tight mb-8 relative z-20 pl-2">                <span className="text-white block heading-serif italic">Every Morning</span>
                <span className="text-white block heading-serif italic">You Wake Up</span>
                <span className="relative inline-block mt-2">
                  <span className="absolute inset-0 blur-3xl opacity-40 bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] animate-pulse" style={{animationDuration:'4s'}}/>
                  <span className="relative heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">Blind to What Moves</span>
                </span>
                <span className="relative inline-block"><span className="heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">the Market.</span></span>
              </h1>

              <p className="text-[#C9A646]/80 text-lg leading-relaxed mb-8 max-w-xl relative z-20">
                <span className="font-bold" style={{ color: '#E9A931' }}>WAR ZONE</span> gives you the same institutional market briefing Wall Street desks use — <span className="text-cream font-medium">before the market opens.</span> Every single day.
              </p>

              <BillingToggle selected={billingInterval} onChange={setBillingInterval} className="mb-6 justify-start relative z-20" />

{/* CTA Button - GOLD */}
<div className="flex flex-wrap items-center gap-4 mb-8 relative z-20">
  <button 
    onClick={handleSubscribeClick} 
    className="group px-8 py-4 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
    style={{ 
      background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)', 
      color: '#000', 
      boxShadow: '0 4px 24px rgba(201,166,70,0.4)' 
    }}
  >
    {billingInterval === 'monthly' ? 'Start 7-Day Free Trial' : `Get WAR ZONE for $${YEARLY_PRICE}/year`}
    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
  </button>
</div>
{/* Feature Icons Row */}
<div className="flex flex-wrap items-center gap-6 relative z-20">
  <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
      <FileText className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5} />
    </div>
    <div>
      <div className="text-white font-bold text-sm">Daily Briefing</div>
      <div className="text-slate-400 text-xs">9:00 AM NY</div>
    </div>
  </div>
  
  <div className="w-px h-10 bg-[#C9A646]/30" />
  
  <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
      <Shield className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5} />
    </div>
    <div>
      <div className="text-white font-bold text-sm">Institutional</div>
      <div className="text-slate-400 text-xs">Grade Intel</div>
    </div>
  </div>
  
  <div className="w-px h-10 bg-[#C9A646]/30" />
  
  <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
      <Target className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5} />
    </div>
    <div>
      <div className="text-white font-bold text-sm">Actionable</div>
      <div className="text-slate-400 text-xs">Trade Ideas</div>
    </div>
  </div>
</div>
            </div>

            {/* Right Column - Bull Image (seamlessly blends with background) */}
            <div className="w-1/2 relative flex items-center justify-center overflow-hidden bg-[#0a0806]">
              {/* Particles */}
              <div className="absolute inset-0 z-0">
                <ParticleBackground />
              </div>
              
              {/* Sparkle effects */}
              <div className="absolute inset-0 z-10">
                <SparkleEffect />
              </div>
              
              {/* Ground fire glow */}
              <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-[700px] h-[200px] z-10" style={{ background: 'radial-gradient(ellipse, rgba(255,130,30,0.4) 0%, rgba(200,100,20,0.15) 40%, transparent 70%)', filter: 'blur(40px)' }} />
              
              {/* Bull container with smooth radial fade */}
              <div 
                className="relative z-20"
                style={{
                  maskImage: 'radial-gradient(ellipse 75% 80% at 45% 50%, black 30%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.2) 70%, transparent 85%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 75% 80% at 45% 50%, black 30%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.2) 70%, transparent 85%)',
                }}
              >
                <img 
                  src={BullWarZone} 
                  alt="War Zone Bull" 
                  className="w-[500px] xl:w-[580px] 2xl:w-[650px] h-auto object-contain"
                  style={{ 
                    filter: 'drop-shadow(0 0 80px rgba(255,150,50,0.3))',
                  }} 
                />
              </div>
              
              {/* Soft edge gradients for seamless blend */}
              {/* Left */}
              <div className="absolute inset-y-0 left-0 w-40 z-30" style={{ background: 'linear-gradient(90deg, #0a0806 0%, rgba(10,8,6,0.8) 30%, transparent 100%)' }} />
              {/* Top */}
              <div className="absolute inset-x-0 top-0 h-32 z-30" style={{ background: 'linear-gradient(180deg, #0a0806 0%, rgba(10,8,6,0.5) 40%, transparent 100%)' }} />
              {/* Right */}
              <div className="absolute inset-y-0 right-0 w-40 z-30" style={{ background: 'linear-gradient(270deg, #0a0806 0%, rgba(10,8,6,0.8) 30%, transparent 100%)' }} />
              {/* Bottom */}
              <div className="absolute inset-x-0 bottom-0 h-32 z-30" style={{ background: 'linear-gradient(0deg, #0a0806 0%, rgba(10,8,6,0.5) 40%, transparent 100%)' }} />
            </div>
          </div>

          {/* Stats Bar - Bottom - Premium Design */}
          <div className="absolute bottom-0 left-0 right-0 z-40">
            {/* Top golden line */}
            <div className="relative w-full h-[1px]">
              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(201,166,70,0.5) 20%, rgba(244,217,123,0.8) 50%, rgba(201,166,70,0.5) 80%, transparent 100%)' }} />
            </div>
            
            <div className="relative z-50" style={{ background: 'linear-gradient(180deg, rgba(15,12,8,0.98) 0%, rgba(10,8,6,0.99) 100%)' }}>
              <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="grid grid-cols-4">
                  {stats.map((stat, i) => (
                    <div key={i} className="text-center relative px-6">
                      {/* Stat value */}
                      <div className="text-3xl md:text-4xl lg:text-5xl font-bold heading-serif italic text-[#C9A646] whitespace-nowrap">
                        {stat.value}
                      </div>
                      {/* Label */}
                      <div className="text-slate-400 text-xs mt-2 tracking-wide uppercase">{stat.label}</div>

                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Bottom golden line */}
            <div className="relative w-full h-[1px]">
              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(201,166,70,0.5) 20%, rgba(244,217,123,0.8) 50%, rgba(201,166,70,0.5) 80%, transparent 100%)' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ============ SOCIAL PROOF SECTION ============ */}
      <SocialProof />

      {/* ============ BEFORE/AFTER SECTION ============ */}
      <section className="py-24 px-6 relative overflow-hidden">
        {/* Luxury Dark Background with Rich Gold Undertone */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0a08] to-[#0a0a0a]" />
        
        {/* Gold Border Line at Top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />
        
        {/* Enhanced Gold Ambient Glows */}
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[500px] bg-[#C9A646]/[0.08] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 left-1/5 w-[500px] h-[450px] bg-[#D4AF37]/[0.07] rounded-full blur-[130px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#C9A646]/[0.05] rounded-full blur-[160px]" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[350px] bg-[#F4D97B]/[0.04] rounded-full blur-[120px]" />
        
        <div className="max-w-5xl mx-auto relative z-10">
          {/* Title Section - Luxury Style */}
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
          
          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* BEFORE Card - Red Accent Style */}
            <div
              className="rounded-2xl overflow-hidden transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(239,68,68,0.05) 0%, rgba(0,0,0,0.3) 100%)',
                border: '1px solid rgba(239,68,68,0.15)',
              }}
            >
              {/* Card Header */}
              <div className="flex items-center gap-4 px-6 py-5 border-b border-red-500/10">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-white font-bold text-lg">Without WAR ZONE</h3>
              </div>
              
              {/* Card Content */}
              <div className="px-6 py-6 space-y-4">
                {beforeAfter.before.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <XCircle className="w-5 h-5 text-red-400/50 flex-shrink-0" />
                    <span className="text-slate-400 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* AFTER Card - Gold Accent Style */}
            <div
              className="rounded-2xl overflow-hidden transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(0,0,0,0.3) 100%)',
                border: '1px solid rgba(201,166,70,0.2)',
              }}
            >
              {/* Card Header */}
              <div className="flex items-center gap-4 px-6 py-5 border-b border-[#C9A646]/15">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-white font-bold text-lg">With WAR ZONE</h3>
              </div>
              
              {/* Card Content */}
              <div className="px-6 py-6 space-y-4">
                {beforeAfter.after.map((item, i) => (
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

      {/* ============ NOT A NEWSLETTER SECTION ============ */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100c08] to-[#0a0a0a]"/>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent"/>
        <div className="absolute top-1/4 left-1/6 w-[500px] h-[400px] bg-[#C9A646]/[0.08] rounded-full blur-[140px]"/>
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-[#D4AF37]/[0.07] rounded-full blur-[120px]"/>
        <div className="absolute top-1/2 right-1/6 w-[400px] h-[350px] bg-[#F4D97B]/[0.05] rounded-full blur-[130px]"/>
        <div className="absolute bottom-1/3 left-1/3 w-[500px] h-[400px] bg-[#C9A646]/[0.04] rounded-full blur-[150px]"/>
        <div className="max-w-5xl mx-auto relative z-10">
          {/* Compass Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16">
              <CompassIcon className="w-full h-full" />
            </div>
          </div>
          
          {/* Title Section */}
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
          
          {/* Feature Cards - 2x2 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {dailyFeatures.map((f, i) => (
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
          
          {/* Delivery Time Badge */}
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

      {/* ============ MORE THAN A BRIEFING ============ */}
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

      {/* ============ FAQ ============ */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100c08] to-[#0a0a0a]"/>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent"/>
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#C9A646]/[0.04] rounded-full blur-[120px]"/>
        <div className="max-w-4xl mx-auto relative z-10">
          {/* Title */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              <span className="text-white heading-serif">Frequently Asked </span>
              <span className="heading-serif text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] to-[#F4D97B]">Questions</span>
            </h2>
            <p className="text-slate-400 text-base">Everything you need to know before joining the War Zone.</p>
          </div>
          
          {/* FAQ Items */}
          <div className="space-y-4">
            {faqs.map((faq, i) => (
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
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300",
                        openFaq === i ? "rotate-0" : "rotate-0"
                      )}
                      style={{ 
                        background: openFaq === i ? 'rgba(233,169,49,0.2)' : 'rgba(201,166,70,0.1)',
                        border: `1px solid ${openFaq === i ? 'rgba(233,169,49,0.4)' : 'rgba(201,166,70,0.2)'}`
                      }}
                    >
                      <span className="text-[#E9A931] font-bold text-sm">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <h3 className={cn(
                      "font-semibold text-base md:text-lg transition-colors duration-300",
                      openFaq === i ? "text-white" : "text-cream"
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
                
                {/* Answer */}
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
          
          {/* Still have questions */}
          <div className="mt-12 text-center">
            <p className="text-[#C9A646]/60 text-sm">
              Still have questions? <a href="mailto:support@finotaur.com" className="text-[#E9A931] hover:underline font-medium">Contact us</a>
            </p>
          </div>
        </div>
      </section>

      {/* ============ PRICING SECTION ============ */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0a08] to-[#0a0a0a]"/>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent"/>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C9A646]/[0.06] rounded-full blur-[180px]"/>
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#D4AF37]/[0.04] rounded-full blur-[120px]"/>
        
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              <span className="heading-serif italic text-white block">You are Already in the Market.</span>
            </h2>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
              <span className="heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">Why Do It Without WAR ZONE?</span>
            </h2>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            
            {/* Monthly Card */}
            <div
              className="rounded-2xl relative overflow-hidden"
              style={{ background: 'linear-gradient(180deg, rgba(30,28,24,0.95) 0%, rgba(20,18,14,0.98) 100%)', border: '1px solid rgba(201,166,70,0.3)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
              
              {/* Badge */}
              <div className="absolute top-5 left-5">
                <span className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wider" style={{ background: 'linear-gradient(135deg, #C9A646, #F4D97B)', color: '#000' }}>MONTHLY</span>
              </div>
              
              <div className="p-6 pt-16">
                {/* Price */}
                <div className="mb-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-bold text-white">${MONTHLY_PRICE}</span>
                    <span className="text-slate-400 text-lg">/month</span>
                  </div>
                  <p className="text-green-400 font-bold text-sm mt-2 tracking-wide">FREE 7 DAY TRIAL</p>
                </div>
                
                {/* CTA Button */}
                <button onClick={handleSubscribeClick} className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 mb-3 transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)', color: '#000', boxShadow: '0 4px 20px rgba(201,166,70,0.4)' }}>
                  START FREE TRIAL <ArrowRight className="w-5 h-5"/>
                </button>
                <p className="text-slate-500 text-sm text-center mb-8">Risk-free. Cancel anytime.</p>
                
                {/* Features */}
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
              style={{ background: 'linear-gradient(180deg, rgba(40,35,25,0.95) 0%, rgba(25,22,16,0.98) 100%)', border: '2px solid rgba(201,166,70,0.5)', boxShadow: '0 12px 50px rgba(201,166,70,0.2), 0 8px 40px rgba(0,0,0,0.5)' }}>
              
              {/* Badge */}
              <div className="absolute top-5 right-5">
                <span className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wider" style={{ background: 'linear-gradient(135deg, #C9A646, #F4D97B)', color: '#000' }}>BEST DEAL</span>
              </div>
              
              <div className="p-6 pt-16">
                {/* Title */}
                <div className="mb-2">
                  <h3 className="text-2xl text-white"><span className="italic">Unlock</span> WAR ZONE</h3>
                  <p className="text-white font-bold text-xl">Institutional Research</p>
                </div>
                
                {/* Subtitle Badge */}
                <div className="mb-5">
                  <span className="px-3 py-1.5 rounded text-[10px] font-bold tracking-widest bg-white/10 text-slate-300 border border-white/20">FOR SERIOUS TRADERS ONLY</span>
                </div>
                
                {/* Price */}
                <div className="mb-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-bold text-[#C9A646]">${YEARLY_PRICE}</span>
                    <span className="text-slate-400 text-lg">/year</span>
                  </div>
                  <p className="text-green-400 font-semibold text-base mt-2">Just ${Math.round(YEARLY_PRICE / 12)}/month — Save ${YEARLY_SAVINGS}!</p>
                </div>
                
                {/* Features */}
                <div className="space-y-3 mb-6">
                  {['Priority Access', 'Locked price for 12 months', 'Early Access to future FINOTAUR tools', 'Founding Members badge'].map((f, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-[#C9A646] flex-shrink-0"/>
                      <span className="text-white">{f}</span>
                    </div>
                  ))}
                </div>
                
                {/* CTA Button */}
<button onClick={() => { setBillingInterval('yearly'); handleSubscribeClick(); }} className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 mb-3 transition-all hover:scale-[1.02]"
  style={{ background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)', color: '#000', boxShadow: '0 4px 20px rgba(201,166,70,0.4)' }}>
  GET ANNUAL PLAN <ArrowRight className="w-5 h-5"/>
</button>
                <p className="text-slate-500 text-sm text-center mb-5">Locked price. Cancel anytime.</p>
                
                {/* Bottom Features */}
                <div className="space-y-2 pt-4 border-t border-white/10">
                  {['Cancel anytime', '2 months FREE vs monthly', 'No lock-in contracts'].map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0"/>
                      <span className="text-slate-400 text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-slate-400">
            <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#C9A646]"/><span className="text-sm">Secure payment</span></div>
            <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block"/>
            <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-green-400"/><span className="text-sm">7-Day Free Trial</span></div>
            <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block"/>
            <div className="flex items-center gap-2"><Zap className="w-5 h-5 text-[#C9A646]"/><span className="text-sm">Cancel anytime</span></div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#C9A646]/10 py-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#C9A646]/40 text-sm">Questions? <a href="mailto:support@finotaur.com" className="text-[#C9A646] hover:underline">support@finotaur.com</a></p>
        </div>
      </footer>
    </div>
  );
}