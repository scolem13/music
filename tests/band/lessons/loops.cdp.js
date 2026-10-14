// The chord-change lessons (lessons/pop-changes.qmd, four-chord-loops.qmd, and the staff in blues-changes.qmd): every chart has a grand staff
// under it (LessonChordStaff), the band lights the sounding bar on both, the key menu respells them, the builder and the ear test redraw them.
// Run from tests/band/lead with the test server on port 8500 (render the lessons into the test site first).
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1200 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  try {
    for (const [page, n] of [["pop-changes", 6], ["four-chord-loops", 9], ["blues-changes", 9], ["cadences", 7], ["guide-tones", 7], ["minor-changes", 6], ["borrowed-chords", 6], ["turnarounds", 7], ["reharmonize", 5], ["pop-changes-guitar", 4], ["pop-changes-piano", 4], ["pop-changes-bass", 4]]) {
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
    // the ear tests: a question, an answer, a verdict and the chart revealed
    for (const [page, host] of [["cadences", "bl-quiz"], ["cadences", "bl-quiz2"], ["minor-changes", "bl-quiz"], ["borrowed-chords", "bl-quiz"], ["turnarounds", "bl-quiz"]]) {
      await b.goto(B + "/lessons/" + page + ".html"); await b.sleep(1500);
      await ev(`document.querySelector("#${host} .btn-primary").click(); 0`); await b.sleep(500);
      await ev(`document.querySelector("#${host} .bl-answers .btn").click(); 0`);
      assert.ok(await ev(`document.querySelector("#${host} .bl-verdict").textContent.length > 0 && document.querySelector("#${host} .tune-chart") !== null`), page + " " + host);
    }
    // guide tones: the staff shows one note for each chord
    await b.goto(B + "/lessons/guide-tones.html"); await b.sleep(1500);
    assert.strictEqual(await ev(`document.querySelectorAll('[data-step="guide"] .bl-staff .abcjs-note').length`), 4);
    // the instrument lessons draw a diagram for each distinct chord
    await b.goto(B + "/lessons/pop-changes-guitar.html"); await b.sleep(1500);
    assert.ok(await ev(`document.querySelectorAll('[data-step="basic"] .bl-boards svg').length === 4`));
    // "show one chord at a time": off by default; on, only the first bar's chord shows, and the sounding bar's chord follows the band
    const vis = `[...document.querySelectorAll('[data-step="basic"] .bl-boards .bl-card')].filter(c => !c.hidden).length`;
    assert.strictEqual(await ev(vis), 4);
    await ev(`document.querySelector('[data-step="basic"] .bl-one').click(); 0`);
    assert.strictEqual(await ev(vis), 1);
    assert.strictEqual(await ev(`document.querySelector('[data-step="basic"] .bl-one').getAttribute("aria-pressed")`), "true");
    assert.ok(await ev(`(() => { const st = document.querySelector('[data-step="basic"]'); const v = st.querySelector(".bl-boards .bl-card:not([hidden])"); return v && v.getAttribute("data-sym") === document.querySelectorAll('[data-step="basic"] .bl-boards .bl-card')[0].getAttribute("data-sym"); })()`));
    await ev(`document.querySelector('[data-step="basic"] .bl-one').click(); 0`);
    assert.strictEqual(await ev(vis), 4);
    // the ii-V bar is drawn tight, so that its numerals do not run together
    await b.goto(B + "/lessons/pop-changes.html"); await b.sleep(1500);
    assert.ok(await ev(`document.querySelectorAll('[data-step="twofive"] .tc-tight').length >= 3`));
    // the spelling: F#dim is F# A C, with the bass note F#
    assert.ok(await ev(`LessonChordStaff.abc(["F#dim"], { tonic: 0 }).indexOf('"F#dim"[^FAc]4') >= 0`));
    console.log("CHORD LESSONS OK");
  } catch (e) { console.log("FAIL", e.message); process.exitCode = 1; } finally { b.close && b.close(); }
})();
