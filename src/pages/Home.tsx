import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, TrendingUp, Bell, BookOpen, BarChart3, Calendar, Check, Star, Quote } from "lucide-react";
import heroDashboard from "@/assets/hero-dashboard.jpg";

const Home = () => {
  const features = [
    {
      icon: TrendingUp,
      title: "Market News",
      tagline: "Stay ahead with curated insights that matter to your portfolio",
      description: "Real-time aggregated news with earnings summaries and company insights",
    },
    {
      icon: Calendar,
      title: "Earnings Calendar",
      tagline: "Never miss a report — see earnings at a glance",
      description: "Comprehensive earnings calendar with alerts and historical data",
    },
    {
      icon: BarChart3,
      title: "Advanced Charts",
      tagline: "Professional tools, retail-friendly pricing",
      description: "TradingView integration with institutional-grade charting capabilities",
    },
    {
      icon: Bell,
      title: "Smart Alerts",
      tagline: "Price moves & earnings alerts delivered instantly",
      description: "Multi-channel notifications for price thresholds and market events",
    },
    {
      icon: BookOpen,
      title: "Trading Journal",
      tagline: "Track, analyze, and grow your edge",
      description: "Detailed trade logging with performance analytics and insights",
    },
  ];

  const testimonials = [
    {
      quote: "This is exactly what I needed — Bloomberg's power without the $24k/year price tag. Game changer.",
      author: "Michael Chen",
      role: "Day Trader",
    },
    {
      quote: "I used to juggle 5 different apps. Now it's all in one place. My productivity has doubled.",
      author: "Sarah Martinez",
      role: "Portfolio Manager",
    },
  ];

  const pricingTiers = [
    {
      name: "BASIC",
      subtitle: "Investor Starter",
      price: "$23.99",
      tagline: "Start simple. Perfect for new investors.",
      features: [
        "Aggregated News Feed",
        "Basic Earnings Calendar + Weekly Preview",
        "Company Snapshots (delayed price, filings)",
        "Embedded TradingView Charts",
        "1 Watchlist (15 symbols)",
        "Basic Price Alerts (2 per symbol, Email)",
        "Simple Trading Journal",
        "Small Learning Hub",
      ],
      cta: "Start Free",
      highlighted: false,
    },
    {
      name: "PRO",
      subtitle: "Active Trader",
      price: "$49.99",
      tagline: "Most Popular. Everything serious traders need — for less than $2/day.",
      features: [
        "Everything in Basic",
        "Multi-Watchlists (5 lists, 50 symbols each)",
        "Basic Screener (fundamentals & price action)",
        "Earnings Summaries (TL;DR highlights)",
        "Expanded Alerts (10 per symbol, Email + In-app)",
        "Trading Journal Templates + Basic Stats",
        "AI Report Analysis",
      ],
      cta: "Start Free Trial",
      highlighted: true,
    },
    {
      name: "ELITE",
      subtitle: "HUB Elite",
      price: "$89.99",
      tagline: "For power users who want it all.",
      features: [
        "Everything in Pro",
        "Track Top Investors & Traders",
        "Roadmap Voting Access",
        "Coming: Real-time L1/Options data",
        "Coming: TradingView White-label",
        "Coming: Options Flow / Dark Pool data",
        "Coming: Real-time algorithmic alerts",
      ],
      cta: "Start Free Trial",
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        
        {/* Gold glow effects */}
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
        
        {/* Abstract chart lines decoration */}
        <div className="absolute top-40 right-10 w-96 h-72 opacity-[0.03]">
          <svg viewBox="0 0 300 250" className="w-full h-full">
            <path d="M 0 150 Q 50 100 100 120 T 200 80 T 300 60" stroke="currentColor" strokeWidth="4" fill="none" className="text-primary" />
            <path d="M 0 180 Q 50 140 100 150 T 200 110 T 300 90" stroke="currentColor" strokeWidth="3" fill="none" className="text-primary" opacity="0.6" />
            <circle cx="100" cy="120" r="6" fill="currentColor" className="text-success" />
            <circle cx="200" cy="80" r="6" fill="currentColor" className="text-primary" />
          </svg>
        </div>
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-block">
                <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
                  The Bloomberg for Retail Investors
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                The <span className="gradient-premium bg-clip-text text-transparent">HUB</span> for Traders & Investors
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground">
                Institutional-grade workflow, without the Bloomberg price tag
              </p>
              <p className="text-lg text-muted-foreground">
                Everything you need in one sleek platform. Stop juggling multiple apps — news, earnings, charts, alerts, and your trading journal, all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="glow-primary text-lg h-14 px-8">
                  <Link to="/signup">
                    Start Free <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" asChild className="text-lg h-14 px-8">
                  <Link to="/pricing">See Pricing</Link>
                </Button>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>14-day free trial</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-2xl blur-3xl" />
              <img 
                src={heroDashboard} 
                alt="Trading Dashboard Preview" 
                className="relative rounded-2xl shadow-premium border border-primary/10 hover:border-primary/30 transition-smooth"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 gradient-section-features relative overflow-hidden">
        {/* Geometric grid pattern */}
        <div className="absolute inset-0 pattern-grid opacity-30" />
        
        {/* Abstract candlestick patterns */}
        <div className="absolute bottom-10 left-10 w-96 h-64 opacity-[0.04]">
          <svg viewBox="0 0 300 200" className="w-full h-full">
            <rect x="30" y="80" width="15" height="60" fill="currentColor" className="text-success" />
            <line x1="37.5" y1="60" x2="37.5" y2="140" stroke="currentColor" strokeWidth="2" className="text-success" />
            <rect x="80" y="100" width="15" height="40" fill="currentColor" className="text-destructive" />
            <line x1="87.5" y1="80" x2="87.5" y2="140" stroke="currentColor" strokeWidth="2" className="text-destructive" />
            <rect x="130" y="70" width="15" height="70" fill="currentColor" className="text-success" />
            <line x1="137.5" y1="50" x2="137.5" y2="150" stroke="currentColor" strokeWidth="2" className="text-success" />
            <rect x="180" y="90" width="15" height="50" fill="currentColor" className="text-success" />
            <line x1="187.5" y1="70" x2="187.5" y2="150" stroke="currentColor" strokeWidth="2" className="text-success" />
            <rect x="230" y="110" width="15" height="30" fill="currentColor" className="text-destructive" />
            <line x1="237.5" y1="90" x2="237.5" y2="150" stroke="currentColor" strokeWidth="2" className="text-destructive" />
          </svg>
        </div>
        
        {/* Diagonal chart decoration top right */}
        <div className="absolute top-20 right-10 w-[500px] h-80 opacity-[0.04]">
          <svg viewBox="0 0 400 300" className="w-full h-full">
            <path d="M 0 250 L 50 200 L 100 220 L 150 160 L 200 180 L 250 120 L 300 140 L 350 80 L 400 100" 
                  stroke="currentColor" strokeWidth="4" fill="none" className="text-primary" />
            <path d="M 0 260 L 50 210 L 100 230 L 150 170 L 200 190 L 250 130 L 300 150 L 350 90 L 400 110" 
                  stroke="currentColor" strokeWidth="2" fill="none" className="text-primary" opacity="0.5" />
          </svg>
        </div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Everything you need to trade smarter</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Replace the chaos of multiple apps with one powerful platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="p-8 bg-card border-border hover:border-primary/30 transition-smooth cursor-pointer group shadow-premium hover:shadow-[0_8px_30px_hsl(220_30%_60%/0.15)]"
                >
                  <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-smooth shadow-lg">
                    <Icon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-primary group-hover:underline decoration-2 underline-offset-4 transition-smooth">{feature.title}</h3>
                  <p className="text-foreground/80 font-medium mb-2">{feature.tagline}</p>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-24 px-4 gradient-section-testimonials relative overflow-hidden">
        {/* Glowing accent orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary/6 rounded-full blur-[120px]" />
        </div>
        
        {/* Financial graph decoration left side */}
        <div className="absolute top-40 left-10 w-80 h-60 opacity-[0.04]">
          <svg viewBox="0 0 250 200" className="w-full h-full">
            <path d="M 10 180 L 40 140 L 70 150 L 100 100 L 130 120 L 160 70 L 190 90 L 220 40" 
                  stroke="currentColor" strokeWidth="3" fill="none" className="text-primary" />
            <circle cx="100" cy="100" r="5" fill="currentColor" className="text-primary" />
            <circle cx="160" cy="70" r="5" fill="currentColor" className="text-success" />
            <circle cx="220" cy="40" r="5" fill="currentColor" className="text-primary" />
          </svg>
        </div>
        
        {/* Candlestick decoration right side */}
        <div className="absolute bottom-20 right-10 w-72 h-56 opacity-[0.04]">
          <svg viewBox="0 0 200 160" className="w-full h-full">
            <rect x="20" y="60" width="12" height="50" fill="currentColor" className="text-success" />
            <line x1="26" y1="45" x2="26" y2="110" stroke="currentColor" strokeWidth="2" className="text-success" />
            <rect x="60" y="80" width="12" height="35" fill="currentColor" className="text-destructive" />
            <line x1="66" y1="65" x2="66" y2="115" stroke="currentColor" strokeWidth="2" className="text-destructive" />
            <rect x="100" y="50" width="12" height="65" fill="currentColor" className="text-success" />
            <line x1="106" y1="35" x2="106" y2="125" stroke="currentColor" strokeWidth="2" className="text-success" />
            <rect x="140" y="70" width="12" height="45" fill="currentColor" className="text-success" />
            <line x1="146" y1="55" x2="146" y2="120" stroke="currentColor" strokeWidth="2" className="text-success" />
          </svg>
        </div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16 animate-fade-in-up">
            <div className="flex items-center justify-center gap-2 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 fill-primary text-primary" />
              ))}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by thousands of traders worldwide</h2>
            <p className="text-muted-foreground">Join the community of serious traders who've made the switch</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-8 bg-muted/30 border-border/50 rounded-2xl shadow-premium hover:shadow-[0_8px_30px_hsl(220_30%_60%/0.15)] transition-smooth">
                <div className="flex items-center gap-2 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <Quote className="h-10 w-10 text-primary/40 mb-4" />
                <p className="text-lg mb-6 leading-relaxed text-foreground/90">{testimonial.quote}</p>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-premium" />
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-center gap-12 opacity-50 grayscale">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 w-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-24 px-4 gradient-section-pricing relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 pattern-grid opacity-30" />
        
        {/* Diagonal golden accent lines */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-primary/15 to-transparent" />
        
        {/* Financial chart decoration left */}
        <div className="absolute top-20 left-10 w-80 h-56 opacity-[0.04]">
          <svg viewBox="0 0 250 180" className="w-full h-full">
            <path d="M 10 160 L 40 120 L 70 130 L 100 80 L 130 100 L 160 50 L 190 70 L 220 30" 
                  stroke="currentColor" strokeWidth="4" fill="none" className="text-primary" />
            <path d="M 10 170 L 40 130 L 70 140 L 100 90 L 130 110 L 160 60 L 190 80 L 220 40" 
                  stroke="currentColor" strokeWidth="2" fill="none" className="text-primary" opacity="0.5" />
          </svg>
        </div>
        
        {/* Abstract market data decoration right */}
        <div className="absolute bottom-20 right-10 w-96 h-64 opacity-[0.04]">
          <svg viewBox="0 0 300 200" className="w-full h-full">
            <path d="M 20 100 L 60 80 L 100 110 L 140 60 L 180 90 L 220 50 L 260 70" 
                  stroke="currentColor" strokeWidth="3" fill="none" className="text-primary" />
            <rect x="30" y="120" width="10" height="40" fill="currentColor" className="text-success" opacity="0.8" />
            <line x1="35" y1="105" x2="35" y2="160" stroke="currentColor" strokeWidth="1.5" className="text-success" />
            <rect x="80" y="140" width="10" height="25" fill="currentColor" className="text-destructive" opacity="0.8" />
            <line x1="85" y1="125" x2="85" y2="165" stroke="currentColor" strokeWidth="1.5" className="text-destructive" />
          </svg>
        </div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Affordable access to institutional-grade tools</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional trading infrastructure for a fraction of Bloomberg's cost
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <div key={index} className="relative">
                {tier.highlighted && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10 px-6 py-2 bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-bold rounded-full shadow-premium">
                    ⭐ MOST POPULAR
                  </div>
                )}
                <Card
                  className={`p-8 h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-premium ${
                    tier.highlighted
                      ? "border-2 border-primary/30 shadow-[0_0_0_1px_hsl(var(--primary)/0.1)] glow-best-value"
                      : "border-border hover:border-primary/20 shadow-premium"
                  }`}
                >
                  <div className="text-center mb-8 mt-2">
                    <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground mb-6">{tier.subtitle}</p>
                    <div className="mb-4">
                      <div className="text-6xl font-bold mb-1 text-primary">
                        {tier.price}
                      </div>
                      <p className="text-sm text-muted-foreground">per month</p>
                    </div>
                    <p className="text-sm text-foreground/80 font-medium px-2">{tier.tagline}</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    size="lg"
                    className={`w-full ${tier.highlighted ? "glow-primary" : ""}`}
                    variant={tier.highlighted ? "default" : "secondary"}
                  >
                    <Link to="/signup">{tier.cta}</Link>
                  </Button>
                </Card>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/pricing" className="text-primary hover:underline font-medium">
              View full pricing details & comparison →
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <Card className="relative overflow-hidden p-16 border-primary/30">
            <div className="absolute inset-0 gradient-hero" />
            <div className="relative max-w-3xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to transform your trading workflow?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of traders who've already made the switch to institutional-grade tools
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="glow-primary text-lg h-14 px-8">
                  <Link to="/signup">
                    Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" asChild className="text-lg h-14 px-8">
                  <Link to="/contact">Talk to Sales</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-6">
                14-day free trial • Cancel anytime
              </p>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Home;
