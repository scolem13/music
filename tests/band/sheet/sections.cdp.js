// Chord Sheet: several superimposed diagrams at once ("Sections"), each voice-led on its own, with a
// slash chord setting the lowest note. Server on 8500.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1300 }); const ev = x => b.eval(x);
  const check = (id, on) => ev(`(function(){ var c = document.getElementById("${id}"); if (c.checked !== ${on}){ c.checked = ${on}; c.dispatchEvent(new Event("change", { bubbles:true })); } })()`);
  const sections = v => ev(`(function(){ var t = document.getElementById("super-sections"); t.value = ${JSON.stringify(v)}; t.dispatchEvent(new Event("input", { bubbles:true })); })()`);
  // per keyboard diagram: its name, lane labels, and each lane's lowest square (x, in key widths from the left)
  const read = () => ev(`JSON.stringify(Array.from(document.querySelectorAll(".inst-section")).map(function(sec){ return { inst: sec.querySelector("h3").textContent, cards: Array.from(sec.querySelectorAll(".super-card")).map(function(c){
    var name = (c.querySelector(".super-section-name") || {}).textContent || "", labels = Array.from(c.querySelectorAll("text.super-lane-label")).map(function(t){ return t.textContent; });
    return name + ": " + labels.join(" "); }) }; }))`);
  try {
    await b.goto("http://127.0.0.1:8500/tools/chord-sheet.html"); await ev(`localStorage.removeItem("chordSheetSections")`); await b.goto("http://127.0.0.1:8500/tools/chord-sheet.html"); await b.sleep(1200);
    await ev(`(function(){ var t = document.getElementById("chords-textarea"); t.value = "C G Am F"; t.dispatchEvent(new Event("blur")); })()`); await b.sleep(400);
    await ev(`(function(){ document.querySelectorAll("[data-inst-id]").forEach(function(c){ var want = c.dataset.instId === "guitar" || c.dataset.instId === "keyboard"; if (c.checked !== want){ c.checked = want; c.dispatchEvent(new Event("change", { bubbles:true })); } }); })()`);
    await check("chk-super", true); await b.sleep(600);
    let r = JSON.parse(await read()); assert.deepStrictEqual(r.map(x => x.cards.length), [1, 1], "nothing typed: the one diagram, as before"); assert.strictEqual(r[0].cards[0], ": C G Am F");
    await sections("Verse: C G Am F\nChorus: F C/E G Am\nDm7 G7 Cmaj7 A7 Dm7 Xyz"); await b.sleep(900);
    r = JSON.parse(await read()); console.log(JSON.stringify(r));
    assert.deepStrictEqual(r[0].cards, ["Verse: C G Am F", "Chorus: F C/E G Am", "Section 3: Dm7 G7 Cmaj7 A7"]); assert.deepStrictEqual(r[1].cards, r[0].cards, "guitar gets the same sections");
    const note = await ev(`document.getElementById("super-sections-note").textContent`); console.log("note:", note); assert(/Xyz/.test(note) && /more than four/.test(note));
    // C is root position in the verse (C lowest) and first inversion in the chorus (E lowest)
    const lows = JSON.parse(await ev(`JSON.stringify(Array.from(document.querySelectorAll(".inst-section")[0].querySelectorAll(".super-card")).slice(0, 2).map(function(c){
      var out = {}, labels = Array.from(c.querySelectorAll("text.super-lane-label")), rects = Array.from(c.querySelectorAll("rect[rx]")), texts = Array.from(c.querySelectorAll("text"));
      labels.forEach(function(l, k){ var y = +l.getAttribute("y"), row = rects.filter(function(q){ return Math.abs(+q.getAttribute("y") + (+q.getAttribute("height")) / 2 + 3 - y + 6) < 14; });
        var lowest = row.sort(function(a, z){ return a.getAttribute("x") - z.getAttribute("x"); })[0]; out[l.textContent] = lowest ? (lowest.getAttribute("fill") === "#fff" ? "other" : "root") : "?"; });
      return out; }))`));
    console.log("lowest note of each chord (root or other):", JSON.stringify(lows));
    assert.strictEqual(lows[0]["C"], "root", "verse C starts in root position"); assert.strictEqual(lows[1]["C/E"], "other", "chorus C/E has another note lowest");
    assert.strictEqual(await ev(`document.querySelectorAll("#super-picks button").length`), 0); assert.strictEqual(await ev(`document.querySelectorAll(".diagram-card").length`), 8, "the chord list's cards are untouched");
    await b.shot("sections.png");
    // remembered; emptying the box goes back to the single diagram
    await b.goto("http://127.0.0.1:8500/tools/chord-sheet.html"); await b.sleep(1000); assert(/Chorus: F C\/E/.test(await ev(`document.getElementById("super-sections").value`)), "sections are remembered");
    await sections(""); await b.sleep(600); await ev(`localStorage.removeItem("chordSheetSections")`);
    const errs = b.errors.filter(e => !/supabaseUrl|createClient/.test(e)); assert.strictEqual(errs.length, 0, JSON.stringify(errs)); console.log("SECTIONS OK");
  } finally { await b.close(); } })().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
