// node tests/band/modx/modx-orchestra.cdp.js — the MODX Orchestra page with a fake MIDI port (serves _site on 8522, or SITE=<dir>):
// sixteen Parts listed; ▶ on Violins I sends its phrase on channel 12 and nowhere else; a typed choice is kept.
const { spawn } = require("child_process"), path = require("path");
const { launch } = require("../lead/cdp.js");
const FAKE = `(() => { window.__sent = []; const out = { id: "o1", name: "MODX-1", state: "connected", send: (b, ts) => window.__sent.push(Array.from(b)) };
  const outputs = new Map([["o1", out]]); navigator.requestMIDIAccess = () => Promise.resolve({ outputs, inputs: new Map(), onstatechange: null }); })();`;
(async () => {
  const srv = spawn("python3", ["-m", "http.server", "8522", "-d", process.env.SITE || path.join(__dirname, "../../../_site")], { stdio: "ignore" });
  await new Promise(r => setTimeout(r, 800));
  const b = await launch(); let ok = false;
  try {
    await b.send("Page.addScriptToEvaluateOnNewDocument", { source: FAKE });
    await b.goto("http://127.0.0.1:8522/gear/modx-orchestra.html"); await b.sleep(600);
    const rows = await b.eval(`document.querySelectorAll("#mo-parts tr").length`); if (rows !== 17) throw new Error("rows: " + rows);
    await b.eval(`localStorage.clear(); document.getElementById("mo-connect").click()`); await b.sleep(400);
    await b.eval(`window.__sent.length = 0; document.querySelector('#mo-parts button[data-ch="12"]').click()`); await b.sleep(4000);
    const chs = await b.eval(`[...new Set(window.__sent.filter(m => (m[0] & 0xF0) === 0x90).map(m => (m[0] & 15) + 1))]`);
    if (chs.join() !== "12") throw new Error("Violins I phrase on channels " + chs);
    await b.eval(`const i = document.querySelector('#mo-parts input[data-c="12"]'); i.value = "Seattle Violins 1"; i.dispatchEvent(new Event("input", { bubbles: true }))`);
    if (!/Seattle Violins 1/.test(await b.eval(`localStorage.getItem("modx-orchestra")`))) throw new Error("choice not kept");
    console.log("MODX ORCHESTRA OK"); ok = true;
  } catch (e) { console.error("FAIL", e.message); }
  finally { await b.close(); srv.kill(); process.exit(ok ? 0 : 1); }
})();
