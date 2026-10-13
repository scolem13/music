// Chord Entry: a take on a click with the bar length changed by the pedal (CC 80 held across two downbeats). Run from tests/band/lead, server on 8500:
//   node ../entry/take.cdp.js        ("TAKE UI OK")
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1400 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const val = id => ev(`document.getElementById("${id}").value`), text = id => ev(`document.getElementById("${id}").textContent`);
  const set = (id, v) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${v}"; e.dispatchEvent(new Event("input", { bubbles:true })); e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const click = id => ev(`document.getElementById("${id}").click(); 0`);
  const errs = () => b.errors.filter(e => !/supabase/i.test(e));
  const until = async (fn, ms, what) => { const t = Date.now(); let s; while (Date.now() - t < ms){ s = await fn(); if (s) return s; await b.sleep(30); } throw new Error("never: " + what); };
  // events: [beat, "on"|"off"|"cc", a, b]; each fires once the click reaches its beat
  const drive = ev_ => ev(`(function(){ var E = ${JSON.stringify(ev_)}, done = [], iv = setInterval(function(){ var t = __entry.take(); if (!t) return; 
    E.forEach(function(e, i){ if (!done[i] && t.beat >= e[0]){ done[i] = 1; var now = performance.now(); if (e[1] === "on") __entry.on(e[2], 0.7, now); else if (e[1] === "off") __entry.off(e[2], now); else __entry.cc(e[2], now); } });
    if (done.filter(Boolean).length === E.length) clearInterval(iv); }, 4); })()`);
  const chord = (beat, ms) => ms.map(m => [beat, "on", m]).concat(ms.map(m => [beat + 0.35, "off", m]));
  try {
    await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1200);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    await ev(`document.getElementById("ce-sound").checked = false; 0`); await set("ce-key", "F"); await set("ce-tempo", "160");
    // ---- chords, in time with the click; the pedal makes the bars 3 beats long from beat 4 ----
    await set("ce-mode", "live"); await set("ce-with", "click"); await set("ce-bars", "5"); await set("ce-quant", "half");
    await click("ce-rec");
    await until(async () => (await ev(`!!__entry.take()`)), 5000, "the take starts");
    const F7 = [53, 57, 60, 63], Bb7 = [46, 50, 53, 56], Cm7 = [48, 51, 55, 58];
    await drive([].concat(chord(0, F7), [[3.2, "cc", 127]], chord(4, Bb7), chord(7, Cm7), [[7.4, "cc", 0]], chord(10, F7)));
    await until(async () => /^Recorded \d+ chords?/.test(await text("ce-note")), 20000, "the take ends: " + await text("ce-note"));
    const abc = await val("ce-abc"); const music = abc.split("\n").slice(5).join(" "); console.log(music);
    assert.strictEqual(music, '"F7"z8 | [M:3/4] "Bb7"z6 | "Cm7"z6 | "F7"z6 | z6 |]', "bars follow the pedal");
    assert(/1 change of bar length/.test(await text("ce-note")), await text("ce-note"));
    assert.strictEqual(await ev(`document.querySelectorAll("#ce-chart .tc-bar[data-bar]").length`), 5);
    // ---- the melody first, on an empty chart: swung off, quarter notes; the pedal at beat 4 ----
    await click("ce-clear"); await set("ce-mode", "melody"); await set("ce-mwith", "click"); await set("ce-mbars", "4"); await set("ce-mfeel", "straight");
    assert.strictEqual(await ev(`document.getElementById("ce-mbars-f").hidden`), false);
    await click("ce-mrec"); await until(async () => (await ev(`!!__entry.take()`)), 5000, "the melody take starts");
    const nt = (beat, m, len) => [[beat, "on", m], [beat + (len || 0.7), "off", m]];
    await drive([].concat(nt(0, 60), nt(1, 62), nt(2, 64), nt(3, 65), [[3.3, "cc", 127]], nt(4, 67), nt(5, 69), nt(6, 71), nt(7, 72), [[7.4, "cc", 0]], nt(8, 74), nt(9, 76)));
    await until(async () => /^Wrote \d+ notes?/.test(await text("ce-note")), 20000, "the melody take ends: " + await text("ce-note"));
    const m2 = (await val("ce-abc")).split("\n").slice(5).join(" "); console.log(m2);
    assert.strictEqual(m2, 'C2 D2 E2 F2 | [M:3/4] G2 A2 =B2 | c2 d2 e z | z6 |]', "the melody in the bars the pedal made (B natural in F; the last note let go early): " + m2);
    assert.strictEqual(await ev(`document.querySelectorAll("#ce-score svg").length > 0`), true, "notation drawn");
    // the take log replays to the same bars
    const same = async () => ev(`(function(){ var log = __entry.lastTake(); if (!log) return "no log"; var r = ChordEntry.replay(JSON.parse(JSON.stringify(log))); return r.abc({ key: log.cfg.key }).split("\\n").slice(5).join(" ") === document.getElementById("ce-abc").value.split("\\n").slice(5).join(" ") ? "same" : "different: " + r.abc({ key: log.cfg.key }); })()`);
    assert.strictEqual(await same(), "same", "replaying the melody take's log");
    // ---- chords and melody together, split at middle C ----
    await click("ce-clear"); await set("ce-mode", "split"); await set("ce-mbars", "2"); await set("ce-mfeel", "straight");
    assert.strictEqual(await ev(`document.getElementById("ce-split-f").hidden`), false); assert.strictEqual(await val("ce-msplit"), "60");
    await click("ce-mrec"); await until(async () => (await ev(`!!__entry.take()`)), 5000, "the split take starts");
    await drive([].concat(chord(0, [48, 52, 55, 58]), nt(0.1, 72), nt(1, 74), nt(2, 76, 1.9), chord(4, [41, 45, 48, 51]), nt(4.1, 77, 3.9)));
    await until(async () => /^Recorded \d+ chords? and wrote \d+ notes?/.test(await text("ce-note")), 20000, "the split take ends: " + await text("ce-note"));
    const m3 = (await val("ce-abc")).split("\n").slice(5).join(" "); console.log(m3);
    assert.strictEqual(m3, '"C7"c2 d2 e4 | "F7"f8 |]', "left hand the chords, right hand the line: " + m3);
    assert.strictEqual(await same(), "same", "replaying the split take's log");
    assert.strictEqual(await ev(`document.getElementById("ce-log").hidden`), false, "the log buttons show");
    // the split key can be set by pressing a key
    await click("ce-msplit-set"); await ev(`__entry.on(64, 0.7, performance.now()); __entry.off(64, performance.now()); 0`); assert.strictEqual(await val("ce-msplit"), "64");
    await set("ce-msplit", "60");
    // chords struck together in a melody are written as a chord when asked
    await click("ce-clear"); await set("ce-mode", "melody"); await set("ce-mwith", "click"); await set("ce-mbars", "1"); await ev(`document.getElementById("ce-mpoly").checked = true; 0`);
    await click("ce-mrec"); await until(async () => (await ev(`!!__entry.take()`)), 5000, "the chord-line take starts");
    await drive([].concat(chord(0, [60, 64, 67]), nt(2, 62, 1.9)));
    await until(async () => /^Wrote \d+ notes?/.test(await text("ce-note")), 20000, "the take ends");
    const m4 = (await val("ce-abc")).split("\n").slice(5).join(" "); console.log(m4);
    assert(/^\[CEG\]/.test(m4), "a struck chord is written as a chord: " + m4);
    // a pickup: notes in the count-in become a short bar in front of bar 1
    await click("ce-clear"); await set("ce-mode", "melody"); await set("ce-mwith", "click"); await set("ce-mbars", "1"); await ev(`document.getElementById("ce-mpoly").checked = false; 0`); await set("ce-mfeel", "straight");
    assert.strictEqual(await val("ce-mpickup"), "auto");
    await click("ce-mrec"); await until(async () => (await ev(`!!__entry.take()`)), 5000, "the pickup take starts");
    await drive([].concat(nt(-1, 64, 0.4), nt(-0.5, 67, 0.4), nt(0, 72, 1.9), nt(2, 71, 1.9)));
    await until(async () => /^Wrote \d+ notes?/.test(await text("ce-note")), 20000, "the pickup take ends");
    const m5 = (await val("ce-abc")).split("\n").slice(5).join(" "); console.log(m5);
    assert(/^EG \| c4 =B4 \|\]/.test(m5), "a pickup bar in front of bar 1: " + m5); assert(!/\[M:/.test(await val("ce-abc")), "no meter mark for it");
    assert.strictEqual(await same(), "same", "replaying the pickup take's log");
    // the band plays it back in those bars (hear it, then stop)
    await click("ce-play"); await b.sleep(1500); await click("ce-play");
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    console.log("TAKE UI OK");
  } catch (e) { console.log("FAIL", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
