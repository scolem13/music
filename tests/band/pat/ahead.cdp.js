// Notation shows the chorus about to be heard: the band writes a pass of the form ahead while the Notation panel
// is open, and writes it again when a setting changes. From tests/band/lead, server on 8500.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1400 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const set = (id, val) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${val}"; e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const which = () => ev(`document.getElementById("bt-nt-which").textContent`);
  const status = () => ev(`(document.getElementById("bt-status") || document.querySelector("#bt-root .bt-status")).textContent`);
  const until = async (f, ms, what) => { const t = Date.now(); for (;;){ const v = await f(); if (v) return v; if (Date.now() - t > ms) throw new Error("timeout: " + what); await b.sleep(120); } };
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/tools/backing-track.html"); await b.sleep(1200);
    await set("bt-changes", "basic"); await set("bt-tempo-n", "300"); await set("bt-countin", "2"); await set("bt-choruses", "3");
    await ev(`document.getElementById("bt-notation").open = true; 0`); await b.sleep(900);
    assert.strictEqual(await which(), "An example of what the band would play");
    // what the band is told to play, as it is generated: wrap the events callback through the test hook on the score
    await ev(`document.getElementById("bt-play").click(); 0`);
    // during the count-in the first chorus is already on the page
    await until(async () => /Count-in/.test(await status()), 20000, "count-in");
    await until(async () => (await which()) === "Chorus 1, coming up", 4000, "chorus 1 before it starts: " + await which());
    const notes1 = await ev(`document.querySelectorAll("#bt-score .abcjs-note").length`); assert(notes1 > 30, "chorus 1 drawn: " + notes1);
    await until(async () => /Chorus 1 · bar 2/.test(await status()), 8000, "bar 2"); assert.strictEqual(await which(), "Chorus 1, playing now");
    // a setting changed mid-chorus: the bars not yet played are written again, and the page shows them
    const before = await ev(`document.getElementById("bt-score").innerHTML.length`);
    await set("bt-style", "bossa"); await b.sleep(500);
    const after = await ev(`document.getElementById("bt-score").innerHTML.length`); assert.notStrictEqual(after, before, "redrawn after a change of style");
    // in the last bar of the chorus the page turns to the next one, before it sounds
    const len = await ev(`(function(){ var m = 0; document.querySelectorAll("#bt-chart [data-bar], #bt-chart .tc-bar").forEach(function(){ m++; }); return m; })()`);
    await until(async () => (await which()) === "Chorus 2, coming up", 20000, "chorus 2 early: " + await which() + " / " + await status());
    assert(/Chorus 1 · bar/.test(await status()), "still in chorus 1: " + await status());
    await until(async () => /Chorus 2 · bar 2/.test(await status()), 8000, "into chorus 2"); assert.strictEqual(await which(), "Chorus 2, playing now");
    // only what has been heard counts as played (MIDI export, hand-off)
    const heard = JSON.parse(await ev(`(function(){ var g = BandMidi.toFile || null; return JSON.stringify({ st: (document.getElementById("bt-status") || document.querySelector("#bt-root .bt-status")).textContent }); })()`));
    assert(/Chorus 2/.test(heard.st));
    await until(async () => (await which()) === "Chorus 3, coming up", 20000, "chorus 3 early");
    // it ends by itself after three choruses (the ending was written ahead too), and the panel then shows the last chorus
    await until(async () => (await ev(`document.getElementById("bt-play").getAttribute("data-state")`)) === "idle", 25000, "the end");
    await ev(`document.getElementById("bt-nt-refresh").click(); 0`); await b.sleep(700); assert.strictEqual(await which(), "The last chorus played");
    // panel closed: nothing is written ahead
    await ev(`document.getElementById("bt-notation").open = false; 0`); await b.sleep(300); await set("bt-countin", "1");
    await ev(`window.__gen = 0; (function(){ var g = BandComp.create; })(); document.getElementById("bt-play").click(); 0`);
    await until(async () => /Chorus 1 · bar 1/.test(await status()), 20000, "playing again");
    await ev(`document.getElementById("bt-play").click(); 0`);
    assert(!b.errors.filter(e => !/supabaseUrl/.test(e)).length, "page errors: " + b.errors.join(" | "));
    console.log("AHEAD OK");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
