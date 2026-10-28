// Blues Changes by Ear page (rendered _site/practice/blues-ear.html) in headless Chrome. AbcPlay.play is stubbed (records each call).
// Major and minor levels: Start plays three 12-bar choruses in three styles (drums, tune honoured); right and wrong answers; notation; phone width.
// Run: quarto render practice/blues-ear.qmd && node tests/blues-ear/blues-ear.cdp.js
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || path.join(ROOT, "_site");
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
    await b.goto(host + "/practice/blues-ear.html"); await wait(800);
    await b.eval(`localStorage.removeItem("bluesEar.v1")`); await b.goto(host + "/practice/blues-ear.html"); await wait(800);
    await b.eval(`window.__plays=[];AbcPlay.play=function(v,o){__plays.push(o);return{stop(){},done:Promise.resolve()}};AbcPlay.stop=function(){}`);
    const setSel = (label, v) => b.eval(`(function(){var l=[].find.call(document.querySelectorAll("#blues-ear label"),x=>x.firstChild.textContent==${JSON.stringify(label)});var s=l.querySelector("select");s.value=${JSON.stringify(String(v))};s.dispatchEvent(new Event("change"))})()`);
    const cases = [["major", "1", "on", false, "phrase"], ["major", "3", "off", true, "random"], ["major", "5", "on", false, "all"], ["major", "8", "on", true, "custom"], ["minor", "m2", "off", false, "phrase"]];
    for (const [bl, lv, drums, tune, bars] of cases) {
      await check(`[${w}] ${bl} level ${lv} bars ${bars}${tune ? " with a tune" : ""}: three choruses, right, wrong, notation`, async () => {
        await setSel("Blues", bl); await setSel("Level", lv); await setSel("Drums", drums); await setSel("A tune on top", tune ? "on" : "off"); await setSel("Notation", "on"); await setSel("Bars", bars);
        if (bars === "custom") await b.eval(`(function(){var i=document.querySelectorAll("#blues-ear .pe-range input");i[0].value="3";i[0].dispatchEvent(new Event("change"));i[1].value="6";i[1].dispatchEvent(new Event("change"))})()`);
        await b.eval(`__plays=[];document.querySelector("#blues-ear .pe-go").click()`); await wait(3500);
        const plays = JSON.parse(await b.eval(`JSON.stringify(__plays)`));
        assert.strictEqual(plays.length, 3, "three played"); assert.strictEqual(new Set(plays.map(p => p.style)).size, 3);
        plays.forEach(p => { assert.strictEqual(p.drums, drums === "on"); assert.strictEqual(p.melody, tune); });
        const want = bars === "all" ? 12 : 4; plays.forEach(p => assert.strictEqual(p.abc.split("|").length, want + 1, want + " bars"));
        const qb = JSON.parse(await b.eval(`JSON.stringify(ProgEar._cur().q.bars)`));
        if (bars === "custom") assert.deepStrictEqual(qb, [3, 6]); if (bars === "phrase") assert([1, 5, 9].includes(qb[0]));
        assert.strictEqual(await b.eval(`document.querySelectorAll("#blues-ear .pe-clip svg").length`), 3);
        const odd = await b.eval(`ProgEar._cur().q.oddIndex`);
        await b.eval(`document.querySelectorAll("#blues-ear .pe-choice")[${odd}].click()`);
        const t = await b.eval(`document.querySelector("#blues-ear .pe-result").textContent`);
        assert(/^Right/.test(t) && /Bars? \d/.test(t), t); if (bl === "minor") assert(/i7|iv7/.test(t));
        const sw = await b.eval(`document.documentElement.scrollWidth`); assert(sw <= w + 1, "no sideways scroll: " + sw);
        await b.eval(`document.querySelector("#blues-ear .pe-result").nextElementSibling.querySelector(".pe-go").click()`); await wait(300);
        const o2 = await b.eval(`ProgEar._cur().q.oddIndex`);
        await b.eval(`document.querySelectorAll("#blues-ear .pe-choice")[${(o2 + 1) % 3}].click()`);
        assert(/^Not quite/.test(await b.eval(`document.querySelector("#blues-ear .pe-result").textContent`)));
      });
    }
    await check(`[${w}] bars I choose with no change inside: says so`, async () => {
      await setSel("Blues", "major"); await setSel("Level", "5"); await setSel("Bars", "custom");
      await b.eval(`(function(){var i=document.querySelectorAll("#blues-ear .pe-range input");i[0].value="1";i[0].dispatchEvent(new Event("change"));i[1].value="4";i[1].dispatchEvent(new Event("change"))})()`);
      await b.eval(`document.querySelector("#blues-ear .pe-go").click()`); await wait(200);
      assert(/No change at this level falls in bars 1–4/.test(await b.eval(`document.querySelector("#blues-ear .pe-status").textContent`)));
      await setSel("Bars", "phrase");
    });
    await check(`[${w}] options in three groups; Busyness reaches the band`, async () => {
      if (await b.eval(`!!document.querySelector("#prog-ear")`)) await setSel("Hear it as", "band");
      await b.eval(`(function(){if(window.BandCatalog)return;var s=document.createElement("script");s.src="/apps/shared/band/catalog.js";document.head.appendChild(s)})()`); await wait(800);
      const missing = await b.eval(`(function(){var C=window.BandCatalog;if(!C)return "no catalogue";var m=[];["swing","rock"].forEach(function(st){["less","calm"].forEach(function(bz){var o=ProgEar.busyOpts(st,bz);[["bass",o.bassFeel],["comp",o.compRhythm],["drums",o.groove]].forEach(function(x){if(x[1]&&!C.byId(C[x[0]],x[1]))m.push(x.join(":"))})})});return m.join(",")})()`);
      assert.strictEqual(missing, "", "parts missing from the catalogue: " + missing);
      const legends = await b.eval(`JSON.stringify([...document.querySelectorAll("#blues-ear .pe-group legend")].map(x=>x.textContent))`);
      assert.strictEqual(legends, JSON.stringify(["The question", "The band", "Notation"]));
      for (const [busy, want] of [["full", null], ["less", "none"], ["calm", "pad"]]) {
        await setSel("Busyness", busy); await b.eval(`__plays=[];document.querySelector("#blues-ear .pe-go").click()`); await wait(2500);
        const p = JSON.parse(await b.eval(`JSON.stringify(__plays[0]||null)`)); assert(p, "played");
        assert(p.bandOpts && p.bandOpts.cutEnd, "cutEnd: no ending"); if (!want) assert.deepStrictEqual(Object.keys(p.bandOpts), ["cutEnd"], "style as written"); else if (busy === "less") assert.strictEqual(p.bandOpts.fills, "none"); else assert.strictEqual(p.bandOpts.compRhythm, "pad");
      }
      await setSel("Busyness", "full");
    });
    await b.close();
  }
  server.close(); console.log(failed ? failed + " failed" : "all passed"); process.exit(failed ? 1 : 0);
})();
