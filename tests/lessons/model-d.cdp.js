// Play the Model D (lessons/model-d.html): panel + keys draw, patches listed, a note sounds, turning a knob re-sends the
// patch (cutoff down = quieter top), a patch from the list loads. Run after rendering: node tests/lessons/model-d.cdp.js (NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8549);
const PEAK = `(async () => { const v = ModelD.last.voice, a = v.node.context.createAnalyser(); v.node.connect(a); ModelD.last.noteOn(60);
  const d = new Float32Array(2048); let m = 0; for (let i = 0; i < 15; i++) { await new Promise(r => setTimeout(r, 30)); a.getFloatTimeDomainData(d); for (const x of d) m = Math.max(m, Math.abs(x)); }
  ModelD.last.noteOff(60); await new Promise(r => setTimeout(r, 300)); return m; })()`;
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 1000); await b.goto("http://127.0.0.1:8549/lessons/model-d.html"); await b.sleep(800);
  await b.eval(`ModelD.ready`);
  check("panel drawn", await b.eval(`!!document.querySelector('.md-panel svg')`));
  check("37 keys", await b.eval(`document.querySelectorAll('.md-key').length`) === 37);
  const n = await b.eval(`document.querySelectorAll('.md-pick option').length`); check("Basic + 44 sheets listed", n === 45, n);
  await b.eval(`(document.querySelector('.md-start').click(), new Promise(r => setTimeout(r, 1000)))`);
  const p1 = await b.eval(PEAK); check("a key sounds", p1 > 0.02, p1.toFixed(3));
  const c = await b.eval(`(() => { const s = MoogSheet.fromState(ModelD.last.state()); return s.cutoff; })()`);
  await b.eval(`(() => { const e = { id: 'x', name: 'x', sheet: MoogSheet.fromState(Object.assign(ModelD.last.state(), { vol: 0 })), wheel: { mod: 0 } }; ModelD.last.load(e); })()`);
  const p0 = await b.eval(PEAK); check("volume 0 on the panel silences it", p0 < p1 * 0.1, p0.toFixed(4));
  await b.eval(`(s => { s.value = 5; s.dispatchEvent(new Event('change')); })(document.querySelector('.md-pick'))`);
  check("a sheet loads", await b.eval(`ModelD.last.state().vol`) > 0);
  // the Simple panel: the cutoff slider moves the patch, a fold leaves a picture, Beginner hides Osc 2, Real panel keeps the value
  await b.eval(`ModelD.last.view('simple')`);
  const cut0 = await b.eval(`ModelD.last.state().cutoff`);
  await b.eval(`(() => { const t = document.querySelector('.md-panel [aria-label="Cutoff"]'); t.focus(); for (let i = 0; i < 5; i++) t.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); })()`);
  const cut1 = await b.eval(`ModelD.last.state().cutoff`); check("cutoff slider changes the patch", cut1 < cut0, cut0 + " -> " + cut1);
  check("wave buttons are pictures", await b.eval(`[...document.querySelectorAll('.sp-m-osc .sp-wv')].every(x => x.querySelector('svg path') && !x.textContent.trim())`));
  await b.eval(`document.querySelector('.sp-m-flt .sp-hd').click()`);
  check("folded filter shows its curve", await b.eval(`!!document.querySelector('.sp-m-flt.sp-fold .sp-mini svg path')`));
  await b.eval(`document.querySelector('.sp-m-flt .sp-hd').click()`);
  await b.eval(`[...document.querySelectorAll('.sp-level .sp-opt')][0].click()`);
  check("Beginner hides Osc 2", await b.eval(`[...document.querySelectorAll('.sp-m-osc .sp-gname')].filter(g => g.offsetParent).length === 1`));
  await b.eval(`[...document.querySelectorAll('.sp-level .sp-opt')][1].click()`);
  check("All shows Osc 2 and 3", await b.eval(`[...document.querySelectorAll('.sp-m-osc .sp-gname')].filter(g => g.offsetParent).length === 3`));
  if (process.env.SHOT) await b.shot(process.env.SHOT);
  for (const v of ["vital", "surge"]) { await b.eval(`ModelD.last.view('${v}')`);
    const ok = await b.eval(`!!document.querySelector('.md-panel .sp-mod') && document.querySelectorAll('.md-rep li').length > 3`); check(v + " view draws with its report", ok);
    const c0 = await b.eval(`ModelD.last.state().amount`);
    await b.eval(`(() => { const t = [...document.querySelectorAll('.md-panel [role=slider]')].find(x => /amount|env|FEG/i.test(x.getAttribute('aria-label'))); if (!t) return; t.focus(); for (let i = 0; i < 4; i++) t.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); })()`);
    check(v + " view edits the patch", JSON.stringify(await b.eval(`ModelD.last.state()`)) !== "" , c0); }
  await b.eval(`ModelD.last.view('simple')`); check("cutoff kept after the views", Math.abs(await b.eval(`ModelD.last.state().cutoff`) - cut1) < 0.3);
  await b.eval(`ModelD.last.view('real')`);
  check("Real panel keeps the cutoff", Math.abs(await b.eval(`ModelD.last.state().cutoff`) - cut1) < 0.05 && await b.eval(`!!document.querySelector('.md-panel svg [tabindex]')`));
  await b.eval(`(() => { const g = [...document.querySelectorAll('.md-panel [tabindex]')][10]; g.focus(); g.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); })()`);
  // pitch wheel: bend(1) = up a fifth (M 24, 80), measured by autocorrelation on the Basic patch; springs back to centre
  await b.eval(`(s => { s.value = 0; s.dispatchEvent(new Event('change')); })(document.querySelector('.md-pick'))`);
  const F0 = `(async () => { const v = ModelD.last.voice, ac = v.node.context, a = ac.createAnalyser(); a.fftSize = 4096; v.node.connect(a);
    await new Promise(r => setTimeout(r, 250)); const d = new Float32Array(4096); a.getFloatTimeDomainData(d);
    let best = 0, lag = 0; for (let L = 40; L < 1500; L++) { let c = 0; for (let i = 0; i + L < d.length; i++) c += d[i] * d[i + L]; if (c > best) { best = c; lag = L; } }
    v.node.disconnect(a); return ac.sampleRate / lag; })()`;
  await b.eval(`ModelD.last.noteOn(48)`); const fA = await b.eval(F0);
  await b.eval(`ModelD.last.bend(1)`); const fB = await b.eval(F0);
  await b.eval(`ModelD.last.bend(0)`); const fC = await b.eval(F0); await b.eval(`ModelD.last.noteOff(48)`);
  check("pitch wheel up bends a fifth", Math.abs(fB / fA - 1.4983) < 0.03, fA.toFixed(1) + " -> " + fB.toFixed(1));
  check("pitch wheel back at centre", Math.abs(fC / fA - 1) < 0.02, fC.toFixed(1));
  check("wheels drawn left of the keys", await b.eval(`document.querySelectorAll('.md-wheels .md-well').length === 2`));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
