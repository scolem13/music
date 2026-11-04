// node tests/band/modx/modx.test.js — modx.js against a fake MIDI port: channels, drum map, note-offs, the queue, bends, Stop, renders.
const assert = require("assert");
let T = 1000; global.performance = { now: () => T };
const store = {}; global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
global.setInterval = () => 1; global.clearInterval = () => {};
class OfflineAudioContext {} global.OfflineAudioContext = OfflineAudioContext;
require("../../../apps/shared/band/modx.js");
const M = global.BandModx, sent = [];
M._setOutput({ send: (b, ts) => sent.push({ b: Array.from(b), ts }) });
const ctx = { currentTime: 0, getOutputTimestamp: () => ({ contextTime: 0, performanceTime: T }) };

assert.equal(M.routed("bass", ctx), false, "off until switched on");
M.cfg.on = true; M.cfg.routes.bass.on = true; M.cfg.routes.kit.on = true;
assert.equal(M.routed("bass", ctx), true);
assert.equal(M.routed("organ", ctx), false, "church organ not routed by default");
assert.equal(M.routed("piano", ctx), true, "piano routed by default (Sean's Performance)");
assert.equal(M.routed("bass", new OfflineAudioContext()), false, "renders never go out");
M.force("organ", "modx"); assert.equal(M.routed("organ", ctx), true); M.force("organ", null);
M.force("piano", "site"); assert.equal(M.routed("piano", ctx), false, "forced to the site"); M.force("piano", null);

M.play("bass", { midi: 40, vel: 1, dur: 0.5 }, 0, ctx);
assert.deepEqual(sent.map(s => s.b), [[0x90, 40, 127]], "note-on now on channel 1; the off waits in the queue");
T += 400; M._flush();
assert.deepEqual(sent[1].b, [0x80, 40, 0]); assert.equal(Math.round(sent[1].ts), 1500, "off stamped at 0.5 s");

sent.length = 0; M.play("kit", { piece: "snare", vel: 0.5 }, 0, ctx);
assert.deepEqual(sent[0].b, [0x9C, 38, 64], "snare = GM 38 on the jazz kit, channel 13 (no groove)");
// the kit by groove: rock -> 14, dance -> 15, funk -> 16, brushes -> 12 on the Brush Kit's own keys; a blend takes its first
for (const [g, ch] of [["rock", 14], ["dance", 15], ["funk+rock", 16], ["bossa", 13]]) { sent.length = 0; M.play("kit", { piece: "kick", vel: 0.5, groove: g }, 0, ctx);
  assert.deepEqual(sent[0].b, [0x90 | (ch - 1), 36, 64], g + " kick on channel " + ch); }
sent.length = 0; M.play("kit", { piece: "brushSweep", vel: 0.5, groove: "rock" }, 0, ctx);
assert.deepEqual(sent[0].b, [0x9B, 26, 64], "a brush sweep goes to the Brush Kit (ch 12) on D0 = 26 whatever the groove");
sent.length = 0; M.cfg.routes.congas.on = true; M.play("congas", { piece: "congaOpen", vel: 0.5 }, 0, ctx);
assert.deepEqual(sent[0].b, [0x98, 36, 64], "conga open tone on the Pop Latin Kit, ch 9, C1 = 36");
assert.equal(M.play("kit", { piece: "nosuch" }, 0, ctx), null);

// the same key twice: released only when the last one lets go
sent.length = 0; T = 5000;
M.play("bass", { midi: 45, dur: 0.3 }, 0, ctx); M.play("bass", { midi: 45, dur: 0.1 }, 0.1, ctx);
T += 1000; M._flush();
assert.deepEqual(sent.filter(s => s.b[0] === 0x80).length, 1, "one note-off for two overlapping notes");

// later notes wait and Stop takes them back
sent.length = 0; T = 9000;
M.play("bass", { midi: 50, dur: 1 }, 2, ctx);
assert.equal(sent.length, 0, "2 s ahead: still queued");
M.stop(); T += 3000; M._flush();
assert.ok(!sent.some(s => s.b[0] === 0x90), "stopped before it left");
assert.ok(sent.some(s => s.b[0] === 0xB0 && s.b[1] === 123), "all notes off sent");

// offset moves everything
sent.length = 0; T = 20000; M.cfg.offsetMs = 40;
M.play("bass", { midi: 41, dur: 0.2 }, 0, ctx); assert.equal(Math.round(sent[0].ts), 20040); M.cfg.offsetMs = 0;

