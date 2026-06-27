#!/usr/bin/env node
/**
 * dropdown-guard — enforces the DESIGN IRON RULE (2026-06-27):
 * native <select> dropdowns must never render white-on-white / unreadable.
 *
 * The protection is a single site-wide rule in src/styles/globals.css:
 *   select { color-scheme: dark; }
 *   select option, select optgroup { background-color: <dark>; color: <light>; }
 *
 * `color-scheme: dark` makes browsers paint native <select> popups in dark mode;
 * the explicit option colors are a fallback for engines that ignore it. Together
 * they guarantee every <select> (76+ across the app) stays legible WITHOUT any
 * per-component styling — so an individual <option> can never re-create the
 * white-on-white bug just by inheriting a light text color.
 *
 * This guard fails the build if that protection is removed, so the bug can never
 * silently regress. It deliberately does NOT police individual <option> classes:
 * with the global dark background in place, per-option light text stays legible,
 * and a heuristic scan only produces false positives.
 *
 * Run: node scripts/check-dropdown-theme.mjs   (exit 1 on violation)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const GLOBALS = join(process.cwd(), 'src', 'styles', 'globals.css');

let css = '';
try {
  css = readFileSync(GLOBALS, 'utf8');
} catch {
  fail([`Cannot read ${GLOBALS} — the dropdown dark-theme rule must live there.`]);
}

const errors = [];
if (!/select\s*\{[^}]*color-scheme\s*:\s*dark/s.test(css)) {
  errors.push(
    'globals.css is missing `select { color-scheme: dark; }` — the iron rule that ' +
    'keeps native dropdown option lists legible on the dark theme. DO NOT remove it.',
  );
}
if (!/select\s+option[^{]*\{[^}]*background-color/s.test(css)) {
  errors.push(
    'globals.css is missing the `select option { background-color: ...; color: ...; }` ' +
    'fallback — required for engines that ignore color-scheme.',
  );
}

if (errors.length) fail(errors);
console.log('✅ dropdown-guard: native dropdowns are protected (color-scheme: dark present).');

function fail(list) {
  console.error('\n❌ dropdown-guard: DESIGN IRON RULE violated\n');
  for (const e of list) console.error('  • ' + e);
  console.error(
    '\nFix: keep the `select { color-scheme: dark }` + `select option {...}` rule in ' +
    'src/styles/globals.css. Native dropdowns must never render white-on-white.\n',
  );
  process.exit(1);
}
