// What the ABC can ask for and what the page checks: bars that do not add up, Q: tempo, %%style, the chord diagram toggle,
// the list of sections. Run from tests/band/lead, server on 8500.
const { launch } = require("./cdp.js"); const assert = require("assert"); const fs = require("fs");
(async () => { const b = await launch({ width: 1300, height: 1000 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const load = async abc => { await ev(`(function(){ var t = document.getElementById("bt-abc"); t.value = ${JSON.stringify(abc)}; t.dispatchEvent(new Event("input", { bubbles:true })); t.dispatchEvent(new Event("change", { bubbles:true })); })()`); await b.sleep(700); };
  const set = (id, val, type) => ev(`(function(){ var e = document.getElementById("${id}"); if (e.type === "checkbox") e.checked = ${JSON.stringify(val)}; else e.value = ${JSON.stringify(String(val))}; e.dispatchEvent(new Event("${type || "change"}", { bubbles:true })); })()`);
  const v = id => ev(`document.getElementById("${id}").value`);
  const H = "X:1\nT:Checks\nM:4/4\nL:1/4\nK:C\n", SONG = '"C"z4|"F"z4|[M:2/4]"G"z2|[M:4/4]"Em"z2|"A"z4|"D"z6|"G"z4|]';
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/tools/backing-track.html"); await b.sleep(1300);
    // no tempo slider: one number box
    assert.strictEqual(await ev(`document.querySelectorAll("#bt-root input[type=range]#bt-tempo").length + "|" + document.getElementById("bt-tempo-n").type`), "0|number");
    assert.strictEqual(await ev(`document.getElementById("bt-barwarn").hidden`), true, "the blues is sound");
    // bars that do not add up: named, marked on the chart, and played as full bars until told otherwise
    await load(H + SONG);
    const warn = await ev(`document.getElementById("bt-barwarn").hidden ? "" : document.getElementById("bt-barwarn-text").textContent`);
    assert(/2 bars do not add up/.test(warn) && /bar 4 \(4\/4\) holds 2 beats/.test(warn) && /bar 6 \(4\/4\) holds 6 beats/.test(warn) && /full bar/.test(warn), warn);
    assert.strictEqual(await ev(`Array.from(document.querySelectorAll("#bt-chart .tc-misfit")).map(function(c){ return c.getAttribute("data-bar"); }).join(" ")`), "3 5");
    const beatsOf = () => ev(`BandHarmony.buildForm(Object.assign(TuneChart.parse(document.getElementById("bt-abc").value), { asWritten: document.getElementById("bt-aswritten").checked }), 0).map(function(x){ return x.beats; }).join(" ")`);
    assert.strictEqual(await beatsOf(), "4 4 2 4 4 4 4");
    await set("bt-aswritten", true); assert.strictEqual(await beatsOf(), "4 4 2 2 4 6 4"); assert(/exactly as written/.test(await ev(`document.getElementById("bt-barwarn-text").textContent`)));
    // ... and the band really does: the dots show 6 for the long bar
    await set("bt-tempo-n", 300); await set("bt-countin", "1"); await ev(`document.getElementById("bt-play").click(); 0`);
    { const t = Date.now(), seen = {}; while (Date.now() - t < 20000){ const q = JSON.parse(await ev(`JSON.stringify([document.getElementById("bt-status").textContent, document.querySelectorAll("#bt-beats i").length])`)); const m = /bar (\d+)/.exec(q[0]); if (m) seen[m[1]] = q[1]; if (m && m[1] === "7") break; await b.sleep(50); }
      await ev(`document.getElementById("bt-play").click(); 0`); assert.deepStrictEqual([seen[3], seen[4], seen[6]], [2, 2, 6], JSON.stringify(seen)); }
    await set("bt-aswritten", false);
    // a 4/4 tune that turns to 5/4 has no pickup bar
    await load(H + '"C"z4|"F"z4|[M:5/4]"G"z5|"C"z5|]'); assert.strictEqual(await ev(`document.querySelectorAll("#bt-chart .tc-bar[data-bar]").length + "|" + document.getElementById("bt-barwarn").hidden`), "4|true");
    // Q: sets the tempo when it appears or changes; the box overrides it until then
    await load(H.replace("K:C", "Q:78\nK:C") + '"C"z4|"F"z4|]'); assert.strictEqual(await v("bt-tempo-n"), "78");
    await set("bt-tempo-n", 132); await load(H.replace("K:C", "Q:78\nK:C") + '"C"z4|"G"z4|]'); assert.strictEqual(await v("bt-tempo-n"), "132", "an edit elsewhere keeps the override");
    await load(H.replace("K:C", "Q:1/4=96\nK:C") + '"C"z4|"G"z4|]'); assert.strictEqual(await v("bt-tempo-n"), "96");
    await load(H.replace("K:C", "Q:1/8=180\nK:C") + '"C"z4|"G"z4|]'); assert.strictEqual(await v("bt-tempo-n"), "90", "eighths at 180 = quarters at 90");
    // %%style: by id or by the name in the menu; the menu overrides it afterwards; an unknown name is reported
    await load(H + '%%style emo\n"Am"z4|"F"z4|"C"z4|"G"z4|]'); assert.strictEqual(await v("bt-style") + "|" + await v("bt-comp"), "emo|dguitar");
    await set("bt-style", "swing"); await load(H + '%%style emo\n"Am"z4|"F"z4|"C"z4|"E"z4|]'); assert.strictEqual(await v("bt-style"), "swing");
    await load(H + '%%style Piano ballad\n"Am"z4|"F"z4|]'); assert.strictEqual(await v("bt-style") + "|" + await v("bt-timefeel"), "pop|half");
    await load(H + '%%style polka metal\n"Am"z4|"F"z4|]'); assert(/No style called "polka metal"/.test(await ev(`document.getElementById("bt-abc-note").textContent`))); assert.strictEqual(await v("bt-style"), "pop");
    // the chord diagram can be switched off, and the chart then takes the whole width
    const widths = () => ev(`(function(){ var c = document.getElementById("bt-chart").getBoundingClientRect(), r = document.querySelector("#bt-root .bt-chartrow").getBoundingClientRect(); return Math.round(c.width) + "/" + Math.round(r.width); })()`);
    let w = (await widths()).split("/").map(Number); assert(w[0] < w[1] - 200, "diagram beside the chart: " + w);
    await set("bt-side-on", false); await b.sleep(300); w = (await widths()).split("/").map(Number); assert(Math.abs(w[0] - w[1]) < 3, "full width: " + w);
    await set("bt-side-on", true);
    // the list of sections: a link to each panel; a click opens it and scrolls to it
    const nav = await ev(`Array.from(document.querySelectorAll("#bt-nav a")).map(function(a){ return a.textContent; }).join(" | ")`);
    assert.strictEqual(nav, "Play | Chart | Chart options | Band | Mixer | Practice | Save and load | Notation | Export MIDI | Edit ABC");
    assert.strictEqual(await ev(`document.getElementById("bt-notation").open`), false);
    await ev(`Array.from(document.querySelectorAll("#bt-nav a")).filter(function(a){ return a.textContent === "Notation"; })[0].click(); 0`); await b.sleep(3000);
    const at = JSON.parse(await ev(`JSON.stringify([document.getElementById("bt-notation").open, Math.round(document.getElementById("bt-notation").getBoundingClientRect().top), document.querySelector("#bt-nav a.on").textContent, Math.round(document.getElementById("bt-nav").getBoundingClientRect().top), window.pageYOffset + window.innerHeight >= document.documentElement.scrollHeight - 2])`));
    assert(at[0] && at[1] > 20 && (at[1] < 200 || at[4]) && at[1] < 900 && at[2] === "Notation" && at[3] > 0 && at[3] < 200, "jumped (to the top, or as far as the page goes), and the list stayed in view: " + at);
    if (process.argv[2]) await b.shot(process.argv[2], false);
    // narrow screen: the list is a row of links and nothing overflows
    await b.resize(420, 900); await b.sleep(400);
    assert.strictEqual(await ev(`document.documentElement.scrollWidth <= window.innerWidth + 1`), true, "no sideways scroll on a phone");
    console.log("ABC SETTINGS OK");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
