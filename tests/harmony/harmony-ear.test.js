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
        q.progs[0].forEach((t, j) => assert.equal(q.answer[2 * j], H.syllable(H.parse(t).pcs[q.invs[0][j]], q.mode), "bass step"));
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
console.log("harmony-ear: ok,", n, "questions");
