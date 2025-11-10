import { Users, Trophy, TrendingUp, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Users,
    title: 'Discover Top Traders',
    description: 'Browse verified traders with transparent track records.',
  },
  {
    icon: Trophy,
    title: 'Leaderboards',
    description: 'See who\'s performing best across different strategies.',
  },
  {
    icon: TrendingUp,
    title: 'Strategy Analysis',
    description: 'Deep dive into trading patterns and risk profiles.',
  },
  {
    icon: Shield,
    title: 'Risk Controls',
    description: 'Set your own limits and manage exposure automatically.',
  },
];

const leaderboardData = [
  { name: 'Alex M.', followers: '2.3k', return: '+142%', trades: '248' },
  { name: 'Sarah L.', followers: '1.8k', return: '+118%', trades: '192' },
  { name: 'Mike T.', followers: '1.5k', return: '+95%', trades: '156' },
];

export function CopyTradeSection() {
  return (
    <section id="copytrade" className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gold/5 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-20 space-y-6 animate-slide-up">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            <span className="text-gradient-gold">Copy Trade</span> from the best
          </h2>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Discover top traders, proven strategies, and leaderboards.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group relative overflow-hidden glass-card border-gold/10 hover:border-gold/40 transition-all duration-300 hover-glow animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
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

        {/* Enhanced Leaderboard */}
        <Card className="relative glass-card border-gold/20 max-w-5xl mx-auto shadow-luxury animate-slide-up overflow-hidden" style={{ animationDelay: '0.4s' }}>
          {/* Header glow */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-gold/5 to-transparent" />
          
          <CardContent className="relative p-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold">Top Traders This Month</h3>
              <Badge className="bg-emerald/20 text-emerald border-emerald/30">Live Rankings</Badge>
            </div>
            
            <div className="space-y-3">
              {leaderboardData.map((trader, index) => (
                <div 
                  key={index}
                  className="group flex items-center justify-between p-5 rounded-xl glass-card border border-gold/10 hover:border-gold/30 transition-all duration-300 hover-glow"
                >
                  <div className="flex items-center space-x-5">
                    <div className={cn(
                      "h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg border-2 transition-all duration-300",
                      index === 0 && "bg-gradient-to-br from-gold/30 to-gold/10 border-gold/50 shadow-glow-gold",
                      index > 0 && "bg-gold/10 border-gold/20"
                    )}>
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg group-hover:text-gold transition-colors">{trader.name}</h4>
                      <p className="text-sm text-muted-foreground">{trader.followers} followers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-emerald mb-1">{trader.return}</div>
                    <p className="text-xs text-muted-foreground">{trader.trades} trades</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-12 animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <Badge variant="outline" className="border-gold/30 text-gold text-sm px-4 py-2">
            Available on Elite Plan
          </Badge>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
    </section>
  );
}
