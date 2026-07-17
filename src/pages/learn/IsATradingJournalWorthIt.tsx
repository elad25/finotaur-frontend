/**
 * /learn/is-a-trading-journal-worth-it — GEO answer page.
 *
 * Target query: "is a trading journal worth it" / "does journaling actually help trading"
 * Audience: traders deciding whether journaling is worth the time investment.
 *
 * SSR-safe: no window/document/localStorage access at render time,
 * no autoplay video, no browser-only APIs at module scope.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Frown,
  ListChecks,
  FileSpreadsheet,
  Zap,
  Brain,
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
    question: "Do professional traders keep journals?",
    answer:
      "Yes. Reviewing trades systematically is standard practice among professional and prop-firm traders — the format varies, but the discipline of logging and reviewing decisions is consistent across serious traders.",
  },
  {
    question: "Is a spreadsheet good enough for journaling?",
    answer:
      "It can work if you're disciplined about both entry and review, but spreadsheets are manual by nature — every trade has to be typed in, and most traders abandon that habit within weeks. The bigger risk isn't the tool, it's that a spreadsheet does nothing to prompt a review.",
  },
  {
    question: "How long until a journal improves my trading?",
    answer:
      "It depends on how many trades you're logging and reviewing, not how long you've had the journal open. A trader placing several trades a day can reach a meaningful sample (see: how many trades before your stats matter) in a few weeks; the improvement shows up once you act on a pattern, not before.",
  },
  {
    question: "What if I don't have time to journal?",
    answer:
      "That's exactly the problem an auto-syncing journal solves — the logging happens in the background from your broker connection, so the only time you spend is on the review, which is the part that actually changes your results.",
  },
];

// ---------------------------------------------------------------------------
// What a journal should include
// ---------------------------------------------------------------------------
const JOURNAL_FIELDS = [
  "Setup or strategy used",
  "Entry and exit price",
  "Risk taken (position size, stop, R)",
  "Screenshots of the chart at entry and exit",
  "Emotional state going into the trade",
  "Outcome (P&L, R-multiple)",
  "Review notes — what you'd repeat or change",
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function IsATradingJournalWorthIt() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="Is a Trading Journal Actually Worth It?"
        description="Yes, but only if it gets reviewed. A journal that's logged and never analyzed changes nothing — which is why most journaling attempts fail."
        path="/learn/is-a-trading-journal-worth-it"
        jsonLd={[
          webPage({
            name: "Is a Trading Journal Actually Worth It?",
            description:
              "What a trading journal actually does, why most traders quit journaling, what a good journal should include, spreadsheet vs. app, and how to close the log-but-never-review gap.",
            path: "/learn/is-a-trading-journal-worth-it",
          }),
          breadcrumbList([
            ["Home", "/"],
            ["Learn", "/learn"],
            ["Is a Trading Journal Worth It", "/learn/is-a-trading-journal-worth-it"],
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
          <span className="text-ink-secondary">Is a Trading Journal Worth It</span>
        </nav>

        <SectionEyebrow>TRADING JOURNAL · THE HONEST ANSWER</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          Is a Trading Journal Actually Worth It?
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          Yes — but only if it gets reviewed; a journal that's logged and never analyzed changes
          nothing, which is why most journaling attempts fail.
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
          SECTION 2 — WHAT IT ACTUALLY DOES
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>WHAT IT'S FOR</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          What a trading journal actually does for you
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-6">
          <div className="flex items-start gap-ds-3">
            <BookOpen className="w-5 h-5 text-gold-primary shrink-0 mt-1" />
            <p className="text-ink-secondary text-[15px] leading-relaxed">
              A journal's real job is turning feelings into measurable patterns. Without one,
              "I feel like I'm doing better lately" or "I feel like Mondays are bad for me" stay
              opinions. With a reviewed journal, those turn into numbers you can check — and either
              confirm or throw out.
            </p>
          </div>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 3 — WHY MOST TRADERS QUIT
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>WHY IT FAILS</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Why most traders quit journaling
        </SectionTitle>

        <div className="grid md:grid-cols-2 gap-ds-5 mt-ds-7 max-w-4xl mx-auto">
          <Card variant="default" padding="default">
            <Frown className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              Manual entry friction
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              Typing every trade in by hand is tedious enough that it's the first habit to drop on
              a busy or bad day — and one skipped day often becomes a skipped month.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <ListChecks className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              No review loop
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              Even traders who log consistently often never go back and analyze what they wrote —
              so the data sits there, complete but unused, changing nothing.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 4 — WHAT SHOULD BE INCLUDED
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>WHAT TO LOG</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          What a good trading journal should include
        </SectionTitle>

        <div className="max-w-2xl mx-auto mt-ds-6">
          <ul className="space-y-ds-3">
            {JOURNAL_FIELDS.map((field) => (
              <li key={field} className="flex items-start gap-ds-3">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-primary mt-2 shrink-0" />
                <span className="text-ink-secondary text-[15px] leading-relaxed">{field}</span>
              </li>
            ))}
          </ul>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 5 — SPREADSHEET VS APP
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>THE HONEST COMPARISON</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Spreadsheet vs. app
        </SectionTitle>

        <div className="grid md:grid-cols-2 gap-ds-5 mt-ds-7 max-w-4xl mx-auto">
          <Card variant="default" padding="default">
            <FileSpreadsheet className="w-6 h-6 text-ink-tertiary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">Spreadsheet</h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              Free and fully flexible — but every trade has to be entered manually, and analysis
              (win rate, profit factor, expectancy, patterns by time or setup) has to be built and
              maintained yourself.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <Zap className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              Auto-syncing app
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              Removes the entry friction that kills the habit in the first place — trades import
              from your broker automatically, so the only work left is the review.
            </p>
          </Card>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-6 max-w-2xl mx-auto">
          Either can work. The honest difference is friction — a spreadsheet asks you to build and
          keep a habit that most people drop; an auto-syncing app removes the part of the habit
          most likely to fail.
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 6 — HOW FINOTAUR CLOSES THE GAP
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>HOW FINOTAUR HELPS</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Closing the "log but never review" gap
        </SectionTitle>

        <div className="grid md:grid-cols-2 gap-ds-5 mt-ds-7 max-w-4xl mx-auto">
          <Card variant="default" padding="default">
            <Zap className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              Broker auto-sync
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              Removes the entry friction entirely — every fill, order, and position syncs on its
              own, so the logging half of journaling is never the reason you stop.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <Brain className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              FINO AI reviews every trade
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              FINO, Finotaur's AI trading coach, surfaces the patterns for you, so the review loop
              happens even on the days you don't have time to do it yourself.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 7 — FAQ
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>FAQ</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Trading journals — frequently asked questions
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
          Let your journal actually get reviewed
        </SectionTitle>

        <div className="flex justify-center mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          Connect your broker. FINO reviews every trade for you.
        </p>
      </SectionShell>

      <Footer />
    </div>
  );
}
