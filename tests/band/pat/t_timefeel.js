// Half time / double time (opts.timeFeel, BandHarmony.feelPart).   node tests/band/pat/t_timefeel.js
var path = require("path"), assert = require("assert"), R = path.join(__dirname, "../../..");
["apps/shared/voicings.js", "apps/shared/band/harmony.js", "apps/shared/band/comp.js", "apps/shared/band/bass.js", "apps/shared/band/drums.js",
 "apps/shared/band/catalog.js", "apps/shared/band/midi.js", "apps/shared/tune-chart.js"].forEach(function (f){ require(path.join(R, f)); });
var N = BandHarmony.noteName;
function chart(meter, bars){ var m = meter.split("/"), n = +m[0];
  return TuneChart.parse("X:1\nM:" + meter + "\nL:1/" + m[1] + "\nK:C\n" + bars.map(function (b){ var c = b.split(" ");
    return c.length > 1 ? '"' + c[0] + '"z' + Math.ceil(n / 2) + ' "' + c[1] + '"z' + (n - Math.ceil(n / 2)) : '"' + b + '"z' + n; }).join(" | ") + " |]"); }
function gen(meter, bars, opts, n){ return BandMidi.generate(chart(meter, bars), { bars: n || bars.length, tempo: 120, opts: Object.assign({ comp: "piano", feel: "straight", variation: 0, timeFeelParts: "bass comp drums" }, opts) }); }
function bass(b){ return b.parts.bass.map(function (e){ return e.pos + ":" + N(e.midi); }).join(" "); }
function at(b, part){ return b.parts[part].map(function (e){ return e.pos; }).sort(function (x, y){ return x - y; }); }
function piece(b, p){ return b.parts.drums.filter(function (e){ return e.piece === p; }).map(function (e){ return e.pos; }).sort(function (x, y){ return x - y; }).join(" "); }
var FOUR = ["C", "F", "G", "C"];

// normal: untouched
var n0 = gen("4/4", FOUR, { bassFeel: "roots", groove: "rock", compRhythm: "tresillo" });
assert.strictEqual(bass(n0[0]), "0:C2 1:C2 2:C2 3:C2"); assert.strictEqual(piece(n0[0], "snare"), "1 3");

// double: two of the part's bars in each bar of the chart, on the chart's own chords
var d = gen("4/4", FOUR, { bassFeel: "roots", groove: "rock", compRhythm: "tresillo", timeFeel: "double" });
assert.strictEqual(d.length, 4); assert.strictEqual(d[0].beats, 4);
assert.strictEqual(bass(d[0]), "0:C2 0.5:C2 1:C2 1.5:C2 2:C2 2.5:C2 3:C2 3.5:C2");
assert.strictEqual(piece(d[0], "snare"), "0.5 1.5 2.5 3.5"); assert.strictEqual(piece(d[0], "kick"), "0 1 1.25 2 2.75 3");   // (the rock groove's first two bars: 1 3 3& | 1 2& 3)
assert.strictEqual(at(d[0], "comp").join(" "), "0 0.75 1.5 2 2.75 3.5");
assert(d[1].parts.bass.every(function (e){ return N(e.midi)[0] === "F"; }), "double follows the chart: " + bass(d[1]));
// a chord change in mid-bar lands on the second of the two bars
var d2 = gen("4/4", ["C G", "F"], { bassFeel: "roots", timeFeel: "double" });
assert.strictEqual(bass(d2[0]).replace(/[0-9.]+:/g, "").replace(/\d/g, ""), "C C C C G G G G");

