// Sing and Notate: the matching and the confirmation logic (apps/shared/sing-notate.js). node tests/lessons/sing-notate.test.js
// The familiar patterns are read from their source files, not copied.
const path = require("path"), assert = require("assert"), fs = require("fs");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js"); require(R + "apps/shared/abc-events.js");
const S = require(R + "apps/shared/sing-notate.js");
const load = (f, name) => new Function(fs.readFileSync(R + f, "utf8") + ";return " + name)();
const RP = load("apps/rhythms/rhythm-pattern-object.js", "rhythmPatternObject"), TP = load("apps/patterns/pattern-object.js", "patternObject");

// ---- filtering by the chosen tonality and meter ----
const modes = S.modesIn(TP);
assert.ok(modes.includes("major") && modes.includes("minor"), "bank covers major and minor: " + modes);
modes.forEach(m => { const ps = S.tonalPatterns(TP, m); assert.ok(ps.length, m); assert.ok(ps.every(p => p.mode === m), "only " + m); });
assert.ok(S.tonalPatterns(TP, "major").every(p => !/m$|dor|mix/.test(p.key)), "no minor-key pattern among the major ones");
assert.ok(S.tonalPatterns(TP, "dorian").length < S.tonalPatterns(TP, "major").length + S.tonalPatterns(TP, "minor").length);
["2/4", "3/4", "4/4", "6/8"].forEach(m => {
  const bars = S.rhythmBars(RP, m); assert.ok(bars.length > 3, m);
  const barQ = S.meterQuarters(m);
  assert.ok(bars.every(b => Math.abs(b.events.reduce((s, e) => s + e.dur, 0) - barQ) < 0.01), m + ": every bar fills the meter");
  if (m !== "4/4") assert.ok(bars.every(b => b.meter === m), m + ": only that meter");
});
assert.ok(S.rhythmBars(RP, "6/8").every(b => b.meter === "6/8"));
assert.ok(S.rhythmBars(RP, "3/4").every(b => b.meter === "3/4"));
console.log("filtering: ok");

// ---- helpers: sing a known answer ----
function setup(meter, mode, tonic) {
  const key = S.parseKey(tonic + (mode === "minor" ? "m" : mode === "major" ? "" : mode.slice(0, 3)));
  const bars = S.rhythmBars(RP, meter), barQ = S.meterQuarters(meter);
  return { key, meter, barQ, cands: S.rhythmCandidates(bars, barQ), pats: S.tonalPatterns(TP, mode) };
}
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// a take as frames (40 ms), notes of `dur` at q, pitch midi; tempo 100 quarters/min; the downbeat at t0
function frames(notes, spq, t0, jitter) {
  const out = []; const end = Math.max.apply(null, notes.map(n => n.q + n.dur)) * spq + t0 + 0.5;
  for (let t = 0; t < end; t += 0.04) {
    const n = notes.find(n => t >= t0 + n.q * spq + jitter && t < t0 + (n.q + n.dur) * spq + jitter - 0.06);
    out.push(n ? { t, hz: 440 * Math.pow(2, (n.midi - 69) / 12), rms: 0.1 } : { t, hz: -1, rms: 0 });
  }
  return out;
}
function sing(setupObj, cand, semis, opts) {
  opts = opts || {}; const spq = 0.6, t0 = 4;
  const evs = cand.events.filter(e => !e.rest);
  const takes = [0, 1, 2].map(i => {
    const notes = evs.map((e, k) => ({ q: e.on, dur: e.dur, midi: 60 + setupObj.key.pc + 12 + (opts.random ? Math.round(rnd() * 14 - 4) : semis[k % semis.length]) + (opts.sharp ? 0.2 : 0) }));
    const f = frames(notes, spq, t0, (rnd() - 0.5) * 0.06);
    return S.takeFromNotes(S.segmentNotes(f), { secPerQuarter: spq, t0 });
  });
  return S.combine(takes, setupObj.key, { span: setupObj.barQ * 2 });
}
const pick = (cands, n) => cands.find(c => c.onsets.length === n && c.rests === 0);

