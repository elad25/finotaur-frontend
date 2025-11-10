import { Brain, TrendingUp, AlertTriangle, BarChart2, FileText, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const aiFeatures = [
  { icon: Brain, title: 'Daily Summary', description: 'AI-powered market digest every morning' },
  { icon: FileText, title: 'Weekly Digest', description: 'Comprehensive weekly market analysis' },
  { icon: Activity, title: 'Sentiment Map', description: 'Real-time market sentiment tracking' },
  { icon: TrendingUp, title: 'Smart Forecasts', description: 'ML-driven price predictions' },
  { icon: AlertTriangle, title: 'Risk Breakdown', description: 'Portfolio risk analysis' },
  { icon: BarChart2, title: 'Pattern Detection', description: 'Identify technical patterns automatically' },
];

const sentimentData = [
  { date: 'Mon', value: 65 },
  { date: 'Tue', value: 72 },
  { date: 'Wed', value: 68 },
  { date: 'Thu', value: 78 },
  { date: 'Fri', value: 85 },
  { date: 'Sat', value: 80 },
  { date: 'Sun', value: 75 },
];

export function AISection() {
  return (
    <section id="ai" className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gold/5 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-20 space-y-6 animate-slide-up">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            <span className="text-gradient-gold">AI Insights</span> that scale your decision-making
          </h2>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            From daily summaries to deep forecasts, our AI engine processes market signals 24/7.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {aiFeatures.map((feature, index) => (
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

        {/* Enhanced AI Chart */}
        <Card className="border-gold/20 max-w-5xl mx-auto shadow-luxury glass-card animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <CardContent className="p-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold mb-2">Market Sentiment Tracker</h3>
                <p className="text-muted-foreground">Real-time AI analysis across 10,000+ sources</p>
              </div>
              <div className="flex gap-6">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                  <div className="text-2xl font-bold text-emerald">94.2%</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Confidence</div>
                  <div className="text-2xl font-bold text-gold">High</div>
                </div>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={sentimentData}>
                <defs>
                  <linearGradient id="sentiment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(45, 90%, 55%)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(45, 90%, 55%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.1} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--gold) / 0.3)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px hsl(var(--base-900) / 0.5)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(45, 90%, 55%)" 
                  strokeWidth={3}
                  fill="url(#sentiment)"
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
    </section>
  );
}
