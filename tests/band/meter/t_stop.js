// Stop time (opts.stops): one hit on beat 1 from everyone, silence on beat 2, bass alone leads back in.
const assert = require("assert");
const R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/drums.js", "band/player.js", "band/midi.js", "band/notation.js"].forEach(f => require(R + f));
const H = BandHarmony;
function mb(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const WM = "F7|F7|F7|F7|Bb7|Bb7|F7|F7|C7|Bb7|C7|Bb7|C7|Bb7|F7|F7".split("|");
const M = { "4/4": ["1/4", "4", 4], "3/4": ["1/4", "3", 3], "12/8": ["1/8", "12", 4], "6/8": ["1/8", "6", 2] };
let n = 0;
for (const id of Object.keys(M)) for (const bassFeel of ["walk", "two", "riff"]) for (const feel of ["swing", "straight"]) for (const compRhythm of ["auto", "garland", "pad", "four", "stabs"]) for (let seed = 1; seed <= 6; seed++){
  const [L, z, beats] = M[id], parsed = TuneChart.parse("X:1\nM:" + id + "\nL:" + L + "\nK:F\n" + WM.map(c => `"${c}"z${z}`).join(" | ") + " |]");
  const recs = BandMidi.generate(parsed, { bars: 32, tempo: 130, opts: { bassFeel, feel, compRhythm, stops: [13] }, rng: mb(seed * 7 + n) });
  const tag = [id, bassFeel, feel, compRhythm, seed].join(" ");
  [13, 29].forEach(i => { const b = recs[i].parts, prev = recs[i - 1].parts, next = recs[i + 1].parts; n++;
    // the stop bar
    assert.deepStrictEqual(b.drums.filter(e => e.piece).map(e => e.pos + e.piece).sort(), ["0hatClosed", "0kick", "0snare"], tag + " drums: one hit");
    assert(b.drums.some(e => e.choke === "cymbals" && e.pos < 0.5), tag + " cymbals damped");
    assert(b.comp.length === 1 && b.comp[0].pos === 0 && b.comp[0].dur <= 0.5, tag + " comp: one short chord");
    assert.strictEqual(b.bass[0].pos, 0); assert.strictEqual(b.bass[0].midi % 12, 10, tag + " bass root (Bb) on 1"); assert(b.bass[0].dur <= 0.5);
    const lead = b.bass.slice(1); assert(lead.length >= 1, tag + " bass leads in");
    if (beats >= 3) [b.bass[0]].concat(b.comp).forEach(e => assert(e.pos + e.dur <= 1.01, tag + " beat-1 notes end before beat 2"));
    if (beats >= 3) lead.forEach(e => assert(e.pos >= 2, tag + " nothing on beat 2: " + e.pos));
    lead.forEach(e => assert(e.pos + e.dur <= beats + 1e-6));
    assert.strictEqual(Math.abs(lead[lead.length - 1].midi - next.bass[0].midi), 1, tag + " last lead-in note is a semitone from the next root");
    assert.strictEqual(next.bass[0].midi % 12, 5, tag + " next bar starts on F");
    // the bar before: nothing rings over the barline, no push into the stop
    prev.comp.forEach(e => assert(e.pos + e.dur <= beats + 1e-6 && e.pos < beats - 0.5 - 1e-6 + (compRhythm === "four" || compRhythm === "stabs" || feel === "straight" ? 0.5 : 0), tag + " bar before: comp " + e.pos + "+" + e.dur));
    // the bar after comes back with a crash
    assert(next.drums.some(e => e.pos === 0 && e.piece === "crash"), tag + " crash after the stop");
  });
  // other bars are untouched by the option
  assert(recs[5].parts.drums.length > 4);
  BandNotation.toAbc(recs.slice(8, 16), { key: "F", drums: true }); BandMidi.build(recs);
}
console.log("STOP OK", n, "stop bars");
