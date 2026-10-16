// The formants lesson in headless Chrome: seven labs draw, Play toggles one voice at a time, the F1-F2 plane follows a drag,
// formant tuning lifts F1 above the pitch, sections fold, nothing overflows at 390px.
// Run after `quarto render lessons/vowel-formants.qmd`: node tests/lessons/formants.cdp.js [screenshot dir]   (serves _site on 8513)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html; charset=utf-8";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8513);
(async () => {
  const b = await launch({ width: 1280, height: 900 }), out = process.argv[2] || "/tmp";
  let fails = 0; const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info ? "  " + info : "")); if (!ok) fails++; };
  const URL = "http://127.0.0.1:8513/lessons/vowel-formants.html";
  await b.goto(URL); await b.sleep(900);
  const c = await b.eval(`({labs: document.querySelectorAll('.fm-lab canvas').length, secs: document.querySelectorAll('section.level2.ls-sec').length,
    inked: [...document.querySelectorAll('.fm-lab canvas')].filter(cv => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return true; return false; }).length})`);
  check("seven labs drawn, sections fold", c.labs === 7 && c.inked === 7 && c.secs >= 8, JSON.stringify(c));
  const pl = await b.eval(`(() => { const btns = [...document.querySelectorAll('.fm-lab [data-play]')]; btns[0].click(); const a = IpaSynth.playing() && btns[0].classList.contains('fm-on');
    btns[2].click(); const one = !btns[0].classList.contains('fm-on') && btns[2].classList.contains('fm-on'); btns[2].click(); return {a, one, off: !IpaSynth.playing()}; })()`);
  check("play toggles, one voice at a time", pl.a && pl.one && pl.off, JSON.stringify(pl));
  const dr = await b.eval(`(() => { const cv = document.querySelector('#fm-plane canvas'), r = cv.getBoundingClientRect();
    const ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, {bubbles: true, pointerId: 1, clientX: r.left + x, clientY: r.top + y}));
    ev('pointerdown', 40, 20); const s = IpaSynth.state(), info = document.querySelector('#fm-plane .fm-info').textContent; ev('pointerup', 40, 20);
    return {F: s.F, info, off: !IpaSynth.playing()}; })()`);
  check("plane: top left is [i]", dr.F && dr.F[0] < 300 && dr.F[1] > 2400 && /nearest \[i\]/.test(dr.info) && dr.off, JSON.stringify(dr));
  const tu = await b.eval(`(() => { const h = document.getElementById('fm-pitch'), p = h.querySelector('[data-k=p]'); p.value = 880; p.dispatchEvent(new Event('input', {bubbles: true}));
    const before = h.querySelector('.fm-info').textContent; h.querySelector('[data-k=tune]').click(); return {before, after: h.querySelector('.fm-info').textContent}; })()`);
  check("formant tuning lifts F1 above the pitch", /below the fundamental/.test(tu.before) && !/below/.test(tu.after), JSON.stringify(tu));
  await b.eval(`document.getElementById('plane').scrollIntoView()`); await b.sleep(300); await b.shot(out + "/formants-desktop.png", false);
  const errs = b.errors.filter(e => !/supabaseUrl/.test(e)); check("no page errors (desktop)", !errs.length, errs.join(" | "));
  await b.resize(390, 800); await b.goto(URL); await b.sleep(900);
  const ph = await b.eval(`({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})`);
  check("no horizontal page scroll at 390px", ph.sw <= ph.cw + 1, JSON.stringify(ph));
  await b.eval(`document.getElementById('source-filter').scrollIntoView()`); await b.sleep(300); await b.shot(out + "/formants-phone.png", false);
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
