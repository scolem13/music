// Scales page in headless Chrome: piano fingering, the fingering chart, CAGED / 3NPS positions.
// No Quarto render needed: serves tools/_scales.qmd (minus its ```{=html} fence) as a bare page,
// with /apps live from the repo. Run: node tests/scales/page.cdp.js [--shots <dir>]
// --site tests the rendered _site/tools/scales.html instead (run `quarto render tools/scales.qmd` first).
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../..");
const { launch } = require(path.join(ROOT, "tests/band/lead/cdp.js"));
const TYPES = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".png":"image/png", ".svg":"image/svg+xml", ".woff2":"font/woff2", ".json":"application/json" };
const SITE = process.argv.includes("--site");
const shotsAt = process.argv.indexOf("--shots"), SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;

const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  if (SITE) {
    const f = path.join(ROOT, "_site", p);
    if (!f.startsWith(path.join(ROOT, "_site"))) { res.writeHead(404); return res.end(); }
    return fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(data); });
  }
  if (p === "/scales.html") {
    const body = fs.readFileSync(path.join(ROOT, "tools/_scales.qmd"), "utf8").replace(/^```\{=html\}\n/, "").replace(/\n```\s*$/, "");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${body}</body></html>`);
  }
  const file = path.join(ROOT, p);
  if (!p.startsWith("/apps/") || !file.startsWith(ROOT)) { res.writeHead(404); return res.end(); }
  fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" }); res.end(data); });
});

(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const URL = `http://127.0.0.1:${server.address().port}${SITE ? "/tools/scales.html" : "/scales.html"}`;
  const b = await launch({ width: 1280, height: 1000 });
  const set = (id, v, ev = "input") => b.eval(`(function(){ var e = document.getElementById(${JSON.stringify(id)}); e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event(${JSON.stringify(ev)}, { bubbles:true })); })()`);
  const click = sel => b.eval(`document.querySelector(${JSON.stringify(sel)}).click()`);
  const text = sel => b.eval(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent`);
  const count = sel => b.eval(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  // finger badges left to right (the SVG draws white keys before black ones)
  const badges = () => b.eval(`Array.from(document.querySelectorAll('#keyboard svg text[font-weight="700"]')).sort(function(a,c){ return a.getAttribute('x') - c.getAttribute('x'); }).map(function(t){ return t.textContent; }).join('')`);
  const shot = async name => { if (SHOTS) await b.shot(path.join(SHOTS, name + ".png")); };
  let failed = 0; const check = (name, fn) => Promise.resolve().then(fn).then(() => console.log("ok  ", name), e => { failed++; console.log("FAIL", name, "\n    ", e.message); });
  try {
    await b.goto(URL); await b.sleep(600);
    await b.eval(`localStorage.clear()`);
    await click("#sc-tab-all");                                         // every panel on show for the checks below

    await check("C major: both hands' fingers on the keys", async () => {
      await set("root-select", "C"); await set("scale-select", "Major");
      assert.strictEqual(await count('#keyboard svg text[font-weight="700"]'), 16);
      assert.strictEqual(await count("#fx-body tr.fx-row"), 48, "chart starts with Kelley's 48 scales");
      assert.match(await text("#fingering-info"), /RH\s*12312341/);
      assert.match(await text("#fingering-info"), /LH\s*14321321/);
    });
    await check("RH only, and 5 at the ends", async () => {
      await click("#fing-rh"); assert.strictEqual(await badges(), "12312341");
      await click("#fing-use5"); assert.strictEqual(await badges(), "12312345");
      await click("#fing-use5"); await click("#fing-both");
    });
    await check("Bb major matches Kelley (RH 41231234, LH 32143213), thumbs never on black", async () => {
      await set("root-select", "Bb");
      assert.match(await text("#fingering-info"), /RH\s*41231234/);
      assert.match(await text("#fingering-info"), /LH\s*32143213/);
    });
    await check("G minor offers Kelley's alternate, and choosing it redraws the keys", async () => {
      await set("root-select", "G"); await set("scale-select", "Natural Minor (Aeolian)");
      await click("#fing-rh");
      assert.strictEqual(await badges(), "23412312");
      assert.strictEqual(await count("#fingering-info .fing-alt"), 2);
      await b.eval(`document.querySelectorAll('#fingering-info .fing-alt')[1].click()`);
      assert.strictEqual(await badges(), "12312341");
      await click("#fing-both");
    });
    await check("D Dorian gets a derived fingering with an explanation", async () => {
      await set("root-select", "D"); await set("scale-select", "Dorian");
      assert.match(await text("#fingering-info"), /C major/);
    });
    await check("pentatonic: no fingering, and a reason", async () => {
      await set("scale-select", "Minor Pentatonic");
      assert.strictEqual(await count('#keyboard svg text[font-weight="700"]'), 0);
      assert.match(await text("#fingering-info"), /seven-note/);
    });
    await shot("piano");

    await check("chart: 48 Kelley scales by default; grouping by RH fingering", async () => {
      await set("root-select", "C"); await set("scale-select", "Major");
      assert.strictEqual(await count("#fx-body tr.fx-row"), 60, "Dorian was added when it was chosen above");
      assert.strictEqual(await count("#fx-body tr.fx-row.current"), 1);
      await set("fx-arrange", "rh");
      assert(await count("#fx-body tr.fx-group") >= 4);
      assert.match(await text("#fx-body tr.fx-group"), /RH 12312341/);
      await set("fx-root", "10");
      assert.strictEqual(await count("#fx-body tr.fx-row"), 5);
      await set("fx-root", ""); await set("fx-arrange", "fifths");
    });
    await check("chart: tapping a row loads that scale", async () => {
      await b.eval(`Array.from(document.querySelectorAll('#fx-body tr.fx-row')).find(function(r){ return /^E♭ Major/.test(r.textContent); }).click()`);
      assert.strictEqual(await b.eval(`document.getElementById('root-select').value`), "Eb");
      assert.match(await text("#fingering-info"), /RH\s*31234123/);
      assert.match(await text("#mini-status"), /E♭ Major/);
    });
    await check("chart: rules, credit and the major/minor analysis are filled in", async () => {
      assert.strictEqual(await count("#fx-rules-list li"), 6);
      assert.match(await text("#fx-credit"), /Robert T\. Kelley/);
      assert.match(await text("#fx-credit"), /robertkelleyphd\.com/);
      assert.match(await text("#fx-analysis"), /22 of the 24/);
    });
    await shot("chart");

    const dots = () => count("#fretboard svg circle[data-isl-sf]");
    await check("fretboard: whole neck by default, CAGED and 3NPS offered for a major scale", async () => {
      await set("root-select", "C"); await set("scale-select", "Major");
      assert.match(await text("#pos-systems"), /Whole neck.*CAGED.*3 notes per string/);
      assert(await dots() > 40);
      assert.strictEqual(await b.eval(`Array.from(document.querySelectorAll('#fretboard svg text')).filter(function(t){ return /^#\\d+$/.test(t.textContent); }).length`), 0, "no placeholder labels left");
    });
    await check("CAGED: one position lit, the rest ghosted; stepping changes it", async () => {
      await b.eval(`Array.from(document.querySelectorAll('#pos-systems button')).find(function(x){ return x.textContent==='CAGED'; }).click()`);
      const n = await dots(); assert(n >= 15 && n <= 18, "dots in a CAGED position: " + n);
      assert(await count("#pos-chips .pos-chip") >= 5);
      const first = await text("#pos-desc");
      await click("#pos-next");
      assert.notStrictEqual(await text("#pos-desc"), first);
      await set("fb-label-mode", "finger");
      const labels = await b.eval(`Array.from(document.querySelectorAll('#fretboard svg circle[data-isl-sf]')).map(function(c){ return c.__tx ? c.__tx.textContent : ''; }).join('')`);
      assert.match(labels, /^[0-4]+$/, "finger labels: " + labels);
      await shot("caged");
      await set("fb-label-mode", "note");
    });
    await check("3NPS: 18 notes on guitar, 12 on bass", async () => {
      await b.eval(`Array.from(document.querySelectorAll('#pos-systems button')).find(function(x){ return /3 notes/.test(x.textContent); }).click()`);
      assert.strictEqual(await dots(), 18);
      await set("instrument-select", "bass");
      assert.strictEqual(await dots(), 12);
      await shot("3nps-bass");
      await set("instrument-select", "guitar");
    });
    await check("a mode names the parent pattern it shares", async () => {
      await set("root-select", "D"); await set("scale-select", "Dorian");
      assert.match(await text("#pos-desc"), /same fingerboard pattern as C Major/);
    });
    await check("the shape explainer is filled from the computed analysis", async () => {
      assert.match(await text("#pos-analysis"), /G shape = Em shape/);
      assert.match(await text("#pos-analysis"), /major 1 = minor 3/);
    });
    await check("harmonic minor and pentatonic positions; diminished has none", async () => {
      await set("root-select", "A"); await set("scale-select", "Harmonic Minor");
      assert.match(await text("#pos-systems"), /CAGED.*3 notes/);
      await set("scale-select", "Minor Pentatonic");
      assert.match(await text("#pos-systems"), /^Whole neckCAGED$/);
      await set("scale-select", "Diminished (W-H)");
      assert.strictEqual(await text("#pos-systems"), "Whole neck");
      assert.match(await text("#pos-desc"), /No position system/);
      await set("scale-select", "Dorian");
    });
    await check("ukulele and chords fall back to the whole neck", async () => {
      await set("instrument-select", "ukulele");
      assert.strictEqual(await text("#pos-systems"), "Whole neck");
      await set("instrument-select", "guitar");
      await click("#mode-chords"); await b.eval(`document.getElementById('mode-chords').dispatchEvent(new Event('change'))`);
      assert.strictEqual(await text("#pos-systems"), "Whole neck");
      assert.strictEqual(await b.eval(`document.getElementById('fingering-strip').classList.contains('d-none')`), true);
    });
    await check("tabs: one panel at a time, and the choice is kept", async () => {
      await click("#mode-scales"); await b.eval(`document.getElementById('mode-scales').dispatchEvent(new Event('change'))`);
      await click("#sc-tab-fretboard");
      const seen = () => b.eval(`Array.from(document.querySelectorAll('#sc-panes > .sc-panel')).filter(function(p){ return p.offsetHeight > 0; }).map(function(p){ return p.dataset.panel; }).join()`);
      assert.strictEqual(await seen(), "fretboard");
      assert(await dots() >= 12, "the fretboard is drawn on its tab");
      await click("#sc-tab-keyboard"); assert.strictEqual(await seen(), "keyboard");
      assert.strictEqual(await count('#keyboard svg text[font-weight="700"]'), 16);
      assert.strictEqual(await b.eval(`localStorage.getItem('isl_tab')`), "keyboard");
      await shot("tab-piano");
    });
    await check("the bar at the foot holds Play and the choice; Play shows it is playing", async () => {
      assert.strictEqual(await b.eval(`getComputedStyle(document.getElementById('sc-bar')).position`), "fixed");
      assert.strictEqual(await count("#sc-bar #global-play, #sc-bar #root-select, #sc-bar #scale-select"), 3);
      await click("#global-play"); await b.sleep(150);
      assert.strictEqual(await b.eval(`document.getElementById('global-play').getAttribute('data-state')`), "playing");
      await click("#global-play");
      assert.strictEqual(await count("#scales-root #establish:not([hidden])"), 1, "Establish tonality is the page's own button");
      assert.strictEqual(await count("#establish-tonality-btn"), 0, "and no second one floats over the bar");
    });
    await check("spelling: the menus are built when the fold opens, and follow the scale", async () => {
      await b.eval(`document.getElementById('enharmonicsSheet').open = true`); await b.sleep(100);
      const n = await count("#enharmonicsForm select"); assert(n >= 7, "a menu for each note: " + n);
      await set("scale-select", "Minor Pentatonic"); await b.sleep(100);
      assert.strictEqual(await count("#enharmonicsForm select"), n - 2);
      await set("scale-select", "Major");
    });
    await check("no Bootstrap markup is left for the page to lean on", async () => {
      assert.strictEqual(await count("#scales-root :is(.btn,.card,.form-select,.offcanvas,.dropdown-menu,[data-bs-toggle])"), 0);
    });
    await check("phone width: no sideways page scroll", async () => {
      await b.resize(390, 800); await b.sleep(300);
      assert.strictEqual(await count("#sc-bar #global-play, #sc-bar #root-select, #sc-bar #scale-select"), 3, "nothing has left the bar");
      assert(await b.eval(`Array.from(document.querySelectorAll('#sc-bar > *')).every(function(e){ return e.offsetWidth === 0 || e.getBoundingClientRect().right <= window.innerWidth; })`), "the bar's controls fit the window");
      assert(await b.eval(`document.getElementById('root-select').offsetWidth >= 36`), "the Root menu is not squeezed");
      assert.strictEqual(await count(".playbar-pop #establish"), 1, "Establish tonality has moved to Options");
      assert(await b.eval(`document.getElementById('notation').querySelector('svg').getBoundingClientRect().width <= window.innerWidth`), "the staff was redrawn to the narrow width");
      assert(await b.eval(`document.documentElement.scrollWidth <= window.innerWidth + 1`), "page scrolls sideways");
      await shot("phone");
      await click("#sc-tab-all"); await b.sleep(200);
      assert(await b.eval(`document.documentElement.scrollWidth <= window.innerWidth + 1`), "page scrolls sideways with everything on show");
    });
    await check("no page errors", () => { const real = b.errors.filter(e => !/favicon|supabase|brand\/fonts/i.test(e)); assert.deepStrictEqual(real, []); });
  } finally { await b.close(); server.close(); }
  console.log(failed ? `FAILED: ${failed}` : "PASS");
  process.exit(failed ? 1 : 0);
})();
