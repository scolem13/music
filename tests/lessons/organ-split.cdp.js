// The B3 panel with one drawbar set per manual (no preset octave), the Presets menu (faithful-panel.js, every writable panel), and one
// MIDI keyboard split into pedal / lower / upper (apps/shared/lessons/midi-split.js) on lessons/organ-compare.html. MIDI is fed through
// the split's feed() (headless Chrome has no MIDI device). Run after rendering or copying into _site:
//   node tests/lessons/organ-split.cdp.js   (NEG=1 must fail; SITE=<dir>)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8591;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  const W = `OrganCompare.widgets[0]`, M = `document.querySelector('.ocmp-panel:not(.ocmp-b)')._fpH.m`;
  const level = () => b.eval(`new Promise(res => { const a = ${W}.analyser(), buf = new Float32Array(a.fftSize); let mx = 0;
    const iv = setInterval(() => { a.getFloatTimeDomainData(buf); for (const x of buf) mx = Math.max(mx, Math.abs(x)); }, 20); setTimeout(() => { clearInterval(iv); res(mx); }, 500); })`);
  await b.resize(1400, 950);
  if (!fs.existsSync(SITE + "/lessons/organ-compare.html")) check("rendered", false, "no organ-compare.html in " + SITE);
  else {
    await b.goto(`http://127.0.0.1:${PORT}/lessons/organ-compare.html`); await b.sleep(800);
    await b.eval(`Object.keys(localStorage).filter(k => /^(fp-presets|midi-split|fp-layout|panel-keys)/.test(k)).forEach(k => localStorage.removeItem(k)); FaithfulPanel.setMview('panel'); ${W}.pick('b3','pipe')`); await b.sleep(1500);
    const pan = await b.eval(`(() => { const m = ${M}; const secs = m.layout.items.filter(i => i.t === 'section').map(i => i.label);
      return { pre: m.svg.querySelectorAll('[data-ctl^="pre:"]').length, secs, upre: ${W}.st.b3.upre, lpre: ${W}.st.b3.lpre, sliders: m.svg.querySelectorAll('[data-ctl^="inv:"]').length }; })()`);
    check("B3: no preset octave, one drawbar set per manual + pedal (20 drawbars), both manuals held on set B", pan.pre === 0 && pan.sliders === 20 && pan.upre === "B" && pan.lpre === "B" && pan.secs.join() === "VIBRATO,UPPER,PEDAL,LOWER,PERCUSSION,LESLIE 122 · AMP", JSON.stringify(pan));
    // presets
    const pm = await b.eval(`(() => { const m = ${M}; const btn = m.el.querySelector('.fp-pre-b'); return { btn: !!btn && /Presets/.test(btn.textContent), api: !!m.presets }; })()`);
    check("a Presets menu in the panel's bar", pm.btn && pm.api, JSON.stringify(pm));
    await b.eval(`${W}.set('b3','uB.0',8); ${W}.set('b3','leslie','fast'); ${M}.presets.save('Full')`);
    await b.eval(`${W}.set('b3','uB.0',0); ${W}.set('b3','leslie','slow'); ${M}.presets.save('Soft')`);
    await b.eval(`${M}.presets.load(0)`);
    check("save two presets, load the first: drawbar and Leslie come back", (await b.eval(`${W}.st.b3['uB.0']`)) === 8 && (await b.eval(`${W}.st.b3.leslie`)) === "fast");
    const menu = await b.eval(`(() => { const m = ${M}; m.el.querySelector('.fp-pre-b').click(); const names = [...m.el.querySelectorAll('.fp-pre-name')].map(x => x.textContent.trim()); return { names, open: !m.el.querySelector('.fp-pre-pop').hidden, label: m.el.querySelector('.fp-pre-b').textContent }; })()`);
    check("the menu lists them (numbered for the panel keys) and names the loaded one", menu.open && menu.names.length === 2 && /1\s+Full/.test(menu.names[0]) && /Full/.test(menu.label), JSON.stringify(menu));
    await b.eval(`(() => { const m = ${M}; [...m.el.querySelectorAll('.fp-pre-name')][1].click(); })()`);
    check("clicking a name loads it", (await b.eval(`${W}.st.b3['uB.0']`)) === 0, JSON.stringify(await b.eval(`[${W}.st.b3['uB.0'], ${M}.presets.list().map(p => p.v['inv:uB.0']), ${M}.el.querySelector('.fp-pre-b').textContent]`)));
    check("kept in localStorage", (await b.eval(`JSON.parse(localStorage.getItem('fp-presets:organ-b3')).length`)) === 2);
    // the split
    const z = await b.eval(`(() => { const s = ${W}.split; return s ? { a: s.zoneOf(40), b: s.zoneOf(60), c: s.zoneOf(80), sp: s.splits(), ui: !!document.querySelector('.ocmp-midi .ms-svg') } : null; })()`);
    check("split: default C3 / C5 on the B3 = pedal / lower / upper", z && z.a === "pedal" && z.b === "lower" && z.c === "upper" && z.sp.join() === "48,72" && z.ui, JSON.stringify(z));
    await b.eval(`${W}.set('b3','uB.0',8); ${W}.set('b3','uB.2',8); ${W}.split.feed(0x90, 79, 100)`);
    const lv = await level(); await b.eval(`${W}.split.feed(0x80, 79, 0)`);
    check("a note in the upper zone sounds", lv > 0.004, lv.toFixed(4));
    await b.eval(`[...document.querySelectorAll('.ocmp-midi button')].find(x => /Learn split 1/.test(x.textContent)).click(); ${W}.split.feed(0x90, 41, 90)`);
    check("Learn split 1 + a key sets the pedal / lower split there", (await b.eval(`${W}.split.splits()[0]`)) === 41 && (await b.eval(`${W}.split.zoneOf(41)`)) === "lower");
    await b.eval(`${W}.split.setSplits([50, 70])`);
    check("splits can be set", (await b.eval(`${W}.split.zoneOf(49) + ' ' + ${W}.split.zoneOf(50) + ' ' + ${W}.split.zoneOf(70)`)) === "pedal lower upper");
    await b.goto(`http://127.0.0.1:${PORT}/lessons/organ-compare.html`); await b.sleep(800); await b.eval(`${W}.pick('b3','pipe')`); await b.sleep(1500);
    check("splits and presets survive a reload", (await b.eval(`${W}.split.splits().join()`)) === "50,70" && (await b.eval(`${M}.presets.list().length`)) === 2);
    await b.eval(`${W}.pick('vox','b3')`); await b.sleep(1200);
    check("a one-manual organ (Vox): one zone, no split", (await b.eval(`${W}.split.splits().length`)) === 0 && /whole keyboard/.test(await b.eval(`document.querySelector('.ocmp-midi').textContent`)));
    const errs = b.errors.filter(e => !/supabase/i.test(e)); check("no page errors (the site-wide supabase one aside)", errs.length === 0, errs.slice(0, 3).join(" | "));
  }
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})();
