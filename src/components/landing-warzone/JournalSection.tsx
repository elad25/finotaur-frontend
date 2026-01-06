// src/components/landing-warzone/JournalSection.tsx
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight, Target, BarChart2, Calendar, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * 📓 Journal Section - Support Product
 *
 * The trading journal is positioned as a SUPPORT product, not the main hero.
 * It helps users turn conclusions into disciplined action.
 *
 * Message: "Execution matters too."
 */
const JournalSection = () => {
  const navigate = useNavigate();

  const journalFeatures = [
    {
      icon: Target,
      title: "Track Every Trade",
      description: "Log entries with precision and context"
    },
    {
      icon: BarChart2,
      title: "Performance Analytics",
      description: "See patterns in your trading behavior"
    },
    {
      icon: Calendar,
      title: "Visual Calendar",
      description: "Review your trading days at a glance"
    },
    {
      icon: Zap,
      title: "AI Insights",
      description: "Get personalized improvement suggestions"
    }
  ];

  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0C] via-[#0F0E0C] to-[#0A0A0C]" />

      {/* Subtle Accent */}
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-[#C9A646]/[0.04] rounded-full blur-[120px]" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Section Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-[#C9A646]/10 border border-[#C9A646]/30">
              <BookOpen className="w-4 h-4 text-[#C9A646]" />
              <span className="text-[#C9A646] text-sm font-medium">Included in FINOTAUR</span>
            </div>

            {/* Headline */}
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-white">Execution</span>
              <span className="text-[#C9A646]"> matters too.</span>
            </h2>

            {/* Description */}
            <p className="text-xl text-slate-300 leading-relaxed mb-8">
              That's why FINOTAUR also includes a{" "}
              <span className="text-white font-medium">professional trading journal</span> —
              to turn conclusions into disciplined action.
            </p>

            {/* Features Grid */}
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {journalFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#C9A646]/10 border border-[#C9A646]/20 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-[#C9A646]" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">{feature.title}</h4>
                    <p className="text-slate-500 text-sm">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => navigate('/auth/register')}
              variant="outline"
              size="lg"
              className="group px-8 py-6 text-lg font-semibold border-2 border-[#C9A646]/40 text-white hover:border-[#C9A646] hover:bg-[#C9A646]/10 rounded-xl backdrop-blur-sm transition-all duration-300"
            >
              <BookOpen className="mr-2 h-5 w-5" />
              View Trading Journal
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </motion.div>

          {/* Right Side - Screenshot */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-br from-[#C9A646]/20 via-[#C9A646]/10 to-transparent rounded-3xl blur-2xl opacity-60" />

            {/* Screenshot Container */}
            <div className="relative rounded-2xl overflow-hidden border border-zinc-700/50 shadow-2xl"
                 style={{
                   boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 60px rgba(201, 166, 70, 0.15)'
                 }}>
              {/* Top Gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent z-10 pointer-events-none" />

              {/* Calendar Image */}
              <img
                src="/assets/finotaur-calender.png"
                alt="FINOTAUR Trading Journal Calendar"
                className="w-full h-auto"
                style={{
                  filter: 'brightness(0.95) contrast(1.05)',
                }}
              />

              {/* Bottom Glow */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#C9A646]/10 to-transparent pointer-events-none" />

              {/* Feature Badge */}
              <div className="absolute top-4 right-4 z-20">
                <div className="bg-[#C9A646]/20 backdrop-blur-xl border border-[#C9A646]/40 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                  <Calendar className="w-4 h-4 text-[#C9A646]" />
                  <span className="text-[#C9A646] text-xs font-bold uppercase tracking-wider">Journal View</span>
                </div>
              </div>
            </div>

            {/* Floating Stats Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="absolute -bottom-6 -left-6 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-4 shadow-2xl"
              style={{
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#C9A646]/20 flex items-center justify-center">
                  <BarChart2 className="w-5 h-5 text-[#C9A646]" />
                </div>
                <div>
                  <div className="text-white font-bold">Discipline → Results</div>
                  <div className="text-xs text-slate-400">Track. Learn. Improve.</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 text-center"
        >
          <div className="inline-block p-6 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.08]">
            <p className="text-lg text-slate-400">
              <span className="text-[#C9A646] font-semibold">TOP SECRET</span> gets you in.
              The <span className="text-white font-medium">Journal</span> keeps you winning.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default JournalSection;
