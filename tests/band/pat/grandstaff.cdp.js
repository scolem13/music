const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1400 }); try {
  await b.goto("http://127.0.0.1:8500/tools/backing-track.html?style=pop"); await b.sleep(1200);
  await b.eval(`document.getElementById("bt-notation").open = true; document.getElementById("bt-nt-refresh").click(); 0`); await b.sleep(2500);
  const r = JSON.parse(await b.eval(`JSON.stringify({ staves: document.querySelectorAll("#bt-score .abcjs-staff").length, braces: document.querySelectorAll("#bt-score .abcjs-brace").length, notes: document.querySelectorAll("#bt-score .abcjs-note").length, w: document.documentElement.scrollWidth <= window.innerWidth })`));
  console.log(JSON.stringify(r)); assert(r.staves >= 3 && r.braces >= 1 && r.notes > 20 && r.w);
  console.log("NOTATION GRAND STAFF OK", b.errors.filter(e => !/supabaseUrl/.test(e)));
} catch (e) { console.log("FAILED:", e.message); } finally { await b.close(); } })();
