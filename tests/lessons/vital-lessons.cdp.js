// The "Vital, step by step" lessons (lessons/vital-01-window … vital-10-real-thing, written by scripts/vital-lessons/build.py):
// each page renders with the Vital panel, ≥ 4 steps and ≥ 4 questions; every step's ▶ (IntroKit.play) resolves true and makes sound
// (IntroKit.level(500) > 0.004); a step with data-page opens that page of the panel (its controls visible, the others hidden);
// Previous / Next links point at files that exist; no page errors (the site-wide supabase one aside).
// Run after rendering:  node tests/lessons/vital-lessons.cdp.js [slug ...]   (NEG=1 must fail; SITE=<dir>)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json"
  : f.endsWith(".svg") ? "image/svg+xml" : f.endsWith(".mp3") ? "audio/mpeg" : f.endsWith(".wav") ? "audio/wav" : f.endsWith(".woff2") ? "font/woff2" : "text/html";
const PORT = 8610;
const SLUGS = process.argv.slice(2).length ? process.argv.slice(2) : ["vital-01-window", "vital-02-oscillators", "vital-03-filter", "vital-04-envelopes", "vital-05-modulation",
  "vital-06-lfos", "vital-07-playing", "vital-08-effects", "vital-09-voices", "vital-10-real-thing"];
// one control that only shows on each page of the Vital panel
const PAGE_CTL = { voice: "o1Frame", fx: "fxCho", matrix: "m1s" };
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1500, 1000);
  for (const slug of SLUGS) {
    const file = SITE + "/lessons/" + slug + ".html";
    if (!fs.existsSync(file)) { check(slug + ": rendered", false, "no " + file); continue; }
    const before = b.errors.length;
    await b.goto(`http://127.0.0.1:${PORT}/lessons/${slug}.html`); await b.sleep(1800);
    const pg = await b.eval(`({ panel: !!document.querySelector('.ik-box .scmp-vital .fp-svg'), steps: IntroKit.steps.length, qs: document.querySelectorAll('.ik-q').length,
      title: document.title, nav: [...document.querySelectorAll('.vl-nav a')].map(a => a.getAttribute('href')) })`);
    check(slug + ": the Vital panel, ≥ 4 steps, ≥ 4 questions", pg.panel && pg.steps >= 4 && pg.qs >= 4, JSON.stringify({ panel: pg.panel, steps: pg.steps, qs: pg.qs }));
    const missing = pg.nav.filter(h => !fs.existsSync(path.join(SITE, "lessons", path.basename(new URL(h, "http://x/").pathname))));
    check(slug + ": Previous and Next links point at existing pages", pg.nav.length === 2 && missing.length === 0, pg.nav.join(", ") + (missing.length ? "  missing: " + missing.join(", ") : ""));
    for (let i = 0; i < pg.steps; i++) {
      const r = await b.eval(`(async () => { const ok = await IntroKit.play(${i}); const lv = await IntroKit.level(500); const st = IntroKit.steps[${i}].dataset;
        let shown = null; if (st.page) { const s = document.querySelector('.scmp-vital .fp-svg'), fw = document.querySelector('.scmp-vital .fp-w');
          const vis = k => { const e = s.querySelector('[data-ctl="' + k + '"]'); return !!e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none' && !e.closest('[style*="display: none"]'); };
          shown = { page: fw && fw._fp ? fw._fp.page() : null, vis: Object.fromEntries(Object.entries(${JSON.stringify(PAGE_CTL)}).map(([p, k]) => [p, vis(k)])) }; }
        IntroKit.stop(); return { ok, lv, page: st.page || null, shown }; })()`);
      check(`${slug}: step ${i + 1} plays and sounds`, r.ok === true && r.lv > 0.004, "level " + (+r.lv).toFixed(4));
      if (r.page) check(`${slug}: step ${i + 1} opens the ${r.page} page`, r.shown && r.shown.page === r.page && Object.entries(r.shown.vis).every(([p, v]) => v === (p === r.page)), JSON.stringify(r.shown));
      await b.sleep(150);
    }
    const errs = b.errors.slice(before).filter(e => !/supabase/i.test(e));
    check(slug + ": no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
  }
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})();
