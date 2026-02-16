// src/components/landing-new/FAQ.tsx
// ================================================
// 🔥 FAQ — 8 Focused Questions
// Hormozi: Objection Handling — each answer kills a doubt
// ================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What's the difference between Core and Finotaur?",
    answer:
      "Core ($59/mo) gives you the full AI platform — Stock Analyzer, Sector Analyzer, Flow Scanner, AI Assistant, and real-time market data. Finotaur ($109/mo) includes everything in Core plus War Zone & Top Secret reports, Options Intelligence AI, Macro Analyzer, AI Scanner, and Journal Premium — all included. It's the complete trading ecosystem.",
  },
  {
    question: "Do I need prior trading experience?",
    answer:
      "No. Finotaur is designed for traders at every level. The AI does the heavy analysis — you get clear conclusions and actionable insights. Whether you're just starting out or managing a funded account, the platform adapts to your needs. That said, we're not a trading education platform — we give you the tools and intelligence to make better decisions.",
  },
  {
    question: "How does the AI actually work?",
    answer:
      "Our AI engines analyze thousands of data points in real-time — financial statements, price action, options flow, sector rotation, macro indicators, and more. Instead of raw data, you get institutional-grade conclusions in 30 seconds. Think of it as having a team of analysts working for you 24/7, distilling everything into what matters for your next trade.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Cancel in one click from your account settings — no emails, no phone calls, no questions asked. Your subscription will remain active until the end of your billing period. We don't believe in trapping people — if you're here, it's because Finotaur delivers value.",
  },
  {
    question: "What does the War Zone include?",
    answer:
      "War Zone is your daily pre-market briefing delivered every morning. It includes a complete market overview, global macro analysis (Asia → Europe → US flow), key support/resistance levels, daily directional bias, and actionable setups. It's what institutional traders read before the bell — now in your inbox.",
  },
  {
    question: "What about the Trading Journal?",
    answer:
      "Journal Premium syncs with 12,000+ brokers to auto-import your trades. The AI analyzes your patterns, identifies costly mistakes, tracks strategy performance, and provides Bloomberg-level analytics. It's included free with the Finotaur plan ($40/mo value) — you'd normally pay separately for this.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Absolutely. We use bank-grade encryption (AES-256) for all data at rest and in transit. We never sell your data, never share your trading information, and never monetize your activity. Your broker credentials are handled through secure OAuth — we never store your passwords.",
  },
  {
    question: "What if I need help?",
    answer:
      "Core users get priority email support. Finotaur users get priority support with a 24-hour response guarantee. Enterprise clients receive a dedicated account manager. We also have a Discord community where traders share insights and help each other. You're never trading alone.",
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-28 px-4 relative overflow-hidden">
      {/* ========== BACKGROUND ========== */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100d08] to-[#0a0a0a]" />

      {/* Gold glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#C9A646]/[0.06] rounded-full blur-[160px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* ========== HEADER ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full mb-6">
            <HelpCircle className="w-4 h-4 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold text-sm">
              FAQ
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-white">Questions? </span>
            <span className="text-[#C9A646]">Answers.</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Everything you need to know before getting started.
          </p>
        </motion.div>

        {/* ========== ACCORDION ========== */}
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <div
                  className="rounded-xl overflow-hidden transition-all duration-300"
                  style={{
                    background: isOpen
                      ? "linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(10,10,10,0.95) 100%)"
                      : "rgba(255,255,255,0.02)",
                    border: `1px solid ${
                      isOpen
                        ? "rgba(201,166,70,0.25)"
                        : "rgba(255,255,255,0.06)"
                    }`,
                  }}
                >
                  {/* Question */}
                  <button
                    onClick={() => toggle(index)}
                    className="w-full flex items-center justify-between p-5 md:p-6 text-left group"
                  >
                    <span
                      className={`text-base md:text-lg font-semibold pr-4 transition-colors duration-300 ${
                        isOpen ? "text-[#C9A646]" : "text-white group-hover:text-slate-200"
                      }`}
                    >
                      {faq.question}
                    </span>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300"
                      style={{
                        background: isOpen
                          ? "rgba(201,166,70,0.2)"
                          : "rgba(255,255,255,0.05)",
                        border: `1px solid ${
                          isOpen
                            ? "rgba(201,166,70,0.4)"
                            : "rgba(255,255,255,0.1)"
                        }`,
                      }}
                    >
                      {isOpen ? (
                        <Minus className="w-4 h-4 text-[#C9A646]" />
                      ) : (
                        <Plus className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Answer */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 md:px-6 pb-5 md:pb-6">
                          <div className="h-px bg-gradient-to-r from-[#C9A646]/20 via-[#C9A646]/10 to-transparent mb-4" />
                          <p className="text-slate-400 leading-relaxed text-sm md:text-base">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQ;