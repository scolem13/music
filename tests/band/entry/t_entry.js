// Chord entry: analysis, note grouping, the bar grid and its ABC.   node tests/band/entry/t_entry.js
var path = require("path"), assert = require("assert"), R = path.join(__dirname, "../../..");
["apps/shared/voicings.js", "apps/shared/band/harmony.js", "apps/shared/band/comp.js", "apps/shared/band/bass.js", "apps/shared/band/drums.js",
 "apps/shared/band/catalog.js", "apps/shared/band/midi.js", "apps/shared/tune-chart.js", "apps/shared/chord-entry.js"].forEach(function (f){ require(path.join(R, f)); });
var CE = ChordEntry;
function sym(midis, key, slash){ var k = CE.keyLof(key || "C"); return CE.symbol(CE.analyse(midis, { keyLof: k }), { keyLof: k, slash: !!slash }); }

// ---- every symbol the analysis can write is one the band reads ----
CE.QUALITIES.forEach(function (q){ var c = BandHarmony.parseChord("C" + q[2], 0); assert(c && !c.nc && !c.unknown, "band does not read C" + q[2]); });

// ---- analysis ----
assert.strictEqual(sym([48, 52, 55]), "C"); assert.strictEqual(sym([48, 51, 55]), "Cm");
assert.strictEqual(sym([52, 55, 60]), "C"); assert.strictEqual(sym([52, 55, 60], "C", true), "C/E");
assert.strictEqual(sym([48, 52, 55, 57]), "C6", "lowest note decides between C6 and Am7"); assert.strictEqual(sym([45, 48, 52, 55]), "Am7");
assert.strictEqual(sym([48, 52, 57]), "Am", "a complete triad beats a sixth chord with no fifth");
assert.strictEqual(sym([48, 52, 58]), "C7", "shell voicing"); assert.strictEqual(sym([48, 51, 58]), "Cm7"); assert.strictEqual(sym([48, 52, 59]), "Cmaj7");
assert.strictEqual(sym([36, 52, 58, 62]), "C9"); assert.strictEqual(sym([36, 52, 58, 61]), "C7b9"); assert.strictEqual(sym([36, 51, 58, 62]), "Cm9");
assert.strictEqual(sym([48, 51, 54, 57]), "Cdim7"); assert.strictEqual(sym([51, 54, 57, 60]), "Ebdim7", "symmetric chords take the lowest note");
assert.strictEqual(sym([48, 51, 54, 58]), "Cm7b5"); assert.strictEqual(sym([48, 53, 55]), "Csus4"); assert.strictEqual(sym([48, 53, 55, 58]), "C7sus4");
assert.strictEqual(sym([48, 55]), "C5"); assert.strictEqual(sym([48]), ""); assert.strictEqual(sym([48, 60]), "");
// spelling follows the key
assert.strictEqual(sym([46, 50, 53, 56], "F"), "Bb7"); assert.strictEqual(sym([54, 57, 60, 64], "C"), "F#m7b5"); assert.strictEqual(sym([54, 58, 61], "Db"), "Gb");
assert.strictEqual(sym([54, 58, 61], "E"), "F#"); assert.strictEqual(sym([56, 60, 63, 66], "Cm"), "Ab7"); assert.strictEqual(sym([49, 53, 56], "A"), "C#");
// not exact: the closest reading, marked as a guess
var g = CE.analyse([48, 52], {}); assert.strictEqual(g.quality, "maj"); assert.strictEqual(g.exact, false);
assert.strictEqual(CE.analyse([48, 52, 55, 58], {}).exact, true);
assert.strictEqual(sym([48, 58]), "C7");

// ---- grouping notes ----
var L = CE.listener({ mode: "step" });
assert.deepStrictEqual(L.noteOn(60, 0), []); L.noteOn(64, 400); assert.deepStrictEqual(L.noteOff(60, 500), []); L.noteOn(67, 600);
assert.deepStrictEqual(L.sounding(), [60, 64, 67]); L.noteOff(64, 700);
assert.deepStrictEqual(L.noteOff(67, 800), [{ midis: [60, 64, 67], t: 0 }], "step: everything pressed until all keys are up");
L = CE.listener({ mode: "live", settle: 70 });
L.noteOn(60, 1000); L.noteOn(64, 1012); L.noteOn(67, 1025); assert.strictEqual(L.due(), 1070); assert.deepStrictEqual(L.poll(1050), []);
assert.deepStrictEqual(L.poll(1071), [{ midis: [60, 64, 67], t: 1000 }], "live: timed at the first note");
// legato: two fingers move, one common tone stays down
L.noteOff(64, 1900); L.noteOff(67, 1905); L.noteOn(65, 2000); L.noteOn(69, 2010);
assert.deepStrictEqual(L.poll(2080), [{ midis: [60, 65, 69], t: 2000 }]);
// a fresh full chord ignores a finger left down from the one before
L.noteOn(62, 3000); L.noteOn(66, 3005); L.noteOn(71, 3010);
assert.deepStrictEqual(L.noteOff(60, 3100), [{ midis: [62, 66, 71], t: 3000 }], "a late note-off still closes the chord");

