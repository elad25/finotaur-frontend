// src/components/top-secret/Exclusivity.tsx
import { motion } from "framer-motion";
import { Lock, Users } from "lucide-react";

const Exclusivity = () => {
  return (
    <section className="relative py-20 md:py-24 overflow-hidden">
      {/* Background with gold tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#14110A] to-[#0A0A0A]" />

      {/* Gold glows - stronger */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#C9A646]/[0.10] rounded-full blur-[120px]" />
      <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-[#D4AF37]/[0.07] rounded-full blur-[100px]" />
      <div className="absolute bottom-0 right-1/4 w-[350px] h-[250px] bg-[#C9A646]/[0.06] rounded-full blur-[90px]" />

      {/* Animated lock particles floating */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${15 + i * 25}%`,
              top: `${20 + (i % 2) * 40}%`,
            }}
            animate={{
              y: [0, -10, 0],
              opacity: [0.1, 0.2, 0.1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.7,
            }}
          >
            <Lock className="w-4 h-4 text-[#C9A646]/20" />
          </motion.div>
        ))}
      </div>

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/45 to-transparent" />

      <div className="max-w-4xl mx-auto px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* Exclusive badge with animated border */}
          <div className="relative inline-flex items-center gap-3 px-6 py-4 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-2xl backdrop-blur-xl mb-6 overflow-hidden">
            {/* Animated shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C9A646]/10 to-transparent"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
                repeatDelay: 2,
              }}
            />
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#C9A646]" />
              <Users className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div className="w-px h-6 bg-[#C9A646]/30" />
            <p className="text-lg md:text-xl text-slate-200">
              <span className="text-[#C9A646] font-semibold">TOP SECRET</span> is intentionally kept small.
            </p>
          </div>

          <p className="text-lg text-slate-400 mb-4">
            This isn't mass-market content.
          </p>

          <p className="text-slate-500 text-sm">
            Access may close at any time.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Exclusivity;
