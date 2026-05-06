const fs = require('fs');
const html = fs.readFileSync('dist/stats.html', 'utf8');
const start = html.indexOf('const data = {');
if (start < 0) { console.error('FAIL: const data = { not found'); process.exit(1); }
let i = start + 'const data = '.length;
let depth = 0;
let inString = false;
let escape = false;
const begin = i;
for (; i < html.length; i++) {
  const ch = html[i];
  if (escape) { escape = false; continue; }
  if (inString) {
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = false; continue; }
    continue;
  }
  if (ch === '"') { inString = true; continue; }
  if (ch === '{') depth++;
  else if (ch === '}') { depth--; if (depth === 0) { i++; break; } }
}
const json = html.slice(begin, i);
fs.writeFileSync('/tmp/stats.json', json);
console.log('json bytes:', json.length);
console.log('first 80:', json.slice(0, 80));
console.log('last 80:', json.slice(-80));
try {
  const obj = JSON.parse(json);
  console.log('parse OK, top keys:', Object.keys(obj));
  console.log('tree.children count:', obj.tree.children.length);
} catch (e) {
  console.log('parse error:', e.message.slice(0, 200));
}
