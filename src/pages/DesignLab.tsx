/**
 * DesignLab — visual playground for the FINOTAUR design system.
 *
 * Mounted at /design-lab in DEV builds only. Use this page to verify
 * tokens, components, and combinations after every design-system change.
 *
 * @see DESIGN_SYSTEM.md
 */

import { useState } from "react";
import { Button } from "@/components/ds/Button";
import { ColorSwatchPicker } from "@/pages/app/trading-arena/components/ColorSwatchPicker";
import { Card, Eyebrow } from "@/components/ds/Card";
import { Price, Change, Quote } from "@/components/ds/NumberDisplay";
import { JournalKpiCard } from "@/components/journal/ds/JournalKpiCard";
import { JournalGauge } from "@/components/journal/ds/JournalGauge";
import { Target, TrendingUp, DollarSign, Award } from "lucide-react";

/** Stateful harness for the Trading Arena color picker (Body Up/Down pair). */
function ColorPickerDemo() {
  const [upColor, setUpColor] = useState("#4CAF50");
  const [downColor, setDownColor] = useState("#F44336");
  return (
    <div className="flex items-center gap-ds-6 rounded-lg border border-[rgba(201,166,70,0.25)] bg-[#0A0A0B] p-ds-5">
      <ColorSwatchPicker label="Up" value={upColor} onChange={setUpColor} />
      <ColorSwatchPicker label="Down" value={downColor} onChange={setDownColor} />
      <span className="text-caption text-ink-secondary">
        up: {upColor} · down: {downColor}
      </span>
    </div>
  );
}

