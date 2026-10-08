// The Chord Entry page: chords one at a time, in time with a click, voicings, and the hand-off to the
// Backing Track and back. Run from tests/band/lead, server on 8500:   node ../entry/entry.cdp.js
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1400 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const val = id => ev(`document.getElementById("${id}").value`), text = id => ev(`document.getElementById("${id}").textContent`);
  const set = (id, v) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${v}"; e.dispatchEvent(new Event("input", { bubbles:true })); e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const click = id => ev(`document.getElementById("${id}").click(); 0`);
  const errs = () => b.errors.filter(e => !/supabase/i.test(e));
  const play = ms => ev(`(function(){ var t = performance.now(), m = ${JSON.stringify(ms)}; m.forEach(function(x, i){ __entry.on(x, 0.7, t + i); }); m.forEach(function(x, i){ __entry.off(x, t + 200 + i); }); })()`);
  const hit = ms => ev(`(function(){ var t = performance.now(), m = ${JSON.stringify(ms)}; m.forEach(function(x){ __entry.on(x, 0.7, t); }); setTimeout(function(){ m.forEach(function(x){ __entry.off(x, performance.now()); }); }, 150); })()`);
  const music = async () => (await val("ce-abc")).split("\n").slice(5).join(" ");
  const pins = async () => JSON.parse(await ev(`JSON.stringify(__entry.pins())`));
  const until = async (id, re, ms) => { const t = Date.now(); let s = ""; while (Date.now() - t < ms){ s = await text(id); if (re.test(s)) return s; await b.sleep(30); } throw new Error("never saw " + re + " in " + id + "; last: " + s); };
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1200);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    await ev(`document.getElementById("ce-sound").checked = false; 0`); await set("ce-key", "F"); await set("ce-title", "Test Blues");
    assert.strictEqual(await ev(`Array.prototype.map.call(document.getElementById("ce-span").options, function(o){ return o.value; }).join(" ")`), "bar two half beat");
    assert.strictEqual(await ev(`document.getElementById("ce-keys").children.length`), 25); assert.strictEqual(await val("ce-abc"), "");
    // the style: jazz by default; rock means straight eighths, a rock beat and plain chords, for recording and for checking
    assert.strictEqual(await val("ce-style"), "swing"); assert.deepStrictEqual(JSON.parse(await ev(`(function(){ var o = __entry.opts(); return JSON.stringify([o.feel, o.groove, o.voicing]); })()`)), ["swing", "auto", "rootless"]);
    await set("ce-style", "rock"); assert.deepStrictEqual(JSON.parse(await ev(`(function(){ var o = __entry.opts(); return JSON.stringify([o.feel, o.groove, o.voicing]); })()`)), ["straight", "rock", "standard"]);
    // ---- one chord at a time ----
    await play([53, 57, 60, 63]); await play([46, 50, 53, 56]);
    assert.strictEqual(await music(), '"F7"z4 | "Bb7"z4 |]'); assert.strictEqual(await val("ce-bar"), "3"); assert(/^T:Test Blues$/m.test(await val("ce-abc")) && /^K:F$/m.test(await val("ce-abc")));
    assert(/^Bb7 .*bar 2/.test(await text("ce-heard")), await text("ce-heard")); assert.strictEqual(await text("ce-count"), "2 bars, 2 chords");
    assert.strictEqual(await ev(`document.querySelectorAll("#ce-chart .tc-bar[data-bar]").length`), 2, "the chart shows what was entered");
    assert.strictEqual(await ev(`document.getElementById("ce-key").disabled && document.getElementById("ce-meter").disabled`), true, "key and meter are fixed once there are bars");
    await set("ce-span", "half"); await play([48, 51, 55, 58]); await play([53, 57, 63]);
    assert.strictEqual(await music(), '"F7"z4 | "Bb7"z4 | "Cm7"z2 "F7"z2 |]');
    await click("ce-back"); assert.strictEqual(await music(), '"F7"z4 | "Bb7"z4 | "Cm7"z4 |]');
    await click("ce-hold"); await set("ce-span", "bar"); await click("ce-hold"); assert.strictEqual(await music(), '"F7"z4 | "Bb7"z4 | "Cm7"z4 | z4 |]');
    await set("ce-bar", "2"); await ev(`document.getElementById("ce-slash").checked = true; 0`); await play([50, 53, 58]); assert.strictEqual(await music(), '"F7"z4 | "Bb/D"z4 | "Cm7"z4 | z4 |]');
    await play([60]); assert(/at least two/.test(await text("ce-heard")));
    // start empty unlocks the key; the on-screen keys
    await click("ce-clear"); assert.strictEqual(await ev(`document.getElementById("ce-key").disabled`), false); await set("ce-key", "E");
    for (const m of [52, 56, 59]) await ev(`document.querySelector('#ce-keys [data-midi="${m}"]').click(); 0`);
    assert(/E$/.test(await text("ce-heard")), await text("ce-heard")); await click("ce-enter"); assert.strictEqual(await music(), '"E"z4 |]');
    await play([54, 58, 61]); assert(/"F#"z4 \|\]$/.test(await music()), await music());

    // ---- in time: two bars at 240 against the click, snapped to the bar ----
    await click("ce-clear"); await set("ce-key", "F"); await set("ce-mode", "live");
    assert.strictEqual(await ev(`document.getElementById("ce-step").hidden + "|" + document.getElementById("ce-live").hidden`), "true|false");
    await set("ce-tempo", "240"); await set("ce-bars", "2"); await set("ce-quant", "bar");
    await play([53, 57, 60]); assert(/press Record/.test(await text("ce-heard")));
    await click("ce-rec"); await until("ce-status", /bar 1$/, 25000); assert.strictEqual(await ev(`__entry.recording()`), true); assert.strictEqual(await music(), "z4 | z4 |]");
    await hit([53, 57, 60, 63]); await until("ce-status", /bar 2$/, 3000); await hit([46, 50, 53, 56]);
    let t0 = Date.now(); while (await ev(`__entry.recording()`)){ if (Date.now() - t0 > 6000) throw new Error("the take never ended"); await b.sleep(100); }
    assert.strictEqual(await music(), '"F7"z4 | "Bb7"z4 |]'); assert(/Recorded 2 chords over 2 bars/.test(await text("ce-note")), await text("ce-note")); assert(/Record$/.test(await text("ce-rec")));
    // stopping a take early keeps what was played
    await set("ce-bars", "4"); await click("ce-rec"); await until("ce-status", /bar 1$/, 8000); await hit([53, 57, 60, 63]); await until("ce-status", /bar 2$/, 3000); await hit([46, 50, 53, 56]); await b.sleep(300); await click("ce-rec"); await b.sleep(200);
    assert.strictEqual(await ev(`__entry.recording()`), false); assert.strictEqual(await music(), '"F7"z4 | "Bb7"z4 | z4 | z4 |]');

    // ---- voicings: named, copied to the same chord, dropped when the chord under them changes ----
    await set("ce-mode", "voice"); assert(/^Chord 1 of 4 .* bar 1 .* F7 .* no voicing yet/.test(await text("ce-vnow")), await text("ce-vnow"));
    await play([57, 62, 63, 67]); assert(/F7 .* Rootless \(A\/B forms\): A form \(3rd in bass\): A D Eb G$/.test(await text("ce-heard")), await text("ce-heard"));
    await play([50, 56]); assert(/Guide tones \(3rd & 7th\): 3rd in bass.*also on 2 other places/.test(await text("ce-heard")), await text("ce-heard"));
    let p = await pins(); assert.deepStrictEqual(p, { "0:0": [57, 62, 63, 67], "1:0": [50, 56], "2:0": [50, 56], "3:0": [50, 56] });
    assert(/copied from the same chord/.test(await text("ce-vnow"))); assert.strictEqual(await text("ce-count"), "4 bars, 2 chords, 4 with a voicing");
    await set("ce-mode", "step"); await set("ce-bar", "3"); await play([48, 52, 55, 58]);
    p = await pins(); assert.deepStrictEqual(Object.keys(p).sort(), ["0:0", "1:0"], "bars 3 and 4 are C7 now: their B flat voicings are gone");
    // hear it: the trio plays, the chart follows, stop
    await click("ce-play"); await until("ce-status", /^bar 1$/, 25000); assert.strictEqual(await ev(`__entry.state()`), "playing"); await click("ce-play"); await b.sleep(150); assert.strictEqual(await ev(`__entry.state()`), "idle");

    // ---- send it to the Backing Track ----
    const sentAbc = await val("ce-abc");
    await ev(`window.open = function(){ return null; }; 0`); await click("ce-send"); await b.sleep(2500);
    assert(/backing-track\.html$/.test(await ev(`location.pathname`)), await ev(`location.href`)); assert.strictEqual(await ev(`location.search`), "");
    assert.strictEqual((await val("bt-abc")).trim(), sentAbc.trim()); assert.strictEqual(await val("bt-changes"), "custom"); assert.strictEqual(await val("bt-tempo-n"), "240"); assert.strictEqual(await val("bt-key"), "F"); assert.strictEqual(await val("bt-style"), "rock"); assert.strictEqual(await val("bt-feel"), "straight"); assert.strictEqual(await val("bt-groove"), "rock");
    assert(/the voicings you played in \(2 chords\)/.test(await text("bt-pinnote-text")), await text("bt-pinnote-text"));
    assert.strictEqual(await ev(`!!document.getElementById("bt-entry") || !!document.getElementById("bt-en-mode")`), false, "the entry panel is gone from the Backing Track");
    // the band plays them; the key moves them; a setup keeps them
    const comp = JSON.parse(await ev(`(function(){ var s = JSON.parse(localStorage.getItem("__probe") || "null"); return 0; })(), JSON.stringify((function(){ document.getElementById("bt-setups").open = true; var n = document.getElementById("bt-setup-name"); n.value = "entered"; document.getElementById("bt-setup-save").click(); var l = JSON.parse(localStorage.getItem("btSetups")); return l[l.length - 1].pins; })())`));
    assert.deepStrictEqual(comp, { "0:0": [57, 62, 63, 67], "1:0": [50, 56] });
    await set("bt-key", "G"); await ev(`document.getElementById("bt-setup-save").click(); 0`);
    assert.deepStrictEqual(JSON.parse(await ev(`(function(){ var l = JSON.parse(localStorage.getItem("btSetups")); return JSON.stringify(l[l.length - 1].pins); })()`)), { "0:0": [59, 64, 65, 69], "1:0": [52, 58] });
    await set("bt-changes", "basic"); assert(/cleared because you picked different changes/.test(await text("bt-pinnote-text")));
    const key = await ev(`Array.prototype.filter.call(document.getElementById("bt-setup-list").options, function(o){ return /entered/.test(o.textContent); })[0].value`);
    await set("bt-setup-list", key); await click("bt-setup-load"); await b.sleep(150); assert(/the voicings you played in \(2 chords\)/.test(await text("bt-pinnote-text")), await text("bt-pinnote-text"));
    // ---- and back: the Backing Track's changes and voicings open on the entry page ----
    await ev(`window.open = function(){ return null; }; 0`); await click("bt-to-entry"); await b.sleep(2500);
    assert(/chord-entry\.html$/.test(await ev(`location.pathname`))); assert.strictEqual(await music(), '"G7"z4 | "C7"z4 | "D7"z4 | z4 |]'); assert.strictEqual(await val("ce-key"), "G"); assert.strictEqual(await val("ce-tempo"), "240"); assert.strictEqual(await val("ce-style"), "rock");
    assert.deepStrictEqual(await pins(), { "0:0": [59, 64, 65, 69], "1:0": [52, 58] }); assert.strictEqual(await val("ce-bar"), "5");
    await ev(`localStorage.removeItem("btSetups"); localStorage.removeItem("ceStyle"); 0`);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    console.log("ENTRY UI OK");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
