const fs = require('fs');
const html = fs.readFileSync('dist/stats.html', 'utf8');
const idx = html.indexOf('const data = ');
const end = html.indexOf('drawChart(data', idx);
const stmt = html.slice(idx, end);
const jsonStart = stmt.indexOf('{');
const jsonEnd = stmt.lastIndexOf('};');
const json = stmt.slice(jsonStart, jsonEnd + 1);
const data = JSON.parse(json);
const tree = data.tree;
const nodeParts = data.nodeParts || {};

function walkChunk(node) {
  let r = 0, g = 0, b = 0;
  const leaves = [];
  function walk(n, prefix = '') {
    if (n.uid && nodeParts[n.uid]) {
      const p = nodeParts[n.uid];
      r += p.renderedLength || 0;
      g += p.gzipLength || 0;
      b += p.brotliLength || 0;
      leaves.push({ name: (prefix + (n.name || '')), r: p.renderedLength || 0, g: p.gzipLength || 0 });
    }
    if (n.children) for (const c of n.children) walk(c, prefix + (n.name ? n.name + '/' : ''));
  }
  walk(node);
  return { r, g, b, leaves };
}

const kb = (n) => (n / 1024).toFixed(1) + 'kB';
const chunks = tree.children.map(c => {
  const s = walkChunk(c);
  return { name: c.name, raw: s.r, gz: s.g, brotli: s.b, leaves: s.leaves };
}).sort((a, b) => b.raw - a.raw);

const lines = [];
lines.push('=== ALL CHUNKS BY RAW SIZE ===');
chunks.forEach(c => {
  lines.push((c.name.replace('assets/', '')).padEnd(48) + 'raw=' + kb(c.raw).padStart(10) + ' gz=' + kb(c.gz).padStart(10) + ' br=' + kb(c.brotli).padStart(10));
});
lines.push('');

// For top 6 chunks, show top 8 modules
lines.push('=== TOP MODULES INSIDE TOP 6 CHUNKS ===');
chunks.slice(0, 6).forEach(c => {
  lines.push('--- ' + c.name + ' (raw=' + kb(c.raw) + ', gz=' + kb(c.gz) + ') ---');
  // Group leaves by package name (extract from path)
  const byPkg = {};
  c.leaves.forEach(l => {
    let pkg = l.name;
    const nmIdx = pkg.indexOf('node_modules/');
    if (nmIdx >= 0) {
      const after = pkg.slice(nmIdx + 13);
      const parts = after.split('/');
      pkg = parts[0].startsWith('@') ? parts[0] + '/' + parts[1] : parts[0];
    } else if (pkg.startsWith('src/') || pkg.includes('/src/')) {
      pkg = pkg.slice(pkg.indexOf('src/'));
    }
    byPkg[pkg] = byPkg[pkg] || { r: 0, g: 0, count: 0 };
    byPkg[pkg].r += l.r;
    byPkg[pkg].g += l.g;
    byPkg[pkg].count++;
  });
  const sorted = Object.entries(byPkg).sort((a, b) => b[1].r - a[1].r).slice(0, 10);
  sorted.forEach(([pkg, v]) => {
    lines.push('  ' + kb(v.r).padStart(8) + ' raw / ' + kb(v.g).padStart(8) + ' gz | ' + pkg + ' (' + v.count + ' files)');
  });
});

console.log(lines.join('\n'));
fs.writeFileSync('/tmp/bundle-breakdown.txt', lines.join('\n'));
console.log('\nSaved to /tmp/bundle-breakdown.txt');
