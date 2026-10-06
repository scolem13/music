const { launch } = require("./cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1000 }); const U = "http://127.0.0.1:8500/tools/backing-track.html";
  const v = id => b.eval(`document.getElementById("${id}").value`);
  const set = (id, val) => b.eval(`(function(){ var e = document.getElementById("${id}"); e.value = "${val}"; e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const cells = () => b.eval(`Array.from(document.querySelectorAll('#bt-chart .tc-bar[data-bar]')).map(function(c){ return c.textContent.trim(); }).join(" | ")`);
  try { await b.goto(U); await b.sleep(900);
    console.log("bass:", await b.eval(`Array.from(document.getElementById("bt-bass").options).map(function(o){return o.textContent}).join(", ")`));
    console.log("rhythm:", await b.eval(`Array.from(document.getElementById("bt-rhythm").options).map(function(o){return o.textContent}).join(", ")`));
    await set("bt-roman", "only"); console.log("roman basic:", await cells()); assert(/^I7 \| I7/.test(await cells()));
    await set("bt-changes", "jazz"); const jz = await cells(); console.log("roman jazz:", jz); assert(/♯iv°7/.test(jz) && /ii7/.test(jz) && !/V\/IV/.test(jz));
    await set("bt-chartfor", await b.eval(`document.getElementById("bt-chartfor").options[2].value`)); assert.strictEqual(await cells(), jz, "numerals unchanged by instrument view");
    await set("bt-roman", "both"); await b.shot("roman-both.png"); await set("bt-roman", "off"); await set("bt-chartfor", await b.eval(`document.getElementById("bt-chartfor").options[0].value`));
    await set("bt-feel", "straight"); assert.strictEqual(await v("bt-bass"), "riff"); await set("bt-feel", "swing"); assert.strictEqual(await v("bt-bass"), "walk");
    // every rhythm plays without errors
    await b.eval(`document.getElementById("bt-play").click()`); await b.sleep(2500);
    for (const r of ["charleston", "reverse", "garland", "offbeats", "pad", "four", "stabs", "auto"]) { await set("bt-rhythm", r); await b.sleep(900); }
    await set("bt-bass", "riff"); await b.sleep(900); assert.strictEqual(await b.eval(`document.getElementById("bt-play").getAttribute("data-state")`), "playing");
    // as-played hand-off lists each different chord once (12-bar jazz blues has 9 different symbols)
    await b.eval(`window.open = function(){ return window; }; Array.from(document.querySelectorAll("#bt-root button")).filter(function(x){ return /Chord Sheet/.test(x.textContent); })[0].click()`);
    const syms = await b.eval(`window.__btLastHandoff.chords.map(function(c){ return c.sym; }).join(" ")`); console.log("handoff chords:", syms);
    assert.strictEqual(new Set(syms.split(" ")).size, syms.split(" ").length); assert.strictEqual(syms.split(" ").length, 8);
    await b.eval(`document.getElementById("bt-play").click()`);
    // links from the styles page
    await b.goto(U + "?rhythm=garland&feel=swing&comp=guitar"); await b.sleep(900);
    assert.deepStrictEqual([await v("bt-rhythm"), await v("bt-comp")], ["garland", "guitar"]);
    await b.goto(U + "?bass=riff"); await b.sleep(900); assert.deepStrictEqual([await v("bt-bass"), await v("bt-feel")], ["riff", "straight"]);
    const errs = b.errors.filter(e => !/supabaseUrl/.test(e)); console.log("errors:", JSON.stringify(errs)); assert.strictEqual(errs.length, 0); console.log("OPTS OK");
  } finally { await b.close(); } })().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
