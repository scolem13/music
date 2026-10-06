// loads the browser-style IIFE modules into this Node global
const fs = require('fs'), vm = require('vm');
const ROOT = '/Users/sean.coleman/Projects/everything-music-site/apps/shared/';
function load(rel){ vm.runInThisContext(fs.readFileSync(ROOT + rel, 'utf8'), { filename: rel }); }
['tune-chart.js', 'band/harmony.js', 'band/bass.js', 'band/comp.js'].forEach(f => { if (fs.existsSync(ROOT + f)) load(f); });
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const CH = {
  basic: ['F7','F7','F7','F7','Bb7','Bb7','F7','F7','C7','Bb7','F7','C7'],
  quick: ['F7','Bb7','F7','F7','Bb7','Bb7','F7','F7','C7','Bb7','F7','C7'],
  jazz:  ['F7','Bb7','F7','Cm7 F7','Bb7','Bdim7','F7','Am7 D7','Gm7','C7','F7 D7','Gm7 C7']
};
function abcOf(bars, title){
  const body = bars.map(b => { const cs = b.split(' '); return cs.length === 1 ? `"${cs[0]}"z4` : cs.map(c => `"${c}"z2`).join(' '); });
  const rows = []; for (let i = 0; i < body.length; i += 4) rows.push(body.slice(i, i + 4).join(' | ') + (i + 4 >= body.length ? ' |]' : ' |'));
  return `X:1\nT:${title||'Blues'}\nM:4/4\nL:1/4\nK:F\n` + rows.join('\n');
}
module.exports = { mulberry32, CH, abcOf };
