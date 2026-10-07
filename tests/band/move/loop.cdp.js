// Real page: L shortcut, loop over the end of the form, the new voicing options playing, and fret
// markings on the Chord Sheet. Server on 8500.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1100 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(6000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const v = id => ev(`document.getElementById("${id}").value`);
  const set = (id, val) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${val}"; e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const key = (k, target) => ev(`(function(){ var t = ${target || "document.body"}; t.dispatchEvent(new KeyboardEvent("keydown", { key: "${k}", bubbles: true })); })()`);
  const click = (bar, shift) => ev(`document.querySelectorAll('#bt-chart .tc-bar[data-bar]')[${bar - 1}].dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: ${!!shift} }))`);
  const loop = async () => JSON.parse(await ev(`JSON.stringify({ on: document.getElementById("bt-cyc-on").checked, from: document.getElementById("bt-cyc-from").value, to: document.getElementById("bt-cyc-to").value,
    marked: Array.from(document.querySelectorAll('#bt-chart .tc-bar[data-bar]')).map(function(c, i){ return c.classList.contains("bt-cyc") ? i + 1 : 0; }).filter(Boolean).join(","), note: document.getElementById("bt-loop-note").textContent })`));
  try {
    await b.goto(B + "/tools/backing-track.html"); await b.sleep(1000);
    await click(10); assert.strictEqual(await v("bt-start"), "10");
    await key("l"); let s = await loop(); console.log("L:", JSON.stringify(s)); assert(s.on && s.from === "10" && /Click the bar/.test(s.note));
    await click(2); s = await loop(); console.log("click 2:", JSON.stringify(s));
    assert.deepStrictEqual([s.on, s.from, s.to, s.marked], [true, "10", "2", "1,2,10,11,12"]); assert(/over the end/.test(s.note));
    await key("L"); s = await loop(); assert.strictEqual(s.on, false); assert.strictEqual(s.marked, "");
    await key("l"); s = await loop(); assert.deepStrictEqual([s.on, s.from, s.to], [true, "10", "2"], "L again brings the same loop back");
    await key("l", `document.getElementById("bt-abc")`); assert.strictEqual((await loop()).on, true, "typing an l in a text box does nothing");
    // play it: bars go 10 11 12 1 2 10 ...
    await set("bt-countin", "0"); await set("bt-tempo-n", "280");
    await ev(`window.__bars = []; new MutationObserver(function(){ var t = document.getElementById("bt-status").textContent, m = /bar (\\d+)/.exec(t); if (m && window.__bars[window.__bars.length - 1] !== m[1]) window.__bars.push(m[1]); }).observe(document.getElementById("bt-status"), { childList: true, characterData: true, subtree: true });`);
    await ev(`document.getElementById("bt-play").click()`); await b.sleep(11500);
    let bars = await ev(`window.__bars.join(" ")`); console.log("played:", bars);
    assert(/^10 11 12 1 2 10 11 12 1 2 10/.test(bars), "loops over the end");
    // while it loops: a click moves the end, Shift-click the start
    await click(11); await click(4, true); s = await loop(); assert.deepStrictEqual([s.from, s.to, s.marked], ["4", "11", "4,5,6,7,8,9,10,11"]);
    // the new voicing options keep playing
    for (const [vo, mv] of [["bh", "passing"], ["auto", "move"], ["drop2", "hold"]]){ await set("bt-voicing", vo); await set("bt-vmove", mv); await b.sleep(1500); }
    await ev(`(function(){ var c = document.getElementById("bt-ext"); c.value = "1"; c.dispatchEvent(new Event("change", { bubbles:true })); })()`); await b.sleep(800);
    assert.strictEqual(await ev(`document.getElementById("bt-play").getAttribute("data-state")`), "playing");
    await ev(`document.getElementById("bt-play").click()`);
    await key("l"); await b.shot("loop.png");
    // Chord Sheet fret markings
    await b.goto(B + "/tools/chord-sheet.html"); await b.sleep(1200);
    await ev(`(function(){ var t = document.getElementById("chords-textarea"); t.value = "F7 Bb7 Cm7 A7"; t.dispatchEvent(new Event("blur")); })()`); await b.sleep(500);
    await ev(`(function(){ document.querySelectorAll("[data-inst-id]").forEach(function(c){ var want = c.dataset.instId === "guitar"; if (c.checked !== want){ c.checked = want; c.dispatchEvent(new Event("change", { bubbles:true })); } }); })()`); await b.sleep(400);
    await ev(`(function(){ var row = document.querySelector('[data-inst-id="guitar"]').closest(".inst-row"), sels = row.querySelectorAll("select"), s = sels[sels.length - 1]; s.value = "drop2"; s.dispatchEvent(new Event("change", { bubbles:true })); })()`); await b.sleep(900);
    const fr = JSON.parse(await ev(`JSON.stringify(Array.from(document.querySelectorAll(".diagram-card svg")).filter(function(s){ return s.querySelector("rect"); }).map(function(s){
      var t = Array.from(s.querySelectorAll("text")).filter(function(x){ return /^\\d+fr$/.test(x.textContent); })[0];
      return { label: t ? t.textContent : "", size: t ? +t.getAttribute("font-size") : 0, dots: s.querySelectorAll('circle[fill="#c4c0b7"]').length }; }))`));
    console.log("fret labels:", JSON.stringify(fr)); assert(fr.length >= 4 && fr.some(x => x.label) && fr.every(x => !x.label || x.size >= 24) && fr.every(x => x.dots >= 1));
    await b.shot("frets.png");
    const errs = b.errors.filter(e => !/supabaseUrl|createClient/.test(e)); assert.strictEqual(errs.length, 0, JSON.stringify(errs)); console.log("LOOP + FRETS OK");
  } finally { await b.close(); } })().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
