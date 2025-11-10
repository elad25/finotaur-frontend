import { Star, TrendingUp, Award, Target, Zap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  rating: number;
  quote: string;
  metric?: string;
  metricValue?: string;
  icon?: any;
}

const testimonials: Testimonial[] = [
  {
    name: "Private Beta Trader",
    role: "Funded Account Manager",
    avatar: "PB",
    rating: 5,
    quote: "Finotaur showed me I was overtrading Mondays by 3x. Fixed that one pattern and added $4,200 to my P&L in 30 days. The AI insights are legitimately game-changing.",
    metric: "P&L Increase",
    metricValue: "+$4.2K",
    icon: TrendingUp
  },
  {
    name: "Early Access User",
    role: "Day Trader • Futures",
    avatar: "EA",
    rating: 5,
    quote: "I thought I had discipline until Finotaur showed me my actual data. The calendar view made it painfully obvious when I revenge trade. Now I just... don't.",
    metric: "Win Rate",
    metricValue: "+23%",
    icon: Target
  },
  {
    name: "Beta Tester",
    role: "Prop Firm Trader",
    avatar: "BT",
    rating: 5,
    quote: "Best trading journal I've used, period. The Bloomberg-style interface feels professional, and the AI catches patterns I'd never spot manually. Worth every penny.",
    metric: "Consistency",
    metricValue: "12 Green Weeks",
    icon: Award
  },
  {
    name: "Internal Testing",
    role: "Swing Trader • Equities",
    avatar: "IT",
    rating: 5,
    quote: "The strategy tracker is incredible. It proved my breakout setup loses money 65% of the time. Dropped it completely, focused on mean reversion, and haven't looked back.",
    metric: "Strategy Focus",
    metricValue: "3 → 1 Setup",
    icon: Zap
  }
];

const Testimonials = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Luxury Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0C0C0E] via-[#1A1713] to-[#0C0C0E]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />
      
      {/* Enhanced Gold Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#C9A646]/12 rounded-full blur-[140px]" 
           style={{ animation: 'float 8s ease-in-out infinite' }} />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#D4BF8E]/[0.08] rounded-full blur-[120px]" 
           style={{ animation: 'float 8s ease-in-out infinite', animationDelay: '2s' }} />
      
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
            <span className="text-white">Trusted by </span><span className="text-[#C9A646]">Winning Traders</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Real results from traders who turned data into discipline
          </p>
        </motion.div>

        {/* Testimonials Grid with Frosted Glass */}
        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group"
            >
              {/* FROSTED GLASS CARD */}
              <div className="h-full relative overflow-hidden rounded-2xl"
                   style={{
                     background: 'rgba(255, 255, 255, 0.03)',
                     backdropFilter: 'blur(12px)',
                     border: '1px solid rgba(255, 255, 255, 0.05)',
                     boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)'
                   }}>
                
                {/* Hover Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.08] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                {/* Gold Vertical Line on Left */}
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-gradient-to-b from-transparent via-[#C9A646] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 p-8 flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      {/* Avatar with Enhanced Glow */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-[#C9A646]/30 rounded-xl blur-md group-hover:blur-lg transition-all" />
                        <div className="relative w-16 h-16 rounded-xl flex items-center justify-center text-[#C9A646] font-bold text-xl shadow-lg"
                             style={{
                               background: 'linear-gradient(135deg, rgba(201,166,70,0.3) 0%, rgba(201,166,70,0.1) 100%)',
                               border: '1px solid rgba(201,166,70,0.3)'
                             }}>
                          {testimonial.avatar}
                        </div>
                      </div>
                      
                      {/* Name & Role */}
                      <div>
                        <h3 className="font-semibold text-white text-lg mb-1 group-hover:text-[#C9A646] transition-colors">
                          {testimonial.name}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>

                    {/* Stars */}
                    <div className="flex gap-1 shrink-0">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.6 + index * 0.1 + i * 0.05 }}
                        >
                          <Star className="w-5 h-5 fill-[#D4AF37] text-[#D4AF37]" />
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Quote */}
                  <blockquote className="text-slate-300 leading-relaxed mb-6 flex-1 text-lg">
                    "{testimonial.quote}"
                  </blockquote>

                  {/* Metric Badge */}
                  {testimonial.metric && testimonial.metricValue && (
                    <div className="relative">
                      <div className="absolute inset-0 bg-[#C9A646]/5 rounded-xl blur-sm" />
                      <div className="relative flex items-center gap-4 pt-6 border-t border-white/5">
                        {testimonial.icon && (
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all"
                               style={{
                                 background: 'rgba(201,166,70,0.1)',
                                 border: '1px solid rgba(201,166,70,0.3)'
                               }}>
                            <testimonial.icon className="w-6 h-6 text-[#C9A646]" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm text-slate-500 mb-1 font-medium uppercase tracking-wider">
                            {testimonial.metric}
                          </div>
                          <div className="text-3xl font-bold text-[#C9A646]">
                            {testimonial.metricValue}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA with Trader Avatars */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center mt-20"
        >
          <div className="inline-flex flex-col items-center gap-6">
            {/* Trader Avatars */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 + i * 0.05 }}
                    className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs text-[#C9A646] font-bold shadow-lg hover:scale-110 transition-transform cursor-pointer"
                    style={{ 
                      zIndex: 10 - i,
                      borderColor: '#0C0C0E',
                      background: 'linear-gradient(135deg, rgba(201,166,70,0.3) 0%, rgba(15,15,15,1) 100%)'
                    }}
                  >
                    {i}
                  </motion.div>
                ))}
              </div>
              <div className="text-left ml-2">
                <div className="text-white font-semibold">5,000+ Elite Traders</div>
                <div className="text-sm text-slate-400">Improving their edge daily</div>
              </div>
            </div>

            {/* CTA Button */}
            <a
              href="/auth/register"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#C9A646] via-[#D4AF37] to-[#C9A646] bg-[length:200%_auto] hover:bg-[position:right_center] text-black font-bold rounded-xl transition-all duration-500 hover:scale-105"
              style={{
                boxShadow: '0 4px 24px rgba(201,166,70,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
              }}
            >
              Start your transformation
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </motion.div>
      </div>

      {/* Bottom Gradient Line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />
    </section>
  );
};

export default Testimonials;