// The shared key across pages (tonality.js): the Backing Track, Chord Entry and Notation show their tonality beside the Key menu and
// hand it to the shared key; the navbar's circle icon shows its resting tone; a blues is "(Blues)" and the circle's characteristic
// chords become I7 IV7 V7. Setup as in tests/band/README.md (pages rendered with scripts/render-test-page.sh, served on 8500).
//   node tests/abc/tonality.cdp.js -> "TONALITY OK"
const { launch } = require("../band/lead/cdp.js");
const assert = require("assert");
(async () => {
  const b = await launch({ width: 1300, height: 900 });
  try {
    const icon = () => b.eval("document.querySelectorAll('#pw-nav svg')[2].querySelector('text').textContent");
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html"); await b.eval("localStorage.clear()");
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html"); await b.sleep(1500);
    assert.strictEqual(await b.eval("document.getElementById('bt-tonality').textContent"), "F Major (Blues)");
    assert.strictEqual(await icon(), "F");
    assert.deepStrictEqual(await b.eval("Tonality.state()"), { do: 5, resting: 5, mode: "maj", flavor: "blues", tonic: "F" });
    // the circle: a blues, its characteristic chords I7 IV7 V7
    await b.eval("document.querySelectorAll('#pw-nav .nav-link')[2].click()");
    let ok = false; for (let i = 0; i < 40 && !ok; i++) { await b.sleep(150); ok = await b.eval("!!PracticeWidgets.circle()"); }
    assert.ok(ok);
    const st = await b.eval("PracticeWidgets.circle().state()");
    assert.strictEqual(st.blues, true); assert.ok(/blues/.test(st.label), st.label);
    // another key
    await b.eval("(() => { const s = document.getElementById('bt-key'); s.value = 'G'; s.dispatchEvent(new Event('change', { bubbles: true })); })()");
    await b.sleep(400);
    assert.strictEqual(await b.eval("document.getElementById('bt-tonality').textContent"), "G Major (Blues)");
    assert.strictEqual(await icon(), "G");
    assert.strictEqual(await b.eval("PracticeWidgets.circle().state().root"), 7);
    // changes that are not a blues
    await b.eval(`(() => { const t = document.getElementById('bt-abc'); t.value = 'X:1\\nM:4/4\\nL:1/4\\nK:Bb\\n"Bb"z4 | "Eb"z4 | "F"z4 | "Bb"z4 |]\\n'; t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await b.sleep(900);
    assert.strictEqual(await b.eval("document.getElementById('bt-tonality').textContent"), "B\u266d Major");
    assert.strictEqual(await icon(), "B\u266d");
    assert.strictEqual(await b.eval("PracticeWidgets.circle().state().blues"), false);
    // a minor tune: lower case in the icon
    await b.eval(`(() => { const t = document.getElementById('bt-abc'); t.value = 'X:1\\nM:4/4\\nL:1/4\\nK:Dm\\n"Dm"z4 | "Gm"z4 | "A7"z4 | "Dm"z4 |]\\n'; t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await b.sleep(900);
    assert.strictEqual(await b.eval("document.getElementById('bt-tonality').textContent"), "D Minor");
    assert.strictEqual(await icon(), "d");

    // Chord Entry: its Key menu
    await b.goto("http://127.0.0.1:8500/tools/chord-entry.html"); await b.sleep(1200);
    await b.eval("(() => { const s = document.getElementById('ce-key'); s.value = [...s.options].find(o => o.value === 'A').value; s.dispatchEvent(new Event('change', { bubbles: true })); })()");
    await b.sleep(400);
    assert.ok(/^A Major/.test(await b.eval("document.getElementById('ce-tonality').textContent")));
    assert.strictEqual(await icon(), "A");

    // Notation: a confirmed key and blues chords
    await b.goto("http://127.0.0.1:8500/tools/notation.html"); await b.eval("localStorage.removeItem('ntDoc')");
    await b.goto("http://127.0.0.1:8500/tools/notation.html"); await b.sleep(600);
    await b.eval("(() => { const s = document.getElementById('nt-meter'); s.value = '4/4'; s.dispatchEvent(new Event('change')); })()");
    await b.eval("(() => { const s = document.getElementById('nt-key'); s.value = 'D'; s.dispatchEvent(new Event('change')); })()");
    await b.eval("(() => { const t = document.getElementById('nt-chords-text'); t.value = 'D7 | G7 | D7 | A7'; t.dispatchEvent(new Event('input')); })()");
    await b.sleep(700); await b.eval("document.getElementById('nt-chords-text').dispatchEvent(new Event('blur'))");
    assert.strictEqual(await b.eval("document.getElementById('nt-tonality').textContent"), "D Major (Blues)");
    assert.strictEqual(await icon(), "D");
    // lessons: the strip's Key menu, read-only tonality beside it; blues lessons say so
    const lesson = async (path) => { await b.goto("http://127.0.0.1:8500/lessons/" + path); await b.sleep(1500); };
    const badge = () => b.eval("(document.querySelector('.bl-tonality') || {}).textContent");
    const setKey = name => b.eval(`(() => { const s = document.getElementById('bl-key'); s.value = [...s.options].find(o => o.textContent.trim() === ${JSON.stringify(name)}).value; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await lesson("blues-bass.html");
    assert.ok(/ Major \(Blues\)$/.test(await badge()), await badge());
    await setKey("B\u266d"); await b.sleep(200);
    assert.strictEqual(await badge(), "B\u266d Major (Blues)");
    assert.strictEqual(await icon(), "B\u266d");
    await lesson("blues-changes.html");
    assert.ok(/\(Blues\)$/.test(await badge()), await badge());
    await lesson("pop-changes.html");
    assert.ok(/ Major$/.test(await badge()), await badge());
    await setKey("G"); await b.sleep(200);
    assert.strictEqual(await badge(), "G Major"); assert.strictEqual(await icon(), "G");
    await lesson("cadences.html");
    assert.ok(/ Major$/.test(await badge()), await badge());

    // the Chord Sheet: its own key menus follow, and a blues is noted
    await lesson("blues-bass.html");
    await b.goto("http://127.0.0.1:8500/tools/chord-sheet.html"); await b.sleep(1200);
    assert.strictEqual(await b.eval("document.getElementById('cs-blues').hidden"), false);
    console.log("TONALITY OK");
  } catch (e) { console.error(e); process.exitCode = 1; } finally { await b.close(); }
})();
