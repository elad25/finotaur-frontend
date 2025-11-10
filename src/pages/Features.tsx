import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Calendar,
  BarChart3,
  Bell,
  BookOpen,
  Search,
  ArrowRight,
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: TrendingUp,
      title: "News & Earnings",
      description:
        "Stay informed with aggregated market news, earnings summaries, and company snapshots. Filter by watchlist, sector, or importance.",
      benefits: [
        "Aggregated news from multiple sources",
        "Earnings calendar with TL;DR summaries",
        "Company snapshots with links to filings",
        "Filter by importance and relevance",
      ],
    },
    {
      icon: Search,
      title: "Watchlists",
      description:
        "Organize your investment universe with customizable watchlists. Track prices, changes, and get instant updates.",
      benefits: [
        "Create up to 5 watchlists (Pro)",
        "Track up to 50 symbols per list",
        "Real-time price updates",
        "Quick add from screener or news",
      ],
    },
    {
      icon: Bell,
      title: "Smart Alerts",
      description:
        "Never miss an opportunity. Set price, percentage, or earnings alerts with multiple delivery channels.",
      benefits: [
        "Price threshold alerts",
        "Percentage change notifications",
        "Earnings upcoming reminders",
        "Email and in-app delivery",
      ],
    },
    {
      icon: BookOpen,
      title: "Trading Journal",
      description:
        "Track every trade, analyze your performance, and identify patterns. Learn from your wins and losses.",
      benefits: [
        "Detailed trade tracking",
        "Win rate and R:R analytics",
        "Monthly P&L curves",
        "Tags and notes for context",
      ],
    },
    {
      icon: Search,
      title: "Stock Screener",
      description:
        "Find opportunities with our powerful screener. Filter by sector, market cap, performance, and fundamentals.",
      benefits: [
        "Sector and market cap filters",
        "Daily performance metrics",
        "P/E and growth filters (Pro)",
        "Save custom screens (coming soon)",
      ],
    },
    {
      icon: BarChart3,
      title: "Professional Charts",
      description:
        "TradingView integration gives you institutional-grade charting with dozens of indicators and drawing tools.",
      benefits: [
        "Full TradingView integration",
        "Multiple timeframes",
        "Technical indicators",
        "Multi-chart layouts (Pro)",
      ],
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Professional tools for serious traders
          </h1>
          <p className="text-xl text-muted-foreground">
            Everything you need in one platform. No more switching between apps.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="p-8 bg-card border-border hover:border-primary transition-smooth"
              >
                <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground mb-6">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 mr-3" />
                      <span className="text-sm text-muted-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        {/* CTA */}
        <div className="max-w-2xl mx-auto text-center">
          <Card className="p-12 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Start free and upgrade as you grow
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="glow-primary">
                <Link to="/signup">
                  Start Free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Features;
