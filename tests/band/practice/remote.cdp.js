// A song sent by the lyrics page (backing-track.html?remote=1, driven by its opener): looping bars or stepping the
// tempo must repeat it, not end it after one pass; and the same song sent again keeps what was being practised.
// Needs the test site on port 8500 (tests/band/README.md).
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1000 });
  const W = code => b.eval(`(function(){ var w = window.__w, document = w.document; ${code} })()`);
  const set = (id, v) => W(`var e = document.getElementById(${JSON.stringify(id)}); if (e.type === "checkbox") e.checked = ${JSON.stringify(v)}; else e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new w.Event("change", { bubbles: true }));`);
  const val = id => W(`var e = document.getElementById(${JSON.stringify(id)}); return e.type === "checkbox" ? e.checked : e.value;`);
  const ABC = "X:1\nM:4/4\nL:1/4\nK:C\nP:Verse\n" + "C|Am|F|G".split("|").map(c => `"${c}"z4`).join(" | ") + " |\nP:Chorus\n" + "F|G|C|C".split("|").map(c => `"${c}"z4`).join(" | ") + " |";
  const load = () => b.eval(`window.__w.postMessage({ type: "bt-load", abc: ${JSON.stringify(ABC)}, tempo: 280, style: "rock", hold: false, countIn: 0, title: "Test" }, location.origin)`);
  const bars = async ms => { await b.eval(`window.__msgs.length = 0`); await b.sleep(ms); return b.eval(`window.__msgs.filter(function(m){ return m.type === "bt-bar" || m.type === "bt-state"; }).map(function(m){ return m.type === "bt-state" ? m.state : m.info.between ? "x" : m.info.countIn ? "c" : m.info.ending ? "E" : String(m.info.index + 1); }).join(" ")`); };
  try { await b.goto("http://127.0.0.1:8500/index.html"); await b.sleep(300);
    await b.eval(`window.__msgs = []; window.addEventListener("message", function(e){ if (e.data && /^bt-/.test(e.data.type)) window.__msgs.push(e.data); }); window.__w = window.open("/tools/backing-track.html?remote=1", "bt-test"); !!window.__w`);
    for (let i = 0; i < 40 && !(await b.eval(`window.__msgs.some(function(m){ return m.type === "bt-ready"; })`)); i++) await b.sleep(150);
    assert(await b.eval(`window.__msgs.some(function(m){ return m.type === "bt-ready"; })`), "the window reports ready");
    await load(); await b.sleep(400);
    assert.strictEqual(await val("bt-choruses"), "1", "a sent song is played once");
    // once through: it ends
    await b.eval(`window.__w.postMessage({ type: "bt-play", startBar: 0 }, location.origin)`);
    let seen = await bars(10000); console.log("once:", seen); assert(/8 .*idle/.test(seen), "plays to bar 8 and stops");
    // loop bars 3-4 with a click between: it goes on
    await set("bt-cyc-from", 3); await set("bt-cyc-to", 4); await set("bt-cyc-on", true); await set("bt-gap", "click"); await set("bt-gap-bars", 1);
    assert.strictEqual(await val("bt-choruses"), "0", "looping sets Choruses to Repeat");
    await b.eval(`window.__w.postMessage({ type: "bt-play", startBar: 0 }, location.origin)`);
    seen = await bars(7000); console.log("loop:", seen); assert(/3 4 x 3 4 x 3 4/.test(seen), "the loop repeats with a click between"); assert(!/idle/.test(seen), "and does not end");
    // the lyrics page reloads and sends the same song: the loop is still set
    await load(); await b.sleep(400);
    assert.strictEqual(await val("bt-cyc-on"), true); assert.strictEqual(await val("bt-cyc-from"), "3"); assert.strictEqual(await val("bt-choruses"), "0"); assert.strictEqual(await val("bt-gap"), "click");
    await b.eval(`window.__w.postMessage({ type: "bt-play", startBar: 0 }, location.origin)`);
    seen = await bars(5000); console.log("after reload:", seen); assert(/3 4 x 3 4/.test(seen));
    await b.eval(`window.__w.postMessage({ type: "bt-stop" }, location.origin)`); await b.sleep(300);
    // loop off again: back to once through
    await set("bt-cyc-on", false); assert.strictEqual(await val("bt-choruses"), "1", "and back to 1 when the loop is turned off");
    // tempo steps alone repeat the whole song
    await set("bt-step-on", true); assert.strictEqual(await val("bt-choruses"), "0");
    await b.eval(`window.__w.postMessage({ type: "bt-play", startBar: 0 }, location.origin)`);
    seen = await bars(10000); console.log("steps:", seen); assert(/8 x 1 2/.test(seen), "the whole song goes round, with the click between");
    console.log("REMOTE OK");
  } catch (e) { console.log("FAILED:", e.message); console.log(b.errors.filter(e => !/supabase/i.test(e)).join("\n")); process.exitCode = 1; }
  finally { await b.close(); }
})();
