// The audio pre-flight (apps/shared/audio-check.js) in headless Chrome with a fake microphone (a beep, not our sweep,
// so the check must report headphones). Checks the dialog flow, that the test sound never goes above MAX_DBFS,
// the session reuse, and the accuracy helpers. Run after rendering a page that loads it into _site:
//   quarto render practice/assessment-tune.qmd; node tests/lessons/audiocheck.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8517);
(async () => {
  const b = await launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  try {
    await b.goto("http://127.0.0.1:8517/practice/assessment-tune.html"); await b.sleep(1200);
    check("AudioCheck loaded on the page", await ev(`typeof AudioCheck === 'object' && typeof AudioCheck.ensure === 'function'`));
    // Record every gain value set on the page, and start the check without waiting for it.
    await ev(`sessionStorage.clear(); window.__maxGain = 0;
      (function () { const d = Object.getOwnPropertyDescriptor(AudioParam.prototype, 'value');
        Object.defineProperty(AudioParam.prototype, 'value', { get: d.get, set(v) { if (this.__isGain) __maxGain = Math.max(__maxGain, v); d.set.call(this, v); } });
        const cg = AudioContext.prototype.createGain; AudioContext.prototype.createGain = function () { const g = cg.call(this); g.gain.__isGain = true; return g; }; })();
      window.__res = undefined; AudioCheck.ensure().then(r => window.__res = r); 1`);
    const click = async label => { for (let i = 0; i < 60; i++) {
      const ok = await ev(`(() => { const b = [...document.querySelectorAll('.ack button')].find(b => b.textContent === ${JSON.stringify(label)}); if (b) { b.click(); return true; } return false; })()`);
      if (ok) return true; await b.sleep(250); } return false; };
    if (await ev(`!!document.querySelector('.ack') && /Best in Chrome/.test(document.querySelector('.ack').textContent)`)) await click("Continue anyway");
    check("dialog explains the soft test sound before playing anything", await ev(`/soft/.test(document.querySelector('.ack').textContent)`) && await ev(`__maxGain === 0`));
    check("Start", await click("Start"));
    check("Next (after the test sound)", await click("Next"));
    for (let i = 0; i < 40 && !(await ev(`!!document.querySelector(".ack .meter")`)); i++) await b.sleep(150);
    await b.sleep(2500);   // the fake device beeps about once a second
    check("Done (level step)", await click("Done"));
    for (let i = 0; i < 20 && await ev(`window.__res === undefined`); i++) await b.sleep(200);
    const r = await ev(`window.__res`);
    check("fake beep is not our sweep, so: headphones", r && r.output === "headphones", JSON.stringify(r));
    check("level meter hears the fake mic", r && r.peakDb > -60, r && r.peakDb);
    check("constraints: processing off on headphones", r && r.constraints && r.constraints.echoCancellation === false && r.constraints.autoGainControl === false);
    const cap = await ev(`10 ** (AudioCheck.MAX_DBFS / 20)`), mx = await ev(`__maxGain`);
    check("test sound never above MAX_DBFS", mx > 0 && mx <= cap + 1e-9, `max gain ${mx.toFixed(4)} (cap ${cap.toFixed(4)})`);
    check("dialog closed, mic tracks stopped", await ev(`!document.querySelector('.ack-back')`));
    check("ensure() reuses the session result without a dialog", await ev(`AudioCheck.ensure().then(x => x.output === 'headphones' && !document.querySelector('.ack-back'))`));
    check("helpers: headphones = no gate, no call-and-response, 0 latency",
      await ev(`(() => { const r = AudioCheck.last(); return AudioCheck.bleedFloorDb(r, -20) === -Infinity && !AudioCheck.callAndResponse(r) && AudioCheck.latencySec(r) === 0; })()`));
    check("helpers: speakers", await ev(`(() => { const r = { output: 'speakers', latencyMs: 120, bleedDb: -30 }; return AudioCheck.bleedFloorDb(r, -20) === -44 && AudioCheck.callAndResponse(r) && AudioCheck.latencySec(r) === 0.12; })()`));
    check("no page errors", !b.errors.filter(e => !/supabaseUrl/.test(e)).length, b.errors.join(" | "));
  } finally { await b.close(); srv.close(); }
  console.log(fails ? fails + " FAILED" : "all ok"); process.exit(fails ? 1 : 0);
})();
