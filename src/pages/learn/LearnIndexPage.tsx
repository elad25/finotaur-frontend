/**
 * /learn — "Trading Guides & FAQ" hub page.
 *
 * Central index linking every public trading-education / SEO guide page
 * plus the FAQ and Reviews pages. Each /learn/* guide's breadcrumb links
 * back here, so this route must exist for those breadcrumbs to resolve.
 *
 * SSR-safe: no window/document/localStorage access at render time,
 * no autoplay video, no browser-only APIs at module scope.
 */

import { Link } from "react-router-dom";
import {
  HelpCircle,
  Shield,
  Copy,
  HeartPulse,
  Droplets,
  BarChart3,
  BookOpen,
  MessageSquareQuote,
  Zap,
  TrendingUp,
  Building2,
  Repeat,
  ListChecks,
  ArrowLeftRight,
} from "lucide-react";

import Navbar from "@/components/landing-new/Navbar";
import Footer from "@/components/landing-new/Footer";
import { SectionShell } from "@/components/landing-new/_shared/SectionShell";
import { SectionEyebrow } from "@/components/landing-new/_shared/SectionEyebrow";
import { SectionTitle } from "@/components/landing-new/_shared/SectionTitle";
import { Card } from "@/components/ds/Card";
import { Button } from "@/components/ds/Button";
import { SEO } from "@/components/seo/SEO";
import { webPage, breadcrumbList } from "@/components/seo/jsonLd";

// ---------------------------------------------------------------------------
// Guide cards — the 6 /learn/* guides + /faq
// ---------------------------------------------------------------------------
const GUIDES = [
  {
    Icon: HelpCircle,
    title: "Finotaur FAQ",
    description:
      "Direct answers to the most common questions about Finotaur's AI trading journal, broker sync, prop-firm support, AI features, and pricing.",
    path: "/faq",
  },
  {
    Icon: Shield,
    title: "How to Pass a Prop Firm Evaluation",
    description:
      "Most evaluation failures come from position sizing against drawdown rules, not strategy. Trailing vs. static drawdown, daily loss limits, and a 7-step checklist to pass.",
    path: "/learn/how-to-pass-a-prop-firm-evaluation",
  },
  {
    Icon: Copy,
    title: "Trade Copier Guide: What Is It & Is It Allowed?",
    description:
      "What a trade copier is, how it mirrors executions across your own accounts, and whether copying is allowed on Apex, Topstep, and other prop firms.",
    path: "/learn/trade-copier-guide",
  },
  {
    Icon: HeartPulse,
    title: "How to Stop Revenge Trading",
    description:
      "Revenge trading stops when tilt is visible and expensive to ignore. A cooldown protocol, daily loss limits, and documented evidence of your own revenge sequences.",
    path: "/learn/how-to-stop-revenge-trading",
  },
  {
    Icon: Droplets,
    title: "How to Find Your Trading Leaks",
    description:
      "A trading leak is a recurring, measurable mistake — oversizing, revenge entries, wrong time-of-day, holding losers — found by running diagnostics over your full trade history.",
    path: "/learn/find-your-trading-leaks",
  },
  {
    Icon: BarChart3,
    title: "Win Rate, Profit Factor & Expectancy",
    description:
      "A normal day-trading win rate is 40-60%, and it means almost nothing on its own. Expectancy and profit factor are what actually decide whether you're profitable.",
    path: "/learn/win-rate-profit-factor-expectancy",
  },
  {
    Icon: BookOpen,
    title: "Is a Trading Journal Actually Worth It?",
    description:
      "Yes, but only if it gets reviewed. A journal that's logged and never analyzed changes nothing — which is why most journaling attempts fail.",
    path: "/learn/is-a-trading-journal-worth-it",
  },
];

// ---------------------------------------------------------------------------
// Product pages — existing marketing/SEO pages worth surfacing from the hub
// ---------------------------------------------------------------------------
const PRODUCT_PAGES = [
  {
    Icon: Zap,
    title: "AI Trading Journal",
    description: "How Finotaur's AI reads your synced trades and turns them into concrete, actionable feedback.",
    path: "/ai-trading-journal",
  },
  {
    Icon: TrendingUp,
    title: "Best Trading Journal for Tradovate",
    description: "Automatic Tradovate sync, futures-accurate analytics, and an AI trading coach — no manual entry.",
    path: "/best-trading-journal-for-tradovate",
  },
  {
    Icon: BarChart3,
    title: "Best Trading Journal for Futures",
    description: "A journal built around contracts, ticks, and multi-account futures trading from day one.",
    path: "/best-trading-journal-for-futures",
  },
  {
    Icon: Building2,
    title: "Best Trading Journal for Prop Firm Traders",
    description: "Track funded, evaluation, and personal accounts side by side with prop-firm-aware analytics.",
    path: "/best-trading-journal-for-prop-firm",
  },
  {
    Icon: Repeat,
    title: "Trade Copier",
    description: "Automatically mirror executions across your connected accounts — funded, evaluation, or personal.",
    path: "/journal-copier",
  },
  {
    Icon: MessageSquareQuote,
    title: "Reviews",
    description: "What real Finotaur members say about the journal, the AI coach, and the market intelligence tools.",
    path: "/reviews",
  },
];

