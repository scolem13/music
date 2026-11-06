// convert-all.mjs — run scripts/full-score/convert.mjs on every PDMX pick and sort the results by what the checker found.
//   node scripts/pdmx/convert-all.mjs [--only originals] [--jobs 6]
// Reads scripts/pdmx/picks.json (+ verdicts.json when --only originals), writes ABC to ~/Downloads/PDMX-abc/<group>/<file>.abc
// and scripts/pdmx/convert-report.json: per score ok / problem counts by kind / converter notes / seconds.
import { spawn } from "node:child_process"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
const here = path.dirname(new URL(import.meta.url).pathname);
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const jobs = +(arg("--jobs") || 6);
let picks = JSON.parse(fs.readFileSync(path.join(here, "picks.json"), "utf8")).map((p, i) => ({ ...p, i }));
if (arg("--only") === "originals") {
  const v = JSON.parse(fs.readFileSync(path.join(here, "verdicts.json"), "utf8"));
  const nf = path.join(here, "notable.json"), nb = fs.existsSync(nf) ? JSON.parse(fs.readFileSync(nf, "utf8")) : {};   // celebrated arrangements, kept too
  picks = picks.filter(p => (v[p.i] && v[p.i].orig === "yes") || nb[p.i]);
}
const outDir = path.join(os.homedir(), "Downloads/PDMX-abc");
const repPath = path.join(here, "convert-report.json");
const report = fs.existsSync(repPath) ? JSON.parse(fs.readFileSync(repPath, "utf8")) : {};
const run = p => new Promise(res => {
  const src = path.join(os.homedir(), "Downloads", "PDMX-" + p.group, p.file);
  const dst = path.join(outDir, p.group, p.file.replace(/\.mxl$/, ".abc")); fs.mkdirSync(path.dirname(dst), { recursive: true });
  const t0 = Date.now(); let out = "", err = "";
  const c = spawn("node", [path.join(here, "../full-score/convert.mjs"), src, dst, "--json"]);
  const kill = setTimeout(() => c.kill("SIGKILL"), 180000);
  c.stdout.on("data", d => out += d); c.stderr.on("data", d => err += d);
  c.on("close", code => {
    clearTimeout(kill); let j = null;
    try { j = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1)); } catch {}
    const notes = err.split("\n").filter(l => /^note:/.test(l)).map(l => l.slice(6));
        // passes with only notices left: tempo (several tempo marks: real or a ritardando, a person judges), hidden / grace (playback-only
    // notes, already notices to the checker) and names when the converter numbered them (Violin I / II tell the staves apart)
    const numbered = notes.some(n => /staff names numbered/.test(n));
    const namesOnly = j && !j.ok && Object.keys(j.byKind).every(k => ["tempo", "hidden", "grace", "tacet"].includes(k) || (k === "names" && numbered));
    report[p.i] = { group: p.group, file: p.file, ok: !!(j && (j.ok || namesOnly)), byKind: j ? j.byKind : null,
      crash: j ? null : (err.trim().split("\n").filter(Boolean).pop() || "no output").slice(0, 200), notes, secs: (Date.now() - t0) / 1000,
      sample: j ? (j.issues || []).slice(0, 4).map(x => typeof x === "string" ? x : JSON.stringify(x).slice(0, 200)) : [] };
    res();
  });
});
const queue = picks.slice(); let done = 0;
await Promise.all(Array.from({ length: jobs }, async () => { while (queue.length) { await run(queue.shift()); if (++done % 50 === 0) { fs.writeFileSync(repPath, JSON.stringify(report, null, 0)); console.error(done); } } }));
fs.writeFileSync(repPath, JSON.stringify(report, null, 0));
const vals = Object.values(report), kinds = {};
for (const r of vals) if (!r.ok) for (const k of r.byKind ? Object.keys(r.byKind) : ["crash"]) kinds[k] = (kinds[k] || 0) + 1;
console.log(`${vals.length} scores, ${vals.filter(r => r.ok).length} pass; failing scores by problem kind:`, kinds);
