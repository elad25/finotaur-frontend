# FINOTAUR — Lessons Learned (Mandatory pre-session reading)

**Last updated:** 2026-05-04
**Trigger:** 2026-05-03 Manual Entry production bug + 2026-05-04 6-hour
journal deployment session that exposed multi-layer infrastructure debt
**Read this in full at the start of every session — before any work.**

═══════════════════════════════════════════════════════════════════════

## Lesson 1 — "Tests passing" ≠ "Production working"

### What actually happened

CC ran 70 vitest tests, all green, and declared "GO for first customer."
Elad checked production, saw the same bug we "fixed" still alive.
Reason: vitest tests source code on disk; it does not test build, deploy,
or what users see. The fix lived in a worktree that never reached GitHub.

### The hard rule

A phase is DONE only when ALL FOUR are verified:

1. ✅ Tests passing in vitest
2. ✅ Code merged into the GitHub-linked repo (origin/main)
3. ✅ Cloudflare Pages deployment status = Success on dashboard
4. ✅ Elad verified the change in production URL

If any one is missing → phase status = "Code complete in worktree,
pending merge + deploy + verification". Never "done".

### Forbidden phrases without all four checks

- "production-ready"
- "GO for customer"
- "deployed"
- "live"
- "shipped"

### Required phrasing

- "Code complete in worktree — pending merge"
- "Merged to main — pending Cloudflare build"
- "Build succeeded — pending Elad verification on prod URL"
- "Verified live by Elad on [URL] at [timestamp]"

═══════════════════════════════════════════════════════════════════════

## Lesson 2 — Diagnose before fix. Always.

### What actually happened

Multiple "quick fixes" each revealed deeper layers. "5-minute smoke test"
became 6 hours of cascading discoveries because each fix was attempted
before fully understanding the system state.

### The hard rule

When system state is unknown:
1. NEVER promise "quick fix"
2. ALWAYS start with diagnostic phase
3. Diagnostics are read-only and create no new debt
4. Only after full diagnosis — propose fix scope

### Diagnostic-first protocol

