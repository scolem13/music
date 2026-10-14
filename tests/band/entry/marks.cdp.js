// The Chord Entry page keeps the band's marks in a ChordPro grid (half, ballad, normal, fill, stop, rit, plain) on the bars the band plays,
// through a |: :| repeat, a section that borrows the bars of the one before, and a tune with chords and no grid. Then the
// lyrics site's O Hanukkah when it is on this machine. Run from tests/band/lead, server on 8500:
//   node ../entry/marks.cdp.js        ("ENTRY MARKS OK")
const { launch } = require("../lead/cdp.js"); const assert = require("assert"), fs = require("fs"), os = require("os"), path = require("path");
(async () => { const b = await launch({ width: 1400, height: 900 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const errs = () => b.errors.filter(e => !/supabase/i.test(e));
  // what the band is given, bar by bar: "h" half, "b" half with the ballad piano, "F" / "f" / "L" a fill (medium / small / large), "s" stop, "r" rit., "p" plain, "." none
  const form = () => ev(`BandHarmony.buildForm(__entry.parsed(), 0).map(function(f){ return (f.feel === "half" ? (f.halfComp === "ballad" ? "b" : "h") : "") + (f.fill === "medium" ? "F" : f.fill === "small" ? "f" : f.fill === "large" ? "L" : "") + (f.stop ? "s" : "") + (f.rit ? "r" : "") + (f.plain ? "p" : "") || "."; }).join(" ")`);
  const cho = ["{title: Marks}", "{time: 4/4}", "{key: C}", "",
    "{comment: Verse 1}", "{start_of_grid}", "| C | half F | G fill:small | C |", "| normal Am | stop F | ballad G | C fill:big |", "{end_of_grid}", "[C]words", "",
    "{comment: Verse 2}", "[C]more words", "",
    "{comment: Bridge}", "{start_of_grid}", "|: half Dm | G7 :| rit C plain |", "{end_of_grid}", "[Dm]bridge", "",
    "{comment: Tag}", "{start_of_abc}", "M:4/4", "L:1/4", "K:C", '"^half time""C"z4 | "^fill""G"z4 |', "{end_of_abc}", ""].join("\n");
  try {
    await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1800);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    await ev(`document.getElementById("ce-sound").checked = false; document.getElementById("ce-type").checked = true; 0`);
    assert.strictEqual(await ev(`__ceWork.loadCho(${JSON.stringify(cho)}, "marks.cho")`), true);
    assert.strictEqual(await form(), [". h hf h", ". s b bL", ". h hf h", ". s b bL", "h h h h hrp", "h F"].join(" "));
    // a chord changed by hand: the grid is written out again and the marks are still on their bars
    await ev(`__entry.grid().setCursor(0, 0); __entry.grid().put("Em", "bar"); document.getElementById("ce-title").dispatchEvent(new Event("input")); 0`);
    await ev(`__ceWork.loadCho(${JSON.stringify(cho)}, "marks.cho"); 0`);
    // O Hanukkah: fills in the intro (4, 7, 8) and at the end of the interlude, half time in Verse 2 (8 bars) and the chorus (14 of 16)
    const song = path.join(os.homedir(), "Projects/carols/site/extra/o-hanukkah.cho");
    if (fs.existsSync(song)){
      assert.strictEqual(await ev(`__ceWork.loadCho(${JSON.stringify(fs.readFileSync(song, "utf8"))}, "o-hanukkah.cho")`), true);
      const f = (await form()).split(" "), at = (a, n) => f.slice(a, a + n).join(" ");
      assert.strictEqual(f.length, 8 + 16 + 24 + 16 + 16);
      assert.strictEqual(at(0, 8), ". . . F . . F F");
      assert.strictEqual(at(8, 16), Array(16).fill(".").join(" "));
      assert.strictEqual(at(24, 8), Array(8).fill("h").join(" ")); assert.strictEqual(at(32, 16), Array(16).fill(".").join(" "));
      assert.strictEqual(at(48, 16), Array(14).fill("h").concat([".", "."]).join(" "));
      assert.strictEqual(at(64, 16), Array(13).fill(".").concat(["F", "F", "F"]).join(" "));
      const nm = await ev(`__entry.grid().melody().filter(function(x){ return x && x.length; }).length`); console.log("bars with notes", nm); assert.ok(nm >= 40, "the melody came with it");
      console.log("O Hanukkah checked");
    }
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    console.log("ENTRY MARKS OK");
  } catch (e) { console.error(e); process.exitCode = 1; } finally { await b.close(); }
})();
