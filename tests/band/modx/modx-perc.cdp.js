// node tests/band/modx/modx-perc.cdp.js — the percussion auditions page with a fake MIDI port (serves _site on 8518):
// connect, a Pop Latin loop goes out on channel 9, Take turns walks channels 10 → 11 → 12, a ☆ pick is kept, Stop stops.
const { spawn } = require("child_process"), path = require("path");
const { launch } = require("../lead/cdp.js");
const FAKE = `(() => { window.__sent = []; const out = { id: "o1", name: "MODX-1", state: "connected", send: (b, ts) => window.__sent.push(Array.from(b)) };
  const outputs = new Map([["o1", out]]); navigator.requestMIDIAccess = () => Promise.resolve({ outputs, inputs: new Map(), onstatechange: null }); })();`;
(async () => {
  const srv = spawn("python3", ["-m", "http.server", "8518", "-d", path.join(__dirname, "../../../_site")], { stdio: "ignore" });
  await new Promise(r => setTimeout(r, 800));
  const b = await launch(); let ok = false;
  try {
    await b.send("Page.addScriptToEvaluateOnNewDocument", { source: FAKE });
    await b.goto("http://127.0.0.1:8518/gear/modx.html"); await b.sleep(600);
    await b.eval(`localStorage.clear(); [...document.querySelectorAll("#mp-connect button")][0].click()`); await b.sleep(300);
    const st = await b.eval(`document.querySelector(".mp-status").textContent`);
    if (!/MODX-1/.test(st)) throw new Error("not connected: " + st);
    const cards = await b.eval(`document.querySelectorAll(".mp-card").length`);
    if (cards < 33) throw new Error("cards: " + cards);
    await b.eval(`window.__sent.length = 0; document.querySelector("#mp-tumbao button").click()`); await b.sleep(1500);
    const ch9 = await b.eval(`window.__sent.filter(m => (m[0] & 0xF0) === 0x90).map(m => m[0])`);
    if (!ch9.length || ch9.some(s => s !== 0x98)) throw new Error("tumbao not on ch 9: " + ch9);
    if (!(await b.eval(`document.querySelectorAll("#mp-tumbao .mp-cell.on").length`))) throw new Error("no lit column");
    // Take turns on the brush ballad at a fast tempo: two bars each on 10, 11, 12
    await b.eval(`document.querySelector("#mp-ballad .mp-bpm").value = 240; window.__sent.length = 0;
      [...document.querySelectorAll("#mp-ballad button")].find(x => /Take turns/.test(x.textContent)).click()`); await b.sleep(6500);
    const chs = await b.eval(`[...new Set(window.__sent.filter(m => (m[0] & 0xF0) === 0x90).map(m => (m[0] & 15) + 1))]`);
    if (chs.join() !== "10,11,12") throw new Error("take turns channels: " + chs);
    // the slot patterns: Take turns on channels 13-16; choosing another kit renames the buttons
    await b.eval(`document.querySelector("#mp-rock8 .mp-bpm").value = 240; window.__sent.length = 0;
      [...document.querySelectorAll("#mp-rock8 button")].find(x => /Take turns/.test(x.textContent)).click()`); await b.sleep(8500);
    const sl = await b.eval(`[...new Set(window.__sent.filter(m => (m[0] & 0xF0) === 0x90).map(m => (m[0] & 15) + 1))].sort((a, b) => a - b)`);
    if (sl.join() !== "13,14,15,16") throw new Error("slot channels: " + sl);
    await b.eval(`const s = document.querySelector("#mp-slots select"); s.value = "Analog T8 Kit"; s.dispatchEvent(new Event("change"))`);
    if (!(await b.eval(`/Analog T8 Kit/.test(document.querySelector("#mp-trap .mp-row button").textContent)`))) throw new Error("slot kit not renamed");
    await b.eval(`document.querySelector("#mp-ballad .mp-star").click()`);
    const picks = await b.eval(`document.getElementById("mp-picks").textContent`);
    if (!/Brush ballad.*Real Brushes/.test(picks)) throw new Error("picks: " + picks);
    await b.eval(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); window.__sent.length = 0`); await b.sleep(800);
    const after = await b.eval(`window.__sent.filter(m => (m[0] & 0xF0) === 0x90).length`);
    if (after) throw new Error("still sending after Stop: " + after);
    console.log("MODX PERC OK"); ok = true;
  } catch (e) { console.error("FAIL", e.message); }
  finally { await b.close(); srv.kill(); process.exit(ok ? 0 : 1); }
})();
