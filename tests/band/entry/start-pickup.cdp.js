// Chord Entry: a song whose first words come before its first chord, with no intro ("Oh, you [A]better watch out"). The notes played in the
// count-in make a short bar in front of bar 1; it rides on the first line of music (not one of its four bars), comes back from the saved .cho
// with its notes and words, and a pickup sent from the Backing Track (#from=tune with d.pickup) arrives the same way.
// Run from tests/band/lead, server on 8500:   node ../entry/start-pickup.cdp.js        ("START PICKUP OK")
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1600, height: 950 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const set = (id, v) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event("input", { bubbles:true })); e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const text = id => ev(`document.getElementById("${id}").textContent`);
  const until = async (id, re, ms) => { const t = Date.now(); let s = ""; while (Date.now() - t < ms){ s = await text(id); if (re.test(s)) return s; await b.sleep(10); } throw new Error("never saw " + re + " in " + id + ": " + s); };
  const mel = async () => JSON.parse(await ev(`JSON.stringify(__entry.grid().melody().map(function(x){ return (x || []).map(function(n){ return [n.midi, n.pos, n.dur]; }); }))`));
  const score = () => ev(`__ceWork.scoreText()`);
  const cho = ["{title: Start Pickup}", "{tempo: 132}", "{key: A}", "", "{comment: Verse 1}", "Oh, you [A]better watch out", "You [D]better not cry",
    "You [A]better not pout I'm [D]telling you why", "[A]Santa [F#m]Claus is [Bm7]coming [E7] to [A]town", "",
    "{comment: Verse 2}", "He's [A]making a list", "And he's [D]checking it twice", "He's [A]gonna find out who's [D]naughty or nice", "[A]Santa [F#m]Claus is [Bm7]coming [E7] to [A]town", "",
    "{start_of_abc: band}", "X:1", "M:4/4", "L:1/4", "K:A", "P:Verse 1", '"A"z4 | "D"z4 | "A"z4 | "D"z4 |', '"A"z2 "F#m"z2 | "Bm7"z2 "E7"z2 | "A"z4 | z4 |',
    "P:Verse 2", '"A"z4 | "D"z4 | "A"z4 | "D"z4 |', '"A"z2 "F#m"z2 | "Bm7"z2 "E7"z2 | "A"z4 | "A7"z4 |]', "{end_of_abc}", ""].join("\n");
  try {
    await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1800);
    await ev(`document.getElementById("ce-sound").checked = false; document.getElementById("ce-type").checked = true; 0`);
    assert.strictEqual(await ev(`__ceWork.loadCho(${JSON.stringify(cho)}, "start-pickup.cho")`), true); await b.sleep(600); await set("ce-mfeel", "straight");
    await ev(`__ceWork.setTab(0); 0`); await set("ce-mrange", "section"); assert.strictEqual(await ev(`__ceWork.start()`), 0);
    // ---- a take of Verse 1: "Oh, you" on beats 3 and 4 of the count-in, then two bars ----
    await ev(`document.getElementById("ce-mrec").click(); 0`); await until("ce-status", /Count-in/, 25000);
    const bs = 60000 / 132, L = [[73, 2], [74, 3], [76, 4], [76, 5], [78, 6], [80, 7], [81, 8], [81, 9], [81, 10]].map(x => [x[0], x[1] * bs]);
    await ev(`(function(){ var t0 = performance.now(), L = ${JSON.stringify(L)}, i = 0, on = -1, iv = setInterval(function(){ var el = performance.now() - t0;
      if (on >= 0 && el >= L[on][1] + ${bs * 0.8}){ __entry.off(L[on][0], performance.now()); on = -1; }
      if (i < L.length && on < 0 && el >= L[i][1]){ __entry.on(L[i][0], 0.7, performance.now()); on = i; i++; }
      if (i >= L.length && on < 0) clearInterval(iv); }, 3); })()`);
    await until("ce-status", /bar 4$/, 25000); await b.sleep(200); await ev(`document.getElementById("ce-mrec").click(); 0`); await until("ce-note", /^Wrote/, 8000);
    let m = await mel();
    assert.strictEqual(await ev(`__entry.grid().geo(0).pickup`), true, "a short bar in front");
    assert.deepStrictEqual(m[0].map(n => n[0]), [73, 74], "the pickup's notes: " + JSON.stringify(m[0])); assert.deepStrictEqual(m[1].map(n => n[0]), [76, 76, 78, 80]);
    let s = await score(), v1 = s.split("P:Verse 1\n")[1].split("\n");
    assert(/^c2 d2 \| "A"e2 e2 f2 g2 \| "D"a2 a2 a2 z2 \| "A"z8 \| "D"z8 \|$/.test(v1[0]), "the pickup rides on the first line with four bars: " + v1[0]);
    assert(/^w: Oh, you \| bet-ter watch out \|/.test(v1[1]), v1[1]); assert(/^"A"z4 "F#m"z4 \| "Bm7"z4 "E7"z4 \| "A"z8 \| z8 \|$/.test(v1[2]), "the second line: " + v1[2]);
    assert.deepStrictEqual(await ev(`__ceWork.sections().map(function(x){ return x.from; })`), [0, 9]);
    // ---- saved and read back: the pickup bar, its notes and the words are where they were ----
    const saved = await ev(`window.__ceChordPro()`);
    assert(/\{start_of_abc: melody\}\nM:4\/4\nL:1\/8\nK:A\n(% lyrics: draft\n)?c2 d2 \| "A"e2/.test(saved), saved);
    assert.strictEqual(await ev(`__ceWork.loadCho(${JSON.stringify(saved)}, "start-pickup.cho")`), true); await b.sleep(600);
    assert(/^Loaded 16 bars of Start Pickup\. It has the melody for 2 of its 16 bars\./.test(await text("ce-note")), await text("ce-note"));
    assert.strictEqual(await ev(`__entry.grid().geo(0).pickup`), true); assert.strictEqual(await ev(`__entry.grid().geo(0).bpb`), 2);
    assert.deepStrictEqual(await mel().then(x => x.slice(0, 3)), m.slice(0, 3), "the same notes after a reload");
    s = await score(); v1 = s.split("P:Verse 1\n")[1].split("\n");
    assert(/^c2 d2 \| "A"e2/.test(v1[0]) && /^w: Oh, you \| bet-ter watch out \|/.test(v1[1]), "notes and words after a reload: " + v1.slice(0, 2).join(" / "));
    // ---- the Verse 2 take still starts on its own first bar ----
    await ev(`__ceWork.setTab(1); 0`); assert.strictEqual(await ev(`__ceWork.start()`), 9);
    // ---- from the Backing Track: changes with no pickup bar, the melody's pickup sent beside them ----
    const d = { abc: 'X:1\nT:Sent\nM:4/4\nL:1/4\nK:A\nP:Verse 1\n"A"z4 | "D"z4 | "A"z4 | "D"z4 |\nP:Verse 2\n"A"z4 | "D"z4 | "A"z4 | "D"z4 |]', title: "Sent", tempo: 132, have: 1, total: 8,
      gridMelody: [[{ pos: 0, dur: 2, midi: 76 }, { pos: 2, dur: 2, midi: 76 }], [], [], [], [], [], [], []], pickup: { beats: 2, notes: [{ pos: 0, dur: 2, midi: 73 }, { pos: 2, dur: 2, midi: 74 }] } };
    await b.goto("about:blank"); await b.goto(B + "/tools/chord-entry.html#from=tune&d=" + encodeURIComponent(JSON.stringify(d))); await b.sleep(1800);
    assert.strictEqual(await ev(`__entry.grid().length()`), 9); assert.strictEqual(await ev(`__entry.grid().geo(0).pickup`), true);
    m = await mel(); assert.deepStrictEqual(m[0].map(n => n[0]), [73, 74]); assert.deepStrictEqual(m[1].map(n => n[0]), [76, 76]);
    assert.deepStrictEqual(await ev(`__ceWork.sections().map(function(x){ return x.name + ":" + x.from; })`), ["Verse 1:0", "Verse 2:5"]);
    assert(/^Loaded 8 bars of Sent/.test(await text("ce-note")), await text("ce-note"));
    assert.deepStrictEqual(b.errors.filter(e => !/supabase/i.test(e)), []);
    console.log("START PICKUP OK");
  } catch (e) { console.log("FAIL", e.message); try { console.log(await ev(`JSON.stringify({ note: document.getElementById("ce-note").textContent, mel: __entry.grid().melody().slice(0, 3) })`)); } catch (x) {} process.exitCode = 1; }
  await b.close();
})();
