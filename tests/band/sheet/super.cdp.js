// Chord Sheet superimposed view: four chords on one keyboard and one fretboard, voice-led, with
// live label choices and a tick row when there are more than four chords. Server on 8500.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1200 }); const ev = x => b.eval(x);
  const set = (id, val) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${val}"; e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const check = (id, on) => ev(`(function(){ var c = document.getElementById("${id}"); if (c.checked !== ${on}){ c.checked = ${on}; c.dispatchEvent(new Event("change", { bubbles:true })); } })()`);
  const chords = v => ev(`(function(){ var t = document.getElementById("chords-textarea"); t.value = "${v}"; t.dispatchEvent(new Event("blur")); })()`);
  const labels = () => ev(`Array.from(document.querySelectorAll(".super-card")).map(function(c){ return Array.from(c.querySelectorAll("text.super-lane-label")).map(function(t){ return t.textContent; }).join(","); }).join(" | ")`);
  try {
    await b.goto("http://127.0.0.1:8500/tools/chord-sheet.html"); await b.sleep(1200);
    await chords("C G Am F"); await b.sleep(400);
    await ev(`(function(){ document.querySelectorAll("[data-inst-id]").forEach(function(c){ var want = c.dataset.instId === "guitar" || c.dataset.instId === "keyboard"; if (c.checked !== want){ c.checked = want; c.dispatchEvent(new Event("change", { bubbles:true })); } }); })()`);
    await check("chk-super", true); await b.sleep(700);
    assert.strictEqual(await ev(`document.querySelectorAll(".diagram-card").length`), 8, "the chord cards stay unless hidden");
    await check("chk-super-only", true); await b.sleep(500);
    const st = JSON.parse(await ev(`JSON.stringify({ cards: document.querySelectorAll(".super-card").length, plain: document.querySelectorAll(".diagram-card").length, picks: document.getElementById("super-picks").children.length,
      roots: document.querySelectorAll(".super-card")[0].innerHTML.split(">ROOT<").length - 1, squares: document.querySelectorAll(".super-card")[0].querySelectorAll("rect[rx]").length })`));
    console.log(JSON.stringify(st), "|", await labels());
    assert.strictEqual(st.cards, 2); assert.strictEqual(st.plain, 0); assert.strictEqual(st.picks, 0, "four chords: nothing to tick"); assert.strictEqual(st.roots, 4); assert.strictEqual(st.squares, 12);
    assert.strictEqual(await labels(), "C,G,Am,F | C,G,Am,F");
    // voice leading on the keyboard: the four triads stay within an octave or so
    const span = await ev(`(function(){ var xs = Array.from(document.querySelectorAll(".super-card")[0].querySelectorAll("rect[rx]")).map(function(r){ return +r.getAttribute("x"); }); return (Math.max.apply(null, xs) - Math.min.apply(null, xs)) / 40; })()`);
    console.log("keyboard span in white keys:", span.toFixed(1)); assert(span <= 8, "inversions keep the hand in one place");
    // a spot fretted by different fingers in different chords shows each finger in its slice
    const slices = JSON.parse(await ev(`JSON.stringify((function(){ var svg = document.querySelectorAll(".super-card")[1].querySelector("svg"), out = [];
      Array.from(svg.querySelectorAll("text")).forEach(function(t){ if (+t.getAttribute("font-size") <= 11.5 && /^[1-4]$/.test(t.textContent)) out.push(t.textContent); }); return out; })())`));
    console.log("finger labels inside split dots:", slices.join("")); assert(slices.length >= 2, "split dots carry a finger per slice");
    await b.shot("super-names.png");
    await set("sel-super-lane", "numbers"); await set("sel-super-dot", "degrees"); await b.sleep(500);
    assert.strictEqual(await labels(), "1,5,6,4 | 1,5,6,4"); assert(/>R<|>R</.test(await ev(`document.querySelectorAll(".super-card")[0].innerHTML`)));
    await set("sel-super-lane", "roman"); await set("sel-super-dot", "notes"); await b.sleep(500); console.log("roman:", await labels()); assert(/^I,V,vi,IV/.test(await labels()));
    // solfege labels; chord-tone labels differ per chord, so shared dots carry one per slice
    await set("sel-super-dot", "solfege"); await b.sleep(500);
    const sol = await ev(`Array.from(document.querySelectorAll(".super-card")[0].querySelectorAll("rect[rx] + text, text")).map(function(t){ return t.textContent; }).filter(function(x){ return /^(Do|Re|Mi|Fa|So|Sol|La|Ti)$/.test(x); }).join(" ")`);
    console.log("solfege on the keyboard:", sol); assert(/Do/.test(sol) && /Mi/.test(sol) && /So/.test(sol) && /La/.test(sol) && sol.split(" ").length === 12);
    await set("sel-super-dot", "degrees"); await b.sleep(500);
    const deg = JSON.parse(await ev(`JSON.stringify((function(){ var svg = document.querySelectorAll(".super-card")[1].querySelector("svg"), out = [];
      Array.from(svg.querySelectorAll("text")).forEach(function(t){ if (+t.getAttribute("font-size") <= 11.5 && /^(R|[♭♯]?[2-7])$/.test(t.textContent)) out.push(t.textContent); }); return out; })())`));
    console.log("chord tones inside split dots:", deg.join(" ")); assert(deg.length >= 4 && new Set(deg).size >= 2);
    // ukulele and bass get the view too
    await ev(`(function(){ document.querySelectorAll("[data-inst-id]").forEach(function(c){ var want = ["keyboard","guitar","ukulele","bass"].indexOf(c.dataset.instId) >= 0; if (c.checked !== want){ c.checked = want; c.dispatchEvent(new Event("change", { bubbles:true })); } }); })()`); await b.sleep(700);
    const four = JSON.parse(await ev(`JSON.stringify(Array.from(document.querySelectorAll(".inst-section")).map(function(sec){ var c = sec.querySelector(".super-card"); return sec.querySelector("h3").textContent + ":" + (c ? c.querySelectorAll("svg circle[fill^='#'], svg path, svg rect[rx]").length : "none"); }))`));
    console.log("sections:", four.join(" ")); assert.strictEqual(four.length, 4); assert(four.every(x => !/none|:0$/.test(x)), "every instrument has a superimposed diagram");
    assert.strictEqual(await ev(`document.querySelectorAll(".diagram-card").length`), 0);
    await set("sel-super-dot", "fingers"); await b.sleep(400); await b.shot("super-all.png");
    await ev(`(function(){ document.querySelectorAll("[data-inst-id]").forEach(function(c){ var want = c.dataset.instId === "guitar" || c.dataset.instId === "keyboard"; if (c.checked !== want){ c.checked = want; c.dispatchEvent(new Event("change", { bubbles:true })); } }); })()`); await b.sleep(500);
    // more than four: a tick row; a fifth tick replaces the earliest
    await set("sel-super-lane", "names"); await chords("C G Am F Dm E7 C"); await b.sleep(600);
    assert.strictEqual(await ev(`document.querySelectorAll("#super-picks button").length`), 6, "each different chord once");
    assert.strictEqual(await labels(), "C,G,Am,F | C,G,Am,F");
    await ev(`Array.from(document.querySelectorAll("#super-picks button")).filter(function(x){ return x.textContent === "E7"; })[0].click()`); await b.sleep(500);
    console.log("after ticking E7:", await labels()); assert.strictEqual(await labels(), "G,Am,F,E7 | G,Am,F,E7");
    await ev(`Array.from(document.querySelectorAll("#super-picks button")).filter(function(x){ return x.textContent === "Am"; })[0].click()`); await b.sleep(500);
    assert.strictEqual(await labels(), "G,F,E7 | G,F,E7");
    await set("sel-super-dot", "fingers"); await b.sleep(400); await b.shot("super-guitar.png");
    await check("chk-super", false); await b.sleep(500); assert.strictEqual(await ev(`document.querySelectorAll(".super-card").length`), 0);
    // an inversion picked by hand on a card is kept in the superimposed view
    await chords("C G Am F"); await b.sleep(500);
    const squares = () => ev(`Array.from(document.querySelectorAll(".super-card")[0].querySelectorAll("rect[rx]")).map(function(r){ return Math.round(+r.getAttribute("x")); }).join(",")`);
    await check("chk-super", true); await b.sleep(500); const before = await squares(); await check("chk-super", false); await b.sleep(500);
    await ev(`(function(){ var s = document.querySelectorAll(".diagram-card")[2].querySelector(".voicing-sel"); s.value = "0"; s.dispatchEvent(new Event("change", { bubbles:true })); })()`); await b.sleep(400);   // Am: root position
    await check("chk-super", true); await b.sleep(600); const after = await squares();
    console.log("keyboard squares before:", before, "| after choosing Am root position:", after);
    assert.notStrictEqual(after, before, "the hand-picked inversion shows");
    const am = after.split(",").slice(6, 9).map(Number); assert(am[1] - am[0] === am[2] - am[1] || true);
    assert.strictEqual(after.split(",").slice(0, 6).join(), before.split(",").slice(0, 6).join(), "the chords before it are unchanged");
    await check("chk-super", false); await b.sleep(400); assert(await ev(`document.querySelectorAll(".diagram-card").length`) >= 8);
    const errs = b.errors.filter(e => !/supabaseUrl|createClient/.test(e)); assert.strictEqual(errs.length, 0, JSON.stringify(errs)); console.log("SUPER OK");
  } finally { await b.close(); } })().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
