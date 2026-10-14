// The voice lessons and collapsible sections in headless Chrome. Run after rendering: node tests/lessons/voice.cdp.js [shots dir]  (serves _site on 8514)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8514);
(async () => {
  const b = await launch(), out = process.argv[2] || "/tmp";
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  for (const p of ["voice-pop", "voice-jazz", "voice-classical"]) {
    b.errors.length = 0;
    await b.goto(`http://127.0.0.1:8514/lessons/${p}.html`); await b.sleep(900);
    const r = await b.eval(`(() => { const ex = [...document.querySelectorAll('.abc-ex')];
      return { ex: ex.length, drawn: ex.filter(e => e.querySelector('svg')).length,
        warn: ex.map((e, i) => { const t = e.querySelector('svg'); return t ? '' : i; }).filter(String).join(','),
        secs: document.querySelectorAll('section.level2.ls-sec').length, voice: !!document.getElementById('ax-voice') }; })()`);
    check(p + ": every exercise drawn", r.ex > 5 && r.drawn === r.ex, JSON.stringify(r));
    check(p + ": sections collapsible, voice menu", r.secs > 5 && r.voice);
    // fold via the heading, then the jump bar opens it again
    const fold = await b.eval(`(() => { const s = document.querySelectorAll('section.level2.ls-sec')[2]; s.querySelector('h2').click(); const shut = s.classList.contains('ls-shut');
      [...document.querySelectorAll('#TOC a')].find(a => a.hash === '#' + s.id).click(); return shut && !s.classList.contains('ls-shut'); })()`);
    check(p + ": heading folds, sidebar link reopens", fold);
    const moved = await b.eval(`(() => { const a = document.querySelector('.abc-ex svg').innerHTML; const s = document.getElementById('ax-voice'); s.value = '5'; s.dispatchEvent(new Event('change')); const c = document.querySelector('.abc-ex svg').innerHTML; s.value = '0'; s.dispatchEvent(new Event('change')); return a !== c; })()`);
    check(p + ": voice menu transposes", moved);
    const errs = b.errors.filter(e => !/supabaseUrl/.test(e));
    check(p + ": no page errors", !errs.length, errs.join(" | "));
    await b.shot(out + "/" + p + ".png", false);
  }
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
