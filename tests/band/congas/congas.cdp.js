// The Congas menu, fader, notation staff and MIDI track on the Backing Track page. Needs the test server (see ../README.md) and
// tools/backing-track.qmd and tools/backing-track-classic.qmd rendered into lead/site. Prints "CONGAS UI OK".
const assert = require("assert"), { launch } = require("../lead/cdp.js");
(async () => {
  const b = await launch({ width: 1280, height: 1400 });
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 80)); })]);
  const set = (id, val) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = ${JSON.stringify(val)}; e.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  const tick = (id, on) => ev(`(function(){ var e = document.getElementById("${id}"); e.checked = ${on}; e.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  const v = id => ev(`document.getElementById("${id}").value`), hidden = id => ev(`document.getElementById("${id}").hidden`);
  const list = id => ev(`Array.from(document.getElementById("${id}").options).map(function(o){ return o.value; }).join(" ")`);
  const opts = async () => { await ev(`(function(){ var g = BandMidi.generate; if (!window.__hooked){ window.__hooked = 1; BandMidi.generate = function(p, o){ window.__opts = o.opts; return g.apply(this, arguments); }; HTMLAnchorElement.prototype.click = function(){}; } })()`);
    await ev(`document.getElementById("bt-mid-go").click()`); return JSON.parse(await ev(`JSON.stringify(window.__opts)`)); };
  try {
    for (const page of ["backing-track.html", "backing-track-classic.html", "backing-track-b.html"]) {
      await b.goto("http://127.0.0.1:8500/tools/" + page); await b.sleep(1200);
      assert(await ev(`!!document.getElementById("bt-congas") && !!document.getElementById("bt-vol-congas") && !!document.getElementById("bt-nt-congas")`), page + ": the controls exist");
    }
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html"); await b.sleep(1200);
    // swing: no congas, no fader, no box; the locked menu offers what fits
    assert.strictEqual(await v("bt-style"), "swing"); assert.strictEqual(await v("bt-congas"), "none"); assert.strictEqual(await list("bt-congas"), "none steady");
    assert.strictEqual(await ev(`document.querySelector('#bt-congas option[value="none"]').textContent`), "No congas");
    assert(await ev(`document.getElementById("bt-vol-congas").parentNode.hidden`), "fader hidden"); assert(await hidden("bt-nt-congas-l"));
    assert.strictEqual((await opts()).congas, "none");
    // a Style sets its own
    await set("bt-style", "montuno"); assert.strictEqual(await v("bt-congas"), "tumbao2"); assert.strictEqual(await list("bt-congas"), "none tumbao tumbao2 opens slapopen heeltoe steady");
    assert(!(await ev(`document.getElementById("bt-vol-congas").parentNode.hidden`)), "fader shown"); assert(!(await hidden("bt-nt-congas-l")));
    assert.strictEqual((await opts()).congas, "tumbao2");
    await set("bt-style", "chacha"); assert.strictEqual(await v("bt-congas"), "tumbao");
    await set("bt-style", "boogaloo"); assert.strictEqual(await v("bt-congas"), "tumbao");
    await set("bt-style", "bossa"); assert.strictEqual(await v("bt-congas"), "none"); assert(await ev(`document.getElementById("bt-vol-congas").parentNode.hidden`));
    await set("bt-style", "montuno"); await set("bt-style", "swing"); assert.strictEqual(await v("bt-congas"), "none"); assert(await hidden("bt-nt-congas-l"));
    // a pattern chosen in Swing
    await set("bt-congas", "steady"); assert.strictEqual((await opts()).congas, "steady"); assert(!(await ev(`document.getElementById("bt-vol-congas").parentNode.hidden`)));
    assert.strictEqual(await ev(`BandPlayer && typeof BandPlayer.hit`), "function");
    // the notation staff
    await ev(`document.getElementById("bt-notation").open = true`); await b.sleep(900);
    const names = () => ev(`JSON.stringify([].map.call(document.querySelectorAll("#bt-score svg .abcjs-voice-name"), function(x){ return x.textContent.trim(); }).filter(function(x, i, a){ return a.indexOf(x) === i; }))`).then(JSON.parse);
    assert(!(await names()).includes("Cga."), "off until ticked");
    await tick("bt-nt-congas", true); await b.sleep(1200);
    const nm = await names(); assert(nm.includes("Cga."), "the Cga. staff is drawn: " + nm);
    const words = await ev(`[].map.call(document.querySelectorAll("#bt-score svg .abcjs-lyric"), function(x){ return x.textContent; }).join("")`);
    assert(/[HTSOMB]/.test(words) && /[LR]/.test(words), "stroke and hand letters under the staff: " + words.slice(0, 40));
    assert.strictEqual(await ev(`window.__btNotation.opts.show.congas`), true);
    await tick("bt-nt-congas", false); await b.sleep(900); assert(!(await names()).includes("Cga."));
    // a short play-through fires conga events, to the congas' own bank, and they land in the MIDI file
    await ev(`(function(){ var S = BandSounds, make = S.create; window.__cg = []; S.create = function(){ var bank = make.apply(this, arguments), play = bank.play; bank.play = function(inst, spec){ if (inst === "congas") window.__cg.push(spec.piece); return play.apply(this, arguments); }; return bank; }; })()`);
    await set("bt-countin", "0"); await set("bt-tempo-n", 200); await ev(`document.getElementById("bt-play").click()`);
    for (let i = 0; i < 400; i++) { if (/bar 3/.test(await ev(`document.getElementById("bt-status").textContent`))) break; await b.sleep(50); }
    const fired = JSON.parse(await ev(`JSON.stringify(window.__cg)`)); await ev(`document.getElementById("bt-play").click()`);
    assert(fired.length >= 8, "conga strokes reached the bank: " + fired.length); assert(fired.every(p => /^(conga|tumba)/.test(p)));
    await b.sleep(400);
    await ev(`document.getElementById("bt-mid-range").value = "all"`); await ev(`document.getElementById("bt-mid-go").click()`);
    const tr = { congas: await ev(`/Congas/.test(String.fromCharCode.apply(null, Array.from(window.__btLastMidi)))`) };
    assert(tr.congas, "a Congas track in the MIDI file");
    await tick("bt-mid-congas", false); await ev(`document.getElementById("bt-mid-go").click()`);
    assert(!(await ev(`/Congas/.test(String.fromCharCode.apply(null, Array.from(window.__btLastMidi)))`)), "left out when unticked");
    await tick("bt-mid-congas", true);
    // a saved setup keeps them; one that does not mention congas has none
    const snap = JSON.parse(await ev(`JSON.stringify((function(){ var o = {}; ["bt-congas", "bt-vol-congas"].forEach(function(i){ o[i] = document.getElementById(i).value; }); return o; })())`));
    assert.strictEqual(snap["bt-congas"], "steady");
    // the address
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html?congas=tumbao"); await b.sleep(1500);
    assert.strictEqual(await v("bt-congas"), "tumbao"); assert.strictEqual((await opts()).congas, "tumbao"); assert(!(await ev(`document.getElementById("bt-vol-congas").parentNode.hidden`)));
    assert.notStrictEqual(await v("bt-style"), "swing", "opens the first style it fits");
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html?style=montuno"); await b.sleep(1200); assert.strictEqual(await v("bt-congas"), "tumbao2");
    // unlocked: everything is listed
    await tick("bt-unlock", true); assert.strictEqual((await list("bt-congas")).split(" ").sort().join(" "), "heeltoe none opens slapopen steady tumbao tumbao2");
    // the conga stroke on its own (a lesson page's click)
    assert.strictEqual(await ev(`typeof BandPlayer.hit("congaSlap", { bank: "congas" }).then`), "function");
    const errs = b.errors.filter(e => !/supabase/i.test(e)); assert.deepStrictEqual(errs, [], "no page errors: " + errs.join("; "));      // (the site's analytics complains without a config)
    console.log("CONGAS UI OK");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
