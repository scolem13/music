// Backing Track -> Notation (the "Open in the Notation app" button) with a chart of P: sections and a tempo: each section a chunk
// with its heading, the tempo kept, Play it in at it; the navbar metronome's From page / To page on both pages.
// Setup as in tests/band/README.md (render tools/backing-track.qmd and tools/notation.qmd, server on 8500).
// node tests/abc/notation-handoff.cdp.js -> "NOTATION HANDOFF OK"
const { launch } = require("../band/lead/cdp.js");
const assert = require("assert");
const ABC = 'X:1\nT:Winter Wonderland\nM:4/4\nL:1/8\nQ:1/4=128\nK:Eb\nP:Verse 1\n"Eb"z8 | "Gm"z4"Cm"z4 | "Fm"z8 | "Bb"z8 |\nP:Bridge\n"G"z8 | "Am7/D"z8 |\nP:Coda\n"Eb"z8 |]';
(async () => {
  const b = await launch({ width: 1400, height: 1200 });
  try {
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html"); await b.sleep(800);
    await b.eval(`(() => { const ta = document.getElementById("bt-abc"); ta.value = ${JSON.stringify(ABC)}; ta.dispatchEvent(new Event("input", { bubbles: true })); ta.dispatchEvent(new Event("change", { bubbles: true })); })()`);
    await b.sleep(600);
    await b.eval(`(() => { const n = document.getElementById("bt-tempo-n"); n.value = 128; n.dispatchEvent(new Event("change", { bubbles: true })); })()`);
    // the metronome: From page takes the Backing Track's tempo; To page sets it
    assert.deepStrictEqual(await b.eval("PageTempo.get()"), { bpm: 128, beats: 4 });
    await b.eval(`document.querySelector('#pw-metro') || [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Metronome').click()`);
    await b.eval(`document.getElementById("pw-from-page").click()`);
    assert.strictEqual(await b.eval(`document.getElementById("pw-bpm").textContent`), "128");
    await b.eval(`document.getElementById("pw-bpm-up").click(), document.getElementById("pw-to-page").click()`);
    assert.strictEqual(await b.eval("PageTempo.get().bpm"), 129);
    await b.eval(`(() => { const n = document.getElementById("bt-tempo-n"); n.value = 128; n.dispatchEvent(new Event("change", { bubbles: true })); })()`);
    // over to the Notation page
    await b.eval(`document.getElementById("bt-mel-notation").click()`);
    let d = null;
    for (let i = 0; i < 40 && !d; i++) { await b.sleep(250);
      d = await b.eval(`(() => { const w = window.open("", "bt-notation"); const P = w && w.NotationPage; const x = P && P.doc(); return x && x.chunks.length > 1 ? JSON.parse(JSON.stringify(x)) : null; })()`); }
    assert.ok(d, "the Notation page read the piece in");
    assert.deepStrictEqual(d.chunks.map(c => c.heading), ["Verse 1", "Bridge", "Coda"]);
    assert.strictEqual(d.tempo, 128);
    const q = await b.eval(`(() => { const w = window.open("", "bt-notation"), P = w.NotationPage; P.setCur(1); P.render(); return { bpm: w.document.getElementById("nt-q-bpm").value, get: w.PageTempo.get() }; })()`);
    assert.strictEqual(q.bpm, "128", "Play it in: the section's tempo");
    assert.deepStrictEqual([q.get.bpm, q.get.beats, q.get.where], [128, 4, "Bridge"]);
    const said = await b.eval(`(() => { const w = window.open("", "bt-notation"); return w.PageTempo.set({ bpm: 100, beats: 3 }); })()`);
    d = await b.eval(`JSON.parse(JSON.stringify(window.open("", "bt-notation").NotationPage.doc()))`);
    assert.strictEqual(d.tempo, 100); assert.strictEqual(d.meter, "3/4"); assert.ok(/100 bpm, 3\/4/.test(said), said);
    console.log("NOTATION HANDOFF OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
