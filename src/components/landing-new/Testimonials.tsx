// src/components/landing-new/Testimonials.tsx
// ================================================
// TESTIMONIALS — "Real Traders. Real Results."
// Auto-scrolling RAF carousel — premium card design.
// Tokens-only: zero hardcoded hex colours.
// ================================================

import { Quote, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { SectionShell } from "./_shared/SectionShell";
import { SectionEyebrow } from "./_shared/SectionEyebrow";
import { SectionTitle } from "./_shared/SectionTitle";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Testimonial {
  id: number;
  name: string;
  role: string;
  avatar: string;
  text: string;
  highlight: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "James Kim",
    role: "Swing Trader",
    avatar: "JK",
    text: "The writing quality and depth of analysis here is something I haven't found anywhere else. It's like getting a CFA breakdown in every report. Finotaur changed how I approach markets completely.",
    highlight: "something I haven't found anywhere else",
  },
  {
    id: 2,
    name: "Rachel Green",
    role: "Options Trader",
    avatar: "RG",
    text: "As someone who traded blindly for years, Finotaur is like someone turned on the lights in a dark room. The AI insights plus Top Secret every morning — I can't imagine trading without it now.",
    highlight: "turned on the lights in a dark room",
  },
  {
    id: 3,
    name: "Alex Thompson",
    role: "Day Trader",
    avatar: "AT",
    text: "I started with the 14-day free trial and canceled all my other subscriptions. The AI analyzer alone is worth 10x the price. TOP SECRET reports are institutional-grade. This is the real deal.",
    highlight: "canceled all my other subscriptions",
  },
  {
    id: 4,
    name: "David Chen",
    role: "Funded Account Manager",
    avatar: "DC",
    text: "Finotaur showed me I was overtrading Mondays by 3x. Fixing that one pattern reshaped how I trade. The AI insights are legitimately game-changing.",
    highlight: "legitimately game-changing",
  },
  {
    id: 5,
    name: "Sarah Mitchell",
    role: "Portfolio Manager",
    avatar: "SM",
    text: "Finally someone who understands I don't need more data, I need conclusions. These briefings save me hours every day. The best investment I made this year.",
    highlight: "save me hours every day",
  },
  {
    id: 6,
    name: "Michael Rodriguez",
    role: "Prop Trader",
    avatar: "MR",
    text: "I pay thousands per month for research subscriptions. Finotaur beats them all in value-for-money. The macro analysis here is better than anything I got from terminals costing thousands a month.",
    highlight: "beats them all in value-for-money",
  },
];

const duplicatedTestimonials = [...testimonials, ...testimonials];

// ---------------------------------------------------------------------------
// highlightText — wraps the accent phrase in gold
// ---------------------------------------------------------------------------
function highlightText(text: string, highlight: string): React.ReactNode {
  if (!highlight) return text;
  const parts = text.split(highlight);
  if (parts.length < 2) return text;
  return (
    <>
      {parts[0]}
      <span className="text-gold-primary font-semibold">{highlight}</span>
      {parts[1]}
    </>
  );
}

// ---------------------------------------------------------------------------
// TestimonialCard
// ---------------------------------------------------------------------------
function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div
      className={[
        "flex-shrink-0 w-[calc(100vw-64px)] max-w-[380px] sm:w-[380px] p-6 rounded-2xl relative group transition-all duration-300",
        "bg-section-card-rest border border-gold-border",
        "shadow-card-rest hover:shadow-card-hover",
      ].join(" ")}
    >
      {/* ── Corner brackets (blueprint aesthetic) ── */}
      {/* Top-left */}
      <span
        className="absolute top-2 left-2 w-3 h-3 border-t border-l border-construction-marker opacity-60 pointer-events-none"
        aria-hidden="true"
      />
      {/* Top-right */}
      <span
        className="absolute top-2 right-2 w-3 h-3 border-t border-r border-construction-marker opacity-60 pointer-events-none"
        aria-hidden="true"
      />
      {/* Bottom-left */}
      <span
        className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-construction-marker opacity-60 pointer-events-none"
        aria-hidden="true"
      />
      {/* Bottom-right */}
      <span
        className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-construction-marker opacity-60 pointer-events-none"
        aria-hidden="true"
      />

      {/* Quote icon */}
      <Quote className="absolute top-4 right-4 w-8 h-8 text-gold-primary/40" aria-hidden="true" />

      {/* 5-star row */}
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-gold-primary text-gold-primary" />
        ))}
      </div>

      {/* Quote text with highlighted phrase */}
      <p className="text-ink-secondary text-sm leading-relaxed mb-4">
        &ldquo;{highlightText(t.text, t.highlight)}&rdquo;
      </p>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border border-gold-border"
          style={{
            background: 'linear-gradient(135deg, var(--gold-primary), rgba(168,136,56,1))',
            color: 'var(--text-on-gold)',
          }}
        >
          {t.avatar}
        </div>
        <div>
          <p className="text-ink-primary font-semibold text-sm">{t.name}</p>
          <p className="text-ink-tertiary text-xs">{t.role}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------
