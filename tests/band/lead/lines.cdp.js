// The chord grid keeps the lines of the ABC: the bars written on one line make one row. Run from tests/band/lead, server on 8500.
const { launch } = require("./cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1300 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const load = async abc => { await ev(`(function(){ var t = document.getElementById("bt-abc"); t.value = ${JSON.stringify(abc)}; t.dispatchEvent(new Event("input", { bubbles:true })); t.dispatchEvent(new Event("change", { bubbles:true })); })()`); await b.sleep(700); };
  const rows = () => ev(`Array.from(document.querySelectorAll("#bt-chart .tc-system")).map(function(r){ return r.querySelectorAll(".tc-bar[data-bar]").length + "/" + r.querySelectorAll(".tc-bar").length; }).join(" ")`);
  const H = "X:1\nT:Lines\nM:4/4\nL:1/4\nK:C\n", bar = c => '"' + c + '"z4';
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/tools/backing-track.html"); await b.sleep(1200);
    assert.strictEqual(await rows(), "4/4 4/4 4/4", "the blues as before: " + await rows());
    // three, five and one to a line (bars with a chord / cells in the row: every row as wide as the longest)
    await load(H + ["C", "F", "G"].map(bar).join("|") + "|\n" + ["C", "F", "G", "Am", "F"].map(bar).join("|") + "|\n" + bar("G") + "|]");
    assert.strictEqual(await rows(), "3/5 5/5 1/5");
    // six on one line stay on one line; a long one-line tune gets four to a row; a backslash joins two lines
    await load(H + ["C", "F", "G", "C", "F", "G"].map(bar).join("|") + "|]"); assert.strictEqual(await rows(), "6/6");
    await load(H + Array(12).fill(bar("C")).join("|") + "|]"); assert.strictEqual(await rows(), "4/4 4/4 4/4");
    await load(H + bar("C") + "|" + bar("F") + "|\\\n" + bar("G") + "|" + bar("C") + "|\n" + bar("F") + "|" + bar("G") + "|]"); assert.strictEqual(await rows(), "4/4 2/4");
    // %%score-bars in the ABC still wins
    await load(H + "%%score-bars 2\n" + ["C", "F", "G"].map(bar).join("|") + "|\n" + bar("C") + "|]"); assert.strictEqual(await rows(), "2/2 2/2");
    // and it still plays through a ragged layout
    await load(H + ["C", "F", "G"].map(bar).join("|") + "|\n" + ["C", "F"].map(bar).join("|") + "|]");
    await ev(`document.getElementById("bt-countin").value = "1"; document.getElementById("bt-play").click(); 0`);
    const t = Date.now(); let st = ""; while (Date.now() - t < 25000){ st = await ev(`document.getElementById("bt-status") ? document.getElementById("bt-status").textContent : ""`); if (/bar 2/i.test(st)) break; await b.sleep(150); }
    assert(/bar 2/i.test(st), "plays: " + st); await ev(`document.getElementById("bt-play").click(); 0`);
    console.log("LINES OK");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
