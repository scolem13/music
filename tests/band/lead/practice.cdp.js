const { launch } = require("./cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1000 });
  const set = (id, v, ev = "change") => b.eval(`(function(){ var e = document.getElementById(${JSON.stringify(id)}); if (e.type === "checkbox") e.checked = ${JSON.stringify(v)}; else e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event(${JSON.stringify(ev)}, { bubbles:true })); })()`);
  const st = () => b.eval(`document.getElementById("bt-status").textContent`);
  const collect = async (ms) => { const seen = []; const t = Date.now() + ms; while (Date.now() < t) { const s = await st() + " @" + await b.eval(`document.getElementById("bt-tempo-n").value`); if (seen[seen.length - 1] !== s) seen.push(s); await b.sleep(30); } return seen; };
  try { await b.goto("http://127.0.0.1:8500/tools/backing-track.html"); await b.sleep(800);
    await set("bt-tempo", 280, "input"); await set("bt-countin", 0);
    // start at bar 9 by clicking the chart
    await b.eval(`document.querySelector('#bt-chart .tc-bar[data-bar="8"]').click()`);
    assert.strictEqual(await b.eval(`document.getElementById("bt-start").value`), "9");
    assert.strictEqual(await b.eval(`document.querySelectorAll('#bt-chart .bt-start').length`), 1);
    await b.eval(`document.getElementById("bt-play").click()`); await b.sleep(150);
    let seen = await collect(7000); console.log("start@9:", seen.join(" | "));
    assert(/bar 9 /.test(seen.find(s => /Chorus/.test(s))), "starts at bar 9"); assert(seen.some(s => /Chorus 2 · bar 1 /.test(s)), "wraps to bar 1");
    await b.eval(`document.getElementById("bt-play").click()`); await b.sleep(300);
    // cycle 5-6 with +8 / -3 tempo steps
    await set("bt-cyc-on", true); await set("bt-cyc-to", 8); await set("bt-cyc-from", 5);
    await b.eval(`document.querySelector('#bt-chart .tc-bar[data-bar="5"]').click()`);
    assert.strictEqual(await b.eval(`document.getElementById("bt-cyc-to").value`), "6");
    assert.strictEqual(await b.eval(`document.querySelectorAll('#bt-chart .bt-cyc').length`), 2);
    await set("bt-step-on", true); await set("bt-step-a", 8); await set("bt-step-b", -3);
    await b.shot("practice.png");
    await b.eval(`document.getElementById("bt-play").click()`); await b.sleep(1200);
    seen = await collect(6000); console.log("cycle 5-6:", seen.join(" | "));
    const bars = new Set(seen.map(s => (/bar (\d+)/.exec(s) || [])[1]).filter(Boolean)); assert.deepStrictEqual([...bars].sort(), ["5", "6"]);
    const tempos = [...new Set(seen.map(s => +s.split("@")[1]))]; console.log("tempos:", tempos.join(","));
    assert(tempos.includes(288) && tempos.includes(285) && tempos.includes(293), "steps +8 -3 +8");
    // key change redraw keeps marks; stop restores tempo
    await set("bt-key", "Bb"); await b.sleep(200); assert.strictEqual(await b.eval(`document.querySelectorAll('#bt-chart .bt-cyc').length`), 2);
    await b.eval(`document.getElementById("bt-play").click()`); await b.sleep(300);
    assert.strictEqual(await b.eval(`document.getElementById("bt-tempo-n").value`), "280");
    const errs = b.errors.filter(e => !/supabaseUrl|createClient/.test(e)); console.log("errors:", JSON.stringify(errs)); assert.strictEqual(errs.length, 0);
    console.log("PRACTICE OK");
  } finally { await b.close(); } })().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
