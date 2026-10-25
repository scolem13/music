// node tests/band/phrase.test.js: BandPhrase (apps/shared/band/phrase.js). resolve and schedule, and toAbc on hand-made and
// random phrases: abcjs parses it with no warnings, every bar is the meter's length, the notes it writes are the pitches
// played, one shading velocity per drawn head, and the drum map is BandGroove's.
const path = require("path"), ROOT = path.resolve(__dirname, "../..");
global.window = global; global.document = { createElement: () => ({ getContext: () => null, style: {} }) };
global.navigator = { userAgent: "node" };
const ABCJS_ = require(ROOT + "/apps/shared/abcjs-basic.js"), ABCJS = global.ABCJS || ABCJS_;
require(ROOT + "/apps/shared/band/groove.js");
const P = require(ROOT + "/apps/shared/band/phrase.js");
let n = 0, bad = 0;
function ok(c, msg) { n++; if (!c) { bad++; console.log("FAIL", msg); } }

function read(abc) {               // -> { bars: [length in wholes], heads: count, pitches: [sorted midi per non-tied onset] }
  const t = ABCJS.parseOnly(abc)[0];
  if (t.warnings && t.warnings.length) throw new Error("warnings: " + t.warnings.join("; ") + "\n" + abc);
  const bars = [], pitches = []; let cur = 0, mult = 1, heads = 0, tied = false;
  t.lines.forEach(l => (l.staff || []).forEach(st => st.voices[0].forEach(el => {
    if (el.startTriplet) mult = el.tripletMultiplier;
    if (el.el_type === "note") {
      cur += el.duration * mult;
      if (el.pitches) { heads++; const ps = el.pitches.map(p => p.pitch), wasTied = tied;
        tied = el.pitches.some(p => p.startTie); if (!wasTied) pitches.push(el.pitches); }
    }
    if (el.endTriplet) mult = 1;
    if (el.el_type === "bar") { bars.push(cur); cur = 0; } })));
  return { bars, heads, pitches };
}
function check(name, src, opts, wantMidis) {
  let r;
  try {
    r = P.toAbc(src, opts); const x = read(r.abc), meter = (opts && opts.meter) || src.meter || "4/4";
    const [nu, de] = meter.split("/").map(Number);
    x.bars.forEach((d, i) => ok(Math.abs(d - nu / de) < 1e-6, name + ": bar " + (i + 1) + " is " + d + " want " + nu / de + "\n" + r.abc));
    ok(x.heads === r.vels.length, name + ": " + x.heads + " heads but " + r.vels.length + " vels\n" + r.abc);
    if (wantMidis) ok(x.pitches.length === wantMidis.length, name + ": " + x.pitches.length + " onsets want " + wantMidis.length + "\n" + r.abc);
  } catch (e) { ok(false, name + ": " + e.message); }
  return r;
}

// resolve
const arp = { kind: "chord", meter: "4/4", bars: 1, notes: [0, 1, 2, 3, 4].map((k, i) => ({ t: i * 0.5, dur: 0.5, tone: k, vel: 0.7 })) };
const rs = P.resolve(arp, { held: [64, 60, 67] });
ok(rs.map(x => x.midi).join() === "60,64,67,72,76", "chord tones wrap up an octave: " + rs.map(x => x.midi));
ok(P.resolve({ kind: "pitch", notes: [{ t: 0, dur: 1, pitch: 64 }] }, { transpose: 2 })[0].midi === 66, "transpose");
ok(P.resolve({ kind: "chord", notes: [{ t: 0, dur: 1, tone: 0, oct: -1 }] }, { held: [60] })[0].midi === 48, "oct");
// schedule
const got = []; const end = P.schedule([{ t: 1, dur: 0.5 }], { when: 10, bpm: 120, emit: (nn, w, d) => got.push([w, d]) });
ok(got[0][0] === 10.5 && got[0][1] === 0.25 && end === 10.75, "schedule seconds " + JSON.stringify(got));
// dynamics
ok(P.dynamic(0.7) === "mf" && P.dynamic(0.2) === "pp" && P.dynamic(0.95) === "ff", "dynamic names");
// drum map is BandGroove's
ok(JSON.stringify(P.WRITTEN) === JSON.stringify(global.BandGroove.WRITTEN), "WRITTEN matches BandGroove");

