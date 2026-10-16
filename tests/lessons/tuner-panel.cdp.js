// The strobe tuner in the navbar (apps/shared/tuner-panel.js), AudioTap (audio-tap.js) and the strobe tuner lesson, in headless Chrome.
// Render first:  quarto render index.qmd; quarto render lessons/strobe-tuner.qmd
//   node tests/lessons/tuner-panel.cdp.js [shots dir]
// Checked: the panel opens from the navbar and loads on demand; the microphone is not touched until Start; "This page's sound" reads the navbar
// drone, and an oscillator registered at a known detune, with the drift in the right direction; a media element is read and stays audible;
// "Another browser tab" works with a stand-in getDisplayMedia (real tab capture needs a person and is not tested); missing getUserMedia /
// getDisplayMedia / a refused share degrade to a message; settings persist; closing the panel stops listening; the lesson's widgets work.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".svg") ? "image/svg+xml" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8517);
const URL = p => `http://127.0.0.1:8517/${p}.html`;
(async () => {
  const b = await launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] }), out = process.argv[2] || "";
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), noErr = () => b.errors.filter(e => !/supabaseUrl/.test(e));
  const seed = `sessionStorage.setItem('audio-check-v1', JSON.stringify({ browserOk: true, output: 'headphones', latencyMs: null, bleedDb: null, peakDb: -12, level: 'ok', constraints: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }))`;
  const hook = seed + `; window.__streams = []; window.__dest = []; (function () { var md = navigator.mediaDevices, g = md.getUserMedia.bind(md); md.getUserMedia = function (c) { return g(c).then(function (s) { __streams.push(s); return s; }); };
    var cn = AudioNode.prototype.connect; AudioNode.prototype.connect = function (d) { if (d instanceof AudioDestinationNode) __dest.push(this.constructor.name); return cn.apply(this, arguments); }; })()`;
  const set = (id, v) => ev(`(() => { var e = document.getElementById('pw-t-${id}'); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  const S = () => ev(`TunerPanel.state()`);
  const open = async () => { await ev(`document.querySelector('#pw-nav a[aria-label="Strobe tuner"]').click()`); for (let i = 0; i < 30 && !(await ev(`!!window.TunerPanel && !!TunerPanel.state()`)); i++) await b.sleep(100); };
  const waitBands = async (ms = 2600) => { await b.sleep(ms); return (await S()).bands; };
  const go = () => ev(`document.getElementById('pw-t-go').click()`);
  const stop = async () => { if ((await S()).running) await go(); };

  // ---------------- an ordinary page ----------------
  b.errors.length = 0; await b.goto(URL("index")); await b.sleep(900); await ev(hook);
  check("navbar: a Tuner button next to the drone", await ev(`!!document.querySelector('#pw-nav a[aria-label="Strobe tuner"]')`) && await ev(`[...document.querySelectorAll('#pw-nav a')].map(a => a.getAttribute('aria-label')).join()`) === "Metronome,Drone,Strobe tuner,Circle of fifths", await ev(`[...document.querySelectorAll('#pw-nav a')].map(a => a.getAttribute('aria-label')).join()`));
  check("nothing of the tuner is loaded before the button is pressed", await ev(`typeof TunerPanel === 'undefined' && typeof StrobeView === 'undefined'`) && await ev(`typeof AudioTap`) === "object");
  await open();
  check("panel: opens, loads on demand, shows Start", await ev(`!document.getElementById('pw-tuner').hidden && !!document.getElementById('pw-t-go') && document.getElementById('pw-t-go').textContent`) === "Start");
  check("mic: not asked for on opening the panel", await ev("__streams.length") === 0);
  let st = await S();
  check("sources: microphone and tab offered; this page's sound and media greyed with a reason", st.disabled.includes("tap") && st.disabled.includes("media") && !st.disabled.includes("mic") && /Nothing on this page has made a sound/.test(st.why) && /There is no video or audio/.test(st.why), JSON.stringify(st.disabled));
  if (out) { await b.shot(out + "/panel.png", false); }
  // microphone: only on Start
  await go(); let heard = null; for (let i = 0; i < 40 && !(heard && heard.rms > 0.01); i++) { await b.sleep(150); heard = (await S()).last; }
  check("mic: Start opens it (fake device) and its beep reaches the analyser", await ev("__streams.length") === 1 && heard && heard.rms > 0.01, JSON.stringify(heard));
  check("navbar button shows it is listening", await ev(`document.querySelector('#pw-nav a[aria-label="Strobe tuner"]').classList.contains('is-on')`));
  await go(); await b.sleep(200);
  check("mic: Stop ends the microphone's tracks", await ev("__streams[0].getTracks().every(t => t.readyState === 'ended')") && !(await S()).running);
  // settings persist
  await set("note", "C"); await set("oct", "3"); await set("a4", "445"); await set("sys", "ji"); await set("tonic", "F");
  await b.goto(URL("index")); await b.sleep(700); await open();
  check("settings persist across a reload (localStorage)", await ev(`['note','oct','a4','sys','tonic'].map(k => document.getElementById('pw-t-' + k).value).join()`) === "C,3,445,ji,F");
  await set("sys", "12et");

  // ---------------- this page's sound: the navbar drone ----------------
  await ev(hook); await ev(`PracticeWidgets.drone.toggle(true)`); await b.sleep(500);
  await ev(`TunerPanel.refresh()`); st = await S();
  check("this page's sound: becomes available once the drone has sounded", !st.disabled.includes("tap"), JSON.stringify(st.disabled));
  await set("src", "tap");
  check("...and the drone is the sound on offer", /Navbar drone/.test(await ev(`[...document.querySelectorAll('#pw-t-which option')].map(o => o.textContent).join()`)) || /Navbar drone/.test(await ev(`AudioTap.sources().map(e => e.label).join()`)));
  await set("a4", "440"); await go(); let bs = await waitBands();
  check("drone C3 against a C3 target: band 1 alive, within 1 cent, no microphone opened", bs[0] && bs[0].alive && Math.abs(bs[0].cents) < 1 && (await ev("__streams.length")) === 0, bs[0] && bs[0].cents.toFixed(2));
  await stop();
  await set("a4", "445"); await go(); bs = await waitBands();
  check("target raised to A4 = 445 (drone is flat of it): band 1 about -19.6 cents and drifting left (negative Hz)", bs[0] && bs[0].alive && Math.abs(bs[0].cents + 19.57) < 1 && bs[0].driftHz < 0, bs[0] && bs[0].cents.toFixed(2) + " " + bs[0].driftHz.toFixed(2));
  await stop(); await ev(`PracticeWidgets.drone.toggle(false)`);
  // a page oscillator at a known detune, registered with AudioTap
  await set("a4", "440"); await set("note", "A"); await set("oct", "3");
  await ev(`(function () { var c = new AudioContext(), o = c.createOscillator(), g = c.createGain(); o.frequency.value = 220 * Math.pow(2, 12 / 1200); g.gain.value = 0.3; o.connect(g); g.connect(c.destination); o.start(); c.resume(); AudioTap.register(c, g, 'Test oscillator (+12 cents)'); window.__osc = o; })()`);
  await ev(`TunerPanel.refresh()`);
  const idx = await ev(`[...document.getElementById('pw-t-which').options].findIndex(o => /Test oscillator/.test(o.textContent))`);
  await set("src", "tap"); await set("which", String(idx)); await go(); bs = await waitBands();
  const p1 = bs[0] && bs[0].phase; await b.sleep(150); const p2 = (await S()).bands[0].phase; let dph = p2 - p1; dph -= 2 * Math.PI * Math.round(dph / (2 * Math.PI));
  check("a registered oscillator 12 cents sharp: band 1 reads +12 and the phase turns forward", bs[0] && Math.abs(bs[0].cents - 12) < 0.8 && bs[0].driftHz > 0 && dph > 0, bs[0] && bs[0].cents.toFixed(2) + " dphase " + dph.toFixed(2));
  await ev(`__osc.frequency.value = 220 * Math.pow(2, -12 / 1200)`); bs = await waitBands(2200);
  check("...and moved 12 cents flat it reads -12 and drifts the other way", bs[0] && Math.abs(bs[0].cents + 12) < 0.8 && bs[0].driftHz < 0, bs[0] && bs[0].cents.toFixed(2));
  // closing the panel stops listening
  await ev(`document.querySelector('#pw-tuner .pw-x').click()`); await b.sleep(200);
  check("closing the panel stops the tuner", !(await S()).running && await ev(`document.getElementById('pw-tuner').hidden`));
  check("index: no page errors", !noErr().length, noErr().join(" | "));

  // ---------------- a media element ----------------
  b.errors.length = 0; await b.goto(URL("index")); await b.sleep(800); await ev(hook);
  await ev(`(function () { var sr = 22050, n = sr * 4, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), w = (o, s) => { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * 220 * Math.pow(2, 8 / 1200) * i / sr) * 9000), true);
    var a = document.createElement('audio'); a.id = 'test-media'; a.loop = true; a.controls = true; a.src = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })); document.body.appendChild(a); })()`);
  await open(); await ev(`TunerPanel.refresh()`); st = await S();
  check("media: the option is available once the page has an audio element", !st.disabled.includes("media"), JSON.stringify(st.disabled));
  await set("src", "media"); await set("note", "A"); await set("oct", "3"); await ev(`document.getElementById('test-media').play()`); await go(); bs = await waitBands(2800);
  check("media: the file (220 Hz + 8 cents) reads +8 on band 1", bs[0] && bs[0].alive && Math.abs(bs[0].cents - 8) < 0.8, bs[0] && bs[0].cents.toFixed(2));
  const el = await ev(`(() => { var a = document.getElementById('test-media'); return { paused: a.paused, muted: a.muted, volume: a.volume, t: a.currentTime }; })()`);
  check("media: still playing, unmuted, and its source node is connected to the destination (audible)", !el.paused && !el.muted && el.volume > 0 && el.t > 0.5 && await ev(`__dest.includes('MediaElementAudioSourceNode')`), JSON.stringify(el) + " " + await ev(`__dest.join()`));
  await stop();
  check("media: after Stop it keeps playing", !(await ev(`document.getElementById('test-media').paused`)));

  // ---------------- another tab (stand-in) and its failures ----------------
  await ev(`navigator.mediaDevices.getDisplayMedia = function () { var c = new AudioContext(), o = c.createOscillator(), d = c.createMediaStreamDestination(), g = c.createGain(); g.gain.value = 0.3; o.frequency.value = 220 * Math.pow(2, 5 / 1200); o.connect(g); g.connect(d); o.start(); window.__shared = d.stream; return Promise.resolve(d.stream); }`);
  await set("src", "tab"); await go(); bs = await waitBands(2800);
  check("tab (stand-in getDisplayMedia, 220 Hz + 5 cents): reads +5 on band 1", bs[0] && bs[0].alive && Math.abs(bs[0].cents - 5) < 0.8, bs[0] && bs[0].cents.toFixed(2));
  await stop(); await b.sleep(200);
  check("tab: Stop ends the shared stream", await ev(`__shared.getTracks().every(t => t.readyState === 'ended')`));
  await ev(`navigator.mediaDevices.getDisplayMedia = function () { return Promise.reject(new DOMException('no', 'NotAllowedError')); }`);
  await go(); await b.sleep(600); st = await S();
  check("tab: a refused share gives a message and leaves the tuner stopped", !st.running && /Sharing was cancelled/.test(st.info), st.info);
  await ev(`navigator.mediaDevices.getDisplayMedia = function () { var c = new AudioContext(), d = c.createMediaStreamDestination(); return Promise.resolve(new MediaStream()); }`);
  await go(); await b.sleep(600); st = await S();
  check("tab: a share without sound says to tick \"Share tab audio\"", !st.running && /Share tab audio/.test(st.info), st.info);
  check("index (media/tab): no page errors", !noErr().length, noErr().join(" | "));

  // no getUserMedia, no getDisplayMedia
  b.errors.length = 0; await b.goto(URL("index")); await b.sleep(800);
  await ev(`Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })`);
  await open(); st = await S();
  check("no mediaDevices: microphone and tab greyed out with reasons", st.disabled.includes("mic") && st.disabled.includes("tab") && /can't open a microphone/.test(st.why) && /can't capture another tab/.test(st.why), JSON.stringify(st.disabled));
  await set("src", "mic"); await go(); await b.sleep(300); st = await S();
  check("...and Start says so, is not left running, nothing thrown", !st.running && /can't open a microphone/.test(st.info) && !noErr().length, st.info + noErr().join("|"));

  // ---------------- the lesson ----------------
  b.errors.length = 0; b.failed.length = 0; await b.goto(URL("lessons/strobe-tuner")); await b.sleep(1200); await ev(hook);
  const r = await ev(`(() => ({ labs: document.querySelectorAll('.st-lab').length, canv: document.querySelectorAll('.st-lab canvas').length, tuners: SynthKit.widgets.filter(w => w.kind === 'tuner').length,
    fund: SynthKit.widgets.filter(w => w.kind === 'tuner').map(w => !!w.c.fund), secs: document.querySelectorAll('section.level2.ls-sec').length, toc: document.querySelectorAll('#TOC a').length,
    links: ['sound-harmonics.html', 'tuning-systems.html'].map(h => !!document.querySelector('main a[href$="' + h + '"]')), nav: !!document.querySelector('#pw-nav a[aria-label="Strobe tuner"]') }))()`);
  check("lesson: six page widgets (seven canvases), two tuners (fund control only on the first), sections, jump bar, links to harmonics and tuning systems", r.labs === 6 && r.canv === 7 && r.tuners === 2 && r.fund[0] && !r.fund[1] && r.secs >= 9 && r.toc >= 9 && r.links.every(Boolean) && r.nav, JSON.stringify(r));
  check("lesson: no page errors or missing files", !noErr().length && !b.failed.filter(f => /\/(apps|lessons)\//.test(f)).length, noErr().join(" | ") + b.failed.join(" | "));
  const sid = await ev(`document.querySelector('.st-lab').closest('section.level2').id`);
  await ev(`document.querySelector('section.level2#${sid} > h2').click()`); const shut = await ev(`document.getElementById('${sid}').classList.contains('ls-shut')`);
  await ev(`[...document.querySelectorAll('#TOC a')].find(a => a.hash === '#${sid}').click()`);
  check("lesson: a section folds and the jump bar opens it", shut && !(await ev(`document.getElementById('${sid}').classList.contains('ls-shut')`)));
  // the wheel
  const wh = await ev(`(() => { var l = [...document.querySelectorAll('.st-lab')].find(d => /Wagon/.test(d.textContent)); l.scrollIntoView(); return l.querySelector('.st-info').textContent; })()`);
  check("wheel: 2 turns/s lit 20 times a second seems to turn 0.5 turns a second backward", /16\.00 a second.*20\.00.*0\.50 turns a second backward/.test(wh), wh);
  // demodulation steps
  const dm = await ev(`(() => { var l = [...document.querySelectorAll('.st-lab')].find(d => /Multiply, average/.test(d.textContent)), bs = l.querySelectorAll('.st-steps button'); bs[2].click(); var a = l.querySelector('.st-info').textContent; bs[4].click(); return [bs.length, a.slice(0, 7), l.querySelector('.st-info').textContent.slice(0, 7)]; })()`);
  check("demodulation: five steps, each with its own words", dm[0] === 5 && dm[1] === "Step 3." && dm[2] === "Step 5.", JSON.stringify(dm));
  // pixels: the canvases are not blank
  const ink = await ev(`[...document.querySelectorAll('.st-lab canvas')].map(c => { var d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, n = 0; for (var i = 3; i < d.length; i += 4) if (d[i]) n++; return n > 200; })`);
  check("lesson: every picture has drawn something", ink.every(Boolean), JSON.stringify(ink));
  if (out) { await ev(`window.scrollTo(0, 0)`); await b.shot(out + "/lesson.png", true); }
  // this page's sound, in the lesson: the oscillator and the tuner at the same time
  const WV = `SynthKit.widgets.filter(w => w.kind === 'wave')[0]`, TN = `SynthKit.widgets.filter(w => w.kind === 'tuner')[1]`;
  await ev(`${WV}.start()`); await b.sleep(300); await ev(`${TN}.start()`); const bands = async () => { await b.sleep(2200); return ev(`${TN}.state().bands`); };
  let lb = await bands(); const fq = await ev(`${WV}.P.freq`), want = 1200 * Math.log2(fq / 220);
  check("lesson: the tuner (this page's sound) reads the lesson's own oscillator (" + fq.toFixed(1) + " Hz), and the oscillator keeps playing", lb[0] && lb[0].alive && Math.abs(lb[0].cents - want) < 0.8 && (await ev(`${WV}.running && ${TN}.running`)), lb[0] && lb[0].cents.toFixed(2) + " want " + want.toFixed(2));
  check("lesson: sharp of the target, so the first band drifts right", lb[0] && (want > 0) === (lb[0].driftHz > 0), lb[0] && lb[0].driftHz.toFixed(2));
  await ev(`${TN}.stop(); ${WV}.stop()`);
  // the first tuner with a weak fundamental: row 1 is dim next to row 2
  await ev(`SynthKit.widgets.filter(w => w.kind === 'tuner')[0].start()`); await b.sleep(2000);
  const wf = await ev(`SynthKit.widgets.filter(w => w.kind === 'tuner')[0].state().bands.map(b => b.mag)`);
  check("lesson: with the fundamental at 5% its band is much weaker than band 2", wf[0] < wf[1] * 0.5 && wf[0] > 0, wf.slice(0, 3).map(x => x.toFixed(4)).join(" "));
  await ev(`SynthKit.widgets.filter(w => w.kind === 'tuner')[0].stop()`);
  check("lesson: no errors after all of it", !noErr().length, noErr().join(" | "));
  await b.close(); srv.close(); console.log(fails ? fails + " FAILED" : "all ok"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
