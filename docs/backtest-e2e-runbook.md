# Backtest Module — Browser E2E Runbook

Repeatable verification steps for the Backtest / Replay module on the gated
prod page. Written so a cheaper model or a human tester can re-run this
without rediscovering the hidden-tab traps each time.

**Read the CRITICAL section below before touching a Chrome-MCP tab.** Most
false "it's broken" reports on this module come from driving it the wrong
way in a hidden tab, not from an actual bug.

---

## Preconditions

1. **Admin or beta access required.** The route is gated —
   `src/components/routes/BacktestRoute.tsx`:
   - If `domains['journal-backtest'].locked === true` → everyone sees the
     "Coming Soon" page regardless of tier. Check `src/constants/nav.ts`
     before assuming a real bug if the whole module shows the lock page.
   - Otherwise, access requires `hasBetaAccess` OR `isAdmin` (from
     `useAdminAuth`) OR `isMentorView`. A logged-in user without one of
     those flags is redirected to `BacktestLanding`, not the chart.
   - Log in with an admin or beta-flagged account before testing.

2. **Enable the E2E drawing hook.** `window.__drawings2` is only installed
   when `import.meta.env.DEV` is true OR `localStorage.getItem('finotaur_e2e') === '1'`
   (`src/components/ReplayChart/drawings2/DrawingController.ts:197-211`). On
   the prod build you must opt in manually, BEFORE the chart mounts:
   ```js
   localStorage.setItem('finotaur_e2e', '1');
   location.reload();
   ```
   The hook is destroyed/recreated whenever the underlying `bars` array
   changes (symbol/timeframe/session swap recreates `DrawingController`), so
   re-check `window.__drawings2` after any such swap — it's a fresh
   instance, not the same object reference.

3. **URLs.** Both prefixes route to the same lazy-loaded pages
   (`src/App.tsx:796-833`):
   - Manual replay chart: `/app/journal/backtest/chart` or `/app/backtest/chart`
   - Automated backtest: `/app/journal/backtest/auto` or `/app/backtest/auto`
   - Landing/overview/results/builder/analytics/trades pages exist under the
     same two prefixes if you need them, but the two above cover this
     runbook's scenarios.

---

## CRITICAL — Hidden-tab / background-tab traps

If the Chrome-MCP tab is **hidden or backgrounded**, the following silently
fail or no-op. This is the #1 cause of false negatives when testing this
module — read this before filing a bug.

- **Coordinate-based (`computer`) pixel clicks dispatch NOTHING** into a
  hidden tab. The click never reaches the canvas.
- **Ref-based clicks fire only a synthetic `click` event — no `mousedown`.**
  `lightweight-charts` drawing/drag gestures are driven off `mousedown` /
  `mousemove` / `mouseup` on the chart's canvas element
  (`DrawingController.ts` subscribes `container.addEventListener('mousedown', ...)`
  directly, not through the chart's `subscribeClick`). A `click`-only event
  never starts a drag, never places a 2-point drawing's second point via
  drag, and the chart's own pan/zoom gestures don't fire either.
- **Synthetic `mousedown`/`mouseup` dispatched via `dispatchEvent` DO reach
  the DOM**, but `lightweight-charts`' internal canvas renderer ignores
  events it didn't originate itself in many browser/automation
  combinations — do not rely on this path for chart interactions.
- **`requestAnimationFrame` is paused** in hidden/backgrounded tabs (browser
  power-saving behavior). Anything gated on rAF — chart repaint,
  `overlayTick`-driven pill repositioning, playback ticking — will not
  visibly update even if the underlying state changed correctly. Don't
  conclude "the UI didn't update" from a hidden tab; keep the tab focused/
  visible, or assert on state via the hook/store instead of pixels.

### The correct way to drive this module in automation

- **Drawings** → call `window.__drawings2.controller` methods directly, not
  canvas clicks. The controller's click handler is `_onClick(param:
  MouseEventParams)` where `param.point = { x, y }` is a **pixel**
  coordinate (`DrawingController.ts:411-422`). It is a private method (TS
  `private`), but nothing stops you from calling it through the exposed
  `controller` reference in a live browser (TypeScript privacy is
  compile-time only) — see snippet below. Do NOT try to synthesize
  `param.point` from a bar-index without first converting it through
  `chart.timeScale().logicalToCoordinate(barIndex)` — the controller expects
  **pixels**, not logical/bar-index.
- **React UI (order panel, position-action buttons)** → click the real
  `<button>` elements via ref/selector-based clicks (Chrome-MCP DOM click,
  not raw pixel coordinates). These are plain React `onClick` handlers with
  no canvas gesture dependency, so a synthetic `click` event is sufficient
  as long as the tab is not hidden (rAF-gated re-renders still won't paint
  in a hidden tab, even though the state change happens).
- **Always keep the tab visible/focused** for any scenario that depends on
  chart repaint or playback ticking (Scenarios c–h below).

### Drawing-hook snippet — creating a drawing via the controller

```js
// Assumes finotaur_e2e flag is set and the chart has mounted.
const d2 = window.__drawings2;
const controller = d2.controller;
const chart = controller._chart;          // private field, accessible at runtime
const series = controller._series;

