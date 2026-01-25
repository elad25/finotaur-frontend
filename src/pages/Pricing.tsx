import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check, Lock } from "lucide-react";

const Pricing = () => {
  const tiers = [
    {
      name: "BASIC",
      subtitle: "Investor Starter",
      price: "$23.99",
      period: "/month",
      tagline: "Start simple. Perfect for new investors.",
      description: "Perfect for getting started with market insights",
      features: [
        { text: "Aggregated News Feed", available: true },
        { text: "Earnings Calendar (basic)", available: true },
        { text: "Company Snapshots", available: true },
        { text: "TradingView Charts (free tier)", available: true },
        { text: "1 Watchlist (15 symbols)", available: true },
        { text: "2 Price Alerts per symbol", available: true },
        { text: "Simple Trading Journal", available: true },
        { text: "Email alerts only", available: true },
      ],
      locked: ["Advanced screeners", "Telegram/WhatsApp alerts", "Options data"],
      cta: "Start Free",
      highlighted: false,
    },
    {
      name: "PRO",
      subtitle: "Active Trader",
      price: "$49.99",
      period: "/month",
      tagline: "Most Popular. Everything serious traders need — for less than $2/day.",
      description: "For serious traders who need more power",
      features: [
        { text: "Everything in Basic", available: true },
        { text: "5 Watchlists (50 symbols each)", available: true },
        { text: "Basic Stock Screener", available: true },
        { text: "Earnings Summaries (TL;DR)", available: true },
        { text: "10 Alerts per symbol", available: true },
        { text: "In-app + Email alerts", available: true },
        { text: "Journal templates & stats", available: true },
        { text: "Win rate & R:R analytics", available: true },
      ],
      locked: ["Real-time L1 data", "Broker integrations", "Algorithmic alerts"],
      cta: "Start Pro Trial",
      highlighted: true,
    },
    {
      name: "ELITE",
      subtitle: "HUB Elite",
      price: "$89.99",
      period: "/month",
      tagline: "For power users who want it all.",
      description: "Maximum power for professional traders",
      features: [
        { text: "Everything in Pro", available: true },
        { text: "Bi-weekly Research Packs", available: true },
        { text: "Monthly live Q&A sessions", available: true },
        { text: "Priority support (≤24h)", available: true },
        { text: "Roadmap voting access", available: true },
        { text: "Unlimited watchlists", available: true },
        { text: "Advanced analytics", available: true },
        { text: "Export to CSV/PDF", available: true },
      ],
      locked: [
        "Real-time L1/Options (OPRA)",
        "Futures feeds",
        "Options flow data",
        "Dark pool activity",
      ],
      cta: "Start Elite Trial",
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 gradient-section-pricing relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 pattern-grid opacity-30" />
      
      {/* Abstract Financial Visuals */}
      <div className="absolute top-20 right-10 w-64 h-64 opacity-5">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <path d="M 20 180 L 50 120 L 80 140 L 110 80 L 140 100 L 170 40" stroke="currentColor" strokeWidth="3" fill="none" className="text-primary" />
          <circle cx="50" cy="120" r="4" fill="currentColor" className="text-primary" />
          <circle cx="80" cy="140" r="4" fill="currentColor" className="text-primary" />
          <circle cx="110" cy="80" r="4" fill="currentColor" className="text-primary" />
          <circle cx="140" cy="100" r="4" fill="currentColor" className="text-primary" />
        </svg>
      </div>
      
      <div className="container mx-auto relative z-10">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Choose your trading edge
          </h1>
          <p className="text-xl text-muted-foreground">
            Start free, upgrade anytime. All plans include core features.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16 max-w-6xl mx-auto">
          {tiers.map((tier, index) => (
            <div key={index} className="relative">
              {tier.highlighted && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10 px-6 py-2 bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-bold rounded-full shadow-premium">
                  ⭐ BEST VALUE
                </div>
              )}
              <Card
                className={`p-8 h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-premium ${
                  tier.highlighted
                    ? "border-2 border-primary/30 shadow-[0_0_0_1px_hsl(var(--primary)/0.1)] glow-best-value"
                    : "bg-card border-border hover:border-primary/20 shadow-premium"
                }`}
              >
                <div className="text-center mb-6 mt-2">
                  <h3 className="text-sm font-semibold text-primary mb-1">
                    {tier.name}
                  </h3>
                  <p className="text-xl font-medium text-muted-foreground mb-4">
                    {tier.subtitle}
                  </p>
                  <div className="flex items-baseline justify-center mb-2">
                    <span className="text-5xl font-bold text-primary">{tier.price}</span>
                    <span className="text-muted-foreground ml-2">{tier.period}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground/80 mb-2">{tier.tagline}</p>
                  <p className="text-xs text-muted-foreground">{tier.description}</p>
                </div>

                <Button
                  className={`w-full mb-6 ${
                    tier.highlighted ? "glow-primary" : ""
                  }`}
                  variant={tier.highlighted ? "default" : "secondary"}
                  asChild
                >
                  <Link to="/signup">{tier.cta}</Link>
                </Button>

                <div className="space-y-3 mb-6">
                  {tier.features.map((feature, i) => (
                    <div key={i} className="flex items-start">
                      <Check className="h-5 w-5 text-success mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature.text}</span>
                    </div>
                  ))}
                </div>

                {tier.locked.length > 0 && (
                  <div className="pt-6 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-3">
                      COMING SOON
                    </p>
                    <div className="space-y-2">
                      {tier.locked.map((feature, i) => (
                        <div key={i} className="flex items-start">
                          <Lock className="h-4 w-4 text-muted-foreground mr-3 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <Card className="p-6 bg-card border-border rounded-xl hover:border-primary/20 transition-smooth">
              <h3 className="font-semibold mb-2">What data latency can I expect?</h3>
              <p className="text-sm text-muted-foreground">
                Basic and Pro plans include delayed data (15-20 minutes). Real-time
                Level 1 data will be available with Elite plan in a future update.
              </p>
            </Card>
            <Card className="p-6 bg-card border-border rounded-xl hover:border-primary/20 transition-smooth">
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-sm text-muted-foreground">
                Yes. Cancel anytime with no penalties. Your plan remains active until
                the end of your billing period.
              </p>
            </Card>
<Card className="p-6 bg-card border-border rounded-xl hover:border-primary/20 transition-smooth">
              <h3 className="font-semibold mb-2">What's your refund policy?</h3>
              <p className="text-sm text-muted-foreground">
                Plans with a free trial are non-refundable. For plans without a trial,
                we offer a 7-day money-back guarantee from your first payment.
              </p>
            </Card>
            <Card className="p-6 bg-card border-border rounded-xl hover:border-primary/20 transition-smooth">
              <h3 className="font-semibold mb-2">How is my data protected?</h3>
              <p className="text-sm text-muted-foreground">
                All data is encrypted in transit and at rest. We never share your
                personal information or trading data with third parties.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
