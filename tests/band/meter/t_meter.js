// 3/4, 6/8 and 12/8 (and 4/4 as the control): every part stays inside the bar in every option,
// the grooves are the ones described, and the notation and MIDI add up to the meter.
const assert = require("assert");
const R = "/Users/sean.coleman/Projects/everything-music-site/apps/shared/";
["tune-chart.js", "voicings.js", "band/harmony.js", "band/bass.js", "band/comp.js", "band/drums.js", "band/player.js", "band/midi.js", "band/notation.js"].forEach(f => require(R + f));
const H = BandHarmony;
function mb(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const BARS = "F7|Bb7|F7|Cm7 F7|Bb7|Bdim7|F7|Am7 D7|Gm7|C7|F7 D7|Gm7 C7".split("|");
const M = { "4/4": { L: "1/4", one: "4", two: ["2", "2"], beats: 4, eighths: 8 }, "3/4": { L: "1/4", one: "3", two: ["2", ""], beats: 3, eighths: 6 },
            "6/8": { L: "1/8", one: "6", two: ["3", "3"], beats: 2, eighths: 6, cmp: true }, "12/8": { L: "1/8", one: "12", two: ["6", "6"], beats: 4, eighths: 12, cmp: true },
            "9/8": { L: "1/8", one: "9", two: ["6", "3"], beats: 3, eighths: 9, cmp: true } };
const abcOf = id => "X:1\nT:t\nM:" + id + "\nL:" + M[id].L + "\nK:F\n" + BARS.map(b => { const c = b.split(" "), m = M[id];
  return c.length > 1 ? `"${c[0]}"z${m.two[0]} "${c[1]}"z${m.two[1]}` : `"${c[0]}"z${m.one}`; }).join(" | ") + " |]";
const PIECES = "kick snare rim hatClosed hatFoot hatOpen ride rideBell crash tomHi tomMid tomLo sticks".split(" ");
const near = (x, y) => Math.abs(x - y) < 1e-6;

assert.deepStrictEqual(H.meterInfo(12, 8), { n: 12, d: 8, compound: true, beats: 4, per: 3 });
assert.deepStrictEqual(H.meterInfo(3, 4), { n: 3, d: 4, compound: false, beats: 3, per: 1 });
assert.strictEqual(H.meterInfo(3, 8).compound, false); assert.strictEqual(H.meterInfo(6, 4).compound, false);

let bars = 0, events = 0;
for (const id of Object.keys(M)){
  const m = M[id], parsed = TuneChart.parse(abcOf(id)), form = H.buildForm(parsed, 0);
  assert.strictEqual(form.length, 12, id);
  form.forEach(b => { assert.strictEqual(b.beats, m.beats, id + " beats"); assert.strictEqual(!!b.compound, !!m.cmp); assert.deepStrictEqual(b.meter, { n: +id.split("/")[0], d: +id.split("/")[1] }); });
  assert.deepStrictEqual(form[3].chords.map(c => c.pos + c.chord.sym), ["0Cm7", (id === "9/8" ? 2 : Math.ceil(m.beats / 2)) + "F7"], id + " second chord of bar 4");
  let seed = 1;
  for (const bassFeel of ["walk", "two", "riff"]) for (const feel of ["swing", "straight"]) for (const compRhythm of ["auto", "charleston", "garland", "four", "stabs"]) for (const ride of ["ride", "hat"]) for (const intensity of [0.2, 0.5, 0.9]){
    const opts = { bassFeel, feel, compRhythm, ride, comp: seed % 2 ? "piano" : "guitar" }, rng = mb(seed++);
    const parts = { bass: BandBass.create({ rng }), comp: BandComp.create({ rng }), drums: BandDrums.create({ rng }) };
    for (let i = 0; i < 24; i++){
      const idx = i % 12, fb = form[idx];
      const ctx = { bar: i, index: idx, length: 12, chorus: i / 12 | 0, beats: fb.beats, chords: fb.chords, nextChords: form[(idx + 1) % 12].chords, tempo: m.cmp ? 66 : 150,
        last: i === 23, loopEnd: idx === 11, opts, intensity, meter: fb.meter, compound: fb.compound, phrase: { bar: idx % 4, turnaround: idx > 9, top: idx === 0 } };
      const out = {}; for (const p in parts) out[p] = parts[p].bar(ctx);
      bars++;
      const tag = [id, bassFeel, feel, compRhythm, ride, intensity, "bar", i].join(" ");
      for (const p in out) out[p].forEach(e => { events++; assert(e.pos >= 0 && e.pos < m.beats - 1e-9, tag + " " + p + " pos " + e.pos); assert(e.vel > 0 && e.vel <= 1, tag + " vel"); });
      out.bass.forEach(e => assert(e.midi >= 28 && e.midi <= 55 && e.dur > 0, tag + " bass " + e.midi));
      out.comp.forEach(e => assert(e.midis.length >= 2 && e.dur > 0, tag + " comp"));
      out.drums.forEach(e => assert(PIECES.includes(e.piece), tag + " piece " + e.piece));
      // the chord's root on beat 1
      assert.strictEqual(out.bass[0].pos, 0, tag + " bass plays beat 1"); assert.strictEqual(out.bass[0].midi % 12, fb.chords[0].chord.bass, tag + " root on 1");
      const d = out.drums, at = (pos, piece) => d.some(e => near(e.pos, pos) && e.piece === piece), cym = ride === "hat" ? "hatClosed" : "ride";
      const fillFrom = Math.min(...d.filter(e => /snare|tom/.test(e.piece) && (m.cmp || feel === "straight" ? /tom/.test(e.piece) || !near(e.pos % 1, 0) : false)).map(e => Math.floor(e.pos)), m.beats);
      assert(fillFrom >= 1 || !d.some(e => /tom/.test(e.piece)) , tag + " a fill never starts on beat 1");
      if (m.cmp){
        // all three eighths on the cymbal for every beat before a fill; kick on 1; backbeat on 2
        const toms = d.filter(e => /tom/.test(e.piece)), plainBeats = d.filter(e => e.piece === cym || (e.piece === "crash" && e.pos === 0)).length;
        assert(at(0, "kick"), tag + " kick on 1");
        assert(at(1 / 3, cym) && at(2 / 3, cym), tag + " eighths on the cymbal");
        assert(plainBeats % 3 === 0 && plainBeats >= 3, tag + " cymbal count " + plainBeats);
        if (plainBeats === 3 * m.beats){ assert(at(1, "snare") || at(1, "rim"), tag + " backbeat on 2"); assert(!toms.length); }
        out.bass.concat(out.comp).forEach(e => { const f = e.pos % 1; assert(near(f, 0) || near(f, 0.5), tag + " compound parts write x.0 / x.5 only: " + e.pos); });
      } else if (m.beats === 3 && feel === "swing" && ride === "ride"){
        assert(at(1, "hatFoot") && at(2, "hatFoot"), tag + " waltz hat on 2 and 3");
        assert(d.filter(e => e.piece === "kick" && e.vel < 0.3).every(e => e.pos === 0), tag + " feathered kick on 1 only");
      }
    }
  }
  // notation: every written bar is exactly one bar long, in the right meter
  function barLen(tok){ let t = tok.replace(/"[^"]*"/g, "").replace(/![^!]*!/g, ""), sum = 0, trip = 0, mm; const re = /\(3|\[[^\]]*\](\d*)|[_=^]*[A-Ga-gz][,']*(\d*)/g;
    while ((mm = re.exec(t))){ if (mm[0] === "(3"){ trip = 3; continue; } const n = parseInt(mm[1] || mm[2] || "1", 10); if (trip > 0){ sum += n * 2 / 3; trip--; } else sum += n; } return sum; }
  let nb = 0;
  for (const s of [3, 4, 5, 6]) for (const o of [{}, { bassFeel: "riff", feel: "straight" }, { compRhythm: "four", bassFeel: "two" }]){
    const recs = BandMidi.generate(parsed, { bars: 24, tempo: m.cmp ? 66 : 150, opts: o, rng: mb(s * 31) });
    recs.forEach(r => { assert.strictEqual(!!r.compound, !!m.cmp); assert.strictEqual(r.beats, m.beats); });
    const abc = BandNotation.toAbc(recs, { key: "F", drums: true });
    assert(abc.includes("\nM:" + (id === "9/8" ? "9/8" : id) + "\n"), id + " header meter: " + abc.split("\n")[1]);
    assert(m.cmp ? /\nQ:3\/8=66\n/.test(abc) && !/\(3/.test(abc) : /1\/4=150/.test(abc), id + " tempo line");
    abc.split("\n").filter(l => /\|/.test(l)).forEach(l => l.replace(/^\[V:\w\]/, "").replace(/\|\]/, "|").split("|").map(x => x.trim()).filter(Boolean).forEach(b => {
      nb++; const L = barLen(b); assert(near(L, m.eighths), id + " bar length " + L + " in: " + b); }));
    // MIDI: time signature, tempo in quarters, and the last note inside the last bar
    const mid = BandMidi.build(recs), bytes = Array.from(mid), ppq = 480, n = +id.split("/")[0], dd = id.endsWith("/8") ? 3 : 2;
    const ts = bytes.findIndex((b, k) => b === 0xff && bytes[k + 1] === 0x58); assert.deepStrictEqual(bytes.slice(ts + 3, ts + 5), [n, dd], id + " MIDI time signature");
    const tp = bytes.findIndex((b, k) => b === 0xff && bytes[k + 1] === 0x51), us = bytes[tp + 3] * 65536 + bytes[tp + 4] * 256 + bytes[tp + 5];
    assert(Math.abs(60000000 / us - (m.cmp ? 99 : 150)) < 0.01, id + " MIDI tempo " + 60000000 / us);
    const quartersPerBar = m.cmp ? m.beats * 1.5 : m.beats;
    assert.strictEqual(m.eighths / 2, quartersPerBar);
  }
  console.log(id.padEnd(5), "ok:", nb, "written bars the right length");
}
// the off-beat eighth of a compound beat lands two thirds of the way through it
assert(near(BandMidi.swingOf({ compound: true, tempo: 60 }), 2 / 3) && near(BandPlayer.warp(2.5, 2 / 3), 2 + 2 / 3));
console.log("METER OK", bars, "bars,", events, "events");
