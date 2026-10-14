// The Chord Entry page's defaults and the take's range: your own notes not sounded and the computer keyboard off at first (both remembered),
// a take with nothing to play it on refused with a warning, swing read from the band's style (also when a song file sets the style),
// staccato and the plainest phrase ends by default, a take to the end of the tune by default, and "These bars" (From / To, a click
// in the chart moves From). Run from tests/band/lead, server on 8500:   node ../entry/defaults.cdp.js        ("ENTRY DEFAULTS OK")
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1400, height: 900 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const val = id => ev(`document.getElementById("${id}").value`), text = id => ev(`document.getElementById("${id}").textContent`), checked = id => ev(`document.getElementById("${id}").checked`);
  const hidden = id => ev(`document.getElementById("${id}").hidden`), click = id => ev(`document.getElementById("${id}").click(); 0`);
  const set = (id, v) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event("input", { bubbles:true })); e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const tick = (id, on) => ev(`(function(){ var e = document.getElementById("${id}"); e.checked = ${on}; e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const errs = () => b.errors.filter(e => !/supabase/i.test(e));
  const cho = style => ["{title: Defaults}", "{time: 4/4}", "{key: C}", "{style: " + style + "}", "",
    "{comment: Verse}", "{start_of_grid}", "| C | F | G | C |", "{end_of_grid}", "[C]la la", "",
    "{comment: Chorus}", "{start_of_grid}", "| F | C | G | C |", "| F | C | G | C |", "{end_of_grid}", "[F]lo lo", ""].join("\n");
  try {
    await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1800);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    assert.strictEqual(await checked("ce-sound"), false, "your own notes are not sounded at first"); assert.strictEqual(await checked("ce-type"), false, "the computer keyboard is off at first");
    assert.strictEqual(await val("ce-mdet"), "staccato"); assert.strictEqual(await val("ce-mends"), "simple"); assert.strictEqual(await val("ce-mrange"), "end");
    // swing follows the style a song file brings
    const straight = await ev(`BandCatalog.styles.filter(function(s){ return s.feel !== "swing"; })[0].id`), swung = await ev(`BandCatalog.styles.filter(function(s){ return s.feel === "swing"; })[0].id`);
    assert.strictEqual(await ev(`__ceWork.loadCho(${JSON.stringify(cho(swung))}, "d.cho")`), true); assert.strictEqual(await val("ce-mfeel"), "swing", "a swing style: swung");
    assert.strictEqual(await ev(`__ceWork.loadCho(${JSON.stringify(cho(straight))}, "d.cho")`), true); assert.strictEqual(await val("ce-style"), straight); assert.strictEqual(await val("ce-mfeel"), "straight", "a straight style: straight");
    // nothing to play on: no take, and a warning
    await click("ce-mrec"); await b.sleep(200);
    assert.strictEqual(await ev(`__entry.recording()`), false, "no take without a keyboard"); assert(/nothing would be recorded/.test(await text("ce-note")), await text("ce-note"));
    // the range: to the end of the tune by default
    assert.strictEqual(await hidden("ce-mrange-f"), false); assert.strictEqual(await hidden("ce-mfrom-f"), true);
    await ev(`__ceWork.setTab(0); 0`); assert(/starts at bar 1 \(Verse\) and runs to bar 12/.test(await text("ce-mstart")), await text("ce-mstart"));
    await set("ce-mrange", "section"); assert(/runs to bar 4\./.test(await text("ce-mstart")), await text("ce-mstart"));
    // These bars: From follows the marked bar, To is its own
    await set("ce-mrange", "bars"); assert.strictEqual(await hidden("ce-mfrom-f"), false); assert.strictEqual(await val("ce-mfrom"), "1");
    assert(/runs to bar 12\./.test(await text("ce-mstart")), "To bar empty: to the end");
    await set("ce-mfrom", "6"); await set("ce-mto", "9"); assert.strictEqual(await ev(`__ceWork.start()`), 5);
    assert(/starts at bar 6 \(Chorus\) and runs to bar 9\./.test(await text("ce-mstart")), await text("ce-mstart"));
    await ev(`document.querySelector('#ce-chart .tc-bar[data-bar="2"]').dispatchEvent(new MouseEvent("click", { bubbles: true })); 0`); await b.sleep(150);
    assert.strictEqual(await val("ce-mfrom"), "3", "a click in the chart moves From"); assert(/starts at bar 3 \(Verse\) and runs to bar 9\./.test(await text("ce-mstart")), await text("ce-mstart"));
    await set("ce-mfrom", "11"); assert.strictEqual(await val("ce-mto"), "11", "To is never before From");
    // a take of those bars, played on the computer keyboard
    await tick("ce-type", true); await set("ce-mfrom", "6"); await set("ce-mto", "7");
    await click("ce-mrec"); await b.sleep(300); assert.strictEqual(await ev(`__entry.recording()`), true);
    assert(/Recording bars 6–7/.test(await text("ce-note")), await text("ce-note")); await click("ce-mrec");
    // both setup boxes are remembered
    await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1500); assert.strictEqual(await checked("ce-type"), true); assert.strictEqual(await val("ce-mrange"), "bars");
    await tick("ce-type", false); await set("ce-mrange", "end");
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    console.log("ENTRY DEFAULTS OK");
  } catch (e) { console.error(e); process.exitCode = 1; } finally { await b.close(); }
})();
