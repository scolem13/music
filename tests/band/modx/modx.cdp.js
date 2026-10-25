// node tests/band/modx/modx.cdp.js — the MODX page and a band page with a fake MIDI port (serves _site itself on port 8517).
// Checks: connect, the compare buttons (Site sends nothing, MODX sends on the instrument's channel), Route the winners,
// and that another band page loads modx.js by itself and routes notes once the MODX is switched on.
const { spawn } = require("child_process"), path = require("path");
const { launch } = require("../lead/cdp.js");
const FAKE = `(() => { window.__sent = []; const out = { id: "o1", name: "MODX-1", state: "connected", send: (b, ts) => window.__sent.push(Array.from(b)) };
  const outputs = new Map([["o1", out]]); navigator.requestMIDIAccess = () => Promise.resolve({ outputs, inputs: new Map(), onstatechange: null }); })();`;
(async () => {
  const srv = spawn("python3", ["-m", "http.server", "8517", "-d", path.join(__dirname, "../../../_site")], { stdio: "ignore" });
  // the sample mirror (tests/band/lead/site/sf, see tests/band/README.md) on 8500, unless a test server is already there
  const mirror = spawn("python3", ["-m", "http.server", "8500", "-d", path.join(__dirname, "../lead/site")], { stdio: "ignore" });
  await new Promise(r => setTimeout(r, 800));
  const b = await launch(); let ok = false;
  try {
    await b.send("Page.addScriptToEvaluateOnNewDocument", { source: FAKE });
    await b.goto("http://127.0.0.1:8517/gear/modx-band.html"); await b.sleep(500);
    await b.eval(`localStorage.clear(); document.getElementById("mx-connect").click()`); await b.sleep(300);
    const st = await b.eval(`document.getElementById("mx-status").textContent`);
    if (!/MODX-1/.test(st)) throw new Error("not connected: " + st);
    const rows = await b.eval(`document.querySelectorAll("#mx-compare tr").length`);
    if (rows < 10) throw new Error("compare rows: " + rows);
    // bass row: Site sends nothing, MODX sends note-ons on channel 1
    await b.eval(`window.__sent.length = 0; [...document.querySelectorAll("#mx-compare button[data-w=site]")][0].click()`); await b.sleep(2500);
    const siteSent = await b.eval(`window.__sent.filter(m => (m[0] & 0xF0) === 0x90).length`);
    if (siteSent) throw new Error("Site sent MIDI: " + siteSent);
    await b.eval(`window.__sent.length = 0; [...document.querySelectorAll("#mx-compare button[data-w=modx]")][0].click()`); await b.sleep(8000);
    const on = await b.eval(`window.__sent.filter(m => m[0] === 0x90)`), off = await b.eval(`window.__sent.filter(m => m[0] === 0x80).length`);
    if (on.length !== 9 || off !== 9) throw new Error("bass on MODX: " + on.length + " on, " + off + " off");
    // drums row on channel 10
    await b.eval(`window.__sent.length = 0; [...document.querySelectorAll("#mx-compare tr")].find(r => /rock beat/.test(r.textContent)).querySelector("button[data-w=modx]").click()`); await b.sleep(1500);
    const kit = await b.eval(`window.__sent.filter(m => (m[0] & 0xF0) === 0x90).map(m => m[0])`);
    if (!kit.length || kit.some(s => s !== 0x99)) throw new Error("drums not on ch 10: " + kit);
    await b.eval(`document.getElementById("mx-stop").click()`);
    // pick MODX for the bass, Site for the piano, route the winners
    await b.eval(`const r = [...document.querySelectorAll("#mx-compare tr")]; r[1].querySelector("button[data-v=modx]").click();
      [...document.querySelectorAll("#mx-compare tr")].find(x => /^Piano/.test(x.textContent)).querySelector("button[data-v=site]").click();
      document.getElementById("mx-win").click(); document.getElementById("mx-on").click();`);
    const routes = await b.eval(`JSON.parse(localStorage.getItem("modx.cfg")).routes`);
    if (!routes[Object.keys(routes)[0]].on || routes.piano.on) throw new Error("routing: " + JSON.stringify(routes));
    if (await b.eval(`localStorage.getItem("modx.on")`) !== "1") throw new Error("modx.on not saved");
    // another band page: modx.js comes in by itself and the bass goes out
    await b.goto("http://127.0.0.1:8517/tools/chord-entry.html"); await b.sleep(1500);
    const loaded = await b.eval(`!!window.BandModx && window.BandModx.connected()`);
    if (!loaded) throw new Error("modx.js not loaded / connected on chord-entry");
    await b.eval(`(async () => { const ac = new AudioContext(); const k = BandSounds.create(ac); await k.load(["bass","piano"]).catch(() => {}); window.__sent.length = 0;
      k.play("bass", { midi: 40, vel: .8, dur: .2 }, ac.currentTime + .05); k.play("piano", { midi: 60, vel: .8, dur: .2 }, ac.currentTime + .05); })()`);
    await b.sleep(600);
    const s2 = await b.eval(`window.__sent.filter(m => (m[0] & 0xF0) === 0x90)`);
    if (s2.length !== 1 || s2[0][0] !== 0x90 || s2[0][1] !== 40) throw new Error("band page routing: " + JSON.stringify(s2));
    const errs = b.errors.filter(e => !/favicon|supabase/i.test(e));
    if (errs.length) throw new Error("page errors: " + errs.join(" | "));
    await b.shot(path.join(process.env.SHOT_DIR || "/tmp", "modx-page.png"));
    ok = true; console.log("MODX UI OK");
  } catch (e) { console.error("FAIL:", e.message); }
  finally { await b.close(); srv.kill(); mirror.kill(); process.exit(ok ? 0 : 1); }
})();
