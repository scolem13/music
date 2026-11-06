// JustinGuitar book (apps/shared/guitar/justin-course.js) and uses (works/uses/justin.js): every step links to a justinguitar.com lesson,
// every siteLinks href is a page that exists (.html -> .qmd), steps have a summary, ids are unique. NEG=1 breaks one link and must fail.
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.resolve(__dirname, "../..");
let bad = 0; const fail = (m) => { console.log("FAIL " + m); bad++; };
const win = { MLTBooks: {} }; win.window = win;
let code = fs.readFileSync(path.join(root, "apps/shared/guitar/justin-course.js"), "utf8");
if (process.env.NEG) code = code.replace("how-to-tune-a-guitar-for-beginners-b1-101", "x").replace('S = "https://www.justinguitar.com/', 'S = "https://example.com/');
vm.runInNewContext(code, win);
const b = win.MLTBooks.justin; if (!b) { fail("no book"); process.exit(1); }
const ids = new Set(); let steps = 0, links = 0;
for (const p of b.parts) for (const u of p.units) {
  if (!u.steps || !u.steps.length) fail(u.id + " has no steps");
  for (const s of u.steps || []) {
    steps++;
    if (ids.has(s.id)) fail("duplicate " + s.id); ids.add(s.id);
    if (!/^https:\/\/www\.justinguitar\.com\/guitar-lessons\/[a-z0-9-]+$/.test(s.href || "")) fail(s.id + " bad lesson link " + s.href);
    if (!s.title || !s.teacher || !s.page || s.hrefLabel !== "Open on JustinGuitar") fail(s.id + " incomplete");
    for (const l of s.siteLinks || []) {
      links++;
      const f = path.join(root, l.href.replace(/^\//, "").replace(/\.html$/, ".qmd"));
      if (!/\.html$/.test(l.href) || !fs.existsSync(f)) fail(s.id + " site link has no page: " + l.href);
      if (!l.label) fail(s.id + " link without label");
    }
  }
}
if (steps < 200) fail("only " + steps + " steps");
const page = fs.readFileSync(path.join(root, "lessons/justinguitar.qmd"), "utf8");
for (const p of b.parts) for (const u of p.units) if (!page.includes('data-unit="' + u.id + '"')) fail("page lacks unit " + u.id);
if (!/instruments: \[guitar\]/.test(page)) fail("page front matter");
const uw = { WORK_USES: [] }; uw.window = uw; vm.runInNewContext(fs.readFileSync(path.join(root, "apps/shared/works/uses/justin.js"), "utf8"), uw);
const items = uw.WORK_USES[0].items;
items.forEach((it, i) => { if (!/^https:\/\/www\.justinguitar\.com\/(songs|guitar-lessons)\//.test(it.url)) fail("uses item " + i + " url " + it.url); });
if (items.length < 802 + 6) fail("uses has " + items.length + " rows, want all 802 song lessons + 6 riffs");
const urls = new Set(items.map((i) => i.url));
// justin-link.js: every key names a real tune / Words & Chords song / works id / Billboard id, every link is a lesson in uses
let lj = fs.readFileSync(path.join(root, "apps/shared/works/justin-link.js"), "utf8");
if (process.env.NEG) lj = lj.replace(/"song:[a-z-]+"/, '"song:no-such-song"');
const jw = { document: {} }; jw.window = jw; vm.runInNewContext(lj, jw);
const idx = vm.runInNewContext("(function(){" + lj.match(/\/\* justin-index:begin[\s\S]*?\*\//)[0] + lj.match(/var INDEX[\s\S]*?\n};/)[0] + ";return INDEX})()", {});
const tuneIds = new Set(); for (const c of Object.values(new Function(fs.readFileSync(path.join(root, "apps/tunes/tunes-object.js"), "utf8") + ";return tunesObject")())) for (const m of String(c).matchAll(/^%%id\s+(\S+)/gm)) tuneIds.add(m[1]);
const sw = {}; new Function("window", fs.readFileSync(path.join(root, "apps/shared/data/songs.js"), "utf8"))(sw);
const wd = {}; new Function("window", fs.readFileSync(path.join(root, "apps/shared/works/works-data.js"), "utf8").replace(/window\.SONG_INDEX[^\n]*/, ""))(wd);
const bb = new Set(JSON.parse(fs.readFileSync(path.join(root, "apps/shared/data/billboard/index.json"), "utf8")).map((g) => String(g.id)));
let nk = 0;
for (const [k, v] of Object.entries(idx)) {
  nk++; const [kind, id] = [k.slice(0, k.indexOf(":")), k.slice(k.indexOf(":") + 1)];
  const ok = kind === "tune" ? tuneIds.has(id) : kind === "song" ? !!sw.SONGS.songs[id] : kind === "work" ? !!wd.WORKS[id] : kind === "billboard" ? bb.has(id) : false;
  if (!ok) fail("justin-link key not on the site: " + k);
  v.forEach((x) => { if (!urls.has(x[1])) fail(k + " link not in uses: " + x[1]); });
}
if (!jw.JustinLink || jw.JustinLink.of("song:deck-the-halls").length !== 1) fail("JustinLink.of(song:deck-the-halls)");
console.log(nk + " justin-link keys");
console.log(steps + " steps, " + links + " site links, " + items.length + " song rows");
console.log(bad ? bad + " failed" : "all ok"); process.exit(bad ? 1 : 0);
