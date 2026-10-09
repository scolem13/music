// Meter changes inside a tune ([M:3/4] in the ABC): each bar has its own length, and the written note values keep
// their length across a change of beat (4/4 to 7/8: the eighth; 4/4 to 6/8: the eighth, so the beat is 1.5 times as long).
//   node tests/band/meter/t_change.js
var path = require("path"), assert = require("assert"), R = path.join(__dirname, "../../..");
["apps/shared/voicings.js", "apps/shared/band/harmony.js", "apps/shared/band/comp.js", "apps/shared/band/bass.js", "apps/shared/band/drums.js",
 "apps/shared/band/catalog.js", "apps/shared/band/midi.js", "apps/shared/band/notation.js", "apps/shared/tune-chart.js"].forEach(function (f){ require(path.join(R, f)); });
var A = 'X:1\nM:4/4\nL:1/4\nK:C\n"C"z4|"F"z4|[M:2/4]"G"z2|[M:4/4]"C"z4|[M:3/4]"Am"z3|"F"z3|[M:4/4]"G"z4|"C"z4|]';
var B = 'X:1\nM:4/4\nL:1/8\nK:C\n"C"z8|"F"z8|[M:6/8]"G"z6|"Am"z6|[M:7/8]"F"z7|[M:4/4]"C"z8|]';
var C6 = 'X:1\nM:6/8\nL:1/8\nK:C\n"C"z6|[M:2/4]"F"z4|[M:6/8]"G"z6|]';
function form(abc){ return BandHarmony.buildForm(TuneChart.parse(abc), 0); }
assert.deepStrictEqual(form(A).map(function (b){ return b.beats + "x" + b.unit; }), ["4x1", "4x1", "2x1", "4x1", "3x1", "3x1", "4x1", "4x1"]);
assert.deepStrictEqual(form(B).map(function (b){ return b.beats + (b.compound ? "c" : "") + "x" + b.unit; }), ["4x1", "4x1", "2cx1.5", "2cx1.5", "7x0.5", "4x1"]);
assert.deepStrictEqual(form(C6).map(function (b){ return b.beats + "x" + b.unit; }), ["2x1", "2x0.6667", "2x1"]);
// every style: events stay inside their own bar, something plays in every bar, the bass is on the bar's chord
BandCatalog.styles.forEach(function (st){ [A, B, C6].forEach(function (abc, k){ ["normal", "half", "double"].forEach(function (tf){
  var o = BandCatalog.styleOpts(st.id).opts; o.variation = 1; o.timeFeel = tf; o.lift = [2, 3]; o.halfBars = [4, 5];
  var ch = TuneChart.parse(abc), bars = BandMidi.generate(ch, { bars: ch.bars.length * 4, tempo: 120, opts: o });
  bars.forEach(function (b, i){ var n = 0; ["bass", "comp", "drums"].forEach(function (p){ b.parts[p].forEach(function (e){ n++; assert(e.pos >= 0 && e.pos < b.beats, [st.id, k, tf, i, p, e.pos, b.beats].join(" ")); }); }); });
  assert(bars.reduce(function (s, b){ return s + b.parts.bass.length + b.parts.comp.length; }, 0) > bars.length, st.id + " plays");
  assert(BandMidi.build(bars, { tempo: 120 }).length > 200); }); }); });
// the tempo each bar is played at: the eighth note constant
var bb = BandMidi.generate(TuneChart.parse(B), { bars: 6, tempo: 120, opts: BandCatalog.styleOpts("rock").opts });
assert.deepStrictEqual(bb.map(function (b){ return b.tempo; }), [120, 120, 80, 80, 240, 120]);
// seconds per bar: 4/4 = 2 s at 120; 6/8 = 1.5 s; 7/8 = 1.75 s
assert.deepStrictEqual(bb.map(function (b){ return b.beats * 60 / b.tempo; }), [2, 2, 1.5, 1.5, 1.75, 2]);
// the MIDI file carries a tempo and a time signature at each change
(function (){ var m = BandMidi.build(bb, { tempo: 120 }), tempos = 0, sigs = 0; for (var i = 0; i + 2 < m.length; i++){ if (m[i] === 0xFF && m[i + 1] === 0x51 && m[i + 2] === 3) tempos++; if (m[i] === 0xFF && m[i + 1] === 0x58 && m[i + 2] === 4) sigs++; }
  assert(tempos === 3 && sigs >= 4,       // (6/8 at 80 dotted quarters is still 120 quarters: no tempo event there)
    "tempo and meter events: " + tempos + " " + sigs); })();
// notation: the meter is marked where it changes
(function (){ var bars = BandMidi.generate(TuneChart.parse(A), { bars: 8, tempo: 120, opts: BandCatalog.styleOpts("rock").opts }), abc = BandNotation.toAbc(bars, {});
  abc = typeof abc === "string" ? abc : abc.abc; ["[M:2/4]", "[M:4/4]", "[M:3/4]"].forEach(function (m){ assert(abc.indexOf(m) >= 0, "notation has " + m); });
  assert(!/^\[V:\w\] \[M:/m.test(abc), "no line starts with a change of meter"); assert(/\| \[M:3\/4\]$/m.test(abc), "it ends the line before"); })();
console.log("METER CHANGE OK");
