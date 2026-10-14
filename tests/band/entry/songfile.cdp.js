// The Chord Entry page with a ChordPro file from disk: the file read into bars, sections, words and the melody it has; the section's ABC box
// (there before any melody, bars pasted in, too few bars put at the start); the melody copied to a longer section; a bar clicked in the
// notation; Return and Space; the song-file box changed and read again; and the wide layout. Run from tests/band/lead, server on 8500:
//   node ../entry/songfile.cdp.js        ("SONG FILE OK")
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1600, height: 950 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const val = id => ev(`document.getElementById("${id}").value`), text = id => ev(`document.getElementById("${id}").textContent`);
  const set = (id, v) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event("input", { bubbles:true })); e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const click = id => ev(`document.getElementById("${id}").click(); 0`);
  const hidden = id => ev(`document.getElementById("${id}").hidden`);
  const key = (k, on) => ev(`(${on ? `document.getElementById("${on}")` : "document.body"}).dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(k)}, code: ${JSON.stringify(k === " " ? "Space" : k)}, bubbles: true, cancelable: true })); 0`);
  const errs = () => b.errors.filter(e => !/supabase/i.test(e));
  const mel = async () => JSON.parse(await ev(`JSON.stringify(__entry.grid().melody().map(function(x){ return (x || []).map(function(n){ return n.midi; }); }))`));
  const opts = id => ev(`Array.prototype.map.call(document.getElementById("${id}").options, function(o){ return o.textContent; }).join("|")`);
  const box = sel => ev(`(function(){ var r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; })()`);
  const cho = ["{title: Test Halls}", "{tempo: 200}", "{time: 4/4}", "{key: D}", "{style: carol}", "",
    "{comment: Intro}", "{start_of_abc}", "M:4/4", "L:1/4", "K:D", '"D"A G F E | "A7"D C "D"D2 ||', "{end_of_abc}", "",
    "{comment: Verse 1}", "{start_of_grid}", "| D | Bm | A7 . D . | A . D . |", "{end_of_grid}", "[D]Deck the halls with [Bm]boughs of holly", "[A7]Fa la la la [D]la la [A]la la [D]la", "",
    "{comment: Verse 2}", "[D]See the blazing [Bm]Yule before us", "[A7]Fa la la la [D]la la [A]la la [D]la", "",
    "{comment: Verse 3}", "{start_of_grid}", "| D | Bm | A7 . D . | A . D . |", "| G . D . | A7 . D . |", "{end_of_grid}", "[D]Fast away the [Bm]old year passes", "[A7]Fa la la la [D]la la [A]la la [D]la", "",
    "{comment: Coda}", "Sung with no chords written", ""].join("\n");
  try {
    await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1800);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    await ev(`document.getElementById("ce-sound").checked = false; document.getElementById("ce-type").checked = true; 0`);
    // ---- the file is read: bars from the grids, from the tune, and from the verse before; the tune's notes; the words ----
    assert.strictEqual(await ev(`__ceWork.loadCho(${JSON.stringify(cho)}, "test-halls.cho")`), true);
    assert.strictEqual(await ev(`Array.prototype.map.call(document.querySelectorAll("#ce-tabs .nav-link"), function(a){ return a.textContent; }).join("|")`), "All|Intro|Verse 1|Verse 2|Verse 3");
    assert.strictEqual(await val("ce-title"), "Test Halls"); assert.strictEqual(await val("ce-tempo"), "200"); assert.strictEqual(await val("ce-key"), "D"); assert.strictEqual(await val("ce-mode"), "melody");
    let m = await mel(); assert.deepStrictEqual(m.map(x => x.length), [4, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], JSON.stringify(m)); assert.deepStrictEqual(m[0], [69, 67, 66, 64]);
    assert(/"D"z8 \| "Bm"z8 \| "A7"z2z2"D"z2z2 \| "A"z2z2"D"z2z2 \|/.test(await ev(`__ceWork.choChart(${JSON.stringify(cho)}).abc`)), "the grid as bars");
    assert(/Loaded 16 bars of Test Halls\. It has the melody for 2 of its 16 bars/.test(await text("ce-note")), await text("ce-note")); assert(/No bars were found for Coda/.test(await text("ce-note")));
    assert.strictEqual(await ev(`__ceWork.tab()`), 1, "it opens on the first section with no melody"); assert.strictEqual(await ev(`__ceWork.lyr()[2].words.replace(/-/g, "")`), "See the blazing Yule before us\nFa la la la la la la la la");
    assert.strictEqual(await ev(`__ceWork.song().slug`), "test-halls");
    // ---- the wide window: the section's words and notes beside the chart, all on the first screen ----
    let ch = await box("#ce-chart"), sec = await box("#ce-sec"), na0 = await box("#ce-nabc"), rec = await box("#ce-mrec");
    assert(sec.l >= ch.r, "the section's panel is to the right of the chart"); assert(ch.t < 420 && rec.t < 500, "the chart and Record are near the top: " + ch.t + ", " + rec.t);
    assert.strictEqual(await ev(`document.getElementById("ce-mopts").open`), false, "the settings touched once are folded away");
    // ---- the ABC box is there before any melody; bars pasted in ----
    assert.strictEqual(await hidden("ce-nabc-f"), false); let na = await val("ce-nabc"); assert(/^M:4\/4\n/.test(na) && /K:D/.test(na), na);
    await ev(`document.getElementById("ce-nabc").focus(); 0`);
    await set("ce-nabc", 'M:4/4\nL:1/4\nK:D\n"D"A G F E | "Bm"D E F D | "A7"E G "D"F E | "A"D C "D"D2 |'); await b.sleep(900);
    m = await mel(); assert.deepStrictEqual(m.slice(2, 6), [[69, 67, 66, 64], [62, 64, 66, 62], [64, 67, 66, 64], [62, 61, 62]], JSON.stringify(m.slice(2, 6)));
    // ---- too few bars: on request they go at the start, the rest stays ----
    await set("ce-nabc", 'M:4/4\nL:1/4\nK:D\nd d d d | e e e e |'); await b.sleep(900);
    assert(/That is 2 bars; the section has 4/.test(await text("ce-nabc-warn")), await text("ce-nabc-warn")); assert(/Put these 2 bars at the start/.test(await text("ce-nabc-fit")), await text("ce-nabc-fit"));
    await ev(`document.getElementById("ce-nabc").blur(); 0`); await click("ce-nabc-fit");
    m = await mel(); assert.deepStrictEqual(m.slice(2, 6), [[74, 74, 74, 74], [76, 76, 76, 76], [64, 67, 66, 64], [62, 61, 62]], JSON.stringify(m.slice(2, 6)));
    assert.strictEqual((await val("ce-nabc")).split("|").length - 1 >= 4, true, "the box shows the whole section again"); assert.strictEqual(await hidden("ce-nabc-fit"), true);
    // ---- the melody onto a longer section: its first four bars ----
    assert.strictEqual(await opts("ce-sec-to"), "Verse 2, Verse 3|Verse 2|Verse 3 (its first 4 bars)|Intro (the first 2 bars of this)");
    await set("ce-sec-to", "3"); await click("ce-sec-apply");
    m = await mel(); assert.deepStrictEqual(m.slice(10, 14), m.slice(2, 6)); assert.deepStrictEqual([m[14].length, m[15].length, m[6].length], [0, 0, 0], "the last two bars of Verse 3, and Verse 2, are untouched");
    assert(/Verse 3 has 2 more bars, left as they were/.test(await text("ce-note")), await text("ce-note"));
    // ---- a bar clicked in the notation is where a take (and Hear it) starts ----
    await ev(`__ceWork.setTab(1); 0`); await b.sleep(300);
    assert.strictEqual(await ev(`__ceWork.start()`), 2);
    await ev(`(function(){ var el = document.querySelector("#ce-score .abcjs-note.abcjs-mm4"), r = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: r.left + 2, clientY: r.top + 2 })); })()`);
    assert.strictEqual(await ev(`__ceWork.start()`), 4); assert.strictEqual(await ev(`document.querySelector('#ce-chart .tc-bar.ce-start').getAttribute("data-bar")`), "4");
    assert.strictEqual(await ev(`document.querySelectorAll("#ce-score .ce-startmark").length`), 1, "and it is marked in the notation");
    // (a click on the staff between the notes of bar 4 counts as bar 4 too)
    await ev(`(function(){ var els = document.querySelectorAll("#ce-score .abcjs-note.abcjs-mm3"), r = els[els.length - 1].getBoundingClientRect(), svg = els[0].closest("svg"); svg.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: r.right + 6, clientY: r.top })); })()`);
    assert.strictEqual(await ev(`__ceWork.start()`), 3);
    // ---- the start of the next section under this one, in the chart and in the notation; the chart put away, the tabs staying ----
    await ev(`__ceWork.setTab(1); 0`); await b.sleep(200);
    assert.strictEqual(await ev(`Array.prototype.map.call(document.querySelectorAll(".ce-nextlab"), function(x){ return x.textContent; }).join("|")`), "Next: Verse 2|Next: Verse 2");
    assert.strictEqual(await ev(`document.querySelector("#ce-chart .tc-system.ce-next .tc-bar[data-bar]").getAttribute("data-bar")`), "6"); assert.strictEqual(await ev(`document.querySelectorAll("#ce-score .ce-next").length`), 1);
    assert.strictEqual(await ev(`Array.prototype.filter.call(document.querySelectorAll("#ce-chart .tc-system"), function(r){ return !r.hidden; }).length`), 2);
    await click("ce-show-next"); assert.strictEqual(await ev(`document.querySelectorAll(".ce-nextlab, .ce-next").length`), 0); await click("ce-show-next");
    await click("ce-show-chart"); assert.strictEqual(await hidden("ce-chart"), true); assert.strictEqual(await hidden("ce-tabs"), false); assert.strictEqual(await ev(`document.querySelectorAll("#ce-score .ce-nextlab").length`), 1); await click("ce-show-chart");
    await ev(`document.querySelector('#ce-chart .tc-system.ce-next .tc-bar[data-bar="7"]').click(); 0`); assert.strictEqual(await ev(`__ceWork.tab()`), 2, "a bar of the preview clicked: its section"); assert.strictEqual(await ev(`__ceWork.start()`), 7);
    await ev(`__ceWork.setTab(1); 0`); await ev(`document.querySelector('#ce-chart .tc-bar[data-bar="3"]').click(); 0`);
    const dw = await box("#ce-dwim"), sd = await box("#ce-p-enter"); assert(dw.l >= sd.l - 2 && dw.t >= sd.b - 2 && dw.t < 950, "the what-did-I-mean panel is under the controls, on the first screen: " + JSON.stringify(dw));
    // ---- Space: Hear it, and stop. Return: record, and stop. Neither while typing in a box. ----
    await key(" "); await b.sleep(400); assert.notStrictEqual(await ev(`__entry.state()`), "idle", "Space starts Hear it"); assert.strictEqual(await ev(`__entry.recording()`), false);
    await key(" "); await b.sleep(400); assert.strictEqual(await ev(`__entry.state()`), "idle", "and stops it");
    await key("Enter", "ce-nabc"); await key(" ", "ce-words"); await b.sleep(200); assert.strictEqual(await ev(`__entry.recording()`), false); assert.strictEqual(await ev(`__entry.state()`), "idle");
    await key("Enter"); await b.sleep(400); assert.strictEqual(await ev(`__entry.recording()`), true, "Return records"); assert(/Recording bars 4/.test(await text("ce-note")), await text("ce-note"));
    await key("Enter"); await b.sleep(400); assert.strictEqual(await ev(`__entry.recording()`), false, "and stops");
    m = await mel(); assert.deepStrictEqual(m[2], [74, 74, 74, 74], "a take stopped in the count-in changes nothing");
    // ---- the song-file box: the file with the melodies in; changed there and read again ----
    await set("ce-wl", "w: Deck the halls with | boughs of hol-ly | Fa la la la | la la la_"); await b.sleep(500);
    await ev(`document.getElementById("ce-p-cho").open = true; 0`); await b.sleep(200);
    let file = await val("ce-cho"); assert(/\{comment: Verse 1\}\n\{start_of_abc: melody\}\nM:4\/4/.test(file), file.slice(0, 600)); assert(/w: Deck the halls with \| boughs of hol-ly/.test(file));
    assert.strictEqual(await ev(`document.getElementById("ce-cho-apply").disabled`), true);
    await ev(`document.getElementById("ce-cho").focus(); 0`); await set("ce-cho", file.replace("| G . D . | A7 . D . |", "| Em . D . | A7 . D . | D |")); assert.strictEqual(await ev(`document.getElementById("ce-cho-apply").disabled`), false);
    await click("ce-cho-apply"); await b.sleep(600);
    assert(/"Em"z4"D"z4 \| "A7"z4"D"z4 \| "D"z8 \|/.test(await val("ce-abc")) || /"Em"/.test(await val("ce-abc")), await val("ce-abc")); assert.strictEqual(await ev(`__entry.grid().length()`), 17, "Verse 3 has a bar more");
    m = await mel(); assert.deepStrictEqual(m.slice(2, 6), [[74, 74, 74, 74], [76, 76, 76, 76], [64, 67, 66, 64], [62, 61, 62]], "the melody came back from the text: " + JSON.stringify(m.slice(2, 6)));
    assert.deepStrictEqual(m.slice(10, 14), m.slice(2, 6), "Verse 3's too");
    assert.strictEqual(await ev(`__ceWork.lyr()[1].mine`), true, "words edited by hand are still yours"); assert.strictEqual(await ev(`__ceWork.lyr()[1].wl[0]`), "w: Deck the halls with | boughs of hol-ly | Fa la la la | la la la_");
    assert.strictEqual(await ev(`__ceWork.lyr()[3].mine`), false, "a draft is still a draft"); assert.strictEqual(await ev(`document.getElementById("ce-cho-apply").disabled`), true);
    assert(/Verse 3 has a tune of 6 bars beside a grid of 7: its bars are at the start/.test(await text("ce-note")), await text("ce-note"));
    // the file as it would be saved now: Verse 3's tune written out again with its seventh bar, the rest as it was typed
    const again = await ev(`window.__ceChordPro()`); assert.strictEqual(again, await val("ce-cho")); assert.strictEqual(again.split("{comment: Verse 3}")[1].split("{end_of_abc}")[0].split("\n").filter(l => !/^w:/.test(l)).join("\n").split("|").length - 1, 7);
    assert.strictEqual(again.split("{comment: Verse 3}")[0], (await ev(`__ceWork.song().cho`)).split("{comment: Verse 3}")[0]); assert.strictEqual((again.match(/\{start_of_abc: melody\}/g) || []).length, 2); assert.strictEqual((again.match(/\{start_of_abc\}/g) || []).length, 1, "the Intro's own tune is as it was");
    // ---- a narrower window: one column, as before ----
    await b.resize(1100, 900); await b.sleep(300);
    ch = await box("#ce-score"); sec = await box("#ce-sec"); assert(sec.t >= ch.b - 1 && sec.l < 200, "the section's panel is under the notation");
    assert.strictEqual(await ev(`document.getElementById("ce-mopts").open`), true);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    console.log("SONG FILE OK");
  } catch (e) { console.log("FAIL", e.message); try { console.log((await ev(`JSON.stringify({ note: document.getElementById("ce-note").textContent, abc: document.getElementById("ce-abc").value, nabc: document.getElementById("ce-nabc").value, warn: document.getElementById("ce-nabc-warn").textContent })`)).slice(0, 1500)); } catch (x) {} process.exitCode = 1; }
  await b.close();
})();
