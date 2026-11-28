// Ambient lesson + generator (lessons/sound-ambient.qmd, tools/ambient.qmd, apps/shared/lessons/ambient-kit.js) and the noise
// model (apps/shared/noise.js). Run after rendering: node tests/lessons/ambient.cdp.js   (NEG=1 must fail: breaks the EQ check)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8517);
const RMS = `(w => { const a = w.view && w.view.an; if (!a) return 0; const d = new Float32Array(a.fftSize); a.getFloatTimeDomainData(d); let s = 0; for (const x of d) s += x * x; return Math.sqrt(s / d.length); })`;
(async () => {
  const b = await launch({}); let fails = 0;
  const check = (n, ok, i) => { console.log((ok ? "ok   " : "FAIL ") + n + (i ? "  " + i : "")); if (!ok) fails++; };
  for (const pg of ["lessons/sound-ambient", "tools/ambient", "lessons/sound-noise"]) {
    b.errors.length = 0; await b.goto(`http://127.0.0.1:8517/${pg}.html`); await b.sleep(800);
    const ws = await b.eval(`SynthKit.widgets.map(w => w.kind)`);
    check(pg + ": widgets built", ws.length && !(await b.eval(`[...document.querySelectorAll('div.sk')].some(d => /failed|Unknown/.test(d.textContent.slice(0,80)))`)), ws.join(","));
    for (let i = 0; i < ws.length; i++) {
      if (!/noiseeq|ambient/.test(ws[i])) continue;
      await b.eval(`SynthKit.widgets[${i}].start()`); let lv = 0;
      for (let k = 0; k < 15; k++) { await b.sleep(200); lv = Math.max(lv, await b.eval(`${RMS}(SynthKit.widgets[${i}])`)); }
      check(`${pg}[${i}] ${ws[i]}: makes sound`, lv > 0.001, "rms " + lv.toFixed(4));
      if (ws[i] === "noiseeq") {   // pull every band but 8k down: energy moves to the top
        const band = `(() => { const a = SynthKit.widgets[${i}].view.an, f = new Float32Array(a.frequencyBinCount); a.getFloatFrequencyData(f); const bin = hz => Math.round(hz / (a.context.sampleRate / 2) * f.length); const avg = (lo, hi) => { let s = 0; for (let j = bin(lo); j < bin(hi); j++) s += f[j]; return s / (bin(hi) - bin(lo)); }; return avg(6000, 10000) - avg(200, 400); })()`;
        await b.eval(`SynthKit.widgets[${i}].setEq([0,0,0,0,0,0,0,0,0,0])`); await b.sleep(600); const flat = await b.eval(band);
        await b.eval(`SynthKit.widgets[${i}].setEq(${process.env.NEG ? "[0,0,0,0,0,0,0,0,0,0]" : "[-18,-18,-18,-18,-18,-18,-18,-18,12,-18]"})`); await b.sleep(800); const hi = await b.eval(band);
        check(`${pg}[${i}] EQ moves the spectrum`, hi - flat > 15, `8k vs 300 Hz: flat ${flat.toFixed(1)} dB, shaped ${hi.toFixed(1)} dB`);
        check(`${pg}[${i}] the streaming (never-repeating) noise is loaded`, await b.eval(`!!(window.SiteNoise && SiteNoise.stream)`));
      }
      await b.eval(`SynthKit.widgets[${i}].stop()`);
    }
    const errs = b.errors.filter(e => !/supabaseUrl/.test(e)); check(pg + ": no page errors", !errs.length, errs.join(" | "));
  }
  // the old loops repeated every 1-3 s (correlation 1.0 at that lag); the new buffer: none at those lags, and the loop seam is smooth
  const r = await b.eval(`(() => { const c = new OfflineAudioContext(1, 48000, 48000), out = {};
    for (const k of ["white", "pink", "brown"]) { const d = SiteNoise.buffer(c, k).getChannelData(0), N = 48000;
      const corr = lag => { let s = 0, a = 0, q = 0; for (let i = 0; i < N; i++) { s += d[i] * d[i + lag]; a += d[i] * d[i]; q += d[i + lag] ** 2; } return s / Math.sqrt(a * q); };
      out[k] = { len: d.length / 48000, c1: Math.abs(corr(48000)), c3: Math.abs(corr(144000)), seam: Math.abs(d[0] - d[d.length - 1]) }; } return out; })()`);
  for (const k in r) check(`SiteNoise.buffer ${k}: ${r[k].len} s, no repeat at 1 s / 3 s, smooth seam`, r[k].len > 20 && r[k].c1 < .2 && r[k].c3 < .2 && r[k].seam < .5, JSON.stringify(r[k]));
  await b.close(); srv.close(); console.log(fails ? fails + " FAILED" : "all ok"); process.exit(fails ? 1 : 0);
})();
