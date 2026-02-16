// src/components/landing-new/SocialProof.tsx
// ================================================
// 🌟 SOCIAL PROOF BAR — Icons + Bold White Numbers
// Original style, made more prominent
// ================================================

import { motion } from "framer-motion";
import { Users, Brain, Star, Calendar } from "lucide-react";

const stats = [
  { icon: Users, value: "847+", label: "Active Traders" },
  { icon: Brain, value: "50,000+", label: "AI Analyses Run" },
  { icon: Star, value: "4.9/5", label: "User Rating" },
  { icon: Calendar, value: "365", label: "Days of War Zone" },
];

const SocialProof = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#110d08] to-[#0a0a0a]" />

      {/* Gold glow behind */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-[#C9A646]/[0.08] rounded-full blur-[120px]" />

      {/* Golden divider — TOP */}
      <div className="relative w-full h-[2px]">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent, #C9A646 20%, #F4D97B 50%, #C9A646 80%, transparent)',
            boxShadow: '0 0 20px rgba(201,166,70,0.6)',
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center text-center gap-2"
              >
                <Icon className="w-6 h-6 text-[#C9A646] mb-1" />
                <span className="text-3xl md:text-4xl font-bold text-white">{stat.value}</span>
                <span className="text-sm text-slate-400">{stat.label}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Golden divider — BOTTOM */}
      <div className="relative w-full h-[2px]">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent, #C9A646 20%, #F4D97B 50%, #C9A646 80%, transparent)',
            boxShadow: '0 0 20px rgba(201,166,70,0.6)',
          }}
        />
      </div>
    </section>
  );
};

export default SocialProof;