// Rhythm spelling drills (apps/shared/drills/rhythm-spell.js: rhyfix, rhyerr; theory/rhythm-basics.qmd 4.6) in Node.
// Each question's ABC is read back here (lengths, ties, rests, beam groups) without the engine's code:
//   every bar fills its meter; rhyfix's answer sounds the same as the written bar and the "diff" choice does not;
//   the answer bar has no note across the middle of 4/4 / 12/8 and no note crossing a beat from off it (except the
//   eighth-quarter-eighth syncopation); every misspelled bar breaks one of those or its beams cross a beat.
//   node tests/lessons/rhythm-spell.test.js      NEG=1 swaps in a rule that lets misspellings through: must fail.
const fs = require("fs"), path = require("path"), vm = require("vm");
const R = path.resolve(__dirname, "../..") + "/";
const win = { document: { readyState: "loading", querySelectorAll: () => [], addEventListener() {} }, localStorage: null };
win.window = win; vm.createContext(win);
vm.runInContext(fs.readFileSync(R + "apps/shared/drills/drills.js", "utf8"), win);
let src = fs.readFileSync(R + "apps/shared/drills/rhythm-spell.js", "utf8");
if (process.env.NEG) src = src.replace("if (crossesMid(m, s, e)) return m.mid === 8", "if (false) return m.mid === 8");
vm.runInContext(src, win);
const D = win.Drills;
const MET = { "2/4": [8, 4], "3/4": [12, 4], "4/4": [16, 4, 8], "2/2": [16, 8], "6/8": [12, 6, 0, 1], "9/8": [18, 6, 0, 1], "12/8": [24, 6, 12, 1] };
let fails = 0, total = 0; const fail = (...a) => { fails++; if (fails < 15) console.log("FAIL", ...a); };
// a bar -> [{s, e, rest, tie, beamedToPrev}]
function read(bar) {
  const out = []; let at = 0;
  for (const m of bar.matchAll(/(\s*)(?:"[^"]*")?([zB])(\d*)(-?)/g)) {
    const L = m[3] ? +m[3] : 1;
    out.push({ s: at, e: at + L, rest: m[2] === "z", tie: !!m[4], joined: out.length > 0 && m[1] === "" });
    at += L;
  }
  return out;
}
const sound = p => { const g = []; p.forEach((x, i) => { for (let t = x.s; t < x.e; t++) g[t] = x.rest ? "." : t === x.s && !(p[i - 1] && p[i - 1].tie) ? "x" : "-"; }); return g.join(""); };
function bad(meter, p) {   // the reason this bar is misspelled, or ""
  const [T, b, mid, comp] = MET[meter];
  for (const x of p) {
    const L = x.e - x.s, cross = Math.floor(x.s / b) !== Math.floor((x.e - 1) / b);
    if (mid && x.s < mid && mid < x.e && !(x.s === 0 && L === 12 && !x.rest && T === 16)) return "across the middle " + x.s;
    if (!cross) continue;
    if (comp && (x.s % b || x.e % b)) return "compound beat hidden " + x.s;
    if (!comp && x.s % b && !(x.s % b === b / 2 && L === b && !x.rest)) return "off-beat across a beat " + x.s;
  }
  const bm = x => !x.rest && x.e - x.s < 4;
  for (let i = 1; i < p.length; i++) {
    const same = Math.floor(p[i - 1].s / b) === Math.floor(p[i].s / b), want = same && bm(p[i - 1]) && bm(p[i]);
    if (p[i].joined !== want) return (want ? "beat's beam broken " : "beam across a beat ") + p[i].s;
  }
  return "";
}
function bars(abc) { const body = abc.split("\n").slice(4).join(" "); return body.split(/\|\|?\]?/).map(s => s.trim()).filter(Boolean); }
const all = Object.keys(MET).join(",");
for (const kinds of ["note", "rest", "beam", "note,rest,beam"]) for (let n = 0; n < 300; n++) {
  const q = D.makeSeeded("rhyfix", "meters=" + all + "&kinds=" + kinds, n * 7 + 1); total++;
  if (!q) { fail("no question", kinds, n); continue; }
  const meter = q.meter, T = MET[meter][0], bs = bars(q.abc).map(read);
  if (bs.length !== 4) { fail("bars", q.abc); continue; }
  bs.forEach(p => { if (p[p.length - 1].e !== T) fail("length", meter, q.abc); });
  const ans = bs[1 + "ABC".indexOf(q.answer)];
  if (sound(ans) !== sound(bs[0])) fail("answer sounds different", q.abc);
  if (bad(meter, ans)) fail("answer misspelled: " + bad(meter, ans), q.abc);
  if (!bad(meter, bs[0])) fail("written bar is not misspelled", q.abc);
  bs.slice(1).forEach((p, i) => { if (p !== ans && !bad(meter, p) && sound(p) === sound(bs[0])) fail("second right answer", q.abc); });
}
const seen = {};
for (let n = 0; n < 600; n++) {
  const q = D.makeSeeded("rhyerr", "meters=" + all, n * 3 + 2); total++;
  if (!q) { fail("no rhyerr"); continue; }
  const p = read(bars(q.abc)[0]); seen[q.answer] = 1;
  if (p[p.length - 1].e !== MET[q.meter][0]) fail("length", q.abc);
  if ((q.answer === "ok") !== !bad(q.meter, p)) fail("rhyerr " + q.answer + " vs " + (bad(q.meter, p) || "fine"), q.abc);
}
if (Object.keys(seen).length !== 4) fail("not every answer appears", Object.keys(seen));
console.log(fails ? fails + " failures in " + total : "ok: " + total + " questions");
process.exit(fails ? 1 : 0);
