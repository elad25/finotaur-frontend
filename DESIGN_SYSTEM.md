# FINOTAUR Design System

> **Single source of truth for all visual decisions across FINOTAUR.**
> If a value is not defined here, it does not exist. Do not improvise.

**Last updated:** 2026-05-01
**Owner:** Elad
**Status:** Active — enforced by `.claude/skills/finotaur-design/`

---

## 0. Philosophy

FINOTAUR is **institutional-grade**, not retail-flashy. The reference points are Bloomberg Terminal, Apple Stocks, and Stripe Dashboard — **never** Robinhood, Webull, or generic crypto apps.

Three principles, in priority order:

1. **The data is the hero.** Numbers are the most important element on every screen. UI never competes with them.
2. **Gold is a statement, not decoration.** Used sparingly for CTAs, key headings, and brand accents only. If gold appears in more than ~5% of a screen, something is wrong.
3. **Minimalism over flash.** Subtle motion, restrained color, generous whitespace. Premium feel comes from restraint.

If a design decision violates these, escalate to Elad before shipping.

---

## 1. Color tokens

All colors are defined as CSS variables in `tokens.css`. **Never hardcode hex values in components.** Always reference the variable.

### Brand
| Token | Value | Usage |
|---|---|---|
| `--gold-primary` | `#C9A646` | Primary CTAs, key headings, brand accents |
| `--gold-hover` | `#D4B25A` | Hover state for gold buttons |
| `--gold-bright` | `#E8C766` | Bright highlight in gold gradients (CTA top edge) |
| `--gold-deep` | `#A88838` | Deep tone in gold gradients (CTA bottom edge) |
| `--gold-muted` | `rgba(201, 166, 70, 0.7)` | Section eyebrows, secondary gold text |
| `--gold-border` | `rgba(201, 166, 70, 0.2)` | Subtle gold dividers, glassmorphism borders |
| `--gold-glow` | `rgba(201, 166, 70, 0.45)` | Outer glow on primary CTAs (always on, not just hover) |

### Surfaces
| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `#0a0a0a` | Page background — the deepest layer |
| `--bg-surface-1` | `rgba(255, 255, 255, 0.02)` | Cards, sections raised one level |
| `--bg-surface-2` | `rgba(255, 255, 255, 0.04)` | Hover states, nested surfaces |
| `--bg-glass` | `rgba(20, 20, 20, 0.6)` | Glassmorphism panels |

### Text
| Token | Value | Usage |
|---|---|---|
| `--text-primary` | `#ffffff` | Body text, primary numbers, prices |
| `--text-secondary` | `rgba(255, 255, 255, 0.65)` | Supporting text, descriptions |
| `--text-tertiary` | `rgba(255, 255, 255, 0.45)` | Hints, metadata, timestamps |
| `--text-muted` | `rgba(255, 255, 255, 0.30)` | Disabled states, placeholders |
| `--text-on-gold` | `#0a0a0a` | Text inside gold buttons (always near-black) |

### Borders
| Token | Value | Usage |
|---|---|---|
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | Default card/section borders |
| `--border-default` | `rgba(255, 255, 255, 0.12)` | Hover borders, emphasized dividers |
| `--border-strong` | `rgba(255, 255, 255, 0.20)` | Active/focused element borders |

### Semantic — financial data (Variant 1: Apple Stocks Pure Minimal)
This is the most rule-governed section. **Read carefully.**

| Token | Value | Usage |
|---|---|---|
| `--num-neutral` | `#ffffff` | The price/value itself — ALWAYS white, regardless of direction |
| `--num-positive` | `#ffffff` | Positive change (gain, profit, +%) — also white |
| `--num-negative` | `#E24B4A` | Negative change (loss, drop, −%) — the only red on the platform |

**The rule:** Color goes on the **change**, never on the **value**.
- ✅ `$182.31` (white) with `−2.47 (−1.34%)` (red below)
- ✅ `$182.31` (white) with `+12.18 (+2.52%)` (white below)
- ❌ Price rendered in red because the stock is down
- ❌ `+2.52%` rendered in green — green doesn't exist on FINOTAUR

