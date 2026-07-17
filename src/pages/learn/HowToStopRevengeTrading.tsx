/**
 * /learn/how-to-stop-revenge-trading — GEO answer page.
 *
 * Target query: "how to stop revenge trading"
 * Audience: traders looking for a concrete protocol to break the tilt/revenge cycle.
 *
 * SSR-safe: no window/document/localStorage access at render time,
 * no autoplay video, no browser-only APIs at module scope.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Flame,
  Clock,
  ShieldAlert,
  Radar,
  BookOpen,
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

const PAGE_PATH = "/learn/how-to-stop-revenge-trading";

// ---------------------------------------------------------------------------
// FAQ data — single source of truth for both the accordion and faqPage() schema
// ---------------------------------------------------------------------------
const FAQS = [
  {
    question: "What triggers revenge trading?",
    answer:
      "Usually a loss (or a string of losses) followed by loss aversion — the urge to make the money back immediately rather than accept the loss and wait for the next valid setup. The trigger is emotional, not analytical: it's the discomfort of a loss, not a new signal, that drives the next trade.",
  },
  {
    question: "How long should the cooldown be?",
    answer:
      "A common baseline is 15-30 minutes after any loss before the next entry is allowed. The exact number matters less than having a fixed rule you follow every time — a cooldown you only sometimes take isn't a rule, it's a suggestion.",
  },
  {
    question: "Can AI detect revenge trading?",
    answer:
      "Yes, from patterns in your broker-synced trade data — specifically the time between trades after a loss and whether position size escalates afterward. Finotaur's Revenge Radar flags these sequences automatically instead of relying on you to notice them in the moment.",
  },
  {
    question: "Does a trading journal actually help with discipline?",
    answer:
      "Yes, but only if it documents the episodes, not just the P&L. Seeing five or ten dated, specific revenge sequences in your own data is harder to rationalize away than a vague sense that you 'sometimes' overtrade after a loss.",
  },
];

// ---------------------------------------------------------------------------
// Standard protocol (numbered)
// ---------------------------------------------------------------------------
const PROTOCOL = [
  {
    title: "15-30 minute cooldown after any loss",
    description:
      "No new entries for a fixed window after a losing trade closes. The cooldown is not optional and does not get shorter because you're confident about the next setup.",
  },
  {
    title: "A hard daily loss limit",
    description:
      "Decide the maximum you'll lose in a session before you start trading, and stop the instant you hit it — regardless of how the next setup looks.",
  },
  {
    title: "Half size after 2 consecutive losses",
    description:
      "Cut position size in half after two losses in a row. Reduced size makes the next loss cheaper exactly when tilt risk is highest.",
  },
  {
    title: "Journal each episode",
    description:
      "Log every time you notice the urge to revenge trade, whether or not you acted on it. The urge itself is data.",
  },
];

export default function HowToStopRevengeTrading() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="How to Stop Revenge Trading"
        description="Revenge trading stops when tilt is visible and expensive to ignore. A cooldown protocol, daily loss limits, and documented evidence of your own revenge sequences."
        path={PAGE_PATH}
        jsonLd={[
          webPage({
            name: "How to Stop Revenge Trading",
            description:
              "A practical protocol to stop revenge trading: cooldowns, daily loss limits, warning signals, and how to document the pattern in your own trade data.",
            path: PAGE_PATH,
          }),
          breadcrumbList([
            ["Home", "/"],
            ["Learn", "/learn"],
            ["How to Stop Revenge Trading", PAGE_PATH],
          ]),
          faqPage(FAQS.map((f) => ({ q: f.question, a: f.answer }))),
        ]}
      />

      {/* ================================================================
          SECTION 1 — HERO + DIRECT ANSWER
      ================================================================ */}
      <SectionShell id="hero" atmosphere="full" beam={true}>
        <nav aria-label="Breadcrumb" className="flex items-center justify-center gap-1.5 text-[13px] text-ink-tertiary mb-ds-5">
          <Link to="/" className="hover:text-gold-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/learn" className="hover:text-gold-primary transition-colors">
            Learn
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-ink-secondary">How to Stop Revenge Trading</span>
        </nav>

        <SectionEyebrow>TRADING PSYCHOLOGY</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          How to Stop Revenge Trading
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          Revenge trading stops when you make tilt visible and expensive to ignore. Use a cooldown
          rule after losses, a hard daily loss limit, and a documented record of your own revenge
          sequences — evidence you can't rationalize away the next time you want to size up right
          after a loss.
        </p>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-5">Last updated: July 2026</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-ds-4 mt-ds-6">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
          </Button>
          <Button asChild variant="goldOutline" size="xl">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 2 — WHAT IT IS + WHY IT HAPPENS
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>WHY IT HAPPENS</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          What revenge trading is (and why it happens)
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-6">
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            Revenge trading is entering a new position primarily to recover a recent loss, rather
            than because a valid setup appeared. It's driven by loss aversion — the psychological
            tendency to feel a loss more intensely than an equivalent gain, which creates urgency
            to "undo" it immediately. That urgency overrides process: size creeps up, setups get
            looser, and the next trade is a reaction to the last one instead of an independent
            decision.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          <Card variant="default" padding="default">
            <Flame className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              Emotional trigger
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              A loss creates discomfort, and the fastest relief feels like getting back in — not
              waiting for the next valid setup.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <ShieldAlert className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              Size escalation
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              The recovery trade is often sized larger than the trade that lost, compounding the
              risk.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <Clock className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">
              Compressed timing
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              Revenge trades tend to happen within minutes of the loss — far faster than the
              trader's normal decision process.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 3 — THE STANDARD PROTOCOL (numbered)
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>THE PROTOCOL</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          The standard protocol
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-7 space-y-ds-5">
          {PROTOCOL.map((item, index) => (
            <div key={item.title} className="flex gap-ds-4">
              <span className="font-mono text-gold-muted text-sm shrink-0 pt-1">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-wordmark font-medium text-lg text-ink-primary">
                  {item.title}
                </h3>
                <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-1">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 4 — SIGNALS YOU'RE REVENGE TRADING
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>WARNING SIGNS</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          How do you know you're revenge trading?
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-6">
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            The clearest signals are behavioral, not emotional — which is exactly why they're easy
            to miss in the moment. Watch for: entering a new trade within a few minutes of a loss
            closing, sizing the new trade larger than the one that just lost, taking a setup that
            doesn't match your normal criteria, and trading a market or timeframe you don't usually
            trade just because "something" is open. Any one of these after a loss is worth a pause;
            two or more together is a strong signal to stop for the session.
          </p>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 5 — REVENGE RADAR
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>HOW FINOTAUR HELPS</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          How Finotaur's Revenge Radar makes the pattern undeniable
        </SectionTitle>

        <div className="grid md:grid-cols-2 gap-ds-5 mt-ds-7 max-w-4xl mx-auto">
          <Card variant="default" padding="default">
            <Radar className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">
              Detects actual revenge sequences
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Revenge Radar reads your broker-synced trade data for the two clearest fingerprints
              of tilt: the time between trades after a loss, and size escalation on the trade that
              follows.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <BookOpen className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">
              Evidence, not a feeling
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              After 5-10 documented episodes flagged from your own executions, the pattern stops
              being a vague suspicion and becomes a dated, specific record you can't argue with.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 6 — DISCIPLINE IS A PROCESS
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>DISCIPLINE</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Discipline is a process, not an outcome
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-6">
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            A losing trade taken inside your rules is a good trade with a bad result. A winning
            trade taken as revenge is a bad decision with a lucky result. Judging trades by outcome
            instead of process is what keeps revenge trading alive — because an occasional lucky
            recovery trade reinforces exactly the behavior that will eventually blow up an account.
            Grade the decision, not the P&L, and the urge to revenge trade loses its reward.
          </p>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 7 — FAQ
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>FAQ</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Revenge trading — frequently asked questions
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
          Make tilt visible before it costs you an account
        </SectionTitle>

        <div className="flex justify-center mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          Connect your account in seconds. Cancel anytime.
        </p>
      </SectionShell>

      <Footer />
    </div>
  );
}
