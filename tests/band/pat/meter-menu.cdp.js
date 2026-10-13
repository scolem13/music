// The Meter menu on both layouts (A: tools/backing-track.html, the plain one: backing-track-classic.html).
// A built-in preset still changes meter as before; a built-in setup and a hand-edited chord-only ABC are re-barred to each meter and
// back (BandRebar) and the player still starts; a chart with melody notes shows the meter as text with a link to the M: line instead
// of the menu; a meter one chart cannot take puts the menu back and says why; the bottom bar of layout A keeps its height.
// Needs the test server (see ../README.md) and both pages rendered into lead/site. Prints "METER MENU OK".
const assert = require("assert"), { launch } = require("../lead/cdp.js");
const URL = "http://127.0.0.1:8500/tools/";
(async () => {
  const b = await launch({ width: 1800, height: 1000 });
  const ev = x => Promise.race([b.eval(x), b.sleep(10000).then(() => { throw new Error("eval timed out: " + x.slice(0, 80)); })]);
  const $ = id => `document.getElementById(${JSON.stringify(id)})`;
  const set = (id, v) => ev(`(function(){ var e = ${$(id)}; e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  const typeAbc = async abc => { await ev(`(function(){ var t = ${$("bt-abc")}; t.value = ${JSON.stringify(abc)}; t.dispatchEvent(new Event("input", { bubbles: true })); })()`); await b.sleep(600); };
  // chords as the band reads them, from the page's own ABC
  const chords = () => ev(`BandHarmony.buildForm(TuneChart.parse(${$("bt-abc")}.value), 0).map(function(f, i){ return f.chords.map(function(c){ return i + ":" + c.pos; }).join(","); }).join(" ")`);
  const count = () => ev(`BandHarmony.buildForm(TuneChart.parse(${$("bt-abc")}.value), 0).reduce(function(n, f){ return n + f.chords.length; }, 0)`);
  const state = () => ev(`(function(){ var s = ${$("bt-meter")}, f = ${$("bt-meter-fixed")}; return JSON.stringify({ meter: s.value, menu: !s.hidden && f.hidden, text: f.hidden ? "" : ${$("bt-meter-text")}.textContent,
    abcM: (/^M:(.*)$/m.exec(${$("bt-abc")}.value) || [])[1], changes: ${$("bt-changes")}.value, tempo: ${$("bt-tempo-n")}.value, note: ${$("bt-abc-note")}.textContent, bar: (function(){ var p = document.getElementById("dxa-bar"); return p ? Math.round(p.getBoundingClientRect().height) : 0; })() }); })()`).then(JSON.parse);
  const plays = async () => { await set("bt-tempo-n", 240); await ev(`${$("bt-play")}.click(); 0`);
    const t0 = Date.now(); let st = ""; while (Date.now() - t0 < 25000) { st = await ev(`${$("bt-status")}.textContent`); if (/bar 2/.test(st)) break; await b.sleep(150); }
    await ev(`${$("bt-play")}.click(); 0`); await b.sleep(300); assert(/bar 2/.test(st), "the player starts: " + st); };
  const CHORDS = '"C"z4 | "Am7"z2 "D7"z2 | "Dm7"z "G7"z "C"z2 |]\n';
  const H = (m, L) => "X:1\nT:Menu test\nM:" + m + "\nL:" + L + "\nK:C\n";
  try {
    for (const page of ["backing-track.html", "backing-track-classic.html"]) {
      const A = page === "backing-track.html", tag = (A ? "A: " : "classic: ");
      await b.goto(URL + page); await b.sleep(1500);
      let s = await state(); assert(s.menu && s.text === "", tag + "the menu shows on the blues: " + JSON.stringify(s));
      const bar0 = s.bar; if (A) assert(bar0 > 30, "the bottom bar exists: " + bar0);
      // a built-in preset: the same as before (rewritten from its bars, the usual tempo, the Changes menu stays)
      await set("bt-meter", "12/8"); s = await state();
      assert.deepStrictEqual([s.abcM, s.changes, s.tempo, s.meter], ["12/8", "basic", "60", "12/8"], tag + "preset to 12/8: " + JSON.stringify(s));
      await set("bt-meter", "4/4"); s = await state(); assert.deepStrictEqual([s.abcM, s.changes, s.tempo], ["4/4", "basic", "120"], tag + "preset back");
      // a built-in setup (chords over rests), each meter and back
      const names = await ev(`BandPresets.map(function(p){ return BandRebar.check(p.abc).ok && !/[A-Ga-g]/.test(p.abc.split(/\\nK:[^\\n]*\\n/)[1].replace(/"[^"]*"/g, "").replace(/\\[[A-Z]:[^\\]]*\\]/g, "").replace(/^[A-Za-z]:.*$/gm, "").replace(/%.*$/gm, "")); })`);
      const idx = names.map((ok, i) => ok ? i : -1).filter(i => i >= 0); assert(idx.length >= 2, tag + "some built-in setups are chords over rests: " + names);
      for (const i of idx.slice(0, 3)) {
        await set("bt-changes", "setup:b:" + i); await b.sleep(500);
        const n0 = await count(), c0 = await chords(); s = await state(); const m0 = s.abcM, t0 = s.tempo;
        for (const m of ["4/4", "3/4", "6/8", "12/8", m0]) {
          if (m === m0 && s.abcM === m0) continue;
          await set("bt-meter", m); s = await state();
          if (/crowd|only/.test(s.note) && s.abcM !== m) { assert.strictEqual(s.meter, s.abcM, tag + "setup " + i + " refused " + m + ": the menu goes back to the real meter"); continue; }
          assert.deepStrictEqual([s.abcM, s.meter, s.changes], [m, m, "custom"], tag + "setup " + i + " to " + m + ": " + JSON.stringify(s));
          assert.strictEqual(await count(), n0, tag + "setup " + i + " keeps every chord in " + m);
        }
        await set("bt-meter", m0); s = await state(); assert.strictEqual(s.abcM, m0, tag + "back to " + m0);
        if (m0 === "4/4") assert.strictEqual(await chords(), c0, tag + "setup " + i + " 4/4 and back keeps the positions");
      }
      // a hand-edited chord-only chart, each meter and back, then it plays
      await typeAbc(H("4/4", "1/4") + 'P:A\n"^stop""C"z4 | "Am7"z2 "D7"z2 |: "Dm7"z2 "G7"z2 :|\nP:B\n"C"z4 |]\n');
      s = await state(); assert(s.menu && s.changes === "custom", tag + "typed chords keep the menu " + JSON.stringify(s));
      const n1 = await count();
      for (const m of ["3/4", "6/8", "12/8", "4/4"]) {
        await set("bt-meter", m); s = await state();
        assert.deepStrictEqual([s.abcM, s.meter], [m, m], tag + "typed to " + m + ": " + JSON.stringify(s));
        assert.strictEqual(await count(), n1, tag + "typed chords kept in " + m);
        const text = await ev(`${$("bt-abc")}.value`); assert(/"\^stop""C"z/.test(text) && /\nP:A\n/.test(text) && /\|: "Dm7"/.test(text) && /:\|\nP:B\n/.test(text), tag + "the stop, sections and repeats are kept:\n" + text);
        assert.strictEqual(await ev(`${$("bt-beats")}.children.length`), { "4/4": 4, "3/4": 3, "6/8": 2, "12/8": 4 }[m], tag + "the beat dots follow " + m);
      }
      s = await state(); assert.strictEqual(s.tempo, "60", tag + "12/8 to 4/4 has the same beats: the tempo stays");
      // the tempo stays when the beats per bar are the same (4/4 <-> 12/8 both have four)
      await set("bt-tempo-n", 97); await set("bt-meter", "12/8"); s = await state(); assert.strictEqual(s.tempo, "97", tag + "same beats: tempo kept");
      await set("bt-meter", "3/4"); s = await state(); assert.strictEqual(s.tempo, "132", tag + "different beats: the meter's usual tempo");
      await set("bt-meter", "4/4"); await plays();
      // a bar that is too full for one meter: the menu stays, goes back, says why
      await typeAbc(H("4/4", "1/4") + '"C"z2 "D"z "E"z | "F"z4 |]\n');
      await set("bt-meter", "6/8"); s = await state();
      assert(s.menu && s.meter === "4/4" && s.abcM === "4/4", tag + "refused 6/8: the menu is back on 4/4: " + JSON.stringify(s));
      assert.strictEqual(s.note, "Bar 1 has 3 chords, and 6/8 has only 2 beats to put them on.");
      assert(await ev(`!${$("bt-pinnote")}.hidden && /Bar 1 has 3 chords/.test(${$("bt-pinnote-text")}.textContent)`), tag + "the reason is shown where it can be seen");
      await set("bt-meter", "12/8"); s = await state(); assert.strictEqual(s.abcM, "12/8", tag + "the same chart still takes 12/8");
      // melody notes: text and a link, no menu
      await typeAbc(H("4/4", "1/4") + '"C"z4 | "F" c2 d2 |]\n');
      s = await state(); assert(!s.menu && /4\/4/.test(s.text), tag + "melody: text, no menu: " + JSON.stringify(s));
      assert.strictEqual(s.meter, "4/4"); assert(await ev(`${$("bt-meter-fixed")}.getBoundingClientRect().width > 20 && ${$("bt-meter-edit")}.getBoundingClientRect().height > 8`), tag + "the text and link are visible");
      assert(/melody notes/.test(await ev(`${$("bt-meter-edit")}.title`)), tag + "the reason is on the link");
      if (A) { const bar = (await state()).bar; assert.strictEqual(bar, bar0, tag + "the bottom bar keeps its height (" + bar0 + " -> " + bar + ")");
        assert(await ev(`${$("bt-meter-fixed")}.closest("#dxa-bar, .playbar-pop") !== null`), tag + "the meter field is still in the bar or its Options pop-up"); }
      await ev(`document.querySelector("details.bt-abc").open = false; document.activeElement.blur(); 0`);
      await ev(`${$("bt-meter-edit")}.click(); 0`); await b.sleep(300);
      const at = await ev(`(function(){ var t = ${$("bt-abc")}; return JSON.stringify({ open: document.querySelector("details.bt-abc").open, focus: document.activeElement === t, sel: t.value.slice(t.selectionStart, t.selectionEnd), seen: t.getBoundingClientRect().height > 20 }); })()`).then(JSON.parse);
      assert.deepStrictEqual(at, { open: true, focus: true, sel: "M:4/4", seen: true }, tag + "the link opens the ABC at the M: line: " + JSON.stringify(at));
      // a second meter inside the tune: also no menu; fix the chart and the menu returns
      await typeAbc(H("4/4", "1/4") + '"C"z4 | [M:3/4] "F"z3 |]\n');
      s = await state(); assert(!s.menu && /4\/4/.test(s.text), tag + "meter change inside: no menu");
      assert(/changes meter inside/.test(await ev(`${$("bt-meter-edit")}.title`)));
      if (A) assert.strictEqual((await state()).bar, bar0, tag + "bar height after a second state");
      await typeAbc(H("4/4", "1/4") + CHORDS); s = await state(); assert(s.menu && s.text === "", tag + "chords again: the menu is back");
      if (A) assert.strictEqual((await state()).bar, bar0, tag + "bar height at the end");
      // a narrow window (the bar moves controls into Options): still no height change, no runaway
      if (A) { await b.resize(700, 900); await typeAbc(H("4/4", "1/4") + '"C"z4 | "F" c2 d2 |]\n'); await b.sleep(400);
        const nb = (await state()).bar; await typeAbc(H("4/4", "1/4") + CHORDS); await b.sleep(400); assert.strictEqual((await state()).bar, nb, "narrow: the bar height is the same with and without the text"); await b.resize(1800, 1000); }
      assert.deepStrictEqual(b.errors.filter(e => !/sound|font|fetch|Failed to load|net::|supabase/i.test(e)), [], tag + "no page errors");
    }
    console.log("METER MENU OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
