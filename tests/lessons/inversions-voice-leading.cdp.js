// Inversions for Smooth Chord Changes (lessons/inversions-voice-leading.qmd, apps/shared/lessons/inversion-picker.js).
//   quarto render lessons/inversions-voice-leading.qmd && node tests/lessons/inversions-voice-leading.cdp.js   (NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site";
const { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]); const f = u.startsWith("/apps/") ? path.join(ROOT, u) : path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html" }); s.end(d); }); }).listen(8573);
const NEG = !!process.env.NEG;
(async () => {
  const b = await launch({}); let fails = 0; const check = (n, ok, i) => { console.log((ok ? "ok   " : "FAIL ") + n + (i != null ? "  " + i : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  await b.goto("http://127.0.0.1:8573/lessons/inversions-voice-leading.html"); await b.sleep(1500);
  check("three shape rows drawn", await ev(`document.querySelectorAll('.sh-shapes svg').length >= 3`));
  check("picker drawn with 4 chords", await ev(`document.querySelectorAll('.ip .ip-col').length === 4 && !!document.querySelector('.ip-board svg')`));
  const P = `document.querySelector('.ip')`;
  await ev(`${P}._ip.set('C F G C'), 0`);
  check("all root position C F G C = 42", await ev(`${P}.dataset.total`) === "42", await ev(`${P}.dataset.total`));
  await ev(`document.querySelector('.ip [data-a=smooth]').click(), 0`);
  check("smoothest = 12 (C, F/C, G/B, C)", await ev(`${P}.dataset.total`) === (NEG ? "0" : "12"), await ev(`${P}.dataset.total`));
  check("labels F/C and G/B", await ev(`[...document.querySelectorAll('.ip-board svg text')].map(t => t.textContent).join(' ')`).then(t => /F\/C/.test(t) && /G\/B/.test(t)));
  await ev(`document.querySelector('.ip .ip-col:nth-child(2) .ip-inv button').click(), 0`);
  check("picking Root for F changes the total", await ev(`${P}.dataset.total`) !== "12");
  await ev(`${P}._ip.set('Am Dm E Am'), ${P}._ip.smooth(), 0`);
  check("Am Dm E Am smoothest = 10", await ev(`${P}.dataset.total`) === "10");
  const before = await ev(`document.querySelector('.ip-board svg').querySelectorAll('*').length`);
  await ev(`document.querySelector('.ip-lh').click(), 0`);
  const after = await ev(`document.querySelector('.ip-board svg').querySelectorAll('*').length`);
  check("left hand root adds notes", after > before, before + " -> " + after);
  await ev(`${P}._ip.set('C Hm'), 0`);
  check("bad chord explained", await ev(`/Write chords like/.test(document.querySelector('.ip-total').textContent)`));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
