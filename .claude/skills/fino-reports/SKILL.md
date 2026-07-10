---
name: fino-reports
description: FINO Reports engine — the full-screen report carousels behind the three gold Ask Fino buttons (Analyze Journal / My Portfolio / Markets). Read BEFORE touching anything under src/lib/reports/, src/components/reports/, src/pages/app/reports/, the report routes in App.tsx, or the Ask Fino buttons in HomePage.tsx. Triggers on: FINO Reports, report carousel, journal report, portfolio report, markets report, Key Takeaway, Edge Score, TradeCountGate, report slides, ai-reports endpoints.
---

# FINO Reports Engine

TradeZella-class full-screen report carousels. Shipped 2026-07-10 (FE #1338/#1346, server #277/#278). One framework, three reports. **Compute first, LLM last**: every number is computed deterministically; the AI layer only writes narrative on top and the page must read complete without it (fail-soft everywhere).

## File map (all the moving parts)

| Concern | File |
|---|---|
| Entry buttons (3 gold, all tiers) | `src/pages/app/home/HomePage.tsx` (Ask Fino card, under the chips) |
| Routes `/app/reports/{journal,portfolio,markets}` | `src/App.tsx` (lazy) + `src/layouts/ProtectedAppLayout.tsx` HIDE_CHROME_ROUTES has `/app/reports` |
| Shell: dots, arrows, close, slide frame, locked overlay | `src/components/reports/ReportShell.tsx` |
| Key Takeaway box (AI text / skeleton / fallback) | `src/components/reports/KeyTakeaway.tsx` |
| 60-trade lock w/ progress bar (tier-aware-ready) | `src/components/reports/TradeCountGate.tsx` |
| Journal data builder (6 slides) + takeaway inputs + fallbacks | `src/lib/reports/journalReportData.ts` |
| Portfolio data builder (4 slides) | `src/lib/reports/portfolioReportData.ts` |
| Types (slide payloads, API shapes) | `src/lib/reports/reportTypes.ts` |
| API fetchers (fail-soft, return null on ANY error) | `src/lib/reports/reportApi.ts` — base `/api/ai-reports` |
| Pages | `src/pages/app/reports/{Journal,Portfolio,Markets}ReportPage.tsx` |

Canonical stats source: `calculateAllStats` / `calculateBreakdown` from `src/hooks/useTradeStats.ts`. Trades: `useTrades()`. Gating: `useSubscription().hasJournalAccess` (journal), `usePortfolioStats().stats.tradeCount >= 60` (portfolio).

## Server contract (finotaur-server `src/routes/finoReports.ts`, mounted at `/api/ai-reports`)

- `POST /report-takeaways` (auth) — `{reportType:'journal'|'portfolio', periodKey, slides:[{key,title,stats}]}` → `{takeaways:{[slideKey]:string}, cached}`. One batched model call per report. stats = numbers/flat objects/arrays-of-flat-objects only, max depth 2, body ≤16KB, ≤8 slides, 20 uncached generations/user/day (429).
- `GET /markets-report` (auth, any tier) — `{report:{asOf,headline,sections:[{key,title,bullets[]}]}, cached}`. Generated ONCE per day globally, cached in `ai_report_cache` (user_id NULL).
- Cache table `ai_report_cache` (Supabase, service-role only, RLS no user path).

## Iron rules (violations got rejected before — don't re-learn them)

1. **Copy style (Elad, 2026-07-10): practical and to the point — bullet points, each AT MOST 3 sentences.** No paragraph walls, no scene-setting. Applies to markets sections AND Key Takeaways.
2. English-only user-facing text; never mention AI model/vendor names.
3. DS tokens only (`bg-surface-1`, `text-gold-primary`, `p-ds-N`, `text-num-negative`); numbers via `<Price>`/`<Change>` mono tabular; **no green anywhere** — positive is white/gold, red only for negatives; badges: gold GREAT/GOOD, amber NEEDS WORK, red WATCH OUT.
4. AI layer is optional garnish: every slide has a deterministic `fallback` string; `reportApi` must never throw into the page.
5. Locked users get ZERO AI spend (don't call takeaways for locked slides).
6. Never fake data — a pattern whose source field is missing is omitted (tracked in `degradedPatterns`).

## Gotchas (each cost a debugging round)

- `get_portfolio_stats` is `RETURNS TABLE` → PostgREST returns a **one-row array**; parse `data[0]` (fixed in usePortfolioStats — don't regress).
- The ds spacing plugin has **NO inset utilities**: `right-ds-5`/`top-ds-4` silently no-op → mispositioned absolutes. Use standard `right-6`/`top-4`.
- Markets payload shape changes require bumping `MARKETS_FORMAT_VERSION` in the server route (it's baked into `period_key`) or the same-day stale-shape cache row gets served.
- Trade type has no `trade_legs`/executions → Scale-In/Out patterns omitted; Green→Red / Red→Green need `mfe_r`/`mae_r` populated.
- An older separate `src/lib/finoScore.ts` radar exists on Home — the report's Edge Score (in journalReportData.ts, equal weights, documented thresholds) is intentionally separate; consolidation is an open item.

## Cheap extension recipes

- **New journal slide**: add key to `JOURNAL_REPORT_SLIDES` + builder in journalReportData.ts + component in `journal/JournalReportSlides.tsx` + fallback text + (optional) entry in `buildJournalTakeawayInputs`. Nothing else.
- **New report type**: page + data builder + reuse ReportShell/KeyTakeaway; server: extend reportType whitelist + prompt.
- **INVESTOR-tier gating (planned for Markets/Portfolio)**: `TradeCountGate` accepts `requiredTier`; Markets page is structured to be wrapped by a gate without redesign.
