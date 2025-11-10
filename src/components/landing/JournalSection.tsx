import { Link } from 'react-router-dom';
import { 
  Table, 
  LineChart, 
  Tag, 
  Upload, 
  Camera,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const journalFeatures = [
  { icon: Table, title: 'Trade Management', description: 'Log and organize all your trades' },
  { icon: LineChart, title: 'Equity Curve', description: 'Visualize your performance over time' },
  { icon: TrendingUp, title: 'Analytics Dashboard', description: 'Win rate, P&L, and key metrics' },
  { icon: Tag, title: 'Custom Tags', description: 'Organize trades with custom categories' },
  { icon: Upload, title: 'CSV Import/Export', description: 'Migrate data easily' },
  { icon: Camera, title: 'Screenshots', description: 'Attach trade screenshots' },
  { icon: Calendar, title: 'Calendar View', description: 'Timeline of your trading activity' },
];

export function JournalSection() {
  return (
    <section id="journal" className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-base-800/50 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      
      <div className="container mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Features */}
          <div className="space-y-8 animate-slide-up">
            <div className="inline-block">
              <span className="bg-gradient-to-r from-gold/30 to-gold/10 text-gold text-sm font-bold px-4 py-2 rounded-full border border-gold/30 shadow-glow-gold">
                ADD-ON: +$15/MO
              </span>
            </div>
            
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Trading <span className="text-gradient-gold">Journal</span> built for pros
            </h2>
            
            <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed">
              Track every trade, analyze performance, and sharpen your edge with a journal designed for serious traders.
            </p>

            <ul className="space-y-5">
              {journalFeatures.map((feature, index) => (
                <li key={index} className="flex items-start space-x-4 group">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center flex-shrink-0 group-hover:from-gold/30 group-hover:to-gold/10 transition-all duration-300 border border-gold/10">
                    <feature.icon className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Button size="lg" variant="outline" asChild className="hover-glow border-gold/30 hover:border-gold/50 text-lg h-14 px-8">
              <Link to="/auth/register">Explore the Journal</Link>
            </Button>
          </div>

          {/* Right: Enhanced Visual */}
          <div className="relative animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-gold/10 via-gold/5 to-transparent rounded-3xl blur-3xl opacity-50" />
            
            <Card className="relative glass-card border-gold/20 shadow-luxury">
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Equity curve with animation */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-bold">Equity Curve</h4>
                      <span className="text-sm text-emerald font-semibold">+42.3%</span>
                    </div>
                    <div className="h-48 bg-gradient-to-b from-base-900/80 to-base-800/50 rounded-xl relative overflow-hidden border border-gold/10 p-4">
                      <svg className="w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="equityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="hsl(45, 90%, 55%)" stopOpacity="0.3"/>
                            <stop offset="100%" stopColor="hsl(45, 90%, 55%)" stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,140 L50,120 L100,100 L150,90 L200,70 L250,65 L300,50 L350,40 L400,30"
                          fill="url(#equityGradient)"
                          stroke="none"
                        />
                        <path
                          d="M0,140 L50,120 L100,100 L150,90 L200,70 L250,65 L300,50 L350,40 L400,30"
                          fill="none"
                          stroke="hsl(45, 90%, 55%)"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <circle cx="400" cy="30" r="4" fill="hsl(45, 90%, 55%)" className="animate-glow-pulse" />
                      </svg>
                    </div>
                  </div>

                  {/* Enhanced trade stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-xl glass-card border border-gold/10 hover:border-emerald/30 transition-all group">
                      <div className="text-sm text-muted-foreground mb-2">Win Rate</div>
                      <div className="text-3xl font-bold text-emerald group-hover:scale-105 transition-transform">64.5%</div>
                    </div>
                    <div className="p-5 rounded-xl glass-card border border-gold/10 hover:border-gold/30 transition-all group">
                      <div className="text-sm text-muted-foreground mb-2">Profit Factor</div>
                      <div className="text-3xl font-bold text-gold group-hover:scale-105 transition-transform">2.3</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
    </section>
  );
}
