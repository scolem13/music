// Backing Track page: the three built-in tunes load with their figures, and "Figure from the tune" shows only for them.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1300 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(6000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const set = (id, val) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${val}"; e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const state = async () => JSON.parse(await ev(`(function(){ var g = BandMidi.generate, o; BandMidi.generate = function(p, x){ o = x.opts; return g.apply(this, arguments); }; HTMLAnchorElement.prototype.click = function(){};
    document.getElementById("bt-mid-go").click(); BandMidi.generate = g;
    return JSON.stringify({ o: o, figs: !document.getElementById("bt-figs-field").hidden, style: document.getElementById("bt-style").value, tempo: document.getElementById("bt-tempo-n").value,
      key: document.getElementById("bt-key").value, bars: document.querySelectorAll("#bt-chart .tc-bar, #bt-chart [data-bar]").length, note: document.getElementById("bt-abc-note").textContent }); })()`));
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/tools/backing-track.html"); await b.sleep(1200);
    const names = JSON.parse(await ev(`JSON.stringify(Array.from(document.querySelectorAll('#bt-changes optgroup[label="Built-in setups"] option')).map(function(o){ return o.textContent; }))`));
    assert.strictEqual(names.length, 10, names.join());
    // every built-in loads: the menus take its ids and nothing is reported about the changes
    for (let i = 0; i < names.length; i++){ await set("bt-changes", "setup:b:" + i); const x = await state(), want = JSON.parse(await ev(`JSON.stringify(BandPresets[${i}])`));
      assert.deepStrictEqual([x.o.bassFeel, x.o.compRhythm, x.o.voicing, x.o.groove, x.o.feel, x.style, x.tempo, x.note], [want.bass, want.rhythm, want.voicing, want.groove, want.feel, want.style, String(want.tempo), ""], names[i]); }
    await set("bt-changes", "basic"); await set("bt-style", "swing");
    let s = await state(); assert.strictEqual(s.figs, false, "no figure menu on a plain blues");
    await set("bt-changes", "setup:b:0"); s = await state();
    assert.deepStrictEqual([s.o.bassFeel, s.o.compRhythm, s.o.voicing, s.o.figures, s.o.feel, s.style, s.tempo, s.figs, s.note], ["sowhat", "sowhat", "sowhat", "head", "swing", "swing", "136", true, ""]);
    await set("bt-changes", "setup:b:1"); s = await state();
    assert.deepStrictEqual([s.o.bassFeel, s.o.compRhythm, s.o.voicing, s.o.figures, s.figs, s.key], ["killerjoe", "charleston", "rootless", "always", true, "C"]);
    await set("bt-changes", "setup:b:2"); s = await state();
    assert.deepStrictEqual([s.o.bassFeel, s.o.compRhythm, s.o.groove, s.o.feel, s.style, s.figs], ["songfather", "bossa", "bossa", "straight", "bossa", true]);
    // the figure on another tune: it is just a menu entry
    await set("bt-changes", "basic"); await set("bt-style", "swing"); s = await state(); assert.strictEqual(s.figs, false);
    await set("bt-bass", "killerjoe"); s = await state(); assert.deepStrictEqual([s.o.bassFeel, s.figs], ["killerjoe", true]);
    await set("bt-figs", "head"); s = await state(); assert.strictEqual(s.o.figures, "head");
    console.log("TUNES UI OK");
  } catch (e) { console.error(e); process.exitCode = 1; } finally { await b.close(); }
})();
