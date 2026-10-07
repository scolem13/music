// Real round trip between the two rendered pages: Chord Sheet -> band (pins) -> Chord Sheet (as played).
const { launch } = require("./cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1000 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(5000).then(() => { throw new Error("eval timed out"); })]);
  const waitFor = async (expr, ms, what) => { const t = Date.now(); for (;;) { try { if (await ev(expr)) return; } catch (e) {} if (Date.now() - t > ms) throw new Error("timeout " + what); await b.sleep(100); } };
  try {
    await b.goto(B + "/tools/chord-sheet.html"); await b.sleep(1200);
    await ev(`(function(){ var t = document.getElementById("chords-textarea"); t.value = "Dm7 G7 Cmaj7 A7"; t.dispatchEvent(new Event("blur")); })()`);
    await b.sleep(800);
    // intercept the navigation: read what was written, then go there ourselves
    await ev(`setTimeout(function(){ document.getElementById("btn-band").click(); }, 50); 1`);
    await waitFor(`location.pathname.indexOf("backing-track") >= 0 && !!document.getElementById("bt-play")`, 15000, "arrive at backing track");
    await b.sleep(1200);
    const note = await ev(`(document.getElementById("bt-pinnote-text") || {}).textContent || ""`);
    const chart = await ev(`Array.from(document.querySelectorAll('#bt-chart .tc-bar[data-bar]')).map(function(c){ return c.textContent.trim(); }).join(" | ")`);
    console.log("pin note:", note); console.log("chart:", chart, "| comp:", await ev(`document.getElementById("bt-comp").value`), "| voicing:", await ev(`document.getElementById("bt-voicing").value`), "| changes:", await ev(`document.getElementById("bt-changes").value`));
    assert(/pinned/i.test(note), "pins announced"); assert(/Dm7.*G7.*Cmaj7.*A7/.test(chart.replace(/\s/g, "")), "progression loaded");
    await ev(`document.getElementById("bt-tempo").value = 280; document.getElementById("bt-tempo").dispatchEvent(new Event("input", { bubbles:true })); document.getElementById("bt-countin").value = "0"; document.getElementById("bt-countin").dispatchEvent(new Event("change", { bubbles:true }));`);
    await ev(`document.getElementById("bt-play").click()`);
    await waitFor(`/Chorus 3/.test(document.getElementById("bt-status").textContent)`, 40000, "two choruses played");
    await ev(`document.getElementById("bt-play").click()`); await b.sleep(300);
    // back to the Chord Sheet with what was played (same tab: make window.open navigate here)
    await ev(`window.open = function(u){ setTimeout(function(){ location.href = u; }, 50); return window; }; Array.from(document.querySelectorAll("#bt-root button")).filter(function(x){ return /Chord Sheet/.test(x.textContent); })[0].click()`);
    await waitFor(`location.pathname.indexOf("chord-sheet") >= 0 && document.readyState === "complete"`, 15000, "arrive at chord sheet");
    await b.sleep(1800);
    const txt = await ev(`document.getElementById("chords-textarea").value`), body = await ev(`document.body.innerText`);
    console.log("sheet progression:", txt, "| 'As played' shown:", /as played/i.test(body));
    assert(/Dm7\s+G7\s+Cmaj7\s+A7/.test(txt), "progression came back"); assert(/as played/i.test(body), "as-played view");
    await b.shot("roundtrip-sheet.png");
    const errs = b.errors.filter(e => !/supabaseUrl|createClient/.test(e)); console.log("errors:", JSON.stringify(errs)); assert.strictEqual(errs.length, 0);
    console.log("ROUND TRIP OK");
  } finally { await b.close(); } })().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
