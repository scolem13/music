// Chord Sheet: clicking a diagram's title plays the voicing on the band's sampled instruments
// (piano for the keyboard, guitar for fretted instruments). Run from tests/band/lead, server on 8500.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1200 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/tools/chord-sheet.html"); await b.sleep(1500);
    for (const c of ["C", "Am7", "G7"]) await ev(`(function(){ var i = document.getElementById("inp-root"); i.value = "${c}"; i.dispatchEvent(new Event("input", { bubbles:true })); document.getElementById("btn-add-chord").click(); })()`);
    await ev(`(function(){ var g = document.querySelector('input[data-inst-id="guitar"], [data-inst-id="guitar"] input[type=checkbox]'); if (g && !g.checked) g.click(); })()`); await b.sleep(600);
    assert(await ev(`!!(window.BandPlayer && BandPlayer.chord && window.BandSounds)`), "band audio loaded");
    await ev(`window.__calls = []; window.__err = []; window.addEventListener("error", function(e){ __err.push(e.message); });
      (function(){ var f = BandPlayer.chord; BandPlayer.chord = function(m, o){ var p = f.apply(this, arguments); var c = { n: m.length, inst: o.inst }; __calls.push(c); p.then(function(){ c.done = true; }, function(e){ __err.push(String(e)); }); return p; }; })(); 0`);
    const n = await ev(`document.querySelectorAll("#sheet-output .diagram-card .diagram-title").length`); assert(n >= 2, "cards with titles: " + n);
    await ev(`Array.from(document.querySelectorAll("#sheet-output .diagram-card .diagram-title")).forEach(function(t){ t.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); 0`);
    const t = Date.now(); let calls = [];
    while (Date.now() - t < 20000){ calls = JSON.parse(await ev(`JSON.stringify(window.__calls)`)); if (calls.length && calls.every(c => c.done)) break; await b.sleep(250); }
    assert(calls.length >= 2 && calls.every(c => c.done && c.n >= 2), JSON.stringify(calls));
    const insts = [...new Set(calls.map(c => c.inst))].sort().join(" ");
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(window.__err)`)), []);
    assert.strictEqual(insts, "guitar piano");
    console.log("HEAR OK:", calls.length, "voicings on", insts);
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
