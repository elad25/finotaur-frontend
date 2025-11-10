import { BookOpen, TrendingUp, Brain, Calendar, Users, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: BookOpen,
    title: "Advanced Trade Journal",
    description: "Professional trading diary with precision logging and pattern recognition"
  },
  {
    icon: TrendingUp,
    title: "Performance Statistics & Analytics",
    description: "Deep insights into your trading metrics and behavior patterns"
  },
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description: "Intelligent analysis that learns from your trading history"
  },
  {
    icon: Calendar,
    title: "Smart Calendar & Session Tracking",
    description: "Organize and optimize your trading schedule for peak performance"
  },
  {
    icon: Users,
    title: "Integrated Academy & Community",
    description: "Learn and grow with a community of professional traders"
  },
  {
    icon: GraduationCap,
    title: "Strategy & Scenario Builder",
    description: "Plan and test your strategies before executing"
  }
];

const WhatIsFinotaur = () => {
  return (
    <section id="features" className="py-24 px-4 relative overflow-hidden">
      {/* Luxury Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0C0C0E] to-[#0a0a0a]" />
      
      {/* Enhanced Gold Glows */}
      <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-[#C9A646]/[0.1] rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-[#D4BF8E]/[0.08] rounded-full blur-[140px]" />
      
      {/* Top Border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-semibold mb-6" style={{ letterSpacing: '-0.02em' }}>
            <span className="text-white">What is </span>
            <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
              FINOTAUR
            </span>
            <span className="text-white">?</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-4xl mx-auto leading-relaxed">
            FINOTAUR is an all-in-one ecosystem for traders and investors — combining data, AI, and design to create a next-generation trading experience.
          </p>
        </motion.div>

        {/* Features Grid - Enhanced Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              {/* Enhanced Card with Better Depth */}
              <div className="rounded-2xl p-8 h-full transition-all duration-300 relative overflow-hidden"
                   style={{
                     background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                     border: '1px solid rgba(255,255,255,0.08)',
                     boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
                   }}>
                
                {/* Hover Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.08] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Top Gold Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative">
                  {/* Icon with Enhanced Shadow */}
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300"
                       style={{
                         background: 'rgba(201,166,70,0.15)',
                         border: '1px solid rgba(201,166,70,0.3)',
                         boxShadow: '0 4px 16px rgba(201,166,70,0.15)'
                       }}>
                    <feature.icon className="h-7 w-7 text-[#C9A646]" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-[#C9A646] transition-colors">
                    {feature.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom Border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />
    </section>
  );
};

export default WhatIsFinotaur;