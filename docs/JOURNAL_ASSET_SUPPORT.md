# FINOTAUR Trade Journal — Asset & Broker Support Matrix

> Living document. Source of truth for "what the journal supports today and what is missing"
> per asset class and per broker. Created during the 2026-05-30 asset-expansion investigation.
> Update this file at the end of every asset-expansion sub-wave.

---

## 1. Executive verdict (updated 2026-05-30, after Wave 1 + Wave 2 core)

| Asset class | Fit now | Remaining blocker |
|---|---|---|
| **Stocks** | 🟢 ~85% — works | Per-asset report segmentation; flat fee model |
| **Futures** | 🟢 ~85% — the core | Multipliers code-baked (ADL-024); broker = Tradovate only |
| **Options** | 🟡 ~70% — entry + P&L work | Reports segmentation; Greeks/time-decay; live IB feed |
| **Crypto** | 🟡 ~65% spot+perp entry works | Auto liquidation calc; a crypto broker connection |
| **Forex** | 🟡 ~65% | Auto quote-rate fetch; pip-size auto per pair; spot-forex broker |

**What changed this session:** P&L unified to one engine; schema gained 13 asset-specific columns;
the calc engine is now asset-class-aware (options ×100, forex quote-rate, crypto funding); the entry
form has an explicit asset-class selector with conditional per-asset fields. Options/crypto/forex
moved from "detected-but-broken" to "enter-and-calculate-correctly". The remaining gaps are
**reporting segmentation** and **live broker feeds** per class (see §6).

---

## 2. Connection layer (brokers)

Shared abstraction: `IBrokerService` / `BaseBrokerService`
(`src/services/brokers/base/BaseBrokerService.ts`). Adding a broker = implement
`connect / disconnect / fetchTrades / syncTrades` + register in `BROKER_CONFIGS` + a mapper to the
unified `BrokerTrade` shape.

| Broker | Connection | Real status | Assets delivered |
|---|---|---|---|
| **Tradovate** | OAuth 2.0 (server) + WebSocket realtime | ✅ Production (~2,200 LOC) | **Futures only** |
| **Interactive Brokers** | IBRIT (token + queryId) | ⚠️ Read-only; OAuth = stub ("F4 will rewire") | Stocks / Options / Futures / Forex |
| **NinjaTrader** | API key | ❌ Empty shell (~35 LOC) | — |
| **CSV import** | File upload | ✅ Works (auto-detect IB/TD/Alpaca, FIFO pairing) | Stocks / Options / Futures |
| TD / Alpaca / TradingView / MT4-5 | — | ❌ Config only, no API calls | — |

**Gaps that matter for the North Star ("open to more brokers + assets"):**
- Only **one** live broker (Tradovate = futures). Everything else is manual / CSV.
- IB OAuth is the bridge to live stocks/options and is **blocked** (J2 sprint, OQ-14).
- **No crypto broker** (Binance/Bybit/Coinbase/Kraken) and **no spot-forex broker**.

---

## 3. Calculation engine

**Single source of truth (frontend):** `src/utils/tradeCalculations.ts`
— `ASSET_MULTIPLIERS`, `getAssetMultiplier(symbol, assetClass?)`, `calculatePnL(trade)`,
`calculateTradeMetrics`, `calculateStats`.

> **P&L is computed in three layers**: a DB trigger (`handle_trade_changes_unified`), the
> Tradovate sync edge function, and the frontend. For broker-synced trades the **broker's realized
> P&L is authoritative** and is stored in `trades.pnl` — the naive
> `(exit−entry)·qty·mult−fees` formula cannot reconstruct it from aggregate prices, and must not
> overwrite it.

### Fixed in Wave 1 (2026-05-30)
- ✅ Unified all frontend P&L to `tradeCalculations.ts` (removed duplicate calcs in
  `AIReview.tsx`, `TradeFormDialog.tsx`).
- ✅ Removed duplicate `ASSET_MULTIPLIERS` tables (`journalStore.ts`, `New.tsx`) → import canonical.
- ✅ Canonical table extended to 33 symbols (added HG, 6B, 6J, 6A, ZC, ZW, ZS).
- ✅ **Bug**: CSV import wrote `pnl` without the contract multiplier (`useImportTrades.ts`) — fixed
  (was latent: 0 CSV trades in prod, so no corruption occurred).
- ✅ **Bug**: bare `"BTC"`/`"MBT"` resolved to the CME futures multiplier even for spot —
  `getAssetMultiplier` now takes an optional `assetClass` and returns 1 for non-futures spot symbols.

### Backfill diagnostic result (2026-05-30)
40 closed trades in production, all futures. 0 CSV-imported, 0 crypto. The 2 P&L "mismatches" are
Tradovate-synced MNQM6 trades whose stored P&L is broker-authoritative. **No backfill required.**

---

## 4. Per-asset detail — HAVE vs MISSING

### 4.1 Stocks 🟢
- **Have:** `(exit−entry)·qty−fees`, fractional qty, symbol detection.
- **Missing:** per-share fee model, short-borrow fee, report segmentation by asset class.

### 4.2 Futures 🟢
- **Have:** per-trade `multiplier` column, 33-symbol canonical table with `normalizeSymbol`
  root fallback (MNQM6 → MNQ), `contract_month` / `contract_id` / `underlying_symbol` columns,
  Tradovate realtime sync, FIFO pairing, partial entries/exits.
