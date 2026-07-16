# Deploy — finotaur-frontend

> **Single source of truth** for shipping `finotaur-frontend` to production.
> Production: <https://finotaur.com> (Cloudflare Pages alias for
> <https://finotaur-frontend.pages.dev>).

---

## TL;DR

```bash
cd finotaur-frontend
git checkout main && git pull origin main   # ensure local main = origin/main
npm ci                                       # only if dependencies changed
npm run deploy:prod                          # validates Supabase key, builds, deploys dist/, checks live assets
```

Do not deploy with a hand-built `dist/` or call `wrangler pages deploy dist`
directly. `npm run deploy:prod` is the only supported path: it validates the
configured Supabase key before build, then `npm run build` validates the
already-built bundle before upload, then `validate:deployed-assets` polls
`www.finotaur.com` until every JS/CSS asset referenced by the live app is
reachable. This blocks the two recurring failure modes: a stale local
`.env.local` creating a bundle that receives `Unregistered API key`, and a
Cloudflare edge serving an entry chunk before all dynamic chunks exist there.

After deploy, smoke-verify:

```bash
curl -s https://finotaur-frontend.pages.dev | head -5
# Expect: <!doctype html> ... <title>Finotaur — Trading Intelligence Platform</title>
```

---

## Pipeline

| Stage | Tool | Branch / Trigger | Notes |
|---|---|---|---|
| Source of truth | GitHub | `elad25/finotaur-frontend` `main` | All deploys ship from `main`. |
| CI gate | GitHub Actions (`.github/workflows/ci.yml`) | PR + push to `main` | Strict: `npm run build`. Advisory: `npm run typecheck` (OQ-69), `npm run lint`. |
| Build | Vite (`npm run build`) | Local (Elad) | Output: `dist/`. Bundle splits per-route (lazy imports). |
| Deploy | Wrangler (`npx wrangler pages deploy`) | Manual, from Elad's machine | **Not auto-triggered by push to `main`.** Every deploy requires the `wrangler` command above. |
| Host | Cloudflare Pages | Project `finotaur-frontend`, branch `main` = production | Custom alias: `finotaur.com`. |

---

## Why no auto-deploy on push?

By design (per Sprint Onboarding-2026-05-16). Cloudflare Pages can auto-build
on push, but we keep it manual so:

- Vercel/Cloudflare bills stay predictable (no preview-per-PR cost).
- Build environment is controlled (Elad's local node + npm cache).
- Smoke-test happens before traffic shifts.

The trade-off is a manual step. If you forget the `wrangler` command, the
`origin/main` tip won't reach finotaur.com — a code change can sit unmerged
to production for hours. See `## Verifying a deploy` for the check.

---

## Required env / auth

- **Wrangler auth** — first time only: `npx wrangler login`. Stored under
  `~/.wrangler/config/default.toml`. Token survives reboots.
- **Cloudflare account** — must have edit access on the `finotaur-frontend`
  Pages project. Only Elad has this today.
- **Node version** — pinned to 20 in CI. Local: `node -v` should be ≥20.10.
- **Vite env** — `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are
  inlined at build time. Production direct uploads use the real values from
  Elad's local `.env.local`; Cloudflare/Git builds use the matching encrypted
  Pages secrets. Keep both in sync with the active Supabase publishable key.

---

## Verifying a deploy

Two checks. Both are read-only and safe to run any time.

### 1. Production git matches origin

```bash
cd finotaur-frontend
git fetch origin main
git log --oneline origin/main | head -3
# Latest commit should match what you intended to ship.
```

### 2. New code is live in the bundle

The fastest way to confirm production actually rebuilt: grep the JS bundle
for a string that's unique to your change. Lazy-loaded routes ship as
separate chunks under `/assets/<RouteName>-<hash>.js`.

```bash
# Step 1: get the index bundle to find chunk filenames
curl -s https://finotaur-frontend.pages.dev/assets/index-*.js -o /tmp/index.js
grep -oE 'assets/[A-Za-z][A-Za-z0-9_-]*\.js' /tmp/index.js | sort -u | grep -i <RouteName>

# Step 2: grep the chunk for the new copy
curl -s "https://finotaur-frontend.pages.dev/assets/<RouteName>-<hash>.js" \
  | grep -o "<unique new string from your change>"
# A match proves the new build is live.
```

---

## Rollback

Cloudflare Pages keeps every deployment. Rollback = repromote a prior
deployment from the dashboard, **no rebuild needed**:

1. Open <https://dash.cloudflare.com> → Pages → `finotaur-frontend` → Deployments.
2. Find the last known-good deployment (timestamps in UTC).
3. Click `…` → "Rollback to this deployment".
4. Production cuts over in ~10s. The bad deployment stays in history (not deleted).
5. Then fix forward on `main` and re-deploy.

For a code-level rollback (revert the commit on `main`):

```bash
git -C finotaur-frontend checkout main && git pull origin main
git -C finotaur-frontend revert <bad-sha> --no-edit
git -C finotaur-frontend push origin main
# Then re-run the deploy command from TL;DR.
```

---

## Common failures

| Symptom | Likely cause | Fix |
|---|---|---|
| `wrangler` says "project not found" | Wrong `--project-name` flag, or not logged in to the right account. | `npx wrangler whoami` to verify account. Project is exactly `finotaur-frontend`. |
| Deploy succeeds but `finotaur.com` shows old UI | Browser / CDN cache. | Hard-refresh (Cmd-Shift-R / Ctrl-F5). Cloudflare cache TTL on `index.html` is 0 (`Cache-Control: max-age=0, must-revalidate`), so the new HTML should arrive immediately. Old asset hashes persist by design — they're content-addressed. |
| `npm run build` fails on Vite manifest | `dist/` not cleaned between builds. | `rm -rf dist` then rebuild. |
| `npm run typecheck` errors | Pre-existing drift (OQ-69). CI marks this advisory. | Build still ships. Don't chase OQ-69 errors during a hotfix — file a separate cleanup session. |
| `git pull` conflicts on `App.tsx` | Two worktrees / sessions touched routing. | Resolve with "keep both lines" 99% of the time — routes are textually independent. |

---

## Related

- `.github/workflows/ci.yml` — strict gate before merge to main.
- `vite.config.ts` — bundle splits, env handling.
- `package.json` `scripts` — `dev`, `build`, `typecheck`, `lint`.
- `.claude/plans/SESSION_HANDOFF_2026-05-16_onboarding-flow.md` — origin
  of the manual-deploy decision (Sprint Onboarding).