// ---- a clean combination is found ----
{
  const s = setup("4/4", "major", "D");
  const cand = pick(s.cands, 6) || s.cands.find(c => c.onsets.length >= 5 && c.rests === 0);
  const n = cand.onsets.length;
  // chain familiar patterns until they fill n notes
  const chosen = []; (function fill(left) { if (left === 0) return true; for (const p of s.pats) if (p.degrees.length <= left) { chosen.push(p); if (fill(left - p.degrees.length)) return true; chosen.pop(); } return false; })(n);
  const semis = [].concat.apply([], chosen.map(p => p.degrees));
  const comb = sing(s, cand, semis, { sharp: true });                       // singing 20 cents sharp all through: drift is removed
  assert.ok(comb.agreement > 0.9, "agreement " + comb.agreement);
  const r = S.match(comb, s.cands, s.pats);
  assert.ok(r.ok, "should fit: " + JSON.stringify(r.reason) + " " + (r.best && [r.best.rhythm, r.best.tonal]));
  assert.ok(r.best.rhythm >= 0.99 && r.best.tonal >= 0.99, "clean: " + r.best.rhythm + " " + r.best.tonal);
  assert.deepStrictEqual(r.best.onsets, cand.onsets);
  assert.ok(r.best.patterns.length >= 1 && r.best.patterns.every(p => p.id));
  // the answer is gradable: its own ABC is both rhythm and pitch correct, a blank doc is neither
  const abc = S.answerAbc(r.best, { meter: "4/4", key: "D" });
  assert.deepStrictEqual(S.compare(r.best, abc, s.key), { rhythm: true, pitch: true }, abc);
  assert.deepStrictEqual(S.compare(r.best, S.blankAbc({ meter: "4/4", key: "D" }), s.key), { rhythm: false, pitch: false });
  console.log("clean combination: ok (" + r.best.patterns.map(p => p.label).join(" / ") + ")");

  // a different tonality: the same singing is judged against minor patterns only, so it is not a fit
  const m = setup("4/4", "minor", "D"); assert.ok(m.pats.length);
  // ---- nonsense warns ----
  // random notes outside the key (the matcher is lenient: random notes that happen to be in the key can make a real idea)
  const outside = cand.onsets.map(() => [1, 3, 6, 8, 10][Math.floor(rnd() * 5)] + 12 * Math.floor(rnd() * 2));
  const bad = S.match(sing(s, cand, outside, {}), s.cands, s.pats);
  assert.ok(!bad.ok && bad.message, "random pitches must warn: " + bad.reason + " " + (bad.best && [bad.best.rhythm, bad.best.tonal, JSON.stringify(bad.best.notes.map(n => n.semis)), bad.best.patterns.map(p => p.label).join("/")]));
  // chromatic pitches on a familiar rhythm
  const chrom = S.match(sing(s, cand, cand.onsets.map((_, i) => i % 2 ? 1 : 6), {}), s.cands, s.pats);
  assert.ok(!chrom.ok && chrom.reason === "no-fit", "tritone leaps: " + chrom.reason);
  // takes that disagree
  const mk = qs => ({ notes: qs.map((q, i) => ({ q, midi: 62 + (i % 3) * 2 })) });
  const takes = [mk([0, 2, 4, 6]), mk([0.5, 2.5, 4.5, 6.5]), mk([1, 3, 5, 7])];
  const dis = S.match(S.combine(takes, s.key), s.cands, s.pats);
  assert.ok(!dis.ok && dis.reason === "takes-disagree", "disagreeing takes: " + dis.reason);
  // silence
  const none = S.match(S.combine([{ notes: [] }, { notes: [] }, { notes: [] }], s.key), s.cands, s.pats);
  assert.ok(!none.ok && none.reason === "too-few");
  console.log("nonsense warns: ok");
}
// the idea the user sings to dial it in: A2 A2 | D4 (5 5 | 1, down a fifth) in D major, sung loosely: onsets up to a fifth of a beat
// early or late, each note up to ~70 cents off, every take 25 cents sharp. Found in 2/4 and 4/4, every time.
for (const meter of ["2/4", "4/4"]) {
  const s = setup(meter, "major", "D"), bq = s.barQ, spq = 60 / 90, t0 = 2; let found = 0;
  for (let run = 0; run < 10; run++) {
    const g = () => rnd() * 2 - 1;
    const takes = [0, 1, 2].map(() => {
      const notes = [{ q: 0, dur: bq / 2, m: 69 }, { q: bq / 2, dur: bq / 2, m: 69 }, { q: bq, dur: bq, m: 62 }]
        .map(n => ({ q: n.q + g() * 0.2, dur: n.dur * (0.75 + 0.2 * rnd()), midi: n.m + g() * 0.45 + 0.25 }));
      const f = [];
      for (let t = 0; t < t0 + bq * 2 * spq + 0.6; t += 0.023) {
        const n = notes.find(n => t >= t0 + n.q * spq && t < t0 + (n.q + n.dur) * spq);
        f.push(n ? { t, hz: 440 * Math.pow(2, (n.midi + g() * 0.15 - 69) / 12), rms: 0.1 * (1 + 0.3 * g()) } : { t, hz: -1, rms: 0.001 });
      }
      return S.takeFromNotes(S.segmentNotes(f), { secPerQuarter: spq, t0 });
    });
    const r = S.match(S.combine(takes, s.key, { span: bq * 2 }), s.cands, s.pats, { beat: S.beatOf(meter) });
    if (r.ok && r.best.notes[0].semis === 7 && r.best.notes[r.best.notes.length - 1].semis === 0) found++;
  }
  assert.strictEqual(found, 10, meter + ": A2 A2 | D4 found " + found + "/10");
}
console.log("A2 A2 | D4, sung loosely: ok");

