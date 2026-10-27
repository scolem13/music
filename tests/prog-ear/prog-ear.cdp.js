// Odd Progression Out page (rendered _site/practice/prog-ear.html) in headless Chrome. AbcPlay.play is stubbed (records each call).
// Band levels: Start plays three clips in three styles (drums on/off honoured); right answer scores; notation draws three scores.
// Melody levels: three clips on instruments. Phone width has no sideways scroll.
// Run: quarto render practice/prog-ear.qmd && node tests/prog-ear/prog-ear.cdp.js
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
    await b.goto(host + "/practice/prog-ear.html"); await wait(800);
    await b.eval(`localStorage.removeItem("progEar.v1")`); await b.goto(host + "/practice/prog-ear.html"); await wait(800);
    await b.eval(`window.__plays=[];AbcPlay.play=function(v,o){__plays.push(o);return{stop(){},done:Promise.resolve()}};AbcPlay.stop=function(){}`);
    const setSel = (label, v) => b.eval(`(function(){var l=[].find.call(document.querySelectorAll("#prog-ear label"),x=>x.firstChild.textContent==${JSON.stringify(label)});var s=l.querySelector("select");s.value=${JSON.stringify(String(v))};s.dispatchEvent(new Event("change"))})()`);
    const cases = [["band", "1", "on", "major"], ["band", "3", "off", "dorian"], ["band", "5", "on", "minor"], ["band", "7", "off", "any"], ["band", "5", "on", "major", "tune"], ["band", "5", "off", "major", "borrowed"], ["melody", "m1", null, "mixolydian"], ["melody", "m4", null, "phrygian"]];
    for (const [mode, lv, drums, ton, extra] of cases) {
      await check(`[${w}] ${mode} ${ton} level ${lv}${extra ? " " + extra : ""}: three clips, right answer, notation`, async () => {
        await setSel("Hear it as", mode); await setSel("Borrowed chords", extra === "borrowed" ? "on" : "off"); if (mode === "band") await setSel("A tune on top", extra === "tune" ? "on" : "off"); await setSel("Tonality", ton); await setSel("Level", lv); if (drums) await setSel("Drums", drums);
        await setSel("Notation", "on");
        await b.eval(`__plays=[];document.querySelector("#prog-ear .pe-go").click()`); await wait(3500);
        const plays = JSON.parse(await b.eval(`JSON.stringify(__plays)`));
        assert.strictEqual(plays.length, 3, "three clips played: " + plays.length);
        if (mode === "band") { assert.strictEqual(new Set(plays.map(p => p.style)).size, 3, "three styles"); plays.forEach(p => { assert.strictEqual(p.drums, drums === "on"); assert.strictEqual(p.melody, extra === "tune"); assert(/"[A-G]/.test(p.abc)); });
          const q = JSON.parse(await b.eval(`JSON.stringify({b:ProgEar._cur().q.borrowed,s:ProgEar._cur().q.shared,k:ProgEar._cur().q.diff.kind})`));
          assert.strictEqual(q.b, extra === "borrowed"); assert.strictEqual(q.s, extra === "tune");
          if (extra === "borrowed") assert(q.k === "mode" || q.k === "chrom", q.k); else if (lv === "5" && ton === "major") assert(q.k !== "mode" && q.k !== "chrom", q.k);
          if (extra === "tune") assert.strictEqual(new Set(plays.map(p => p.abc.replace(/"[^"]*"/g, ""))).size, 1, "the same tune in all three"); }
        else plays.forEach(p => assert(p.sound && !p.abc, "melody alone on " + p.sound));
        assert.strictEqual(await b.eval(`document.querySelectorAll("#prog-ear .pe-clip svg").length`), 3, "three scores");
        assert.strictEqual(await b.eval(`/"/.test(document.querySelector("#prog-ear .pe-notes").textContent) ? 1 : 0`), 0);
        if (ton !== "any") assert.strictEqual(await b.eval(`ProgEar._cur().q.tonality`), ton);
        const odd = await b.eval(`ProgEar._cur().q.oddIndex`);
        await b.eval(`document.querySelectorAll("#prog-ear .pe-choice")[${odd}].click()`);
        assert(/^Right/.test(await b.eval(`document.querySelector("#prog-ear .pe-result").textContent`)));
        assert(/became/.test(await b.eval(`document.querySelector("#prog-ear .pe-result").textContent`)));
        assert.strictEqual(await b.eval(`document.querySelectorAll("#prog-ear .pe-clip svg").length`), 3, "redrawn with chord symbols");
        const sw = await b.eval(`document.documentElement.scrollWidth`); assert(sw <= w + 1, "no sideways scroll: " + sw);
        await b.eval(`document.querySelector("#prog-ear .pe-result").nextElementSibling.querySelector(".pe-go").click()`); await wait(300);
        const odd2 = await b.eval(`ProgEar._cur().q.oddIndex`);
        await b.eval(`document.querySelectorAll("#prog-ear .pe-choice")[${(odd2 + 1) % 3}].click()`);
        assert(/^Not quite/.test(await b.eval(`document.querySelector("#prog-ear .pe-result").textContent`)));
      });
    }
    await check(`[${w}] options in three groups; Busyness reaches the band`, async () => {
      if (await b.eval(`!!document.querySelector("#prog-ear")`)) await setSel("Hear it as", "band");
      await b.eval(`(function(){if(window.BandCatalog)return;var s=document.createElement("script");s.src="/apps/shared/band/catalog.js";document.head.appendChild(s)})()`); await wait(800);
      const missing = await b.eval(`(function(){var C=window.BandCatalog;if(!C)return "no catalogue";var m=[];["swing","rock"].forEach(function(st){["less","calm"].forEach(function(bz){var o=ProgEar.busyOpts(st,bz);[["bass",o.bassFeel],["comp",o.compRhythm],["drums",o.groove]].forEach(function(x){if(x[1]&&!C.byId(C[x[0]],x[1]))m.push(x.join(":"))})})});return m.join(",")})()`);
      assert.strictEqual(missing, "", "parts missing from the catalogue: " + missing);
      const legends = await b.eval(`JSON.stringify([...document.querySelectorAll("#prog-ear .pe-group legend")].map(x=>x.textContent))`);
      assert.strictEqual(legends, JSON.stringify(["The question", "The band", "Notation"]));
      for (const [busy, want] of [["full", null], ["less", "none"], ["calm", "pad"]]) {
        await setSel("Busyness", busy); await b.eval(`__plays=[];document.querySelector("#prog-ear .pe-go").click()`); await wait(2500);
        const p = JSON.parse(await b.eval(`JSON.stringify(__plays[0]||null)`)); assert(p, "played");
        if (!want) assert(!p.bandOpts, "style as written"); else if (busy === "less") assert.strictEqual(p.bandOpts.fills, "none"); else assert.strictEqual(p.bandOpts.compRhythm, "pad");
      }
      await setSel("Busyness", "full");
    });
    await b.close();
  }
  server.close(); console.log(failed ? failed + " failed" : "all passed"); process.exit(failed ? 1 : 0);
})();