// ---- the grid ----
var G = CE.grid({ n: 4, d: 4 });
assert.deepStrictEqual(G.sizes(), ["bar", "half", "beat", "eighth"]);
G.put("F7", "bar"); G.put("Bb7", "bar"); G.put("F7", "two"); G.put("Cm7", "half"); G.put("F7", "half");
assert.deepStrictEqual(G.cursor(), { bar: 5, pos: 0 }); assert.strictEqual(G.length(), 5);
var abc = G.toAbc({ key: "F", title: "T" });
assert.strictEqual(abc, 'X:1\nT:T\nM:4/4\nL:1/4\nK:F\n"F7"z4 | "Bb7"z4 | "F7"z4 | z4 |\n"Cm7"z2 "F7"z2 |]');
var P = TuneChart.parse(abc); assert.strictEqual(P.bars.length, 5); assert.strictEqual(P.bars[4].chords[1].onset / P.unitsPerBeat, 2);
assert(G.back()); assert(G.back()); assert.deepStrictEqual(G.cursor(), { bar: 4, pos: 0 }); assert.strictEqual(G.count(), 3);
G.hold("bar"); G.put("C7", "beat"); G.setCursor(1, 0); G.put("Eb7", "bar");
assert.strictEqual(G.toAbc({}).split("\n").slice(5).join(" "), '"F7"z4 | "Eb7"z4 | "F7"z4 | z4 | z4 | "C7"z4 |]');
// an off-beat chord switches the ABC to eighth-note units
G = CE.grid({ n: 4, d: 4 }); G.setLength(2);
assert.deepStrictEqual(G.place("C7", 0, 0.1, "beat"), { bar: 0, pos: 0 }); assert.deepStrictEqual(G.place("F7", 0, 3.4, "eighth"), { bar: 0, pos: 7 });
assert.deepStrictEqual(G.place("G7", 0, 3.8, "beat"), { bar: 1, pos: 0 }, "an early chord goes to the next downbeat");
assert.strictEqual(G.place("G7", 1, 3.9, "bar"), null, "past the last bar");
assert.deepStrictEqual(G.place("D7", 1, 1.2, "half"), { bar: 1, pos: 4 });
abc = G.toAbc({}); assert.strictEqual(abc.split("\n").slice(3).join("\n"), 'L:1/8\nK:C\n"C7"z7 "F7"z | "G7"z4 "D7"z4 |]');
P = TuneChart.parse(abc); assert.strictEqual(P.bars[0].chords[1].onset / P.unitsPerBeat, 3.5);
// placing replaces whatever shared the cell
G.place("A7", 1, 0, "bar"); assert.strictEqual(G.count(), 3);
// other meters
G = CE.grid({ n: 3, d: 4 }); assert.deepStrictEqual(G.sizes(), ["bar", "beat", "eighth"]); G.put("C", "bar"); G.put("G7", "beat");
assert.strictEqual(G.toAbc({}).split("\n").slice(2).join(" "), 'M:3/4 L:1/4 K:C "C"z3 | "G7"z3 |]');
G = CE.grid({ n: 12, d: 8 }); assert.deepStrictEqual(G.sizes(), ["bar", "half", "beat", "eighth"]); assert.strictEqual(G.beats, 4);
G.put("C7", "half"); G.put("F7", "beat"); G.put("G7", "beat");
abc = G.toAbc({}); assert.strictEqual(abc.split("\n").slice(2).join(" "), 'M:12/8 L:1/8 K:C "C7"z6 "F7"z3 "G7"z3 |]');
P = TuneChart.parse(abc); var F = BandHarmony.buildForm(P, 0); assert.deepStrictEqual(F[0].chords.map(function (c){ return c.pos; }), [0, 2, 3]);
G = CE.grid({ n: 5, d: 8 }); assert.deepStrictEqual(G.sizes(), ["bar", "beat"]);
// loading a chart with a repeat unrolls it
G = CE.grid({ n: 4, d: 4 }); G.load(TuneChart.parse('X:1\nM:4/4\nL:1/4\nK:C\n|: "C"z4 | "F"z2 "G"z2 :| "Am"z4 |]'));
assert.strictEqual(G.toAbc({}).split("\n")[5], '"C"z4 | "F"z2 "G"z2 | "C"z4 | "F"z2 "G"z2 |'); assert.deepStrictEqual(G.cursor(), { bar: 5, pos: 0 });

// ---- swing ----
assert(Math.abs(CE.unswing(2.66, 0.66) - 2.5) < 1e-9); assert(Math.abs(CE.unswing(2.83, 0.66) - 2.75) < 1e-9); assert.strictEqual(CE.unswing(3, 0.66), 3);

// ---- the band plays bars that carry no chord of their own, and a take with a late first chord ----
G = CE.grid({ n: 4, d: 4 }); G.setLength(4); G.place("F7", 1, 0, "bar");
P = TuneChart.parse(G.toAbc({ key: "F" })); assert.strictEqual(P.bars.length, 4);
var gen = BandMidi.generate(P, { bars: 4, tempo: 120, opts: { comp: "piano", feel: "swing", groove: "click" } });
assert.strictEqual(gen.length, 4);
assert.deepStrictEqual(gen[0].parts.drums.map(function (e){ return e.pos + e.piece; }), ["0sticks", "1sticks", "2sticks", "3sticks"], "click: sticks on every beat");
// nothing at all entered yet: still four bars of click
G = CE.grid({ n: 3, d: 4 }); G.setLength(2); P = TuneChart.parse(G.toAbc({}));
gen = BandMidi.generate(P, { bars: 2, tempo: 120, opts: { comp: "piano", groove: "click" } });
assert.strictEqual(gen.length, 2); assert.strictEqual(gen[1].parts.drums.length, 3);
console.log("ENTRY OK");

