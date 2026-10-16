// The strobe tuner (lessons/tuning-systems.qmd, lessons/guitar-bends.qmd) and the bendboard (lessons/guitar-bends.qmd) in headless Chrome.
// A synthetic oscillator stands in for the microphone (w.setSource, or the widget's own made-up string), so the strobe's bands can be
// checked: a band at an exact partial is stationary, a detuned one drifts the right way. Run after rendering both pages into _site:
//   quarto render lessons/tuning-systems.qmd; quarto render lessons/guitar-bends.qmd; node tests/lessons/tuner.cdp.js [shots dir]
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".svg") ? "image/svg+xml" : f.endsWith(".json") ? "application/json" : "text/html";
// the Tune Assessment as it was before it used the shared detector (git HEAD, if HEAD still has its own copy)
let OLD_APP = null; try { const o = require("child_process").execSync("git show HEAD:apps/tune-assessment/app.js", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 }).toString(); if (/function detectPitch\(/.test(o)) OLD_APP = o; } catch (e) {}
let useOld = false;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  if (useOld && OLD_APP && /\/apps\/tune-assessment\/app\.js$/.test(f)) { s.writeHead(200, { "content-type": "text/javascript" }); s.end(OLD_APP); return; }
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8516);
const URL = p => `http://127.0.0.1:8516/${p.includes("/") ? p : "lessons/" + p}.html`;
(async () => {
  const b = await launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] }), out = process.argv[2] || "";
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), noErr = () => b.errors.filter(e => !/supabaseUrl/.test(e));
  const W = (kind, n = 0) => `SynthKit.widgets.filter(w => w.kind === '${kind}')[${n}]`;
  // a sound check already done this session (headphones), so AudioCheck.ensure() doesn't open its dialog
  const seed = `sessionStorage.setItem('audio-check-v1', JSON.stringify({ browserOk: true, output: 'headphones', latencyMs: null, bleedDb: null, peakDb: -12, level: 'ok', constraints: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }))`;
  const hook = seed + `; window.__streams = []; (function () { var md = navigator.mediaDevices, g = md.getUserMedia.bind(md); md.getUserMedia = function (c) { return g(c).then(function (s) { __streams.push(s); return s; }); }; })()`;

  // ---------------- tuning-systems ----------------
  b.errors.length = 0; await b.goto(URL("tuning-systems")); await b.sleep(900);
  const r = await ev(`(() => ({ tuners: SynthKit.widgets.filter(w => w.kind === 'tuner').length, hosts: document.querySelectorAll('div.sk[data-w=tuner]').length, bar: !!document.getElementById('sk-bar'),
    secs: document.querySelectorAll('section.level2.ls-sec').length, toc: document.querySelectorAll('#TOC a').length, pd: typeof PitchDetect, failed: [...document.querySelectorAll('div.sk')].filter(d => /failed|Unknown|needs/.test(d.textContent.slice(0, 120))).length }))()`);
  check("tuning-systems: two tuners built, bar present, no failed widgets", r.tuners === 2 && r.hosts === 2 && r.bar && !r.failed && r.pd === "object", JSON.stringify(r));
  check("tuning-systems: sections collapsible and the jump bar is there", r.secs >= 5 && r.toc >= 5);
  check("tuning-systems: no page errors on load", !noErr().length, noErr().join(" | "));
  check("tuning-systems: the target line says what it aims at", /E4 is 3:2 over A.*330\.00 Hz/.test(await ev(`${W("tuner", 0)}.host.querySelector('.sk-info').textContent`)), await ev(`${W("tuner", 0)}.host.querySelector('.sk-info').textContent`));
  // the section with the tuners folds and opens
  const sid = await ev(`${W("tuner", 0)}.host.closest('section.level2').id`);
  await ev(`document.querySelector('section.level2#${sid} > h2').click()`);
  const shut = await ev(`document.getElementById('${sid}').classList.contains('ls-shut')`);
  await ev(`[...document.querySelectorAll('#TOC a')].find(a => a.hash === '#${sid}').click()`);
  check("tuning-systems: clicking the heading folds the tuner's section, the jump bar opens it", shut && !(await ev(`document.getElementById('${sid}').classList.contains('ls-shut')`)));

  // permission only on Start, and Stop lets the microphone go
  await b.goto(URL("tuning-systems")); await b.sleep(700); await ev(hook);
  check("mic: nothing asked for on load", await ev("__streams.length") === 0);
  await ev(`${W("tuner", 0)}.start()`);
  let heard = null; for (let i = 0; i < 40 && !(heard && heard.rms > 0.01); i++) { await b.sleep(150); heard = await ev(`${W("tuner", 0)}.state().last`); }   // the fake device beeps now and then
  check("mic: Start opens it (fake device) and its beep reaches the analyser", await ev("__streams.length") === 1 && heard && heard.rms > 0.01, JSON.stringify(heard));
  await ev(`${W("tuner", 0)}.stop()`); await b.sleep(200);
  check("mic: Stop ends the microphone's tracks", await ev("__streams[0].getTracks().every(t => t.readyState === 'ended')"));
  // no getUserMedia: a message, no exception
  b.errors.length = 0; await b.goto(URL("tuning-systems")); await b.sleep(700);
  await ev(`Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })`);
  await ev(`${W("tuner", 0)}.start()`); await b.sleep(400);
  check("no getUserMedia: says so, is not left running, nothing thrown", !(await ev(`${W("tuner", 0)}.running`)) && /can't open a microphone/.test(await ev(`${W("tuner", 0)}.host.querySelector('.sk-info').textContent`)) && !noErr().length, await ev(`${W("tuner", 0)}.host.querySelector('.sk-info').textContent`) + noErr().join("|"));

  // the strobe on a synthetic source: the made-up string (second tuner: A3 = 220 Hz, 12-ET)
  b.errors.length = 0; await b.goto(URL("tuning-systems")); await b.sleep(700);
  const T = W("tuner", 1), bands = () => ev(`${T}.state().bands.map(b => ({ k: b.k, cents: b.cents, hz: b.driftHz, ph: b.phase, mag: b.mag, alive: b.alive }))`);
  await ev(`${T}.c.stiff.set(0); ${T}.c.detune.set(0)`); await ev(`${T}.start()`); await b.sleep(1700);
  let bs = await bands(); let phs = [];
  for (let i = 0; i < 6; i++) { phs.push((await bands())[0].ph); await b.sleep(120); }
  check("strobe, in tune and harmonic: every band alive and within 1 cent", bs.length === 8 && bs.every(x => x.alive && Math.abs(x.cents) < 1), bs.map(x => x.cents.toFixed(2)).join(" "));
  check("strobe: band 1 stands still (phase wander < 0.15 rad over 0.7 s)", Math.max(...phs) - Math.min(...phs) < 0.15, (Math.max(...phs) - Math.min(...phs)).toFixed(3));
  check("conventional readout: A3 and near 0 cents", /^A3/.test(await ev(`${T}.host.querySelector('.sk-tune-note').textContent`)) && Math.abs(parseFloat((await ev(`${T}.host.querySelector('.sk-tune-cents').textContent`)).replace("−", "-"))) < 2, await ev(`${T}.host.querySelector('.sk-tune-note').textContent + ' ' + ${T}.host.querySelector('.sk-tune-cents').textContent`));
  await ev(`${T}.c.detune.set(10)`); await b.sleep(1400); bs = await bands();
  const p1 = (await bands())[0].ph; await b.sleep(150); const p2 = (await bands())[0].ph; let dph = p2 - p1; dph -= 2 * Math.PI * Math.round(dph / (2 * Math.PI));
  check("strobe, 10 cents sharp: every band reads about +10 and drifts right", bs.every(x => Math.abs(x.cents - 10) < 1.2) && bs.every(x => x.hz > 0) && dph > 0, bs.map(x => x.cents.toFixed(1)).join(" ") + " dphase " + dph.toFixed(2));
  await ev(`${T}.c.detune.set(-10)`); await b.sleep(1400); bs = await bands();
  const q1 = (await bands())[0].ph; await b.sleep(150); const q2 = (await bands())[0].ph; let dq = q2 - q1; dq -= 2 * Math.PI * Math.round(dq / (2 * Math.PI));
  check("strobe, 10 cents flat: every band reads about -10 and drifts left", bs.every(x => Math.abs(x.cents + 10) < 1.2) && bs.every(x => x.hz < 0) && dq < 0, bs.map(x => x.cents.toFixed(1)).join(" ") + " dphase " + dq.toFixed(2));
  await ev(`${T}.c.detune.set(0); ${T}.c.stiff.set(0.0008)`); await b.sleep(1500); bs = await bands();
  const want = k => 600 * Math.log2(1 + 0.0008 * k * k);
  check("strobe, stiff string B=0.0008: the fundamental is still and band k is sharp by 600 log2(1 + B k^2)", Math.abs(bs[0].cents) < 1 && bs.every(x => Math.abs(x.cents - want(x.k)) < (x.k > 7 ? 4 : 2)) && bs[7].cents > 30, bs.map(x => x.cents.toFixed(1)).join(" "));
  if (out) { await ev(`${T}.host.scrollIntoView({ block: "center" })`); await b.sleep(300); await b.shot(out + "/tuner-stiff.png", false); }
  await ev(`${T}.stop()`);
  // a source fed through the test hook
  b.errors.length = 0; await b.goto(URL("tuning-systems")); await b.sleep(700);
  const T0 = W("tuner", 0);   // note=E4 as 3:2 over A: 330 Hz
  await ev(`${T0}.setSource(function (c) { var o = c.createOscillator(); o.frequency.value = 330 * Math.pow(2, 5 / 1200); var g = c.createGain(); g.gain.value = 0.25; o.connect(g); o.start(); return g; })`);
  await ev(`${T0}.start()`); await b.sleep(1700);
  const hb = await ev(`${T0}.state().bands[0]`);
  check("test hook (an oscillator for the microphone): the pure fifth 5 cents sharp reads +5 on band 1", hb.alive && Math.abs(hb.cents - 5) < 0.6, hb.cents.toFixed(2));
  await ev(`${T0}.c.sys.set('12et')`); await b.sleep(1500);
  const hb2 = await ev(`${T0}.state().bands[0]`);
  check("...and against the equal-tempered E it is 5 + 2 = about +6.96 (E4 is 329.63)", Math.abs(hb2.cents - (5 + 1200 * Math.log2(330 / 329.6276))) < 0.7, hb2.cents.toFixed(2));
  await ev(`${T0}.stop()`);
  check("tuning-systems: no errors after all of it", !noErr().length, noErr().join(" | "));

  // ---------------- guitar-bends ----------------
  b.errors.length = 0; await b.goto(URL("guitar-bends")); await b.sleep(1200);
  const g = await ev(`(() => ({ bb: SynthKit.widgets.filter(w => w.kind === 'bendboard').length, tn: SynthKit.widgets.filter(w => w.kind === 'tuner').length, sk: !!document.getElementById('sk-bar'), bl: !!document.getElementById('bl-bar'),
    hasBarClass: document.body.classList.contains('sk-has-bar'), svg: !!document.querySelector('.sk-bb svg'),
    fixedBottom: [...document.querySelectorAll('body *')].filter(e => { var s = getComputedStyle(e); return s.position === 'fixed' && s.bottom === '0px' && e.offsetHeight > 0; }).map(e => e.id || e.className).join(','),
    secs: document.querySelectorAll('section.level2.ls-sec').length, toc: document.querySelectorAll('#TOC a').length, old: !!document.getElementById('gb-lab'), third: !!document.getElementById('gb-third') }))()`);
  check("guitar-bends: bendboard and tuner built; no #sk-bar; #bl-bar kept; one fixed bottom bar", g.bb === 1 && g.tn === 1 && !g.sk && g.bl && !g.hasBarClass && g.svg && g.fixedBottom.split(",").length === 1, JSON.stringify(g));
  check("guitar-bends: old page-local widget gone, the thirds widget kept", !g.old && g.third);
  check("guitar-bends: sections collapsible and the jump bar is there", g.secs >= 6 && g.toc >= 6);
  check("guitar-bends: no page errors on load", !noErr().length, noErr().join(" | "));
  const sid2 = await ev(`${W("bendboard")}.host.closest('section.level2').id`);
  await ev(`document.querySelector('section.level2#${sid2} > h2').click()`); const shut2 = await ev(`document.getElementById('${sid2}').classList.contains('ls-shut')`);
  await ev(`[...document.querySelectorAll('#TOC a')].find(a => a.hash === '#${sid2}').click()`);
  check("guitar-bends: the bendboard's section folds and the jump bar opens it", shut2 && !(await ev(`document.getElementById('${sid2}').classList.contains('ls-shut')`)));
  // the board
  const BB = W("bendboard"), geom = () => ev(`(() => { var w = ${BB}, d = w.host.querySelector('.bb-dot'); return { cy: +d.getAttribute('cy'), cx: +d.getAttribute('cx'), path: w.host.querySelector('.bb-string').getAttribute('d'), bend: w.getBend(), needle: w.host.querySelector('svg text[font-weight="800"]:last-of-type') && 0 }; })()`);
  const g0 = await geom(); await ev(`${BB}.setBend(100)`); const g1 = await geom();
  check("bendboard: bending moves the dot toward the neighbouring string and curves the string", g1.cy < g0.cy - 5 && g1.path !== g0.path && g1.cx === g0.cx, `cy ${g0.cy} -> ${g1.cy}`);
  check("bendboard: the readout says how far off the target (4 to 5: 200 cents) it is", /100.*100 cents flat/.test(await ev(`${BB}.host.querySelector('.sk-info').textContent`)), await ev(`${BB}.host.querySelector('.sk-info').textContent`));
  check("bendboard: ghost dot, arrow label, gauge ticks and blue zones are drawn", await ev(`(() => { var h = ${BB}.host; return !!h.querySelector('.bb-ghost') && /full/.test(h.querySelector('.bb-label').textContent) && h.querySelectorAll('.bb-zone').length >= 1 && /300/.test(h.querySelector('svg').textContent) && /200/.test(h.querySelector('svg').textContent); })()`));
  // drag the dot with the mouse
  await ev(`${BB}.setBend(0)`); await ev(`${BB}.host.scrollIntoView({ block: 'center' })`); await b.sleep(200);
  const rect = await ev(`(() => { var r = ${BB}.host.querySelector('.bb-dot').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await ev(`window.__an = (function () { var w = ${BB}; })()`);
  await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y });
  await b.send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  await b.sleep(100);
  await ev(`window.__rms = 0; (function () { var w = ${BB}, c = SynthKit.ac(); var a = c.createAnalyser(); a.fftSize = 2048; w.out.connect(a); window.__a = a; })()`);
  for (let i = 1; i <= 8; i++) { await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y - i * 3.5, button: "left", buttons: 1 }); await b.sleep(60); }
  const rms = await ev(`(() => { var d = new Float32Array(2048); __a.getFloatTimeDomainData(d); var s = 0; d.forEach(x => s += x * x); return Math.sqrt(s / d.length); })()`);
  const during = await ev(`({ bend: ${BB}.getBend(), running: ${BB}.running })`);
  await b.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y - 28, button: "left", clickCount: 1 }); await b.sleep(400);
  check("bendboard: dragging the dot bends it (about 28 px of 29 is nearly the full 300)", during.bend > 100 && during.running, JSON.stringify(during));
  check("bendboard: a tone sounds while dragging, and stops when the dot is let go", rms > 0.01 && !(await ev(`${BB}.running`)), "rms " + rms.toFixed(3));
  // play the shape
  await ev(`${BB}.c.shape.set('bendrelease')`); await ev(`${BB}.playShape()`); await b.sleep(1500);
  const mid = await ev(`({ bend: ${BB}.getBend(), running: ${BB}.running })`); await b.sleep(2600);
  check("bendboard: Play the shape bends to the target, releases, and stops", Math.abs(mid.bend - 200) < 12 && mid.running && Math.abs(await ev(`${BB}.getBend()`)) < 10 && !(await ev(`${BB}.running`)), JSON.stringify(mid));
  // listen: an oscillator at D4 bent to E4 stands in for the guitar
  await ev(`${BB}.c.shape.set('bend')`); await ev(`${BB}.c.ex.set('4to5')`);
  await ev(`${BB}.setSource(function (c) { var o = c.createOscillator(), g = c.createGain(); o.frequency.value = 293.665; o.frequency.setValueAtTime(293.665, c.currentTime + 0.4); o.frequency.linearRampToValueAtTime(293.665 * Math.pow(2, 200 / 1200), c.currentTime + 1.2); g.gain.value = 0.3; o.connect(g); o.start(); return g; })`);
  await ev(`${BB}.listen()`); await b.sleep(2300);
  const live = await ev(`${BB}.live().filter(p => p[1] != null)`);
  const early = live.filter(p => p[0] > 0.1 && p[0] < 0.3), late = live.filter(p => p[0] > 1.6 && p[0] < 2.2);
  const med = a => a.map(p => p[1]).sort((x, y) => x - y)[Math.floor(a.length / 2)];
  check("bendboard: Listen draws the player's pitch (starts near 0 cents, ends near 200)", early.length > 0 && late.length > 2 && Math.abs(med(early)) < 15 && Math.abs(med(late) - 200) < 15, `early ${early.length} med ${early.length ? med(early).toFixed(1) : "-"}; late ${late.length} med ${late.length ? med(late).toFixed(1) : "-"}`);
  check("bendboard: the live trace is on the page", /M/.test(await ev(`${BB}.host.querySelector('.bb-live').getAttribute('d')`)));
  if (out) await b.shot(out + "/bendboard.png", false);
  await ev(`${BB}.stopListen()`); await b.sleep(200);
  // MIDI wheel messages
  await ev(`${BB}.onMidi({ data: [0xE0, 127, 127] })`); const m1 = await ev(`({ bend: ${BB}.getBend(), running: ${BB}.running })`);
  await ev(`${BB}.onMidi({ data: [0xE0, 0, 64] })`); const m2 = await ev(`({ bend: ${BB}.getBend(), running: ${BB}.running })`);
  await ev(`${BB}.onMidi({ data: [0xB0, 1, 64] })`); const m3 = await ev(`${BB}.getBend()`); await ev(`${BB}.onMidi({ data: [0xB0, 1, 0] })`);
  check("bendboard: MIDI pitch wheel up = full bend and sounds, wheel back = 0 and stops; the mod wheel bends too", m1.bend > 299 && m1.running && m2.bend < 1 && !m2.running && m3 > 140 && m3 < 160, JSON.stringify([m1, m2, m3]));
  // the strobe tuner on this page
  const GT = W("tuner");
  await ev(`${GT}.setSource(function (c) { var o = c.createOscillator(); o.frequency.value = 329.6276; var g = c.createGain(); g.gain.value = 0.25; o.connect(g); o.start(); return g; })`);
  await ev(`${GT}.start()`); await b.sleep(1600); const gb = await ev(`${GT}.state().bands`);
  check("guitar-bends tuner: E4 held in tune (4 bands, band 1 within 0.5 cent)", gb.length === 4 && gb[0].alive && Math.abs(gb[0].cents) < 0.5, gb.map(x => x.cents.toFixed(2)).join(" "));
  await ev(`${GT}.stop()`);
  check("guitar-bends: no errors after all of it", !noErr().length, noErr().join(" | "));
  if (out) await b.shot(out + "/guitar-bends.png", true);
  // ---------------- the Tune Assessment still detects pitch exactly as before ----------------
  const SIG = `(function () { var sr = 44100, out = []; [[110, .3], [196, .1], [440, .3], [659.3, .05], [1200, .2], [440, .004]].forEach(function (p) { var x = new Float32Array(2048); for (var i = 0; i < 2048; i++) x[i] = p[1] * Math.sin(2 * Math.PI * p[0] * i / sr) + p[1] / 3 * Math.sin(4 * Math.PI * p[0] * i / sr); out.push(detectPitch(x, sr)); }); return out; })()`;
  const res = {};
  for (const old of OLD_APP ? [true, false] : [false]) {
    useOld = old; b.errors.length = 0; b.failed.length = 0; await b.goto(URL("practice/assessment-tune")); await b.sleep(1800);
    res[old ? "old" : "new"] = { sig: await ev(SIG), pd: await ev("typeof PitchDetect"), errors: noErr().slice().sort(), failed: b.failed.filter(f => /\/apps\//.test(f)) };
  }
  check("Tune Assessment: loads the shared detector, no missing files", res.new.pd === "object" && !res.new.failed.length, JSON.stringify(res.new.failed));
  check("Tune Assessment: detectPitch on 6 test signals", res.new.sig.length === 6 && Math.abs(res.new.sig[2] - 440) < 0.6 && res.new.sig[5] === -1, JSON.stringify(res.new.sig.map(v => +v.toFixed(2))));
  if (OLD_APP) check("Tune Assessment: same pitches and same page errors as the old in-page copy", JSON.stringify(res.old.sig) === JSON.stringify(res.new.sig) && JSON.stringify(res.old.errors) === JSON.stringify(res.new.errors), "old " + JSON.stringify(res.old.sig) + " errors " + res.old.errors.length + "/" + res.new.errors.length);
  else console.log("skip Tune Assessment old-vs-new (git HEAD no longer has its own detectPitch)");
  useOld = false;
  await b.close(); srv.close(); console.log(fails ? fails + " FAILED" : "all ok"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
