#!/usr/bin/env node
/**
 * Dialog-title a11y guard (the "never again" for the Radix
 * "`DialogContent` requires a `DialogTitle`..." runtime console error).
 *
 * Radix's Dialog primitive (and everything built on it — Dialog, Sheet,
 * AlertDialog, Drawer) logs a console error at runtime whenever a *Content
 * renders without a matching *Title in its subtree. It is invisible to the
 * vite build and to esbuild, so it ships silently to production (surfaced
 * 2026-06-26: broker bottom-Sheet + mobile sidebar Sheet had no SheetTitle).
 *
 * This guard scans src/ and fails (exit 1) if a file renders a
 *   <DialogContent> / <SheetContent> / <AlertDialogContent> / <DrawerContent>
 * but does NOT also contain the matching title token
 *   <DialogTitle> / <SheetTitle> / <AlertDialogTitle> / <DrawerTitle>
 * (a sr-only / VisuallyHidden title counts — it's still a <*Title>).
 * `<Primitive>.Title` usage (e.g. DialogPrimitive.Title) also counts.
 *
 * Conservative by design (same spirit as check-routes.mjs): the check is
 * per-file, so a title legitimately rendered by a child component in a
 * DIFFERENT file would be a false positive — for that case add the opt-out
 * comment `dialog-title-guard-ignore` anywhere in the offending file.
 *
 * Run: node scripts/check-dialog-titles.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const IGNORE_MARKER = 'dialog-title-guard-ignore';

// Each Radix content element → the title element(s) that satisfy it.
const FAMILIES = [
  { content: 'DialogContent', title: 'DialogTitle' },
  { content: 'SheetContent', title: 'SheetTitle' },
  { content: 'AlertDialogContent', title: 'AlertDialogTitle' },
  { content: 'DrawerContent', title: 'DrawerTitle' },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(full);
  }
  return out;
}

// Line number of the first `<Content` occurrence, for the report.
function firstTagLine(text, content) {
  const idx = text.indexOf(`<${content}`);
  if (idx < 0) return 0;
  return text.slice(0, idx).split('\n').length;
}

const files = walk(SRC);
const offenders = []; // { file, content, title, line }
let contentCount = 0;

for (const f of files) {
  const text = readFileSync(f, 'utf8');
  if (text.includes(IGNORE_MARKER)) continue;

  for (const { content, title } of FAMILIES) {
    const contentRe = new RegExp(`<${content}\\b`);
    if (!contentRe.test(text)) continue;
    contentCount++;

    // Satisfied by the matching <*Title> tag, OR a <Primitive>.Title usage
    // (e.g. <DialogPrimitive.Title>), OR a `Primitive.Title` reference.
    const titleRe = new RegExp(`<${title}\\b`);
    const primitiveTitleRe = /\bTitle\b/.test(title)
      ? new RegExp(`[A-Za-z0-9_]+Primitive\\.Title\\b|\\b${title}\\b`)
      : null;

    const ok = titleRe.test(text) || (primitiveTitleRe && primitiveTitleRe.test(text));
    if (!ok) {
      offenders.push({
        file: relative(ROOT, f),
        content,
        title,
        line: firstTagLine(text, content),
      });
    }
  }
}

console.log(
  `dialog-guard: scanned ${files.length} files, ${contentCount} Dialog/Sheet/AlertDialog/Drawer content blocks.`
);

if (offenders.length) {
  console.error(
    `\n❌ dialog-guard FAILED — ${offenders.length} content element(s) render WITHOUT a matching title ` +
    `(Radix throws "\`${'DialogContent'}\` requires a \`DialogTitle\`..." at runtime):\n`
  );
  for (const o of offenders.sort((a, b) => a.file.localeCompare(b.file))) {
    console.error(`  ${o.file}:${o.line}  <${o.content}> has no <${o.title}>`);
  }
  console.error(
    '\nFix: add a title inside the content, visually hidden if there is no visible heading:\n' +
    '  <DialogTitle className="sr-only">…</DialogTitle>  (or SheetTitle / AlertDialogTitle / DrawerTitle)\n' +
    'and add `aria-describedby={undefined}` to the content to silence the paired description warning.\n' +
    'False positive (title comes from a child component)? Add a `dialog-title-guard-ignore` comment to the file.'
  );
  process.exit(1);
}

console.log('✅ dialog-guard passed — every Dialog/Sheet/AlertDialog/Drawer content has a title.');
