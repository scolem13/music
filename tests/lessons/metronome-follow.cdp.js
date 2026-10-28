// The navbar metronome locks to the page's band (PageClock, apps/shared/page-clock.js; BandPlayer.clock): started while the band is
// playing it shows the beat that is sounding at once, clicks with the band's beats, and follows a change of tempo and of meter.
// Run after rendering:  sh scripts/render-test-page.sh lessons/blues-drums.qmd; node tests/lessons/metronome-follow.cdp.js
// /apps is served live from the repo, the page from tests/band/lead/site, the samples from its sf/ mirror (tests/band/README.md).
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/tests/band/lead/site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".mp3") ? "audio/mpeg" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = path.join(u.startsWith("/apps/") ? ROOT : SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8524);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  await b.goto("http://127.0.0.1:8524/lessons/blues-drums.html"); await b.sleep(2500);
  // note when the metronome's clicks are scheduled (its triangle oscillators), as page time; and sample the band's clock
  await ev(`Object.defineProperty(window, 'getSoundfontUrl', { configurable: true, value: () => Promise.resolve(location.origin + '/sf/') });
    window.__clicks = []; const st = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (w) { try { if (this.type === 'triangle' && this.context.getOutputTimestamp) { const o = this.context.getOutputTimestamp();
      window.__clicks.push({ ms: o.performanceTime + (w - o.contextTime) * 1000, hz: this.frequency.value }); } } catch (e) {} return st.apply(this, arguments); };
    window.__beats = []; window.__lastNext = null;
    setInterval(() => { const g = window.PageClock && PageClock.now(); if (g && isFinite(g.nextIn)) window.__beats.push({ ms: performance.now() + g.nextIn * 1000, beat: g.nextBeat, beats: g.nextBeats, bpm: g.bpm }); }, 20);
    window.__lamp = () => { const l = [...document.querySelectorAll('#pw-lamps .pw-lamp')]; return { n: l.length, on: l.findIndex(x => x.classList.contains('on')) }; };`);
  check("PageClock is on the page, nothing registered yet", await ev(`!!window.PageClock && PageClock.now() === null`));
  // 1. the lesson's own band
  await ev(`[...document.querySelectorAll('button')].find(x => /Play with the band/.test(x.textContent)).click()`);
  let g = null; for (let k = 0; k < 60 && !g; k++) { await b.sleep(250); g = await ev(`JSON.stringify(PageClock.now())`); }
  check("blues-drums: the band registers with PageClock", !!g, g);
  // switch the metronome on while the band is on beat 3 of a bar (not the count-in)
  await ev(`new Promise(res => { const t = setInterval(() => { const g = PageClock.now(); if (g && !g.countIn && g.beat === 2 && g.nextIn > 0.25) { clearInterval(t); document.getElementById('pw-metro-go').click(); res(); } }, 10); })`);
  await b.sleep(60);
  const want = JSON.parse(await ev(`JSON.stringify(PageClock.now())`)), lamp = await ev(`JSON.stringify(__lamp())`), L = JSON.parse(lamp);
  check("metronome on: lamp shows the band's beat at once", want.beat >= 2 && L.on === want.beat && L.n === want.beats, lamp + " band " + want.beat + "/" + want.beats);
  check("metronome shows the band's tempo", Math.abs(+(await ev(`document.getElementById('pw-bpm').textContent`)) - want.bpm) < 1.01, want.bpm);
  await b.sleep(5000);
  const cl = JSON.parse(await ev(`JSON.stringify(__clicks.filter(c => c.hz > 900))`)), be = JSON.parse(await ev(`JSON.stringify(__beats)`));
  const diffs = cl.map(c => Math.min(...be.map(x => Math.abs(x.ms - c.ms)))).filter(d => isFinite(d));
  check("clicks fall on the band's beats", cl.length >= 6 && Math.max(...diffs) < 45, cl.length + " clicks, worst " + Math.max(...diffs).toFixed(1) + " ms");
  check("one click per beat (not double)", cl.slice(1).every((c, i) => c.ms - cl[i].ms > 0.5 * 60000 / want.bpm), "");
  check("the band's bar-start is the accented (higher) click", cl.every((c, i) => { const m = be.reduce((a, x) => Math.abs(x.ms - c.ms) < Math.abs(a.ms - c.ms) ? x : a); return (m.beat === 0) === (c.hz > 1200); }), "");
  await ev(`document.getElementById('pw-metro-go').click()`); await b.sleep(300);
  check("metronome off", !(await ev(`document.getElementById('pw-metro-go').textContent`)).includes("Stop"));
  await ev(`[...document.querySelectorAll('button')].filter(x => /Stop|■/.test(x.textContent) && x.offsetParent).forEach(x => x.click())`);
  await ev(`window.__stopAll && __stopAll()`);
  // 2. a tune with a change of meter, and a change of tempo, through BandPlayer itself
  const abc = JSON.stringify('X:1\nT:t\nM:4/4\nL:1/4\nK:C\n"C"cccc|"F"ffff|[M:3/4]"G"ggg|"C"ccc|[M:4/4]"C"cccc|');
  await ev(`window.__p = BandPlayer.create({ parsed: TuneChart.parse(${abc}), tempo: 90, countIn: 0, choruses: 0, opts: {}, instruments: ["piano"] }); __p.play();`);
  for (let k = 0; k < 40 && !(await ev(`PageClock.now()`)); k++) await b.sleep(250);
  await ev(`__beats.length = 0; __clicks.length = 0; __seen = new Set(); __bpms = new Set(); setInterval(() => { const g = PageClock.now(); if (g) { __seen.add(g.beats); __bpms.add(Math.round(g.bpm)); } }, 30);
    document.getElementById('pw-metro-go').click()`);
  await b.sleep(4500);
  await ev(`__p.setTempo(150)`);
  await b.sleep(5500);
  const meters = JSON.parse(await ev(`JSON.stringify([...__seen])`)), bpms = JSON.parse(await ev(`JSON.stringify([...__bpms])`));
  check("the player reports both meters (4 and 3 beats) and both tempi", meters.includes(3) && meters.includes(4) && bpms.includes(90) && bpms.includes(150), meters + " / " + bpms);
  const cl2 = JSON.parse(await ev(`JSON.stringify(__clicks.filter(c => c.hz > 900))`)), be2 = JSON.parse(await ev(`JSON.stringify(__beats)`));
  const d2 = cl2.map(c => Math.min(...be2.map(x => Math.abs(x.ms - c.ms))));
  check("clicks stay on the beats through the meter and tempo changes", cl2.length >= 12 && Math.max(...d2) < 45, cl2.length + " clicks, worst " + Math.max(...d2).toFixed(1) + " ms");
  const gaps = cl2.slice(1).map((c, i) => c.ms - cl2[i].ms), slow = gaps.filter(x => x > 600), fast = gaps.filter(x => x < 450);
  check("click spacing follows the tempo (667 ms at 90, 400 ms at 150)", slow.length > 2 && fast.length > 3, "slow " + slow.length + ", fast " + fast.length);
  const lampDuring = await ev(`JSON.stringify(__lamp())`);
  await ev(`__p.stop()`); await b.sleep(400);
  const free = await ev(`JSON.stringify({ n: __lamp().n, still: !document.getElementById('pw-metro-go').textContent.includes('Start'), beats: +document.getElementById('pw-beats').value })`);
  check("player stopped: the metronome carries on by itself with its own beats", JSON.parse(free).still && JSON.parse(free).n === JSON.parse(free).beats, free);
  await ev(`__clicks.length = 0`); await b.sleep(1500);
  check("and keeps clicking", (await ev(`__clicks.length`)) >= 2);
  await ev(`document.getElementById('pw-metro-go').click()`);
  check("no page errors", b.errors.filter(e => !/supabase/i.test(e)).length === 0, b.errors.join("; "));
  srv.close(); b.close(); process.exit(fails ? 1 : 0);
})();
