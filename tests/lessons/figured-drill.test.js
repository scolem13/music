// The figured-bass drills (figured.js: fbrn, fbwrite, fbfig, fbreal, sixfour; theory/figured-bass.qmd) in Node.
// Each question is checked by arithmetic of its own: the figure is read from the drawn/played notes (which chord member is
// lowest), not from the engine's tables; typed answers the page promises are accepted and wrong ones refused; realized notes
// are the letters the figures count up to, with the key signature's accidentals; each six-four type has the bass shape the
// book gives it (cadential: same bass then V; passing: three steps; pedal: three repeated notes).
//   node tests/lessons/figured-drill.test.js            (NEG=1 breaks the engine on purpose: the test must fail)
const fs = require("fs"), path = require("path"), vm = require("vm");
const R = path.resolve(__dirname, "../..") + "/";
const win = { document: { readyState: "complete", querySelectorAll: () => [] }, localStorage: null };
win.window = win; vm.createContext(win);
vm.runInContext(fs.readFileSync(R + "apps/shared/drills/drills.js", "utf8"), win);
let src = fs.readFileSync(R + "apps/shared/drills/figured.js", "utf8");
if (process.env.NEG) src = src.replace('"43": [2, 3, 5]', '"43": [2, 4, 5]');
vm.runInContext(src, win);
const D = win.Drills, E = D.engines;
let fails = 0, total = 0;
function fail(...a) { fails++; if (fails < 20) console.log("FAIL", ...a); }
const pc = m => ((m % 12) + 12) % 12;

// which chord member is lowest, from the sounding notes: the root is the note a 3rd below which no chord note lies (stack of 3rds)
function figureOf(midis) {
  const pcs = [...new Set(midis.map(pc))], bass = pc(Math.min(...midis));
  if (pcs.length === 4 && pcs.every(p => pcs.includes(pc(p + 3)))) return "dim7";   // symmetric: every inversion sounds alike, so skip
  for (const r of pcs) {
    const iv = pcs.map(p => pc(p - r)).sort((a, b) => a - b);
    const tri = [[0, 4, 7], [0, 3, 7], [0, 3, 6], [0, 4, 8]].some(t => t.join() === iv.join());
    const sev = [[0, 4, 7, 11], [0, 4, 7, 10], [0, 3, 7, 10], [0, 3, 6, 10], [0, 3, 6, 9]].some(t => t.join() === iv.join());
    if (!tri && !sev) continue;
    const memb = { 0: 0, 3: 1, 4: 1, 6: 2, 7: 2, 8: 2, 9: 3, 10: 3, 11: 3 }[pc(bass - r)];
    return sev ? ["7", "65", "43", "42"][memb] : ["53", "6", "64"][memb];
  }
  return null;
}
const FIG_TAIL = { "53": "", "6": "6", "64": "64", "7": "7", "65": "65", "43": "43", "42": "42" };

for (const kind of ["triads", "sevenths", "both"]) for (const mode of ["major", "minor"]) {
  const s = D.parseSettings("fbrn", `mode=${mode}&most=7&kind=${kind}&inv=all`), seenFig = new Set();
  for (let i = 0; i < 500; i++) {
    const q = E.fbrn.make(s); total++;
    const f = figureOf(q.play[0]);
    if (!f) { fail("fbrn: not a chord", q.play[0]); continue; }
    if (f === "dim7") continue;
    seenFig.add(f);
    if (!q.answer.endsWith(FIG_TAIL[f]) || (f === "53" && /\d$/.test(q.answer) && !/7$/.test(q.answer))) fail("fbrn figure", q.answer, "heard", f);
    if (!E.fbrn.check(q, q.answer)) fail("fbrn refuses its answer", q.answer);
    if (!E.fbrn.check(q, q.answer.replace("°", "o").replace("ø", "h"))) fail("fbrn refuses o / h", q.answer);
    const wrong = f === "6" ? q.answer.replace(/6$/, "64") : f === "65" ? q.answer.replace(/65$/, "43") : f === "64" ? q.answer.replace(/64$/, "6") : null;
    if (wrong && E.fbrn.check(q, wrong)) fail("fbrn accepts wrong figure", wrong, "for", q.answer);
    if (/[^M]7\d|M7\d/.test(q.answer)) fail("fbrn keeps 7 in an inverted seventh", q.answer);
    // fbfig: same chords, button answer must be the heard figure
    const g = E.fbfig.make(D.parseSettings("fbfig", `mode=${mode}&most=7&kind=${kind}`)); total++;
    if (figureOf(g.play[0]) !== "dim7" && g.answer !== figureOf(g.play[0])) fail("fbfig", g.answer, figureOf(g.play[0]));
  }
  const want = kind === "triads" ? 3 : kind === "sevenths" ? 4 : 7;
  if (seenFig.size !== want) fail("fbrn figures seen", kind, [...seenFig]);
}
// the book's own answers (16.6 ex. 1–3)
const toFig = D.figured.toFig;
[["I/5th", "I64"], ["vii°/3rd", "vii°6"], ["V7/7th", "V42"], ["IM7/5th", "IM43"], ["iii7/3rd", "iii65"], ["IVM7", "IVM7"], ["viiø7", "viiø7"], ["vii°7/7th", "vii°42"], ["IM7/3rd", "IM65"]]
  .forEach(([a, b]) => { total++; if (toFig(a) !== b) fail("toFig", a, toFig(a), "want", b); });

