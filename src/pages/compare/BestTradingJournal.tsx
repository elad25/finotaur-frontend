/**
 * /best-trading-journal — honest roundup / GEO comparison page.
 *
 * Target keyword: "best trading journal" (2026)
 * Audience: traders comparing journal software before choosing one.
 * Format: highest-citation GEO pattern — ranked list + comparison table + FAQ.
 *
 * Competitor pricing/features approved exception per marketing rules:
 * competitor names ARE allowed on this page. All facts below were checked
 * against each vendor's own published pages / Trustpilot in July 2026 —
 * see the visible methodology line in the hero section.
 *
 * SSR-safe: no window/document/localStorage access at render time,
 * no autoplay video, no browser-only APIs at module scope.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Plus, Minus } from "lucide-react";

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
    question: "What is the best trading journal for futures traders?",
    answer:
      "For futures and prop-firm traders, Finotaur is the strongest fit: it auto-syncs with Tradovate, includes futures-accurate R and P&L math, a built-in trade copier, and a prop-firm risk dashboard for drawdown and daily-loss tracking — features most general-purpose journals don't combine in one product.",
  },
  {
    question: "What is the best AI trading journal?",
    answer:
      "TradeZella has the deepest AI backtesting suite of the group, with AI agents and automated backtesting workflows. Finotaur takes a different AI approach — a coach (FINO) that reviews your actual trades, a Leak Detector that names your costliest recurring mistake, and daily briefings — aimed at behavioral feedback rather than backtesting.",
  },
  {
    question: "What is the best free trading journal?",
    answer:
      "TradesViz has the strongest free plan of the group — free forever, with 3,000 executions per month, no card required. Finotaur's free tier lets you try the full journal experience with a demo portfolio before connecting a real broker.",
  },
  {
    question: "Which trading journals auto-sync with Tradovate?",
    answer:
      "Finotaur, TradeZella, and TradesViz connect to Tradovate via API for automatic sync (TradesViz's is read-only). TraderSync advertises an \"Autosync\" per its vendor pages. Tradervue and Edgewonk rely on manual file import rather than a live API connection.",
  },
  {
    question: "Which trading journal includes a trade copier?",
    answer:
      "As of July 2026, only Finotaur combines a journal with a built-in trade copier. None of the other five platforms compared here — TradeZella, TraderSync, TradesViz, Tradervue, or Edgewonk — offers trade-copying as part of their published feature set.",
  },
];

// ---------------------------------------------------------------------------
// Ranked roundup cards
// ---------------------------------------------------------------------------
const RANKED = [
  {
    rank: 1,
    name: "Finotaur",
    verdict: "Best for futures & prop-firm traders (journal + copier + AI in one)",
    body: "Finotaur is built futures-first: Tradovate auto-syncs over OAuth, and the platform combines analytics, an AI coach, a prop-firm risk dashboard, and a built-in trade copier — a combination none of the other five platforms offer together.",
    price: "From $44.99/mo (Trader plan, annual billing)",
    strength: "Only platform here with a built-in trade copier alongside the journal.",
    limitation: "No public Trustpilot profile yet, so third-party review volume can't be compared directly.",
  },
  {
    rank: 2,
    name: "TradeZella",
    verdict: "Best AI backtesting suite",
    body: "TradeZella has invested heavily in AI — automated backtesting and AI agents go further than any other platform in this list. It auto-syncs with Tradovate and has a large, well-reviewed user base.",
    price: "From $26/mo (Essential, annual billing); Pro $44/mo",
    strength: "Deepest AI-driven backtesting workflow of the group.",
    limitation: "No trade copier, and no free plan to try before paying.",
  },
  {
    rank: 3,
    name: "TradesViz",
    verdict: "Best free plan & value",
    body: "TradesViz is free forever up to 3,000 executions a month with no card required, then scales to a low-cost paid tier. It connects to Tradovate over a read-only API and adds an AI coach on its higher Platinum plan.",
    price: "Free plan available; paid from $14.99/mo (annual billing)",
    strength: "Strongest free-forever tier of any journal in this comparison.",
    limitation: "No trade copier; AI features are gated to the Platinum tier.",
  },
  {
    rank: 4,
    name: "Edgewonk",
    verdict: "Best flat price & psychology tooling",
    body: "Edgewonk charges a single flat fee rather than a recurring subscription, and its Automated Edge Finder is built specifically around trading psychology and edge discovery rather than broker automation.",
    price: "$197 per 16 months (roughly $12.32/mo); no free plan (14-day money-back)",
    strength: "Lowest effective monthly cost of any paid journal here.",
    limitation: "No live API sync with Tradovate — trades come in via manual \"Fast Import,\" and there's no trade copier.",
  },
  {
    rank: 5,
    name: "TraderSync",
    verdict: "Best market-replay simulator",
    body: "TraderSync's standout is its market-replay simulator for practicing trade execution, backed by its Cypher AI assistant. It advertises Tradovate \"Autosync\" per its own vendor pages.",
    price: "$22.46/mo (annual billing); 7-day trial, no free plan",
    strength: "Market-replay simulator not matched elsewhere in this list.",
    limitation: "No trade copier, and prop-firm support is limited to basic multi-account tracking.",
  },
  {
    rank: 6,
    name: "Tradervue",
    verdict: "Best mentoring/sharing workflow",
    body: "Tradervue's strength is its trade-sharing and mentoring workflow, built for traders who review performance with a coach or community. Its free plan covers stocks only, and futures require a paid Silver plan.",
    price: "Free plan (stocks only); Silver $29.95/mo",
    strength: "Purpose-built sharing tools for mentoring and trade reviews.",
    limitation: "No API auto-sync with Tradovate (file import only), no AI features, and a small Trustpilot review sample.",
  },
];

// ---------------------------------------------------------------------------
// Comparison table
// ---------------------------------------------------------------------------
type TableCell = { text: string; positive?: boolean };

const TABLE_COLUMNS = [
  "Entry price (annual billing)",
  "Free plan",
  "Tradovate auto-sync",
  "AI features",
  "Trade copier",
  "Prop-firm features",
  "Trustpilot",
];

const TABLE_ROWS: { name: string; cells: TableCell[] }[] = [
  {
    name: "Finotaur",
    cells: [
      { text: "$44.99/mo ($409/yr)" },
      { text: "Yes — demo journal, no card", positive: true },
      { text: "Yes — API (OAuth)", positive: true },
      { text: "FINO coach + Leak Detector + daily briefings" },
      { text: "Yes — built-in", positive: true },
      { text: "Prop risk dashboard (drawdown + daily-loss)" },
      { text: "—" },
    ],
  },
  {
    name: "TradeZella",
    cells: [
      { text: "$26/mo (Essential); Pro $44/mo" },
      { text: "No" },
      { text: "Yes — API", positive: true },
      { text: "Extensive — AI agents, automated backtesting" },
      { text: "None" },
      { text: "Yes — via integrations" },
      { text: "4.8 (978 reviews)" },
    ],
  },
  {
    name: "TraderSync",
    cells: [
      { text: "$22.46/mo" },
      { text: "No — 7-day trial" },
      { text: "\"Autosync\" (per vendor pages)" },
      { text: "Cypher assistant + coach" },
      { text: "None" },
      { text: "Basic multi-account tracking" },
      { text: "4.4 (316 reviews)" },
    ],
  },
  {
    name: "TradesViz",
    cells: [
      { text: "From $14.99/mo" },
      { text: "Yes — free forever, 3,000 executions/mo", positive: true },
      { text: "Yes — read-only API", positive: true },
      { text: "AI coach / Q&A (Platinum plan)" },
      { text: "None" },
      { text: "Compliance tracking (Platinum)" },
      { text: "4.3 (92 reviews)" },
    ],
  },
  {
    name: "Tradervue",
    cells: [
      { text: "Silver $29.95/mo" },
      { text: "Yes — stocks only, no futures" },
      { text: "File import (no API auto-sync)" },
      { text: "None" },
      { text: "None" },
      { text: "None advertised" },
      { text: "2.4 (10 reviews — small sample)" },
    ],
  },
  {
    name: "Edgewonk",
    cells: [
      { text: "$197 / 16 months (~$12.32/mo)" },
      { text: "No — 14-day money-back" },
      { text: "File import (\"Fast Import\")" },
      { text: "Automated Edge Finder" },
      { text: "None" },
      { text: "Imports from prop platforms" },
      { text: "4.7 (40 reviews)" },
    ],
  },
];

// ---------------------------------------------------------------------------
// "How to choose" checklist
// ---------------------------------------------------------------------------
const CHOOSE_CRITERIA = [
  "What you trade — futures, stocks, options, or a mix — since not every journal handles contracts and tick math accurately.",
  "Whether your broker auto-syncs — a live API connection beats manual file import or copy-pasting fills.",
  "How much you value AI depth vs. price — heavier AI (backtesting, coaching) tends to sit on pricier tiers.",
  "Whether you need prop-firm rules tracking — drawdown limits and daily-loss rules are easy to miss without dedicated tooling.",
];

// ---------------------------------------------------------------------------
// ItemList JSON-LD (positions match the ranking above) — built inline since
// jsonLd.ts does not currently export an ItemList helper.
// ---------------------------------------------------------------------------
function itemListJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Best Trading Journal (2026)",
    itemListElement: RANKED.map((item) => ({
      "@type": "ListItem",
      position: item.rank,
      name: item.name,
      description: item.verdict,
    })),
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function BestTradingJournal() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="Best Trading Journal (2026): An Honest Comparison"
        description="An honest, methodology-transparent comparison of the best trading journals in 2026 — Finotaur, TradeZella, TraderSync, TradesViz, Tradervue, and Edgewonk — with pricing, features, and Trustpilot ratings."
        path="/best-trading-journal"
        jsonLd={[
          webPage({
            name: "Best Trading Journal (2026): An Honest Comparison",
            description:
              "Ranked, honest comparison of trading journal software in 2026, with a full feature and pricing table and FAQ.",
            path: "/best-trading-journal",
          }),
          breadcrumbList([
            ["Home", "/"],
            ["Best Trading Journal", "/best-trading-journal"],
          ]),
          faqPage(FAQS.map((f) => ({ q: f.question, a: f.answer }))),
          itemListJsonLd(),
        ]}
      />

      {/* ================================================================
          SECTION 1 — HERO / DIRECT ANSWER
      ================================================================ */}
      <SectionShell id="hero" atmosphere="full" beam={true}>
        <SectionEyebrow>TRADING JOURNALS · COMPARED</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          Best Trading Journal (2026): An Honest Comparison
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-3xl mx-auto">
          The best trading journal depends on what you trade. For futures and prop-firm traders who
          want broker auto-sync, AI review, and a built-in trade copier in one platform, Finotaur is
          the strongest fit. TradesViz wins on free-tier value, TradeZella on AI backtesting depth,
          Edgewonk on price, and Tradervue on mentoring workflow.
        </p>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          Last updated: July 2026
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-ds-4 mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start free</Link>
          </Button>
          <Button asChild variant="goldOutline" size="xl">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4 max-w-2xl mx-auto">
          Methodology: competitor pricing and features checked from each vendor's published pages,
          July 2026. We build Finotaur — assume we're biased, and check the sources yourself.
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 2 — RANKED ROUNDUP
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>THE ROUNDUP</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Six trading journals, ranked
        </SectionTitle>

        <div className="grid md:grid-cols-2 gap-ds-5 mt-ds-7 max-w-6xl mx-auto">
          {RANKED.map((item) => (
            <Card key={item.name} variant="default" padding="default">
              <span className="font-mono text-gold-muted text-[11px] tracking-widest">
                #{item.rank}
              </span>
              <h3 className="font-wordmark font-medium text-xl md:text-2xl text-ink-primary mt-ds-2">
                {item.name}
              </h3>
              <p className="text-gold-primary text-[14px] font-medium mt-ds-1">{item.verdict}</p>
              <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">{item.body}</p>
              <p className="text-ink-primary text-[14px] font-medium mt-ds-4">{item.price}</p>
              <ul className="text-ink-secondary text-[14px] leading-relaxed mt-ds-3 space-y-ds-2">
                <li className="flex gap-2">
                  <Check className="w-4 h-4 text-gold-primary shrink-0 mt-0.5" />
                  <span>{item.strength}</span>
                </li>
                <li className="flex gap-2">
                  <X className="w-4 h-4 text-ink-tertiary shrink-0 mt-0.5" />
                  <span>{item.limitation}</span>
                </li>
              </ul>
            </Card>
          ))}
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 3 — COMPARISON TABLE
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>SIDE BY SIDE</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Full feature & pricing comparison
        </SectionTitle>

        <div className="mt-ds-7 max-w-6xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle">
                    Journal
                  </th>
                  {TABLE_COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row) => (
                  <tr key={row.name}>
                    <td
                      className={`p-ds-3 border-b border-border-ds-subtle text-sm font-medium whitespace-nowrap ${
                        row.name === "Finotaur" ? "text-gold-primary" : "text-ink-primary"
                      }`}
                    >
                      {row.name}
                    </td>
                    {row.cells.map((cell, idx) => (
                      <td
                        key={idx}
                        className={`p-ds-3 border-b border-border-ds-subtle text-[13px] leading-relaxed ${
                          cell.positive ? "text-gold-primary" : "text-ink-secondary"
                        }`}
                      >
                        {cell.text}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-ink-tertiary text-[12px] text-center mt-ds-4">
            Competitor pricing and features checked from each vendor's published pages, July 2026.
            We build Finotaur — assume we're biased, and check the sources yourself.
          </p>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 4 — THE ONE THING NOBODY ELSE OFFERS
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>WHAT'S MISSING ELSEWHERE</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          The one thing nobody else offers
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-7">
          <Card variant="default" padding="default">
            <p className="text-ink-secondary text-[15px] leading-relaxed">
              None of the five competitors compared here — TradeZella, TraderSync, TradesViz,
              Tradervue, or Edgewonk — offers a built-in trade copier, verified across each vendor's
              published feature pages as of July 2026. Finotaur is the only platform in this
              comparison that combines a trading journal, a trade copier, and prop-firm risk
              tracking in one product.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 5 — HOW TO CHOOSE
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>HOW TO CHOOSE</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          How to pick the right journal for you
        </SectionTitle>

        <div className="max-w-2xl mx-auto mt-ds-7">
          <Card variant="default" padding="default">
            <ul className="text-ink-secondary text-[15px] leading-relaxed space-y-ds-3">
              {CHOOSE_CRITERIA.map((criterion) => (
                <li key={criterion} className="flex gap-2">
                  <Check className="w-4 h-4 text-gold-primary shrink-0 mt-1" />
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 6 — FAQ
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>FAQ</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Best trading journal — frequently asked questions
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
          SECTION 7 — FINAL CTA
      ================================================================ */}
      <SectionShell atmosphere="full" beam={true}>
        <SectionEyebrow>GET STARTED</SectionEyebrow>

        <SectionTitle as="h2" size="large" gradient="split">
          Try the journal built for futures & prop-firm traders
        </SectionTitle>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-ds-4 mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start free</Link>
          </Button>
          <Button asChild variant="goldOutline" size="xl">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>

        <p className="text-ink-tertiary text-[13px] text-center mt-ds-4">
          No card required to start. Cancel anytime.
        </p>
      </SectionShell>

      <Footer />
    </div>
  );
}
