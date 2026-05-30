# FINOTAUR Trade Journal — Completeness Roadmap ("Perfect Journal")

> Companion to `JOURNAL_ASSET_SUPPORT.md`. That file tracks asset-class support;
> this file is the **master gap list** — everything still needed to make the journal
> best-in-class (Tradezella / TraderVue / Edgewonk tier) across every dimension.
> Created 2026-05-30 after the asset-expansion work (Wave 1 + Wave 2 core + reports tab).
>
> Status legend: ✅ done · 🟡 partial · ❌ missing · ❓ verify
> Priority: **P0** launch-blocking for the asset/quality goal · **P1** strong value · **P2** polish/scale

---

## 0. How to read this
The journal is already rich: manual + CSV + Tradovate sync, partial entries/exits, screenshots,
notes/tags/setup/mistakes, strategies, R-multiples, equity curve, calendar heatmap, multi-breakdown
analytics, AI mentor, backtest, multi-portfolio, soft-delete. The gaps below are what stands between
"rich" and "perfect" — held to the same bar as the asset-aware P&L work just shipped.

---

## 1. Connection (brokers) — the biggest lever for "more brokers"

| Item | Status | Pri | Notes |
|---|---|---|---|
| Tradovate (futures) live sync | ✅ | — | Reference implementation (OAuth + WebSocket + fill-pair). |
| Interactive Brokers OAuth | 🟡 stub | **P0** | `ib-oauth.ts` throws "F4 will rewire". Blocks live stocks/options. Finish server-side OAuth + Vault pattern. |
| NinjaTrader live sync | ❌ (CSV only) | P1 | Empty service shell; CSV import works as fallback. |
| **Crypto broker** (Binance / Bybit / Coinbase / Kraken) | ❌ | **P0** | No crypto feed at all. Read-only trades API via `BaseBrokerService`. Spot + perpetual (funding). |
| **Spot-forex broker** (OANDA / MT4-5 bridge) | ❌ | P1 | No FX feed. |
| Auto-reconnect on token failure | 🟡 | P1 | Manual reconnect modal exists; no circuit-breaker / auto-retry (see OQ-72). |
| Broker-sync dedup / idempotency | 🟡 | **P0** | CSV preview flags duplicates but still imports; broker sync has no live dedup. Risk of double-counted trades. |
| Generic broker abstraction hardening | ✅ | — | `IBrokerService`/`BaseBrokerService` is clean and extensible. |

---

## 2. Calculations — hold to the asset-aware bar just shipped

| Item | Status | Pri | Notes |
|---|---|---|---|
| Single P&L source of truth (frontend) | ✅ | — | Unified to `tradeCalculations.ts` this session. |
| Asset-aware P&L (options ×100, forex quote_rate, crypto funding) | ✅ | — | Shipped (Wave 2). |
| Multipliers in a **DB instrument table** (not code-baked) | ❌ | P1 | Today 33 symbols in code (ADL-024). A queryable `instrument_definitions` table opens unlimited contracts and lets sync set exact point values. |
| **Leverage-aware risk display** (crypto/forex) | ❌ | P1 | `leverage` column exists; P&L is correct (leverage ≠ realized P&L) but margin %, "risking X% of account", and **liquidation price auto-calc** are missing. |
| Auto-compute `liquidation_price` | ❌ | P1 | From entry + leverage + side + maintenance margin. |
| Auto-fetch forex `quote_rate` + `pip_size` per pair | ❌ | P1 | Today user-entered / defaults. Needs an FX rate source + pip-size table. |
| Funding auto-accrual for perpetuals | ❌ | P2 | `funding_paid` is manual; ideally pulled from the crypto broker. |
| Per-share / percentage / per-contract **fee model** | 🟡 flat | P1 | Fees are a flat number. Stocks (per-share), options (per-contract), crypto (% taker/maker) differ. |
| Short-borrow / overnight financing | ❌ | P2 | Not modeled. |
| Commission/slippage impact analysis | ❌ | P2 | "How much did fees cost you" report. |

---

## 3. Asset classes — finish what Wave 2 started

| Item | Status | Pri | Notes |
|---|---|---|---|
| Stocks | ✅ | — | Works. |
| Futures | ✅ | — | Core; multiplier table extended to 33. |
| Options: schema + form + ×100 P&L | ✅ | — | Shipped. |
| Options: Greeks / time-decay / intrinsic-extrinsic / assignment | ❌ | P2 | For serious options journaling. |
| Crypto: schema + form + spot/perp + funding field | ✅ | — | Shipped (entry + calc). |
| Crypto: live perp data (funding, liquidation) | ❌ | P1 | Needs the crypto broker (see §1). |
| Forex: schema + form + quote_rate P&L | ✅ | — | Shipped. |
| Forex: multi-currency account conversion (auto) | 🟡 | P1 | `account_currency`/`quote_rate` columns exist; conversion is manual. |
| **Asset-class filter** in MyTrades list | ❌ | P1 | Reports now segment by class; the trade list still can't filter by it. |

---

## 4. Analytics & reporting