// bend: up 2 semitones = full scale, back to the centre after the note
sent.length = 0; T = 30000;
M.play("bass", { midi: 41, dur: 0.2, bend: [[0, 0], [0.05, 2]] }, 0, ctx); T += 1000; M._flush();
const pb = sent.filter(s => (s.b[0] & 0xF0) === 0xE0);
assert.ok(pb.some(s => s.b[1] === 127 && s.b[2] === 127), "reaches +2"); assert.deepEqual(pb[pb.length - 1].b, [0xE0, 0, 64], "recentred");

// swell and leslie on a routed organ
M.cfg.routes.hammond.on = true; sent.length = 0;
M.control("hammond", "swell", 0.5, 0, ctx); M.control("hammond", "leslie", "fast", 0, ctx);
assert.deepEqual(sent.map(s => s.b), [[0xB2, 11, 64], [0xB2, 1, 127]]);

// performance select
sent.length = 0; M.selectPerformance(); assert.deepEqual(sent.map(s => s.b), [[0xB0, 0, 63], [0xB0, 32, 32], [0xC0, 0]]);
M.save(); assert.equal(store["modx.on"], "1");
console.log("modx.test: ok");
// shift and velocity range per instrument
{ const sent2 = []; M._setOutput({ send: (b, ts) => sent2.push(Array.from(b)) });
  M.cfg.routes.bass.shift = 12; M.play("bass", { midi: 28, vel: 1 }, 0, ctx); assert.equal(sent2[0][1], 40, "bass shifted an octave up");
  M.cfg.routes.bass.shift = 0; M.cfg.routes.bass.velLo = 40; M.cfg.routes.bass.velHi = 120; sent2.length = 0;
  M.play("bass", { midi: 28, vel: 0 }, 0, ctx); assert.equal(sent2.length, 0, "a silent note stays silent");
  M.play("bass", { midi: 28, vel: 0.5 }, 0, ctx); assert.equal(sent2[0][2], 80, "vel 0.5 -> halfway between 40 and 120");
  M.play("bass", { midi: 28, vel: 1 }, 0, ctx); assert.equal(sent2.filter(b => (b[0] & 0xF0) === 0x90)[1][2], 120, "full -> 120");
  M.cfg.routes.kit.shift = 12; sent2.length = 0; M.play("kit", { piece: "snare", vel: 0.5 }, 0, ctx); assert.equal(sent2[0][1], 38, "drums are never shifted");
  M.cfg.routes.kit.shift = 0; M.cfg.routes.bass.velLo = 1; M.cfg.routes.bass.velHi = 127; }
// the loader in sounds.js asks for the same modx.js version as the pages
{ const fs = require("fs"), path = require("path"), root = path.join(__dirname, "../../..");
  const loader = +/var MODX_V = (\d+)/.exec(fs.readFileSync(root + "/apps/shared/band/sounds.js", "utf8"))[1];
  const page = +/band\/modx\.js\?v=(\d+)/.exec(fs.readFileSync(root + "/gear/modx.qmd", "utf8"))[1];
  assert.equal(loader, page, "sounds.js MODX_V (" + loader + ") = the pages' modx.js?v= (" + page + ")"); }
console.log("modx.test: shift, velocity and loader version ok");
// old saved settings (before the five kits): drums and congas take today's defaults; the rest is kept
{ const vm = require("vm"), fs = require("fs"), path = require("path");
  const old = { on: true, offsetMs: 30, routes: { bass: { on: true, ch: 1 }, piano: { on: false, ch: 2 }, kit: { on: false, ch: 10 }, congas: { on: false, ch: 11 } }, congas: { congaOpen: 63 } };
  const store2 = { "modx.cfg": JSON.stringify(old) }, g = { performance: { now: () => 0 }, setInterval: () => 1, clearInterval: () => {}, console,
    localStorage: { getItem: k => store2[k] ?? null, setItem: (k, v) => { store2[k] = String(v); } } };
  g.globalThis = g; vm.createContext(g); vm.runInContext(fs.readFileSync(path.join(__dirname, "../../../apps/shared/band/modx.js"), "utf8").replace("typeof window !== \"undefined\" ? window : globalThis", "globalThis"), g);
  const c = g.BandModx.cfg;
  assert.equal(c.routes.kit.on, true, "drums on the MODX after the update"); assert.equal(c.routes.congas.ch, 9, "congas to the Pop Latin Kit");
  assert.equal(c.congas.congaOpen, 36, "conga keys of the Pop Latin Kit"); assert.equal(c.routes.piano.on, false, "the piano choice kept");
  assert.equal(c.offsetMs, 30, "offset kept"); assert.equal(c.ver, 2);
  console.log("modx.test: old settings updated"); }
