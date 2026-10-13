// The Chord Entry page with a song from the lyrics site: sections on tabs, a take that starts at a clicked bar and replaces only its
// own bars, keeping part of a take, the melody copied to the later verses, the words under the notes (drafted, then edited), the
// song's ChordPro file with it all written in, and the work kept between visits. Run from tests/band/lead, server on 8500:
//   node ../entry/sections.cdp.js        ("SECTIONS OK")
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1600 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const val = id => ev(`document.getElementById("${id}").value`), text = id => ev(`document.getElementById("${id}").textContent`);
  const set = (id, v) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event("input", { bubbles:true })); e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const click = id => ev(`document.getElementById("${id}").click(); 0`);
  const hidden = id => ev(`document.getElementById("${id}").hidden`);
  const errs = () => b.errors.filter(e => !/supabase/i.test(e));
  const until = async (id, re, ms) => { const t = Date.now(); let s = ""; while (Date.now() - t < ms){ s = await text(id); if (re.test(s)) return s; await b.sleep(30); } throw new Error("never saw " + re + " in " + id + ": " + s); };
  const mel = async () => JSON.parse(await ev(`JSON.stringify(__entry.grid().melody().map(function(x){ return (x || []).map(function(n){ return n.midi; }); }))`));
  // strike each [midi, on, off] (beats from the top of the tune) as the band reaches it; stopAt: press the record button again at that beat
  const feed = (notes, stopAt) => ev(`(function(){ var n = ${JSON.stringify(notes)}, on = [], off = [], stop = ${stopAt == null ? "null" : stopAt}, iv = setInterval(function(){ var w = __entry.where(); if (w == null) return;
      n.forEach(function(x, i){ if (!on[i] && w >= x[1]){ on[i] = 1; __entry.on(x[0], 0.7, performance.now()); } if (on[i] && !off[i] && w >= x[2]){ off[i] = 1; __entry.off(x[0], performance.now()); } });
      if (stop != null && w >= stop){ clearInterval(iv); document.getElementById("ce-mrec").click(); } else if (stop == null && off[n.length - 1]) clearInterval(iv); }, 4); })()`);
  const quarters = (bars, base) => { const out = []; bars.forEach(bar => { for (let k = 0; k < 4; k++) out.push([base + k, bar * 4 + k + 0.02, bar * 4 + k + 0.9]); }); return out; };
  const abc = ["X:1", "T:Test Carol", "M:4/4", "L:1/8", "K:C", "P:Intro", '"C"z8 | "G"z8 |', "P:Verse 1", '"C"z8 | "F"z8 | "G"z8 | "C"z8 |', "P:Verse 2", '"C"z8 | "F"z8 | "G"z8 | "C"z8 |'].join("\n");
  const cho = ["{title: Test Carol}", "{tempo: 200}", "", "{comment: Intro}", "{start_of_grid}", "| C | G |", "{end_of_grid}", "", "{comment: Verse 1}", "{start_of_grid}", "| C | F | G | C |", "{end_of_grid}",
    "[C]Deck the halls with [F]boughs of holly now", "[G]Fa la la la [C]la la la la", "", "{comment: Verse 2}", "[C]See the blazing [F]Yule before us now", "[G]Fa la la la [C]la la la la", ""].join("\n");
  const link = B + "/tools/chord-entry.html#from=tune&d=" + encodeURIComponent(JSON.stringify({ abc, cho, slug: "test-carol", title: "Test Carol", tempo: 200, style: "carol", have: 0, total: 10 }));
  try {
    await b.goto(link); await b.sleep(1800);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    await ev(`document.getElementById("ce-sound").checked = false; 0`); await set("ce-mfeel", "straight");
    // ---- sections on tabs; the words came with the song ----
    assert.strictEqual(await ev(`Array.prototype.map.call(document.querySelectorAll("#ce-tabs .nav-link"), function(a){ return a.textContent; }).join("|")`), "All|Intro|Verse 1|Verse 2");
    assert.strictEqual(await ev(`__ceWork.tab()`), 0, "it opens on the first section with no melody");
    assert.strictEqual(await ev(`__ceWork.lyr()[1].words`), "Deck the halls with boughs of holly now\nFa la la la la la la la");
    await ev(`__ceWork.setTab(1); 0`);
    assert.strictEqual(await ev(`Array.prototype.filter.call(document.querySelectorAll("#ce-chart .tc-system"), function(r){ return !r.hidden; }).length`), 1, "only the section's row of the chart shows");
    assert.strictEqual(await ev(`__ceWork.start()`), 2); assert(/starts at bar 3 \(Verse 1\) and runs to bar 6/.test(await text("ce-mstart")), await text("ce-mstart"));
    assert.strictEqual(await val("ce-words"), "Deck the halls with boughs of holly now\nFa la la la la la la la");
    // ---- click a bar: the take starts there ----
    await ev(`document.querySelector('#ce-chart .tc-bar[data-bar="4"]').click(); 0`);
    assert.strictEqual(await ev(`__ceWork.start()`), 4); assert.strictEqual(await ev(`document.querySelector('#ce-chart .tc-bar.ce-start').getAttribute("data-bar")`), "4");
    await ev(`document.querySelector('#ce-chart .tc-bar[data-bar="2"]').click(); 0`);
    // ---- a take over Verse 1 only: it ends by itself at the section's last bar ----
    await click("ce-mrec"); await until("ce-status", /bar 3$/, 25000);
    await feed(quarters([2, 3, 4, 5], 60));
    await until("ce-note", /^Wrote 16 notes/, 25000);
    let m = await mel();
    assert.deepStrictEqual(m.map(x => x.length), [0, 0, 4, 4, 4, 4, 0, 0, 0, 0], "only the section's bars were written: " + JSON.stringify(m));
    assert.strictEqual(await hidden("ce-keep"), false); assert(/wrote bars 3–6/.test(await text("ce-keep-note")), await text("ce-keep-note"));
    // ---- the words go under the notes: a draft, a syllable to a note ----
    await b.sleep(900);                                                     // (the dictionary arrives and the draft is made again)
    let wl = await val("ce-wl");
    assert.strictEqual(wl, "w: Deck the halls with | boughs of hol-ly | now Fa la la | la la la la", wl);
    assert(/A draft/.test(await text("ce-wl-state"))); assert(/1 syllable.* left over|syllables? left over/.test(await text("ce-wl-warn")), await text("ce-wl-warn"));
    assert(/w: Deck the halls with/.test(await ev(`__ceWork.scoreText()`)));
    assert.strictEqual(await ev(`/Deck/.test(document.getElementById("ce-score").textContent)`), true, "the words are drawn in the notation");
    // ---- the same melody on Verse 2, with Verse 2's words ----
    assert.strictEqual(await text("ce-sec-apply"), "Apply this melody to Verse 2"); await click("ce-sec-apply");
    m = await mel(); assert.deepStrictEqual(m.slice(6), m.slice(2, 6), "Verse 2 has Verse 1's notes");
    assert(/^w: See the blaz-ing \| Yule be-fore us/.test(await ev(`__ceWork.lyr()[2].wl[0]`)), await ev(`__ceWork.lyr()[2].wl[0]`));
    // ---- edit the line under the notes: it is yours from then on ----
    await set("ce-wl", "w: Deck the halls with | boughs of hol-ly | now_ Fa la la | la la la la"); await b.sleep(500);
    assert.strictEqual(await ev(`__ceWork.lyr()[1].mine`), true); assert(/Yours/.test(await text("ce-wl-state")));
    assert(/now_ Fa la la/.test(await ev(`__ceWork.scoreText()`)), "the notation follows the edit");
    assert(/line 1, bar 3: 5 syllables for 4 notes/i.test(await text("ce-wl-warn")), await text("ce-wl-warn"));
    // ---- a take on Verse 2, stopped part-way; keep it up to bar 7 ----
    await ev(`__ceWork.setTab(2); 0`); assert.strictEqual(await ev(`__ceWork.start()`), 6);
    assert.strictEqual(await ev(`document.getElementById("ce-score").querySelectorAll("svg").length - Array.prototype.filter.call(document.getElementById("ce-score").querySelectorAll("svg"), function(v){ return v.hidden || v.parentNode.hidden; }).length`), 1, "one line of notation shows: the section's");
    await click("ce-mrec"); await until("ce-status", /bar 7$/, 25000);
    await feed(quarters([6, 7], 72), 8 * 4 + 1.5);
    await until("ce-note", /^Wrote \d+ notes/, 25000);
    m = await mel(); assert.deepStrictEqual([m[6][0], m[7][0], m[9][0]], [72, 72, 60], "bars 7 and 8 are the new take, bar 10 is untouched: " + JSON.stringify(m));
    assert.strictEqual(await val("ce-keep-bar"), "8", "the bar before the one it stopped in"); await set("ce-keep-bar", "7"); await click("ce-keep-go");
    m = await mel(); assert.deepStrictEqual([m[6][0], m[7][0], m[8][0]], [72, 60, 60], "bar 7 kept, bar 8 on as before the take: " + JSON.stringify(m));
    assert(/Kept the take up to bar 7; bars 8–\d+ are as they were/.test(await text("ce-note")), await text("ce-note")); assert.strictEqual(await ev(`__ceWork.start()`), 7, "the next take starts at bar 8");
    // ---- the song's own file, with the melody and the words written in ----
    const out = await ev(`window.__ceChordPro()`), lines = out.split("\n");
    const v1 = lines.indexOf("{comment: Verse 1}"), v2 = lines.indexOf("{comment: Verse 2}");
    assert.strictEqual(lines[v1 + 1], "{start_of_abc: melody}"); assert.strictEqual(lines[v2 + 1], "{start_of_abc: melody}");
    const blk = lines.slice(v1 + 1, lines.indexOf("{end_of_abc}", v1) + 1);
    assert.deepStrictEqual(blk.slice(1, 4), ["M:4/4", "L:1/8", "K:C"]); assert(blk.indexOf("% lyrics: draft") < 0, "an edited section is not a draft");
    assert(blk.some(l => /^w: Deck the halls with \| boughs of hol-ly \| now_ Fa la la/.test(l)), blk.join("\n"));
    assert(blk.some(l => /^"C"C2 _D2 =D2 _E2 \|/.test(l)), blk.join("\n"));
    assert.strictEqual(lines[lines.indexOf("{end_of_abc}", v1) + 1], "{start_of_grid}", "the section's grid and words follow as they were");
    assert(lines.indexOf("[C]Deck the halls with [F]boughs of holly now") > v1); assert(lines.slice(v2).indexOf("% lyrics: draft") > 0, "Verse 2 is still a draft");
    assert.strictEqual(lines.indexOf("{comment: Intro}") + 1, lines.indexOf("{start_of_grid}"), "a section with no melody is left alone");
    // ---- the work is kept: a plain visit brings it back, the same song sent again picks it up, and it can be loaded afresh ----
    await ev(`__ceWork.save(); 0`); await b.goto("about:blank"); await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1500);
    assert.strictEqual(await val("ce-title"), "Test Carol"); assert.strictEqual(await val("ce-mode"), "melody");
    assert(/is back as you left it/.test(await text("ce-work-note")), await text("ce-work-note"));
    m = await mel(); assert.deepStrictEqual(m.map(x => x.length), [0, 0, 4, 4, 4, 4, 4, 4, 4, 4]); assert.strictEqual(await ev(`__ceWork.lyr()[1].mine`), true); assert.strictEqual(await ev(`__ceWork.tab()`), 2);
    await b.goto("about:blank"); await b.goto(link); await b.sleep(1500);
    assert(/Picked up your work on Test Carol/.test(await text("ce-work-note")), await text("ce-work-note")); assert.strictEqual(await hidden("ce-work-fresh"), false);
    assert.strictEqual((await mel()).filter(x => x.length).length, 8);
    await click("ce-work-fresh"); assert.strictEqual((await mel()).filter(x => x && x.length).length, 0, "afresh: the song as it was sent"); assert.strictEqual(await hidden("ce-work"), true);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    console.log("SECTIONS OK");
  } catch (e) { console.log("FAIL", e.message); try { console.log((await ev(`JSON.stringify({ lyr: __ceWork.lyr(), tab: __ceWork.tab(), abc: document.getElementById("ce-abc").value, note: document.getElementById("ce-note").textContent, sec: document.getElementById("ce-sec-note").textContent })`)).slice(0, 1800)); } catch (x) {} process.exitCode = 1; } finally { await b.close(); }
})();
