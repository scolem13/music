// "What did I mean?": the panel on the Notation Rules page and on Chord Entry. Run from tests/band/lead, server on 8500:
//   node ../entry/dwim.cdp.js        ("DWIM UI OK")
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1800 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const val = id => ev(`document.getElementById("${id}").value`), text = id => ev(`document.getElementById("${id}").textContent`);
  const set = (id, v) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${v}"; e.dispatchEvent(new Event("input", { bubbles:true })); e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const click = id => ev(`document.getElementById("${id}").click(); 0`);
  const errs = () => b.errors.filter(e => !/supabase/i.test(e));
  const until = async (fn, ms, what) => { const t = Date.now(); let s; while (Date.now() - t < ms){ s = await fn(); if (s) return s; await b.sleep(30); } throw new Error("never: " + what); };
  const cards = host => ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll("#${host} .md-card"), function(c){ return { head: c.querySelector(".md-head").textContent, best: c.classList.contains("is-best"), svg: !!c.querySelector("svg"), use: !!c.querySelector("button") }; }))`).then(JSON.parse);
  const useBest = host => ev(`(function(){ var c = document.querySelector("#${host} .md-card.is-best button"); if (!c) return false; c.click(); return true; })()`);
  try {
    // ---- the Rules page: eighth notes with eighth rests offer staccato quarters; using it changes the take's reading ----
    await b.goto(B + "/tools/notation-rules.html"); await b.sleep(1200);
    const ids = JSON.parse(await ev(`JSON.stringify(__nr.presets.map(function(p){ return p.id; }))`));
    await set("nr-preset", String(ids.indexOf("detached"))); await set("nr-det", "rest");
    assert.strictEqual((await text("nr-abc")).split("\n").slice(5).join(" "), "C z D z E z F z | G z A z B z c z |]");
    await ev(`__nr.dwim().setRange(0, 1); document.querySelector("#nr-dwim .md-btn.is-main").click(); 0`); await b.sleep(400);
    let cs = await cards("nr-dwim"); assert(cs.length >= 2, "there are cards: " + JSON.stringify(cs)); assert(cs[0].head === "As first written" && cs[0].svg, "the first card is the current reading, drawn");
    const best = cs.filter(c => c.best); assert.strictEqual(best.length, 1, "one suggestion"); assert(/staccato/i.test(best[0].head), "the staccato reading is suggested: " + best[0].head); assert(best[0].svg && best[0].use);
    assert.strictEqual(await useBest("nr-dwim"), true); await b.sleep(300);
    assert.strictEqual(await val("nr-det"), "staccato"); assert.strictEqual((await text("nr-abc")).split("\n").slice(5).join(" "), ".C2 .D2 .E2 .F2 | .G2 .A2 .B2 .c2 |]");
    // clicking a note in the notation picks its bar; the picked bars are marked
    await ev(`__nr.dwim().pick("abcjs-n3 abcjs-mm1", false); 0`); assert.strictEqual(await val("nr-preset") !== "", true);
    assert.strictEqual(await ev(`JSON.stringify(__nr.dwim().range())`), '{"from":1,"to":1}'); assert(await ev(`document.querySelectorAll("#nr-score .md-selected").length > 0`), "the picked bar is marked");
    await ev(`__nr.dwim().pick("abcjs-mm0", true); 0`); assert.strictEqual(await ev(`JSON.stringify(__nr.dwim().range())`), '{"from":0,"to":1}', "shift extends");
    // chords have nothing to re-read
    await set("nr-preset", String(ids.indexOf("chords"))); await ev(`document.querySelector("#nr-dwim .md-btn.is-main").click(); 0`); assert(/Chords are not re-read/.test(await ev(`document.querySelector("#nr-dwim .md-say").textContent`)));
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));

    // ---- Chord Entry: a take of short detached notes; the panel re-reads it and puts the staccato bars in ----
    await b.goto(B + "/tools/chord-entry.html"); await b.sleep(1200);
    await ev(`document.getElementById("ce-sound").checked = false; 0`); await set("ce-tempo", "160"); await set("ce-mode", "melody"); await set("ce-mwith", "click"); await set("ce-mbars", "2"); await set("ce-mfeel", "straight");
    assert.strictEqual(await ev(`document.getElementById("ce-dwim").hidden`), true, "no panel before there is a melody");
    await click("ce-mrec"); await until(() => ev(`!!__entry.take()`), 5000, "the take starts");
    const notes = [60, 62, 64, 65, 67, 69, 71, 72].map((m, i) => [i, m]);
    await ev(`(function(){ var n = ${JSON.stringify(notes)}, on = [], off = [], iv = setInterval(function(){ var t = __entry.take(); if (!t) return; n.forEach(function(x, i){ if (!on[i] && t.beat >= x[0]){ on[i] = 1; __entry.on(x[1], 0.7, performance.now()); } if (on[i] && !off[i] && t.beat >= x[0] + 0.4){ off[i] = 1; __entry.off(x[1], performance.now()); } }); }, 4); })()`);
    await until(async () => /^Wrote \d+ notes?/.test(await text("ce-note")), 20000, "the take ends: " + await text("ce-note"));
    assert.strictEqual(await ev(`document.getElementById("ce-dwim").hidden`), false, "the panel shows once there is a melody");
    const before = (await val("ce-abc")).split("\n").slice(5).join(" "); assert.strictEqual(before, "C z D z E z F z | G z A z B z c z |]");
    await ev(`__entry.dwim().setRange(0, 0); document.querySelector("#ce-dwim .md-btn.is-main").click(); 0`); await b.sleep(400);
    cs = await cards("ce-dwim"); assert(cs.some(c => c.best && /staccato/i.test(c.head)), "staccato suggested: " + JSON.stringify(cs));
    assert.strictEqual(await useBest("ce-dwim"), true); await b.sleep(300);
    assert.strictEqual((await val("ce-abc")).split("\n").slice(5).join(" "), ".C2 .D2 .E2 .F2 | G z A z B z c z |]", "only bar 1 changed");
    // a take's melody changed another way is no longer the take's: the panel says so
    await click("ce-mundo"); assert.strictEqual((await val("ce-abc")).split("\n").slice(5).join(" "), before, "undo puts the bar back");
    await ev(`__entry.dwim().run(); 0`); cs = await cards("ce-dwim"); assert(cs.length >= 2, "after undo the panel still works on the take");
    await click("ce-mclear"); assert.strictEqual(await ev(`document.getElementById("ce-dwim").hidden`), true);
    assert.deepStrictEqual(errs(), [], "page errors: " + errs().join(" | "));
    console.log("DWIM UI OK");
  } catch (e) { console.log("FAIL", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