1. Read state (git status, schema, config files)
2. Map dependencies (what imports what, what depends on what)
3. Identify all related artifacts (don't tunnel-vision on the visible bug)
4. Verify environment alignment (where does code go? where does bug live?)
5. ONLY THEN propose fix

### Red-flag phrases that mean "stop and diagnose"

- "This should be quick"
- "Just need to update X"
- "Simple fix"
- "While we're here let me also..."
- "5 minutes"

When CC catches itself thinking these — stop. Run diagnostic.

═══════════════════════════════════════════════════════════════════════

## Lesson 3 — There is exactly one source of truth: GitHub main

### What actually happened

Discovered 5 separate code locations, none synchronized:
1. GitHub main
2. finotaur-frontend/ local clone
3. Working tree (uncommitted edits)
4. .claude/worktrees/* (CC's workspace)
5. dist/ via manual wrangler bridge (ADL-010)

ADL-010 documented the wrangler bridge but treated it as acceptable.
It wasn't. It created drift that hid for months.

### The hard rule

GitHub main is the only state that matters for production.
Every change must reach it via standard pipeline (PR → merge → auto-build).
Bridges, manual deploys, and "temporary workarounds" become permanent debt.

### For CC specifically

- Worktree is intermediate — never a delivery state
- "Code committed in worktree" is not progress — it's a checkpoint
- The default last step of every coding phase:
  push to GitHub-linked repo (with PR or branch push, by Elad's choice)
- If CC cannot push to GitHub from current environment — STOP, alert Elad
  before any more work

═══════════════════════════════════════════════════════════════════════

## Lesson 4 — Verify environment alignment at session start

### What actually happened

Elad reported a bug from finotaur.com. CC's fix went to a worktree.
These were different environments — fix had no effect on what Elad saw.
The mismatch took 4+ hours to identify because no one verified at start.

### The hard rule

At every session start (or whenever a bug is reported), establish:

1. Bug location: [exact URL or file path the user is seeing it at]
2. Code source: [worktree path / repo path being edited]
3. Deploy pipeline: [GitHub branch → build system → production URL]
4. Currently deployed: [last successful production deploy SHA + timestamp]
5. Path from #2 to #1: [does the code being edited actually reach the bug?]

If the path in #5 is unclear → STOP and resolve before any code work.

### Required at start of every session

CC must complete this template before any code change:

```
Bug/task: [description]
Source dir: [path]
Target environment: [URL or "local only"]
Deploy path: [how code gets from source to target]
Last verified prod state: [SHA + timestamp]
```

═══════════════════════════════════════════════════════════════════════

## Lesson 5 — User WIP is sacred — protect before any operation

### What actually happened

Elad had 8 modified files + 1 untracked (TradeCopier.tsx) — all
uncommitted work in progress. Multiple operations risked overwriting them.
Required careful stash/restore sequences across multiple sessions.

### The hard rule

Before any git operation that touches working tree:

1. git status — check for uncommitted changes
2. If dirty — git stash push -u -m "elad-wip-pre-<operation>-<date>"
3. Perform operation
4. git stash pop to restore
5. Verify nothing lost (file counts, key files present)

### Forbidden without explicit Elad approval AND a backup branch

- git checkout / reset / clean / pull on dirty tree without stash
- git push --force
- git reset --hard
- "I'll just delete this file" (even if it looks unused)
- Any operation that could overwrite uncommitted work

═══════════════════════════════════════════════════════════════════════

## Lesson 6 — Long sessions degrade decision quality

### What actually happened

Single sessions ran 4-6 hours. Late-session decisions had higher error
rate. Architectural choices made under fatigue ("I don't know, you decide").

### The hard rule

After 2 hours of intense work OR after a HARD STOP requiring
architectural decision:

CC must explicitly recommend:
"Recommend pausing — fresh session preferred for next phase."

Don't push through fatigue. Cost of wrong architectural choice
> cost of pause and resume.

### Specific patterns to watch

- Architectural decisions (DB schema, deploy strategy, file deletion)
  late in session → defer to next session unless emergency
- "Quick" decisions late in session → 60-second pause before responding
- User saying "I don't know, you decide" repeatedly → fatigue signal
- User copying prompts as commands without reading → fatigue signal
- Session asking same diagnostic question twice → context loss signal

When any signal appears → CC suggests session break.

═══════════════════════════════════════════════════════════════════════

## Lesson 7 — Documentation reflects verified reality, not intent

### What actually happened

LOOP_3_FINAL_REPORT.md said "GO for first 1-3 customers".
Reality: production was broken.
Docs lied because they reflected what CC believed, not what was tested.

### The hard rule

Status claims in docs require evidence:
- Commit SHA for "merged"
- Deploy URL + dashboard screenshot for "deployed"
- Test output paths for "tested"
- Elad sign-off (in chat) for "customer-ready"

Without evidence, status is "claimed not verified".

### Forbidden in documentation

- "Production-ready" without prod URL verification
- "All tests pass" without naming specific tests + where they ran
- "Deployed successfully" without deploy SHA + URL
- "Customer-ready" without explicit Elad confirmation in chat

### Required template for status reports

```
Status: [phase name]
Code: [worktree branch / PR # / merged to main]
Tests: [vitest output: X passed / Y failed]
Build: [Cloudflare deployment SHA + status]
Production verified: [yes/no by Elad on URL at timestamp]
```

═══════════════════════════════════════════════════════════════════════

## Operating principles — summary

When in doubt about any of these — STOP and ask Elad.

1. Diagnose first. Always.
2. GitHub main is the only source of truth.
3. Done = Tests + Merged + Deployed + Verified by Elad.
4. State environment alignment at session start.
5. User WIP is sacred. Stash before touching dirty trees.
6. Pause when fatigued. Better tomorrow than wrong today.
7. Docs reflect verified reality. Not assumed state.

═══════════════════════════════════════════════════════════════════════

End of LESSONS_LEARNED.md
