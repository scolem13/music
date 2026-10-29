// Melody against the band (AbcPlay with chord symbols): at a tempo other than the tune's own Q:, every melody note must sit inside
// its bar and a pickup must be recognised (count-in 1). The bug: abc-play.js measured the bar with millisecondsPerMeasure() at the
// tune's default tempo while setTiming used opts.qpm, so the melody stretched against the band (fixed 2026-10-28; see its header).
// Checks every band button on mlt/dmti (slider tempo 90) by catching the chart handed to BandPlayer.create.
//   quarto render mlt/dmti.qmd && node tests/lessons/abc-play-align.cdp.js      (SITE=<dir> tests a render made elsewhere)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html" }); s.end(d); }); }).listen(8554);
(async () => {
  const b = await launch({}), ev = e => b.eval(e); let fails = 0;
  const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info ? "  " + info : "")); if (!ok) fails++; };
  await b.goto("http://127.0.0.1:8554/mlt/dmti.html?view=teacher");
  for (let i = 0; i < 120 && !(await ev(`document.querySelectorAll('.mlt-dmti').length > 50`)); i++) await b.sleep(150);
  const r = JSON.parse(await ev(`(async () => {
    const t = 'X:1\\nM:4/4\\nL:1/4\\nK:C\\n"C"C4|'; AbcPlay.play(ABCJS.renderAbc(document.createElement('div'), t)[0], { abc: t });
    for (let i = 0; i < 100 && !window.BandPlayer; i++) await new Promise(r => setTimeout(r, 100)); AbcPlay.stop();
    const C = BandPlayer.create, out = [];
    BandPlayer.create = function (o) { const form = BandHarmony.buildForm(o.parsed, 0).filter(x => x && x.beats > 0);
      window.__last = { beats: Math.max(...form.map(f => f.beats)), pos: [].concat(...o.parsed.bars.map(x => (x.melody || []).map(n => n.pos))), countIn: o.countIn, pk: !!(o.parsed.bars[0] && o.parsed.bars[0].anacrusis) };
      return { play: () => Promise.resolve(), stop() {}, setStartBar() {} }; };
    for (const c of document.querySelectorAll('.mlt-dmti')) {
      const bt = [...c.querySelectorAll('button')].find(x => /With the band|Example|Check/.test(x.textContent)); if (!bt) continue;
      window.__last = null; bt.click(); for (let i = 0; i < 40 && !window.__last; i++) await new Promise(r => setTimeout(r, 50));
      if (window.__last) out.push(Object.assign({ id: (c.closest('.mlt-step') || {}).id }, window.__last));
    }
    BandPlayer.create = C; return JSON.stringify(out); })()`));
  check("band buttons caught", r.length > 50, String(r.length));
  const late = r.filter(x => x.pos.some(p => p >= x.beats - 1e-6));
  check("every melody note inside its bar", !late.length, late.map(x => x.id).slice(0, 5).join(" "));
  const nopk = r.filter(x => x.pk && x.countIn !== 1 && /p1|p5/.test(x.id));
  check("pickups go in the count-in", !nopk.length, nopk.map(x => x.id).join(" "));
  check("Saints (2/4, pickup) has its count-in", r.some(x => /^d2u1-p1/.test(x.id) && x.countIn === 1));
  console.log(fails ? "ABC-PLAY ALIGN FAILED" : "ABC-PLAY ALIGN OK"); srv.close(); process.exit(fails ? 1 : 0);
})();
