// Rewrites RS200 12/8 melodies as 4/4 swing, by "playing" them into Chord Entry's live take reader.
// Each dotted-quarter beat of 12/8 becomes a quarter-note beat; the notes are played at their exact
// triplet times (a perfect swing player), and the take is read with swing on and triplets on auto.
// Writes apps/themes/swing-test-data.js. Run: node scripts/swing-test.js
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
global.window = {};
require(path.join(root, "apps/themes/pop-themes-data.js"));
require(path.join(root, "apps/shared/chord-entry.js"));
const CE = window.ChordEntry;

const IDS = ["rs_044_1", "rs_044_2", "rs_085_1", "rs_085_2"];
const KEYSIG = { G: { F: 1 }, Bb: { B: -1, E: -1 }, C: {}, F: { B: -1 }, D: { F: 1, C: 1 } };
const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// ABC body -> notes [{ on, len (in eighths), midi }], bar count, and chords at eighth positions
function parse(t) {
  const s = t.body, ks = KEYSIG[t.sigKey] || {}, notes = [], chordAt = [];
  let pos = 0, bar = 0, acc = {}, tie = false, i = 0, tup = null;
  const chords = (t.chords || []).slice();
  while (i < s.length) {
    while (chords.length && chords[0][0] <= i) chordAt.push({ pos, sym: chords.shift()[1] });
    const c = s[i];
    if (c === "|" || c === "]") { if (c === "|") { bar++; acc = {}; } i++; continue; }
    if (c === "-") { tie = true; i++; continue; }
    let m = s.slice(i).match(/^\(3(?::2:3)?/);
    if (m) { tup = 3; i += m[0].length; continue; }
    m = s.slice(i).match(/^([\^_=]?)([A-Ga-gz])([,']*)(\d*)(\/?)(\d*)/);
    if (!m) { i++; continue; }
    i += m[0].length;
    let len = m[4] ? +m[4] : 1;
    if (m[5]) len /= m[6] ? +m[6] : 2;
    if (tup) { len *= 2 / 3; if (--tup === 0) tup = null; }
    if (m[2] === "z") { pos += len; tie = false; continue; }
    const L = m[2].toUpperCase();
    let oct = m[2] === L ? 60 : 72;
    for (const o of m[3]) oct += o === "," ? -12 : 12;
    if (m[1]) acc[L + m[3]] = { "^": 1, _: -1, "=": 0 }[m[1]];
    const a = (L + m[3]) in acc ? acc[L + m[3]] : ks[L] || 0, midi = oct + STEP[L] + a;
    if (tie && notes.length && notes[notes.length - 1].midi === midi) notes[notes.length - 1].len += len;
    else notes.push({ on: pos, len, midi });
    tie = false; pos += len;
  }
  return { notes, chordAt, bars: Math.round(pos / 12) };
}

const out = [];
for (const id of IDS) {
  const t = window.POP_THEMES.find(x => x.id === id);
  const p = parse(t), bpm = Math.round(t.qpm * 2 / 3), beatSec = 60 / bpm, sw = CE.swingFor(bpm);
  const cfg = { kind: "melody", n: 4, d: 4, bars: p.bars, beatSec, count: 4, key: t.sigKey, res: 0.5, swing: sw, triplets: "auto", tie: "mid" };
  const tk = CE.take(cfg), ev = [];
  // eighths of 12/8 -> beats of 4/4: three eighths a beat. Release 30 ms early so repeated notes re-strike.
  p.notes.forEach(n => { const a = n.on / 3 * beatSec * 1000, b = (n.on + n.len) / 3 * beatSec * 1000; ev.push([a, 0, n.midi], [Math.max(a + 20, b - 30), -1, n.midi]); });
  ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]).forEach(([ms, k, m]) => k < 0 ? tk.off(m, ms) : tk.on(m, 0.7, ms));
  tk.finish();
  p.chordAt.forEach(c => tk.grid.place(c.sym, Math.floor(c.pos / 12), (c.pos % 12) / 3, "beat"));
  const abc = tk.abc();
  const dropped = tk.trace.notes.filter(n => /^dropped/.test(n.out || "")).length;
  const alt = CE.alternatives(tk.log(), 0, p.bars - 1, { tie: "mid" });
  out.push({
    id, title: t.title, artist: t.last, year: t.year, label: t.label, key: t.sigKey, qpm: t.qpm, bpm, swing: Math.round(sw * 100), yt: t.yt,
    orig: { meter: t.meter, body: t.body, chords: t.chords },
    swung: abc, dropped, notesIn: p.notes.length,
    alts: alt.variants.map(v => ({ label: v.label, why: v.why, abc: v.abc, score: Math.round(v.score), lost: v.lost, suggested: !!v.suggested })),
    curScore: Math.round(alt.current.score)
  });
  console.log(id, p.bars, "bars", p.notes.length, "notes, dropped", dropped, "\n" + abc + "\n");
}
fs.writeFileSync(path.join(root, "apps/themes/swing-test-data.js"), "window.SWING_TEST = " + JSON.stringify(out) + ";\n");
