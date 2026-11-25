// The nine-synth page in a browser (lessons/synth-compare.qmd): both panels build, every example loads and translates,
// both synths sound through the worklet, Turn into swaps the starting point, a report line lights controls, the plots draw.
// Run after rendering the page: node tests/lessons/synth-compare.cdp.js   (SHOT=file.png saves a screenshot; NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8547);
const LEVEL = (id, ms) => `new Promise(res => { const a = SynthCompare.widgets[0].analyser('${id}'); const d = new Float32Array(2048); let m = 0;
  const iv = setInterval(() => { a.getFloatTimeDomainData(d); for (const x of d) m = Math.max(m, Math.abs(x)); }, 30); setTimeout(() => { clearInterval(iv); res(m); }, ${ms}); })`;
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 1000);
  await b.goto("http://127.0.0.1:8547/lessons/synth-compare.html"); await b.sleep(800);
  check("one widget, two panels", await b.eval(`SynthCompare.widgets.length === 1 && document.querySelectorAll('.scmp-panel').length === 2`));
  check("report lists settings", await b.eval(`document.querySelectorAll('.scmp-item').length`) > 8);
  const exs = await b.eval(`SynthCompare.EXAMPLES.map(e => e.id)`);
  let bad = [];
  for (const id of exs) { const r = await b.eval(`(() => { const W = SynthCompare.widgets[0]; W.load('${id}'); return [document.querySelectorAll('.scmp-item').length, document.querySelectorAll('.scmp-c.scmp-lost').length, SynthCompare.EXAMPLES.find(e => e.id === '${id}')]; })()`);
    if (r[0] < 5) bad.push(id); }
  check("every example loads with a report", bad.length === 0, bad.join(","));
  await b.eval(`SynthCompare.widgets[0].load('feedback')`);
  check("feedback: its controls marked lost", (await b.eval(`[...document.querySelectorAll('.scmp-moog .scmp-c.scmp-lost')].map(e => e.dataset.ctl).join(',')`)).includes("extOn"));
  check("feedback: the flow wire is red", await b.eval(`!!document.querySelector('.scmp-moog .scf-fb.scf-lost')`));
  await b.eval(`SynthCompare.widgets[0].load('fat-bass')`);
  await b.eval(`SynthCompare.widgets[0].phrase(['moog'])`); await b.sleep(400);
  let lv = await b.eval(LEVEL("moog", 1200)); check("Model D sounds", lv > 0.01, lv.toFixed(3));
  b.eval(`SynthCompare.widgets[0].stop()`); await b.sleep(300);
  await b.eval(`SynthCompare.widgets[0].phrase(['prophet'])`); await b.sleep(400);
  lv = await b.eval(LEVEL("prophet", 1200)); check("Prophet-5 sounds", lv > 0.01, lv.toFixed(3));
  await b.eval(`SynthCompare.widgets[0].stop()`); await b.sleep(400);
  lv = await b.eval(LEVEL("prophet", 300)); check("Stop silences", lv < 0.01, lv.toFixed(4));
  // turning a knob on the source retranslates the other panel
  await b.eval(`SynthCompare.widgets[0].set('moog', 'cutoff', 8.0)`); await b.sleep(500);
  check("Model D cutoff 8 → Prophet cutoff 8", await b.eval(`document.querySelector('.scmp-prophet [data-ctl=cutoff] output').textContent`) === "8.0");
  // Turn into the Model D
  await b.eval(`SynthCompare.widgets[0].load('p5-sync'); document.querySelector('.scmp-prophet .scmp-turn').click()`); await b.sleep(300);
  check("Prophet is the starting point", await b.eval(`document.querySelector('.scmp-prophet').classList.contains('scmp-src')`));
  check("sync marked lost on the Prophet panel", await b.eval(`document.querySelector('.scmp-prophet [data-ctl=aSync]').classList.contains('scmp-lost')`));
  await b.eval(`[...document.querySelectorAll('.scmp-item')].find(i => /Hard sync/.test(i.textContent)).dispatchEvent(new Event('mouseenter'))`);
  check("pointing at a line lights its control", await b.eval(`document.querySelector('.scmp-prophet [data-ctl=aSync]').classList.contains('scmp-hl')`));
  check("plots drawn", await b.eval(`[...document.querySelectorAll('.scmp-plot canvas')].slice(0, 3).every(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n > 500; })`));
  // nine synths: the pickers, every synth as "From" builds both panels, translates, and sounds through the worklet
  check("From / To pickers list nine synths", await b.eval(`[...document.querySelectorAll('.scmp-pick')].map(s => s.options.length).join(',')`) === "9,9");
  const ids = await b.eval(`SynthCompare.IDS`); bad = [];
  for (const id of ids) {
    const to = id === "juno" ? "dx7" : "juno";
    const r = await b.eval(`(() => { const W = SynthCompare.widgets[0]; W.stop(); W.pick('${id}', '${to}'); return [document.querySelectorAll('.scmp-panel').length, !!document.querySelector('.scmp-${id}.scmp-src'), !!document.querySelector('.scmp-${to}.scmp-dst'), document.querySelectorAll('.scmp-item').length, document.querySelectorAll('.scmp-${id} .scf-b').length]; })()`);
    if (r[0] !== 2 || !r[1] || !r[2] || r[3] < 3 || r[4] < 3) { bad.push(id + " " + JSON.stringify(r)); continue; }
    const ex = await b.eval(`SynthCompare.EXAMPLES.find(e => e.from === '${id}').id`);
    await b.eval(`SynthCompare.widgets[0].load('${ex}')`); await b.eval(`SynthCompare.widgets[0].phrase(['${id}'])`); await b.sleep(300);
    const lv1 = await b.eval(LEVEL(id, 900)); if (!(lv1 > 0.005)) bad.push(id + " silent " + lv1);
    await b.eval(`SynthCompare.widgets[0].stop()`); await b.sleep(200);
  }
  check("every synth as the starting point: panels, report, flow, sound", bad.length === 0, bad.join("; "));
  await b.eval(`SynthCompare.widgets[0].load('dx7-bell')`);
  check("DX7 flow draws its algorithm", await b.eval(`/algorithm 5: 3 carriers/.test(document.querySelector('.scmp-dx7 .scmp-flow').textContent)`));
  check("DX7 → partner: FM marked lost", await b.eval(`[...document.querySelectorAll('.scmp-rg-lost .scmp-item')].some(i => /FM/.test(i.textContent))`));
  await b.eval(`SynthCompare.widgets[0].load('arp-ring'); document.querySelector('.scmp-arp2600 .scmp-c-cords .scmp-turn').click()`); await b.sleep(300);
  check("ARP: + cord adds a cord row and a route", await b.eval(`document.querySelectorAll('.scmp-arp2600 .scmp-cord').length === 1 && SynthCompare.engine('arp2600', SynthCompare.widgets[0].st.arp2600).routes.some(r => r.cord)`));
  await b.eval(`SynthCompare.widgets[0].pick('obxa', 'prophet'); SynthCompare.widgets[0].set('obxa', 'pole4', false)`); await b.sleep(500);
  check("OB-Xa 2-pole: the report names the slope change", await b.eval(`[...document.querySelectorAll('.scmp-item')].some(i => /slope 12 → 24/.test(i.textContent))`));
  // the DAW entry point on its own AudioContext
  const vl = await b.eval(`(async () => { const ac = new AudioContext(); await ac.resume(); const v = await SynthCompare.voice(ac, 'juno', SynthCompare.EXAMPLES.find(e => e.id === 'juno-bass').s);
    const a = ac.createAnalyser(); v.node.connect(a); v.noteOn(48, 0.9, ac.currentTime + 0.05); const d = new Float32Array(2048); let m = 0;
    await new Promise(r => setTimeout(r, 500)); for (let i = 0; i < 8; i++) { a.getFloatTimeDomainData(d); for (const x of d) m = Math.max(m, Math.abs(x)); await new Promise(r => setTimeout(r, 40)); }
    v.noteOff(48); ac.close(); return m; })()`);
  check("SynthCompare.voice sounds on its own AudioContext", vl > 0.005, vl.toFixed(3));
  const errs = b.errors.filter(e => !/supabase/i.test(e)); check("no page errors (the site-wide supabase notice aside)", errs.length === 0, errs.slice(0, 2).join(" | "));
  if (process.env.SHOT) { await b.eval(`SynthCompare.widgets[0].load('feedback'); window.scrollTo(0, document.querySelector('.scmp').getBoundingClientRect().top + scrollY - 60)`); await b.sleep(1500); await b.shot(process.env.SHOT, true); }
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})();