| Item | Status | Pri | Notes |
|---|---|---|---|
| Win rate / profit factor / expectancy / drawdown / streaks | ✅ | — | Rich; multiple pages (`Analytics`, `Statisticspage`). |
| Equity curve, calendar heatmap, day/time/session breakdowns | ✅ | — | Present. |
| **Asset-class breakdown** | ✅ | — | Reports tab shipped this session (+ `Statisticspage` had a symbol/asset view). Consolidate the two so there's one canonical asset view. |
| R-multiple distribution surfaced everywhere | 🟡 | P2 | Exists in `Statisticspage`, not consistent across pages. |
| Tag / risk-bucket full breakdown UI | 🟡 | P1 | Grouping helpers exist; UI partial. |
| **MFE / MAE** (max favorable/adverse excursion) | ❌ | P1 | Requires per-trade price-path data; high-value coaching metric. |
| Multi-currency reporting | 🟡 | P1 | Columns exist; no grouping/conversion in reports. |
| Benchmark vs index (SPY/BTC) | ❌ | P2 | "Did you beat buy-and-hold." |
| Per-asset-class segmentation across ALL reports | 🟡 | P1 | Only the new tab + `Statisticspage` segment; Overview/Summary/Calendar still flat. |

---

## 5. Risk management

| Item | Status | Pri | Notes |
|---|---|---|---|
| Risk-per-trade settings (1R, commissions) | ✅ | — | `useRiskSettings`. |
| Portfolio size / per-trade caps | ✅ | — | `usePortfolios`. |
| Standalone **position-sizing calculator** | 🟡 | P1 | Embedded in risk-only mode; not a standalone tool. |
| **Real-time daily-loss-limit alert** (journal side) | ❌ | P1 | Limits enforced only in Trade Copier; journal has no live warning. |
| Max-drawdown alert | ❌ | P2 | Computed post-hoc only. |
| Rule-violation real-time warning at entry | 🟡 | P2 | Rules exist; AI flags post-hoc, not at entry time. |
| Risk-of-ruin / Kelly | ❌ | P2 | Advanced. |

---

## 6. Data integrity & scale

| Item | Status | Pri | Notes |
|---|---|---|---|
| Soft-delete | ✅ | — | `deleted_at`. |
| Edit / delete trades | ✅ | — | Inline in detail. |
| CSV export | ✅ | — | `Export.tsx`. |
| **PDF / shareable report export** | ❌ | P2 | Only CSV today. |
| Undo / restore soft-deleted trades | ❌ | P2 | No restore UI. |
| Broker-sync dedup / idempotency | 🟡 | **P0** | See §1 — double-count risk. |
| **Pagination / server-side aggregation** | ❌ | **P0 (scale)** | All trades loaded into memory. Breaks at 50k-user North Star + heavy journals. Partly addressed by OQ-63 phases. |
| Multi-account / multi-portfolio | ✅ | — | `PortfolioContext`. |
| `asset_class` backfill for legacy rows | ⏭ skipped | — | Frontend fallback classifies by symbol; DB UPDATE unsafe (trigger recomputes pnl — see ASSET_SUPPORT §6). |
| Automated test coverage for the calc engine | ❌ | **P1** | No test runner. The P&L engine is business-critical and untested — regressions are caught only by tsc + manual. A vitest suite over `tradeCalculations.ts` is high-leverage. |

---

## 7. Journaling / review depth

| Item | Status | Pri | Notes |
|---|---|---|---|
| Trade detail, notes, setup, mistakes, tags, screenshots | ✅ | — | Strong. |
| Strategies / playbooks + rules | ✅ | — | `Strategies`, `RuleEditorModal`. |
| AI mentor (briefing + chat + violations) | ✅ | — | `finotaur-ai`. |
| Backtest / replay | ✅ | — | `backtest/`. |
| **Pre-trade plan vs post-trade review** split | ❌ | P1 | Distinguish planned thesis from outcome reflection. |
| Emotional / psychology tagging + analytics | 🟡 | P2 | Tags exist; no dedicated emotion model or "tilt" detection. |
| Screenshot annotation (draw on chart) | ❌ | P2 | Upload only. |
| Per-asset-class playbook templates | ❌ | P2 | Options vs futures playbooks differ. |

---

## 8. UX & platform

| Item | Status | Pri | Notes |
|---|---|---|---|
| Filtering / search / sort in lists | 🟡 | P1 | Search + outcome/date filters exist; explicit sort UI + asset-class/strategy filter chips missing. |
| Pagination UI | ❌ | P0 (scale) | See §6. |
| Mobile-optimized trade entry | 🟡 | P1 | Responsive base; complex entry form not mobile-tuned. |
| Dark mode | ✅ | — | Default; light mode untested. |
| **Visual QA of Wave 2 form fields + reports tab** | ❌ | **P0** | Shipped code is type-checked + checker-passed but not yet eyeballed on `localhost:5173`. Do this first next session. |

---

## 9. Suggested sequencing (next sessions)

1. **Session N+1 — Live feeds + auto-calcs** (the agreed "next half"):
   IB OAuth completion · first crypto broker (read-only) · auto `liquidation_price` · auto forex `quote_rate`/pip-size · visual QA of Wave 2.
2. **Session N+2 — Reporting depth**: asset-class filter in MyTrades · consolidate the two asset views · MFE/MAE · multi-currency reporting.
3. **Session N+3 — Scale + safety**: pagination / server-side aggregation · broker-sync dedup/idempotency · **vitest suite for `tradeCalculations.ts`**.
4. **Session N+4 — Risk + journaling depth**: standalone position-sizing tool · real-time loss-limit alert · pre-trade-plan vs review split.
5. **Later (P2)**: options Greeks · PDF export · benchmark vs index · psychology analytics · screenshot annotation.

**P0 shortlist (do these to call the asset/quality goal "done"):** IB OAuth · crypto broker · broker-sync dedup · pagination/server-side agg · visual QA · (P1 close behind) calc-engine tests.
