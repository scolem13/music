// The accompaniment-pattern lessons (lessons/patterns/{bass,chords,drums,congas}.qmd, one section per pattern, written by
// scripts/pattern-lessons.mjs): on every page every lesson section is there and the first demo plays and writes its staff; in
// the lessons named in PAGES=a,b (their section ids, the old page names) or every lesson with ALL=1, every demo does, each
// choice button reaching the band. Also: how long a page takes to be ready (all demos built), which a merged page must keep
// short. Server on 8500 (tests/band/README.md), or BASE=http://127.0.0.1:port.
const { launch } = require("../lead/cdp.js"), fs = require("fs"), path = require("path"), wait = ms => new Promise(r => setTimeout(r, ms));
const BASE = process.env.BASE || "http://127.0.0.1:8500";
const ALL = !!process.env.ALL, PAGES = (process.env.PAGES || "bass-walk,chords-strum-camp,chords-takefive,bass-allblues,drums-hhsix2,congas-tumbao").split(",");
(async () => {
  const dir = path.join(__dirname, "../../../lessons/patterns");
  const pages = fs.readdirSync(dir).filter(f => /\.qmd$/.test(f) && f !== "index.qmd").map(f => f.replace(/\.qmd$/, ""));
  const b = await launch({ width: 1200, height: 900 }); let bad = 0, demos = 0;
  function ok(c, m) { if (!c) { bad++; console.log("FAIL", m); } }
  for (const page of pages) {
    const src = fs.readFileSync(path.join(dir, page + ".qmd"), "utf8"), ids = [...src.matchAll(/^## .* \{#([a-z0-9-]+)\}$/gm)].map(m => m[1]);
    const t0 = Date.now(); await b.goto(`${BASE}/lessons/patterns/${page}.html`);
    let ready = 0; for (let t = 0; t < 100 && !ready; t++) { await wait(100); ready = await b.eval("(() => { const d = document.querySelectorAll('.ar-demo'); return d.length && [...d].every(x => x.querySelector('.ar-play')) ? d.length : 0; })()"); }
    console.log(`${page}: ${ids.length} lessons, ${ready} demos ready in ${Date.now() - t0} ms`);
    ok(ready >= ids.length * 3, `${page}: ${ready} demos for ${ids.length} lessons`);
    for (const id of ids) ok(await b.eval(`!!document.getElementById(${JSON.stringify(id)})`), `${page}: no section #${id}`);
    const deepIds = ALL ? ids : ids.filter(id => PAGES.includes(id));
    const plays = [["document.querySelectorAll('.ar-demo')[0]", 1]].concat(await Promise.all(deepIds.map(async id => [`document.getElementById(${JSON.stringify(id)})`, await b.eval(`document.getElementById(${JSON.stringify(id)}).querySelectorAll('.ar-demo').length`), id])));
    for (const [root, n, id] of plays) for (let i = 0; i < n; i++) {
      const q = id ? `${root}.querySelectorAll('.ar-demo')[${i}]` : root;
      await b.eval(`${q}.scrollIntoView(); ${q}.querySelector('.ar-play').click()`);
      let svg = 0; for (let t = 0; t < 40 && !svg; t++) { await wait(400); svg = await b.eval(`${q}.querySelectorAll('.ar-staff svg').length`); }
      ok(svg, `${page} ${id || "first"} demo ${i + 1}: no staff written`); demos++;
      const ch = await b.eval(`${q}.querySelectorAll('.ar-choices button').length`);
      if (ch > 1) { await b.eval(`${q}.querySelectorAll('.ar-choices button')[1].click()`); await wait(300); }
    }
    await b.eval("document.getElementById('ar-stop').click()");
    ok(await b.eval("document.querySelectorAll('section.level2.ls-sec').length") >= ids.length, `${page}: sections not collapsible`);
  }
  b.errors.filter(e => !/supabaseUrl/.test(e)).forEach(e => { bad++; console.log("ERROR", e); });
  console.log(`${pages.length} pages, ${demos} demos played`); console.log(bad ? "PATTERNS FAILED" : "PATTERNS OK"); await b.close(); process.exit(bad ? 1 : 0);
})();