- **Missing:** multipliers are code-baked (ADL-024); migrating to a DB-backed instrument table
  would open unlimited contracts. Broker coverage = Tradovate only.

### 4.3 Options 🔴
- **Have:** `underlying_symbol`, `contract_month`; symbol-regex detection; ×100 in the RR
  calculator only.
- **Missing (schema):** `option_type` (CALL/PUT), `strike_price`, `expiration_date`.
- **Missing (form):** no option fields shown; no asset-type selector.
- **Missing (calc):** ×100 not applied in actual P&L; no time-decay / assignment / intrinsic split.
- **Status (2026-05-30):** ✅ 3 columns added; ✅ conditional form fields; ✅ ×100 in canonical P&L.
  Remaining: report segmentation; Greeks / time-decay / intrinsic split; live IB options feed.

### 4.4 Crypto 🔴
- **Have:** fractional qty; spot symbol regex; (post-Wave-1) correct ×1 for spot.
- **Missing (schema):** `leverage`, `position_type` (spot/perpetual/margin), `liquidation_price`,
  `funding_paid`.
- **Missing (form):** leverage input, position-type selector, liquidation display.
- **Missing (calc):** leverage-adjusted risk; funding cost for perpetuals; no pair (base/quote) model.
- **Status (2026-05-30):** ✅ 4 columns added; ✅ leverage + position-type + funding form fields;
  ✅ spot ×1 + funding subtracted in P&L. Remaining: auto liquidation calc; a crypto broker feed;
  report segmentation. (Note: leverage affects margin/risk display, not realized P&L.)

### 4.5 Forex 🟡
- **Have:** pip-size detection (JPY vs others), pip-value calc, lot field (in hook, not exposed).
- **Missing (schema):** `account_currency`, `quote_currency`, `base_currency`, `quote_rate`,
  `pip_size`, `lot_size`.
- **Missing (calc):** `pipValue = 10 * 1 * fxUsd` and `fxUsd = 1` are hardcoded
  (`useRiskRR.tsx:28,84`) — a non-USD account computes wrong pip values; no quote→account conversion.
- **Missing (form):** lot-size input, account-currency selector.
- **Status (2026-05-30):** ✅ 6 columns added; ✅ lot-size + account-currency + quote-rate form
  fields; ✅ P&L uses units×quote_rate. Remaining: auto quote-rate fetch; pip-size auto per pair;
  spot-forex broker feed; report segmentation.

---

## 5. Cross-cutting gaps (all asset classes)
- ✅ ~~Form has no explicit asset-class selector~~ — DONE (selector + conditional fields, 2026-05-30).
- ✅ ~~Reports do not segment by `asset_class`~~ — DONE ("Asset Class" tab in Breakdowns, 2026-05-30).
- **Journal list (MyTrades table) has no asset-class filter** — still flat; candidate for a filter chip.
- `asset_class` is NULL on 32 of 40 production trades, but the reports fallback classifies them by
  symbol, so this is cosmetic. DB backfill skipped on purpose (see §6 — trigger-recompute risk).

---

## 6. Wave 2 status tracker (updated 2026-05-30)

| Sub-wave | Schema | Form | Calc | Reports | Status |
|---|---|---|---|---|---|
| Options | ✅ | ✅ | ✅ | ✅ | core + reports done |
| Crypto | ✅ | ✅ | ✅ | ✅ | core + reports done |
| Forex | ✅ | ✅ | ✅ | ✅ | core + reports done |

**Done:**
- Schema: 13 nullable columns applied to `public.trades` (3 migrations, additive, forward-only):
  options (`option_type`, `strike_price`, `expiration_date`), crypto (`leverage`, `position_type`,
  `liquidation_price`, `funding_paid`), forex (`base_currency`, `quote_currency`, `account_currency`,
  `quote_rate`, `pip_size`, `lot_size`).
- Calc: `tradeCalculations.ts` asset-aware via `pointsToUsd()` + `getEffectiveMultiplier()`
  (options ×100, forex units×quote_rate, crypto mult−funding). Futures/stocks byte-identical.
- Form: explicit asset-class selector + conditional fields in `New.tsx`, persisted via
  `journalStore` → `lib/journal.ts` / `lib/trades`. Options save `multiplier=100`.
- Types: `database.types.ts` + `Trade.ts` extended.

- Reports: **"Asset Class" breakdown tab** in `reports/Breakdowns.tsx` — per-class count / win-rate /
  net P&L / avg R, via `trade.asset_class ?? getAssetClass(symbol)`.

**`asset_class` backfill — intentionally SKIPPED (2026-05-30):** the 32 NULL Tradovate rows
(MNQM6 / MESM6) are already classified as Futures at display time by the `getAssetClass(symbol)`
fallback, so reports are correct without a DB write. A naive `UPDATE ... SET asset_class` is also
**unsafe**: the BEFORE trigger `handle_trade_changes_unified` recomputes `pnl` on every UPDATE of a
closed regular-mode trade, which would overwrite the broker-authoritative P&L on the 2 MNQM6
mismatch rows. If a backfill is ever needed, do it without re-firing the pnl recompute.

**Remaining (next session — external feeds + auto-calcs):**
1. **Live broker feeds** — IB OAuth (stocks/options), a crypto broker (Binance/Bybit), spot-forex.
2. **Auto-compute** `liquidation_price` (crypto) and auto-fetch `quote_rate` / pip-size (forex).
3. Visual QA of the new form fields + reports tab on `http://localhost:5173/` (pending).
