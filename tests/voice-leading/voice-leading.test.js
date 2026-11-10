// Hand-made right and wrong examples for apps/shared/analysis/voice-leading.js (chapters 26-30).
//   node tests/voice-leading/voice-leading.test.js        NEG=1: a right example is made wrong, which must fail
const path = require("path");
const VL = require(path.resolve(__dirname, "../../apps/shared/analysis/voice-leading.js"));
let fails = 0, total = 0;
function ok(c, m) { total++; if (!c) { fails++; console.log("FAIL", m); } }

// rows: [rn or "", "S A T B"] one slice each, two beats apart
function slices(rows) { return rows.map((r, i) => { const n = r[1].split(" "); return { t: i * 2, rn: r[0] || undefined, S: n[0], A: n[1], T: n[2], B: n[3] }; }); }
const chk = (key, rows, opts) => VL.check({ key, slices: slices(rows) }, opts);
const rules = (res) => res.errors.map(e => e.rule);
const errs = (res) => res.errors.filter(e => e.sev === "error");
function good(name, key, rows) { const r = chk(key, rows); ok(errs(r).length === 0, name + " should pass: " + r.text()); }
function bad(name, key, rows, rule) { const r = chk(key, rows); ok(rules(r).includes(rule), name + " should report " + rule + " but got [" + rules(r) + "]"); }

// ---- ch. 26 triads: right
const NEG = !!process.env.NEG;
good("I IV V I", "C", [["I", "G4 E4 C4 C3"], ["IV", "A4 F4 C4 F3"], ["V", "G4 D4 B3 G3"], ["I", NEG ? "G4 E4 C4 E3" : "G4 E4 C4 C3"]]);
good("minor i iv V i", "a", [["i", "E4 C4 A3 A2"], ["iv", "F4 D4 A3 D3"], ["V", "E4 B3 G#3 E3"], ["i", "E4 C4 A3 A2"]]);
good("deceptive V-vi (doubled third)", "C", [["V", "G4 D4 B3 G3"], ["vi", "E4 C4 C4 A3"]]);
good("I6 then V", "C", [["I6", "C5 G4 C4 E3"], ["V", "D5 G4 B3 G3"]]);
good("cadential I64 then V", "C", [["I64", "G4 E4 C4 G3"], ["V", "G4 D4 B3 G3"]]);
// ---- ch. 26 wrong
bad("soprano too high", "C", [["I", "G5 E4 C4 C3"]], "range");
bad("bass too low", "C", [["I", "G4 E4 C4 C2"]], "range");
bad("alto-tenor spacing", "C", [["I", "G4 E4 C3 C3"]], "spacing");
bad("voice crossing", "C", [["I", "E4 G4 C4 C3"]], "crossing");
bad("overlap", "C", [["I", "G4 E4 C4 C3"], ["IV", "A4 B3 C4 F3"]], "overlap");
bad("parallel fifths (tenor-bass)", "C", [["I", "E4 C4 G3 C3"], ["ii", "F4 D4 A3 D3"]], "parallels");
bad("parallel octaves (soprano-bass)", "C", [["I", "C5 G4 E4 C3"], ["ii", "D5 A4 F4 D3"]], "parallels");
bad("doubled leading tone", "C", [["V", "B4 D4 B3 G3"]], "leaptone");
bad("leading tone in the soprano does not rise", "C", [["V", "B4 D4 G3 G3"], ["I", "G4 E4 C4 C3"]], "leaptone");
bad("root position triad, root not doubled", "C", [["I", "G4 E4 G3 C3"]], "doubling");
bad("first inversion doubling the bass", "C", [["I6", "E4 C4 G3 E3"]], "doubling");
bad("second inversion not doubling the bass", "C", [["I64", "C5 E4 C4 G2"]], "doubling");
bad("viio6 must double the third", "C", [["viio6", "F5 B4 F4 D3"]], "doubling");
bad("bass does not match the figure", "C", [["I6", "G4 E4 C4 C3"]], "chordtone");
// ---- ch. 27 seventh chords
good("V7 to I (7th down, LT up)", "C", [["V7", "B4 F4 D4 G3"], ["I", "C5 E4 C4 C3"]]);
bad("7th does not resolve down", "C", [["V7", "B4 F4 D4 G3"], ["I", "C5 F4 C4 C3"]], "seventh");
bad("incomplete inverted seventh", "C", [["V65", "G4 D4 D4 B2"]], "voicing7");
// ---- ch. 28 non-chord tones
good("passing tone in the alto", "C", [["I", "C5 G4 E4 C3"], ["", "C5 F4 E4 C3"], ["", "C5 E4 E4 C3"]]);
good("4-3 suspension in the soprano over V", "C", [["I", "C5 G4 E4 C3"], ["V", "C5 G4 D4 G3"], ["", "B4 G4 D4 G3"]]);
bad("a non-chord tone leaped into and out of", "C", [["I", "C5 G4 E4 C3"], ["", "C5 B4 E4 C3"], ["V", "D5 D4 G3 G3"]], "chordtone");
// ---- ch. 29 chromatic
good("V7/V to V", "C", [["V7/V", "A4 F#4 C4 D3"], ["V", "G4 G4 B3 G3"]]);
bad("secondary leading tone in the alto does not rise", "C", [["V7/V", "A4 F#4 C4 D3"], ["V", "G4 D4 B3 G3"]], "leaptone");
bad("N6 not doubling the bass", "C", [["N6", "Db5 Ab4 Db4 F3"]], "neapolitan");
good("N6 doubling the bass, then V", "C", [["N6", "Ab4 F4 Db4 F3"], ["V", "G4 D4 B3 G3"]]);

