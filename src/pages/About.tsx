import { Card } from "@/components/ui/card";

const About = () => {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">About TraderHUB</h1>
        <p className="text-xl text-muted-foreground mb-12">
          Building the trading platform we always wanted
        </p>

        <div className="space-y-8">
          <Card className="p-8 bg-card border-border">
            <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              We believe professional-grade trading tools shouldn't come with a
              Bloomberg-sized price tag. TraderHUB brings institutional-quality
              workflows to individual traders and investors at a fraction of the cost.
            </p>
          </Card>

          <Card className="p-8 bg-card border-border">
            <h2 className="text-2xl font-bold mb-4">Why We Built This</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              After years of juggling multiple platforms, subscriptions, and tools, we
              realized there had to be a better way. Traders were paying hundreds per
              month for scattered services that didn't talk to each other.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              TraderHUB unifies everything you need: news, earnings, charts, alerts,
              and a powerful journal—all in one place, with a clean interface that
              actually makes sense.
            </p>
          </Card>

          <Card className="p-8 bg-card border-border">
            <h2 className="text-2xl font-bold mb-4">What's Next</h2>
            <p className="text-muted-foreground leading-relaxed">
              We're constantly shipping new features based on community feedback.
              Real-time data feeds, broker integrations, and advanced analytics are all
              on the roadmap. Elite members get to vote on what we build next.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default About;
