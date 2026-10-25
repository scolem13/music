// The Live Sound lessons (lessons/live-*.qmd, apps/shared/lessons/live-kit.js) in headless Chrome: every page loads with no
// script errors and builds its strips; then, on the strips themselves, the problems are measurable and the fixes fix them:
// gain (too low fails, clipping latches and fails, right passes), gate (kick: no gate fails, a good gate passes, a slow attack
// loses hits; toms: a short release chops the ring), compressor (vocal: off fails, gentle passes), EQ (mud and guitar presets
// pass the check, flat fails), the quiz (a right answer reveals the source), and the WAV download makes a file.
// Run after rendering lessons/live-*.qmd: node tests/lessons/live-kit.cdp.js   (screenshots: SHOTS=dir)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8532);
const U = p => "http://127.0.0.1:8532/lessons/" + p + ".html", SHOTS = process.env.SHOTS;
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0;
  const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const go = async p => { await b.goto(U(p)); await b.eval(`sessionStorage.setItem("audio-check-v1", "{}")`); await b.sleep(800); };
  const PRE = `const H = i => document.querySelectorAll('.lk[data-w=strip]')[i], sleep = ms => new Promise(r => setTimeout(r, ms)),
    btn = (h, re) => [...h.querySelectorAll('button')].find(x => re.test(x.textContent)),
    loop = async (h) => { const s0 = h.lk.stats; for (let i = 0; i < 60; i++) { await sleep(250); if (h.lk.stats && h.lk.stats !== s0) break; } const s1 = h.lk.stats; for (let i = 0; i < 60; i++) { await sleep(250); if (h.lk.stats !== s1) break; } return h.lk.check(); };`;
  const run = body => b.eval(`(async () => { ${PRE} ${body} })()`);
  // apply a "Try" preset, play two loops (the first after a change is mixed), read the check
  const tryIt = (i, label) => run(`const h = H(${i}); btn(h, /^${label}$/).click(); if (!h.classList.contains('lk-live')) await h.lk.play(); const r = await loop(h);
    return JSON.stringify({ ok: r.ok, items: r.items.map(x => (x.ok ? '+' : '-') + x.text), stats: h.lk.stats });`).then(JSON.parse);

  const pages = { "live-strip": 1, "live-gain": 2, "live-eq": 2, "live-gate": 2, "live-comp": 2, "live-feedback": 0, "live-soundcheck": 2 };
  for (const [p, n] of Object.entries(pages)) {
    await go(p);
    const got = await run(`return [...document.querySelectorAll('.lk[data-w=strip]')].map(h => !!h.lk && h.querySelectorAll('.lk-dial').length).join(',')`);
    check(p + ": " + n + " strip(s) built", got.split(",").filter(Boolean).length === n && (n === 0 || got.split(",").every(x => +x >= 1)), got);
    if (p === "live-feedback") check(p + ": the pa widget is there", await run(`return !!document.querySelector('.sk[data-w=pa] .sk-w, .sk-w[data-w=pa], .sk[data-w=pa].sk-w') || !!document.querySelector('.sk[data-w=pa] input')`));
    if (SHOTS) await b.shot(path.join(SHOTS, p + ".png"));
    const errs = b.errors.filter(e => !/AudioContext|autoplay|supabase/i.test(e));
    check(p + ": no script errors", !errs.length, errs.slice(0, 3).join(" | ")); b.errors.length = 0;
  }

  await go("live-gain");
  let r = await tryIt(0, "Too low, fader at \\+10"); check("gain: too low fails", !r.ok && r.stats.inPk < -25, r.items.join(" | "));
  r = await tryIt(0, "Way too hot, fader down"); check("gain: too hot clips and fails", !r.ok && r.stats.clips > 0, r.items.join(" | "));
  const clipLit = await run(`return H(0).querySelector('.lk-clip').classList.contains('lk-over')`); check("gain: CLIP light latched", clipLit);
  r = await tryIt(0, "Right"); check("gain: right passes", r.ok, r.items.join(" | "));
  r = await tryIt(1, "Gate set well"); check("gain/gate: the gate set well passes", r.ok, r.items.join(" | "));
  r = await tryIt(1, "Then gain −10"); check("gain/gate: 10 dB less gain loses hits", !r.ok && r.stats.hit < -3, JSON.stringify(r.stats));
  r = await tryIt(1, "Then gain \\+10"); check("gain/gate: 10 dB more gain lets bleed in", !r.ok && r.stats.bleed > -15, JSON.stringify(r.stats));
  await run(`H(1).lk.stop()`);

  await go("live-gate");
  r = await tryIt(0, "No gate"); check("gate kick: no gate fails", !r.ok, r.items.join(" | "));
  r = await tryIt(0, "Good"); check("gate kick: good passes", r.ok, r.items.join(" | ") + " " + JSON.stringify(r.stats));
  r = await tryIt(0, "Threshold too high"); check("gate kick: threshold too high loses hits", !r.ok && r.stats.hit < -3, JSON.stringify(r.stats));
  r = await tryIt(0, "Slow attack"); check("gate kick: slow attack loses the start", !r.ok && r.stats.hit < -3, JSON.stringify(r.stats));
  r = await tryIt(1, "Release too short"); check("gate toms: short release chops the ring", !r.ok && r.stats.tail < -8, JSON.stringify(r.stats));
  r = await tryIt(1, "Gentle expander"); check("gate toms: the expander keeps the ring and passes", r.ok, r.items.join(" | ") + " " + JSON.stringify(r.stats));
  await run(`H(1).lk.stop()`);

  await go("live-comp");
  r = await tryIt(0, "Off"); check("comp vocal: off fails", !r.ok && r.stats.loud - r.stats.quiet > 14, JSON.stringify(r.stats));
  r = await tryIt(0, "Gentle"); check("comp vocal: gentle passes", r.ok, r.items.join(" | ") + " " + JSON.stringify(r.stats));
  r = await tryIt(0, "Squashed"); check("comp vocal: squashed fails", !r.ok, r.items.join(" | "));
  r = await tryIt(1, "Off"); check("comp bass: off fails", !r.ok, JSON.stringify(r.stats));
  r = await tryIt(1, "Even"); check("comp bass: even passes", r.ok, r.items.join(" | ") + " " + JSON.stringify(r.stats));
  await run(`H(1).lk.stop()`);

  await go("live-eq");
  r = await tryIt(0, "Flat"); check("eq mud: flat fails", !r.ok, r.items.join(" | "));
  r = await tryIt(0, "Low cut \\+ mud cut"); check("eq mud: low cut + cut passes", r.ok, r.items.join(" | "));
  r = await tryIt(1, "Fixed"); check("eq guitar: fixed passes", r.ok, r.items.join(" | "));
  await run(`H(1).lk.stop()`);

  await go("live-soundcheck");
  const q = await run(`const h = H(0); h.lk.strip.loadProblem('gate', 'kick'); await sleep(300); h.lk.strip.answer('comp'); const wrong = h.querySelector('.lk-fb').textContent;
    h.lk.strip.answer('gate'); return JSON.stringify({ wrong, right: h.querySelector('.lk-fb').textContent, src: h.lk.source });`).then(JSON.parse);
  check("quiz: wrong answer gives a hint, right one names the source", /Not that/.test(q.wrong) && /kick/i.test(q.right) && q.src === "kick", JSON.stringify(q));
  const wavOk = await run(`const s = await new Promise(res => { const o = URL.createObjectURL; URL.createObjectURL = bl => { res(bl.size + ':' + bl.type); URL.createObjectURL = o; return 'about:blank'; }; btn(H(1), /WAV/).click(); }); return s;`);
  check("WAV download: 32 s stereo 16-bit", /^\d+:audio\/wav$/.test(wavOk) && Math.abs(+wavOk.split(":")[0] - (44 + 44100 * 32 * 4)) < 10, wavOk);

  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
