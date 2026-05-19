#!/usr/bin/env bash
# finotaur-frontend/.claude/scripts/pre-pr-check.sh
# ─────────────────────────────────────────────────────────────────────
# Pre-PR validation gate. MUST pass before `git push -u origin <branch>`
# of any branch that will become a PR.
#
# Implements the lesson at
# .lessons/global/2026-05-19-pre-pr-build-and-cycle-validation.md
#
# Why this exists:
#   On 2026-05-19, PRs #105, #106, #107 all merged with clean tsc but
#   shipped a production TDZ ("Cannot access 'V' before initialization")
#   on /app/journal/overview. The static checker can't catch TDZ that
#   only surfaces during the production bundle's module-evaluation
#   order. This script runs the checks that WOULD catch that class of
#   bug.
#
# What it runs:
#   1. typecheck       — npm run typecheck            (~10s)
#   2. production build — npm run build                (~45-50s)
#   3. circular scan   — npx madge --circular         (~10s)
#   4. TDZ lint scan   — eslint --rule no-use-before-define on changed files (~5s)
#
# Exit codes:
#   0  all checks passed → safe to push
#   1  typecheck failed
#   2  production build failed
#   3  new circular dependency introduced
#   4  internal error (e.g. npm missing)
#   5  TDZ pattern found in a file this branch changed
#
# Flags:
#   --quick        skip the production build step (typecheck + madge
#                  only). For iteration loops. NEVER use before final
#                  push.
#   --no-color     plain output
# ─────────────────────────────────────────────────────────────────────

set -u

QUICK_MODE=0
NO_COLOR=0
for arg in "$@"; do
  case "$arg" in
    --quick) QUICK_MODE=1 ;;
    --no-color) NO_COLOR=1 ;;
    -h|--help)
      sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
  esac
done

if [ "$NO_COLOR" -eq 1 ] || [ ! -t 1 ]; then
  R=""; G=""; Y=""; B=""; D=""
else
  R="$(printf '\033[31m')"
  G="$(printf '\033[32m')"
  Y="$(printf '\033[33m')"
  B="$(printf '\033[1m')"
  D="$(printf '\033[0m')"
fi

ok()    { echo "${G}✅${D} $*"; }
fail()  { echo "${R}❌${D} $*"; }
info()  { echo "${B}→${D}  $*"; }
warn()  { echo "${Y}⚠${D}  $*"; }

# Sanity: must run from finotaur-frontend root
if [ ! -f "package.json" ] || ! grep -q '"name": "vite_react_shadcn_ts"' package.json 2>/dev/null; then
  fail "must be run from finotaur-frontend root (no package.json or wrong project)"
  exit 4
fi

START_TS=$(date +%s)

# ─── 1. typecheck ────────────────────────────────────────────────────
# Two-mode: if errors live in files this branch changed → BLOCK.
# If all errors are in files this branch didn't touch (pre-existing on
# main) → WARN and continue. The repo has ~20 pre-existing tsc errors as
# of 2026-05-19; blocking on those would make the script useless until
# someone takes a cleanup sprint.
info "step 1/3 — typecheck (npm run typecheck)"
TS_START=$(date +%s)
npm run typecheck > /tmp/pre-pr-typecheck.log 2>&1
TS_EXIT=$?
TS_END=$(date +%s)

if [ "$TS_EXIT" -ne 0 ]; then
  ERR_FILES=$(grep -oE "^[a-zA-Z0-9_/.-]+\.(ts|tsx)" /tmp/pre-pr-typecheck.log | sort -u)
  CHANGED_FILES=$(git diff --name-only origin/main...HEAD 2>/dev/null || true)
  NEW_ERR_FILES=""
  for f in $ERR_FILES; do
    if echo "$CHANGED_FILES" | grep -qFx "$f"; then
      NEW_ERR_FILES="${NEW_ERR_FILES}${f}"$'\n'
    fi
  done
  if [ -n "$NEW_ERR_FILES" ]; then
    fail "typecheck failed with errors in files this branch changed:"
    echo "$NEW_ERR_FILES"
    echo
    warn "tail of typecheck output:"
    tail -20 /tmp/pre-pr-typecheck.log
    echo
    warn "full log: /tmp/pre-pr-typecheck.log"
    exit 1
  fi
  ERR_COUNT=$(echo "$ERR_FILES" | grep -c .)
  warn "typecheck has $ERR_COUNT files with pre-existing errors (none from this branch) — continuing"
fi
ok "typecheck clean for changed files ($((TS_END - TS_START))s)"

# ─── 2. production build ─────────────────────────────────────────────
if [ "$QUICK_MODE" -eq 1 ]; then
  warn "skipping production build (--quick). MUST NOT use --quick before final push."
else
  info "step 2/3 — production build (npm run build)"
  BD_START=$(date +%s)
  if ! npm run build > /tmp/pre-pr-build.log 2>&1; then
    fail "production build failed. Tail:"
    tail -30 /tmp/pre-pr-build.log
    echo
    warn "full log: /tmp/pre-pr-build.log"
    exit 2
  fi
  BD_END=$(date +%s)
  # Surface Rollup circular-dependency warnings even when build succeeds —
  # they often correlate with TDZ at runtime.
  CIRC_WARNINGS=$(grep -cE "Circular dependency|Cannot resolve" /tmp/pre-pr-build.log || true)
  if [ "$CIRC_WARNINGS" -gt 0 ]; then
    warn "production build succeeded BUT printed $CIRC_WARNINGS circular/resolution warnings:"
    grep -E "Circular dependency|Cannot resolve" /tmp/pre-pr-build.log | head -10
    echo
    warn "review the warnings before pushing — they often precede TDZ bugs"
  fi
  ok "production build clean ($((BD_END - BD_START))s, $CIRC_WARNINGS warnings)"
