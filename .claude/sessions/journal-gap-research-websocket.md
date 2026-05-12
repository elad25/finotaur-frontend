# Tradovate WebSocket API — Discovery Doc

**Purpose:** Map Tradovate's WebSocket API for the planned Railway streaming worker (Phase 2 of the 50K-user architecture). Currently we rely on REST polling every 5 min; the WS worker is build-blocked on protocol clarity.

**Date compiled:** 2026-05-12
**Compiled by:** scout / research-only session (no code modified)

## Sources fetched

| # | URL | Last checked |
|---|-----|---|
| S1 | https://community.tradovate.com/t/api-websocket-and-marketdata-websocket/4037 | 2026-05-12 |
| S2 | https://community.tradovate.com/t/ws-authentication/5858 | 2026-05-12 |
| S3 | https://github.com/tradovate/example-api-js/tree/main/tutorial/WebSockets/EX-05-WebSockets-Start | 2026-05-12 |
| S4 | https://github.com/tradovate/example-api-js/tree/main/tutorial/WebSockets/EX-06-Heartbeats | 2026-05-12 |
| S5 | https://github.com/tradovate/example-api-js/tree/main/tutorial/WebSockets | 2026-05-12 |
| S6 | https://github.com/tradovate/example-api-faq/blob/main/docs/RestApiVsWebSocketApi.md | 2026-05-12 |
| S7 | https://partner.tradovate.com/overview/core-concepts/web-sockets/connection-overview | 2026-05-12 |
| S8 | https://partner.tradovate.com/overview/conformance-testing/stage-2-websocket-management | 2026-05-12 |
| S9 | https://community.tradovate.com/t/issue-with-user-syncrequest-ws-endpoint-401-error/4745 | 2026-05-12 |
| S10 | https://community.tradovate.com/t/understanding-concurrent-connection-limits/2118 | 2026-05-12 |
| S11 | https://community.tradovate.com/t/do-websocket-connections-get-throttled-if-so-what-is-the-limit/12574 | 2026-05-12 |
| S12 | https://crosstrade.io/blog/understanding-tradovate-api-rate-limits | 2026-05-12 (cited in WebSearch results) |
| S13 | https://deepwiki.com/tradovate/example-api-csharp-trading/5.2-websocket-integration | 2026-05-12 |
| L1 | Local: `.claude/worktrees/journal-gap-research-frontend/src/services/brokers/tradovate/tradovateWebSocket.service.ts` | 2026-05-12 |
| L2 | Local: `.claude/worktrees/journal-gap-research-frontend/supabase/functions/tradovate-auth/index.ts` | 2026-05-12 |
| L3 | Local: `.claude/worktrees/journal-gap-research-frontend/supabase/functions/tradovate-sync/index.ts` | 2026-05-12 |

---

## Q1. WebSocket URL + handshake

**Status:** Resolved (High confidence)

Tradovate exposes two distinct WebSocket hosts per environment — one for trading/user events, one for market data — and a third for replay sims.

| Environment | Trading / User events | Market data |
|---|---|---|
| Live | `wss://live.tradovateapi.com/v1/websocket` | `wss://md.tradovateapi.com/v1/websocket` |
| Demo | `wss://demo.tradovateapi.com/v1/websocket` | `wss://md-demo.tradovateapi.com/v1/websocket` |
| Replay | `wss://replay.tradovateapi.com/v1/websocket` | (n/a) |

No subprotocols are negotiated. Standard `Upgrade: websocket` HTTP/1.1 handshake. TLS 1.2+ is required (modern WebSocket clients negotiate this automatically).

Source: S1, S5, L1 (lines 19-22 confirm `wss://demo.tradovateapi.com/v1/websocket` and `wss://live.tradovateapi.com/v1/websocket`).

The fourth host in S7 (`live-api.staging.ninjatrader.dev`) is a NinjaTrader partner staging host, **not** production Tradovate — ignore unless you intentionally target the partner integration sandbox.

---

## Q2. Authentication flow

**Status:** Resolved (High confidence)

REST-issued `accessToken` is reusable directly for WS — no separate WS credential exchange exists. The token in the REST `auth/accesstokenrequest` response is the same one the WS authorizes against (confirmed S2, S3).

**Sequence:**

