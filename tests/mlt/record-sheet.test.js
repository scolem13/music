// LSA record sheet rules (apps/shared/mlt/record-sheet.js), after Mullen pp. 83–84.   node tests/mlt/record-sheet.test.js
const R = require("../../apps/shared/mlt/record-sheet.js");
let fails = 0; const eq = (n, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log((ok ? "ok   " : "FAIL ") + n + (ok ? "" : "  got " + JSON.stringify(a))); if (!ok) fails++; };
const r = R.parseRoster("+Ana\n Ben \n-Cal\n\n");
eq("roster: + high, - low, blank lines dropped", r, [{ name: "Ana", apt: "high" }, { name: "Ben", apt: "avg" }, { name: "Cal", apt: "low" }]);
eq("roster text round-trips", R.parseRoster(R.rosterText(r)), r);
eq("teaching mode: a line", R.mark("", "auto", "line"), "|");
eq("evaluation mode: the line crossed", R.mark("|", "auto", "line"), "+");
eq("next pattern: a new line after a crossed one", R.mark("+", "auto", "line"), "+|");
eq("another chance, absent, not attending", ["○", "a", "x"].reduce((s, t) => R.mark(s, t, "line"), ""), "○ax");
eq("undo removes the last mark", R.mark("+|", "undo", "line"), "+");
eq("PS: tap = check", R.mark("", "auto", "check"), "✓");
eq("A/O and VA steps use lines", [R.modeOf("Part: Harmony Lesson 2, major tonic and dominant (A/O)"), R.modeOf("x (VA)")], ["line", "line"]);
eq("PS and generalization steps use checks", [R.modeOf("Rhythm (PS)"), R.modeOf("Tonal (G-v)")], ["check", "check"]);
eq("rhythm vs tonal chart", [R.contentOf("Part: Rhythm Lesson 2, duple macrobeats"), R.contentOf("Part: Harmony Lesson 2, major tonic")], ["rhythm", "tonal"]);
const cls = { roster: r, sheets: { tonal: { k1: { title: "Maj I/V", marks: { Ana: "+", Cal: "|a" } } } } };
eq("table: students down, LSAs across", R.table(cls, "tonal").split("\n"), ["Student\tAptitude\tMaj I/V", "Ana\thigh\t+", "Ben\tavg\t", "Cal\tlow\t|a"]);
console.log(fails ? fails + " failed" : "RECORD SHEET OK"); process.exit(fails ? 1 : 0);
