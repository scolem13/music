// "Chords pass 2x faster / 2x slower" on the three layouts (A: backing-track.html, B: backing-track-b.html, the plain one:
// backing-track-classic.html): the chart is re-written in the same meter with half or twice the bars (BandRebar.pace), the tempo and
// the meter stay, it works while the band plays, a chart that cannot be paired says why and is left alone, and a chart with melody
// notes has the buttons off. Needs the test server (see ../README.md) and the pages rendered. Prints "PACE OK".
const assert = require("assert"), { launch } = require("../lead/cdp.js");
const URL = "http://127.0.0.1:8500/tools/";
(async () => {
  const b = await launch({ width: 1800, height: 1000 });
  const ev = x => Promise.race([b.eval(x), b.sleep(10000).then(() => { throw new Error("eval timed out: " + x.slice(0, 80)); })]);
  const $ = id => `document.getElementById(${JSON.stringify(id)})`;
  const set = (id, v) => ev(`(function(){ var e = ${$(id)}; e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  const click = async id => { await ev(`${$(id)}.click()`); await b.sleep(500); };
  const bars = () => ev(`document.querySelectorAll("#bt-chart [data-bar]").length`);
  const state = () => ev(`[${$("bt-meter")}.value, ${$("bt-tempo-n")}.value, ${$("bt-changes")}.value].join("|")`);
  const typeAbc = async abc => { await ev(`(function(){ var t = ${$("bt-abc")}; t.value = ${JSON.stringify(abc)}; t.dispatchEvent(new Event("input", { bubbles: true })); })()`); await b.sleep(600); };
  try {
    for (const page of ["backing-track.html", "backing-track-classic.html", "backing-track-b.html"]) {
      await b.goto(URL + page); await b.sleep(1300);
      await set("bt-changes", "basic"); await b.sleep(400);
      const t0 = (await state()).split("|");
      assert.strictEqual(await bars(), 12, page);
      const seen = await ev(`(function(){ var r = ${$("bt-pace-fast")}.getBoundingClientRect(); return r.width > 20 && r.height > 10; })()`);
      if (page !== "backing-track.html" || seen) assert(seen, page + ": the buttons show");       // (layout A may hold them in the bar's Options panel)
      await click("bt-pace-fast"); assert.strictEqual(await bars(), 6, page + ": twice as fast, half the bars");
      assert.strictEqual(await state(), [t0[0], t0[1], "custom"].join("|"), page + ": meter and tempo stay");
      await click("bt-pace-slow"); assert.strictEqual(await bars(), 12, page + ": and back");
      await click("bt-pace-slow"); assert.strictEqual(await bars(), 24, page + ": half as fast, twice the bars");
      // while the band plays
      await set("bt-tempo-n", "240"); await click("bt-play");
      await b.sleep(1500); await click("bt-pace-fast"); assert.strictEqual(await bars(), 12);
      await b.sleep(2500);
      assert.strictEqual(await ev(`${$("bt-play")}.getAttribute("data-state")`), "playing", page + ": still playing after the change");
      await click("bt-play");
      // an odd bar: refused, and nothing changes
      await typeAbc('X:1\nT:Odd\nM:4/4\nL:1/4\nK:C\n"C"z4 | "F"z4 | "G"z4 |]');
      const before = await ev(`${$("bt-abc")}.value`); await click("bt-pace-fast");
      assert.strictEqual(await ev(`${$("bt-abc")}.value`), before); assert(/no bar to pair with/.test(await ev(`${$("bt-abc-note")}.textContent`)), page + ": says why");
      await click("bt-pace-slow"); assert.strictEqual(await bars(), 6);
      // melody: the buttons are off
      await typeAbc('X:1\nT:Tune\nM:4/4\nL:1/4\nK:C\n"C"C2 E2 | "F"F4 |]');
      assert.strictEqual(await ev(`${$("bt-pace-fast")}.disabled && ${$("bt-pace-slow")}.disabled`), true, page + ": off for a tune with notes");
      if (page === "backing-track.html") assert.strictEqual(await ev(`Math.round(${$("dxa-bar")}.getBoundingClientRect().height)`), await ev(`Math.round(parseFloat(getComputedStyle(document.documentElement).fontSize) * 3.4)`), "the bar keeps its height");
      const errs = b.errors.filter(e => !/supabaseUrl|createClient/.test(e)); assert.strictEqual(errs.length, 0, JSON.stringify(errs));
    }
    console.log("PACE OK");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
