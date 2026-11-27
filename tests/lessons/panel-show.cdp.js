// The Show ▾ menu (faithful-panel.js PanelLayout): "Only working controls" and one-click section hiding, on Vital (lessons/intro-vital.html)
// and the B3 (lessons/organ-compare.html); plus synth-compare.js hearing the synth whose knob turns and the translation following a
// drag within ~100 ms. Run after rendering / copying into _site:  node tests/lessons/panel-show.cdp.js   (NEG=1 must fail; SITE=<dir>)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8598;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1400, 950);
  await b.goto(`http://127.0.0.1:${PORT}/lessons/intro-vital.html`); await b.sleep(400);
  await b.eval(`Object.keys(localStorage).filter(k => /^fp-layout/.test(k)).forEach(k => localStorage.removeItem(k))`);
  await b.goto(`http://127.0.0.1:${PORT}/lessons/intro-vital.html`); await b.sleep(2000);
  const V = `document.querySelector('.scmp-vital .fp-w')`;
  const menu = await b.eval(`(() => { const w = ${V}, sb = [...w.querySelectorAll('.fp-pre-b')].find(x => /^Show/.test(x.textContent)); sb.click(); return [...sb.nextSibling.querySelectorAll('button')].map(x => x.textContent); })()`);
  check("Vital: Show menu has Only working controls and the sections by name, Osc 1-3 among them", /Only working/.test(menu[0]) && ["VOICE · Osc 1", "VOICE · Osc 3", "VOICE · FILTER 2", "FX · REVERB", "LFO 1"].every(n => menu.some(m => m.includes(n))), menu.join(" | "));
  const vis = () => b.eval(`(() => { const w = ${V}, s = w.querySelector('.fp-svg'); const shown = e => !e.closest('[data-pl-hide]');
    return { live: [...s.querySelectorAll('[data-ctl]')].filter(shown).length, dead: [...s.querySelectorAll('.fp-off')].filter(shown).length, vb: s.getAttribute('viewBox').split(' ').map(Number) }; })()`);
  const v0 = await vis();
  await b.eval(`(() => { const w = ${V}, sb = [...w.querySelectorAll('.fp-pre-b')].find(x => /^Show/.test(x.textContent)); [...sb.nextSibling.querySelectorAll('button')].find(x => x.textContent.includes('VOICE · Osc 3')).click(); })()`);
  const o3 = await b.eval(`(() => { const s = ${V}.querySelector('.fp-svg'); return { o3: !!s.querySelector('[data-ctl="o3Frame"]').closest('[data-pl-hide]'), o2: !!s.querySelector('[data-ctl="o2Frame"]').closest('[data-pl-hide]') }; })()`);
  check("one click hides Osc 3 (its knobs) and leaves Osc 2", o3.o3 && !o3.o2, JSON.stringify(o3));
  await b.eval(`(() => { const w = ${V}, sb = [...w.querySelectorAll('.fp-pre-b')].find(x => /^Show/.test(x.textContent)); [...sb.nextSibling.querySelectorAll('button')].find(x => /Show everything/.test(x.textContent)).click(); [...sb.nextSibling.querySelectorAll('button')][0].click(); })()`);
  const v1 = await vis();
  check("Only working controls: no dimmed control left, every working one kept, drawing box sane", v0.dead > 30 && v1.dead === 0 && v1.live === v0.live && v1.vb[0] > -20 && v1.vb[2] <= 1420 && v1.vb[2] > 600, JSON.stringify({ v0, v1 }));
  // hearing follows the knob, and the translation follows a drag
  await b.goto(`http://127.0.0.1:${PORT}/lessons/synth-compare.html`); await b.sleep(2000);
  const W = `SynthCompare.widgets[0]`;
  const r = await b.eval(`new Promise(async res => { const W = ${W}, a = W.a, bb = W.b; const keyOf = id => SynthCompare.PROFILES[id].groups.flatMap(g => g[2]).find(c => c[2] === 'k' && /cut/i.test(c[0]))[0];
    const k = keyOf(a); [...document.querySelectorAll('button')].filter(x => /^Keys play this/.test(x.textContent)).find(x => x.closest('.scmp-' + bb)).click(); await new Promise(r => setTimeout(r, 300));
    const before = JSON.stringify(W.st[bb]); const hearBefore = W.hear;
    const lo = SynthCompare.PROFILES[a].groups.flatMap(g => g[2]).find(c => c[0] === k);
    const t0 = performance.now(); let changedAt = null; W.set(a, k, lo[3] + (lo[4] - lo[3]) * 0.3);
    for (let i = 0; i < 20 && changedAt == null; i++) { await new Promise(r => setTimeout(r, 10)); if (JSON.stringify(W.st[bb]) !== before) changedAt = performance.now() - t0; }
    res({ a, bb, k, hearBefore, hearAfter: W.hear, changedAt }); })`);
  check("turning a knob on a synth makes the keys play that synth (they were on the other one)", r.hearBefore === r.bb && r.hearAfter === r.a, JSON.stringify(r));
  check("the translated synth follows within ~100 ms (it waited for 250 ms of stillness)", r.changedAt != null && r.changedAt < 120, JSON.stringify(r));
  // the B3's sections in its Show menu
  await b.goto(`http://127.0.0.1:${PORT}/lessons/organ-compare.html`); await b.sleep(800); await b.eval(`FaithfulPanel.setMview('panel'); OrganCompare.widgets[0].pick('b3','pipe')`); await b.sleep(1500);
  const om = await b.eval(`(() => { const w = document.querySelector('.ocmp-panel:not(.ocmp-b) .fp-w'), sb = [...w.querySelectorAll('.fp-pre-b')].find(x => /^Show/.test(x.textContent)); sb.click(); return [...sb.nextSibling.querySelectorAll('button')].map(x => x.textContent.replace(/^[☐☑] /, '')); })()`);
  check("B3: Show menu lists Vibrato, Upper, Pedal, Lower, Percussion, Leslie", ["VIBRATO", "UPPER", "PEDAL", "LOWER", "PERCUSSION", "LESLIE 122 · AMP"].every(n => om.includes(n)), om.join(" | "));
  const errs = b.errors.filter(e => !/supabase/i.test(e)); check("no page errors (the site-wide supabase one aside)", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})();
