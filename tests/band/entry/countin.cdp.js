// Chord Entry: the count-off menu (1, 2, 4 bars). The click counts that many bars before the first downbeat, the choice is kept
// across a reload, and notes played in the last bar of a longer count-off still make the pickup bar.
// Run from tests/band/lead, server on 8500:   node ../entry/countin.cdp.js        ("COUNT-IN OK")
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1600, height: 950 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const set = (id, v) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event("input", { bubbles:true })); e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const text = id => ev(`document.getElementById("${id}").textContent`);
  const until = async (id, re, ms) => { const t = Date.now(); let s = ""; while (Date.now() - t < ms){ s = await text(id); if (re.test(s)) return s; await b.sleep(10); } throw new Error("never saw " + re + " in " + id + ": " + s); };
  const mel = async () => JSON.parse(await ev(`JSON.stringify(__entry.grid().melody().map(function(x){ return (x || []).map(function(n){ return [n.midi, n.pos, n.dur]; }); }))`));
  try {
    await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1800);
    await ev(`localStorage.removeItem("ceCountIn"); document.getElementById("ce-sound").checked = false; document.getElementById("ce-type").checked = true; 0`);
    assert.deepStrictEqual(await ev(`Array.prototype.map.call(document.getElementById("ce-countin").options, function(o){ return o.value; })`), ["1", "2", "4"]);
    assert.strictEqual(await ev(`document.getElementById("ce-countin").value`), "1", "one bar by default");
    await set("ce-tempo", "240"); await set("ce-mode", "melody"); await set("ce-mwith", "click"); await set("ce-mbars", "1"); await set("ce-mfeel", "straight"); await set("ce-mpickup", "auto");
    const bs = 60000 / 240;
    // time from pressing Record to the first bar, for a count-off of 1 and of 2 bars (the click loads first, so measure from "Count-in" to "bar 1")
    const take = async (bars, notes) => {
      await set("ce-countin", String(bars)); await ev(`document.getElementById("ce-mrec").click(); 0`); await until("ce-status", /Count-in/, 25000);
      const t0 = Date.now() + 300; await ev(`(function(){ var t0 = performance.now() + 300, L = ${JSON.stringify(notes)}, i = 0, on = -1, iv = setInterval(function(){ var el = performance.now() - t0;
        if (on >= 0 && el >= L[on][1] + ${bs * 0.8}){ __entry.off(L[on][0], performance.now()); on = -1; }
        if (i < L.length && on < 0 && el >= L[i][1]){ __entry.on(L[i][0], 0.7, performance.now()); on = i; i++; }
        if (i >= L.length && on < 0) clearInterval(iv); }, 3); })()`);
      await until("ce-status", /bar 1/, 25000); const dt = Date.now() - t0;
      await until("ce-note", /^Wrote/, 15000); return dt;
    };
    // 1 bar: pickup of two notes on beats 3 and 4 of the count-in, then bar 1
    const d1 = await take(1, [[72, 2 * bs], [74, 3 * bs], [76, 4.2 * bs], [77, 5.2 * bs]]);
    assert(d1 > 3.5 * bs && d1 < 4 * bs + 700, "one bar of count-off: " + d1);
    let m = await mel(); assert.strictEqual(await ev(`__entry.grid().geo(0).pickup`), true); assert.deepStrictEqual(m[0].map(n => n[0]), [72, 74]);
    // 2 bars: the same pickup, a bar later; a stray note in the first count-off bar is dropped
    const d2 = await take(2, [[60, 0.5 * bs], [72, 6 * bs], [74, 7 * bs], [76, 8.2 * bs], [77, 9.2 * bs]]);
    assert(Math.abs((d2 - d1) - 4 * bs) < 300, "two bars of count-off take a bar longer: " + d1 + " vs " + d2);
    m = await mel(); assert.strictEqual(await ev(`__entry.grid().geo(0).pickup`), true, "pickup after a 2-bar count-off");
    assert.deepStrictEqual(m[0].map(n => n[0]), [72, 74], "pickup notes, stray count-off note dropped: " + JSON.stringify(m[0]));
    assert.deepStrictEqual(m[1].map(n => n[0]).slice(0, 2), [76, 77]);
    // the choice is kept
    assert.strictEqual(await ev(`localStorage.getItem("ceCountIn")`), "2");
    await b.goto("about:blank"); await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1800);
    assert.strictEqual(await ev(`document.getElementById("ce-countin").value`), "2", "kept after a reload");
    await set("ce-countin", "4"); assert.strictEqual(await ev(`localStorage.getItem("ceCountIn")`), "4");
    await ev(`localStorage.removeItem("ceCountIn"); 0`);
    assert.deepStrictEqual(b.errors.filter(e => !/supabase/i.test(e)), []);
    console.log("COUNT-IN OK");
  } catch (e) { console.log("FAIL", e.message); process.exitCode = 1; }
  await b.close();
})();
