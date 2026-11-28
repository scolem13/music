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
  // the generator's new voices (2026-11-28): recorded bells load and sound, the wind-chime layer and the wavetable pad run
  await b.goto("http://127.0.0.1:8517/tools/ambient.html"); await b.sleep(800);
  for (const [inst, dtype] of [["tubular", "pad"], ["celesta", "saw"], ["crotale", "pad"]]) {
    b.errors.length = 0;
    await b.eval(`(w => { w.c.inst.set("${inst}"); w.c.dtype.set("${dtype}"); w.c.chimes.set(1); w.c.density.set(1); w.start(); })(SynthKit.widgets.find(w => w.kind === "ambient"))`);
    let lv = 0; for (let k = 0; k < 20; k++) { await b.sleep(200); lv = Math.max(lv, await b.eval(`${RMS}(SynthKit.widgets.find(w => w.kind === "ambient"))`)); }
    const got = await b.eval(`fetch("/apps/shared/lessons/bell-samples/${inst === "crotale" ? "crotale-C6" : inst === "celesta" ? "celesta-c5" : "tubular-C4"}.m4a").then(r => r.ok)`);
    check(`ambient ${inst} + ${dtype} drone + chimes: sounds, sample served, no errors`, lv > .001 && got && !b.errors.filter(e => !/supabaseUrl/.test(e)).length, "rms " + lv.toFixed(4) + " " + b.errors.join(" | "));
    await b.eval(`SynthKit.widgets.find(w => w.kind === "ambient").stop()`); await b.sleep(300);
  }
  // Energy (super knob): at 1 every assigned setting reaches its To, the sound gets louder and brighter, nothing runs away
  { b.errors.length = 0; const W = `SynthKit.widgets.find(w => w.kind === "ambient")`;
    await b.eval(`(w => { w.preset(w.presetList[0]); w.start(); })(${W})`); let calm = 0, hot = 0, peak = 0;
    for (let k = 0; k < 15; k++) { await b.sleep(200); calm = Math.max(calm, await b.eval(`${RMS}(${W})`)); }
    await b.eval(`${W}.c.energy.set(${process.env.NEG ? 0 : 1})`);
    for (let k = 0; k < 30; k++) { await b.sleep(200); const v = await b.eval(`${RMS}(${W})`); hot = Math.max(hot, v); }
    const moved = await b.eval(`(w => w.energy.map.every(e => Math.abs(w.c[e[0]].value - e[1]) / Math.max(1, Math.abs(e[1])) < .05))(${W})`);
    check("Energy 1 moves every assigned control to its To", moved);
    check("Energy 1 is louder than Energy 0 and stays under clipping", hot > calm * 1.5 && hot < .9, `rms calm ${calm.toFixed(3)}, energy ${hot.toFixed(3)}`);
    await b.eval(`${W}.c.energy.set(0)`); const back = await b.eval(`(w => Math.abs(w.c.density.value - .9) < .01 && Math.abs(w.c.fb.value - .4) < .01)(${W})`);
    check("Energy back to 0 returns each control to its From", back);
    await b.eval(`${W}.stop()`); check("Energy: no page errors", !b.errors.filter(e => !/supabaseUrl/.test(e)).length, b.errors.join(" | ")); }
  // the tape echo dies away at every frequency: a 2.2 kHz burst into the delay at fb 0.5, tone 2800 (the old loop gain there was 1.03)
  const echo = await b.eval(`(async () => { const c = new OfflineAudioContext(1, 48000 * 12, 48000), o = c.createOscillator(), g = c.createGain();
    o.frequency.value = 2200; g.gain.setValueAtTime(.3, 0); g.gain.setValueAtTime(0, .15); o.connect(g); o.start(0);
    const fx = SynthKit.fx("delay", c, { time: 720, fb: ${process.env.NEG ? 1 : 0.5}, tone: 2800, wow: 0, pp: "0" }); g.connect(fx.input); fx.output.connect(c.destination);
    const d = (await c.startRendering()).getChannelData(0), rms = (a, z) => { let s = 0; for (let i = a * 48000; i < z * 48000; i++) s += d[i] * d[i]; return Math.sqrt(s / ((z - a) * 48000)); };
    return 20 * Math.log10(rms(10, 12) / rms(.6, 2.2)); })()`);
  check("tape echo at 2.2 kHz has died away 40 dB by 10 s", echo < -40, echo.toFixed(1) + " dB");
  // the old loops repeated every 1-3 s (correlation 1.0 at that lag); the new buffer: none at those lags, and the loop seam is smooth
  const r = await b.eval(`(() => { const c = new OfflineAudioContext(1, 48000, 48000), out = {};
    for (const k of ["white", "pink", "brown"]) { const d = SiteNoise.buffer(c, k).getChannelData(0), N = 48000;
      const corr = lag => { let s = 0, a = 0, q = 0; for (let i = 0; i < N; i++) { s += d[i] * d[i + lag]; a += d[i] * d[i]; q += d[i + lag] ** 2; } return s / Math.sqrt(a * q); };
      out[k] = { len: d.length / 48000, c1: Math.abs(corr(48000)), c3: Math.abs(corr(144000)), seam: Math.abs(d[0] - d[d.length - 1]) }; } return out; })()`);
  for (const k in r) check(`SiteNoise.buffer ${k}: ${r[k].len} s, no repeat at 1 s / 3 s, smooth seam`, r[k].len > 20 && r[k].c1 < .2 && r[k].c3 < .2 && r[k].seam < .5, JSON.stringify(r[k]));
  await b.close(); srv.close(); console.log(fails ? fails + " FAILED" : "all ok"); process.exit(fails ? 1 : 0);
})();
