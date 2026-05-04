# DESIGN_AUDIT.md — Phase 0 baseline (2026-05-01)

> Authoritative baseline for the design system migration. All counts captured by direct ripgrep.
> Re-run the commands at the bottom of this file after each phase to track progress.

---

## Executive Summary

Migration scope is **larger than initial estimate**. Components extensively hardcode hex colors and arbitrary Tailwind classes. Major findings:

- **11,625** hex literals in TS/TSX (was reported as 0 — incorrect)
- **6,664** Tailwind arbitrary color classes (`bg-[#`, `text-[#`, `border-[#`)
- **`#C9A646`** is the dominant gold (3,542 uses) — confirms brand DNA
- **`#22C55E` (green)** appears 468 times — **violates spec** (Variant 1: no green on FINOTAUR)
- **Multiple golds** in use (`#C9A646`, `#D4AF37`, `#F4D97B`, `#E5C875`) — needs consolidation
- Landing page (pilot) is contained: **230 hex, 143 arbitrary classes** — feasible for Phase 5

---

## 1. Hardcoded hex colors in TS/TSX files

**Total: 11,625**

### Top 10 hex values across the codebase

| Hex | Count | Maps to token |
|---|---|---|
| `#C9A646` | 3,542 | `--gold-primary` ✓ |
| `#D4AF37` | 577 | Inconsistent — should be `--gold-primary` |
| `#6B6B6B` | 563 | Should be `--text-tertiary` |
| `#22C55E` | 468 | **VIOLATES SPEC** — green forbidden |
| `#EF4444` | 463 | `--num-negative` (close to `#E24B4A`) |
| `#8B8B8B` | 322 | Should be `--text-secondary` or `tertiary` |
| `#0A0A0A` | 253 | `--bg-base` ✓ |
| `#F59E0B` | 249 | Inconsistent gold — should be `--gold-primary` |
| `#F4D97B` | 243 | Inconsistent gold — should be `--gold-bright` |
| `#1A1A1A` | 237 | `--bg-surface-1` (close) |

**Migration insight:** The gold family alone has ~4,600 references across 4 different shades. Consolidating to `--gold-primary`/`--gold-bright`/`--gold-deep` is the highest-leverage cleanup.

---

## 2. Tailwind arbitrary color values in TS/TSX

| Pattern | Count |
|---|---|
| `bg-[#` | 1,894 |
| `text-[#` | 3,833 |
| `border-[#` | 937 |
| **Total** | **6,664** |

These are the easiest to migrate (one-line substitutions).

---

## 3. Tailwind arbitrary spacing in TS/TSX

**Total: 1,058** (combined `p-[`, `m-[`, `gap-[`, `w-[`, `h-[`)

**Implication:** Spacing migration via the `ds-spacing` plugin (Phase 2b) will give us tokenized utilities, but existing call sites stay with arbitrary values until touched. Don't bulk-rewrite.

---

## 4. CSS files in src/styles/

| File | Lines | Category | Phase 1 action |
|---|---|---|---|
| globals.css | 421 | Core design tokens (HSL + hex) | **MERGE new tokens here** |
| theme-luxury.css | 383 | Legacy gold/luxury overlay | Mark deprecated |
| enhanced-animations.css | 563 | Animation library | Out of scope (separate phase) |
| animations.css | 227 | Animation library | Out of scope |
| calendar-animations.css | 96 | Animation library | Out of scope |
| chart-animations.css | 43 | Animation library | Out of scope |
| journal.css | ? | Domain-specific | Out of scope |
| command-palette.css | ? | Component-specific | Out of scope |
| fade.css | ? | Animation utility | Out of scope |
| warzone.css | ? | Feature-specific | Out of scope |

---

## 5. Landing page entry point (Phase 5 pilot)

- **Path:** `src/pages/landing/LandingPage.tsx`
- **Routed at:** `/` (root, line 296 of `src/App.tsx`)
- **Structure:** uses modular components from `src/components/landing-new/` (Navbar, Hero, SocialProof, ...)

### Landing-area baseline (Phase 5 starting point)

| Metric | Count |
|---|---|
| Hex literals in `src/pages/landing/` + `src/components/landing-new/` | **230** |
| Top: `#C9A646` | 211 (92%) |
| Top: `#0a0a0a` | 31 |
| Top: `#F4D97B` | 19 |
| Tailwind arbitrary color classes (`bg-[#`/`text-[#`/`border-[#`) | **143** |

**Migration target for Phase 5:** Reduce both numbers to 0 in the Landing area.

---

## 6. Legacy CSS variable references

| Pattern | Count | Files |
|---|---|---|
| `--color-*` | 19 | globals.css, theme-luxury.css |
| `--gold-*` (non-primary) | 15 | globals.css, theme-luxury.css |
| `--bronze-*` | 3 | globals.css |
| `--bg-*` | 6 | globals.css, warzone.css |
| **Total** | **43** | 3 CSS files only |

**Deprecation impact:** Low. `theme-luxury.css` can be safely deprecated (not deleted) in Phase 1.

---

## 7. shadcn Button variant usage

**Total Button instances: ~168**

| Variant | Count |
|---|---|
| `outline` | 77 |
| `ghost` | 75 |
| `secondary` | 5 |
| `destructive` | 3 |
| `default` | 3 |
| `amber` | 3 (custom — not in shadcn) |
| `standard` | 1 (custom) |
| `link` | 1 |
| `featured` | 1 (custom) |

**Action:** The custom variants (`amber`, `standard`, `featured`) are likely defined in a fork of shadcn `button.tsx` somewhere. Search before extending.

---

## Re-run audit commands (after each phase)

```bash
cd finotaur-frontend

# Total hex in TS/TSX
grep -rEho "#[0-9A-Fa-f]{6}\b" src --include="*.tsx" --include="*.ts" | wc -l

# Top 10 hex values
grep -rEho "#[0-9A-Fa-f]{6}\b" src --include="*.tsx" --include="*.ts" | sort | uniq -c | sort -rn | head -10

# Arbitrary Tailwind colors
grep -rE "bg-\[#|text-\[#|border-\[#" src --include="*.tsx" --include="*.ts" | wc -l

# Arbitrary spacing
grep -rE "p-\[|m-\[|gap-\[|w-\[|h-\[" src --include="*.tsx" --include="*.ts" | wc -l

# Landing page baseline
grep -rEho "#[0-9A-Fa-f]{6}\b" src/pages/landing src/components/landing-new --include="*.tsx" --include="*.ts" | wc -l
grep -rE "bg-\[#|text-\[#|border-\[#" src/pages/landing src/components/landing-new --include="*.tsx" --include="*.ts" | wc -l
```

---

## Phase progress tracker

| Phase | Status | Hex count | Arbitrary count | Notes |
|---|---|---|---|---|
| 0 (baseline) | ✅ 2026-05-01 | 11,625 | 6,664 | Initial scan |
| 1 (tokens) | — | — | — | |
| 2 (tailwind) | — | — | — | |
| 3 (components) | — | — | — | |
| 4 (skill) | — | — | — | |
| 5 (Landing pilot) | — | Landing: 230 → ? | Landing: 143 → ? | Goal: both 0 |