fi

# ─── 3. circular-import scan ─────────────────────────────────────────
info "step 3/3 — circular-import scan (npx madge --circular)"
MG_START=$(date +%s)
# --yes ensures madge auto-installs on first run; subsequent runs are cached.
MADGE_OUT=$(npx --yes madge@latest --circular --extensions ts,tsx src/ 2>&1) || true
MG_END=$(date +%s)

# Baseline cycles known to be on origin/main as of 2026-05-19 — these are
# pre-existing and not blockers. New cycles introduced by your branch ARE
# blockers. Update this list when you legitimately remove/replace cycles.
KNOWN_CYCLES=$(cat <<'KNOWN_EOF'
1) utils/brokerParsers/ibkr.ts > utils/brokerParsers/index.ts
KNOWN_EOF
)

CYCLE_LINES=$(echo "$MADGE_OUT" | grep -E "^[0-9]+\)" || true)
if [ -z "$CYCLE_LINES" ]; then
  ok "no circular dependencies ($((MG_END - MG_START))s)"
else
  NEW_CYCLES=""
  while IFS= read -r line; do
    # Strip the leading numbering "N) " for comparison
    STRIPPED=$(echo "$line" | sed -E 's/^[0-9]+\) //')
    if ! echo "$KNOWN_CYCLES" | grep -qF "$STRIPPED"; then
      NEW_CYCLES="${NEW_CYCLES}${line}"$'\n'
    fi
  done <<< "$CYCLE_LINES"

  if [ -z "$NEW_CYCLES" ]; then
    KNOWN_COUNT=$(echo "$CYCLE_LINES" | wc -l | tr -d ' ')
    ok "all $KNOWN_COUNT cycles are known/baseline ($((MG_END - MG_START))s)"
  else
    fail "NEW circular dependency introduced:"
    echo "$NEW_CYCLES"
    echo
    warn "how to fix:"
    warn "  - if the import is type-only → change to 'import type'"
    warn "  - if it's a runtime value → extract shared interface to types.ts"
    warn "  - never bypass with // @ts-ignore"
    exit 3
  fi
fi

# ─── 4. TDZ lint scan (changed files only) ───────────────────────────
# Why this step exists:
#   The production TDZ "Cannot access 'V' before initialization" shipped to
#   /app/journal/overview on 2026-05-19 (after PRs #105/#106/#107 merged
#   with clean tsc and clean build). Source-level cause: a useCallback that
#   referenced a `const` declared later in the same component body. tsc
#   doesn't model block-level TDZ; the production bundle's evaluation order
#   does, and minifier rename masked the trail.
#
#   This step runs `eslint` with @typescript-eslint/no-use-before-define
#   escalated to ERROR, **but only for files this branch changed**. The
#   codebase has ~140 pre-existing arrow-component-as-JSX-before-decl
#   patterns that are cosmetically harmless; blocking on them would
#   nullify the script. Branch-changed-only scoping = same pattern as
#   the typecheck step above.
info "step 4/4 — TDZ lint scan (no-use-before-define on changed .ts/.tsx)"
LT_START=$(date +%s)
CHANGED_TS=$(git diff --name-only origin/main...HEAD 2>/dev/null \
  | grep -E '^(finotaur-frontend/)?src/.*\.(ts|tsx)$' \
  | sed -E 's|^finotaur-frontend/||' \
  | sort -u)
if [ -z "$CHANGED_TS" ]; then
  ok "no .ts/.tsx files changed in this branch — skipping TDZ scan ($(( $(date +%s) - LT_START ))s)"
else
  # Escalate no-use-before-define to error for this scan. Other rules keep
  # their config-default level. Use --no-warn-ignored so lint cleanly
  # skips paths in .eslintignore without exit-1ing.
  TDZ_RULE='{"@typescript-eslint/no-use-before-define":["error",{"functions":false,"classes":true,"variables":true,"allowNamedExports":false,"enums":true,"typedefs":false,"ignoreTypeReferences":true}]}'
  ESLINT_OUT=$(npx eslint --rule "$TDZ_RULE" --quiet $CHANGED_TS 2>&1) || true
  TDZ_ERRORS=$(echo "$ESLINT_OUT" | grep -cE "no-use-before-define" || true)
  if [ "$TDZ_ERRORS" -gt 0 ]; then
    fail "TDZ pattern (no-use-before-define) found in $TDZ_ERRORS location(s) in changed files:"
    echo "$ESLINT_OUT" | grep -B1 "no-use-before-define" | head -40
    echo
    warn "how to fix:"
    warn "  - move the variable's declaration ABOVE its first reference"
    warn "  - if it's a useState/useReducer setter referenced in a closure"
    warn "    declared earlier, hoist the useState block up"
    warn "  - if it's a useCallback dep array referencing a later const,"
    warn "    swap declaration order"
    warn "  - re-run after fix: npx eslint <file>"
    exit 5
  fi
  LT_END=$(date +%s)
  CHANGED_COUNT=$(echo "$CHANGED_TS" | wc -l | tr -d ' ')
  ok "no TDZ patterns in $CHANGED_COUNT changed file(s) ($((LT_END - LT_START))s)"
fi

END_TS=$(date +%s)
echo
ok "${B}all pre-PR checks passed${D} in $((END_TS - START_TS))s. safe to push."
exit 0