1. Open WS connection.
2. Server immediately emits an `o` frame (single ASCII byte `o`, no payload) signalling "open / ready to authorize". Source: S3.
3. Client sends an `authorize` request (see Q3 for frame syntax):
   ```
   authorize\n0\n\n<accessToken>
   ```
   Request ID `0` is reserved for auth (S7).
4. Server responds with an array-framed message: `a[{"s":200,"i":0}]` on success, `a[{"s":401,"i":0,"d":"..."}]` on failure.
5. From that point, client must begin sending heartbeats (Q4) and can send subscription / RPC requests.

**Two distinct tokens after login:**
- `accessToken` → trading WS (`live/demo.tradovateapi.com`)
- `mdAccessToken` → market data WS (`md.tradovateapi.com`)

Using `accessToken` against the market-data host returns 401 (S1).

**Token expiry:** 90 minutes from issuance (L2 line 33: `TOKEN_TTL_MS = 90 * 60 * 1000`). Forum reports 401 around the 1-hour mark for WS connections that don't refresh (S2). The current finotaur server-side REST flow renews at 75 minutes via `GET /auth/renewaccesstoken` (L2 lines 33-34). The WS worker MUST adopt the same pattern: get a fresh token before expiry, then send a new `authorize` message on the *same* WS connection (no need to reconnect) — or reconnect cleanly. **OPEN: is in-place re-authorize supported, or does the server require a fresh socket?** Sources do not explicitly confirm; safer to assume reconnect-required and budget for it.

L1 lines 195-203 show finotaur's current frontend implementation sends `JSON.stringify({op: 'authorize', data: accessToken})` — **this format is wrong per S3/S7** (Tradovate uses newline-delimited text, not JSON-envelope `{op,data}`). The frontend WS client appears to be partially functional only because incoming events are still processable. This needs correction in the Railway worker.

---

## Q3. Subscription schema

**Status:** Partial (Med confidence)

### Frame protocol (S3, S7)

Tradovate WS uses a SockJS-style text protocol, not pure JSON.

**Server → Client frame types:**
- `o` — open frame (one byte)
- `h` — heartbeat from server (one byte)
- `a[...JSON array...]` — data payload; the JSON array contains 1..N message objects
- `c[code,"reason"]` — close frame

Each message object inside an `a[]` frame has shape:
```json
{ "i": <requestId>, "s": <httpStatusCode>, "e": "<eventName>", "d": <payload> }
```
- `i` — request ID this message correlates with (omitted for unsolicited events)
- `s` — HTTP-style status (200/401/etc.) on RPC responses
- `e` — event name on push messages: `"props"`, `"md"`, `"clock"`, `"shutdown"`
- `d` — data payload (object or array)

**Client → Server request frame:**
```
<endpoint>\n<requestId>\n<query>\n<body>
```
Four parts separated by `\n`. `query` is usually empty. `body` is a JSON string. Example:
```
user/syncrequest
2

{"users":[1234567]}
```
Request ID `0` reserved for auth, `1` historically reserved for sync; subsequent IDs auto-increment from `2` (S7).

### Master subscription: `user/syncrequest`

The single most important WS endpoint for our use case. From S6:

> User property events — Monitoring real-time changes like position entries, command executions, order fills, and cash-balance updates **via the user/syncrequest endpoint**.

Frame body (S9, verbatim):
```json
{"users":[<userId>]}
```

`userId` comes from the REST `auth/accesstokenrequest` response (we already store it). Optional fields per docs: `accounts` (array of account IDs to scope to). When `accounts` is omitted, all accounts visible to the user are streamed.

**Important constraint (S8):** *"Only one syncrequest should be sent per socket lifecycle."* If you need to change the subscription scope, open a new socket.

After `syncrequest`, the server pushes a continuous stream of `props` events covering: `account`, `accountRiskStatus`, `cashBalance`, `marginSnapshot`, `position`, `order`, `fill`, `executionReport`, `command`, `commandReport`, `userPlugin`, `userProperty`. Each event arrives as a message object with `e:"props"` and a `d` that names the entity type and carries the inserted/updated row.

**OPEN: exact `d` schema per entity.** Sources show the envelope but not entity field-by-field. Resolution path: spin up a demo connection, log every `props` frame for 30 minutes, dump a sample of each entity type. Tradovate REST `/<entity>/list` response shapes are the canonical reference — WS events use the same row shape (per S6, S13). For now, treat the existing `TradovateFill` interface in `tradovate-sync/index.ts` (L3 lines 104-115) as authoritative for fills.

