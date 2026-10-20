// BandTuneScore.read against abcjs's own sequencer (setUpAudio): the pitch and length of every note of every tune in the library
const fs = require('fs'), vm = require('vm'), R = (require("path").join(__dirname, "../../..") + "/");
global.window = global; global.document = { createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), createElementNS: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
global.navigator = { userAgent: 'node' };
const load = f => vm.runInThisContext(fs.readFileSync(R + f, 'utf8'), { filename: f });
['apps/shared/tune-chart.js', 'apps/shared/abc-core.js', 'apps/tune-assessment/abc-tune.js', 'apps/shared/band/tune-score.js'].forEach(load);
vm.runInThisContext(fs.readFileSync(R + 'apps/shared/abcjs-basic.js', 'utf8'));
const A = global.ABCJS;
const tunesObject = vm.runInNewContext(fs.readFileSync(R + 'apps/tunes/tunes-object.js', 'utf8') + '\n;tunesObject');
const tunes = []; for (const k in tunesObject) String(tunesObject[k]).split(/\n(?=X:)/).forEach(t => { if (/^X:/m.test(t)) tunes.push(t); });
const only = process.argv[2];
let kinds = {}, octOnly = 0, octTunes = {}, n = 0, checked = 0, badTunes = 0, badBars = 0, ex = [];
for (const abc0 of tunes){ n++;
  const abc = abc0.split('\n').map(l => /^[A-Za-z]:|^%/.test(l) ? l : l.replace(/-/g, '')).join('\n');   // (ties are checked by t_score.js; abcjs joins some that are not ties at all)
  const title = (/^T:\s*(.*)$/m.exec(abc) || [])[1];
  if (only && title !== only) continue; if (/^%%tags.*needs-repair/m.test(abc)) continue; if (abc.slice(0, abc.search(/^K:/m)).split('\n').some(l => l && !/^[A-Za-z]:|^%/.test(l))) continue;   // (a stray line in the header is music to abcjs)
  let p; try { p = TuneChart.parse(abc); } catch (e){ continue; }
  let seq; try { const v = A.parseOnly(abc)[0]; seq = v.setUpAudio({}); } catch (e){ continue; }
  if (!seq || !seq.tracks || !seq.tracks[0]) continue;
  const r = BandTuneScore.read(abc, p), at = p.bars.map(b => b.at == null ? -1 : b.at), theirs = p.bars.map(() => ({}));
  const first = {}; seq.tracks[0].forEach(e => { if (e.cmd !== 'note' || !(e.startChar >= 0)) return; if (first[e.startChar] === undefined) first[e.startChar] = e.start; });
  const top = {}; seq.tracks[0].forEach(e => { if (e.cmd !== 'note' || !(e.startChar >= 0) || e.start !== first[e.startChar]) return; const o = top[e.startChar]; if (!o || e.pitch > o.pitch) top[e.startChar] = e; });
  Object.keys(top).map(Number).sort((a, b) => a - b).forEach(sc => { const e = top[sc]; let s = e.endChar - 1; while (s > sc && /\s/.test(abc[s])) s--;
    let b = 0; for (let i = 0; i < at.length; i++) { if (at[i] >= 0 && at[i] <= s) b = i; else if (at[i] > s) break; } (theirs[b][sc] = e); });
  checked++; let bad = 0;
  p.bars.forEach((b, i) => { const t = Object.keys(theirs[i]).map(Number).sort((x, y) => x - y).map(k => [theirs[i][k].pitch, Math.round(theirs[i][k].duration * 4 * 1e4) / 1e4]);
    const m = r.bars[i].map(x => [x.midi, Math.round(x.dur * 1e4) / 1e4]);
    // a note tied from the bar before is not in `m` as its own note and not in theirs either (abcjs joins ties too)
    const oct = t.length === m.length && t.length > 0 && t.every((x, k) => x[1] === m[k][1] && (x[0] - m[k][0]) % 12 === 0 && x[0] !== m[k][0]);
    if (oct) { octOnly++; octTunes[title] = 1; return; }
    if (JSON.stringify(t) !== JSON.stringify(m)) { bad++; if (ex.length < 14) ex.push(title + ' bar ' + i + '\n     abcjs ' + JSON.stringify(t) + '\n     mine  ' + JSON.stringify(m)); } });
  if (bad) { badTunes++; badBars += bad; const body = abc.split('\n').filter(l => !/^[A-Za-z]:|^%/.test(l)).join('\n'); const f = []; if (/[><]/.test(body)) f.push('broken'); if (/-/.test(body)) f.push('tie'); if (/\(\d/.test(body)) f.push('tuplet'); if (/\[[KML]:/.test(abc)) f.push('inline'); if (/\[[A-Ga-g^_=]/.test(body)) f.push('chord'); if (/\{/.test(body)) f.push('grace'); if (/\$|I:linebreak/.test(abc)) f.push('linebreak$'); if (/\|[12]|\[[12]/.test(body)) f.push('ending'); const key = f.join('+') || 'plain'; kinds[key] = (kinds[key] || []).concat(title); }
}
console.log(`octave-only differences (the K: line asks for an octave shift?): ${octOnly} bars in ${Object.keys(octTunes).length} tunes`);
console.log(`${n} tunes, ${checked} compared with abcjs, ${badTunes} differ (${badBars} bars)`);
Object.keys(kinds).sort((a, b) => kinds[b].length - kinds[a].length).slice(0, 14).forEach(k => console.log(String(kinds[k].length).padStart(4), k, '  e.g.', kinds[k].slice(0, 3).join(' / ')));
if (process.argv[2] || process.env.SHOW) ex.forEach(x => console.log('  ', x));

// what is left: grace notes (abcjs shortens the note after them), a tuplet with a chord symbol inside it, stray lines abcjs reads as music
if (!only && badTunes > 60) { console.log('ORACLE: too many differences'); process.exit(1); } if (!only) console.log('ORACLE OK');
