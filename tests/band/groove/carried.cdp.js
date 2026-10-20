// What the Drumset draft carries over from the first Drumset page (tools/_drumset-b.qmd, groove-editor.js): localStorage.tuneMeter,
// the icon grid and its PNG export, custom count words, the bongo row, the synthesized ride, and the standard patterns (groove-library.js).
// Run from tests/band/lead with the server on 8500 and tools/drumset-b.qmd rendered into the test site.  node ../groove/carried.cdp.js [shots]
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1000 }); const U = "http://127.0.0.1:8500/tools/drumset-b.html";
  const ev = x => Promise.race([b.eval(x), b.sleep(10000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const until = async (x, ms, what) => { const t = Date.now(); while (Date.now() - t < ms){ if (await ev(x)) return; await b.sleep(120); } throw new Error("timed out: " + what); };
  const open = async (q, pre) => { await b.goto(U + (q || "")); await b.sleep(900);
    await ev(`window.__err = []; window.addEventListener("error", function(e){ __err.push(e.message); }); window.__kit = []; window.__cg = []; window.__rideHits = []; window.__prompts = [];
      window.prompt = function (m, d){ return window.__answer == null ? null : window.__answer; };
      var os = BandSounds.create; BandSounds.create = function(){ var bk = os.apply(this, arguments), p = bk.play; bk.play = function(n, e, t){ (n === "congas" ? __cg : n === "kit" ? __kit : []).push([e.piece, e.vel, e.gain]); return p.apply(this, arguments); }; return bk; };
      var oc = RideSynth.create; RideSynth.create = function(){ var r = oc.apply(this, arguments), h = r.hit; r.hit = function(t, o){ __rideHits.push([t, o && o.bell]); return h.apply(this, arguments); }; return r; }; 0`); };
  const clean = async w => { assert.deepStrictEqual(await ev(`window.__err`), [], w); assert.deepStrictEqual(b.errors.filter(e => !/supabase|Didn't load note/i.test(e)), [], w); };
  const text = () => ev(`__drumset.text()`), lane = l => ev(`__drumset.groove().lanes[${JSON.stringify(l)}].join("")`);
  const cell = (l, at) => `document.querySelector('.ge-cell[data-lane="${l}"][data-at="${at}"]')`;
  const click = async (l, at) => { await ev(`(function(){ var c = ${cell(l, at)}; c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 })); window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })); })()`); };
  const set = (id, v, type) => ev(`(function(){ var e = ${id}; e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event(${JSON.stringify(type || "change")}, { bubbles: true })); })()`);
  const field = name => `Array.prototype.filter.call(document.querySelectorAll(".ge-field"), function (f){ return f.firstChild.textContent === ${JSON.stringify(name)}; })[0]`;
  const btn = name => `Array.prototype.filter.call(document.querySelectorAll(".ge button"), function (x){ return x.textContent === ${JSON.stringify(name)}; })[0]`;
  const heads = () => ev(`document.querySelectorAll(".ge-staff svg .abcjs-note").length`);
  const stash = () => ev(`(function(){ try { return localStorage.getItem("tuneMeter") } catch (e) { return null } })()`);
  try {
    // ---- tuneMeter: the tune page's meter is the meter of a new page; a groove in the address wins; nothing stored = 4/4
    await open(); await ev(`localStorage.removeItem("tuneMeter"); localStorage.removeItem("drumsetMarks"); 0`);
    await ev(`localStorage.setItem("tuneMeter", JSON.stringify({ n: 3, d: 4 })); 0`); await b.goto(U); await b.sleep(900);
    assert(/^\?TimeSig=3\/4/.test(await ev(`__drumset.text()`)), "opens in 3/4: " + await ev(`__drumset.text()`));
    assert.strictEqual(await ev(`__drumset.groove().n + "/" + __drumset.groove().d`), "3/4");
    assert.strictEqual(await ev(`${field("Fits")}.querySelector("select").value`), "triple", "the pattern menu fits the tune's meter");
    await ev(`localStorage.setItem("tuneMeter", JSON.stringify({ n: 6, d: 8 })); 0`); await b.goto(U); await b.sleep(900);
    assert.strictEqual(await ev(`__drumset.groove().n + "/" + __drumset.groove().d`), "6/8"); assert.strictEqual(await ev(`__drumset.groove().div`), 8);
    assert.strictEqual(await ev(`${field("Fits")}.querySelector("select").value`), "compound");
    assert((await heads()) > 0, "6/8 is drawn");
    await ev(`localStorage.setItem("tuneMeter", "garbage"); 0`); await b.goto(U); await b.sleep(900);
    assert(/^\?TimeSig=4\/4&Div=16/.test(await text()), "garbage is ignored");
    await ev(`localStorage.setItem("tuneMeter", JSON.stringify({ n: 3, d: 4 })); 0`);
    await b.goto(U + "?TimeSig=2/4&Div=8&Measures=1&H=|x-x-|&S=|--O-|&K=|o---|"); await b.sleep(900);
    assert.strictEqual(await ev(`__drumset.groove().n + "/" + __drumset.groove().d`), "2/4", "a groove in the address wins");
    await ev(`localStorage.removeItem("tuneMeter"); 0`);

    // ---- the icon grid
    await open();
    assert.strictEqual(await ev(`document.querySelectorAll(".ge-cell svg").length`), 0, "letters first");
    await set(`${field("Marks")}.querySelector("select")`, "icons");
    const on = await ev(`document.querySelectorAll(".ge-cell.ge-on").length`);
    assert.strictEqual(await ev(`document.querySelectorAll(".ge-cell.ge-on svg").length`), on, "an icon in every lit cell");
    assert(/rgb/.test(await ev(`getComputedStyle(${cell("K", 0)}).backgroundColor`)));
    assert.strictEqual(await ev(`localStorage.getItem("drumsetMarks")`), "icons");
    await click("S", 7); assert.strictEqual(await ev(`${cell("S", 7)}.querySelectorAll("svg").length`), 1, "a new note is drawn as an icon");
    await ev(`${cell("S", 7)}.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }))`);
    await ev(`Array.prototype.filter.call(document.querySelectorAll(".ge-pop-item"), function (x){ return /^dr/.test(x.textContent); })[0].click()`);
    assert.strictEqual(await lane("S"), "----O--d----O---"); assert.strictEqual(await ev(`${cell("S", 7)}.querySelectorAll("ellipse").length`), 3, "the drag is three heads");
    await set(`${field("Cell size")}.querySelector("input")`, "1.6", "input");
    assert((await ev(`${cell("S", 4)}.getBoundingClientRect().width`)) > 30, "bigger cells");
    if (process.argv[2]) await b.shot("/tmp/drumset-b-icons.png");
    await clean("icons");

    // ---- the picture: black on white, the icons in colour, the title, the typed words
    await set(`${field("Title")}.querySelector("input")`, "Rock & roll");
    const svg = JSON.parse(await ev(`JSON.stringify(__drumset.gridSvg())`));
    assert(svg.width > 600 && svg.height > 150, "size " + svg.width + "x" + svg.height); assert(/Rock &amp; roll/.test(svg.svg), "the title is in it, escaped");
    assert(/<svg x="/.test(svg.svg) && !/currentColor/.test(svg.svg), "icons placed, in black");
    const png = await ev(`__drumset.exportPng(1).then(function (r){ return new Promise(function (res){ var i = new Image(); i.onload = function (){ var c = document.createElement("canvas"); c.width = i.width; c.height = i.height;
      var x = c.getContext("2d"); x.drawImage(i, 0, 0); var d = x.getImageData(0, 0, c.width, c.height).data, dark = 0, colour = 0; for (var k = 0; k < d.length; k += 4){ if (d[k] < 80 && d[k+1] < 80 && d[k+2] < 80) dark++; if (Math.abs(d[k] - d[k+2]) > 40) colour++; }
      res(JSON.stringify({ w: r.width, h: r.height, url: r.dataUrl.slice(0, 22), dark: dark, colour: colour })); }; i.src = r.dataUrl; }); })`);
    const p = JSON.parse(png); assert.strictEqual(p.url, "data:image/png;base64,"); assert.strictEqual(p.w, svg.width); assert(p.dark > 500, "lines and text drawn: " + p.dark); assert(p.colour > 500, "coloured icons: " + p.colour);
    const png2 = JSON.parse(await ev(`__drumset.exportPng(2).then(function (r){ return JSON.stringify({ w: r.width, h: r.height }); })`)); assert.strictEqual(png2.w, svg.width * 2);
    await set(`${field("Marks")}.querySelector("select")`, "letters"); assert(!/<svg x=/.test(JSON.parse(await ev(`JSON.stringify(__drumset.gridSvg())`)).svg), "letters in the picture too");
    await clean("export");

    // ---- custom count words: click Customize labels, then a word; kept until the grid changes; the staff can carry them
    await open();
    assert.strictEqual(await ev(`document.querySelectorAll(".ge-word")[1].textContent`), "e");
    await ev(`window.__answer = "ee"; document.querySelectorAll(".ge-word")[1].click(); 0`); assert.strictEqual(await ev(`document.querySelectorAll(".ge-word")[1].textContent`), "e", "not until Customize labels");
    await ev(`${btn("Customize labels")}.click()`); assert.strictEqual(await ev(`${btn("Done customizing")}.textContent`), "Done customizing");
    await ev(`document.querySelectorAll(".ge-word")[1].click(); 0`); assert.strictEqual(await ev(`document.querySelectorAll(".ge-word")[1].textContent`), "ee");
    await ev(`window.__answer = null; document.querySelectorAll(".ge-word")[2].click(); 0`); assert.strictEqual(await ev(`document.querySelectorAll(".ge-word")[2].textContent`), "+", "Cancel keeps the word");
    await set(`${field("Count")}.querySelector("select")`, "Gordon"); assert.strictEqual(await ev(`document.querySelectorAll(".ge-word")[1].textContent`), "ee", "a typed word stays through another style");
    assert(/ee/.test(JSON.parse(await ev(`JSON.stringify(__drumset.gridSvg())`)).svg), "and in the picture");
    await ev(`Array.prototype.filter.call(document.querySelectorAll(".ge-check"), function (c){ return /under the staff/.test(c.textContent); })[0].querySelector("input").click()`);
    assert(/ee/.test(await ev(`document.querySelector(".ge-staff svg").textContent`)), "and under the staff");
    await set(`${field("Grid")}.querySelector("select")`, "8"); assert.notStrictEqual(await ev(`document.querySelectorAll(".ge-word")[1].textContent`), "ee", "a new grid forgets them");
    await ev(`window.__answer = "x"; document.querySelectorAll(".ge-word")[1].click(); 0`); await ev(`${btn("Reset labels")}.click()`);
    assert.notStrictEqual(await ev(`document.querySelectorAll(".ge-word")[1].textContent`), "x", "Reset labels");
    await clean("labels");

    // ---- bongos: a row, written as Bo, drawn on the staff, heard from the congas bank, not sent to GrooveScribe
    await open("?TimeSig=4/4&Div=8&Measures=1&H=|--------|&S=|--------|&K=|--------|");
    await ev(`Array.prototype.filter.call(document.querySelectorAll(".ge-check"), function (c){ return /bongos/.test(c.textContent); })[0].querySelector("input").click()`);
    assert.strictEqual(await ev(`!!${cell("Bo", 0)}`), true, "the bongo row");
    await click("Bo", 0); await click("Bo", 2); await ev(`${cell("Bo", 3)}.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }))`);
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll(".ge-pop-item"), function (x){ return x.textContent; }))`)).length, 3, "high, low, nothing");
    await ev(`Array.prototype.filter.call(document.querySelectorAll(".ge-pop-item"), function (x){ return /Low bongo/.test(x.textContent); })[0].click()`);
    await click("Bo", 4); await click("Bo", 6);
    assert.strictEqual(await lane("Bo"), "H-HLL-L-".replace("H-HLL-L-", "H-HLL-L-")); assert(/&Bo=\|H-HLL-L-\|/.test(await text()), await text());
    assert(!/Bo=/.test(await ev(`document.querySelector(".ge-link").href`)), "GrooveScribe is not sent the bongos");
    assert((await ev(`document.querySelector(".ge-staff svg").textContent`)).length > 0 && (await heads()) >= 5, "on the staff: " + await heads());
    assert(/HHLLL/.test(await ev(`document.querySelector(".ge-staff svg").textContent`)), "the words under the bongo notes");
    await set(`${field("Marks")}.querySelector("select")`, "icons");
    assert.strictEqual(await ev(`${cell("Bo", 0)}.querySelectorAll("circle").length`), 1); assert((await ev(`${cell("Bo", 3)}.querySelector("circle").getAttribute("r")`)) === "5", "the low drum is the bigger one");
    await ev(`document.querySelectorAll(".ge-check input")[0].checked = false; 0`); await ev(`__kit.length = 0; __cg.length = 0; 0`);
    await ev(`${btn("▶ Play")}.click()`);
    await until(`__cg.length >= 8`, 20000, "the bongos are played");
    const cg = JSON.parse(await ev(`JSON.stringify(__cg)`)).map(x => x[0]); assert(cg.includes("bongoHi") && cg.includes("bongoLo"), "bongo pieces in the congas bank: " + [...new Set(cg)]);
    await ev(`${btn("■ Stop")}.click()`); await b.sleep(300);
    // ... and the band's text round trip of a groove with bongos, reopened from the address
    const t = await text(); await open(t); assert.strictEqual(await lane("Bo"), "H-HLL-L-");
    await clean("bongos");

    // ---- the ride: a synth to choose, played from the band's own hits; the sample ride turned down meanwhile
    await open("?TimeSig=4/4&Div=8&Tempo=160&Measures=1&H=|r-r-b-r-|&S=|--O---O-|&K=|o---o---|");
    await ev(`document.querySelectorAll(".ge-check input")[0].checked = false; 0`);
    assert.strictEqual(await ev(`${field("Ride")}.querySelector("select").value`), "band");
    await ev(`${btn("▶ Play")}.click()`); await until(`__kit.some(function (k){ return k[0] === "ride"; })`, 20000, "the band's ride is played");
    assert.strictEqual(await ev(`__rideHits.length`), 0, "no synth while the band's ride is chosen");
    await ev(`${btn("■ Stop")}.click()`); await b.sleep(300);
    await set(`${field("Ride")}.querySelector("select")`, "synth"); await set(`${field("Kind")}.querySelector("select")`, "jazz18");
    assert.strictEqual(await ev(`${field("Decay")}.querySelector("input").value`), "4.2", "a ride has its own decay");
    await set(`${field("Technique")}.querySelector("select")`, "brush"); await set(`${field("Reverb")}.querySelector("input")`, "40", "input"); await set(`${field("High-pass")}.querySelector("input")`, "400", "input"); await set(`${field("Low-pass")}.querySelector("input")`, "9000", "input");
    await ev(`__kit.length = 0; 0`);
    await ev(`${btn("▶ Play")}.click()`); await until(`__rideHits.length >= 6`, 20000, "the synth ride is played");
    const hits = JSON.parse(await ev(`JSON.stringify(__rideHits)`)); assert(hits.some(h => h[1]) && hits.some(h => !h[1]), "bell and ride both");
    const kitRide = JSON.parse(await ev(`JSON.stringify(__kit.filter(function (k){ return k[0] === "ride" || k[0] === "rideBell"; }))`)); assert(kitRide.length > 0 && kitRide.every(k => k[2] === 0), "the sample ride is at zero: " + JSON.stringify(kitRide.slice(0, 2)));
    assert.deepStrictEqual(await ev(`JSON.stringify(__drumset.ride().params())`), JSON.stringify({ variant: "jazz18", technique: "brush", decay: 4.2, reverb: 40, hp: 400, lp: 9000 }));
    assert(hits.every((h, i) => i === 0 || h[0] >= hits[i - 1][0] - 0.2), "in time order");
    await set(`${field("Ride")}.querySelector("select")`, "band"); await b.sleep(1500);
    const n0 = await ev(`__rideHits.length`); await b.sleep(1500); assert.strictEqual(await ev(`__rideHits.length`), n0, "back to the sample: the synth is silent");
    await ev(`${btn("■ Stop")}.click()`);
    await clean("ride");

    // ---- the standard patterns, each with its source
    await open();
    const items = JSON.parse(await ev(`JSON.stringify(BandGrooveLibrary.ITEMS.map(function (i){ return i.id; }))`)); assert(items.length >= 10);
    const bad = [];
    for (const id of items){
      await ev(`(function(){ var p = ${field("Pattern")}.querySelector("select"); p.value = ${JSON.stringify(id)}; p.dispatchEvent(new Event("change", { bubbles: true })); })()`);
      const g = JSON.parse(await ev(`JSON.stringify({ w: __drumset.groove().warnings, h: document.querySelectorAll(".ge-staff svg .abcjs-note").length, s: document.querySelector(".ge-source").textContent, t: __drumset.text() })`));
      if (g.w.length || g.h < 4 || !/Percussive Arts Society/.test(g.s) || !/Stickings=/.test(g.t)) bad.push(id + " " + JSON.stringify(g).slice(0, 160));
    }
    assert.deepStrictEqual(bad, []);
    await ev(`(function(){ var p = ${field("Pattern")}.querySelector("select"); p.value = "r-single-paradiddle"; p.dispatchEvent(new Event("change", { bubbles: true })); })()`);
    assert.strictEqual(await lane("S"), "OoooOoooOoooOooo"); assert.strictEqual(await lane("Stickings"), "RLRRLRLLRLRRLRLL");
    assert.strictEqual(await ev(`document.querySelectorAll(".ge-staff svg").length`), 1);
    await ev(`__drumset.undo()`); assert.strictEqual(await lane("S"), "dodododododododo", "undo goes back to the pattern before");
    await set(`${field("Fits")}.querySelector("select")`, "triple");
    assert(await ev(`/^\\u25E6 /.test(${field("Pattern")}.querySelector("option[data-mt]").textContent)`), "patterns that do not fit are marked");
    await set(`${field("Fits")}.querySelector("select")`, ""); assert(!(await ev(`/^\\u25E6 /.test(${field("Pattern")}.querySelector("option[data-mt]").textContent)`)));
    await clean("library");

    // ---- a phone
    await b.resize(390, 800); await open("?TimeSig=4/4&Div=16&Measures=2&H=|x-x-x-x-x-x-x-x-|x-x-x-x-x-x-x-x-|&S=|----O-------O---|----O-------O---|&K=|o-------o-o-----|o-------o-o-----|"); await b.sleep(400);
    await ev(`document.querySelector(".ge-fold").open = true; 0`); await b.sleep(200);
    assert((await ev(`document.documentElement.scrollWidth`)) <= 392, "no sideways scroll: " + await ev(`document.documentElement.scrollWidth`));
    await clean("phone");
    await ev(`localStorage.removeItem("drumsetMarks"); 0`);
    console.log("DRUMSET CARRIED OK");
  } catch (e){ console.log("FAILED: " + e.message); console.log(b.errors.slice(-5).join("\n")); try { console.log(await ev(`JSON.stringify(window.__err)`)); await b.shot("/tmp/drumset-b-carried-fail.png"); } catch (x){} process.exitCode = 1; }
  await b.close();
})();
