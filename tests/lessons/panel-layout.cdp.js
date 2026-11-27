// Panel layout edits (the PanelLayout block of apps/shared/lessons/faithful-panel.js) on the B3 panel of lessons/organ-compare.html: Size slider, Edit layout
// (drag to move, drag the handle to resize, keys), hiding a section closes its gap and shrinks the drawing, the panel-key letters
// follow and skip hidden parts, edits survive a reload, Reset puts it back. Real mouse events through CDP Input.
// Run after rendering (or copying the files into _site): node tests/lessons/panel-layout.cdp.js   (NEG=1 must fail; SITE=<dir>; SHOT=<png>)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8583;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  const mouse = (type, x, y) => b.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });
  const drag = async (x0, y0, x1, y1) => { await mouse("mousePressed", x0, y0); for (let i = 1; i <= 6; i++) await mouse("mouseMoved", x0 + (x1 - x0) * i / 6, y0 + (y1 - y0) * i / 6); await mouse("mouseReleased", x1, y1); await b.sleep(60); };
  const key = async k => { await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code: k.length === 1 ? "Key" + k.toUpperCase() : k }); await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code: k.length === 1 ? "Key" + k.toUpperCase() : k }); await b.sleep(40); };
  const SEL = `.ocmp-panel:not(.ocmp-b) .fp-w`;
  const H = `document.querySelector('${SEL}')`;
  const me = `(${H}.querySelector('.fp-svg') && FaithfulPanel && [...document.querySelectorAll('${SEL}')][0])`;
  const ed = `OrganCompare.widgets[0] && document.querySelector('${SEL}')._le`;
  await b.resize(1400, 950);
  if (!fs.existsSync(SITE + "/lessons/organ-compare.html")) check("rendered", false, "no organ-compare.html in " + SITE);
  else {
    await b.goto(`http://127.0.0.1:${PORT}/lessons/organ-compare.html`); await b.sleep(800);
    await b.eval(`Object.keys(localStorage).filter(k => /^fp-layout:|^panel-keys/.test(k)).forEach(k => localStorage.removeItem(k)); FaithfulPanel.setMview('panel'); OrganCompare.widgets[0].pick('b3','pipe')`); await b.sleep(1500);
    // find the mounted panel object: FaithfulPanel keeps it on the face box
    const getLE = `(() => { const box = document.querySelector('.ocmp-panel:not(.ocmp-b)'); const Hh = box._fpH; return Hh && Hh.m && Hh.m.layoutEdits; })()`;
    const has = await b.eval(`(() => { const box = document.querySelector('.ocmp-panel:not(.ocmp-b)'); const m = box._fpH && box._fpH.m; return { le: !!(m && m.layoutEdits), size: !!m.el.querySelector('.pl-size button'), btn: [...m.el.querySelectorAll('.fp-bar button')].some(x => /Edit layout/.test(x.textContent)), vb: m.svg.getAttribute('viewBox') }; })()`);
    check("Size slider and Edit layout on the panel, drawing box unchanged with no edits", has.le && has.size && has.btn && has.vb === "0 0 " + (await b.eval(`FaithfulPanel.LAYOUTS['organ-b3'].w`)) + " " + (await b.eval(`FaithfulPanel.LAYOUTS["organ-b3"].h`)), JSON.stringify(has));
    const M = `document.querySelector('.ocmp-panel:not(.ocmp-b)')._fpH.m`;
    const w0 = await b.eval(`${M}.svg.getBoundingClientRect().width`);
    await b.eval(`${M}.setSize(1.5)`); await b.sleep(100);
    const w1 = await b.eval(`${M}.svg.getBoundingClientRect().width`);
    check("Size 150 % makes the drawing 1.5 times as wide (scrolls)", Math.abs(w1 / w0 - 1.5) < 0.05, w0.toFixed(0) + " -> " + w1.toFixed(0));
    await b.eval(`${M}.setSize(1)`);
    // hide the VIBRATO section: its parts go, the A♯ drawbars move left by its width + gap, the drawing narrows
    const before = await b.eval(`(() => { const m = ${M}; const p = m.layoutEdits.parts.find(q => q.it.t === 'section' && q.it.label === "UPPER"); return { x: p.g.getBoundingClientRect().x, vb: m.svg.getAttribute('viewBox') }; })()`);
    await b.eval(`(() => { const m = ${M}; const v = m.layoutEdits.parts.find(q => q.it.t === 'section' && q.it.label === 'VIBRATO'); m.layoutEdits.set(v.id, { hide: true }); })()`); await b.sleep(80);
    const after = await b.eval(`(() => { const m = ${M}; const p = m.layoutEdits.parts.find(q => q.it.t === 'section' && /LESLIE/.test(q.it.label)), sw = m.layoutEdits.parts.find(q => q.it.k === 'vibU');
      return { tr: p.g.getAttribute('transform'), vb: m.svg.getAttribute('viewBox'), swHidden: sw.g.hasAttribute('data-pl-hide') && getComputedStyle(sw.g).display === 'none', kh: m.layoutEdits.hidden('vibU') }; })()`);
    check("hiding VIBRATO hides its switches and moves the sections to its right (here the Leslie) left by its width + gap, 136", /^translate\((\S+) /.test(after.tr || "") && Math.abs(+after.tr.match(/^translate\((\S+) /)[1] - (+after.tr.match(/translate\((-\S+) -/)[1] * -1) + 136) < 0.5 && after.swHidden && after.kh, JSON.stringify(after));
    check("the drawing's box fits what is shown (the keyboard rows below still set its width)", after.vb !== before.vb, before.vb + " -> " + after.vb);
    // panel keys skip the hidden section
    await b.eval(`PanelKeys.setHand('L')`); await key("v"); await b.sleep(60);
    const pk = await b.eval(`PanelKeys.state()`);
    check("panel keys: the hidden vibrato section has no parts to grab", !pk.grab, JSON.stringify(pk));
    await b.eval(`PanelKeys.setHand(null)`);
    // Edit layout with the mouse: drag the PERCUSSION section, then resize the DRIVE knob with its handle
    await b.eval(`[...${M}.el.querySelectorAll('.fp-bar button')].find(x => /Edit layout/.test(x.textContent)).click()`); await b.sleep(80);
    const r = await b.eval(`(() => { const m = ${M}; const p = m.layoutEdits.parts.find(q => q.it.label === 'PERCUSSION'); const el = m.svg.querySelector('.pl-ov rect[data-pid="' + CSS.escape(p.id) + '"]'); const bb = el.getBoundingClientRect(); return { x: bb.x + 6, y: bb.y + bb.height - 6, id: p.id, editing: m.el.classList.contains('pl-editing') }; })()`);
    await b.eval(`document.querySelector('.ocmp-panel:not(.ocmp-b)').scrollIntoView({ block: 'start' })`); await b.sleep(100);
    const r2 = await b.eval(`(() => { const m = ${M}; const el = m.svg.querySelector('.pl-ov rect[data-pid="' + CSS.escape(${JSON.stringify(r.id)}) + '"]'); el.scrollIntoView({ block: 'center', inline: 'center' }); const bb = el.getBoundingClientRect(); return { x: bb.x + 6, y: bb.y + bb.height - 6 }; })()`);
    await drag(r2.x, r2.y, r2.x + 40, r2.y + 20);
    const pe = await b.eval(`${M}.layoutEdits.edits().it[${JSON.stringify(r.id)}]`);
    check("Edit layout: dragging the PERCUSSION section moves it (and controls are off while editing)", r.editing && pe && pe.dx > 10 && pe.dy > 5, JSON.stringify(pe));
    const k0 = await b.eval(`(() => { const m = ${M}; const p = m.layoutEdits.parts.find(q => q.it.k === 'drive'); const el = m.svg.querySelector('.pl-ov rect[data-pid="' + CSS.escape(p.id) + '"]'); el.scrollIntoView({ block: 'center', inline: 'center' }); const bb = el.getBoundingClientRect(); return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, id: p.id }; })()`);
    await drag(k0.x, k0.y, k0.x, k0.y);   // click selects
    const hd = await b.eval(`(() => { const h = ${M}.svg.querySelector('.pl-hd'); if (!h) return null; const bb = h.getBoundingClientRect(); return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }; })()`);
    if (hd) await drag(hd.x, hd.y, hd.x + 30, hd.y + 30);
    const ke = await b.eval(`${M}.layoutEdits.edits().it[${JSON.stringify(k0.id)}]`);
    check("dragging the handle makes the DRIVE knob bigger", !!hd && ke && ke.s > 1.3, JSON.stringify(ke));
    await key("ArrowRight"); await key("-");
    const ke2 = await b.eval(`${M}.layoutEdits.edits().it[${JSON.stringify(k0.id)}]`);
    check("keys in Edit layout: → moves, − shrinks", ke2.dx > (ke.dx || 0) && ke2.s < ke.s, JSON.stringify(ke2));
    await key("h");
    check("H hides the selected part", (await b.eval(`${M}.layoutEdits.edits().it[${JSON.stringify(k0.id)}].hide`)) === true);
    if (process.env.SHOT) await b.shot(process.env.SHOT);
    await key("Escape"); await key("Escape");
    check("Esc Esc leaves Edit layout", !(await b.eval(`${M}.editing`)));
    // reload: edits are kept
    await b.goto(`http://127.0.0.1:${PORT}/lessons/organ-compare.html`); await b.sleep(800); await b.eval(`OrganCompare.widgets[0].pick('b3','pipe')`); await b.sleep(1500);
    const kept = await b.eval(`(() => { const m = ${M}; const e = m.layoutEdits.edits(); return { n: Object.keys(e.it).length, vb: m.svg.getAttribute('viewBox') }; })()`);
    check("edits kept across a reload", kept.n >= 3 && true && kept.vb !== "0 0 " + (await b.eval(`FaithfulPanel.LAYOUTS['organ-b3'].w`)) + " " + (await b.eval(`FaithfulPanel.LAYOUTS["organ-b3"].h`)), JSON.stringify(kept));
    await b.eval(`${M}.layoutEdits.reset()`);
    check("reset puts the drawing back", (await b.eval(`${M}.svg.getAttribute('viewBox')`)) === "0 0 " + (await b.eval(`FaithfulPanel.LAYOUTS['organ-b3'].w`)) + " " + (await b.eval(`FaithfulPanel.LAYOUTS["organ-b3"].h`)));
    const errs = b.errors.filter(e => !/supabase/i.test(e)); check("no page errors (the site-wide supabase one aside)", errs.length === 0, errs.slice(0, 3).join(" | "));
  }
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})();
