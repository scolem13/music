// The Notation page's Play it in deck in headless Chrome: each take a chunk of its own, a pickup from the count-in (up to almost a
// whole bar), later takes without one, Shift+Backspace drops the last take, Shift+R plays it again. No MIDI device: notes go
// straight to the take (NotationPage.rec().on / off, times from its downbeat). Setup as in tests/band/README.md
// (sh scripts/render-test-page.sh tools/notation.qmd, server on 8500).  node tests/abc/notation-quick.cdp.js -> "NOTATION QUICK OK"
const { launch } = require("../band/lead/cdp.js");
const assert = require("assert");
(async () => {
  const b = await launch({ width: 1500, height: 1300 });
  try {
    await b.goto("http://127.0.0.1:8500/tools/notation.html");
    await b.eval("localStorage.clear()");
    await b.goto("http://127.0.0.1:8500/tools/notation.html");
    await b.sleep(400);
    await b.eval(`(() => { const P = NotationPage, d = P.doc(); d.meter = "4/4"; d.key = "G"; d.keyConfirmed = true; d.tempo = 120; })()`);
    const doc = () => b.eval("NotationPage.doc()");
    const key = k => b.eval(`document.dispatchEvent(new KeyboardEvent("keydown", ${JSON.stringify(k)})), 1`);
    // [beat, midi, length in beats]; 0.5 s a beat
    const play = (notes, redo) => b.eval(`(() => { const P = NotationPage; P.quickStart(${!!redo}); const r = P.rec(), d = r.downPerf;
      ${JSON.stringify(notes)}.forEach(x => { r.on(x[1], d + x[0] * 500); r.off(x[1], d + (x[0] + x[2]) * 500); });
      P.quickStop(); return P.cur(); })()`);
    const qlen = c => c.rhythm.reduce((s, r) => s + r.durQ, 0);

    // almost a whole bar of pickup: 3½ beats before the downbeat
    await play([[-3.5, 62, 0.45], [-3, 64, 2.9], [0, 67, 3.9]]);
    let d = await doc();
    assert.deepStrictEqual(d.chunks.map(c => c.name), ["Pickup", "Take 1"]);
    assert.strictEqual(d.chunks[0].pickup, true); assert.strictEqual(qlen(d.chunks[0]), 3.5);
    assert.deepStrictEqual(d.chunks[0].pitches, [62, 64]); assert.deepStrictEqual(d.chunks[1].pitches, [67]);
    assert.strictEqual(qlen(d.chunks[1]), 4);
    let abc = await b.eval("document.getElementById('nt-abc-text').value");
    assert.ok(/"\^Pickup"D E[^|]*\| "\^Take 1"G8 \|\]/.test(abc), abc);

    // the next take: a chunk of its own after it, no pickup (a note just before the downbeat is on it)
    await play([[-0.3, 71, 1.9], [2, 72, 1.9], [4, 74, 3.9]]);
    d = await doc();
    assert.deepStrictEqual(d.chunks.map(c => c.name), ["Pickup", "Take 1", "Take 2"]);
    assert.deepStrictEqual(d.chunks[2].pitches, [71, 72, 74]); assert.strictEqual(qlen(d.chunks[2]), 8);
    assert.strictEqual(await b.eval("NotationPage.cur()"), 2);

    // Shift+R: take 2 again, in its place
    await play([[0, 76, 3.9]], true);
    d = await doc();
    assert.deepStrictEqual(d.chunks.map(c => c.name), ["Pickup", "Take 1", "Take 2"]);
    assert.deepStrictEqual(d.chunks[2].pitches, [76]);
    // Shift+Backspace: gone
    await key({ key: "Backspace", code: "Backspace", shiftKey: true });
    d = await doc();
    assert.deepStrictEqual(d.chunks.map(c => c.name), ["Pickup", "Take 1"]);

    // a fresh piece, the pickup set to one eighth
    await b.eval(`localStorage.removeItem("ntDoc"), localStorage.setItem("ntQuick", JSON.stringify({ bpm: 120, pickup: "1" })), 1`);
    await b.goto("http://127.0.0.1:8500/tools/notation.html"); await b.sleep(400);
    await b.eval(`(() => { const d = NotationPage.doc(); d.meter = "4/4"; d.key = "G"; d.keyConfirmed = true; d.tempo = 120; })()`);
    await play([[-0.5, 62, 0.45], [0, 67, 3.9]]);
    d = await doc();
    assert.deepStrictEqual(d.chunks.map(c => c.name), ["Pickup", "Take 1"]);
    assert.strictEqual(qlen(d.chunks[0]), 0.5);
    abc = await b.eval("document.getElementById('nt-abc-text').value");
    assert.ok(/"\^Pickup"D \| "\^Take 1"G8 \|\]/.test(abc), abc);
    assert.ok(await b.eval("document.querySelectorAll('#nt-q-pickup option').length") === 9);   // From the count-in, None, 1..7 eighths
    // DWIM after a pickup: the Take chunk re-reads its own bars (not the pickup's), the Pickup chunk its one short bar
    await b.eval(`localStorage.removeItem("ntDoc"), localStorage.setItem("ntQuick", JSON.stringify({ bpm: 120, pickup: "auto" })), 1`);
    await b.goto("http://127.0.0.1:8500/tools/notation.html"); await b.sleep(400);
    await b.eval(`(() => { const d = NotationPage.doc(); d.meter = "4/4"; d.key = "C"; d.keyConfirmed = true; d.tempo = 120; })()`);
    await play([[-1, 59, 0.45], [0, 60, 0.45], [1, 62, 0.45], [2, 64, 0.45], [3, 65, 0.45]]);
    d = await doc();
    assert.deepStrictEqual(d.chunks.map(c => [c.name, c.takes.length, c.takes[0].lb]), [["Pickup", 1, 0], ["Take 1", 1, 1]]);
    const clickNote = i => b.eval(`(() => { const n = [...document.querySelectorAll('#nt-paper .abcjs-note')].filter(n => !n.closest('.nt-pitchonly'))[${i}];
      n.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); n.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); })()`);
    const dwimCards = async i => { await clickNote(i); await b.eval("document.getElementById('nt-s-dwim').click()"); await b.sleep(300);
      return b.eval("[...document.querySelectorAll('#nt-dwim-host .md-card .md-head')].map(e => e.textContent)"); };
    const notesOf = c => JSON.stringify([c.rhythm, c.pitches]);
    const pick0 = notesOf(d.chunks[0]);
    let cards = await dwimCards(1);                                  // the take's first note
    assert.ok(cards.some(c => /staccato/i.test(c)), JSON.stringify(cards));
    await b.eval("[...document.querySelectorAll('#nt-dwim-host .md-card')].find(c => /staccato/i.test(c.textContent)).querySelector('button').click()");
    d = await doc();
    assert.deepStrictEqual(d.chunks[1].pitches, [60, 62, 64, 65], "the take's own bar, not the pickup");
    assert.strictEqual(qlen(d.chunks[1]), 4);
    assert.strictEqual(notesOf(d.chunks[0]), pick0, "the pickup is left alone");
    await b.eval(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })), 1`);
    cards = await dwimCards(0);                                      // the pickup note
    assert.ok(cards.length >= 1, "the pickup has readings too");
    assert.ok(!/No take here/.test(await b.eval("document.querySelector('#nt-dwim-host').textContent")));
    await b.eval("document.querySelector('#nt-dwim-host .md-card button').click()");
    d = await doc();
    assert.deepStrictEqual(d.chunks[0].pitches, [59]); assert.strictEqual(qlen(d.chunks[0]), 1);
    assert.strictEqual(d.chunks[0].pickup, true);
    assert.deepStrictEqual(d.chunks[1].pitches, [60, 62, 64, 65]);

    // a phrase from Timestamp Notes: the take goes into its bars; count-in notes into the bar before, stitched with what is there
    await b.eval(`localStorage.removeItem("ntDoc"), localStorage.setItem("ntQuick", JSON.stringify({ bpm: 120, pickup: "auto" })), 1`);
    await b.goto("http://127.0.0.1:8500/tools/notation.html"); await b.sleep(400);
    await b.eval(`(() => { const P = NotationPage, D = NotationDoc, d = P.doc(); d.meter = "4/4"; d.key = "C"; d.keyConfirmed = true; d.tempo = 120;
      const a = D.newChunk("V1a"), c = D.newChunk("V1b"); a.heading = "Verse 1"; a.rhythm = [{ type: "note", durQ: 4 }, { type: "note", durQ: 4 }]; a.pitches = [60, 62];
      c.chordLen = 8; c.chords = [{ at: 0, name: "G" }]; d.chunks = [a, c]; P.render(); })()`);
    await b.eval(`(() => { NotationPage.phrase({ ci: 1, bar: 0, bars: 2, leadIn: 1, label: "Verse 1 · 2/2" }); NotationPage.setCur(1); })()`);
    await play([[-1, 64, 0.45], [-0.5, 65, 0.45], [0, 67, 3.9], [4, 69, 3.9]]);
    d = await doc();
    assert.deepStrictEqual(d.chunks.map(c => c.name), ["V1a", "V1b"], "no new chunk");
    assert.deepStrictEqual(d.chunks[1].pitches, [67, 69]); assert.strictEqual(qlen(d.chunks[1]), 8);
    assert.deepStrictEqual(d.chunks[0].pitches, [60, 62, 64, 65], "the pickup at the end of the chunk before");
    assert.deepStrictEqual(d.chunks[0].rhythm.map(r => r.durQ), [4, 3, 0.5, 0.5], "the held D cut at the pickup");
    assert.ok(/2 pickup notes in the bar before/.test(await b.eval("document.getElementById('nt-q-status').textContent")));
    // redo keeps it in place; drop puts the piece back
    await play([[0, 72, 7.9]], true);
    d = await doc();
    assert.deepStrictEqual(d.chunks[0].pitches, [60, 62]); assert.deepStrictEqual(d.chunks[1].pitches, [72]);
    await key({ key: "Backspace", code: "Backspace", shiftKey: true });
    d = await doc();
    assert.deepStrictEqual(d.chunks[1].pitches, []); assert.deepStrictEqual(d.chunks[0].pitches, [60, 62]);
    // the first phrase of the piece: its lead-in becomes a Pickup chunk, and the phrase moves down one
    await b.eval(`(() => { NotationPage.phrase({ ci: 0, bar: 0, bars: 2, leadIn: 1, label: "Verse 1 · 1/2" }); NotationPage.setCur(0); })()`);
    await play([[-1, 59, 0.9], [0, 60, 3.9], [4, 62, 3.9]]);
    d = await doc();
    assert.deepStrictEqual(d.chunks.map(c => c.name), ["Pickup", "V1a", "V1b"]);
    assert.strictEqual(d.chunks[0].pickup, true); assert.strictEqual(qlen(d.chunks[0]), 1);
    assert.strictEqual(await b.eval("NotationPage.phrase().ci"), 1);
    // a later take with notes in the count-in: they lead into its first bar (chunk.lead), none lost
    await b.eval(`localStorage.removeItem("ntDoc"), localStorage.setItem("ntQuick", JSON.stringify({ bpm: 120, pickup: "auto" })), 1`);
    await b.goto("http://127.0.0.1:8500/tools/notation.html"); await b.sleep(400);
    await b.eval(`(() => { const d = NotationPage.doc(); d.meter = "4/4"; d.key = "C"; d.keyConfirmed = true; d.tempo = 120; })()`);
    await play([[0, 60, 3.9]]);
    await play([[-1, 62, 0.9], [0, 64, 3.9]]);
    d = await doc();
    assert.deepStrictEqual(d.chunks.map(c => c.name), ["Take 1", "Take 2"]);
    assert.strictEqual(d.chunks[1].lead, 1); assert.deepStrictEqual(d.chunks[1].pitches, [62, 64]);
    abc = await b.eval("document.getElementById('nt-abc-text').value");
    assert.ok(/C8 \| "\^Take 2"x6 D2 \| E8 \|\]/.test(abc), abc);

    // Take goes "Over the notes here": the take replaces the notes from the active note's bar, chords kept, count-in notes in the bar before
    await b.eval(`(() => { const P = NotationPage, D = NotationDoc, d = P.doc(); const c = D.newChunk("A");
      c.rhythm = Array.from({ length: 8 }, () => ({ type: "note", durQ: 1 })); c.pitches = [60, 62, 64, 65, 67, 69, 71, 72];
      c.chords = [{ at: 0, name: "C" }, { at: 4, name: "G" }]; d.chunks = [c]; P.setCur(0); P.render();
      const el = document.getElementById("nt-q-into"); el.value = "over"; el.dispatchEvent(new Event("change")); })()`);
    await play([[-0.5, 71, 0.45], [0, 72, 1.9], [2, 74, 1.9]]);
    d = await doc();
    assert.deepStrictEqual(d.chunks.map(c => c.name), ["A"], "no new chunk");
    assert.deepStrictEqual(d.chunks[0].pitches, [60, 62, 64, 65, 71, 72, 74]);
    assert.deepStrictEqual(d.chunks[0].rhythm.map(r => r.durQ), [1, 1, 1, 0.5, 0.5, 2, 2]);
    assert.deepStrictEqual(d.chunks[0].chords, [{ at: 0, name: "C" }, { at: 4, name: "G" }], "chords kept");
    assert.ok(/chords kept/.test(await b.eval("document.getElementById('nt-q-status').textContent")));
    await play([[0, 76, 3.9]], true);                                 // redo: the same place
    d = await doc();
    assert.deepStrictEqual(d.chunks[0].pitches, [60, 62, 64, 65, 76]);
    await key({ key: "Backspace", code: "Backspace", shiftKey: true }); // drop: back as it was
    d = await doc();
    assert.deepStrictEqual(d.chunks[0].pitches, [60, 62, 64, 65, 67, 69, 71, 72]);
    await b.eval(`(() => { const el = document.getElementById("nt-q-into"); el.value = "new"; el.dispatchEvent(new Event("change")); })()`);

    // a voice the band's bass plays: its written bars go to the bass (bar.written), empty bars left to the band, never in the melody
    const band = await b.eval(`NotationPage.loadBand().then(() => { const P = NotationPage, D = NotationDoc, d = D.create(); d.meter = "4/4"; d.key = "C";
      d.voices = [{ name: "1", clef: "treble" }, { name: "B", clef: "bass", plays: "bass" }];
      const c = D.newChunk("A"); c.rhythm = [{ type: "note", durQ: 4 }, { type: "note", durQ: 4 }, { type: "rest", durQ: 4 }]; c.pitches = [72, 74];
      c.chords = [{ at: 0, name: "C" }, { at: 4, name: "F" }, { at: 8, name: "G" }];
      const pb = D.part(c, 1); pb.rhythm = [{ type: "space", durQ: 4 }, { type: "note", durQ: 2 }, { type: "note", durQ: 2 }, { type: "rest", durQ: 4 }]; pb.pitches = [41, 45];
      d.chunks = [c];
      const back = D.fromAbc(D.toAbc(d).abc);
      const bd = P.makeBand(d, {}); bd.player.stop && bd.player.stop();
      return { plays: back.voices[1].plays, w: bd.parsed.bars.slice(0, 3).map(x => x.written || null), mel: bd.parsed.bars.slice(0, 3).map(x => (x.melody || []).map(n => n.midi)) }; })`);
    assert.strictEqual(band.plays, "bass", "kept through ABC");
    assert.strictEqual(band.w[0], null, "bar 1: the band's own bass");
    assert.deepStrictEqual(band.w[1].bass.map(n => [n.pos, n.dur, n.midi]), [[0, 2, 41], [2, 2, 45]]);
    assert.deepStrictEqual(band.w[2].bass, [], "a typed rest: the bass rests");
    assert.deepStrictEqual(band.mel, [[72], [74], []]);
    console.log("NOTATION QUICK OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