**Why no green:** Apple Stocks uses red for losses and white for everything else. This avoids the "Christmas tree" effect of red+green dashboards and lets the user's eye travel to losses (the thing they need to act on) faster.

### Status (for system messages, NOT financial data)
| Token | Value | Usage |
|---|---|---|
| `--status-info` | `#3b82f6` | Informational badges, links |
| `--status-warning` | `#eab308` | Warnings (NOT for financial data) |
| `--status-error` | `#E24B4A` | Errors, validation (same hue as `--num-negative`) |
| `--status-success` | `#10b981` | Confirmations, save states (NOT for financial data) |

---

## 2. Typography

Three fonts. Each has a single, defined purpose. Do not mix.

| Font | Token | Usage |
|---|---|---|
| **Inter** | `--font-sans` | Body text, UI labels, paragraphs, navigation, buttons |
| **Inter** | `--font-data` | App data numbers — prices, percentages, P/L, ratios, metrics |
| **JetBrains Mono** | `--font-mono` | Code, IDs, technical strings, and Landing-only market texture |
| **Cormorant Garamond** | `--font-serif` | Hero titles, "FINOTAUR" wordmark, marketing headlines only |

### Type scale
| Token | Size | Weight | Line-height | Usage |
|---|---|---|---|---|
| `--text-display` | `72px` | 500 | 1.1 | Hero ("FINOTAUR" on landing) — Cormorant only |
| `--text-h1` | `48px` | 500 | 1.2 | Page titles |
| `--text-h2` | `32px` | 500 | 1.25 | Section headers |
| `--text-h3` | `24px` | 500 | 1.3 | Card titles |
| `--text-h4` | `18px` | 500 | 1.4 | Sub-section titles |
| `--text-body` | `15px` | 400 | 1.6 | Default paragraph text |
| `--text-small` | `13px` | 400 | 1.5 | Supporting text, metadata |
| `--text-eyebrow` | `11px` | 500 | 1.4 | Section eyebrows (uppercase, letter-spacing 1.5px) |

### Number sizing (override — uses `--font-data`)
| Token | Size | Usage |
|---|---|---|
| `--num-display` | `48px` | Featured numbers (hero metrics, dashboard headline) |
| `--num-large` | `28px` | Setup Card prices, key metrics |
| `--num-default` | `22px` | Standard prices in lists |
| `--num-small` | `13px` | Inline numbers, change indicators |

### Number formatting rules
- Use **U+2212 (−)** for minus, never U+002D (-). Visual width matches `+`.
- Tabular figures: `font-feature-settings: "tnum"` always on for numbers.
- Letter-spacing: `-0.5px` for sizes ≥22px, `0` for smaller.
- Currency: `$1,234.56` — comma thousands, period decimal, no space.
- Percentages: `+1.34%` / `−1.34%` — sign always shown, two decimals default.

---

## 3. Spacing — 8px grid

All spacing is a multiple of 8px. No exceptions for ad-hoc values.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | `4px` | Inside-element gaps (icon to label) |
| `--space-2` | `8px` | Tight component spacing |
| `--space-3` | `12px` | Default form/control spacing |
| `--space-4` | `16px` | Card internal padding (small) |
| `--space-5` | `24px` | Card internal padding (default) |
| `--space-6` | `32px` | Section internal spacing |
| `--space-7` | `48px` | Between sections (small) |
| `--space-8` | `64px` | Between major sections |
| `--space-9` | `96px` | Hero / page-section breathing room |

**The 4px exception:** 4px is allowed because it's half the grid and used for fine-grained gaps (icon-to-text). Anything between 4px and 8px (5, 6, 7) is forbidden.

---

## 4. Border radius

Three values. Pick the one that matches the component category — never invent a fourth.

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `4px` | Pills, badges, small tags, inline indicators |
| `--radius-md` | `8px` | Inputs, dropdowns, small surfaces |
| `--radius-lg` | `12px` | Cards, modals, sections, **primary buttons** |
| `--radius-xl` | `16px` | Optional larger card variant (use sparingly) |

**Forbidden:** `border-radius: 6px`, `10px`, `14px`, `20px`, `999px` (full pill).
The only full-radius element allowed is the avatar circle (`border-radius: 50%`).

---

## 5. Shadow & glow

