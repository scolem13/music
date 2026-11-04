// node tests/band/modx/modx-perc.test.js — the percussion auditions: every key a pattern plays is on every kit it is offered
// for (slot patterns: on every kit in ModxKits, with the General MIDI role the page shows), every bar of every row has its
// grid's cells, note names follow Yamaha (C3 = 60), swing and nudges land where they should, and the raw-note call reaches the port.
// NEG=1 must fail.
const assert = require("assert");
let T = 1000; global.performance = { now: () => T };
const store = {}; global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
global.setInterval = () => 1; global.clearInterval = () => {};
require("../../../apps/shared/band/modx.js");
require("../../../apps/shared/band/modx-kits.js");
require("../../../apps/shared/band/modx-perc.js");
const P = global.ModxPerc, M = global.BandModx, K = global.ModxKits;
if (process.env.NEG) P.PATTERNS.find(p => p.id === "rock8").parts["G#1"] = "x.......|........";

assert.equal(P.midi("C3"), 60); assert.equal(P.midi("C1"), 36); assert.equal(P.midi("C0"), 24); assert.equal(P.midi("A#0"), 34); assert.equal(P.midi("F#1/32"), 42);
assert.equal(P.KITS[9].keys["C1"], "Conga1 Hi Open 1-2");
for (const ch of [9, 10, 11, 12]) assert.equal(Object.keys(P.KITS[ch].keys).length, 73, "73 keys on kit " + ch);
assert.equal(Object.keys(K).length, 32, "32 kits for the slots");
// what each role's wave names must look like, on every kit
const ROLE_RE = { B0: /Bd|Kick/, C1: /Bd|Kick/, "C#1": /Rim|Stick|Sd/, D1: /Sd|Snare|Snap/, "D#1": /Clap|Sd/, "F#1": /(HH|HiHat).*(Cl|Closed)/, "A#1": /(HH|HiHat).*Open/,
  F1: /Tom/, G1: /Tom/, A1: /Tom/, B1: /Tom/, C2: /Tom/, D2: /Tom/, "C#2": /Crash/, "D#2": /Ride/, "F#2": /Tambourine/ };
// kits whose tom keys play something else (said on the tom-fill card and in modx-kits.js)
const NO_TOMS = ["Hip Hop Kit 4", "R&B Kit 1", "R&B Kit 3"];
const ids = new Set();
for (const p of P.PATTERNS) {
  assert(!ids.has(p.id), "duplicate id " + p.id); ids.add(p.id);
  assert(p.steps % p.beats === 0, p.id + ": steps not a whole number per beat");
  const slot = typeof p.chs[0] === "string";
  let bars = null;
  for (const [part, cells] of Object.entries(p.parts)) {
    const key = P.keyOf(part), n = P.stepsOf(p, part);
    assert(P.midi(key) != null, p.id + ": bad key " + key);
    if (slot) {
      assert(ROLE_RE[key], p.id + ": " + key + " has no checked role (G#1 differs between kits)");
      for (const [kit, keys] of Object.entries(K)) if (!(/Tom/.test(String(ROLE_RE[key])) && NO_TOMS.includes(kit))) assert(ROLE_RE[key].test(keys[key] || ""), p.id + ": " + key + " on " + kit + " is " + keys[key]);
    } else for (const ch of p.chs) assert(P.KITS[ch].keys[key], p.id + ": " + key + " is not on " + P.KITS[ch].name);
    const bs = cells.split("|");
    bs.forEach((b, i) => { assert.equal(b.length, n, p.id + " " + part + " bar " + (i + 1) + " has " + b.length + " cells, not " + n); assert(/^[Xxog.\-]+$/.test(b), p.id + " " + part + ": bad cell"); });
    assert(bars == null || bars === bs.length, p.id + " " + part + ": " + bs.length + " bars, others " + bars); bars = bs.length;
    assert(cells[0] !== "-", p.id + " " + part + ": starts with a hold");
  }
  const parsed = P.parse(p);
  assert(parsed.hits.length > 0, p.id + ": no hits");
  parsed.hits.forEach(x => assert(x.t >= 0 && x.t < parsed.beats, p.id + ": hit outside the loop at " + x.t));
}
// swing: boom bap's second hat of each beat (unit 2 sixteenths) comes 0.08 × 2 × 2 × 0.25 = 0.08 beats late (at 0.58 of the beat); nudge in ms
const bb = P.parse(P.PATTERNS.find(p => p.id === "boombap")).hits.filter(x => x.key === "F#1");
assert(Math.abs(bb[1].t - 0.58) < 1e-9 && bb[0].t === 0, "boom bap swing: " + bb[1].t);
const ns = P.parse(P.PATTERNS.find(p => p.id === "neosoul")).hits;
assert.equal(ns.find(x => x.key === "D1").ms, -14); assert(Math.abs(ns.filter(x => x.key === "F#1")[1].t - 0.30) < 1e-9, "neo-soul hat swing");
// the trap rolls: 24 and 32 to the bar
const tr = P.parse(P.PATTERNS.find(p => p.id === "trap")).hits.filter(x => x.key === "F#1");
assert(tr.some(x => Math.abs(x.t - 3) < 1e-9) && tr.some(x => Math.abs(x.t - (3 + 1 / 6)) < 1e-9), "triplet roll on beat 4");
assert(tr.some(x => Math.abs(x.t - (4 + 3.5)) < 1e-9), "32nd roll in bar 2 at beat 4 and a half");
const sent = []; M._setOutput({ send: (b, ts) => sent.push({ b: Array.from(b), ts }) });
M.note(9, P.midi("C1"), 1, T, 100);
assert.deepEqual(sent[0].b, [0x98, 36, 127], "note-on on channel 9");
console.log("modx-perc.test: ok (" + P.PATTERNS.length + " patterns, " + Object.keys(K).length + " kits)");
