import { Link } from 'react-router-dom';
import { Link2, Shield, Zap, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Link2,
    title: 'Connect Brokers & Exchanges',
    description: 'Securely link your trading accounts via API.',
  },
  {
    icon: Shield,
    title: 'Permission Management',
    description: 'Granular control over what data you share.',
  },
  {
    icon: Zap,
    title: 'Cash Advance Simulator',
    description: 'Preview funding opportunities based on your performance.',
  },
  {
    icon: FileText,
    title: 'Transaction Exports',
    description: 'Download statements and reports for tax purposes.',
  },
];

export function FundingSection() {
  return (
    <section id="funding" className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gold/5 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-20 space-y-6 animate-slide-up">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            <span className="text-gradient-gold">Funding</span> & Account Management
          </h2>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Connect your brokers, manage permissions, and explore funding opportunities—all in one place.
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

        <div className="text-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <Card className="relative inline-block glass-card border-gold/20 max-w-3xl shadow-luxury overflow-hidden">
            <div className="absolute inset-0 gradient-shine opacity-20" />
            
            <CardContent className="relative p-10 space-y-6">
              <h3 className="text-3xl font-extrabold">Ready to connect your accounts?</h3>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
                Link your broker or exchange securely and start exploring funding opportunities.
              </p>
              <Button size="lg" variant="outline" asChild className="hover-glow border-gold/30 hover:border-gold/50 h-14 px-8 text-lg">
                <Link to="/auth/register">
                  Connect Your Account
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
    </section>
  );
}
