# TradingView Advanced Charts — Migration Plan

> Decision (Elad, 2026-06-07): adopt TradingView **Advanced Charts / Trading Terminal**
> (the licensed Charting Library) for the chart + drawing tools, instead of polishing
> the custom `lightweight-charts` + canvas-overlay drawing system. Rationale: drawing
> tools are deep, commodity, never-finished infra; building them in-house diverts the
> team from the real differentiators (journal / AI / copier / backtest). Adopt, don't build.
>
> Status: **SCAFFOLDING (pre-access)** — library binaries not yet available.

---

## 0. The one blocker — Elad-only (cannot be done by the agent)
The Charting Library is **free** but gated behind an application + license acceptance.
The agent is forbidden from accepting ToS / applying on Elad's behalf.

**Elad must:**
1. Apply at <https://www.tradingview.com/advanced-charts/> (recommend **Trading Terminal** —
   superset of Advanced Charts, also free — to leave room for on-chart order placement
   in the backtest).
2. Accept the license → receive access to the private GitHub repo with the library files.
3. Drop the `charting_library/` + `datafeeds/` static bundle into the app's public dir
   (e.g. `public/charting_library/`). It is loaded at runtime via `<script>`, NOT bundled.

Everything below is built **without** the binaries and is a no-op until they land.

---

## 1. Architecture — the adapter boundary
Keep the library at arm's length behind a thin seam so the rest of the app (and a
future white-label swap to ChartIQ / DXcharts) never depends on TradingView's API.

```
domain (backtest session, trades, journal)
        │
        ▼
  <TradingViewChart>           ← flagged wrapper, lazy-loads window.TradingView.widget
        │   ├── FinotaurDatafeed   (implements TV Datafeed API, wraps ChartDataSource)
        │   ├── SupabaseSaveLoad   (implements IExternalSaveLoadAdapter → Supabase)
        │   └── theme/featureset/localization config
        ▼
  ChartDataSource.getBars(symbol, interval, from, to)   ← EXISTING seam (Yahoo / Binance)
```

The existing `lightweight-charts` chart (`BacktestReplayChart`) stays untouched and
remains the default until the TV path is proven (Forward-Only).

## 2. Files (additive — nothing existing is modified)
- `src/components/charting/tradingview/types.d.ts` — minimal local type shim for the
  global `window.TradingView.widget` + Datafeed/SaveLoad interfaces (so we build green
  before the real `@types` arrive with the library).
- `src/components/charting/tradingview/FinotaurDatafeed.ts` — implements `onReady`,
  `resolveSymbol`, `getBars`, `subscribeBars`, `unsubscribeBars`, `searchSymbols`;
  delegates bar fetches to an injected `ChartDataSource`. Resolution config: a single
  exchange, intraday + daily, `supports_marks: false`, `supported_resolutions` mapped
  from our `Interval` union.
- `src/components/charting/tradingview/supabaseSaveLoad.ts` — implements
  `IExternalSaveLoadAdapter` (getAllCharts / saveChart / removeChart / getChartContent
  + drawing-template + study-template methods) persisting to a Supabase table
  `chart_layouts` keyed by `user_id`. (Migration ships separately, gated on Elad's DB
  approval — DB boundary rule.)
- `src/components/charting/tradingview/TradingViewChart.tsx` — the wrapper. Loads the
  library `<script>` if `window.TradingView` is absent, constructs `new widget({...})`
  with: `library_path: '/charting_library/'`, `datafeed: new FinotaurDatafeed(source)`,
  `save_load_adapter`, `theme: 'dark'`, `locale: 'en'` (iron rule: English-only),
  `custom_css_url` for FINOTAUR theming, `disabled_features` / `enabled_features`,
  `autosize: true`. Renders nothing (returns a graceful placeholder) when the flag is
  off OR `window.TradingView` is unavailable.
- `src/components/charting/tradingview/featuresets.ts` — the FINOTAUR `disabled_features`
  / `enabled_features` arrays (hide unwanted header buttons, enable drawing-tools tray,
  use_localstorage_for_settings off → use our save_load_adapter, etc.).
- Flag: `VITE_TRADINGVIEW_CHARTS` env + a runtime guard. Off by default.

## 3. Resolution / symbol mapping
| Our `Interval` | TV resolution |
|---|---|
| 1m/2m/5m/15m/30m | "1","2","5","15","30" |
| 60m / 1h | "60" |
| 4h | "240" |
| 1d | "1D" |
| 1wk | "1W" |
| 1mo | "1M" |

Symbol is passed through already-resolved (Yahoo `MNQ=F` / Binance `BTCUSDT`), same as
`ChartDataSource` expects. `searchSymbols` can proxy the existing symbol-suggest endpoint.

## 4. Replay + trades + journal re-wiring (phased)
1. **P1 — Read-only chart parity**: TV chart renders session bars via the datafeed,
   behind the flag, on a hidden route. Verify drawings work natively (the whole point).
2. **P2 — Replay**: use TV's built-in **bar replay** OR drive bars progressively through
   the datafeed to mirror the current replay controls. Map our Play/step/speed UI to it.
3. **P3 — Trades overlay**: render entry/exit/SL/TP. Advanced Charts → custom shapes via
   the widget API; Trading Terminal → native Broker API order/position rendering.
4. **P4 — Journal**: save_load_adapter persists drawings+layout per session to Supabase;
   on session open, load that layout.
5. **P5 — Cutover**: flip the flag for the backtest chart; keep `BacktestReplayChart` as
   fallback for one release; then retire the custom drawing canvas.

## 5. Constraints
- English-only (`locale: 'en'`); black theme via `custom_css_url`.
- Attribution: TradingView logo stays (license requirement) — acceptable per decision.
- No DB writes without Elad approval — the `chart_layouts` migration is a separate gated step.
- Forward-Only: existing chart untouched; TV path additive + flagged until proven.
- White-label exit: the adapter seam (`ChartDataSource` + the wrapper) lets us swap to a
  paid white-label engine later without touching domain code.

## 6. What's ready now vs blocked
- ✅ Now (no binaries): datafeed adapter, save/load adapter, wrapper scaffold, featuresets,
  type shim, this plan.
- ⛔ Blocked on Elad's access: actually loading the library, P1 verification, all phases.
