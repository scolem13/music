// Tonal pattern generator (apps/patterns/pattern-gen.js): every note read back from the ABC (through abc-core, key signature and
// earlier accidentals included) is a tone of its chord; lengths, count, no duplicates, leaps, span, opening and closing on the tonic.
// Run: node tests/patterns/pattern-gen.test.js
const assert = require("assert");
const G = require("../../apps/patterns/pattern-gen.js"), C = require("../../apps/shared/abc-core.js");
let n = 0; const ok = (name, fn) => { fn(); n++; console.log("ok  ", name); };

ok("chords spell as expected", () => {
  const s = (t, m, k) => G.chord(t, m, k).sym;
  assert.strictEqual(s("V7/V", "major"), "D7"); assert.strictEqual(s("iiø7", "minor"), "Dm7b5");
  assert.strictEqual(s("i7", "minor"), "Cm7"); assert.strictEqual(s("V7", "minor"), "G7");
  assert.strictEqual(s("vii°7", "minor"), "Bdim7"); assert.strictEqual(s("♭VII", "major"), "Bb");
  assert.strictEqual(s("bVII", "major"), "Bb"); assert.strictEqual(s("VII", "minor"), "Bb");
  assert.strictEqual(s("vii°7/V", "major"), "F#dim7"); assert.strictEqual(s("Imaj7", "major"), "Cmaj7");
  assert.strictEqual(s("A7", "minor"), "A7"); assert.strictEqual(s("V", "major", "D"), "A");
  assert.throws(() => G.chord("Xyz", "major"), /Can't read/);
});

// Read a pattern's notes back as MIDI the way a reader of the ABC would.
function readBack(tune) {
  const ksig = C.keyAccidentals(/^K:\s*(.+)$/m.exec(tune)[1]), state = {};
  const body = /\[V: V1\](.*)/.exec(tune)[1].replace(/"[^"]*"/g, "");
  return [...body.matchAll(/(\^\^|\^|__|_|=)?([A-Ga-g])([,']*)0/g)].map(m => {
    const acc = m[1] === undefined ? undefined : { "^^": 2, "^": 1, "__": -2, "_": -1, "=": 0 }[m[1]];
    const oct = 12 * ((m[3].match(/'/g) || []).length - (m[3].match(/,/g) || []).length);
    return C.noteMidi({ letter: m[2], oct, acc }, ksig, state);
  });
}

const SPECS = [
  { chords: "i7, V7, iiø7", mode: "minor" }, { chords: "I, V7, V7/V", mode: "major" }, { chords: "[I, V7]", mode: "major" },
  { chords: "i, V7", mode: "minor", tonic: "D" }, { chords: "i, iv, V7", mode: "minor", tonic: "D" }, { chords: "i, VII", mode: "dorian", tonic: "D", sizes: [2, 3, 4, 5], count: 12, order: "mixed" },
  { chords: "I, VII, IV", mode: "mixolydian", tonic: "G", sizes: [2, 3, 4, 5], count: 12, order: "mixed" },
  { chords: "I, IV, V7, vi, ii7, vii°7/V", mode: "major", count: 24 }, { chords: "Bb, F7, Cm", mode: "major", tonic: "Bb" },
];
ok("every set keeps the rules (9 specs × 20 seeds)", () => {
  for (const spec of SPECS) for (let seed = 1; seed <= 20; seed++) {
    const o = Object.assign({ seed }, spec), r = G.generate(o), sizes = o.sizes || [2, 3], count = o.count || 16, where = JSON.stringify(o);
    const tunes = r.abc.trim().split(/\n\s*\n/);
    assert.strictEqual(tunes.length, count, where); assert.strictEqual(r.patterns.length, count, where);
    const key = G.makeKey(o.tonic || "C", o.mode), tonicPc = key.tonicMidi % 12, first = G.chord(o.chords.replace(/[\[\]]/g, "").split(/[,\s]+/)[0], o.mode, o.tonic);
    const seen = new Set();
    tunes.forEach((t, i) => {
      const p = r.patterns[i], midi = readBack(t), ch = G.chord(p.chord, o.mode, o.tonic), pcs = ch.tones.map(x => (12 + [0, 2, 4, 5, 7, 9, 11][x.l] + x.a) % 12);
      assert.deepStrictEqual(midi, p.notes.map(x => x.midi), where + " pattern " + (i + 1) + " reads back as written");
      midi.forEach(m => assert(pcs.includes(m % 12), `${where} #${i + 1}: ${m} not in ${p.sym}`));
      assert(sizes.includes(midi.length), where);
      for (let j = 1; j < midi.length; j++) { const d = Math.abs(midi[j] - midi[j - 1]); assert(d > 0 && d <= 8, `${where} #${i + 1} leap ${d}`); }
      assert(Math.max(...midi) - Math.min(...midi) <= 12, where);
      assert(!seen.has(midi.join()), `${where} duplicate #${i + 1}`); seen.add(midi.join());
      assert.strictEqual(p.solfege.split(" ").length, midi.length);
    });
    assert.strictEqual(r.patterns[0].sym, first.sym, where + " opens on the first chord");
    assert.strictEqual(r.patterns[0].notes[0].midi % 12, tonicPc, where + " opens on the tonic");
    const last = r.patterns[count - 1];
    assert.strictEqual(last.sym, first.sym, where + " closes on the first chord");
    assert.strictEqual(last.notes[last.notes.length - 1].midi % 12, tonicPc, where + " closes on the tonic");
    if (!o.order || o.order === "blocks") for (let j = 1; j < count; j++) assert(r.patterns[j].notes.length <= r.patterns[j - 1].notes.length, where + " longest first");
  }
});

ok("solfège follows the hand-written sets", () => {
  const r = G.generate({ chords: "i, V7", mode: "minor", tonic: "D", seed: 2 });
  assert.strictEqual(r.key, "Dm");
  const all = r.patterns.flatMap(p => p.notes.map(x => x.solfege + ":" + x.midi % 12));
  assert(all.includes("La:2") && all.some(s => s === "Si:1"), all.join(" "));   // D = La, C# = Si
  const d = G.generate({ chords: "I, V7/V", mode: "major", seed: 1 }).patterns.flatMap(p => p.notes.map(x => x.solfege + ":" + x.midi % 12));
  assert(d.includes("Fi:6"), d.join(" "));
  const dor = G.generate({ chords: "i, VII", mode: "dorian", tonic: "D", seed: 1 });
  assert.strictEqual(dor.key, "Ddor"); assert(/w: Re/.test(dor.abc));
});

ok("same seed, same set; bad input says why", () => {
  assert.strictEqual(G.generate({ chords: "I, V7", seed: 5 }).abc, G.generate({ chords: "I, V7", seed: 5 }).abc);
  assert.throws(() => G.generate({ chords: "I, Q7" }), /Can't read/);
  assert.throws(() => G.generate({ chords: "I", sizes: [] }), /length/);
});
ok("progression and voice leading, as in the hand-written sets", () => {
  const PC = c => (12 + [0, 2, 4, 5, 7, 9, 11][c.l] + c.a) % 12;
  let joins = 0, near = 0, sev = 0, sevOk = 0;
  for (const spec of [{ chords: "I, V7, V7/V", mode: "major" }, { chords: "i7, V7, iiø7", mode: "minor" }, { chords: "i, iv, V7", mode: "minor", tonic: "D" }])
    for (let seed = 1; seed <= 20; seed++) {
      const ps = G.generate(Object.assign({ seed }, spec)).patterns;
      for (let i = 1; i < ps.length; i++) {
        const a = G.chord(ps[i - 1].chord, spec.mode, spec.tonic), b = G.chord(ps[i].chord, spec.mode, spec.tonic);
        if (a.fn === "S") assert.strictEqual(PC(b.root), a.to, `${ps[i - 1].chord} goes to its target, not ${ps[i].chord}`);
        assert(!(a.fn === "D" && b.fn === "P"), `no ${ps[i - 1].chord} -> ${ps[i].chord}`);
        const l = ps[i - 1].notes[ps[i - 1].notes.length - 1].midi, f = ps[i].notes[0].midi;
        joins += Math.abs(f - l); if (Math.abs(f - l) <= 2) near++;
        if (ps[i - 1].chord !== ps[i].chord && a.tones[3] && PC(a.tones[3]) === l % 12) { sev++; if (f - l === -1 || f - l === -2) sevOk++; }
      }
    }
  const total = 3 * 20 * 15;
  assert(joins / total <= 2, "mean join " + (joins / total).toFixed(2));
  assert(near / total >= 0.75, "joins by step or same note " + near + "/" + total);
  assert(sev > 20 && sevOk / sev >= 0.75, "7ths falling by step " + sevOk + "/" + sev);
});
ok("rock style: ♭VII goes to IV or home, IV goes home, V never to ♭VII", () => {
  const moves = {};
  let style;
  for (let seed = 1; seed <= 20; seed++) {
    const r = G.generate({ chords: "I IV V bVII", mode: "major", seed }); style = r.style;
    r.patterns.forEach((p, i) => { if (i) { const k = r.patterns[i - 1].chord + ">" + p.chord; moves[k] = (moves[k] || 0) + 1; } });
  }
  assert.strictEqual(style, "rock");
  assert(moves["♭VII>IV"] > 10 && moves["IV>I"] > 5 && moves["V>IV"] > 5, JSON.stringify(moves));
  assert(!moves["V>♭VII"] && !moves["♭VII>V"], JSON.stringify(moves));
  assert.strictEqual(G.generate({ chords: "I IV V7", seed: 1 }).style, "classical");
  assert.strictEqual(G.generate({ chords: "I IV V7", seed: 1, style: "rock" }).style, "rock");
});
console.log(`PATTERN GEN OK (${n})`);
