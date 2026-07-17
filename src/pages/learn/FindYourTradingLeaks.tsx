/**
 * /learn/find-your-trading-leaks — GEO answer page.
 *
 * Target query: "how to find your trading leaks" / "where am I losing money trading"
 * Audience: traders who suspect a repeating mistake but can't name it from memory.
 *
 * SSR-safe: no window/document/localStorage access at render time,
 * no autoplay video, no browser-only APIs at module scope.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Scale,
  Repeat,
  Clock,
  TrendingDown,
  Scissors,
  ShieldAlert,
  Brain,
  DollarSign,
  ClipboardCheck,
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
    question: "Why do most day traders fail?",
    answer:
      "Usually it isn't the strategy. Most day traders fail because of unexamined, repeating mistakes — a leak in position sizing, timing, or discipline that quietly drains the account trade after trade while the strategy itself stays sound.",
  },
  {
    question: "Can AI find my trading mistakes?",
    answer:
      "Yes. AI can run consistent diagnostics across your entire trade history — something manual review struggles to do — and surface patterns like oversizing, revenge trading, or a bad time-of-day that you'd otherwise only notice by accident.",
  },
  {
    question: "How many trades do I need for leak detection to be meaningful?",
    answer:
      "Around 60 trades is a reasonable minimum. Below that, a handful of unusual trades can look like a pattern that isn't real. At 60+ trades, recurring behaviors start to separate from normal variance.",
  },
  {
    question: "What's the most common trading leak?",
    answer:
      "Oversizing after a loss — increasing position size to \"win it back\" — is one of the most common leaks traders carry, closely followed by holding losing trades too long and cutting winners too early.",
  },
];

// ---------------------------------------------------------------------------
// Leak families
// ---------------------------------------------------------------------------
const LEAK_FAMILIES = [
  {
    Icon: Scale,
    title: "Oversizing",
    description: "Position size creeps up after a loss (or a win), turning normal variance into outsized damage.",
  },
  {
    Icon: TrendingDown,
    title: "Revenge trading",
    description: "Entering the next trade to \"get it back\" instead of following your plan.",
  },
  {
    Icon: Repeat,
    title: "Overtrading",
    description: "Taking more setups than your edge actually supports, often outside your best hours.",
  },
  {
    Icon: Clock,
    title: "Time-of-day bleed",
    description: "A specific session or hour where your win rate and R quietly underperform the rest of your day.",
  },
  {
    Icon: ShieldAlert,
    title: "Holding losers too long",
    description: "Stops widened or ignored, turning a small planned loss into a large unplanned one.",
  },
  {
    Icon: Scissors,
    title: "Cutting winners early",
    description: "Exiting profitable trades before your plan's target, capping the upside your losers need to offset.",
  },
  {
    Icon: ClipboardCheck,
    title: "Breaking your own rules",
    description: "Entries, exits, or sizing that don't match your written plan — the leak most traders deny having.",
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function FindYourTradingLeaks() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="How to Find Your Trading Leaks (Where Am I Losing Money?)"
        description="A trading leak is a recurring, measurable mistake — oversizing, revenge entries, wrong time-of-day, holding losers — that you find by running diagnostics over your full trade history, not by memory."
        path="/learn/find-your-trading-leaks"
        jsonLd={[
          webPage({
            name: "How to Find Your Trading Leaks (Where Am I Losing Money?)",
            description:
              "What a trading leak is, the most common leak families, why self-review misses them, and how to diagnose your trade history to find the mistake actually costing you money.",
            path: "/learn/find-your-trading-leaks",
          }),
          breadcrumbList([
            ["Home", "/"],
            ["Learn", "/learn"],
            ["Find Your Trading Leaks", "/learn/find-your-trading-leaks"],
          ]),
          faqPage(FAQS.map((f) => ({ q: f.question, a: f.answer }))),
        ]}
      />

      {/* ================================================================
          SECTION 1 — HERO / DIRECT ANSWER
      ================================================================ */}
      <SectionShell id="hero" atmosphere="full" beam={true}>
        <nav aria-label="Breadcrumb" className="text-ink-tertiary text-[13px] text-center mb-ds-4">
          <Link to="/" className="hover:text-gold-primary transition-colors">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>Learn</span>
          <span className="mx-2">/</span>
          <span className="text-ink-secondary">Find Your Trading Leaks</span>
        </nav>

        <SectionEyebrow>TRADING PSYCHOLOGY · DIAGNOSTICS</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          How to Find Your Trading Leaks (Where Am I Losing Money?)
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          Trading leaks are recurring, measurable mistakes — oversizing, revenge entries, wrong
          time-of-day, holding losers — that quietly drain your account. You find them by running
          diagnostics over your full trade history, not by memory, because the mistakes that cost
          you the most are rarely the ones you remember.
        </p>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">Last updated: July 2026</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-ds-4 mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
          </Button>
          <Button asChild variant="goldOutline" size="xl">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 2 — WHAT IS A LEAK
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>DEFINITION</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          What is a "trading leak"?
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-6 space-y-ds-4">
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            The term "leak" comes from poker, where it describes a specific, repeatable mistake in
            a player's decision-making that steadily costs money over a large enough sample — even
            though any single hand can look fine in isolation. Trading leaks work the same way.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            A trading leak isn't a single bad trade. It's a pattern: the same kind of mistake,
            repeated across dozens of trades, that only becomes visible when you look at your
            history as a whole instead of one decision at a time.
          </p>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 3 — COMMON LEAK FAMILIES
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>THE MOST COMMON LEAKS</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Seven leak families that show up in almost every trader's history
        </SectionTitle>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-6xl mx-auto">
          {LEAK_FAMILIES.map(({ Icon, title, description }) => (
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
          SECTION 4 — WHY SELF-REVIEW MISSES THEM
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>WHY YOU CAN'T SPOT THIS YOURSELF</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Why self-review misses your leaks
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-6 space-y-ds-4">
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            Memory is biased toward the dramatic, not the repeated. You remember the one huge loss
            that broke your day, not the twenty small ones that quietly added up to the same
            damage. Self-review scans for what stands out emotionally — a leak is defined by what
            repeats statistically.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            That mismatch is why traders can review their own trades for months and still miss the
            single mistake costing them the most. Finding a leak requires looking at your full
            trade history as data, not reliving it as a story.
          </p>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 5 — HOW FINOTAUR FINDS THEM
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>HOW FINOTAUR DOES IT</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Finotaur's Leak Detector runs the diagnostics for you
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-6">
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            Once your broker is connected and your trades sync automatically, Finotaur's Leak
            Detector runs 7 diagnostic families over every trade in your history — the same
            families listed above — and returns a plain-language, dollar-denominated verdict for
            each one it finds:
          </p>

          <div className="mt-ds-6 grid gap-ds-4">
            <Card variant="default" padding="default">
              <div className="flex items-start gap-ds-3">
                <DollarSign className="w-5 h-5 text-gold-primary shrink-0 mt-1" />
                <p className="text-ink-secondary text-[15px] leading-relaxed">
                  <span className="text-ink-primary font-medium">"This cost you $X."</span> Each
                  leak is priced against your own trade history, so you know exactly which habit is
                  worth fixing first.
                </p>
              </div>
            </Card>
            <Card variant="default" padding="default">
              <div className="flex items-start gap-ds-3">
                <Brain className="w-5 h-5 text-gold-primary shrink-0 mt-1" />
                <p className="text-ink-secondary text-[15px] leading-relaxed">
                  <span className="text-ink-primary font-medium">Broker auto-sync, not memory.</span>{" "}
                  Every diagnostic runs against your real fills and positions — no manual logging,
                  no guessing which trades to review.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 6 — WHAT TO DO ONCE A LEAK IS NAMED
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>NEXT STEP</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          What to do once a leak is named
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-6">
          <ol className="list-decimal list-inside space-y-ds-3 text-ink-secondary text-[15px] leading-relaxed">
            <li>
              <span className="text-ink-primary font-medium">Fix one leak at a time.</span> Trying
              to correct oversizing, revenge trades, and time-of-day bleed simultaneously usually
              fixes none of them. Take the costliest leak first.
            </li>
            <li>
              <span className="text-ink-primary font-medium">Write a single rule against it.</span>{" "}
              A leak becomes fixable once it has a concrete, checkable rule attached — for example,
              "no new entry within 15 minutes of a stop-out."
            </li>
            <li>
              <span className="text-ink-primary font-medium">Track adherence, not outcome.</span>{" "}
              Measure whether you followed the rule, not whether the next trade won. A followed
              rule is a win even on a losing trade.
            </li>
          </ol>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 7 — FAQ
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>FAQ</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Trading leaks — frequently asked questions
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
          Stop guessing where your money is going
        </SectionTitle>

        <div className="flex justify-center mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          <Search className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" aria-hidden="true" />
          Connect your broker and let the Leak Detector name your costliest mistake.
        </p>
      </SectionShell>

      <Footer />
    </div>
  );
}