// half: one of the part's bars across two bars of the chart
var h = gen("4/4", FOUR, { bassFeel: "roots", groove: "rock", compRhythm: "tresillo", timeFeel: "half" });
assert.strictEqual(bass(h[0]) + " | " + bass(h[1]), "0:C2 2:C2 | 0:F2 2:F2");
assert.strictEqual(piece(h[0], "snare") + " | " + piece(h[1], "snare"), "2 | 2"); assert.strictEqual(piece(h[0], "kick") + " | " + piece(h[1], "kick"), "0 | 0 1");
assert.strictEqual(at(h[0], "comp").join(" ") + " | " + at(h[1], "comp").join(" "), "0 3 | 2");
// an odd number of bars: the last one is the first half of a bar of its own
var h3 = gen("4/4", ["C", "F", "G"], { bassFeel: "roots", timeFeel: "half" }, 6);
assert.strictEqual(bass(h3[2]).replace(/\d(?= |$)/g, ""), "0:G 2:G"); assert.strictEqual(bass(h3[3]), "0:C2 2:C2");
// two bars of 5/8 make one bar of five; 3/4 pairs into a bar of three
var h5 = gen("5/8", ["Am", "Am", "G", "G"], { bassFeel: "roots", timeFeel: "half" });
assert.strictEqual(at(h5[0], "bass").join(" ") + " | " + at(h5[1], "bass").join(" "), "0 2 4 | 1 3");
var h34 = gen("3/4", FOUR, { bassFeel: "roots", timeFeel: "half" });
assert.strictEqual(bass(h34[0]) + " | " + bass(h34[1]), "0:C2 2:F2 | 1:F2");   // (odd bars: the second bar's chord arrives one chart beat early, as a push)

// swing is applied at the part's own tempo, and the result is fixed in place (straight:true)
var sw = gen("4/4", FOUR, { bassFeel: "walk", feel: "swing", compRhythm: "charleston", timeFeel: "double" });
assert(sw[0].parts.comp.every(function (e){ return e.straight; })); var c1 = at(sw[0], "comp")[1]; assert(c1 > 0.75 && c1 < 0.9, "swung sixteenth " + c1);
// every style, every time feel, 4/4 and 3/4: events inside the bar, something plays
BandCatalog.styles.forEach(function (st){ ["half", "double"].forEach(function (tf){ ["4/4", "3/4", "2/4", "5/4"].forEach(function (m){
  var bars = gen(m, ["C", "Am7 D7", "G7", "C", "F"], { bassFeel: st.bass, compRhythm: st.rhythm, groove: st.drums, feel: st.feel, voicing: st.voicing.piano, timeFeel: tf, stops: [3] }, 10), heard = 0;
  bars.forEach(function (b, i){ ["bass", "comp", "drums"].forEach(function (p){ b.parts[p].forEach(function (e){
    assert(e.pos >= 0 && e.pos < b.beats, [st.id, tf, m, p, i, e.pos].join(" ")); if (p === "bass") assert(e.midi >= BandBass.LO && e.midi <= BandBass.HI); heard++; }); }); });
  assert(heard > 20, st.id + " " + tf + " " + m); }); }); });
