const { launch } = require("./cdp.js");
(async () => {
  const b = await launch({ width: 1280, height: 900 });
  try {
    // layout preview only: let the page boot even if harmony.js has not landed yet
    await b.send("Page.addScriptToEvaluateOnNewDocument", { source: "window.__stubHarmony = true; Object.defineProperty(window, 'BandHarmony', { configurable: true, writable: true, value: window.BandHarmony || { buildForm: function(){ return []; } } });" });
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html"); await b.sleep(1200);
    console.log("bars:", await b.eval("document.querySelectorAll('#bt-chart .tc-bar[data-bar]').length"));
    console.log("status:", JSON.stringify(await b.eval("document.getElementById('bt-status').textContent")));
    console.log("overflowX desktop:", await b.eval("document.documentElement.scrollWidth - window.innerWidth"));
    await b.shot("layout-desktop.png");
    await b.resize(390, 800); await b.sleep(400);
    console.log("overflowX mobile:", await b.eval("document.documentElement.scrollWidth - window.innerWidth"));
    await b.shot("layout-mobile.png");
    console.log("errors:", JSON.stringify(b.errors)); console.log("failed:", JSON.stringify(b.failed));
  } finally { await b.close(); }
})().catch(e => { console.error("FAILED", e); process.exit(1); });
