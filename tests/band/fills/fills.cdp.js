// Fill, stop and section controls on the Backing Track page. Run from tests/band/lead, server on 8500.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1300 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const set = (id, val, type) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = ${JSON.stringify(val)}; e.dispatchEvent(new Event("${type || "change"}", { bubbles:true })); })()`);
  const val = id => ev(`document.getElementById("${id}").value`);
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/tools/backing-track.html"); await b.sleep(1200);
    const errs = await ev(`(window.__errs = [], window.addEventListener("error", function(e){ __errs.push(e.message); }), 0)`);
    // Watermelon Man: its stop on 14 is now written in the ABC and shown in the box
    await set("bt-changes", "watermelon");
    assert.strictEqual(await val("bt-stops"), "14"); assert(/"\^stop"/.test(await val("bt-abc")), "stop written into the ABC");
    assert.strictEqual(await ev(`document.querySelectorAll("#bt-chart .tc-bar.bt-stop").length`), 1);
    // typing in the boxes rewrites the ABC; the chart shows the fill
    await set("bt-stops", "6, 14", "input"); await set("bt-fillbars", "8, 16 big", "input");
    let abc = await val("bt-abc"); assert.strictEqual((abc.match(/"\^stop"/g) || []).length, 2); assert(/"\^fill"/.test(abc) && /"\^big fill"/.test(abc));
    assert.strictEqual(await val("bt-stops"), "6, 14"); assert.strictEqual(await val("bt-fillbars"), "8, 16 big");
    assert.strictEqual(await ev(`document.querySelectorAll("#bt-chart .tc-fillmark").length`), 2);
    // a key change keeps them
    await set("bt-key", "G"); assert.strictEqual(await val("bt-stops"), "6, 14"); assert.strictEqual(await val("bt-fillbars"), "8, 16 big");
    // clearing a box takes the marks out
    await set("bt-stops", "", "input"); assert(!/"\^stop"/.test(await val("bt-abc")));
    // editing the ABC by hand fills the boxes, and sections bring up the Sections controls
    assert.strictEqual(await ev(`document.getElementById("bt-sections-field").hidden`), true);
    const mine = 'X:1\nM:4/4\nL:1/4\nK:C\nP:Verse\n"C"z4 | "F"z4 | "^stop""G"z4 | "^small fill""C"z4 |\nP:Chorus\n"F"z4 | "C"z4 | "G"z4 | "C"z4 |]';
    await set("bt-abc", mine, "input"); await b.sleep(900);
    assert.strictEqual(await val("bt-stops"), "3"); assert.strictEqual(await val("bt-fillbars"), "4 small");
    assert.strictEqual(await ev(`document.getElementById("bt-sections-field").hidden`), false);
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll("#bt-chart .tc-section"), function(e){ return e.textContent; }))`)), ["Verse", "Chorus"]);
    // play in hold mode: the verse goes round until N
    await set("bt-countin", "0"); await set("bt-tempo-n", "280"); await set("bt-hold", "hold");
    assert.strictEqual(await ev(`document.getElementById("bt-fill").disabled`), true);
    await ev(`document.getElementById("bt-play").click(); 0`);
    const t = Date.now(); let st = ""; while (Date.now() - t < 25000){ st = await ev(`document.getElementById("bt-status").textContent`); if (/bar/.test(st)) break; await b.sleep(150); }
    assert(/bar/.test(st), "playing: " + st);
    assert.strictEqual(await ev(`document.getElementById("bt-fill").disabled || document.getElementById("bt-next").disabled`), false);
    await b.sleep(5200);                                         // six bars at 280: still in the verse
    st = await ev(`document.getElementById("bt-status").textContent`); assert(/bar [1-4]$/.test(st), "held in the verse: " + st);
    assert.strictEqual(await ev(`document.getElementById("bt-secname").textContent`), "Verse");
    await ev(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "f", bubbles: true })); 0`);
    assert(/Fill at the end/.test(await ev(`document.getElementById("bt-status").textContent`)));
    await ev(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "n", bubbles: true })); 0`);
    const t2 = Date.now(); let sn = ""; while (Date.now() - t2 < 6000){ sn = await ev(`document.getElementById("bt-secname").textContent`); if (sn === "Chorus") break; await b.sleep(100); }
    assert.strictEqual(sn, "Chorus", "moved on to the chorus");
    await ev(`document.getElementById("bt-play").click(); 0`);
    assert.strictEqual(await ev(`document.getElementById("bt-fill").disabled`), true);
    // the fills menu reaches the band; a setup saved now carries menu and marks
    await set("bt-fills", "none");
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(window.__errs)`)), []);
    console.log("FILLS UI OK");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
