// Gear 3's two widgets (synth-kit kinds amp and pa) in headless Chrome: both build; the amp sounds, more Gain distorts
// (the crest factor drops), Vintage greys out the Master, Presence lifts the 2-6 kHz band; the mixer channel is silent
// with the fader down, sounds with gain set, lights PEAK when too hot, howls with the wedge in front and stops with
// either cure. Run after `quarto render lessons/gear-amps.qmd`: node tests/lessons/amp.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8516);
(async () => {
  const b = await launch({}); let fails = 0;
  const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  await b.goto("http://127.0.0.1:8516/lessons/gear-amps.html"); await b.sleep(800);
  const kinds = await b.eval(`SynthKit.widgets.map(w => w.kind).join(",")`);
  check("both widgets built", kinds === "amp,pa", kinds);
  // level and crest factor (peak / rms) of a widget's own output, over about a second
  const measure = i => b.eval(`(async () => { const a = SynthKit.widgets[${i}].view.an, d = new Float32Array(a.fftSize); let pk = 0, s = 0, n = 0;
    for (let k = 0; k < 12; k++) { await new Promise(r => setTimeout(r, 80)); a.getFloatTimeDomainData(d); for (const x of d) { pk = Math.max(pk, Math.abs(x)); s += x * x; n++; } }
    const rms = Math.sqrt(s / n); return { rms, crest: pk / (rms + 1e-9) }; })()`);
  const preset = (i, name) => b.eval(`(w => w.preset(w.presetList.find(p => p.name === ${JSON.stringify(name)})))(SynthKit.widgets[${i}])`);
  const band = (i, lo, hi) => b.eval(`(() => { const a = SynthKit.widgets[${i}].view.an, f = new Float32Array(a.frequencyBinCount); a.getFloatFrequencyData(f);
    const bin = a.context.sampleRate / a.fftSize; let s = 0, n = 0; for (let k = Math.round(${lo} / bin); k < ${hi} / bin; k++) { s += Math.pow(10, f[k] / 10); n++; } return 10 * Math.log10(s / n); })()`);

  // ---- amp ----
  await preset(0, "Clean"); await b.eval(`SynthKit.widgets[0].c.cab.set("none")`); await b.eval(`SynthKit.widgets[0].start()`); await b.sleep(5000);
  const clean = await measure(0); check("amp: Clean makes sound", clean.rms > .005, JSON.stringify(clean));
  await b.eval(`SynthKit.widgets[0].c.gain.set(10)`); await b.sleep(400);
  const dirty = await measure(0); check("amp: Gain 10 squashes the peaks (distortion)", dirty.crest < clean.crest * .8, clean.crest.toFixed(2) + " -> " + dirty.crest.toFixed(2));
  await b.eval(`SynthKit.widgets[0].c.master.set(1)`); await b.sleep(400);
  const quiet = await measure(0); check("amp: Master 1 is much quieter, still distorted", quiet.rms < dirty.rms / 4 && quiet.crest < clean.crest * .8, quiet.rms.toFixed(4) + " vs " + dirty.rms.toFixed(4));
  await b.eval(`SynthKit.widgets[0].c.master.set(5)`); await b.eval(`SynthKit.widgets[0].c.presence.set(0)`); await b.sleep(500);
  let p0 = 0, p10 = 0; for (let k = 0; k < 6; k++) { await b.sleep(90); p0 += await band(0, 2000, 6000) - await band(0, 200, 800); }
  await b.eval(`SynthKit.widgets[0].c.presence.set(10)`); await b.sleep(500);
  for (let k = 0; k < 6; k++) { await b.sleep(90); p10 += await band(0, 2000, 6000) - await band(0, 200, 800); }
  check("amp: Presence 0 -> 10 lifts 2-6 kHz", (p10 - p0) / 6 > 6, ((p10 - p0) / 6).toFixed(1) + " dB");
  await preset(0, "Vintage, cranked");
  const vint = await b.eval(`({ dis: SynthKit.widgets[0].c.master.input.disabled, lab: SynthKit.widgets[0].c.gain.el.textContent })`);
  check("amp: Vintage greys out Master, Gain reads Volume", vint.dis && /Volume/.test(vint.lab), JSON.stringify(vint));
  await b.eval(`SynthKit.widgets[0].stop()`);

  // ---- pa ----
  const info = () => b.eval(`SynthKit.widgets[1].host.querySelector('.sk-info').textContent`);
  const mains = () => b.eval(`(() => { const a = SynthKit.widgets[1].view.an, d = new Float32Array(a.fftSize); a.getFloatTimeDomainData(d); let s = 0; for (const x of d) s += x * x; return Math.sqrt(s / d.length); })()`);
  const peakLed = () => b.eval(`SynthKit.widgets[1].host.querySelector('.sk-pa-led').classList.contains('on')`);
  await preset(1, "Start here"); await b.eval(`SynthKit.widgets[1].start()`); await b.sleep(800);
  check("pa: fader down, nothing in the mains", (await mains()) < .0005);
  check("pa: tells you to set the gain", /Step 1/.test(await info()));
  await preset(1, "Gain set"); await b.sleep(1200);
  const m1 = await mains(); check("pa: gain set and fader up: sound", m1 > .01, m1.toFixed(4));
  await preset(1, "Too hot"); let led = false; for (let k = 0; k < 10 && !led; k++) { await b.sleep(150); led = await peakLed(); }
  check("pa: too hot lights PEAK", led);
  await preset(1, "Gain set"); await preset(1, "Feedback"); await b.sleep(2500);
  const fb = await info(); check("pa: wedge in front, monitor up: feedback", /Feedback \(loop gain/.test(fb), fb.slice(0, 50));
  await preset(1, "Fixed: dead side"); await b.sleep(400);
  check("pa: dead side toward the wedge cures it", !/Feedback|Close to/.test(await info()), (await info()).slice(0, 60));
  await preset(1, "Feedback"); await preset(1, "Fixed: notch it"); await b.sleep(400);
  check("pa: a cut at 2.5 kHz cures it", !/Feedback/.test(await info()), (await info()).slice(0, 60));
  await b.eval(`SynthKit.widgets[1].stop()`);

  // ---- samples, bass amp, cabinets ----
  await b.eval(`SynthKit.widgets[0].stop()`); await preset(0, "Bass amp"); await b.eval(`SynthKit.widgets[0].start()`); await b.sleep(7000);
  const bs = await b.eval(`!!(window.BandSounds) + " " + SynthKit.widgets[0].P.source + " " + SynthKit.widgets[0].running + " " + SynthKit.widgets[0].status.textContent`); const bl = await measure(0);
  check("amp: Bass amp plays the band's bass samples", bs && bl.rms > .003, "BandSounds " + bs + " rms " + bl.rms.toFixed(4));
  await b.eval(`SynthKit.widgets[0].c.source.set("guitar")`); await b.eval(`SynthKit.widgets[0].c.cab.set("none")`); await b.sleep(1500); const top0 = await band(0, 3000, 6000);
  await b.eval(`SynthKit.widgets[0].c.cab.set("1x15")`); await b.sleep(1500); const top15 = await band(0, 3000, 6000);
  check("cab: a 1x15 cuts the top a no-cabinet amp lets through", top15 < top0 - 15, top0.toFixed(1) + " -> " + top15.toFixed(1) + " dB");
  await b.eval(`SynthKit.widgets[0].c.midf.set(2000)`); await b.sleep(300); check("Mid frequency sets the mid filter", Math.abs((await b.eval(`SynthKit.widgets[0].n.mid.frequency.value`)) - 2000) < 50);
  await b.eval(`SynthKit.widgets[0].stop()`);

  // ---- knobs view and typed values ----
  const kv = await b.eval(`(() => { const h = SynthKit.widgets[0].host, s = h.querySelector(".sk-viewsel select"); s.value = "knobs"; s.dispatchEvent(new Event("change"));
    const g = SynthKit.widgets[0].c.gain.el, k = g.querySelector(".sk-knob"), r = g.querySelector("input[type=range]");
    return { on: h.classList.contains("sk-knobs") && SynthKit.widgets[1].host.classList.contains("sk-knobs"), knob: k.offsetWidth > 0, slider: r.offsetWidth }; })()`);
  check("view: Knobs shows knobs, hides sliders, both widgets", kv.on && kv.knob && kv.slider === 0, JSON.stringify(kv));
  const turned = await b.eval(`(() => { const w = SynthKit.widgets[0]; w.c.gain.set(3); const k = w.c.gain.el.querySelector(".sk-knob");
    k.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })); return w.P.gain; })()`);
  check("knob: arrow up turns Gain up a step", Math.abs(turned - 3.1) < 1e-6, turned);
  const typed = await b.eval(`(() => { const w = SynthKit.widgets[1], o = w.c.midf.el.querySelector("output"); o.click();
    const box = w.c.midf.el.querySelector(".num-edit-box"); if (!box) return "no box"; box.value = "2.5k";
    box.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); return w.P.midf; })()`);
  check("typed value: clicking the number and typing 2.5k sets a log slider", Math.abs(typed - 2500) < 10, typed);
  await b.eval(`(s => { s.value = "sliders"; s.dispatchEvent(new Event("change")); })(SynthKit.widgets[0].host.querySelector(".sk-viewsel select"))`);
  const errs = b.errors.filter(e => !/supabase/i.test(e)); check("no page errors", !errs.length, errs.slice(0, 3).join(" | "));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
