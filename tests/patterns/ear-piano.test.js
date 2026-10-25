// Patterns by Ear (apps/patterns/ear-piano.js): reading a set, fingering, checking a try.
// Run: node tests/patterns/ear-piano.test.js
const assert = require("assert");
globalThis.AbcCore = require("../../apps/shared/abc-core.js");
const E = require("../../apps/patterns/ear-piano.js"), G = require("../../apps/patterns/pattern-gen.js");
const fs = require("fs"); globalThis.window = {};
eval(fs.readFileSync(__dirname + "/../../apps/patterns/pattern-set.js", "utf8").replace("const patternObject", "globalThis.patternObject"));
let n = 0; const ok = (name, fn) => { fn(); n++; console.log("ok  ", name); };

ok("reads sets: key, mode, accidentals, octaves", () => {
  const a = E.parseSet(patternObject["322a"]);
  assert.strictEqual(a.tonicMidi, 62); assert.strictEqual(a.minor, true); assert.strictEqual(a.patterns.length, 16);
  assert.deepStrictEqual(a.patterns[1].midi, [64, 61, 64]);              // E ^C E: the raised leading tone
  assert.deepStrictEqual(E.parseSet(patternObject["322b"]).patterns[1].midi, [67, 70, 74]);   // G _B d
  assert.strictEqual(E.parseSet(patternObject["324b"]).minor, false);  // Gmix is not minor
  assert.deepStrictEqual(E.parseSet(patternObject["minor-stepwise"]).patterns[2].midi, [60, 59, 60]);   // =B,
  const g = G.generate({ chords: "i7, V7, iiø7", mode: "minor", seed: 4 }), s = E.parseSet(g.abc);
  s.patterns.forEach((p, i) => assert.deepStrictEqual(p.midi, g.patterns[i].notes.map(x => x.midi)));
});

ok("fingering: one position, no crossings, sensible shapes", () => {
  assert.deepStrictEqual(E.finger([60, 64, 67], "R"), [1, 3, 5]);
  assert.deepStrictEqual(E.finger([60, 64, 67], "L"), [5, 3, 1]);
  assert.deepStrictEqual(E.finger([60, 64, 60], "R"), [1, 3, 1]);
  for (const k of Object.keys(patternObject)) for (const p of E.parseSet(patternObject[k]).patterns) for (const h of ["R", "L"]) {
    const f = E.finger(p.midi, h), s = h === "L" ? -1 : 1;
    for (let i = 0; i < p.midi.length; i++) for (let j = 0; j < p.midi.length; j++) {
      const d = (p.midi[j] - p.midi[i]) * s, fd = f[j] - f[i];
      if (d === 0) assert.strictEqual(fd, 0, k + " same note same finger");
      else assert(Math.sign(d) === Math.sign(fd), `${k} ${p.midi} ${h} ${f}: crossing`);
    }
  }
});

ok("checking a try", () => {
  assert.deepStrictEqual(E.compare([62, 65, 62], [62], false), { ok: null, wrongAt: -1 });
  assert.deepStrictEqual(E.compare([62, 65, 62], [62, 65, 62], false), { ok: true, wrongAt: -1 });
  assert.deepStrictEqual(E.compare([62, 65, 62], [62, 64], false), { ok: false, wrongAt: 1 });
  assert.strictEqual(E.compare([62, 65, 62], [74, 77, 74], true).ok, true);
  assert.strictEqual(E.compare([62, 65, 62], [74, 77, 74], false).ok, false);
  assert.strictEqual(E.compare([62, 65], [74, 65], true).ok, false);   // one note in another octave is wrong
});
console.log(`EAR PIANO OK (${n})`);
