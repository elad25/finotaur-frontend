# Perf Audit Tooling

Reusable helpers from the `perf-audit-roadmap` session (2026-05-06).
Used to measure bundle composition, render-blocking resources, and
per-page Lighthouse metrics for landing/auth/app routes.

## Files

- `analyze-stats.cjs` — parse `dist/stats.html` (rollup-plugin-visualizer
  output) into a chunk + per-package size breakdown. Writes to
  `/tmp/bundle-breakdown.txt`.
- `extract-json.cjs` — extract the embedded JSON data block from
  `stats.html` via brace-counting. Writes to `/tmp/stats.json`. Used as a
  step inside `analyze-stats.cjs`; also runnable standalone.
- `parse-stats.cjs` — initial chunk listing (subset of `analyze-stats`).
  Kept for diff-checking different parse strategies.

## Usage

### Generate the bundle treemap

```bash
npm run build:analyze     # vite build --mode analyze
                          # → dist/stats.html (open in browser for treemap)
```

### Programmatic chunk breakdown

```bash
node tools/perf-audit/analyze-stats.cjs
# Output: /tmp/bundle-breakdown.txt with top 25 chunks + per-package
# breakdown for the top 6 chunks. Useful for comparing across builds.
```

### Lighthouse measurements (manual)

Production preview:

```bash
npm run build && npm run preview &        # serves on :4173
npx lighthouse http://localhost:4173/ \
  --output=json,html \
  --output-path=/tmp/lh-landing \
  --quiet --form-factor=mobile \
  --only-categories=performance \
  --chrome-flags="--headless --no-sandbox"
```

For auth-gated routes, attach to a running Chrome via debug port:

```bash
# In a separate terminal:
"C:\Program Files\Google\Chrome\Application\chrome.exe" \
  --remote-debugging-port=9222 \
  --user-data-dir="C:\temp\chrome-perf-audit"
# Log in manually, navigate to the target page, then:
npx lighthouse http://localhost:4173/app/<route> --port=9222 ...
```

## Conventions

- All output paths default to `/tmp/...` (mapped to
  `C:\Users\<user>\AppData\Local\Temp\...` on Git Bash on Windows;
  Node's `fs.writeFileSync('/tmp/...')` resolves to `C:\tmp\...` for
  Windows-style paths).
- **Cross-platform note:** the `/tmp/` paths work on macOS, Linux, and
  Git Bash on Windows. If running on native Windows (cmd/PowerShell),
  adjust to use a writable directory like `./tmp/` or `%TEMP%/`.
- Single-run Lighthouse measurements are noisy (±15-20%). For real
  optimization decisions, take median of 3 runs.
- Production preview (`:4173`) is the right target for Landing/Auth.
  App-gated routes require manual login flow + Chrome debug-port.

## Provenance

Created: 2026-05-06, `perf-audit-roadmap` session.
Report: `finotaur/.claude/reports/2026-05-06-perf-audit-full.md`.
Sprint plan: see report Section 7.
