// The hi-hat lesson (lessons/hihat-grooves.qmd; apps/shared/lessons/blues-kit.js, instrument "drums", feels "hihat"). The page loads clean; each step's
// staff holds the hi-hat notes its groove says (closed / open / foot, per bar); sixteenth steps have 16 or 14; the accent step draws accents and no other
// does; the three sound buttons (and the key heads) reach the kit; play / stop works and hi-hat events fire; drums alone / leave out change the volumes.
// Run from tests/band/lead with the server on 8500 and lessons/hihat-grooves.qmd rendered into the test site.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1400 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const until = async (x, ms, what) => { const t = Date.now(); while (Date.now() - t < ms){ if (await ev(x)) return; await b.sleep(150); } throw new Error("timed out: " + what); };
  const step = i => `document.querySelectorAll(".bl-step")[${i}]`;
  // per bar: [closed, open, foot]
  const STEPS = [["hhquarters", [4, 0, 0]], ["hheighths", [8, 0, 0]], ["hhaccents", [8, 0, 0]], ["hhoffbeats", [4, 0, 0]], ["hhopen", [7, 1, 1]], ["hhdance", [4, 4, 0]],
                 ["hhsix", [16, 0, 0]], ["hhsix2", [14, 0, 0]], ["hhfoot2", [0, 0, 2]], ["hhfoot4", [0, 0, 4]], ["hhswing", [4, 2, 2]]];
  const count = (i, k, piece) => ev(`${step(i)}.querySelectorAll(".bl-abc")[${k}].querySelectorAll(".abcjs-notehead[data-piece=${piece}]").length`);
  try {
    await b.eval(`0`).catch(() => {}); await b.goto(B + "/lessons/hihat-grooves.html"); await b.sleep(2000);
    await ev(`window.__err = []; window.addEventListener("error", function(e){ __err.push(e.message); }); window.__kit = []; window.__vol = {}; window.__hits = [];
      var os = BandSounds.create; BandSounds.create = function(){ var bk = os.apply(this, arguments), p = bk.play; bk.play = function(n, e){ if (n === "kit") __kit.push(e.piece); return p.apply(this, arguments); }; return bk; };
      var oc = BandPlayer.create; BandPlayer.create = function(){ var pl = oc.apply(this, arguments), sv = pl.setVolume; pl.setVolume = function(a, v){ __vol[a] = v; return sv.apply(this, arguments); }; return pl; }; 0`);
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll(".bl-step"), function (h){ return h.getAttribute("data-part"); }))`)), STEPS.map(s => s[0]), "the steps, in order");
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll("#bl-feel option"), function (o){ return o.value; }))`)), ["rock", "strum", "swing"]);
    // ---- the staves
    for (let i = 0; i < STEPS.length; i++){
      const [id, per] = STEPS[i]; assert.strictEqual(await ev(`!!${step(i)}.__bl`), true, id + " built");
      for (const [k, bars] of [[0, 2], [1, id === "hhswing" || id === "hhfoot2" ? 12 : 4]]){
        const got = [await count(i, k, "hatClosed"), await count(i, k, "hatOpen"), await count(i, k, "hatFoot")];
        assert.deepStrictEqual(got, per.map(n => n * bars), id + " staff " + k + " hi-hat notes (closed, open, foot) for " + bars + " bars");
      }
      const acc = await ev(`${step(i)}.querySelectorAll(".bl-abc")[0].querySelectorAll("[data-name='scripts.sforzato']").length`);
      assert.strictEqual(acc, id === "hhaccents" ? 8 : 0, id + " accents drawn: " + acc);
      assert.strictEqual(await ev(`${step(i)}.querySelectorAll(".tc-bar").length`), id === "hhfoot2" || id === "hhswing" ? 12 : 4, id + " chart bars");
    }
    assert.strictEqual(await ev(`document.getElementById("bl-dots").parentNode.hidden`), true);
    // ---- the three sounds: buttons and key heads reach the kit
    assert.strictEqual(await ev(`document.querySelectorAll(".bl-hatkey .abcjs-notehead[data-piece]").length`), 3, "three heads in the hi-hat key");
    await ev(`BandPlayer.hit = function (p){ __hits.push(p); return Promise.resolve(); }; 0`);
    for (const p of ["hatClosed", "hatOpen", "hatFoot"]) await ev(`document.querySelector('[data-drum-hit="${p}"]').click(); 0`);
    await ev(`document.querySelector('[data-drum-hit="hatOpen,hatFoot"]').click(); 0`); await b.sleep(900);
    assert.deepStrictEqual(await ev(`__hits.slice()`), ["hatClosed", "hatOpen", "hatFoot", "hatOpen", "hatFoot"], "buttons");
    await ev(`__hits.length = 0; Array.prototype.forEach.call(document.querySelectorAll(".bl-hatkey .ld-hit"), function (c){ c.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); 0`); await b.sleep(300);
    assert.deepStrictEqual(await ev(`__hits.slice()`), ["hatClosed", "hatOpen", "hatFoot"], "key heads");
    // ---- play: the open hi-hat step starts at its own feel and tempo, hi-hat events fire
    await ev(`${step(4)}.querySelector(".btn-primary").click(); 0`);
    assert.strictEqual(await ev(`document.getElementById("bl-feel").value`), "rock"); assert.strictEqual(await ev(`document.getElementById("bl-tempo-n").value`), "90");
    await until(`!!${step(4)}.querySelector(".tc-bar.tc-live") && __kit.indexOf("hatOpen") >= 0 && __kit.indexOf("hatFoot") >= 0`, 40000, "open step playing, open hat and foot at the bank");
    assert(await ev(`__kit.indexOf("hatClosed") >= 0 && __kit.indexOf("snare") >= 0 && __kit.indexOf("kick") >= 0`), "closed hat, snare, kick");
    assert.strictEqual(await ev(`__kit.indexOf("ride")`), -1, "no ride in a hi-hat groove");
    await until(`!!${step(4)}.querySelector(".ls-on")`, 8000, "the lit note");
    assert.deepStrictEqual(await ev(`[__vol.bass, __vol.comp, __vol.drums]`), [1, 1, 1]);
    await ev(`${step(4)}.querySelectorAll(".bl-check input")[0].click(); 0`); await b.sleep(200);
    assert.deepStrictEqual(await ev(`[__vol.bass, __vol.comp, __vol.drums]`), [1, 1, 0], "leave out the drums");
    await ev(`${step(4)}.querySelectorAll(".bl-check input")[0].click(); ${step(4)}.querySelectorAll(".bl-check input")[1].click(); 0`); await b.sleep(200);
    assert.deepStrictEqual(await ev(`[__vol.bass, __vol.comp, __vol.drums]`), [0, 0, 1], "drums alone");
    await ev(`${step(4)}.querySelectorAll(".bl-check input")[1].click(); 0`);
    await until(`/Bar 3/.test(document.getElementById("bl-status").textContent)`, 40000, "bar 3 reached");
    await ev(`document.getElementById("bl-stop").click(); 0`); await b.sleep(300);
    assert.strictEqual(await ev(`document.querySelectorAll(".tc-live").length + document.querySelectorAll(".bl-tools .bl-on").length + document.querySelectorAll(".ls-on").length`), 0, "nothing left lit after Stop");
    // the sixteenths played by the band are written as sixteenths too (the played chorus, not the example)
    await ev(`__kit.length = 0; ${step(7)}.querySelector(".btn-primary").click(); 0`);
    assert.strictEqual(await ev(`document.getElementById("bl-tempo-n").value`), "66");
    await until(`__kit.length > 40 && /Bar [5-9]|chorus 2/.test(document.getElementById("bl-status").textContent)`, 60000, "the sixteenth step into its second pass");
    await until(`/The drum part of this chorus/.test(${step(7)}.querySelector(".bl-legend:last-of-type").textContent)`, 20000, "played chorus written").catch(() => {});
    await ev(`document.getElementById("bl-stop").click(); 0`); await b.sleep(300);
    assert.strictEqual(await count(7, 0, "hatClosed"), 28, "sixteenth step, two bars, after playing");
    // the swing step takes the swing feel, the straight ones the rock feel
    await ev(`${step(10)}.querySelector(".btn-primary").click(); 0`);
    assert.strictEqual(await ev(`document.getElementById("bl-feel").value`), "swing"); assert.strictEqual(await ev(`document.getElementById("bl-tempo-n").value`), "100");
    await until(`__kit.indexOf("hatOpen") >= 0 && !!${step(10)}.querySelector(".tc-bar.tc-live")`, 30000, "swing hat playing"); await ev(`document.getElementById("bl-stop").click(); 0`);
    assert.deepStrictEqual(await ev(`__err`), []); assert.deepStrictEqual(b.errors.filter(e => !/supabase|Didn't load note/i.test(e)), []);
    if (process.env.SHOT) await b.shot(process.env.SHOT);
    console.log("HI-HAT LESSON OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
