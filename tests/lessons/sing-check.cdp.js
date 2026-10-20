// "Check my singing" on a voice lesson, headless. An oscillator stands in for the microphone (window.TEST_MIC_SOURCE), moved through
// the written notes: one flat, one sharp, one silent. Run after rendering lessons/voice-pop.qmd (and the grader test: node tests/abc/sing-check.test.js):
//   quarto render lessons/voice-pop.qmd; node tests/lessons/sing-check.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8528);
const SEED = `sessionStorage.setItem('audio-check-v1', JSON.stringify({ browserOk: true, output: 'headphones', latencyMs: null, bleedDb: null, peakDb: -12, level: 'ok', constraints: {} }));
  window.TEST_MIC_SOURCE = c => { window.__ctx = c; const o = c.createOscillator(), g = c.createGain(); g.gain.value = 0; o.connect(g); o.start(); window.__osc = o; window.__g = g; return g; };`;
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  await b.goto("http://127.0.0.1:8528/lessons/voice-pop.html"); await ev(`localStorage.removeItem('abc-ex-voice')`);
  await b.goto("http://127.0.0.1:8528/lessons/voice-pop.html"); await b.sleep(800); await ev(SEED);
  const n = await ev(`document.querySelectorAll('.abc-ex').length + ' ' + [...document.querySelectorAll('.abc-ex')].filter(e => e.querySelector('.ax-res')).length`);
  check("8 prompts, 7 with a check (the two-voice one has none)", n === "8 7", n);
  await ev(`document.querySelector(".abc-ex").setAttribute("data-bpm", "160")`);
  await ev(`[...document.querySelector('.abc-ex .ax-bar').querySelectorAll('button')].find(x => /Check my singing/.test(x.textContent)).click()`);
  let last = null; for (let i = 0; i < 40 && !last; i++) { await b.sleep(150); last = await ev(`window.AbcExercise && AbcExercise.last ? JSON.stringify(AbcExercise.last) : null`); }
  check("listening started", !!last);
  if (last) {
    last = JSON.parse(last); const spq = 60 / last.bpm;
    await ev(`(() => { const L = AbcExercise.last, o = __osc, g = __g, spq = 60 / L.bpm, hz = m => 440 * Math.pow(2, (m - 69) / 12);
      L.notes.forEach(n => { const a = L.t0 + n.t_on * spq, e = L.t0 + n.t_off * spq - 0.03, dev = n.i === 2 ? -0.8 : n.i === 6 ? 0.7 : 0;
        o.frequency.setValueAtTime(hz(n.midi + dev), a); if (n.i === 4) return; g.gain.setValueAtTime(0.3, a + 0.01); g.gain.setValueAtTime(0, e); });
      g.gain.setValueAtTime(0, L.t0 + 30); })()`);
    const wait = (last.notes[last.notes.length - 1].t_off * spq + 2.5) * 1000; await b.sleep(wait);
    const res = await ev(`document.querySelector('.abc-ex .ax-res').textContent`);
    check("summary: 6 of 9, flat note 3, sharp note 7, note 5 not heard", /6 of 9 notes in tune: 1 flat \(note 3\), 1 sharp \(note 7\), 1 not heard \(note 5\)/.test(res), res);
    const cls = await ev(`[...document.querySelectorAll('.abc-ex .ax-n')].map(x => x.className.replace('ax-n ax-', '')).join(' ')`);
    check("chips coloured", cls === "right right flat right missed right sharp right right", cls);
    const btn = await ev(`[...document.querySelector('.abc-ex .ax-bar').querySelectorAll('button')].pop().textContent`);
    check("button back to Check", /Check my singing/.test(btn), btn);
  }
  check("no page errors", b.errors.filter(e => !/supabaseUrl/.test(e)).length === 0, b.errors.join(" | ").slice(0, 200));
  console.log(fails ? fails + " failed" : "all ok"); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
