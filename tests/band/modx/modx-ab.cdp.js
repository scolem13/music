// node tests/band/modx/modx-ab.cdp.js — the band A/B page with a fake MIDI port (serves _site on 8520, or SITE=<dir>; the sample mirror on
// 8500 as modx.cdp.js does). Checks: connect; a style plays on the site with nothing sent; MODX sends the bass on channel 1 and the rock
// drums on Rock Stereo Kit 1's channel 14; back to Site stops the MIDI; a verdict is kept and tallied.
const { spawn } = require("child_process"), path = require("path");
const { launch } = require("../lead/cdp.js");
const FAKE = `(() => { window.__sent = []; const out = { id: "o1", name: "MODX-1", state: "connected", send: (b, ts) => window.__sent.push(Array.from(b)) };
  const outputs = new Map([["o1", out]]); navigator.requestMIDIAccess = () => Promise.resolve({ outputs, inputs: new Map(), onstatechange: null }); })();`;
(async () => {
  const site = process.env.SITE || path.join(__dirname, "../../../_site");
  const srv = spawn("python3", ["-m", "http.server", "8520", "-d", site], { stdio: "ignore" });
  const mirror = spawn("python3", ["-m", "http.server", "8500", "-d", path.join(__dirname, "../lead/site")], { stdio: "ignore" });
  await new Promise(r => setTimeout(r, 800));
  const b = await launch(); let ok = false;
  const ons = () => b.eval(`window.__sent.filter(m => (m[0] & 0xF0) === 0x90).map(m => (m[0] & 15) + 1)`);
  try {
    await b.send("Page.addScriptToEvaluateOnNewDocument", { source: FAKE });
    await b.goto("http://127.0.0.1:8520/gear/modx-ab.html"); await b.sleep(1200);
    await b.eval(`localStorage.clear(); document.getElementById("ab-connect").click()`); await b.sleep(400);
    if (!/MODX-1/.test(await b.eval(`document.getElementById("ab-status").textContent`))) throw new Error("not connected");
    const demos = await b.eval(`document.querySelectorAll(".ar-demo").length`); if (demos < 12) throw new Error("demos: " + demos);
    // the rock example: play on the site, nothing goes out
    await b.eval(`window.__sent.length = 0; const d = [...document.querySelectorAll(".ar-demo")].find(x => x.dataset.style === "rock"); d.querySelector("button").click()`);
    await b.sleep(5000);
    let chs = await ons(); if (chs.length) throw new Error("site sent MIDI on " + [...new Set(chs)]);
    await b.eval(`window.__sent.length = 0; document.getElementById("ab-modx").click()`); await b.sleep(4000);
    chs = [...new Set(await ons())].sort((x, y) => x - y);
    if (!chs.includes(14)) throw new Error("rock drums not on channel 14: " + chs);
    if (!chs.includes(10) && !chs.includes(1)) throw new Error("no bass on the MODX: " + chs);
    await b.eval(`document.getElementById("ab-site").click()`); await b.sleep(600); await b.eval(`window.__sent.length = 0`); await b.sleep(2500);
    chs = await ons(); if (chs.length) throw new Error("still sending after Site: " + [...new Set(chs)]);
    await b.eval(`document.getElementById("ar-stop") && document.getElementById("ar-stop").click()`);
    await b.eval(`document.querySelector(".ab-verdict button[data-v=MODX]").click()`);
    if (!/MODX 1/.test(await b.eval(`document.getElementById("ab-summary").textContent`))) throw new Error("verdict not tallied");
    console.log("MODX AB OK"); ok = true;
  } catch (e) { console.error("FAIL", e.message); }
  finally { await b.close(); srv.kill(); mirror.kill(); process.exit(ok ? 0 : 1); }
})();
