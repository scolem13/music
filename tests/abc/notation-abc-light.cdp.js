// The Notation page's ABC box and score light each other: the active note's code is marked in a layer behind the box
// (#nt-abc-hl mark), and with the caret in the box the note under it is lit in the score (.nt-code). Model and Raw ABC.
// Setup as in tests/band/README.md (sh scripts/render-test-page.sh tools/notation.qmd, server on 8500).
// node tests/abc/notation-abc-light.cdp.js -> "NOTATION ABC LIGHT OK"   (NEG=1: expects the wrong note marked, must fail)
const { launch } = require("../band/lead/cdp.js");
const assert = require("assert");
(async () => {
  const b = await launch({ width: 1500, height: 1300 });
  try {
    await b.goto("http://127.0.0.1:8500/tools/notation.html");
    await b.eval("localStorage.clear()");
    await b.goto("http://127.0.0.1:8500/tools/notation.html");
    await b.sleep(400);
    const abc = "X:1\nM:4/4\nL:1/8\nK:C\nC2 D2 E2 F2|G8|]";
    await b.eval(`(() => { const t = document.getElementById("nt-abc-text"); t.focus(); t.value = ${JSON.stringify(abc)}; t.dispatchEvent(new Event("input")); return 1; })()`);
    await b.sleep(800);
    await b.eval(`(() => { const t = document.getElementById("nt-abc-text"); t.blur(); t.dispatchEvent(new Event("blur")); return 1; })()`);
    await b.sleep(300);
    // score -> code: some note's code marked while the box is unfocused
    const mark = () => b.eval(`(document.querySelector("#nt-abc-hl mark") || {}).textContent || ""`);
    assert.ok(/[A-Ga-g]/.test(await mark()), "active note marked in the box: " + JSON.stringify(await mark()));
    // code -> score: caret on E lights one note in the score, and the box marks E
    const caretAt = async ch => { await b.eval(`(() => { const t = document.getElementById("nt-abc-text"), i = t.value.indexOf(${JSON.stringify(ch)}, t.value.indexOf("K:")); t.focus(); t.setSelectionRange(i, i); t.dispatchEvent(new Event("keyup")); return 1; })()`); await b.sleep(200); };
    await caretAt("E2");
    const m1 = await mark();
    assert.ok(m1.trim().startsWith(process.env.NEG ? "F" : "E"), "caret on E marks E: " + JSON.stringify(m1));
    assert.ok(await b.eval(`document.querySelectorAll("#nt-paper .nt-code").length`) > 0, "note under the caret lit in the score");
    await caretAt("G8");
    assert.ok((await mark()).trim().startsWith("G"), "caret on G marks G");
    // the layer lines up with the textarea
    const box = await b.eval(`(() => { const a = document.getElementById("nt-abc-text").getBoundingClientRect(), h = document.getElementById("nt-abc-hl").getBoundingClientRect(); return [a.top, h.top, a.left, h.left]; })()`);
    assert.ok(Math.abs(box[0] - box[1]) < 3 && Math.abs(box[2] - box[3]) < 3, "layer over the textarea " + box);
    // raw ABC: same both ways
    await b.eval(`(() => { const c = document.getElementById("nt-abc-raw"); c.checked = true; c.dispatchEvent(new Event("change")); return 1; })()`);
    await b.sleep(300);
    await caretAt("F2");
    assert.ok((await mark()).trim().startsWith("F"), "raw: caret on F marks F");
    assert.ok(await b.eval(`document.querySelectorAll("#nt-paper .nt-code").length`) > 0, "raw: lit in the score");
    console.log("NOTATION ABC LIGHT OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
