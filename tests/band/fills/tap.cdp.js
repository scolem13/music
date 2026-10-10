// Tapping in the bars on a carols song page (~/Projects/carols/site/tap.html). Run from tests/band/fills.
const http = require("http"), fs = require("fs"), path = require("path");
const SITE = path.join(process.env.HOME, "Projects/carols/site/_site"), SF = path.join(__dirname, "../lead/site/sf");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".mp3": "audio/mpeg" };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]);
  const f = u.startsWith("/sf/") ? path.join(SF, u.slice(4)) : path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e){ res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }).listen(8602);
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1400, height: 1000 }); const B = "http://127.0.0.1:8602";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const key = k => ev(`document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "${k}", bubbles: true })); 0`);
  const until = async (what, ms, f) => { const t = Date.now(); let v; while (Date.now() - t < ms){ v = await ev(what); if (f(v)) return v; await b.sleep(60); } return v; };
  const status = `document.querySelector(".tap-panel .midi-status").textContent`;
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/songs/count-on-me.html");
    await ev(`(window.__errs = [], window.addEventListener("error", function(e){ __errs.push(e.message); }), 0)`);
    if (fs.existsSync(path.join(SF, "percussion-mp3"))) await ev(`Object.defineProperty(window, "getSoundfontUrl", { configurable: true, get: function(){ return function(){ return Promise.resolve("/sf/"); }; }, set: function(){} }); 0`);
    assert.strictEqual(await ev(`!!document.querySelector(".tap-panel")`), true);
    await ev(`(function(){ var e = document.querySelector(".tap-panel input"); e.value = 240; var s = document.querySelectorAll(".tap-panel select")[1]; s.value = "bar"; })()`);
    await key("t");
    // tap as each bar begins: the first chord in the count-in, then one a bar (two bars for the fourth)
    const bar = `(function(){ var m = /Bar (\\d+)/.exec(${status}); return m ? +m[1] : 0; })()`;
    assert(/Count-in/.test(await until(status, 25000, v => /Count-in|Bar/.test(v))), await ev(status));
    await key(" ");
    for (let n = 2; n <= 8; n++){ await until(bar, 4000, v => v >= n); if (n !== 5) await key(" "); }
    assert.strictEqual(await ev(`document.querySelector(".ch.now").textContent`), "C");
    assert.strictEqual(await ev(`document.body.classList.contains("chords")`), true);
    await key("Backspace"); await until(bar, 4000, v => v >= 9); await key(" ");
    await until(bar, 4000, v => v >= 10); await key("t");
    const r = JSON.parse(await until(`JSON.stringify(window.carolTap || null)`, 3000, v => v !== "null"));
    console.log(r.cho.split("\n").slice(0, 16).join("\n")); console.log(r.abc);
    assert.strictEqual(r.chords, 7);
    assert(r.cho.includes("{title: Count on Me}\n{tempo: 240}\n{time: 4/4}"));
    assert(r.cho.includes("{comment: Intro}\n{start_of_grid}\n| C |\n{end_of_grid}\n[C]Ahahuh..."));
    assert(r.cho.includes("{start_of_verse: Verse 1}\n{start_of_grid}\n| C | Em | Am | % |\n| G | F | % | C |\n| % |\n{end_of_grid}\nIf you [C]ever"), r.cho);
    assert(r.abc.includes('P:Verse 1\n"C"z8 | "Em"z8 | "Am"z8 | z8 |'));
    assert.strictEqual(await ev(`!!document.querySelector(".tap-sheet textarea").value`), true);
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(__errs)`)), []);
    console.log("TAP OK");
  } catch (e) { console.error("FAILED", e.message); process.exitCode = 1; }
  finally { await b.close(); server.close(); }
})();