### Example sample JSON (per S3, S9)

Authorize success:
```
a[{"s":200,"i":0}]
```

Sync request response:
```
a[{"s":200,"i":2,"d":{"users":[...], "accounts":[...], "fills":[...], "orders":[...], "positions":[...], "cashBalances":[...], "accountRiskStatuses":[...]}}]
```

Subsequent push event (example shape):
```
a[{"e":"props","d":{"entityType":"fill","entity":{"id":12345,"orderId":999,"contractId":42,"timestamp":"2026-05-12T14:23:11.234Z","action":"Buy","qty":1,"price":5234.25,"active":true}}}]
```

**OPEN: confirm `entityType` vs `entityTypeName` literal — Tradovate docs are inconsistent in community examples.** Verify against a live demo capture.

---

## Q4. Heartbeat cadence

**Status:** Resolved (High confidence)

- **Interval:** every 2.5 seconds (2500 ms). Source: S3, S4, S7, L1 line 241 (`}, 2500);`).
- **Frame format:** the two-character string `[]` (empty JSON array). Source: S3, S4, L1 line 237 (`this.send('[]');`).
- **Server heartbeat:** server may emit single-byte `h` frames; client should treat them as keepalive only (no action required). Source: S3.
- **Timeout threshold:** S7 says server considers connection idle after 10s without inbound activity; reconnect if 15s elapses without any message. S8 (conformance doc) says "send heartbeats every 30s" — this is the **conformance maximum**, NOT the working cadence. Tradovate's own JS tutorial says 2.5s. Use 2.5s.
- **Heartbeat throttling note from S4:** the tutorial deliberately avoids `setInterval` (browser tab-throttling makes it unreliable). It instead measures elapsed time inside `onmessage` and emits `[]` reactively. For Railway (Node, not browser), `setInterval` at 2500ms is fine.

---

## Q5. Reconnect semantics

**Status:** Partial (Med confidence)

**Documented (S7, partner reference implementation):**
- Max reconnect attempts: 10 (configurable)
- Backoff formula: `min(initialDelay * 2^attempt, maxDelay) + jitter`
- `initialDelay` = 1 second, `maxDelay` = 60 seconds, jitter 0–10% of delay
- On every reconnect: acquire fresh access token via REST, then send `authorize` again

**Re-subscribe after reconnect:** Yes. Tradovate does NOT replay missed messages. Per S8: *"After reconnection, the system must re-authenticate and recover its previous state."* Recovery is your responsibility — for fills, the safest path is:

1. On reconnect, before sending `user/syncrequest`, hit REST `/fill/list` (already used in L3 line 90) with the last-seen `fill.id` as cursor (L3 line 100 already does `fills.filter(f => f.id > lastFillId)`).
2. Insert any missed rows.
3. Then send fresh `user/syncrequest` to resume live stream.

This is the gap-recovery pattern. There is no replay-from-sequence-number primitive on the WS itself.

**Sequence numbers:** None at the protocol level. The `i` field is a request-correlation ID, not a stream sequence. Entity `id` fields (`fill.id`, `order.id`) are monotonic per entity type and serve as the cursor for REST-based gap fill.

**OPEN: does in-place re-authorize on the same WS connection work, or must we always tear down and reconnect on token refresh?** Recommend ticket to Tradovate (see Q9).

**Current finotaur frontend implementation (L1 lines 206-224):** Linear backoff (`reconnectDelay * reconnectAttempts`) with max 5 attempts — **too aggressive for production**. The Railway worker should adopt the S7 exponential+jitter pattern with at least 10 attempts before giving up.

---

## Q6. Rate limits

**Status:** Partial (Med confidence)

| Limit | Value | Source |
|---|---|---|
| REST requests/hour | 5,000 (rolling 60-min window) | S12, S11 |
| REST requests/minute | ~80 | S12 |
| Concurrent sessions per user | **2** (login or API combined) | L2 line 12, S10 |
| Tradovate Trader desktop conflict | Logging into Trader **ends** API sessions and vice versa | S10 |
| Per-IP limits | **Not documented** publicly | S10, S11 |
| WS-specific throttling | **Not documented** numerically; forum thread S11 confirms throttling exists but no published numbers | S11 |
| P-Ticket (penalty) lockout | 1-hour CAPTCHA-style suspension after repeated rate-limit hits | S8, S12 |

