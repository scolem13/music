// node tests/seq/motif-arp.test.js: the multi-part phrase arpeggiator (apps/shared/motif-arp.js) without a page. Key modes,
// key and velocity ranges, velocity mode and rates, gate, unit multiply, octave, swing; and every arp type over several
// chords written as ABC that abcjs reads with no warnings and every bar full.
const path = require("path"), ROOT = path.resolve(__dirname, "../..");
global.window = global; global.document = { createElement: () => ({ getContext: () => null, style: {} }) }; global.navigator = { userAgent: "node" };
const ABCJS_ = require(ROOT + "/apps/shared/abcjs-basic.js"), ABCJS = global.ABCJS || ABCJS_;
const P = require(ROOT + "/apps/shared/band/phrase.js"), M = require(ROOT + "/apps/shared/motif-arp.js");
let n = 0, bad = 0; const ok = (c, m) => { n++; if (!c) { bad++; console.log("FAIL", m); } };
const part = o => Object.assign(M.defaults(0), { on: true, type: 0 }, o);
const C = { held: [60, 64, 67], order: [67, 60, 64], vel: 100 };
const first4 = (p, c) => M.partNotes(p, c || C).slice(0, 4).map(x => x.midi).join();

ok(first4(part({ key: "sort" })) === "60,64,67,72", "sort: low to high, wraps an octave up: " + first4(part({})));
ok(first4(part({ key: "thru" })) === "67,60,64,79", "thru: order pressed: " + first4(part({ key: "thru" })));
ok(M.partNotes(part({ key: "direct" }), C).length === 0, "direct: the phrase is silent");
ok(M.partNotes(part({ key: "sort+direct" }), C).length === 16, "sort+direct: the phrase plays");
ok(first4(part({ lo: 62, hi: 127 })) === "64,67,76,79", "key range drops notes below it");
ok(M.partNotes(part({ lo: 70, hi: 80 }), C).length === 0, "no held key in range: silent");
ok(M.partNotes(part({ vlo: 1, vhi: 90 }), C).length === 0 && M.partNotes(part({ vlo: 91, vhi: 127 }), C).length === 16, "velocity range");
ok(M.partNotes(part({ on: false }), C).length === 0, "off");
const orig = M.partNotes(part({}), C), ty = M.TYPES[0];
ok(orig.every((x, i) => Math.abs(x.vel - ty.notes[i].vel) < 1e-9), "velocity mode original keeps the phrase's velocities");
ok(M.partNotes(part({ velMode: "thru" }), Object.assign({}, C, { vel: 50 })).every((x, i) => Math.abs(x.vel - ty.notes[i].vel / 2) < 1e-9), "velocity mode thru: yours scales the phrase's");
ok(M.partNotes(part({ velRate: 50 }), C).every((x, i) => Math.abs(x.vel - ty.notes[i].vel / 2) < 1e-9), "velocity rate");
ok(M.partNotes(part({ velRate: 200 }), C).every(x => x.vel <= 1), "velocity capped at 1");
ok(M.partNotes(part({ velRate: 0 }), C).every(x => x.vel > 0), "velocity never 0 (Yamaha sets 0 to 1)");
ok(M.partNotes(part({ gate: 200 }), C).every((x, i) => Math.abs(x.dur - ty.notes[i].dur * 2) < 1e-9), "gate time rate");
const u = M.partNotes(part({ unit: 200 }), C); ok(u[1].t === 0.5 && Math.abs(u[1].dur - ty.notes[1].dur * 2) < 1e-9, "unit multiply 200% = twice as long");
ok(M.partNotes(part({ oct: 1 }), C)[0].midi === 72, "octave");
const sw = M.partNotes(part({ swing: 40 }), C); ok(Math.abs(sw[1].t - 0.35) < 1e-9 && sw[2].t === 0.5, "swing pushes the 16ths between 8ths: " + sw[1].t);
const dr = M.TYPES.findIndex(t => t.kind === "drum"); ok(M.partNotes(part({ type: dr }), C).every(x => x.piece && x.midi == null), "drum types play pieces");

function bars(abc) {
  const t = ABCJS.parseOnly(abc)[0]; if (t.warnings && t.warnings.length) throw new Error(t.warnings.join("; "));
  const out = []; let cur = 0, mult = 1;
  t.lines.forEach(l => (l.staff || []).forEach(st => st.voices[0].forEach(el => {
    if (el.startTriplet) mult = el.tripletMultiplier; if (el.el_type === "note") cur += el.duration * mult;
    if (el.endTriplet) mult = 1; if (el.el_type === "bar") { out.push(cur); cur = 0; } })));
  return out;
}
const chords = [[60, 64, 67], [57, 60, 64, 67], [48, 55, 60, 63, 70], [62], [50, 53, 57, 60, 64, 67]];
M.TYPES.forEach((t, k) => chords.forEach(ch => [100, 66, 133, 200].forEach(unit => [0, 30].forEach(swing => {
  const p = part({ type: k, unit, swing }), ns = M.partNotes(p, { held: ch, order: ch, vel: 100 });
  const nb = Math.max(1, Math.ceil(t.bars * unit / 100 - 1e-9));
  try {
    const r = P.toAbc(ns, { meter: t.meter, bars: nb, title: "", kind: t.kind === "drum" ? "drum" : "pitch" });
    const b = bars(r.abc); ok(b.length === nb && b.every(x => Math.abs(x - 1) < 1e-9), t.name + " " + ch + " " + unit + "%: bars " + b);
  } catch (e) { ok(false, t.name + " " + ch + " " + unit + "%: " + e.message); }
}))));
ok(M.TYPES.every(t => t.notes.every(x => x.t >= 0 && x.t < t.bars * P.barQ(t.meter) && x.dur > 0 && x.vel > 0 && x.vel <= 1)), "every type's notes inside its bars, velocity 0..1");
console.log(bad ? bad + " of " + n + " FAILED" : "all " + n + " passed"); process.exit(bad ? 1 : 0);
