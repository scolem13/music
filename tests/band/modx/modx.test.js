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
assert.equal(M.routed("piano", ctx), false, "piano not routed");
assert.equal(M.routed("bass", new OfflineAudioContext()), false, "renders never go out");
M.force("piano", "modx"); assert.equal(M.routed("piano", ctx), true); M.force("piano", null);

M.play("bass", { midi: 40, vel: 1, dur: 0.5 }, 0, ctx);
assert.deepEqual(sent.map(s => s.b), [[0x90, 40, 127]], "note-on now on channel 1; the off waits in the queue");
T += 400; M._flush();
assert.deepEqual(sent[1].b, [0x80, 40, 0]); assert.equal(Math.round(sent[1].ts), 1500, "off stamped at 0.5 s");

sent.length = 0; M.play("kit", { piece: "snare", vel: 0.5 }, 0, ctx);
assert.deepEqual(sent[0].b, [0x99, 38, 64], "snare = GM 38 on channel 10");
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
