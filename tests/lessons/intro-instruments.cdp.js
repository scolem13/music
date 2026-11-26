// The "Meet the Instruments" lessons in a browser (lessons/intro-*.qmd, apps/shared/lessons/intro-kit.js): every intro page renders
// with its compact widget (only its own panel shown), a "What you'll do" list, collapsible sections and the jump bar; every tour step's
// ▶ makes sound; every quiz question answers (a wrong choice says so, the right one says right); every link on the page resolves to a
// file in _site; the compare page's ?synth= / ?machine= / ?seq= pre-selects the instrument.
// Run after rendering: node tests/lessons/intro-instruments.cdp.js [slug ...]   (NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8561;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
const slugs = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(ROOT + "/lessons").filter(f => /^intro-.*\.qmd$/.test(f)).map(f => f.slice(6, -4));
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1200, 900);
  for (const slug of slugs) {
    const file = `${SITE}/lessons/intro-${slug}.html`;
    if (!fs.existsSync(file)) { check(`${slug}: rendered`, false, "no " + file); continue; }
    await b.goto(`http://127.0.0.1:${PORT}/lessons/intro-${slug}.html`); await b.sleep(900);
    const info = await b.eval(`(() => { const box = document.querySelector('.ik-box'); const k = box && box.dataset.kind, id = box && box.dataset.id;
      const panels = [...box.querySelectorAll('.scmp-panel,.dcmp-panel,.sqc-panel')].filter(p => p.offsetParent !== null);
      return { k, id, shown: panels.length, mine: panels.every(p => k !== 'synth' || p.classList.contains('scmp-' + id)),
        steps: IntroKit.steps.length, plays: document.querySelectorAll('.ik-step .ik-play').length, qs: document.querySelectorAll('.ik-q').length,
        todo: /What you.ll do/.test(document.querySelector('.ik-do') ? document.querySelector('.ik-do').textContent : ''),
        folds: document.querySelectorAll('section.level2.ls-sec').length, toc: document.querySelectorAll('#TOC a, nav[role=doc-toc] a').length,
        title: document.title }; })()`);
    check(`${slug}: one ${info.k} panel shown, its own (${info.id})`, info.shown === 1 && info.mine, info.shown);
    check(`${slug}: What you'll do, folding sections, jump bar`, info.todo && info.folds >= 6 && info.toc >= 6, `${info.folds} sections, ${info.toc} toc`);
    check(`${slug}: 4-8 tour steps, each with ▶`, info.steps >= 4 && info.steps <= 8 && info.plays === info.steps, info.steps);
    // every step sounds
    const quiet = [];
    for (let i = 0; i < info.steps; i++) {
      await b.eval(`IntroKit.play(${i})`); await b.sleep(info.k === "synth" ? 350 : 450);
      const lv = await b.eval(`IntroKit.level(700)`);
      if (!(lv > 0.004)) quiet.push(`${i + 1}:${lv.toFixed(4)}`);
      await b.eval(`IntroKit.stop()`);
    }
    check(`${slug}: every tour step makes sound`, quiet.length === 0, quiet.join(" "));
    // quiz
    const qz = await b.eval(`(() => { const out = []; document.querySelectorAll('.ik-q').forEach(q => { const bs = q.querySelectorAll('.ik-choice'), a = +q.dataset.a;
      const wrong = [...bs].findIndex((x, i) => i !== a); bs[wrong].click(); const w = /Not quite/.test(q.querySelector('.ik-fb').textContent);
      bs[a].click(); const r = /Right/.test(q.querySelector('.ik-fb').textContent) && q.dataset.done === '1'; out.push(w && r); }); return out; })()`);
    check(`${slug}: 3-5 quiz questions, each answers`, qz.length >= 3 && qz.length <= 5 && qz.every(Boolean), JSON.stringify(qz));
    // links resolve
    const links = await b.eval(`[...document.querySelectorAll('main a[href]')].map(a => a.getAttribute('href')).filter(h => !/^(https?:|#|mailto:)/.test(h))`);
    const bad = links.filter(h => { const p = path.join(SITE, "lessons", h.split(/[?#]/)[0]); return !fs.existsSync(p); });
    check(`${slug}: internal links resolve`, bad.length === 0, bad.slice(0, 4).join(" "));
    const cmp = await b.eval(`[...document.querySelectorAll('main a[href*="-compare.html?"]')].map(a => a.getAttribute('href'))[0] || ''`);
    check(`${slug}: Next links to the compare page with this instrument`, new RegExp("=" + info.id + "$").test(cmp), cmp);
    if (slug === "model-d") check("model-d: links the patch sheets", await b.eval(`!!document.querySelector('a[href*="synth-compare.html#the-model-d-patch-sheets"]')`));
  }
  // pre-selection on the compare pages
  for (const [pg, q, js] of [["synth-compare", "synth=dx7", "SynthCompare.widgets[0].a === 'dx7'"], ["drum-compare", "machine=linn", "DrumCompare.widgets[0].a.machine === 'linn'"], ["sequencer-compare", "seq=mc4", "SequencerCompare.widgets[0].src === 'mc4'"]]) {
    await b.goto(`http://127.0.0.1:${PORT}/lessons/${pg}.html?${q}`); await b.sleep(1200);
    check(`${pg}?${q} pre-selects it`, await b.eval(js));
  }
  const errs = b.errors.filter(e => !/supabase/i.test(e)); check("no page errors (the site-wide supabase notice aside)", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})();
