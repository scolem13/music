// The Tune Assessment page plays through AbcPlay (the band's samples), not abcjs's synth (2026-11-09): Play / Pause, the notes and the
// chord chart lit as it sounds, Chords / Play melody tick boxes, the Arranger accompaniment (its drums on the band's kit), Restart,
// seeking by clicking a notehead. Render first (to a scratch folder, never tests/band/lead/site):
//   quarto render practice/assessment-tune.qmd --output-dir <dir>        (then put .gitignore back if quarto added a line)
//   SITE=<dir> node tests/tune-assessment/tune-assessment-play.cdp.js    (default SITE = _site)
// NEG=1 expects abcjs's synth to have been used, so it must fail. Samples: tests/band/lead/site/sf/ (node tests/band/meter/fetch-samples.js), served as /sf/.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", SF = ROOT + "/tests/band/lead/site", NEG = !!process.env.NEG, PORT = 8510;
const { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : f.endsWith(".mp3") ? "audio/mpeg" : "text/html";
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]);
  const f = u.startsWith("/sf/") ? path.join(SF, u) : u.startsWith("/apps/") ? path.join(ROOT, u) : path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
const U = "http://127.0.0.1:" + PORT;
(async () => {
  const b = await launch({});
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  const wait = async (cond, n = 80) => { for (let i = 0; i < n; i++) { if (await ev(cond)) return true; await b.sleep(150); } return false; };
  const sounds = async () => JSON.parse(await ev(`JSON.stringify(window.__snd)`));
  await b.send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__synthUsed = 0;
    Object.defineProperty(window, "getSoundfontUrl", { configurable: true, get: () => () => Promise.resolve(location.origin + "/sf/") });
    window.addEventListener("load", () => { if (window.ABCJS && ABCJS.synth) ["SynthController", "CreateSynth"].forEach(k => { const o = ABCJS.synth[k]; if (o) ABCJS.synth[k] = function () { window.__synthUsed++; return new o(...arguments); }; }); });` });
  await b.goto(U + "/practice/assessment-tune.html");
  check("the score is drawn", await wait(`document.querySelectorAll('#notation .abcjs-note').length > 5`));
  check("page has no abcjs player bar, has the Restart button", await ev(`!document.querySelector('#tune-audio .abcjs-inline-audio') && !!document.getElementById('tuneRestart')`));
  // spy on the band's bank: which sounds are played
  await ev(`AbcPlay.ctx().then(s => { window.__snd = {}; const o = s.bank.play; s.bank.play = function (snd) { __snd[snd] = (__snd[snd] || 0) + 1; return o.apply(this, arguments); }; }), 0`);
  await wait(`!!window.__snd`, 40);
  // pick a tune with chords: the first in the list that has them
  const hasChords = await ev(`(() => { const sel = document.getElementById('tune'); for (const o of sel.options) { sel.value = o.value; sel.dispatchEvent(new Event('change')); if (AbcPlay.hasChords(currentAbc)) return o.value; } return null; })()`);
  check("a tune with chord symbols is loaded", !!hasChords, String(hasChords));
  await ev(`(() => { const t = document.getElementById('tempo'); t.value = 40; t.dispatchEvent(new Event('input')); t.dispatchEvent(new Event('change')); document.getElementById('chords').checked = true; document.getElementById('play-tune').checked = true; reloadAudio(); })(), 0`);
  await ev(`document.getElementById('play').click(), 0`);
  check("Play starts AbcPlay and the button says Pause", await wait(`!!AbcPlay.playing() && /Pause/.test(document.getElementById('play').textContent)`, 40));
  check("the sounding note is highlighted in the score", await wait(`document.querySelectorAll('#notation .highlight').length > 0`, 60));
  check("the chord chart shows the playing bar", await wait(`!!document.querySelector('#tuneChart .tc-live')`, 40));
  let s = await sounds();
  check("melody and chords (piano) and bass play on the band's samples", (s.piano || 0) > 3 && (s.bass || 0) > 0, JSON.stringify(s));
  await wait(`Tp.pos() > 150`, 60);
  await ev(`document.getElementById('play').click(), 0`);
  check("Pause stops the sound and the button says Play", await wait(`!AbcPlay.playing() && /Play tune/.test(document.getElementById('play').textContent)`, 40));
  const pos = await ev(`Tp.pos()`);
  check("pause keeps the position", pos > 100, String(pos));
  // Chords off: no bass
  await ev(`window.__snd = {}; document.getElementById('chords').checked = false, reloadAudio(), document.getElementById('play').click(), 0`);
  check("Chords off: the melody plays, no bass", await wait(`(window.__snd.piano || 0) > 0`, 40) && !(await sounds()).bass, JSON.stringify(await sounds()));
  await ev(`document.getElementById('play').click(), 0`); await b.sleep(200);
  // seek by clicking a later notehead while paused, then play: starts there
  await ev(`document.getElementById('chords').checked = true, reloadAudio(), Tp.seek(0), 0`);
  const ms = await ev(`(() => { const n = document.querySelectorAll('#notation .abcjs-note'); const el = n[n.length - 2]; el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); return Tp.pos(); })()`);
  check("clicking a notehead moves the position", ms > 500, String(ms));
  await ev(`Tp.restart(), 0`); await wait(`!!AbcPlay.playing()`, 20);
  await ev(`document.getElementById('tuneRestart').click(), 0`);
  check("Restart goes back to the start", await ev(`Tp.pos() < 600`), await ev(`String(Tp.pos())`));
  await ev(`Tp.pause(), 0`);
  // Arranger accompaniment: drums on the band's kit
  const styles = await ev(`(() => { const sel = document.getElementById('taAccomp'); return [...sel.options].map(o => o.value).filter(v => v !== 'off'); })()`);
  check("the Arranger styles are listed", styles.length > 0, String(styles.length));
  await ev(`(() => { const sel = document.getElementById('taAccomp'); sel.value = ${JSON.stringify(styles[0])}; sel.dispatchEvent(new Event('change')); })(), 0`);
  const dp = await ev(`(() => { const sel = document.getElementById('taDrumPattern'); const o = [...(sel ? sel.options : [])].map(o => o.value).filter(v => v !== 'none'); if (o.length) { sel.value = o[0]; sel.dispatchEvent(new Event('change')); } return o.length; })()`);
  await b.sleep(500);
  await ev(`window.__snd = {}, reloadAudio(), 0`);
  await ev(`Tp.seek(0), document.getElementById('play').click(), 0`);
  check("the Arranger's accompaniment plays", await wait(`!!AbcPlay.playing()`, 40));
  check("its parts sound on the band (piano / bass" + (dp ? " / kit" : "") + ")", await wait(`Object.keys(window.__snd).length >= 2`, 60), JSON.stringify(await sounds()));
  if (dp) check("its drums sound on the band's kit", await wait(`(window.__snd.kit || 0) > 0`, 40), JSON.stringify(await sounds()));
  check("the playing bar is lit on the chord chart", await wait(`!!document.querySelector('#tuneChart .tc-live')`, 40));
  await ev(`AbcPlay.stop(), 0`);
  check("Stop (bottom strip / AbcPlay.stop) pauses and relabels", await wait(`!AbcPlay.playing() && /Play tune/.test(document.getElementById('play').textContent)`, 20));
  const used = await ev(`window.__synthUsed`);
  check(NEG ? "NEG: abcjs's synth was used" : "abcjs's synth (SynthController / CreateSynth) was never used", NEG ? used > 0 : used === 0, String(used));
  const errs = b.errors.filter(e => !/favicon|supabase/i.test(e));   // supabaseUrl: the site's config.js has no keys in a scratch render
  check("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
