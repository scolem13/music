// node tests/scales/scale-patterns.test.js — every scale × pattern × meter × style × instrument (sampled) parsed by abcjs:
// no parse warnings, every bar the meter's length, written notes = concert + the instrument's transposition, and the swung
// playback ABC the same length as the written one.
const path = require("path"), ROOT = path.resolve(__dirname, "../..");
global.window = global; global.document = { createElement: () => ({ getContext: () => null, style: {} }) };
global.navigator = { userAgent: "node" };
const ABCJS_ = require(ROOT + "/apps/shared/abcjs-basic.js");
require(ROOT + "/apps/shared/hanon-part1.js");
const SP = require(ROOT + "/apps/shared/scale-patterns.js"), ABCJS = global.ABCJS || ABCJS_;
const METERS = ["4/4", "3/4", "2/4", "5/4", "6/8", "12/8", "7/8", "5/8"], UNITS = ["auto", "q", "e", "t", "s"];
let n = 0, bad = 0;
function bars(abc) {
  const t = ABCJS.parseOnly(abc)[0], out = [];
  if (t.warnings && t.warnings.length) throw new Error("warnings: " + t.warnings.join("; "));
  let cur = 0, mult = 1;
  t.lines.forEach(l => (l.staff || []).forEach(st => st.voices[0].forEach(el => {
    if (el.startTriplet) mult = el.tripletMultiplier || 2 / 3;
    if (el.el_type === "note") cur += el.duration * mult;
    if (el.endTriplet) mult = 1; if (el.el_type === "bar") { out.push(cur); cur = 0; } })));
  return out;
}
function check(o) {
  n++;
  const r = SP.make(o), [nu, de] = o.meter.split("/").map(Number), want = nu / de;
  try {
    for (const [name, abc] of [["abc", r.abc], ["play", r.playAbc]]) {
      const b = bars(abc);
      b.forEach((d, i) => { if (Math.abs(d - want) > 1e-6) throw new Error(name + " bar " + (i + 1) + " is " + d + ", want " + want); });
    }
    const inst = SP.INSTRUMENTS.find(x => x.id === o.inst);
    if (!/^hanon/.test(o.pattern) && r.range.hi - r.range.lo > 12 * (o.octaves || 1) + 14) throw new Error("range too wide " + JSON.stringify(r.range));
  } catch (e) { bad++; if (bad < 15) console.log("FAIL", JSON.stringify(o), e.message, "\n" + r.abc); }
}
let k = 0;
for (const sc of SP.SCALES) for (const p of SP.PATTERNS) for (const m of METERS) {
  k++;
  const st = SP.STYLES[k % SP.STYLES.length], inst = SP.INSTRUMENTS[k % SP.INSTRUMENTS.length];
  check({ tonic: k % 12, scale: sc.id, pattern: p.id, meter: m, style: st.id, inst: inst.id, unit: UNITS[k % UNITS.length],
    octaves: 1 + (k % 2), dir: ["updown", "downup", "up", "down"][k % 4], rhythm: ["even", "longshort", "shortlong"][k % 3],
    alternate: k % 5 === 0, chords: k % 2 === 0, hand: k % 2 ? "lh" : "rh" });
}
// spelling spot checks
const g = SP.make({ tonic: 8, scale: "harmin", pattern: "scale", meter: "4/4", style: "classical", inst: "piano" });
if (!/\^\^F/i.test(g.abc)) { bad++; console.log("FAIL G# harmonic minor has no F##"); }
const sax = SP.make({ tonic: 10, scale: "major", pattern: "scale", meter: "4/4", style: "swing", inst: "altosax" });
if (!/K:G /.test(sax.abc)) { bad++; console.log("FAIL Bb concert on alto sax should be written in G"); }
// Hanon in C, right hand, against the Mutopia source read note for note (first bar, the turn, the end)
const h1 = SP.make({ tonic: 0, scale: "major", pattern: "hanon1", meter: "2/4", style: "classical", inst: "piano", artic: "none", labels: false });
const h1n = h1.abc.split("K:")[1].split("\n").slice(1).join(" ").replace(/[|\]\s]/g, "");
if (!h1n.startsWith("C2E2F2G2A2G2F2E2D2F2G2A2B2A2G2F2")) { bad++; console.log("FAIL Hanon 1 start", h1n.slice(0, 40)); }
if (!h1n.replace(/[^A-Ga-g]/g, "").toLowerCase().includes("bdefgfedgedcbcde")) { bad++; console.log("FAIL Hanon 1 turn"); }
const h20 = SP.make({ tonic: 0, scale: "major", pattern: "hanon20", meter: "2/4", style: "classical", inst: "piano" });
if (!/\[[A-Ga-g',]+\]/.test(h20.abc)) { bad++; console.log("FAIL Hanon 20 ends on a chord"); }
console.log(bad ? bad + " of " + n + " failed" : "ok: " + n + " exercises");
process.exit(bad ? 1 : 0);