// ---- naming a played voicing for a known chord (ChordVoicings.identify) ----
function idn(sym, midis){ var r = ChordVoicings.identify(BandHarmony.libChord(BandHarmony.parseChord(sym, 0)), midis); return r.style + ":" + r.index + ":" + r.tones.join(" "); }
assert.strictEqual(idn("C7", [52, 57, 58, 62]), "rootless:0:3 13 b7 9", "E A Bb D on C7 is the rootless A form");
assert.strictEqual(idn("C7", [58, 62, 64, 69]), "rootless:1:b7 9 3 13"); assert.strictEqual(idn("C7", [46, 50, 52, 57]), "rootless:1:b7 9 3 13", "any octave");
assert.strictEqual(idn("C7", [52, 58]), "guide:0:3 b7"); assert.strictEqual(idn("C7", [58, 64]), "guide:1:b7 3");
assert.strictEqual(idn("C7", [48, 55, 58, 64]), "drop2:0:R 5 b7 3"); assert.strictEqual(idn("C7", [48, 52, 58]), "shell:0:R 3 b7");
assert.strictEqual(idn("C7", [48, 52, 55, 58]), "standard:0:R 3 5 b7"); assert.strictEqual(idn("C7", [52, 55, 58, 60]), "standard:1:3 5 b7 R");
assert.strictEqual(idn("C7", [48, 58, 64, 69]), "null:-1:R b7 3 13", "no known shape: as played, degrees named");
assert.strictEqual(idn("Dm7", [53, 57, 60, 64]), "rootless:0:b3 5 b7 9"); assert.strictEqual(idn("Cmaj7", [59, 62, 64, 67]), "rootless:1:7 9 3 5");
assert.strictEqual(idn("C7b9", [52, 57, 58, 61]), "rootless:0:3 13 b7 b9"); assert.strictEqual(idn("F7", [57, 62, 63, 67]), "rootless:0:3 13 b7 9");
assert.strictEqual(idn("Cm7b5", [51, 54, 58, 60]), "standard:1:b3 b5 b7 R", "a reading with every chord tone comes first");
// every candidate the library offers is named as itself
["C7", "Fmaj7", "Bbm7", "Em7b5", "A7b9", "Dsus4", "G6", "Cdim7", "Ab"].forEach(function (sym){
  var lc = BandHarmony.libChord(BandHarmony.parseChord(sym, 0));
  ["rootless", "guide", "drop2", "drop3", "shell", "standard"].forEach(function (st){ ChordVoicings.piano(lc, st, { allOctaves: true }).forEach(function (c){
    var r = ChordVoicings.identify(lc, c.midis); assert(r && r.style, sym + " " + st + " not named: " + c.midis); assert.deepStrictEqual(r.tones, ChordVoicings.piano(lc, r.style)[r.index].tones, sym + " " + st); }); });
});
console.log("VOICING NAMES OK");

// ---- a melody: single notes into written rhythm ----
(function (){
  var s = 0.67, M = [60, 62, 64, 65, 67, 69, 70, 72];
  function played(list, swung, mode){                                        // list: [midi, beat on, beat off]
    var L = CE.line(); list.forEach(function (n){ L.on(n[0], n[1]); L.off(n[0], n[2]); }); return L.notes(8);
  }
  // swung eighths (long-short at 2/3) are written as even eighths
  var sw = M.map(function (m, i){ var t = Math.floor(i / 2) + (i % 2 ? s : 0); return [m, t + 0.02, t + (i % 2 ? 0.3 : 0.55)]; });
  var q = CE.quantizeLine(played(sw), { beat: 2, per: 8, bars: 1, swing: s });
  assert.deepStrictEqual(q[0].map(function (n){ return n.pos + ":" + n.dur; }), ["0:1", "1:1", "2:1", "3:1", "4:1", "5:1", "6:1", "7:1"], "swung eighths come out even");
  // a quarter, a clear gap (rest), a late off-beat, and a long note over the barline (tied)
  var L = CE.line(); [[67, 0, 0.7], [66, 2 + s, 3.5], [60, 3.67, 4.4], [64, 4.5, 6.5]].forEach(function (n){ L.on(n[0], n[1]); L.off(n[0], n[2]); });
  q = CE.quantizeLine(L.notes(8), { beat: 2, per: 8, bars: 2, swing: s });
  assert.deepStrictEqual(q[0].map(function (n){ return n.midi + "@" + n.pos + "x" + n.dur + (n.tie ? "t" : ""); }), ["67@0x1", "66@5x2", "60@7x1t"], "short notes and a rest, note across the bar is tied");
  assert.strictEqual(q[1][0].midi, 60); assert.strictEqual(q[1][0].pos, 0);
  // two notes struck together leave the top one; a new note ends the one before
  L = CE.line(); L.on(60, 0); L.on(64, 0.02); L.on(67, 1); L.off(60, 3); L.off(64, 3); L.off(67, 3);
  var ns = L.notes(4); assert.deepStrictEqual(ns.map(function (n){ return n.midi + ":" + n.off; }), ["64:1", "67:3"]);
  // sixteenths when asked
  q = CE.quantizeLine([{ midi: 60, on: 0, off: 0.25 }, { midi: 62, on: 0.25, off: 0.5 }, { midi: 64, on: 0.5, off: 1 }], { beat: 2, per: 8, bars: 1, res: 0.5 });
  assert.deepStrictEqual(q[0].map(function (n){ return n.pos + ":" + n.dur; }), ["0:0.5", "0.5:0.5", "1:1"]);
  // a note struck before the count-in ends is the first note; one far too early is dropped
  q = CE.quantizeLine([{ midi: 60, on: -0.2, off: 1 }, { midi: 62, on: -2, off: -1 }], { beat: 2, per: 8, bars: 1 }); assert.strictEqual(q[0].length, 1); assert.strictEqual(q[0][0].pos, 0);

  // ABC: spelled from the key, accidentals once per bar, chords above the notes, ties where a chord changes
  var G = CE.grid({ n: 4, d: 4 }); G.put("Cmaj7", "half"); G.put("G7", "half"); G.setLength(1);
  G.setMelody([M.map(function (m, i){ return { pos: i, dur: 1, midi: m }; })]);
  assert.strictEqual(G.toAbc({ key: "C" }).split("\n").slice(3).join("|"), 'L:1/8|K:C|"Cmaj7"CD EF "G7"GA _Bc |]');
  G = CE.grid({ n: 4, d: 4 }); G.put("Bbm7", "bar"); G.setMelody([[{ pos: 0, dur: 1, midi: 70 }, { pos: 1, dur: 1, midi: 71 }, { pos: 2, dur: 1.5, midi: 63 }, { pos: 3.5, dur: 0.5, midi: 61 }, { pos: 4, dur: 4, midi: 46, tie: true }]]);
  assert.strictEqual(G.toAbc({ key: "Db" }).split("\n").slice(3).join("|"), 'L:1/16|K:Db|"Bbm7"B2_c2 E3 D B,,8- |]');
  G = CE.grid({ n: 4, d: 4 }); G.put("C", "half"); G.put("F", "half"); G.setMelody([[{ pos: 2, dur: 4, midi: 64 }, { pos: 7, dur: 1, midi: 66 }, { pos: 7, dur: 0, midi: 66 }].slice(0, 2)]);
  assert.strictEqual(G.toAbc({ key: "F" }).split("\n").slice(5).join("|"), '"C"z2 E2- "F"E2 z _G |]', "a note held over a chord change is tied; the chromatic note nearest a key tie is flat (Gb in F)");
  // accidentals persist for the bar
  G = CE.grid({ n: 4, d: 4 }); G.put("C7", "bar"); G.setMelody([[63, 63, 64, 63].map(function (m, i){ return { pos: i * 2, dur: 2, midi: m }; })]);
  assert.strictEqual(G.toAbc({ key: "C" }).split("\n")[5], '"C7"_E2 E2 =E2 _E2 |]', "the flat holds for the bar, the natural is shown, then the flat again");
  // the chart still reads it: the same bars and chords, the melody gone from the chart
  var P = TuneChart.parse(G.toAbc({ key: "C" })); assert.strictEqual(P.bars.length, 1); assert.strictEqual(P.bars[0].chords[0].sym, "C7");
  // undo takes the melody back; a new grid has none
  G.setMelody([[{ pos: 0, dur: 8, midi: 60 }]]); assert(G.hasMelody()); assert(G.back()); assert.strictEqual(G.melody()[0][0].midi, 63);
  G.clearMelody(); assert(!G.hasMelody()); G.back(); assert(G.hasMelody());
  // meter changes: bars of different lengths in one line (4/4, 3/4, then 6/8 counted in dotted quarters)
  var geo = [{ per: 8, beat: 2 }, { per: 6, beat: 2 }, { per: 6, beat: 3, compound: true }];
  q = CE.quantizeLine(played([[60, 0, 1], [62, 1, 2], [64, 2, 3], [65, 3, 4], [67, 4, 5], [69, 5, 6], [71, 6, 7], [72, 7, 8], [74, 8, 9]]), { bars: geo, swing: s });
  assert.deepStrictEqual(q.map(function (b){ return b.map(function (n){ return n.pos + ":" + n.dur; }).join(" "); }), ["0:2 2:2 4:2 6:2", "0:2 2:2 4:2", "0:3 3:3"]);
  assert.strictEqual(q[0].length, 4); assert.strictEqual(q[1].length, 3, "the 3/4 bar takes three quarters, not four");
  assert.deepStrictEqual(q[2].map(function (n){ return n.midi; }), [72, 74]);
  var P3 = TuneChart.parse('X:1\nT:m\nM:4/4\nL:1/8\nK:C\n"C"z8 | [M:3/4] "F"z6 | [M:6/8] "G"z6 |]');
  var ml = [[{ pos: 0, dur: 8, midi: 60 }], [{ pos: 0, dur: 2, midi: 65 }, { pos: 2, dur: 4, midi: 69 }], [{ pos: 0, dur: 3, midi: 67 }, { pos: 3, dur: 3, midi: 71 }]];
  var out3 = CE.melodyAbc(P3, ml, {});
  assert.strictEqual(out3.split("\n").slice(5).join(" ").trim(), '"C"C8 | [M:3/4] "F"F2 A4 | [M:6/8] "G"G3 B3 |]', out3);
  var P4 = TuneChart.parse(out3); assert.deepStrictEqual(P4.bars.map(function (b){ return b.meter.n + "/" + b.meter.d; }), ["4/4", "3/4", "6/8"]);
  assert.deepStrictEqual(CE.playable(ml, [2, 2, 3]).map(function (b){ return b.map(function (n){ return n.pos + ":" + n.dur; }).join(" "); }), ["0:4", "0:1 1:2", "0:1 1:1"]);
  console.log("MELODY OK");
})();

