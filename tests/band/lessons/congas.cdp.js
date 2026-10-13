// The two conga lessons (lessons/congas-basics.qmd, lessons/watermelon-congas.qmd; apps/shared/lessons/blues-kit.js, instrument "congas").
// Both pages load clean; every step draws a Cga. staff whose letters match the step's pattern; the stroke buttons and key heads call the congas'
// bank; play / stop works and conga strokes reach the bank; "leave out" and "alone" change the faders; lesson 2's chart is 16 bars with the stop
// on bar 14; the melody step shows the tune. Run from tests/band/lead with the server on 8500, both pages rendered into the test site.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1200 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const until = async (x, ms, what) => { const t = Date.now(); while (Date.now() - t < ms){ if (await ev(x)) return; await b.sleep(150); } throw new Error("timed out: " + what); };
  const open = async page => { await ev(`0`).catch(() => {}); await b.goto(B + "/lessons/" + page + ".html"); await b.sleep(1800);
    await ev(`window.__err = []; window.addEventListener("error", function(e){ __err.push(e.message); }); window.__cg = []; window.__vol = {}; window.__hits = [];
      var os = BandSounds.create; BandSounds.create = function(){ var bk = os.apply(this, arguments), p = bk.play; bk.play = function(n, e){ if (n === "congas") __cg.push(e.piece); return p.apply(this, arguments); }; return bk; };
      var oc = BandPlayer.create; BandPlayer.create = function(){ var pl = oc.apply(this, arguments), sv = pl.setVolume; pl.setVolume = function(a, v){ __vol[a] = v; return sv.apply(this, arguments); }; return pl; }; 0`); };
  const clean = async w => { assert.deepStrictEqual(await ev(`window.__err`), [], w); assert.deepStrictEqual(b.errors.filter(e => !/supabase|Didn't load note/i.test(e)), [], w); };
  const step = i => `document.querySelectorAll(".bl-step")[${i}]`;
  // the words under the first (two-bar) staff of a step: strokes, then hands
  const words = async i => { const t = JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(${step(i)}.querySelector(".bl-abc svg").querySelectorAll(".abcjs-lyric"), function (x){ return x.textContent; }))`));
    const w = t.map(x => x.trim()).filter(Boolean); return [w.map(x => x[0]).join(""), w.map(x => x[x.length - 1]).join("")]; };   // (one element a note: stroke and hand)
  const T = ["HTSTHTOO", "LLRLLLRR"], TT = ["HTSTHTOO" + "HTSOOTOO", "LLRLLLRR" + "LLRRRLRR"];
  const rep = (p, n) => [p[0].repeat(n), p[1].repeat(n)];
  const L1 = [["opens", ["OOOO", "RRRR"]], ["righthand", ["SOOSOO", "RRRRRR"]], ["lefthand", ["HTTHTHTTHT", "LLLLLLLLLL"]], ["tumbao", rep(T, 2)], ["chacha", rep(T, 2)], ["twodrums", TT]];
  const L2 = [["wopens", ["OOOO", "RRRR"]], ["wright", ["SOOSOO", "RRRRRR"]], ["wtumbao", rep(T, 2)], ["wbreak", [T[0] + "O", T[1] + "R"]], ["wtune", rep(T, 2)], ["wmongo", [T[0] + "O", T[1] + "R"]], ["wherbie", [T[0] + "O", T[1] + "R"]], ["wtwo", TT]];
  try {
    for (const [page, steps] of [["congas-basics", L1], ["watermelon-congas", L2]]){
      await open(page);
      assert.strictEqual(await ev(`document.getElementById("bl-dots").parentNode.hidden`), true, page + " hides the chord-tone label menu");
      assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll("#bl-feel option"), function (o){ return o.value; }))`)), ["chacha", "boogaloo", "montuno"]);
      assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll(".bl-step"), function (h){ return h.getAttribute("data-part"); }))`)), steps.map(s => s[0]), page + " steps");
      const bars = page === "congas-basics" ? 4 : 16;
      for (let i = 0; i < steps.length; i++){
        assert.strictEqual(await ev(`!!${step(i)}.__bl`), true, steps[i][0] + " built");
        assert.strictEqual(await ev(`${step(i)}.querySelectorAll(".tc-bar").length`), bars, steps[i][0] + " chart bars");
        assert(await ev(`/Cga\\./.test(${step(i)}.innerHTML) || ${step(i)}.querySelectorAll(".bl-abc svg").length >= 2`), "a staff");
        assert.deepStrictEqual(await words(i), steps[i][1], page + " " + steps[i][0] + " letters");
      }
      // the key and the stroke buttons call the congas' bank
      assert.strictEqual(await ev(`document.querySelectorAll(".bl-congakey .abcjs-note").length`), 6, "six heads in the key");
      await ev(`BandPlayer.hit = function (p){ __hits.push(p); return Promise.resolve(); }; 0`);
      for (const p of await ev(`Array.prototype.map.call(document.querySelectorAll("[data-conga-hit]"), function (x){ return x.getAttribute("data-conga-hit"); })`).then(x => x || [])) await ev(`document.querySelector('[data-conga-hit="${p}"]').click(); 0`);
      await b.sleep(500); const viaButtons = JSON.parse(await ev(`JSON.stringify(__hits)`)); await ev(`__hits.length = 0; 0`);
      await ev(`Array.prototype.forEach.call(document.querySelectorAll(".bl-congakey .abcjs-note"), function (g){ g.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); 0`); await b.sleep(500);
      const ORDER = ["congaBass", "congaOpen", "congaMute", "congaSlap", "congaHeel", "congaToe"];
      if (page === "congas-basics") assert.deepStrictEqual(viaButtons, ORDER, "buttons (heel-toe plays both)");
      assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(__hits)`)), ORDER, "key heads");
      await clean(page + " at load");
    }
    // ---- lesson 2: the form, the stop, the tune ----
    await open("watermelon-congas");
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(${step(3)}.querySelectorAll(".tc-bar"), function (x){ return x.textContent.replace(/\\s+/g, ""); }).slice(8, 16))`)).map(s => s.replace(/[IV]+7$/, "")), ["C7", "B♭7", "C7", "B♭7", "C7", "B♭7", "F7", "F7"]);
    assert.strictEqual(await ev(`${step(4)}.querySelectorAll(".bl-abc svg").length`), 3, "the melody step shows the tune");
    assert(await ev(`/Watermelon Man, by Herbie Hancock/.test(${step(4)}.textContent)`));
    // the break: bar 14 has one open tone and rests in the written chorus
    const lastBars = JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(${step(3)}.querySelectorAll(".bl-abc")[1].querySelectorAll(".abcjs-lyric"), function (x){ return x.textContent; }))`));
    assert.strictEqual(lastBars.map(x => x.trim()).filter(Boolean).map(x => x[0]).join(""), ("HTSTHTOO".repeat(13)) + "O" + "HTSTHTOO".repeat(2), "stop on bar 14, tumbao elsewhere");
    // ---- play, stop, strokes reach the bank, faders ----
    await ev(`${step(3)}.querySelector(".btn-primary").click(); 0`);                         // the break step
    assert.strictEqual(await ev(`document.getElementById("bl-feel").value`), "chacha"); assert.strictEqual(await ev(`document.getElementById("bl-tempo-n").value`), "100");
    await until(`!!${step(3)}.querySelector(".tc-bar.tc-live") && __cg.length > 6`, 30000, "the break step playing, strokes at the bank");
    assert(await ev(`__cg.indexOf("congaSlap") >= 0 && __cg.indexOf("congaHeel") >= 0 && __cg.indexOf("congaOpen") >= 0`), "tumbao strokes reached the bank: " + await ev(`JSON.stringify(__cg.slice(0, 10))`));
    await until(`!!${step(3)}.querySelector(".ls-on")`, 8000, "the lit note");
    assert.strictEqual(await ev(`__vol.congas`), 1);
    await ev(`${step(3)}.querySelectorAll(".bl-check input")[0].click(); 0`); await b.sleep(200);
    assert.deepStrictEqual(await ev(`[__vol.congas, __vol.bass, __vol.comp, __vol.drums]`), [0, 1, 1, 1], "leave out the congas");
    await ev(`${step(3)}.querySelectorAll(".bl-check input")[0].click(); ${step(3)}.querySelectorAll(".bl-check input")[1].click(); 0`); await b.sleep(200);
    assert.deepStrictEqual(await ev(`[__vol.congas, __vol.bass, __vol.comp, __vol.drums]`), [1, 0, 0, 0], "congas alone");
    await ev(`${step(3)}.querySelectorAll(".bl-check input")[1].click(); 0`);
    await until(`/Bar 14/.test(document.getElementById("bl-status").textContent)`, 40000, "bar 14 reached");
    await ev(`document.getElementById("bl-stop").click(); 0`); await b.sleep(300);
    assert.strictEqual(await ev(`document.querySelectorAll(".tc-live").length + document.querySelectorAll(".bl-tools .bl-on").length + document.querySelectorAll(".ls-on").length`), 0, "nothing left lit after Stop");
    // Boogaloo step: its own feel and tempo
    await ev(`${step(6)}.querySelector(".btn-primary").click(); 0`);
    assert.strictEqual(await ev(`document.getElementById("bl-feel").value`), "boogaloo"); assert.strictEqual(await ev(`document.getElementById("bl-tempo-n").value`), "126");
    await until(`!!${step(6)}.querySelector(".tc-bar.tc-live")`, 25000, "boogaloo playing"); await ev(`document.getElementById("bl-stop").click(); 0`);
    await clean("lesson 2 playing");
    if (process.env.SHOT) await b.shot(process.env.SHOT);
    console.log("CONGA LESSONS OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
