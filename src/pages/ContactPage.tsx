// src/pages/ContactPage.tsx - UPDATED VERSION
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Hero */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-yellow-500 to-primary bg-clip-text text-transparent">
            Get in Touch
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Have questions? We're here to help. Reach out to our team and we'll get back to you as soon as possible.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* Email Card */}
          <div className="bg-card border border-border rounded-xl p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold mb-4">Email Us</h3>
                <p className="text-muted-foreground mb-4">
                  For general inquiries, support, or any questions about Finotaur, please contact us at:
                </p>
                <a 
                  href="mailto:support@finotaur.com" 
                  className="text-primary hover:underline text-lg font-medium"
                >
                  support@finotaur.com
                </a>
                <p className="text-sm text-muted-foreground mt-4">
                  We typically respond within 24 hours on business days.
                </p>
              </div>
            </div>
          </div>

          {/* Office Card */}
          <div className="bg-card border border-border rounded-xl p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold mb-4">Our Location</h3>
                <p className="text-muted-foreground mb-4">
                  Finotaur is proudly based in Israel, serving traders worldwide.
                </p>
                <div className="text-foreground">
                  <p className="font-medium">Finotaur Ltd.</p>
                  <p className="text-muted-foreground">Israel</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div>
          <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            
            {/* FAQ 1: Free Trial */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-lg mb-2">Do you offer a free trial?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! We offer a 14-day free trial with full Basic features. Start journaling immediately and explore everything Finotaur has to offer.
              </p>
            </div>

            {/* FAQ 2: Refund Policy */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-lg mb-2">What's your refund policy?</h3>
              <p className="text-sm text-muted-foreground">
                We offer a 7-day money-back guarantee for first-time subscribers. If you're not satisfied, contact us within 7 days for a full refund. Learn more in our{' '}
                <Link to="/legal/refund" className="text-primary hover:underline">
                  Refund Policy
                </Link>
                .
              </p>
            </div>

            {/* FAQ 3: Cancellation */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-lg mb-2">Can I cancel my subscription anytime?</h3>
              <p className="text-sm text-muted-foreground">
                Absolutely! You can cancel your subscription at any time from your account settings. There are no cancellation fees, and you'll retain access until the end of your billing period.
              </p>
            </div>

            {/* FAQ 4: Response Time */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-lg mb-2">What's your response time?</h3>
              <p className="text-sm text-muted-foreground">
                We aim to respond to all inquiries within 24 hours on business days. Premium users receive priority support with faster response times.
              </p>
            </div>

            {/* FAQ 5: Demo */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-lg mb-2">Can I schedule a demo?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! Contact us at support@finotaur.com to schedule a personalized demo of the platform with our team.
              </p>
            </div>

            {/* FAQ 6: Enterprise Plans */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-lg mb-2">Do you offer enterprise plans?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! For teams and institutions, we offer custom enterprise plans with dedicated support. Contact support@finotaur.com for more information.
              </p>
            </div>

          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-primary/10 to-yellow-500/10 border border-primary/20 rounded-2xl p-12 mt-16">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of traders using Finotaur to improve their trading performance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="gap-2 min-w-[200px]">
                Start Free Trial
              </Button>
            </Link>
            <a href="mailto:support@finotaur.com">
              <Button size="lg" variant="outline" className="gap-2 min-w-[200px]">
                Email Support
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;