// Suggest pieces that sit in more than one collection, for apps/shared/works/works-data.js.
// Reads the Tune Library (apps/tunes/tunes-object.js: %%id and T:), Classical Themes (apps/themes/themes-data.js) and the
// analysed scores (theory/analysed-scores/_*.qmd: data-piece and the page's title), compares titles, and prints each group that is
// not yet one work. A suggestion is a title match only: listen or look before adding it.
//   node scripts/works-suggest.mjs            groups across collections
//   node scripts/works-suggest.mjs --all      also groups inside one collection (the same tune in two keys, etc.)
import fs from "fs";
import path from "path";
const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const all = process.argv.includes("--all");

const items = [];   // { kind, id, title, where }
const tunesSrc = read("apps/tunes/tunes-object.js");
const tunesObject = new Function(tunesSrc.replace(/^\s*const tunesObject\s*=/m, "return ").replace(/;\s*$/, ""))();
for (const [set, abc] of Object.entries(tunesObject)) {
  for (const tune of String(abc).split(/\n(?=X:)/)) {
    const id = (/^%%id\s+(\S+)/m.exec(tune) || [])[1], t = (/^T:\s*(.+)$/m.exec(tune) || [])[1];
    if (id && t) items.push({ kind: "tune", id, title: t.trim(), where: set });
  }
}
const th = read("apps/themes/themes-data.js");
for (const t of JSON.parse(th.slice(th.indexOf("["), th.lastIndexOf("]") + 1)))
  items.push({ kind: "theme", id: t.id, title: t.last + " " + t.title, where: "Classical Themes" });
const asDir = "theory/analysed-scores";
for (const f of fs.readdirSync(path.join(root, asDir)).filter((f) => /^_.*\.qmd$/.test(f))) {
  const s = read(path.join(asDir, f));
  for (const m of s.matchAll(/data-piece="([^"]+)"/g)) items.push({ kind: "analysed", id: m[1], title: m[1].replace(/-/g, " "), where: f.slice(1, -4) });
}

const STOP = new Set("the a an of in on and no op for to from with major minor movement mvt 1st 2nd 3rd 4th theme piano str vn vc orch".split(" "));
const words = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]+/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
const key = (s) => words(s).slice(0, 3).sort().join(" ");

let works = {};
try { const w = read("apps/shared/works/works-data.js"); works = new Function("window", w + "\nreturn window.WORKS;")({}) || {}; } catch (e) {}
const inWork = new Map();
for (const [wid, w] of Object.entries(works)) for (const [kind, ids] of Object.entries(w.in || {})) for (const x of ids) inWork.set(kind + ":" + (x.piece || x), wid);

const groups = new Map();
for (const it of items) { const k = key(it.title); if (k.split(" ").length < 2) continue; (groups.get(k) || groups.set(k, []).get(k)).push(it); }
let n = 0;
for (const [k, g] of [...groups].sort()) {
  if (g.length < 2) continue;
  if (!all && new Set(g.map((x) => x.where)).size < 2) continue;
  const owners = new Set(g.map((x) => inWork.get(x.kind + ":" + x.id) || "-"));
  if (owners.size === 1 && !owners.has("-")) continue;   // already one work
  n++;
  console.log("\n" + k);
  for (const x of g) console.log("  " + x.kind.padEnd(8) + String(x.id).padEnd(32) + x.where.padEnd(20) + x.title + (inWork.has(x.kind + ":" + x.id) ? "   [work " + inWork.get(x.kind + ":" + x.id) + "]" : ""));
}
console.log("\n" + n + " groups (" + items.length + " items read)");
