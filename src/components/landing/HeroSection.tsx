import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Activity, BarChart3 } from 'lucide-react';

export function HeroSection() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Cinematic background with depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-base-900 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,_hsl(var(--gold)/0.15),transparent)]" />
      
      {/* Subtle light sweep */}
      <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-gold/10 via-transparent to-transparent blur-3xl animate-glow-pulse" />
      
      {/* Minimal floating particles */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/6 w-1 h-1 bg-gold rounded-full animate-float" />
        <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-gold-600 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-gold rounded-full animate-float" style={{ animationDelay: '4s' }} />
      </div>
      
      <div className="container mx-auto relative z-10 py-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left: Refined content with minimal text */}
          <div className="space-y-10 animate-slide-up max-w-2xl">
            <div className="inline-block">
              <span className="text-xs font-bold text-gold tracking-[0.3em] uppercase">
                Your edge starts here
              </span>
            </div>
            
            {/* Dramatic headline with gold glow backdrop */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-gold/20 via-gold/5 to-transparent blur-2xl opacity-60" />
              <h1 className="relative text-6xl sm:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight">
                <span className="block text-foreground">Institutional-grade</span>
                <span className="block text-foreground">intelligence,</span>
                <span className="block mt-2 text-gradient-gold">
                  built for precision
                </span>
              </h1>
            </div>
            
            <p className="text-xl text-muted-foreground/80 leading-relaxed max-w-xl font-light">
              Multi-asset intelligence. AI-powered insights. One platform.
            </p>

            {/* Premium CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button 
                size="lg" 
                asChild 
                className="group relative h-14 px-10 text-base font-semibold bg-gold text-base-900 hover:bg-gold-600 shadow-glow-gold overflow-hidden"
              >
                <Link to="/auth/register">
                  <span className="relative z-10 flex items-center gap-2">
                    Start Free
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  {/* Inner glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </Link>
              </Button>
              
              <Button 
                size="lg" 
                variant="outline" 
                asChild 
                className="group h-14 px-10 text-base font-medium border-gold/20 text-foreground hover:border-gold/40 hover:bg-gold/5 bg-transparent backdrop-blur-sm"
              >
                <Link to="#pricing">
                  Explore Platform
                </Link>
              </Button>
            </div>
          </div>

          {/* Right: 3D-style dashboard with glowing elements */}
          <div className="relative animate-slide-up" style={{ animationDelay: '0.3s' }}>
            {/* Layered glow effect */}
            <div className="absolute -inset-8 bg-gradient-to-br from-gold/30 via-gold/10 to-transparent rounded-3xl blur-3xl opacity-40 animate-glow-pulse" />
            <div className="absolute -inset-4 bg-gradient-to-tl from-gold/20 to-transparent rounded-3xl blur-2xl opacity-30" />
            
            <div className="relative rounded-3xl glass-card p-6 shadow-luxury border border-gold/20 transform perspective-1000 hover:scale-[1.02] transition-transform duration-500">
              {/* 3D depth effect */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-gold/5 to-transparent opacity-50" />
              
              <div className="relative space-y-5">
                {/* Refined header */}
                <div className="flex items-center justify-between pb-4 border-b border-gold/10">
                  <div className="space-y-1.5">
                    <div className="text-xs text-muted-foreground font-medium tracking-wide">PORTFOLIO PERFORMANCE</div>
                    <div className="text-3xl font-bold text-gradient-gold">+$247,392</div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-emerald/10 border border-accent-emerald/20">
                    <TrendingUp className="w-4 h-4 text-accent-emerald" />
                    <span className="text-sm font-semibold text-accent-emerald">+18.4%</span>
                  </div>
                </div>
                
                {/* Glowing metric cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Activity, label: 'Win Rate', value: '73.2%', color: 'gold' },
                    { icon: BarChart3, label: 'Sharpe', value: '2.84', color: 'gold-600' },
                    { icon: TrendingUp, label: 'ROI', value: '142%', color: 'gold' }
                  ].map((metric, i) => (
                    <div 
                      key={i} 
                      className="relative p-4 rounded-2xl bg-gradient-to-br from-base-900/80 to-base-800/60 border border-gold/10 hover:border-gold/30 transition-all group"
                    >
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <metric.icon className={`w-4 h-4 text-${metric.color} mb-2 opacity-60`} />
                      <div className="text-[10px] text-muted-foreground font-medium tracking-wide mb-1">{metric.label}</div>
                      <div className={`text-xl font-bold text-${metric.color}`}>{metric.value}</div>
                    </div>
                  ))}
                </div>

                {/* 3D glowing chart */}
                <div className="relative h-64 rounded-2xl bg-gradient-to-b from-black/60 to-base-900/40 overflow-hidden border border-gold/10 group">
                  {/* Grid with perspective */}
                  <div className="absolute inset-0 opacity-10">
                    {[...Array(6)].map((_, i) => (
                      <div 
                        key={i} 
                        className="absolute w-full h-px bg-gradient-to-r from-transparent via-gold to-transparent" 
                        style={{ top: `${16.67 * (i + 1)}%` }} 
                      />
                    ))}
                  </div>
                  
                  {/* Glowing area chart */}
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0" />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <path
                      d="M 0,200 L 0,160 Q 80,140 160,120 T 320,80 Q 400,60 480,40 L 480,200 Z"
                      fill="url(#areaGradient)"
                      className="animate-slide-up"
                    />
                    <path
                      d="M 0,160 Q 80,140 160,120 T 320,80 Q 400,60 480,40"
                      fill="none"
                      stroke="hsl(var(--gold))"
                      strokeWidth="2"
                      filter="url(#glow)"
                      className="animate-slide-up"
                    />
                  </svg>
                  
                  {/* Spotlight overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 left-1/2 w-1/2 h-1/2 bg-gold/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
