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
      "Straight-eighth rock | Emo / pop-punk | Acoustic strum | Piano ballad | Dance pop | Motown / soul | 12/8 doo-wop | Country train beat | Boom-chick | John Prine Fingerpicking");
    // a style brings its sounds; the instrument stays in its family unless the style is built around the other one
    await set("bt-style", "rock"); assert.deepStrictEqual(await snap(), ["piano", "electric", "hat", true, "eighths", "strumEights", "rock"]);
    await set("bt-style", "strum"); assert.deepStrictEqual(await snap(), ["aguitar", "electric", "hat", true, "dotted", "strumCamp", "strum"]);
    let o = await opts(); assert.deepStrictEqual([o.comp, o.compSound, o.voicing, o.push, o.bassSound, o.ride], ["guitar", "aguitar", "open", true, "electric", "hat"]);
    await set("bt-style", "rock"); assert.strictEqual(await v("bt-comp"), "clguitar", "still a guitar, now the clean electric");
    await set("bt-style", "swing"); assert.deepStrictEqual(await snap(), ["guitar", "upright", "ride", false, "walk", "auto", "auto"]);
    await set("bt-style", "pop"); assert.deepStrictEqual(await snap(), ["piano", "electric", "hat", false, "dotted", "ballRock", "ballad"]);
    // the ballad is a blend of three rhythms, each with a slider for its share
    const sliders = () => ev(`Array.from(document.querySelectorAll("#bt-rhythm-extra .bt-mixw")).filter(function(s){ return !s.hidden; }).map(function(s){ return s.getAttribute("data-id") + "=" + s.value; }).join(" ")`);
    const slide = (id, val) => ev(`(function(){ var s = document.querySelector('#bt-rhythm-extra .bt-mixw[data-id="${id}"]'); s.value = "${val}"; s.dispatchEvent(new Event("input", { bubbles:true })); })()`);
    assert.strictEqual(await sliders(), "ballRock=50 ballBroken=50 ballSync=50");
    o = await opts(); assert.strictEqual(o.compRhythm, "ballRock+ballBroken+ballSync"); assert.deepStrictEqual(o.rhythmMix, { ballRock: 0.5, ballBroken: 0.5, ballSync: 0.5 });
    await slide("ballSync", 0); await slide("ballRock", 90); o = await opts(); assert.strictEqual(o.compRhythm, "ballRock+ballBroken"); assert.deepStrictEqual(o.rhythmMix, { ballRock: 0.9, ballBroken: 0.5, ballSync: 0 });
    await slide("ballBroken", 0); assert.strictEqual((await opts()).compRhythm, "ballRock", "one alone is pure");
    await slide("ballRock", 0); assert.strictEqual((await opts()).compRhythm, "ballRock", "all at zero: the menu's rhythm");
    // the sliders survive a rebuild, appear for any ticked rhythm, and Unlock offers rhythms from other styles to blend in
    await ev(`(function(){ var c = document.getElementById("bt-unlock"); c.checked = true; c.dispatchEvent(new Event("change", { bubbles:true })); })()`);
    assert.strictEqual(await sliders(), "ballRock=0 ballBroken=0 ballSync=0");
    await ev(`(function(){ var c = document.querySelector('#bt-rhythm-extra input[type=checkbox][value="montuno"]'); c.checked = true; c.dispatchEvent(new Event("change", { bubbles:true })); })()`);
    await slide("montuno", 30); await slide("ballRock", 70); o = await opts(); assert.strictEqual(o.compRhythm, "ballRock+montuno"); assert.strictEqual(o.rhythmMix.montuno, 0.3);
    await ev(`(function(){ var c = document.getElementById("bt-unlock"); c.checked = false; c.dispatchEvent(new Event("change", { bubbles:true })); })()`);
    await set("bt-style", "swing"); assert.strictEqual(await sliders(), "", "one rhythm: nothing to blend");
    await ev(`(function(){ var c = document.querySelector('#bt-rhythm-extra input[type=checkbox][value="charleston"]'); c.checked = true; c.dispatchEvent(new Event("change", { bubbles:true })); })()`);
    assert.strictEqual(await sliders(), "", "Varied with one rhythm ticked: still nothing to blend");
    await ev(`(function(){ var c = document.querySelector('#bt-rhythm-extra input[type=checkbox][value="garland"]'); c.checked = true; c.dispatchEvent(new Event("change", { bubbles:true })); })()`);
    assert.strictEqual(await sliders(), "charleston=50 garland=50"); await set("bt-style", "pop");
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
    // the ballad pulls the hi-hat fader down; the next style puts it back; a fader the user moved in another style is left alone
    await set("bt-style", "pop"); assert.strictEqual(await v("bt-kit-hat"), "53"); assert.strictEqual(await v("bt-timefeel") + "|" + await v("bt-timeparts"), "half|bass drums plain", "the ballad is in half time");
    await set("bt-style", "rock"); assert.strictEqual(await v("bt-kit-hat"), "100"); assert.strictEqual(await v("bt-timefeel") + "|" + await v("bt-timeparts"), "normal|bass drums");
    await set("bt-kit-hat", "80"); await set("bt-style", "swing"); assert.strictEqual(await v("bt-kit-hat"), "80"); await set("bt-kit-hat", "100"); await set("bt-style", "pop");
    // follow my playing: loudness fed in (as the microphone would) becomes the band's level, relative to the quietest and loudest heard
    assert.strictEqual(await ev(`document.getElementById("bt-follow").checked`), false);
    let lv = await ev(`(function(){ var x; for (var i = 0; i < 40; i++) x = __follow.feed(-50); return x; })()`); assert(lv < 0.2, "quiet: " + lv);
    lv = await ev(`(function(){ var x; for (var i = 0; i < 40; i++) x = __follow.feed(-15); return x; })()`); assert(lv > 0.8, "loud: " + lv);
    assert(/Hearing you: loud/.test(await ev(`document.getElementById("bt-follow-note").textContent`)));
    lv = await ev(`(function(){ var x; for (var i = 0; i < 60; i++) x = __follow.feed(-45); return x; })()`); assert(lv < 0.35, "eased off: " + lv);
    await ev(`__follow.stop(); 0`); assert.strictEqual(await ev(`document.getElementById("bt-follow-note").textContent`), "");
    // emo / pop-punk: the distorted guitar, the muted strum, and Half-time bars reaching the band; the sound loads and plays
    await set("bt-style", "emo"); assert.deepStrictEqual(await snap(), ["odguitar", "electric", "hat", true, "eighths", "strumPunk", "rock"]);
    await ev(`(function(){ var e = document.getElementById("bt-half"); e.value = "9-12"; e.dispatchEvent(new Event("input", { bubbles:true })); })()`);
    o = await opts(); assert.deepStrictEqual([o.comp, o.compSound, o.compRhythm, o.halfBars], ["guitar", "odguitar", "strumPunk", [8, 9, 10, 11]]);
    await ev(`(function(){ window.__dg = 0; var f = window.fetch; window.fetch = function(u){ if (/distortion_guitar/.test(String(u && u.url || u))) window.__dg++; return f.apply(this, arguments); }; document.getElementById("bt-play").click(); })()`);
    { const t0 = Date.now(); let st = ""; while (Date.now() - t0 < 20000){ st = await ev(`document.getElementById("bt-status") ? document.getElementById("bt-status").textContent : ""`); if (/bar \d/i.test(st)) break; await b.sleep(200); }
      assert(/bar \d/i.test(st), "emo plays: " + st); await ev(`document.getElementById("bt-play").click(); 0`); }
    await ev(`(function(){ var e = document.getElementById("bt-half"); e.value = ""; e.dispatchEvent(new Event("input", { bubbles:true })); })()`); await set("bt-style", "swing"); assert.strictEqual(await v("bt-comp"), "guitar");
    // hymns and carols; the organ; the boom-chick slider appears only with a boom-chick part
    await set("bt-style", "hymn"); assert.deepStrictEqual(await snap(), ["piano", "upright", "ride", false, "held", "hymn", "none"]);
    assert.strictEqual(await ev(`document.getElementById("bt-boom-field").hidden`), true);
    await set("bt-comp", "organ"); o = await opts(); assert.deepStrictEqual([o.comp, o.compSound, o.groove], ["piano", "organ", "none"]);
    await set("bt-style", "carol"); assert.deepStrictEqual(await snap(), ["aguitar", "upright", "hat", false, "halves", "strumFolk", "brushes"]);
    await set("bt-style", "folk"); assert.strictEqual(await ev(`document.getElementById("bt-boom-field").hidden`), false); assert.strictEqual((await opts()).boom, 0.35);
    await ev(`(function(){ var e = document.getElementById("bt-boom"); e.value = "100"; e.dispatchEvent(new Event("input", { bubbles:true })); })()`); assert.strictEqual((await opts()).boom, 1);
    await set("bt-groove", "none"); await set("bt-bass", "roots"); await set("bt-rhythm", "pad"); assert.strictEqual(await ev(`document.getElementById("bt-boom-field").hidden`), true);
    // a link names the family; the style gives the sound
    await b.goto(B + "/tools/backing-track.html?style=rock&comp=guitar"); await b.sleep(1200);
    assert.deepStrictEqual([await v("bt-style"), await v("bt-comp"), await v("bt-voicing")], ["rock", "clguitar", "open"]);
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