export default function DesignLab() {
  return (
    <div className="min-h-screen bg-surface-base text-ink-primary">
      <div className="mx-auto max-w-6xl p-ds-7">
        {/* Header */}
        <header className="mb-ds-8">
          <Eyebrow>Design System</Eyebrow>
          <h1 className="mt-ds-2 font-serif text-h1 text-ink-primary">
            FINOTAUR Design Lab
          </h1>
          <p className="mt-ds-3 max-w-xl text-body text-ink-secondary">
            Visual reference for tokens, primitives, and the gold CTA signature.
            If something here looks wrong, the design system is broken — not the page.
          </p>
        </header>

        {/* ----- Buttons ----- */}
        <section className="mb-ds-9">
          <Eyebrow>Buttons</Eyebrow>
          <h2 className="mt-ds-2 mb-ds-5 font-serif text-h2">Primary CTA · Secondary · Ghost</h2>

          <div className="grid grid-cols-1 gap-ds-5 md:grid-cols-3">
            {/* Gold variants */}
            <Card padding="spacious">
              <Eyebrow>Gold (signature)</Eyebrow>
              <div className="mt-ds-4 flex flex-col gap-ds-4 items-start">
                <Button variant="gold" size="xl">Try the AI — 14 Days Free</Button>
                <Button variant="gold">Start free trial</Button>
                <Button variant="gold" size="compact">Start trial</Button>
              </div>
            </Card>

            {/* Outline */}
            <Card padding="spacious">
              <Eyebrow>Gold outline</Eyebrow>
              <div className="mt-ds-4 flex flex-col gap-ds-4 items-start">
                <Button variant="goldOutline" size="xl">Learn more</Button>
                <Button variant="goldOutline">Login</Button>
                <Button variant="goldOutline" size="compact">View docs</Button>
              </div>
            </Card>

            {/* Ghost / shadcn pass-through */}
            <Card padding="spacious">
              <Eyebrow>shadcn pass-through</Eyebrow>
              <div className="mt-ds-4 flex flex-col gap-ds-4 items-start">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </Card>
          </div>
        </section>

        {/* ----- Trading Arena color picker ----- */}
        <section className="mb-ds-9">
          <Eyebrow>Trading Arena</Eyebrow>
          <h2 className="mt-ds-2 mb-ds-5 font-serif text-h2">ColorSwatchPicker (TV-style)</h2>
          <ColorPickerDemo />
        </section>

        {/* ----- Cards ----- */}
        <section className="mb-ds-9">
          <Eyebrow>Cards</Eyebrow>
          <h2 className="mt-ds-2 mb-ds-5 font-serif text-h2">Surface variants</h2>

          <div className="grid grid-cols-1 gap-ds-5 md:grid-cols-3">
            <Card variant="default" padding="default">
              <Eyebrow>Default</Eyebrow>
              <h3 className="mt-ds-3 font-serif text-h3">Standard surface</h3>
              <p className="mt-ds-2 text-body text-ink-secondary">
                Subtle border, low-elevation. The default container for everything.
              </p>
            </Card>

            <Card variant="glass" padding="default">
              <Eyebrow>Glass</Eyebrow>
              <h3 className="mt-ds-3 font-serif text-h3">Glassmorphism</h3>
              <p className="mt-ds-2 text-body text-ink-secondary">
                Backdrop blur. Reserve for top-level containers — GPU-expensive.
              </p>
            </Card>

            <Card variant="featured" padding="default">
              <Eyebrow>Featured</Eyebrow>
              <h3 className="mt-ds-3 font-serif text-h3">Recommended plan</h3>
              <p className="mt-ds-2 text-body text-ink-secondary">
                Gold border accent. Use for "FLAGSHIP" / recommended items.
              </p>
            </Card>
          </div>
        </section>

        {/* ----- Numbers ----- */}
        <section className="mb-ds-9">
          <Eyebrow>Numbers — Variant 1 (Apple Stocks)</Eyebrow>
          <h2 className="mt-ds-2 mb-ds-5 font-serif text-h2">Price · Change · Quote</h2>

          <div className="grid grid-cols-1 gap-ds-5 md:grid-cols-2">
            <Card padding="spacious">
              <Eyebrow>Quote — gain</Eyebrow>
              <div className="mt-ds-4">
                <Quote symbol="AAPL" price={194.27} change={4.83} changePercent={2.55} size="large" />
              </div>
            </Card>

            <Card padding="spacious">
              <Eyebrow>Quote — loss</Eyebrow>
              <div className="mt-ds-4">
                <Quote symbol="TSLA" price={182.31} change={-2.47} changePercent={-1.34} size="large" />
              </div>
            </Card>

            <Card padding="spacious">
              <Eyebrow>Price scale</Eyebrow>
              <div className="mt-ds-4 flex flex-col gap-ds-3">
                <Price value={1234567.89} size="display" />
                <Price value={1234.56} size="large" />
                <Price value={42.10} size="default" />
                <Price value={0.95} size="small" />
              </div>
            </Card>

            <Card padding="spacious">
              <Eyebrow>Change states</Eyebrow>
              <div className="mt-ds-4 flex flex-col gap-ds-3">
                <Change value={2.52} format="percent" />
                <Change value={-1.34} format="percent" />
                <Change value={12.18} format="plain" decimals={2} />
                <Change value={-2.47} format="plain" decimals={2} />
              </div>
            </Card>
          </div>
        </section>

        {/* ----- Journal Cards ----- */}
        <section className="mb-ds-9">
          <Eyebrow>Journal Cards</Eyebrow>
          <h2 className="mt-ds-2 mb-ds-5 font-serif text-h2">Journal-grade Glass KPI Cards</h2>
          <p className="mb-ds-5 text-body text-ink-secondary max-w-xl">
            The single primitive used across every journal page (Overview, MyTrades, TradeDetail,
            Strategies, Scenarios, Analytics). Pairs glass background with a coloured bottom-edge
            sliver and an icon top-right.
          </p>
          <div className="grid grid-cols-1 gap-ds-5 md:grid-cols-2 lg:grid-cols-4">
            <JournalKpiCard
              label="Total Trades"
              value="9"
              hint="6W / 3L / 0BE"
              icon={Target}
              accent="blue"
            />
            <JournalKpiCard
              label="Win Rate"
              value="66.7%"
              hint="6 / 9 trades"
              icon={TrendingUp}
              accent="green"
              gauge={<JournalGauge mode="winRate" wins={6} losses={3} breakeven={0} />}
            />
            <JournalKpiCard
              label="Net P&L"
              value="+$16,825.00"
              hint="Profit"
              icon={DollarSign}
              accent="gold"
              valueSize="lg"
            />
            <JournalKpiCard
              label="Avg R"
              value="+8.76R"
              hint="Per trade"
              icon={Award}
              accent="purple"
            />
          </div>

          <h3 className="mt-ds-7 mb-ds-3 font-serif text-h3">Journal Gauge — standalone</h3>
          <div className="flex gap-ds-5">
            <JournalGauge mode="winRate" wins={6} losses={3} breakeven={0} />
            <JournalGauge mode="winLossRatio" avgWin={3271} avgLoss={934} />
          </div>
        </section>

        {/* ----- Color palette ----- */}
        <section className="mb-ds-9">
          <Eyebrow>Tokens</Eyebrow>
          <h2 className="mt-ds-2 mb-ds-5 font-serif text-h2">Color swatches</h2>
          <div className="grid grid-cols-2 gap-ds-3 md:grid-cols-4">
            <Swatch name="gold-primary" className="bg-gold-primary" textClass="text-ink-on-gold" />
            <Swatch name="gold-bright" className="bg-gold-bright" textClass="text-ink-on-gold" />
            <Swatch name="gold-deep" className="bg-gold-deep" textClass="text-ink-on-gold" />
            <Swatch name="gradient-gold" className="bg-gradient-gold" textClass="text-ink-on-gold" />
            <Swatch name="surface-base" className="bg-surface-base border border-border-ds-default" />
            <Swatch name="surface-1" className="bg-surface-1 border border-border-ds-default" />
            <Swatch name="surface-2" className="bg-surface-2 border border-border-ds-default" />
            <Swatch name="num-negative" className="bg-num-negative" textClass="text-ink-primary" />
          </div>
        </section>
      </div>
    </div>
  );
}

function Swatch({
  name,
  className,
  textClass = "text-ink-primary",
}: {
  name: string;
  className: string;
  textClass?: string;
}) {
  return (
    <div className={`rounded-[12px] p-ds-4 h-24 flex items-end ${className}`}>
      <code className={`font-mono text-num-small ${textClass}`}>{name}</code>
    </div>
  );
}
