// Calm bars (opts.calm): around cadences and where the chords already move fast, a patterned accompaniment only
// strikes and holds its chords.   node tests/band/pat/t_calm.js
var path = require("path"), assert = require("assert"), R = path.join(__dirname, "../../..");
["apps/shared/voicings.js", "apps/shared/band/harmony.js", "apps/shared/band/comp.js", "apps/shared/band/bass.js", "apps/shared/band/drums.js",
 "apps/shared/band/catalog.js", "apps/shared/band/midi.js", "apps/shared/tune-chart.js"].forEach(function (f){ require(path.join(R, f)); });
var C = BandCatalog, H = BandHarmony, r2 = function (x){ return Math.round(x * 100) / 100; };
// O Tannenbaum's first rows as the carols site sends them: a row of four bars, its last bar marked "^phrase"
var ROW = '"D"z4"A7"z2|"D"z6|"Em"z2"A7"z4|"^phrase""A"z2"D"z4|';
var OT = "X:1\nM:3/4\nL:1/8\nK:D\n" + ROW + "\n" + ROW + "\n";
function mulberry(a){ return function (){ a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gen(abc, opts, n, seed){ var so = C.styleOpts("hymn");
  return BandMidi.generate(TuneChart.parse(abc), { bars: n || 8, tempo: 100, rng: mulberry(seed || 1), opts: Object.assign(so.opts, { variation: 0.6 }, opts) }); }
function rh(b){ return b.parts.comp.filter(function (e){ return e.hand !== "L"; }).map(function (e){ return r2(e.pos); }).join(" "); }
function lh(b){ return b.parts.comp.filter(function (e){ return e.hand === "L"; }).map(function (e){ return r2(e.pos); }).join(" "); }

// the styles that ask for it
assert(C.styleOpts("hymn").opts.calm && C.styleOpts("carol").opts.calm && !C.styleOpts("pop").opts.calm && !C.styleOpts("swing").opts.calm);

// the marks are read
var P = TuneChart.parse(OT); assert.deepStrictEqual(P.bars.map(function (b){ return !!b.phraseEnd; }), [false, false, false, true, false, false, false, true]);
assert(TuneChart.parse('X:1\nM:4/4\nL:1/8\nK:C\n"^plain""C"z8|"F"z8|').bars[0].plain);

// which bars are calm: the phrase's last bar and the busy bar before it; not the first bar, though it has two chords too
function calm(marks, chords){ var f = chords.map(function (c, i){ var b = { chords: c.split(" ").map(function (s, k){ return { pos: k, chord: { root: 0 } }; }) };
  if (marks[i] === "e") b.phraseEnd = true; if (marks[i] === "p") b.plain = true; if (marks[i] === "s") b.section = "B"; return b; });
  return f.map(function (_, i){ return H.calmAt(f, i) ? "x" : "."; }).join(""); }
assert.strictEqual(calm("...e...e", ["D A7", "D", "Em A7", "A D", "D A7", "D", "Em A7", "A D"]), "..xx..xx");
assert.strictEqual(calm("........", ["C", "C", "F", "F G", "C", "C", "F", "C"]), "...x....", "no marks: only the bar with more chords than usual");
assert.strictEqual(calm("........", ["C F", "C F", "F G", "F G Am", "C F", "C G"]), "...x..", "two chords a bar is this tune's usual");
assert.strictEqual(calm(".e.e.e.e", ["C", "C", "F", "F", "G", "G", "C", "C"]), "...x...x", "rows of two bars: every other mark is passed over");
assert.strictEqual(calm("..pe", ["C", "C", "F", "F"]), "..xx", "a bar marked plain");
assert.strictEqual(calm("...es..e", ["C F", "C", "F G", "C", "C F", "C F", "F G", "C"]), "..xx..xx", "a new section starts the count again");

// the blend of the hymn and two ballad patterns: in the calm bars every chord is struck once and held, by both hands
var BL = { compRhythm: "hymn+ballRock+ballBroken" };
for (var seed = 1; seed <= 12; seed++){
  var b = gen(OT, BL, 8, seed);
  [2, 3, 6, 7].forEach(function (i){                                             // Em A7 . | A D . : the chords arrive on 1 and 2
    assert.strictEqual(rh(b[i]), "0 1", "seed " + seed + " bar " + (i + 1) + ": " + rh(b[i])); });
}
// only the ballad patterns (no long-note pattern to go to): they are played plain there, the left hand a held octave
var busyElsewhere = 0;
for (seed = 1; seed <= 12; seed++){
  b = gen(OT, { compRhythm: "ballRock+ballBroken" }, 8, seed);
  [2, 3, 6, 7].forEach(function (i){ assert.strictEqual(rh(b[i]), "0 1", "seed " + seed + " bar " + (i + 1)); assert.strictEqual(lh(b[i]), "0 1", "seed " + seed + " bar " + (i + 1) + " left hand: " + lh(b[i])); });
  if (rh(b[1]) !== "0") busyElsewhere++;
}
assert(busyElsewhere > 0, "the patterns still play in the other bars");
// the hymn's slider at zero leaves it out of the calm bars too: the ballads go plain instead
b = gen(OT, { compRhythm: "hymn+ballRock", rhythmMix: { hymn: 0, ballRock: 1 } }, 8, 3);
assert.strictEqual(rh(b[3]), "0 1"); assert(b[3].parts.comp.some(function (e){ return e.hand === "L"; }));

// not asked for: nothing changes, and the same seed gives the same bars as before (no draw from the rng)
var off1 = JSON.stringify(gen(OT, Object.assign({ calm: false }, BL), 8, 5)), off2 = JSON.stringify(gen(OT.replace(/"\^phrase"/g, ""), Object.assign({ calm: false }, BL), 8, 5));
assert.strictEqual(off1, off2);
// the hymn style by itself already holds every chord: calm bars change nothing in it
function notes(bs){ return JSON.stringify(bs.map(function (x){ return x.parts; })); }
assert.strictEqual(notes(gen(OT, {}, 8, 5)), notes(gen(OT, { calm: false }, 8, 5)));
console.log("CALM OK");

// ---- blends of bass lines and of grooves (opts.bassFeel / opts.groove with "+") ----
(function (){
  var FORM = "X:1\nM:4/4\nL:1/8\nK:C\n" + ["C", "F", "G", "C", "Am", "F", "G", "C"].map(function (c){ return '"' + c + '"z8'; }).join("|") + "|";
  function run(extra, seed, n){ var so = C.styleOpts("rock"); return BandMidi.generate(TuneChart.parse(FORM), { bars: n || 32, tempo: 110, rng: mulberry(seed), opts: Object.assign(so.opts, { variation: 0 }, extra) }); }
  function notes(bs){ return JSON.stringify(bs.map(function (x){ return x.parts; })); }
  // one pattern each: exactly what it was, with or without the blend's own options lying about
  assert.strictEqual(notes(run({}, 3)), notes(run({ bassMix: { roots: 1 }, grooveMix: { rock: 1 } }, 3)));
  // each bar is one of the blend, the same for every part, and both get played
  var seenB = {}, seenG = {}, changes = 0, last = null;
  for (var seed = 1; seed <= 6; seed++) run({ bassFeel: "eighths+roots+alt", groove: "rock+brushes" }, seed).forEach(function (b){
    assert(["eighths", "roots", "alt"].indexOf(b.opts.bassFeel) >= 0 && ["rock", "brushes"].indexOf(b.opts.groove) >= 0, b.opts.bassFeel + " " + b.opts.groove);
    seenB[b.opts.bassFeel] = 1; seenG[b.opts.groove] = 1; if (last && last !== b.opts.groove) changes++; last = b.opts.groove; });
  assert.strictEqual(Object.keys(seenB).length, 3); assert.strictEqual(Object.keys(seenG).length, 2); assert(changes > 0);
  // a bar of the blend is that pattern's own bar: root eighths under "eighths", four roots under "roots"
  var bl = run({ bassFeel: "eighths+roots", push: false }, 2), e8 = bl.filter(function (b){ return b.opts.bassFeel === "eighths"; })[0], rt = bl.filter(function (b){ return b.opts.bassFeel === "roots"; })[0];
  assert.strictEqual(e8.parts.bass.length, 8); assert.strictEqual(rt.parts.bass.length, 4);
  // the shares: one all the way up and the other at zero is that pattern alone; a home has at least half of its phrase
  run({ groove: "rock+brushes", grooveMix: { rock: 0, brushes: 1 } }, 4).forEach(function (b){ assert.strictEqual(b.opts.groove, "brushes"); });
  var heavy = 0, all = 0; for (seed = 1; seed <= 8; seed++) run({ groove: "rock+brushes", grooveMix: { rock: 0.9, brushes: 0.1 } }, seed).forEach(function (b){ all++; if (b.opts.groove === "rock") heavy++; });
  assert(heavy / all > 0.7, "the larger share is heard more: " + heavy / all);
  run({ groove: "rock+brushes+motown" }, 5).forEach(function (b, i, bs){ if (i % 4) return; var four = bs.slice(i, i + 4).map(function (x){ return x.opts.groove; }), home = four[0];
    assert(four.filter(function (g){ return g === home; }).length >= 2, four.join(" ")); });
  // the blend has random numbers of its own: the comping plays the same notes whether or not the drums are blended
  assert.strictEqual(JSON.stringify(run({}, 7).map(function (b){ return b.parts.comp; })), JSON.stringify(run({ groove: "rock+rock" }, 7).map(function (b){ return b.parts.comp; })));
  assert.strictEqual(BandHarmony.blendFirst({ bassFeel: "walk+two", groove: "auto" }).bassFeel, "walk"); var same = { bassFeel: "walk" }; assert.strictEqual(BandHarmony.blendFirst(same), same);
  console.log("BLEND OK");
})();
