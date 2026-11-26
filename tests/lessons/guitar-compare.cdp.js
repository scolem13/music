// The electric guitar pages in a browser (after rendering lessons/guitar-compare.qmd and intro-{strat,tele,les-paul,sg}.qmd):
// both panels drawn from FaithfulPanel layouts gt-*; clicking a selector cell changes the widget's state and its picture; dragging a
// knob lowers it; Translate fills the other side and reports exact / approx / lost with notes; the guitar menu swaps the panel;
// the Light / Dark toggle repaints; ▶ plays (an AudioContext made, a buffer source started) with no page errors; each intro page
// draws its panel, its tour steps set the state, its tracks list 3-5 videos, the quiz answers.
// Run: node tests/lessons/guitar-compare.cdp.js   (NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8591;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 1000);
  await b.goto(`http://127.0.0.1:${PORT}/lessons/guitar-compare.html`); await b.sleep(1500);
  await b.eval(`window.__err = []; addEventListener('error', e => __err.push(String(e.message)));`);
  check("two panels drawn", await b.eval(`document.querySelectorAll('.gtc .gtp-face svg.fp-svg').length`) === 2);
  check("left is the Strat, right the Les Paul", await b.eval(`(() => { const g = document.querySelector('.gtc')._gtc; return g.a.id + ',' + g.b.id; })()`) === "strat,lespaul");
  // click selector cell "2" on the Strat (cells ordered 5 4 3 2 1)
  const pic0 = await b.eval(`document.querySelector('.gtc-a .gtp-plot').innerHTML.length + ':' + document.querySelector('.gtc-a .gtp-info').textContent`);
  await b.eval(`(() => { const g = document.querySelector('.gtc-a [data-ctl=sel]'); g.scrollIntoView({block:'center'}); const r = g.getBoundingClientRect();
    g.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + r.width * 0.7, clientY: r.top + r.height / 2 })); })()`);
  check("clicking the selector picks position 2", await b.eval(`document.querySelector('.gtc')._gtc.a.st.sel`) === "p2");
  check("the picture / readout follow", (await b.eval(`document.querySelector('.gtc-a .gtp-plot').innerHTML.length + ':' + document.querySelector('.gtc-a .gtp-info').textContent`)) !== pic0);
  // drag the volume knob down
  const v0 = await b.eval(`document.querySelector('.gtc')._gtc.a.st.vol`);
  await b.eval(`(() => { const g = document.querySelector('.gtc-a [data-ctl=vol]'); g.scrollIntoView({block:'center'}); const r = g.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const ev = (t, Y) => g.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: Y, pointerId: 1, button: 0 })); ev('pointerdown', y); ev('pointermove', y + 80); ev('pointerup', y + 80); })()`);
  check("dragging Volume lowers it", (await b.eval(`document.querySelector('.gtc')._gtc.a.st.vol`)) < v0);
  await b.eval(`document.querySelector('.gtc')._gtc.a.setAll({ vol: 10 })`);
  await b.eval(`document.querySelector('.gtc-go').click()`);
  const q = await b.eval(`document.querySelector('.gtc').dataset.quality`);
  check("Translate reports a quality", /^(exact|approx|lost)$/.test(q || ""), q);
  check("Translate lists what is lost", await b.eval(`document.querySelectorAll('.gtc-res li').length`) > 0);
  check("the right panel shows the translated switch", await b.eval(`(() => { const g = document.querySelector('.gtc')._gtc; return document.querySelector('.gtc-b [data-ctl=sel]').getAttribute('aria-valuetext') === g.b.st.sel; })()`));
  // swap the right guitar
  await b.eval(`(() => { const s = document.querySelector('.gtc-b .gtp-pick'); s.value = 'tele'; s.dispatchEvent(new Event('change')); })()`); await b.sleep(600);
  check("the guitar menu swaps the panel", await b.eval(`!!document.querySelector('.gtc-b [data-ctl=tone]') && document.querySelector('.gtc')._gtc.b.id === 'tele'`));
  // theme
  const t0 = await b.eval(`document.querySelector('.gtc-a .fp-w').dataset.theme`);
  await b.eval(`document.querySelector('.gtc-a .fp-theme').click()`);
  check("Light / Dark toggle repaints both panels", await b.eval(`[...document.querySelectorAll('.gtc .fp-w')].every(w => w.dataset.theme !== '${t0}')`));
  await b.eval(`document.querySelector('.gtc-a .fp-theme').click()`);
  // play
  await b.eval(`document.querySelector('.gtc-a .gtp-play[data-play=pluck]').click()`); await b.sleep(800);
  check("▶ plays: an AudioContext running", await b.eval(`GuitarPickups.ctx().state`) === "running");
  check("no page errors", (await b.eval(`__err.length`)) === 0, await b.eval(`__err.join(' | ')`));
  await b.eval(`GuitarPickups.stop()`);

  for (const [slug, id] of [["strat", "strat"], ["tele", "tele"], ["les-paul", "lespaul"], ["sg", "sg"]]) {
    await b.goto(`http://127.0.0.1:${PORT}/lessons/intro-${slug}.html`); await b.sleep(1500);
    check(`${slug}: panel drawn`, await b.eval(`!!document.querySelector('.gtp svg.fp-svg') && GuitarPickups.widgets[0].id === '${id}'`));
    const n = await b.eval(`document.querySelectorAll('.gt-hear').length`);
    check(`${slug}: tour steps have ▶ buttons`, n >= 3, n);
    await b.eval(`document.querySelectorAll('.gt-hear')[1].click()`); await b.sleep(200);
    check(`${slug}: a step sets its state`, await b.eval(`(() => { const s = JSON.parse(document.querySelectorAll('.gt-step')[1].dataset.set), st = GuitarPickups.widgets[0].st; return Object.keys(s).every(k => st[k] === s[k]); })()`));
    await b.eval(`GuitarPickups.stop()`);
    const tn = await b.eval(`document.querySelectorAll('.gt-tracks li').length`);
    check(`${slug}: 3-5 tracks listed`, tn >= 3 && tn <= 5, tn);
    await b.eval(`(() => { const q = document.querySelector('.gt-q'); q.querySelectorAll('li')[+q.dataset.a].click(); })()`);
    check(`${slug}: quiz marks the right answer`, await b.eval(`!!document.querySelector('.gt-q li.gt-right') && !document.querySelector('.gt-q .gt-why').hidden`));
  }
  console.log(fails ? fails + " failed" : "all passed"); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
