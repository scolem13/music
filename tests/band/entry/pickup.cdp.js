// Chord Entry: pickup notes into a section. A take that starts at the top of Verse 2 with notes played in the count-in puts them at the end of
// Verse 1's last bar, keeping what that bar had before them; they are sung to Verse 2's first syllables, and Verse 2's own notes go on from there.
// Run from tests/band/lead, server on 8500:   node ../entry/pickup.cdp.js        ("PICKUP WORDS OK")
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1600, height: 950 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const val = id => ev(`document.getElementById("${id}").value`), text = id => ev(`document.getElementById("${id}").textContent`);
  const set = (id, v) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event("input", { bubbles:true })); e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const click = id => ev(`document.getElementById("${id}").click(); 0`);
  const until = async (id, re, ms) => { const t = Date.now(); let s = ""; while (Date.now() - t < ms){ s = await text(id); if (re.test(s)) return s; await b.sleep(20); } throw new Error("never saw " + re + " in " + id + ": " + s); };
  const mel = async () => JSON.parse(await ev(`JSON.stringify(__entry.grid().melody().map(function(x){ return (x || []).map(function(n){ return [n.midi, n.pos, n.dur]; }); }))`));
  const wl = k => ev(`__ceWork.lyr()[${k}].wl.join(" / ")`);
  const cho = ["{title: Pickup Test}", "{tempo: 160}", "{time: 4/4}", "{key: C}", "", "{comment: Verse 1}", "{start_of_grid}", "| C | F | G | C |", "{end_of_grid}",
    "red blue green pink", "gray black white brown", "gold tan teal plum", "end", "", "{comment: Verse 2}", "Gone a[C]way blue green pink", "gray black white brown", "gold tan teal plum", "end", ""].join("\n");
  try {
    await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1800);
    await ev(`document.getElementById("ce-sound").checked = false; document.getElementById("ce-type").checked = true; 0`);
    assert.strictEqual(await ev(`__ceWork.loadCho(${JSON.stringify(cho)}, "pickup-test.cho")`), true); await set("ce-mfeel", "straight");
    await ev(`__ceWork.setTab(0); 0`); await ev(`document.getElementById("ce-nabc").focus(); 0`);
    await set("ce-nabc", 'M:4/4\nL:1/8\nK:C\n"C"C2 D2 E2 F2 | "F"G2 A2 B2 c2 | "G"c2 B2 A2 G2 | "C"c8 |'); await b.sleep(900); await ev(`document.getElementById("ce-nabc").blur(); 0`);
    await set("ce-sec-to", "1"); await click("ce-sec-apply"); await b.sleep(900);
    assert.strictEqual(await wl(1), "w: Gone a-way blue | green pink gray black | white brown gold tan | teal", "before any pickup: from the downbeat");
    // ---- a take from the top of Verse 2: two notes in the count-in, then stopped; the take is given back but for the pickup ----
    await ev(`__ceWork.setTab(1); 0`); assert.strictEqual(await ev(`__ceWork.start()`), 4);
    await click("ce-mrec"); await until("ce-status", /Count-in/, 25000);
    // the count-in is one bar (1.5 s at 160): two eighth notes on its last beat
    await ev(`(function(){ var t0 = performance.now(), fired = 0, iv = setInterval(function(){ var c = __entry.state && document.getElementById("ce-status").textContent; var el = performance.now() - t0;
        if (fired === 0 && el >= 1000){ fired = 1; __entry.on(67, 0.7, performance.now()); } else if (fired === 1 && el >= 1140){ fired = 2; __entry.off(67, performance.now()); }
        else if (fired === 2 && el >= 1190){ fired = 3; __entry.on(69, 0.7, performance.now()); } else if (fired === 3 && el >= 1330){ fired = 4; __entry.off(69, performance.now()); clearInterval(iv); } }, 4); })()`);
    await until("ce-status", /bar 5$/, 25000); await b.sleep(250); await click("ce-mrec"); await until("ce-note", /^Wrote \d+ notes/, 8000);
    let m = await mel();
    assert.deepStrictEqual(m[3].map(n => n[0]), [72, 67, 69], "the last bar of Verse 1: its own note, then the pickup: " + JSON.stringify(m[3]));
    assert(m[3][0][2] < 8 && m[3][0][1] + m[3][0][2] === m[3][1][1], "the held note is cut short where the pickup starts: " + JSON.stringify(m[3])); assert(m[3][1][1] >= 5, "the pickup is late in the bar");
    await set("ce-keep-bar", "4"); await click("ce-keep-go"); m = await mel();
    assert.deepStrictEqual(m[4].map(n => n[0]), [60, 62, 64, 65], "Verse 2's first bar is back"); assert.deepStrictEqual(m[3].map(n => n[0]), [72, 67, 69]);
    // ---- the words: the pickup takes Verse 2's first two syllables; Verse 1 keeps its own ----
    assert.strictEqual(await ev(`__ceWork.lyr()[1].lead`), 2); await ev(`__ceWork.setTab(1); 0`); assert.strictEqual(await val("ce-lead"), "2");
    assert(/^w: red blue green pink \| gray black white brown \| gold tan teal plum \| end (\* )?Gone a-$/.test(await wl(0)), await wl(0));      // (a star when the held note is written as two tied notes)
    assert.strictEqual(await wl(1), "w: way blue green pink | gray black white brown | gold tan teal plum | end");
    const out = await ev(`window.__ceChordPro()`); assert(/end (\* )?Gone a-\n\{end_of_abc\}/.test(out), out); assert(!/% lyrics: draft/.test(out), "sections that share a pickup go out as settled");
    // ---- and it can be set by hand ----
    await set("ce-lead", "0"); await b.sleep(300); assert.strictEqual(await wl(1), "w: Gone a-way blue | green pink gray black | white brown gold tan | teal");
    assert(/\| end( \*)+$/.test(await wl(0)), "Verse 1's words stop at its own last word: " + await wl(0));
    // ---- through the file and back: the words before Verse 2's first chord are its pickup again ----
    await set("ce-lead", "2"); await b.sleep(300);
    const saved = await ev(`window.__ceChordPro()`);
    assert.strictEqual(await ev(`__ceWork.loadCho(${JSON.stringify(saved)}, "pickup-test.cho")`), true); await b.sleep(600);
    assert.strictEqual(await ev(`__ceWork.lyr()[1].lead`), 2, "the pickup comes back from the file");
    assert(/end (\* )?Gone a-$/.test(await wl(0)), await wl(0));
    // ---- a new take of all of Verse 1 that plays nothing at its end: Verse 2's pickup stays ----
    await ev(`__ceWork.setTab(0); 0`); await set("ce-mrange", "section"); assert.strictEqual(await ev(`__ceWork.start()`), 0);
    await click("ce-mrec"); await until("ce-status", /Count-in/, 25000); await until("ce-status", /bar 1$/, 25000); await b.sleep(100);
    await ev(`__entry.on(60, 0.7, performance.now()); 0`); await b.sleep(300); await ev(`__entry.off(60, performance.now()); 0`);
    await until("ce-note", /^Wrote \d+ notes/, 25000); m = await mel();
    assert.deepStrictEqual(m[3].map(n => n[0]), [67, 69], "the pickup at the end of Verse 1 survives the take: " + JSON.stringify(m[3]));
    assert.strictEqual(await ev(`__ceWork.lyr()[1].lead`), 2);
    // ---- the words box shows the syllables; a split fixed there is the one the draft uses ----
    await ev(`__ceWork.setTab(1); 0`); await b.sleep(300); assert.strictEqual((await val("ce-words")).split("\n")[0], "Gone a-way blue green pink");
    await set("ce-words", "Gone a-way blue green pink\ngray black white brown\ngold tan teal plum\nend-ing"); await click("ce-wl-draft"); await b.sleep(500);
    assert(/\| end-$/.test(await wl(1)), "the split from the box: " + await wl(1));
    assert.deepStrictEqual(b.errors.filter(e => !/supabase/i.test(e)), []);
    console.log("PICKUP WORDS OK");
  } catch (e) { console.log("FAIL", e.message); try { console.log(await ev(`JSON.stringify({ note: document.getElementById("ce-note").textContent, lyr: __ceWork.lyr(), mel: __entry.grid().melody() })`)); } catch (x) {} process.exitCode = 1; }
  await b.close();
})();
