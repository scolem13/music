// Hear, Compare, Translate (rendered _site/practice/audiation.html) in headless Chrome. AbcPlay is replaced by a recorder that
// ends each tune at once, so the test sees exactly what would be heard, in order.
// Run: quarto render practice/audiation.qmd && node tests/patterns/audiation.cdp.js
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
  // record each tune: its sounding pitches (MIDI) and qpm; end it right away
  const spy = `window.__plays=[];AbcPlay.stop=function(){};AbcPlay.play=function(v,o){var ps=[];v.lines.forEach(function(l){(l.staff||[]).forEach(function(s){s.voices.forEach(function(vv){vv.forEach(function(e){if(e.el_type==="note"&&e.pitches&&e.duration>0)ps.push(e.pitches[0].pitch);});});});});__plays.push({n:ps.length,qpm:o.qpm,sound:o.sound});setTimeout(function(){o.onEnd&&o.onEnd();},5);return {stop:function(){}};};`;
  // also record the MIDI pitches of each tune: the ABC text handed to renderAbc is read back with AbcEvents (staff positions are not pitches)
  const spy2 = `(function(){var ra=ABCJS.renderAbc,last="";ABCJS.renderAbc=function(d,abc){last=abc;return ra.apply(this,arguments);};var pl=AbcPlay.play;AbcPlay.play=function(v,o){var r=pl.apply(this,arguments),n=__plays[__plays.length-1];try{n.midis=AbcEvents.fromAbc(last).sounding.map(function(e){return e.pitches[0].midi;});}catch(e){n.midis=[];}return r;};})();`;
  const until = async (b, js, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await b.eval(js)) return; await wait(100); } throw new Error("timed out: " + js); };
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const b = await launch({ width: w, height: h }); await b.resize(w, h);
    await b.goto(host + "/practice/audiation.html"); await wait(1500); await b.eval(spy); await b.eval(spy2);
    await check(`[${w}] three panels drawn, sections fold`, async () => {
      for (const id of ["au-ps", "au-sd", "au-tr"]) assert.ok(await b.eval(`!!document.querySelector("#${id} .au-grid select")`), id);
      assert.ok(await b.eval(`document.querySelectorAll("section.sf").length >= 4`));
    });
    await check(`[${w}] partial synthesis: no tonal sequence, two series of 3, then a taught answer`, async () => {
      await b.eval(`__plays=[];document.querySelector("#au-ps .au-go").click()`);
      await until(b, `/Which/.test(document.querySelector("#au-ps .au-status").textContent)`);
      const p = JSON.parse(await b.eval(`JSON.stringify(__plays)`));
      assert.strictEqual(p.length, 6, "6 patterns, got " + p.length);
      assert.ok(p.every(x => x.n >= 2 && x.n <= 5), "pattern lengths " + p.map(x => x.n));      // no 8-note tonal sequence
      await b.eval(`[].forEach.call(document.querySelectorAll("#au-ps .au-row"),function(r){r.querySelector(".au-choice").click();})`);
      const ex = await b.eval(`document.querySelector("#au-ps .au-explain").textContent`);
      assert.ok(/resting tone (DO|LA)/.test(ex) && /tonic pattern/.test(ex), ex);
      assert.ok(/of 2 right/.test(await b.eval(`document.querySelector("#au-ps .au-score").textContent`)));
    });
    await check(`[${w}] partial synthesis in rhythm: duple/triple series at one macrobeat tempo`, async () => {
      await b.eval(`var s=document.querySelector("#au-ps .au-content");s.value="dt";__plays=[];document.querySelector("#au-ps .au-go").click()`);
      await until(b, `/Which/.test(document.querySelector("#au-ps .au-status").textContent)`);
      const p = JSON.parse(await b.eval(`JSON.stringify(__plays)`));
      assert.ok(p.length === 6, "6 rhythm patterns, got " + p.length);
      const qs = [...new Set(p.map(x => x.qpm))]; assert.ok(qs.every(q => q === 68 || q === 101), "qpm " + qs);   // 90*0.75 duple, *1.5 triple
      assert.deepStrictEqual(await b.eval(`[].map.call(document.querySelectorAll("#au-ps .au-row")[0].querySelectorAll(".au-choice"),function(x){return x.textContent})`), ["Duple", "Triple"]);
    });
    await check(`[${w}] same or different: tonality first, then two patterns, buttons open after`, async () => {
      await b.eval(`__plays=[];document.querySelector("#au-sd .au-go").click()`);
      await until(b, `!document.querySelector("#au-sd .au-choice").disabled`);
      const p = JSON.parse(await b.eval(`JSON.stringify(__plays)`));
      assert.strictEqual(p.length, 3); assert.strictEqual(p[0].n, 8, "tonal sequence first");
      await b.eval(`document.querySelector("#au-sd .au-choice").click()`);
      assert.ok(/were (the )?(same|different)/.test(await b.eval(`document.querySelector("#au-sd .au-explain").textContent`)));
    });
    await check(`[${w}] translate: locked until verbal association is ticked; answer shown; two misses send you back`, async () => {
      assert.ok(await b.eval(`document.querySelector("#au-tr .au-go").disabled`));
      assert.ok(/Gordon, p\. 108/.test(await b.eval(`document.querySelector("#au-tr .au-status").textContent`)));
      await b.eval(`var c=document.querySelector("#au-tr .au-ready");c.checked=true;c.dispatchEvent(new Event("change"))`);
      for (let k = 0; k < 2; k++) {
        await b.eval(`__plays=[];document.querySelector("#au-tr .au-go").click()`);
        await until(b, `/Breathe/.test(document.querySelector("#au-tr .au-status").textContent)`);
        const p = JSON.parse(await b.eval(`JSON.stringify(__plays)`)); assert.strictEqual(p[0].n, 8); assert.strictEqual(p.length, 2);
        await b.eval(`[].find.call(document.querySelectorAll("#au-tr .au-bar button"),function(x){return /Show/.test(x.textContent)}).click()`);
        assert.ok(/^(DO|RE|MI|FA|SO|LA|TI|SI)( |$)/.test(await b.eval(`document.querySelector("#au-tr .au-solf").textContent`)));
        await b.eval(`[].find.call(document.querySelectorAll("#au-tr .au-choice"),function(x){return /Not yet/.test(x.textContent)}).click()`);
      }
      assert.ok(/Go back to Verbal Association/.test(await b.eval(`document.querySelector("#au-tr .au-explain").textContent`)));
    });
    await check(`[${w}] translate rhythm: syllables shown`, async () => {
      await b.eval(`var s=document.querySelector("#au-tr .au-content");s.value="triple-d";document.querySelector("#au-tr .au-go").click()`);
      await until(b, `/Breathe/.test(document.querySelector("#au-tr .au-status").textContent)`);
      await b.eval(`[].find.call(document.querySelectorAll("#au-tr .au-bar button"),function(x){return /Show/.test(x.textContent)}).click()`);
      assert.ok(/^Du( (Ta|Da|Di|Du|\|))+/.test(await b.eval(`document.querySelector("#au-tr .au-solf").textContent`)));
    });
    await check(`[${w}] range: baritone preset keeps every played pitch inside A2-E4 in all three panels, and the page shares one setting`, async () => {
      await b.eval(`var s=document.querySelector("#au-ps .au-rpreset");s.value="baritone";s.dispatchEvent(new Event("change"))`);
      assert.strictEqual(await b.eval(`document.querySelector("#au-sd .au-rlow").value+","+document.querySelector("#au-tr .au-rhigh").value`), "45,64");
      const inside = async (what) => { const p = JSON.parse(await b.eval(`JSON.stringify(__plays)`)); assert.ok(p.length && p.every(x => x.midis && x.midis.length), what + " recorded");
        p.forEach(x => x.midis.forEach(m => assert.ok(m >= 45 && m <= 64, what + " pitch " + m))); };
      for (const key of ["random", "D", "G"]) {
        await b.eval(`document.querySelector("#au-ps .au-content").value="mm";document.querySelector("#au-ps .au-key").value="${key}";__plays=[];document.querySelector("#au-ps .au-go").click()`);
        await until(b, `/Which/.test(document.querySelector("#au-ps .au-status").textContent)`); await inside("partial synthesis " + key);
      }
      await b.eval(`document.querySelector("#au-ps .au-content").value="dt";__plays=[];document.querySelector("#au-ps .au-go").click()`);
      await until(b, `/Which/.test(document.querySelector("#au-ps .au-status").textContent)`); await inside("partial synthesis rhythm");
      await b.eval(`document.querySelector("#au-sd .au-key").value="F";__plays=[];document.querySelector("#au-sd .au-go").click()`);
      await until(b, `!document.querySelector("#au-sd .au-choice").disabled`); await inside("same/different");
      await b.eval(`__plays=[];document.querySelector("#au-tr .au-go").click()`);
      await until(b, `/Breathe/.test(document.querySelector("#au-tr .au-status").textContent)`); await inside("translate");
      // a range too narrow for the patterns says so in the panel
      await b.eval(`var l=document.querySelector("#au-sd .au-rhigh");l.value="50";l.dispatchEvent(new Event("change"));document.querySelector("#au-sd .au-go").click()`);
      assert.ok(/narrower/.test(await b.eval(`document.querySelector("#au-sd .au-rangewarn").textContent`)));
      await b.eval(`var s=document.querySelector("#au-ps .au-rpreset");s.value="treble";s.dispatchEvent(new Event("change"))`);
    });
    await check(`[${w}] read it: familiar pattern drawn stemless with a key signature; tonality set up first; hear + syllables`, async () => {
      await b.eval(`__plays=[];document.querySelector("#au-gs .au-go").click()`);
      await wait(400);
      assert.ok(await b.eval(`document.querySelectorAll("#au-gs .au-paper .abcjs-notehead").length >= 2`), "notes drawn");
      assert.ok(await b.eval(`!document.querySelector("#au-gs .au-paper .abcjs-stem")`), "no stems");
      assert.ok(await b.eval(`!document.querySelector("#au-gs .au-paper .abcjs-lyric")`), "no syllables on the page");
      await until(b, `__plays.length >= 1`); assert.strictEqual(JSON.parse(await b.eval(`JSON.stringify(__plays)`))[0].n, 8);
      await b.eval(`[].find.call(document.querySelectorAll("#au-gs .au-bar button"),function(x){return /Hear it/.test(x.textContent)}).click()`);
      await b.eval(`[].find.call(document.querySelectorAll("#au-gs .au-bar button"),function(x){return /syllables/.test(x.textContent)}).click()`);
      assert.ok(/^(DO|MI|SO|TI|RE|FA)( |$)/.test(await b.eval(`document.querySelector("#au-gs .au-solf").textContent`)));
    });
    await check(`[${w}] read it: unfamiliar needs the familiar box; "name it" sets nothing up and asks`, async () => {
      await b.eval(`var f=document.querySelector("#au-gs .au-fam");f.value="u";__plays=[];document.querySelector("#au-gs .au-go").click()`);
      assert.ok(/familiar ones yourself/.test(await b.eval(`document.querySelector("#au-gs .au-status").textContent`)));
      await b.eval(`document.querySelector("#au-gs .au-fam").value="f";document.querySelector("#au-gs .au-content").value="mm";__plays=[];document.querySelector("#au-gs .au-go").click()`);
      await wait(500);
      assert.strictEqual(await b.eval(`__plays.length`), 0, "nothing played before naming");
      assert.deepStrictEqual(await b.eval(`[].map.call(document.querySelectorAll("#au-gs .au-row")[0].querySelectorAll(".au-choice"),function(x){return x.textContent})`), ["Major", "Minor"]);
    });
    await check(`[${w}] answer with your own: context then one pattern; examples fit the rule`, async () => {
      await b.eval(`document.querySelector("#au-ci .au-task").value="swap";__plays=[];document.querySelector("#au-ci .au-go").click()`);
      await until(b, `!document.querySelector("#au-ci .au-choice").disabled`);
      const p = JSON.parse(await b.eval(`JSON.stringify(__plays)`)); assert.strictEqual(p.length, 2); assert.strictEqual(p[0].n, 8);
      await b.eval(`[].find.call(document.querySelectorAll("#au-ci .au-bar button"),function(x){return /Show what fits/.test(x.textContent)}).click()`);
      const ex = await b.eval(`document.querySelector("#au-ci .au-explain").textContent`);
      const given = /\((tonic|dominant)\)/.exec(ex); assert.ok(given, ex);
      assert.ok(/Answers from the set that fit/.test(ex));
      await b.eval(`document.querySelector("#au-ci .au-content").value="triple";document.querySelector("#au-ci .au-task").value="division";__plays=[];document.querySelector("#au-ci .au-go").click()`);
      await until(b, `!document.querySelector("#au-ci .au-choice").disabled`);
      await b.eval(`[].find.call(document.querySelectorAll("#au-ci .au-bar button"),function(x){return /Show what fits/.test(x.textContent)}).click()`);
      const fitsTxt = await b.eval(`document.querySelectorAll("#au-ci .au-explain p")[1].textContent`);
      assert.ok(fitsTxt.split(" · ").every(x => /Ta/.test(x)), fitsTxt);
    });
    await check(`[${w}] no sideways scroll`, async () => {
      assert.ok(await b.eval(`document.documentElement.scrollWidth <= window.innerWidth + 1`));
    });
    await b.close();
  }
  server.close();
  console.log(failed ? `AUDIATION PAGE: ${failed} FAILED` : "AUDIATION PAGE OK");
  process.exit(failed ? 1 : 0);
})();
