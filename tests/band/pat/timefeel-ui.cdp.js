// Backing Track page: the Time menu (half time / double time) reaches the band, plays live, and is saved in a setup.
// Run from tests/band/lead with the test server on port 8500.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1300 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const set = (id, val) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${val}"; e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/tools/backing-track.html"); await b.sleep(1200);
    await ev(`window.__err = []; window.addEventListener("error", function(e){ __err.push(e.message); }); window.__bars = [];
      (function(){ var g = BandMidi.generate; BandMidi.generate = function(p, x){ window.__o = x.opts; var r = g.apply(this, arguments); window.__gen = r; return r; }; HTMLAnchorElement.prototype.click = function(){}; })(); 0`);
    assert(await ev(`!!document.getElementById("bt-timefeel").closest(".bt-panel") && !document.getElementById("bt-timefeel").closest("details")`), "Time sits in the Play panel");
    const drums = async () => { await ev(`document.getElementById("bt-mid-go").click(); 0`); return JSON.parse(await ev(`JSON.stringify({ tf: __o.timeFeel, n: __gen[0].parts.drums.length + __gen[1].parts.drums.length, beats: __gen[0].beats, bars: __gen.length })`)); };
    await set("bt-style", "rock"); const n = await drums(); assert.strictEqual(n.tf, "normal");
    assert.strictEqual(await ev(`document.getElementById("bt-timeparts-field").hidden`), true, "Who changes is hidden in normal time");
    const compN = await ev(`__gen[0].parts.comp.length`);
    await set("bt-timefeel", "double"); const d = await drums(); assert.strictEqual(d.tf, "double"); assert(d.n > 1.7 * n.n, "twice the drum notes: " + n.n + " -> " + d.n); assert.strictEqual(d.beats, n.beats); assert.strictEqual(d.bars, n.bars);
    assert.strictEqual(await ev(`document.getElementById("bt-timeparts-field").hidden`), false);
    assert.strictEqual(await ev(`__o.timeFeelParts`), "bass drums"); assert(await ev(`__gen[0].parts.comp.length`) <= compN, "the comping thins out in answer");
    await set("bt-timeparts", "bass drums plain"); await drums(); assert.strictEqual(await ev(`__gen[0].parts.comp.length`), compN, "chords unchanged: the comping keeps its rhythm exactly"); await set("bt-timeparts", "bass drums"); await drums();
    await set("bt-timeparts", "bass comp drums"); await drums(); assert(await ev(`__gen[0].parts.comp.length`) > compN, "whole band: the comping doubles too"); await set("bt-timeparts", "bass drums");
    await set("bt-timefeel", "half"); const h = await drums(); assert.strictEqual(h.tf, "half"); assert(h.n < 0.65 * n.n, "half the drum notes: " + n.n + " -> " + h.n);
    // live: the band plays in double time without errors
    await set("bt-timefeel", "double"); await set("bt-countin", "0");
    await ev(`document.getElementById("bt-play").click(); 0`);
    const t = Date.now(); let playing = false; while (Date.now() - t < 25000){ playing = await ev(`/stop/i.test(document.getElementById("bt-play").textContent) || document.getElementById("bt-play").classList.contains("on") || document.querySelector("#bt-beats i.on") != null`); if (playing) break; await b.sleep(250); }
    assert(playing, "plays"); await b.sleep(2500); await set("bt-timefeel", "half"); await b.sleep(2500);
    await ev(`document.getElementById("bt-play").click(); 0`);
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(window.__err)`)), []);
    // saved with a setup, and 6/8 switches it off
    assert.strictEqual(await ev(`(function(){ document.getElementById("bt-setup-name").value = "tf test"; document.getElementById("bt-setup-save").click(); var s = JSON.parse(localStorage.getItem("btSetups")).filter(function(x){ return x.name === "tf test"; })[0]; localStorage.removeItem("btSetups"); return s.fields["bt-timefeel"]; })()`), "half");
    await set("bt-changes", "basic"); await set("bt-meter", "6/8"); await b.sleep(300); assert.strictEqual(await ev(`document.getElementById("bt-timefeel").disabled`), true);
    console.log("TIME FEEL UI OK");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
