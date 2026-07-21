/**
 * /faq — public FAQ page, optimized for GEO (Generative Engine Optimization —
 * being quoted directly by ChatGPT / Claude / Perplexity answer engines).
 *
 * Every answer leads with a direct, self-contained sentence so it can be
 * extracted verbatim by an LLM without needing the surrounding page context.
 *
 * SSR-safe: no window/document/localStorage access at render time,
 * no autoplay video, no browser-only APIs at module scope.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

import Navbar from "@/components/landing-new/Navbar";
import Footer from "@/components/landing-new/Footer";
import { SectionShell } from "@/components/landing-new/_shared/SectionShell";
import { SectionEyebrow } from "@/components/landing-new/_shared/SectionEyebrow";
import { SectionTitle } from "@/components/landing-new/_shared/SectionTitle";
import { Button } from "@/components/ds/Button";
import { SEO } from "@/components/seo/SEO";
import { webPage, breadcrumbList, faqPage } from "@/components/seo/jsonLd";

// ---------------------------------------------------------------------------
// FAQ data — single source of truth for the accordion AND the faqPage() schema.
// Grouped by category for display; flattened for JSON-LD.
// ---------------------------------------------------------------------------
const FAQ_GROUPS = [
  {
    category: "About Finotaur",
    items: [
      {
        question: "What is Finotaur?",
        answer:
          "Finotaur is an AI-powered trading journal and market intelligence platform built futures-first for traders on Tradovate and other supported brokers. It automatically syncs your real trades, calculates R-multiples and P&L with futures-accurate math, and layers on AI features — including an AI trading coach (FINO), a Leak Detector, and a Revenge Radar — that turn your execution history into concrete, actionable feedback.",
      },
    ],
  },
  {
    category: "Journal & Broker Sync",
    items: [
      {
        question: "Does Finotaur automatically import my trades?",
        answer:
          "Yes. Finotaur connects to your broker — including Tradovate via secure OAuth — and automatically imports your fills, orders, fees, and positions in the background, so there's no manual entry. Once connected, new trades keep syncing on their own, and you only add the context: tags, notes, screenshots, and post-trade reflections.",
      },
      {
        question: "Does Tradovate have a built-in trading journal?",
        answer:
          "No, Tradovate does not include a full trading journal — it's an execution platform, not an analytics tool. That's why serious Tradovate traders connect a dedicated journal like Finotaur, which syncs natively with Tradovate and turns raw fills into R-multiples, win rate, expectancy, and behavioral insights Tradovate itself doesn't calculate.",
      },
      {
        question: "What should a trading journal include?",
        answer:
          "A complete trading journal should include your setup or strategy, planned risk (stop and position size), entry and exit screenshots, the emotional state you traded in, the actual outcome in R-multiples and dollars, and a short post-trade review. Finotaur captures the trade data automatically from your broker and lets you add the rest.",
      },
      {
        question: "How often should I review my trading journal?",
        answer:
          "Review your trading journal daily and weekly. Daily, check it against your loss cap before and after each session to catch overtrading early. Weekly, do a deeper review of your R-multiples, win rate, and recurring mistakes across all trades to spot patterns a single day can't reveal.",
      },
      {
        question: "How many trades do I need before my stats are meaningful?",
        answer:
          "Most traders need at least 60 trades before win rate, expectancy, and profit factor become statistically meaningful rather than noise. Below that, a few lucky or unlucky trades can distort the numbers. Finotaur gates portfolio-level reports and deeper analytics until you cross roughly this threshold, so you're not drawing conclusions from too small a sample.",
      },
      {
        question: "What is a good win rate for day trading?",
        answer:
          "A win rate between 40% and 60% is a common benchmark among day traders and is entirely compatible with strong profitability. Win rate alone is not the goal — a 40% win rate with a large average winner can outperform a 70% win rate with a tiny average winner. Expectancy and profit factor matter more than win rate in isolation.",
      },
      {
        question: "What is profit factor and what's a good number?",
        answer:
          "Profit factor is your gross profit divided by your gross loss over a set of trades. A profit factor between 1.5 and 2.0 is generally considered good, and above 2.0 is excellent; below 1.0 means you're losing money overall. Finotaur calculates profit factor automatically from your synced trades.",
      },
    ],
  },
  {
    category: "AI Features",
    items: [
      {
        question: "How is FINO different from pasting my trades into ChatGPT?",
        answer:
          "FINO reads your actual broker-synced positions — R-multiples, session timing, holding time, and behavioral patterns across your full trade history — not a one-off CSV paste with no context. Because FINO sees your real, ongoing data, it can flag recurring leaks and behavioral drift over time, something a single ChatGPT conversation about a screenshot can't do.",
      },
      {
        question: "Can AI really find where I'm losing money?",
        answer:
          "Yes. Finotaur's Leak Detector runs seven diagnostic families — covering things like session timing, oversized risk, and revenge trading — over your synced trade history and returns a specific dollar verdict for each leak it finds. Instead of a vague \"trade less\" suggestion, you get a named pattern and its real cost.",
      },
      {
        question: "How do I stop revenge trading?",
        answer:
          "Stopping revenge trading starts with a hard rule: a cooldown period and a firm daily loss limit that locks you out once you hit it, no exceptions. Journal every revenge episode — what triggered it and what it cost — so the pattern becomes visible instead of denied. Finotaur's Revenge Radar automatically flags real revenge sequences from your synced trade data, so you don't have to self-diagnose.",
      },
    ],
  },
  {
    category: "Prop Firms & Copier",
    items: [
      {
        question: "Does Finotaur work with prop-firm (funded) accounts?",
        answer:
          "Yes. Finotaur is built futures-first with native support for prop-firm evaluation and funded accounts, alongside personal accounts, all trackable side by side in one journal. A dedicated prop risk dashboard tracks drawdown and daily loss limits against your specific firm's rules, so you can see how close you are to a violation before it happens.",
      },
      {
        question: "What is a trade copier?",
        answer:
          "A trade copier automatically mirrors trade executions from one account to one or more other accounts, so an order placed on a source account replicates on the connected accounts without manual re-entry. Finotaur includes a trade copier alongside its journal, letting you replicate executions across multiple funded, evaluation, or personal accounts.",
      },
      {
        question: "What's the difference between trailing and static drawdown?",
        answer:
          "Static drawdown sets a fixed dollar floor below your starting balance that never moves, even as your account grows. Trailing drawdown moves up as your account's peak balance rises, so your maximum allowed loss tightens the more you profit — until it locks at a fixed level, depending on the firm's rules.",
      },
    ],
  },
  {
    category: "Pricing",
    items: [
      {
        question: "Is there a free plan?",
        answer:
          "Yes. Finotaur's free tier lets you try the journal with a 10-trade demo portfolio, no card required. It also includes 3 AI Stock Analyzer analyses per day and full access to analytics, strategies, and the Academy, so you can evaluate the platform before connecting a live broker.",
      },
      {
        question: "How much does Finotaur cost?",
        answer:
          "Every new account automatically gets 14 days of full access to Trader and Investor features — no card required. Afterwards you keep a free plan with 10 manual trades and preview mode. Paid plans start when you upgrade: Trader is $44.99/month and adds unlimited trades, multiple broker connections, and the AI trading coach. See the pricing page for current plan details and any other tiers.",
      },
    ],
  },
];

// Flattened list — feeds both the numbering used for accordion state and the
// faqPage() JSON-LD schema.
const FAQS_FLAT = FAQ_GROUPS.flatMap((group) => group.items);

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function FAQPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="FAQ — AI Trading Journal, Broker Sync, Pricing & More"
        description="Answers to the most common questions about Finotaur's AI trading journal: automatic broker sync for futures and Tradovate, prop-firm support, AI features, and pricing."
        path="/faq"
        jsonLd={[
          webPage({
            name: "Finotaur FAQ",
            description:
              "Frequently asked questions about Finotaur's AI trading journal, broker sync, prop-firm support, AI features, and pricing.",
            path: "/faq",
          }),
          breadcrumbList([
            ["Home", "/"],
            ["FAQ", "/faq"],
          ]),
          faqPage(FAQS_FLAT.map((f) => ({ q: f.question, a: f.answer }))),
        ]}
      />

      {/* ================================================================
          SECTION 1 — HERO / INTRO
      ================================================================ */}
      <SectionShell id="hero" atmosphere="full" beam={true}>
        <SectionEyebrow>FAQ</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          Finotaur FAQ
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          Finotaur is an AI-powered trading journal and market intelligence platform that
          automatically syncs your broker trades — futures-first, with native Tradovate support —
          and turns them into performance analytics, behavioral insights, and an AI trading coach.
          Below are direct answers to the questions traders ask most.
        </p>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          Last updated: July 2026
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 2 — FAQ GROUPS
      ================================================================ */}
      {FAQ_GROUPS.map((group, groupIndex) => {
        // Compute the starting flat index for this group so accordion state
        // stays unique across the whole page.
        const startIndex = FAQ_GROUPS.slice(0, groupIndex).reduce(
          (sum, g) => sum + g.items.length,
          0
        );

        return (
          <SectionShell
            key={group.category}
            atmosphere={groupIndex % 2 === 0 ? "subtle" : "full"}
          >
            <SectionEyebrow>{group.category.toUpperCase()}</SectionEyebrow>

            <SectionTitle as="h2" gradient={groupIndex % 2 === 0 ? "white" : "split"}>
              {group.category}
            </SectionTitle>

            <div className="max-w-3xl mx-auto mt-ds-7 space-y-3">
              {group.items.map((faq, itemIndex) => {
                const index = startIndex + itemIndex;
                const isOpen = openFaq === index;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.05 + itemIndex * 0.04 }}
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
        );
      })}

      {/* ================================================================
          SECTION 3 — FINAL CTA
      ================================================================ */}
      <SectionShell atmosphere="full" beam={true}>
        <SectionEyebrow>GET STARTED</SectionEyebrow>

        <SectionTitle as="h2" size="lg" gradient="split">
          Still have questions? See it for yourself.
        </SectionTitle>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-ds-4 mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start free — 14 days of full access</Link>
          </Button>
          <Button asChild variant="goldOutline" size="xl">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          Free tier available · No card required · Cancel anytime
        </p>
      </SectionShell>

      <Footer />
    </div>
  );
}
