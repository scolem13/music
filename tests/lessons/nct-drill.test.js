// The non-chord tone drills (Drills.engines.nct / nctrule, theory/non-chord-tones.qmd) in Node: thousands of generated
// questions per type, each checked by abc-nht.js's own reading of the melody against its chord symbols (the marked note is
// the type asked, every other note a chord tone) and for full bars in both voices.   node tests/lessons/nct-drill.test.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const R = path.resolve(__dirname, "../..") + "/";
require(R + "apps/shared/abc-core.js"); require(R + "apps/shared/abc-events.js");
const N = require(R + "apps/shared/abc-nht.js"), Ev = global.AbcEvents || require(R + "apps/shared/abc-events.js");
const win = { document: { readyState: "complete", querySelectorAll: () => [] }, localStorage: null };
win.window = win; vm.createContext(win);
vm.runInContext(fs.readFileSync(R + "apps/shared/drills/drills.js", "utf8"), win);
const D = win.Drills, E = D.engines.nct;
const WANT = { PT: "passing", NT: "neighbor", APP: "appoggiatura", ET: "escape", DN: "double-neighbor", ANT: "anticipation", PED: "pedal", SUS: "suspension", RET: "retardation" };
let fails = 0, total = 0;
for (const t of Object.keys(WANT)) for (const mode of ["major", "minor"]) {
  const s = D.parseSettings("nct", `types=${t}&mode=${mode}&most=5&syms=show`);
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    const q = E.make(s); total++;
    if (!q) { fails++; console.log("FAIL no question", t, mode); break; }
    const abc = q.abc.replace(/"\^\*"/g, "");
    // bars: 8 eighths in every bar of both voices
    for (const v of ["1", "2"]) {
      const ev = Ev.fromAbc(abc, { voice: v }), end = Math.max(...ev.sounding.map(n => n.t_off));
      if (Math.abs(end - 8) > 1e-6) { fails++; console.log("FAIL length", t, v, end, abc); }
    }
    const tones = N.analyzeAbc(abc, { voice: "1" }).tones.filter(x => x.attacked !== false || x.type === "suspension" || x.type === "retardation");
    // map tones back to melody notes by onset
    const bad = [];
    q.marks.forEach(k => { const x = tones.filter(o => o.type !== "chord-tone")[q.marks.indexOf(k)]; if (!x || x.type !== WANT[t]) bad.push(x ? x.type : "none"); });
    const ncts = tones.filter(o => o.type !== "chord-tone");
    if (ncts.length !== q.marks.length) bad.push(ncts.length + " non-chord tones: " + ncts.map(o => o.type));
    if (bad.length) { fails++; if (fails < 15) console.log("FAIL", t, mode, bad.join(","), "\n" + q.abc); }
    seen.add(q.abc);
  }
  console.log((seen.size > 20 ? "ok   " : "FEW  ") + t + " " + mode + ": " + seen.size + " different");
}
const r = D.engines.nctrule; for (let i = 0; i < 50; i++) { const q = r.make({}); if (r.answers().indexOf(q.answer) < 0) fails++; }
console.log(fails ? fails + " FAILED of " + total : "all " + total + " ok");
process.exit(fails ? 1 : 0);
