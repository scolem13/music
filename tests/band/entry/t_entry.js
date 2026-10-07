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
