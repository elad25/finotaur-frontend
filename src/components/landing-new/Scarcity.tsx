// src/components/landing-new/Scarcity.tsx
// ================================================
// 🔥 SCARCITY / URGENCY
// "153 seats out of 1,000 remaining"
// Elegant urgency — not cheap countdown timers
// ================================================

import { motion } from "framer-motion";
import { Lock, AlertTriangle } from "lucide-react";

const Scarcity = () => {
  const totalSeats = 1000;
  const remaining = 153;
  const filled = totalSeats - remaining;
  const percentage = Math.round((filled / totalSeats) * 100);

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* ========== BACKGROUND ========== */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#110d08] to-[#0a0a0a]" />

      {/* Warm amber urgency glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-amber-500/[0.04] rounded-full blur-[140px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#C9A646]/[0.10] rounded-full blur-[130px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />

      <div className="max-w-3xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Card wrapper */}
          <div
            className="relative rounded-2xl p-8 md:p-10 mx-auto max-w-xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(201,166,70,0.08) 0%, rgba(10,10,10,0.95) 100%)',
              border: '1px solid rgba(201,166,70,0.25)',
              boxShadow: '0 0 60px rgba(201,166,70,0.1), 0 15px 40px rgba(0,0,0,0.4)',
            }}
          >
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A646]/30 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#C9A646]/30 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#C9A646]/30 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A646]/30 rounded-br-2xl" />

            {/* Pulsing live dot + label */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
              </span>
              <span className="text-amber-400 text-sm font-semibold tracking-wide uppercase">Limited Access</span>
            </div>

            {/* Main number */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">
                <span className="text-[#C9A646]">{remaining}</span> of {totalSeats.toLocaleString()} seats remaining
              </h2>
            </motion.div>

            <p className="text-slate-400 mb-8 leading-relaxed">
              We limit access to maintain service quality.
              <br />
              When we're full — we close enrollment.
            </p>

            {/* Progress bar */}
            <div className="relative mb-6">
              <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${percentage}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
                  className="h-full rounded-full relative"
                  style={{
                    background: 'linear-gradient(90deg, #C9A646, #F4D97B, #D4AF37)',
                    boxShadow: '0 0 20px rgba(201,166,70,0.4)',
                  }}
                >
                  {/* Shimmer effect */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                      animation: 'shimmer 2s infinite',
                    }}
                  />
                </motion.div>
              </div>

              {/* Labels */}
              <div className="flex justify-between mt-2 text-xs">
                <span className="text-[#C9A646] font-semibold">{percentage}% filled</span>
                <span className="text-slate-500">{remaining} spots left</span>
              </div>
            </div>

            {/* Micro urgency text */}
            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
              <Lock className="w-4 h-4 text-[#C9A646]/60" />
              <span className="italic">Access may close at any time</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Shimmer keyframe injection */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </section>
  );
};

export default Scarcity;