**Does a WS count as 1 session?** Yes — a WS connection consumes one of the 2 session slots. Trading WS + market-data WS = 2 sessions (the full allotment). This is the major scaling pain point.

**Implication for 50,000 users:** A pure 1-WS-per-user model is fine session-count-wise (each user gets ≤2 sessions of their own — the limit is per-user, not per-app), but you still need to manage per-IP risk and avoid the P-Ticket reconnect storm. Key practices for the Railway worker:

- Stagger reconnects across users (jitter + queue)
- Cap reconnects to ~10 per user per hour to avoid P-Ticket
- One WS per Tradovate user → one Railway worker process can hold N sockets, where N is bounded by file-descriptor limits and per-IP scrutiny
- If Tradovate flags the worker IP, the entire fleet stalls — plan for horizontal sharding across IPs or NAT egress pools

**OPEN: per-IP concurrent WS cap.** Not in any public source. **Send ticket** (Q9).

---

## Q7. Message types received

**Status:** Partial (Med-High confidence on envelope, Low on exhaustive entity schema)

After `authorize` + `user/syncrequest`, the server pushes events as messages inside `a[...]` frames. Three main shapes:

### 7.1 RPC response (correlates with a request `i`)
```json
{ "i": 2, "s": 200, "d": {...} }
```

### 7.2 Property change push (`e:"props"`)
```json
{ "e": "props", "d": { "entityType": "fill", "entity": { ... } } }
```

`entityType` values relevant to us:
- `fill` — execution row (matches `TradovateFill` in L3 lines 104-115)
- `order` — order state transition (Working, Filled, Canceled, etc.)
- `position` — net position update per contract
- `account` — account-level changes
- `accountRiskStatus` — risk gates triggered (margin, daily-loss limit)
- `cashBalance` — cash balance change
- `marginSnapshot` — margin snapshot
- `executionReport` — FIX-style execution report
- `command` / `commandReport` — order command pipeline
- `userPlugin` / `userProperty` — config changes (low priority for us)

### 7.3 Other event names
- `e:"md"` — market data tick (only on `md.tradovateapi.com`, not the trading WS)
- `e:"clock"` — server timestamp ping
- `e:"shutdown"` — server is closing the connection; reconnect

### Sample fill push (per L3 schema, inferred WS shape)
```json
{
  "e": "props",
  "d": {
    "entityType": "fill",
    "entity": {
      "id": 8801234,
      "orderId": 99887766,
      "contractId": 2589834,
      "timestamp": "2026-05-12T18:32:11.482Z",
      "tradeDate": {"year":2026,"month":5,"day":12},
      "action": "Buy",
      "qty": 2,
      "price": 5311.50,
      "active": true,
      "finallyPaired": false
    }
  }
}
```

### Sample accountRiskStatus push (inferred)
```json
{
  "e": "props",
  "d": {
    "entityType": "accountRiskStatus",
    "entity": {
      "id": 12345,
      "accountId": 67890,
      "adminAction": null,
      "liquidateOnly": false,
      "marginCallActive": false
    }
  }
}
```

**OPEN: exhaustive per-entity field list — verify with a logged capture against demo before Railway worker hits production.**

---

## Q8. Implementation gotchas

**Status:** Resolved (Med confidence — collected from forum + tutorials)

1. **Frame format is text, not JSON.** A frame is the 1-char type byte followed by an optional JSON array body. Many devs incorrectly send `{op:"authorize",data:"..."}` (this is the bug in our current frontend at L1:195-203). The correct frame is the four-newline form `authorize\n0\n\n<token>`.

2. **Heartbeat is `[]` (two chars), not a JSON ping/pong.** Failing to send it for >10s causes server disconnect (S7).

3. **Server `h` frames are single byte.** Don't try to `JSON.parse('h')` — guard on length 1 first (L1 line 261 already handles `[]`/empty-string case but doesn't explicitly handle `'h'`).

4. **`accessToken` ≠ `mdAccessToken`.** Using the wrong token returns 401 at first market-data request, not at connect (S1).

