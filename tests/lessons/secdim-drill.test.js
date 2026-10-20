// The secondary diminished drills (Drills.engines.secdim / secdimwrite / secdimsym, practice/secondary-diminished.qmd) in Node. Each
// generated question is checked by arithmetic of its own: the chord's root is a half step below the root of the chord it resolves to,
// it is a diminished triad, or a fully-diminished seventh before a minor chord and a half-diminished seventh before a major one (the
// book's Figures 18.2.1-2), the figure matches the bass, at least one note is outside the key signature, the drawn ABC sounds the
// notes the answer names, and the typed forms the page promises are accepted (and wrong ones refused).
//   node tests/lessons/secdim-drill.test.js
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
// Left out because every note is in the key: vii°/III and viiø7/III in minor (ii° and iiø7). So minor triads tonicize 4 chords.
const TGT = { major: ["ii", "iii", "IV", "V", "vi"], minor: ["iv", "V", "VI", "VII"] };
const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const TON = { C: 0, G: 7, D: 2, A: 9, E: 4, B: 11, "F#": 6, "C#": 1, F: 5, Bb: 10, Eb: 3, Ab: 8, Db: 1, Gb: 6, Cb: 11, "G#": 8, "D#": 3, "A#": 10 };
for (const mode of ["major", "minor"]) for (const kind of ["tri", "sev"]) for (const inv of ["root", "all"]) {
  const s = D.parseSettings("secdim", `mode=${mode}&most=6&kind=${kind}&inv=${inv}`), seen = new Set(), tg = new Set();
  for (let i = 0; i < 500; i++) {
    const q = D.engines.secdim.make(s); total++;
    if (!q) { fail("no question", mode, kind); break; }
    const m = /^vii([°ø])(7|6|64|65|43|42)?\/(.+)$/.exec(q.answer); if (!m) { fail("answer form", q.answer); continue; }
    tg.add(m[3]); if (TGT[mode].indexOf(m[3]) < 0) fail("target", mode, q.answer);
    const [ch, res] = q.play, n = ch.length;
    if (n !== (kind === "sev" ? 4 : 3)) fail("size", q.answer);
    const ev = Ev.fromAbc(q.abc).sounding, at = t => ev.filter(e => Math.abs(e.t_on - t) < 1e-6).flatMap(e => e.notes).sort((a, b) => a - b);
    if (JSON.stringify(at(0)) !== JSON.stringify(ch.slice().sort((a, b) => a - b)) || JSON.stringify(at(2)) !== JSON.stringify(res.slice().sort((a, b) => a - b)))
      fail("abc vs play", q.abc, ch, res, at(0), at(2));
    const rp = res.map(pc), rroot = rp[0], rq = [pc(rp[1] - rroot), pc(rp[2] - rroot)].join();
    if (rq !== "4,7" && rq !== "3,7") fail("target quality", q.answer, rq);
    const major = rq === "4,7";
    if (major !== (m[3] === m[3].toUpperCase())) fail("target case", q.answer, rq);
    // the quality the book's tables give: dim triad; °7 before minor, ø7 before major
    const want = kind === "tri" ? [0, 3, 6] : major ? [0, 3, 6, 10] : [0, 3, 6, 9];
    if ((kind === "sev" ? (major ? "ø" : "°") : "°") !== m[1]) fail("sign", q.answer);
    const pcs = ch.map(pc), root = pc(rroot - 1);
    if (!want.every(w => pcs.indexOf(pc(root + w)) >= 0) || new Set(pcs).size !== want.length) { fail("quality / root", q.answer, pcs, root); continue; }
    const invIx = want.indexOf(pc(pcs[0] - root)), figs = kind === "sev" ? ["7", "65", "43", "42"] : [undefined, "6", "64"];
    if (figs[invIx] !== m[2]) fail("figure", q.answer, invIx);
    const ton = TON[q.label.match(/Key: ([A-Ga-g][♯♭]?)/)[1].toUpperCase().replace("♯", "#").replace("♭", "b")];
    if (pcs.every(p => SCALE[mode].indexOf(pc(p - ton)) >= 0)) fail("all diatonic", q.label, q.answer);
    if (!D.engines.secdim.check(q, q.answer) || !D.engines.secdim.check(q, q.answer.replace("°", "o").replace("ø", "h"))) fail("own answer", q.answer);
    if (D.engines.secdim.check(q, q.answer.replace(/[°ø]/, s => s === "°" ? "ø" : "°"))) fail("other sign accepted", q.answer);
    seen.add(q.abc);
  }
  const wantT = { majortri: 5, majorsev: 5, minortri: 4, minorsev: 4 }[mode + kind];
  console.log((seen.size > 40 && tg.size === wantT ? "ok   " : "FEW  ") + `secdim ${mode} ${kind} ${inv}: ${seen.size} different, targets ${[...tg].join(" ")}`);
  if (tg.size !== wantT) fail("targets", mode, kind, [...tg]);
}
// secdimwrite: own answer accepted (♯/♭ and #/b), reversed refused, and the notes stack as a dim chord a half step under the target
for (let i = 0; i < 1000; i++) {
  const E = D.engines.secdimwrite, q = E.make(D.parseSettings("secdimwrite", "mode=both&most=7&kind=both&inv=all")); total++;
  if (!E.check(q, q.answer) || !E.check(q, q.answer.replace(/♯/g, "#").replace(/♭/g, "b"))) fail("secdimwrite own answer", q.answer);
  if (E.check(q, q.answer.split(" ").reverse().join(" "))) fail("secdimwrite reversed accepted", q.answer);
  const tr = q.play[1].map(pc), root = pc(tr[0] - 1), pcs = q.play[0].map(pc);
  if (pcs.indexOf(root) < 0 || pcs.some(p => [0, 3, 6, 9, 10].indexOf(pc(p - root)) < 0)) fail("secdimwrite notes", q.show, q.answer);
}
// secdimsym both ways
for (let i = 0; i < 1000; i++) {
  const E = D.engines.secdimsym, q = E.make(D.parseSettings("secdimsym", "mode=both&most=7&kind=both&dir=both")); total++;
  if (!E.check(q, q.answer)) fail("secdimsym own answer", q.show, q.answer);
  if (!q.sec) {
    if (!E.check(q, q.answer.replace(/♯/g, "#").replace(/♭/g, "b").replace("°", "o"))) fail("secdimsym ascii", q.answer);
    if (E.check(q, q.answer + "/E")) fail("secdimsym slash accepted", q.answer);
    if (/[°ø]7$/.test(q.answer) && E.check(q, q.answer.replace(/[°ø]7$/, c => c[0] === "°" ? "ø7" : "°7"))) fail("secdimsym wrong quality", q.answer);
  }
}
// typed forms
const forms = { "vii°7/ii": "vii°7/ii", "viio7/ii": "vii°7/ii", "viidim7 of iv": "vii°7/iv", "viiø6/5/V": "viiø65/V", "viih65/V": "viiø65/V",
  "viiØ7/IV": "viiø7/IV", "vii°2/V": "vii°42/V", "vii°4/2/iv": "vii°42/iv", "vii°/V": "vii°/V", "vii°6/vi": "vii°6/vi", "vii°64/V": "vii°64/V",
  "viiø/V": null, "viiø6/V": null, "vii7/V": null, "vii/V": null, "VII°7/V": null, "vii°765/V": null, "vii°7/": null, "vii°7/V/V": null };
for (const [k, v] of Object.entries(forms)) { total++; if (D.normSecDim(k) !== v) fail("normSecDim", k, D.normSecDim(k), "want", v); }
console.log(fails ? fails + " FAILED of " + total : "all " + total + " ok");
process.exit(fails ? 1 : 0);
