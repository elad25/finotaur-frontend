import { Calendar, TrendingUp, FileText, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Calendar,
    title: 'Unified Macro Calendar',
    description: 'All major economic events, FOMC meetings, GDP releases in one place.',
  },
  {
    icon: TrendingUp,
    title: 'Rates & Yields',
    description: 'Track bond yields, interest rates, and inflation indicators.',
  },
  {
    icon: Globe,
    title: 'Global Events',
    description: 'CPI, unemployment, PMI data from major economies worldwide.',
  },
  {
    icon: FileText,
    title: 'AI Summaries',
    description: 'Get instant summaries of IMF, Fed, ECB, and central bank reports.',
  },
];

const timelineData = [
  { time: '08:30 AM', date: 'Today', title: 'US CPI Report', impact: 'High' },
  { time: '10:00 AM', date: 'Today', title: 'Consumer Sentiment', impact: 'Medium' },
  { time: '02:00 PM', date: 'Today', title: 'FOMC Minutes', impact: 'High' },
  { time: '04:30 PM', date: 'Today', title: 'Oil Inventories', impact: 'Low' },
];

export function MacroSection() {
  return (
    <section id="macro" className="py-32 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      
      <div className="container mx-auto">
        <div className="text-center mb-20 space-y-6 animate-slide-up">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            <span className="text-gradient-gold">Macro & News</span> at your fingertips
          </h2>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Unified macro calendar, rates, yields, and AI-summarized reports from IMF, Fed, and ECB.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
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

        {/* Enhanced Timeline */}
        <Card className="relative glass-card border-gold/20 max-w-5xl mx-auto shadow-luxury animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <CardContent className="p-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold">Upcoming Economic Events</h3>
              <Badge className="bg-gold/20 text-gold border-gold/30">Live Updates</Badge>
            </div>
            
            <div className="space-y-3">
              {timelineData.map((event, index) => (
                <div 
                  key={index} 
                  className="group flex items-start space-x-6 p-5 rounded-xl glass-card border border-gold/10 hover:border-gold/30 transition-all duration-300 hover-glow"
                >
                  <div className="text-center flex-shrink-0 min-w-[80px]">
                    <div className="text-xs text-muted-foreground mb-1">{event.time}</div>
                    <div className="text-base font-bold text-gold">{event.date}</div>
                  </div>
                  
                  {/* Vertical line */}
                  <div className="flex-shrink-0 w-px h-full bg-gradient-to-b from-gold/50 to-gold/10 self-stretch" />
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg mb-1 group-hover:text-gold transition-colors">{event.title}</h4>
                    <p className="text-sm text-muted-foreground">{event.impact} impact expected</p>
                  </div>
                  
                  <Badge 
                    variant={event.impact === 'High' ? 'default' : 'secondary'}
                    className={cn(
                      "flex-shrink-0",
                      event.impact === 'High' && "bg-gold/20 text-gold border-gold/30"
                    )}
                  >
                    {event.impact}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
    </section>
  );
}
