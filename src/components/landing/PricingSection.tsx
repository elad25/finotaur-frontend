import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'FREE',
    price: 0,
    featured: false,
    features: [
      { text: 'Basic dashboards (limited)', included: true },
      { text: '1 watchlist', included: true },
      { text: 'Delayed data (15min)', included: true },
      { text: 'AI Insights', included: false },
      { text: 'Advanced screeners', included: false },
    ],
  },
  {
    name: 'PRO',
    price: 49,
    featured: true,
    features: [
      { text: 'All dashboards & asset classes', included: true },
      { text: 'Real-time data', included: true },
      { text: 'AI Insights & Forecasts', included: true },
      { text: 'Unlimited watchlists', included: true },
      { text: 'Advanced screeners & reports', included: true },
      { text: 'Macro calendar', included: true },
    ],
  },
  {
    name: 'ELITE',
    price: 99,
    featured: false,
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Copy Trade access', included: true },
      { text: 'Funding opportunities', included: true },
      { text: 'Advanced AI forecasts', included: true },
      { text: 'Priority support', included: true },
    ],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gold/5 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-gold rounded-full animate-float"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 20}%`,
              animationDelay: `${i * 0.5}s`
            }}
          />
        ))}
      </div>
      
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-20 space-y-6 animate-slide-up">
          <div className="inline-block">
            <div className="h-1 w-24 bg-gradient-to-r from-transparent via-gold to-transparent rounded-full mb-4" />
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            Simple, <span className="text-gradient-gold">transparent</span> pricing
          </h2>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Choose the plan that fits your trading style. Upgrade anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={cn(
                "group relative overflow-hidden transition-all duration-300 animate-slide-up",
                plan.featured 
                  ? "border-gold/50 shadow-luxury scale-105" 
                  : "border-gold/10 glass-card hover:border-gold/30"
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 gradient-shine opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {plan.featured && (
                <>
                  {/* Glow for featured plan */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-gold/30 via-gold/10 to-gold/30 rounded-xl blur-xl opacity-50 animate-glow-pulse" />
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-gold to-gold-600 text-primary-foreground text-sm font-bold px-4 py-2 rounded-bl-xl shadow-glow-gold">
                    POPULAR
                  </div>
                </>
              )}
              
              <CardContent className="relative p-10 space-y-8">
                <div>
                  <h3 className="text-2xl font-bold mb-3">{plan.name}</h3>
                  <div className="flex items-baseline">
                    <span className="text-5xl font-extrabold text-gradient-gold">${plan.price}</span>
                    <span className="text-muted-foreground ml-2 text-lg">/month</span>
                  </div>
                </div>

                <ul className="space-y-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start space-x-3">
                      {feature.included ? (
                        <div className="h-6 w-6 rounded-full bg-emerald/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-4 w-4 text-emerald" />
                        </div>
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <X className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className={cn(
                        "text-sm leading-relaxed",
                        !feature.included && "text-muted-foreground"
                      )}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button 
                  size="lg" 
                  variant={plan.featured ? "default" : "outline"}
                  asChild 
                  className={cn(
                    "w-full h-12 hover-glow",
                    plan.featured ? "shadow-glow-gold" : "border-gold/30 hover:border-gold/50"
                  )}
                >
                  <Link to="/auth/register">Start Free</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enhanced Journal Add-on */}
        <Card className="relative glass-card border-gold/20 max-w-4xl mx-auto shadow-luxury animate-slide-up overflow-hidden" style={{ animationDelay: '0.4s' }}>
          {/* Shine effect */}
          <div className="absolute inset-0 gradient-shine opacity-30" />
          
          <CardContent className="relative p-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-3xl font-extrabold mb-3">Trading Journal Add-on</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Add powerful trading journal features to any plan for just{' '}
                  <span className="text-gradient-gold font-bold text-xl">$15/month</span>.
                </p>
              </div>
              <Button size="lg" variant="outline" asChild className="hover-glow border-gold/30 hover:border-gold/50 h-14 px-8 text-lg">
                <Link to="/auth/register">Add to Plan</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-muted-foreground mt-10 text-lg">
          Yearly billing discounts coming soon
        </p>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
    </section>
  );
}
