// Minimal Chrome DevTools Protocol driver (no npm packages): launch headless Chrome, open one page.
const { spawn } = require("child_process"), fs = require("fs"), path = require("path");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
async function launch({ port = 9343, width = 1500, height = 1100 } = {}) {
  const dir = path.join(__dirname, "chrome-profile"); fs.mkdirSync(dir, { recursive: true });
  const proc = spawn(CHROME, ["--headless=new", "--remote-debugging-port=" + port, "--user-data-dir=" + dir, "--no-first-run",
    "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required",
    `--window-size=${width},${height}`, "about:blank"], { stdio: "ignore" });
  let targets;
  for (let i = 0; i < 80; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.some(t => t.type === "page")) break; } catch (e) {} await new Promise(r => setTimeout(r, 150)); }
  const ws = new WebSocket(targets.find(t => t.type === "page").webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(), errors = [], logs = [];
  ws.onmessage = ev => { const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); return; }
    if (m.method === "Runtime.exceptionThrown") errors.push("EXCEPTION: " + (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text));
    if (m.method === "Runtime.consoleAPICalled") { const txt = m.params.args.map(a => a.value !== undefined ? a.value : a.description).join(" "); (m.params.type === "error" ? errors : logs).push(m.params.type + ": " + txt); }
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") errors.push("LOG: " + m.params.entry.text + " " + (m.params.entry.url || "")); };
  const send = (method, params = {}) => new Promise((res, rej) => { pending.set(++id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable");
  const api = { send, errors, logs,
    async goto(url) { await send("Page.navigate", { url }); for (let i = 0; i < 100; i++) { await new Promise(r => setTimeout(r, 100)); if ((await api.eval("document.readyState")) === "complete") break; } await new Promise(r => setTimeout(r, 300)); },
    async eval(expr) { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error("eval failed: " + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text)); return r.result.value; },
    async shot(file, clipSel) { let clip;
      if (clipSel) { const b = await api.eval(`(()=>{const r=document.querySelector(${JSON.stringify(clipSel)}).getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height}})()`); clip = { ...b, scale: 1 }; }
      const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, ...(clip ? { clip } : {}) }); fs.writeFileSync(file, Buffer.from(r.data, "base64")); },
    async close() { try { ws.close(); } catch (e) {} proc.kill(); } };
  return api;
}
module.exports = { launch };
