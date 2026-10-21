// The Notation page's Loop chunks part in headless Chrome: a song file opened in the Recording part, each chunk found in the map
// through its section, lead-in / stop from the song file or guessed, a split chunk keeping its timing, and a pass played along
// written as a take. Setup as in tests/band/README.md (sh scripts/render-test-page.sh tools/notation.qmd, server on 8500).
// node tests/abc/chunk-loop.cdp.js -> "CHUNK LOOP OK"
const { launch } = require("../band/lead/cdp.js");
const assert = require("assert");
// the map: 0.5 s a bar (4 beats of 0.125 s) from 1 s; Intro bars 1-2, Verse bars 3-10, Chorus bars 11-14
const bars = Array.from({ length: 14 }, (_, i) => 1 + 0.5 * i);
const song = { app: "timestamp-notes", version: 1, title: "Loop test", source: { file: "silence.wav" }, stamps: [],
  barMap: { beatsPerBar: 4, bars, beats: bars.map(() => 4), sections: [{ name: "Intro", bar: 1 }, { name: "Verse", bar: 3 }, { name: "Chorus", bar: 11 }] },
  phrases: { size: 4, leadIns: { "verse#0@4": 1 }, tails: {} } };
const wav = `(() => { const n = 8000 * 60, buf = new ArrayBuffer(44 + n * 2), d = new DataView(buf), w = (o, s) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
  d.setUint32(24, 8000, true); d.setUint32(28, 16000, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, n * 2, true);
  const dt = new DataTransfer(); dt.items.add(new File([buf], 'silence.wav', { type: 'audio/wav' }));
  const inp = document.querySelector('#nt-rec .btp-file'); inp.files = dt.files; inp.dispatchEvent(new Event('change')); })()`;
(async () => {
  const b = await launch({ width: 1500, height: 1400, args: ["--autoplay-policy=no-user-gesture-required"] });
  try {
    await b.goto("http://127.0.0.1:8500/tools/notation.html"); await b.eval("localStorage.clear()");
    await b.eval(`localStorage.setItem("ntQuick", JSON.stringify({ bpm: 120, pickup: "off", split: "0", lmode: "along" })), 1`);
    await b.goto("http://127.0.0.1:8500/tools/notation.html"); await b.sleep(500);
    // the piece: Intro (2 bars), Verse in two 4-bar chunks, Chorus (4 bars), all rests
    await b.eval(`(() => { const P = NotationPage, D = NotationDoc, d = P.doc(); d.meter = "4/4"; d.key = "C"; d.keyConfirmed = true; d.tempo = 480;
      const mk = (n, h, q) => { const c = D.newChunk(n); c.heading = h; c.rhythm = [{ type: "rest", durQ: q }]; return c; };
      d.chunks = [mk("I1a", "Intro", 8), mk("V1a", "Verse", 16), mk("V1b", null, 16), mk("C1a", "Chorus", 16)]; P.render(); })()`);
    await b.eval(wav); await b.sleep(600);
    await b.eval(`window.__ntRec.load(${JSON.stringify(JSON.stringify(song))}), 1`); await b.sleep(200);
    const rows = () => b.eval("[...document.querySelectorAll('#nt-loop-rows li')].map(li => [...li.children].map(e => e.textContent).join(' '))");
    let r = await rows();
    assert.strictEqual(r.length, 4, JSON.stringify(r));
    assert.ok(!r.some(x => /⚠|≈/.test(x)), "every section matches the map: " + JSON.stringify(r));
    assert.ok(/V1a bars 3–6/.test(r[1]) && /V1b bars 7–10/.test(r[2]) && /C1a bars 11–14/.test(r[3]), JSON.stringify(r));
    assert.ok(/V1b.*lead-in 1 beat/.test(r[2]), "the song file's lead-in: " + r[2]);
    assert.ok(/V1a.*stop −1 beat/.test(r[1]), "stops a beat early for V1b's pickup: " + r[1]);
    assert.ok(/4 empty/.test(await b.eval("document.getElementById('nt-loop-sum').textContent")));

    // a split: V1a cut after 2 bars; both halves keep their bars, the chorus doesn't move
    await b.eval(`(() => { NotationDoc.splitAt(NotationPage.doc(), 1, 8); NotationPage.render(); })()`);
    r = await rows();
    assert.ok(/bars 3–4/.test(r[1]) && /bars 5–6/.test(r[2]) && /bars 11–14/.test(r[4]), JSON.stringify(r));

    // loop the second half of V1a, playing along: the pass is a take of it
    const sp = await b.eval("NotationPage.lpSpans().map(s => s.ci)");
    await b.eval(`NotationPage.lpLoop(2), 1`);
    assert.strictEqual(await b.eval("NotationPage.lp().ci"), sp[2]);
    // wait for the pass to start, then play two whole notes (a bar each) from its downbeat
    for (let i = 0; i < 40 && !(await b.eval("!!(NotationPage.rec() && NotationPage.rec().pass)")); i++) await b.sleep(50);
    assert.ok(await b.eval("!!(NotationPage.rec() && NotationPage.rec().pass)"), "a pass is recording");
    await b.eval(`(() => { const r = NotationPage.rec(), d = r.downPerf, beat = r.beatSec * 1000; r.on(67, d); r.off(67, d + 3.9 * beat); r.on(69, d + 4 * beat); r.off(69, d + 7.9 * beat); })()`);
    for (let i = 0; i < 60 && !(await b.eval("NotationPage.passTakes().length")); i++) await b.sleep(50);
    const d = await b.eval("NotationPage.doc()");
    assert.deepStrictEqual(d.chunks[sp[2]].pitches, [67, 69], "the pass went into the looped chunk");
    assert.ok(/1 done/.test(await b.eval("document.getElementById('nt-loop-sum').textContent")));
    // \\ keys: next chunk
    await b.eval(`(() => { const k = o => document.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ bubbles: true }, o))); k({ key: "\\\\" }); k({ key: "." }); })()`);
    assert.strictEqual(await b.eval("NotationPage.lp().ci"), sp[3], "\\\\ . loops the next chunk");
    await b.eval("NotationPage.lpStop(), 1");
    const bad = b.errors.filter(e => !/supabaseUrl|soundfont|Failed to load resource|net::|Didn't load note/i.test(e));
    assert.deepStrictEqual(bad, []);
    console.log("CHUNK LOOP OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