// ---- meters that change while you play: the layout, the pedal, a grid with bars of their own ----
(function (){
  function lay(o){ return CE.layout(o).map(function (b){ return b.n + "/" + b.d + "@" + b.start; }).join(" "); }
  assert.strictEqual(lay({ n: 4, d: 4, bars: 3 }), "4/4@0 4/4@4 4/4@8");
  assert.strictEqual(lay({ n: 4, d: 4, bars: 4, changes: [{ at: 8, len: 3 }] }), "4/4@0 4/4@4 3/4@8 3/4@11", "a change on a bar line");
  assert.strictEqual(lay({ n: 4, d: 4, bars: 4, changes: [{ at: 6, len: 3 }] }), "4/4@0 2/4@4 3/4@6 3/4@9", "a change inside a bar cuts it short");
  assert.strictEqual(lay({ n: 4, d: 4, bars: 3, changes: [{ at: 4.5, len: 3 }] }), "4/4@0 3/4@4 3/4@7", "less than a beat after the bar line goes back to it");
  assert.strictEqual(lay({ n: 6, d: 8, bars: 3, changes: [{ at: 2, len: 3 }] }), "6/8@0 9/8@2 9/8@5", "in compound meters beats are dotted quarters");
  assert.strictEqual(lay({ n: 4, d: 4, bars: 4, changes: [{ at: 4, len: 3 }, { at: 10, len: 5 }] }), "4/4@0 3/4@4 3/4@7 5/4@10");
  // the pedal: held across two downbeats
  var P = CE.meterPedal();
  P.strike(0.2); assert.strictEqual(P.up(), null, "notes with no pedal are not downbeats");
  P.down(); P.strike(8.05); P.strike(8.1); P.strike(10.9); assert.deepStrictEqual(P.up(), { at: 8, len: 3 }, "two downbeats three beats apart; a chord is one strike");
  P.down(); P.strike(3); assert.deepStrictEqual(P.up(), { error: "one downbeat" });
  P.down(); P.strike(3); P.strike(3.2); assert.deepStrictEqual(P.up(), { error: "the same beat" });
  P.down(); assert.deepStrictEqual(P.up(), { error: "no downbeats" });
  // a grid whose bars have their own meters
  var G = CE.grid({ n: 4, d: 4 }); G.setLayout(CE.layout({ n: 4, d: 4, bars: 3, changes: [{ at: 4, len: 3 }] }));
  assert.strictEqual(G.length(), 3); assert.strictEqual(G.geo(1).per, 6); assert.strictEqual(G.geo(0).per, 8);
  assert.deepStrictEqual(G.place("C", 0, 0, "half"), { bar: 0, pos: 0 }); assert.deepStrictEqual(G.place("F", 1, 1.6, "beat"), { bar: 1, pos: 4 });
  assert.deepStrictEqual(G.place("G", 0, 3.9, "beat"), { bar: 1, pos: 0 }, "rounds into the next bar, whatever its length");
  assert.deepStrictEqual(G.place("D", -1, 3.9, "beat"), { bar: 0, pos: 0 }, "just before the first bar");
  assert.strictEqual(G.place("D", -1, 2, "beat"), null);
  var abcM = G.toAbc({ key: "C" }); assert.strictEqual(abcM.split("\n").slice(3).join("|"), 'L:1/8|K:C|"D"z8 | [M:3/4] "G"z4 "F"z2 | z6 |]', abcM);
  var Q = TuneChart.parse(abcM); assert.deepStrictEqual(Q.bars.map(function (b){ return b.meter.n + "/" + b.meter.d; }), ["4/4", "3/4", "3/4"]);
  // step entry across bars of different lengths
  G = CE.grid({ n: 4, d: 4 }); G.setLayout(CE.layout({ n: 4, d: 4, bars: 2, changes: [{ at: 4, len: 3 }] })); G.setCursor(0, 0);
  G.put("C", "bar"); assert.deepStrictEqual(G.cursor(), { bar: 1, pos: 0 }); G.put("F", "bar"); assert.deepStrictEqual(G.cursor(), { bar: 2, pos: 0 }); assert.strictEqual(G.length(), 2);
  G.back(); G.back(); assert.strictEqual(G.geo(1).per, 6, "undo keeps the meters");
  // a melody over bars of different lengths, written and read back
  G = CE.grid({ n: 4, d: 4 }); G.setLayout(CE.layout({ n: 4, d: 4, bars: 2, changes: [{ at: 4, len: 3 }] }));
  var qq = CE.quantizeLine([{ midi: 60, on: 0, off: 1 }, { midi: 62, on: 4, off: 5 }, { midi: 64, on: 5, off: 6 }, { midi: 65, on: 6, off: 7 }], { bars: G.geoList(), swing: 0 });
  G.setMelody(qq); var am = G.toAbc({ key: "C" }); assert.strictEqual(am.split("\n").slice(5).join(" "), 'C2 z6 | [M:3/4] D2 E2 F2 |]', am);
  console.log("TAKE MODEL OK");
})();


