// src/components/landing-warzone/WarzoneHero.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock, Eye, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";

/**
 * 🔥 WAR ZONE Hero Section
 *
 * Focus: TOP SECRET - Emotional + Status + Money
 * NOT about tools, but about OUTCOMES and exclusive insights
 */
const WarzoneHero = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleJoinTopSecret = () => {
    if (user) {
      navigate('/app/journal/overview');
    } else {
      navigate('/auth/register');
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-20">
      {/* ============================================
          WAR ZONE BACKGROUND - Dark, Military, Premium
          ============================================ */}

      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0C] via-[#12110F] to-[#0A0D12]" />

      {/* Animated Grid Pattern - Military Feel */}
      <div className="absolute inset-0 opacity-[0.03]"
           style={{
             backgroundImage: `
               linear-gradient(rgba(201,166,70,0.3) 1px, transparent 1px),
               linear-gradient(90deg, rgba(201,166,70,0.3) 1px, transparent 1px)
             `,
             backgroundSize: '60px 60px'
           }} />

      {/* TOP SECRET Glow - Red/Gold accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-br from-[#C9A646]/20 via-[#8B0000]/10 to-transparent rounded-full blur-[150px]" />

      {/* Secondary Orb */}
      <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[#C9A646]/[0.08] rounded-full blur-[120px]" />

      {/* ============================================
          MAIN CONTENT
          ============================================ */}
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 relative z-10 w-full text-center">

        {/* TOP SECRET Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#8B0000]/30 via-[#C9A646]/20 to-[#8B0000]/30 border-2 border-[#C9A646]/50 rounded-lg backdrop-blur-xl"
               style={{
                 boxShadow: '0 0 40px rgba(139,0,0,0.3), 0 0 60px rgba(201,166,70,0.2)'
               }}>
            <Lock className="w-5 h-5 text-[#C9A646]" />
            <span className="text-[#C9A646] font-bold text-sm tracking-[0.3em] uppercase">Top Secret</span>
            <Lock className="w-5 h-5 text-[#C9A646]" />
          </div>
        </motion.div>

        {/* Main Headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-6 mb-10"
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.1] tracking-tight">
            <span className="text-white block">Stop guessing.</span>
            <span className="relative inline-block mt-4">
              <span className="absolute inset-0 blur-3xl opacity-50 bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] animate-pulse"
                    style={{ animationDuration: '3s' }} />
              <span className="relative bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
                Read the market
              </span>
            </span>
            <span className="text-white block mt-4">like money actually moves.</span>
          </h1>
        </motion.div>

        {/* Sub-headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <p className="text-xl md:text-2xl text-slate-300 leading-relaxed font-light">
            Monthly macro conclusions.{" "}
            <span className="text-white font-medium">Deep company analysis.</span>{" "}
            <br className="hidden md:block" />
            No noise. Only decisions.
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mb-16"
        >
          <Button
            onClick={handleJoinTopSecret}
            size="lg"
            className="group px-12 py-8 text-xl font-bold bg-gradient-to-r from-[#C9A646] via-[#D4AF37] to-[#C9A646] text-black rounded-xl hover:scale-105 transition-all duration-300"
            style={{
              boxShadow: '0 8px 40px rgba(201,166,70,0.5), 0 0 80px rgba(201,166,70,0.3)',
            }}
          >
            {user ? 'Enter War Room' : 'Join TOP SECRET'}
            <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-2" />
          </Button>
        </motion.div>

        {/* Value Propositions - 3 Columns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          {[
            {
              icon: Eye,
              title: "Exclusive Insights",
              description: "Conclusions others don't see"
            },
            {
              icon: Target,
              title: "Clear Market Bias",
              description: "Know exactly where to focus"
            },
            {
              icon: Lock,
              title: "Competitive Edge",
              description: "Information that moves money"
            }
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 + index * 0.1 }}
              className="flex flex-col items-center p-6 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm"
              style={{
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}
            >
              <div className="w-12 h-12 rounded-lg bg-[#C9A646]/10 border border-[#C9A646]/30 flex items-center justify-center mb-4">
                <item.icon className="w-6 h-6 text-[#C9A646]" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-slate-400 text-sm text-center">{item.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default WarzoneHero;
