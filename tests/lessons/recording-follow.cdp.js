// A recording and its bar map on the Backing Track and the Notation page (apps/shared/timestamp-player/recording-follow.js) in headless Chrome.
// A silent WAV made in the page stands in for the recording; the song file is made here (bars 2 s apart for eight bars, then 3 s).
// Run after rendering both pages into _site:
//   quarto render tools/backing-track.qmd; quarto render tools/notation.qmd; node tests/lessons/recording-follow.cdp.js
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8518);

// the pure part first (no browser)
const RF = require(ROOT + "/apps/shared/timestamp-player/recording-follow.js");
const bars = [], beats = []; let t = 1; for (let i = 0; i < 16; i++) { bars.push(t); beats.push(4); t += i < 8 ? 2 : 3; }
const song = { app: "timestamp-notes", version: 1, title: "Test song", source: { file: "silence.wav" }, stamps: [],
  barMap: { beatsPerBar: 4, bars, beats, sections: [{ name: "Verse", bar: 1, time: 1 }, { name: "Chorus", bar: 5, time: 9 }, { name: "Verse", bar: 9, time: 17 }] } };
{
  const m = RF.parse(JSON.stringify(song));
  assert.ok(m && m.bars.length === 16 && m.sections.length === 3, "song file read");
  assert.strictEqual(m.bpmOf(0), 120); assert.strictEqual(m.bpmOf(10), 80);
  assert.strictEqual(m.steady(), 120);
  assert.ok(m.smoothBpm(8) > 80 && m.smoothBpm(8) < 120);
  assert.strictEqual(m.barAt(9.5), 4); assert.strictEqual(m.barAt(0.5), -1);
  assert.deepStrictEqual(m.sectionAt(18), { name: "Verse", nth: 1, bar: 8 });
  assert.strictEqual(m.findSection("verse", 1).time, 17);
  assert.ok(RF.parse(JSON.stringify({ bars: [1, 3, 5], beats: [4, 4, 4] })), "an older bar-map .json reads");
  assert.strictEqual(RF.parse("nonsense"), null);
}
console.log("ok   pure model");