// fbwrite
for (const kind of ["triads", "sevenths"]) for (let i = 0; i < 300; i++) {
  const q = E.fbwrite.make(D.parseSettings("fbwrite", `mode=both&most=7&kind=${kind}&inv=all`)); total++;
  if (!E.fbwrite.check(q, q.answer)) fail("fbwrite refuses", q.show, q.answer);
  if (!/: [^/]*$/.test(q.show) || /\/(3rd|5th|7th)/.test(q.show)) fail("fbwrite show", q.show);
  const rev = q.answer.split(" ").reverse().join(" ");
  if (rev !== q.answer && E.fbwrite.check(q, rev)) fail("fbwrite accepts reversed", q.answer);
}

// fbreal: letters count up by the figure; accidentals from the key signature; the figure heard from the notes
const STEPS = { "53": [2, 4], "6": [2, 5], "64": [3, 5], "7": [2, 4, 6], "65": [2, 4, 5], "43": [2, 3, 5], "42": [1, 3, 5] };
for (let i = 0; i < 2000; i++) {
  const q = E.fbreal.make(D.parseSettings("fbreal", "mode=both&most=7&kind=both&show=staff")); total++;
  const L = "CDEFGAB", ns = q.want;
  STEPS[q.fig].forEach((st, j) => { if (L.indexOf(L[(ns[0].l + st) % 7]) !== ns[j + 1].l) fail("fbreal letters", q.fig, q.answer); });
  ns.forEach(n => { if (n.a !== q.key.sig[n.l]) fail("fbreal not in the key signature", q.key.label, q.answer); });
  const heard = figureOf(q.play[0]);
  if (heard && heard !== "dim7" && heard !== q.fig) fail("fbreal figure heard", q.fig, heard, q.answer);   // null = an augmented 7th chord type the reader skips
  if (!E.fbreal.check(q, q.answer)) fail("fbreal refuses", q.answer);
  if (!/clef=bass/.test(q.abc)) fail("fbreal abc", q.abc);
}

// sixfour: bass shapes
for (let i = 0; i < 600; i++) {
  const q = E.sixfour.make(D.parseSettings("sixfour", "mode=both&most=4&show=both")); total++;
  const b = q.play.map(c => c[0]);
  if (figureOf(q.play[1]) !== "64") fail("sixfour: 2nd chord not a six-four", q.answer, q.play[1]);
  if (q.answer === "cad" && !(b[1] === b[2] && figureOf(q.play[2]) === "53" && pc(q.play[2][0] - q.play[3][0]) === 7)) fail("cadential shape", b);
  if (q.answer === "pass" && !([1, 2].includes(Math.abs(b[1] - b[0])) && Math.sign(b[1] - b[0]) === Math.sign(b[2] - b[1]) && [1, 2].includes(Math.abs(b[2] - b[1])))) fail("passing shape", b);
  if (q.answer === "ped" && !(b[0] === b[1] && b[1] === b[2])) fail("pedal shape", b);
  q.play.forEach((c, k) => { for (let v = 1; v < 4; v++) if (c[v] < c[v - 1]) fail("voices cross", q.answer, k, c); });
  // the minor key's V has the raised leading tone
  if (q.rn[0] === "i" || q.rn[0] === "iv") { const vi = q.rn.findIndex(r => /^V/.test(r)); const r = figureOf(q.play[vi]); if (r && !/^V/.test(q.rn[vi])) fail("minor V", q.rn); }
  if (!/%%score/.test(q.abc)) fail("sixfour abc", q.abc);
}

console.log(fails ? `${fails} failures of ${total}` : `ok: ${total} questions`);
process.exit(fails ? 1 : 0);
