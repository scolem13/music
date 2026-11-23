// node tests/fingering/fingering.test.js   (NEG=1 must fail)
// PianoFingering systems on the teacher's Twinkle examples, and UnderNotes' w:-style entry.
const PF = require("../../apps/shared/piano-fingering.js"), UN = require("../../apps/shared/under-notes.js");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const NEG = process.env.NEG === "1";
const tw = "C C G G A A G2 | F F E E D D C2 | G G F F E E D2 |]", ns = PF.notes(tw, "K:C");
const f = s => PF.finger(ns, s, { key: "K:C" }).f.join(" ");
ok(f("home") === (NEG ? "x" : "1 1 4 4 5 5 4 4 4 3 3 2 2 1 5 5 4 4 3 3 2"), "home position: " + f("home"));
ok(f("scale") === "1 1 2 2 3 3 2 1 1 3 3 2 2 1 2 2 1 1 3 3 2", "scale fingers: " + f("scale"));
ok(f("positions").split(" ").length === 21, "positions: " + f("positions"));
ok(!/0|undefined/.test(f("rules")), "rules: " + f("rules"));
ok(PF.finger(ns, "rules", { fixed: { 2: 5 } }).f[2] === 5, "a typed finger locks the rules");
ok(PF.finger(ns, "scale", { fixed: { 0: 3 } }).f[0] === 3, "a typed finger overrides a system");
// key signature and accidentals
const g = PF.notes("F ^F F | F =F", "K:G");
ok(g.map(n => n.midi).join() === "66,66,66,66,65", "K:G sharps F, a natural resets it: " + g.map(n => n.midi));
ok(PF.notes("C- C D", "K:C").filter(n => n.cont).length === 1, "a tie: the note after is tied on");
ok(PF.notes('"C"!f!C {g}D [CEG] z E', "K:C").map(n => n.midi).join() === "60,62,67,64", "chord symbols, decorations, grace, chord top, rest");
ok(PF.finger(PF.notes("B C D", "K:F"), "scale", { key: "K:F" }).f.join() === "4,1,2", "F major: B flat = 4");
// UnderNotes
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
ok(eq(UN.parse("Twin-kle, twin-kle"), ["Twin", "kle,", "twin", "kle"]), "hyphens split syllables");
ok(eq(UN.parse("a * b_ c"), ["a", null, "b", null, "c"]), "* skips, _ holds");
ok(eq(UN.parse("11445", { single: true }), ["1", "1", "4", "4", "5"]), "digits one a note");
ok(eq(UN.parse("1 2 | 3", { bars: [3, 2] }), ["1", "2", null, "3"]), "| jumps to the next bar");
ok(eq(UN.parse("1 2 3 | 4", { bars: [3, 2] }), ["1", "2", "3", "4"]), "| after a full bar adds nothing");
console.log(bad ? bad + " failed" : "all passed"); process.exit(bad ? 1 : 0);
