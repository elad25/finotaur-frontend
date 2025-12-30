import { Calendar, Brain, Target, ArrowRight, Sparkles } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const ProductShowcase = () => {
  const features = [
    {
      icon: Calendar,
      title: "Trading Calendar",
      whatItShows: "Visual heatmap of daily P&L and trade frequency",
      whyItMatters: "Spot overtrading patterns and identify your best trading days",
      annotations: [
        { x: "20%", y: "30%", text: "→ AI detects best days", direction: "right" as const },
        { x: "70%", y: "50%", text: "Overtrading alert", direction: "left" as const },
        { x: "50%", y: "80%", text: "→ Pattern confirmed", direction: "top" as const }
      ],
      color: "emerald"
    },
    {
      icon: Brain,
      title: "AI Insights",
      whatItShows: "Real-time behavioral analysis and pattern detection",
      whyItMatters: "Catch emotional trading before it destroys your account",
      annotations: [
        { x: "30%", y: "40%", text: "→ AI detects emotional entries", direction: "right" as const },
        { x: "60%", y: "60%", text: "Risk alert triggered", direction: "left" as const }
      ],
      color: "primary"
    },
    {
      icon: Target,
      title: "Strategy Tracker",
      whatItShows: "Performance breakdown by setup and market condition",
      whyItMatters: "Focus only on strategies that actually make money",
      annotations: [
        { x: "25%", y: "35%", text: "Winning setup", direction: "right" as const },
        { x: "75%", y: "45%", text: "→ Pattern confirmed", direction: "left" as const },
        { x: "50%", y: "75%", text: "Expectancy metric", direction: "top" as const }
      ],
      color: "blue"
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case "emerald":
        return {
          border: "border-emerald-500/50",
          bg: "bg-emerald-500/10",
          text: "text-emerald-400",
          glow: "shadow-[0_0_40px_rgba(16,185,129,0.3)]",
          dotBg: "bg-emerald-500",
          labelBg: "bg-emerald-500/20",
          labelBorder: "border-emerald-500/40"
        };
      case "primary":
        return {
          border: "border-[#C9A646]/50",
          bg: "bg-[#C9A646]/10",
          text: "text-[#C9A646]",
          glow: "shadow-[0_0_40px_rgba(201,166,70,0.3)]",
          dotBg: "bg-[#C9A646]",
          labelBg: "bg-[#C9A646]/20",
          labelBorder: "border-[#C9A646]/40"
        };
      case "blue":
        return {
          border: "border-blue-400/50",
          bg: "bg-blue-500/10",
          text: "text-blue-300",
          glow: "shadow-[0_0_40px_rgba(96,165,250,0.3)]",
          dotBg: "bg-blue-400",
          labelBg: "bg-blue-500/20",
          labelBorder: "border-blue-400/40"
        };
      default:
        return {
          border: "border-[#C9A646]/50",
          bg: "bg-[#C9A646]/10",
          text: "text-[#C9A646]",
          glow: "shadow-[0_0_40px_rgba(201,166,70,0.3)]",
          dotBg: "bg-[#C9A646]",
          labelBg: "bg-[#C9A646]/20",
          labelBorder: "border-[#C9A646]/40"
        };
    }
  };

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Deep Navy Background with Gold Vignette - AI-Powered Look */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D1118] via-[#1A1713] to-[#0D1118]" />
      
      {/* Gold Vignette Effects */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#C9A646]/[0.08] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#C9A646]/[0.08] to-transparent" />
      
      {/* Subtle Animated Glow Around Visuals */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#F4D97B]/[0.05] rounded-full blur-[150px]" 
           style={{ animation: 'pulse 8s ease-in-out infinite' }} />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header with Scroll Reveal */}
        <ScrollRevealSection>
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 mb-6">
              <Sparkles className="w-6 h-6 text-[#C9A646] animate-pulse-glow" />
            </div>
            <h2 className="text-4xl md:text-5xl font-semibold mb-6" style={{ letterSpacing: '-0.02em' }}>
              <span className="text-white">Your Data Becomes </span>
              <span className="text-[#C9A646]">A Coach</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Every feature is designed to transform raw trading data into actionable intelligence
            </p>
          </div>
        </ScrollRevealSection>

        {/* Features Grid with Annotations */}
        <div className="space-y-32">
          {features.map((feature, index) => {
            const colors = getColorClasses(feature.color);
            const isEven = index % 2 === 0;
            
            // Color-coded labels: Blue for WHAT IT SHOWS, Gold for WHY IT MATTERS
            const whatColor = "text-blue-300";
            const whyColor = "text-[#F4D97B]";

            return (
              <ScrollRevealSection key={index} delay={index * 0.2}>
                <div className={`grid lg:grid-cols-2 gap-12 items-center ${isEven ? '' : 'lg:grid-flow-dense'}`}>
                  {/* Text Content */}
                  <div className={isEven ? 'lg:order-1' : 'lg:order-2'}>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 ${colors.labelBg} border ${colors.labelBorder} rounded-full mb-6`}>
                      <feature.icon className={`w-5 h-5 ${colors.text}`} />
                      <span className={`${colors.text} font-medium text-sm`}>{feature.title}</span>
                    </div>

                    <div className="space-y-6">
                      {/* What it shows - BLUE COLD */}
                      <div className="group">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`${whatColor} font-bold text-sm uppercase tracking-wider`}>What it shows</span>
                          <ArrowRight className={`w-5 h-5 ${whatColor} animate-pulse`} />
                        </div>
                        <p className="text-2xl text-white font-semibold leading-relaxed">
                          {feature.whatItShows}
                        </p>
                      </div>

                      {/* Gold Divider */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gradient-to-r from-[#C9A646] via-[#C9A646]/50 to-transparent" />
                        <div className={`w-2 h-2 ${colors.dotBg} rounded-full`} />
                      </div>

                      {/* Why it matters - GOLD WARM */}
                      <div className="group">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`${whyColor} font-bold text-sm uppercase tracking-wider`}>Why it matters</span>
                          <ArrowRight className={`w-5 h-5 ${whyColor} animate-pulse`} />
                        </div>
                        <p className="text-lg text-slate-300 leading-relaxed">
                          {feature.whyItMatters}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ANNOTATED SCREENSHOT WITH MICRO-ANNOTATIONS */}
                  <div className={isEven ? 'lg:order-2' : 'lg:order-1'}>
                    <div className="relative group">
                      {/* Enhanced Animated Glow */}
                      <div className={`absolute -inset-8 rounded-3xl blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-700`}
                           style={{
                             background: `radial-gradient(circle, ${feature.color === 'emerald' ? 'rgba(16,185,129,0.2)' : feature.color === 'blue' ? 'rgba(96,165,250,0.2)' : 'rgba(244,217,123,0.2)'}, transparent)`,
                             animation: 'glow-shift 6s ease-in-out infinite'
                           }} />
                      
                      {/* Screenshot Container */}
                      <div className={`relative rounded-2xl overflow-hidden border-2 ${colors.border} ${colors.glow} shadow-2xl transition-all duration-500 group-hover:scale-[1.02]`}>
                        {/* Mock Screenshot */}
                        <div className="relative aspect-video bg-gradient-to-br from-[#0D1118] via-[#1A1713] to-[#0D1118]">
                          {/* Browser Header */}
                          <div className="absolute top-0 left-0 right-0 h-10 bg-black/95 border-b border-white/5 flex items-center px-4 gap-2 backdrop-blur-xl">
                            <div className="flex gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500/80" />
                              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                              <div className="w-3 h-3 rounded-full bg-green-500/80" />
                            </div>
                            <div className="flex-1 flex justify-center">
                              <div className="px-6 py-1 bg-white/5 rounded-lg text-xs text-slate-400 font-mono">
                                finotaur.com/{feature.title.toLowerCase().replace(' ', '-')}
                              </div>
                            </div>
                          </div>

                          {/* Screenshot Content Area */}
                          <div className="pt-10 p-8 h-full flex items-center justify-center">
                            <div className="text-center">
                              <feature.icon className={`w-20 h-20 ${colors.text} mx-auto mb-6 opacity-20`} />
                              <p className="text-slate-600 font-semibold mb-2">
                                {feature.title}
                              </p>
                              <p className="text-xs text-slate-700">
                                Screenshot placeholder - Replace with actual product image
                              </p>
                            </div>
                          </div>

                          {/* MICRO-ANNOTATIONS WITH ARROWS */}
                          {feature.annotations.map((annotation, idx) => (
                            <AnnotationPoint
                              key={idx}
                              x={annotation.x}
                              y={annotation.y}
                              text={annotation.text}
                              direction={annotation.direction}
                              color={colors}
                              delay={idx * 0.2}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Corner Accents */}
                      <div className={`absolute -top-4 -right-4 w-8 h-8 border-t-2 border-r-2 ${colors.border} rounded-tr-xl opacity-60`} />
                      <div className={`absolute -bottom-4 -left-4 w-8 h-8 border-b-2 border-l-2 ${colors.border} rounded-bl-xl opacity-60`} />
                    </div>
                  </div>
                </div>
              </ScrollRevealSection>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <ScrollRevealSection delay={0.6}>
          <div className="text-center mt-24">
            <div className="inline-flex flex-col items-center gap-6">
              <p className="text-slate-400 text-xl">
                See it in action with your own data
              </p>
              <a
                href="/auth/register"
                className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-[#C9A646] via-[#D4AF37] to-[#C9A646] bg-[length:200%_auto] hover:bg-[position:right_center] text-black font-bold text-lg rounded-xl transition-all duration-500 hover:scale-105"
                style={{
                  boxShadow: '0 4px 24px rgba(201,166,70,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                }}
              >
                Start 14-Day Free Trial
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </ScrollRevealSection>
      </div>
    </section>
  );
};

// ============================================
// ANNOTATION POINT COMPONENT
// ============================================
interface AnnotationPointProps {
  x: string;
  y: string;
  text: string;
  direction: 'left' | 'right' | 'top' | 'bottom';
  color: any;
  delay: number;
}

const AnnotationPoint = ({ x, y, text, direction, color, delay }: AnnotationPointProps) => {
  const getArrowClasses = () => {
    switch (direction) {
      case 'right':
        return 'left-full ml-3 flex-row';
      case 'left':
        return 'right-full mr-3 flex-row-reverse';
      case 'top':
        return 'bottom-full mb-3 flex-col-reverse items-center';
      case 'bottom':
        return 'top-full mt-3 flex-col items-center';
      default:
        return 'left-full ml-3 flex-row';
    }
  };

  const getArrowLine = () => {
    switch (direction) {
      case 'right':
      case 'left':
        return <div className={`w-8 h-px ${color.bg} border-t ${color.border}`} />;
      case 'top':
      case 'bottom':
        return <div className={`w-px h-8 ${color.bg} border-l ${color.border}`} />;
      default:
        return <div className={`w-8 h-px ${color.bg} border-t ${color.border}`} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, type: "spring" }}
      className="absolute"
      style={{ left: x, top: y }}
    >
      {/* Pulsing Dot */}
      <div className="relative">
        <div className={`w-3 h-3 ${color.dotBg} rounded-full animate-ping absolute`} />
        <div className={`w-3 h-3 ${color.dotBg} rounded-full relative z-10 shadow-lg`} />
      </div>

      {/* Label with Arrow */}
      <div className={`absolute ${getArrowClasses()} flex items-center gap-2 whitespace-nowrap`}>
        {getArrowLine()}
        <div className={`px-3 py-2 ${color.bg} border ${color.border} rounded-lg backdrop-blur-xl shadow-lg`}>
          <p className={`text-xs ${color.text} font-semibold`}>
            {text}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// SCROLL REVEAL WRAPPER COMPONENT
// ============================================
interface ScrollRevealSectionProps {
  children: React.ReactNode;
  delay?: number;
}

const ScrollRevealSection = ({ children, delay = 0 }: ScrollRevealSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, delay }}
    >
      {children}
    </motion.div>
  );
};

export default ProductShowcase;