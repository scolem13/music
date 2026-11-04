// node tests/band/modx/modx-perc.test.js — the percussion auditions: every key a pattern plays is on every kit it is offered
// for, every bar has `steps` cells, note names follow Yamaha (C3 = 60), and the raw-note call reaches the port. NEG=1 must fail.
const assert = require("assert");
let T = 1000; global.performance = { now: () => T };
const store = {}; global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
global.setInterval = () => 1; global.clearInterval = () => {};
require("../../../apps/shared/band/modx.js");
require("../../../apps/shared/band/modx-perc.js");
const P = global.ModxPerc, M = global.BandModx;
if (process.env.NEG) P.PATTERNS[0].parts["C9"] = "x.......|........";

assert.equal(P.midi("C3"), 60); assert.equal(P.midi("C1"), 36); assert.equal(P.midi("C0"), 24); assert.equal(P.midi("A#0"), 34);
assert.equal(P.KITS[9].keys["C1"], "Conga1 Hi Open 1-2");
for (const ch of [9, 10, 11, 12]) assert.equal(Object.keys(P.KITS[ch].keys).length, 73, "73 keys on kit " + ch);
const ids = new Set();
for (const p of P.PATTERNS) {
  assert(!ids.has(p.id), "duplicate id " + p.id); ids.add(p.id);
  assert(p.steps % p.beats === 0, p.id + ": steps not a whole number per beat");
  let bars = null;
  for (const [key, cells] of Object.entries(p.parts)) {
    assert(P.midi(key) != null, p.id + ": bad key " + key);
    for (const ch of p.chs) assert(P.KITS[ch].keys[key], p.id + ": " + key + " is not on " + P.KITS[ch].name);
    const bs = cells.split("|");
    bs.forEach((b, i) => { assert.equal(b.length, p.steps, p.id + " " + key + " bar " + (i + 1) + " has " + b.length + " cells"); assert(/^[Xxog.\-]+$/.test(b), p.id + " " + key + ": bad cell"); });
    assert(bars == null || bars === bs.length, p.id + " " + key + ": " + bs.length + " bars, others " + bars); bars = bs.length;
    assert(cells[0] !== "-", p.id + " " + key + ": starts with a hold");
  }
  assert(P.parse(p).hits.length > 0, p.id + ": no hits");
}
const sent = []; M._setOutput({ send: (b, ts) => sent.push({ b: Array.from(b), ts }) });
M.note(9, P.midi("C1"), 1, T, 100);
assert.deepEqual(sent[0].b, [0x98, 36, 127], "note-on on channel 9");
console.log("modx-perc.test: ok (" + P.PATTERNS.length + " patterns)");