// hand-made phrases
const r1 = check("arp eighths", arp, { held: [60, 64, 67] }, [1, 1, 1, 1, 1]);
ok(r1.abc.split("\n").pop() === "!mf!C2E2 G2c2 e2z2 z4 |]", "arp written: " + r1.abc.split("\n").pop());
check("triplets", { kind: "pitch", meter: "4/4", bars: 1, notes: [0, 1 / 3, 2 / 3, 1, 2].map(t => ({ t, dur: 1 / 3, pitch: 62, vel: 0.7 })) }, null, [1, 1, 1, 1, 1]);
check("syncopation + barline tie", { kind: "pitch", meter: "4/4", bars: 2, notes: [{ t: 0.5, dur: 1, pitch: 61, vel: 0.9 }, { t: 3.5, dur: 1.5, pitch: 63, vel: 0.5 }] }, null, [1, 1]);
check("chord + accent", { kind: "pitch", meter: "3/4", bars: 1, notes: [{ t: 0, dur: 1, pitch: 48, vel: 0.95 }, { t: 1, dur: 1, pitch: 60, vel: 0.5 }, { t: 1, dur: 1, pitch: 64, vel: 0.5 }, { t: 2, dur: 1, pitch: 67, vel: 0.5 }] }, null, [1, 1, 1]);
const dr = check("drums", { kind: "drum", meter: "4/4", bars: 1, notes: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(t => ({ t, dur: 0.5, piece: "hatClosed", vel: 0.5 }))
  .concat([{ t: 0, dur: 1, piece: "kick", vel: 0.9 }, { t: 1, dur: 1, piece: "snare", vel: 0.9 }, { t: 2, dur: 1, piece: "kick", vel: 0.9 }, { t: 3, dur: 1, piece: "snare", vel: 0.9 }]) }, null, new Array(8).fill(1));
ok(/clef=perc/.test(dr.abc) && /!style=x!g/.test(dr.abc), "drums written on the perc staff with x heads\n" + dr.abc);
const dy = P.toAbc({ kind: "pitch", meter: "4/4", bars: 2, notes: [{ t: 0, dur: 4, pitch: 60, vel: 0.3 }, { t: 4, dur: 4, pitch: 60, vel: 0.85 }] });
ok(/!p!/.test(dy.abc) && /!f!/.test(dy.abc), "dynamic per bar\n" + dy.abc);
const acc = P.toAbc({ kind: "pitch", meter: "4/4", bars: 1, notes: [{ t: 0, dur: 1, pitch: 61 }, { t: 1, dur: 1, pitch: 61 }, { t: 2, dur: 2, pitch: 60 }] }).abc.split("\n").pop();
ok(acc === "!mf!^C4 C4 =C8 |]", "accidental carried then cancelled: " + acc);
ok(P.toAbc({ kind: "pitch", notes: [{ t: 0, dur: 4, pitch: 72 }] }).abc.split("\n").pop() === "!mf!c16 |]", "c = 72");
ok(/C,16/.test(P.toAbc({ kind: "pitch", notes: [{ t: 0, dur: 4, pitch: 48 }] }).abc), "C, = 48 on the bass clef");

// random phrases, every meter
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (const meter of ["4/4", "3/4", "2/4", "6/8", "12/8", "5/4"]) for (let k = 0; k < 120; k++) {
  const bq = P.barQ(meter), bars = 1 + Math.floor(rnd() * 3), notes = [];
  let t = 0;
  while (t < bars * bq) {
    const step = [0.25, 0.5, 0.75, 1, 1.5, 2, 1 / 3, 2 / 3][Math.floor(rnd() * 8)], tt = t + (rnd() < 0.1 ? 0.03 : 0);
    if (rnd() < 0.8) { notes.push({ t: tt, dur: step * (0.3 + rnd()), pitch: 40 + Math.floor(rnd() * 40), vel: rnd() });
      if (rnd() < 0.3) notes.push({ t: tt, dur: step, pitch: 40 + Math.floor(rnd() * 40), vel: rnd() }); }
    t += step;
  }
  check("random " + meter + " #" + k, { kind: "pitch", meter, bars, notes: notes.filter(x => x.t < bars * bq) });
}
console.log(bad ? bad + " of " + n + " FAILED" : "all " + n + " passed");
process.exit(bad ? 1 : 0);
