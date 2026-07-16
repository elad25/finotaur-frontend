#!/usr/bin/env node
/**
 * Dialog a11y guard.
 *
 * Radix logs production console warnings when Dialog/Sheet/AlertDialog/Drawer
 * content renders without a title or description. The shared UI wrappers add
 * invisible fallback metadata so one missing modal cannot spam production.
 *
 * This guard verifies the wrappers keep that fallback behavior, and rejects
 * direct primitive Content usage outside the wrappers unless it provides its
 * own title and description.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const WRAPPER_FALLBACKS = [
  {
    file: 'src/components/ui/dialog.tsx',
    content: 'DialogPrimitive.Content',
    title: 'DialogPrimitive.Title',
    description: 'DialogPrimitive.Description',
    helper: 'hasDialogPart',
  },
  {
    file: 'src/components/ui/sheet.tsx',
    content: 'SheetPrimitive.Content',
    title: 'SheetPrimitive.Title',
    description: 'SheetPrimitive.Description',
    helper: 'hasSheetPart',
  },
  {
    file: 'src/components/ui/alert-dialog.tsx',
    content: 'AlertDialogPrimitive.Content',
    title: 'AlertDialogPrimitive.Title',
    description: 'AlertDialogPrimitive.Description',
    helper: 'hasAlertDialogPart',
  },
  {
    file: 'src/components/ui/drawer.tsx',
    content: 'DrawerPrimitive.Content',
    title: 'DrawerPrimitive.Title',
    description: 'DrawerPrimitive.Description',
    helper: 'hasDrawerPart',
  },
];

const DIRECT_PRIMITIVES = WRAPPER_FALLBACKS.map(({ file, content, title, description }) => ({
  wrapperFile: file,
  content,
  title,
  description,
}));

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

function lineAt(text, idx) {
  return text.slice(0, Math.max(0, idx)).split('\n').length;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findTagEnd(text, start) {
  let quote = null;
  let braceDepth = 0;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      braceDepth += 1;
      continue;
    }
    if (ch === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }
    if (ch === '>' && braceDepth === 0) return i;
  }

  return -1;
}

function findContentBlocks(text, content) {
  const blocks = [];
  const escapedContent = escapeRegExp(content);
  const openRe = new RegExp(`<${escapedContent}\\b`, 'g');
  let match;

  while ((match = openRe.exec(text))) {
    const start = match.index;
    const openEnd = findTagEnd(text, start);
    if (openEnd < 0) break;

    const openTag = text.slice(start, openEnd + 1);
    if (/\/\s*>$/.test(openTag)) {
      blocks.push({ start, openTag, body: '' });
      openRe.lastIndex = openEnd + 1;
      continue;
    }

    const tagRe = new RegExp(`</?${escapedContent}\\b`, 'g');
    tagRe.lastIndex = openEnd + 1;
    let depth = 1;
    let closeStart = -1;
    let tagMatch;

    while ((tagMatch = tagRe.exec(text))) {
      const tagStart = tagMatch.index;
      const tagEnd = findTagEnd(text, tagStart);
      if (tagEnd < 0) break;

      const tag = text.slice(tagStart, tagEnd + 1);
      if (tag.startsWith(`</${content}`)) {
        depth -= 1;
        if (depth === 0) {
          closeStart = tagStart;
          tagRe.lastIndex = tagEnd + 1;
          break;
        }
      } else if (!/\/\s*>$/.test(tag)) {
        depth += 1;
      }
      tagRe.lastIndex = tagEnd + 1;
    }

    const bodyEnd = closeStart >= 0 ? closeStart : openEnd + 1;
    blocks.push({
      start,
      openTag,
      body: text.slice(openEnd + 1, bodyEnd),
    });
    openRe.lastIndex = closeStart >= 0 ? tagRe.lastIndex : openEnd + 1;
  }

  return blocks;
}

function hasPrimitivePart(blockBody, part) {
  return new RegExp(`<${escapeRegExp(part)}\\b`).test(blockBody);
}

function hasPrimitiveDescription(blockBody, openTag, description) {
  return (
    hasPrimitivePart(blockBody, description) ||
    /\baria-describedby\s*=\s*(?:\{[^}]+\}|"[^"]*"|'[^']*')/.test(openTag)
  );
}

const wrapperFailures = [];

for (const fallback of WRAPPER_FALLBACKS) {
  const fullPath = join(ROOT, fallback.file);
  const text = readFileSync(fullPath, 'utf8');
  const requiredSnippets = [
    fallback.content,
    fallback.title,
    fallback.description,
    fallback.helper,
    'className="sr-only"',
    '!hasTitle',
    '!hasDescription',
  ];

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      wrapperFailures.push(`${fallback.file} missing fallback snippet: ${snippet}`);
    }
  }
}

const files = walk(SRC);
const primitiveOffenders = [];
let primitiveContentCount = 0;

for (const file of files) {
  const relFile = relative(ROOT, file).replaceAll('\\', '/');
  const text = readFileSync(file, 'utf8');

  for (const primitive of DIRECT_PRIMITIVES) {
    if (relFile === primitive.wrapperFile) continue;

    const blocks = findContentBlocks(text, primitive.content);
    primitiveContentCount += blocks.length;

    for (const block of blocks) {
      const missing = [];
      if (!hasPrimitivePart(block.body, primitive.title)) missing.push(`<${primitive.title}>`);
      if (!hasPrimitiveDescription(block.body, block.openTag, primitive.description)) {
        missing.push(`<${primitive.description}> or aria-describedby={undefined}`);
      }
      if (missing.length > 0) {
        primitiveOffenders.push({
          file: relative(ROOT, file),
          line: lineAt(text, block.start),
          content: primitive.content,
          missing: missing.join(' + '),
        });
      }
    }
  }
}

console.log(
  `dialog-guard: verified ${WRAPPER_FALLBACKS.length} shared wrappers and scanned ${primitiveContentCount} direct primitive content blocks.`
);

if (wrapperFailures.length > 0 || primitiveOffenders.length > 0) {
  console.error('\nERROR: dialog-guard failed. Radix dialog a11y warnings could reach production:\n');

  for (const failure of wrapperFailures) {
    console.error(`  ${failure}`);
  }

  for (const offender of primitiveOffenders.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
    console.error(`  ${offender.file}:${offender.line}  <${offender.content}> missing ${offender.missing}`);
  }

  console.error(
    '\nFix: keep fallback Title/Description in the shared wrappers, or add explicit primitive metadata next to direct primitive Content usage.\n'
  );
  process.exit(1);
}

console.log('dialog-guard passed: shared dialog wrappers prevent missing Radix title/description warnings.');
