// src/pages/landing/Testimonials.tsx
// ================================================
// 🔥 TESTIMONIALS — "Real Traders. Real Results."
// Auto-scrolling carousel like old War Zone page +
// premium cards with highlighted quotes + metrics
// ================================================

import { Star, TrendingUp, Award, Target, Zap, Quote } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  avatar: string;
  text: string;
  highlight: string;
  metric?: string;
  metricValue?: string;
  icon?: any;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "James Kim",
    role: "Swing Trader",
    avatar: "JK",
    text: "The writing quality and depth of analysis here is something I haven't found anywhere else. It's like getting a CFA breakdown in every report. Finotaur changed how I approach markets completely.",
    highlight: "something I haven't found anywhere else",
    metric: "Win Rate",
    metricValue: "+31%",
    icon: TrendingUp,
  },
  {
    id: 2,
    name: "Rachel Green",
    role: "Options Trader",
    avatar: "RG",
    text: "As someone who traded blindly for years, Finotaur is like someone turned on the lights in a dark room. The AI insights plus War Zone every morning — I can't imagine trading without it now.",
    highlight: "turned on the lights in a dark room",
    metric: "Monthly P&L",
    metricValue: "+$5.8K",
    icon: Target,
  },
  {
    id: 3,
    name: "Alex Thompson",
    role: "Day Trader",
    avatar: "AT",
    text: "I started with the 14-day free trial and canceled all my other subscriptions. The AI analyzer alone is worth 10x the price. TOP SECRET reports are institutional-grade. This is the real deal.",
    highlight: "canceled all my other subscriptions",
    metric: "Consistency",
    metricValue: "16 Green Weeks",
    icon: Award,
  },
  {
    id: 4,
    name: "David Chen",
    role: "Funded Account Manager",
    avatar: "DC",
    text: "Finotaur showed me I was overtrading Mondays by 3x. Fixed that one pattern and added $4,200 to my P&L in 30 days. The AI insights are legitimately game-changing.",
    highlight: "legitimately game-changing",
    metric: "P&L Increase",
    metricValue: "+$4.2K",
    icon: Zap,
  },
  {
    id: 5,
    name: "Sarah Mitchell",
    role: "Portfolio Manager",
    avatar: "SM",
    text: "Finally someone who understands I don't need more data, I need conclusions. These briefings save me hours every day. The best investment I made this year.",
    highlight: "save me hours every day",
    metric: "Time Saved",
    metricValue: "3hrs/day",
    icon: TrendingUp,
  },
  {
    id: 6,
    name: "Michael Rodriguez",
    role: "Prop Trader",
    avatar: "MR",
    text: "I pay thousands per month for research subscriptions. Finotaur beats them all in value-for-money. The macro analysis here is better than anything I got from Bloomberg Terminal.",
    highlight: "beats them all in value-for-money",
    metric: "ROI",
    metricValue: "10x Value",
    icon: Award,
  },
];

const duplicatedTestimonials = [...testimonials, ...testimonials];

const Testimonials = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const scrollSpeed = 0.5;
    const cardWidth = 400;
    const totalWidth = cardWidth * testimonials.length;

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
    if (parts.length < 2) return text;
    return <>{parts[0]}<span className="text-[#C9A646] font-semibold">{highlight}</span>{parts[1]}</>;
  };

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* ========== BACKGROUND ========== */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100d08] to-[#0a0a0a]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#C9A646]/[0.12] rounded-full blur-[150px]" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* ========== HEADER ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          {/* Stars */}
          <div className="flex justify-center gap-1.5 mb-6">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 300 }}
              >
                <Star className="w-6 h-6 fill-[#D4AF37] text-[#D4AF37]" />
              </motion.div>
            ))}
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-white heading-serif italic">Real Traders. </span>
            <span className="heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] to-[#F4D97B]">Real Results.</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Join hundreds of traders who turned data into discipline — and discipline into profit.
          </p>
        </motion.div>

        {/* ========== SCROLLING CAROUSEL ========== */}
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            style={{ scrollBehavior: 'auto' }}
          >
            {duplicatedTestimonials.map((t, index) => (
              <div
                key={`${t.id}-${index}`}
                className="flex-shrink-0 w-[380px] p-6 rounded-2xl relative group transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.05), rgba(20,20,20,0.8))',
                  border: '1px solid rgba(201,166,70,0.2)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {/* Quote icon */}
                <Quote className="absolute top-4 right-4 w-8 h-8 text-[#C9A646]/20" />

                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#C9A646] text-[#C9A646]" />
                  ))}
                </div>

                {/* Quote text with highlight */}
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  &ldquo;{highlightText(t.text, t.highlight)}&rdquo;
                </p>

                {/* Metric badge */}
                {t.metric && t.metricValue && (
                  <div className="flex items-center gap-3 mb-4 py-3 px-4 rounded-lg bg-[#C9A646]/[0.06] border border-[#C9A646]/15">
                    {t.icon && <t.icon className="w-5 h-5 text-[#C9A646]" />}
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t.metric}</div>
                      <div className="text-lg font-bold text-[#C9A646]">{t.metricValue}</div>
                    </div>
                  </div>
                )}

                {/* Author */}
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

                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ boxShadow: '0 0 30px rgba(201,166,70,0.3)' }}
                />
              </div>
            ))}
          </div>

          {/* Pause hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: isPaused ? 0 : 0.5 }}
            className="text-center text-slate-600 text-sm mt-6"
          >
            Hover to pause
          </motion.p>
        </div>

        {/* ========== SOCIAL PROOF FOOTER ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <div className="inline-flex items-center gap-3">
            <div className="flex -space-x-3">
              {['JK', 'RG', 'AT', 'DC', 'SM'].map((initials, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-[10px] text-[#C9A646] font-bold"
                  style={{
                    zIndex: 10 - i,
                    borderColor: '#0a0a0a',
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.3), rgba(15,15,15,1))',
                  }}
                >
                  {initials}
                </div>
              ))}
            </div>
            <div className="text-left ml-2">
              <div className="text-white font-semibold text-sm">847+ Elite Traders</div>
              <div className="text-xs text-slate-500">Trading smarter every day</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;