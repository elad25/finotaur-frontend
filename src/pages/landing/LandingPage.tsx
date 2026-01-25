// =====================================================
// WAR ZONE EXTERNAL LANDING PAGE - LUXURY VERSION
// =====================================================

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { motion } from 'framer-motion';
import { Clock, ArrowRight, Check, XCircle, FileText, Activity, Globe, ChevronDown, Rocket, Shield, Target, BarChart3, Star, Quote, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LegalFooter } from "@/components/legal";

const MONTHLY_PRICE = 69.99;
const YEARLY_PRICE = 699;
const YEARLY_SAVINGS = Math.round((MONTHLY_PRICE * 12) - YEARLY_PRICE);
const BullWarZone = '/assets/Bull-WarZone.png';

type BillingInterval = 'monthly' | 'yearly';

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.36-.698.772-1.362 1.225-1.993a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.12-.094.246-.194.373-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419s.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419s.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const BellIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
);

const CompassIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none">
    <defs><linearGradient id="compassGold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#F4D97B"/><stop offset="100%" stopColor="#C9A646"/></linearGradient></defs>
    <circle cx="50" cy="50" r="42" stroke="url(#compassGold)" strokeWidth="2" fill="none"/>
    <circle cx="50" cy="50" r="32" stroke="url(#compassGold)" strokeWidth="1" fill="none" opacity="0.5"/>
    <path d="M50 12 L54 28 L50 22 L46 28 Z" fill="url(#compassGold)"/>
    <circle cx="50" cy="50" r="4" fill="url(#compassGold)"/>
  </svg>
);

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
  { q: "When do I receive the daily briefing?", a: "Every trading day at 9:00 AM New York time before the market opens." },
  { q: "What markets does WAR ZONE cover?", a: "Primarily US equities, with global macro context from Europe and Asia." },
  { q: "Is this just another stock newsletter?", a: "No. WAR ZONE is a professional-grade market briefing like institutional trading desks use." },
  { q: "How is this different from free market news?", a: "Free news tells you what happened. WAR ZONE tells you what it means and what to do." },
  { q: "Can I cancel anytime?", a: "Absolutely. No contracts, no commitments. Cancel with one click." },
  { q: "What if I am a beginner?", a: "WAR ZONE is written for traders who already understand market basics." }
];

const testimonials = [
  { text: "Finally, a morning briefing that actually helps me make money.", author: "Marcus T.", role: "Day Trader" },
  { text: "WAR ZONE is the only one that gives me actionable intel I can use immediately.", author: "Sarah K.", role: "Swing Trader" },
  { text: "My win rate improved significantly since I started reading the briefing.", author: "David R.", role: "Options Trader" }
];

const GoldenDivider = () => <div className="relative w-full h-[2px]"><div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, #C9A646 20%, #F4D97B 50%, #C9A646 80%, transparent)', boxShadow: '0 0 20px rgba(201,166,70,0.6)' }}/></div>;

const GlowingBadge = ({ className }: { className?: string }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
    className={cn("relative inline-flex flex-col items-center gap-1 px-10 py-5 rounded-xl overflow-hidden", className)} 
    style={{ background: 'linear-gradient(180deg, rgba(30,25,18,0.95), rgba(20,16,12,0.95))', boxShadow: '0 0 40px rgba(201,166,70,0.4)' }}>
    <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(244,217,123,1) 50%, transparent)' }}/>
    <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(244,217,123,1) 50%, transparent)' }}/>
    <div className="flex items-center gap-3">
      <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"/><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"/></span>
      <span className="text-[#C9A646] text-base font-bold tracking-wide">153 of 1,000 Seats Remaining</span>
    </div>
    <span className="text-[#C9A646]/60 text-sm">Daily Market Intelligence</span>
  </motion.div>
);

const BillingToggle = ({ selected, onChange, className }: { selected: BillingInterval; onChange: (i: BillingInterval) => void; className?: string }) => (
  <div className={cn("flex items-center justify-center gap-3", className)}>
    <button onClick={() => onChange('monthly')} className={cn("px-5 py-2.5 rounded-xl font-semibold text-sm transition-all", selected === 'monthly' ? "bg-gradient-to-r from-[#C9A646] to-[#F4D97B] text-black shadow-lg" : "bg-white/[0.03] border border-[#C9A646]/30 text-slate-300")}>Monthly</button>
    <button onClick={() => onChange('yearly')} className={cn("px-5 py-2.5 rounded-xl font-semibold text-sm transition-all relative", selected === 'yearly' ? "bg-gradient-to-r from-[#C9A646] to-[#F4D97B] text-black shadow-lg" : "bg-white/[0.03] border border-[#C9A646]/30 text-slate-300")}>
      Yearly<span className={cn("absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold", selected === 'yearly' ? "bg-green-500 text-white" : "bg-green-500/20 text-green-400")}>Save ${YEARLY_SAVINGS}</span>
    </button>
  </div>
);