5. **`user/syncrequest` is one-shot per socket lifecycle.** No re-subscribe-with-different-scope on same socket (S8).

6. **The `accountSpec` field for order placement is the `name` from auth response, NOT the username.** Mismatched value yields cryptic "Access is denied" (S1). Not directly relevant for read-only journaling worker but watch out if copier ever places orders over WS.

7. **2-session limit interacts with Tradovate Trader.** If the customer opens the desktop platform, the Railway worker's WS is killed server-side, with no graceful message — just a close frame. We need to handle this and either reconnect (which steals the desktop session back) or back off (let the user trade manually). **Product decision needed.**

8. **JSON encoding only, no binary frames.** No CBOR/MessagePack.

9. **No sequence numbers.** Gap recovery is your responsibility, cursor-based via entity `id`. Make sure the worker persists `last_fill_id`, `last_order_id` per user.

10. **Token TTL = 90 min.** Plan a refresh job at T-15 min (75 min mark — already done in REST flow at L2 lines 33-34). Whether the WS can absorb a fresh `authorize` mid-stream is **OPEN**; design defensively (reconnect with new token).

11. **TLS 1.2+ required** — standard for `wss://`, no special config in Node 18+.

12. **No documented compression** (no `permessage-deflate` mentioned). Don't enable.

13. **`active: false` on fill rows** means the fill was canceled/busted. Don't insert as a trade until verified `active:true` (L3 line 113 has the field). This is a Tradovate-side correction mechanism — handle it.

14. **P-Ticket on reconnect storm.** If our Railway worker bug-loops reconnecting, Tradovate can issue a 1-hour penalty per user **and** can throttle the entire app at the CID level (`CID=11045` per L2 line 38). Catastrophic for 50K users — every reconnect must pass through a circuit breaker.

---

## Q9. Open questions for Tradovate support

Tickets to file (priority order):

1. **In-place re-authorize on long-lived WS?** Can we send a new `authorize\nN\n\n<freshToken>` on an established socket at the 75-min mark, or must we always tear down and reconnect? If reconnect required, we incur a P-Ticket risk surface every 75 min per user (50K reconnects/75min = ~11 per second sustained).
2. **Per-IP concurrent WS connection cap.** What is the max simultaneous WS connections from a single egress IP before Tradovate's edge throttles or blacklists? Required input for sharding the Railway worker across IPs.
3. **Documented entity schema per `props` event.** Is there a definitive list of `entityType` values and per-type field schemas? Closest currently is REST `/v1/swagger.json`, but partner docs hint at WS-specific shapes (e.g., `props` envelope wrapping).
4. **Behavior when Tradovate Trader desktop logs in during active WS.** Does the WS receive a `shutdown` event, or just a TCP close? What's the recommended UX — back off, or auto-reconnect (knowing it kills the desktop session again)?
5. **App-level (CID) rate limit ceiling for WS connections.** Our CID is `11045`. At 50K users × 1 trading WS each = 50K concurrent connections. Is this within Tradovate's per-app capacity, or do we need a partnership-level conversation?

---

## Summary table

| # | Question | Status | Confidence |
|---|---|---|---|
| Q1 | WebSocket URL + handshake | Resolved | High |
| Q2 | Authentication flow | Resolved | High |
| Q3 | Subscription schema | Partial | Med |
| Q4 | Heartbeat cadence | Resolved | High |
| Q5 | Reconnect semantics | Partial | Med |
| Q6 | Rate limits | Partial | Med |
| Q7 | Message types received | Partial | Med-High envelope / Low per-entity |
| Q8 | Implementation gotchas | Resolved | Med |
| Q9 | Open questions for support | n/a (action list) | — |

**Overall:** the protocol shape is well-understood. Critical unknowns concentrate on (a) re-authorize semantics across the 90-min boundary, (b) per-IP scaling envelope, and (c) precise entity schemas under `e:"props"`. The first two are blockers for safe 50K-scale rollout and should be resolved by a Tradovate support ticket before Railway worker hardening. Entity schemas can be locked down empirically with a 30-min demo-account capture session.

**Build-readiness verdict:** Sufficient to scaffold the Railway worker MVP (auth + sync + heartbeat + cursor-based gap fill) against demo. Do **not** ship to 50K-user production until Q9 #1 and #2 are answered.
