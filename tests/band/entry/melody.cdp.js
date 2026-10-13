// The Chord Entry page: a melody played along with the band, written as eighth notes. Run from tests/band/lead, server on 8500:
//   node ../entry/melody.cdp.js        ("MELODY UI OK")
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1400 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const val = id => ev(`document.getElementById("${id}").value`), text = id => ev(`document.getElementById("${id}").textContent`);
  const set = (id, v) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${v}"; e.dispatchEvent(new Event("input", { bubbles:true })); e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const click = id => ev(`document.getElementById("${id}").click(); 0`);
  const errs = () => b.errors.filter(e => !/supabase/i.test(e));
  const play = ms => ev(`(function(){ var t = performance.now(), m = ${JSON.stringify(ms)}; m.forEach(function(x, i){ __entry.on(x, 0.7, t + i); }); m.forEach(function(x, i){ __entry.off(x, t + 200 + i); }); })()`);
  const until = async (id, re, ms) => { const t = Date.now(); let s = ""; while (Date.now() - t < ms){ s = await text(id); if (re.test(s)) return s; await b.sleep(30); } throw new Error("never saw " + re + " in " + id + ": " + s); };
  try {
    await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1200);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    await ev(`document.getElementById("ce-sound").checked = false; 0`); await set("ce-key", "F"); await set("ce-tempo", "120");
    await click("ce-mode"); await set("ce-mode", "melody");
    assert.strictEqual(await ev(`document.getElementById("ce-melody").hidden`), false); assert.strictEqual(await val("ce-mfeel"), "swing", "a jazz style reads the melody as swung");
    await click("ce-mrec"); assert(/Enter the chords first/.test(await text("ce-note")), await text("ce-note"));
    await set("ce-mode", "step"); await play([53, 57, 60, 63]); await play([46, 50, 53, 56]); await set("ce-mode", "melody");
    // play F G A Bb C D E F, swung, in bar 1, then a held C over bar 2; each note is struck when the band reaches its beat
    await click("ce-mrec"); await until("ce-status", /bar 1$/, 25000);
    const notes = [[65, 0, 0.5], [67, 0.67, 1.3], [69, 1, 1.5], [70, 1.67, 2.3], [72, 2, 2.5], [74, 2.67, 3.3], [76, 3, 3.5], [77, 3.67, 3.95], [72, 4.5, 7.5]];
    await ev(`(function(){ var n = ${JSON.stringify(notes)}, on = [], off = [], iv = setInterval(function(){ var w = __entry.where(); if (w == null) return;
      n.forEach(function(x, i){ if (!on[i] && w >= x[1]){ on[i] = 1; __entry.on(x[0], 0.7, performance.now()); } if (on[i] && !off[i] && w >= x[2]){ off[i] = 1; __entry.off(x[0], performance.now()); } });
      if (off[n.length - 1]) clearInterval(iv); }, 4); })()`);
    await until("ce-note", /^Wrote \d+ notes?/, 20000);
    const abc = await val("ce-abc"); const music = abc.split("\n").slice(5).join(" ");
    console.log(music);
    assert.strictEqual(music, '"F7"FG AB cd ef | "Bb7"z c6 z |]', "swung eighths are written as eight even eighths (B is Bb in F), then a held C");
    assert.strictEqual(await ev(`document.querySelectorAll("#ce-score svg").length > 0`), true, "the notation is drawn");
    assert.strictEqual(await ev(`document.getElementById("ce-score").innerHTML.length > 500`), true);
    // the chart is unchanged and the melody goes with the ABC
    assert.strictEqual(await ev(`document.querySelectorAll("#ce-chart .tc-bar[data-bar]").length`), 2);
    assert(/"F7"FG AB cd ef/.test(await ev(`window.__ceChordPro()`)), "ChordPro carries the notes");
    await click("ce-mundo"); assert.strictEqual(await ev(`document.getElementById("ce-score").innerHTML`), "", "undo takes the take back");
    assert.strictEqual((await val("ce-abc")).split("\n").slice(5).join(" "), '"F7"z4 | "Bb7"z4 |]');
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    console.log("MELODY UI OK");
  } catch (e) { console.log("FAIL", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
