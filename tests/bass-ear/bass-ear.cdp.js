// Bass Lines by Ear page (rendered _site/practice/bass-ear.html) in headless Chrome. Sound is stubbed (records notes), so no samples.
// Each level and style: Start sounds melody + bass, then bass; the right answer scores, the wrong one shows what changed; phone width has no sideways scroll.
// Run: quarto render practice/bass-ear.qmd && node tests/bass-ear/bass-ear.cdp.js
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
    await b.goto(host + "/practice/bass-ear.html"); await wait(800);
    await b.eval(`localStorage.removeItem("bassEar.v1")`); await b.goto(host + "/practice/bass-ear.html"); await wait(800);
    await b.eval(`window.__notes=[];BandSounds.create=function(){return{load:function(){return Promise.resolve()},play:function(s,o,w){__notes.push([s,o.midi,w])},stopAll:function(){}}}`);
    const setSel = (label, v) => b.eval(`(function(){var l=[].find.call(document.querySelectorAll("#bass-ear label"),x=>x.firstChild.textContent==${JSON.stringify(label)});var s=l.querySelector("select");s.value=${JSON.stringify(String(v))};s.dispatchEvent(new Event("change"))})()`);
    await setSel("Tempo", 132); await setSel("Bars", 2);
    const cases = [["jazz", "1"], ["mlt", "2"], ["rock", "3"], ["classical", "4"], ["rock", "5"], ["classical", "6"], ["jazz", "7"], ["jazz", "8"], ["mlt", "9"]];
    for (const [st, lv] of cases) {
      await check(`[${w}] ${st} level ${lv}: sounds, right then wrong`, async () => {
        await setSel("Style", st); await setSel("Level", lv);
        await b.eval(`__notes=[];document.querySelector("#bass-ear .be-go").click()`); await wait(200);
        const insts = await b.eval(`JSON.stringify([...new Set(__notes.map(x=>x[0]))])`);
        assert(/bass/.test(insts) && /piano/.test(insts), "melody and bass sounded: " + insts);
        const same = await b.eval(`BassEar._cur().q.same`);
        await b.eval(`document.querySelectorAll("#bass-ear .be-choice")[${same ? 0 : 1}].click()`);
        assert(/^Right/.test(await b.eval(`document.querySelector("#bass-ear .be-result").textContent`)));
        await b.eval(`document.querySelector("#bass-ear .be-result").nextElementSibling.querySelector(".be-go").click()`); await wait(100);
        const s2 = await b.eval(`BassEar._cur().q.same`);
        await b.eval(`document.querySelectorAll("#bass-ear .be-choice")[${s2 ? 1 : 0}].click()`);
        const r = await b.eval(`document.querySelector("#bass-ear .be-result").textContent`);
        assert(/^Not quite/.test(r), r); if (!s2) assert(/bar \d/.test(r), "says where: " + r);
      });
    }
    await check(`[${w}] Bass on "Only on chord changes" gives one note a chord`, async () => {
      await setSel("Style", "rock"); await setSel("Level", "4"); await setSel("Bass on", "changes");
      await b.eval(`document.querySelector("#bass-ear .be-go").click()`); await wait(100);
      const ok = await b.eval(`(function(){var q=BassEar._cur().q;return q.a.every(n=>n.kind==="anchor"||n.kind==="inversion")})()`);
      assert(ok); await setSel("Bass on", "level");
    });
    await check(`[${w}] notation: first line before answering, second after; ▼ on a difference`, async () => {
      await setSel("Style", "jazz"); await setSel("Level", "7"); await setSel("Bars", 4);
      await b.eval(`document.querySelector("#bass-ear .be-go").click()`); await wait(100);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#bass-ear .be-nota svg").length`), 0, "off by default");
      await b.eval(`document.querySelector("#bass-ear .be-nota-btn").click()`); await wait(100);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#bass-ear .be-nota svg").length`), 1);
      const same = await b.eval(`BassEar._cur().q.same`);
      await b.eval(`document.querySelectorAll("#bass-ear .be-choice")[0].click()`); await wait(100);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#bass-ear .be-nota svg").length`), 2);
      assert.strictEqual(await b.eval(`/▼/.test(document.querySelectorAll("#bass-ear .be-nota svg")[1].textContent)`), !same);
      await b.eval(`document.querySelector("#bass-ear .be-nota-btn").click()`);
    });
    if (w > 1000) await check("abcjs draws every tune without warnings", async () => {
      const bad = await b.eval(`(function(){var bad=[],d=document.createElement("div");BassEarTunes.forEach(function(t,k){
        var q=BassEar.question(BassEar.level(String(1+k%9)),{tune:t.id,style:["jazz","rock","mlt","classical"][k%4],bars:8});
        var r=ABCJS.renderAbc(d,BassEar.abc(t,q.b,{bars:8,melody:true}))[0]; if(r.warnings&&r.warnings.length)bad.push(t.id+": "+r.warnings[0]);});return JSON.stringify(bad.slice(0,5))+" "+bad.length})()`);
      assert(/ 0$/.test(bad), bad);
    });
    await check(`[${w}] no sideways scroll`, async () => assert(await b.eval(`document.documentElement.scrollWidth<=innerWidth+1`)));
    await b.close();
  }
  server.close(); console.log(failed ? failed + " failed" : "all passed"); process.exit(failed ? 1 : 0);
})();
