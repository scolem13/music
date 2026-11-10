// The voice-leading pages in a browser (theory/voice-leading-*.qmd, counterpoint.qmd): every example draws its staff and the checker's
// verdict matches the page's claim (data-match="1"); a typed exercise (the SATB solution found for exercise 1) is accepted, a wrong one refused;
// a species exercise likewise; no page errors. Serves _site, or SITE=<dir> for a render made elsewhere (quarto render ... --output-dir <dir>).
//   PORT=8590 SITE=<dir> node tests/voice-leading/vl-pages.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => /\.js$/.test(f) ? "text/javascript" : /\.css$/.test(f) ? "text/css" : /\.json$/.test(f) ? "application/json" : "text/html";
const PORT = +process.env.PORT || 8590, wait = ms => new Promise(r => setTimeout(r, ms));
const srv = http.createServer((q, s) => { let f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0])); if (!fs.existsSync(f)) f = path.join(ROOT, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ width: 1200, height: 1000 }); let fails = 0;
  const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), errs = () => b.errors.filter(x => !/supabase|createClient|favicon|404/i.test(x));
  for (const p of ["voice-leading-triads", "voice-leading-sevenths", "voice-leading-ncts", "voice-leading-chromatic", "counterpoint"]) {
    await b.goto(`http://127.0.0.1:${PORT}/theory/${p}.html`); await wait(1500);
    const r = JSON.parse(await ev(`JSON.stringify({ ex: document.querySelectorAll('.vl-ex,.vl-spex').length, drawn: [...document.querySelectorAll('.vl-ex,.vl-spex')].filter(d => d.querySelector('.vl-paper svg')).length,
      match: [...document.querySelectorAll('.vl-ex,.vl-spex')].filter(d => d.getAttribute('data-match') === '1').length, exr: document.querySelectorAll('.vl-exercise,.vl-species').length,
      exdrawn: [...document.querySelectorAll('.vl-exercise,.vl-species')].filter(d => d.querySelector('.vl-paper svg')).length })`));
    check(p + ": every example drawn and as claimed", r.ex > 0 && r.drawn === r.ex && r.match === r.ex, JSON.stringify(r));
    check(p + ": every exercise drew its staff", r.exr > 0 && r.exdrawn === r.exr);
    check(p + ": no page errors", errs().length === 0, errs().slice(0, 3).join(" | "));
  }
  // triads exercise 1: I IV V I over C3 F3 G3 C3
  await b.goto(`http://127.0.0.1:${PORT}/theory/voice-leading-triads.html`); await wait(1500);
  const fill = (sel, idx, vals) => ev(`(() => { const d = document.querySelectorAll(${JSON.stringify(sel)})[${idx}], ins = [...d.querySelectorAll('input:not([readonly])')]; ${JSON.stringify(vals)}.forEach((v, i) => { ins[i].value = v; ins[i].dispatchEvent(new Event('input')); }); [...d.querySelectorAll('button')].find(x => x.textContent === 'Check').click(); return d.querySelector('.vl-out').textContent; })()`);
  // inputs are listed row by row: soprano x4, alto x4, tenor x4
  let t = await fill(".vl-exercise", 0, ["G4", "A4", "G4", "G4", "E4", "F4", "D4", "E4", "C4", "C4", "B3", "C4"]);
  check("exercise 1: a correct answer is accepted", /Clean|No errors/.test(t), t.slice(0, 120));
  t = await fill(".vl-exercise", 0, ["G4", "A4", "G4", "G4", "E4", "F4", "D4", "E4", "C4", "C4", "D4", "C4"]);
  check("exercise 1: a wrong answer is refused", /\(/.test(t) && !/^Clean/.test(t), t.slice(0, 160));
  t = await fill(".vl-exercise", 0, ["G4", "", "", "", "", "", "", "", "", "", "", ""]);
  check("exercise 1: empty boxes are reported", /Fill every box/.test(t), t.slice(0, 80));
  await b.goto(`http://127.0.0.1:${PORT}/theory/counterpoint.html`); await wait(1500);
  t = await fill(".vl-species", 0, "D4 A3 C4 D4 B3 A3 C4 E4 D4 C#4 D4".split(" "));
  check("species exercise 1: the example answer is accepted", /Clean|No errors/.test(t), t.slice(0, 160));
  t = await fill(".vl-species", 0, "A3 A3 C4 D4 B3 A3 C4 E4 D4 C#4 D4".split(" "));
  check("species exercise 1: a wrong answer is refused", /Begin/.test(t), t.slice(0, 160));
  await b.close && b.close(); srv.close(); console.log(fails ? "FAILED " + fails : "all ok"); process.exit(fails ? 1 : 0);
})();
