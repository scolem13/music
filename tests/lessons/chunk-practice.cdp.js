// Chunk Practice (tools/chunk-practice.qmd): the plan and tempo ladder (no browser), then the page headless: the example
// draws in chunks, Clean / Not yet move the tempo, a click on a note adds a cut, no sideways scroll at phone width.
// Run after rendering: quarto render tools/chunk-practice.qmd; node tests/lessons/chunk-practice.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const C = require(ROOT + "/apps/shared/chunk-practice.js");
let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
check("forward plan", JSON.stringify(C.plan(3, "forward")) === "[[0,0],[1,1],[0,1],[2,2],[1,2],[0,2]]");
check("backward plan ends on the whole", JSON.stringify(C.plan(3, "backward").slice(-1)) === "[[0,2]]");
const L = C.Ladder({ start: 60, target: 80, step: 4, need: 1, mode: "steady" }); L.result(true); L.result(false);
check("steady: clean up a step, miss down a step", L.tempo() === 60, L.tempo());
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8531);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const ev = e => b.eval(e);
  await b.resize(390, 800);
  await b.goto("http://127.0.0.1:8531/tools/chunk-practice.html");
  await ev(`localStorage.clear(); localStorage.setItem("chunk-practice-v1", JSON.stringify({ view: "full", per: 1 }))`);
  await b.goto("http://127.0.0.1:8531/tools/chunk-practice.html"); await b.sleep(900);
  const a = await ev(`document.querySelector('#cp-count').textContent + '|' + document.querySelector('#cp-tempo').textContent + '|' + document.querySelectorAll('#cp-score .cp-band-on').length`);
  check("full: 9 chunks, start at 60% of 132, chunk 1 banded", /^9 chunks · \d+ steps.*\|79\|[1-9]/.test(a), a);
  await ev(`document.querySelector('#cp-yes').click()`);
  const k = await ev(`document.querySelector('#cp-kind').textContent`);
  check("changing tempos: a slow try comes next", /Slow/.test(k), k);
  await ev(`document.querySelector('#cp-loop').checked = false; document.querySelector('#cp-loop').dispatchEvent(new Event('change'))`);
  await ev(`document.querySelector('#cp-go').click()`); await b.sleep(3400);
  check("Play it lights the chunk", await ev(`document.querySelector('#cp-score').classList.contains('is-live') && !!document.querySelector('#cp-score rect.cp-band-on')`));
  await ev(`document.querySelector('#cp-go').click()`);
  await ev(`(() => { const n = document.querySelectorAll('#cp-score .abcjs-note')[2]; n.dispatchEvent(new MouseEvent('mousedown', {bubbles:true})); n.dispatchEvent(new MouseEvent('mouseup', {bubbles:true})); n.dispatchEvent(new MouseEvent('click', {bubbles:true})); })()`);
  await b.sleep(200);
  const c = await ev(`document.querySelector('#cp-count').textContent`);
  check("a click on a note adds a cut", /^10 chunks/.test(c), c);
  // Quick: the click keeps going, saying nothing counts clean, the tempo climbs pass by pass
  await ev(`document.querySelector('[data-view=quick]').click()`); await b.sleep(200);
  const q0 = +await ev(`document.querySelector('#cp-tempo').textContent`);
  await ev(`document.querySelector('#cp-go').click()`); await b.sleep(6500);
  const q1 = +await ev(`document.querySelector('#cp-tempo').textContent`);
  check("quick: still playing, tempo up after silent passes", await ev(`!!ChunkPractice._test.run`) && q1 > q0, q0 + " -> " + q1);
  // the Not yet pedal (bottom key, note 21) through MidiLearn
  await b.sleep(700);
  const before = +await ev(`document.querySelector('#cp-tempo').textContent`);
  await ev(`MidiLearn.inject("note", 21, 100)`); await b.sleep(150);
  const said = await ev(`document.querySelector('#cp-say').textContent`);
  check("pedal note 21 presses Not yet", /Not yet/.test(said), said + " @" + before);
  await ev(`document.querySelector('#cp-go').click()`);
  check("stopped", await ev(`!ChunkPractice._test.run`));
  // keyboard grading: play the right notes on time (fake MIDI), the pass grades clean
  await ev(`(() => { const c = document.querySelector('#cp-keys'); c.checked = true; c.dispatchEvent(new Event('change')); })()`);
  await ev(`document.querySelector('[data-view=full]').click()`);
  await ev(`document.querySelector('#cp-loop').checked = false; document.querySelector('#cp-loop').dispatchEvent(new Event('change'))`);
  await ev(`(() => { document.querySelector('#cp-go').click(); const p = ChunkPractice._test.run.pass;
    p.expect.forEach(e => setTimeout(() => MidiLearn.inject("note", e.midi, 90), Math.max(0, e.t - performance.now() + 10))); })()`);
  await b.sleep(4500);
  const g = await ev(`document.querySelector('#cp-say').textContent`);
  check("keyboard grade: right notes on time are clean", /Clean, by the keys/.test(g), g);
  check("no sideways scroll", await ev(`document.documentElement.scrollWidth <= 390`));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
