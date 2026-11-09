// Known fault: the count-in bars and the final ending hit were not in the notation or the MIDI file. Plays one chorus on the page,
// then exports MIDI (the click bars come before bar 1, the ending bar after the last one) and draws the notation (both bars there).
// Needs the test server: cd ../lead && PORT=8500 node serve.js. `node count-in-ending.cdp.js`   NEG=1 must fail.
const assert = require("assert"), { launch } = require("../lead/cdp.js");
(async () => {
  const b = await launch({ width: 1280, height: 1000 }), ev = x => b.eval(x);
  const set = (id, val) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${val}"; e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const waitFor = async (expr, ms, what) => { const t = Date.now(); for (;;){ try { if (await ev(expr)) return; } catch (e) {} if (Date.now() - t > ms) throw new Error("timeout " + what); await b.sleep(100); } };
  try {
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html"); await b.sleep(1200);
    await set("bt-changes", "jazz"); await set("bt-countin", process.env.NEG ? "0" : "2"); await set("bt-choruses", "1"); await set("bt-tempo-n", "300");
    await ev(`document.getElementById("bt-notation").open = true; document.getElementById("bt-nt-drums").checked = true; document.getElementById("bt-nt-drums").dispatchEvent(new Event("change", { bubbles:true })); document.getElementById("bt-play").click()`);
    await waitFor(`/Chorus 1/.test(document.getElementById("bt-status").textContent)`, 30000, "playing");
    await waitFor(`document.getElementById("bt-play").textContent.trim() === "Play" || !!window.__btLastEnded || /Stopped|Done|^$/.test(document.getElementById("bt-status").textContent)`, 60000, "finished");
    await b.sleep(800);
    const nbars = await ev(`document.querySelectorAll('#bt-chart .tc-bar[data-bar]').length`);
    await ev(`document.getElementById("bt-mid-range").value = "all"; document.getElementById("bt-mid-go").click()`); await b.sleep(500);
    const bytes = await ev(`Array.from(window.__btLastMidi || [])`);
    // note-ons on the drum channel: [tick, note]
    const dr = []; let p = 14;
    while (p < bytes.length){ const len = bytes.slice(p + 4, p + 8).reduce((a, x) => a * 256 + x, 0); let q = p + 8, t = 0, run = 0; const end = q + len;
      while (q < end){ let d = 0, c; do { c = bytes[q++]; d = d * 128 + (c & 127); } while (c & 128); t += d; let s = bytes[q];
        if (s === 0xff){ q += 2 + bytes[q + 1]; continue; } if (s & 128){ run = s; q++; } s = run; const hi = s & 0xf0, n = hi === 0xc0 || hi === 0xd0 ? 1 : 2;
        if (s === 0x99 && bytes[q + 1] > 0) dr.push([t, bytes[q]]); q += n; }
      p = end; }
    const clicks = dr.filter(x => x[1] === 31 || x[1] === 33 || x[1] === 34).length, lastTick = Math.max(...dr.map(x => x[0])), bar = 4 * 480;
    console.log("bars", nbars, "sticks", clicks, "last drum tick in bars", (lastTick / bar).toFixed(2));
    assert(clicks >= 6, "count-in clicks (2 bars: 2 + 4) are in the MIDI file, got " + clicks);
    assert(lastTick >= (2 + nbars) * bar, "the ending bar comes after the last bar of the form");
    assert(dr.some(x => x[1] === 49 && x[0] >= (2 + nbars) * bar), "the ending hit's crash is in the last bar");
    // notation: the drum staff has the clicks in its first bars and the ending bar at the end
    await ev(`document.getElementById("bt-nt-refresh").click()`); await b.sleep(1200);
    const drawn = await ev(`JSON.stringify(window.__btNotation.drawn)`);
    console.log("drawn", drawn);
    assert.strictEqual(drawn, JSON.stringify(["count", "count", ...Array.from({ length: nbars }, (_, i) => i), "end"]), "notation: the count-in bars, the chorus, the ending bar");
    console.log("COUNT-IN + ENDING OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e.message); process.exit(1); });
