---
name: finotaur-design
description: FINOTAUR's design system. Read this skill BEFORE writing or modifying ANY UI code — components, pages, styles, layouts, CSS, Tailwind classes, or anything that renders pixels. Triggers on any mention of: button, card, page, component, color, spacing, padding, margin, font, typography, border, radius, shadow, glow, hover, modal, dropdown, input, form, layout, responsive, dashboard, landing, hero, section, navigation, header, footer, sidebar, table, list, grid, flex, animation, transition, design, style, look, feel, UI, UX, frontend, React component, .tsx file, or .css file. Also triggers when fixing visual bugs, redesigning, polishing, or "making it look better". This skill is the single source of truth — never improvise design values.
---

# FINOTAUR Design System Skill

> You are working on FINOTAUR, an institutional-grade financial intelligence platform. The visual identity is **Bloomberg Terminal × Apple Stocks × Stripe** — premium, minimal, restrained. The user (Elad) cares deeply about visual consistency and has a defined design language.

## Mandatory first step

**Before writing ANY UI code, read `DESIGN_SYSTEM.md` at `finotaur-frontend/DESIGN_SYSTEM.md`.** It contains every color, spacing value, font, and component spec. If you skip this step, you will produce inconsistent output that the user will reject.

```bash
cat finotaur-frontend/DESIGN_SYSTEM.md
```

## The codebase convention (CRITICAL)

This codebase uses **Tailwind classes**, NOT inline `style={{}}`. Every DS token is exposed as a Tailwind utility:

