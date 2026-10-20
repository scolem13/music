// The Recording lessons' widgets (apps/shared/lessons/rec-kit-level.js, rec-kit-mic.js, rec-kit-mix.js; <div class="rk" data-w>) in
// headless Chrome with a fake microphone: each of the six pages loads with no script errors and every widget draws its controls;
// gainstage (meters move, clip light latches and resets, SNR falls with low gain), loudness (LUFS appears, Crushed is louder
// than Dynamic, normalisation turns it down), phantom (pop and warnings), polar (angle moves the bleed), phase (polarity flip
// changes the sum), latency (fake mic opens, modes change the text), headmix (speakers raise the bleed), multitrack (meter
// moves, mute drops it, a bad mix reads hotter than the reference). Run after rendering lessons/rec-gain-staging, rec-mics,
// rec-placement, rec-monitoring, rec-mixing, rec-mastering: node tests/lessons/rec-kit.cdp.js   (screenshots: SHOTS=dir)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : f.endsWith(".mp3") ? "audio/mpeg" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8531);
const U = p => "http://127.0.0.1:8531/lessons/" + p + ".html", SHOTS = process.env.SHOTS;
(async () => {
  const b = await launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
  let fails = 0;
  const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const shot = async n => { if (SHOTS) await b.shot(path.join(SHOTS, n + ".png")); };
  const go = async p => { await b.goto(U(p)); await b.eval(`sessionStorage.setItem("audio-check-v1", "{}")`); await b.sleep(700); };
  // widget helpers, run in the page: H(i) = the i-th .rk[data-w=kind]
  const PRE = `const H = (k, i = 0) => document.querySelectorAll('.rk[data-w=' + k + ']')[i], sl = (h, i) => h.querySelectorAll('input[type=range]')[i],
    setR = (r, v) => { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); }, sleep = ms => new Promise(r => setTimeout(r, ms)),
    btnT = (h, re) => [...h.querySelectorAll('button')].find(x => re.test(x.textContent)), play = h => [...h.querySelectorAll('.sk-tools button')].find(x => /^[▶■]/.test(x.textContent.trim()));`;
  const run = body => b.eval(`(async () => { ${PRE} ${body} })()`);
  const num = s => +String(s).replace("−", "-").match(/-?[\d.]+/)[0];

  // ---- every page: loads, widgets have controls
  const pages = { "rec-gain-staging": ["gainstage"], "rec-mics": ["phantom", "polar", "offaxis", "offaxis"], "rec-placement": ["proximity", "polar", "phase"],
    "rec-monitoring": ["latency", "headmix"], "rec-mixing": ["multitrack"], "rec-mastering": ["loudness"] };
  for (const [p, kinds] of Object.entries(pages)) {
    await go(p);
    const got = await run(`return [...document.querySelectorAll('.rk[data-w]')].map(h => h.dataset.w + ':' + (h.classList.contains('sk-w') || !!h.querySelector('.sk-w')) + ':' + h.querySelectorAll('input[type=range],select').length + ':' + !!h.querySelector('button')).join(' ')`);
    const rows = got.split(" ");
    check(p + ": " + kinds.join(", ") + " built with controls and a button", rows.length === kinds.length && rows.every((r, i) => { const [k, card, n, bt] = r.split(":"); return k === kinds[i] && card === "true" && +n >= 1 && bt === "true"; }), got);
    await shot(p);
    const errs = b.errors.filter(e => !/AudioContext|autoplay|supabase/i.test(e));
    check(p + ": no script errors", !errs.length, errs.slice(0, 3).join(" | ")); b.errors.length = 0;
  }

  // ---- gain staging
  await go("rec-gain-staging");
  const gs = await run(`const h = H('gainstage'), r = h.querySelectorAll('.rk-read b'), g = sl(h, 0), light = h.querySelector('.rk-light'), out = {};
    out.idle = r[0].textContent; play(h).click(); await sleep(1800);
    out.pk40 = r[0].textContent; out.snr40 = r[4].textContent; out.clip40 = light.classList.contains('rk-hot'); out.info40 = h.querySelector('.sk-info').textContent;
    setR(g, 14); await sleep(4500); out.pk14 = r[0].textContent; out.snr14 = r[4].textContent;
    setR(g, 60); await sleep(1500); out.pk60 = r[0].textContent; out.clip60 = light.classList.contains('rk-hot'); out.info60 = h.querySelector('.sk-info').textContent;
    setR(g, 30); await sleep(1500); out.latched = light.classList.contains('rk-hot'); light.click(); await sleep(100); out.reset = light.classList.contains('rk-hot');
    btnT(h, /Too hot/).click(); await sleep(1500); out.hotFader = sl(h, 1).value; out.hotG = g.value; out.hotClip = light.classList.contains('rk-hot'); out.hotOut = r[3].textContent;
    btnT(h, /Just right/).click(); await sleep(300); out.jr = g.value + '/' + sl(h, 1).value; out.status = h.querySelector('.sk-status').textContent;
    play(h).click(); return out;`);
  check("gainstage: before play the readouts are empty", gs.idle === "–", gs.idle);
  check("gainstage: playing at 40 dB gain gives a converter peak and no clip", /dBFS/.test(gs.pk40) && num(gs.pk40) < -3 && num(gs.pk40) > -30 && !gs.clip40, gs.pk40 + " " + gs.clip40);
  check("gainstage: low gain lowers the converter peak", num(gs.pk14) < num(gs.pk40) - 15, gs.pk14 + " " + gs.snr14 + " vs " + gs.pk40 + " " + gs.snr40);
  check("gainstage: 60 dB gain clips at the converter and lights CLIP", num(gs.pk60) > -0.5 && gs.clip60 && /Clipped/.test(gs.info60), gs.pk60 + " " + gs.info60);
  check("gainstage: the clip light stays lit after the gain comes down, and a click resets it", gs.latched && !gs.reset, gs.latched + " " + gs.reset);
  check("gainstage: 'Too hot' preset sets 56 dB / -20 dB", gs.hotG === "56" && gs.hotFader === "-20", gs.hotG + " " + gs.hotFader);
  check("gainstage: 'Just right' preset", gs.jr === "40/0", gs.jr);
  await shot("gainstage");

  // ---- loudness
  await go("rec-mastering");
  const ld = await run(`const h = H('loudness'), r = h.querySelectorAll('.rk-read b'), out = {}; // m s i tp plr gr ng
    out.idle = r[2].textContent + '|' + r[0].textContent; play(h).click();
    for (let k = 0; k < 60 && !/LUFS/.test(r[2].textContent); k++) await sleep(250);
    await sleep(600); out.start = r.length && [...r].map(x => x.textContent).join(' | ');
    btnT(h, /Dynamic/).click(); await sleep(500); out.dyn = { I: r[2].textContent, tp: r[3].textContent, gr: r[5].textContent, M: r[0].textContent };
    btnT(h, /Crushed/).click(); await sleep(500); out.cr = { I: r[2].textContent, tp: r[3].textContent, plr: r[4].textContent, gr: r[5].textContent, ng0: r[6].textContent };
    const nb = btnT(h, /normalisation/); nb.click(); await sleep(400); out.nbText = nb.textContent; out.ng1 = r[6].textContent; out.info = h.querySelector('.sk-info').textContent;
    btnT(h, /Dynamic/).click(); await sleep(500); out.dynNg = r[6].textContent; nb.click(); await sleep(200);
    setR(sl(h, 1), -3); await sleep(500); out.ceil = r[3].textContent; play(h).click(); await sleep(200); out.stopped = r[0].textContent; return out;`);
  check("loudness: before play the integrated reading is empty", /–|^$/.test(ld.idle.split("|")[0]) || /^[–-]/.test(ld.idle.split("|")[1]), ld.idle);
  check("loudness: a test signal gives a LUFS number, momentary, true peak", /LUFS/.test(ld.dyn.I) && /LUFS/.test(ld.dyn.M) && /dBTP/.test(ld.dyn.tp), JSON.stringify(ld.dyn));
  check("loudness: Crushed is louder than Dynamic, true peak at or over the ceiling (between-sample peaks), more limiting", num(ld.cr.I) > num(ld.dyn.I) + 5 && num(ld.cr.tp) > -1 && num(ld.cr.tp) < 4 && num(ld.cr.gr.match(/max ([^ ,]+)/)[1]) > num(ld.dyn.gr.match(/max ([^ ,]+)/)[1]), JSON.stringify([ld.dyn, ld.cr]));
  check("loudness: Crushed has a smaller peak-to-loudness ratio than Dynamic would", num(ld.cr.plr) < 12, ld.cr.plr);
  check("loudness: normalisation on turns the loud master down, off at 0 dB", /on$/.test(ld.nbText) && num(ld.ng1) < -3 && num(ld.cr.ng0) === 0, ld.cr.ng0 + " -> " + ld.ng1);
  check("loudness: a quiet master is left alone by normalisation (down only)", num(ld.dynNg) <= 0 && (num(ld.dyn.I) > -14 || num(ld.dynNg) === 0), "I " + ld.dyn.I + " ng " + ld.dynNg);
  check("loudness: a lower ceiling lowers the true peak", num(ld.ceil) < num(ld.cr.tp) - 1 || num(ld.ceil) < -2, ld.ceil);
  check("loudness: stopping blanks the momentary reading", /–/.test(ld.stopped), ld.stopped);
  await shot("loudness");

  // ---- phantom, polar (rec-mics)
  await go("rec-mics");
  const ph = await run(`const h = H('phantom'), sel = h.querySelector('select'), bs = [...h.querySelectorAll('.sk-ctls button')], plug = bs[0], p48 = bs[1], out = h.querySelector('.sk-info'), warn = h.querySelector('.sk-care'), o = {};
    play(h).click(); await sleep(300); sel.value = 'condenser'; sel.dispatchEvent(new Event('change')); plug.click();
    o.noPower = out.textContent; p48.click(); o.powered = out.textContent; o.poweredWarn = warn.style.display;
    plug.click(); o.popWarn = warn.textContent; o.popShown = warn.style.display; plug.click(); p48.click(); // unplug with 48 V on pops; reset
    sel.value = 'ribbon'; sel.dispatchEvent(new Event('change')); p48.click(); o.ribbon = warn.textContent; o.ribShown = warn.style.display; p48.click();
    o.chk = h.querySelectorAll('li').length; o.led = p48.textContent + '/' + plug.textContent; play(h).click(); return o;`);
  check("phantom: a condenser without +48 V is silent, with it powered", /silence/.test(ph.noPower) && /powered/.test(ph.powered), ph.noPower + " | " + ph.powered);
  check("phantom: unplugging with +48 V on pops with a warning", /Pop/.test(ph.popWarn) && ph.popShown !== "none", ph.popWarn);
  check("phantom: a ribbon with +48 V warns", /ribbon/i.test(ph.ribbon) && ph.ribShown !== "none", ph.ribbon);
  check("phantom: the three-step checklist is drawn", ph.chk === 3, "" + ph.chk);

  const po = await run(`const h = H('polar'), a = sl(h, 1), info = h.querySelector('.sk-info'), o = {}, sels = h.querySelectorAll('select');
    o.start = info.textContent; setR(a, 0); o.back = info.textContent; setR(a, 180);
    sels[0].value = 'omni'; sels[0].dispatchEvent(new Event('change')); o.omni = info.textContent; sels[0].value = 'card'; sels[0].dispatchEvent(new Event('change'));
    play(h).click(); await sleep(500); setR(a, 90); await sleep(200); o.playing = h.querySelector('.sk-status').textContent; play(h).click(); return o;`);
  const bleed = s => num(s.match(/Drum bleed ([^ ]+)/)[1]);
  const voice = s => num(s.match(/Voice ([+\-−\d.]+)/)[1]);
  check("polar: it starts with the singer in front of the mic; turning the cardioid's back to the singer lowers the voice", voice(po.start) > -40 && voice(po.back) < voice(po.start) - 10, voice(po.start) + " -> " + voice(po.back));
  check("polar: omni picks the drums up at least as much as the cardioid", bleed(po.omni) >= bleed(po.start) - 0.1, bleed(po.start) + " vs omni " + bleed(po.omni));
  check("polar: it sounds", /sounding/.test(po.playing), po.playing);
  await shot("rec-mics");

  // ---- phase (rec-placement)
  await go("rec-placement");
  const pa = await run(`const h = H('phase'), info = h.querySelector('.sk-info'), ds = sl(h, 0), o = {}, pb = btnT(h, /Polarity/), eq = btnT(h, /Equal/), cv = h.querySelector('canvas');
    const px = () => { const x = cv.getContext('2d'); return x.getImageData(0, 0, cv.width, cv.height).data.reduce((s, v, i) => s + (i % 4 === 3 ? 0 : v * (i % 977)), 0); };
    setR(ds, 0.5); eq.click(); o.eq = info.textContent; o.px1 = px(); pb.click(); o.flip = info.textContent; o.px2 = px(); o.pbText = pb.textContent; pb.click();
    play(h).click(); await sleep(400); o.status = h.querySelector('.sk-status').textContent; pb.click(); await sleep(200); o.sounds = h.querySelector('.sk-status').textContent; play(h).click();
    const mode = h.querySelector('select'); mode.value = 'three'; mode.dispatchEvent(new Event('change')); o.three = info.textContent; return o;`);
  const mono = s => s.match(/Mono sum vs mic 1 alone: <?b?>?([^.]*?)(?:\\.|Deepest|$)/);
  check("phase: the polarity flip changes the readout and the curve", pa.eq !== pa.flip && pa.px1 !== pa.px2 && /FLIPPED/.test(pa.pbText), pa.eq.slice(0, 120) + " || " + pa.flip.slice(0, 120));
  check("phase: equal levels at 0.5 m gives a comb, flipped gives a different mono sum", /Mono sum/.test(pa.eq) && /Mono sum/.test(pa.flip), "");
  check("phase: 3:1 mode reads a ratio", /:\s*1/.test(pa.three) && /3:1/.test(pa.three), pa.three.slice(0, 100));
  await shot("rec-placement");

  // ---- latency, headmix (rec-monitoring) with the fake mic
  await go("rec-monitoring");
  const la = await run(`const h = H('latency'), info = h.querySelector('.sk-info'), o = {}, rg = sl(h, 0), sel = h.querySelector('select'), st = h.querySelector('.sk-status');
    o.presets = [...h.querySelectorAll('.rk-seg button')].map(x => x.textContent).join(',');
    o.idle = info.textContent; setR(rg, 5); o.t5 = info.textContent; setR(rg, 30); o.t30 = info.textContent;
    sel.value = 'both'; sel.dispatchEvent(new Event('change')); o.both = info.textContent; sel.value = 'direct'; sel.dispatchEvent(new Event('change')); o.direct = info.textContent;
    btnT(h, /512/).click(); o.p512 = rg.value; play(h).click(); await sleep(1200); o.status = st.textContent; o.on = h.classList.contains('sk-live'); play(h).click(); await sleep(200); o.after = st.textContent; return o;`);
  check("latency: five buffer presets labelled in ms", la.presets.split(",").length === 5 && /64 = \d/.test(la.presets), la.presets);
  check("latency: the delay slider rewrites the advice", /not notice/.test(la.t5) && /tunnel/.test(la.t30) && /comb/.test(la.both) && /Direct/.test(la.direct), la.t5 + " | " + la.t30);
  check("latency: a preset moves the slider (512 samples round trip)", num(la.p512) > 15, la.p512);
  check("latency: Start opens the fake microphone and goes live, Stop clears", /Live at \d+ Hz/.test(la.status) && la.on && la.after === "", la.status + " | " + la.after);

  const hm = await run(`const h = H('headmix'), o = {}, rows = () => [...h.querySelectorAll('.rk-ml')].map(x => x.textContent).join(' / '), res = h.querySelector('.sk-info:not(p)'), st = h.querySelector('.sk-status');
    const sp = btnT(h, /Speakers/), mic = btnT(h, /microphone/);
    o.ctls = h.querySelectorAll('input[type=range]').length; play(h).click(); await sleep(1500); o.hp = rows(); o.hpRes = res.textContent;
    sp.click(); await sleep(1200); o.sp = rows(); o.spRes = res.textContent;
    setR(sl(h, 3), -40); await sleep(1000); o.noClick = rows(); sp.click(); mic.click(); o.micMax = -100; for (let k = 0; k < 400; k++) { await sleep(10); const m = rows().match(/recording(-?\\d+) dB/); if (m) o.micMax = Math.max(o.micMax, +m[1]); } o.mic = rows(); o.micText = mic.textContent; o.status = st.textContent; play(h).click(); return o;`);
  const bl = s => { const m = s.match(/bleeding in(-?\d+|silent)/); return m ? (m[1] === "silent" ? -100 : +m[1]) : NaN; };
  check("headmix: five faders, reverb and volume", hm.ctls === 7, "" + hm.ctls);
  check("headmix: headphones keep the bleed far below the voice, speakers raise it", bl(hm.hp) < -60 || bl(hm.hp) === -100, hm.hp);
  check("headmix: Speakers instead of headphones raises the bleed by tens of dB", bl(hm.sp) > bl(hm.hp) + 20 && /Bleed sits/.test(hm.spRes), hm.sp + " | " + hm.spRes);
  check("headmix: the click fader down lowers the click-alone meter", /Click alone(silent|-[5-9]\d)/.test(hm.noClick), hm.noClick);
  check("headmix: the fake mic comes in and its beep reaches the voice meter", /Your voice in the recording/.test(hm.mic) && hm.micMax > -70, hm.micMax + " " + hm.mic);
  await shot("rec-monitoring");

  // ---- multitrack (rec-mixing)
  await go("rec-mixing");
  const mt = await run(`const h = H('multitrack'), ml = h.querySelector('.rk-ml'), o = {}, rows = h.querySelectorAll('.rk-row');
    o.rows = rows.length; o.faders = h.querySelectorAll('.rk-row input[type=range]').length; const pk = () => num(ml.textContent.match(/peak (-?\\d+)/)[1]);
    function num(s) { return +s; }
    play(h).click(); await sleep(2500); o.flat = ml.textContent; o.flatPk = pk();
    btnT(h, /bad mix/i).click(); await sleep(2500); o.bad = ml.textContent; o.badPk = pk();
    btnT(h, /B: reference/).click(); await sleep(2500); o.ref = ml.textContent; o.refPk = pk(); o.refFader = rows[0].querySelector('input').value; o.abB = btnT(h, /B: reference/).classList.contains('sk-on');
    rows[0].querySelector('input').dispatchEvent(new Event('input')); o.backToA = btnT(h, /A: my mix/).classList.contains('sk-on');
    const mute = [...rows].map(r => r.querySelector('.rk-ms button:first-child'));
    mute.forEach(m => m.click()); await sleep(2500); o.muted = ml.textContent; mute.forEach(m => m.click());
    const mb = btnT(h, /Mono/); mb.click(); o.mono = mb.textContent; await sleep(300); mb.click(); play(h).click(); return o;`);
  check("multitrack: five tracks, each with fader, pan, high-pass, send", mt.rows === 5 && mt.faders === 20, mt.rows + " " + mt.faders);
  check("multitrack: the master meter reads while playing", /RMS -\d+ dB/.test(mt.flat) && mt.flatPk > -40, mt.flat);
  check("multitrack: A bad mix peaks hotter than the reference", mt.badPk > mt.refPk + 2, mt.badPk + " vs " + mt.refPk);
  check("multitrack: the reference loads into the faders; editing goes back to A", mt.abB && mt.refFader === "-6" && mt.backToA, mt.refFader);
  check("multitrack: muting every track empties the meter", /RMS -(\d\d\d|9\d|[6-9]\d) dB/.test(mt.muted) || /peak -100/.test(mt.muted), mt.muted);
  check("multitrack: the Mono button toggles", /on/.test(mt.mono), mt.mono);
  await shot("rec-mixing");

  const errs = b.errors.filter(e => !/AudioContext|autoplay|supabase/i.test(e));
  check("no script errors", !errs.length, errs.slice(0, 3).join(" | "));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
