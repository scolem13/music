// Classic Organs Compared in a browser (lessons/organ-compare.qmd, apps/shared/lessons/organ-compare.js, panels/organ-*.js).
// Every organ's faithful panel draws (light and dark) with every bound control known to the adapter, Panel / Simple switches,
// a drawbar / tab change reaches the engine and the translation report, ▶ Play sounds, the famous-tracks list draws and each
// Build button loads its registration, ?organ= pre-selects. The intro pages are covered by tests/lessons/intro-instruments.cdp.js.
// Run after rendering: node tests/lessons/organ-compare.cdp.js   (NEG=1 must fail; SITE=<dir> for a render elsewhere)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8573;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 900);
  if (!fs.existsSync(SITE + "/lessons/organ-compare.html")) { check("rendered", false, "no organ-compare.html in " + SITE); }
  else {
    await b.goto(`http://127.0.0.1:${PORT}/lessons/organ-compare.html`); await b.sleep(1500);
    check("widget mounted", await b.eval(`!!(window.OrganCompare && OrganCompare.widgets.length === 1)`));
    for (const m of ["b3", "vox", "farfisa", "pipe"]) {
      const other = m === "pipe" ? "b3" : "pipe";
      await b.eval(`OrganCompare.widgets[0].pick('${m}', '${other}')`); await b.sleep(900);
      const r = await b.eval(`(() => { const L = FaithfulPanel.LAYOUTS['organ-${m}'], W = OrganCompare.widgets[0];
        const ad = { range: k => { const base = k.replace(/^(inv|pre):/, ''); return OrganCompare.range('${m}', base); } };
        const pa = document.querySelector('.ocmp-panel:not(.ocmp-b) .fp-svg'), pb = document.querySelector('.ocmp-b .fp-svg');
        return { L: !!L, miss: L ? FaithfulPanel.checkAdapter(L, ad) : ['no layout'], a: !!pa, b: !!pb, ctl: pa ? pa.querySelectorAll('[data-ctl]').length : 0 }; })()`);
      check(`${m}: panel drawn on both sides, every bound key known`, r.L && r.a && r.b && r.miss.length === 0 && r.ctl > 5, JSON.stringify(r));
      // a change on the panel reaches the state and the report
      const ch = await b.eval(`(() => { const W = OrganCompare.widgets[0], before = document.querySelector('.ocmp-report').textContent;
        const key = { b3: 'uB.3', vox: 'd16', farfisa: 'str4', pipe: 's_ob8' }['${m}'], v = { b3: 8, vox: 8, farfisa: true, pipe: true }['${m}'];
        W.set('${m}', key, v); return { st: W.st['${m}'][key] === v, rep: document.querySelector('.ocmp-report').textContent !== before }; })()`);
      check(`${m}: a control change updates the state and the report`, ch.st && ch.rep, JSON.stringify(ch));
      await b.eval(`OrganCompare.widgets[0].phrase()`); await b.sleep(900);
      const lv = await b.eval(`new Promise(res => { const a = OrganCompare.widgets[0].analyser(), buf = new Float32Array(a.fftSize); let mx = 0;
        const iv = setInterval(() => { a.getFloatTimeDomainData(buf); for (const x of buf) mx = Math.max(mx, Math.abs(x)); }, 20); setTimeout(() => { clearInterval(iv); res(mx); }, 700); })`);
      await b.eval(`OrganCompare.widgets[0].stop()`);
      check(`${m}: ▶ Play makes sound`, lv > 0.004, lv.toFixed(4));
    }
    // dark / light and Panel / Simple
    const th = await b.eval(`(() => { const t0 = FaithfulPanel.theme(); document.querySelector('.fp-theme').click(); const t1 = FaithfulPanel.theme();
      const w = document.querySelector('.fp-w'); return { t0, t1, bg: getComputedStyle(w).getPropertyValue('--fp-bg').trim() }; })()`);
    check("Light / Dark toggles the panel (white or black background)", th.t0 !== th.t1 && /^#(000000|ffffff)$/i.test(th.bg), JSON.stringify(th));
    const vw = await b.eval(`(() => { const p = document.querySelector('.ocmp-panel'), s = p.querySelector('.ocmp-simple');
      FaithfulPanel.setMview('simple'); const a = getComputedStyle(s).display !== 'none' && p.querySelector('.fp-face').hidden;
      FaithfulPanel.setMview('panel'); const c = getComputedStyle(s).display === 'none' && !p.querySelector('.fp-face').hidden; return a && c; })()`);
    check("Panel / Simple switch", vw);
    // tracks
    const tr = await b.eval(`(() => { const li = [...document.querySelectorAll('.ocmp-tracks li')], bt = [...document.querySelectorAll('.ocmp-tracks button.ocmp-build')];
      const ok = bt.map(x => { x.click(); const W = OrganCompare.widgets[0]; return !!(W.ex && W.a === W.ex.from); });
      return { n: li.length, b: bt.length, ok: ok.every(Boolean), links: li.every(l => /youtube\\.com\\/watch/.test(l.querySelector('a').href)) }; })()`);
    check("famous tracks listed (3+ an organ), every Build loads its registration", tr.n >= 10 && tr.b === tr.n && tr.ok && tr.links, JSON.stringify(tr));
    const ps = await b.eval(`[...document.querySelectorAll('.ocmp-exact,.ocmp-approx,.ocmp-lost')].length`);
    check("the report classes its lines", ps > 0, ps);
    await b.goto(`http://127.0.0.1:${PORT}/lessons/organ-compare.html?organ=farfisa`); await b.sleep(1300);
    check("?organ=farfisa pre-selects the Farfisa", await b.eval(`OrganCompare.widgets[0].a === 'farfisa'`));
    check("sections fold and the jump bar lists them", await b.eval(`document.querySelectorAll('section.level2.ls-sec').length >= 4 && document.querySelectorAll('#TOC a, nav[role=doc-toc] a').length >= 4`));
  }
  const errs = b.errors.filter(e => !/supabase/i.test(e)); check("no page errors (the site-wide supabase notice aside)", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})();
