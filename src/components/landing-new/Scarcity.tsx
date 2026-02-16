// src/components/landing-new/Scarcity.tsx
// ================================================
// 🔥 SCARCITY / URGENCY — COMPACT
// "153 seats out of 1,000 remaining"
// ================================================

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

const Scarcity = () => {
  const totalSeats = 1000;
  const remaining = 153;
  const filled = totalSeats - remaining;
  const percentage = Math.round((filled / totalSeats) * 100);

  return (
    <section className="py-14 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#110d08] to-[#0a0a0a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#C9A646]/[0.08] rounded-full blur-[130px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />

      <div className="max-w-md mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div
            className="relative rounded-2xl p-6 mx-auto overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(201,166,70,0.07) 0%, rgba(10,10,10,0.95) 100%)',
              border: '1px solid rgba(201,166,70,0.2)',
              boxShadow: '0 0 40px rgba(201,166,70,0.08), 0 10px 30px rgba(0,0,0,0.3)',
            }}
          >
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#C9A646]/25 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#C9A646]/25 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#C9A646]/25 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#C9A646]/25 rounded-br-2xl" />

            {/* Live dot */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
              </span>
              <span className="text-amber-400 text-xs font-semibold tracking-wide uppercase">Limited Access</span>
            </div>

            {/* Main number */}
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-1.5">
              <span className="text-[#C9A646]">{remaining}</span> of {totalSeats.toLocaleString()} seats remaining
            </h2>

            <p className="text-slate-400 text-sm mb-5">
              We limit access to maintain service quality. When we're full — we close enrollment.
            </p>

            {/* Progress bar */}
            <div className="relative mb-4">
              <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${percentage}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
                  className="h-full rounded-full relative"
                  style={{
                    background: 'linear-gradient(90deg, #C9A646, #F4D97B, #D4AF37)',
                    boxShadow: '0 0 15px rgba(201,166,70,0.35)',
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                      animation: 'shimmer 2s infinite',
                    }}
                  />
                </motion.div>
              </div>
              <div className="flex justify-between mt-1.5 text-[11px]">
                <span className="text-[#C9A646] font-semibold">{percentage}% filled</span>
                <span className="text-slate-500">{remaining} spots left</span>
              </div>
            </div>

            {/* Micro text */}
            <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs">
              <Lock className="w-3.5 h-3.5 text-[#C9A646]/50" />
              <span className="italic">Access may close at any time</span>
            </div>
          </div>
        </motion.div>
      </div>

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