// ---- species (ch. 30)
const cf1 = "D3 F3 E3 D3 G3 F3 A3 G3 F3 E3 D3".split(" "), cp1 = NEG ? "D4 A3 C4 D4 B3 A3 C4 E4 D4 D4 D4".split(" ") : "D4 A3 C4 D4 B3 A3 C4 E4 D4 C#4 D4".split(" ");
const sp = (a, b, extra) => VL.species(Object.assign({ species: 1, cf: a, cp: b, cfPos: "lower", mode: "D dorian" }, extra || {}));
const R1 = sp(cf1, cp1); ok(errs(R1).length === 0, "first species example should pass: " + R1.text());
const bs = (name, cp, text, extra) => { const r = sp(cf1, cp.split(" "), extra); ok(r.errors.some(e => e.sev === "error" && (!text || e.msg.indexOf(text) >= 0)), name + " should report '" + text + "': " + r.text()); };
bs("begins on a 5th", "A3 A3 C4 D4 B3 A3 C4 E4 D4 C#4 D4", "Begin");
bs("ends on a 3rd", "D4 A3 C4 D4 B3 A3 C4 E4 D4 C#4 F4", "End on an octave");
bs("dissonant 4th", "D4 A3 C4 D4 B3 B3 C4 E4 D4 C#4 D4", "dissonance");
bs("fifth approached by similar motion", "D4 A3 C4 A3 B3 A3 C4 E4 D4 C#4 D4", "contrary");
bs("leap of a major 6th", "D4 A3 C4 D4 B3 G#4 C4 E4 D4 C#4 D4", "not allowed");
bs("four 3rds in a row", "D4 A3 C4 D4 B3 A3 C4 B3 D4 C#4 D4", "More than three");
const cf2 = "D3 G3 E3 D3".split(" "), cp2 = [[null, "D4"], ["B3", "G3"], ["B3", "C#4"], ["D4"]];
const R2 = VL.species({ species: 2, cf: cf2, cp: cp2, cfPos: "lower", mode: "D dorian" }); ok(errs(R2).length === 0, "second species example should pass: " + R2.text());
const bad2 = (name, cp, text) => { const r = VL.species({ species: 2, cf: cf2, cp: cp, cfPos: "lower", mode: "D dorian" }); ok(r.errors.some(e => e.sev === "error" && e.msg.indexOf(text) >= 0), name + " should report '" + text + "': " + r.text()); };
bad2("dissonant second note not passing", [[null, "D4"], ["B3", "A3"], ["B3", "C#4"], ["D4"]], "passing");
bad2("repeated note across the barline", [[null, "D4"], ["B3", "B3"], ["B3", "C#4"], ["D4"]], "repeat");
bad2("penultimate bar wrong", [[null, "D4"], ["B3", "G3"], ["G3", "B3"], ["D4"]], "bar before the end");

// ---- the weaker checks must not silently drop: every rule id has a chapter
VL.RULES.forEach(r => ok(typeof VL.CH[r] === "number", "rule " + r + " has a chapter"));
console.log((fails ? "FAILED " + fails + " of " : "ok, ") + total + " checks");
process.exit(fails ? 1 : 0);