const Testimonials = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollPositionRef = useRef(0);

  // 🔥 PERF FIX: this rAF marquee used to run forever, off-screen and even
  // with the tab backgrounded, causing recurring long tasks well after load.
  // Pause the loop (without resetting position) whenever the carousel isn't
  // on-screen or the tab is hidden — identical scroll behavior while visible.
  const [isOnScreen, setIsOnScreen] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(
    typeof document === "undefined" ? true : document.visibilityState !== "hidden"
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsOnScreen(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => setIsTabVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    if (isPaused || !isOnScreen || !isTabVisible) return;

    const scrollSpeed = 0.5;

    // Measure the real rendered card width (incl. flex gap) at runtime —
    // the card is responsive (calc(100vw-64px) below sm), so a hardcoded
    // px value would desync the loop-reset point from the actual layout.
    const getCardStep = () => {
      const firstCard = scrollContainer.firstElementChild as HTMLElement | null;
      const secondCard = scrollContainer.children[1] as HTMLElement | null;
      if (!firstCard) return 400;
      const gap = secondCard ? secondCard.offsetLeft - firstCard.offsetLeft - firstCard.offsetWidth : 0;
      return firstCard.offsetWidth + gap;
    };

    let cardWidth = getCardStep();
    let totalWidth = cardWidth * testimonials.length;

    const handleResize = () => {
      cardWidth = getCardStep();
      totalWidth = cardWidth * testimonials.length;
    };
    window.addEventListener('resize', handleResize);

    let animationId: number;

    const animate = () => {
      scrollPositionRef.current += scrollSpeed;
      if (scrollPositionRef.current >= totalWidth) scrollPositionRef.current = 0;
      if (scrollContainer) scrollContainer.scrollLeft = scrollPositionRef.current;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isPaused, isOnScreen, isTabVisible]);

  return (
    <SectionShell id="testimonials" atmosphere="subtle" beam={false}>
      {/* ========== GOLD ATMOSPHERE — warm glow behind the member quotes ========== */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        {/* Top-anchored ambient gold wash */}
        <div
          className="absolute inset-x-0 top-0 h-2/3"
          style={{
            background:
              'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(201,166,70,0.14) 0%, rgba(201,166,70,0.06) 35%, transparent 70%)',
            filter: 'blur(30px)',
          }}
        />
        {/* Soft gold pool behind the card row */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{
            background:
              'radial-gradient(ellipse 70% 90% at 50% 100%, rgba(230,195,100,0.10) 0%, rgba(201,166,70,0.04) 40%, transparent 75%)',
            mixBlendMode: 'screen',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* ========== HEADER ========== */}
      <div className="relative z-10 text-center mb-14">
        <SectionEyebrow>From Our Members</SectionEyebrow>
        <SectionTitle gradient="split">
          What Our Members Say
        </SectionTitle>
        <p className="text-lg text-ink-secondary max-w-2xl mx-auto mt-2">
          Join hundreds of traders who turned data into discipline — and discipline into consistency.
        </p>
        <p className="text-xs text-ink-tertiary max-w-xl mx-auto mt-3">
          Illustrative testimonials. Individual results vary and are not a guarantee of future performance.
        </p>
      </div>

      {/* ========== SCROLLING CAROUSEL ========== */}
      <div className="relative">
        {/* Fade edges — use section-base so they match the shell background */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-section-base to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-section-base to-transparent z-10 pointer-events-none" />

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{ scrollBehavior: 'auto' }}
        >
          {duplicatedTestimonials.map((t, index) => (
            <TestimonialCard key={`${t.id}-${index}`} t={t} />
          ))}
        </div>

        {/* Pause hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: isPaused ? 0 : 0.5 }}
          className="text-center text-ink-muted text-sm mt-6"
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
                className="w-10 h-10 rounded-full border-2 border-section-base flex items-center justify-center text-[10px] text-gold-primary font-bold"
                style={{
                  zIndex: 10 - i,
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.3), rgba(15,15,15,1))',
                }}
              >
                {initials}
              </div>
            ))}
          </div>
          <div className="text-left ml-2">
            <div className="text-ink-primary font-semibold text-sm">Join Our Growing Community</div>
            <div className="text-xs text-ink-tertiary">Trading smarter every day</div>
          </div>
        </div>
      </motion.div>
    </SectionShell>
  );
};

export default Testimonials;
