// The sound-design lessons (lessons/sound-*.qmd, apps/shared/lessons/synth-kit.js) in headless Chrome: every widget
// builds, every widget makes sound when played (measured on its own analyser), the keys reach the instruments, the
// fake microphone feeds the vocoder, sections fold. Run after rendering: node tests/lessons/sound.cdp.js [shots dir]
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8515);
const PAGES = "harmonics waveforms noise filter lfo subtractive fm wavetable distortion compressor reverb chorus phaser vocoder".split(" ");
const RMS = `(w => { const a = w.view && w.view.an; if (!a) return 0; const d = new Float32Array(a.fftSize); a.getFloatTimeDomainData(d); let s = 0; for (const x of d) s += x * x; return Math.sqrt(s / d.length); })`;
(async () => {
  const b = await launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] }), out = process.argv[2] || "";
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  for (const p of PAGES) {
    b.errors.length = 0;
    await b.goto(`http://127.0.0.1:8515/lessons/sound-${p}.html`); await b.sleep(700);
    const r = await b.eval(`(() => ({ hosts: document.querySelectorAll('div.sk[data-w]').length, built: SynthKit.widgets.length,
      bar: !!document.getElementById('sk-bar'), secs: document.querySelectorAll('section.level2.ls-sec').length,
      failed: [...document.querySelectorAll('div.sk')].filter(d => /failed|Unknown/.test(d.textContent.slice(0, 80))).length }))()`);
    check(p + ": widgets built", r.hosts > 0 && r.built === r.hosts && !r.failed && r.bar, JSON.stringify(r));
    check(p + ": sections collapsible", r.secs >= 3);
    for (let i = 0; i < r.built; i++) {
      const kind = await b.eval(`SynthKit.widgets[${i}].kind`);
      if (kind === "series") {
        await b.eval(`[...SynthKit.widgets[0].host.querySelectorAll('button')].find(x => /Up the series/.test(x.textContent)).click()`);
      } else await b.eval(`SynthKit.widgets[${i}].start()`);
      let lv = 0; for (let k = 0; k < 8; k++) { await b.sleep(kind === "vocoder" ? 250 : 120); lv = Math.max(lv, await b.eval(`${RMS}(SynthKit.widgets[${i}])`)); }
      check(`${p}[${i}] ${kind}: makes sound`, lv > 0.001, "rms " + lv.toFixed(4));
      await b.eval(`SynthKit.widgets[${i}].stop()`);
    }
    const errs = b.errors.filter(e => !/supabaseUrl/.test(e));
    check(p + ": no page errors", !errs.length, errs.join(" | "));
    if (out) await b.shot(out + "/sound-" + p + ".png", false);
  }
  // the series is transposed: pick D and the first note is a D
  await b.goto("http://127.0.0.1:8515/lessons/sound-harmonics.html"); await b.sleep(600);
  const tr = await b.eval(`(() => { const s = SynthKit.widgets[0].c.root; s.set('D'); return { abc: document.querySelector('.sk-staff svg') ? 1 : 0 }; })()`);
  check("series: redraws on a new root", tr.abc === 1);
  check("series: cents of harmonic 7 and 11", Math.round(await b.eval("SynthKit.cents(7)")) === -31 && Math.round(await b.eval("SynthKit.cents(11)")) === -49);
  // keys reach an instrument and an effect switches to "Your keyboard"
  await b.goto("http://127.0.0.1:8515/lessons/sound-subtractive.html"); await b.sleep(600);
  await b.eval(`(() => { const w = SynthKit.widgets[0]; w.host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); SynthKit.noteOn(60, .9); SynthKit.noteOn(64, .9); })()`); await b.sleep(500);
  check("subtractive: keys play without the demo", await b.eval(`${RMS}(SynthKit.widgets[0])`) > 0.001);
  await b.eval("SynthKit.noteOff(60); SynthKit.noteOff(64)");
  await b.goto("http://127.0.0.1:8515/lessons/sound-reverb.html"); await b.sleep(600);
  await b.eval(`(() => { const w = SynthKit.widgets[0]; w.host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); SynthKit.noteOn(60, .9); })()`); await b.sleep(700);
  check("reverb: a key switches the source to the keyboard", await b.eval("SynthKit.widgets[0].c.source.value") === "keys" && await b.eval(`${RMS}(SynthKit.widgets[0])`) > 0.001);
  // the (fake) microphone into the vocoder and into an effect
  await b.goto("http://127.0.0.1:8515/lessons/sound-vocoder.html"); await b.sleep(600);
  await b.eval("SynthKit.widgets[0].c.mod.set('mic')"); await b.eval("SynthKit.widgets[0].start()"); await b.sleep(800);
  let mic = 0; for (let k = 0; k < 15; k++) { await b.sleep(150); mic = Math.max(mic, await b.eval(`${RMS}(SynthKit.widgets[0])`)); }
  check("vocoder: microphone opens and drives it", /Microphone on/.test(await b.eval("SynthKit.widgets[0].host.textContent")) && mic > 0.01, await b.eval("SynthKit.widgets[0].host.querySelector('.sk-status').textContent"));
  const errs = b.errors.filter(e => !/supabaseUrl/.test(e)); check("no errors after keys and mic", !errs.length, errs.join(" | "));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