Two systems: functional shadows (depth) and gold glow (premium accent).

### Functional shadows
| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.4)` | Resting cards (rare on dark theme) |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.5)` | Hover cards, dropdowns |
| `--shadow-lg` | `0 12px 32px rgba(0,0,0,0.6)` | Modals, popovers |

### Gold glow (the FINOTAUR signature accent)
| Token | Value | Usage |
|---|---|---|
| `--glow-gold-resting` | `0 0 24px 4px rgba(201, 166, 70, 0.25)` | **Primary CTA — always on, not just hover** |
| `--glow-gold-hover` | `0 0 32px 6px rgba(201, 166, 70, 0.40)` | Primary CTA on hover |
| `--glow-gold-active` | `0 0 16px 2px rgba(201, 166, 70, 0.30)` | Primary CTA on click/active |
| `--glow-gold-strong` | `0 0 60px 8px rgba(201, 166, 70, 0.35)` | Hero element glow only — once per page max |

**Rule:** Gold glow only on gold elements. Never glow other colors.

---

## 6. Glassmorphism

```css
.glass-panel {
  background: var(--bg-glass);
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
  border: 0.5px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}
```

| Use case | Blur | Background opacity |
|---|---|---|
| Navigation bar (top) | 16px | 0.7 |
| Standard card | 12px | 0.6 |
| Subtle overlay | 8px | 0.4 |

**Performance:** `backdrop-filter` is GPU-expensive. Use only on top-level containers, never on nested elements within scrolling lists.

---

## 7. Motion

Per Elad's directive: **subtle motion only**.

### Allowed
- Hover transitions on interactive elements: `transition: all 200ms ease-out`
- Fade-in on scroll for sections: opacity 0 → 1 over 400ms, triggered once
- Number count-up for featured metrics on first view (200ms duration max)
- Focus ring fade-in on inputs

### Forbidden without explicit Elad approval
- Parallax scrolling
- Auto-playing carousels
- Animated background patterns
- Mouse-tracking effects
- Confetti, particle effects
- Any animation longer than 400ms

### Tokens
```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--duration-fast: 150ms;
--duration-base: 200ms;
--duration-slow: 400ms;
```

---

## 8. Component specs

### Button — Primary (Gold CTA) ⭐ THE SIGNATURE COMPONENT

The most important visual element on FINOTAUR. **Canonical reference: the rounded gold CTA in the Pricing section's "featured plan" card.** Updated 2026-05-01 after Elad's review of the live site — supersedes the original outer-glow spec.

**Specs (locked):**
- **Shape:** Rounded rectangle, `border-radius: 16px` (`rounded-xl`) — distinctly more curved than the prior 12px version
- **Fill:** 135° gold gradient with bright peak in the **center** (gives the button a "lit-from-within" feel):
  `linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)`
- **Shadow:** Drop shadow + inner highlight (gives it a "physical button" quality, not a floating glow):
  `0 4px 20px rgba(201,166,70,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`
- **Text:** Sentence case ("Start 14-Day Free Trial", not "START 14-DAY FREE TRIAL"). Always.
- **Text color:** `#000` (`--text-on-gold`).
- **Font weight:** 600 (`font-semibold`) — never 700 (700 looks heavy + crowded against the gradient).
- **Hover:** `transform: scale(1.02)` (subtle "approaching you" effect) + slightly stronger shadow. **NOT** a translateY lift — that's the deprecated style.
- **Transition:** `all 300ms ease-out`.
- **Arrow icon:** Optional. Default ON for `gold` variant via the `<Button>` component. Inline `flex gap-2`.

```css
.btn-primary {
  /* Shape */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;             /* py-3 px-6 — Pricing canonical */
  border: none;
  border-radius: 16px;            /* rounded-xl */

  /* Fill — bright peak in center, dimensional */
  background: linear-gradient(
    135deg,
    #C9A646 0%,
    #F4D97B 50%,
    #C9A646 100%
  );

  /* Text */
  color: #000;                    /* var(--text-on-gold) */
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;

  /* Shadow — drop + inner highlight, the "physical button" signature */
  box-shadow:
    0 4px 20px rgba(201, 166, 70, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);

  cursor: pointer;
  transition: all 300ms ease-out;
}

.btn-primary:hover {
  transform: scale(1.02);
  box-shadow:
    0 6px 28px rgba(201, 166, 70, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.btn-primary:active {
  transform: scale(0.99);
}

.btn-primary:focus-visible {
  outline: none;
  box-shadow:
    0 6px 28px rgba(201, 166, 70, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    0 0 0 3px rgba(201, 166, 70, 0.3);
}
```