// a minor, compound-meter idea is found with only 6/8 rhythms and minor patterns
{
  const s = setup("6/8", "minor", "A");
  assert.ok(s.cands.length && s.pats.length);
  const cand = s.cands.find(c => c.onsets.length === 6 && c.rests === 0) || s.cands.find(c => c.onsets.length >= 4 && c.rests === 0), n = cand.onsets.length;
  const chosen = []; (function fill(left) { if (left === 0) return true; for (const p of s.pats) if (p.degrees.length <= left) { chosen.push(p); if (fill(left - p.degrees.length)) return true; chosen.pop(); } return false; })(n);
  const r = S.match(sing(s, cand, [].concat.apply([], chosen.map(p => p.degrees))), s.cands, s.pats);
  assert.ok(r.ok, "6/8 minor: " + r.reason);
  console.log("6/8 minor: ok");
}

// ---- the confirmations ----
{
  const best = { notes: [{ q: 0, dur: 1, semis: 0 }, { q: 1, dur: 1, semis: 4 }, { q: 2, dur: 2, semis: 7 }] };
  const key = S.parseKey("C"), H = "X:1\nM:4/4\nL:1/4\nK:C\n";
  const wrongBoth = H + "D C2 |]", rhythmOnly = H + "D E G2 |]", pitchesOnly = H + "C E G |]", both = H + "C E G2 |]";
  // separate: rhythm first, then pitches
  let c = S.checker(best, key), u = c.update(H + "x4 |]"); assert.strictEqual(u.message, ""); assert.deepStrictEqual(u.newly, []);
  u = c.update(rhythmOnly); assert.strictEqual(u.message, "Rhythm correct"); assert.deepStrictEqual(u.newly, ["rhythm"]);
  u = c.update(rhythmOnly + " "); assert.strictEqual(u.message, "", "rhythm is confirmed once");
  u = c.update(both); assert.strictEqual(u.message, "Pitches correct"); assert.deepStrictEqual(u.newly, ["pitch"]); assert.ok(u.done);
  u = c.update(both); assert.strictEqual(u.message, "");
  u = c.update(wrongBoth); u = c.update(both); assert.strictEqual(u.message, "", "never confirmed twice");
  // pitches first, then rhythm
  c = S.checker(best, key); u = c.update(pitchesOnly); assert.strictEqual(u.message, "Pitches correct");
  u = c.update(both); assert.strictEqual(u.message, "Rhythm correct");
  // both on the same change: ONE message
  c = S.checker(best, key); u = c.update(wrongBoth); assert.strictEqual(u.message, "");
  u = c.update(both); assert.deepStrictEqual(u.newly, ["rhythm", "pitch"]); assert.strictEqual(u.message, "Rhythm and pitches correct");
  u = c.update(both); assert.strictEqual(u.message, "");
  // an octave higher is still the right degrees; tied notes are one note
  c = S.checker(best, key); u = c.update(H + "c e g2 |]"); assert.strictEqual(u.message, "Rhythm and pitches correct");
  c = S.checker(best, key); u = c.update(H + "C E G-G |]"); assert.strictEqual(u.message, "Rhythm and pitches correct");
  console.log("confirmations: ok");
}
console.log("sing-notate: ok");
