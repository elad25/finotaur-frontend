/**
 * /best-trading-journal-for-prop-firm — SEO landing page.
 *
 * Target keyword: "best trading journal for prop firm traders"
 * Audience: Funded and evaluation account traders looking for discipline/consistency analytics.
 *
 * SSR-safe: no window/document/localStorage access at render time,
 * no autoplay video, no browser-only APIs at module scope.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Zap,
  Brain,
  BarChart3,
  Layers,
  Tag,
  Calendar,
  Trophy,
  ShieldCheck,
  Plus,
  Minus,
} from "lucide-react";

import Navbar from "@/components/landing-new/Navbar";
import Footer from "@/components/landing-new/Footer";
import { SectionShell } from "@/components/landing-new/_shared/SectionShell";
import { SectionEyebrow } from "@/components/landing-new/_shared/SectionEyebrow";
import { SectionTitle } from "@/components/landing-new/_shared/SectionTitle";
import { Button } from "@/components/ds/Button";
import { Card } from "@/components/ds/Card";
import { SEO } from "@/components/seo/SEO";
import { webPage, breadcrumbList, faqPage } from "@/components/seo/jsonLd";

// ---------------------------------------------------------------------------
// FAQ data — single source of truth for both the accordion and faqPage() schema
// ---------------------------------------------------------------------------
const FAQS = [
  {
    question: "Can I track multiple funded and evaluation accounts?",
    answer:
      "Yes. Finotaur tracks your funded, evaluation, and personal accounts side by side, each with its own statistics, in one journal.",
  },
  {
    question: "Which brokers does it connect to?",
    answer:
      "Finotaur auto-syncs with Tradovate and other leading brokers commonly used by prop firms, importing your fills, fees, and positions automatically.",
  },
  {
    question: "Does it enforce my prop firm's rules automatically?",
    answer:
      "Finotaur gives you the visibility and discipline metrics to stay within your firm's rules — consistency, risk, and behavioral alerts — but it does not place or block trades on your firm's behalf. You stay in control of execution.",
  },
  {
    question: "Does it help with consistency requirements?",
    answer:
      "Yes. Consistency and discipline are built into your Finotaur Score and analytics, so you can see at a glance whether you're trading the way evals and payouts reward.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes. The Basic plan includes a 14-day free trial so you can connect your accounts and see your journal before paying.",
  },
  {
    question: "How much does it cost?",
    answer:
      "The journal starts at $24.99/month (Basic) with a 14-day free trial. Premium is $44.99/month and adds unlimited trades, multiple broker connections, the AI trading coach, and the Finotaur Score.",
  },
];

// ---------------------------------------------------------------------------
// Comparison table rows
// ---------------------------------------------------------------------------
const COMPARISON_ROWS = [
  "Multiple funded/eval accounts",
  "Consistency & discipline tracking",
  "Behavioral & risk alerts",
  "Per-account R analytics",
  "Automatic import",
  "AI feedback on mistakes",
];

// ---------------------------------------------------------------------------
// Feature cards
// ---------------------------------------------------------------------------
const FEATURES = [
  {
    Icon: Layers,
    title: "Multiple accounts side by side",
    description:
      "Track funded, evaluation, and personal accounts in one place, each with its own numbers.",
  },
  {
    Icon: Trophy,
    title: "Consistency & discipline score",
    description:
      "Your Finotaur Score grades your real edge across discipline, risk, and consistency.",
  },
  {
    Icon: ShieldCheck,
    title: "Behavioral & risk alerts",
    description:
      "Get flagged before you tilt — when revenge trading or oversizing creeps in.",
  },
  {
    Icon: Brain,
    title: "AI coach (FINO)",
    description:
      "Daily ranked insights and a Leak Finder that names the mistake costing you accounts.",
  },
  {
    Icon: BarChart3,
    title: "Per-account R analytics",
    description: "R-multiple and expectancy for each account, not just lumped together.",
  },
  {
    Icon: Calendar,
    title: "Calendar & sessions",
    description: "See performance by day and session to stay inside your routine.",
  },
  {
    Icon: Zap,
    title: "Automatic import",
    description: "Every account stays current with no copy-pasting.",
  },
  {
    Icon: Tag,
    title: "Tags, notes & screenshots",
    description: "Build a searchable record of the decisions behind every trade.",
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function BestTradingJournalPropFirm() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="Best Trading Journal for Prop Firm Traders"
        description="A trading journal for prop firm and funded traders: track multiple evaluation and funded accounts, measure consistency and discipline, and get AI feedback. Built futures-first. 14-day free trial."
        path="/best-trading-journal-for-prop-firm"
        jsonLd={[
          webPage({
            name: "Best Trading Journal for Prop Firm Traders",
            description:
              "A trading journal for prop firm and funded traders: track multiple evaluation and funded accounts, measure consistency and discipline, and get AI feedback.",
            path: "/best-trading-journal-for-prop-firm",
          }),
          breadcrumbList([
            ["Home", "/"],
            ["Best Trading Journal for Prop Firm Traders", "/best-trading-journal-for-prop-firm"],
          ]),
          faqPage(FAQS.map((f) => ({ q: f.question, a: f.answer }))),
        ]}
      />

      {/* ================================================================
          SECTION 1 — HERO
      ================================================================ */}
      <SectionShell id="hero" atmosphere="full" beam={true}>
        <SectionEyebrow>TRADING JOURNAL · BUILT FOR FUNDED TRADERS</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          The Best Trading Journal for Prop Firm Traders
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          Finotaur is a trading journal for prop firm and funded traders. Connect your evaluation
          and funded accounts, see every account side by side, and measure the consistency and
          discipline that pass evals and keep payouts coming — with automatic import and an AI coach
          that flags the mistakes that blow accounts.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-ds-4 mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
          </Button>
          <Button asChild variant="goldOutline" size="xl">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          Track funded + eval accounts · Discipline metrics · Cancel anytime
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 2 — THE PROBLEM
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>THE PROBLEM</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Funded trading is a discipline game
        </SectionTitle>

        <div className="grid md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary">
              One bad day ends an account
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Evals and funded accounts are won and lost on discipline, not just good trades. Blind
              spots are expensive.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary">
              Consistency is hard to eyeball
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Staying within consistency targets across days and accounts is almost impossible to
              track in a spreadsheet.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary">
              Juggling multiple accounts
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Eval, funded, and personal accounts each have their own numbers. Switching between
              them loses the big picture.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 3 — HOW IT WORKS
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>HOW IT WORKS</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Every account, one clear view
        </SectionTitle>

        <div className="grid md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">01</span>
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary mt-ds-3">
              Connect your accounts
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Link your evaluation and funded accounts in seconds — no manual entry.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">02</span>
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary mt-ds-3">
              Everything imports automatically
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Fills, fees, and positions sync for every account around the clock.
            </p>
          </Card>

          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">03</span>
            <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary mt-ds-3">
              Track discipline + get AI feedback
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Consistency, risk, and an AI coach that flags the mistakes that blow accounts.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 4 — FEATURES
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>FEATURES</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Built to protect funded accounts
        </SectionTitle>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-ds-5 mt-ds-7 max-w-6xl mx-auto">
          {FEATURES.map(({ Icon, title, description }) => (
            <Card key={title} variant="default" padding="default">
              <Icon className="w-6 h-6 text-gold-primary mb-ds-3" />
              <h3 className="font-wordmark font-medium text-lg text-ink-primary">{title}</h3>
              <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
                {description}
              </p>
            </Card>
          ))}
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 5 — COMPARISON TABLE
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>HOW TO CHOOSE</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          What a prop-firm journal needs
        </SectionTitle>

        <div className="mt-ds-7 max-w-2xl mx-auto">
          <p className="text-ink-tertiary text-[13px] text-center mb-ds-4">
            Finotaur vs. a manual spreadsheet.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle">
                    Feature
                  </th>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle text-center">
                    Manual spreadsheet
                  </th>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-gold-primary p-ds-3 border-b border-border-ds-subtle text-center">
                    Finotaur
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row}>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-ink-primary text-sm">
                      {row}
                    </td>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-center">
                      <X className="w-4 h-4 text-ink-tertiary mx-auto" aria-label="No" />
                    </td>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-center">
                      <Check className="w-4 h-4 text-gold-primary mx-auto" aria-label="Yes" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 6 — PRICING
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>PRICING</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Start free. Upgrade when it pays for itself.
        </SectionTitle>

        <div className="grid md:grid-cols-2 gap-ds-5 mt-ds-7 max-w-3xl mx-auto">
          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">Basic</h3>
            <p className="text-gold-primary font-semibold text-2xl mt-ds-2">$24.99/month</p>
            <ul className="text-ink-secondary text-[14px] leading-relaxed mt-ds-4 space-y-ds-2">
              <li>14-day free trial</li>
              <li>25 trades/month</li>
              <li>1 broker connection</li>
              <li>Full analytics, strategies & Academy</li>
            </ul>
          </Card>

          <Card variant="default" padding="default">
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">Premium</h3>
            <p className="text-gold-primary font-semibold text-2xl mt-ds-2">$44.99/month</p>
            <ul className="text-ink-secondary text-[14px] leading-relaxed mt-ds-4 space-y-ds-2">
              <li>Everything in Free, plus:</li>
              <li>Unlimited trades</li>
              <li>Multiple broker connections</li>
              <li>AI trading coach & Finotaur Score</li>
            </ul>
          </Card>
        </div>

        <div className="flex flex-col items-center gap-ds-5 mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
          </Button>
          <Link
            to="/pricing"
            className="text-ink-secondary text-sm hover:text-gold-primary transition-colors"
          >
            See full pricing →
          </Link>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 7 — FAQ
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>FAQ</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Prop-firm journal — frequently asked questions
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-7 space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 + index * 0.04 }}
              >
                <div
                  className="rounded-xl overflow-hidden transition-all duration-300"
                  style={{
                    background: isOpen
                      ? "linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(10,10,10,0.95) 100%)"
                      : "rgba(255,255,255,0.02)",
                    border: `1px solid ${
                      isOpen ? "rgba(201,166,70,0.25)" : "rgba(255,255,255,0.06)"
                    }`,
                  }}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-5 md:p-6 text-left group"
                  >
                    <span
                      className={`text-base md:text-lg font-semibold pr-4 transition-colors duration-300 ${
                        isOpen
                          ? "text-gold-primary"
                          : "text-ink-primary group-hover:text-ink-secondary"
                      }`}
                    >
                      {faq.question}
                    </span>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300"
                      style={{
                        background: isOpen
                          ? "rgba(201,166,70,0.2)"
                          : "rgba(255,255,255,0.05)",
                        border: `1px solid ${
                          isOpen ? "rgba(201,166,70,0.4)" : "rgba(255,255,255,0.1)"
                        }`,
                      }}
                    >
                      {isOpen ? (
                        <Minus className="w-4 h-4 text-gold-primary" />
                      ) : (
                        <Plus className="w-4 h-4 text-ink-tertiary" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 md:px-6 pb-5 md:pb-6">
                          <div className="h-px bg-gradient-to-r from-gold-border via-gold-border/50 to-transparent mb-4" />
                          <p className="text-ink-secondary leading-relaxed text-sm md:text-base">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 8 — FINAL CTA
      ================================================================ */}
      <SectionShell atmosphere="full" beam={true}>
        <SectionEyebrow>GET STARTED</SectionEyebrow>

        <SectionTitle as="h2" size="lg" gradient="split">
          Protect your funded account with a real edge
        </SectionTitle>

        <div className="flex justify-center mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          Connect your accounts in seconds. Cancel anytime.
        </p>
      </SectionShell>

      <Footer />
    </div>
  );
}
