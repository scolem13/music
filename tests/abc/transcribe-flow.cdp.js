// The Timestamp Notes -> Notation transcribing loop in headless Chrome: Play it in with the left hand's chords, a phrase take that
// runs on into the next phrase (written there as a draft, Back skips past it), and loop passes (nt-pass) each kept as a take.
// Setup as in tests/band/README.md (sh scripts/render-test-page.sh tools/notation.qmd, server on 8500).
// node tests/abc/transcribe-flow.cdp.js -> "TRANSCRIBE FLOW OK"
const { launch } = require("../band/lead/cdp.js");
const assert = require("assert");
(async () => {
  const b = await launch({ width: 1500, height: 1300 });
  try {
    const fresh = async () => {
      await b.eval(`localStorage.removeItem("ntDoc"), localStorage.setItem("ntQuick", JSON.stringify({ bpm: 120, pickup: "off", split: "60" })), 1`);
      await b.goto("http://127.0.0.1:8500/tools/notation.html"); await b.sleep(400);
    };
    await b.goto("http://127.0.0.1:8500/tools/notation.html"); await b.eval("localStorage.clear()");
    await fresh();
    const doc = () => b.eval("NotationPage.doc()");
    // [beat, midi, length in beats]; 0.5 s a beat
    const play = (notes, redo) => b.eval(`(() => { const P = NotationPage; P.quickStart(${!!redo}); const r = P.rec(), d = r.downPerf;
      ${JSON.stringify(notes)}.forEach(x => { r.on(x[1], d + x[0] * 500); r.off(x[1], d + (x[0] + x[2]) * 500); });
      P.quickStop(); return P.cur(); })()`);
    const status = () => b.eval("document.getElementById('nt-q-status').textContent");

    // 1. right hand melody, left hand chords: C major then G major (below C4), the melody above
    await b.eval(`(() => { const d = NotationPage.doc(); d.meter = "4/4"; d.key = "C"; d.keyConfirmed = true; d.tempo = 120; })()`);
    await play([[0, 48, 3.9], [0, 52, 3.9], [0, 55, 3.9], [0, 72, 1.9], [2, 74, 1.9],
                [4, 43, 3.9], [4, 47, 3.9], [4, 50, 3.9], [4, 76, 3.9]]);
    let d = await doc(), t = d.chunks.find(c => /^Take/.test(c.name));
    assert.deepStrictEqual(t.pitches, [72, 74, 76], "the melody: right hand only");
    assert.deepStrictEqual(t.chords.map(c => [c.at, c.name]), [[0, "C"], [4, "G"]], "the left hand's chords on their bars");

    // 2. a melody that dips below the split with no left-hand chords stays all melody
    await play([[0, 57, 0.9], [1, 59, 0.9], [2, 60, 1.9]]);
    d = await doc(); t = d.chunks[await b.eval("NotationPage.cur()")];
    assert.deepStrictEqual(t.pitches, [57, 59, 60]); assert.strictEqual(t.chords.length, 0);

    // 3. a phrase take that runs on: phrase V1a (2 bars, a stop point 1 beat past), played through V1b's 2 bars too
    await fresh();
    await b.eval(`(() => { const P = NotationPage, D = NotationDoc, d = P.doc(); d.meter = "4/4"; d.key = "C"; d.keyConfirmed = true; d.tempo = 120;
      const a = D.newChunk("V1a"), c = D.newChunk("V1b"), e = D.newChunk("V1c"); a.heading = "Verse 1";
      [a, c, e].forEach(x => { x.rhythm = [{ type: "rest", durQ: 8 }]; x.pitches = []; });
      d.chunks = [a, c, e]; P.render(); })()`);
    await b.eval(`(() => { NotationPage.phrase({ ci: 0, bar: 0, bars: 2, leadIn: 0, tail: 1, label: "Verse 1 · 1/3" }); NotationPage.setCur(0); })()`);
    await play([[0, 60, 3.9], [4, 62, 3.9], [8, 64, 3.9], [12, 65, 3.9]]);
    d = await doc();
    assert.deepStrictEqual(d.chunks.map(c => c.name), ["V1a", "V1b", "V1c"], "no new chunks");
    assert.deepStrictEqual(d.chunks[0].pitches, [60, 62]);
    assert.deepStrictEqual(d.chunks[1].pitches, [64, 65], "the bars played on go into the next phrase");
    assert.strictEqual(d.chunks[1].draft, true, "marked draft"); assert.ok(!d.chunks[0].draft); assert.ok(!d.chunks[2].draft);
    assert.ok(/you played on: 2 more bars/.test(await status()), await status());
    assert.strictEqual(await b.eval("NotationPage.spill()"), 1, "Back skips the phrase already written");
    assert.ok(await b.eval("!!document.querySelector('#nt-paper .nt-draft')"), "the draft mark shows");

    // 4. notes only inside the stop point (the loop's overlap) are not run-on
    await b.eval(`NotationPage.setCur(0)`);
    await play([[0, 67, 3.9], [4, 69, 3.9], [8, 71, 0.4]], true);
    d = await doc();
    assert.deepStrictEqual(d.chunks[0].pitches, [67, 69]);
    assert.deepStrictEqual(d.chunks[1].pitches, [], "the redo put V1b back");
    assert.strictEqual(await b.eval("NotationPage.spill()"), 0);

    // 5. loop passes: each pass of the recording's loop is a take timed from the downbeat it is told (no count-in, no click)
    await b.eval(`NotationPage.setCur(0)`);
    const pass = notes => b.eval(`new Promise(res => { const P = NotationPage, now = Date.now(), down = now + 200;
      P.passStart({ downAt: down, endAt: down + 8 * 500 + 100, beatSec: 0.5, label: "Verse 1 · 1/3" });
      const r = P.rec(), d = down - performance.timeOrigin;
      ${JSON.stringify(notes)}.forEach(x => { r.on(x[1], d + x[0] * 500); r.off(x[1], d + (x[0] + x[2]) * 500); });
      setTimeout(() => res(P.passTakes().length), 4600); })`);
    assert.strictEqual(await pass([[0, 72, 3.9], [4, 74, 3.9]]), 1);
    assert.strictEqual(await pass([[0, 76, 3.9], [4, 77, 3.9]]), 2);
    d = await doc();
    assert.deepStrictEqual(d.chunks[0].pitches, [76, 77], "the newest pass is on the page");
    assert.ok(await b.eval("!document.getElementById('nt-passes').hidden"));
    await b.eval("document.querySelector('#nt-passes button').click()");
    d = await doc();
    assert.deepStrictEqual(d.chunks[0].pitches, [72, 74], "pass 1 picked back");
    // 6. the left hand notated: its own voice on a bass staff, its chords written as chords, with or without chord symbols
    for (const lh of ["notate", "both"]) {
      await b.eval(`localStorage.removeItem("ntDoc"), localStorage.setItem("ntQuick", JSON.stringify({ bpm: 120, pickup: "off", split: "60", lh: "${lh}" })), 1`);
      await b.goto("http://127.0.0.1:8500/tools/notation.html"); await b.sleep(400);
      await b.eval(`(() => { const d = NotationPage.doc(); d.meter = "4/4"; d.key = "C"; d.keyConfirmed = true; d.tempo = 120; })()`);
      await play([[0, 48, 3.9], [0, 52, 3.9], [0, 55, 3.9], [0, 72, 1.9], [2, 74, 1.9], [4, 43, 1.9], [6, 45, 1.9], [4, 76, 3.9]]);
      d = await doc(); t = d.chunks.find(c => /^Take/.test(c.name));
      assert.deepStrictEqual(t.pitches, [72, 74, 76], lh + ": the right hand");
      assert.strictEqual(d.voices[1].clef, "bass", lh + ": a bass staff");
      const L = t.parts[0];
      assert.deepStrictEqual(L.pitches, [55, 43, 45], lh + ": the left hand, single notes too");
      assert.deepStrictEqual(L.rhythm[0].also.slice().sort(), [48, 52], lh + ": its chord kept as a chord");
      assert.deepStrictEqual(t.chords.map(c => c.name), lh === "both" ? ["C"] : [], lh + ": chord symbols only when asked");
      const abc = await b.eval("document.getElementById('nt-abc-text').value");
      assert.ok(/clef=bass/.test(abc) && /\[C,E,G,\]/.test(abc), abc);
    }

    // 7. a phrase from Timestamp Notes brings its tempo (at the recording's speed) to Play it in
    await b.eval(`(() => { NotationPage.phrase({ ci: 0, bar: 0, bars: 2, leadIn: 0, tail: -1, bpm: 100, rate: 0.5, label: "x" }); NotationPage.setCur(0); NotationPage.render(); })()`);
    assert.strictEqual(await b.eval("NotationPage.takeBpm()"), 50);

    console.log("TRANSCRIBE FLOW OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
