const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/tmp/stats.json', 'utf8'));
const tree = data.tree;
const nodeParts = data.nodeParts || {};

function walk(node) {
  let r = 0, g = 0, b = 0;
  const leaves = [];
  function rec(n, prefix='') {
    if (n.uid && nodeParts[n.uid]) {
      const p = nodeParts[n.uid];
      r += p.renderedLength || 0;
      g += p.gzipLength || 0;
      b += p.brotliLength || 0;
      leaves.push({ name: prefix + (n.name||''), r: p.renderedLength||0, g: p.gzipLength||0 });
    }
    if (n.children) for (const c of n.children) rec(c, prefix + (n.name ? n.name+'/' : ''));
  }
  rec(node);
  return { r, g, b, leaves };
}

const kb = (n) => (n/1024).toFixed(1) + 'kB';
const chunks = tree.children.map(c => ({ name: c.name, ...walk(c) })).sort((a,b)=>b.r-a.r);
const lines = [];

lines.push('=== TOP 25 CHUNKS BY RAW SIZE ===');
chunks.slice(0, 25).forEach(c => {
  lines.push(c.name.replace('assets/','').padEnd(50) + 'raw=' + kb(c.r).padStart(10) + ' gz=' + kb(c.g).padStart(10) + ' br=' + kb(c.b).padStart(10));
});
lines.push('');

const TOTAL_RAW = chunks.reduce((s,c)=>s+c.r, 0);
const TOTAL_GZ = chunks.reduce((s,c)=>s+c.g, 0);
lines.push('TOTAL chunks: ' + chunks.length);
lines.push('TOTAL raw: ' + kb(TOTAL_RAW) + ' / gz: ' + kb(TOTAL_GZ));
lines.push('');

// For top 6 chunks: package-level breakdown
lines.push('=== INSIDE TOP 6 CHUNKS — TOP 12 PACKAGES BY SIZE ===');
chunks.slice(0, 6).forEach(c => {
  lines.push('');
  lines.push('--- ' + c.name + ' (raw=' + kb(c.r) + ', gz=' + kb(c.g) + ') ---');
  const byPkg = {};
  c.leaves.forEach(l => {
    let pkg = l.name;
    const nmIdx = pkg.indexOf('node_modules/');
    if (nmIdx >= 0) {
      const after = pkg.slice(nmIdx + 13);
      const parts = after.split('/');
      pkg = parts[0].startsWith('@') ? parts[0] + '/' + (parts[1]||'') : parts[0];
    } else if (pkg.includes('/src/')) {
      pkg = 'src/' + pkg.split('/src/')[1].split('/').slice(0, 2).join('/');
    } else if (pkg.startsWith('src/')) {
      pkg = pkg.split('/').slice(0, 2).join('/');
    }
    byPkg[pkg] = byPkg[pkg] || { r: 0, g: 0, count: 0 };
    byPkg[pkg].r += l.r;
    byPkg[pkg].g += l.g;
    byPkg[pkg].count++;
  });
  Object.entries(byPkg).sort((a,b)=>b[1].r-a[1].r).slice(0, 12).forEach(([pkg, v]) => {
    lines.push('  ' + kb(v.r).padStart(10) + ' / gz ' + kb(v.g).padStart(10) + ' | ' + pkg + ' (' + v.count + ' files)');
  });
});

// Specific deep-dive on vendor-charts (433KB) and vendor-data (210KB)
lines.push('');
lines.push('=== vendor-charts DETAIL — top 20 individual files ===');
const vc = chunks.find(c => c.name.includes('vendor-charts'));
if (vc) vc.leaves.sort((a,b)=>b.r-a.r).slice(0, 20).forEach(l => {
  const trim = l.name.replace(/.*node_modules\//, '~/').slice(-90);
  lines.push('  ' + kb(l.r).padStart(10) + ' raw | ' + trim);
});

lines.push('');
lines.push('=== vendor-data DETAIL — top 15 individual files ===');
const vd = chunks.find(c => c.name.includes('vendor-data'));
if (vd) vd.leaves.sort((a,b)=>b.r-a.r).slice(0, 15).forEach(l => {
  const trim = l.name.replace(/.*node_modules\//, '~/').slice(-90);
  lines.push('  ' + kb(l.r).padStart(10) + ' raw | ' + trim);
});

lines.push('');
lines.push('=== index.js DETAIL — top 15 (this is the main entry!) ===');
const idx = chunks.find(c => c.name.includes('/index-') && !c.name.includes('vendor'));
if (idx) idx.leaves.sort((a,b)=>b.r-a.r).slice(0, 15).forEach(l => {
  const trim = l.name.replace(/.*node_modules\//, '~/').slice(-90);
  lines.push('  ' + kb(l.r).padStart(10) + ' raw | ' + trim);
});

fs.writeFileSync('/tmp/bundle-breakdown.txt', lines.join('\n'));
console.log('OK — saved to /tmp/bundle-breakdown.txt (' + lines.length + ' lines)');
