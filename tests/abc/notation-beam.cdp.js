// Beaming by hand on the Notation page: / beams the red note to the next one (or breaks it), ? to the one before, Visual /
// beams the selection together where notes can take a beam, again: back to the usual beaming. Quarters and longer are left alone.
// Also: D harmonic minor writes the raised seventh as C#, not Db.
// Setup as in tests/band/README.md (sh scripts/render-test-page.sh tools/notation.qmd, server on 8500).
// node tests/abc/notation-beam.cdp.js -> "NOTATION BEAM OK"
const { launch } = require("../band/lead/cdp.js");
const assert = require("assert");
(async () => {
  const b = await launch({ width: 1500, height: 1300 });
  try {
    await b.goto("http://127.0.0.1:8500/tools/notation.html");
    await b.eval("localStorage.clear()");
    await b.goto("http://127.0.0.1:8500/tools/notation.html");
    await b.sleep(400);
    const setAbc = async txt => { await b.eval(`(() => { const t = document.getElementById("nt-abc-text"); t.focus(); t.value = ${JSON.stringify(txt)}; t.dispatchEvent(new Event("input")); return 1; })()`); await b.sleep(900); await b.eval(`(() => { const t = document.getElementById("nt-abc-text"); t.dispatchEvent(new Event("blur")); t.blur(); return 1; })()`); await b.sleep(200); };
    const key = async k => { await b.eval(`(document.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ bubbles: true, cancelable: true }, ${JSON.stringify(k)}))), 1)`); await b.sleep(60); };
    const music = async () => (await b.eval(`document.getElementById("nt-abc-text").value`)).split("\n").filter(l => !/^[A-Z]:|^%/.test(l)).join(" ");
    await setAbc("X:1\nM:4/4\nL:1/8\nK:C\nCDEF GA B2|");
    await key({ key: "l" });                                   // nothing active: l goes to the last note (B2)
    for (let i = 0; i < 3; i++) await key({ key: "h" });       // F
    await key({ key: "/" });
    assert.ok(/CDEFGA B2/.test(await music()), "/ beams F to G: " + await music());
    await key({ key: "/" });
    assert.ok(/CDEF GA B2/.test(await music()), "/ again breaks it: " + await music());
    await key({ key: "?" });
    assert.ok(/CDE F GA B2/.test(await music()), "? breaks E-F: " + await music());
    for (let i = 0; i < 2; i++) await key({ key: "l" });       // A: a quarter after it
    await key({ key: "/" });
    assert.ok(/CDE F GA B2/.test(await music()), "/ before a quarter: nothing: " + await music());
    // Visual: from C to B, / beams all that can be, / again: the usual beaming
    for (let i = 0; i < 6; i++) await key({ key: "h" });
    await key({ key: "v" }); for (let i = 0; i < 6; i++) await key({ key: "l" });
    await key({ key: "/" });
    assert.ok(/CDEFGA B2/.test(await music()), "Visual / beams them: " + await music());
    await key({ key: "/" });
    assert.ok(/CDEF GA B2/.test(await music()), "Visual / again: usual beaming: " + await music());
    // beams typed in the ABC box are kept
    await key({ key: "Escape" });
    await setAbc("X:1\nM:4/4\nL:1/8\nK:C\nC D EF GABc|");
    assert.ok(/C D EF GABc/.test(await music()), "typed beams kept: " + await music());
    // harmonic minor: the raised seventh
    await setAbc("X:1\nM:4/4\nL:1/8\nK:Dm\nD2 ^C2 D4|");
    await b.eval(`(() => { const d = NotationPage.doc(); return 1; })()`);
    const dd = await b.eval(`NotationDoc.spell(61, "Dhm", {})`);
    assert.ok(/^\^C/.test(dd), "C# in D harmonic minor: " + dd);
    console.log("NOTATION BEAM OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
