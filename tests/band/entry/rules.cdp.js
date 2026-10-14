// The Notation Rules page: presets, a take log, what-if settings, and the hand-off from Chord Entry. Run from tests/band/lead, server on 8500
// (render tools/notation-rules.qmd and tools/chord-entry.qmd into the test site):   node ../entry/rules.cdp.js    ("RULES PAGE OK")
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1600 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const val = id => ev(`document.getElementById("${id}").value`), text = id => ev(`document.getElementById("${id}").textContent`);
  const set = (id, v) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${v}"; e.dispatchEvent(new Event("input", { bubbles:true })); e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const click = id => ev(`document.getElementById("${id}").click(); 0`);
  const errs = () => b.errors.filter(e => !/supabase/i.test(e));
  const music = async () => (await text("nr-abc")).split("\n").slice(5).join(" ");
  try {
    await b.goto(B + "/tools/notation-rules.html"); await b.sleep(1200);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    // the numbers in the rules are the engine's
    assert.strictEqual(await ev(`document.querySelector('[data-rule="gap"]').textContent`), "0.75"); assert.strictEqual(await ev(`document.querySelector('[data-rule="ticks"]').textContent`), "16, 12, 8, 6, 4, 3, 2, 1");
    assert((await ev(`document.querySelectorAll("#nr-qualities tr").length`)) > 20, "the chord table is filled");
    // preset 0: swung eighths written straight
    assert.strictEqual(await music(), "FG AB c4 |]"); assert.strictEqual(await ev(`document.querySelectorAll("#nr-roll svg rect").length > 5`), true, "the roll is drawn");
    assert.strictEqual(await ev(`document.querySelectorAll("#nr-t-notes tr").length`), 6, "a row for each of the five notes");
    assert(/legato/.test(await text("nr-t-notes")), "the length rule is named");
    // every preset runs; the ones that show one rule are checked against the writing the rule calls for
    const ids = await ev(`JSON.stringify(__nr.presets.map(function(p){ return p.id; }))`).then(JSON.parse); const out = {};
    for (let i = 0; i < ids.length; i++){ await set("nr-preset", String(i)); out[ids[i]] = await music(); assert.deepStrictEqual(errs(), [], "page errors in preset " + ids[i] + ": " + errs().join(" | ")); }
    console.log(JSON.stringify(out));
    assert.strictEqual(out.chords, '"F7"z2 "Bb7"z2 | "Cm7"z4 |]', "the chords preset");
    assert(/\[M:3\/4\]/.test(out.pedal), "the pedal preset has a 3/4 bar: " + out.pedal);
    assert.strictEqual(out.split, '"C7"c2 d2 e4 | "F7"f8 |]', "the split preset");
    assert(/^\[CEG\]/.test(out.together), "the together preset writes a chord: " + out.together);
    assert.strictEqual(out.sync, 'C2 DE- EF G2 |]', "the syncopation preset");
    assert.strictEqual(out.detached, '.C2 .D2 .E2 .F2 | .G2 .A2 .B2 .c2 |]', "the staccato preset");
    assert(/^\{\/D\}_E2/.test(out.grace), "the grace preset: " + out.grace);
    assert(/^\(3CDE/.test(out.triplets), "the triplets preset: " + out.triplets);
    assert(/\[CE\]/.test(out.thirds) && /\[DF\]/.test(out.thirds) && /\[EG\]/.test(out.thirds), "the thirds preset: " + out.thirds);
    assert(/^z C DE \| F2 G2 A4/.test(out.pickup), "the pickup preset: " + out.pickup);
    assert.strictEqual(await ev(`document.querySelectorAll("#nr-t-bars tr").length`), 3, "the pickup preset has two bars and a header");
    // the notation draws all of them (abcjs takes the brackets, graces and staccato marks)
    for (const id of ["sync", "detached", "grace", "triplets", "thirds", "pickup"]){ await set("nr-preset", String(ids.indexOf(id))); await b.sleep(150);
      assert.strictEqual(await ev(`document.querySelectorAll("#nr-score svg .abcjs-note, #nr-score svg .abcjs-rest").length > 3`), true, "the notation is drawn for " + id); }
    // "what did I mean?": the staccato take offers staccato's inverse, and the eighth-rest take offers staccato
    await set("nr-preset", String(ids.indexOf("legato")));
    // a log from the engine, loaded back; a what-if on the same playing
    await set("nr-preset", String(ids.indexOf("together"))); const logText = await val("nr-log"); await set("nr-preset", "0"); await ev(`document.getElementById("nr-log").value = ${JSON.stringify(logText)}; 0`); await click("nr-load");
    assert.strictEqual(await val("nr-preset"), "log"); assert.strictEqual(await ev(`document.getElementById("nr-tempo").disabled`), true);
    assert(/^\[CEG\]/.test(await music()));
    await ev(`document.getElementById("nr-poly").checked = false; document.getElementById("nr-poly").dispatchEvent(new Event("change")); 0`); assert(!/^\[CEG\]/.test(await music()), "turning chords-in-melody off writes the top note: " + await music());
    assert(/left out/.test(await text("nr-t-notes")), "the notes left out are listed");
    await click("nr-load");   // (back to the log's own settings)
    // a bad log says so
    await ev(`document.getElementById("nr-log").value = "not json"; 0`); await click("nr-load"); assert(/not valid JSON/.test(await text("nr-say")));
    // from Chord Entry: the log of a real take goes over
    await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1000);
    await ev(`document.getElementById("ce-sound").checked = false; document.getElementById("ce-type").checked = true; 0`); await set("ce-key", "F"); await set("ce-mode", "melody"); await set("ce-mwith", "click"); await set("ce-mbars", "1"); await set("ce-mfeel", "straight");
    await click("ce-mrec"); const t0 = Date.now(); while (!(await ev(`!!__entry.take()`))){ if (Date.now() - t0 > 5000) throw new Error("take never started"); await b.sleep(30); }
    await ev(`(function(){ var n = [[0, 65], [1, 67], [2, 69]], on = [], off = [], iv = setInterval(function(){ var t = __entry.take(); if (!t) return; n.forEach(function(x, i){ if (!on[i] && t.beat >= x[0]){ on[i] = 1; __entry.on(x[1], 0.7, performance.now()); } if (on[i] && !off[i] && t.beat >= x[0] + 0.8){ off[i] = 1; __entry.off(x[1], performance.now()); } }); }, 4); })()`);
    const t1 = Date.now(); while (!/^Wrote \d+ notes?/.test(await text("ce-note"))){ if (Date.now() - t1 > 15000) throw new Error("take never ended: " + await text("ce-note")); await b.sleep(50); }
    assert.strictEqual(await ev(`document.getElementById("ce-log").hidden`), false); const chordAbc = (await val("ce-abc")).split("\n").slice(5).join(" ");
    await click("ce-log-open"); await b.sleep(500);
    await b.goto(B + "/tools/notation-rules.html?from=chord-entry"); await b.sleep(1200);
    assert.strictEqual(await val("nr-preset"), "log", "the page opened on the take"); assert.strictEqual(await music(), chordAbc, "the Rules page writes what Chord Entry wrote: " + await music() + " vs " + chordAbc);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    console.log("RULES PAGE OK");
  } catch (e) { console.log("FAIL", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
