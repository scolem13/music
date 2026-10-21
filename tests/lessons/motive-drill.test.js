// The motivic-alteration drill (apps/shared/drills/motives.js, Drills.engines.motive; theory/melodic-analysis.qmd) in Node.
// Each generated question is read back from its own ABC (letters, octaves, lengths) and the change from bar 1 to bar 2 is
// classified here, independently of the engine: exactly one of the book's alterations (or a plain sequence) must fit, and it
// must be the answer. Also: both bars fill 4/4, abcjs-free pitch reading (AbcEvents) = what the drill plays, every type appears.
//   node tests/lessons/motive-drill.test.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js"); require(R + "apps/shared/abc-events.js");
const Ev = global.AbcEvents;
const win = { document: { readyState: "loading", querySelectorAll: () => [], addEventListener() {} }, localStorage: null };
win.window = win; vm.createContext(win);
vm.runInContext(fs.readFileSync(R + "apps/shared/drills/drills.js", "utf8"), win);
vm.runInContext(fs.readFileSync(R + "apps/shared/drills/motives.js", "utf8"), win);
const D = win.Drills, E = D.engines.motive;
let fails = 0, total = 0; const fail = (...a) => { fails++; if (fails < 15) console.log("FAIL", ...a); };
// one bar of the ABC -> [{ step (diatonic number), len (sixteenths) }], rests dropped, total length kept
function readBar(s) {
  const out = []; let tot = 0;
  for (const m of s.matchAll(/([zA-Ga-g])([,']*)(\d*)/g)) {
    const len = m[3] ? +m[3] : 1; tot += len; if (m[1] === "z") continue;
    const up = m[1] === m[1].toLowerCase(), L = "CDEFGAB".indexOf(m[1].toUpperCase());
    let o = up ? 5 : 4; for (const c of m[2]) o += c === "'" ? 1 : -1;
    out.push({ step: o * 7 + L, len });
  }
  return { notes: out, tot };
}
const iv = a => a.slice(1).map((x, i) => x - a[i]), eq = (a, b) => JSON.stringify(a) === JSON.stringify(b), S = a => a.reduce((s, x) => s + x, 0);
function classify(a, b) {
  const ad = a.map(n => n.step), ar = a.map(n => n.len), bd = b.map(n => n.step), br = b.map(n => n.len), n = a.length, out = [];
  const trans = eq(iv(bd), iv(ad)) && bd.length === n, inv = bd.length === n && eq(iv(bd), iv(ad).map(x => -x)), sameR = eq(br, ar);
  if (trans && sameR && bd[0] !== ad[0]) out.push("SEQ");
  if (inv && sameR) out.push("INV");
  if (eq(bd, ad.slice().reverse()) && eq(br, ar.slice().reverse())) out.push("RET");
  if (trans && eq(br, ar.map(x => 2 * x))) out.push("AUG");
  if (trans && eq(br, ar.map(x => x / 2))) out.push("DIM");
  if (eq(bd, ad) && !sameR && br.length === n && S(br) === S(ar)) out.push("RHY");
  if (sameR && bd[0] === ad[0] && !trans && !inv) { const ch = iv(bd).filter((x, i) => x !== iv(ad)[i]).length; if (ch && ch <= 2 && ch < n - 1 + 1) out.push("INT"); }
  if (bd.length > n && S(br) === S(ar)) { let j = 0; bd.forEach(v => { if (j < n && v === ad[j]) j++; }); if (j === n) out.push("ORN"); }
  if (bd.length > n && eq(bd.slice(0, n), ad) && eq(br.slice(0, n), ar)) out.push("EXT");
  return out;
}
for (const mode of ["major", "minor"]) {
  const s = D.parseSettings("motive", "mode=" + mode), seen = {}, abcs = new Set();
  for (let i = 0; i < 3000; i++) {
    const q = E.make(s); total++;
    if (!q) { fail("no question", mode); break; }
    const body = q.abc.trim().split("\n").pop().replace(/\|\]?/g, "|").split("|").filter(x => x.trim());
    const b1 = readBar(body[0]), b2 = readBar(body[1]);
    if (b1.tot !== 16 || b2.tot !== 16) fail("bar length", b1.tot, b2.tot, q.abc);
    const c = classify(b1.notes, b2.notes);
    if (c.length !== 1 || c[0] !== q.answer) fail("classify", q.answer, c.join("+"), q.abc);
    seen[q.answer] = (seen[q.answer] || 0) + 1; abcs.add(q.abc);
    const midi = Ev.fromAbc(q.abc).sounding.flatMap(e => e.notes || e.pitches.map(p => p.midi));
    if (!eq(midi, q.play)) fail("sound vs staff", q.abc, midi, q.play);
    if (Math.min(...q.play) < 60 || Math.max(...q.play) > 84) fail("range", q.play);
  }
  console.log(`${mode}: ${abcs.size} different; ` + Object.keys(seen).sort().map(k => k + " " + seen[k]).join(", "));
  if (Object.keys(seen).length !== 9) fail("types missing", mode, Object.keys(seen));
}
// settings: only the chosen types are asked, the answers are the chosen buttons
const s2 = D.parseSettings("motive", "types=INV,RET"); for (let i = 0; i < 200; i++) { total++; const q = E.make(s2); if (!["INV", "RET"].includes(q.answer)) fail("types setting", q.answer); }
if (E.answers(s2).join() !== "INV,RET") fail("answers", E.answers(s2));
console.log(fails ? fails + " FAILED of " + total : "all " + total + " ok");
process.exit(fails ? 1 : 0);
