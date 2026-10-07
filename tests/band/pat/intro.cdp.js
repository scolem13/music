// Intros: bars played once between the count-in and the top of the form. Run from tests/band/lead, server on 8500.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1300 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const set = (id, val) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${val}"; e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  // a player of our own on the page's chart: what it schedules (events) and announces (bars), played fast
  const run = (cfg, ms) => ev(`(function(){ window.__r = { bars: [], evs: [] }; var p = BandPlayer.create(Object.assign({ parsed: TuneChart.parse(document.getElementById("bt-abc").value), tempo: 300, countIn: 1, choruses: 1, humanize: 0, seed: 7,
      opts: { bassFeel: "songfather", compRhythm: "bossa", groove: "bossa", feel: "straight", comp: "piano", stops: [0] },
      onBar: function(i){ __r.bars.push(i); }, onEvent: function(e){ __r.evs.push({ part: e.part, L: Math.round(e.L * 100) / 100, midi: e.midi }); } }, ${JSON.stringify(cfg)}));
      window.__p = p; p.play(); return 0; })()`).then(() => b.sleep(ms)).then(() => ev(`(function(){ try { __p.stop(); } catch (e) {} return JSON.stringify(__r); })()`)).then(JSON.parse);
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/tools/backing-track.html"); await b.sleep(1200);
    await set("bt-changes", "setup:b:2");
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify([document.getElementById("bt-intro").value, document.getElementById("bt-intro-bars").value, document.getElementById("bt-intro-nodrums").checked, document.getElementById("bt-intro-more").hidden])`)), ["vamp", "4", true, false]);
    // vamp, drums waiting: count-in (4 beats), four intro bars on Fm with no drums, then bar 1 with everyone
    let r = await run({ intro: { bars: 4, kind: "vamp", tacet: "drums" } }, 9000);
    const kinds = r.bars.slice(0, 6).map(x => x.countIn ? "count" : x.intro ? "intro" + x.introBar : "bar" + x.index).join(" ");
    assert.strictEqual(kinds, "count intro0 intro1 intro2 intro3 bar0");
    const inIntro = e => e.L >= 4 && e.L < 20, drums = r.evs.filter(e => e.part === "drums"), bass = r.evs.filter(e => e.part === "bass");
    assert.strictEqual(drums.filter(inIntro).length, 0, "no drums in the intro"); assert(drums.some(e => e.L >= 20 && e.L < 24), "drums at the top");
    assert.strictEqual(bass.filter(inIntro).map(e => e.L + ":" + e.midi).join(" "), [4, 8, 12, 16].map(o => `${o}:41 ${o + 1.5}:48 ${o + 2}:53`).join(" "), "the figure on F, four times");
    assert(r.evs.filter(e => e.part === "comp" && inIntro(e)).length >= 8, "piano in the intro");
    assert.strictEqual(r.evs.filter(e => e.part === "comp" && e.L >= 20 && e.L < 24).length, 1, "bar 1 is a stop bar; the intro was not");
    // the last bars of the form, whole band; and no intro when starting part-way in
    r = await run({ intro: { bars: 2, kind: "last" }, opts: { bassFeel: "roots", compRhythm: "pad", groove: "rock", feel: "straight", comp: "piano" } }, 6000);
    assert.strictEqual(r.bars.slice(0, 4).map(x => x.countIn ? "count" : x.intro ? "intro" : "bar" + x.index).join(" "), "count intro intro bar0");
    assert.deepStrictEqual(r.bars.slice(1, 3).map(x => x.src), [22, 23]); assert(r.evs.some(e => e.part === "drums" && e.L >= 4 && e.L < 12));
    r = await run({ intro: { bars: 4, kind: "vamp" }, startBar: 8 }, 3500);
    assert.strictEqual(r.bars.slice(0, 2).map(x => x.countIn ? "count" : x.intro ? "intro" : "bar" + x.index).join(" "), "count bar8");
    // the page: its status line names the intro; loading plain changes or a setup without one clears it
    await set("bt-countin", "0"); await ev(`document.getElementById("bt-play").click(); 0`);
    const t = Date.now(); let st = ""; while (Date.now() - t < 25000){ st = await ev(`document.querySelector("#bt-root .bt-status, #bt-status") ? (document.querySelector("#bt-status") || document.querySelector("#bt-root .bt-status")).textContent : ""`); if (/Intro/.test(st)) break; await b.sleep(150); }
    assert(/Intro · bar \d of 4/.test(st), "status: " + st); await ev(`document.getElementById("bt-play").click(); 0`);
    await set("bt-changes", "setup:b:1"); assert.strictEqual(await ev(`document.getElementById("bt-intro").value`), "none");
    await set("bt-changes", "setup:b:2"); await set("bt-changes", "basic"); assert.strictEqual(await ev(`document.getElementById("bt-intro").value + "|" + document.getElementById("bt-intro-more").hidden`), "none|true");
    console.log("INTRO OK");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
