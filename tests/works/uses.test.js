// Every apps/shared/works/uses/*.js parses and registers { src, label, url, items }; every item has src (the file's), concept, note, url and a work id;
// hutchinson.js is what scripts/works/hutchinson-uses.mjs writes. NEG=1 breaks one item and must fail.
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = path.resolve(__dirname, "../../apps/shared/works/uses");
let bad = 0; const fail = (m) => { console.log("FAIL " + m); bad++; };
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));
if (!files.includes("hutchinson.js")) fail("no hutchinson.js");
files.forEach((f) => {
  const win = {}; let code = fs.readFileSync(path.join(dir, f), "utf8");
  if (process.env.NEG && f === "hutchinson.js") code = code.replace('"concept": "', '"concepx": "');
  try { vm.runInNewContext(code, { window: win }); } catch (e) { fail(f + " does not parse: " + e.message); return; }
  const reg = win.WORK_USES || [];
  if (reg.length !== 1) { fail(f + " pushes " + reg.length + " sources, want 1"); return; }
  const s = reg[0];
  if (s.src !== f.replace(/\.js$/, "")) fail(f + ": src is " + s.src);
  ["label", "url"].forEach((k) => { if (!s[k]) fail(f + ": source has no " + k); });
  if (!Array.isArray(s.items) || !s.items.length) fail(f + ": no items");
  (s.items || []).forEach((it, i) => {
    ["work", "concept", "note", "url"].forEach((k) => { if (!it[k] || typeof it[k] !== "string") fail(f + " item " + i + " (" + (it.title || it.work) + ") has no " + k); });
    if (it.url && !/^(https?:)?\/\//.test(it.url) && !it.url.startsWith("/")) fail(f + " item " + i + ": url " + it.url);
    if (!it.where) fail(f + " item " + i + " has no where");
    if (!it.title && !it.work) fail(f + " item " + i + " has no title");
  });
  console.log("ok   " + f + ": " + (s.items || []).length + " items");
});
console.log(bad ? bad + " failed" : "all ok"); process.exit(bad ? 1 : 0);
