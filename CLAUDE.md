═══════════════════════════════════════════════════════════════════════
**MANDATORY PRE-SESSION READING**

Before any work, read in full:
`/c/Users/elad2/Projects/finotaur/LESSONS_LEARNED.md`

This file contains 7 lessons from the 2026-05-03/04 deployment session
where a "5-minute smoke test" became a 6-hour multi-layer infrastructure
debugging session because these rules were not followed.

Failure to follow these lessons has caused:
- Multi-hour wasted sessions
- Production bugs
- Lost user trust in completion claims

These are non-negotiable rules. If a phase appears to violate them,
STOP and ask Elad before continuing.
═══════════════════════════════════════════════════════════════════════

---

## 🎯 Master Plan & Governance

This repo is governed by two strategic documents:

1. **`.claude/plans/MASTER_PLAN.md`** — Operational source of truth
   - READ FIRST at every session start
   - UPDATE BEFORE every commit (Part 3 Sprint History, Part 2 Production Readiness, Part 4 ADL, Part 6 Open Questions)
   - Single source of truth for: business strategy, production readiness, sprint history, architectural decisions

2. **`.claude/plans/pricing-strategy-v2.md`** — Deep business reasoning
   - Reference for "WHY" questions about pricing, tiers, funnel, market positioning
   - Rarely changes; do NOT modify without explicit Elad approval

### 🔴 SESSION START — MANDATORY (BEFORE PLAN MODE QUESTIONS)

At the **very first Claude response** of every session in this repo, BEFORE asking the user any clarifying question, BEFORE entering plan mode, BEFORE proposing any approach:

1. **Read `.claude/plans/MASTER_PLAN.md` in FULL** (all 7+ parts).
2. **Read the active sprint plan** in `.claude/plans/` (most recent dated file or named sprint).
3. **Identify current sprint phase** (Part 3.1 Sprint Sequence) and current Production Readiness status (Part 2).
4. **Acknowledge to user in 2-3 lines** what big-picture phase we're in, before discussing the new task.

Only AFTER these 4 steps may Claude:
- Ask clarifying questions
- Propose plans
- Enter plan mode
- Begin work

This guarantees every plan/decision is anchored to current strategy, not made in isolation. Skipping = high risk of contradicting open ADLs or sprint priorities.

If user explicitly says "skip plan, just do X" or "quick fix" — Claude may shortcut step 4 (acknowledgement) but MUST still complete steps 1-3 silently.

### Mandatory Update Protocol

Every Claude Code session MUST:
- Begin by reading MASTER_PLAN.md in full (see SESSION START block above)
- End by updating MASTER_PLAN.md with sprint outcomes
- Use commit format: `docs(master-plan): Sprint [X] completion + decisions + status`
- NEVER edit Part 1 (Business Strategy) without Elad approval
- NEVER delete entries in Part 3 (Sprint History) — append-only
- NEVER modify pricing/tiers without Elad approval

If MASTER_PLAN.md or pricing-strategy-v2.md is missing, STOP and notify Elad.

Pre-deploy: see MASTER_PLAN.md §7.6 for contract validation protocol.

### Session End Protocol

When Elad writes "סוף סשן", "סיים סשן", "end session", or "wrap up":
Execute the 8-step protocol from MASTER_PLAN.md section 7.5.
The final summary to Elad MUST be in Hebrew, conceptual, and practical.
DO NOT count files. DO NOT cite commit hashes. Tell him what we ACHIEVED and what's NEXT.

---

# Finotaur Project — Quick Reference

Full context: `C:/Users/elad2/Projects/.claude/skills/projects/finotaur.skill.md`
Global rules: `C:/Users/elad2/Projects/CLAUDE.md`
Public contract for cross-project use: `./PUBLIC_INTERFACE.md`

## Critical Safety (load even if skill fails)
- Never touch: `.env`, `.env.local`, `*.zip`, `גיבוי/`, `באוויר/`, `snapshot.json`, root `index.html`
- Whop webhooks: revenue-critical — no mods without explicit confirmation
- Supabase RLS: show SQL first, wait for "yes"
- Edge Functions in `finotaur-frontend/supabase/functions/`: confirmation required
- No `npm test` — no test runner configured
- Production-first: every Polygon/Perplexity call costs real money

## Boot Quickstart

```bash
# Terminal 1
cd finotaur-server && npm run dev    # :3000

# Terminal 2
cd finotaur-frontend && npm run dev  # :5173, proxies /api → :3000

# Health check
curl http://localhost:3000/api/_whoami
```

## Subdirectories with their own CLAUDE.md (created if/when needed)
- `finotaur-frontend/CLAUDE.md`
- `finotaur-server/CLAUDE.md`

## Design System (mandatory for ANY UI work)
- Spec: `finotaur-frontend/DESIGN_SYSTEM.md` (source of truth — never improvise)
- Auto-loading skill: `finotaur-frontend/.claude/skills/finotaur-design/SKILL.md`
- Canonical components: `finotaur-frontend/src/components/ds/` — use `<Button variant="gold">`, `<Card>`, `<Price>`, `<Change>`, `<Quote>`. Don't rebuild them inline.
- Tokens: in `globals.css` (CSS vars) + `tailwind.config.ts` (utilities — `bg-gold-primary`, `text-ink-primary`, `p-ds-5`, `shadow-glow-gold-resting`, etc.)
- DEV-only playground: `http://localhost:5173/design-lab`
- Audit: `finotaur-frontend/DESIGN_AUDIT.md` (re-run grep commands after each migration phase)

## Repo Hygiene Status (as of 2026-05-02)

The working tree contains ~600 pre-existing dirty files from prior
development sessions, catalogued during P0 commit prep:
- 96 deletions of source files (TradeForm.tsx, SnapTradePopup.tsx, etc.)
- 149 modifications across src/components and server routes
- 361 untracked (mix of legitimate new code, docs, and git debris)
- 6,927 phantom node_modules deletions (cleanup needed:
  `git rm -r --cached node_modules`)

Tag `pre-p0-snapshot` marks the state before any P0 commits.
P0 commits on `master`: `7a457ce` (checkpoint) + `de3b8b8` (feat).
Branch `feature/ai-operations-tab` continues from `de3b8b8`.

Cleanup is scheduled AFTER AI Operations Tab completion.
DO NOT commit unrelated files when working on a specific feature.