// ---------------------------------------------------------------------------
// Compare pages — the 5 GEO comparison pages (Wave 3)
// ---------------------------------------------------------------------------
const COMPARE_PAGES = [
  {
    Icon: ListChecks,
    title: "Best Trading Journal (2026)",
    description: "An honest, six-product comparison with a full feature and pricing table.",
    path: "/best-trading-journal",
  },
  {
    Icon: ArrowLeftRight,
    title: "TradeZella Alternative",
    description: "Why traders look for a TradeZella alternative, and how Finotaur compares.",
    path: "/tradezella-alternative",
  },
  {
    Icon: ArrowLeftRight,
    title: "Finotaur vs TradeZella",
    description: "A feature-by-feature comparison covering pricing, AI, and trade copiers.",
    path: "/finotaur-vs-tradezella",
  },
  {
    Icon: ArrowLeftRight,
    title: "Finotaur vs TraderSync",
    description: "How the two journals compare on pricing, Tradovate sync, and prop-risk tools.",
    path: "/finotaur-vs-tradersync",
  },
  {
    Icon: ArrowLeftRight,
    title: "Finotaur vs TradesViz",
    description: "Free plans, Tradovate auto-sync, AI analysis, and trade copier, compared.",
    path: "/finotaur-vs-tradesviz",
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function LearnIndexPage() {
  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <SEO
        title="Trading Guides & FAQ — Prop Firms, Copiers & Trading Psychology"
        description="Practical guides on prop-firm evaluations, trade copiers, revenge trading, trading leaks, win rate & expectancy, and whether a trading journal is worth it."
        path="/learn"
        jsonLd={[
          webPage({
            name: "Trading Guides & FAQ — Learn with Finotaur",
            description:
              "A hub of practical trading guides covering prop-firm evaluations, trade copiers, revenge trading, trading leaks, win rate & expectancy, and trading journals.",
            path: "/learn",
          }),
          breadcrumbList([
            ["Home", "/"],
            ["Learn", "/learn"],
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: [...GUIDES, ...PRODUCT_PAGES, ...COMPARE_PAGES].map((item, idx) => ({
              "@type": "ListItem",
              position: idx + 1,
              name: item.title,
              url: `https://www.finotaur.com${item.path}`,
            })),
          },
        ]}
      />

      {/* ================================================================
          SECTION 1 — HERO / INTRO
      ================================================================ */}
      <SectionShell id="hero" atmosphere="full" beam={true}>
        <SectionEyebrow>LEARN</SectionEyebrow>

        <SectionTitle as="h1" size="display" gradient="split">
          Trading Guides & FAQ
        </SectionTitle>

        <p className="font-sans text-base md:text-lg text-ink-secondary text-center max-w-2xl mx-auto">
          Practical guides on the questions traders actually run into: passing a prop-firm
          evaluation, using a trade copier, stopping revenge trading, finding where you're really
          losing money, reading your own win rate and expectancy, and whether keeping a trading
          journal is worth the effort. Every guide leads with a direct answer, then goes deeper.
        </p>
      </SectionShell>

      {/* ================================================================
          SECTION 2 — GUIDES + FAQ
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>GUIDES</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Trading guides
        </SectionTitle>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-ds-5 mt-ds-7 max-w-6xl mx-auto">
          {GUIDES.map(({ Icon, title, description, path }) => (
            <Link key={path} to={path} className="block h-full">
              <Card variant="default" padding="default" className="h-full transition-transform hover:-translate-y-0.5">
                <Icon className="w-6 h-6 text-gold-primary mb-ds-3" />
                <h3 className="font-wordmark font-medium text-lg text-ink-primary">{title}</h3>
                <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">{description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 3 — PRODUCT PAGES
      ================================================================ */}
      <SectionShell atmosphere="full">
        <SectionEyebrow>FINOTAUR</SectionEyebrow>

        <SectionTitle as="h2" gradient="split">
          More about Finotaur
        </SectionTitle>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-ds-5 mt-ds-7 max-w-6xl mx-auto">
          {PRODUCT_PAGES.map(({ Icon, title, description, path }) => (
            <Link key={path} to={path} className="block h-full">
              <Card variant="default" padding="default" className="h-full transition-transform hover:-translate-y-0.5">
                <Icon className="w-6 h-6 text-gold-primary mb-ds-3" />
                <h3 className="font-wordmark font-medium text-lg text-ink-primary">{title}</h3>
                <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">{description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 3B — COMPARE
      ================================================================ */}
      <SectionShell atmosphere="subtle">
        <SectionEyebrow>COMPARE</SectionEyebrow>

        <SectionTitle as="h2" gradient="white">
          Compare Finotaur
        </SectionTitle>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-ds-5 mt-ds-7 max-w-6xl mx-auto">
          {COMPARE_PAGES.map(({ Icon, title, description, path }) => (
            <Link key={path} to={path} className="block h-full">
              <Card variant="default" padding="default" className="h-full transition-transform hover:-translate-y-0.5">
                <Icon className="w-6 h-6 text-gold-primary mb-ds-3" />
                <h3 className="font-wordmark font-medium text-lg text-ink-primary">{title}</h3>
                <p className="text-ink-secondary text-[14px] leading-relaxed mt-ds-2">{description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </SectionShell>

      {/* ================================================================
          SECTION 4 — FINAL CTA
      ================================================================ */}
      <SectionShell atmosphere="full" beam={true}>
        <SectionEyebrow>GET STARTED</SectionEyebrow>

        <SectionTitle as="h2" size="large" gradient="split">
          Put these guides into practice
        </SectionTitle>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-ds-4 mt-ds-7">
          <Button asChild variant="gold" size="xl">
            <Link to="/register">Start your 14-day free trial</Link>
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
