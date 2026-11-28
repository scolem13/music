// Walking Bass Generator (tools/walking-bass.qmd): generates, draws, every bar checks, devices coloured, plays on the band's
// samples with the cursor moving, and both hand-offs reach the Backing Track's opts (window.__btMenuOpts).
// Run after `quarto render tools`: node tests/band/walking-bass.cdp.js   (serves _site itself on PORT, default 8531;
// samples from tests/band/lead/site/sf/, fill with node tests/band/meter/fetch-samples.js).  NEG=1 must fail.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", SF = ROOT + "/tests/band/lead/site", { launch } = require("./lead/cdp.js");
const PORT = +(process.env.PORT || 8531), NEG = process.env.NEG === "1";
const type = f => /\.js$/.test(f) ? "text/javascript" : /\.css$/.test(f) ? "text/css" : /\.mp3$/.test(f) ? "audio/mpeg" : /\.json$/.test(f) ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]);
  const f = u.startsWith("/sf/") ? path.join(SF, u) : u.startsWith("/apps/") ? path.join(ROOT, u) : path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
const SFFIX = `Object.defineProperty(window, "getSoundfontUrl", { configurable: true, value: () => Promise.resolve(location.origin + "/sf/") });`;
(async () => {
  const b = await launch({ width: 1200, height: 900, args: ["--autoplay-policy=no-user-gesture-required"] });
  let fail = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fail++; };
  const ev = e => b.eval(e);
  try {
    await b.goto(`http://127.0.0.1:${PORT}/tools/walking-bass.html`); await b.sleep(1500);
    await ev(SFFIX + "window.__wbNoOpen = true;");
    let st = JSON.parse(await ev(`JSON.stringify((s => ({ bars: s.bars.length, ok: s.check.ok, bad: s.check.bad, notes: document.querySelectorAll("#wb-score .abcjs-note").length, col: document.querySelectorAll("#wb-score [class*=wb-d-]").length, count: s.count }))(__wbState()))`));
    ok(st.bars === 24, "F blues, 2 choruses: 24 bars (" + st.bars + ")");
    ok(st.ok, "bar check passes " + st.bad.join("; "));
    ok(st.notes >= 24 * 3, "notes drawn: " + st.notes);
    ok(st.col > 0, "device notes coloured: " + st.col + " " + JSON.stringify(st.count));
    ok(await ev(`document.querySelectorAll("section.sf").length`) >= 4, "sections fold");
    // every preset, every line type, a few seeds and keys
    const sweep = JSON.parse(await ev(`(() => { const bad = []; let n = 0;
      for (const p of WalkingBass.PRESETS) for (const type of ["walk","walkdev","two"]) for (const sh of [-5, 0, 3]) for (const seed of [1, 9]) {
        const r = WalkingBass.generate({ bars: p.bars, key: p.k, kpc: p.kpc, shift: sh, choruses: 2, type, seed, devices: { amount: .9, chromatic: 1, scalar: 1, jump: 1, enclosure: 1, ghost: 1, triplet: 1 } });
        r.tempo = 140; const t = WalkingBass.toAbc(r), c = WalkingBass.checkAbc(t.abc, r); n++;
        const v = ABCJS.parseOnly(t.abc)[0], warn = (v.warnings || []).length;
        if (!c.ok || warn) bad.push(p.id + " " + type + " " + sh + ": " + c.bad.concat(v.warnings || []).join("; ").slice(0, 160)); }
      return JSON.stringify({ n, bad }); })()`));
    ok(!sweep.bad.length, sweep.n + " lines: bars and pitches read back, no abcjs warnings " + sweep.bad.slice(0, 3).join(" | "));
    // NEG: a broken bar must be caught
    const neg = await ev(`(() => { const s = __wbState(); return WalkingBass.checkAbc(s.abc.replace(/\\|/, "z2 |"), s).ok; })()`);
    ok(NEG ? neg : !neg, "a bar with an extra rest fails the check");
    // a typed chart and a new seed
    await ev(`(() => { const t = document.getElementById("wb-bars"); t.value = "Dm7 | G7 | Cmaj7 | A7"; t.dispatchEvent(new Event("input")); })()`); await b.sleep(700);
    ok(await ev(`__wbState().bars.length === 8 && document.getElementById("wb-preset").value === "custom"`), "typed changes: 8 bars");
    const before = await ev(`JSON.stringify(__wbState().bars)`);
    await ev(`document.getElementById("wb-new").click()`); await b.sleep(300);
    ok(before !== await ev(`JSON.stringify(__wbState().bars)`), "New line changes the line");
    await ev(`(() => { const p = document.getElementById("wb-preset"); p.value = "fblues"; p.dispatchEvent(new Event("change")); })()`); await b.sleep(300);
    // play with the band: samples, cursor
    await ev(`document.getElementById("wb-play").click()`);
    let lit = 0; for (let k = 0; k < 40; k++) { await b.sleep(250); lit = Math.max(lit, await ev(`document.querySelectorAll("#wb-score .abc-on").length`)); }
    const snd = JSON.parse(await ev(`JSON.stringify({ band: !!(__wbHandle && __wbHandle._band), fail: window.BandSounds ? BandSounds.failures.length : -1, bass: window.__wbHandle && __wbHandle._band ? true : false })`));
    ok(snd.band && snd.fail === 0, "the band plays (samples loaded) " + JSON.stringify(snd));
    ok(lit > 0, "the cursor lights the bass notes");
    await ev(`document.getElementById("wb-play").click()`);
    // hand-off 1: exact line
    await ev(`document.getElementById("wb-send-exact").click()`);
    const hand = JSON.parse(await ev(`JSON.stringify(__wbLastHandoff)`));
    ok(hand.from === "walking-bass" && hand.mode === "exact" && hand.line.bars.length === 24, "exact hand-off written");
    await b.goto(`http://127.0.0.1:${PORT}/tools/backing-track.html?from=walking-bass`); await b.sleep(2000);
    let mo = JSON.parse(await ev(`JSON.stringify(__btMenuOpts())`));
    ok(mo.bassFeel === "walkdev" || /^walkdev/.test(mo.bassFeel), "Backing Track bass = walkdev (" + mo.bassFeel + ")");
    ok(mo.bassLine && mo.bassLine.bars.length === 24 && JSON.stringify(mo.bassLine.bars) === JSON.stringify(hand.line.bars), "opts.bassLine is the exact line");
    ok(mo.walkDevices && mo.walkDevices.amount === hand.devices.amount, "opts.walkDevices carried");
    ok(await ev(`!document.getElementById("bt-pinnote").hidden && /exact walking line/.test(document.getElementById("bt-pinnote-text").textContent)`), "note line shown");
    // the band's bass plays the line note for note
    const first = await ev(`(() => { const o = __btMenuOpts(); const fb = BandHarmony.buildForm(TuneChart.parse(document.getElementById("bt-abc").value), 0); return fb.length; })()`);
    ok(first === 24, "the Backing Track's form is the written-out line's 24 bars");
    // changing the key drops the line
    await ev(`(() => { const k = document.getElementById("bt-key"); k.value = "G"; k.dispatchEvent(new Event("change")); })()`); await b.sleep(400);
    mo = JSON.parse(await ev(`JSON.stringify(__btMenuOpts())`));
    ok(!mo.bassLine && mo.walkDevices, "a key change drops the line, keeps the devices");
    ok(await ev(`/dropped/.test(document.getElementById("bt-pinnote-text").textContent)`), "and says so");
    // hand-off 2: devices only
    await b.goto(`http://127.0.0.1:${PORT}/tools/walking-bass.html`); await b.sleep(1500);
    await ev(`window.__wbNoOpen = true; (() => { const a = document.getElementById("wb-amount"); a.value = 85; a.dispatchEvent(new Event("input")); })(); document.getElementById("wb-send-dev").click()`);
    await b.goto(`http://127.0.0.1:${PORT}/tools/backing-track.html?from=walking-bass`); await b.sleep(2000);
    mo = JSON.parse(await ev(`JSON.stringify(__btMenuOpts())`));
    ok(/walkdev/.test(mo.bassFeel) && !mo.bassLine && mo.walkDevices && Math.abs(mo.walkDevices.amount - 0.85) < 1e-9, "devices hand-off: walkdev, devices, no fixed line");
    ok(await ev(`document.getElementById("bt-choruses").value`) === "2", "choruses carried");
    const errs = b.errors.filter(e => !/supabaseUrl|favicon|404/.test(e)); ok(!errs.length, "no page errors " + errs.join(" | ").slice(0, 300));
  } finally { await b.close(); srv.close(); }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FAILED:", e.message); srv.close(); process.exit(1); });