const Navbar = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => { const h = () => setScrolled(window.scrollY > 50); window.addEventListener('scroll', h); return () => window.removeEventListener('scroll', h); }, []);
  const navLinks = [{ href: "#features", label: "Features" }, { href: "#community", label: "Community" }, { href: "#pricing", label: "Pricing" }, { href: "#faq", label: "FAQ" }];
  const scrollTo = (href: string) => { document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); };
  return (
    <motion.nav initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}
      className={cn("fixed top-0 left-0 right-0 z-50 transition-all duration-300", scrolled ? "bg-black/80 backdrop-blur-2xl border-b border-[#C9A646]/25 shadow-[0_4px_30px_rgba(201,166,70,0.08)]" : "bg-black/40 backdrop-blur-2xl border-b border-[#C9A646]/10")}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center group">
            <span className="text-2xl md:text-3xl font-bold tracking-tight"><span className="text-white group-hover:text-slate-300 transition-colors">FINO</span><span className="text-[#C9A646] group-hover:text-[#D4AF37] transition-colors">TAUR</span></span>
          </button>
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link, i) => <button key={i} onClick={() => scrollTo(link.href)} className="text-slate-300 hover:text-white transition-colors text-sm font-medium relative group">{link.label}<span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#C9A646] group-hover:w-full transition-all duration-300"/></button>)}
          </div>
          <div className="hidden md:flex items-center space-x-3">
            <button onClick={() => navigate('/login')} className="text-slate-300 hover:text-white px-4 py-2 transition-colors text-sm font-medium hover:bg-white/5 rounded-lg">Login</button>
            <button onClick={() => navigate('/auth/register')} className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105" style={{ background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)', color: '#000', boxShadow: '0 4px 24px rgba(201,166,70,0.4)' }}>Sign Up</button>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-300 hover:text-white transition-colors">
            {mobileMenuOpen ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>}
          </button>
        </div>
      </div>
      {mobileMenuOpen && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="md:hidden bg-black/95 backdrop-blur-xl border-t border-white/[0.08]">
        <div className="px-4 py-6 space-y-4">
          {navLinks.map((link, i) => <button key={i} onClick={() => scrollTo(link.href)} className="block w-full text-left text-slate-300 hover:text-white transition-colors text-base font-medium py-2">{link.label}</button>)}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="w-full text-slate-300 hover:text-white py-3 transition-colors">Login</button>
            <button onClick={() => { navigate('/auth/register'); setMobileMenuOpen(false); }} className="w-full py-3 rounded-xl font-semibold" style={{ background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)', color: '#000' }}>Sign Up</button>
          </div>
        </div>
      </motion.div>}
    </motion.nav>
  );
};

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
                <Quote className="absolute top-4 right-4 w-8 h-8 text-[#C9A646]/20"/>
                <div className="flex gap-1 mb-4">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#C9A646] text-[#C9A646]"/>)}</div>
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

