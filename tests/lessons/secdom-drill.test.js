// The secondary-dominant drills (Drills.engines.secdom / secwrite / secsym, practice/secondary-dominants.qmd) in Node. Each generated
// question is checked by arithmetic of its own: the chord's root is a perfect 5th above the root of the chord it resolves to, it is a
// major triad or a dominant seventh, at least one note is outside the key signature, the target is a major or minor triad of the key,
// the drawn ABC sounds the notes the answer names, and the typed forms the page promises are accepted.
//   node tests/lessons/secdom-drill.test.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js"); require(R + "apps/shared/abc-events.js");
const Ev = global.AbcEvents;
const win = { document: { readyState: "complete", querySelectorAll: () => [] }, localStorage: null };
win.window = win; vm.createContext(win);
vm.runInContext(fs.readFileSync(R + "apps/shared/drills/drills.js", "utf8"), win);
const D = win.Drills;
let fails = 0, total = 0;
function fail(...a) { fails++; if (fails < 20) console.log("FAIL", ...a); }
const pc = m => ((m % 12) + 12) % 12;
// Chords made only of the key's notes are never asked: V/IV in major (the tonic chord), V/III and V/VI in minor (VII and III),
// V7/III in minor (VII7). So major triads tonicize 4 chords, major sevenths 5, minor triads 3 (iv V VII), minor sevenths 4.
const TGT = { major: ["ii", "iii", "IV", "V", "vi"], minor: ["III", "iv", "V", "VI", "VII"] };
const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const TON = { C: 0, G: 7, D: 2, A: 9, E: 4, B: 11, "F#": 6, "C#": 1, F: 5, Bb: 10, Eb: 3, Ab: 8, Db: 1, Gb: 6, Cb: 11, "G#": 8, "D#": 3, "A#": 10 };
for (const mode of ["major", "minor"]) for (const kind of ["tri", "sev"]) for (const inv of ["root", "all"]) {
  const s = D.parseSettings("secdom", `mode=${mode}&most=6&kind=${kind}&inv=${inv}`), seen = new Set(), tg = new Set();
  for (let i = 0; i < 500; i++) {
    const q = D.engines.secdom.make(s); total++;
    if (!q) { fail("no question", mode, kind); break; }
    const m = /^V(7|6|64|65|43|42)?\/(.+)$/.exec(q.answer); if (!m) { fail("answer form", q.answer); continue; }
    tg.add(m[2]); if (TGT[mode].indexOf(m[2]) < 0) fail("target", mode, q.answer);
    const [ch, res] = q.play, n = ch.length;
    if (n !== (kind === "sev" ? 4 : 3)) fail("size", q.answer);
    // the drawn ABC sounds what play says, chord by chord
    const ev = Ev.fromAbc(q.abc).sounding, at = t => ev.filter(e => Math.abs(e.t_on - t) < 1e-6).flatMap(e => e.notes).sort((a, b) => a - b);
    if (JSON.stringify(at(0)) !== JSON.stringify(ch.slice().sort((a, b) => a - b)) || JSON.stringify(at(2)) !== JSON.stringify(res.slice().sort((a, b) => a - b)))
      fail("abc vs play", q.abc, ch, res, at(0), at(2));
    // root: bass note moved by the inversion; find the pitch class whose stack is M3 P5 (m7)
    const pcs = ch.map(pc), want = kind === "sev" ? [0, 4, 7, 10] : [0, 4, 7];
    const root = pcs.find(r => want.every(w => pcs.indexOf(pc(r + w)) >= 0)); if (root == null) { fail("quality", q.answer, pcs); continue; }
    const invIx = want.indexOf(pc(pcs[0] - root)), figs = kind === "sev" ? ["7", "65", "43", "42"] : [undefined, "6", "64"];
    if (figs[invIx] !== m[1]) fail("figure", q.answer, invIx);
    const rp = res.map(pc), rroot = rp[0]; // resolution is in root position
    if (pc(root - rroot) !== 7) fail("not a 5th above", q.answer, root, rroot);
    const rq = [pc(rp[1] - rroot), pc(rp[2] - rroot)].join(); if (rq !== "4,7" && rq !== "3,7") fail("target quality", q.answer, rq);
    if ((rq === "4,7") !== (m[2] === m[2].toUpperCase())) fail("target case", q.answer, rq);
    const ton = TON[q.label.match(/Key: ([A-Ga-g][♯♭]?)/)[1].toUpperCase().replace("♯", "#").replace("♭", "b")];
    if (pcs.every(p => SCALE[mode].indexOf(pc(p - ton)) >= 0)) fail("all diatonic", q.label, q.answer);
    if (D.normSec(q.answer) !== q.answer) fail("normSec own answer", q.answer);
    seen.add(q.abc);
  }
  console.log((seen.size > 40 && tg.size === { majortri: 4, majorsev: 5, minortri: 3, minorsev: 4 }[mode + kind] ? "ok   " : "FEW  ") + `secdom ${mode} ${kind} ${inv}: ${seen.size} different, targets ${[...tg].join(" ")}`);
}
// secwrite: the typed answer is accepted, and its notes are the chord's
for (let i = 0; i < 500; i++) {
  const E = D.engines.secwrite, q = E.make(D.parseSettings("secwrite", "mode=both&most=7&kind=both&inv=all")); total++;
  if (!E.check(q, q.answer) || !E.check(q, q.answer.replace(/♯/g, "#").replace(/♭/g, "b"))) fail("secwrite own answer", q.answer);
  if (E.check(q, q.answer.split(" ").reverse().join(" "))) fail("secwrite reversed accepted", q.answer);
}
// secsym both ways
for (let i = 0; i < 500; i++) {
  const E = D.engines.secsym, q = E.make(D.parseSettings("secsym", "mode=both&most=7&kind=both&dir=both")); total++;
  if (!E.check(q, q.answer)) fail("secsym own answer", q.show, q.answer);
  if (!q.sec && !E.check(q, q.answer.replace(/♯/g, "#").replace(/♭/g, "b"))) fail("secsym ascii", q.answer);
  if (!q.sec && E.check(q, q.answer + "/E")) fail("secsym slash accepted", q.answer);
}
// typed forms
const forms = { "V7/ii": "V7/ii", "V7 of ii": "V7/ii", "V6/5/V": "V65/V", "V65/V": "V65/V", "V2/IV": "V42/IV", "V4/2/IV": "V42/IV", "V/V": "V/V",
  "V6/vi": "V6/vi", "V64/iii": "V64/iii", "V/VII": "V/VII", "V765/V": null, "V7/vii°": "V7/vii°", "v/V": null, "V7/": null };
for (const [k, v] of Object.entries(forms)) { total++; if (D.normSec(k) !== v) fail("normSec", k, D.normSec(k), "want", v); }
console.log(fails ? fails + " FAILED of " + total : "all " + total + " ok");
process.exit(fails ? 1 : 0);