// compound meters are left alone
assert.deepStrictEqual(at(gen("6/8", FOUR, { bassFeel: "roots", timeFeel: "double" })[0], "bass"), at(gen("6/8", FOUR, { bassFeel: "roots" })[0], "bass"));
// by default only the bass and drums change: the comping keeps its rhythm but answers them.
// double: the hit between the beats stays (straight, louder, short), the later hit on the beat goes
var dflt = gen("4/4", FOUR, { bassFeel: "roots", groove: "rock", compRhythm: "tresillo", timeFeel: "double", timeFeelParts: undefined });
var norm = gen("4/4", FOUR, { bassFeel: "roots", groove: "rock", compRhythm: "tresillo" }), pl = gen("4/4", FOUR, { bassFeel: "roots", groove: "rock", compRhythm: "tresillo", timeFeel: "double", timeFeelParts: "bass drums plain" });
assert.strictEqual(at(norm[0], "comp").join(" "), "0 1.5 3"); assert.strictEqual(at(pl[0], "comp").join(" "), "0 1.5 3", "plain: untouched"); assert.strictEqual(at(pl[0], "bass").length, 8);
assert.strictEqual(at(dflt[0], "comp").join(" "), "0 1.5");
(function (){ var a = dflt[0].parts.comp[1], b = norm[0].parts.comp[1]; assert(a.straight && a.vel > b.vel && a.dur <= 0.45, JSON.stringify(a)); assert.strictEqual(a.midis.join(), b.midis.join()); })();
// a rhythm with nothing between the beats gets one stab on the "and" of 2; a whole-bar pad is left to ring
var four = gen("4/4", FOUR, { compRhythm: "four", timeFeel: "double", timeFeelParts: "bass drums" }); assert.strictEqual(at(four[0], "comp").join(" "), "0 1.5");
var pad = gen("4/4", FOUR, { compRhythm: "pad", timeFeel: "double", timeFeelParts: "bass drums" }); assert.strictEqual(at(pad[0], "comp").join(" "), "0");
// half: every chord rings on, and beat 3 is struck (again) with an accent
var hf = gen("4/4", FOUR, { bassFeel: "roots", groove: "rock", compRhythm: "tresillo", timeFeel: "half", timeFeelParts: "bass drums" });
assert.strictEqual(at(hf[0], "comp").join(" "), "0 1.5 2 3");
(function (){ var c = hf[0].parts.comp, n = norm[0].parts.comp; assert.strictEqual(c[2].midis.join(), n[1].midis.join(), "the chord already sounding"); assert(c[2].vel > n[1].vel);
  assert(c[0].dur >= 1.4 && c[1].dur >= 0.45 && c[3].dur >= 0.9, JSON.stringify(c.map(function (e){ return e.dur; }))); })();
var hp = gen("4/4", ["C G", "F"], { compRhythm: "pad", timeFeel: "half", timeFeelParts: "drums" }); assert.strictEqual(at(hp[0], "comp").join(" "), "0 2"); assert.strictEqual(at(hp[1], "comp").join(" "), "0 2");
var h3 = gen("3/4", FOUR, { compRhythm: "pad", timeFeel: "half", timeFeelParts: "bass drums" }); assert.strictEqual(at(h3[0], "comp").join(" "), at(gen("3/4", FOUR, { compRhythm: "pad", timeFeelParts: "bass drums" })[0], "comp").join(" "), "no beat 3 of 4 in a waltz"); assert.strictEqual(piece(dflt[0], "snare"), "0.5 1.5 2.5 3.5"); assert.strictEqual(at(dflt[0], "bass").length, 8);
var only = gen("4/4", FOUR, { bassFeel: "roots", groove: "rock", compRhythm: "tresillo", timeFeel: "half", timeFeelParts: "drums" });
assert.strictEqual(at(only[0], "bass").join(" "), "0 1 2 3"); assert.strictEqual(piece(only[0], "snare"), "2");
// pinned voicings follow their chords when the comping changes time too
var PIN = { "0:0": [60, 64, 67], "0:2": [59, 62, 67], "1:0": [57, 60, 65], "2:0": [55, 59, 62], "3:0": [60, 64, 67] }, PB = ["C G", "F", "G", "C"];
function heard(bars){ var out = {}; bars.forEach(function (b){ b.parts.comp.forEach(function (e){ out[e.midis.join(",")] = 1; }); }); return Object.keys(out).sort().join(" | "); }
var want = Object.keys(PIN).map(function (k){ return PIN[k].join(","); }).filter(function (x, i, a){ return a.indexOf(x) === i; }).sort().join(" | ");
["double", "half"].forEach(function (tf){ ["bass comp drums", "bass drums"].forEach(function (who){
  assert.strictEqual(heard(gen("4/4", PB, { compRhythm: "four", timeFeel: tf, timeFeelParts: who, pins: PIN }, 8)), want, "pins in " + tf + " / " + who); }); });
console.log("TIME FEEL OK");
