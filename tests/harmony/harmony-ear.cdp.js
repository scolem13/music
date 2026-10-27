// Hearing Harmony page (rendered _site/practice/harmony-ear.html) in headless Chrome. Sound is stubbed (records notes), so no samples.
// Each question type on a few levels and paths: answering right scores, a wrong answer shows the right one; phone width has no sideways scroll.
// Run: quarto render practice/harmony-ear.qmd && node tests/harmony/harmony-ear.cdp.js
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../.."), SITE = path.join(ROOT, "_site");
const { launch } = require(path.join(ROOT, "tests/band/lead/cdp.js"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const f = path.join(SITE, decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(SITE)) { res.writeHead(404); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const host = `http://127.0.0.1:${server.address().port}`;
  let failed = 0; const check = (name, fn) => Promise.resolve().then(fn).then(() => console.log("ok  ", name), e => { failed++; console.log("FAIL", name, "\n    ", e.message); });
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const b = await launch({ width: w, height: h }); await b.resize(w, h);
    await b.goto(host + "/practice/harmony-ear.html"); await wait(1000);
    await b.eval(`localStorage.removeItem("harmonyEar.v1")`); await b.goto(host + "/practice/harmony-ear.html"); await wait(1000);
    // stub BandSounds: record notes, play instantly fast
    await b.eval(`window.__notes=[];BandSounds.create=function(){return{load:function(){return Promise.resolve()},play:function(s,o){__notes.push([s,o.midi])},stopAll:function(){}}}`);
    const setSel = (label, v) => b.eval(`(function(){var l=[].find.call(document.querySelectorAll("#harmony-ear label"),x=>x.firstChild.textContent==${JSON.stringify(label)});var s=l.querySelector("select");s.value=${JSON.stringify(String(v))};s.dispatchEvent(new Event("change"))})()`);
    const answerAll = right => b.eval(`(function(){var q=HarmonyEar._cur().q,n=document.querySelectorAll("#harmony-ear .he-slot").length;
       for(var i=0;i<n;i++){var c=HarmonyEar._cur(); if(c.checked)break; if(c.filled[i])continue; var want=q.answer[i];
         var ch=q.slots?q.slots[i].choices:q.choices; var pick=${right}?want:ch.find(x=>x!==want)||want; var bs=[].slice.call(document.querySelectorAll("#harmony-ear .he-choice"));
         bs[ch.indexOf(pick)].click();}
       var c=HarmonyEar._cur(); if(!c.checked) document.querySelector("#harmony-ear .he-bar button:nth-child(4)").click(); return document.querySelector("#harmony-ear .he-result").textContent})()`);
    await setSel("Tempo", 132); await setSel("Beats per chord", 1);
    const cases = [["mlt", "A1", "rn"], ["mlt", "B2", "func"], ["mlt", "C5", "mode"], ["rock", "R5", "bass"], ["jazz", "J1", "next"], ["jazz", "J6", "same"], ["classical", "K6", "change"], ["mlt", "E2", "rn"], ["classical", "K2", "inv"], ["jazz", "J4", "bass"]];
    for (const [p, lv, k] of cases) {
      await check(`[${w}] ${p}/${lv}/${k}: right then wrong`, async () => {
        await setSel("Path", p); await setSel("Level", lv); await setSel("Question", k);
        await b.eval(`document.querySelector("#harmony-ear .he-go").click()`); await wait(150);
        assert(await b.eval(`__notes.length>0`), "notes sounded");
        assert(/^Right/.test(await answerAll(true)), "right answer scored");
        await b.eval(`document.querySelector("#harmony-ear .he-go").click()`); await wait(100);
        const r = await answerAll(false), q = await b.eval(`JSON.stringify(HarmonyEar._cur().q.choices)`);
        if (JSON.parse(q).length > 1) assert(/^Not quite/.test(r), "wrong answer: " + r);
      });
    }
    await check(`[${w}] ▶ per chord plays one chord; bass alone plays one note`, async () => {
      await setSel("Path", "mlt"); await setSel("Level", "B2"); await setSel("Question", "rn");
      await b.eval(`document.querySelector("#harmony-ear .he-go").click()`); await wait(150);
      const n = await b.eval(`document.querySelectorAll("#harmony-ear .he-one").length`);
      assert.strictEqual(n, await b.eval(`HarmonyEar._cur().q.progs[0].length`));
      await b.eval(`__notes=[];document.querySelectorAll("#harmony-ear .he-one")[1].click()`); await wait(100);
      assert.strictEqual(await b.eval(`__notes.length`), 4, "bass + 3 upper");
      await b.eval(`document.querySelector("#harmony-ear .he-bassonly").click()`);
      await b.eval(`__notes=[];document.querySelectorAll("#harmony-ear .he-one")[1].click()`); await wait(100);
      assert.strictEqual(await b.eval(`JSON.stringify(__notes.map(x=>x[0]))`), JSON.stringify(["bass"]));
      await b.eval(`document.querySelector("#harmony-ear .he-bassonly").click()`);
    });
    await check(`[${w}] inversion steps: bass buttons, then root buttons`, async () => {
      await setSel("Path", "classical"); await setSel("Level", "K2"); await setSel("Question", "inv"); await setSel("First chord", "none");
      await b.eval(`document.querySelector("#harmony-ear .he-go").click()`); await wait(150);
      const first = await b.eval(`[].map.call(document.querySelectorAll("#harmony-ear .he-choice"),b=>b.textContent).join()`);
      assert(/Do/.test(first) && !/Root/.test(first), "step 1 offers notes: " + first);
      await b.eval(`document.querySelectorAll("#harmony-ear .he-choice")[0].click()`);
      assert.strictEqual(await b.eval(`[].map.call(document.querySelectorAll("#harmony-ear .he-choice"),b=>b.textContent).join()`), "Root,Not the root");
      await setSel("First chord", "first");
    });
    await check(`[${w}] custom path with ticked chords, three voices`, async () => {
      await setSel("Path", "custom"); await setSel("Voices", 3); await setSel("Question", "rn");
      await b.eval(`document.querySelector("#harmony-ear .he-go").click()`); await wait(150);
      const notes = await b.eval(`__notes.length`); assert(notes > 0);
      assert(/^Right/.test(await answerAll(true)));
      assert(/Last \d+: \d+ right/.test(await b.eval(`document.querySelector(".he-score").textContent`)));
    });
    await check(`[${w}] settings kept after reload; no sideways scroll`, async () => {
      await b.goto(host + "/practice/harmony-ear.html"); await wait(800);
      assert.strictEqual(await b.eval(`JSON.parse(localStorage.getItem("harmonyEar.v1")).voices`), 3);
      assert(await b.eval(`document.documentElement.scrollWidth<=innerWidth+1`), "scrollWidth " + await b.eval(`document.documentElement.scrollWidth`));
    });
    await b.close();
  }
  server.close(); console.log(failed ? failed + " failed" : "all ok"); process.exit(failed ? 1 : 0);
})();
