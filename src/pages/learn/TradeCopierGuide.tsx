/**
 * /learn/trade-copier-guide — GEO answer page.
 *
 * Target query: "trade copier guide" / "what is a trade copier"
 * Audience: futures traders with multiple accounts (personal + funded/eval) asking
 * whether copying trades between their own accounts is allowed and how it works.
 *
 * SSR-safe: no window/document/localStorage access at render time,
 * no autoplay video, no browser-only APIs at module scope.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Copy,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ClipboardList,
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

const PAGE_PATH = "/learn/trade-copier-guide";

// ---------------------------------------------------------------------------
// FAQ data — single source of truth for both the accordion and faqPage() schema
// ---------------------------------------------------------------------------
const FAQS = [
  {
    question: "Is a trade copier safe with real money?",
    answer:
      "A trade copier is a mechanical mirroring tool — it carries the same risk as the strategy it copies, plus execution risk from latency and slippage between accounts. It's safe when used between accounts you control, with position limits set on every follower account, and when you monitor it rather than leaving it fully unattended.",
  },
  {
    question: "Can I copy trades across multiple funded accounts?",
    answer:
      "Often yes, subject to your firm's rules — many futures prop firms allow copying between accounts you own, sometimes with a same-side-of-market requirement or account caps. Rules are firm-specific and change, so verify your firm's current published policy before copying live.",
  },
  {
    question: "Will I get banned for using a copier?",
    answer:
      "Not for the tool itself in most cases — bans typically come from violating a specific rule (like copying across accounts a firm prohibits, or breaching position/exposure limits), not from copying as a concept. Read your firm's rulebook for copy trading specifically, not just its general terms.",
  },
  {
    question: "Does Finotaur include a trade copier?",
    answer:
      "Yes. Finotaur includes a trade copier for mirroring your own executions across your own connected accounts, alongside the auto-synced trading journal — so your copying setup and your trade analytics live in one platform.",
  },
];

// ---------------------------------------------------------------------------
// Firm-by-firm policy table
// ---------------------------------------------------------------------------
const FIRM_POLICIES = [
  {
    firm: "Apex",
    policy: "Allowed between your own accounts",
    notes: "Same-side-of-market rule applies; account caps apply.",
  },
  {
    firm: "Topstep",
    policy: "Allowed, with exclusions",
    notes: "Certain live funded account types are excluded — check current rules.",
  },
];

export default function TradeCopierGuide() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="Trade Copier Guide: What Is It & Is It Allowed?"
        description="What a trade copier is, how it mirrors executions across your own accounts, and whether copying is allowed on Apex, Topstep, and other prop firms."
        path={PAGE_PATH}
        jsonLd={[
          webPage({
            name: "Trade Copier Guide: What Is It & Is It Allowed?",
            description:
              "A practical guide to trade copiers: how they work, prop-firm compliance by firm, risks, and how journaling and copying work together.",
            path: PAGE_PATH,
          }),
          breadcrumbList([
            ["Home", "/"],
            ["Learn", "/learn"],
            ["Trade Copier Guide", PAGE_PATH],
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
          <span className="text-ink-secondary">Trade Copier Guide</span>
        </nav>

        <SectionEyebrow>TRADE COPIER GUIDE</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          What Is a Trade Copier & Is It Allowed?
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          A trade copier mirrors executions from a lead account to follower accounts in real time,
          so one order becomes several without manual re-entry. Most futures prop firms allow
          copying between accounts you own, within limits — but compliance rules are firm-specific,
          so always verify your firm's current policy before copying live.
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
          SECTION 2 — HOW A COPIER WORKS
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>HOW IT WORKS</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          How a trade copier works
        </SectionTitle>

        <div className="max-w-3xl mx-auto mt-ds-6">
          <p className="text-ink-secondary text-[15px] leading-relaxed">
            A trade copier watches a designated lead account for new orders and fills, then
            replicates that execution — direction, instrument, and a scaled size — onto one or
            more follower accounts, typically within a fraction of a second. The point isn't
            signal-sharing between strangers; for most futures traders the practical use case is
            self-copying: mirroring your own executions across your own personal, evaluation, and
            funded accounts so you don't have to place the same trade manually five times.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">01</span>
            <h3 className="font-wordmark font-medium text-lg text-ink-primary mt-ds-3">
              Lead account trades
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              You place (or your strategy places) an order on the account designated as the
              source.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">02</span>
            <h3 className="font-wordmark font-medium text-lg text-ink-primary mt-ds-3">
              Copier mirrors it
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              The same direction and instrument are replicated to each follower account, sized per
              account.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <span className="font-mono text-gold-muted text-[11px] tracking-widest">03</span>
            <h3 className="font-wordmark font-medium text-lg text-ink-primary mt-ds-3">
              Fills sync to your journal
            </h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              Every follower fill records automatically, so each account's real performance stays
              trackable.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 3 — IS IT ALLOWED ON PROP FIRMS (firm-by-firm table)
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>COMPLIANCE</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Is copy trading allowed on prop firms?
        </SectionTitle>

        <div className="mt-ds-7 max-w-3xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle">
                    Firm
                  </th>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle">
                    Policy
                  </th>
                  <th className="text-[11px] font-sans font-medium tracking-wider uppercase text-ink-secondary p-ds-3 border-b border-border-ds-subtle">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {FIRM_POLICIES.map((row) => (
                  <tr key={row.firm}>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-ink-primary text-sm font-medium">
                      {row.firm}
                    </td>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-ink-secondary text-sm">
                      {row.policy}
                    </td>
                    <td className="p-ds-3 border-b border-border-ds-subtle text-ink-tertiary text-sm">
                      {row.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-ink-tertiary text-[13px] text-center mt-ds-5">
            Per each firm's published rules; always verify current rules directly with your firm
            before copying trades.
          </p>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 4 — RISKS
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>RISKS</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Risks of trade copying
        </SectionTitle>

        <div className="grid md:grid-cols-3 gap-ds-5 mt-ds-7 max-w-5xl mx-auto">
          <Card variant="default" padding="default">
            <AlertTriangle className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">Latency</h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              A copied order fills a moment after the lead order. In fast markets that gap can move
              the fill price on follower accounts.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <AlertTriangle className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">Slippage</h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              Multiple accounts entering near-simultaneously can each get a slightly different
              price than the lead account.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <AlertTriangle className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-lg text-ink-primary">Rule drift</h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">
              Prop firm copy-trading rules change over time. A setup that was compliant last
              quarter may not be today — recheck periodically.
            </p>
          </Card>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 5 — WHY JOURNAL + COPIER TOGETHER MATTERS
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>WHY IT MATTERS</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          Why a journal and a copier in one platform matters
        </SectionTitle>

        <div className="grid md:grid-cols-2 gap-ds-5 mt-ds-7 max-w-4xl mx-auto">
          <Card variant="default" padding="default">
            <Copy className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">
              Copy your own accounts
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Finotaur's trade copier mirrors your own executions across your own connected
              accounts — personal, evaluation, and funded — not signal-following of other traders.
            </p>
          </Card>
          <Card variant="default" padding="default">
            <ClipboardList className="w-6 h-6 text-gold-primary mb-ds-3" />
            <h3 className="font-wordmark font-medium text-xl text-ink-primary">
              Analytics and compliance context together
            </h3>
            <p className="text-ink-secondary text-[15px] leading-relaxed mt-ds-3">
              Every copied fill syncs into the same journal you already use, so per-account
              performance, drawdown distance, and compliance context live in one place instead of
              scattered across tools.
            </p>
          </Card>
        </div>

        <div className="flex items-center justify-center gap-ds-3 mt-ds-6">
          <ShieldCheck className="w-4 h-4 text-ink-tertiary" />
          <p className="text-ink-tertiary text-[13px]">
            Always confirm current copy-trading rules directly with your firm before enabling a
            live copier.
          </p>
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 6 — FAQ
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>FAQ</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Trade copiers — frequently asked questions
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

        <SectionTitle as="h2" size="lg" gradient="split">
          Copy your own accounts. Journal every fill.
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
