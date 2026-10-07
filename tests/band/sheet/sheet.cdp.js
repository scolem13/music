// Chord Sheet page: typed root in "Add by type", view options together, preview bar and the less
// common instruments hidden until asked for at the bottom of the page. Server on 8500.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1100 }); const ev = x => b.eval(x);
  const vis = sel => ev(`(function(){ var e = document.querySelector('${sel}'); return !!e && e.getClientRects().length > 0; })()`);
  try {
    await b.goto("http://127.0.0.1:8500/tools/chord-sheet.html"); await ev(`localStorage.removeItem("chordSheetExtras")`); await b.goto("http://127.0.0.1:8500/tools/chord-sheet.html"); await b.sleep(1200);
    assert.strictEqual(await vis(".header-bar"), false, "preview bar hidden"); assert.strictEqual(await vis('[data-inst-id="banjo"]'), false); assert.strictEqual(await vis('[data-inst-id="mandolin"]'), false);
    assert.strictEqual(await vis('[data-inst-id="vihuela"]'), false); assert.strictEqual(await vis('[data-inst-id="guitar"]'), true); assert.strictEqual(await vis('[data-inst-id="ukulele"]'), true);
    assert.strictEqual(await ev(`document.querySelectorAll(".root-chip").length`), 0, "no root buttons");
    const together = await ev(`(function(){ var row = document.getElementById("chk-fingerings").closest(".row"); return ["chk-solfege", "chk-notation", "sel-chord-display", "chk-voice-leading"].every(function(id){ return row.contains(document.getElementById(id)); }); })()`);
    assert(together, "view options sit together");
    const type = (v) => ev(`(function(){ var i = document.getElementById("inp-root"); i.value = "${v}"; i.dispatchEvent(new Event("input", { bubbles:true })); document.getElementById("btn-add-chord").click(); return i.classList.contains("bad"); })()`);
    assert.strictEqual(await type(""), true, "an empty root is refused"); assert.strictEqual(await type("H"), true);
    assert.strictEqual(await ev(`document.getElementById("chords-textarea").value`), "");
    assert.strictEqual(await type("bb"), false); assert.strictEqual(await type("f#"), false); assert.strictEqual(await type("C"), false);
    const txt = await ev(`document.getElementById("chords-textarea").value`); console.log("added:", txt); assert(/^Bb\S*\s+F#\S*\s+C\S*$/.test(txt), txt);
    const h = await ev(`Math.round(document.querySelector(".add-type").getBoundingClientRect().height)`); console.log("add-by-type row height:", h); assert(h <= 48);
    await ev(`document.getElementById("btn-inst-all").click()`); await b.sleep(400);
    assert.strictEqual(await ev(`document.querySelector('[data-inst-id="banjo"]').checked`), false, "All leaves hidden instruments off");
    await b.shot("sheet-top.png");
    await ev(`document.getElementById("btn-extra-insts").click(); document.getElementById("btn-extra-preview").click()`); await b.sleep(200);
    assert.strictEqual(await vis('[data-inst-id="banjo"]'), true); assert.strictEqual(await vis(".header-bar"), true);
    await b.goto("http://127.0.0.1:8500/tools/chord-sheet.html"); await b.sleep(1000);
    assert.strictEqual(await vis('[data-inst-id="banjo"]'), true, "remembered"); assert.strictEqual(await vis(".header-bar"), true);
    await ev(`localStorage.removeItem("chordSheetExtras")`);
    const errs = b.errors.filter(e => !/supabaseUrl|createClient/.test(e)); assert.strictEqual(errs.length, 0, JSON.stringify(errs)); console.log("SHEET OK");
  } finally { await b.close(); } })().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