(async () => {
  const b = await launch({ width: 1500, height: 1400, args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), noErr = () => b.errors.filter(e => !/supabaseUrl|youtube|soundfont|Failed to load resource|net::/i.test(e));
  const wav = `(() => { const n = 8000 * 60, buf = new ArrayBuffer(44 + n * 2), d = new DataView(buf), w = (o, s) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
    d.setUint32(24, 8000, true); d.setUint32(28, 16000, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, n * 2, true);
    const dt = new DataTransfer(); dt.items.add(new File([buf], 'silence.wav', { type: 'audio/wav' }));
    const inp = document.querySelector('#ROOT .btp-file'); inp.files = dt.files; inp.dispatchEvent(new Event('change')); })()`;
  const media = "document.querySelector('#ROOT video')";
  try {
    // ---- the Backing Track ----
    await b.goto("http://127.0.0.1:8518/tools/backing-track.html"); await b.sleep(800);
    check("Backing Track: loads, Recording panel present", !noErr().length && await ev(`!!document.querySelector('#bt-rec .btp-file')`), noErr().join(" | "));
    await ev(wav.replace("#ROOT", "#bt-rec")); await b.sleep(700);
    const M = media.replace("#ROOT", "#bt-rec");
    check("a recording file loads into the panel", await ev(`${M} && ${M}.duration > 59`));
    await ev(`${M}.pause()`);
    check("a song file is read, its sections listed", await ev(`(() => { __btRec.load(${JSON.stringify(JSON.stringify(song))}); return document.querySelectorAll('#bt-rec-sec option').length; })()`) === 3);
    check("the panel says what it read and asks for the file", /Test song.*16 bars.*3 sections.*Choose silence\.wav|Test song.*16 bars/.test(await ev(`document.querySelector('#bt-rec .rf-info').textContent`)), await ev(`document.querySelector('#bt-rec .rf-info').textContent`));
    // Speed: slower at the same pitch, and the tempo it plays at from the map
    await ev(`(() => { const r = document.querySelector('#bt-rec .btp-speed-range'); r.value = 70; r.dispatchEvent(new Event('input')); })()`);
    check("Speed 70%: the file plays at 0.7, pitch kept", await ev(`${M}.playbackRate`) === 0.7 && await ev(`${M}.preservesPitch`) === true);
    await b.sleep(1100);
    const bpmShown = await ev(`(() => { const w = document.querySelector('#bt-rec .btp-speed-bpm'); return w.hidden ? null : +w.querySelector('input').value; })()`);
    check("the Speed row shows the tempo it plays at (the map's, times 0.7)", bpmShown > 0, String(bpmShown));
    await ev(`(() => { const i = document.querySelector('#bt-rec .btp-speed-bpm-in'), m = document.querySelector('#bt-rec .rf-btp')._btpBpm(0); i.value = Math.round(m / 2); i.dispatchEvent(new Event('change')); })()`);
    check("a tempo typed there sets the speed (half the map's: 50%)", Math.abs(await ev(`${M}.playbackRate`) - 0.5) < 0.02, String(await ev(`${M}.playbackRate`)));
    await ev(`document.querySelector('#bt-rec .btp-speed-reset').click()`);
    check("1× puts it back", await ev(`${M}.playbackRate`) === 1);
    const nBars = await ev(`document.querySelectorAll('#bt-chart .tc-bar[data-bar]').length`);
    check("the chart has bars to click", nBars >= 8, String(nBars));
    const clickBar = i => ev(`document.querySelectorAll('#bt-chart .tc-bar[data-bar]')[${i}].click()`);
    await clickBar(4); await b.sleep(200);
    let ct = await ev(`${M}.currentTime`);
    check("clicking chart bar 5 moves the recording to the map's bar 5", Math.abs(ct - 9) < 0.1, String(ct));
    await ev(`(() => { const o = document.querySelector('#bt-rec .rf-off'); o.value = 3; })()`);
    await clickBar(0); await b.sleep(200); ct = await ev(`${M}.currentTime`);
    check("with the offset at 3, chart bar 1 is the map's bar 3", Math.abs(ct - 5) < 0.1, String(ct));
    await ev(`document.querySelector('#bt-rec .rf-off').value = 1; document.getElementById('bt-rec-click').checked = false`);
    await clickBar(6); await b.sleep(150);
    check("with the click option off, the recording stays", Math.abs(await ev(`${M}.currentTime`) - 5) < 0.1);
    await ev(`document.getElementById('bt-rec-click').checked = true`);
    await ev(`(() => { const s = document.getElementById('bt-rec-sec'); s.value = s.options[2].value; s.dispatchEvent(new Event('change')); })()`); await b.sleep(150);
    check("choosing a section moves the recording to it", Math.abs(await ev(`${M}.currentTime`) - 17) < 0.1);
    check("the player reports where it is in the map", await ev(`__btRec.hostBarNow()`) === 8);
    // the band follows the recording's tempo: bar by bar, then put back
    await ev(`document.getElementById('bt-tempo-n').value = 100; document.getElementById('bt-rec-follow').checked = true; document.getElementById('bt-rec-mode').value = 'bar'`);
    const tempoAt = i => ev(`(__btRecOnBar({ index: ${i} }), window.__btRecTempo)`);
    check("the band takes the map's tempo for a bar (120 in the first half)", await tempoAt(2) === 120);
    check("... and 80 in the slower half", await tempoAt(11) === 80);
    await ev(`document.getElementById('bt-rec-mode').value = 'steady'`);
    check("one steady tempo is the median, wherever the bar", await tempoAt(11) === 120);
    await ev(`__btRecOnState('idle')`);
    check("stopping gives the tempo back", await ev(`__btRecOnBar({ index: 1, countIn: true }), 1`) === 1);
    await ev(`document.getElementById('bt-rec-follow').checked = false; window.__btRecTempo = null`);
    await ev(`__btRecOnBar({ index: 2 })`);
    check("not following: the tempo is left alone", await ev(`window.__btRecTempo`) === null);
    check("no errors on the Backing Track", !noErr().length, noErr().join(" | "));

    // ---- the Notation page ----
    await b.goto("http://127.0.0.1:8518/tools/notation.html"); await b.eval("localStorage.clear()");
    const abc = "X:1\nM:4/4\nL:1/4\nK:C\n\"^Intro\"CDEF|GABc|\"^Verse\"CDEF|GABc|CDEF|GABc|\n";
    await ev(`(() => { const d = NotationDoc.fromAbc(${JSON.stringify(abc)}); d.chunks.forEach((c, i) => { if (i === 0) c.heading = 'Intro'; if (i === 1) c.heading = 'Verse'; }); localStorage.setItem('ntDoc', JSON.stringify(d)); return d.chunks.length; })()`);
    await b.goto("http://127.0.0.1:8518/tools/notation.html"); await b.sleep(900);
    check("Notation: loads, Recording panel present", !noErr().length && await ev(`!!document.querySelector('#nt-rec .btp-file')`), noErr().join(" | "));
    const nch = await ev(`NotationPage.doc().chunks.length`);
    check("the test piece has chunks", nch >= 2, String(nch));
    await ev(wav.replace("#ROOT", "#nt-rec")); await b.sleep(700);
    const N = media.replace("#ROOT", "#nt-rec");
    await ev(`${N}.pause()`);
    await ev(`__ntRec.load(${JSON.stringify(JSON.stringify(song))})`);
    check("sections listed", await ev(`document.querySelectorAll('#nt-rec-sec option').length`) === 4);
    await ev(`(() => { const s = document.getElementById('nt-rec-sec'); s.value = s.options[2].value; s.dispatchEvent(new Event('change')); })()`); await b.sleep(150);
    check("choosing a section moves the recording", Math.abs(await ev(`${N}.currentTime`) - 9) < 0.1, String(await ev(`${N}.currentTime`)));
    await ev(`document.querySelector('#nt-sheet tbody tr[data-chunk="0"]').click()`); await b.sleep(100);
    await ev(`document.querySelector('#nt-sheet tbody tr[data-chunk="1"]').click()`); await b.sleep(200);
    ct = await ev(`${N}.currentTime`);
    check("choosing a chunk moves the recording to its first bar (after the 2-bar chunk: map bar 3)", Math.abs(ct - 5) < 0.1, String(ct));
    check("no errors on the Notation page", !noErr().length, noErr().join(" | "));
  } catch (e) { console.log("FAIL " + e.stack); fails++; }
  await b.close && b.close(); srv.close();
  console.log(fails ? fails + " FAILED" : "RECORDING FOLLOW OK"); process.exit(fails ? 1 : 0);
})();
