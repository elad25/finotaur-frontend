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

## 6. Open decisions for the session

1. Investor daily quota — 25? 15? Unlimited-with-cooldown?
2. Free teaser frequency — once per conversation? once per day?
3. Does Trader (journal-only, platform-free) deserve a FINO persona of its own
   (journal coach), or is the journal-chip composition enough?
4. Model tiering vs single model — cost table needed.
5. Naming on screen: FREE / INVESTOR / PRO / ULTIMATE badges — keep "PRO" for
   the FINOTAUR tier badge or spell "FINOTAUR"?

---

*Implementation entry points:* `src/lib/fino-tiers.ts` ·
`src/components/fino/FinoChatDrawer.tsx` · `src/components/ai-copilot/*` ·
`src/hooks/useAICopilot.ts` · server: `finotaur-server` `/api/ai/*`.
