// Minimal headless-Chrome driver over the DevTools protocol (no npm packages).
const { spawn } = require("child_process"), fs = require("fs"), os = require("os"), path = require("path");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
async function launch({ width = 1280, height = 900 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-chrome-"));
  const proc = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", "--user-data-dir=" + dir, "--no-first-run", "--mute-audio",
    "--autoplay-policy=no-user-gesture-required", `--window-size=${width},${height}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const wsUrl = await new Promise((res, rej) => { let buf = ""; proc.stderr.on("data", d => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m) res(m[1]); }); setTimeout(() => rej(new Error("chrome did not start: " + buf)), 15000); });
  const port = /:(\d+)\//.exec(wsUrl)[1];
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = targets.find(t => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener("open", r, { once: true }));
  let id = 0; const pending = new Map(), logs = [], errors = [], failed = [];
  ws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); return; }
    if (m.method === "Runtime.consoleAPICalled") { const text = m.params.args.map(a => a.value !== undefined ? a.value : a.description).join(" "); logs.push(m.params.type + ": " + text); if (m.params.type === "error") errors.push(text); }
    if (m.method === "Runtime.exceptionThrown") errors.push("EXCEPTION: " + (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text));
    if (m.method === "Network.loadingFailed") failed.push(m.params.errorText + " " + m.params.requestId);
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400) failed.push(m.params.response.status + " " + m.params.response.url);
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  const api = {
    logs, errors, failed, send,
    async goto(url) { const loaded = new Promise(r => { const h = ev => { const m = JSON.parse(ev.data); if (m.method === "Page.loadEventFired") { ws.removeEventListener("message", h); r(); } }; ws.addEventListener("message", h); }); await send("Page.navigate", { url }); await loaded; },
    async eval(expr) { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true });
      if (r.exceptionDetails) throw new Error("eval failed: " + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text)); return r.result.value; },
    async resize(w, h) { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 }); },
    async shot(file, full = true) { const m = await send("Page.getLayoutMetrics"); const cs = m.cssContentSize || m.contentSize;
      const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: full, clip: full ? { x: 0, y: 0, width: cs.width, height: cs.height, scale: 1 } : undefined });
      fs.writeFileSync(file, Buffer.from(r.data, "base64")); return file; },
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    async close() { try { ws.close(); } catch (e) {} proc.kill(); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} }
  };
  return api;
}
module.exports = { launch };
