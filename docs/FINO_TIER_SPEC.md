# FINO AI — Tier Characterization Spec (v1 draft)

> **Purpose:** working input for the next design session — a full characterization
> of FINO per subscription tier. v1 (2026-07-05) ships the tiered UX shell
> (badges, personas, prompts, locked teasers, upgrade funnel). This document
> defines where FINO should go next, per tier, and what the server must enforce.
>
> **Owner:** Elad · **Status:** draft for next session

---

## 1. Product thesis

FINO is not a feature — it is the **connective tissue of the pricing ladder**.
Every tier talks to the same assistant, but each tier meets a different FINO.
The upgrade motivation is built into the conversation itself: FINO should
regularly demonstrate (not just advertise) what the next tier's FINO knows.

**One sentence per tier:**

| Tier | FINO is… | The user's feeling |
|---|---|---|
| FREE | A sharp market explainer | "This thing is smart — what happens if I pay?" |
| INVESTOR ($49) | A personal research analyst | "It read everything so I don't have to" |
| FINOTAUR ($89) | A full trade desk | "It sees the market's plumbing in real time" |
| ULTIMATE ($200) | A portfolio manager sitting next to you | "It knows MY book" |

---

## 2. Current state (shipped 2026-07-05)

- Drawer open to **all tiers**; server cap 3 questions/day for free (Railway
  `finotaur-server`, `/api/ai/usage`).
- Tier resolution client-side via `usePlatformAccess` (Investor derived from
  an active Top Secret subscription; DB fn `get_effective_platform_plan`).
- Per-tier config in `src/lib/fino-tiers.ts`: badge, tagline, drawer prompt
  rows, locked-capability teasers, upgrade CTA. Home-page chips are tier +
  journal aware (`getFinoHomeChips`).
- Report RAG (sources), page-context awareness, journal awareness, and FINO
  actions (auto-tag, screenshot→trade) already exist server-side; actions are
  403-gated by tier.

**Known gap:** the server does not yet recognize the Investor tier (treats it
as free ⇒ 3/day) and does not scope tools/data per tier.

---

## 3. Target characterization per tier

### 3.1 FREE — "The taste"
- **Quota:** 3 questions/day (keep).
- **Knowledge scope:** general market education, public market context,
  platform onboarding ("how do I…"). NO report RAG, NO premium data.
- **Answer style:** short (2–4 paragraphs max), always ends with ONE
  contextual teaser line when relevant: *"Investor subscribers get this
  answered from today's TOP SECRET report."* — max once per conversation,
  never nagging.
- **Distinct ability worth designing:** "explain any term/chart on screen" —
  free users learn; learning builds the habit.

### 3.2 INVESTOR — "The research analyst"
- **Quota:** 25 questions/day (proposal — decide).
- **Knowledge scope adds:** full TOP SECRET report RAG (daily, weekly,
  deep-dives, archive), research-hub context (sectors, valuation, insiders,
  ETFs, macro), page-data awareness on research pages.
- **Answer style:** analyst memo — thesis, evidence (with report citations),
  risks. Sources panel always populated.
- **Signature moments to design:**
  - Morning: "Summarize today's report in 5 bullets + what changed vs yesterday."
  - "What does the report say about {ticker I'm viewing}?"
  - Weekly wrap: "What did we learn this week across all reports?"
- **Teasers → FINOTAUR:** when a question touches flow/options/scanner data,
  answer from reports THEN note the live-data upgrade.

### 3.3 FINOTAUR — "The trade desk"
- **Quota:** unlimited (soft abuse cap server-side, e.g. 200/day silent).
- **Knowledge scope adds:** live premium data tools — options flow / UOA,
  Dark Pool prints, AI Scanner Top-5 picks + catalyst deck, insider/13F,
  unlimited analyzer context.
- **Actions unlocked:** auto-tag journal history, screenshot→trade extract,
  session review, game-plan builder.
- **Answer style:** desk briefing — direct, numbers-first, links to the
  relevant platform tool for drill-down ("open Flow Scanner ▸").
- **Signature moments:**
  - "Any unusual flow today?" → actual scan summary with tickers.
  - "Build my game plan" → merges scanner picks + report bias + user's journal
    patterns.

### 3.4 ULTIMATE — "The portfolio manager" (Copilot)
- Everything above + **portfolio awareness**: positions, P&L, risk exposure.
- Proactive: daily brief references the user's actual holdings; risk alerts
  initiated by FINO, not asked for.
- Out of scope for the next session unless Copilot launch timeline moves.

---

## 4. Server-side requirements (`finotaur-server` — separate repo)

1. **Tier resolution:** call Supabase `get_effective_platform_plan(user_id)`
   (already live) instead of reading `platform_plan` raw. Investor must map to
   its own tier.
2. **Quotas:** free 3/day (exists) · investor 25/day (new) · finotaur+
   unlimited w/ abuse cap. `/api/ai/usage` should return the new tiers.
3. **Tool/data scoping per tier:** report-RAG retrieval from Investor up;
   flow/dark-pool/scanner tools FINOTAUR up; portfolio tools Ultimate.
4. **Model tiers (already server-chosen):** consider haiku-class for FREE,
   sonnet-class for INVESTOR+, and let FINOTAUR use extended context.
5. **Teaser hooks:** response metadata flag `teaser_available: {tier}` so the
   frontend can render the upsell line natively instead of prompt-injecting it.

## 5. Frontend follow-ups

- Locked-teaser chips: consider showing ONE contextual locked chip after an
  answer that would have used premium data (needs §4.5 metadata).