**Sizes** (use `<Button size="...">`):
- `default`: `py-3 px-6 text-sm` — body sections, single CTA
- `xl`: `py-4 px-10 text-base` — hero CTAs, large emphasis
- `compact`: `py-2 px-5 text-xs` — navbar, inline placement (replaces the deprecated sharp-uppercase nav style)
- `full`: `py-3 w-full text-sm` — Pricing-style full-width CTA inside cards

**Rules:**
- Maximum **one** primary gold button per visible viewport. Stack two and the brand collapses.
- All gold elements site-wide use this same gradient + shadow + 16px radius. Never the `rounded-sm + uppercase + tracking` style — that is officially deprecated.

**Migration note (from prior spec):**
- Old `--glow-gold-resting` (radial outer glow) is **deprecated** for the primary CTA but kept in tokens for any future "ambient highlight" use. Do NOT apply to buttons going forward.
- Old `--gradient-gold-deep` (E8C766→C9A646→A88838) is kept in tokens for non-CTA uses if needed (e.g., decorative panels), but the canonical button gradient is now `--gradient-gold` (C9A646→F4D97B→C9A646).

### Gradient tokens reference

| Token | Direction | Usage |
|---|---|---|
| `--gradient-gold` / `bg-gradient-gold` | 135° horizontal | Primary CTA buttons (canonical) |
| `--gradient-gold-vertical` / `bg-gradient-gold-vertical` | top→bottom | Hero wordmark splash, Navbar wordmark (`vertical-lit` tone) |

`--gradient-gold-vertical` values: `rgba(255,230,160,1) 0%` → `rgba(230,195,100,0.98) 25%` → `rgba(201,166,70,0.92) 60%` → `rgba(150,120,50,0.80) 100%`. Creates a "lit from above" dimensional feel — light gold at top, deep bronze at bottom.

### Button — Secondary (Outlined)
**Used for:** "Login", "Learn More", secondary actions. Can appear multiple times per viewport.

```css
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
  padding: 14px 28px;
  border-radius: var(--radius-lg);   /* matches primary for consistency */
  border: 0.5px solid var(--border-default);
  transition: border-color var(--duration-base) var(--ease-out),
              color var(--duration-base) var(--ease-out);
}

.btn-secondary:hover {
  border-color: var(--gold-primary);
  color: var(--gold-primary);
}
```

### Button — Ghost (Text-only)
**Used for:** Tertiary actions, "Cancel", inline links.

```css
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: none;
  padding: 8px 12px;
  font-family: var(--font-sans);
  font-size: 14px;
  transition: color var(--duration-base) var(--ease-out);
}

.btn-ghost:hover {
  color: var(--gold-primary);
}
```

### Card (default)
```css
.card {
  background: var(--bg-surface-1);
  border: 0.5px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  transition: border-color var(--duration-base) var(--ease-out);
}

.card:hover {
  border-color: var(--border-default);
}
```

### Card — Featured (gold-accented)
For "FLAGSHIP" labels, recommended plans. Border accent only.
```css
.card-featured {
  background: var(--bg-surface-1);
  border: 0.5px solid var(--gold-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  position: relative;
}
.card-featured:hover {
  border-color: var(--gold-primary);
}
```

### Input
```css
.input {
  background: var(--bg-surface-1);
  border: 0.5px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 15px;
  transition: border-color var(--duration-base) var(--ease-out),
              box-shadow var(--duration-base) var(--ease-out);
}

.input:focus {
  outline: none;
  border-color: var(--gold-primary);
  box-shadow: 0 0 0 3px rgba(201, 166, 70, 0.15);
}

.input::placeholder {
  color: var(--text-muted);
}
```

