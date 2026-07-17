/**
 * /learn/win-rate-profit-factor-expectancy — GEO answer page.
 *
 * Target query: "what is a good win rate for day trading" / "profit factor vs expectancy"
 * Audience: traders trying to understand which stats actually predict profitability.
 *
 * SSR-safe: no window/document/localStorage access at render time,
 * no autoplay video, no browser-only APIs at module scope.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Scale,
  TrendingUp,
  BarChart3,
  Hash,
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
    question: "What is a good win rate for day trading?",
    answer:
      "A win rate between 40% and 60% is a common benchmark among experienced traders. It's normal, not a red flag — plenty of profitable traders win less than half their trades, because their winners are large relative to their losers.",
  },
  {
    question: "What is a good profit factor?",
    answer:
      "A profit factor above 1.5 is generally considered good, and above 2.0 is excellent. Below 1.0 means you're losing money overall — gross losses exceed gross profits — regardless of how often you win.",
  },
  {
    question: "What is expectancy in trading?",
    answer:
      "Expectancy is your average R (risk-multiple) per trade: (win% × average win) minus (loss% × average loss). A positive expectancy means your system makes money on average over a large enough sample, even with losing trades along the way.",
  },
  {
    question: "How many trades before my stats mean anything?",
    answer:
      "Around 60 trades is a reasonable minimum before win rate, profit factor, and expectancy become statistically meaningful. Below that, a short streak of wins or losses can distort every one of these numbers.",
  },
];

// ---------------------------------------------------------------------------
// Profit factor benchmark table
// ---------------------------------------------------------------------------
const PROFIT_FACTOR_ROWS = [
  { range: "Below 1.0", meaning: "Losing overall — gross losses exceed gross profits" },
  { range: "1.0 – 1.5", meaning: "Marginal edge — thin margin for error" },
  { range: "1.5 – 2.0", meaning: "Good edge — a solid, repeatable system" },
  { range: "Above 2.0", meaning: "Excellent edge — strong risk/reward discipline" },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function WinRateProfitFactorExpectancy() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="Win Rate, Profit Factor & Expectancy — What Actually Matters"
        description="A normal day-trading win rate is 40-60%, and it means almost nothing on its own. Expectancy and profit factor are what actually decide whether you're profitable."
        path="/learn/win-rate-profit-factor-expectancy"
        jsonLd={[
          webPage({
            name: "Win Rate, Profit Factor & Expectancy — What Actually Matters",
            description:
              "Why win rate alone is misleading, how profit factor and expectancy are calculated, the benchmarks that matter, and how many trades you need before any of it is statistically meaningful.",
            path: "/learn/win-rate-profit-factor-expectancy",
          }),
          breadcrumbList([
            ["Home", "/"],
            ["Learn", "/learn"],
            ["Win Rate, Profit Factor & Expectancy", "/learn/win-rate-profit-factor-expectancy"],
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
          <span className="text-ink-secondary">Win Rate, Profit Factor & Expectancy</span>
        </nav>

        <SectionEyebrow>TRADING STATISTICS · WHAT MATTERS</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          Win Rate, Profit Factor & Expectancy — What Actually Matters
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          A normal day-trading win rate is 40-60%, and it means almost nothing on its own —
          expectancy (average R per trade) and profit factor (gross profit ÷ gross loss) decide
          whether you're profitable.
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
          SECTION 2 — WIN RATE
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>WIN RATE</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Why 40-60% is a normal win rate
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-6 space-y-ds-4">
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            A win rate in the 40-60% range is a common benchmark among experienced traders. Losing
            close to half of your trades isn't a warning sign by itself — it's the expected result
            of most strategies that let winners run and cut losers early.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            Chasing a higher win rate is often counterproductive: it usually means taking profit
            too early and letting losers sit too long, which quietly damages your risk/reward per
            trade even as the win-rate number goes up.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-ds-5 mt-ds-7 max-w-4xl mx-auto">
          <Card variant="default" padding="default">
            <Target className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              High win rate, bad risk/reward
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              Many small wins and a few outsized losers can still lose money overall — win rate
              alone doesn't capture that.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <Scale className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              Lower win rate, good risk/reward
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              A trader winning 40% of trades can be highly profitable if winners are meaningfully
              larger than losers.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 3 — PROFIT FACTOR
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>PROFIT FACTOR</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Profit factor: gross profit ÷ gross loss
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-6">
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            Profit factor is calculated as total gross profit divided by total gross loss across
            all your trades. A profit factor of 1.0 means you broke even before costs; anything
            above 1.0 means your winners outweighed your losers in dollar terms.
          </p>

          <div className="mt-ds-6 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle">
                    Profit factor
                  </th>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle">
                    What it means
                  </th>
                </tr>
              </thead>
              <tbody>
                {PROFIT_FACTOR_ROWS.map((row) => (
                  <tr key={row.range}>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-gold-primary text-sm font-medium whitespace-nowrap">
                      {row.range}
                    </td>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-ink-secondary text-sm">
                      {row.meaning}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 4 — EXPECTANCY
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>EXPECTANCY</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Expectancy: your average R per trade
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-6 space-y-ds-4">
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            Expectancy is calculated as:
          </p>
          <Card variant="default" padding="default">
            <p className="font-mono text-ink-primary text-sm md:text-base text-center">
              Expectancy = (win% × average win) − (loss% × average loss)
            </p>
          </Card>
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            Expressing results in R-multiples — where 1R is the amount you risked on a trade — lets
            you compare expectancy across different position sizes and instruments. A system with
            positive expectancy makes money on average over a large enough sample, even though
            individual trades still lose.
          </p>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 5 — SAMPLE SIZE
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>SAMPLE SIZE</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Why you need at least ~60 trades
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-6">
          <div className="flex items-start gap-ds-3">
            <Hash className="w-5 h-5 text-gold-primary shrink-0 mt-1" />
            <p className="text-ink-secondary text-[15px] leading-relaxed">
              Win rate, profit factor, and expectancy are all averages — and averages built on a
              handful of trades are unreliable. A short winning or losing streak can push any of
              these numbers far from your true edge. Around 60 trades is a reasonable minimum
              before these stats start to reflect your actual performance rather than recent
              variance.
            </p>
          </div>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 6 — HOW FINOTAUR COMPUTES THIS
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>HOW FINOTAUR HELPS</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Finotaur computes all three automatically
        </SectionTitle>

        <div className="grid md:grid-cols-2 gap-ds-5 mt-ds-7 max-w-4xl mx-auto">
          <Card variant="default" padding="default">
            <BarChart3 className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              Broker-synced, no manual math
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              Win rate, profit factor, and expectancy are calculated from your real, broker-synced
              trades — no spreadsheet formulas to maintain.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <Brain className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              Benchmarked once you cross the minimum sample
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              Finotaur flags when your trade count is large enough for these stats to be
              statistically meaningful, so you're not reading too much into an early streak.
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
          Win rate, profit factor & expectancy — frequently asked questions
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
          See your real win rate, profit factor & expectancy
        </SectionTitle>

        <div className="flex justify-center mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          <TrendingUp className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" aria-hidden="true" />
          Connect your broker and Finotaur computes all three automatically.
        </p>
      </SectionShell>

      <Footer />
    </div>
  );
}
