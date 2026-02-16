// src/pages/AboutPage.tsx
import { Link } from 'react-router-dom';
import { Target, Users, Zap, Shield, TrendingUp, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/landing-new/Navbar';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-28 pb-16 max-w-6xl">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-yellow-500 to-primary bg-clip-text text-transparent">
            About Finotaur
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Empowering traders worldwide with intelligent analytics and comprehensive trading journal solutions
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-card border border-border rounded-2xl p-8 md:p-12 mb-16">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                At Finotaur, we believe that every trader deserves access to professional-grade tools that provide clarity, insights, and actionable intelligence. Our mission is to transform raw trading data into meaningful insights that help traders understand their performance, identify patterns, and make informed decisions with confidence.
              </p>
            </div>
          </div>
        </div>

        {/* What We Do */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">What We Do</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Comprehensive Trade Tracking</h3>
                  <p className="text-muted-foreground">
                    Log and analyze every trade with detailed metrics including P&L, R-multiples, win rates, and custom tags. Our platform supports stocks, options, futures, forex, and crypto.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">AI-Powered Insights</h3>
                  <p className="text-muted-foreground">
                    Leverage advanced AI to identify behavioral patterns, detect emotional biases, and receive personalized recommendations for improving your trading discipline.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Strategy Performance Analysis</h3>
                  <p className="text-muted-foreground">
                    Track multiple trading strategies simultaneously, compare their performance, and understand which approaches work best in different market conditions.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Enterprise-Grade Security</h3>
                  <p className="text-muted-foreground">
                    Your trading data is encrypted and stored securely. We implement industry-leading security practices to protect your sensitive financial information.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Our Story */}
        <div className="bg-card border border-border rounded-2xl p-8 md:p-12 mb-16">
          <h2 className="text-3xl font-bold mb-6">Our Story</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Finotaur was born from a simple observation: most traders spend countless hours analyzing markets but very little time analyzing themselves. We recognized that sustainable trading success comes not just from finding good trades, but from understanding your own decision-making patterns and continuously improving your process.
            </p>
            <p>
              Traditional trading journals were either too simplistic (basic spreadsheets) or too complex (overwhelming professional platforms). We set out to create something different – a platform that combines the depth of professional analytics with the accessibility and user experience of modern SaaS applications.
            </p>
            <p>
              Today, Finotaur serves traders across the globe, from retail traders just starting their journey to professional traders managing significant capital. Our platform has logged millions of trades and helped thousands of traders gain clarity on their performance.
            </p>
          </div>
        </div>

        {/* Our Values */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">User-Centric</h3>
              <p className="text-muted-foreground">
                Every feature we build starts with understanding our users' needs and challenges. Your success is our success.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Transparency</h3>
              <p className="text-muted-foreground">
                We believe in honest communication, clear pricing, and transparent operations. No hidden fees, no surprises.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Innovation</h3>
              <p className="text-muted-foreground">
                We continuously evolve our platform with cutting-edge technology and AI to stay ahead of traders' needs.
              </p>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-8 md:p-12 mb-16">
          <h2 className="text-3xl font-bold mb-6">Built with Modern Technology</h2>
          <p className="text-lg text-muted-foreground mb-6">
            Finotaur is built on a robust, scalable technology stack designed for performance, security, and reliability:
          </p>
          <div className="grid md:grid-cols-2 gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>React & TypeScript frontend for responsive UX</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>PostgreSQL for reliable data storage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Real-time synchronization across devices</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>AI/ML models for behavioral analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Enterprise-grade encryption and security</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>99.9% uptime SLA</span>
            </div>
          </div>
        </div>

        {/* Vision for the Future */}
        <div className="bg-card border border-border rounded-2xl p-8 md:p-12 mb-16">
          <h2 className="text-3xl font-bold mb-6">Vision for the Future</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              We're just getting started. Our roadmap includes exciting features like automated broker integration, advanced portfolio analytics, social trading capabilities, and even more sophisticated AI-powered coaching.
            </p>
            <p>
              Our goal is to become the world's most trusted trading performance platform – a tool that every serious trader relies on to understand their edge, manage their psychology, and achieve consistent profitability.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-primary/10 to-yellow-500/10 border border-primary/20 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Join Thousands of Traders</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start your journey to becoming a more disciplined, profitable trader with Finotaur's comprehensive analytics platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="gap-2 min-w-[200px]">
                Start Free Trial
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="gap-2 min-w-[200px]">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;