const { launch } = require("./cdp.js");
(async () => { const b = await launch(); const t = setTimeout(async () => { console.log("TIMEOUT; logs:", b.logs.slice(-5), "errors:", b.errors, "failed:", b.failed.slice(0, 8)); await b.close(); process.exit(1); }, 25000);
  await Promise.race([b.goto("http://127.0.0.1:8500/tools/chord-sheet.html"), b.sleep(12000)]); console.log("after goto");
  console.log("readyState", await b.eval("document.readyState"), "btn", await b.eval("!!document.getElementById('btn-band')"));
  console.log("errors:", JSON.stringify(b.errors), "failed:", JSON.stringify(b.failed.slice(0, 6)));
  clearTimeout(t); await b.close(); })();
