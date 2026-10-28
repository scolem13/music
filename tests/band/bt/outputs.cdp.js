// Outputs panel on the Backing Track page: modes, channel map saved, routing builds without errors (headless has 2 channels, so multi falls back).
const { launch } = require("../lead/cdp.js");
(async () => {
  const b = await launch({ width: 1280, height: 900 });
  let fail = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fail++; };
  try {
    await b.goto("http://127.0.0.1:" + (process.env.PORT || 8500) + "/tools/backing-track.html"); await b.sleep(1200);
    ok(await b.eval(`!!document.getElementById("bo-mode")`), "panel mounted");
    ok(await b.eval(`document.getElementById("bo-ch-bass").closest(".bt-mixer").hidden`), "channel grid hidden in stereo");
    await b.eval(`(function(){ var e=document.getElementById("bo-mode"); e.value="multi"; e.dispatchEvent(new Event("change")); })()`);
    ok(await b.eval(`document.querySelectorAll("[id^=bo-ch-]").length`) === 11, "11 sends listed");
    await b.eval(`(function(){ var e=document.getElementById("bo-ch-bass"); e.value="17"; e.dispatchEvent(new Event("change")); })()`);
    ok(await b.eval(`JSON.parse(localStorage.getItem("band-output-v1")).map.bass`) === 17, "channel saved");
    await b.eval(`document.getElementById("bt-play").click()`); await b.sleep(2500);
    ok(await b.eval(`BandPlayer.output.info().channels`) >= 2, "routing ran: " + await b.eval(`JSON.stringify(BandPlayer.output.info())`));
    await b.eval(`document.getElementById("bt-play").click()`); await b.sleep(500);
    await b.eval(`BandPlayer.output.reset()`);
    const errs = b.errors.filter(e => !/supabaseUrl|favicon/.test(e)); ok(!errs.length, "no page errors " + errs.join(" | "));
  } finally { await b.close(); }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
