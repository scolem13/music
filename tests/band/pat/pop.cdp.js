// Rock and pop styles on the pages: a style brings its sounds, Push chords and Chorus bars reach the band,
// the new sample sets load and play, and Chord Entry plays a style on its own sounds. From tests/band/lead, server on 8500.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1300 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const set = (id, val) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${val}"; e.dispatchEvent(new Event(e.type === "text" ? "input" : "change", { bubbles:true })); })()`);
  const v = id => ev(`document.getElementById("${id}").value`), on = id => ev(`document.getElementById("${id}").checked`);
  const hook = () => ev(`(function(){ var g = BandMidi.generate; BandMidi.generate = function(p, o){ window.__opts = o.opts; return g.apply(this, arguments); }; HTMLAnchorElement.prototype.click = function(){}; })()`);
  const opts = async () => { await ev(`document.getElementById("bt-mid-go").click()`); return JSON.parse(await ev(`JSON.stringify(window.__opts)`)); };
  const snap = async () => [await v("bt-comp"), await v("bt-bass-sound"), await v("bt-ride"), await on("bt-push"), await v("bt-bass"), await v("bt-rhythm"), await v("bt-groove")];
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/tools/backing-track.html"); await b.sleep(1200); await hook();
    assert.deepStrictEqual(await snap(), ["piano", "upright", "ride", false, "walk", "auto", "auto"], "swing as before");
    assert.strictEqual(await ev(`Array.from(document.querySelectorAll("#bt-style optgroup[label='Folk, rock and pop'] option")).map(function(o){ return o.textContent; }).join(" | ")`),
      "Straight-eighth rock | Acoustic strum | Piano ballad | Dance pop | Motown / soul | 12/8 doo-wop | Country train beat | Boom-chick");
    // a style brings its sounds; the instrument stays in its family unless the style is built around the other one
    await set("bt-style", "rock"); assert.deepStrictEqual(await snap(), ["piano", "electric", "hat", true, "eighths", "strumEights", "rock"]);
    await set("bt-style", "strum"); assert.deepStrictEqual(await snap(), ["aguitar", "electric", "hat", true, "dotted", "strumCamp", "strum"]);
    let o = await opts(); assert.deepStrictEqual([o.comp, o.compSound, o.voicing, o.push, o.bassSound, o.ride], ["guitar", "aguitar", "open", true, "electric", "hat"]);
    await set("bt-style", "rock"); assert.strictEqual(await v("bt-comp"), "cguitar", "still a guitar, now the clean electric");
    await set("bt-style", "swing"); assert.deepStrictEqual(await snap(), ["guitar", "upright", "ride", false, "walk", "auto", "auto"]);
    await set("bt-style", "pop"); assert.deepStrictEqual(await snap(), ["piano", "electric", "hat", false, "dotted", "quarters", "ballad"]);
    await set("bt-style", "doowop"); assert.deepStrictEqual((await snap()).slice(4), ["twelve8", "triplets", "twelve8"]); assert.strictEqual(await v("bt-feel"), "swing");
    await set("bt-style", "dance"); assert.strictEqual(await v("bt-comp"), "epiano");
    // Push chords and Chorus bars
    await set("bt-style", "rock"); await set("bt-lift", "5-8, 12"); o = await opts(); assert.deepStrictEqual(o.lift, [4, 5, 6, 7, 11]); assert.strictEqual(o.push, true);
    await ev(`(function(){ var c = document.getElementById("bt-push"); c.checked = false; c.dispatchEvent(new Event("change", { bubbles:true })); })()`); assert.strictEqual((await opts()).push, false);
    await set("bt-lift", ""); assert.deepStrictEqual((await opts()).lift, []);
    // the new sounds load and are the ones played: steel guitar, electric bass, hi-hat
    await set("bt-style", "strum"); await set("bt-countin", "0");
    await ev(`(function(){ window.__seen = {}; var p = BandSounds.Bank && BandSounds.Bank.prototype; })()`);
    await ev(`document.getElementById("bt-play").click(); 0`);
    const t = Date.now(); let st = ""; while (Date.now() - t < 30000){ st = await ev(`(document.getElementById("bt-status") || document.querySelector("#bt-root .bt-status")).textContent`); if (/bar \d/i.test(st)) break; await b.sleep(200); }
    assert(/bar \d/i.test(st), "playing: " + st); await b.sleep(1500); await ev(`document.getElementById("bt-play").click(); 0`);
    const reqs = (b.requests || []).join(" ");
    if (b.requests) assert(/acoustic_guitar_steel/.test(reqs) && /electric_bass_finger/.test(reqs), "samples requested");
    assert(!b.errors.filter(e => !/supabaseUrl/.test(e)).length, "page errors: " + b.errors.join(" | "));
    // a link names the family; the style gives the sound
    await b.goto(B + "/tools/backing-track.html?style=rock&comp=guitar"); await b.sleep(1200);
    assert.deepStrictEqual([await v("bt-style"), await v("bt-comp"), await v("bt-voicing")], ["rock", "cguitar", "open"]);
    // saved setups keep the two new controls
    await set("bt-lift", "9-16");
    // Chord Entry: the style's own sounds and rhythm
    await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1200);
    await set("ce-style", "rock"); let e = JSON.parse(await ev(`JSON.stringify(window.__entry.opts())`));
    assert.deepStrictEqual([e.comp, e.bassSound, e.ride, e.bassFeel, e.compRhythm, e.groove, e.push, e.voiceMove], ["piano", "electric", "hat", "eighths", "strumEights", "rock", true, "hold"]);
    await set("ce-style", "strum"); e = JSON.parse(await ev(`JSON.stringify(window.__entry.opts())`)); assert.deepStrictEqual([e.comp, e.compSound], ["piano", "piano"], "always a piano here");
    await set("ce-style", "swing"); e = JSON.parse(await ev(`JSON.stringify(window.__entry.opts())`)); assert.deepStrictEqual([e.bassSound, e.ride, e.feel], ["upright", "ride", "swing"]);
    assert(!b.errors.filter(x => !/supabaseUrl/.test(x)).length, "page errors: " + b.errors.join(" | "));
    console.log("POP UI OK");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
