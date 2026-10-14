// The four chord-shape lessons in headless Chrome: every .sh-shapes block draws its diagrams and a staff, no page errors.
// Run after rendering: node tests/lessons/chord-shapes.cdp.js [screenshot dir]   (serves _site on 8511)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".svg") ? "image/svg+xml" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8511);
(async () => {
  const b = await launch(), out = process.argv[2] || "/tmp";
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  for (const p of ["chord-shapes-guitar", "chord-shapes-guitar-hand", "chord-shapes-piano", "chord-shapes-piano-hand"]) {
    b.errors.length = 0;
    await b.goto(`http://127.0.0.1:8511/lessons/${p}.html`); await b.sleep(800);
    const r = await b.eval(`(() => { const hs = [...document.querySelectorAll('.sh-shapes')];
      return { blocks: hs.length, empty: hs.filter(h => !h.querySelector('.sh-card svg, .sh-board svg')).length, staffless: hs.filter(h => !h.querySelector('.sh-staff svg')).length,
        text: hs.filter(h => !h.querySelector('.sh-row')).map(h => h.textContent).join(' | ') }; })()`);
    check(p + ": every block has diagrams and a staff", r.blocks >= 13 && !r.empty && !r.staffless, JSON.stringify(r));
    const errs = b.errors.filter(e => !/supabaseUrl/.test(e));   // the site-wide sign-in script has no URL on a local server
    check(p + ": no page errors", !errs.length, errs.join(" | "));
    await b.shot(out + "/" + p + ".png", false);
  }
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
