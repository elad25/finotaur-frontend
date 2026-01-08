// src/components/landing-new/SocialProof.tsx
// ================================================
// 🌟 SOCIAL PROOF - Auto-Scrolling Testimonials
// Goal: Build trust with real user testimonials
// ================================================

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  avatar: string;
  rating: 5;
  text: string;
  highlight: string; // Key phrase to highlight in gold
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "David Chen",
    role: "Hedge Fund Manager",
    avatar: "DC",
    rating: 5,
    text: "The company reports are something I genuinely wait for every week. The level of analysis here is like Goldman Sachs but without the corporate BS and politics.",
    highlight: "something I genuinely wait for every week"
  },
  {
    id: 2,
    name: "Sarah Mitchell",
    role: "Day Trader",
    avatar: "SM",
    rating: 5,
    text: "The free trial and money-back guarantee gave me the confidence to subscribe. After one week I realized this is the best investment I made this year.",
    highlight: "gave me the confidence to subscribe"
  },
  {
    id: 3,
    name: "Michael Rodriguez",
    role: "Prop Trader",
    avatar: "MR",
    rating: 5,
    text: "I pay thousands per month for research subscriptions. TOP SECRET beats them all in value-for-money. The reports here are institutional-grade legitimacy.",
    highlight: "beats them all in value-for-money"
  },
  {
    id: 4,
    name: "Emily Watson",
    role: "Portfolio Manager",
    avatar: "EW",
    rating: 5,
    text: "Finally someone who understands I don't need more data, I need conclusions. These reports save me hours of analysis every single day.",
    highlight: "save me hours of analysis every single day"
  },
  {
    id: 5,
    name: "James Kim",
    role: "Swing Trader",
    avatar: "JK",
    rating: 5,
    text: "The writing quality and depth of analysis here is something I haven't found anywhere else. It's like getting a CFA breakdown in every report.",
    highlight: "something I haven't found anywhere else"
  },
  {
    id: 6,
    name: "Rachel Green",
    role: "Options Trader",
    avatar: "RG",
    rating: 5,
    text: "As someone who traded blindly for years, TOP SECRET is like someone turned on the lights in a dark room. Now I see the full picture.",
    highlight: "like someone turned on the lights"
  },
  {
    id: 7,
    name: "Alex Thompson",
    role: "Crypto Investor",
    avatar: "AT",
    rating: 5,
    text: "I decided to try it because of the 14-day free trial and canceled all my other subscriptions. TOP SECRET is all I need now.",
    highlight: "canceled all my other subscriptions"
  },
  {
    id: 8,
    name: "Lisa Anderson",
    role: "Forex Trader",
    avatar: "LA",
    rating: 5,
    text: "The macro reports here are better than anything I got from Bloomberg Terminal. And I'm not joking - I literally canceled my Bloomberg subscription.",
    highlight: "better than anything I got from Bloomberg"
  },
  {
    id: 9,
    name: "Tom Williams",
    role: "Institutional Trader",
    avatar: "TW",
    rating: 5,
    text: "I work at a major bank and our internal research doesn't come close to TOP SECRET's clarity and actionability. This is a game-changer.",
    highlight: "our internal research doesn't come close"
  },
  {
    id: 10,
    name: "Nina Patel",
    role: "Futures Trader",
    avatar: "NP",
    rating: 5,
    text: "The 14-day trial was just a confidence boost. Within 48 hours I knew I was keeping this forever. Best trading decision I've made in 10 years.",
    highlight: "Best trading decision I've made in 10 years"
  }
];

// Duplicate testimonials for seamless infinite scroll
const duplicatedTestimonials = [...testimonials, ...testimonials];

const SocialProof = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || isPaused) return;

    let scrollPosition = 0;
    const scrollSpeed = 0.5; // pixels per frame
    const cardWidth = 400; // approximate width of each card + gap
    const totalWidth = cardWidth * testimonials.length;

    const animate = () => {
      scrollPosition += scrollSpeed;
      
      // Reset to start when reaching halfway (seamless loop)
      if (scrollPosition >= totalWidth) {
        scrollPosition = 0;
      }
      
      if (scrollContainer) {
        scrollContainer.scrollLeft = scrollPosition;
      }
      
      requestAnimationFrame(animate);
    };

    const animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [isPaused]);

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Luxury Background with Gold Undertone */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100d08] to-[#0a0a0a]" />

      {/* Gold Border Lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />

      {/* Enhanced Gold Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#C9A646]/[0.12] rounded-full blur-[150px]" />
      <div className="absolute top-1/3 left-1/3 w-[450px] h-[350px] bg-[#D4AF37]/[0.08] rounded-full blur-[120px]" />
      <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[300px] bg-[#F4D97B]/[0.06] rounded-full blur-[100px]" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            What Traders Are Saying
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Join thousands of professional traders who rely on TOP SECRET for market intelligence
          </p>
        </motion.div>

        {/* Scrolling Testimonials Container */}
        <div className="relative">
          {/* Gradient Fade Edges */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

          {/* Scrolling Container */}
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            style={{ scrollBehavior: 'auto' }}
          >
            {duplicatedTestimonials.map((testimonial, index) => (
              <TestimonialCard key={`${testimonial.id}-${index}`} testimonial={testimonial} />
            ))}
          </div>

          {/* Hover Hint */}
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
};

// ================================================
// Testimonial Card Component
// ================================================
const TestimonialCard = ({ testimonial }: { testimonial: Testimonial }) => {
  const highlightText = (text: string, highlight: string) => {
    if (!highlight) return text;
    
    const parts = text.split(highlight);
    return (
      <>
        {parts[0]}
        <span className="text-[#C9A646] font-semibold">{highlight}</span>
        {parts[1]}
      </>
    );
  };

  return (
    <div
      className="flex-shrink-0 w-[380px] p-6 rounded-2xl relative group transition-all duration-300"
      style={{
        background: 'linear-gradient(135deg, rgba(201,166,70,0.05) 0%, rgba(20,20,20,0.8) 100%)',
        border: '1px solid rgba(201,166,70,0.2)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Quote Icon */}
      <Quote className="absolute top-4 right-4 w-8 h-8 text-[#C9A646]/20" />

      {/* Rating Stars */}
      <div className="flex gap-1 mb-4">
        {[...Array(testimonial.rating)].map((_, i) => (
          <Star
            key={i}
            className="w-4 h-4 fill-[#C9A646] text-[#C9A646]"
          />
        ))}
      </div>

      {/* Testimonial Text */}
      <p className="text-slate-300 text-sm leading-relaxed mb-6">
        "{highlightText(testimonial.text, testimonial.highlight)}"
      </p>

      {/* Author Info */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
          style={{
            background: 'linear-gradient(135deg, #C9A646 0%, #B8963F 100%)',
            color: '#0a0a0a',
          }}
        >
          {testimonial.avatar}
        </div>

        {/* Name & Role */}
        <div>
          <p className="text-white font-semibold text-sm">{testimonial.name}</p>
          <p className="text-slate-500 text-xs">{testimonial.role}</p>
        </div>
      </div>

      {/* Hover Glow Effect */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          boxShadow: '0 0 30px rgba(201,166,70,0.3)',
        }}
      />
    </div>
  );
};

export default SocialProof;