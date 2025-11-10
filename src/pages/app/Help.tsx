import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  BookOpen, 
  MessageCircle, 
  Mail, 
  Search,
  HelpCircle,
  FileText,
  Activity
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const Help = () => {
  const faqs = [
    {
      question: "What data latency can I expect?",
      answer: "Basic and Pro plans include delayed data (15-20 minutes). Real-time Level 1 data will be available with Elite plan in a future update."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes! You can cancel your subscription at any time with no penalties. Your plan will remain active until the end of your billing period."
    },
    {
      question: "What's your refund policy?",
      answer: "We offer a 7-day money-back guarantee on all plans. If you're not satisfied with TraderHUB, contact us within 7 days for a full refund."
    },
    {
      question: "How many watchlists can I create?",
      answer: "Basic plan includes 1 watchlist (15 symbols), Pro plan includes 5 watchlists (50 symbols each), and Elite plan offers unlimited watchlists."
    },
    {
      question: "Do you support mobile devices?",
      answer: "Yes! TraderHUB is fully responsive and works great on mobile devices. A native mobile app is planned for future release."
    },
    {
      question: "How do I set up price alerts?",
      answer: "Navigate to the Alerts page, click 'New Alert', select your symbol, choose alert type (price, %, earnings), and set your conditions. You'll receive notifications via your chosen delivery method."
    },
  ];

  const resources = [
    {
      icon: BookOpen,
      title: "Documentation",
      description: "Comprehensive guides and tutorials",
      link: "#"
    },
    {
      icon: FileText,
      title: "API Reference",
      description: "Developer documentation and endpoints",
      link: "#"
    },
    {
      icon: Activity,
      title: "System Status",
      description: "Real-time platform health monitoring",
      link: "#"
    },
  ];

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">Help & Support</h1>
        <p className="text-muted-foreground">
          Find answers or get in touch with our team
        </p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search for help articles, guides, and FAQs..." 
            className="pl-12 h-14 text-lg"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {resources.map((resource, idx) => {
          const Icon = resource.icon;
          return (
            <Card key={idx} className="p-6 hover:border-primary/50 transition-smooth cursor-pointer">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2">{resource.title}</h3>
              <p className="text-sm text-muted-foreground">{resource.description}</p>
            </Card>
          );
        })}
      </div>

      {/* FAQs */}
      <Card className="p-8 mb-12">
        <div className="flex items-center gap-3 mb-6">
          <HelpCircle className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`}>
              <AccordionTrigger className="text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>

      {/* Contact Form */}
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Contact Support</h2>
          </div>
          
          <form className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Your name" className="mt-1" />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" className="mt-1" />
            </div>
            
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="How can we help?" className="mt-1" />
            </div>
            
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea 
                id="message" 
                placeholder="Describe your issue or question in detail..." 
                rows={6}
                className="mt-1"
              />
            </div>
            
            <Button type="submit" className="w-full glow-primary">
              Send Message
            </Button>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-bold">Live Chat</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Get instant help from our support team. Average response time: 2 minutes.
            </p>
            <Button variant="outline" className="w-full">
              Start Chat
            </Button>
          </Card>

          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-bold">Email Support</h3>
            </div>
            <p className="text-muted-foreground mb-2">
              Prefer email? Write to us at:
            </p>
            <a href="mailto:support@traderhub.com" className="text-primary font-medium hover:underline">
              support@traderhub.com
            </a>
            <p className="text-sm text-muted-foreground mt-4">
              We typically respond within 24 hours
            </p>
          </Card>

          <Card className="p-8 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <h3 className="text-xl font-bold mb-2">Premium Support</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Elite members get priority support with ≤24h response time and dedicated account manager
            </p>
            <Button variant="outline" size="sm">
              Upgrade to Elite
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Help;
