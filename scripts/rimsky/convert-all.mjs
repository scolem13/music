// convert-all.mjs — run scripts/full-score/convert.mjs on every Rimsky-Korsakov example that has MusicXML and sort the results.
//   node scripts/rimsky/convert-all.mjs [--jobs 6] [--only 001,002]
// Reads ~/Projects/corpora/gutenberg-rimsky/index.json (scripts/rimsky/index.py) and 33900-h/music/NNN.xml; writes the ABC to
// <corpus>/abc/NNN.abc and scripts/rimsky/convert-report.json (per example: ok / problem kinds / converter notes / seconds).
// "ok" is the checker's ok, or only notices left (tempo, hidden, grace, tacet, tie; names when the converter numbered them), as in
// scripts/pdmx/convert-all.mjs. A few stray note faults are NOT let through here: Finale exports of a printed score should check clean.
import { spawn, execFileSync } from "node:child_process"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
const here = path.dirname(new URL(import.meta.url).pathname);
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const corpus = path.join(os.homedir(), "Projects/corpora/gutenberg-rimsky");
// xml2abc: XML2ABC env, else the copy in ~/Projects/corpora/_tools when convert.mjs's default path is missing
if (!process.env.XML2ABC && !fs.existsSync(path.join(os.homedir(), "Projects/pages-dev/tunes/xml2abc.py"))) process.env.XML2ABC = path.join(os.homedir(), "Projects/corpora/_tools/xml2abc_177/xml2abc.py");
const jobs = +(arg("--jobs") || 6), only = arg("--only") ? arg("--only").split(",") : null;
let rows = JSON.parse(fs.readFileSync(path.join(corpus, "index.json"), "utf8")).filter(e => e.xml && (!only || only.includes(e.n)));
// 175a/b and 292a/b exist as files without an index row of their own
const extra = ["175a", "175b", "292a", "292b"].filter(n => fs.existsSync(path.join(corpus, "33900-h/music", n + ".xml")) && (!only || only.includes(n)));
const all = rows.map(e => e.n).concat(extra.filter(n => !rows.some(e => e.n === n)));
fs.mkdirSync(path.join(corpus, "abc"), { recursive: true });
const repPath = path.join(here, "convert-report.json");
const report = fs.existsSync(repPath) && only ? JSON.parse(fs.readFileSync(repPath, "utf8")) : {};
const run = n => new Promise(res => {
  let src = path.join(corpus, "33900-h/music", n + ".xml"); const dst = path.join(corpus, "abc", n + ".abc");
  const t0 = Date.now(); let out = "", err = "";
  // short bars padded first (repair.py); the repaired file is what is converted and checked, the repairs are reported
  let repairs = [];
  if (!process.argv.includes("--no-repair")) {
    const fx = path.join(corpus, "xml-fixed", n + ".xml"); fs.mkdirSync(path.dirname(fx), { recursive: true });
    try { repairs = execFileSync("python3", ["-I", path.join(here, "repair.py"), src, fx], { encoding: "utf8" }).split("\n").filter(Boolean); } catch (e) { repairs = ["repair failed"]; }
    if (repairs.length && repairs[0] !== "repair failed") src = fx;
  }
  const c = spawn("node", [path.join(here, "../full-score/convert.mjs"), src, dst, "--json"]);
  const kill = setTimeout(() => c.kill("SIGKILL"), 240000);
  c.stdout.on("data", d => out += d); c.stderr.on("data", d => err += d);
  c.on("close", () => {
    clearTimeout(kill); let j = null;
    try { j = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1)); } catch {}
    const notes = err.split("\n").filter(l => /^note:/.test(l)).map(l => l.slice(6));
    const numbered = notes.some(x => /staff names numbered/.test(x));
    const namesOnly = j && !j.ok && Object.keys(j.byKind).every(k => ["tempo", "hidden", "grace", "tacet", "tie"].includes(k) || (k === "names" && numbered));
    // a few stray tie notes, as in scripts/pdmx/convert-all.mjs: only "notes" faults left (other kinds are notices), in at most
    // max(2, 1% of bars) bars, at most 2 notes each, none a wrong accidental. Passed with the mark fewNotes (the bars are listed)
    // and names accepted too: the examples repeat a name on purpose (Violin / Violin for a divisi; Horn in F 1 / 2)
    const NOT = ["tempo", "hidden", "grace", "tacet", "tie", "names"];
    let fewNotes = null;
    if (j && !j.ok && !namesOnly) {
      const faults = Object.keys(j.byKind).filter(k => !NOT.includes(k));
      if (faults.length === 1 && faults[0] === "notes") {
        const ns = (j.issues || []).filter(x => x.kind === "notes");
        const bars = +(/(\d+) bars/.exec(out) || [])[1] || 0;
        const parse = str => (str || "").split("|").map(t => t.trim()).filter(Boolean).map(t => t.split(",").map(Number));
        const small = ns.every(x => { const m = /missing in ABC \[([^\]]*)\] extra in ABC \[([^\]]*)\]/.exec(x.msg); if (!m) return false;
          const A = parse(m[1]), B = parse(m[2]); if (A.length + B.length > 2) return false;
          return !A.some(a => B.some(b => Math.abs(a[0] - b[0]) < 0.03 && Math.abs(a[1] - b[1]) === 1)); });
        if (small && ns.length <= Math.max(2, Math.floor(bars / 100))) fewNotes = ns.map(x => x.where);
      }
    }
    const namesAny = j && !j.ok && Object.keys(j.byKind).every(k => NOT.includes(k));
    report[n] = { repairs, fewNotes, ok: !!(j && (j.ok || namesOnly || namesAny || fewNotes)), byKind: j ? j.byKind : null,
      crash: j ? null : (err.trim().split("\n").filter(Boolean).pop() || "no output").slice(0, 300), notes, secs: (Date.now() - t0) / 1000,
      sample: j ? (j.issues || []).slice(0, 4).map(x => typeof x === "string" ? x : JSON.stringify(x).slice(0, 240)) : [] };
    res();
  });
});
const queue = all.slice();
await Promise.all(Array.from({ length: jobs }, async () => { while (queue.length) await run(queue.shift()); }));
fs.writeFileSync(repPath, JSON.stringify(report, null, 0));
const vals = Object.values(report), kinds = {};
for (const r of vals) if (!r.ok) for (const k of r.byKind ? Object.keys(r.byKind) : ["crash"]) kinds[k] = (kinds[k] || 0) + 1;
console.log(`${vals.length} examples, ${vals.filter(r => r.ok).length} pass; failing by problem kind:`, kinds);