// ---- the take object: routing, chords with swing, the pedal, the split, replay ----
(function (){
  var bs = 0.5, ms = function (beat){ return beat * bs * 1000; };                   // 120 bpm: a beat is 500 ms
  function feed(t, evs){ evs.forEach(function (e){ if (e[1] === "on") t.on(e[2], 0.7, ms(e[0])); else if (e[1] === "off") t.off(e[2], ms(e[0])); else t.cc(80, e[2], ms(e[0])); }); return t.finish(); }
  function nt(beat, m, len){ return [[beat, "on", m], [beat + (len || 0.8), "off", m]]; }
  function ch(beat, list){ return list.map(function (m, i){ return [beat + i * 0.01, "on", m]; }).concat(list.map(function (m){ return [beat + 0.4, "off", m]; })); }
  function body(t, from){ return t.abc().split("\n").slice(from || 3).join("|"); }
  // chords on a swung click: the second one, a half bar later, is a chord at the half bar
  var t = CE.take({ kind: "chords", n: 4, d: 4, bars: 2, beatSec: bs, key: "F", swing: 0.67, snap: "half" });
  feed(t, [].concat(ch(0.02, [53, 57, 60, 63]), ch(2.0, [46, 50, 53, 56]), ch(4, [48, 51, 55, 58])));
  assert.strictEqual(body(t), 'L:1/4|K:F|"F7"z2 "Bb7"z2 | "Cm7"z4 |]');
  assert.strictEqual(t.trace.chords[0].reading, "F7"); assert(t.trace.chords[0].candidates.length >= 2 && /placed in bar 1/.test(t.trace.chords[0].out));
  // the pedal held across two downbeats three beats apart: bars of three from beat 4
  t = CE.take({ kind: "chords", n: 4, d: 4, bars: 4, beatSec: bs, key: "F", snap: "half" });
  feed(t, [].concat(ch(0, [53, 57, 60, 63]), [[3.1, "cc", 127]], ch(4, [46, 50, 53, 56]), ch(7, [48, 51, 55, 58]), [[7.3, "cc", 0]], ch(10, [53, 57, 60, 63])));
  assert.deepStrictEqual(t.changes(), [{ at: 4, len: 3 }]); assert.strictEqual(t.trace.pedal[0].out, "bars of 3 beats from beat 4"); assert.deepStrictEqual(t.trace.pedal[0].strikes, [4, 7]);
  assert.strictEqual(body(t), 'L:1/8|K:F|"F7"z8 | [M:3/4] "Bb7"z6 | "Cm7"z6 | "F7"z6 |]');
  var again = CE.replay(JSON.parse(JSON.stringify(t.log()))); assert.strictEqual(again.abc(), t.abc(), "the log gives the same bars");
  // a melody, one note at a time: swung eighths written straight, and the trace says what each rule did
  t = CE.take({ kind: "melody", n: 4, d: 4, bars: 1, beatSec: bs, key: "F", swing: 0.67 });
  feed(t, [].concat(nt(0, 65, 0.5), nt(0.67, 67, 0.3), nt(1, 69, 0.5), nt(1.67, 70, 0.3), nt(2, 72, 1.9)));
  assert.strictEqual(body(t), 'L:1/8|K:F|FG AB c4 |]');
  assert.strictEqual(t.trace.notes.length, 5); assert(/legato/.test(t.trace.notes[0].endRule)); assert(/swung/.test(t.trace.notes[1].swing)); assert.strictEqual(t.trace.notes[1].snapped, 1);
  // notes struck together: the top one, or all of them as a chord
  var cl = [].concat(ch(0, [60, 64, 67]), nt(1, 62, 0.9));
  t = feed(CE.take({ kind: "melody", n: 4, d: 4, bars: 1, beatSec: bs, key: "C", poly: false }), cl);
  assert.strictEqual(body(t), 'L:1/8|K:C|G z D2 z4 |]'); assert.deepStrictEqual(t.trace.notes[0].leftOut, [60, 64]);
  t = feed(CE.take({ kind: "melody", n: 4, d: 4, bars: 1, beatSec: bs, key: "C", poly: true }), cl);
  assert.strictEqual(body(t), 'L:1/8|K:C|[CEG] z D2 z4 |]');
  assert.deepStrictEqual(CE.playable(t.grid.melody(), 2)[0].map(function (n){ return n.midi + "@" + n.pos; }), ["60@0", "64@0", "67@0", "62@1"]);
  // accidentals inside a chord are written once per bar, like single notes
  var G0 = CE.grid({ n: 4, d: 4 }); G0.setLength(1); G0.setMelody([[{ pos: 0, dur: 4, midi: 63, midis: [60, 63, 67] }, { pos: 4, dur: 4, midi: 63 }]]);
  assert.strictEqual(G0.toAbc({ key: "C" }).split("\n").slice(5).join(" "), '[C_EG]4 E4 |]');
  // chords and melody together, split at middle C: the left hand a chord, the right a line
  t = CE.take({ kind: "both", n: 4, d: 4, bars: 2, beatSec: bs, key: "C", split: 60, snap: "half" });
  feed(t, [].concat(ch(0, [48, 52, 55, 58]), nt(0.1, 72, 0.9), nt(1, 74, 0.9), nt(2, 76, 1.9), ch(4, [41, 45, 48, 51]), nt(4.1, 77, 3.9)));
  assert.strictEqual(body(t), 'L:1/8|K:C|"C7"c2 d2 e4 | "F7"f8 |]'); assert.strictEqual(t.trace.chords.length, 2); assert.strictEqual(t.trace.notes.length, 4);
  // the pedal is ignored over bars already entered
  var G = CE.grid({ n: 4, d: 4 }); G.put("C", "bar"); G.put("F", "bar");
  t = CE.take({ kind: "melody", n: 4, d: 4, bars: 2, beatSec: bs, key: "C", free: false, grid: G });
  feed(t, [[1, "cc", 127], [1.1, "on", 60], [1.5, "off", 60], [3, "on", 62], [3.5, "off", 62], [3.6, "cc", 0]]);
  assert.deepStrictEqual(t.changes(), []); assert(/ignored/.test(t.trace.pedal[0].out));
  console.log("TAKE OBJECT OK");
})();

