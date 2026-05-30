#!/usr/bin/env node
/**
 * crash-guard.mjs — blocks the ONE class of TypeScript error that ships a
 * guaranteed runtime crash to production: a value identifier that is USED but
 * never imported/declared (and namespace equivalents).
 *
 * Why this exists
 * ---------------
 * On 2026-05-30 a merge-conflict resolution kept `icon: FileBarChart` in
 * Sidebar.tsx but dropped the `FileBarChart` import. Plain `tsc` flagged it
 * (TS2304) — but the CI `typecheck` job is intentionally advisory
 * (`continue-on-error`, OQ-69) because of pre-existing type drift, and Vite's
 * esbuild transpile does NOT do name resolution, so the bad reference sailed
 * into the production bundle and threw `ReferenceError: FileBarChart is not
 * defined`, white-screening every /app page.
 *
 * The gap: tsc catches it but doesn't block; vite blocks but doesn't catch.
 * This guard closes the gap by failing ONLY on the crash-class codes, leaving
 * the broad OQ-69 type-drift advisory and untouched.
 *
 * Crash-class TS codes (all mean "name has no binding" → ReferenceError):
 *   TS2304  Cannot find name 'X'.
 *   TS2552  Cannot find name 'X'. Did you mean 'Y'?
 *   TS2686  'X' refers to a UMD global, but the current file is a module.
 *   TS2693  'X' only refers to a type, but is being used as a value here.
 *   TS18004 No value exists in scope for the shorthand property 'X'.
 *
 * Exit 0 = clean (no crash-class errors). Exit 1 = at least one → block.
 */
import { execSync } from 'node:child_process';

const CRASH_CODES = ['TS2304', 'TS2552', 'TS2686', 'TS2693', 'TS18004'];
const codeRe = new RegExp(`error (${CRASH_CODES.join('|')})\\b`);

let tscOutput = '';
try {
  // tsc exits non-zero whenever ANY error exists (including OQ-69 noise);
  // we capture stdout regardless and filter to crash-class codes ourselves.
  tscOutput = execSync('npx tsc --noEmit', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (err) {
  tscOutput = `${err.stdout ?? ''}${err.stderr ?? ''}`;
}

const crashLines = tscOutput
  .split('\n')
  .filter((line) => codeRe.test(line));

if (crashLines.length === 0) {
  console.log('✅ crash-guard: no undefined-identifier errors (TS2304/2552/2686/2693/18004).');
  process.exit(0);
}

console.error('');
console.error('🔴 crash-guard FAILED — undefined identifier(s) used but never imported/declared.');
console.error('   This is a GUARANTEED production ReferenceError (white-screen). Fix before merge.');
console.error('   (See scripts/ci/crash-guard.mjs header for the 2026-05-30 incident.)');
console.error('');
for (const line of crashLines) console.error(`   ${line.trim()}`);
console.error('');
console.error(`   ${crashLines.length} crash-class error(s). Add the missing import/declaration.`);
process.exit(1);
