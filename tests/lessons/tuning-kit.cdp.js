// tuning-kit.js on the rendered lessons/tuning-systems page: scale / pitchgrid / microfret build, make sound, the pairs beat.
// Run after rendering: node tests/lessons/tuning-kit.cdp.js [shots dir]
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8516);
const RMS = `(w => { const a = w.view && w.view.an; if (!a) return 0; const d = new Float32Array(a.fftSize); a.getFloatTimeDomainData(d); let s = 0; for (const x of d) s += x * x; return Math.sqrt(s / d.length); })`;
(async () => {
  const b = await launch({}), out = process.argv[2] || ""; let fails = 0;
  const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info ? "  " + info : "")); if (!ok) fails++; };
  await b.goto("http://127.0.0.1:8516/lessons/tuning-systems.html"); await b.sleep(1200);
  const kinds = await b.eval(`SynthKit.widgets.map(w => w.kind).join(",")`);
  check("widgets built", /scale,scale,scale,scale/.test(kinds) && /pitchgrid,pitchgrid,microfret/.test(kinds), kinds);
  check("no failed widgets", await b.eval(`![...document.querySelectorAll('div.sk')].some(d => /failed|Unknown/.test(d.textContent.slice(0,80)))`));
  const idx = k => b.eval(`SynthKit.widgets.findIndex(w => w.kind === '${k}')`);
  // the quarter-tone scale: 25 notes, half-sharp signs drawn, offsets +/-50
  const si = await idx("scale");
  const q = await b.eval(`(() => { const w = SynthKit.widgets[${si}]; return { n: w.notes().length, svgNotes: w.host.querySelectorAll('.abcjs-note').length, offs: w.notes().slice(0,5).map(n => n.top).join('|') }; })()`);
  check("24-TET: 25 notes, all drawn", q.n === 25 && q.svgNotes === 25, JSON.stringify(q));
  // Chinese pentatonic: cents from the piano
  const ci = await b.eval(`SynthKit.widgets.findIndex(w => w.kind === 'scale' && w.P.tun === 'sanfen5')`);
  const c5 = await b.eval(`SynthKit.widgets[${ci}].notes().map(n => n.s.off.toFixed(1)).join(' ')`);
  check("sanfen sunyi cents from piano", c5 === "0.0 3.9 7.8 2.0 5.9 0.0", c5);
  const li = await b.eval(`SynthKit.widgets.findIndex(w => w.kind === 'scale' && w.P.tun === 'lu12')`);
  const l12 = await b.eval(`SynthKit.widgets[${li}].notes().map(n => Math.round(n.s.off)).join(' ')`);
  check("twelve lü cents (zhonglü +22, ruibin +12)", l12 === "0 14 4 18 8 22 12 2 16 6 20 10 0", l12);
  // sound: both together
  for (const mode of ["tuned", "piano", "both"]) {
    await b.eval(`(() => { const w = SynthKit.widgets[${ci}]; w.host.querySelector('.sk-presets').querySelectorAll('button')[${{tuned:0,piano:1,both:3}[mode]}].click(); })()`);
    let lv = 0; for (let k = 0; k < 8; k++) { await b.sleep(120); lv = Math.max(lv, await b.eval(`${RMS}(SynthKit.widgets[${ci}])`)); }
    check("scale " + mode + " makes sound", lv > .001, lv.toFixed(4));
    await b.eval(`SynthKit.widgets[${ci}].stop()`);
  }
  // the series widget: both together
  const se = await idx("series");
  await b.eval(`[...SynthKit.widgets[${se}].host.querySelectorAll('button')].find(x => /Both together/.test(x.textContent)).click()`);
  let lv = 0; for (let k = 0; k < 8; k++) { await b.sleep(120); lv = Math.max(lv, await b.eval(`${RMS}(SynthKit.widgets[${se}])`)); }
  check("series: both together makes sound", lv > .001, lv.toFixed(4)); await b.eval(`SynthKit.widgets[${se}].stop()`);
  // pitch grid
  for (const kind of ["pitchgrid", "microfret"]) {
    const gi = await idx(kind);
    const cells = await b.eval(`SynthKit.widgets[${gi}].${kind === "pitchgrid" ? "cells" : "zones"}().length`);
    check(kind + ": cells", cells > 50, cells);
    await b.eval(`SynthKit.widgets[${gi}].${kind === "pitchgrid" ? "press(0)" : "press(0, 3)"}`);
    let l2 = 0; for (let k = 0; k < 6; k++) { await b.sleep(100); l2 = Math.max(l2, await b.eval(`${RMS}(SynthKit.widgets[${gi}])`)); }
    check(kind + ": press sounds", l2 > .001, l2.toFixed(4));
    await b.eval(`SynthKit.widgets[${gi}].release()`);
    check(kind + ": entered on staff", await b.eval(`SynthKit.widgets[${gi}].entry.list().length === 1 && SynthKit.widgets[${gi}].host.querySelectorAll('.tk-entry .abcjs-note').length === 1`));
    await b.eval(`SynthKit.widgets[${gi}].stop()`);
  }
  // pitchgrid: every layout x edo builds without error
  const gi = await idx("pitchgrid");
  const bad = await b.eval(`(() => { const w = SynthKit.widgets[${gi}], bad = []; for (const l of Object.keys(TuningKit.LAYOUTS)) for (const e of ['12','24','19','31']) { try { w.c.layout.set(l); w.c.edo.set(e); if (w.cells().length < 20) bad.push(l+e); } catch (x) { bad.push(l+e+x.message); } } return bad.join(','); })()`);
  check("all layouts x edos build", bad === "", bad);

  // ---- the other tunings, split keys ----
  const T = async (tun) => b.eval(`(() => { const w = SynthKit.widgets.find(x => x.kind === 'scale' && x.P.tun === '${tun}'); return w ? { n: w.notes().length, drawn: w.host.querySelectorAll('.abcjs-note').length } : null; })()`);
  for (const [tun, n] of [["et19", 20], ["et31", 32], ["et53", 54], ["rast", 8], ["bayati", 8], ["hijaz", 8], ["slendro", 6], ["pelog", 8]]) {
    const r = await T(tun); check("scale " + tun + ": " + n + " notes drawn", r && r.n === n && r.drawn === n, JSON.stringify(r));
  }
  const sk = await b.eval(`SynthKit.widgets.findIndex(w => w.kind === 'splitkeys')`);
  for (const [kb, n] of [["ordinary", 25], ["split14", 29], ["split31", 63], ["split31h", 63]]) {
    const r = await b.eval(`(() => { const w = SynthKit.widgets[${sk}]; w.c.kb.set('${kb}'); return w.pieces().length; })()`);
    check("splitkeys " + kb + ": " + n + " pieces (two octaves and a C)", r === n, r);
  }
  await b.eval(`SynthKit.widgets[${sk}].c.kb.set('split31')`);
  const steps = await b.eval(`(() => { const c = SynthKit.widgets[${sk}].pieces().map(p => +p.getAttribute('data-c')).sort((a, b) => a - b); return c.slice(1).map((v, i) => +(v - c[i]).toFixed(2)).filter((d, i) => Math.abs(d - 1200 / 31) > .01).length + ' off-step of ' + (c.length - 1); })()`);
  check("splitkeys split31: every piece one 31-step apart", /^0 off/.test(steps), steps);
  await b.eval(`SynthKit.widgets[${sk}].press(5)`);
  let l3 = 0; for (let k = 0; k < 6; k++) { await b.sleep(100); l3 = Math.max(l3, await b.eval(`${RMS}(SynthKit.widgets[${sk}])`)); }
  check("splitkeys: press sounds", l3 > .001, l3.toFixed(4)); await b.eval(`SynthKit.widgets[${sk}].release(); SynthKit.widgets[${sk}].stop()`);
  // names and just-intonation comparison
  const nm = await b.eval(`(() => { const w = SynthKit.widgets[${sk}]; w.c.lab.set('name'); const t = [...w.host.querySelectorAll('.tk-keys text')].map(x => x.textContent); w.c.lab.set('num'); return t.slice(0, 12).join(' '); })()`);
  check("splitkeys names: C, C quarter-sharp, C sharp ... no '?'", /^C \uD834\uDD32/.test(nm.replace(/^.*?(C 𝄲)/, "$1")) || (nm.includes("C") && !nm.includes("?")), nm);
  const je = await b.eval(`(() => { const w = SynthKit.widgets[${sk}]; w.c.cmp.set('just5'); w.press(0); w.release(); const a = w.host.querySelector('.sk-info').textContent; const k = w.pieces().findIndex(p => p.getAttribute('data-n') === '13'); w.press(k); w.release(); const b2 = w.host.querySelector('.sk-info').textContent; w.c.cmp.set('piano'); return a + ' | ' + b2; })()`);
  check("splitkeys just comparison: step 13 vs 4:3", /4:3/.test(je) && /cents from the nearest just ratio/.test(je), je);
  const pg = await b.eval(`(() => { const w = SynthKit.widgets[${gi}]; w.c.layout.set('linn'); w.c.edo.set('31'); w.c.lab.set('name'); const t = [...w.host.querySelectorAll('.tk-grid text')].map(x => x.textContent).join(' '); const ok = /𝄲/.test(t) && /𝄳/.test(t) && !t.includes("?"); w.c.lab.set('num'); return ok; })()`);
  check("pitchgrid 31: note names with quarter-tone signs", pg === true, pg);
  // ---- a tune in another tuning ----
  const ts = await b.eval(`SynthKit.widgets.findIndex(w => w.kind === 'tunesong')`);
  let tl = 0; for (let k = 0; k < 40 && !tl; k++) { await b.sleep(250); tl = await b.eval(`SynthKit.widgets[${ts}].loaded()`); }
  check("tunesong: collection loaded", tl > 500, tl);
  check("tunesong: Amazing Grace first", (await b.eval(`SynthKit.widgets[${ts}].title2()`)) === "Amazing Grace");
  const tu = await b.eval(`(() => { const w = SynthKit.widgets[${ts}]; w.c.tun.set('et31'); const a = w.tuned(); w.c.tun.set('et12'); const p = w.tuned(); return { n: a.length, d: a.map((v, i) => Math.round(v - p[i])) }; })()`);
  check("tunesong 31-TET: G major scale notes within 14 cents of the piano", tu.n > 20 && tu.d.every(x => Math.abs(x) <= 14), JSON.stringify(tu.d.slice(0, 12)));
  await b.eval(`(() => { const w = SynthKit.widgets[${ts}]; w.c.tun.set('et31'); w.host.querySelectorAll('.sk-presets button')[Array.from(w.host.querySelectorAll('.sk-presets button')).findIndex(x => /In this tuning/.test(x.textContent))].click(); })()`);
  let lt = 0; for (let k = 0; k < 8; k++) { await b.sleep(150); lt = Math.max(lt, await b.eval(`${RMS}(SynthKit.widgets[${ts}])`)); }
  check("tunesong: plays", lt > .001, lt.toFixed(4)); await b.eval(`SynthKit.widgets[${ts}].stop()`);
  // ---- the two new lessons ----
  const errs2 = [];
  await b.goto("http://127.0.0.1:8516/lessons/ragas.html"); await b.sleep(1200);
  const rk = await b.eval(`SynthKit.widgets.map(w => w.kind).join(',')`);
  check("ragas: six raga widgets", rk === "raga,raga,raga,raga,raga,raga", rk);
  const counts = await b.eval(`SynthKit.widgets.map(w => w.raga().an.length + '/' + w.raga().dn.length).join(' ')`);
  check("ragas: ascent / descent lengths (Yaman 7/8, Bhairav 8/8, Khamaj 7/8, Bhupali 6/6, Malkauns 6/6, Todi 8/8)", counts === "7/8 8/8 7/8 6/6 6/6 8/8", counts);
  const ga = await b.eval(`SynthKit.widgets[3].raga().an.map(n => Math.round(n.s.off)).join(' ')`);   // Bhupali S R G P D S'
  check("Bhupali cents from the piano (Ga is -14)", ga === "0 4 -14 2 -16 0", ga);
  for (let i = 0; i < 6; i += 5) for (const [bi, name] of [[0, "raga"], [1, "scale"], [2, "both"], [3, "ornament"]]) {
    await b.eval(`SynthKit.widgets[${i}].host.querySelector('.sk-presets').querySelectorAll('button')[${bi}].click()`);
    let lv = 0; for (let k = 0; k < 10; k++) { await b.sleep(150); lv = Math.max(lv, await b.eval(`${RMS}(SynthKit.widgets[${i}])`)); }
    check(`raga[${i}] ${name}: makes sound`, lv > .001, lv.toFixed(4)); await b.eval(`SynthKit.widgets[${i}].stop()`);
  }
  const gridOk = await b.eval(`(() => { const g = SynthKit.widgets[2].host.querySelectorAll('.tk-sw'); const c = x => [...g].find(e => e.textContent === x).className; return g.length === 12 && /both/.test(c('G')) && /vadi/.test(c('G')) && /down/.test(c('R')) && /down/.test(c('n')) && /up/.test(c('N')) && /sam/.test(c('N')); })()`);
  check("Khamaj grid: Re comes down only, Ga is vadi", gridOk);
  await b.goto("http://127.0.0.1:8516/lessons/uneven-frets.html"); await b.sleep(1200);
  const u = await b.eval(`SynthKit.widgets.findIndex(w => w.kind === 'unevenfret')`);
  check("uneven-frets: widget built", u >= 0);
  const mm = await b.eval(`(() => { const w = SynthKit.widgets[${u}]; w.c.set.set('meantone'); return [...w.host.querySelectorAll('svg text')].map(t => t.textContent).filter(t => /mm/.test(t)).slice(2, 3).join(); })()`);
  check("meantone fret 4 is about 4 mm from equal", /[−+]?[34]\.\d mm/.test(mm), mm);
  const r18 = await b.eval(`(() => { const w = SynthKit.widgets[${u}]; w.c.set.set('rule18'); return Math.round(w.frets()[12] - 1200); })()`);
  check("rule of 18: octave about 13 cents flat", r18 === -13, r18);
  await b.eval(`SynthKit.widgets[${u}].c.set.set('equal'); SynthKit.widgets[${u}].setFret(4, 450)`);
  const moved = await b.eval(`SynthKit.widgets[${u}].frets()[4]`);
  check("a fret can be moved", moved === 450, moved);
  await b.eval(`SynthKit.widgets[${u}].press(4)`);
  let l4 = 0; for (let k = 0; k < 6; k++) { await b.sleep(100); l4 = Math.max(l4, await b.eval(`${RMS}(SynthKit.widgets[${u}])`)); }
  check("fret press sounds", l4 > .001, l4.toFixed(4)); await b.eval(`SynthKit.widgets[${u}].release()`);
  await b.eval(`SynthKit.widgets[${u}].host.querySelector('.sk-presets').querySelectorAll('button')[2].click()`);
  let l5 = 0; for (let k = 0; k < 8; k++) { await b.sleep(120); l5 = Math.max(l5, await b.eval(`${RMS}(SynthKit.widgets[${u}])`)); }
  check("fret both together: makes sound", l5 > .001, l5.toFixed(4)); await b.eval(`SynthKit.widgets[${u}].stop()`);
  const errs3 = b.errors.filter(e => !/supabaseUrl/.test(e)); check("no page errors (new lessons)", !errs3.length, errs3.join(" | "));
  const errs = b.errors.filter(e => !/supabaseUrl/.test(e)); check("no page errors", !errs.length, errs.join(" | "));
  if (out) { await b.eval(`document.querySelector('[data-w=pitchgrid]').scrollIntoView()`); await b.shot(out + "/tuning-kit.png", true); }
  srv.close(); await b.close(); process.exit(fails ? 1 : 0);
})();
