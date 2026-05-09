# Journal Design Language

**Status:** Active (defined 2026-05-09). Source of truth for all journal-page renovations.
**Owner:** Elad
**Extends:** `DESIGN_SYSTEM.md` — this document adds journal-specific context on top of the base system. Rules here do NOT override the base; they specialise it.

---

## Philosophy

The Journal is the product's analytical engine — the place where a trader reviews past decisions and surfaces patterns that make them better. Every screen must answer: **"What does this number mean for my trading?"**

Three journal-specific principles (layered on top of DESIGN_SYSTEM.md §0):

1. **Metrics are primary, chrome is secondary.** The P&L number, the win-rate gauge, the R-multiple — these are the stars. The card frame is just a container.
2. **Colour encodes meaning, not decoration.** Gold = monetary value. Green = favourable outcome. Red = unfavourable. Blue = neutral count. Purple = risk ratio. Using these colours for any other purpose breaks the semantic contract.
3. **Consistency beats novelty.** Every KPI across Overview, MyTrades, TradeDetail, Strategies, Scenarios, and Analytics must use the same card primitive. Different data — same shell.

---

## The Journal KPI Card

### Anatomy (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│  LABEL                                              ┌─────────┐ │
│  (10px · UPPERCASE · tracking-widest · ink-tertiary)│  ICON   │ │
│                                                     │ CIRCLE  │ │
│  VALUE                                              └─────────┘ │
│  (28–36px · font-mono · ink-primary)                            │
│                                                                  │
│  hint text                          [GAUGE if provided]         │
│  (11px · ink-tertiary)                                          │
├──────────────────────────────────────────────────────────────────┤
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  2px bottom-edge gradient sliver  ▓▓▓▓▓▓▓▓▓▓│
└──────────────────────────────────────────────────────────────────┘
```

**Label** — small-caps eyebrow, positioned top-left. `text-[10px] uppercase tracking-widest text-ink-tertiary font-medium`

**Value** — the hero number, pre-formatted by the caller. `font-mono text-num-large` (28px) or `text-num-display` (48px) depending on `valueSize` prop.

**Hint** — supporting context (e.g. "6 / 9 trades"). `text-[11px] text-ink-tertiary mt-1`

**Icon circle** — top-right corner, 32×32px, tinted background matching the accent. Size of the icon inside: 16×16px.

**Bottom-edge gradient sliver** — 2px tall, full width, colour matched to accent. Creates a subtle colour-coding cue without dominating the surface.

**Background** — `bg-surface-glass backdrop-blur-glass backdrop-saturate-[140%]`. The glass treatment is what distinguishes these cards from standard `<Card>` usage.

**Hover glow** — ambient radial glow positioned at top-left, opacity transitions from 0 to visible on hover. Colour matched to accent.

---

### Props table

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | required | Metric name, e.g. `"Total Trades"` |
| `value` | `string` | required | Pre-formatted value, e.g. `"+$16,825.00"` |
| `hint` | `string` | `undefined` | Supporting sub-text below value |
| `accent` | `Accent` | `'neutral'` | Colour scheme; see Variant table below |
| `icon` | `LucideIcon` | `undefined` | Icon rendered in top-right circle |
| `gauge` | `ReactNode` | `undefined` | Slot for `<JournalGauge />` — displayed right of the text column |
| `valueSize` | `'lg' \| 'xl' \| '2xl'` | `'xl'` | Font size override for long values |

---

### Variant table — accent colours per metric type

| Accent | Token / colour | Metric types |
|---|---|---|
| `gold` | `gold-primary / gold-bright` | P&L, realized profit, monetary values |
| `green` | `status-success (#10b981)` | Win rate, profit factor, positive ratios |
| `red` | `num-negative (#E24B4A)` | Loss rate, max drawdown, negative metrics |
| `blue` | `status-info (#3b82f6)` | Trade count, neutral counts, sessions |
| `purple` | `#9F7AEA` (literal — no token yet; see Token Gaps §) | R-multiple, risk-adjusted metrics |
| `neutral` | `white/5 · ink-secondary` | Fallback for metrics that don't map to a meaning |

**Icon circle bg/text class map:**

```ts
const accentMap: Record<Accent, { bg: string; text: string; sliver: string }> = {
  gold:    { bg: 'bg-gold-primary/15',  text: 'text-gold-bright',    sliver: 'bg-gradient-gold' },
  green:   { bg: 'bg-status-success/15', text: 'text-status-success', sliver: 'from-status-success/60 via-status-success/20 to-transparent' },
  red:     { bg: 'bg-num-negative/15',   text: 'text-num-negative',   sliver: 'from-num-negative/60 via-num-negative/20 to-transparent' },
  blue:    { bg: 'bg-status-info/15',    text: 'text-status-info',    sliver: 'from-status-info/60 via-status-info/20 to-transparent' },
  purple:  { bg: 'bg-[#9F7AEA]/15',      text: 'text-[#9F7AEA]',     sliver: 'from-[#9F7AEA]/60 via-[#9F7AEA]/20 to-transparent' },
  neutral: { bg: 'bg-white/5',           text: 'text-ink-secondary',  sliver: 'from-white/10 via-white/5 to-transparent' },
};
```

---

### Typical usage (TSX)

```tsx
import { JournalKpiCard } from '@/components/journal/ds/JournalKpiCard';
import { JournalGauge }   from '@/components/journal/ds/JournalGauge';
import { Target, TrendingUp, DollarSign, Award } from 'lucide-react';

// 4-up KPI row — standard journal layout
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
```

---

## The Journal Gauge

### Anatomy

```
        ╭──────────────────╮
       ╱  ░░░░░░░▓▓▓▓▓▓░░░  ╲
      ╱  ░ red→gold→green ░  ╲
     │         │ needle         │
     │         ●               │
      ╲                        ╱
       ╰────────────────────╯
      ● wins          ● losses
     3271              934
```

**Track** — semicircle arc, `rgba(255,255,255,0.07)`, strokeWidth=10.
**Fill arc** — gradient overlay from red→gold→green (via CSS `var()` tokens, never hardcoded hex).
**Needle** — line from center to arc position, with a dot at the base. Angle maps percentage linearly from left (0%) to right (100%).
**Glow filter** — `feGaussianBlur` + `feMerge` for soft illumination on the fill arc.
**Legend dots** — coloured circles below the arc, paired with value labels.

### When to use

- Win Rate card: always show the gauge to make the proportion visual.
- Win/Loss Ratio card: show the gauge when avgWin and avgLoss are both non-zero.
- Simple count metrics (Total Trades, Max Drawdown, etc.): no gauge needed.

### Colour rules — the anti-hardcode policy

The old `SegmentedGauge` and `WinLossGauge` used `#00E676` (raw hex) for the "good" end of the gradient. This breaks the token contract.

**New rule (always enforced in `JournalGauge`):**

```ts
// SVG inline style references CSS vars — not hex literals:
const GRADIENT_STOPS = [
  { offset: '0%',   color: 'var(--num-negative)' },   // #E24B4A
  { offset: '45%',  color: 'var(--gold-primary)'  },   // #C9A646
  { offset: '100%', color: 'var(--status-success)' },  // #10b981
] as const;
```

If the token value changes in `globals.css`, the gauge updates for free.

### Mode: `winRate`

Input: `wins`, `losses`, `breakeven?`. Total = wins + losses + breakeven. Needle position = wins/total × 100%.
Legend: green dot "NW" (wins count) + optional gold dot "NBE" + red dot "NL" (losses count).

### Mode: `winLossRatio`

Input: `avgWin`, `avgLoss` (both positive numbers in dollars). Ratio = avgWin / avgLoss. Needle uses log₂ scale so that a 1:1 ratio sits at 50%, 2:1 at ~67%, 0.5:1 at ~33%.
Legend: green dot "+$NNN" + red dot "-$NNN".

### Sizing

`w-full max-w-[120px]` by default. When inside a `JournalKpiCard`, the card's right column constrains it automatically.

---

## Layout grid

### Journal page KPI row (standard)

```tsx
// Overview, MyTrades summary row
<div className="grid grid-cols-1 gap-ds-5 sm:grid-cols-2 lg:grid-cols-4">
  {/* 4 JournalKpiCards */}
</div>
```

| Breakpoint | Columns | Notes |
|---|---|---|
| mobile (<640px) | 1 | Full width — value is big enough to read |
| tablet (640–1024px) | 2 | Standard 2-up pair |
| desktop (>1024px) | 4 | The canonical 4-up KPI row |

### Analytics / drill-down rows

```tsx
// More detailed metrics — 3-up or 6-up grid
<div className="grid grid-cols-1 gap-ds-4 sm:grid-cols-3 lg:grid-cols-6">
```

Use `gap-ds-4` (16px) instead of `gap-ds-5` (24px) when the row has 6+ cards — tighter packing at smaller sizes.

### Gauge-bearing cards

When a card has a gauge, it naturally needs more horizontal space. On a 4-up row, the gauged card(s) naturally expand their right section because the gauge is `max-w-[120px]` — this is fine and intentional.

---

## Migration plan

### Components to migrate (future sessions — do NOT migrate now)

| Current component | Lives in | Replaces | Target session name |
|---|---|---|---|
| `DashboardKpiCard` (Overview.tsx) | `src/components/DashboardKpiCard.tsx` | `JournalKpiCard` | `journal-overview-renovation` |
| `SegmentedGauge` (inside DashboardKpiCard) | `src/components/DashboardKpiCard.tsx` | `JournalGauge` mode="winRate" | (same session) |
| `WinLossGauge` (inside DashboardKpiCard) | `src/components/DashboardKpiCard.tsx` | `JournalGauge` mode="winLossRatio" | (same session) |
| Inline KPI displays in MyTrades.tsx | `src/pages/app/MyTrades.tsx` | `JournalKpiCard` | `journal-mytrades-renovation` |
| Inline stats in TradeDetail pages | various | `JournalKpiCard` | `journal-tradedetail-renovation` |
| Stat rows in Strategies.tsx | `src/pages/app/Strategies.tsx` | `JournalKpiCard` | `journal-strategies-renovation` |

### Migration checklist (per session, when doing a renovation)

1. Import `JournalKpiCard` + `JournalGauge` from `@/components/journal/ds/`
2. Map old `color` string prop → new `accent` enum
3. Map old inline `gaugeData` → separate `<JournalGauge />` in the `gauge` slot
4. Remove `accentBg` / `style={{backdropFilter}}` — those are now internal to the card
5. Delete old component import if no other file uses it (use grep to verify)
6. Run typecheck: `npx tsc --noEmit`
7. Visual verify in DesignLab + in-page

---

## Token gaps (TODO for a future design-system session)

| Gap | Current workaround | Ideal fix |
|---|---|---|
| No `purple` semantic token | Literal `#9F7AEA` in `JournalKpiCard.tsx` and this doc | Add `--metric-ratio: #9F7AEA` to `globals.css` + `tailwind.config.ts` |
| `num-positive` is white (#fff), not green | Win-rate label stays white; gauge uses `status-success` for green | Consider a dedicated `--num-favourable` token distinct from `num-positive` |
| No `accent-*` token family | All accent colours spelled out in `accentMap` | Could extract to a `theme.journal` object in tailwind.config.ts |

These are tracked here, not in TODO comments in code. When a design-system session addresses them, update this doc and remove the workaround.

---

## When NOT to use these primitives

| Context | Use instead |
|---|---|
| Landing page hero stats ("$2M+ tracked daily") | `<Card variant="featured">` from `ds/Card.tsx` |
| Marketing pricing cards | `<Card variant="featured">` |
| Settings / preferences panels | `<Card variant="default">` |
| Admin / internal dashboards | `<Card variant="default">` |
| Navigation stat chips | Plain `<span>` or `<StatBoxCompact>` |

`JournalKpiCard` is for **actionable trading metrics inside the authenticated journal UI only**. If it's visible to unauthenticated users, it's in the wrong place.
