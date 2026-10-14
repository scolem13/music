// Chord Entry: a note typed with an accidental keeps its spelling. ^A2 over B7 in A stays ^A (the key alone would write _B), through the
// notation, the saved .cho and a reload; a pitch you did not spell takes the chord's spelling (A# in a B7 bar that goes up to B).
// Run from tests/band/lead, server on 8500:   node ../entry/spelling.cdp.js        ("SPELLING UI OK")
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1600, height: 950 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const val = id => ev(`document.getElementById("${id}").value`);
  const set = (id, v) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event("input", { bubbles:true })); e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const mel = async () => JSON.parse(await ev(`JSON.stringify(__entry.grid().melody().map(function(x){ return (x || []).map(function(n){ return [n.midi, n.sp || ""]; }); }))`));
  const cho = ["{title: Spelling Test}", "{tempo: 100}", "{time: 4/4}", "{key: A}", "", "{comment: Verse 1}", "{start_of_grid}", "| A | B7 | E | A |", "{end_of_grid}",
    "one two three four", "five six seven eight", "nine ten eleven twelve", "end", "", "{comment: Verse 2}", "Gone a[A]way two three four", "five six seven eight", "nine ten eleven twelve", "end", ""].join("\n");
  try {
    await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1800);
    await ev(`document.getElementById("ce-sound").checked = false; document.getElementById("ce-type").checked = true; 0`);
    assert.strictEqual(await ev(`__ceWork.loadCho(${JSON.stringify(cho)}, "spelling-test.cho")`), true);
    await ev(`__ceWork.setTab(0); 0`); await ev(`document.getElementById("ce-nabc").focus(); 0`);
    await set("ce-nabc", 'M:4/4\nL:1/8\nK:A\n"A"A8 | "B7"^A2 B2 d2 ^f2 | "E"e8 | "A"a8 |'); await b.sleep(900); await ev(`document.getElementById("ce-nabc").blur(); 0`);
    let m = await mel(); assert.deepStrictEqual(m[1], [[70, "A#"], [71, ""], [74, ""], [78, "F#"]], "the typed spellings are kept on the notes: " + JSON.stringify(m[1]));
    let sc = await ev(`__ceWork.scoreText()`); assert(/"B7"\^A2 B2 d2 f2/.test(sc) && !/_B/.test(sc), "the notation keeps ^A: " + sc);
    assert(/"B7"\^A2/.test(await val("ce-nabc")), "the notes box keeps ^A: " + await val("ce-nabc"));
    // saved and read back
    const saved = await ev(`window.__ceChordPro()`); assert(/"B7"\^A2/.test(saved) && !/_B/.test(saved), saved);
    assert.strictEqual(await ev(`__ceWork.loadCho(${JSON.stringify(saved)}, "spelling-test.cho")`), true); await b.sleep(600);
    sc = await ev(`__ceWork.scoreText()`); assert(/"B7"\^A2 B2/.test(sc) && !/_B/.test(sc), "after the reload: " + sc);
    // a note with no typed spelling (the same pitch played, not typed) takes the chord's: A# when it climbs to B, Bb when it falls to A
    const abc = await ev(`(function(){ var g = __entry.grid(), x = g.melody().map(function(b){ return (b || []).map(function(n){ return { pos: n.pos, dur: n.dur, midi: n.midi, tie: n.tie }; }); });
      x[1] = [70, 71, 74, 78].map(function(m, i){ return { pos: i * 2, dur: 2, midi: m }; }); g.setMelody(x); return g.toAbc({ key: "A" }); })()`);
    assert(/"B7"\^A2 B2 d2 f2/.test(abc), abc);
    assert(/"B7"_B2 A2/.test(await ev(`(function(){ var g = __entry.grid(), x = g.melody(); x[1] = [70, 69].map(function(m, i){ return { pos: i * 2, dur: 2, midi: m }; }); g.setMelody(x); return g.toAbc({ key: "A" }); })()`)), "falling to A it is Bb");
    console.log("SPELLING UI OK");
  } catch (e) { console.log("FAIL", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