// ---- the swing the page and the player agree on ----
(function (){
  require(path.join(R, "apps/shared/band/player.js"));
  for (var bpm = 40; bpm <= 300; bpm += 7) assert.strictEqual(CE.swingFor(bpm), BandPlayer.swingFor(bpm), "swing at " + bpm);
  assert.strictEqual(CE.RULES.gap, 0.75); assert.deepStrictEqual(CE.RULES.ticks, [16, 12, 8, 6, 4, 3, 2, 1]);
  console.log("RULES OK");
})();

// ---- how the melody is written: beams, syncopation ties, staccato, grace notes, triplets, parallel thirds ----
(function (){
  var bs = 0.5, ms = function (beat){ return beat * bs * 1000; };
  function feed(t, evs){ evs.forEach(function (e){ if (e[1] === "on") t.on(e[2], 0.7, ms(e[0])); else if (e[1] === "off") t.off(e[2], ms(e[0])); }); return t.finish(); }
  function nt(beat, m, len){ return [[beat, "on", m], [beat + (len || 0.8), "off", m]]; }
  function mk(cfg, evs){ return feed(CE.take(Object.assign({ kind: "melody", n: 4, d: 4, bars: 1, beatSec: bs, key: "C" }, cfg)), evs); }
  function mus(t, o){ return t.abc(o).split("\n").slice(5).join(" "); }
  var eighths = [].concat(nt(0, 60, 0.45), nt(0.5, 62, 0.45), nt(1, 64, 0.45), nt(1.5, 65, 0.45), nt(2, 67, 0.45), nt(2.5, 69, 0.45), nt(3, 71, 0.45), nt(3.5, 72, 0.45));
  // beams: within a beat by default; four eighths to the half bar when asked; none when not; rests and quarters end a beam
  assert.strictEqual(mus(mk({}, eighths)), 'CD EF GA Bc |]');
  assert.strictEqual(mus(mk({ beam: "half" }, eighths)), 'CDEF GABc |]');
  assert.strictEqual(mus(mk({ beam: "none" }, eighths)), 'C D E F G A B c |]');
  assert.strictEqual(mus(mk({}, [].concat(nt(0, 60, 0.45), nt(0.5, 62, 0.9), nt(1.5, 64, 0.45), nt(2, 65, 1.9)))), 'C D2 E F4 |]', 'a longer note is not in the beam');
  assert.strictEqual(mus(mk({ n: 6, d: 8, beatSec: bs }, [].concat(nt(0, 60, 0.3), nt(0.33, 62, 0.3), nt(0.67, 64, 0.3), nt(1, 65, 0.3), nt(1.33, 67, 0.3), nt(1.67, 69, 0.3)))), 'CDE FGA |]', '6/8 beams in threes');
  // syncopation: a quarter on the "and" of 2 crosses beat 3. Kept as played, or tied across the middle of the bar, or across every beat
  var sync = [].concat(nt(0, 60, 0.9), nt(1, 62, 0.45), nt(1.5, 64, 0.95), nt(2.5, 65, 0.45), nt(3, 67, 0.9));
  assert.strictEqual(mus(mk({}, sync)), 'C2 D E2 F G2 |]');
  assert.strictEqual(mus(mk({ tie: "mid" }, sync)), 'C2 DE- EF G2 |]'); assert.strictEqual(mus(mk({ tie: "beat" }, sync)), 'C2 DE- EF G2 |]');
  // a half note on beat 2 crosses the middle: tied across with "mid", kept otherwise
  var half = [].concat(nt(0, 60, 0.9), nt(1, 62, 1.9), nt(3, 64, 0.9));
  assert.strictEqual(mus(mk({}, half)), 'C2 D4 E2 |]'); assert.strictEqual(mus(mk({ tie: "mid" }, half)), 'C2 D2- D2 E2 |]');
  assert.strictEqual(mus(mk({ tie: "mid" }, nt(0, 60, 3.9))), 'C8 |]', "a note from the first beat keeps its length");
  // detached notes: a note and an equal rest, as a rest or as a staccato note of both
  var det = [].concat(nt(0, 60, 0.45), nt(1, 62, 0.45), nt(2, 64, 0.45), nt(3, 65, 0.45));
  assert.strictEqual(mus(mk({}, det)), 'C z D z E z F z |]');
  assert.strictEqual(mus(mk({ detached: "staccato" }, det)), '.C2 .D2 .E2 .F2 |]');
  assert.strictEqual(CE.playable(mk({ detached: "staccato" }, det).grid.melody(), 2)[0][0].dur, 0.5, "a staccato quarter sounds half its length");
  // grace notes: a very short note just before another
  var gr = [].concat(nt(0, 62, 0.05), nt(0.06, 63, 0.9), nt(2, 65, 0.9));
  var t = mk({ graceMs: 80 }, gr); assert.strictEqual(mus(t), '{/D}_E2 z2 F2 z2 |]'); assert.deepStrictEqual(t.trace.notes[0].graces, [62]);
  assert(!/\{/.test(mus(mk({ graceMs: 0 }, gr))), "no grace notes unless asked");
  // triplets in 2/4 (and 4/4): three notes in a beat, at thirds; a swung pair stays eighths
  var tri = [].concat(nt(0, 60, 0.3), nt(0.33, 62, 0.3), nt(0.67, 64, 0.3), nt(1, 65, 0.9));
  var t2 = mk({ n: 2, d: 4, triplets: "auto" }, tri); assert.strictEqual(mus(t2), '(3CDE F2 |]');
  assert(!/\(3/.test(mus(mk({ n: 2, d: 4, triplets: "off" }, tri))), "triplets only when asked");
  var swungPair = [].concat(nt(0, 60, 0.5), nt(0.67, 62, 0.3), nt(1, 64, 0.9));
  assert(!/\(3/.test(mus(mk({ n: 2, d: 4, triplets: "auto", swing: 0.67 }, swungPair))), "a swung pair is not a triplet when read as swung");
  assert.strictEqual(mus(mk({ n: 2, d: 4, triplets: "auto", swing: 0 }, swungPair)), '(3:2:2C2D E2 |]', "the same pair read as straight is a quarter and an eighth triplet");
  // parallel thirds above the split: one line, each pair written as a stacked chord and not named as a chord
  var thirds = [].concat([[0, "on", 60], [0.01, "on", 64], [0.45, "off", 60], [0.45, "off", 64]], [[1, "on", 62], [1.01, "on", 65], [1.45, "off", 62], [1.45, "off", 65]], [[2, "on", 64], [2.01, "on", 67], [2.9, "off", 64], [2.9, "off", 67]]);
  var tt = CE.take({ kind: "both", n: 4, d: 4, bars: 1, beatSec: bs, key: "C", split: 48, poly: true }); feed(tt, thirds.concat([[0, "on", 36], [0.02, "on", 43], [0.03, "on", 47], [0.4, "off", 36], [0.4, "off", 43], [0.4, "off", 47]]));
  assert(/\[CE\]/.test(mus(tt)) && /\[DF\]/.test(mus(tt)) && /\[EG\]/.test(mus(tt)), "thirds written as stacked notes: " + mus(tt)); assert.strictEqual(tt.trace.chords.length, 1, "only the left hand is a chord");
  var one = CE.take({ kind: "both", n: 4, d: 4, bars: 1, beatSec: bs, key: "C", split: 48, poly: false }); feed(one, thirds);
  assert(!/\[/.test(mus(one)), "with the setting off only the top note of each pair is written: " + mus(one));
  console.log("WRITING OK");
})();

// ---- "do what I mean": the other readings of the same playing ----
(function (){
  var bs = 0.5, ms = function (beat){ return beat * bs * 1000; };
  function feed(t, evs){ evs.forEach(function (e){ if (e[1] === "on") t.on(e[2], 0.7, ms(e[0])); else t.off(e[2], ms(e[0])); }); return t.finish(); }
  function nt(beat, m, len){ return [[beat, "on", m], [beat + (len || 0.8), "off", m]]; }
  // eighth notes with eighth rests: the staccato reading is offered, and is the suggestion (fewer notes and rests)
  var det = [].concat(nt(0, 60, 0.45), nt(1, 62, 0.45), nt(2, 64, 0.45), nt(3, 65, 0.45), nt(4, 67, 0.45), nt(5, 69, 0.45), nt(6, 71, 0.45), nt(7, 72, 0.45));
  var t = feed(CE.take({ kind: "melody", n: 4, d: 4, bars: 2, beatSec: bs, key: "C" }), det), log = t.log();
  var alt = CE.alternatives(JSON.parse(JSON.stringify(log)), 0, 1);
  var st = alt.variants.filter(function (v){ return v.id === "staccato"; })[0];
  assert(st, "staccato offered: " + alt.variants.map(function (v){ return v.id; })); assert(st.suggested, "and suggested"); assert.strictEqual(st.abc.split("\n").slice(5).join(" "), '.C2 .D2 .E2 .F2 | .G2 .A2 .B2 .c2 |]');
  assert.strictEqual(alt.current.abc.split("\n").slice(5).join(" "), 'C z D z E z F z | G z A z B z c z |]');
  // it applies to a range only, and what it hands back puts straight into the grid
  var one = CE.alternatives(JSON.parse(JSON.stringify(log)), 1, 1); assert.strictEqual(one.variants.filter(function (v){ return v.id === "staccato"; })[0].melody.length, 1);
  var g2 = CE.grid({ n: 4, d: 4 }); g2.setLayout(CE.layout({ n: 4, d: 4, bars: 2 })); var m = JSON.parse(JSON.stringify(t.grid.melody())); m[1] = one.variants.filter(function (v){ return v.id === "staccato"; })[0].melody[0]; g2.setMelody(m);
  assert.strictEqual(g2.toAbc({ key: "C" }).split("\n").slice(5).join(" "), 'C z D z E z F z | .G2 .A2 .B2 .c2 |]', "only the chosen bar changed");
  // triplets are offered where the beat fits thirds, never where it does not
  var tri = [].concat(nt(0, 60, 0.3), nt(0.33, 62, 0.3), nt(0.67, 64, 0.3), nt(1, 65, 0.9));
  var a2 = CE.alternatives(feed(CE.take({ kind: "melody", n: 2, d: 4, bars: 1, beatSec: bs, key: "C" }), tri).log(), 0, 0);
  var tv = a2.variants.filter(function (v){ return v.id === "triplets"; })[0]; assert(tv && tv.suggested, "triplets suggested: it keeps the middle note the grid loses"); assert.strictEqual(tv.lost, 0); assert.strictEqual(a2.current.lost, 1);
  assert(!CE.alternatives(log, 0, 1).variants.some(function (v){ return v.id === "triplets" && v.suggested; }), "no triplets suggested for eighths on the beat");
  // a chord-only take has nothing to reinterpret
  assert.strictEqual(CE.alternatives(feed(CE.take({ kind: "chords", n: 4, d: 4, bars: 1, beatSec: bs, key: "C" }), []).log(), 0, 0).variants.length, 0);
  console.log("DWIM OK");
})();

// ---- pickups: notes before the first downbeat ----
(function (){
  var bs = 0.5, ms = function (beat){ return beat * bs * 1000; };
  function feed(t, evs){ evs.forEach(function (e){ if (e[1] === "on") t.on(e[2], 0.7, ms(e[0])); else t.off(e[2], ms(e[0])); }); return t.finish(); }
  function nt(beat, m, len){ return [[beat, "on", m], [beat + (len || 0.8), "off", m]]; }
  function mus(t){ return t.abc().split("\n").slice(3).join("|"); }
  // three notes in the last beat and a half of the count-in, then the tune
  var evs = [].concat(nt(-1.5, 60, 0.45), nt(-1, 62, 0.45), nt(-0.5, 64, 0.45), nt(0, 65, 0.95), nt(1, 67, 0.95), nt(2, 69, 1.9));
  var t = feed(CE.take({ kind: "melody", n: 4, d: 4, bars: 1, beatSec: bs, key: "C", pickup: "auto" }), evs);
  assert.strictEqual(t.pickup(), 2, "two beats of pickup"); assert.strictEqual(mus(t), 'L:1/8|K:C|z C DE | F2 G2 A4 |]', "a rest, then the three notes, in a two-beat bar");
  var abc = t.abc(); assert(!/\[M:/.test(abc), "a pickup carries no meter mark: " + abc);
  var P = TuneChart.parse(abc); assert.strictEqual(P.anacrusis, true, "the chart reads it as a pickup"); assert.strictEqual(P.bars.length, 2);
  // off: the early notes are dropped (as before)
  var off = feed(CE.take({ kind: "melody", n: 4, d: 4, bars: 1, beatSec: bs, key: "C", pickup: "off" }), evs); assert.strictEqual(off.pickup(), 0); assert(!/pickup|anacrusis/.test(off.abc()));
  assert.strictEqual(TuneChart.parse(off.abc()).anacrusis, false);
  // a chart that already has a pickup bar loads as one, or without it for the band's form
  var C = TuneChart.parse('X:1\nT:p\nM:4/4\nL:1/8\nK:C\n"C"z2 | "C"z8 | "F"z8 |]'); assert(C.anacrusis);
  var g = CE.grid({ n: 4, d: 4 }); g.load(C); assert.strictEqual(g.length(), 3); assert.strictEqual(g.geo(0).per, 2); assert.strictEqual(g.geo(0).pickup, true); assert.strictEqual(g.geo(1).per, 8);
  var g2 = CE.grid({ n: 4, d: 4 }); g2.load(C, { dropPickup: true }); assert.strictEqual(g2.length(), 2);
  assert.strictEqual(g.toAbc({ key: "C" }).split("\n").slice(3).join("|"), 'L:1/8|K:C|"C"z2 | "C"z8 | "F"z8 |]');
  console.log("PICKUP OK");
})();

(function (){
  // the melody over a chart with its own pickup bar, and over one with none (a pickup of the melody's own)
  var P = TuneChart.parse('X:1\nT:p\nM:4/4\nL:1/8\nK:C\n"C"z2 | "C"z8 | "F"z8 |]');
  var mel = [[{ pos: 0, dur: 2, midi: 67 }], [{ pos: 0, dur: 8, midi: 72 }], []];
  assert.strictEqual(CE.melodyAbc(P, mel, {}).split("\n").slice(5).join(" ").trim(), '"C"G2 | "C"c8 | "F"z8 |]');
  var Q = TuneChart.parse('X:1\nT:q\nM:4/4\nL:1/8\nK:C\n"C"z8 | "F"z8 |]');
  var out = CE.melodyAbc(Q, [[{ pos: 0, dur: 8, midi: 72 }], []], { pickup: { beats: 1, notes: [{ pos: 0, dur: 1, midi: 62 }, { pos: 1, dur: 1, midi: 64 }] } });
  assert.strictEqual(out.split("\n").slice(5).join(" ").trim(), 'DE | "C"c8 | "F"z8 |]', out); assert.strictEqual(TuneChart.parse(out).anacrusis, true);
  console.log("PICKUP ABC OK");
})();
