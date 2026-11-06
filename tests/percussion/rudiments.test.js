// Percussion rudiments (apps/shared/percussion/rudiments.js): every bar has the length its time signature says, the ABC has the same
// length (checked by counting the ABC's own durations), the hits come out in the right order and counts. Run: node tests/percussion/rudiments.test.js
// NEG=1 breaks a bar on purpose and must fail.
const assert = require("assert"), path = require("path");
const R = require(path.join(__dirname, "../../apps/shared/percussion/rudiments.js"));
const neg = !!process.env.NEG;
if (neg) R.byId("paradiddle").bars[0] = "R> L R R L> R L";   // one note short
const ids = new Set();
R.LIST.forEach(r => {
  assert(!ids.has(r.id), "duplicate id " + r.id); ids.add(r.id);
  const need = R.barLength(r), Lq = r.L.split("/").map(Number);
  r.bars.forEach((bar, bi) => {
    const n = R.parse(bar).reduce((a, t) => a + t.dur, 0);
    assert.strictEqual(n, need, `${r.id} bar ${bi + 1}: ${n} units, ${r.M} at L:${r.L} needs ${need}`);
    // an independent count from the ABC text
    const abc = R.abc(r).split("\n").pop().split("|")[bi];
    const body = abc.replace(/"[^"]*"/g, "").replace(/![^!]*!/g, "").replace(/\{[^}]*\}/g, "");
    let units = 0; (body.match(/[cz]\d*/g) || []).forEach(t => units += t.length > 1 ? +t.slice(1) : 1);
    assert.strictEqual(units, need, `${r.id} ABC bar ${bi + 1}: ${units} vs ${need}`);
  });
  assert(r.beam > 0 && need % r.beam === 0, r.id + " beam divides bar");
  assert(R.abc(r).includes("K:C clef=perc"));
});
// stickings: paradiddle alternates its lead hand; flam graces are the opposite hand
const pd = R.parse(R.byId("paradiddle").bars[0]).map(t => t.hand).join("");
assert.strictEqual(pd, "RLRRLRLL");
const fl = R.parse("lR4")[0]; assert.strictEqual(fl.graces, "l"); assert.strictEqual(fl.hand, "R");
R.LIST.filter(r => r.group === "Flams" || r.group === "Drags").forEach(r => R.parse(r.bars.join(" ")).forEach(t => {
  if (t.graces) assert(t.graces[t.graces.length - 1] !== t.hand.toLowerCase(), r.id + ": last grace is the other hand"); }));
// hits: flam = grace then main, grace earlier and softer; all times >= 0 and in order of the strokes
const h = R.hits(R.byId("flam"), 100);
assert.strictEqual(h.length, 4); assert.strictEqual(h[0].kind, "grace"); assert(h[0].vel < h[1].vel && h[0].t < h[1].t && h[0].t >= 0);
const d = R.hits(R.byId("drag"), 100); assert.strictEqual(d.filter(e => e.kind === "grace").length, 4);
const sp = R.hits(R.byId("single-stroke"), 120); assert(Math.abs(sp[1].t - sp[0].t - 60 / 120 * 0.25) < 1e-9, "16ths at 120");
assert(R.hits(R.byId("paradiddle"), 80, { loops: 3 }).length === 24);
assert(R.hits(R.byId("buzz"), 80).filter(e => e.kind === "bounce").length > 8, "buzz has bounces");
assert.strictEqual(R.hits(R.byId("five-stroke"), 90).filter(e => e.hand).length, 10);
console.log("rudiments: all ok" + (neg ? " (NEG should have failed!)" : ""));
