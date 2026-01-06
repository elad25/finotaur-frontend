// src/components/landing-new/JournalSupport.tsx
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight, CheckCircle2, Calendar, BarChart2, Brain } from "lucide-react";
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

      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 relative z-10">
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

          {/* Right - Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            {/* Main container */}
            <div className="relative">
              {/* Glow behind */}
              <div className="absolute -inset-4 bg-gradient-to-r from-zinc-800/30 to-zinc-800/10 rounded-3xl blur-2xl" />

              {/* Card */}
              <div className="relative p-8 rounded-2xl bg-zinc-900/80 border border-zinc-800/50">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#C9A646]/10 border border-[#C9A646]/30 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-[#C9A646]" />
                    </div>
                    <span className="text-white font-semibold">Trading Journal</span>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-semibold">
                    Included
                  </span>
                </div>

                {/* Mock entries */}
                <div className="space-y-4">
                  {[
                    { symbol: "AAPL", type: "Long", pnl: "+$2,340", status: "success" },
                    { symbol: "TSLA", type: "Short", pnl: "+$1,890", status: "success" },
                    { symbol: "SPY", type: "Long", pnl: "-$450", status: "loss" },
                  ].map((trade, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-zinc-700/50 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{trade.symbol[0]}</span>
                        </div>
                        <div>
                          <div className="text-white font-medium">{trade.symbol}</div>
                          <div className="text-slate-500 text-sm">{trade.type}</div>
                        </div>
                      </div>
                      <div className={`font-bold ${trade.status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trade.pnl}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom note */}
                <div className="mt-6 pt-6 border-t border-zinc-800">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-[#C9A646]" />
                    <span>Automatically syncs with your analysis workflow</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default JournalSupport;
