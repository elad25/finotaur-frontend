import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// 🔥 v2.0: Updated FAQs - removed FREE tier references
const faqs = [
  {
    question: 'What data sources does Finotaur use?',
    answer: 'We aggregate data from multiple institutional-grade providers including major exchanges, financial data APIs, and verified news sources. Our AI layer processes and enriches this data to provide actionable insights.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! Our Basic plan includes a 14-day free trial with full access to all Basic features. Premium subscribers get immediate access with no trial period.',
  },
  {
    question: 'Can I get a refund if I\'m not satisfied?',
    answer: 'Yes! We offer a 7-day money-back guarantee for all paid plans. If you\'re not satisfied for any reason, contact our support team within 7 days of your purchase for a full refund.',
  },
  {
    question: 'How secure is my data and API connections?',
    answer: 'Security is our top priority. We use bank-level encryption (AES-256) for data at rest and TLS 1.3 for data in transit. API keys are encrypted and never stored in plain text. We never have withdrawal permissions on connected accounts.',
  },
  {
    question: 'What\'s on your roadmap?',
    answer: 'We\'re constantly improving! Upcoming features include mobile apps (iOS & Android), advanced charting with TradingView integration, social trading features, and expanded broker sync capabilities. Join our Discord to vote on features.',
  },
  {
    question: 'Do you offer educational resources?',
    answer: 'Yes! All subscribers get access to our learning hub with video tutorials, strategy guides, and market analysis webinars. We also have an active community where traders share insights and strategies.',
  },
  {
    question: 'Can I cancel or change my plan anytime?',
    answer: 'Absolutely. You can upgrade, downgrade, or cancel your subscription at any time from your account settings. Changes take effect at the start of your next billing cycle, and you\'ll keep access until then.',
  },
  {
    question: 'What\'s the difference between Basic and Premium?',
    answer: 'Basic ($19.99/mo) includes 25 trades per month, full analytics, strategy tracking, and a 14-day free trial. Premium ($39.99/mo) unlocks unlimited trades, AI-powered insights, pattern recognition, and priority support.',
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-32 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-20 space-y-6 animate-slide-up">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            Frequently Asked <span className="text-gradient-gold">Questions</span>
          </h2>
          <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed">
            Everything you need to know about Finotaur.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="group glass-card border border-gold/10 hover:border-gold/30 rounded-xl px-8 transition-all duration-300 animate-slide-up overflow-hidden"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="absolute inset-0 gradient-shine opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <AccordionTrigger className="relative text-left hover:text-gold transition-colors py-6 text-lg font-semibold">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="relative text-muted-foreground leading-relaxed text-base pb-6">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}