### Number display (price/metric)
Use the React components in `src/components/ui/NumberDisplay.tsx`:
- `<Price>` — the value itself, always white
- `<Change>` — the delta, white if positive, red if negative
- `<Quote>` — combined ticker-symbol + price + change layout

Never render numbers manually with `<span style={{color: 'red'}}>`.

### Section eyebrow
```css
.eyebrow {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--gold-muted);
}
```

---

## 9. Do / Don't reference

### ✅ Do
- Use `var(--gold-primary)` instead of `#C9A646`
- Render the minus sign as `−` (U+2212) in all displayed numbers
- Use `--font-data` / `tabular-nums` for app data numbers
- Apply always-on gold glow to primary buttons (not just hover)
- Use `border-radius: var(--radius-lg)` (12px) for primary buttons and cards
- Pad cards with `var(--space-5)` (24px) by default
- Use sentence case on primary CTAs ("Try the AI — 14 Days Free")

### ❌ Don't
- Hardcode `#C9A646`, `#0a0a0a`, or any other hex value
- Use green for positive numbers — only white
- Use the hyphen `-` for negative numbers — use `−` (U+2212)
- Mix Cormorant Garamond into body text
- Add motion longer than 400ms without approval
- Use `border-radius: 6px`, `10px`, or `999px`
- Stack more than one gold CTA per viewport
- Make primary buttons sharp-edged (4-6px) — they must be 12px+ rounded
- Make primary buttons without glow — the glow is the signature

---

## 10. When you don't know

If a design decision is needed and this document doesn't define it:

1. **Stop.** Do not improvise.
2. Check the closest analogous component in this document.
3. If still unclear, ask Elad before writing code.

This is enforced by the `finotaur-design` skill — Claude Code will refuse to ship undefined patterns.

---

## 11. Wordmark — "FINOTAUR" lockup ⭐ LOCKED 2026-05-01

The brand wordmark is composed of two parts. The split, color, and order are **locked**.

### Locked rules

| Rule | Value |
|---|---|
| Order | "FINO" then "TAUR" — never reversed |
| FINO color | Gold gradient (`bg-gradient-gold bg-clip-text text-transparent`) — premium dimensional |
| TAUR color | White (`var(--text-primary)`) |
| Font family | Outfit (`font-wordmark`) — geometric, modern, scales cleanly |
| Weight | 700 (`font-bold`) |
| Tracking | Tight, scale-dependent (`-0.01em` compact → `-0.025em` display) |
| Hover (when interactive) | Subtle drop-shadow gold glow `drop-shadow(0 0 8px rgba(201,166,70,0.5))` |

**FINO is gold. TAUR is white. Always.** Earlier inconsistencies (FINO white / TAUR gold in Navbar, Footer, TopNav) were corrected on 2026-05-01.

### Use the canonical component

```tsx
import { Wordmark } from '@/components/ds/Wordmark';

<Wordmark size="nav" interactive />         // global Navbar (22px, vertical-lit by default)
<Wordmark size="compact" interactive />     // legacy compact (16px — prefer "nav" for navbar)
<Wordmark size="default" interactive />     // footer
<Wordmark size="large" />                   // login/signup pages
<Wordmark size="display" />                 // splash hero (rare)
```

**Sizes** (auto-applies tracking + responsive scaling):
- `nav` — 22px, `font-medium`, `tracking-[-0.015em]` — **global Navbar only**. Defaults to `vertical-lit` tone (no explicit tone prop needed).
- `compact` — 16px, `font-bold` — legacy; kept for backward compatibility
- `default` — 24px, footer / inline body / login
- `large` — 36px, auth landing pages
- `display` — 60-72px responsive, splash hero

**Tone variants:**
- `tone="gradient"` (default for all sizes except `nav`) — premium dimensional gold for FINO, horizontal 135°
- `tone="vertical-lit"` — lit-from-above vertical gradient (`--gradient-gold-vertical`). Default for `size="nav"`. Creates dimensional connection to the Hero wordmark.
- `tone="solid"` — flat gold for very small renders (favicon, dense lists)

### Special exception: Hero splash

