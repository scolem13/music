// Merges the Songfinder and every book index (apps/realbooks/index/*.json) into one catalogue of tunes:
// apps/realbooks/catalogue-data.js (window.REALBOOKS). Safe to re-run as indexes are added.
// Run: node scripts/realbooks/build-catalogue.js
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "../../apps/realbooks");
const sf = JSON.parse(fs.readFileSync(path.join(dir, "songfinder.json"), "utf8"));
const books = JSON.parse(fs.readFileSync(path.join(dir, "books.json"), "utf8")).books;

// one key per tune: lower case, accents and punctuation gone, a leading "the"/"a" and bracketed parts dropped
function key(t) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and")
    .replace(/\([^)]*\)/g, " ").replace(/^\s*(the|a|an)\s+/, "").replace(/,\s*(the|a)\s*$/, "")
    .replace(/[^a-z0-9]+/g, "") || t.toLowerCase();
}
const tunes = new Map();
function tune(title) {
  const k = key(title);
  if (!tunes.has(k)) tunes.set(k, { t: title, aka: [], sf: [], at: [] });
  const x = tunes.get(k);
  if (x.t !== title && !x.aka.includes(title) && x.aka.length < 4) x.aka.push(title);
  return x;
}
sf.songs.forEach(s => { tune(s.title).sf = s.vols; });

const idxDir = path.join(dir, "index"), used = [];
if (fs.existsSync(idxDir)) for (const f of fs.readdirSync(idxDir).filter(f => f.endsWith(".json")).sort()) {
  let ix; try { ix = JSON.parse(fs.readFileSync(path.join(idxDir, f), "utf8")); } catch (e) { console.warn("skipped", f, e.message); continue; }
  let b = books.findIndex(x => x.file === ix.file);
  if (b < 0) { console.warn("not in books.json:", ix.file); continue; }
  used.push({ b, method: ix.method, n: (ix.entries || []).length, notes: ix.notes || "" });
  (ix.entries || []).forEach(e => {
    if (!e.title || !e.pdfPage) return;
    const x = tune(e.title);
    x.at.push([b, e.pdfPage, e.page == null ? null : e.page, e.conf || "", e.composer || ""]);
    if (!x.c && e.composer) x.c = e.composer;
  });
}
const list = [...tunes.values()].sort((a, b) => key(a.t).localeCompare(key(b.t)));
list.forEach(x => { if (!x.aka.length) delete x.aka; if (!x.sf.length) delete x.sf; });
// Songfinder volumes we own as a PDF (books.json "sf"), and whether each tune is in any PDF we have
const sfOwned = {}; books.forEach((b, i) => { if (b.sf) (sfOwned[b.sf] = sfOwned[b.sf] || []).push(i); });
list.forEach(x => { x.pdf = x.at.length ? 1 : (x.sf || []).some(v => sfOwned[v]) ? 2 : 0; });   // 1: in an indexed book, 2: only via an owned Songfinder volume (not yet indexed), 0: no PDF
const out = { sfOwned, built: new Date().toISOString().slice(0, 10), sfVols: sf.vols, books: books.map(b => ({ file: b.file, title: b.title, tier: b.tier, hand: !!b.hand })), indexed: used, tunes: list };
fs.writeFileSync(path.join(dir, "catalogue-data.js"), "window.REALBOOKS = " + JSON.stringify(out) + ";\n");
console.log(list.length, "tunes;", used.length, "book indexes;", list.reduce((a, x) => a + x.at.length, 0), "book printings");
