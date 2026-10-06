const fs = require('fs');
const src = fs.readFileSync('/Users/sean.coleman/Projects/everything-music-site/apps/tunes/tunes-object.js', 'utf8');
const re = /"([^"\n]*)"/g; let m; const suf = new Map(); const odd = new Map();
while ((m = re.exec(src))) {
  const s = m[1].trim();
  if (!/^[A-G]/.test(s)) continue;
  const mm = /^([A-G][#b]*)(.*)$/.exec(s);
  let rest = mm[2];
  // only count plausible chord symbols (short, no spaces)
  if (rest.length > 14 || /\s/.test(rest)) { odd.set(s, (odd.get(s)||0)+1); continue; }
  suf.set(rest, (suf.get(rest)||0)+1);
}
const arr = [...suf.entries()].sort((a,b)=>b[1]-a[1]);
console.log('distinct suffixes:', arr.length);
console.log(arr.map(([k,v])=>JSON.stringify(k)+':'+v).join('  '));
console.log('--- odd (long/with spaces):', odd.size);
console.log([...odd.entries()].slice(0,60).map(([k,v])=>JSON.stringify(k)+':'+v).join('  '));
