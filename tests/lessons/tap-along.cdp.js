// Tap Along (tools/tap-along.qmd) and Tap Latency (tools/tap-latency.qmd), headless at phone width: pasted UG text becomes the
// sheet, taps on the pad are kept with the button's lag taken off, Play + Sync puts the clock on the first bar and the sheet
// follows; Tap Latency measures a steady 40 ms late tapper as about 40 ms. Run after rendering both pages:
//   quarto render tools/tap-along.qmd; quarto render tools/tap-latency.qmd; node tests/lessons/tap-along.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8523);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  await b.resize(390, 800);
  await b.goto("http://127.0.0.1:8523/tools/tap-along.html");
  await ev(`localStorage.clear(); localStorage.setItem('tap-latency-v1', JSON.stringify({ bar: 50, chord: 80, section: 60 }))`);
  await b.goto("http://127.0.0.1:8523/tools/tap-along.html"); await b.sleep(500);
  await ev(`(() => { const t = document.querySelector('.ta-text'); t.value = '[Verse 1]\\nG        C\\nHello there world\\n\\n[Chorus]\\nEm   C\\nla la la';
    document.querySelector('.ta-use').click(); })()`);
  const sheet = await ev(`[...document.querySelectorAll('.ta-ch[data-c]')].map(b => b.textContent).join(' ') + '|' + document.querySelectorAll('.ta-head').length`);
  check("UG text becomes a sheet of 4 chords, 2 sections", sheet === "G C Em C|2", sheet);
  const press = i => ev(`document.querySelectorAll('.ta-key')[${i}].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))`);
  await press(2); await press(0); await press(1); await b.sleep(500);
  await press(0); await press(1); await b.sleep(300);
  const st = await ev(`(() => { const d = JSON.parse(localStorage.getItem('tap-along-doc')); return d.taps.map(x => x.k[0] + (x.t < 0 ? '-' : '+')).join(' ') + '|' +
    document.querySelector('.ta-ch.is-now').textContent + '|' + document.querySelector('.ta-sec').textContent + '|' + document.querySelector('.ta-bar').textContent; })()`);
  check("taps kept with lag off (first ones before 0), sheet on the 2nd chord", st === "s- b- c- b+ c+|C|Verse 1|Bar 2", st);
  const pad = await ev(`(() => { const p = document.querySelector('.ta-pad').getBoundingClientRect(), k = document.querySelector('.ta-key').getBoundingClientRect();
    return Math.round(p.bottom) + ' ' + Math.round(k.height) + ' ' + (document.documentElement.scrollWidth <= 390); })()`);
  check("pad fixed at the bottom, big keys, no sideways scroll", /^800 [67]\d true$/.test(pad), pad);
  await ev(`document.querySelector('.ta-mode').click()`);
  const play = await ev(`[...document.querySelectorAll('.ta-key')].map(b => b.hidden ? '-' : b.firstChild.textContent).join(' ')`);
  check("Play mode: only Sync", play === "Sync - -", play);
  await press(0); await b.sleep(300);
  const sync = await ev(`(() => { const d = JSON.parse(localStorage.getItem('tap-along-doc')), first = d.taps.filter(x => x.k === 'bar').sort((a, b) => a.t - b.t)[0].t;
    const [m, s] = document.querySelector('.ta-clock').textContent.split(':'); return (+m * 60 + +s - first).toFixed(1) + '|' + document.querySelector('.ta-bar').textContent; })()`);
  check("Sync puts the clock at the first bar (+ the 0.3 s since)", /^0\.[2-4]\|Bar 1$/.test(sync), sync);

  await b.goto("http://127.0.0.1:8523/tools/tap-latency.html"); await b.sleep(300);
  await ev(`document.querySelector('.ta-bpm').value = '120'; document.querySelector('.ta-go').click()`); await b.sleep(1000);   // the audio clock runs a moment after resume()
  // a tapper 40 ms behind every click, on the cued button
  await ev(`(() => { const r = document.querySelector('.ta-latency'), k = document.querySelectorAll('.ta-key');
    r._ta.beats().filter(x => x.b >= 4).forEach(x => { const at = r._ta.heard(x.t) + 40 + (x.b % 2 ? 6 : -6);
      setTimeout(() => k[x.p].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })), at - performance.now()); }); })()`);
  await b.sleep(25000);
  const res = await ev(`[...document.querySelectorAll('.ta-results td')].map(t => t.textContent).join(' ')`);
  const ms = [...res.matchAll(/ (-?\d+) ms ±/g)].map(m => +m[1]);
  check("three lags measured near 40 ms", ms.length === 3 && ms.every(m => m >= 30 && m <= 60) && /^(\S+ · \S+ 10 )/.test(res), res);
  await ev(`document.querySelector('.ta-keep').click()`);
  const saved = await ev(`localStorage.getItem('tap-latency-v1')`);
  check("saved for Tap Along", /"bar":\d+,"chord":\d+,"section":\d+/.test(saved), saved);
  const errs = b.errors.filter(e => !/supabase/i.test(e));
  check("no page errors", !errs.length, errs.join(" | "));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
