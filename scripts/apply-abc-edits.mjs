// Write ABC edits made on the Tunes page (abc-editor.js, "Download edits") into apps/tunes/tunes-object.js.
//   node scripts/apply-abc-edits.mjs ~/Downloads/abc-edits-2026-10-29.json            (shows what would change)
//   node scripts/apply-abc-edits.mjs ~/Downloads/abc-edits-2026-10-29.json --write    (writes it)
// The file: { app: "abc-edits", edits: { "<%%id>": "X:…", "<collection>#<title>": "X:…" } }. Each tune is found by its
// %%id (or, without one, by its T: title in that collection) and its block replaced. Every edited tune's bar lengths are
// checked as scripts/clean-tunes.mjs checks them; a tune that is not found, or that abcjs cannot read, is skipped.
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(root, "apps/tunes/tunes-object.js");
const args = process.argv.slice(2), WRITE = args.includes("--write"), file = args.find(a => !a.startsWith("--"));
if (!file) { console.error("usage: node scripts/apply-abc-edits.mjs <abc-edits.json> [--write]"); process.exit(2); }
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const edits = data.edits || data;

const ctx = { window: {}, console, navigator: { userAgent: "node" }, document: { createElement: () => ({}) } };
ctx.self = ctx.window; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "apps/shared/abcjs-basic.js"), "utf8"), ctx);
const ABC = ctx.ABCJS;

function check(abc) {
  let r; try { r = ABC.parseOnly(abc)[0]; } catch (e) { return { fatal: String(e) }; }
  if (!r || !(r.lines || []).length) return { fatal: "no music read" };
  const mt = r.getMeterFraction ? r.getMeterFraction() : { num: 4, den: 4 }, barLen = mt.num / mt.den, lens = [];
  let cur = 0, tup = 1;
  for (const line of r.lines || []) for (const st of line.staff || []) for (const v of st.voices || []) for (const e of v) {
    if (e.el_type === "note") { if (e.startTriplet && e.tripletMultiplier) tup = e.tripletMultiplier; cur += (e.duration || 0) * tup; if (e.endTriplet) tup = 1; }
    else if (e.el_type === "bar") { if (cur > 0) lens.push(cur); cur = 0; }
  }
  if (cur > 0) lens.push(cur);
  const bad = []; for (let i = 1; i < lens.length - 1; i++) if (Math.abs(lens[i] - barLen) > 1e-6) bad.push(i + 1);
  return { bars: lens.length, bad, warns: (r.warnings || []).map(w => String(w).replace(/<[^>]*>/g, "")).filter(w => !/Unknown directive: id/.test(w)) };
}

let src = fs.readFileSync(DATA, "utf8");
// the collections: "name":\n`…`
const colls = [];
for (const m of src.matchAll(/^"([^"]+)":\s*\n`/gm)) {
  const start = m.index + m[0].length, end = src.indexOf("`", start);
  colls.push({ name: m[1], start, end });
}
function blocks(c) {                       // each tune: from its X: line to the line before the next X: (or the collection's end)
  const text = src.slice(c.start, c.end), out = [], re = /^X:/gm; let m; const at = [];
  while ((m = re.exec(text))) at.push(m.index);
  at.forEach((a, i) => {
    let b = i + 1 < at.length ? at[i + 1] : text.length;
    let body = text.slice(a, b), trail = body.match(/\s*$/)[0];
    out.push({ from: c.start + a, to: c.start + a + body.length - trail.length, abc: body.slice(0, body.length - trail.length) });
  });
  return out;
}
let changed = 0, skipped = 0;
const plan = [];
for (const [key, abcRaw] of Object.entries(edits)) {
  const abc = String(abcRaw).replace(/\s+$/, "");
  let hit = null;
  const hash = key.indexOf("#");
  for (const c of colls) {
    if (hash >= 0 && c.name !== key.slice(0, hash)) continue;
    for (const t of blocks(c)) {
      const ok = hash >= 0 ? ((/^T:\s*(.+)$/m.exec(t.abc) || [])[1] || "").trim() === key.slice(hash + 1)
                           : new RegExp("^%%id\\s+" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$", "m").test(t.abc);
      if (ok) { hit = { ...t, coll: c.name }; break; }
    }
    if (hit) break;
  }
  if (!hit) { console.log("SKIP " + key + ": not found in tunes-object.js"); skipped++; continue; }
  if (hit.abc === abc) { console.log("same " + key); continue; }
  if (abc.includes("`")) { console.log("SKIP " + key + ": a backtick would end the collection's string"); skipped++; continue; }
  const c = check(abc);
  if (c.fatal) { console.log("SKIP " + key + ": " + c.fatal); skipped++; continue; }
  console.log("edit " + key + " (" + hit.coll + "): " + c.bars + " bars" + (c.bad.length ? ", bars " + c.bad.join(" ") + " off the meter's length" : ", lengths right")
    + (c.warns.length ? ", abcjs: " + c.warns[0] : ""));
  plan.push({ ...hit, abc });
  changed++;
}
plan.sort((a, b) => b.from - a.from).forEach(p => { src = src.slice(0, p.from) + p.abc + src.slice(p.to); });
if (WRITE && changed) {
  vm.runInContext(src + ";this.__ok = typeof tunesObject", vm.createContext({}));   // still a script that runs
  fs.writeFileSync(DATA, src);
  console.log(`wrote ${changed} tune(s) into apps/tunes/tunes-object.js` + (skipped ? `, ${skipped} skipped` : ""));
  console.log("then: bump tunes-object.js's ?v= where it is loaded, and rerun node scripts/bass-ear-corpus.mjs if the tune is used there");
} else console.log(`${changed} to change, ${skipped} skipped` + (changed && !WRITE ? " (add --write to write them)" : ""));
