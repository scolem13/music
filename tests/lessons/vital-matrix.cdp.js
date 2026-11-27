// Vital's assignable modulation on lessons/intro-vital.html: drag a source button (LFO 1, ENV 2 …) onto a knob with real mouse events
// -> a matrix slot (source, destination, 50 %), the knob ringed, the engine gets the route and the sound moves; the MATRIX page shows
// the 8 slots and the extra sources (Env 3, LFO 2, Random); a control that cannot take modulation says so; the 9th drop is refused.
// Run after rendering / copying into _site:  node tests/lessons/vital-matrix.cdp.js   (NEG=1 must fail; SITE=<dir>)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8599;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  const mouse = (type, x, y) => b.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });
  const drag = async (a, z) => { await mouse("mousePressed", a.x, a.y); for (let i = 1; i <= 8; i++) await mouse("mouseMoved", a.x + (z.x - a.x) * i / 8, a.y + (z.y - a.y) * i / 8); await mouse("mouseReleased", z.x, z.y); await b.sleep(150); };
  await b.resize(1500, 1000);
  await b.goto(`http://127.0.0.1:${PORT}/lessons/intro-vital.html`); await b.sleep(400);
  await b.eval(`Object.keys(localStorage).filter(k => /^fp-layout/.test(k)).forEach(k => localStorage.removeItem(k))`);
  await b.goto(`http://127.0.0.1:${PORT}/lessons/intro-vital.html`); await b.sleep(2200);
  const S = `document.querySelector('.scmp-vital .fp-svg')`, W = `SynthCompare.widgets[0]`;
  const at = sel => b.eval(`(() => { const e = ${S}.querySelector(${JSON.stringify(sel)}); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  const src = lab => `[...${S}.querySelectorAll('.fp-modsrc')].find(g => g.textContent.replace(/Drag.*$/, '').trim() === ${JSON.stringify(lab)})`;
  const nsrc = await b.eval(`${S}.querySelectorAll('.fp-modsrc').length`);
  check("drag sources on the panel: ENV 1-3, LFO 1-2, RAND 1, NOTE, VELOCITY", nsrc === 8, nsrc);
  // real drag: LFO 1 -> cutoff
  const a = await b.eval(`(() => { const e = ${src("LFO 1")}; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  const z = await b.eval(`(() => { const e = ${S}.querySelector('[data-ctl="cut"]'); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await drag(a, z);
  const st = await b.eval(`({ s: ${W}.st.vital.m1s, d: ${W}.st.vital.m1d, a: ${W}.st.vital.m1a, ring: ${S}.querySelector('[data-ctl="cut"]').classList.contains('fp-modded'), msg: (document.querySelector('.scmp-vital .fp-flash') || {}).textContent, routes: SynthCompare.engine('vital', ${W}.st.vital).routes.map(r => r.id + ':' + r.src[0][0] + '>' + r.dst.join('+')) })`);
  check("dragging LFO 1 onto Cutoff fills slot 1 (LFO 1 → Cutoff, 50 %), rings the knob, says so", st.s === "LFO 1" && st.d === "Cutoff" && st.a === 50 && st.ring && /Slot 1/.test(st.msg || ""), JSON.stringify(st));
  check("the engine gets the route", st.routes.includes("m1:lfo>cut"), st.routes.join(","));
  // sound: with a slow deep LFO on cutoff, a held note's brightness moves
  const swing = await b.eval(`new Promise(async res => { const W = ${W}; ${W}.set('vital', 'lfoRate', -1); ${W}.set('vital', 'cut', 70); ${W}.set('vital', 'm1a', 60);
    W.noteOn(48); await new Promise(r => setTimeout(r, 400)); const a = W.analyser('vital'), bins = new Float32Array(a.frequencyBinCount), cs = [];
    for (let i = 0; i < 20; i++) { a.getFloatFrequencyData(bins); let s = 0, w = 0; for (let j = 1; j < bins.length; j++) { const p = Math.pow(10, bins[j] / 10); s += p * j; w += p; } cs.push(s / w * a.context.sampleRate / a.fftSize); await new Promise(r => setTimeout(r, 100)); }
    W.noteOff(48); res(Math.max(...cs) / Math.min(...cs)); })`);
  check("a held note's brightness swings with the LFO (centroid max/min > 1.3)", swing > 1.3, swing.toFixed(2));
  // ENV 2 onto Osc 1 frame, then a refused drop, then fill the slots
  const msg2 = await b.eval(`(() => { const m = document.querySelector('.scmp-vital .scmp-face').closest('.scmp-panel') ; const L = FaithfulPanel.LAYOUTS.vital, W = ${W};
    const g = k => W.st.vital[k], s = (k, v) => W.set('vital', k, v);
    const r = [L.dropMod('Env 2', 'o1Frame', g, s), L.dropMod('Env 2', 'res', g, s)];
    for (const k of ['o2Frame', 'o3Frame', 'o1Lvl', 'o2Lvl', 'o3Lvl', 'vol']) r.push(L.dropMod('LFO 2', k, g, s));
    r.push(L.dropMod('Random', 'o1Tr', g, s)); return r; })()`);
  check("ENV 2 → Osc 1 frame goes in slot 2; Resonance cannot take one here; the 9th connection is refused", /Slot 2/.test(msg2[0]) && /cannot be modulated/.test(msg2[1]) && /All 8 slots are full/.test(msg2[8]), JSON.stringify(msg2));
  // MATRIX page
  await b.eval(`[...${S}.querySelectorAll('[role=tab]')].find(t => /MATRIX/.test(t.getAttribute('aria-label'))).dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
  const mp = await b.eval(`(() => { const s = ${S}; const vis = e => e && getComputedStyle(e.closest('g')).display !== 'none' && !e.closest('[style*="display: none"]');
    return { slots: [1,2,3,4,5,6,7,8].every(n => vis(s.querySelector('[data-ctl="m' + n + 's"]')) && vis(s.querySelector('[data-ctl="m' + n + 'a"]'))), extra: ['e3A', 'lfo2Rate', 'rndRate'].every(k => vis(s.querySelector('[data-ctl="' + k + '"]'))),
      osc: vis(s.querySelector('[data-ctl="o1Frame"]')), txt: s.querySelector('[data-ctl="m1s"]').textContent }; })()`);
  check("the MATRIX tab shows 8 slots and Env 3 / LFO 2 / Random, hides the oscillators", mp.slots && mp.extra && !mp.osc && /LFO 1/.test(mp.txt), JSON.stringify(mp));
  const errs = b.errors.filter(e => !/supabase/i.test(e)); check("no page errors (the site-wide supabase one aside)", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})();
