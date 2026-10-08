// Backing Track page: Feel / Count-in / Choruses / Loop live in the Play panel, the Band section is grouped
// by player, the Style menu sets bass + rhythm + feel together, and comping rhythms can be ticked like voicings.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1300 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(6000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const set = (id, val) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${val}"; e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const tick = (box, val, on) => ev(`(function(){ var c = document.querySelector('#${box} input[value="${val}"]'); c.checked = ${on}; c.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const v = id => ev(`document.getElementById("${id}").value`), txt = id => ev(`document.getElementById("${id}").textContent`);
  const waitFor = async (expr, ms, what) => { const t = Date.now(); for (;;) { try { if (await ev(expr)) return; } catch (e) {} if (Date.now() - t > ms) throw new Error("timeout " + what); await b.sleep(100); } };
  // what the band is told: read off a silent generate (Export MIDI with nothing played)
  const hook = () => ev(`(function(){ var g = BandMidi.generate; BandMidi.generate = function(p, o){ window.__opts = o.opts; return g.apply(this, arguments); }; HTMLAnchorElement.prototype.click = function(){}; })()`);
  const opts = async () => { await ev(`document.getElementById("bt-mid-go").click()`); return JSON.parse(await ev(`JSON.stringify(window.__opts)`)); };
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/tools/backing-track.html"); await b.sleep(1000); await ev(`localStorage.removeItem("btSections")`); await hook();
    const lay = JSON.parse(await ev(`JSON.stringify({ inPlay: ["bt-feel","bt-countin","bt-choruses","bt-cyc-on","bt-cyc-from","bt-cyc-to","bt-loop-note"].map(function(id){ var e = document.getElementById(id); return !!e && e.closest(".bt-panel") === document.querySelector("#bt-root > .bt-panel") && !e.closest("details"); }),
      groups: Array.from(document.querySelectorAll("#bt-sec-band h3")).map(function(h){ return h.textContent; }), inBand: ["bt-style","bt-unlock","bt-groove","bt-variation","bt-stops","bt-bass","bt-bass-sound","bt-comp","bt-rhythm","bt-voicing","bt-vmove","bt-ext","bt-rhythm-extra","bt-voicing-extra"].every(function(id){ return !!document.getElementById(id).closest("#bt-sec-band"); }),
      practice: Array.from(document.querySelectorAll("#bt-practice input")).map(function(i){ return i.id; }).join(" "), pre: document.querySelectorAll("#bt-root pre, #bt-root code.sourceCode").length,
      
      ticks: document.querySelectorAll("#bt-rhythm-extra input").length, heads: Array.from(document.querySelectorAll("#bt-rhythm-extra .bt-morehead")).map(function(h){ return h.textContent; }).join(" | "),
      styles: Array.from(document.getElementById("bt-style").options).filter(function(o){ return !o.hidden; }).length, style: document.getElementById("bt-style").value, wide: document.documentElement.scrollWidth <= window.innerWidth })`));
    console.log(JSON.stringify(lay));
    assert(lay.inPlay.every(Boolean), "feel, count-in, choruses and loop are in the Play panel: " + lay.inPlay); assert(lay.inBand && lay.pre === 0 && lay.wide);
    assert.deepStrictEqual(lay.groups, ["Whole band", "Bass", "Comping", "Drums"]); assert.strictEqual(lay.practice, "bt-start bt-step-on bt-step-a bt-step-b");
    assert.strictEqual(lay.style, "swing"); assert.strictEqual(lay.styles, 18);
    const list = id => ev(`Array.from(document.getElementById("${id}").options).map(function(o){ return o.value; }).join(" ")`);
    const groups = id => ev(`Array.from(document.querySelectorAll("#${id} optgroup")).map(function(g){ return g.label + ":" + g.children.length; }).join(" | ")`);
    // unmarked extensions: off by default, a frequency and three kinds; not offered outside the jazz styles unless unlocked
    assert.strictEqual((await opts()).extend, null); assert.strictEqual(await ev(`document.getElementById("bt-ext-more").hidden`), true); assert.strictEqual(await ev(`!!document.getElementById("bt-maj6")`), false);
    await set("bt-ext", "0.35"); await ev(`(function(){ var c = document.getElementById("bt-ext-thirteen"); c.checked = false; c.dispatchEvent(new Event("change", { bubbles:true })); })()`);
    assert.deepStrictEqual((await opts()).extend, { amount: 0.35, six: true, nine: true, thirteen: false }); assert.strictEqual(await ev(`document.getElementById("bt-ext-more").hidden`), false);
    await set("bt-style", "rock"); assert.strictEqual(await ev(`document.getElementById("bt-ext").disabled`), true); assert.strictEqual((await opts()).extend, null);
    await set("bt-style", "swing"); assert.strictEqual((await opts()).extend.amount, 0.35); await set("bt-ext", "0");
    // locked: each menu offers only what fits the style
    assert.strictEqual(await list("bt-bass"), "walk two sowhat killerjoe footprints allblues takefive"); assert.strictEqual(await list("bt-rhythm"), "auto charleston reverse garland offbeats pad four sowhat takefive");
    assert.strictEqual(await list("bt-groove"), "auto"); assert.strictEqual(await list("bt-voicing"), "shell guide rootless drop2 drop3 sowhat bh auto"); assert.strictEqual(lay.ticks, 8);
    assert(/Swing, bebop/.test(await txt("bt-style-note"))); assert(/Fits: Swing, Jazz ballad\.$/.test(await ev(`document.querySelector('#bt-bass option[value="walk"]').title`)));
    // a style sets everything
    await set("bt-style", "bossa"); assert.deepStrictEqual([await v("bt-bass"), await v("bt-rhythm"), await v("bt-groove"), await v("bt-feel"), await v("bt-voicing")], ["bossa", "bossa", "bossa", "straight", "rootless"]);
    let o = await opts(); assert.deepStrictEqual([o.bassFeel, o.compRhythm, o.groove, o.feel], ["bossa", "bossa", "bossa", "straight"]);
    await set("bt-style", "montuno"); assert.deepStrictEqual([await v("bt-bass"), await v("bt-rhythm"), await v("bt-groove"), await v("bt-voicing")], ["tumbao", "montuno", "clave", "standard"]);
    assert.strictEqual(await ev(`document.getElementById("bt-rhythm-more").hidden`), true, "nothing more to tick in a one-rhythm style");
    await set("bt-comp", "guitar"); assert.strictEqual(await v("bt-voicing"), "triad3"); await set("bt-comp", "piano");
    // locked, the other feel means the plain style of that feel
    await set("bt-feel", "swing"); assert.deepStrictEqual([await v("bt-style"), await v("bt-bass")], ["swing", "walk"]);
    await set("bt-feel", "straight"); assert.deepStrictEqual([await v("bt-style"), await v("bt-bass"), await v("bt-rhythm")], ["boogaloo", "riff", "stabs"]);
    // unlocked: everything is listed, what fits first; the goofy combination reaches the band
    await set("bt-style", "swing");
    await ev(`(function(){ var c = document.getElementById("bt-unlock"); c.checked = true; c.dispatchEvent(new Event("change", { bubbles:true })); })()`);
    assert.strictEqual(await groups("bt-rhythm"), "Fits Swing:9 | Jazz:1 | From tunes:1 | Folk, rock and pop:19 | Caribbean:1 | Latin:4"); assert.strictEqual((await list("bt-bass")).split(" ").length, 24); assert.strictEqual((await list("bt-groove")).split(" ").length, 20);
    assert.deepStrictEqual([await v("bt-bass"), await v("bt-rhythm"), await v("bt-feel")], ["walk", "auto", "swing"], "unlocking changes nothing by itself");
    assert.strictEqual(await ev(`Array.from(document.querySelectorAll("#bt-rhythm-extra .bt-morehead")).map(function(h){ return h.textContent; }).join(" | ")`), "Fits Swing | Outside Swing");
    await set("bt-rhythm", "montuno"); await set("bt-voicing", "standard"); await set("bt-groove", "clave");
    o = await opts(); assert.deepStrictEqual([o.feel, o.bassFeel, o.compRhythm, o.voicing, o.groove], ["swing", "walk", "montuno", "standard", "clave"]);
    await set("bt-feel", "straight"); assert.strictEqual(await v("bt-style"), "swing", "unlocked, the feel is free");
    await set("bt-feel", "swing");
    // ticked rhythms
    await set("bt-rhythm", "auto"); assert.strictEqual(await txt("bt-rhythm-more-sum"), "Choose the rhythms Varied uses"); assert.strictEqual((await opts()).compRhythm, "auto");
    await tick("bt-rhythm-extra", "four", true); await tick("bt-rhythm-extra", "bossa", true);
    assert.strictEqual(await txt("bt-rhythm-more-sum"), "Varied between the 2 ticked rhythms"); assert.strictEqual((await opts()).compRhythm, "four+bossa");
    await set("bt-rhythm", "charleston"); assert.strictEqual(await txt("bt-rhythm-more-sum"), "Rhythm: also using 2 more"); assert.strictEqual((await opts()).compRhythm, "charleston+four+bossa");
    await ev(`document.getElementById("bt-rhythm-more").open = true; document.getElementById("bt-voicing-more").open = true`); await b.sleep(200); await b.shot("../pat/band.png");
    // locking again drops what does not fit and keeps what does
    await ev(`(function(){ var c = document.getElementById("bt-unlock"); c.checked = false; c.dispatchEvent(new Event("change", { bubbles:true })); })()`);
    o = await opts(); assert.deepStrictEqual([o.compRhythm, o.voicing, o.groove, o.bassFeel], ["charleston+four", "rootless", "auto", "walk"]);
    await set("bt-changes", "watermelon"); assert.deepStrictEqual([await v("bt-style"), await v("bt-bass"), await v("bt-rhythm"), await v("bt-feel")], ["boogaloo", "riff", "stabs", "straight"]);
    // play a mixed set and a Latin style through: no errors, and the loop control still works from its new place
    const errs = () => ev(`JSON.stringify((window.__errs || []))`);
    await ev(`window.__errs = []; window.addEventListener("error", function(e){ if (!/supabaseUrl|createClient/.test(e.message)) window.__errs.push(e.message); })`);
    await set("bt-changes", "jazz"); await set("bt-style", "montuno");
    await ev(`(function(){ var c = document.getElementById("bt-unlock"); c.checked = true; c.dispatchEvent(new Event("change", { bubbles:true })); })()`); await tick("bt-rhythm-extra", "arp", true); await tick("bt-rhythm-extra", "charleston", true);
    await set("bt-countin", "0"); await set("bt-tempo-n", "290"); await set("bt-cyc-from", "3"); await set("bt-cyc-to", "6");
    await ev(`(function(){ var c = document.getElementById("bt-cyc-on"); c.checked = true; c.dispatchEvent(new Event("change", { bubbles:true })); })()`);
    assert(/Looping bars 3 to 6/.test(await txt("bt-loop-note")));
    await ev(`window.__seen = []; new MutationObserver(function(){ var t = document.getElementById("bt-status").textContent, m = / bar (\\d+)/.exec(t); if (m && window.__seen[window.__seen.length - 1] !== m[1]) window.__seen.push(m[1]); }).observe(document.getElementById("bt-status"), { childList:true, characterData:true, subtree:true }); document.getElementById("bt-play").click()`);
    await waitFor(`window.__seen.length >= 14`, 60000, "three times round the loop");
    await ev(`document.getElementById("bt-play").click()`); await b.sleep(300);
    const seen = JSON.parse(await ev(`JSON.stringify(window.__seen)`)); console.log("played bars:", seen.join(" "));
    assert(seen.every(x => +x >= 3 && +x <= 6)); assert.strictEqual(await errs(), "[]");
    // rock on guitar: open and barre chords by default, strums on offer; the shapes reach Chord Sheet with their fingering
    await ev(`(function(){ var c = document.getElementById("bt-unlock"); c.checked = false; c.dispatchEvent(new Event("change", { bubbles:true })); var d = document.getElementById("bt-cyc-on"); d.checked = false; d.dispatchEvent(new Event("change", { bubbles:true })); })()`);
    await set("bt-changes", "basic"); await set("bt-style", "rock"); await set("bt-comp", "guitar");
    assert.strictEqual(await v("bt-voicing"), "open"); assert(/strumCamp/.test(await list("bt-rhythm")) && /strum16/.test(await list("bt-rhythm")));
    await set("bt-rhythm", "strumCamp"); o = await opts(); assert.deepStrictEqual([o.compRhythm, o.voicing, o.comp, o.groove], ["strumCamp", "open", "guitar", "rock"]);
    await ev(`window.__seen = []; document.getElementById("bt-play").click()`); await waitFor(`/Chorus 2 · bar 2/.test(document.getElementById("bt-status").textContent)`, 60000, "a strummed chorus");
    await ev(`document.getElementById("bt-play").click()`); await b.sleep(300); assert.strictEqual(await errs(), "[]");
    await ev(`window.open = function(){ return window; }; document.getElementById("bt-send").click()`);
    const sent = JSON.parse(await ev(`JSON.stringify(window.__btLastHandoff)`)); console.log("open shapes:", sent.chords.map(c => c.sym + " " + c.strings.map(x => x.fret).join("")).join(" | "));
    assert.strictEqual(sent.voicing, "open"); assert.deepStrictEqual(sent.chords.map(c => c.strings.map(x => x.fret).join("")), ["131211", "13131", "32310"]);
    await b.goto(B + "/tools/chord-sheet.html?from=backing-track"); await waitFor(`document.querySelectorAll(".diagram-card").length >= 3`, 15000, "chord sheet cards"); await b.sleep(700);
    const cs = JSON.parse(await ev(`JSON.stringify(Array.from(document.querySelectorAll(".diagram-card")).map(function(c){ return c.querySelectorAll("circle.note-marker").length; }))`)); console.log("chord sheet dots:", cs.join(","));
    await b.shot("../pat/open-sheet.png"); assert(cs.every(n => n >= 5), "full shapes drawn");
    // save and load: a tune with every setting comes back exactly, survives a reload, and is in the Changes menu
    await b.goto(B + "/tools/backing-track.html"); await b.sleep(900); await ev(`localStorage.removeItem("btSetups")`); await b.goto(B + "/tools/backing-track.html"); await b.sleep(900); await hook();
    assert.strictEqual(await ev(`document.getElementById("bt-setup-load").disabled`), true);
    await set("bt-changes", "watermelon"); await set("bt-key", "Bb"); await set("bt-bass", "riffwalk"); await set("bt-comp", "guitar"); await set("bt-voicing", "guide2"); await tick("bt-voicing-extra", "top3", true);
    await set("bt-ext", "0.7"); await set("bt-tempo-n", "108"); await set("bt-countin", "2"); await set("bt-bass-sound", "electric"); await set("bt-kit-ride", "20");
    await ev(`document.getElementById("bt-kit-ride").dispatchEvent(new Event("input", { bubbles:true }))`);
    const before = await opts(), abcBefore = await v("bt-abc");
    await ev(`document.getElementById("bt-setup-name").value = "WM in Bb"; document.getElementById("bt-setup-save").click()`);
    assert(/Saved/.test(await txt("bt-setup-note"))); assert.strictEqual(await ev(`document.getElementById("bt-changes").selectedOptions[0].textContent`), "WM in Bb");
    await b.goto(B + "/tools/backing-track.html"); await b.sleep(900); await hook();
    assert.strictEqual(await v("bt-style"), "swing"); assert.strictEqual(await ev(`document.querySelector('#bt-changes optgroup[label="Saved on this device"] option').textContent`), "WM in Bb");
    await set("bt-changes", "setup:u:0");
    const after = await opts(); assert.deepStrictEqual(after, before, "every band setting is back"); assert.strictEqual(await v("bt-abc"), abcBefore);
    assert.deepStrictEqual([await v("bt-tempo-n"), await v("bt-countin"), await v("bt-key"), await v("bt-kit-ride"), await v("bt-stops"), await v("bt-bass-sound"), await v("bt-style")], ["108", "2", "Bb", "20", "14", "electric", "boogaloo"]);
    await ev(`document.getElementById("bt-setup-json-btn").click()`); const js = await v("bt-setup-json"); assert(/"name": "WM in Bb"/.test(js) && /riffwalk/.test(js));
    assert.strictEqual(await ev(`window.__btImportSetups(JSON.stringify([{ v:1, name:"Imported", abc:'X:1\\nM:4/4\\nL:1/4\\nK:C\\n"C"z4|"F"z4|"G7"z4|"C"z4|]', tempo: 90, style:"rock", fields:{ "bt-comp":"guitar" } }]))`), 1);
    await set("bt-setup-list", "setup:u:1"); await ev(`document.getElementById("bt-setup-load").click()`);
    assert.deepStrictEqual([await v("bt-style"), await v("bt-voicing"), await v("bt-tempo-n"), await v("bt-key"), await v("bt-groove")], ["rock", "open", "90", "C", "rock"]);
    await ev(`document.getElementById("bt-setup-del").click()`); assert.strictEqual(await ev(`document.querySelectorAll("#bt-setup-list option").length`), 1); assert.strictEqual(await v("bt-changes"), "custom");
    await ev(`localStorage.removeItem("btSetups")`);
    // ?style= and ?rhythm= links
    await b.goto(B + "/tools/backing-track.html?style=chacha"); await b.sleep(900);
    assert.deepStrictEqual([await v("bt-style"), await v("bt-bass"), await v("bt-rhythm"), await v("bt-groove"), await v("bt-feel")], ["chacha", "chacha", "chacha", "chacha", "straight"]);
    await b.goto(B + "/tools/backing-track.html?rhythm=upbeats&feel=straight"); await b.sleep(900); assert.deepStrictEqual([await v("bt-style"), await v("bt-rhythm"), await v("bt-feel")], ["calypso", "upbeats", "straight"]);
    await b.goto(B + "/tools/backing-track.html?drums=onedrop"); await b.sleep(900); assert.deepStrictEqual([await v("bt-style"), await v("bt-groove")], ["reggae", "onedrop"]);
    await b.goto(B + "/tools/backing-track.html?bass=riff"); await b.sleep(900); assert.deepStrictEqual([await v("bt-style"), await v("bt-bass"), await v("bt-feel")], ["boogaloo", "riff", "straight"]);
    // the Accompaniment Styles page lists the new entries
    await b.goto(B + "/tools/accomp-styles.html"); await b.sleep(1200);
    const cards = JSON.parse(await ev(`JSON.stringify(Array.from(document.querySelectorAll("#as-band .as-id")).map(function(e){ return e.textContent; }))`));
    ["tumbao", "bossa", "montuno", "arp2", "oompah", "clave", "onedrop"].forEach(id => assert(cards.indexOf(id) >= 0, "card " + id)); console.log("catalog cards:", cards.length);
    console.log("BAND UI OK");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
