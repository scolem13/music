// The Neapolitan drills (neapolitan.js: Drills.engines.neap / neapwrite / neapsym / neapear, theory/neapolitan.qmd) in Node.
// Each generated question is checked by arithmetic of its own, not by the engine's tables: N is a major triad whose root is a
// minor 2nd above the tonic, spelled on the 2nd letter; N6 has scale degree 4 in the bass; no other drilled chord has the
// lowered 2nd; the drawn ABC sounds what is played; the answer is the only one of the drill's answers that fits; the typed
// forms the page promises are accepted and wrong ones refused. The ear drill: the bass is scale degree 4 doubled, and in N6
// the lowered 2nd falls to the leading tone in the same voice.
//   node tests/lessons/neapolitan-drill.test.js            (NEG=1 breaks the engine on purpose: the test must fail)
const fs = require("fs"), path = require("path"), vm = require("vm");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js"); require(R + "apps/shared/abc-events.js");
const Ev = global.AbcEvents;
const win = { document: { readyState: "complete", querySelectorAll: () => [] }, localStorage: null };
win.window = win; vm.createContext(win);
vm.runInContext(fs.readFileSync(R + "apps/shared/drills/drills.js", "utf8"), win);
let src = fs.readFileSync(R + "apps/shared/drills/neapolitan.js", "utf8");
if (process.env.NEG) src = src.replace("N: [[1, 1], [3, 5], [5, 8]]", "N: [[1, 2], [3, 5], [5, 9]]");   // N built on the plain 2nd
vm.runInContext(src, win);
const D = win.Drills;
let fails = 0, total = 0;
function fail(...a) { fails++; if (fails < 20) console.log("FAIL", ...a); }
const pc = m => ((m % 12) + 12) % 12;
const LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
const tonicOf = label => { const m = /([A-Ga-g])([♯♭]?) (major|minor)/.exec(label); return { l: LET.indexOf(m[1].toUpperCase()), pc: pc(NAT[LET.indexOf(m[1].toUpperCase())] + (m[2] === "♯" ? 1 : m[2] === "♭" ? -1 : 0)), mode: m[3] }; };
const nm = n => ({ l: LET.indexOf(n[0]), pc: pc(NAT[LET.indexOf(n[0])] + (n.includes("♯") ? 1 : n.includes("♭") ? -1 : 0)) });
const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
// the chord a set of pitch classes is, in the key (independent of the engine): root offset + quality
function analyse(pcs, ton) {
  pcs = [...new Set(pcs)];
  for (const r of pcs) { const iv = pcs.map(p => pc(p - r)).sort((a, b) => a - b).join();
    const q = iv === "0,4,7" ? "maj" : iv === "0,3,7" ? "min" : iv === "0,3,6" ? "dim" : null; if (q) return { r: pc(r - ton), q, root: r }; }
  return null;
}
const RN = { "1maj": "N", "5min": "iv", "5maj": "IV", "2dim": "ii°", "2min": "ii", "7maj": "V" };

