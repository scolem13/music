// The Melody tab of the Backing Track page. Run from tests/band/lead, server on 8500 (render tools/backing-track.qmd into the test site):
//   node ../entry/melody-bt.cdp.js        ("MELODY TAB OK")
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1400 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const val = id => ev(`document.getElementById("${id}").value`), text = id => ev(`document.getElementById("${id}").textContent`);
  const set = (id, v) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${v}"; e.dispatchEvent(new Event("input", { bubbles:true })); e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const click = id => ev(`document.getElementById("${id}").click(); 0`);
  const errs = () => b.errors.filter(e => !/supabase/i.test(e));
  const until = async (fn, ms, what) => { const t = Date.now(); let s; while (Date.now() - t < ms){ s = await fn(); if (s) return s; await b.sleep(30); } throw new Error("never: " + what); };
  try {
    await b.goto(B + "/tools/backing-track.html"); await b.sleep(1500);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    assert.strictEqual(await ev(`!!document.getElementById("dxa-tab-melody")`), true, "there is a Melody tab");
    await click("dxa-tab-melody"); assert.strictEqual(await ev(`document.getElementById("bt-melody").open && !document.getElementById("dxa-pane-melody").hidden`), true);
    await ev(`document.getElementById("bt-mel-sound").checked = false; 0`);
    // the changes: a two-bar F blues start, in 4/4, swing
    await ev(`(function(){ var t = document.getElementById("bt-abc"); t.value = 'X:1\\nT:Test\\nM:4/4\\nL:1/8\\nK:F\\n"F7"z8 | "Bb7"z8 | "F7"z8 | "F7"z8 |]'; t.dispatchEvent(new Event("input", { bubbles:true })); })()`);
    await b.sleep(400); await set("bt-tempo-n", "160"); await set("bt-countin", "1");
    await click("bt-mel-rec"); assert.strictEqual(await ev(`__btMel.recording()`), true);
    const notes = [[65, 0, 0.5], [67, 0.67, 1.3], [69, 1, 1.5], [70, 1.67, 2.3], [72, 2, 2.5], [74, 2.67, 3.3], [76, 3, 3.5], [77, 3.67, 3.95], [72, 4.5, 7.5]];
    await ev(`(function(){ var n = ${JSON.stringify(notes)}, on = [], off = [], iv = setInterval(function(){ var w = __btMel.where(); if (w == null) return;
      n.forEach(function(x, i){ if (!on[i] && w >= x[1]){ on[i] = 1; __btMel.on(x[0], 0.7, performance.now()); } if (on[i] && !off[i] && w >= x[2]){ off[i] = 1; __btMel.off(x[0], performance.now()); } });
      if (off[n.length - 1]) clearInterval(iv); }, 4); })()`);
    await until(async () => (await ev(`__btMel.where()`)) > 7.6, 20000, "the band reaching bar 2's end");
    await click("bt-mel-rec"); await until(async () => !(await ev(`__btMel.recording()`)), 5000, "recording stops");
    await until(async () => /^Wrote \d+ notes?/.test(await text("bt-mel-note")), 5000, "written: " + await text("bt-mel-note"));
    const abc = await ev(`document.getElementById("bt-mel-score").getAttribute("data-abc")`); console.log(abc.split("\n").slice(5).join(" "));
    assert(/"F7"F G A B c d e f \| "Bb7"z c6 z \|/.test(abc), "even eighths in bar 1, the held C in bar 2: " + abc);
    await until(() => ev(`document.querySelectorAll("#bt-mel-score svg").length > 0`), 8000, "notation drawn");
    assert.strictEqual(await ev(`document.getElementById("bt-mel-out").hidden`), false);
    // the chord chart and the ABC box are untouched
    assert(/"F7"z8 \| "Bb7"z8/.test(await val("bt-abc")), "the ABC box is unchanged: " + await val("bt-abc"));
    // removed, then back by undo
    await click("bt-mel-clear"); assert.strictEqual(await ev(`document.getElementById("bt-mel-score").innerHTML`), ""); await click("bt-mel-undo");
    assert.strictEqual(await ev(`__btMel.mel()[0].length`), 8);
    // the key menu moves the melody with the changes
    await set("bt-key", "G"); const g = await ev(`__btMel.mel()[0][0].midi`); assert.strictEqual(g, 67 + 0 + 0, "F to G is two semitones up: 65 -> 67");
    // a different number of bars drops it
    await ev(`(function(){ var t = document.getElementById("bt-abc"); t.value = 'X:1\\nT:Test\\nM:4/4\\nL:1/8\\nK:G\\n"G7"z8 |]'; t.dispatchEvent(new Event("input", { bubbles:true })); })()`); await b.sleep(500);
    assert.strictEqual(await ev(`__btMel.mel().length`), 0); assert(/different number of bars/.test(await text("bt-mel-note")));
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    console.log("MELODY TAB OK");
  } catch (e) { console.log("FAIL", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
