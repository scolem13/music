// Figures (opts.figures): fills at phrase ends taken in turns, riffs every second bar.   node tests/band/figures/t_figures.js
// PRINT=1 prints the bars as note names. NEG=1 must fail (checks that the fills are really there).
var path = require("path"), assert = require("assert"), R = path.join(__dirname, "../../..");
["apps/shared/voicings.js", "apps/shared/band/harmony.js", "apps/shared/band/comp.js", "apps/shared/band/bass.js", "apps/shared/band/drums.js",
 "apps/shared/band/catalog.js", "apps/shared/band/midi.js", "apps/shared/tune-chart.js"].forEach(function (f){ require(path.join(R, f)); });
var C = BandCatalog, H = BandHarmony, NEG = !!process.env.NEG;
function mulberry(a){ return function (){ a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
var NAMES = "C C# D Eb E F F# G Ab A Bb B".split(" ");
function nm(m){ return NAMES[m % 12] + (Math.floor(m / 12) - 1); }
function abc(meter, bars){ return "X:1\nM:" + meter + "\nL:1/4\nK:C\n" + bars.map(function (c){ return '"' + c + '"z' + (meter === "3/4" ? 3 : 4); }).join("|") + "|\n"; }
function gen(style, chords, extra, meter, fam){
  var so = C.styleOpts(style, fam); if (NEG) so.opts.figures = null;
  return BandMidi.generate(TuneChart.parse(abc(meter || "4/4", chords)), { bars: chords.length, tempo: 80, rng: mulberry(3), opts: Object.assign(so.opts, extra || {}) }); }
function figs(b, part){ return (b.parts[part] || []).filter(function (e){ return e.figure; }); }
var CH = ["C", "G", "Am", "F", "C", "G", "F", "C", "Am", "F", "C", "G", "C", "G", "F", "C"];

// the styles carry them; one with none plays no figure
assert(C.styleOpts("pop").opts.figures && C.styleOpts("rock").opts.figures && !C.styleOpts("swing").opts.figures);

// piano ballad: fills only in bars 4, 8, 12, 16 (the 16th fills back into the top), one player each time, in turn
var pop = gen("pop", CH);
var who = pop.map(function (b, i){ var w = ["bass", "comp"].filter(function (p){ return figs(b, p).length; }); return w.join("+") || "."; });
if (process.env.PRINT) pop.forEach(function (b, i){ ["bass", "comp"].forEach(function (p){ var f = figs(b, p); if (f.length) console.log("bar " + (i + 1), p, f[0].figure, f.map(function (e){ return e.pos + ":" + (e.midis || [e.midi]).map(nm).join("/"); }).join("  ")); }); });
assert.deepStrictEqual(who.map(function (w, i){ return w !== "." ? i : -1; }).filter(function (i){ return i >= 0; }), [3, 7, 11, 15], "fills at phrase ends: " + who.join(" "));
who.forEach(function (w){ assert(w.indexOf("+") < 0, "two players fill at once"); });
assert.notStrictEqual(who[3], who[7], "the players take turns");
// a piano fill: the right hand stops at beat 2, the left hand rings on
var pf = pop.filter(function (b){ return figs(b, "comp").length; })[0];
assert(pf, "no piano fill");
pf.parts.comp.forEach(function (e){ if (!e.figure && e.hand !== "L") assert(e.pos + e.dur <= 2 + 1e-6, "the chord rings into the fill"); });
// the walk-up lands a step below the next root
var bw = pop.map(function (b, i){ return { f: figs(b, "bass"), i: i }; }).filter(function (x){ return x.f.length && x.f[0].figure === "bassWalkUp"; })[0];
if (bw){ var nextRoot = { C: 0, G: 7, Am: 9, F: 5 }[CH[bw.i + 1]]; assert.strictEqual((bw.f[2].midi + 1) % 12, nextRoot, "walk-up ends a half step under the next root"); }

// rock on the guitar: the lick and the bass approach; on the piano, the piano's fill joins the turns instead of the guitar's
var rg = gen("rock", CH, null, null, "guitar"), rp = gen("rock", CH, null, null, "piano");
function ids(g){ var o = []; g.forEach(function (b){ ["bass", "comp"].forEach(function (p){ var f = figs(b, p); if (f.length) o.push(f[0].figure); }); }); return o.join(" "); }
assert(/guitarLick/.test(ids(rg)) && !/pianoAnswer/.test(ids(rg)), "guitar: " + ids(rg));
assert(/pianoAnswer/.test(ids(rp)) && !/guitarLick/.test(ids(rp)), "piano: " + ids(rp));
// the guitar riff: every second bar, never in a bar where the guitar fills
var rr = gen("rock", CH, { figures: "guitarRiff+guitarLick+bassApproach" }, null, "guitar");
rr.forEach(function (b, i){ var f = figs(b, "comp"); if (i % 2 === 1 && i !== 15) assert(f.length, "bar " + (i + 1) + " has no riff"); if (i % 2 === 0) assert(!f.length, "riff in bar " + (i + 1)); });

// 3/4 and two chords in a bar: no crash, no figure past the bar
var w = gen("pop", ["C", "G", "Am", "F G", "C", "G", "F", "C"], null, "3/4");
w.forEach(function (b){ ["bass", "comp"].forEach(function (p){ (b.parts[p] || []).forEach(function (e){ assert(e.pos < 3 - 1e-6); }); }); });
// nothing changes without figures
var a = gen("pop", CH, { figures: null }), z = gen("pop", CH, { figures: "" });
function notes(g){ return JSON.stringify(g.map(function (b){ return b.parts; })); }
assert.strictEqual(notes(a), notes(z));
console.log("FIGURES OK");
// song riffs: every bar, the right share of a riff several bars long, at the record's pitches
var sn = gen("rock", ["E", "E", "E", "E"], { figures: "sevenNation" });
assert.deepStrictEqual(sn.map(function (b){ return b.parts.bass.map(function (e){ return e.midi; }).join(" "); }), ["40 40 43 40 38", "36 35", "40 40 43 40 38", "36 35"]);
var sm = gen("rock", ["Gm", "Gm", "Gm", "Gm"], { figures: "smoke" }, null, "guitar");
assert(sm[1].parts.comp.some(function (e){ return e.midis.indexOf(61) >= 0; }), "the flat five in bar 2");
sm.forEach(function (b){ assert(b.parts.comp.every(function (e){ return e.figure === "smoke"; }), "only the riff"); });
var eb = gen("pop", ["Ab", "Fm", "Db", "Eb"], { figures: "everyBreath" }, null, "guitar");
eb.forEach(function (b){ b.parts.comp.forEach(function (e){ if (e.figure) assert(e.midis[0] >= 48 && e.midis[0] <= 76, "guitar range " + e.midis); }); });
console.log("SONG RIFFS OK");
// riffs read from notation: each plays on its own chart and meter, every note of the riff once per pass, at the written pitches
var RS = Object.keys(H.FIGURES).filter(function (k){ return H.FIGURES[k].kind === "song" && /LilyPond/.test(H.FIGURES[k].source || ""); });
assert(RS.length >= 12, "notation riffs: " + RS.length);
RS.forEach(function (id){
  var F = H.FIGURES[id], ch = F.chart.split("|"), n = Math.max(ch.length, F.bars);
  var want0 = Math.ceil(n / F.bars) * F.bars; while (ch.length < want0) ch = ch.concat(ch);
  ch = ch.slice(0, want0);
  var g = gen(F.inst === "guitar" ? "rock" : "pop", ch, { figures: id }, F.meter, F.inst || "piano");
  var got = []; g.forEach(function (b, i){ (b.parts[F.part] || []).forEach(function (e){ if (e.figure === id) got.push([r3(i * b.beats + e.pos - Math.floor(i / F.bars) * F.bars * b.beats), [].concat(e.midis || e.midi).join("/")]); }); });
  var want = F.notes.map(function (x){ return [x[0], [].concat(x[1]).join("/")]; });
  assert.deepStrictEqual(got.slice(0, want.length), want, id);
  assert.strictEqual(got.length, want.length * (ch.length / F.bars), id + ": every pass plays the whole riff");
});
function r3(x){ return Math.round(x * 1000) / 1000; }
console.log("NOTATION RIFFS OK (" + RS.length + ")");
