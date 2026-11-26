// The faithful front panels of the drum machines and sequencers (faithful-panel.js + panels/dm-*.js, panels/sq-*.js, adapters
// DrumCompare.faceAdapter and the sequencer widget's W.faceAdapter): on drum-compare and sequencer-compare, each machine as the
// starting point shows its Panel view by default (the plain grid / editor hidden, Simple one click away); every bound key is known
// to the adapter; there are live controls; clicking a step key changes the pattern data (drums: the selected instrument's row;
// 960: the stage mode; Elektron: a trig); a knob's ArrowUp changes the state; key presses write a 303 pitch, an MC-202 accent and
// an MC-4 typed value; the translated (B / To) panel is read-only; the playing-step light moves while playing; the theme toggles.
// Run after rendering: node tests/lessons/machine-panels.cdp.js   (NEG=1 must fail; SHOT=<dir> saves each panel light + dark)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8574, SHOT = process.env.SHOT;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1400, 1000);
  const shots = async (sel, name) => { if (!SHOT) return; fs.mkdirSync(SHOT, { recursive: true });
    for (const th of ["light", "dark"]) {
      const h = await b.eval(`(() => { FaithfulPanel.setTheme('${th}'); const w = document.querySelector('${sel} .fp-w'); w.style.cssText += ';position:fixed;left:0;top:0;width:1400px;z-index:99999;margin:0'; return Math.ceil(w.getBoundingClientRect().height); })()`);
      await b.resize(1400, h); await b.sleep(150); await b.shot(`${SHOT}/${name}-${th}.png`, false);
      await b.eval(`(() => { const w = document.querySelector('${sel} .fp-w'); w.style.position = w.style.left = w.style.top = w.style.width = w.style.zIndex = w.style.margin = ''; })()`); }
    await b.resize(1400, 1000); };
  const wait = async expr => { for (let i = 0; i < 40; i++) { if (await b.eval(expr)) return true; await b.sleep(100); } return false; };
  const click = (sel, opts = "{}") => b.eval(`(() => { const e = document.querySelector('${sel}'); if (!e) return false; e.dispatchEvent(new MouseEvent('click', Object.assign({ bubbles: true }, ${opts}))); return true; })()`);
  const arrowUp = sel => b.eval(`(() => { const g = document.querySelector('${sel}'); g.focus(); g.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); })()`);

  // ---------- drum machines ----------
  await b.goto(`http://127.0.0.1:${PORT}/lessons/drum-compare.html`); await b.sleep(900);
  await b.eval(`localStorage.removeItem('machine-face-view'); localStorage.removeItem('panel-theme')`);
  for (const m of ["tr808", "tr909", "linn", "mpc60"]) {
    const lid = "dm-" + m, src = ".dcmp-src";
    await b.eval(`(() => { const W = DrumCompare.widgets[0]; W.a = DrumCompare.translate(W.a, '${m}').state; W.toId = '${m}' === 'tr909' ? 'tr808' : 'tr909'; W.redraw(); })()`);
    check(`${m}: panel mounted in Panel view`, await wait(`!!document.querySelector('${src} .fp-face svg.fp-svg') && !document.querySelector('${src} .fp-face').hidden`));
    check(`${m}: the plain grid is hidden in Panel view`, await b.eval(`getComputedStyle(document.querySelector('${src} .dcmp-gw')).display === 'none'`));
    const miss = await b.eval(`FaithfulPanel.checkAdapter(FaithfulPanel.LAYOUTS['${lid}'], DrumCompare.faceAdapter(DrumCompare.widgets[0], document.querySelector('${src}'), true))`);
    check(`${m}: every bound key is known to the adapter`, miss.length === 0, miss.join(","));
    const live = await b.eval(`document.querySelectorAll('${src} .fp-face [data-ctl]:not(.fp-off)').length`);
    check(`${m}: live controls`, live >= 20, live);
    // select the snare, toggle step 3
    const before = await b.eval(`JSON.stringify(DrumCompare.widgets[0].a.rows.snare || [])`);
    await click(`${src} .fp-face g[data-ctl="sel"][aria-label="${{ tr808: "SNARE DRUM", tr909: "SNARE DRUM", linn: "SNARE", mpc60: "SNARE" }[m]}"]`);
    check(`${m}: the snare is selected from its key`, await b.eval(`DrumCompare.widgets[0].ui['${m}a'] === 'snare'`));
    await click(`${src} .fp-face [data-ctl="step:2"]`);
    const after = await b.eval(`JSON.stringify(DrumCompare.widgets[0].a.rows.snare || [])`);
    check(`${m}: clicking step key 3 changes the snare row`, before !== after, before.slice(0, 40) + " -> " + after.slice(0, 40));
    check(`${m}: the step key's LED shows the row`, await b.eval(`document.querySelector('${src} .fp-face [data-ctl="step:2"]').getAttribute('aria-pressed') === String(!!DrumCompare.widgets[0].a.rows.snare[2])`));
    const k0 = await b.eval(`DrumCompare.widgets[0].a.kit.snare.level`);
    const lk = m === "mpc60" ? "p:sel.level" : "p:snare.level"; await arrowUp(`${src} .fp-face [data-ctl="${lk}"]`);
    check(`${m}: snare level knob ArrowUp raises the kit level`, await b.eval(`DrumCompare.widgets[0].a.kit.snare.level`) > k0);
    check(`${m}: focus kept on the knob after the redraw`, await b.eval(`document.activeElement && document.activeElement.dataset.ctl === '${lk}'`));
    check(`${m}: translated panel is read-only`, await b.eval(`!!document.querySelector('.dcmp-dst .fp-w.fp-ro')`));
    const ro0 = await b.eval(`JSON.stringify(DrumCompare.widgets[0].tr.state.rows)`);
    await click(`.dcmp-dst .fp-face [data-ctl="step:5"]`);
    check(`${m}: clicking the read-only panel changes nothing`, ro0 === await b.eval(`JSON.stringify(DrumCompare.widgets[0].tr.state.rows)`));
    await shots(src, "drum-" + m);
  }
  // playing light + Simple switch
  await b.eval(`DrumCompare.widgets[0].play(['a'])`); await b.sleep(700);
  check("drums: the playing step lights on the panel", await b.eval(`document.querySelectorAll('.dcmp-src .fp-face .fp-step.fp-now').length === 1`));
  await b.eval(`DrumCompare.widgets[0].stop()`);
  await click(`.dcmp-src .fp-vw .sp-opt[data-v="simple"]`);
  check("drums: Simple shows the plain grid again", await b.eval(`document.querySelector('.dcmp-src .fp-face').hidden && getComputedStyle(document.querySelector('.dcmp-src .dcmp-gw')).display !== 'none'`));
  await b.eval(`localStorage.removeItem('machine-face-view')`);

  // ---------- sequencers ----------
  await b.goto(`http://127.0.0.1:${PORT}/lessons/sequencer-compare.html`); await b.sleep(900);
  for (const m of ["a960", "tb303", "mc202", "mc4", "elektron"]) {
    const lid = "sq-" + m, src = ".sqc-src";
    await b.eval(`(() => { const W = SequencerCompare.widgets[0]; const ex = SequencerCompare.EXAMPLES.filter(x => x.from === '${m}')[0]; if (ex) W.load(ex.id); else { W.src = '${m}'; W.set('${m}', SequencerCompare.blank('${m}')); } })()`);
    check(`${m}: panel mounted in Panel view`, await wait(`!!document.querySelector('${src} .fp-face svg.fp-svg') && !document.querySelector('${src} .fp-face').hidden`));
    const miss = await b.eval(`FaithfulPanel.checkAdapter(FaithfulPanel.LAYOUTS['${lid}'], SequencerCompare.widgets[0].faceAdapter('${m}', 'src'))`);
    check(`${m}: every bound key is known to the adapter`, miss.length === 0, miss.join(","));
    const live = await b.eval(`document.querySelectorAll('${src} .fp-face [data-ctl]:not(.fp-off)').length`);
    check(`${m}: live controls`, live >= 8, live);
    const D = `SequencerCompare.widgets[0].data.${m}`;
    if (m === "a960") {
      const md = await b.eval(`${D}.mode[2]`); await click(`${src} .fp-face [data-ctl="step:2"]`);
      check("a960: clicking stage LED 3 toggles skip", await b.eval(`${D}.mode[2]`) !== md);
      const v0 = await b.eval(`${D}.A[0]`); await arrowUp(`${src} .fp-face [data-ctl="A:0"]`);
      check("a960: row A stage 1 knob ArrowUp raises it", await b.eval(`${D}.A[0]`) > v0);
    } else if (m === "tb303") {
      await click(`${src} .fp-face g[data-ctl="mode"][aria-label="mode"], ${src} .fp-face g[data-ctl="mode"]`);
      await b.eval(`SequencerCompare.widgets[0].t303 = { mode: 'pitch', cur: 0, oct: 0, acc: false, sl: false }`);
      await click(`${src} .fp-face g[data-ctl="key"][aria-label="key G"]`);
      check("tb303: note key G writes pitch 1", await b.eval(`${D}.pitch[0].k`) === 7);
      await b.eval(`SequencerCompare.widgets[0].t303 = { mode: 'time', cur: 0, oct: 0, acc: false, sl: false }`);
      await click(`${src} .fp-face g[data-ctl="accent"]`);
      check("tb303: time mode ACCENT writes a rest", await b.eval(`${D}.time[0]`) === "r");
    } else if (m === "mc202") {
      const a0 = await b.eval(`${D}.ch[0][0].acc`); await b.eval(`SequencerCompare.widgets[0].tmc202 = { ch: 0, row: 0, col: 0, typed: '' }`);
      await click(`${src} .fp-face g[data-ctl="acc"]`);
      check("mc202: TAP ACC toggles the step's accent", await b.eval(`${D}.ch[0][0].acc`) !== a0);
      await click(`${src} .fp-face g[data-ctl="kb"][aria-label="key 5"]`);
      check("mc202: a white key sets the step's pitch", await b.eval(`${D}.ch[0][0].n`) === 43);
    } else if (m === "mc4") {
      await b.eval(`SequencerCompare.widgets[0].tmc4 = { ch: 0, row: 0, col: 0, typed: '' }`);
      for (const d of ["3", "1", "ENTER"]) await click(`${src} .fp-face g[data-ctl="kp"][aria-label="${d === "ENTER" ? "ENTER" : d}"]`);
      check("mc4: keypad 3 1 ENTER types CV-1 = 31", await b.eval(`${D}.ch[0][0].cv1`) === 31);
    } else {
      const t0 = await b.eval(`JSON.stringify(${D}.trigs[3])`); await click(`${src} .fp-face [data-ctl="step:3"]`);
      check("elektron: trig key 4 toggles a trig", await b.eval(`JSON.stringify(${D}.trigs[3])`) !== t0);
      await click(`${src} .fp-face [data-ctl="step:3"]`, "{ altKey: true }");
      await b.eval(`${D}.trigs[3] = ${D}.trigs[3] || { type: 'n' }; SequencerCompare.widgets[0].tel.sel = 3; SequencerCompare.widgets[0].changed('elektron')`);
      await arrowUp(`${src} .fp-face [data-ctl="lk:note"]`);
      check("elektron: knob A locks NOTE on the selected trig", await b.eval(`${D}.trigs[3].note != null`));
    }
    check(`${m}: translated panel is read-only`, await b.eval(`!!document.querySelector('.sqc-dst .fp-w.fp-ro')`));
    await shots(src, "seq-" + m);
  }
  await b.eval(`(() => { const W = SequencerCompare.widgets[0]; const ex = SequencerCompare.EXAMPLES.filter(x => x.from === 'elektron')[0]; if (ex) W.load(ex.id); W.play('src'); })()`); await b.sleep(900);
  check("elektron: the playing trig lights on the panel", await b.eval(`document.querySelectorAll('.sqc-src .fp-face .fp-step.fp-now').length === 1`));
  await b.eval(`SequencerCompare.widgets[0].stop()`);
  const t0 = await b.eval(`document.querySelector('.sqc-src .fp-w').dataset.theme`); await b.eval(`document.querySelector('.sqc-src .fp-theme').click()`);
  check("theme toggles", t0 !== await b.eval(`document.querySelector('.sqc-src .fp-w').dataset.theme`));
  // intro pages carry the panel too
  for (const [slug, sel] of [["tr-808", ".dcmp-src"], ["digitakt", ".sqc-src"]]) {
    await b.goto(`http://127.0.0.1:${PORT}/lessons/intro-${slug}.html`); await b.sleep(1000);
    check(`intro-${slug}: the machine's panel is shown`, await wait(`!!document.querySelector('${sel} .fp-face svg.fp-svg')`));
  }
  console.log(fails ? `${fails} FAILED` : "all passed");
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
