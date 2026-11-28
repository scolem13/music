// Sound 28: Shepard tones (lessons/sound-shepard.qmd, apps/shared/lessons/shepard-kit.js). Run after rendering:
//   node tests/lessons/shepard.cdp.js     (NEG=1 must fail: it checks a flat envelope as if it were the bell)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8518);
const RMS = `(w => { const a = w.view && w.view.an; if (!a) return 0; const d = new Float32Array(a.fftSize); a.getFloatTimeDomainData(d); let s = 0; for (const x of d) s += x * x; return Math.sqrt(s / d.length); })`;
(async () => {
  const b = await launch({}); let fails = 0;
  const check = (n, ok, i) => { console.log((ok ? "ok   " : "FAIL ") + n + (i ? "  " + i : "")); if (!ok) fails++; };
  await b.goto("http://127.0.0.1:8518/lessons/sound-shepard.html"); await b.sleep(800);
  const ws = await b.eval(`SynthKit.widgets.map(w => w.kind || w.title)`);
  check("widgets built", ws.length === 2, ws.join(","));
  // shepard: sound, steps advance, after 12 steps the partial set is the same as at the start (the circle closes)
  await b.eval(`(w => { w.c.motion.set("glide"); w.c.speed.set(8); w.c.env.set(${process.env.NEG ? '"flat"' : '"bell"'}); w.start(); })(SynthKit.widgets[0])`);
  await b.sleep(600); let lv = 0; for (let k = 0; k < 10; k++) { await b.sleep(150); lv = Math.max(lv, await b.eval(`${RMS}(SynthKit.widgets[0])`)); }
  check("Shepard tone makes sound", lv > .005, "rms " + lv.toFixed(4));
  const st = await b.eval(`(w => ({ pos: w.pos, st: w.st.map(p => ({ x: p.x, a: p.a })) }))(SynthKit.widgets[0])`);
  check("the stack is moving up", st.pos > .05, "position " + st.pos.toFixed(3) + " octaves");
  const edge = st.st.filter(p => p.x < .08 || p.x > .92), mid = st.st.filter(p => p.x > .4 && p.x < .6);
  check("the bell: the partials at the edges are near silent, the middle loud", edge.every(p => p.a < .1) && mid.every(p => p.a > .9), JSON.stringify(st.st.map(p => p.a.toFixed(2))));
  await b.eval(`SynthKit.widgets[0].stop()`);
  // tritone: a pair plays, an answer is recorded on the circle
  await b.eval(`SynthKit.widgets[1].play(0)`); lv = 0; for (let k = 0; k < 6; k++) { await b.sleep(150); lv = Math.max(lv, await b.eval(`${RMS}(SynthKit.widgets[1])`)); }
  check("tritone pair makes sound", lv > .002, "rms " + lv.toFixed(4));
  await b.eval(`[...SynthKit.widgets[1].host.querySelectorAll("button")].find(x => /Up/.test(x.textContent)).click()`);
  check("answer recorded", (await b.eval(`JSON.stringify(SynthKit.widgets[1].answers())`)) === '{"0":[1]}');
  const errs = b.errors.filter(e => !/supabaseUrl/.test(e)); check("no page errors", !errs.length, errs.join(" | "));
  await b.close(); srv.close(); console.log(fails ? fails + " FAILED" : "all ok"); process.exit(fails ? 1 : 0);
})();
