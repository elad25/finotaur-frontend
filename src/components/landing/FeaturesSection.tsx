import { 
  Globe, 
  BarChart3, 
  Search, 
  Calendar, 
  Bell, 
  TrendingUp,
  Database,
  LineChart
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Globe,
    title: 'All-Markets Overview',
    description: 'Unified dashboard across stocks, crypto, forex, futures, and commodities.',
  },
  {
    icon: BarChart3,
    title: 'Multi-Asset Dashboards',
    description: 'Deep-dive into any asset class with real-time data and analytics.',
  },
  {
    icon: Search,
    title: 'Screeners & Reports',
    description: 'Filter and discover opportunities with advanced screening tools.',
  },
  {
    icon: Calendar,
    title: 'Economic & Earnings Calendars',
    description: 'Never miss critical market events, earnings, or macro releases.',
  },
  {
    icon: Bell,
    title: 'Smart Alerts',
    description: 'Get notified on price movements, news, and custom conditions.',
  },
  {
    icon: TrendingUp,
    title: 'Advanced Charts',
    description: 'TradingView-ready charting with technical indicators and drawing tools.',
  },
  {
    icon: Database,
    title: 'Historical Data',
    description: 'Access years of historical data for backtesting and analysis.',
  },
  {
    icon: LineChart,
    title: 'Performance Tracking',
    description: 'Monitor your portfolio and track performance across all assets.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 relative">
      {/* Section divider with gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      
      <div className="container mx-auto">
        <div className="text-center mb-20 space-y-6 animate-slide-up">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            Everything you need to{' '}
            <span className="text-gradient-gold">stay ahead</span>
          </h2>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Professional-grade tools designed for serious traders and investors.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group relative overflow-hidden border-gold/10 hover:border-gold/40 transition-all duration-300 hover-glow glass-card animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Shine effect on hover */}
              <div className="absolute inset-0 gradient-shine opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <CardContent className="relative p-8 space-y-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center group-hover:from-gold/30 group-hover:to-gold/10 transition-all duration-300 group-hover:scale-110 border border-gold/10">
                  <feature.icon className="h-7 w-7 text-gold" />
                </div>
                <h3 className="text-lg font-bold tracking-tight">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Bottom divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
    </section>
  );
}
