// The Backing Track page: an intro of chosen bars, and a break between repeats (click, or bars of the band's).
// Needs the test site on port 8500 (tests/band/README.md).
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1000 });
  const set = (id, v, ev = "change") => b.eval(`(function(){ var e = document.getElementById(${JSON.stringify(id)}); if (e.type === "checkbox") e.checked = ${JSON.stringify(v)}; else e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event(${JSON.stringify(ev)}, { bubbles: true })); })()`);
  const st = () => b.eval(`document.getElementById("bt-status").textContent`);
  const collect = async (ms) => { const seen = []; const t = Date.now() + ms; while (Date.now() < t) { const s = await st(); if (s && seen[seen.length - 1] !== s) seen.push(s); await b.sleep(15); } return seen; };
  const play = () => b.eval(`document.getElementById("bt-play").click()`);
  const hidden = id => b.eval(`document.getElementById(${JSON.stringify(id)}).hidden`);
  try { await b.goto("http://127.0.0.1:8500/tools/backing-track.html"); await b.sleep(900);
    await set("bt-tempo", 280, "input"); await set("bt-countin", 0);
    // the controls show what their kind needs
    assert.strictEqual(await hidden("bt-intro-more"), true); assert.strictEqual(await hidden("bt-gap-more"), true);
    await set("bt-intro", "bars");
    assert.strictEqual(await hidden("bt-intro-more"), false); assert.strictEqual(await hidden("bt-intro-range"), false); assert.strictEqual(await hidden("bt-intro-bars"), true);
    assert.strictEqual(await b.eval(`document.getElementById("bt-intro-label").textContent`), "Intro bars");
    await set("bt-intro-range", "5-6");
    await play(); await b.sleep(100);
    let seen = await collect(2500); console.log("intro 5-6:", seen.slice(0, 5).join(" | "));
    assert(/^Intro · bar 1 of 2/.test(seen.find(s => /Intro/.test(s)) || ""), "an intro of two bars"); assert(seen.some(s => /Chorus 1 · bar 1/.test(s)), "then the top");
    await play(); await b.sleep(300);
    await set("bt-intro", "none");
    // a loop of bars 1-2 with one bar of click between passes
    await set("bt-cyc-on", true); await set("bt-cyc-from", 1); await set("bt-cyc-to", 2);
    await set("bt-gap", "click"); await set("bt-gap-bars", 1);
    assert.strictEqual(await hidden("bt-gap-more"), false); assert.strictEqual(await hidden("bt-gap-range"), true);
    await play(); await b.sleep(100);
    seen = await collect(4500); console.log("loop + click:", seen.slice(0, 8).join(" | "));
    const order = seen.map(s => /click/.test(s) ? "c" : (/bar (\d+)/.exec(s) || [])[1]).join("");
    assert(/12c12c/.test(order), "bars 1 2, a click, bars 1 2, a click: " + order);
    // changed while playing: the band's own bars instead (bars 7-8 of the form)
    await set("bt-gap", "bars"); await set("bt-gap-range", "7-8");
    assert.strictEqual(await hidden("bt-gap-range"), false);
    await b.sleep(1500); seen = await collect(4500); console.log("loop + bars 7-8:", seen.slice(0, 8).join(" | "));
    assert(seen.some(s => /^Between repeats · bar 2 of 2/.test(s)), "two bars between repeats");
    await play(); await b.sleep(300);
    assert.deepStrictEqual(b.errors.filter(e => !/supabase/i.test(e)), [], "no page errors");      // (the test site has no Supabase keys)
    console.log("BETWEEN PAGE OK");
  } catch (e) { console.log("FAILED:", e.message); console.log(b.errors.join("\n")); process.exitCode = 1; }
  finally { await b.close(); }
})();
