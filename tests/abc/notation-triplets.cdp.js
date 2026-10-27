// The Notation page with triplets typed in the ABC box ((3CDE kept, drawn with its bracket) and the chord boxes' keys:
// h / l / H / L and j / k in Chords by bar and in the box on the score (the j of "maj" still typed).
// Setup as in tests/band/README.md (sh scripts/render-test-page.sh tools/notation.qmd, server on 8500).
// node tests/abc/notation-triplets.cdp.js -> "NOTATION TRIPLETS OK"
const { launch } = require("../band/lead/cdp.js");
const assert = require("assert");
(async () => {
  const b = await launch({ width: 1500, height: 1300 });
  try {
    await b.goto("http://127.0.0.1:8500/tools/notation.html");
    await b.eval("localStorage.clear()");
    await b.goto("http://127.0.0.1:8500/tools/notation.html");
    await b.sleep(400);
    const abc = 'X:1\nM:4/4\nL:1/8\nK:C\n"^A""C"(3CDE F2 "G"(3GAB c2|(3c2B2A2 G4|\n"^B""F"F8|"C"C8|]';
    await b.eval(`(() => { const t = document.getElementById("nt-abc-text"); t.focus(); t.value = ${JSON.stringify(abc)}; t.dispatchEvent(new Event("input")); return 1; })()`);
    await b.sleep(900);
    await b.eval(`document.getElementById("nt-abc-text").dispatchEvent(new Event("blur")), 1`);
    await b.sleep(300);
    const out = await b.eval(`document.getElementById("nt-abc-text").value`);
    assert.ok(/\(3CDE F2 "G"\(3GAB c2 \| \(3c2 B2 A2 G4/.test(out), "triplets written back:\n" + out);
    const d = await b.eval("NotationPage.doc()");
    assert.strictEqual(d.chunks.length, 2);
    assert.ok(Math.abs(d.chunks[0].rhythm[0].durQ - 1 / 3) < 1e-9);
    assert.ok(await b.eval(`document.querySelectorAll("#nt-paper .abcjs-triplet").length`) >= 3, "triplet brackets drawn");

    // Chords by bar: h / l chord by chord, H / L bar by bar, j next chunk
    const ct = `document.getElementById("nt-chords-text")`;
    const key = k => b.eval(`(() => { const t = ${ct}; t.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ bubbles: true, cancelable: true }, ${JSON.stringify(k)}))); return t.value.slice(t.selectionStart, t.selectionEnd); })()`);
    await b.eval(`(() => { NotationPage.doc(); const t = ${ct}; t.focus(); t.setSelectionRange(0, 0); return 1; })()`);
    const v0 = await b.eval(`${ct}.value`);
    assert.ok(/C/.test(v0), "chords text " + v0);
    assert.strictEqual(await key({ key: "l" }), (v0.match(/[^\s|]+/g) || [])[1]);
    assert.strictEqual(await key({ key: "h" }), (v0.match(/[^\s|]+/g) || [])[0]);
    await key({ key: "j" });
    assert.strictEqual(await b.eval("NotationPage.cur()"), 1, "j: next chunk");
    assert.strictEqual(await b.eval(`${ct}.value.trim()`), "F | C");
    assert.strictEqual(await key({ key: "L" }), "C");
    await key({ key: "k" });
    assert.strictEqual(await b.eval("NotationPage.cur()"), 0, "k: chunk before");
    // "maj": the j is typed
    await b.eval(`(() => { const t = ${ct}; t.value = "Cma"; t.setSelectionRange(3, 3); return 1; })()`);
    const ev = await b.eval(`(() => { const e = new KeyboardEvent("keydown", { key: "j", bubbles: true, cancelable: true }); ${ct}.dispatchEvent(e); return e.defaultPrevented; })()`);
    assert.strictEqual(ev, false, "the j of maj is typed");
    await b.eval(`${ct}.blur(), 1`);
    // the box on the score: " opens it at the active note, j goes to the next chunk's first note, k back
    await b.eval(`document.dispatchEvent(new KeyboardEvent("keydown", { key: '"', bubbles: true, cancelable: true })), 1`);
    const ed = k => b.eval(`(() => { const t = document.getElementById("nt-chord-ed"); t.dispatchEvent(new KeyboardEvent("keydown", { key: "${k}", bubbles: true, cancelable: true })); return [NotationPage.cur(), t.value]; })()`);
    assert.deepStrictEqual(await b.eval(`[NotationPage.cur(), document.getElementById("nt-chord-ed").value]`), [0, "C"]);
    assert.deepStrictEqual(await ed("j"), [1, "F"]);
    assert.deepStrictEqual(await ed("k"), [0, "C"]);
    await ed("Escape");
    // ( makes the red note a triplet, letters fill it; in Visual mode ( makes the selected notes one; u undoes
    const abc2 = "X:1\nM:4/4\nL:1/8\nK:C\n!style=rhythm!B2 !style=rhythm!B2 !style=rhythm!B2 !style=rhythm!B2|]";
    await b.eval(`(() => { const t = document.getElementById("nt-abc-text"); t.value = ${JSON.stringify(abc2)}; t.dispatchEvent(new Event("input")); return 1; })()`);
    await b.sleep(900);
    await b.eval(`document.getElementById("nt-abc-text").dispatchEvent(new Event("blur")), 1`);
    const dk = k => b.eval(`document.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(k)}, bubbles: true, cancelable: true })), 1`);
    await dk("(");
    for (const l of "cde") await dk(l);
    let abcOut = await b.eval(`NotationDoc.toAbc(NotationPage.doc()).abc`);
    assert.ok(/\(3CDE /.test(abcOut), "( then letters:\n" + abcOut);
    await dk("v"); await dk("l"); await dk("(");
    abcOut = await b.eval(`NotationDoc.toAbc(NotationPage.doc()).abc`);
    assert.ok(/\(3CDE \(3/.test(abcOut), "Visual (:\n" + abcOut);
    assert.strictEqual(await b.eval(`NotationPage.doc().chunks[0].rhythm.length`), 7);
    await dk("u");
    assert.strictEqual(await b.eval(`NotationPage.doc().chunks[0].rhythm.length`), 6, "u undoes it");
    console.log("NOTATION TRIPLETS OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
