// The chord-change lessons (lessons/pop-changes.qmd, four-chord-loops.qmd, and the staff in blues-changes.qmd): every chart has a grand staff
// under it (LessonChordStaff), the band lights the sounding bar on both, the key menu respells them, the builder and the ear test redraw them.
// Run from tests/band/lead with the test server on port 8500 (render the lessons into the test site first).
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1200 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  try {
    for (const [page, n] of [["pop-changes", 6], ["four-chord-loops", 9], ["blues-changes", 9]]) {
      await b.goto(B + "/lessons/" + page + ".html"); await b.sleep(1500);
      await ev(`window.__err = []; window.addEventListener("error", function(e){ __err.push(e.message); }); 0`);
      assert.strictEqual(await ev(`document.querySelectorAll(".bl-staff svg").length`), n, page + ": a staff under every chart");
      // the key menu: every staff is drawn again, in the new key's signature
      await ev(`var k = document.getElementById("bl-key"); k.value = 7; k.dispatchEvent(new Event("change")); 0`);
      assert.strictEqual(await ev(`document.querySelectorAll(".bl-staff svg").length`), n);
      // play: the sounding bar is lit on the chart and on the staff
      await ev(`document.querySelector(".bl-step .btn").click(); 0`);
      const t = Date.now(); let lit = 0; while (Date.now() - t < 12000 && !lit) { await b.sleep(250); lit = await ev(`document.querySelectorAll(".bl-step .tc-live").length && document.querySelectorAll(".bl-step .ls-on").length`); }
      assert.ok(lit > 0, page + ": the bar lights on the staff");
      assert.deepStrictEqual(await ev(`__err`), [], page + ": no errors");
    }
    // the ii-V bar is drawn tight, so that its numerals do not run together
    await b.goto(B + "/lessons/pop-changes.html"); await b.sleep(1500);
    assert.ok(await ev(`document.querySelectorAll('[data-step="twofive"] .tc-tight').length >= 3`));
    // the spelling: F#dim is F# A C, with the bass note F#
    assert.ok(await ev(`LessonChordStaff.abc(["F#dim"], { tonic: 0 }).indexOf('"F#dim"[^FAc]4') >= 0`));
    console.log("CHORD LESSONS OK");
  } catch (e) { console.log("FAIL", e.message); process.exitCode = 1; } finally { b.close && b.close(); }
})();