// Convert a bar index (logical) + price to a pixel point.
const barIndex = 50;                       // pick a bar within the loaded window
const price = series.dataByIndex ? series.dataByIndex(barIndex)?.close : undefined;
const x = chart.timeScale().logicalToCoordinate(barIndex);
const y = series.priceToCoordinate(price);

// Arm the tool, then feed synthetic click params (pixel coords) to _onClick.
controller.setActiveTool('trendline');           // 2-point tool — call _onClick twice
controller._onClick({ point: { x, y } });        // first anchor
controller._onClick({ point: { x: x + 40, y: y - 20 } }); // second anchor, finalizes

console.log(d2.count());     // assert drawing count increased
console.log(d2.tools());     // assert serialized tool === 'trendline'
console.log(d2.activeTool()); // controller auto-resets to 'cursor' after a 2-point tool finalizes
```

For 1-point tools (`horizontal`, `horizontal_ray`, `vertical`, `text`), one
`_onClick` call finalizes the drawing immediately —
`POINTS_REQUIRED[tool] <= 1` (`drawings2/base.ts:61-73`).

---

## Drawing tools inventory (source of truth: `drawings2/toolbarGroups.ts`)

10 supported tools, grouped into 4 toolbar flyouts
(`src/components/ReplayChart/drawings2/toolbarGroups.ts:70-109`):

| Group | Tool id | Points required |
|---|---|---|
| Lines | `trendline` | 2 |
| Lines | `horizontal` | 1 |
| Lines | `horizontal_ray` | 1 |
| Lines | `vertical` | 1 |
| Lines | `ray` | 2 |
| Lines | `extended_line` | 2 |
| Shapes | `rectangle` | 2 |
| Shapes | `parallel_channel` | 3 |
| Fibonacci | `fibonacci` | 2 |
| Annotations | `text` | 1 |

Utility toggles (`toolbarGroups.ts:115-121`): `magnet` (snap to OHLC),
`stay_draw` (stay in drawing mode after finalizing), `lock_all` (disable
selection/drag), `hide_all` (detach all primitives from the chart), plus the
action `remove_all` (clears everything, calls `controller.clearAll()`).

Controller methods for toggles: `setMagnet(bool)`, `setStayInDrawMode(bool)`,
`setLockAll(bool)`, `setHideAll(bool)` — all on `window.__drawings2.controller`.

---

## Order kinds & position actions (source: `PlaceOrderPanel.tsx` + `BacktestChart.tsx`)

**Order kinds** (`OrderKind` in `src/lib/backtest/orderEngine.ts:8`):
`market | limit | stop | stop_limit`. Selectable only in Advanced mode
(the `advanced` toggle in `PlaceOrderPanel`) — Standard mode is always a
market order with manual size.

Note: `BacktestReplayChart.tsx:71-72` defines an `ORDER_CODE` map that
includes a `MIT` label (`'MIT'`), but `MIT` is **not** a member of
`OrderKind` and is not reachable from the order panel UI as of this
writing — do not test for an MIT button; it doesn't exist. Flag this to
the lead if you find it wired elsewhere.

**Position actions** (rendered only when `state.activePosition` is set,
`BacktestChart.tsx:1284-1331`):
- `Close 25%` / `Close 50%` / `Close 75%` → `handlePartialClose(pct)`
- `BE Stop` → `handleMoveToBreakeven()` (moves SL to entry price)
- `Flatten` → `handleFlatten()` (closes position + cancels all pending orders)
- `Reverse` → `handleReverse()` (closes then opens opposite side, same size)
- `Close All` → `handleClose('manual')`
- `Cancel All Pending (N)` → shown separately when `pendingOrders.length > 0`

**Multi-leg TP**: toggle "Multi-leg" in the Profit Target field, up to 3 legs
(`MAX_TP_LEGS = 3`), each with its own price + `sizePercent`. Validated by
`validateTakeProfitLegs` before submit.

---

## Session persistence

Key format (`src/hooks/useBacktestSession.ts:38,1187-1191`):
```
finotaur:backtest:session:<userId>:<sessionId>
```
Falls back to `finotaur:backtest:session:<userId>` (no `:<sessionId>` suffix)
for legacy callers that don't pass a `sessionId`. To verify persistence in
DevTools:
```js
Object.keys(localStorage).filter(k => k.startsWith('finotaur:backtest:session:'))
```

Drawings persist separately, per-symbol, NOT per-session:
`finotaur_drawings2_<symbol>` (`DrawingController.ts:78-80`).

---

## Journal save (`src/lib/backtest/journaling.ts`)

`saveBacktestTradesToJournal(positions, session, userId)` upserts closed
positions into the `trades` table:

- `broker: 'backtest'`
- `external_id: bt:<session.id>:<position.id>`
- `idempotency_key: <userId>:backtest:bt:<session.id>:<position.id>`
- Upsert conflict target: `user_id,broker,external_id` — re-saving the same
  session updates rows instead of duplicating them.
- Only closed positions are persisted (`pos.exitPrice != null`); open
  positions are silently skipped, not an error.
- `tags` always includes `'backtest'` and `session:<session.name>`.

**To verify a save landed:** query the `trades` table (via Supabase MCP/
Studio, or the Journal UI filtered to broker = backtest) for rows matching
`external_id` like `bt:<sessionId>:%`. The Journal UI itself is the
easiest path for a human tester — filter by the session's symbol/date and
confirm the row(s) appear with `broker = backtest`.

---

## Scenario checklist

Keep the tab **visible/focused** for all scenarios. Use the controller hook
for (a), real button clicks for (b)–(h).

### (a) Create each of the 10 drawings

For each `toolId` in the inventory table above:
1. `controller.setActiveTool(toolId)`
2. Call `controller._onClick({ point: {x, y} })` once per required point
   (1, 2, or 3 depending on the tool — see `POINTS_REQUIRED`).
3. Assert: `window.__drawings2.count()` incremented by 1, and
   `window.__drawings2.tools()` last entry has `tool === toolId`.
4. After a multi-point tool finalizes, `activeTool()` should read `'cursor'`
   again (auto-reset) unless `stay_draw` was toggled on.

Expected: 10/10 tools create successfully with correct `tool` field in the
serialized output.

### (b) Place each order type

In the PlaceOrderPanel, toggle Advanced, cycle through `market / limit /
stop / stop_limit`, fill Stop Loss + Take Profit, click Buy (or Sell).
- `market` → should open a position immediately (`state.activePosition` set).
- `limit` / `stop` / `stop_limit` → should create a pending order, visible
  as a pill on the chart at the entered trigger price.
- Assert via the pending-orders pill label text and/or `state.pendingOrders`
  length (if you have store access) rather than pixel-reading the canvas.

### (c) Run replay, assert SL exit at exact stop price with reason `sl`

Place a position with a Stop Loss, then advance replay until a bar's
low (LONG) / high (SHORT) crosses the SL price.
`handleReplayBarReveal` (`BacktestChart.tsx:598-681`) checks SL **before**
any TP leg (conservative worst-case ordering) and calls
`closePosition({ price: pos.stopLoss, reason: 'sl' })` — assert the closed
position's `exitPrice === stopLoss` exactly (not the bar's low/high) and
`reason === 'sl'`.

### (d) Close 25% / 50% / 75% + BE Stop + Flatten + Reverse

With an open position:
1. Click `Close 25%` → assert remaining size = 75% of original
   (`activePosition.size` vs `activePosition.originalSize`).
2. Click `BE Stop` → assert `activePosition.stopLoss === activePosition.entryPrice`.
3. Click `Flatten` → assert `activePosition` is null AND
   `state.pendingOrders` is empty (Flatten cancels pending too).
4. Re-open a position, click `Reverse` → assert the closed position (side A)
   appears in `closedPositions`, and a new position opens with the opposite
   `side` at the same price.
5. Click `Close All` → assert `activePosition` is null.

### (e) STOP_LIMIT two-phase (trigger → working limit)

Place a `stop_limit` order with a non-zero `stopLimitOffset`.
`evaluatePendingOrder` (called per-bar in `handleReplayBarReveal`) returns:
- `action: 'trigger'` when the breakout price is hit but the enforced limit
  isn't reachable that bar → `triggerPendingOrder(order.id, ...)` is called,
  which does NOT consume the bar's one-fill budget.
- `action: 'fill'` once the limit is reachable.

Assert the pill label transition
(`BacktestReplayChart.tsx:1262-1269`): before trigger it reads
`"<size> <side> STOP LIMIT <trigger> / L <limit>"`; after `triggeredAt` is
set it reads `"<size> <side> LIMIT (triggered)"`.

### (f) Save to journal

Close at least one position, click Save to Journal (in the right rail /
session stats panel — search `saveBacktestTradesToJournal` call site if the
button isn't obvious in the current build). Then verify via Supabase query
or the Journal UI: a `trades` row exists with `broker = 'backtest'` and
`external_id = bt:<sessionId>:<positionId>` matching the closed position.
Re-clicking Save on the same session should update the same row (via the
upsert conflict target), not create a duplicate — verify row count is
stable across repeated saves.

### (g) Reload → session restored from localStorage

After placing orders/positions, reload the page (same URL, same
symbol/session). Assert the session state (open position, pending orders,
stats) matches pre-reload, read from
`finotaur:backtest:session:<userId>:<sessionId>` in localStorage.

### (h) Ghost-pill regression (fixed bug — regression-test it, don't assume it's still broken)

Historical bug: pending-order pills were remounted via `key={overlayTick}`
on every pan/zoom/replay tick, which leaked orphan pill DOM nodes that
stayed visible after the order filled or was cancelled
(`BacktestReplayChart.tsx:1248-1253`, comment: "ghost orders"). The fix
removed the remount-by-key pattern in favor of an `overlayTick` state bump
that just re-runs the render.

Regression test: run a ~30s replay with several pending orders that fill
or get cancelled during playback. After the run, count pill DOM nodes and
assert it equals `state.pendingOrders.length` exactly (0 orphans). If you
find more DOM nodes than live pending orders, this is a real regression —
report it, don't dismiss it as a "known non-issue".

---

## Auto Backtest checklist

Route: `/app/journal/backtest/auto` or `/app/backtest/auto`
(`src/pages/app/journal/backtest/AutoBacktest.tsx`).

1. Run a default detection setup. Pattern types available:
   `FVG`, `IFVG`, `BREAKER`, `OB`, `LIQUIDITY` (`src/core/auto/types.ts:15`).
   The `LIQUIDITY` detector supports an `'equal-levels'` mode
   (`src/core/auto/detectors/liquidity.ts:14-15,123`) — clustering swing
   highs/lows within a % band, emitting a pool when `>= minTouches` members
   are found.
2. Assert the detection count is **sane for the time window / pattern
   density** — i.e. proportional to the number of bars and pattern
   selectivity, not obviously exploding (e.g. a detection roughly every 1-2
   bars is a red flag for over-fitting/duplicate-emission bugs). This
   codebase has had detection-count blowups in the past
   (`AutoBacktestEngine.ts` handles OB/BREAKER/LIQUIDITY pattern gating at
   line 274) — I could not find a specific "expected N vs bad N" threshold
   hardcoded anywhere; use judgment relative to the loaded bar count and
   flag anything that looks like duplicate/overlapping detections.
3. Click a trade in the results list → "Inspect in Replay"
   (`src/components/backtest/auto/TradeDetailPanel.tsx`, contract type
   `ReplayHandoff` in `src/core/auto/replayBridge.ts`). Assert the manual
   replay chart lands on a session scoped to:
   - `symbol` and `timeframe` matching the originating trade
   - candle window `[windowFrom, windowTo]` loaded
   - replay cursor centered at `focusTime`

---

## Known non-issues (do not false-alarm on these)

- **"Market Price USD" field in PlaceOrderPanel tracks the replay cursor,
  not a live feed.** It reads from `currentBarRef` (updated on each
  revealed bar), with a fallback to a manually typed price
  (`BacktestChart.tsx:344,750-754`). If replay is paused, the price will
  not move — this is expected, not a stale-data bug.
- **Pending-order pills are hidden when the trigger price is outside the
  currently visible (autoscaled) price range.** The pill render bails out
  early: `if (y == null || y < 0 || y > containerHeight) return null;`
  (`BacktestReplayChart.tsx:1258,1406`). A missing pill after you zoom/pan
  away from its price level is by design — zoom/pan back to confirm it's
  still there in `state.pendingOrders` before reporting it missing.
- **At most one pending order fills per revealed bar** (conservative,
  intra-bar ordering is unknowable — `BacktestChart.tsx:609`). If multiple
  orders should trigger on the same bar, expect them to fill across
  consecutive bars, not simultaneously.
- **SL is always checked before TP legs on the same bar** (conservative
  worst-case assumption, mirrors `runStrategy.ts`) — if a bar's range would
  hit both, the position closes on SL, not TP. This is intentional, not a
  race-condition bug.

---

## Things I could NOT confirm from code (double-check before relying on them)

- The exact "Save to Journal" button location/label in the current
  `BacktestChart.tsx` right-rail UI — I traced the save function
  (`saveBacktestTradesToJournal`) but did not locate its exact call site /
  button JSX in this pass. Grep `saveBacktestTradesToJournal` in
  `BacktestChart.tsx` to find the trigger before scripting scenario (f).
- Any hardcoded "expected vs bad" detection-count threshold for the Auto
  Backtest default setup (the "~370" figure mentioned in the original task
  brief) — not found in `src/core/auto/*`. Treat it as a
  proportionality/sanity check, not a fixed number, unless you find where
  that figure came from (likely a prior debugging session, not in code).
- Whether `MIT` order type is reachable from ANY UI path (context menu,
  keyboard shortcut, etc.) beyond the `ORDER_CODE` label map — confirmed
  absent from `OrderKind` and the Advanced-mode order-kind selector, but I
  did not exhaustively grep every context-menu branch in
  `BacktestChart.tsx`.
