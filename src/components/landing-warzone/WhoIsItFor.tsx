// src/components/landing-warzone/WhoIsItFor.tsx
import { motion } from "framer-motion";
import { Lightbulb, TrendingUp, Brain, CheckCircle2 } from "lucide-react";

/**
 * 🎯 Who Is It For Section
 *
 * Target audience definition:
 * - Tired of reading news without knowing what to do
 * - Traders/investors who want a clear Bias
 * - Willing to pay to think less and make better decisions
 */
const WhoIsItFor = () => {
  const audiences = [
    {
      icon: Lightbulb,
      title: "Tired of reading news without knowing what to do?",
      description: "You consume information daily but still feel lost when it's time to make a decision. We translate noise into clarity."
    },
    {
      icon: TrendingUp,
      title: "A trader or investor who wants a clear market bias?",
      description: "Stop second-guessing yourself. Get directional conviction backed by macro analysis and institutional-level research."
    },
    {
      icon: Brain,
      title: "Willing to pay to think less and decide better?",
      description: "Your time is worth more than endless research. We do the heavy lifting so you can focus on execution."
    }
  ];

  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0C] via-[#0D0D10] to-[#0A0A0C]" />

      {/* Subtle Pattern */}
      <div className="absolute inset-0 opacity-[0.02]"
           style={{
             backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(201,166,70,0.4) 1px, transparent 0)',
             backgroundSize: '40px 40px'
           }} />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-white">Is This </span>
            <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
              For You?
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            TOP SECRET is built for a specific type of person
          </p>
        </motion.div>

        {/* Audience Cards */}
        <div className="space-y-6">
          {audiences.map((audience, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group relative"
            >
              <div className="relative p-8 rounded-2xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.08] backdrop-blur-sm hover:border-[#C9A646]/40 transition-all duration-500"
                   style={{
                     boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
                   }}>
                {/* Hover Glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                     style={{
                       background: 'radial-gradient(circle at 0% 50%, rgba(201,166,70,0.08), transparent 50%)'
                     }} />

                <div className="flex items-start gap-6">
                  {/* Icon */}
                  <div className="shrink-0">
                    <div className="w-14 h-14 rounded-xl bg-[#C9A646]/10 border border-[#C9A646]/30 flex items-center justify-center group-hover:bg-[#C9A646]/20 group-hover:border-[#C9A646]/50 transition-all duration-300">
                      <audience.icon className="w-7 h-7 text-[#C9A646]" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <CheckCircle2 className="w-6 h-6 text-[#C9A646] shrink-0 mt-1" />
                      <h3 className="text-xl md:text-2xl font-semibold text-white leading-tight">
                        {audience.title}
                      </h3>
                    </div>
                    <p className="text-slate-400 text-lg leading-relaxed ml-9">
                      {audience.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Emphasis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <p className="text-2xl md:text-3xl font-medium text-white">
            If you nodded to any of these —{" "}
            <span className="text-[#C9A646]">you're in the right place.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default WhoIsItFor;
