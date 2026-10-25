// Style Arranger page (_site/tools/arranger.html) in headless Chrome: it draws, chords are recognised from the keys, the
// score converts with the chord, Start plays with no error, changing Main goes through its Fill In, Ending stops.
// Run: (render or preview tools/arranger.qmd) && node tests/arranger/arranger.cdp.js [--shots <dir>]   SITE=<dir> for a render elsewhere.
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE ? path.resolve(process.env.SITE) : path.join(ROOT, "_site");
const { launch } = require(path.join(ROOT, "tests/band/lead/cdp.js"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg" };
const shotsAt = process.argv.indexOf("--shots"), SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
const server = http.createServer((req, res) => {
  const f = path.join(SITE, decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(SITE)) { res.writeHead(404); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const b = await launch({ width: 1300, height: 1000 });
  let failed = 0; const check = (name, fn) => Promise.resolve().then(fn).then(() => console.log("ok  ", name), e => { failed++; console.log("FAIL", name, "\n    ", e.message); });
  await b.goto(`http://127.0.0.1:${server.address().port}/tools/arranger.html`); await wait(900);
  await b.eval(`window.__errs=[];window.addEventListener("error",function(e){__errs.push(e.message)});`);
  const S = "ArrangerPage.state";
  await check("draws: 7 section buttons, 8 channel strips, a 24-key chord area, a score", async () => {
    const r = await b.eval(`({ secs: document.querySelectorAll(".ar-sec").length, strips: document.querySelectorAll(".ar-strip").length, keys: document.querySelectorAll(".ar-piano .pk").length, staves: document.querySelectorAll(".ar-staff svg").length })`);
    assert.deepStrictEqual([r.secs, r.strips, r.keys], [7, 8, 24]); assert(r.staves >= 2, "staves " + r.staves);
  });
  await check("clicking keys names the chord (Fingered and Single Finger)", async () => {
    const click = ms => b.eval(`(function(){var ks=document.querySelectorAll(".ar-piano .pk");${JSON.stringify(ms)}.forEach(function(m){ks[m-36].click()})})()`);
    await click([45, 48, 52, 55]); assert.strictEqual(await b.eval(`document.querySelector(".ar-chord").textContent`), "Am7");
    await click([45, 48, 52, 55]); await click([46, 47, 48]); assert.strictEqual(await b.eval(`document.querySelector(".ar-chord").textContent`), "Cm7", "Single Finger B♭ B C (Multi)");
    await click([46, 47, 48]);
  });
  await check("the score follows the chord: as written vs as it sounds", async () => {
    await b.eval(`ArrangerPage.setHeld([43,47,50,53])`); await wait(100);
    const sounds = await b.eval(`document.querySelector(".ar-staves").textContent`);
    assert(/over G7/.test(sounds), sounds.slice(0, 120));
    const sel = `Array.from(document.querySelectorAll("#ar-score select"))[1]`;
    await b.eval(`(function(){var s=${sel};s.value="written";s.dispatchEvent(new Event("change"))})()`);
    assert(/over CM7/.test(await b.eval(`document.querySelector(".ar-staves").textContent`)));
    await b.eval(`(function(){var s=${sel};s.value="sounds";s.dispatchEvent(new Event("change"))})()`);
  });
  await check("Start plays Main A, lamps light, no errors", async () => {
    await b.eval(`ArrangerPage.start()`); await wait(1800);
    const r = await b.eval(`({ sec: ${S}.sec, lit: document.querySelectorAll(".ar-lamp.now").length, on: document.querySelector(".ar-sec.on").textContent })`);
    assert.strictEqual(r.sec, "Main A"); assert(r.lit >= 1, "lamps " + r.lit);
    const errs = await b.eval(`__errs.splice(0)`); assert(!errs.length, errs.join("; "));
  });
  await check("Main B goes through Fill In B, then plays Main B", async () => {
    await b.eval(`ArrangerPage.press("Main B")`);
    let seen = []; for (let i = 0; i < 40; i++) { const s = await b.eval(`${S}.sec`); if (seen[seen.length - 1] !== s) seen.push(s); if (s === "Main B") break; await wait(150); }
    assert.deepStrictEqual(seen.slice(-2), ["Fill In B", "Main B"], seen.join(" → "));
  });
  await check("a chord change while playing keeps going (RTR)", async () => {
    await b.eval(`ArrangerPage.setHeld([41,45,48])`); await wait(600);
    assert.strictEqual(await b.eval(`${S}.chord.name`), "F"); const errs = await b.eval(`__errs.splice(0)`); assert(!errs.length, errs.join("; "));
  });
  await check("Ending plays and then stops", async () => {
    await b.eval(`${S}.bpm = 200; ArrangerPage.press("Ending A")`);
    let seen = []; for (let i = 0; i < 60; i++) { const s = await b.eval(`${S}.playing ? ${S}.sec : "stopped"`); if (seen[seen.length - 1] !== s) seen.push(s); if (s === "stopped") break; await wait(150); }
    assert.deepStrictEqual(seen.slice(-2), ["Ending A", "stopped"], seen.join(" → "));
  });
  await check("Intro, when armed, plays before the Main", async () => {
    await b.eval(`ArrangerPage.press("Intro A"); ArrangerPage.start()`); await wait(200);
    assert.strictEqual(await b.eval(`${S}.sec`), "Intro A");
    await b.eval(`ArrangerPage.stop()`);
  });
  await check("every style and every section draws its score", async () => {
    const r = await b.eval(`(function(){var out=[];var ss=document.querySelector("#ar-top select"),sec=document.querySelector("#ar-score select");
      Array.from(ss.options).forEach(function(o){ss.value=o.value;ss.dispatchEvent(new Event("change"));
        Array.from(sec.options).forEach(function(s){sec.value=s.value;sec.dispatchEvent(new Event("change"));out.push(o.value+"/"+s.value+":"+document.querySelectorAll(".ar-staff svg").length)})});return out})()`);
    const empty = r.filter(x => /:0$/.test(x)); assert(!empty.length, "no staves: " + empty.join(", "));
    const errs = await b.eval(`__errs.splice(0)`); assert(!errs.length, errs.join("; "));
  });
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await b.eval(`document.querySelector("#ar-top select").value="pop8";document.querySelector("#ar-top select").dispatchEvent(new Event("change"));ArrangerPage.setHeld([45,48,52,55])`); await wait(300);
    await b.shot(path.join(SHOTS, "arranger.png")); await b.resize(390, 900); await wait(300); await b.shot(path.join(SHOTS, "arranger-phone.png")); }
  await b.close(); server.close();
  console.log(failed ? failed + " FAILED" : "ARRANGER OK"); process.exit(failed ? 1 : 0);
})();
