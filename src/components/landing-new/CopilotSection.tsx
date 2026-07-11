// src/components/landing-new/CopilotSection.tsx
// ================================================
// COPILOT — "Your Copilot works the market with you."
// The finale before Pricing: the true AI Portfolio Manager, coming soon.
// Every other section makes the user sharper; Copilot acts on their behalf.
// ================================================

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { SectionShell } from './_shared/SectionShell';
import { SectionEyebrow } from './_shared/SectionEyebrow';
import { SectionTitle } from './_shared/SectionTitle';

// ---------------------------------------------------------------------------
// Data — sample feed messages for the mock live panel
// ---------------------------------------------------------------------------
const feedMessages = [
  {
    time: '06:42',
    text: 'Semis rotating on AVGO capex. Your NVDA is 12% of book, above your 10% rule.',
    verdict: 'TRIM to 10% · thesis intact',
  },
  {
    time: '09:15',
    text: 'AAPL earnings in 3 days. IV rank at 82%, premium is rich relative to history.',
    verdict: 'WATCH · no action yet',
  },
] as const;

const CopilotSection = () => {
  return (
    <SectionShell id="copilot" atmosphere="full" beam={false} constructionMarkers={true}>
      <div className="text-center mb-12 md:mb-16 max-w-3xl mx-auto">
        <SectionEyebrow size="lg">AI Portfolio Manager · Coming Soon</SectionEyebrow>

        <SectionTitle as="h2" gradient="split" size="large">
          Your Copilot works the market{' '}
          <span className="text-gold-primary">with you.</span>
        </SectionTitle>

        <p className="font-sans font-light text-ink-secondary text-base md:text-lg leading-[1.6] max-w-2xl mx-auto">
          Every other tool makes you sharper. Copilot acts. It watches your positions 24/7, forms verdicts, and moves inside your rules.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            to="/auth/register"
            className="flex items-center gap-1.5 text-gold-primary text-sm font-medium
              tracking-[0.02em] w-fit group
              hover:underline underline-offset-4 transition-colors"
          >
            Join the Copilot waitlist
            <span className="group-hover:translate-x-1 transition-transform inline-block" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Mock live feed panel */}
        {/* TODO: replace mock feed with real Copilot screenshot when provided */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div
            className="p-5 md:p-6 relative overflow-hidden rounded-xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(20,20,20,0.85) 0%, rgba(12,12,12,0.7) 100%) padding-box, linear-gradient(135deg, rgba(230,195,100,0.4) 0%, rgba(201,166,70,0.15) 50%, rgba(230,195,100,0.3) 100%) border-box',
              border: '1.5px solid transparent',
              boxShadow: 'var(--shadow-card-featured)',
            }}
          >
            {/* Corner brackets — matches AISection flagship treatment */}
            <span className="absolute pointer-events-none" style={{ top: '10px', left: '10px', width: '14px', height: '14px', borderTop: '1px solid rgba(255,220,140,0.7)', borderLeft: '1px solid rgba(255,220,140,0.7)' }} aria-hidden="true" />
            <span className="absolute pointer-events-none" style={{ top: '10px', right: '10px', width: '14px', height: '14px', borderTop: '1px solid rgba(255,220,140,0.7)', borderRight: '1px solid rgba(255,220,140,0.7)' }} aria-hidden="true" />
            <span className="absolute pointer-events-none" style={{ bottom: '10px', left: '10px', width: '14px', height: '14px', borderBottom: '1px solid rgba(255,220,140,0.7)', borderLeft: '1px solid rgba(255,220,140,0.7)' }} aria-hidden="true" />
            <span className="absolute pointer-events-none" style={{ bottom: '10px', right: '10px', width: '14px', height: '14px', borderBottom: '1px solid rgba(255,220,140,0.7)', borderRight: '1px solid rgba(255,220,140,0.7)' }} aria-hidden="true" />

            <div className="relative z-10">
              {/* Panel header */}
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gold-border">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center
                  bg-gold-border border border-gold-muted">
                  <Bot className="h-4 w-4 text-gold-primary" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-ink-primary text-sm">Copilot Feed</span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full
                  bg-gold-border border border-gold-muted">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold-primary animate-pulse" />
                  <span className="text-gold-primary/85 text-[10px] font-semibold">PREVIEW</span>
                </div>
              </div>

              {/* Sample messages */}
              <div className="space-y-4">
                {feedMessages.map((msg) => (
                  <div key={msg.time} className="flex flex-col gap-2">
                    <p className="font-mono text-xs md:text-sm leading-relaxed text-ink-secondary">
                      <span className="text-gold-primary font-semibold">COPILOT · {msg.time}</span>
                      {' · '}
                      {msg.text}
                    </p>
                    <span
                      className="inline-flex items-center gap-1.5 w-fit font-mono text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-sm
                        text-gold-primary bg-gold-border border border-gold-muted"
                    >
                      {msg.verdict}
                    </span>
                  </div>
                ))}
              </div>

              {/* Watching status footer */}
              <div className="mt-5 pt-3 border-t border-gold-border flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-tertiary">
                  Watching · 14 positions · 3 alerts armed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-primary animate-pulse" aria-hidden="true" />
                  <span className="font-mono text-[10px] text-gold-primary/85">24/7</span>
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </SectionShell>
  );
};

export default CopilotSection;