| Token | CSS variable | Tailwind class |
|---|---|---|
| Gold primary | `--gold-primary` | `text-gold-primary`, `bg-gold-primary`, `border-gold-primary` |
| Gold gradient | `--gradient-gold` | `bg-gradient-gold` |
| Gold glow (resting) | `--glow-gold-resting` | `shadow-glow-gold-resting` |
| Surface base (page bg) | `--bg-base` | `bg-surface-base` |
| Surface 1 (cards) | `--bg-surface-1` | `bg-surface-1` |
| Text primary | `--text-primary` | `text-ink-primary` |
| Text secondary | `--text-secondary` | `text-ink-secondary` |
| Border subtle | `--border-subtle` | `border-border-ds-subtle` |
| Negative number | `--num-negative` | `text-num-negative` |
| Radius lg (12px) | `--radius-lg` | `rounded-[12px]` (use literal — Tailwind's `rounded-lg` is 0.5rem ≠ spec) |
| Radius xl (16px) | `--radius-xl` | `rounded-xl` |
| Spacing 5 (24px) | `--space-5` | `p-ds-5`, `m-ds-5`, `gap-ds-5` (NOT `p-5` — Tailwind default is 1.25rem) |

**The `ds-N` spacing utilities** are the ONLY way to enforce the 8px grid. Tailwind defaults (`p-4` etc.) remain available for non-spec code paths.

## The five non-negotiables

These rules are violated most often by AI assistants. Do not violate them.

### 1. Never hardcode design values

```tsx
// ❌ WRONG — hardcoded
<div className="bg-[#0a0a0a] text-[#C9A646] p-[24px]">

// ✅ RIGHT — Tailwind classes that reference DS tokens
<div className="bg-surface-base text-gold-primary p-ds-5">
```

If you find yourself typing a hex code, a px value, or a font name — **stop**. Use the token.

### 2. The primary button is the SIGNATURE component

The gold CTA button is the visual heart of FINOTAUR. It has **specific, locked specs** in `DESIGN_SYSTEM.md` section 8.

The four things that make it "the FINOTAUR button" — never compromise:

| Spec | Value | Why |
|---|---|---|
| Border radius | 12px | Sharp 4–6px corners look retail/aggressive |
| Fill | Gold gradient (135deg) | Flat fill looks 2D and cheap |
| Glow | **Always-on** outer gold glow | This is what makes it feel premium and floating |
| Text case | **Sentence case** ("Try the AI") | Uppercase fights with the rounded warm shape |

```tsx
// ❌ WRONG — sharp, flat, uppercase, no glow
<button className="bg-gold-primary text-black px-8 py-4 rounded uppercase">
  START FREE TRIAL
</button>

// ✅ RIGHT — use the canonical Button component
import { Button } from '@/components/ds/Button';
<Button variant="gold" size="xl">Try the AI — 14 Days Free</Button>
```

The DS `Button` handles the gradient, the glow, the arrow icon, and all hover states. **Do not rebuild it.** If you think you need a new variant, update DESIGN_SYSTEM.md first.

**Maximum one primary button per visible viewport.** Stack two and the brand collapses.

### 3. Numbers are sacred

FINOTAUR is a financial platform. Every number on screen must follow these rules:

- **Font:** JetBrains Mono with tabular figures (use `font-mono tabular-nums`)
- **Color of the value itself:** Always white (`text-num-neutral`), regardless of direction
- **Color of the change:** White if positive, red (`text-num-negative`) if negative
- **Minus sign:** Always U+2212 (`−`), never the hyphen (`-`)
- **Sign on percentages:** Always show (`+1.34%` / `−1.34%`), never bare

Use the `<Price>`, `<Change>`, and `<Quote>` components from `@/components/ds/NumberDisplay`. Do not render numbers manually.

```tsx
// ❌ WRONG
<span className="text-red-500">-$1,230</span>
<span className="text-green-500">+2.52%</span>

// ✅ RIGHT
import { Change } from '@/components/ds/NumberDisplay';
<Change value={-1230} format="currency" />
<Change value={2.52} format="percent" />
```

**Green does not exist on FINOTAUR.** Positive numbers are white. This is a deliberate Apple Stocks convention (Variant 1, locked) — do not "fix" it by adding green.

### 4. Use the canonical components

The reference implementations live in `src/components/ds/`:
- `Button.tsx` — variants: `gold`, `goldOutline`, plus shadcn pass-throughs (`default`, `secondary`, `ghost`, `outline`, `link`, `destructive`)
- `Card.tsx` — variants: `default`, `glass`, `featured`. Also exports `Eyebrow`.
- `NumberDisplay.tsx` — `Price`, `Change`, `Quote`

**Landing-page section components** (new 2026-05-03):
- `landing-new/_shared/SectionShell.tsx` — atmosphere + beam + constructionMarkers container
- `landing-new/_shared/SectionEyebrow.tsx` — uppercase gold label with hairlines
- `landing-new/_shared/SectionTitle.tsx` — polymorphic heading with gradient variants

**Do not rebuild these from scratch.** Import them. If a component lacks a feature, extend it in `src/components/ds/` — don't fork it inline.

The shadcn primitives in `src/components/ui/` (lowercase) are still available for non-CTA buttons and other patterns. The DS `Button` (uppercase, in `ds/`) is the one to use for primary CTAs and any gold-themed action.

### 5. Canonical landing sections

All landing-page sections MUST use `SectionShell` + `SectionEyebrow` + `SectionTitle` from `@/components/landing-new/_shared/`. These handle:
- Atmosphere (radial gradients, construction markers, beams)
- Consistent fade-in animation (framer-motion)
- Max-width container + centering
- Eyebrow gold styling + hairlines
- Title gradient variants and polymorphic sizing

**Don't roll your own atmospheric background.** Don't write inline `from-[#080808]` gradients. Don't create a `<h2>` without `SectionTitle`. The components enforce brand consistency for you.

### 6. When in doubt, stop and ask

Per Elad's directive: **stop and ask, don't improvise.**

```
The DESIGN_SYSTEM.md doesn't specify [X]. I have two options:
  1. [option A — describe it]
  2. [option B — describe it]
Which do you prefer? I'll add the chosen pattern to DESIGN_SYSTEM.md so we lock it in.
```

This is slower than guessing, but it's how the design system stays coherent over time. Every "small improvisation" compounds into design drift after 50 components.

## Specific cases that come up often

### Dropdowns / `<select>` — never white-on-white (🔴 IRON RULE)
A native `<select>` on this dark theme renders its option popup white by default, so light option text becomes invisible. The fix is global, already in `src/styles/globals.css` (`select { color-scheme: dark }` + a `select option {...}` fallback) — every `<select>` is legible with no extra work. Do NOT remove that rule and do NOT set a light `color` on an `<option>` without a matching dark `background`. The `dropdown-guard` CI job blocks PRs that strip the protection. Full rule: DESIGN_SYSTEM.md §8 "native dropdowns are always dark + legible".

### Building a new landing section
Use `SectionShell` + `SectionEyebrow` + `SectionTitle` from `@/components/landing-new/_shared/`. Don't roll your own atmospheric background, don't write inline `from-[#080808]` gradients, don't create a `<h2>` without going through `SectionTitle`. The components handle the brand consistency for you.

### Adding a new color
**Don't.** The palette is fixed: gold, white-on-black, red for negatives only. Green/emerald is forbidden. If you genuinely need a new color (rare — usually for status messages), add it to DESIGN_SYSTEM.md first, then `globals.css`, then `tailwind.config.ts`, then use it.

### Adding a new font size
The type scale has 8 text sizes and 4 number sizes. That's enough. If your layout "needs" a different size, you're probably trying to compensate for spacing or hierarchy issues.

### Adding animations
Per Elad: subtle motion only. No parallax, no auto-play, no decorative motion. Allowed:
- Hover transitions: `duration-base ease-out` (200ms)
- Section fade-in on scroll: 400ms once
- Number count-up on first view: 200ms max

Anything longer than 400ms or more elaborate than fade/translate requires explicit approval.

### When a section's frame is "the problem you have"
Don't. The user explicitly rejected this framing as "childish and salesy". Instead, use the UNLOCK pattern (see BeforeAfter.tsx and DESIGN_SYSTEM.md) — frame the section as "what FINOTAUR provides exclusively". This is the LUXURY framing.

Examples:
- ❌ "Retail traders are fighting with their hands tied"
- ✅ "Unlock the power of FINOTAUR"
- ❌ "You don't have a system"
- ✅ "Personal Trading System — included"

### Working with charts
Charts use the same color rules:
- Data lines: `text-ink-primary` at 0.7 opacity for default
- Highlights: `text-gold-primary`
- Negative regions/values: `text-num-negative`
- Grid lines: `border-border-ds-subtle` (very faint)
- Background: transparent — let the page bg show through

Never use rainbow palettes, gradients, or chart-library defaults.

### Flagship card treatment (for centerpiece cards like AI Engine)
When a card is the visual hero of its section, apply flagship treatment:
- Top-edge gold light bar (1.5px-2px height, 70% width centered, gold gradient horizontal)
- Larger corner brackets (w-3.5 h-3.5 to w-4 h-4 instead of w-3 h-3)
- Stronger shadow: `shadow-card-featured` instead of `shadow-card-rest`
- Dual-layer gradient border via `padding-box / border-box` inline style (since Tailwind can't express this)
- `animate-gold-border-shimmer` for subtle continuous animation
- Optional FLAGSHIP tag above (`tracking-[0.45em] text-[#FFE6A0]` with glowing dot)

Reference implementations: Hero `CarouselCard` (flagship variant), AISection `FinotaurAIEngine` card.

### Glassmorphism
Defined in DESIGN_SYSTEM.md section 6. Three blur levels, defined backgrounds. Use the `<Card variant="glass">` component or the `bg-surface-glass backdrop-blur-glass` Tailwind classes. Heavy on GPU — only use on top-level containers (nav, hero panel), not on items inside scrolling lists.

### shadcn vs DS components
- For NEW UI work: prefer `@/components/ds/` (`Button`, `Card`, `Price`, `Change`, `Quote`).
- For internal patterns that don't render to the user (admin tools, dev panels): shadcn `@/components/ui/` is fine.
- Do NOT mix the two for the same component on the same screen — pick one.

## Self-check before committing UI code

Run this checklist mentally before saving any UI file:

1. □ Did I read DESIGN_SYSTEM.md at the start of this task?
2. □ Are all colors referenced via Tailwind tokens, not arbitrary values (`bg-[#...]`)?
3. □ Are all spacings using `p-ds-N` / `m-ds-N` (or Tailwind defaults intentionally)?
4. □ Are all radii one of: `rounded-sm`, `rounded-md`, `rounded-[12px]`, `rounded-xl`?
5. □ Are all numbers using `<Price>`/`<Change>`/`<Quote>` (not hand-styled spans)?
6. □ Are negative numbers using U+2212, not hyphen? (Handled by `<Change>` automatically.)
7. □ Is there at most one primary gold button per viewport?
8. □ Does my primary button use `<Button variant="gold">`?
9. □ Are positive numbers WHITE (not green)?
10. □ Did I use canonical components from `@/components/ds/` instead of building from scratch?
11. □ If I made a decision not covered by the system, did I ask Elad first?

If any answer is "no", fix it before continuing.

## Quick reference card

```
COLORS (Tailwind classes)
  page bg          bg-surface-base                 #0a0a0a
  card bg          bg-surface-1                    rgba(255,255,255,0.02)
  text             text-ink-primary                #ffffff
  text muted       text-ink-secondary              rgba(255,255,255,0.65)
  brand gold       text-gold-primary               #C9A646
  gold gradient    bg-gradient-gold                E8C766 → C9A646 → A88838
  negative         text-num-negative               #E24B4A
  border subtle    border-border-ds-subtle         rgba(255,255,255,0.08)

SPACING (8px grid — use ds- prefix)
  p-ds-1=4   p-ds-2=8   p-ds-3=12   p-ds-4=16   p-ds-5=24
  p-ds-6=32  p-ds-7=48  p-ds-8=64   p-ds-9=96
  families: p/m/gap/w/h/size + inset (top-ds-N right-ds-N bottom-ds-N
  left-ds-N inset-ds-N inset-x-ds-N inset-y-ds-N) + space-x/y-ds-N
  (prefer gap-ds-N on flex/grid parents in new code)

RADIUS
  rounded-sm     4px   pills, badges
  rounded-md     8px   inputs, dropdowns
  rounded-[12px] 12px  cards, modals, primary buttons (Tailwind's rounded-lg=0.5rem ≠ this)
  rounded-xl     16px  large containers, sparingly

FONTS
  font-sans      Inter                  body, UI
  font-mono      JetBrains Mono         all numbers (combine with tabular-nums)
  font-serif     Cormorant Garamond     hero titles only
  font-display   Cinzel                 luxury headlines (existing Finotaur)

PRIMARY BUTTON (signature component)
  <Button variant="gold" size="xl">Sentence-case label</Button>
  - Auto-applied: 12px radius, gradient fill, always-on glow,
    sentence case, → arrow on right, hover lift

MOTION
  hover/focus  duration-base ease-out (200ms)
  section      duration-slow ease-out (400ms max)
```

Read `finotaur-frontend/DESIGN_SYSTEM.md` for the full specification.

---

## Open questions / future extensions

These were flagged by the original DS package author and are not yet locked. When you encounter them, ask Elad before improvising:

- Specific chart styles (line, candle, area) — token colors and stroke widths
- Toast/notification component spec
- Loading state design (skeleton vs. spinner — when each)
- Empty state design (illustrations? copy tone? CTA?)
- Mobile breakpoint behavior (the system is desktop-first right now)
- Animation library consolidation (8 CSS files exist — single library not yet defined)

When any of these are locked, update `DESIGN_SYSTEM.md` first, then this skill.
