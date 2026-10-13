// A tune sent to Chord Entry from another page (#from=tune&d=...): the chords load and the page is set to record the
// melody against the band. Run from tests/band/lead, server on 8500:   node ../entry/tune-link.cdp.js
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1400 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const val = id => ev(`document.getElementById("${id}").value`), text = id => ev(`document.getElementById("${id}").textContent`);
  const errs = () => b.errors.filter(e => !/supabase/i.test(e));
  const link = d => B + "/tools/chord-entry.html#from=tune&d=" + encodeURIComponent(JSON.stringify(d));
  try { 
    // what the lyrics site's Band panel sends: P: sections, four bars to a line
    const abc = ["X:1", "T:Deck The Halls", "M:4/4", "L:1/8", "K:D", "P:Intro", '"D"z8 | "G"z8 | "D"z8 | "A7"z8 |',
      "P:Verse 1", '"D"z8 | "Bm"z8 | "A7"z4 "D"z4 | "A"z4 "D"z4 |'].join("\n");
    await b.goto(link({ abc, title: "Deck The Halls", tempo: 112, style: "carol", have: 4, total: 8 })); await b.sleep(1500);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    assert.strictEqual(await val("ce-mode"), "melody"); assert.strictEqual(await val("ce-mwith"), "band");
    assert.strictEqual(await val("ce-key"), "D"); assert.strictEqual(await val("ce-tempo"), "112"); assert.strictEqual(await val("ce-title"), "Deck The Halls");
    assert.strictEqual(await ev(`document.getElementById("ce-melody").hidden`), false, "the melody row is showing");
    assert.strictEqual(await ev(`document.querySelectorAll("#ce-chart .tc-bar[data-bar]").length`), 8);
    const note = await text("ce-note"); assert(/Loaded 8 bars of Deck The Halls\. It has the melody for 4 of its 8 bars\./.test(note), note);
    assert.strictEqual(await ev(`location.hash`), "", "the link is not left in the address");
    // a broken link says so and leaves the page as it was
    await b.goto("about:blank"); await b.goto(B + "/tools/chord-entry.html#from=tune&d=%7Bnope"); await b.sleep(800);
    assert(/didn't come through/.test(await text("ce-note")), await text("ce-note")); assert.strictEqual(await val("ce-mode"), "step");
    console.log("TUNE LINK OK");
  } catch (e) { console.log("FAIL", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
