// Bass Lines by Ear, pure part: every level and style makes questions; "different" lines differ, "same" lines do not;
// notes stay in range and inside the excerpt; the bass sits on each chord's bass note at each change (unless the question moved it).
// Run: node tests/bass-ear/bass-ear.test.js
const assert = require("assert"), path = require("path");
global.BassEarTunes = require(path.join(__dirname, "../../apps/patterns/bass-ear-tunes.js"));
const B = require(path.join(__dirname, "../../apps/patterns/bass-ear.js"));
let n = 0; const ok = (name, fn) => { fn(); n++; console.log("ok  ", name); };
const rnd = B.rng(12345);
ok("corpus: three tiers, each tune parsed", () => {
  const T = global.BassEarTunes; assert(T.length > 60);
  [1, 2, 3].forEach(t => assert(T.filter(x => x.tier === t).length >= 20, "tier " + t));
  T.forEach(t => { assert(t.ch.length >= 2 && t.mel.length % 3 === 0, t.id); });
});
ok("slots: changes ⊂ macro ⊂ beats; macrobeats follow the meter", () => {
  const t = global.BassEarTunes.find(x => x.n === 4 && x.d === 4);
  const c = B.slots(t, { bars: 4, density: "changes" }), m = B.slots(t, { bars: 4, density: "macro" }), b = B.slots(t, { bars: 4, density: "beats" });
  c.forEach(x => assert(m.includes(x) && b.includes(x)));
  assert(m.includes(2) && !m.includes(1) && b.includes(1));
  const s68 = global.BassEarTunes.find(x => x.n === 6); if (s68) assert(B.slots(s68, { bars: 2, density: "macro" }).includes(1.5));
});
for (const style of Object.keys(B.STYLES)) for (const lv of B.LEVELS) for (const dens of ["level", "changes", "bars", "chance"]) {
  ok(`${style} / level ${lv.id} / ${dens}`, () => {
    let diff = 0, same = 0;
    for (let i = 0; i < 25; i++) {
      const q = B.question(lv, { style, density: dens, bars: 4 + (i % 2) * 4 }, rnd); assert(q, "made a question");
      const end = q.base.bars * q.tune.bq;
      [q.a, q.b].forEach(l => l.forEach(x => { assert(x.midi >= 28 && x.midi <= 55, "range " + x.midi); assert(x.t >= 0 && x.t < end && x.dur > 0); }));
      if (q.same) { same++; assert(B.sameLine(q.a, q.b)); } else { diff++; assert(!B.sameLine(q.a, q.b), q.diff.text); assert(q.diff.text); }
      // anchors: the chord's bass note at each change, in the first line (classical may use a first inversion)
      q.a.filter(x => x.kind === "anchor").forEach(x => {
        const c = q.tune.ch[x.ci]; assert.strictEqual(((x.midi % 12) + 12) % 12, c[3], q.tune.id + " " + c[1]);
      });
    }
    assert(diff > 0 && same > 0);
  });
}
ok("level 2 differences are a different root on one chord only", () => {
  for (let i = 0; i < 30; i++) {
    const q = B.question(B.level("2"), { style: "rock", forceSame: false }, rnd);
    const d = q.a.filter((x, k) => x.midi !== q.b[k].midi); assert(d.length >= 1 && d.length <= 3, d.length);
  }
});
ok("walking levels: one note moves by a step (7) or a semitone (8)", () => {
  for (let i = 0; i < 30; i++) for (const id of ["7", "8"]) {
    const q = B.question(B.level(id), { style: "jazz", forceSame: false }, rnd);
    if (q.diff.kind !== "step" && q.diff.kind !== "semi") continue;
    const d = q.a.map((x, k) => q.b[k].midi - x.midi).filter(x => x); assert.strictEqual(d.length, 1);
    if (q.diff.kind === "semi") assert.strictEqual(Math.abs(d[0]), 1); else assert(Math.abs(d[0]) <= 2);
  }
});
ok("level 1: only chord roots, one a chord, whatever the style and Bass on", () => {
  for (const style of Object.keys(B.STYLES)) for (let i = 0; i < 30; i++) {
    const q = B.question(B.level("1"), { style, density: "beats" }, rnd);
    [q.a, q.b].forEach((l, k) => l.forEach(x => {
      const c = q.tune.ch[x.ci], m = (k ? q.alt : q.base).mods[x.ci];
      assert.strictEqual(((x.midi % 12) + 12) % 12, m && m.reharm ? m.reharm.root : c[2], q.tune.id + " " + c[1]);
    }));
    const changes = q.a.length; assert.strictEqual(new Set(q.a.map(x => x.ci)).size, changes, "one note a chord");
  }
});
global.window = global; require("../../apps/shared/abc-core.js"); const AE = require("../../apps/shared/abc-events.js");
ok("notation: every bar of both voices adds up to the meter (all tunes, every level)", () => {
  let k = 0;
  for (const lv of B.LEVELS) for (const t of global.BassEarTunes) {
    const bars = [2, 4, 8][k++ % 3], q = B.question(lv, { tune: t.id, style: ["jazz", "rock", "classical", "mlt"][k % 4], bars }, rnd);
    const abc = B.abc(q.tune, q.b, { bars, melody: true, tr: (k % 7) - 3, marks: { 0: true } });
    for (const v of ["1", "2"]) {
      const w = AE.fromAbc(abc, { voice: v }).written, per = new Array(bars).fill(0);
      w.forEach(e => { per[e.bar] += e.t_off - e.t_on; });
      per.forEach((d, b) => assert(Math.abs(d - t.bq) < 1e-6, `${t.id} voice ${v} bar ${b + 1}: ${d} quarters, not ${t.bq}\n${abc}`));
    }
  }
});
console.log(n, "passed");