The 70-160px "FINOTAUR" splash on the landing Hero (Hero.tsx ~line 805) uses a **vertical solid-fill gradient** treatment for dramatic impact. It's not technically a wordmark — it's a hero moment. It does NOT follow the FINO/TAUR split because at that scale the unified text reads as a single brand statement. Do NOT replicate this treatment elsewhere; for any other context, use `<Wordmark>`.

### ❌ Don't

- Render `<span>FINO</span><span>TAUR</span>` inline anywhere — use `<Wordmark>`
- Reverse the colors (TAUR gold + FINO white)
- Use `text-yellow-500`, `text-gold`, or any non-token gold color for FINO
- Use a different font for the wordmark (Cinzel, Cormorant, Inter — all WRONG)
- Use the wordmark for prose mentions inside body text — use plain `FINOTAUR` text in a sentence ("FINOTAUR is built for…"), reserve `<Wordmark>` for logo placements only

### Navigation patterns

- **Top nav is limited to 4 main links maximum.** Current set: Features, Pricing, Journal, About. Adding a fifth requires removing one.
- Logo in the top nav always uses `<Wordmark size="nav" interactive />` — no inline fallback.
- A 1px hairline underline (`bg-gradient-to-r from-transparent via-gold-primary/30 to-transparent`) runs below the nav wordmark at all times (always-on, not a hover state).

### Open follow-ups (not yet decided)

The following inline `FINOTAUR` mentions in body text use ad-hoc styling. Decide later whether to convert each to `<Wordmark>` or leave as plain text:
- `src/pages/app/ai/AIAssistant.tsx:166` — `<span text-white>FINOTAUR</span>` in a header
- `src/pages/app/journal/JournalLandingPage.tsx:1058` — "The FINOTAUR Vision" headline
- `src/pages/app/TopSecret/TopSecretLanding.tsx:326` — `<p text-white font-bold>FINOTAUR</p>`
- `src/pages/JournalPublicPage.tsx:727` — "The FINOTAUR Vision" headline

---

## 12. Section Pattern (Landing Page)

All landing-new sections follow a unified component hierarchy to maintain visual cohesion. The three shared building blocks live in `src/components/landing-new/_shared/`:

### SectionShell
Container component wrapping entire sections. Provides:
- **atmosphere prop** (`'full'` | `'subtle'` | `'none'`):
  - `'full'`: Radial gradient background from section-specific tokens, deepest atmosphere
  - `'subtle'`: Lighter gradient, reduced visual weight for secondary sections
  - `'none'`: Transparent, used when section is already contained in a larger atmospheric context
- **beam**: Boolean. When true, renders the "atmospheric beam" (animated vertical light) — use sparingly, max once per page
- **constructionMarkers**: Boolean. Renders semi-visible construction lines + markers (geometric guides, very faint)
- **framer-motion fade-up**: Auto-applied on mount (opacity 0→1, translateY via spring physics)
- **max-w-7xl centered container**: Wraps children with proper page-width constraint and padding

**Usage:**
```tsx
<SectionShell id="how-it-works" atmosphere="subtle" beam={false}>
  {/* children auto-faded in */}
</SectionShell>
```

### SectionEyebrow
Uppercase label preceding a section heading. Characteristics:
- **Style**: 11px all-caps, letter-spacing 1.5px, gold color, flanked by thin hairlines (one left, one right)
- **Sizes**:
  - `'default'` (11px) — standard section label
  - `'lg'` (13px) — emphasis for featured sections
- **Color**: Uses `--gold-eyebrow` token (distinct from `--text-eyebrow`, which is a font-size token — collision avoided)
- **Always centered** within its container

**Usage:**
```tsx
<SectionEyebrow size="default">How It Works</SectionEyebrow>
```

### SectionTitle
Display-level heading. Always uses `--font-wordmark` (Outfit, geometric) + `font-medium`. Polymorphic sizing and gradient variants.

**Sizes:**
- `'default'` (32px) — most sections
- `'large'` (48px) — major section headers (Hero-adjacent)
- `'display'` (64-72px responsive) — rare, splash moments only

**Gradient variants:**
- `'vertical-lit'` — top-to-bottom gradient (lit-from-above effect, matches Hero wordmark)
- `'horizontal-gold'` — left-to-right gold sweep (135° diagonal)
- `'white'` — solid white, no gradient (for simple readability)
- `'split'` — two-color (part gold, part white) — apply via inline `<span>` wrapper on text nodes

