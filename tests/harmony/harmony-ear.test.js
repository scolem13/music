// node tests/harmony/harmony-ear.test.js — the pure parts of apps/patterns/harmony-ear.js
const assert = require("assert");
global.SATB = require("../../apps/shared/satb.js") && globalThis.SATB;
const H = require("../../apps/patterns/harmony-ear.js");
const pcs = t => H.parse(t).pcs.join(",");
assert.equal(pcs("I"), "0,4,7"); assert.equal(pcs("V7"), "7,11,2,5"); assert.equal(pcs("ii7"), "2,5,9,0");
assert.equal(pcs("bVII"), "10,2,5"); assert.equal(pcs("viiø7"), "11,2,5,9"); assert.equal(pcs("viio7"), "11,2,5,8");
assert.equal(pcs("V7/V"), "2,6,9,0"); assert.equal(pcs("bII7"), "1,5,8,11"); assert.equal(pcs("iio"), "2,5,8");
assert.equal(H.fn("IV"), "Subdominant"); assert.equal(H.fn("bVII"), "Subtonic"); assert.equal(H.fn("V7/ii"), "Secondary dominant");
assert.equal(H.syllable(0, "minor"), "La"); assert.equal(H.syllable(7, "major"), "So"); assert.equal(H.syllable(0, "dorian"), "Re");
assert.equal(H.syllable(10, "mixolydian"), "Fa");
assert.equal(H.figured("I", 1), "I6"); assert.equal(H.figured("I", 2), "I64"); assert.equal(H.figured("V7", 1), "V65");
assert.equal(H.figured("V7", 2), "V43"); assert.equal(H.figured("V7", 3), "V42"); assert.equal(H.figured("ii7", 3), "ii42"); assert.equal(H.figured("V7/V", 1), "V65/V");
// spelled syllables: raised for secondary dominants, lowered for borrowed chords
assert.equal(H.spelledSyl("V7/V", 1, "major"), "Fi"); assert.equal(H.spelledSyl("V7/ii", 1, "major"), "Di"); assert.equal(H.spelledSyl("V7", 1, "minor"), "Si");
assert.equal(H.spelledSyl("bVII", 0, "major"), "Te"); assert.equal(H.spelledSyl("bVI", 0, "major"), "Le"); assert.equal(H.spelledSyl("iv", 1, "major"), "Le");
assert.equal(H.spelledSyl("bVII", 0, "mixolydian"), "Fa"); assert.equal(H.spelledSyl("i", 0, "dorian"), "Re"); assert.equal(H.spelledSyl("bII", 0, "minor"), "Te");
for (const x of ["Fi", "Di", "Si", "Te", "Le", "Ra"]) assert.notEqual(H.sylToRel(x, "major"), null, x);
let n = 0;
for (const p of H.PATHS) for (const lv of p.levels) {
  for (const m of lv.modes) {
    const set = H.modeSet(lv, m, { len: 4 });
    assert.ok(set.pool.length, lv.id + " pool");
    for (const pr of set.progs) for (const t of pr) {
      assert.ok(H.parse(t), lv.id + " bad token " + t);
      assert.ok(set.pool.includes(t), lv.id + " " + m + ": " + t + " is not among the answer buttons");
    }
  }
  for (const k of H.KINDS) {
    if (k.id === "mode" && lv.modes.length < 2) continue;
    for (let i = 0; i < 20; i++) {
      const q = H.question(lv, k.id, { len: 4, inv: ["off", "some", "many"][i % 3], invDetail: i % 2 ? "member" : "root" });
      q.answer.forEach((a, j) => { const ch = q.slots ? q.slots[j].choices : q.choices; assert.ok(ch.includes(a), `${p.id}/${lv.id}/${k.id}: answer ${a} not in ${ch}`); });
      if (k.id === "inv") {
        assert.equal(q.answer.length, q.progs[0].length * 2);
        if (q.progs[0].length > 1) assert.ok(q.invs[0].some(x => x), "inv question has an inverted chord");
        q.progs[0].forEach((t, j) => assert.equal(H.sylToRel(q.answer[2 * j], q.mode), H.parse(t).pcs[q.invs[0][j]], "bass step names the bass"));
      }
      for (const v of [3, 4]) for (const pr of q.progs) {
        const iv = q.invs[q.progs.indexOf(pr)], vs = H.voice(pr, 5, { voices: v, inv: iv });
        vs.forEach((c, j) => {
          assert.equal(c.upper.length, v - 1, `${lv.id} ${pr[j]} voices`);
          const want = H.parse(pr[j]).pcs.map(x => (x + 5) % 12);
          assert.equal(((c.bass % 12) + 12) % 12, want[iv[j]], `${lv.id} ${pr[j]} inv ${iv[j]}: the right bass`);
          if (iv[j] && want.length === 4) assert.ok(c.upper.every(m => m % 12 !== want[iv[j]]) || v === 4, "seventh-chord inversion: bass tone not doubled in 3 voices");
          c.upper.forEach(m => assert.ok(want.includes(m % 12), `${lv.id} ${pr[j]}: ${m} not a chord tone`));
          assert.ok(c.upper.every(m => m >= c.bass), "upper not below bass");
        });
      }
      n++;
    }
  }
}
// close and open spacing: upper voices within an octave, or wider
for (const toks of [["I", "IV", "V7", "I"], ["i", "iv", "V7", "i"], ["Imaj7", "vi7", "ii7", "V7"]]) for (const v of [3, 4]) {
  const close = H.voice(toks, 2, { voices: v, spacing: "close" }), open = H.voice(toks, 2, { voices: v, spacing: "open" });
  close.forEach(c => assert.ok(c.upper[c.upper.length - 1] - c.upper[0] <= 12, "close " + c.upper));
  open.forEach(c => assert.ok(c.upper[c.upper.length - 1] - c.upper[0] > 12, "open " + c.upper));
  close.concat(open).forEach((c, i) => assert.equal(c.bass % 12, c.pcs[0], "root in the bass"));
}
// notation: spelled from the numeral, key signature of DO, no stray bars
{ const t = ["i", "iv", "V7", "i"], abc = H.toAbc([t], [H.voice(t, 9, { voices: 4, own: true })], [[0, 0, 0, 0]], { restPc: 9, mode: "minor", numerals: true });
  assert.ok(/K:C\n/.test(abc) && /\^G/.test(abc) && /"_V7"/.test(abc) && !/\| \|\]/.test(abc), abc);
  const m = ["I", "bVII", "I"], abc2 = H.toAbc([m], [H.voice(m, 2, { voices: 3 })], [[0, 0, 0]], { restPc: 2, mode: "mixolydian" });
  assert.ok(/K:G\n/.test(abc2) && !/[_^=]C|[_^=]c/.test(abc2), "bVII in D Mixolydian is C natural, in the signature: " + abc2);
  const e = ["I", "V7/V", "V7", "I"], abc3 = H.toAbc([e], [H.voice(e, 0, { voices: 4, own: true })], [[0, 0, 0, 0]], { restPc: 0, mode: "major" });
  assert.ok(/\^F/.test(abc3), "V7/V in C has F#: " + abc3); }
console.log("harmony-ear: ok,", n, "questions");
