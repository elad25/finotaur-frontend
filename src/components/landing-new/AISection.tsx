import { Brain, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const insights = [
  "Your average win rate increases 12% when trading after 2 PM.",
  "You over-risk on Mondays — reduce lot by 20%.",
  "Strategy Alpha shows 3x higher expectancy than Beta.",
  "You win 65% of trades after 2 PM — focus sessions then.",
  "Revenge trading costs you $1,200/month on average."
];

const AISection = () => {
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  const currentInsight = insights[currentInsightIndex];

  // Typing effect
  useEffect(() => {
    if (isTyping) {
      if (displayedText.length < currentInsight.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentInsight.slice(0, displayedText.length + 1));
        }, 30); // Typing speed
        return () => clearTimeout(timeout);
      } else {
        // Finished typing, wait before starting next insight
        setIsTyping(false);
        const timeout = setTimeout(() => {
          setDisplayedText("");
          setCurrentInsightIndex((prev) => (prev + 1) % insights.length);
          setIsTyping(true);
        }, 3000); // Wait time before next insight
        return () => clearTimeout(timeout);
      }
    }
  }, [displayedText, isTyping, currentInsight]);

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Unique Gradient Background - Breaks Monotony */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0C0C0E] via-[#1A1713] to-[#0C0C0E]" />
      
      {/* Enhanced Gold Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#C9A646]/[0.12] rounded-full blur-[150px]" 
           style={{ animation: 'pulse 8s ease-in-out infinite' }} />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#F4D97B]/[0.08] rounded-full blur-[120px]" 
           style={{ animation: 'float 10s ease-in-out infinite' }} />
      
      {/* Top Border Line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center gap-2 mb-6">
            <Brain className="h-8 w-8 text-[#C9A646]" />
            <Sparkles className="h-6 w-6 text-[#C9A646] animate-pulse-glow" />
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold mb-6" style={{ letterSpacing: '-0.02em' }}>
            <span className="text-white">AI-Powered </span>
            <span className="text-[#C9A646]">Intelligence</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            FINOTAUR isn't just data — it thinks with you.<br />
            Our AI engine analyzes your journal, stats, and behavior to generate insights that transform you into a better trader.
          </p>
        </motion.div>

        {/* ============================================
            LIVE AI TYPING BUBBLE
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-12"
        >
          <div className="p-8 max-w-3xl mx-auto relative overflow-hidden rounded-2xl"
               style={{
                 background: 'rgba(255, 255, 255, 0.03)',
                 backdropFilter: 'blur(12px)',
                 border: '2px solid rgba(201,166,70,0.4)',
                 boxShadow: '0 0 60px rgba(201,166,70,0.3)'
               }}>
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#C9A646]/5 via-[#C9A646]/10 to-[#C9A646]/5 animate-gradient-x" />
            
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#C9A646]/20">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                     style={{
                       background: 'rgba(201,166,70,0.2)',
                       border: '1px solid rgba(201,166,70,0.4)'
                     }}>
                  <Brain className="h-5 w-5 text-[#C9A646]" />
                </div>
                <div>
                  <div className="font-semibold text-white flex items-center gap-2">
                    Finotaur AI
                    <span className="flex gap-1">
                      <span className="w-2 h-2 bg-[#C9A646] rounded-full animate-pulse" />
                      <span className="w-2 h-2 bg-[#C9A646] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <span className="w-2 h-2 bg-[#C9A646] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">Analyzing your trading patterns...</div>
                </div>
              </div>

              {/* Typing Insight */}
              <div className="min-h-[60px] flex items-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentInsightIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-lg md:text-xl leading-relaxed text-slate-200 font-medium"
                  >
                    "{displayedText}"
                    {isTyping && displayedText.length < currentInsight.length && (
                      <span className="inline-block w-0.5 h-5 bg-[#C9A646] ml-1 animate-pulse" />
                    )}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Insight Counter */}
              <div className="mt-6 pt-4 border-t border-[#C9A646]/20 flex items-center justify-between">
                <div className="flex gap-2">
                  {insights.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        idx === currentInsightIndex
                          ? 'w-8 bg-[#C9A646]'
                          : 'w-2 bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-xs text-slate-500">
                  {currentInsightIndex + 1} of {insights.length} insights
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Static Insights Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Pattern Recognition",
              description: "AI detects hidden patterns in your trading behavior that you'd never spot manually"
            },
            {
              title: "Risk Alerts",
              description: "Real-time warnings before emotional trading destroys your account"
            },
            {
              title: "Strategy Optimization",
              description: "AI recommends which setups to focus on based on your actual performance"
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
              className="group p-6 transition-all duration-300 rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
              }}
            >
              {/* Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.08] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
              
              <div className="relative flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                     style={{
                       background: 'rgba(201,166,70,0.2)',
                       border: '1px solid rgba(201,166,70,0.3)'
                     }}>
                  <Sparkles className="h-5 w-5 text-[#C9A646]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2 group-hover:text-[#C9A646] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Bottom Border Line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />
    </section>
  );
};

export default AISection;