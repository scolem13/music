// Electric bass widgets in headless Chrome (explorer, quiz, open strings), on a harness page built here (no Quarto render needed).
// Run: node tests/ebass/ebass.cdp.js [--shots <dir>]   Also checks lessons/electric-bass.html in _site if it has been rendered.
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../.."), SITE = path.join(ROOT, "_site");
const { launch } = require(path.join(ROOT, "tests/band/lead/cdp.js"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const shotsAt = process.argv.indexOf("--shots"), SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
const HARNESS = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><link rel=stylesheet href=/apps/shared/ebass/ebass.css>
<script src=/apps/shared/abcjs-basic.js></script><script src=/apps/shared/ebass/ebass-chart.js></script><script src=/apps/shared/ebass/ebass-page.js></script>
<div id=ex></div><div id=qz></div><div id=st></div>`;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/harness.html") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(HARNESS); }
  const f = path.join(u.startsWith("/apps/") ? ROOT : SITE, u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const host = `http://127.0.0.1:${server.address().port}`;
  let failed = 0; const check = (name, fn) => Promise.resolve().then(fn).then(() => console.log("ok  ", name), e => { failed++; console.log("FAIL", name, "\n    ", e.message); });
  const STUB = `window.__n=[];EBassPage.play=function(m){__n.push(m);return Promise.resolve()};`;
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const b = await launch({ width: w, height: h }); await b.resize(w, h);
    await b.goto(host + "/harness.html"); await wait(500);
    await b.eval(STUB + `EBassPage.explorer(document.getElementById("ex"));EBassPage.quiz(document.getElementById("qz"));EBassPage.strings(document.getElementById("st"));`);
    const cell = (root, s, f) => `document.querySelector('#${root} .ebc-cell[data-s="${s}"][data-f="${f}"]').dispatchEvent(new MouseEvent("click",{bubbles:true}))`;
    await check(`[${w}] fretboard has 4 strings x 13 cells`, async () => { assert.strictEqual(await b.eval(`document.querySelectorAll("#ex .ebc-cell").length`), 52); });
    await check(`[${w}] explorer: click a fret -> note, staff, other positions`, async () => {
      await b.eval(cell("ex", 3, 5)); // A string fret 5 = D2 (38)
      assert.deepStrictEqual(await b.eval(`__n`), [38]);
      assert(/D2/.test(await b.eval(`document.querySelector("#ex .ebp-card").textContent`)));
      assert(await b.eval(`!!document.querySelector("#ex .ebp-staff svg")`), "staff drawn");
      assert.strictEqual(await b.eval(`document.querySelectorAll("#ex .ebc-dot.ebc-same").length`), 2, "D2 is also open D and E-string fret 10");
      if (SHOTS) await b.shot(path.join(SHOTS, `ebass-explorer-${w}.png`), false);
    });
    await check(`[${w}] explorer: pick a note name lights every position`, async () => {
      await b.eval(`document.querySelector('#ex .ebp-pc[data-pc="0"]').click()`); // C
      const n = await b.eval(`document.querySelectorAll("#ex .ebc-dot.ebc-same").length`);
      assert(n >= 4, "C appears at several frets: " + n);
    });
    await check(`[${w}] quiz: right and wrong answers`, async () => {
      const t = await b.eval(`document.querySelector("#qz .ebp-ask").textContent`); assert(/Find this note/.test(t));
      assert(await b.eval(`!!document.querySelector("#qz .ebp-staff svg")`));
      // click every cell until a right one is found: the first right click ends the question, "Show me" lists the answers
      await b.eval(`document.querySelectorAll("#qz .ebp-bar button")[0].click()`);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#qz .ebc-dot.ebc-show").length`) >= 1, true, "answers shown");
      await b.eval(`document.querySelectorAll("#qz .ebp-bar button")[1].click()`);
      assert(/0 of 2/.test(await b.eval(`document.querySelector("#qz .ebp-bar span").textContent`)), await b.eval(`document.querySelector("#qz .ebp-bar span").textContent`));
      // by-name mode accepts any octave
      await b.eval(`var s=document.querySelector("#qz select");s.value="name";s.dispatchEvent(new Event("change"))`);
      assert(/anywhere/.test(await b.eval(`document.querySelector("#qz .ebp-ask").textContent`)));
      const pc = await b.eval(`["C","C♯/D♭","D","D♯/E♭","E","F","F♯/G♭","G","G♯/A♭","A","A♯/B♭","B"].indexOf(document.querySelector("#qz .ebp-ask").textContent.replace("Find ","").replace(" anywhere on the fretboard.",""))`);
      assert(pc >= 0, "pitch class named");
      // choose a cell with that pitch class: open strings are E A D G, so scan
      const strs = { 1: 43, 2: 38, 3: 33, 4: 28 }; let hit = null;
      for (const s of [4, 3, 2, 1]) for (let f = 0; f <= 5; f++) if ((strs[s] + f) % 12 === pc && !hit) hit = [s, f];
      assert(hit, "a position in frets 0-5");
      await b.eval(cell("qz", hit[0], hit[1]));
      assert(await b.eval(`document.querySelectorAll("#qz .ebc-dot.ebc-good").length`) === 1, "marked right");
      assert(/Yes/.test(await b.eval(`document.querySelector("#qz .ebp-out").textContent`)));
      if (SHOTS) await b.shot(path.join(SHOTS, `ebass-quiz-${w}.png`), false);
    });
    await check(`[${w}] open strings play E1 A1 D2 G2`, async () => {
      await b.eval(`__n=[];document.querySelectorAll("#st .ebp-ocard button").forEach(function(x){x.click()})`);
      assert.deepStrictEqual(await b.eval(`__n`), [28, 33, 38, 43]);
    });
    await check(`[${w}] no page errors`, async () => { assert.deepStrictEqual(b.errors.filter(e => !/sf|soundfont|ERR_|Failed to load/i.test(e)), []); });
    b.close && b.close();
  }
  const lesson = path.join(SITE, "lessons/electric-bass.html");
  if (fs.existsSync(lesson)) {
    const b = await launch({ width: 1280, height: 900 });
    await b.goto(host + "/lessons/electric-bass.html"); await wait(1500);
    await check("lesson: widgets mounted, book cited", async () => {
      assert.strictEqual(await b.eval(`document.querySelectorAll("#eb-explorer .ebc-cell").length`), 52);
      assert.strictEqual(await b.eval(`document.querySelectorAll("#eb-quiz .ebc-cell").length`), 52);
      assert(/Kjos/.test(await b.eval(`document.querySelector(".works-cited").textContent`)));
    });
    b.close && b.close();
  } else console.log("skip lesson check: lessons/electric-bass.html not rendered (Quarto unavailable)");
  server.close(); console.log(failed ? failed + " FAILED" : "all ok"); process.exit(failed ? 1 : 0);
})();
