// The teacher's replay on my-report.qmd rebuilds each Theory Drill question from its exercise, settings and seed
// (Drills.makeSeeded). Checks: every exercise gives the same question for the same seed, whatever was asked before it,
// and the rebuilt question takes the same answer. node tests/report/drill-replay.test.js   (NEG=1 must fail)
const fs = require("fs"), path = require("path"), vm = require("vm");
const R = path.resolve(__dirname, "../..") + "/";
const win = { document: { readyState: "complete", querySelectorAll: () => [] }, localStorage: null };
win.window = win; vm.createContext(win);
["drills", "figured", "mixture", "neapolitan", "motives", "jazz"].forEach(f => vm.runInContext(fs.readFileSync(R + "apps/shared/drills/" + f + ".js", "utf8"), win));
const D = win.Drills, E = D.engines; let fails = 0, total = 0;
function fail(...a) { fails++; if (fails < 30) console.log("FAIL", ...a); }
const sig = q => JSON.stringify(q, (k, v) => typeof v === "function" || k === "E" ? undefined : v);
for (const ex of Object.keys(E)) {
  const set = D.settingsString(ex, D.parseSettings(ex, ""));
  for (let i = 0; i < 25; i++) {
    const seed = process.env.NEG ? undefined : 1000 + i * 7919;
    const a = D.makeSeeded(ex, set, seed);
    for (let k = 0; k < 3; k++) E[ex].make(D.parseSettings(ex, set));   // other questions in between
    const b = D.makeSeeded(ex, set, seed);
    if (!a) continue; total++;
    if (sig(a) !== sig(b)) { fail(ex, "seed " + seed + " gave two questions"); break; }
    const chk = (q, x) => E[ex].check ? E[ex].check(q, x) : x === q.answer;
    if (!chk(b, a.answer)) fail(ex, "rebuilt question refuses", a.answer);
  }
}
console.log(fails ? fails + " failures" : "ok — " + total + " questions rebuilt, " + Object.keys(E).length + " exercises");
process.exit(fails ? 1 : 0);