**Usage:**
```tsx
<SectionTitle size="large" gradient="split">
  One intelligence layer. <span className="text-gold-primary">Three stages.</span>
</SectionTitle>
```

**Core Rule:**
> All landing-new sections MUST use `<SectionShell>`. New sections without it will be flagged in design review.

### The UNLOCK card pattern (Phase F2 invention)
Used in `BeforeAfter.tsx` to frame "what FINOTAUR provides" in an exclusive, institutional way (vs the older "what's wrong with you" framing).

Each UNLOCK card has:
- Tiny eyebrow with leading gold dot: "● UNLOCK 01"
- Big numeral (font-wordmark, vertical-lit gradient, text-7xl)
- Title (font-wordmark font-medium, text-2xl/3xl)
- 1-2 sentence description (font-sans light)
- Hairline divider
- "INCLUDES" label + chip row showing component features

Use this pattern for any "feature triad" sections. Don't duplicate it across multiple sections (would feel repetitive).

---

## 13. Semantic Token Layers (Light Mode Strategy)

**Updated 2026-05-03** — Light Mode infrastructure added (Sprint F, Phase 1).

### New Section-Specific Background Tokens

| Token | Light Value | Dark Value | Usage |
|---|---|---|---|
| `--bg-section-base` | TBD (Sprint F) | `#0a0a0a` (page-bg equivalent) | Section background, deepest layer |
| `--bg-section-deep` | TBD | `rgba(255,255,255,0.01)` | Nested section containers, raised one level |
| `--bg-section-radial-mid` | TBD | Center stop of radial gradient, mid-tone dark | Radial section fills |
| `--bg-section-card-rest` | TBD | `rgba(255,255,255,0.02)` | Cards within sections, resting state |
| `--bg-section-card-deep` | TBD | `rgba(255,255,255,0.04)` | Cards within sections, nested/hover state |

### Construction Markers (Decorative Lines)

Faint geometric guides for visual structure (used in atmosphere prop):

| Token | Value | Usage |
|---|---|---|
| `--construction-line` | `rgba(201,166,70,0.06)` | Grid lines, very subtle |
| `--construction-line-strong` | `rgba(201,166,70,0.12)` | Accent lines, stronger visibility |
| `--construction-marker` | `rgba(255,255,255,0.03)` | Corner/junction markers |

### Atmospheric Beam

Vertical light accent running through sections (animated, subtle):

| Token | Value | Usage |
|---|---|---|
| `--beam-ambient` | `rgba(255,200,100,0.02)` | Outer diffuse glow |
| `--beam-medium` | `rgba(255,200,100,0.06)` | Mid-intensity beam core |
| `--beam-core` | `rgba(255,200,100,0.12)` | Center-line of beam (brightest) |

### Card Shadow Tokens (Depth)

Three-tier shadow system for cards within landing sections:

| Token | Value | Usage |
|---|---|---|
| `--shadow-card-rest` | `0 2px 8px rgba(0,0,0,0.3)` | Card resting state |
| `--shadow-card-hover` | `0 8px 20px rgba(0,0,0,0.5)` | Card hover (slight lift) |
| `--shadow-card-featured` | `0 12px 32px rgba(201,166,70,0.2)` | Featured card (gold-tinged shadow) |

### Eyebrow Color Tokens

Distinct from typography size tokens (collision avoided):

| Token | Value | Usage |
|---|---|---|
| `--gold-eyebrow` | `rgba(201,166,70,0.8)` | Standard eyebrow text color |
| `--gold-eyebrow-hairline` | `rgba(201,166,70,0.3)` | Hairlines flanking eyebrow text |

### Light Mode Strategy (Per ADL-008)

All semantic tokens are currently defined in `:root` (dark defaults). **Sprint F implementation:**

1. **Phase 1 (Complete — 2026-05-03):** Semantic token infrastructure added. All 16 new CSS variables defined in `globals.css`, exposed as Tailwind utilities. Opacity-modifier support fixed on `gold.*` and `num.negative` tokens (function form in `tailwind.config.ts`).