- Tier badge → click opens a "What FINO can do on each plan" comparison sheet.
- Ask-Fino entry points to align with tiers: TopSecret dashboard (done),
  research pages (Investor+ framing), journal pages (coach framing).

## 6. Decisions (closed 2026-07-05, Elad)

1. **Investor daily quota: 25/day.** Feels unlimited for real usage (median
   3–5/day) while keeping a clear differential vs FINOTAUR's unlimited.
2. **Free teaser frequency: once per conversation**, and only when
   contextually relevant. With a 3/day quota this self-limits to ~1–2/day.
3. **Trader persona: YES — "Journal Coach".** A journal-Premium user with
   platform=free resolves to the `trader` FINO tier: badge TRADER, coach
   tagline, journal-first prompts, teasers point to FINOTAUR. Quota 10/day.
4. **Model tiering: YES.** FREE + TRADER → Haiku-class. INVESTOR+ →
   Sonnet-class with prompt caching (system + daily report cached).
   FINOTAUR's differentiation is live data & tools, NOT a bigger model.
5. **Badge naming: spell "FINOTAUR"** (replaces "PRO") — the user bought a
   plan called FINOTAUR; a fifth name adds confusion.

## 7. FINO Economy (cost model — decided 2026-07-05)

Per-question API cost estimates (avg question; caching applied where noted):

| Tier | Model | Quota/day | ~cost/question | Typical $/mo | Worst-case $/mo | vs price |
|---|---|---|---|---|---|---|
| FREE | Haiku | 3 | $0.006 | ~$0.20 | ~$0.55 | acquisition cost |
| TRADER | Haiku + journal ctx | 10 | $0.008 | ~$0.70 | ~$2.40 | ≤5% of $44.99 |
| INVESTOR | Sonnet + report RAG (cached) | 25 | ~$0.023 | ~$3 | ~$17 | typ. 6% of $49 |
| FINOTAUR | Sonnet + tools (cached) | unlimited (silent cap 100) | ~$0.03 | ~$4.50 | ~$90 | typ. 5% of $89 |

**Economy levers (mandatory in server implementation):**
1. **Prompt caching** on system prompt + daily TOP SECRET report — the single
   biggest lever (~70–80% input-cost cut on Sonnet tiers).
2. **Model routing by tier** (see §6.4). Never expose model names to users.
3. **max_tokens per tier:** 700 / 900 / 1200 / 1500 (free/trader/investor/finotaur).
4. **Teaser is metadata, not a second LLM call** — rule-based
   `teaser_available` flag computed server-side (compute first, LLM last).
5. **Silent abuse cap** for FINOTAUR at 100/day — caps worst-case cost near
   break-even; no real user hits it; polite "heavy usage" copy if ever hit.
6. **Per-call cost logging** to the existing AI cost-logging tables.

Quota reset: UTC midnight, same counter mechanism as today's free 3/day.

## 8. Server implementation spec (`finotaur-server`, Railway)

### 8.1 Tier resolution (middleware, per request)
```
resolveFinoTier(userId):
  plan = supabase.rpc('get_effective_platform_plan', { user_id }) // exists
  if plan in ('finotaur','enterprise') → 'finotaur' | 'ultimate'
  if plan == 'investor'                → 'investor'
  // platform-free: check journal Premium (same source BillingTab uses)
  if journalPremiumActive(userId)      → 'trader'
  else                                 → 'free'
```
Cache the resolution per user for 5 min (in-memory LRU) — quota checks hit
every message.

### 8.2 Quotas
`FINO_QUOTAS = { free: 3, trader: 10, investor: 25, finotaur: 100, ultimate: 100 }`
(finotaur/ultimate cap is silent — never advertised).
- Extend the existing daily counter (currently free-only) to all tiers.
- 429 body when exceeded (English): quota info + upgrade hint for
  free/trader/investor; generic "heavy usage, resets at midnight UTC" for
  finotaur+.

### 8.3 `GET /api/ai/usage` response (extended)
```json
{ "tier": "trader", "used": 4, "limit": 10, "resetAt": "<iso>",
  "unlimited": false }
```
`unlimited: true` (and `limit: null`) for finotaur/ultimate — the client
renders quota UI only when `unlimited` is false.

### 8.4 Model routing + max_tokens
free/trader → haiku-class; investor+ → sonnet-class (current model id per
server config — do NOT hardcode EOL ids). max_tokens per §7.3. Prompt caching
headers on system + report blocks.

### 8.5 Tool/data scoping per tier
| Capability | free | trader | investor | finotaur+ |
|---|---|---|---|---|
| Market education / page context | ✅ | ✅ | ✅ | ✅ |
| Journal context + coaching | ❌ | ✅ | ✅* | ✅ |
| Report RAG (TOP SECRET) | ❌ | ❌ | ✅ | ✅ |
| Flow / Dark Pool / Scanner tools | ❌ | ❌ | ❌ | ✅ |
| FINO actions (auto-tag, screenshot→trade) | ❌ | ❌ | ❌ | ✅ |
*investor gets journal context only if they ALSO have journal Premium.

### 8.6 Teaser metadata
Rule-based classifier (keyword/route based, no LLM): if a free/trader
question touches report content → `teaser_available: "investor"`; if an
investor question touches flow/options/scanner → `teaser_available:
"finotaur"`. Max once per conversation (server tracks per-conversation flag).
Frontend renders the upsell line natively from this flag.

---

*Implementation entry points:* `src/lib/fino-tiers.ts` ·
`src/components/fino/FinoChatDrawer.tsx` · `src/components/ai-copilot/*` ·
`src/hooks/useAICopilot.ts` · server: `finotaur-server` `/api/ai/*`.
