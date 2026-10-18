// The sampling and DJ lessons (lessons/sampling-*.qmd, lessons/dj-*.qmd; apps/shared/dj/turntables.js, sampler-pads.js), headless: every page
// makes its widgets, demo loops load, play moves the record, pitch changes BPM and key, cue, scratch backwards, crossfader curve, EQ kill,
// loading an encoded file (ArrayBuffer), the R2 hook (a manifest served here, its track loaded by "<source>:<id>"), the pads slice / play
// from keys / record a pattern / stretch, no sideways scroll on a phone.
// Run after rendering: for f in sampling-what sampling-chop sampling-pitch sampling-beat sampling-flip sampling-law dj-gear dj-beatmatch dj-phrasing dj-eq dj-scratch dj-harmonic dj-set; do quarto render lessons/$f.qmd; done; node tests/lessons/dj.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : f.endsWith(".wav") ? "audio/wav" : "text/html";
let wav = null;   // the test's "R2 bucket": /r2/manifest.json and /r2/loop.wav (posted by the page, served back)
const srv = http.createServer((q, s) => {
  const u = q.url.split(/[?#]/)[0];
  if (u === "/r2/manifest.json") { s.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
    s.end(JSON.stringify({ label: "Test bucket", tracks: [{ id: "t1", title: "Bucket Loop", bpm: 124, key: "Am", url: "loop.wav" }] })); return; }
  if (u === "/r2/loop.wav") { if (q.method === "POST") { const c = []; q.on("data", d => c.push(d)); q.on("end", () => { wav = Buffer.concat(c); s.end("ok"); }); return; }
    s.writeHead(wav ? 200 : 404, { "content-type": "audio/wav", "access-control-allow-origin": "*" }); s.end(wav || ""); return; }
  const f = path.join(SITE, decodeURIComponent(u));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8528);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info != null ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), U = p => "http://127.0.0.1:8528/lessons/" + p + ".html";
  const wait = async (expr, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr)) return true; await b.sleep(100); } return false; };
  await b.resize(1200, 900);
  const pages = { "sampling-what": [1, 1], "sampling-chop": [1, 1], "sampling-pitch": [1, 1], "sampling-beat": [0, 2], "sampling-flip": [1, 2], "sampling-law": [0, 0],
    "dj-gear": [1, 0], "dj-beatmatch": [1, 0], "dj-phrasing": [1, 0], "dj-eq": [1, 0], "dj-scratch": [2, 0], "dj-harmonic": [1, 0], "dj-set": [1, 0] };
  for (const [p, [nt, np]] of Object.entries(pages)) {
    await b.goto(U(p)); await b.sleep(200);
    const r = await ev(`(() => { const tt = document.querySelectorAll('.dj-tt.dj-made').length, sp = document.querySelectorAll('.sp-pads.sp-made').length;
      return tt + ' ' + sp + ' ' + document.querySelectorAll('.works-cited p').length; })()`);
    const [t, s, wc] = r.split(" ").map(Number);
    check(p + ": " + nt + " turntables, " + np + " samplers, works cited", t === nt && s === np && wc > 0, r);
  }
  // decks: load, play, pitch, cue, scratch
  await b.goto(U("dj-beatmatch"));
  const loaded = await wait(`Turntables.all[0] && Turntables.all[0].decks.every(d => d.track)`);
  check("both demo loops load", loaded, await ev(`Turntables.all[0].decks.map(d => d.track && d.track.title + ' ' + d.track.bpm + ' ' + d.track.camelot).join(' | ')`));
  const lib = await ev(`Turntables.all[0].decks[0].sel.options.length`);
  check("load menu lists the built-in loops + Local file", lib >= 12, lib);
  await ev(`Turntables.all[0].decks[0].play()`); await b.sleep(1500);
  const pos = await ev(`(() => { const d = Turntables.all[0].decks[0]; return d.playing + ' ' + d.pos.toFixed(2) + ' ' + d.speed.toFixed(2); })()`);
  check("play: the record moves, the motor reaches speed", /^true (0\.[5-9]|1\.\d)\d* 1\.00/.test(pos), pos);
  const pb = await ev(`(() => { const d = Turntables.all[0].decks[1]; d.setPitch(3.33); return d.bpm().toFixed(1) + ' ' + d.semis().toFixed(2) + ' ' + d.readEl.textContent.includes('st)'); })()`);
  check("pitch +3.33 %: 120 → 124.0 BPM, key +0.57 st shown", pb === "124.0 0.57 true", pb);
  const rg = await ev(`(() => { const d = Turntables.all[0].decks[1]; d.setPitch(12); const a = d.pitchPct; d.setRange(16); d.setPitch(12); return a + ' ' + d.pitchPct; })()`);
  check("pitch range ±8 clamps, ±16 allows 12", rg === "8 12", rg);
  await ev(`Turntables.all[0].decks[1].setPitch(3.33); Turntables.all[0].decks[1].play()`); await b.sleep(800);
  const mt = await ev(`JSON.stringify(Turntables.all[0].match())`);
  check("match helper: tempo difference ≈ 0", Math.abs(JSON.parse(mt).diff) < 0.01, mt);
  const cue = await ev(`(async () => { const d = Turntables.all[0].decks[0]; d.cue(); await new Promise(r => setTimeout(r, 300)); return d.playing + ' ' + d.pos.toFixed(2); })()`);
  check("CUE while playing: back to the cue point (0) and stop", /^false 0\.0\d/.test(cue), cue);
  const scr = await ev(`(async () => { const d = Turntables.all[0].decks[0]; d.seek(2); await new Promise(r => setTimeout(r, 100)); d.scratch(-1); await new Promise(r => setTimeout(r, 600)); d.release(); return d.pos.toFixed(2); })()`);
  check("scratch backwards from 2.00 s", +scr < 1.9 && +scr > 1.2, scr);
  // mixer
  const xf = await ev(`(() => { const w = Turntables.all[0]; const r = []; w.set('xf', 0.5); r.push(w.xfGains().map(x => x.toFixed(2)).join(',')); w.set('curve', 1); r.push(w.xfGains().map(x => x.toFixed(2)).join(','));
    w.set('xf', 0.99); r.push(w.xfGains().map(x => x.toFixed(2)).join(',')); w.set('xf', 0); r.push(w.xfGains().map(x => x.toFixed(2)).join(',')); return r.join(' '); })()`);
  check("crossfader: smooth middle 0.71/0.71, cut middle 1/1, cut edges", xf === "0.71,0.71 1.00,1.00 0.25,1.00 1.00,0.00", xf);
  const eq = await ev(`(async () => { const w = Turntables.all[0]; w.set('0.lo', -26); w.set('1.filter', 1); w.set('0.cue', true); await new Promise(r => setTimeout(r, 200));
    return Math.round(w.ch[0].lo.gain.value) + ' ' + Math.round(w.ch[1].hp.frequency.value) + ' ' + w.ch[0].cue.gain.value.toFixed(1) + ' ' + w.inputs['0.lo'].value + ' ' + w.inputs['0.cue'].classList.contains('dj-on'); })()`);
  check("Lo kill → −60 dB, filter right → HP 8 kHz, cue on", eq === "-60 8000 1.0 -26 true", eq);
  // an encoded file (WAV ArrayBuffer), then the R2 hook
  const ab = await ev(`(async () => { const t = await Turntables.audio.demo('break100'); const ab = Turntables.audio.toWav(t.buffer);
    const tr = await Turntables.load('B', ab); return tr && (tr.dur.toFixed(1) + ' ' + Math.round(tr.bpm) + ' ' + !!tr.bpmGuessed); })()`);
  check("load a WAV ArrayBuffer; BPM detected ≈ 100", /^9\.6 (99|100|101) true$/.test(ab), ab);
  await ev(`(async () => { const t = await Turntables.audio.demo('house124'); await fetch('/r2/loop.wav', { method: 'POST', body: Turntables.audio.toWav(t.buffer) }); })()`);
  const r2 = await ev(`(async () => { Turntables.addManifest('/r2/manifest.json', 'Test bucket'); const tr = await Turntables.load('A', 'm' + (Turntables.TRACK_SOURCES.length - 1) + ':t1');
    await new Promise(r => setTimeout(r, 300)); const opts = Array.from(Turntables.all[0].decks[0].sel.querySelectorAll('optgroup')).map(g => g.label).join(',');
    return tr && (tr.title + ' ' + tr.bpm + ' ' + tr.camelot + ' ' + tr.dur.toFixed(1) + ' | ' + opts); })()`);
  check("R2 hook: manifest source listed, its track fetched and decoded", /^Bucket Loop 124 8A 15\.5 \| Built-in loops,Test bucket$/.test(r2), r2);
  // sampler pads
  await b.goto(U("sampling-beat"));
  const pl = await wait(`SamplerPads.all[0] && SamplerPads.all[0].buffer && SamplerPads.all[0].slices.length`);
  const sl = await ev(`(() => { const p = SamplerPads.all[0]; return p.slices.length + ' ' + p.slices[0].start + ' ' + p.slices.every((s, i) => !i || s.start > p.slices[i - 1].start); })()`);
  check("pads: loop loaded, sliced at the hits, in order", pl && /^\d+ 0 true$/.test(sl) && +sl.split(" ")[0] >= 8, sl);
  const eqs = await ev(`(() => { const p = SamplerPads.all[0]; p.slice('equal'); const d = p.buffer.duration; return p.slices.length + ' ' + (p.slices[1].start / d * 16).toFixed(2); })()`);
  check("pads: 16 equal slices", eqs === "16 1.00", eqs);
  const key = await ev(`(async () => { const p = SamplerPads.all[0]; p.el.focus(); p.el.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));
    const a = p.active, lit = p.padEls[0].classList.contains('sp-lit'); p.el.dispatchEvent(new KeyboardEvent('keyup', { key: 'z', bubbles: true }));
    p.el.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true })); return a + ' ' + lit + ' ' + p.sel; })()`);
  check("key Z plays pad 1, key 4 selects pad 16", key === "1 true 15", key);
  const st = await ev(`(() => { const p = SamplerPads.all[0], n = p.render(0).length; p.pads[0].mode = 'stretch'; p.pads[0].stretch = 2; const m = p.render(0).length;
    p.pads[0].mode = 'repitch'; const r = p.rate(0); p.pads[0].pitch = 12; return (m / n).toFixed(2) + ' ' + r.toFixed(2) + ' ' + p.rate(0).toFixed(2); })()`);
  check("stretch ×2 doubles the slice; repitch ×2 = half speed; +12 st = double", st === "2.00 0.50 1.00", st);
  const pat = await ev(`(async () => { const p = SamplerPads.all[0]; p.pads[0] = Object.assign(p.pads[0], { stretch: 1, pitch: 0 }); p.tempo = 200; p.click = false; p.record(true);
    await new Promise(r => setTimeout(r, 300)); p.hit(0); await new Promise(r => setTimeout(r, 200)); p.hit(4);
    await new Promise(r => setTimeout(r, 2600)); const rec = p.pattern.length, steps = p.pattern.map(e => e.step).every(s => Number.isInteger(s));
    p.passes.length && document.querySelectorAll('.sp-patbar')[0].querySelectorAll('button')[3].click(); const after = p.pattern.length; p.stop(); return rec + ' ' + steps + ' ' + after + ' ' + p.playing; })()`);
  check("pattern: record two hits (quantized), Undo removes the pass, stop", pat === "2 true 0 false", pat);
  // phone width
  await b.resize(390, 800);
  for (const p of ["dj-eq", "sampling-beat"]) { await b.goto(U(p)); await b.sleep(400);
    check(p + ": no sideways page scroll at phone width", await ev(`document.documentElement.scrollWidth <= 390`), await ev(`document.documentElement.scrollWidth`)); }
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
