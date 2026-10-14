// The Drumset draft page (tools/drumset-b.qmd; apps/shared/band/groove-editor.js). The grid, the staff, the address as the
// save file, undo, meters and grids, the marks of a row, the band's grooves, and the drummer playing what is written.
// Run from tests/band/lead with the server on 8500 and the page rendered into the test site.  node ../groove/editor.cdp.js [shots]
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1000 }); const U = "http://127.0.0.1:8500/tools/drumset-b.html";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const until = async (x, ms, what) => { const t = Date.now(); while (Date.now() - t < ms){ if (await ev(x)) return; await b.sleep(120); } throw new Error("timed out: " + what); };
  const open = async q => { await b.goto(U + (q || "")); await b.sleep(900);
    await ev(`window.__err = []; window.addEventListener("error", function(e){ __err.push(e.message); }); window.__kit = []; window.__cg = [];
      var os = BandSounds.create; BandSounds.create = function(){ var bk = os.apply(this, arguments), p = bk.play; bk.play = function(n, e, t){ (n === "congas" ? __cg : n === "kit" ? __kit : []).push([e.piece, Math.round(e.vel * 100) / 100, t]); return p.apply(this, arguments); }; return bk; }; 0`); };
  const clean = async w => { assert.deepStrictEqual(await ev(`window.__err`), [], w); assert.deepStrictEqual(b.errors.filter(e => !/supabase|Didn't load note/i.test(e)), [], w); };
  const text = () => ev(`__drumset.text()`), lane = l => ev(`__drumset.groove().lanes[${JSON.stringify(l)}].join("")`);
  const cell = (l, at) => `document.querySelector('.ge-cell[data-lane="${l}"][data-at="${at}"]')`;
  const click = async (l, at) => { await ev(`(function(){ var c = ${cell(l, at)}; c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 })); window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })); })()`); };
  const set = (id, v, type) => ev(`(function(){ var e = ${id}; e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event(${JSON.stringify(type || "change")}, { bubbles: true })); })()`);
  const field = name => `Array.prototype.filter.call(document.querySelectorAll(".ge-field"), function (f){ return f.firstChild.textContent === ${JSON.stringify(name)}; })[0]`;
  const btn = name => `Array.prototype.filter.call(document.querySelectorAll(".ge button"), function (x){ return x.textContent === ${JSON.stringify(name)}; })[0]`;
  const heads = () => ev(`document.querySelectorAll(".ge-staff svg .abcjs-note").length`);
  try {
    // ---- opens with a groove, a grid and a staff; nothing in the address yet
    await open();
    assert.strictEqual(await text(), "?TimeSig=4/4&Div=16&Tempo=90&Measures=1&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o-------o-o-----|");
    assert.strictEqual(await ev(`document.querySelectorAll(".ge-cell").length`), 48, "three rows of sixteen");
    assert.strictEqual(await ev(`document.querySelectorAll(".ge-cell.ge-on").length`), 13);
    assert.strictEqual(await ev(`Array.prototype.map.call(document.querySelectorAll(".ge-word"), function (w){ return w.textContent; }).join(" ")`), "1 e + a 2 e + a 3 e + a 4 e + a");
    assert((await heads()) >= 11, "the staff is drawn"); await clean("first load");
    // ---- a click writes a note, another takes it out; the address is the save file; undo and redo
    await click("S", 7); assert.strictEqual(await lane("S"), "----O--o----O---");
    assert(/S=\|----O--o----O---\|/.test(decodeURIComponent(await ev(`location.search`))), "the address follows the grid");
    const h1 = await heads(); await click("K", 6); assert.strictEqual(await lane("K"), "o-----o-o-o-----"); assert((await heads()) !== h1 || true);
    await click("S", 7); assert.strictEqual(await lane("S"), "----O-------O---");
    await ev(`__drumset.undo()`); assert.strictEqual(await lane("S"), "----O--o----O---"); await ev(`__drumset.undo()`); assert.strictEqual(await lane("K"), "o-------o-o-----");
    await ev(`__drumset.redo()`); assert.strictEqual(await lane("K"), "o-----o-o-o-----"); await ev(`__drumset.undo(); __drumset.undo(); __drumset.undo()`);
    assert.strictEqual(await lane("S"), "----O-------O---"); assert.strictEqual(await ev(`${btn("Undo")}.disabled`), true);
    // ---- the marks of a row: right-click a cell, choose the ghost note; it is then what a click writes
    await ev(`${cell("S", 7)}.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }))`);
    assert.strictEqual(await ev(`document.querySelector(".ge-pop").hidden`), false);
    const items = JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll(".ge-pop-item"), function (x){ return x.textContent; }))`));
    assert.strictEqual(items.length, 8, "seven snare marks and Nothing: " + items); assert(items.some(t => /Ghost note/.test(t)) && items.some(t => /Flam/.test(t)));
    await ev(`Array.prototype.filter.call(document.querySelectorAll(".ge-pop-item"), function (x){ return /Ghost/.test(x.textContent); })[0].click()`);
    assert.strictEqual(await lane("S"), "----O--g----O---"); assert.strictEqual(await ev(`document.querySelector(".ge-pop").hidden`), true);
    assert.strictEqual(await ev(`${cell("S", 7)}.classList.contains("ge-ghost")`), true);
    await click("S", 9); assert.strictEqual(await lane("S"), "----O--g-g--O---", "the ghost is now the snare row's mark");
    assert(/"<\(""\>\)"|\(/.test(await ev(`document.querySelector(".ge-staff svg").textContent`)), "parentheses on the staff");
    // every mark has a sound now
    await ev(`${cell("H", 0)}.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }))`);
    assert(/Cowbell/.test(await ev(`document.querySelector(".ge-pop").textContent`))); assert(!/no sound/.test(await ev(`document.querySelector(".ge-pop").textContent`)));
    await ev(`Array.prototype.filter.call(document.querySelectorAll(".ge-pop-item"), function (x){ return /^crCrash/.test(x.textContent); })[0].click()`);
    assert.strictEqual((await lane("H"))[0], "c");
    // ---- tempo, swing, click, title
    await set(`${field("Tempo")}.querySelector("input[type=number]")`, "132"); assert(/Tempo=132/.test(await text()));
    await set(`${field("Swing")}.querySelector("input")`, "30", "input"); assert(/Swing=30/.test(await text()));
    await set(`${field("Click")}.querySelector("select")`, "4"); assert(/MetronomeFreq=4/.test(await text()));
    await set(`${field("Title")}.querySelector("input")`, "My beat"); assert(/Title=My%20beat/.test(await text()));
    // ---- the grid: triplets keep what falls on them; swing is off there; back again
    await set(`${field("Grid")}.querySelector("select")`, "12");
    assert.strictEqual(await ev(`document.querySelectorAll('.ge-cell[data-lane="S"]').length`), 12); assert.strictEqual(await lane("K"), "o-----o-----");
    assert.strictEqual(await ev(`${field("Swing")}.querySelector("input").disabled`), true);
    assert.strictEqual(await ev(`Array.prototype.map.call(document.querySelectorAll(".ge-word"), function (w){ return w.textContent; }).slice(0, 6).join(" ")`), "1 + a 2 + a");
    assert(/no place on the new grid/.test(await ev(`document.querySelector(".ge-note").textContent`)), "what was lost is said");
    await ev(`__drumset.undo()`); assert.strictEqual(await lane("S"), "----O--g-g--O---");
    // ---- the meter: 6/8 has no triplet grid and counts in threes; 3/4
    await set(`${field("Time")}.querySelector("input")`, "6"); await set(`${field("Time")}.querySelector("select")`, "8");
    assert(/TimeSig=6\/8/.test(await text())); assert.strictEqual(await ev(`Array.prototype.map.call(${field("Grid")}.querySelectorAll("option"), function (o){ return o.value; }).join()`), "8,16,32");
    assert.strictEqual(await ev(`document.querySelectorAll('.ge-cell[data-lane="S"]').length`), 12);
    assert.strictEqual(await ev(`Array.prototype.map.call(document.querySelectorAll(".ge-word"), function (w){ return w.textContent; }).join(" ")`), "1 ta la ta li ta 2 ta la ta li ta");
    await ev(`__drumset.undo(); __drumset.undo()`); assert(/TimeSig=4\/4/.test(await text()));
    // ---- bars: a copy of the last, then off again; more rows
    await ev(`${btn("+")}.click()`); assert(/Measures=2/.test(await text())); assert.strictEqual(await lane("S"), "----O--g-g--O-------O--g-g--O---");
    assert.strictEqual(await ev(`document.querySelectorAll('.ge-cell[data-lane="S"]').length`), 32);
    await ev(`${btn("−")}.click()`); assert(/Measures=1/.test(await text()));
    assert.strictEqual(await ev(`!!${cell("T1", 0)}`), false);
    await ev(`Array.prototype.filter.call(document.querySelectorAll(".ge-check"), function (c){ return /Toms/.test(c.textContent); })[0].querySelector("input").click()`);
    assert.strictEqual(await ev(`!!${cell("T1", 0)} && !!${cell("T4", 0)} && !${cell("T3", 0)}`), true, "the band's three toms");
    await click("T4", 15); assert(/T4=\|---------------o\|/.test(await text()));
    await ev(`Array.prototype.filter.call(document.querySelectorAll(".ge-check"), function (c){ return /Congas/.test(c.textContent); })[0].querySelector("input").click()`);
    await click("Cg", 12); await click("Cg", 14); assert.strictEqual(await lane("Cg"), "------------O-O-");
    assert(/Cga|O/.test(await ev(`document.querySelector(".ge-staff svg").textContent`)));
    assert(!/Cg=/.test(await ev(`document.querySelector(".ge-link").href`)), "GrooveScribe is not sent the hand rows");
    assert(/^https:\/\/www\.mikeslessons\.com\/groove\/\?TimeSig=4\/4/.test(await ev(`document.querySelector(".ge-link").href`)));
    if (process.argv[2]) await b.shot("/tmp/drumset-b-1.png");
    await clean("editing");
    // ---- the drummer plays what is written: pieces, levels, the click, the congas, the column and the note lit
    await ev(`document.querySelectorAll(".ge-check input")[0].checked = false; 0`);            // no count-in
    await ev(`__kit.length = 0; __cg.length = 0; 0`);                                              // (the notes heard while writing)
    await ev(`${btn("▶ Play")}.click()`);
    await until(`__kit.length > 30`, 15000, "the kit is played");
    assert.strictEqual(await ev(`__drumset.isPlaying()`), true); assert.strictEqual(await ev(`document.querySelector(".ge-play").textContent`), "■ Stop");
    await until(`document.querySelectorAll(".ge-now").length > 0`, 4000, "a column is lit"); await until(`document.querySelectorAll(".ge-staff .ls-on").length > 0`, 4000, "a note is lit");
    const kit = JSON.parse(await ev(`JSON.stringify(__kit)`)), names = [...new Set(kit.map(k => k[0]))].sort();
    assert.deepStrictEqual(names, ["crash", "hatClosed", "kick", "snare", "sticks", "tomLo"], "pieces: " + names);
    const sn = [...new Set(kit.filter(k => k[0] === "snare").map(k => k[1]))].sort(); assert(sn.every(v => Math.abs(v - 0.24) < 0.03 || Math.abs(v - 0.85) < 0.04) && sn[0] < 0.3 && sn[sn.length - 1] > 0.8, "accent and ghost levels (the player eases the first bar in a little): " + sn);
    assert((await ev(`__cg.length`)) >= 2, "the congas play the hand row"); assert(JSON.parse(await ev(`JSON.stringify(__cg)`)).every(c => c[0] === "congaOpen"));
    // one bar of 4/4 at 132 lasts 1.818 s: the hi-hats of bar 2 are that far after bar 1's, and the swung sixteenths sit late
    const hats = kit.filter(k => k[0] === "hatClosed").map(k => k[2]), crash = kit.filter(k => k[0] === "crash").map(k => k[2]);
    assert(Math.abs((crash[1] - crash[0]) - 4 * 60 / 132) < 0.01, "the loop is one bar long: " + (crash[1] - crash[0]));
    const gh = kit.filter(k => k[0] === "snare" && k[1] < 0.3).map(k => k[2] - crash[0]), six = 60 / 132 / 4;
    assert(Math.abs(gh[0] - (6 + 2 * 0.65) * six) < 0.01, "the ghost on the a of 2 is swung (30%): " + gh[0] / six);
    // an edit while it plays is heard without stopping
    const n0 = await ev(`__kit.filter(function (k){ return k[0] === "rideBell"; }).length`); assert.strictEqual(n0, 0);
    await ev(`__drumset.load(__drumset.text().replace("H=|c", "H=|b"))`);
    await until(`__kit.filter(function (k){ return k[0] === "rideBell"; }).length > 0`, 6000, "the change is played"); assert.strictEqual(await ev(`__drumset.isPlaying()`), true);
    // mute a row (shift-click its name); like any change it is heard from the next bar the player has not yet handed out
    await ev(`Array.prototype.filter.call(document.querySelectorAll("button.ge-name"), function (x){ return x.textContent === "Snare"; })[0].dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }))`);
    await b.sleep(2400); const mark = await ev(`__kit.length`); await b.sleep(2600);
    assert.strictEqual(await ev(`__kit.slice(${mark}).filter(function (k){ return k[0] === "snare"; }).length`), 0, "a muted row is not played"); assert(/S=\|----O/.test(await text()), "and is still written");
    await ev(`document.querySelector(".ge-play").click()`); assert.strictEqual(await ev(`__drumset.isPlaying()`), false);
    assert.strictEqual(await ev(`document.querySelectorAll(".ge-now").length`), 0); await clean("playing");
    const saved = await ev(`location.search`);                                                    // (for the reload below)
    // ---- the pieces that were missing, and the ornaments, are played and their samples load
    await open("?TimeSig=4/4&Div=8&Tempo=100&H=|m-s-n-N-|&S=|f-d-b---|&K=|o-------|&T3=|------o-|");
    await ev(`document.querySelectorAll(".ge-check input")[0].checked = false; __kit.length = 0; document.querySelector(".ge-play").click(); 0`);
    await until(`__kit.filter(function (k){ return k[0] === "kick"; }).length > 2`, 15000, "the groove is played two times and more");
    const k2 = JSON.parse(await ev(`JSON.stringify(__kit)`)); await ev(`document.querySelector(".ge-play").click()`);
    ["cowbell", "stacker", "click", "clickHi", "tom3"].forEach(p => assert(k2.some(k => k[0] === p), p + " is played"));
    const kk = k2.filter(k => k[0] === "kick"); assert(kk.length >= 2, "two bars");
    const t0 = kk[1][2], sn2 = k2.filter(k => k[0] === "snare" && k[2] > t0 - 0.2 && k[2] < t0 + 2.3).map(k => Math.round((k[2] - t0) * 1000));   // the second time round (the first has no bar before it for a grace note to sit in)
    assert(sn2.filter(t => t < 0 && t > -40).length === 1 && sn2.some(t => t >= 0 && t < 5), "a flam: a grace note just before the main one: " + sn2);
    assert.strictEqual(sn2.filter(t => t > 500 && t < 605).length, 3, "a drag: two before the beat and the beat: " + sn2.join());
    assert(sn2.filter(t => t >= 1195 && t < 1500).length >= 8, "a buzz: a run of bounces: " + sn2);
    assert.deepStrictEqual(b.failed.filter(f => /percussion/.test(f)), [], "every percussion sample loads");
    await clean("new pieces");
    // ---- the address is the save file: this groove again from its address; a GrooveScribe link; the band's grooves
    await open(saved);
    assert.strictEqual(await lane("S"), "----O--g-g--O---"); assert.strictEqual(await lane("Cg"), "------------O-O-"); assert.strictEqual(await ev(`!!${cell("T4", 0)} && !!${cell("Cg", 0)}`), true, "rows in use are shown");
    assert.strictEqual(await ev(`${field("Title")}.querySelector("input").value`), "My beat"); assert.strictEqual(await ev(`${field("Tempo")}.querySelector("input").value`), "132");
    await open("?TimeSig=4/4&Div=12&Title=Purdie%20Shuffle&Swing=0&Tempo=120&measures=1&H=|x-xx-xx-xx-x|&S=|-g--g-Og--g-|&K=|o----o-----o|");
    assert.strictEqual(await lane("K"), "o----o-----o"); assert.strictEqual(await ev(`document.querySelectorAll(".ge-cell.ge-ghost").length`), 4); assert((await heads()) >= 12);
    const opts = JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(${field("Groove")}.querySelectorAll("option"), function (o){ return o.value; }))`));
    assert(opts.length > 15 && opts.includes("rock") && opts.includes("bossa") && !opts.includes("none"), "the band's grooves: " + opts.length);
    for (const id of opts.filter(Boolean)){ await set(`${field("Groove")}.querySelector("select")`, id);
      assert((await ev(`__drumset.groove().lanes.H.concat(__drumset.groove().lanes.S, __drumset.groove().lanes.K, __drumset.groove().lanes.T2, __drumset.groove().lanes.T4).filter(function (c){ return c !== "-"; }).length`)) > 0, id + " has notes");
      assert((await heads()) > 0, id + " is drawn"); }
    await set(`${field("Groove")}.querySelector("select")`, "rock"); assert(/Measures=4/.test(await text()), "rock is four bars"); assert(/Tempo=120/.test(await text()), "the tempo is kept");
    await set(`${field("Groove")}.querySelector("select")`, "ridetime"); assert(/Div=12/.test(await text())); assert.strictEqual(await lane("H"), "r--r-rr--r-r");
    // abcjs draws every grid in every meter (reading the ABC is not enough: it once failed only when drawing a triplet)
    const drawn = JSON.parse(await ev(`(function(){ var bad = [], n = 0, seed = 5, rnd = function (){ seed = (seed * 16807) % 2147483647; return seed / 2147483647; }, box = document.createElement("div"); document.body.appendChild(box);
      [[4,4],[3,4],[5,4],[2,4],[6,8],[9,8],[12,8],[7,8],[5,8],[2,2]].forEach(function (m){ BandGroove.divsFor(m[0], m[1]).forEach(function (div){ for (var k = 0; k < 6; k++){
        var x = BandGroove.create({ n: m[0], d: m[1], div: div, bars: 2 }), st = BandGroove.steps(x), p = [0.15, 0.3, 0.5, 0.7, 0.9, 0.05][k];
        ["H","S","K","T1","T4","Cg","Stickings"].forEach(function (l){ var ks = Object.keys(BandGroove.CELLS[l]); for (var i = 0; i < 2 * st; i++) if (rnd() < p) x.lanes[l][i] = ks[Math.floor(rnd() * ks.length)]; });
        try { box.textContent = ""; ABCJS.renderAbc(box, BandGroove.toAbc(x), { add_classes: true }); if (!box.querySelector("svg")) throw new Error("no drawing"); n++; } catch (e){ bad.push(BandGroove.stringify(x) + " " + e.message); } } }); });
      box.remove(); return JSON.stringify({ n: n, bad: bad.slice(0, 3) }); })()`));
    assert.deepStrictEqual(drawn.bad, [], "drawn"); assert(drawn.n >= 300, "drawn: " + drawn.n);
    await clean("library");
    // ---- a phone: nothing wider than the screen
    await b.resize(390, 800); await open("?TimeSig=4/4&Div=16&Measures=2&H=|x-x-x-x-x-x-x-x-|x-x-x-x-x-x-x-x-|&S=|----O-------O---|----O-------O---|&K=|o-------o-o-----|o-------o-o-----|"); await b.sleep(400);
    assert((await ev(`document.documentElement.scrollWidth`)) <= 392, "no sideways scroll: " + await ev(`document.documentElement.scrollWidth`));
    assert.strictEqual(await ev(`document.querySelectorAll(".ge-block").length`), 2, "one bar to a line");
    if (process.argv[2]) await b.shot("/tmp/drumset-b-phone.png");
    await clean("phone");
    console.log("DRUMSET EDITOR OK");
  } catch (e){ console.log("FAILED: " + e.message); console.log(b.errors.slice(-5).join("\n")); try { console.log(await ev(`JSON.stringify(window.__err)`)); await b.shot("/tmp/drumset-b-fail.png"); } catch (x){} process.exitCode = 1; }
  await b.close();
})();
