// src/components/landing-warzone/RiskReversal.tsx
import { motion } from "framer-motion";
import { Shield, CheckCircle2, XCircle, Zap } from "lucide-react";

/**
 * 🛡️ Risk Reversal Section
 *
 * Based on Hormozi: "People don't buy when they want something.
 * They buy when the fear of loss is lower than the desire."
 *
 * This section reduces anxiety and removes barriers to purchase.
 */
const RiskReversal = () => {
  const guarantees = [
    {
      icon: CheckCircle2,
      text: "Cancel anytime. No questions. No hassle.",
      color: "#22c55e"
    },
    {
      icon: CheckCircle2,
      text: "If it doesn't change how you think in 30 days — walk away.",
      color: "#22c55e"
    },
    {
      icon: CheckCircle2,
      text: "You're paying for conclusions, not content.",
      color: "#22c55e"
    },
    {
      icon: CheckCircle2,
      text: "Price locked forever once you join — even when rates increase.",
      color: "#22c55e"
    }
  ];

  const notIncluded = [
    "No long-term contracts",
    "No hidden fees",
    "No pressure tactics"
  ];

  return (
    <section className="relative py-20 px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0C] via-[#0A0D0A] to-[#0A0A0C]" />

      {/* Green Safety Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-green-900/10 rounded-full blur-[150px]" />

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          {/* Shield Badge */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 mb-6">
            <Shield className="w-8 h-8 text-green-400" />
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Zero Risk. <span className="text-green-400">Full Control.</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            We're confident TOP SECRET will change how you see markets.
            If it doesn't — you lose nothing.
          </p>
        </motion.div>

        {/* Guarantees */}
        <div className="space-y-4 mb-12">
          {guarantees.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex items-center gap-4 p-5 rounded-xl bg-green-500/5 border border-green-500/20 backdrop-blur-sm"
            >
              <item.icon className="w-6 h-6 text-green-400 shrink-0" />
              <p className="text-lg text-white font-medium">{item.text}</p>
            </motion.div>
          ))}
        </div>

        {/* What's NOT included (reverse psychology) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-6 text-slate-500"
        >
          {notIncluded.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-slate-600" />
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </motion.div>

        {/* Strong Closing Statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 p-6 rounded-2xl bg-gradient-to-r from-[#C9A646]/10 to-green-500/10 border border-[#C9A646]/30">
            <Zap className="w-6 h-6 text-[#C9A646]" />
            <p className="text-lg md:text-xl text-white font-medium">
              "The only risk is staying where you are."
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default RiskReversal;
