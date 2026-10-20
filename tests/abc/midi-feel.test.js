// node tests/abc/midi-feel.test.js — MidiFeel's grading on made-up takes of the reading-swing examples.
const assert = require("assert");
const F = require("../../apps/shared/midi-feel.js");
const H = "X:1\nM:4/4\nL:1/8\nK:F\n";
const BPM = 120, B = 500;
// play each expected note: swingPct for off-beats, vel(n) and len(n) (fraction of written), shift in beats, dms laid back
function take(abc, o) {
  o = Object.assign({ swing: 62, vel: () => 80, len: () => 0.9, shift: 0, dms: 0, skip: () => false }, o);
  const e = F.expected(H + abc);
  return { e, p: e.notes.filter(n => !o.skip(n)).map(n => {
    let t = n.t_on; if (Math.abs(t % 1 - 0.5) < 1e-6) t = Math.floor(t) + o.swing / 100;
    const on = (t + o.shift) * B + o.dms;
    return { on, off: on + (n.t_off - n.t_on) * B * o.len(n), midi: n.midi, vel: o.vel(n) };
  }) };
}
const row = (r, k) => r.rows.find(x => x.key === k) || {};
const line = '"F7"FA cA dc AF | "Bb7"D2 FA- A4 |]';
let t, r;

t = take(line, { vel: n => n.t_on % 1 ? 95 : 70 });
r = F.analyse(t.e, t.p, { bpm: BPM });
assert.equal(row(r, "notes").verdict, "ok"); assert.equal(row(r, "swing").verdict, "ok"); assert.equal(r.swingPct, 62);
assert.equal(row(r, "accents").verdict, "ok"); assert.equal(row(r, "beat").verdict, "ok");

t = take(line, { swing: 75, vel: n => n.t_on % 1 ? 60 : 100 });
r = F.analyse(t.e, t.p, { bpm: BPM });
assert.equal(row(r, "swing").verdict, "bad"); assert.equal(row(r, "accents").verdict, "bad");

t = take(line, { shift: 1 });
r = F.analyse(t.e, t.p, { bpm: BPM });
assert.equal(r.shift, 1); assert.equal(row(r, "beat").verdict, "bad");

t = take(line, { dms: 40 });
r = F.analyse(t.e, t.p, { bpm: BPM });
assert.equal(row(r, "beat").verdict, "ok"); assert.equal(r.layBackMs, 40);

// written accents
t = take('"F7"F!>!A c!>!A d!>!c A!>!F | "Bb7"D2 F!>!A- A4 |]', { vel: n => n.accent ? 100 : 70 });
r = F.analyse(t.e, t.p, { bpm: BPM }); assert.equal(row(r, "accents").verdict, "ok");
t = take('"F7"!>!FA !>!cA !>!dc !>!AF | "Bb7"!>!D2 FA- A4 |]', { vel: () => 80 });
r = F.analyse(t.e, t.p, { bpm: BPM }); assert.notEqual(row(r, "accents").verdict, "ok");

// ghosts
const gh = '"F7"cB "^ghost"!pp!A!f!G FG Ac | "Bb7"d4 z4 |]';
t = take(gh, { vel: n => n.ghost ? 35 : 85 });
r = F.analyse(t.e, t.p, { bpm: BPM }); assert.equal(row(r, "ghosts").verdict, "ok");
t = take('"F7"cB AG FG Ac | "Bb7"d4 z4 |]', { vel: n => n.t_on === 4 ? 30 : 85 });
r = F.analyse(t.e, t.p, { bpm: BPM }); assert.equal(row(r, "ghosts").verdict, "bad");

// length: staccato short ok; tie re-struck bad
const ln = '"F7"z2 .A2 z2 .c2 | "Bb7"z2 dc .A2 F2- | "F7"F8 |]';
t = take(ln, { len: n => n.staccato ? 0.4 : 0.95 });
r = F.analyse(t.e, t.p, { bpm: BPM }); assert.equal(row(r, "length").verdict, "ok", row(r, "length").text);
t.p.push({ on: 8 * B, off: 11 * B, midi: 65, vel: 80 });
t.p.forEach(p => { if (p.midi === 65 && p.on < 8 * B) p.off = 8 * B - 10; });
r = F.analyse(t.e, t.p, { bpm: BPM }); assert.equal(row(r, "length").verdict, "bad", row(r, "length").text);

// small changes: d anticipated by an eighth
const sc = '"F7"z4 A2 c2 | "Bb7"d4 c2 A2 | "F7"F8 |]';
t = take(sc, {}); t.p.forEach(p => { if (p.midi === 74) p.on -= B / 2; });
r = F.analyse(t.e, t.p, { bpm: BPM }); assert.equal(row(r, "changes").verdict, "ok"); assert.equal(row(r, "notes").verdict, "ok");

r = F.analyse(t.e, [], { bpm: BPM }); assert.equal(r.rows[0].key, "none");
console.log("midi-feel: all passed");
t = take(line, { dms: 60, swing: 64 }); r = F.analyse(t.e, t.p, { bpm: BPM }); assert.equal(r.swingPct, 64); assert.equal(r.layBackMs, 60);
console.log("midi-feel: laid back keeps its swing");
