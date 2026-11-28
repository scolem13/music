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
      if (!/noiseeq|ambient|modal/.test(ws[i])) continue;
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
  // the modelled voices (bass bars, chime tubes), the modelled wind-chime gusts and the wavetable pad sound; no bell recordings are fetched
  await b.goto("http://127.0.0.1:8517/tools/ambient.html"); await b.sleep(800);
  for (const [inst, dtype] of [["cbell", "pad"], ["mbar", "pad"], ["wbar", "saw"], ["chime", "pad"]]) {
    b.errors.length = 0;
    await b.eval(`(w => { w.c.inst.set("${inst}"); w.c.dtype.set("${dtype}"); w.c.chimes.set(1); w.c.density.set(1); w.start(); })(SynthKit.widgets.find(w => w.kind === "ambient"))`);
    let lv = 0; for (let k = 0; k < 20; k++) { await b.sleep(200); lv = Math.max(lv, await b.eval(`${RMS}(SynthKit.widgets.find(w => w.kind === "ambient"))`)); }
    const got = await b.eval(`!performance.getEntriesByType("resource").some(r => /bell-samples/.test(r.name))`);
    check(`ambient ${inst} + ${dtype} drone + modelled chimes: sounds, no samples fetched, no errors`, lv > .001 && got && !b.errors.filter(e => !/supabaseUrl/.test(e)).length, "rms " + lv.toFixed(4) + " " + b.errors.join(" | "));
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
  // cued changes: a cued slider changes nothing until Go, then glides there over the Transition time; the menus' settings reach the sound
  { b.errors.length = 0; const W = `SynthKit.widgets.find(w => w.kind === "ambient")`;
    await b.eval(`(w => { w.preset(w.presetList[0]); w.start(); w.c.cue.set("cued"); w.c.trans.set(2); w.c.verb.set(.9); w.c.drone.set(.9); })(${W})`); await b.sleep(400);
    const held = await b.eval(`(w => ({ n: Object.keys(w.cued()).length, P: w.P.verb }))(${W})`);
    check("Cued: moving two sliders cues them and the sound keeps the old value", held.n === 2 && Math.abs(held.P - .5) < .01, JSON.stringify(held));
    await b.eval(`${W}.go()`); await b.sleep(1000); const mid = await b.eval(`${W}.P.verb`);
    await b.sleep(1600); const end = await b.eval(`(w => ({ v: w.P.verb, g: w.gliding(), n: Object.keys(w.cued()).length }))(${W})`);
    check("Go glides over the Transition time", mid > .55 && mid < .85 && Math.abs(end.v - .9) < .01 && !end.g && !end.n, `mid ${mid.toFixed(2)}, end ${JSON.stringify(end)}`);
    await b.eval(`(w => { w.c.cue.set("now"); w.c.chimes.set(1); w.c.chLevel.set(2); w.c.cymbals.set(1); w.c.cyLevel.set(2); w.c.cyRev.set(1); })(${W})`);
    const menus = await b.eval(`(w => typeof w.P.chTune === "string" && w.P.chLow === 45 && w.P.cymSet.length === 4 && w.P.chLevel === 2 && w.P.cyRev === 1)(${W})`);
    check("chime and cymbal menus set their values", menus);
    await b.sleep(1500); await b.eval(`${W}.stop()`); check("cue and menus: no page errors", !b.errors.filter(e => !/supabaseUrl/.test(e)).length, b.errors.join(" | ")); }
  // Record take -> Open in DAW: a 6 s take with a cue glide, the stems and notes reach the DAW page as a new project
  { b.errors.length = 0; const W = `SynthKit.widgets.find(w => w.kind === "ambient")`;
    await b.goto("http://127.0.0.1:8517/tools/ambient.html"); await b.sleep(800);
    await b.eval(`(w => { w.preset(w.presetList.find(p => p.name === "Chime garden")); w.c.density.set(3); w.c.pace.set(6); w.start(); })(${W})`); await b.sleep(500);
    await b.eval(`${W}.recordTake()`); await b.sleep(1500); await b.eval(`${W}.c.drive.set(.6)`); await b.sleep(4500); await b.eval(`${W}.take.finish()`); await b.sleep(600);
    const tp = await b.eval(`(w => { const r = w.takeProject(); return { tracks: r.project.tracks.map(t => t.name + "|" + t.inst + "|" + (t.mute ? "m" : "") + "|" + (t.clips[0] && t.clips[0].notes ? t.clips[0].notes.length : "") + "|" + (t.auto ? t.auto.vol.length : "")), stems: r.stems.map(s => s.id + ":" + s.data.length + ":" + s.rate), peak: r.stems[0].data.reduce((a, x) => Math.max(a, Math.abs(x)), 0) }; })(${W})`);
    const hasLoops = tp.tracks.some(t => /^Loop \d/.test(t) && +t.split("|")[3] > 0), hasMaster = /Master/.test(tp.tracks.join()), hasSetting = tp.tracks.some(t => /Drive/.test(t) && +t.split("|")[4] >= 2);
    const stemLen = tp.stems.length && +tp.stems[0].split(":")[1] / +tp.stems[0].split(":")[2];
    check("take: note tracks per loop, master + stems, a Drive setting line", hasLoops && hasMaster && hasSetting && tp.stems.length >= 4, tp.tracks.join(" ; "));
    check("take: master stem is about as long as the take and not silent", Math.abs(stemLen - 6) < 1 && tp.peak > .01, "len " + (+stemLen).toFixed(2) + " s, peak " + tp.peak.toFixed(3));
    await b.eval(`(w => { w.stop(); const open = window.open; window.open = () => null; w.openTake(); window.open = open; })(${W})`); await b.sleep(1500);
    await b.goto("http://127.0.0.1:8517/tools/daw.html"); await b.sleep(3000);
    const d = await b.eval(`(() => { const cur = JSON.parse(localStorage.getItem("mdaw:daw-scratch:current") || "null"), p = cur && JSON.parse(localStorage.getItem(cur) || "null"); return p ? { n: p.tracks.length, tempo: p.tempo, audio: p.tracks.filter(t => t.inst === "audio" && t.clips.length).length } : null; })()`);
    check("DAW opens the take as a new project with its audio tracks", d && d.n === tp.tracks.length && d.tempo === 60 && d.audio === tp.stems.length, JSON.stringify(d));
    check("take and DAW: no page errors", !b.errors.filter(e => !/supabaseUrl/.test(e)).length, b.errors.join(" | ")); }
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
