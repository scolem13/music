// Guitar Triads for Smooth Chord Changes (lessons/guitar-voice-leading.qmd, apps/shared/lessons/guitar-voice-picker.js).
//   quarto render lessons/guitar-voice-leading.qmd && node tests/lessons/guitar-voice-leading.cdp.js   (NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site";
const { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]); const f = u.startsWith("/apps/") ? path.join(ROOT, u) : path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html" }); s.end(d); }); }).listen(8574);
const NEG = !!process.env.NEG;
(async () => {
  const b = await launch({}); let fails = 0; const check = (n, ok, i) => { console.log((ok ? "ok   " : "FAIL ") + n + (i != null ? "  " + i : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  await b.goto("http://127.0.0.1:8574/lessons/guitar-voice-leading.html"); await b.sleep(1500);
  check("four shape rows drawn", await ev(`document.querySelectorAll('.sh-shapes svg').length >= 4`));
  check("picker drawn with 4 chords", await ev(`document.querySelectorAll('.gvp .gvp-col svg').length === 4`));
  const P = `document.querySelector('.gvp')`;
  await ev(`${P}._gvp.set('C F G C'), 0`);
  check("all root position C F G C = 42 frets", await ev(`${P}.dataset.total`) === "42", await ev(`${P}.dataset.total`));
  const sm = await ev(`${P}._gvp.smooth().join(' ')`);
  check("smoothest = xxx553 xxx565 xxx433 xxx553", sm === (NEG ? "x" : "xxx553 xxx565 xxx433 xxx553"), sm);
  check("smoothest total 12", await ev(`${P}.dataset.total`) === "12");
  check("labels F/C and G/B", /F\/C/.test(await ev(`${P}.textContent`)) && /G\/B/.test(await ev(`${P}.textContent`)));
  await ev(`${P}._gvp.set('Am Dm E Am'), 0`);
  check("Am Dm E Am smoothest", await ev(`${P}._gvp.smooth().join(' ')`) === "xxx210 xxx231 xxx100 xxx210");
  await ev(`${P}.querySelector('.gvp-set').value = 'mid', ${P}.querySelector('.gvp-set').dispatchEvent(new Event('change')), ${P}._gvp.set('G C D G'), 0`);
  check("strings 4-3-2: G C D G smoothest = 12", (await ev(`${P}._gvp.smooth().join(' ')`)) === "xx543x xx555x xx423x xx543x" && await ev(`${P}.dataset.total`) === "12");
  await ev(`${P}._gvp.set('C Hm'), 0`);
  check("bad chord explained", await ev(`/Write triads like/.test(${P}.querySelector('.gvp-total').textContent)`));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