2. **Sprint F (Remaining):** Add `:root.light { --token: light-value; }` overrides in `globals.css` for all 5 bg-section-* tokens (to be specified after visual QA). No component changes required — dark: prefix unused, component code stays the same.

**Critical Rule:**
> New code MUST use semantic tokens. NO hardcoded `#XXXXXX` or `rgba()` outside the var definitions in `globals.css`. This will enable light-mode toggle with zero component refactoring.

### Opacity Modifier Support

Gold and negative number tokens support Tailwind's opacity syntax:
```tsx
// ✅ WORKS (via function form)
<div className="text-gold-primary/30">Subtle gold text</div>
<div className="bg-num-negative/20">Light red background</div>

// Token definition (in tailwind.config.ts):
gold: { primary: ({ opacityValue }) => opacityValue ? `rgba(201,166,70,${opacityValue})` : 'rgba(201,166,70,1)' }
```

---

## 14. Color Discipline

**Green does NOT exist on FINOTAUR.** The single legacy emerald usage (status pulse animation for live AI) was removed in 2026-05-03 design pass. New code MUST NOT introduce green/emerald.

**Red is allowed ONLY via `text-num-negative` token**, and ONLY for these contexts:
1. Negative financial values (losses, drops, down %) — Hero number rules apply
2. The "Before" card in Design Philosophy section (visual contrast to "After" gold)

**Never use raw `text-red-500`, `#ef4444`, or `bg-red-100`.** All red goes through the token.

### Sections that were deleted (2026-05-03)
The following sections were removed from the landing page during the Phase F design pass:
- **Reframe** (was: "What if you had a team of analysts...") — became redundant after BeforeAfter was reframed to UNLOCK pattern.
- **Scarcity** (was: "153 of 1,000 seats remaining") — removed by product decision.

**If reintroducing similar concepts later:** check the UNLOCK pattern (see `BeforeAfter.tsx`) — it covers the "what you get" framing in a more luxurious way.

## Loaders

Canonical loader: `src/components/ds/Spinner.tsx`.
- `<Spinner size="sm|md|lg" color="gold|inherit" />` — gold ring (bright gold arc over a faint track). Use `color="inherit"` inside gold-filled buttons.
- `<PageLoader text="Loading..." timedOut={false} />` — full-screen route/auth loader.
Spin speed is globally 1.2s per rotation (tailwind.config.ts `animation.spin`). Do NOT create new bespoke spinners — use these. (Globe loaders in Copilot/Warzone are intentional exceptions.)

### Skeleton vs Spinner — when each (LOCKED 2026-06-04)

The rule, no exceptions:

| Loading situation | Use |
|---|---|
| Content / data with a known layout (page, card, table, chart, KPI row) | **Skeleton** |
| Route / lazy-chunk transition | **Skeleton** (`RouteSkeleton`, route-aware) |
| In-button action feedback (Save, Submit, Connect, Refresh icon) | **Spinner** (`<Spinner color="inherit">`) |
| Copilot / Warzone landing visual | **GlobeLoader** (intentional exception) |

Rationale: a spinner on a full page hides the layout and feels slower; a skeleton mirrors the destination so the swap is shift-free and reads as "filling in". Spinners are reserved for short, localized action feedback where there is no layout to mirror.

Canonical skeleton: `src/components/ds/Skeleton.tsx` (uses the gold `animate-shimmer` sweep).
- `<Skeleton className="h-4 w-32" />` — base shimmer block; size via className.
- `<SkeletonText lines={3} />` — paragraph lines.
- `<SkeletonStat />` / `<SkeletonStatRow count={4} />` — KPI cells / header row.
- `<SkeletonCard lines withGrid />` — content card (optional sub-grid).
- `<SkeletonTable rows cols />` — data table.
- `<SkeletonChart height="h-64" />` — chart panel.
- `<SkeletonGrid count cols />` — responsive card grid.
- `RouteSkeleton` (`src/components/ds/RouteSkeleton.tsx`) — route-transition fallback; maps the current path to the right silhouette. Wired into `App.tsx` `SuspenseRoute`.

Do NOT hand-roll one-off skeleton components — compose from the primitives above. Do NOT fall back to a full-page spinner for data/route loading.
