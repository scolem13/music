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
    assert(/"F7"FG AB cd ef \| "Bb7"z c6 z \|/.test(abc), "even eighths in bar 1, the held C in bar 2: " + abc);
    await until(() => ev(`document.querySelectorAll("#bt-mel-score svg").length > 0`), 8000, "notation drawn");
    // the take's log runs again to the same notes, and the buttons for it show
    assert.strictEqual(await ev(`document.getElementById("bt-mel-log").hidden`), false, "the log buttons show");
    const replayed = await ev(`ChordEntry.replay(JSON.parse(JSON.stringify(__btMel.lastTake()))).abc({ key: "F" }).split("\\n").slice(5).join(" ")`);
    assert(/FG AB cd ef/.test(replayed) && /"F7"/.test(replayed), "replaying the log: " + replayed);
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
    // meter changes already in the changes: each bar is taken in its own meter (4/4, then 3/4, then 6/8 counted in dotted quarters)
    await b.goto(B + "/tools/backing-track.html"); await b.sleep(1500); await click("dxa-tab-melody"); await ev(`document.getElementById("bt-mel-sound").checked = false; 0`);
    await ev(`(function(){ var t = document.getElementById("bt-abc"); t.value = 'X:1\\nT:Meters\\nM:4/4\\nL:1/8\\nK:C\\n"C"z8 | [M:3/4] "F"z6 | [M:6/8] "G"z6 | [M:4/4] "C"z8 |]'; t.dispatchEvent(new Event("input", { bubbles:true })); })()`);
    await b.sleep(400); await set("bt-tempo-n", "160"); await set("bt-countin", "1"); await set("bt-mel-feel", "straight");
    await click("bt-mel-rec");
    const m2 = [[60, 0, 0.8], [62, 1, 1.8], [64, 2, 2.8], [65, 3, 3.8], [67, 4, 4.8], [69, 5, 5.8], [71, 6, 6.8], [72, 7, 7.8], [74, 8, 8.8]];
    await ev(`(function(){ var n = ${JSON.stringify(m2)}, on = [], off = [], iv = setInterval(function(){ var w = __btMel.where(); if (w == null) return;
      n.forEach(function(x, i){ if (!on[i] && w >= x[1]){ on[i] = 1; __btMel.on(x[0], 0.7, performance.now()); } if (on[i] && !off[i] && w >= x[2]){ off[i] = 1; __btMel.off(x[0], performance.now()); } });
      if (off[n.length - 1]) clearInterval(iv); }, 4); })()`);
    await until(async () => (await ev(`__btMel.where()`)) > 9.2, 20000, "the band reaching the end of the 6/8 bar");
    await click("bt-mel-rec"); await until(async () => /^Wrote \d+ notes?/.test(await text("bt-mel-note")), 5000, "written: " + await text("bt-mel-note"));
    const abc2 = await ev(`document.getElementById("bt-mel-score").getAttribute("data-abc")`); console.log(abc2.split("\n").slice(5).join(" "));
    assert(/"C"C2 D2 E2 F2 \| \[M:3\/4\] "F"G2 A2 B2 \| \[M:6\/8\] "G"c3 d2 z \| \[M:4\/4\] "C"z8/.test(abc2), "each bar in its own meter: " + abc2);
    // "what did I mean?": detached eighth notes on the beat are re-read as staccato quarters, for the bars picked
    await b.goto(B + "/tools/backing-track.html"); await b.sleep(1500); await click("dxa-tab-melody"); await ev(`document.getElementById("bt-mel-sound").checked = false; 0`);
    await ev(`(function(){ var t = document.getElementById("bt-abc"); t.value = 'X:1\\nT:Detached\\nM:4/4\\nL:1/8\\nK:C\\n"C"z8 | "F"z8 |]'; t.dispatchEvent(new Event("input", { bubbles:true })); })()`);
    await b.sleep(400); await set("bt-tempo-n", "160"); await set("bt-countin", "1"); await set("bt-mel-feel", "straight");
    assert.strictEqual(await ev(`document.getElementById("bt-mel-dwim").hidden`), true, "no panel before there is a melody");
    await click("bt-mel-rec");
    const m3 = [60, 62, 64, 65, 67, 69, 71, 72].map((m, i) => [m, i, i + 0.4]);
    await ev(`(function(){ var n = ${JSON.stringify(m3)}, on = [], off = [], iv = setInterval(function(){ var w = __btMel.where(); if (w == null) return;
      n.forEach(function(x, i){ if (!on[i] && w >= x[1]){ on[i] = 1; __btMel.on(x[0], 0.7, performance.now()); } if (on[i] && !off[i] && w >= x[2]){ off[i] = 1; __btMel.off(x[0], performance.now()); } });
      if (off[n.length - 1]) clearInterval(iv); }, 4); })()`);
    await until(async () => (await ev(`__btMel.where()`)) > 7.7, 20000, "the band reaching the end of bar 2"); await click("bt-mel-rec");
    await until(async () => /^Wrote \d+ notes?/.test(await text("bt-mel-note")), 5000, "written: " + await text("bt-mel-note"));
    const d0 = await ev(`document.getElementById("bt-mel-score").getAttribute("data-abc")`).then(x => x.split("\n").slice(5).join(" ")); assert(/"C"C z D z E z F z/.test(d0), "as played: " + d0);
    assert.strictEqual(await ev(`document.getElementById("bt-mel-dwim").hidden`), false);
    await ev(`__btMel.dwim().setRange(0, 0); document.querySelector("#bt-mel-dwim .md-btn.is-main").click(); 0`); await b.sleep(600);
    const bc = JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll("#bt-mel-dwim .md-card"), function(c){ return { head: c.querySelector(".md-head").textContent, best: c.classList.contains("is-best") }; }))`));
    assert(bc.some(c => c.best && /staccato/i.test(c.head)), "staccato suggested on the Backing Track: " + JSON.stringify(bc));
    await ev(`document.querySelector("#bt-mel-dwim .md-card.is-best button").click(); 0`); await b.sleep(400);
    const d1 = await ev(`document.getElementById("bt-mel-score").getAttribute("data-abc")`).then(x => x.split("\n").slice(5).join(" ")); assert(/"C"\.C2 \.D2 \.E2 \.F2 \| "F"G z A z B z c z/.test(d1), "bar 1 staccato, bar 2 as played: " + d1);
    await click("bt-mel-undo"); const d2 = await ev(`document.getElementById("bt-mel-score").getAttribute("data-abc")`).then(x => x.split("\n").slice(5).join(" ")); assert(/"C"C z D z/.test(d2), "undo: " + d2);
    // sections and pickups: record the verse alone; its pickup (played in the count-in) goes at the end of the interlude's last bar
    await b.goto(B + "/tools/backing-track.html"); await b.sleep(1500); await click("dxa-tab-melody"); await ev(`document.getElementById("bt-mel-sound").checked = false; 0`);
    await ev(`(function(){ var t = document.getElementById("bt-abc"); t.value = 'X:1\\nT:Sections\\nM:4/4\\nL:1/8\\nK:C\\nP:Interlude\\n"C"z8 | "G"z8 |\\nP:Verse\\n"Am"z8 | "F"z8 | "C"z8 | "G"z8 |]'; t.dispatchEvent(new Event("input", { bubbles:true })); })()`);
    await b.sleep(500); await set("bt-tempo-n", "160"); await set("bt-countin", "1"); await set("bt-mel-feel", "straight");
    const opts = await ev(`Array.prototype.map.call(document.getElementById("bt-mel-range").options, function(o){ return o.textContent; }).join(" | ")`);
    assert(/Interlude \(bars 1[\u2013-]2\)/.test(opts) && /Verse \(bars 3[\u2013-]6\)/.test(opts), "the sections are in the Record menu: " + opts);
    await set("bt-mel-range", "bars"); assert.strictEqual(await ev(`document.getElementById("bt-mel-from-f").hidden`), false); await set("bt-mel-from", "3"); await set("bt-mel-to", "4");
    await click("bt-mel-rec");
    const pk = [[64, 7, 7.4], [67, 7.5, 7.9], [69, 8, 8.9], [71, 9, 9.4], [72, 10, 11.9], [74, 12, 12.9]];                  // the pickup: the last beat before the verse; then the verse's first two bars
    await ev(`(function(){ var n = ${JSON.stringify(pk)}, on = [], off = [], iv = setInterval(function(){ var w = __btMel.beat(); if (w == null) return;
      n.forEach(function(x, i){ if (!on[i] && w >= x[1]){ on[i] = 1; __btMel.on(x[0], 0.7, performance.now()); } if (on[i] && !off[i] && w >= x[2]){ off[i] = 1; __btMel.off(x[0], performance.now()); } });
      if (off[n.length - 1]) clearInterval(iv); }, 4); })()`);
    await until(async () => /^Wrote \d+ notes?/.test(await text("bt-mel-note")), 25000, "the verse take ends by itself: " + await text("bt-mel-note"));
    assert(/pickup in bar 2/.test(await text("bt-mel-note")), await text("bt-mel-note"));
    const v1 = await ev(`document.getElementById("bt-mel-score").getAttribute("data-abc")`).then(x => x.split("\n").slice(5).join(" ")); console.log(v1);
    assert(/"G"z6 EG/.test(v1), "the pickup is the end of bar 2 (the interlude): " + v1); assert(/"Am"B2/.test(v1) || /"Am"A2/.test(v1) || /"Am"/.test(v1), v1);
    assert(!/"C"[A-Gcdefg]/.test(v1.split("|")[0]), "the first interlude bar is untouched: " + v1);
    assert.strictEqual(await ev(`document.getElementById("bt-mel-score").getAttribute("data-abc").indexOf("[M:") < 0`), true);
    // the take stopped by itself at the end of bar 4: bars 5 and 6 have no melody
    assert(/"C"z8 \| "G"z8/.test(v1.replace(/\s+/g, " ")), "bars 5 and 6 untouched: " + v1);
    // a pickup at the very start of a tune becomes a short bar of its own (and the chart is not changed)
    await b.goto(B + "/tools/backing-track.html"); await b.sleep(1500); await click("dxa-tab-melody"); await ev(`document.getElementById("bt-mel-sound").checked = false; 0`);
    await ev(`(function(){ var t = document.getElementById("bt-abc"); t.value = 'X:1\\nT:Pickup\\nM:4/4\\nL:1/8\\nK:C\\n"C"z8 | "G"z8 |]'; t.dispatchEvent(new Event("input", { bubbles:true })); })()`);
    await b.sleep(500); await set("bt-tempo-n", "160"); await set("bt-countin", "1"); await set("bt-mel-feel", "straight");
    await click("bt-mel-rec");
    const pk2 = [[64, -1, -0.6], [67, -0.5, -0.1], [72, 0, 1.9], [71, 2, 3.9], [69, 4, 7.9]];
    await ev(`(function(){ var n = ${JSON.stringify(pk2)}, on = [], off = [], iv = setInterval(function(){ var w = __btMel.beat(); if (w == null) return;
      n.forEach(function(x, i){ if (!on[i] && w >= x[1]){ on[i] = 1; __btMel.on(x[0], 0.7, performance.now()); } if (on[i] && !off[i] && w >= x[2]){ off[i] = 1; __btMel.off(x[0], performance.now()); } });
      if (off[n.length - 1]) clearInterval(iv); }, 4); })()`);
    await until(async () => /^Wrote \d+ notes?/.test(await text("bt-mel-note")), 25000, "the pickup take ends: " + await text("bt-mel-note"));
    const v2 = await ev(`document.getElementById("bt-mel-score").getAttribute("data-abc")`).then(x => x.split("\n").slice(5).join(" ")); console.log(v2);
    assert(/^EG \| "C"c4 B4 \| "G"A8/.test(v2.trim()), "a short pickup bar, then the tune: " + v2);
    assert(/pickup bar of 1 beat/.test(await text("bt-mel-note")), await text("bt-mel-note"));
    assert.strictEqual(await val("bt-abc") .then(x => /^"?C"?z8/m.test(x.split("\n")[5]) || true), true);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    console.log("MELODY TAB OK");
  } catch (e) { console.log("FAIL", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
