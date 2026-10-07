// Chord entry on the Backing Track page: one chord at a time, and in time with the drums.
// Run from tests/band/lead, server on 8500:   node ../entry/entry.cdp.js
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1400 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const val = id => ev(`document.getElementById("${id}").value`), text = id => ev(`document.getElementById("${id}").textContent`);
  const set = (id, v) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${v}"; e.dispatchEvent(new Event("input", { bubbles:true })); e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const errs = () => b.errors.filter(e => !/supabase/i.test(e));
  const click = id => ev(`document.getElementById("${id}").click(); 0`);
  // press the notes one after another, then lift them all
  const play = ms => ev(`(function(){ var t = performance.now(), m = ${JSON.stringify(ms)}; m.forEach(function(x, i){ __btEntry.on(x, 0.7, t + i); }); m.forEach(function(x, i){ __btEntry.off(x, t + 200 + i); }); })()`);
  const music = async () => (await val("bt-abc")).split("\n").slice(5).join(" ");
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/tools/backing-track.html"); await b.sleep(1200);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    await ev(`document.getElementById("bt-entry").open = true; document.getElementById("bt-en-sound").checked = false; 0`);
    assert.strictEqual(await ev(`Array.prototype.map.call(document.getElementById("bt-en-span").options, function(o){ return o.value; }).join(" ")`), "bar two half beat");
    assert.strictEqual(await ev(`document.getElementById("bt-en-keys").children.length`), 25);
    // ---- one chord at a time: the first chord starts new changes (the blues that was loaded goes) ----
    await play([53, 57, 60, 63]); await play([46, 50, 53, 56]);
    assert.strictEqual(await music(), '"F7"z4 | "Bb7"z4 |]'); assert.strictEqual(await val("bt-changes"), "custom"); assert.strictEqual(await val("bt-en-bar"), "3");
    assert(/^Bb7 .*bar 2/.test(await text("bt-en-heard")), await text("bt-en-heard"));
    assert.strictEqual(await ev(`document.querySelectorAll("#bt-chart .tc-bar, #bt-chart [data-bar]").length >= 2`), true);
    await set("bt-en-span", "half"); await play([48, 51, 55, 58]); await play([53, 57, 63]);
    assert.strictEqual(await music(), '"F7"z4 | "Bb7"z4 | "Cm7"z2 "F7"z2 |]');
    await click("bt-en-back"); assert.strictEqual(await music(), '"F7"z4 | "Bb7"z4 | "Cm7"z4 |]');
    await click("bt-en-hold"); await set("bt-en-span", "bar"); await click("bt-en-hold");
    assert.strictEqual(await music(), '"F7"z4 | "Bb7"z4 | "Cm7"z4 | z4 |]'); assert.strictEqual(await val("bt-en-bar"), "5");
    // a bar number replaces that bar; inversions as slash chords; one note is not a chord
    await set("bt-en-bar", "2"); await ev(`document.getElementById("bt-en-slash").checked = true; 0`); await play([50, 53, 58]);
    assert.strictEqual(await music(), '"F7"z4 | "Bb/D"z4 | "Cm7"z4 | z4 |]');
    await play([60]); assert(/at least two/.test(await text("bt-en-heard")));
    // the key spells the roots
    await set("bt-key", "E"); await b.sleep(100); await click("bt-en-clear"); await play([54, 58, 61]);
    assert(/"F#"z4 \|\]$/.test(await music()), await music()); assert(/^K:E$/m.test(await val("bt-abc")));
    // the on-screen keys
    await click("bt-en-clear");
    for (const m of [52, 56, 59]) await ev(`document.querySelector('#bt-en-keys [data-midi="${m}"]').click(); 0`);
    assert(/E$/.test(await text("bt-en-heard")), await text("bt-en-heard")); await click("bt-en-enter");
    assert.strictEqual(await music(), '"E"z4 |]'); assert.strictEqual(await ev(`document.querySelectorAll("#bt-en-keys .is-on").length`), 0);
    // picking other changes makes the next chord start again at bar 1
    await set("bt-changes", "basic"); await set("bt-key", "F"); await play([53, 57, 60]); assert.strictEqual(await music(), '"F"z4 |]');
    // "add to the changes above"
    await set("bt-changes", "basic"); await click("bt-en-load"); assert.strictEqual(await val("bt-en-bar"), "13"); await play([48, 52, 55, 58]);
    assert.strictEqual((await music()).split("|").length - 1, 13); assert(/"C7"z4 \|\]$/.test(await music()));

    // ---- in time: two bars at 240, a click, snapped to the bar ----
    await set("bt-en-mode", "live"); assert.strictEqual(await ev(`document.getElementById("bt-en-step").hidden + "|" + document.getElementById("bt-en-live").hidden`), "true|false");
    await set("bt-tempo-n", "240"); await set("bt-en-bars", "2"); await set("bt-en-quant", "bar"); await set("bt-en-with", "click"); await set("bt-countin", "1");
    await play([53, 57, 60]); assert(/press Record/.test(await text("bt-en-heard")));
    await click("bt-en-rec");
    const hit = (ms) => ev(`(function(){ var t = performance.now(), m = ${JSON.stringify(ms)}; m.forEach(function(x){ __btEntry.on(x, 0.7, t); }); setTimeout(function(){ m.forEach(function(x){ __btEntry.off(x, performance.now()); }); }, 150); })()`);
    const until = async (re, ms) => { const t = Date.now(); let s = ""; while (Date.now() - t < ms){ s = await text("bt-status"); if (re.test(s)) return s; await b.sleep(30); } throw new Error("never saw " + re + "; last status: " + s); };
    await until(/bar 1$/, 25000); assert.strictEqual(await ev(`__btEntry.recording()`), true); assert.strictEqual(await music(), "z4 | z4 |]");
    await hit([53, 57, 60, 63]); await until(/bar 2$/, 3000); await hit([46, 50, 53]);
    const t0 = Date.now(); while (await ev(`__btEntry.recording()`)){ if (Date.now() - t0 > 6000) throw new Error("the take never ended"); await b.sleep(100); }
    assert.strictEqual(await music(), '"F7"z4 | "Bb"z4 |]'); assert(/Recorded 2 chords over 2 bars/.test(await text("bt-en-note")), await text("bt-en-note"));
    assert(/Record$/.test(await text("bt-en-rec")));
    // the band is back as the page has it: Play plays the new changes with the bass in
    await ev(`window.__n = 0; 0`); await click("bt-play"); await until(/bar 1$/, 8000); await b.sleep(400); await click("bt-play");
    assert.strictEqual(await val("bt-choruses"), "0");
    // stopping a take early keeps what was played
    await set("bt-en-bars", "8"); await click("bt-en-rec"); await until(/bar 1$/, 8000); await hit([55, 59, 62]); await b.sleep(300); await click("bt-en-rec"); await b.sleep(200);
    assert.strictEqual(await ev(`__btEntry.recording()`), false); assert(/^"G"z4 \| z4 \|/.test(await music()), await music());
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    console.log("ENTRY UI OK");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
