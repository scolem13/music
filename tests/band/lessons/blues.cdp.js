// The blues lesson (lessons/blues-changes.qmd): every chart draws with numerals, the band plays a chart and lights its bars,
// the key follows the strip at the bottom, the builder rewrites its chart (also while playing) and the ear test asks and marks.
// Run from tests/band/lead with the test server on port 8500 (render lessons/blues-changes.qmd into the test site first).
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1200 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const until = async (x, ms, what) => { const t = Date.now(); while (Date.now() - t < ms){ if (await ev(x)) return; await b.sleep(150); } throw new Error("timed out: " + what); };
  const bars = sel => ev(`Array.prototype.map.call(document.querySelectorAll('${sel} .tc-bar'), function(x){ return Array.prototype.map.call(x.querySelectorAll(".tc-lt"), function(c){ return c.textContent; }).join(" "); }).join("|")`);
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/lessons/blues-changes.html"); await b.sleep(1500);
    await ev(`window.__err = []; window.addEventListener("error", function(e){ __err.push(e.message); }); 0`);
    // seven numbered charts and the builder's, twelve bars each, numerals under the letters
    assert.strictEqual(await ev(`document.querySelectorAll(".bl-step .tune-chart").length`), 8);
    assert.strictEqual(await ev(`Array.prototype.every.call(document.querySelectorAll(".bl-widget .tune-chart"), function(c){ return c.querySelectorAll(".tc-bar").length === 12; })`), true);
    assert.strictEqual(await ev(`Array.prototype.map.call(document.querySelectorAll('[data-step="approach"] .tc-rn'), function(x){ return x.textContent; }).join(" ")`),
      "I7 IV7 I7 v7 I7 IV7 ♯iv°7 I7 iii7 VI7 ii7 V7 I7 VI7 ii7 V7");
    assert.strictEqual(await ev(`Array.prototype.map.call(document.querySelectorAll('[data-step="quick"] .tc-bar'), function(x, i){ return x.classList.contains("bl-new") ? i + 1 : 0; }).filter(Boolean).join(" ")`), "2 12");
    // the key: every chart moves, sharp keys are spelled with sharps
    assert.strictEqual(await bars('[data-step="basic"]'), "F7|F7|F7|F7|B♭7|B♭7|F7|F7|C7|B♭7|F7|F7");
    await ev(`var k = document.getElementById("bl-key"); k.value = 7; k.dispatchEvent(new Event("change")); 0`);
    assert.strictEqual(await bars('[data-step="basic"]'), "G7|G7|G7|G7|C7|C7|G7|G7|D7|C7|G7|G7");
    assert((await bars('[data-step="approach"]')).indexOf("C♯dim7") > 0, await bars('[data-step="approach"]'));
    assert.strictEqual(await ev(`document.querySelectorAll('[data-step="quick"] .tc-bar.bl-new').length`), 2);
    // play: the button turns to Stop, bars light in order, Stop clears
    await ev(`document.getElementById("bl-tempo-n").value = 220; document.getElementById("bl-tempo-n").dispatchEvent(new Event("change")); document.querySelector('[data-step="jazz"] .btn-primary').click(); 0`);
    await until(`!!document.querySelector('[data-step="jazz"] .tc-bar.tc-live')`, 25000, "a live bar");
    assert.strictEqual(await ev(`document.querySelector('[data-step="jazz"] .btn-primary').textContent`), "■ Stop");
    const seen = new Set(), t0 = Date.now();
    while (Date.now() - t0 < 6000){ seen.add(await ev(`(function(){ var a = document.querySelectorAll('[data-step="jazz"] .tc-bar'); for (var i = 0; i < a.length; i++) if (a[i].classList.contains("tc-live")) return i; return -1; })()`)); await b.sleep(120); }
    assert(seen.size >= 4, "bars lit: " + [...seen]); assert(/^Bar \d+, chorus [12] of 2$/.test(await ev(`document.getElementById("bl-status").textContent`)), await ev(`document.getElementById("bl-status").textContent`));
    // a loop of bars 8 to 12: only those light
    await ev(`document.querySelectorAll('[data-step="jazz"] .bl-tools .btn')[2].click(); 0`);
    assert.strictEqual(await ev(`document.querySelector('[data-step="jazz"] .btn-primary').textContent`), "▶ Play");
    await until(`!!document.querySelector('[data-step="jazz"] .tc-bar.tc-live')`, 10000, "a live bar in the loop");
    const lp = new Set(), t1 = Date.now();
    while (Date.now() - t1 < 7000){ lp.add(await ev(`(function(){ var a = document.querySelectorAll('[data-step="jazz"] .tc-bar'); for (var i = 0; i < a.length; i++) if (a[i].classList.contains("tc-live")) return i; return -1; })()`)); await b.sleep(100); }
    lp.delete(-1); assert([...lp].every(i => i >= 7), "loop bars: " + [...lp]); assert(lp.size >= 4, "loop bars: " + [...lp]);
    await ev(`document.getElementById("bl-stop").click(); 0`);
    assert.strictEqual(await ev(`document.querySelectorAll(".tc-live").length + document.querySelectorAll(".bl-on").length`), 0);
    // the builder: a menu rewrites the chart and shades the pair; while playing the band gets the new chart
    await ev(`var k = document.getElementById("bl-key"); k.value = 5; k.dispatchEvent(new Event("change")); 0`);
    await ev(`var s = document.getElementById("bl-slot-4"); s.value = 2; s.dispatchEvent(new Event("change")); 0`);
    assert.strictEqual(await bars("#bl-builder"), "F7|F7|F7|F7|B♭7|B♭7|F7|F7|Gm7|C7|F7|F7");
    assert.strictEqual(await ev(`Array.prototype.map.call(document.querySelectorAll('#bl-builder .tc-bar'), function(x, i){ return x.classList.contains("bl-new") ? i + 1 : 0; }).filter(Boolean).join(" ")`), "9 10");
    await ev(`document.querySelector('#bl-builder .btn-primary').click(); 0`);
    await until(`!!document.querySelector('#bl-builder .tc-bar.tc-live')`, 10000, "the builder playing");
    await ev(`var s = document.getElementById("bl-slot-5"); s.value = 3; s.dispatchEvent(new Event("change")); 0`);
    assert.strictEqual((await bars("#bl-builder")).split("|").slice(10).join("|"), "F7 A♭7|D♭7 G♭7");
    await until(`!!document.querySelector('#bl-builder .tc-bar.tc-live')`, 5000, "still playing after a change");
    for (const v of ["doowop", "boogaloo"]){ await ev(`var s = document.getElementById("bl-feel"); s.value = "${v}"; s.dispatchEvent(new Event("change")); 0`); await b.sleep(1200); }
    assert.strictEqual(await ev(`document.getElementById("bl-tempo-n").value`), "116");
    for (const v of ["guitar", "organ"]){ await ev(`var s = document.getElementById("bl-inst"); s.value = "${v}"; s.dispatchEvent(new Event("change")); 0`); await b.sleep(1500); }
    await until(`!!document.querySelector('#bl-builder .tc-bar.tc-live')`, 5000, "still playing after feel and instrument changes");
    // the ear test: a question starts the band, marks two bars, and an answer is marked and the chart shown
    await ev(`document.querySelector('#bl-quiz .btn-primary').click(); 0`);
    assert.strictEqual(await ev(`document.querySelectorAll("#bl-quiz .bl-count .bl-ask").length`), 2);
    assert(await ev(`document.querySelectorAll("#bl-quiz .bl-answers button").length`) >= 2);
    await until(`!!document.querySelector("#bl-quiz .bl-count .bl-live")`, 10000, "the counter");
    await ev(`document.querySelector("#bl-quiz .bl-answers button").click(); 0`);
    assert.strictEqual(await ev(`document.querySelectorAll("#bl-quiz .bl-answers .bl-right").length`), 1);
    assert(/^[01] right out of 1$/.test(await ev(`document.querySelector("#bl-quiz .bl-score").textContent`)));
    assert.strictEqual(await ev(`document.querySelectorAll("#bl-quiz .tune-chart .tc-bar.bl-new").length`), 2);
    await ev(`document.getElementById("bl-stop").click(); 0`);
    assert.deepStrictEqual(await ev(`window.__err`), []); assert.deepStrictEqual(b.errors.filter(e => !/supabase/i.test(e)), []);   // (the test site has no Supabase address)
    if (process.env.SHOT) await b.shot(process.env.SHOT);
    console.log("BLUES LESSON OK");
  } catch (e) { console.error("FAIL", e.message, b.errors.slice(0, 5), b.failed.slice(0, 5)); process.exitCode = 1; }
  finally { await b.close(); }
})();
