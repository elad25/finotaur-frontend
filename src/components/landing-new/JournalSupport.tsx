// src/components/landing-new/JournalSupport.tsx
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight, Calendar, BarChart2, Brain, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const JournalSupport = () => {
  const journalFeatures = [
    { icon: Calendar, text: "Track every trade with precision" },
    { icon: BarChart2, text: "Visualize your performance patterns" },
    { icon: Brain, text: "Turn insights into disciplined action" },
  ];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D1118] via-[#0C0C0E] to-[#0D1118]" />

      {/* Subtle glow */}
      <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-[#C9A646]/[0.04] rounded-full blur-[180px]" />

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-full">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400 text-sm font-medium">Execution Tool</span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white leading-tight">
                Execution matters too.
              </h2>
              <p className="text-xl md:text-2xl text-slate-300 leading-relaxed">
                That's why FINOTAUR also includes a{" "}
                <span className="text-[#C9A646] font-semibold">trading journal</span>
                {" "}— to turn conclusions into disciplined action.
              </p>
            </div>

            {/* Features list */}
            <div className="space-y-4">
              {journalFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-slate-400" />
                  </div>
                  <span className="text-slate-300 text-lg">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <Link to="/auth/register">
              <Button
                variant="outline"
                size="lg"
                className="group px-8 py-6 text-lg font-semibold border-2 border-zinc-700 text-white hover:border-[#C9A646]/50 hover:bg-[#C9A646]/5 rounded-xl transition-all duration-300"
              >
                <BookOpen className="mr-2 h-5 w-5" />
                View Trading Journal
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>

          {/* Right - Calendar Screenshot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            {/* Glow effect behind calendar */}
            <div className="absolute -inset-8 bg-gradient-to-r from-[#C9A646]/20 via-[#D4AF37]/10 to-transparent rounded-3xl blur-3xl opacity-60" />

            {/* Calendar Container */}
            <div className="relative">
              {/* Screenshot */}
              <div className="relative rounded-2xl overflow-hidden border border-zinc-700/50 shadow-2xl"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 60px rgba(201, 166, 70, 0.15)'
                }}
              >
                {/* Top gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent z-10 pointer-events-none" />

                {/* Calendar Image */}
                <img
                  src="/assets/finotaur-calender.png"
                  alt="Finotaur Trading Calendar"
                  className="w-full h-auto"
                  style={{
                    filter: 'brightness(0.95) contrast(1.1)',
                  }}
                />

                {/* Bottom glow */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#C9A646]/10 to-transparent pointer-events-none" />

                {/* Live Badge */}
                <div className="absolute top-6 right-6 z-20">
                  <div className="bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/40 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-500/50" />
                    <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Live Platform</span>
                  </div>
                </div>
              </div>

              {/* Floating Monthly P&L Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="absolute -bottom-6 -left-6 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-4 shadow-2xl"
                style={{
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-emerald-400">+$45,335</div>
                    <div className="text-xs text-zinc-400 font-medium">This month</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default JournalSupport;
