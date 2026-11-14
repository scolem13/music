// The Notation page's Raw ABC mode: the score draws the ABC box's text as written (slurs and dynamics kept),
// the score keys are refused, Space plays, u undoes a raw edit, and unticking reads the code back into the model.
// Setup as in tests/band/README.md (sh scripts/render-test-page.sh tools/notation.qmd, server on 8500).
// node tests/abc/notation-raw.cdp.js -> "NOTATION RAW OK"   (NEG=1: checks that a re-read drops the slur, i.e. must fail)
const { launch } = require("../band/lead/cdp.js");
const assert = require("assert");
(async () => {
  const b = await launch({ width: 1500, height: 1300 });
  try {
    await b.goto("http://127.0.0.1:8500/tools/notation.html");
    await b.eval("localStorage.clear()");
    await b.goto("http://127.0.0.1:8500/tools/notation.html");
    await b.sleep(400);
    const abc = 'X:1\nM:7/8\nL:1/8\nK:C\n!p!(CDE) FG AB|{g}c3 B2 A2|]';
    const type = async txt => { await b.eval(`(() => { const t = document.getElementById("nt-abc-text"); t.focus(); t.value = ${JSON.stringify(txt)}; t.dispatchEvent(new Event("input")); return 1; })()`); await b.sleep(700); };
    await b.eval(`(() => { const c = document.getElementById("nt-abc-raw"); c.checked = true; c.dispatchEvent(new Event("change")); return 1; })()`);
    await type(abc);
    await b.eval(`document.getElementById("nt-abc-text").dispatchEvent(new Event("blur")), 1`);
    await b.sleep(300);
    const d = await b.eval("NotationPage.doc()");
    if (process.env.NEG) { assert.ok(!d.raw, "NEG: raw should not be kept"); }
    assert.strictEqual(d.raw, abc, "raw text kept as typed");
    assert.strictEqual(await b.eval(`document.getElementById("nt-abc-text").value`), abc, "box not rewritten");
    assert.ok(await b.eval(`document.querySelectorAll("#nt-paper .abcjs-slur, #nt-paper path.abcjs-legato").length`) >= 1 || await b.eval(`/abcjs-slur|legato/.test(document.getElementById("nt-paper").innerHTML)`), "slur drawn");
    assert.ok(await b.eval(`/abcjs-dynamics|abcjs-decoration/.test(document.getElementById("nt-paper").innerHTML)`), "dynamic drawn");
    // score keys refused
    await b.eval(`document.body.focus(), document.activeElement.blur && document.activeElement.blur(), 1`);
    await b.eval(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "o", bubbles: true, cancelable: true })), 1`);
    await b.sleep(200);
    assert.strictEqual((await b.eval("NotationPage.doc()")).raw, abc, "o did nothing");
    assert.ok(/Raw ABC is on/.test(await b.eval(`document.getElementById("nt-status").textContent`)), "told why");
    // raw edit, then u undoes it
    await type(abc.replace("!p!", "!f!"));
    await b.eval(`document.getElementById("nt-abc-text").dispatchEvent(new Event("blur")), 1`);
    await b.eval(`document.activeElement.blur(), 1`);
    await b.eval(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "u", bubbles: true, cancelable: true })), 1`);
    await b.sleep(300);
    assert.strictEqual((await b.eval("NotationPage.doc()")).raw, abc, "u undid the raw edit");
    // h / l / L move the active note (drawn red); Tab selects its code; Tab in the box comes back to the note at the caret
    const keyDoc = k => b.eval(`(document.activeElement && document.activeElement.blur && document.activeElement.blur(), document.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ bubbles: true, cancelable: true }, ${JSON.stringify(k)}))), 1)`);
    await keyDoc({ key: "l" }); await keyDoc({ key: "l" }); await keyDoc({ key: "l" });
    assert.ok(await b.eval(`document.querySelectorAll("#nt-paper .nt-sel").length`) > 0, "a note drawn active");
    await keyDoc({ key: "Tab" });
    const selTxt = await b.eval(`(() => { const t = document.getElementById("nt-abc-text"); return t.value.slice(t.selectionStart, t.selectionEnd); })()`);
    assert.ok(/^\s*E/.test(selTxt), "Tab selected the 3rd note's code (E): " + JSON.stringify(selTxt));
    await keyDoc({ key: "L" });
    await keyDoc({ key: "Tab" });
    const selTxt2 = await b.eval(`(() => { const t = document.getElementById("nt-abc-text"); return t.value.slice(t.selectionStart, t.selectionEnd); })()`);
    assert.ok(/g\}?c3|c3/.test(selTxt2) || /c/.test(selTxt2), "L went to the next bar: " + JSON.stringify(selTxt2));
    await b.eval(`(() => { const t = document.getElementById("nt-abc-text"); const i = t.value.indexOf("B2"); t.focus(); t.setSelectionRange(i, i); t.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })); return 1; })()`);
    await b.sleep(200);
    await keyDoc({ key: "Tab" });
    const selTxt3 = await b.eval(`(() => { const t = document.getElementById("nt-abc-text"); return t.value.slice(t.selectionStart, t.selectionEnd); })()`);
    assert.ok(/B2/.test(selTxt3), "Tab from the box landed on B2: " + JSON.stringify(selTxt3));
    // kept across a reload
    await b.goto("http://127.0.0.1:8500/tools/notation.html");
    await b.sleep(500);
    assert.strictEqual((await b.eval("NotationPage.doc()")).raw, abc, "raw kept after reload");
    assert.ok(await b.eval(`document.getElementById("nt-abc-raw").checked`), "box ticked after reload");
    // untick: back to the model (confirm answered yes), the slur dropped
    await b.eval(`window.confirm = () => true, 1`);
    await b.eval(`(() => { const c = document.getElementById("nt-abc-raw"); c.checked = false; c.dispatchEvent(new Event("change")); return 1; })()`);
    await b.sleep(300);
    const d2 = await b.eval("NotationPage.doc()");
    assert.ok(!d2.raw, "raw cleared");
    assert.ok(d2.chunks[0].rhythm.length >= 8, "notes read into the model");
    assert.ok(!/\(CDE\)/.test(await b.eval(`document.getElementById("nt-abc-text").value`)), "model writes its own ABC");
    console.log("NOTATION RAW OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
