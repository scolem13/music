// The accompaniment-pattern lessons (lessons/patterns/*.qmd, written by scripts/pattern-lessons.mjs): on every page the
// first demo plays and writes its staff, and on every page of ALL=1 (or the pages named in PAGES=a,b) every demo does,
// each choice button reaching the band. Server on 8500 (tests/band/README.md), or BASE=http://127.0.0.1:port.
const { launch } = require("../lead/cdp.js"), fs = require("fs"), path = require("path"), wait = ms => new Promise(r => setTimeout(r, ms));
const BASE = process.env.BASE || "http://127.0.0.1:8500";
const ALL = !!process.env.ALL, PAGES = (process.env.PAGES || "bass-walk,chords-strum-camp,chords-takefive,bass-allblues,drums-hhsix2,congas-tumbao").split(",");
(async () => {
  const dir = path.join(__dirname, "../../../lessons/patterns");
  const pages = fs.readdirSync(dir).filter(f => /\.qmd$/.test(f) && f !== "index.qmd").map(f => f.replace(/\.qmd$/, ""));
  const b = await launch({ width: 1200, height: 900 }); let bad = 0, demos = 0;
  function ok(c, m) { if (!c) { bad++; console.log("FAIL", m); } }
  for (const page of pages) {
    await b.goto(`${BASE}/lessons/patterns/${page}.html`); await wait(500);
    const n = await b.eval("document.querySelectorAll('.ar-demo').length");
    ok(n >= 3, `${page}: ${n} demos`);
    const deep = ALL || PAGES.includes(page);
    for (let i = 0; i < (deep ? n : 1); i++) {
      const q = `document.querySelectorAll('.ar-demo')[${i}]`;
      await b.eval(`${q}.querySelector('.ar-play').click()`);
      let svg = 0; for (let t = 0; t < 40 && !svg; t++) { await wait(400); svg = await b.eval(`${q}.querySelectorAll('.ar-staff svg').length`); }
      ok(svg, `${page} demo ${i + 1}: no staff written`); demos++;
      const ch = await b.eval(`${q}.querySelectorAll('.ar-choices button').length`);
      if (ch > 1) { await b.eval(`${q}.querySelectorAll('.ar-choices button')[1].click()`); await wait(300); }
    }
    await b.eval("document.getElementById('ar-stop').click()");
    ok(await b.eval("document.querySelectorAll('section.level2.ls-sec').length") >= 3, `${page}: sections not collapsible`);
  }
  b.errors.filter(e => !/supabaseUrl/.test(e)).forEach(e => { bad++; console.log("ERROR", e); });
  console.log(`${pages.length} pages, ${demos} demos played`); console.log(bad ? "PATTERNS FAILED" : "PATTERNS OK"); await b.close(); process.exit(bad ? 1 : 0);
})();