// neap: name it
for (const mode of ["major", "minor"]) for (const chords of ["n", "pd"]) for (const inv of ["root", "six", "both"]) {
  const E = D.engines.neap, s = D.parseSettings("neap", `mode=${mode}&most=7&chords=${chords}&inv=${inv}`), seen = new Set(), ans = new Set();
  for (let i = 0; i < 400; i++) {
    const q = E.make(s); total++;
    if (!q) { fail("no question", mode, chords, inv); break; }
    const k = tonicOf(q.label), [ch, res] = q.play, pcs = ch.map(pc), a = analyse(pcs, k.pc);
    if (!a) { fail("not a triad", q.answer, pcs); continue; }
    const base = RN[a.r + a.q]; if (!base) { fail("unknown chord", q.label, a); continue; }
    if (mode === "major" && /iv|ii°/.test(base) || mode === "minor" && /^(IV|ii)$/.test(base)) fail("chord not of the mode", q.label, base);
    const invIx = pcs[0] === a.root ? 0 : 1;
    if (pcs[0] !== a.root && pc(pcs[0] - a.root) !== (a.q === "maj" ? 4 : 3)) fail("second inversion drawn", q.answer);
    const want = base + (invIx ? "6" : "");
    if (want !== q.answer) fail("answer", q.label, q.answer, "want", want, pcs);
    if (base === "N" && invIx && pc(pcs[0] - k.pc) !== 5) fail("N6 bass not degree 4", q.label);
    if (chords === "n" && base !== "N") fail("not N", q.answer);
    // spelling: N's root is on the letter above the tonic
    if (base === "N") { const r = q.notes[0]; if (r.l !== (k.l + 1) % 7) fail("N root letter", q.label, r); }
    // the resolution is V: major, root a 5th above the tonic
    const v = analyse(res.map(pc), k.pc); if (!v || v.r !== 7 || v.q !== "maj") fail("resolution not V", q.label, res);
    // drawn = played
    const ev = Ev.fromAbc(q.abc).sounding, at = t => ev.filter(e => Math.abs(e.t_on - t) < 1e-6).flatMap(e => e.notes).sort((x, y) => x - y);
    if (at(0).join() !== ch.slice().sort((x, y) => x - y).join() || at(2).join() !== res.slice().sort((x, y) => x - y).join()) fail("abc vs play", q.abc, ch, at(0));
    // uniqueness: of every answer the drill offers, only this one is accepted
    const all = ["N", "N6", "iv", "iv6", "IV", "IV6", "ii", "ii6", "ii°", "ii°6"].filter(x => E.check(q, x));
    if (all.length !== 1 || all[0] !== q.answer) fail("not exactly one answer", q.answer, all);
    if (base === "N") { const alt = q.answer.replace("N", "♭II"); if (!E.check(q, alt) || !E.check(q, alt.replace("♭", "b"))) fail("♭II form refused", q.answer); }
    if (base === "ii°" && !E.check(q, q.answer.replace("°", "o"))) fail("o form refused", q.answer);
    if (base !== "N" && pcs.includes(pc(k.pc + 1))) fail("distractor has ♭2", q.answer);
    if (base === "N" && pcs.every(p => SCALE[mode].includes(pc(p - k.pc)))) fail("N all diatonic", q.label);
    seen.add(q.abc); ans.add(q.answer);
  }
  console.log(`neap ${mode} ${chords} ${inv}: ${seen.size} different, answers ${[...ans].sort().join(" ")}`);
}
// neapwrite: spelled exactly
for (let i = 0; i < 2000; i++) {
  const E = D.engines.neapwrite, q = E.make(D.parseSettings("neapwrite", "mode=both&most=7&inv=both")); total++;
  const k = tonicOf(q.label), ns = q.answer.split(" ").map(nm);
  const root = /N6/.test(q.show) ? ns[2] : ns[0];
  if (root.l !== (k.l + 1) % 7 || pc(root.pc - k.pc) !== 1) fail("neapwrite root", q.label, q.answer);
  const a = analyse(ns.map(n => n.pc), k.pc); if (!a || a.q !== "maj" || a.r !== 1) fail("neapwrite chord", q.answer);
  if (new Set(ns.map(n => n.l)).size !== 3 || ns.some(n => ![(k.l + 1) % 7, (k.l + 3) % 7, (k.l + 5) % 7].includes(n.l))) fail("neapwrite letters", q.answer);
  if (/N6/.test(q.show) && pc(ns[0].pc - k.pc) !== 5) fail("neapwrite N6 bass", q.answer);
  if (!E.check(q, q.answer) || !E.check(q, q.answer.replace(/♯/g, "#").replace(/♭/g, "b"))) fail("neapwrite own answer", q.answer);
  if (E.check(q, q.answer.split(" ").reverse().join(" "))) fail("neapwrite reversed accepted", q.answer);
  const enh = q.answer.replace(/^([A-G])♯/, (m, l) => ({ C: "D♭", D: "E♭", F: "G♭", G: "A♭", A: "B♭" })[l] || m);
  if (enh !== q.answer && E.check(q, enh)) fail("neapwrite enharmonic accepted", q.answer, enh);
}
// neapsym both ways
for (let i = 0; i < 2000; i++) {
  const E = D.engines.neapsym, q = E.make(D.parseSettings("neapsym", "mode=both&most=7&inv=both&dir=both")); total++;
  if (!E.check(q, q.answer)) fail("neapsym own answer", q.show, q.answer);
  if (q.sec) {
    const sixth = /\//.test(q.show.split(":")[1]);
    if (q.answer !== (sixth ? "N6" : "N")) fail("neapsym numeral", q.show, q.answer);
    if (E.check(q, sixth ? "N" : "N6")) fail("neapsym other position accepted", q.show);
  } else {
    const k = tonicOf(q.show), m = /^([A-G][♯♭]?)(?:\/([A-G][♯♭]?))?$/.exec(q.answer);
    if (!m) { fail("neapsym form", q.answer); continue; }
    const r = nm(m[1]); if (r.l !== (k.l + 1) % 7 || pc(r.pc - k.pc) !== 1) fail("neapsym root", q.show, q.answer);
    if (/N6/.test(q.show) !== !!m[2]) fail("neapsym slash", q.show, q.answer);
    if (m[2] && pc(nm(m[2]).pc - k.pc) !== 5) fail("neapsym bass", q.show, q.answer);
    if (!E.check(q, q.answer.replace(/♯/g, "#").replace(/♭/g, "b"))) fail("neapsym ascii", q.answer);
    if (E.check(q, m[1] + "m" + (m[2] ? "/" + m[2] : ""))) fail("neapsym minor accepted", q.answer);
    if (m[2] && E.check(q, m[1])) fail("neapsym missing bass accepted", q.answer);
  }
}
// neapear: voicing and answer
for (const mode of ["minor", "major"]) {
  const E = D.engines.neapear, s = D.parseSettings("neapear", `mode=${mode}&most=4`), got = new Set();
  for (let i = 0; i < 600; i++) {
    const q = E.make(s); total++;
    const k = tonicOf(q.label), pd = q.play[1], v = q.play[2], a = analyse(pd.map(pc), k.pc);
    const base = a && RN[a.r + a.q], want = base === "N" ? "N6" : base === "iv" || base === "IV" ? "iv" : base === "ii°" || base === "ii" ? "ii6" : null;
    if (want !== q.answer) fail("ear answer", q.label, q.answer, pd);
    if (mode === "minor" && base === "IV" || mode === "major" && (base === "iv" || base === "ii°")) fail("ear chord of the wrong mode", base);
    if (pc(pd[0] - k.pc) !== 5 || pd.filter(m => pc(m - pd[0]) === 0).length < 2) fail("ear bass not degree 4 doubled", q.label, pd);
    if (pd.some((m, j) => j && m <= pd[j - 1]) || v.some((m, j) => j && m <= v[j - 1])) fail("voices cross", pd, v);
    if (q.answer === "N6") { const j = pd.findIndex(m => pc(m - k.pc) === 1); if (j < 0 || pc(v[j] - k.pc) !== 11 || v[j] >= pd[j]) fail("♭2 not down to the leading tone", pd, v); }
    if (analyse(v.map(pc), k.pc).r !== 7) fail("ear V", v);
    const ev = ["1", "2"].flatMap(vc => Ev.fromAbc(q.abc, { voice: vc }).sounding), at = t => ev.filter(e => Math.abs(e.t_on - t) < 1e-6).flatMap(e => e.notes).sort((x, y) => x - y);
    for (let c = 0; c < 4; c++) if (at(2 * c).join() !== q.play[c].slice().sort((x, y) => x - y).join()) { fail("ear abc vs play", c, q.abc, at(2 * c), q.play[c]); break; }
    if (Math.max(...ev.map(e => e.t_on)) !== 6 || ev.length !== 8 || ["1", "2"].some(vc => Ev.fromAbc(q.abc, { voice: vc }).quarters !== 8)) fail("ear bar lengths", q.abc);
    got.add(q.answer);
  }
  if (got.size !== 3) fail("ear answers", mode, [...got]);
  console.log(`neapear ${mode}: answers ${[...got].join(" ")}`);
}
// typed forms
const forms = { N: "N", N6: "N6", "♭II": "N", "♭II6": "N6", bII6: "N6", "N 6": "N6", "N6/3": "N6", iio6: "ii°6", iidim6: "ii°6", iv6: "iv6",
  n6: null, "♭ii6": null, II6: null, N64: null, "V/N": null, "": null };
for (const [k, v] of Object.entries(forms)) { total++; if (D.normN(k) !== v) fail("normN", k, D.normN(k), "want", v); }
console.log(fails ? fails + " FAILED of " + total : "all " + total + " ok");
process.exit(fails ? 1 : 0);