const WarZoneLandingPage = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => { if (!isLoading && user) navigate('/app/all-markets/warzone', { replace: true }); }, [user, isLoading, navigate]);

  if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-[#0C0C0E]"><div className="flex flex-col items-center gap-4"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A646]"/><p className="text-sm text-slate-400">Loading...</p></div></div>;
  if (user) return null;

  const handleCTAClick = () => navigate('/auth/register');

  return (
    <div className="min-h-screen overflow-hidden relative">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');.heading-serif{font-family:'Playfair Display',Georgia,serif}@keyframes hero-orb{0%,100%{transform:scale(1);opacity:0.08}50%{transform:scale(1.1);opacity:0.12}}.hero-orb{animation:hero-orb 8s ease-in-out infinite}`}</style>
      <Navbar/>

      {/* HERO */}
<section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
  <div className="absolute inset-0 bg-gradient-to-br from-[#080808] via-[#0d0b08] to-[#080808]"/>
  
  {/* Gold Ambient Glow - Left Side - STRONG */}
  <div 
    className="absolute top-1/4 left-0 w-[800px] h-[800px] rounded-full pointer-events-none"
    style={{
      background: 'radial-gradient(circle, rgba(201,166,70,0.35) 0%, rgba(201,166,70,0.15) 30%, rgba(201,166,70,0.05) 50%, transparent 70%)',
      filter: 'blur(100px)',
      transform: 'translateX(-40%)',
    }}
  />
  
  <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-[#C9A646]/[0.08] rounded-full blur-[150px] hero-orb"/>        <div className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] bg-[#D4BF8E]/[0.06] rounded-full blur-[140px] hero-orb" style={{animationDelay:'3s'}}/>
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-[#F4D97B]/[0.04] rounded-full blur-[130px] hero-orb" style={{animationDelay:'5s'}}/>

        <div className="max-w-[1600px] mx-auto px-6 lg:px-8 relative z-10 w-full">
          

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
                <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.05] tracking-tight">
                  <span className="text-white block heading-serif italic">Every Morning</span>
                  <span className="text-white block heading-serif italic">You Wake Up</span>
                  <span className="relative inline-block mt-2">
                    <span className="absolute inset-0 blur-3xl opacity-40 bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] animate-pulse" style={{animationDuration:'4s'}}/>
                    <span className="relative heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">Blind to What Moves</span>
                  </span>
                  <span className="relative inline-block"><span className="heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">the Market.</span></span>
                </h1>
              </motion.div>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="text-lg md:text-xl text-slate-300 leading-relaxed font-light max-w-xl">
                <span className="text-[#C9A646] font-semibold">WAR ZONE</span> gives you the same institutional market briefing Wall Street desks use — <span className="text-white font-medium">before the market opens.</span> Every single day.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}><BillingToggle selected={billingInterval} onChange={setBillingInterval} className="justify-start mb-6"/></motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} className="flex flex-wrap items-center gap-4">
                <button onClick={handleCTAClick} className="group px-8 py-4 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-105 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)', color: '#000', boxShadow: '0 4px 24px rgba(201,166,70,0.4)' }}>
                  {billingInterval === 'monthly' ? 'Start 7-Day Free Trial' : `Get WAR ZONE for $${YEARLY_PRICE}/year`}<ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1"/>
                </button>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 }} className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5"><FileText className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5}/></div><div><div className="text-white font-bold text-sm">Daily Briefing</div><div className="text-slate-400 text-xs">9:00 AM NY</div></div></div>
                <div className="w-px h-10 bg-[#C9A646]/30"/>
                <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5"><Shield className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5}/></div><div><div className="text-white font-bold text-sm">Institutional</div><div className="text-slate-400 text-xs">Grade Intel</div></div></div>
                <div className="w-px h-10 bg-[#C9A646]/30"/>
                <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5"><Target className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5}/></div><div><div className="text-white font-bold text-sm">Actionable</div><div className="text-slate-400 text-xs">Trade Ideas</div></div></div>
              </motion.div>
            </div>

            {/* Bull Image */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.4 }} className="relative hidden lg:flex items-center justify-center">
              <div style={{ 
                maskImage: 'linear-gradient(to right, transparent 0%, transparent 5%, black 20%, black 92%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 5%, black 85%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 5%, black 20%, black 92%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 5%, black 85%, transparent 100%)',
                maskComposite: 'intersect',
                WebkitMaskComposite: 'source-in'
              }}>
                <img src={BullWarZone} alt="War Zone Bull" className="w-[550px] xl:w-[600px] 2xl:w-[650px] h-auto" style={{ mixBlendMode: 'lighten' }}/>
              </div>
            </motion.div>
          </div>

          <div className="mt-16"><GoldenDivider/><div className="py-12"><div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 items-center px-8">
            {stats.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.1 }} className="text-center">
                <div className="text-3xl md:text-4xl lg:text-5xl font-bold heading-serif italic text-[#C9A646] whitespace-nowrap">{s.value}</div>
                <div className="text-slate-400 text-xs mt-2 tracking-wide uppercase">{s.label}</div>
              </motion.div>
            ))}
          </div></div></div>
        </div>
      </section>

      <SocialProof/>

      {/* BEFORE/AFTER */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0a08] to-[#0a0a0a]"/>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent"/>
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[500px] bg-[#C9A646]/[0.08] rounded-full blur-[150px]"/>
        <div className="absolute bottom-1/4 left-1/5 w-[500px] h-[450px] bg-[#D4AF37]/[0.07] rounded-full blur-[130px]"/>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#C9A646]/[0.05] rounded-full blur-[160px]"/>
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[350px] bg-[#F4D97B]/[0.04] rounded-full blur-[120px]"/>
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"><span className="text-white heading-serif">The Difference Between </span><span className="heading-serif text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] to-[#F4D97B]">Reacting and Anticipating</span></h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Most traders start their day overwhelmed. WAR ZONE traders start with clarity.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.05), rgba(0,0,0,0.3))', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div className="flex items-center gap-4 px-6 py-5 border-b border-red-500/10"><div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><XCircle className="w-5 h-5 text-red-400"/></div><h3 className="text-white font-bold text-lg">Without WAR ZONE</h3></div>
              <div className="px-6 py-6 space-y-4">{beforeAfter.before.map((item, i) => <div key={i} className="flex items-center gap-4"><XCircle className="w-5 h-5 text-red-400/50 flex-shrink-0"/><span className="text-slate-400 text-sm">{item}</span></div>)}</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.08), rgba(0,0,0,0.3))', border: '1px solid rgba(201,166,70,0.2)' }}>
              <div className="flex items-center gap-4 px-6 py-5 border-b border-[#C9A646]/15"><div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center"><Check className="w-5 h-5 text-green-400"/></div><h3 className="text-white font-bold text-lg">With WAR ZONE</h3></div>
              <div className="px-6 py-6 space-y-4">{beforeAfter.after.map((item, i) => <div key={i} className="flex items-center gap-4"><Check className="w-5 h-5 text-green-400 flex-shrink-0"/><span className="text-slate-300 text-sm">{item}</span></div>)}</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100c08] to-[#0a0a0a]"/>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent"/>
        <div className="absolute top-1/4 left-1/6 w-[500px] h-[400px] bg-[#C9A646]/[0.08] rounded-full blur-[140px]"/>
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-[#D4AF37]/[0.07] rounded-full blur-[120px]"/>
        <div className="absolute top-1/2 right-1/6 w-[400px] h-[350px] bg-[#F4D97B]/[0.05] rounded-full blur-[130px]"/>
        <div className="absolute bottom-1/3 left-1/3 w-[500px] h-[400px] bg-[#C9A646]/[0.04] rounded-full blur-[150px]"/>
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex justify-center mb-8"><div className="w-16 h-16"><CompassIcon className="w-full h-full"/></div></motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2"><span className="text-white heading-serif">This Is Not a Newsletter.</span></h2>
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6"><span className="heading-serif text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] to-[#F4D97B]">It is a Daily Market Briefing.</span></h3>
            <p className="text-slate-400 text-lg">Most traders consume <span className="text-slate-300">information</span>. Professionals consume <span className="text-white font-medium italic">interpretation</span>.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {dailyFeatures.map((f, i) => <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="p-6 rounded-2xl transition-all hover:border-[#C9A646]/40" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', border: '1px solid rgba(201,166,70,0.15)' }}>
              <div className="flex items-start gap-4"><div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#C9A646]/10 border border-[#C9A646]/20"><f.icon className="w-5 h-5 text-[#C9A646]"/></div><div><h4 className="text-white font-semibold text-base mb-1">{f.title}</h4><p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p></div></div>
            </motion.div>)}
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex justify-center">
            <div className="inline-flex items-center gap-4 px-6 py-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.1), rgba(201,166,70,0.02))', border: '1px solid rgba(201,166,70,0.2)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#C9A646]/10 border border-[#C9A646]/30"><Clock className="w-5 h-5 text-[#C9A646]"/></div>
              <div className="text-left"><p className="text-white font-semibold text-sm">Delivered Every Trading Day</p><p className="text-slate-500 text-xs">9:00 AM New York Time</p></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* COMMUNITY */}
      <section id="community" className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0a08] to-[#0a0a0a]"/>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent"/>
        <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-[#C9A646]/[0.05] rounded-full blur-[130px]"/>
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"><span className="heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] to-[#F4D97B]">More</span><span className="heading-serif italic text-white"> Than Just a Briefing</span></h2>
            <p className="text-slate-400 text-lg">Join a community of serious traders and get exclusive trading room access.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', border: '1px solid rgba(201,166,70,0.15)' }}>
              <div className="flex items-start gap-4"><div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#5865F2]/10 border border-[#5865F2]/30"><DiscordIcon className="w-7 h-7 text-[#5865F2]"/></div><div className="flex-1"><div className="flex items-center gap-3 mb-2"><h4 className="text-white font-bold text-lg">Private Discord Community</h4><span className="px-3 py-1 rounded-md text-[10px] font-bold tracking-wider bg-[#C9A646]/10 border border-[#C9A646]/30 text-[#C9A646]">EXCLUSIVE</span></div><p className="text-slate-400 text-sm leading-relaxed">Real traders sharing in real-time.</p></div></div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', border: '1px solid rgba(201,166,70,0.15)' }}>
              <div className="flex items-start gap-4"><div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#C9A646]/10 border border-[#C9A646]/30"><BellIcon className="w-7 h-7 text-[#C9A646]"/></div><div className="flex-1"><div className="flex items-center gap-3 mb-2"><h4 className="text-white font-bold text-lg">Finotaur Trading Room</h4><span className="px-3 py-1 rounded-md text-[10px] font-bold tracking-wider bg-[#C9A646]/10 border border-[#C9A646]/30 text-[#C9A646]">EXCLUSIVE</span></div><p className="text-slate-400 text-sm leading-relaxed">Live analysis, real-time alerts.</p></div></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100c08] to-[#0a0a0a]"/>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent"/>
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#C9A646]/[0.04] rounded-full blur-[120px]"/>
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"><span className="text-white heading-serif">Frequently Asked </span><span className="heading-serif text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] to-[#F4D97B]">Questions</span></h2>
          </motion.div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className={cn("rounded-xl overflow-hidden transition-all", openFaq === i && "ring-1 ring-[#C9A646]/30")} style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', border: '1px solid rgba(201,166,70,0.15)' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-6 py-5 text-left group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all" style={{ background: openFaq === i ? 'rgba(201,166,70,0.15)' : 'rgba(201,166,70,0.05)', border: `1px solid ${openFaq === i ? 'rgba(201,166,70,0.4)' : 'rgba(201,166,70,0.15)'}` }}><span className="text-[#C9A646] font-bold text-sm">{String(i + 1).padStart(2, '0')}</span></div>
                    <h3 className={cn("font-semibold text-base transition-colors", openFaq === i ? "text-white" : "text-slate-300")}>{faq.q}</h3>
                  </div>
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ml-4", openFaq === i ? "bg-[#C9A646]/15 rotate-180" : "bg-white/5")}><ChevronDown className={cn("w-5 h-5 transition-all", openFaq === i ? "text-[#C9A646]" : "text-slate-400")}/></div>
                </button>
                <div className={cn("overflow-hidden transition-all", openFaq === i ? "max-h-96 opacity-100" : "max-h-0 opacity-0")}><div className="px-6 pb-6 pt-0"><div className="pl-14"><p className="text-slate-400 leading-relaxed text-sm">{faq.a}</p></div></div></div>
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-12 text-center"><p className="text-slate-500 text-sm">Still have questions? <a href="mailto:support@finotaur.com" className="text-[#C9A646] hover:underline font-medium">Contact us</a></p></motion.div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0a08] to-[#0a0a0a]"/>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent"/>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C9A646]/[0.06] rounded-full blur-[180px]"/>
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#D4AF37]/[0.04] rounded-full blur-[120px]"/>
        
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              <span className="heading-serif italic text-white block">You are Already in the Market.</span>
            </h2>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
              <span className="heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">Why Do It Without WAR ZONE?</span>
            </h2>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            
            {/* Monthly Card */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
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
                <button onClick={handleCTAClick} className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 mb-3 transition-all hover:scale-105"
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
            </motion.div>

            {/* Yearly Card */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
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
                <button onClick={handleCTAClick} className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 mb-3 transition-all hover:scale-105"
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
            </motion.div>
          </div>

          {/* Trust Badges */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 }} className="mt-16 flex flex-wrap items-center justify-center gap-8 text-slate-400">
            <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#C9A646]"/><span className="text-sm">Secure payment</span></div>
            <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block"/>
            <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-green-400"/><span className="text-sm">7-Day Free Trial</span></div>
            <div className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block"/>
            <div className="flex items-center gap-2"><Zap className="w-5 h-5 text-[#C9A646]"/><span className="text-sm">Cancel anytime</span></div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-[#C9A646]/10 py-8 px-6 bg-[#0a0a0a]"><div className="max-w-4xl mx-auto text-center"><p className="text-slate-500 text-sm">Questions? <a href="mailto:support@finotaur.com" className="text-[#C9A646] hover:underline">support@finotaur.com</a></p></div></footer>
      <LegalFooter/>
    </div>
  );
};

export default WarZoneLandingPage;