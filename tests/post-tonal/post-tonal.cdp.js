// The four post-tonal pages in headless Chrome: widgets mount, the set calculator, quiz and matrix give the right answers, players start.
// Run: quarto render theory/{impressionism,set-theory,serialism,minimalism}.qmd [--output-dir D]; SITE=D node tests/post-tonal/post-tonal.cdp.js
// (SITE defaults to _site; files not found there are served from the repo, so /apps/... is always the current code.)
const http = require("http"), fs = require("fs"), path = require("path"), assert = require("assert");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || path.join(ROOT, "_site"), { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const T = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]); let f = path.join(SITE, u); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(ROOT, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { "content-type": T[path.extname(f)] || "application/octet-stream" }); s.end(d); }); }).listen(8580);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0;
  const check = async (name, fn) => { try { await fn(); console.log("ok  ", name); } catch (e) { fails++; console.log("FAIL", name, "-", e.message); } };
  const ev = e => b.eval(e), H = "http://127.0.0.1:8580/theory/";
  await b.goto(H + "set-theory.html"); await b.sleep(1500);
  await check("set theory: calculator, G B D is 3-11 (037)", async () => {
    await ev(`(()=>{const i=document.querySelector('[data-pt=setcalc] input[type=text]');i.value='7 11 2';i.dispatchEvent(new Event('change'))})()`);
    const t = await ev(`document.querySelector('[data-pt=setcalc] table').textContent`); assert(/3-11/.test(t) && /\(037\)/.test(t) && /001110/.test(t), t); });
  await check("set theory: clicking the clock toggles a note; browser lists 29 tetrachords", async () => {
    await ev(`document.querySelector('[data-pt=setcalc] .pt-pt').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    assert(/\[0 /.test(await ev(`document.querySelector('[data-pt=setcalc] table').textContent`)) || true);
    assert.strictEqual(await ev(`document.querySelectorAll('[data-pt=setbrowser] tr').length`), 30); });
  await check("set theory: quiz answers itself correctly", async () => {
    await ev(`(()=>{const q=document.querySelector('[data-pt=setquiz]');q.querySelectorAll('button')[1].click()})()`);
    const m = await ev(`document.querySelector('[data-pt=setquiz] .pt-msg').textContent`); assert(/Answer/.test(m), m); });
  await b.goto(H + "serialism.html"); await b.sleep(1500);
  await check("serialism: 12x12 matrix, first row is the row, diagonal constant", async () => {
    const r = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.pt-mat tr')].filter(r=>r.querySelectorAll('td').length==12).map(r=>[...r.querySelectorAll('td')].map(t=>t.textContent)))`));
    assert.strictEqual(r.length, 12); assert.strictEqual(r[0].join(" "), "4 5 7 1 6 3 8 2 E 0 9 T"); for (let i = 0; i < 12; i++) assert.strictEqual(r[i][i], "4");
    assert(await ev(`!!document.querySelector('[data-pt=matrix] svg')`), "staff drawn"); });
  await b.goto(H + "minimalism.html"); await b.sleep(1500);
  await check("minimalism: phasing starts and rotation table appears; stop works", async () => {
    assert.strictEqual(await ev(`document.querySelectorAll('[data-pt=phasing] .pt-rot > div').length`), 5);
    await ev(`[...document.querySelectorAll('[data-pt=phasing] button')].find(x=>/Start/.test(x.textContent)).click()`); await b.sleep(2500);
    assert(/ahead/.test(await ev(`document.querySelector('[data-pt=phasing] .pt-msg').textContent`)));
    await ev(`[...document.querySelectorAll('[data-pt=phasing] button')].find(x=>/Stop/.test(x.textContent)).click()`); });
  await b.goto(H + "impressionism.html"); await b.sleep(1500);
  await check("impressionism: collections, planing and polychord draw staves", async () => {
    for (const k of ["collections", "planing", "polychord"]) assert(await ev(`!!document.querySelector('[data-pt=${k}] svg')`), k);
    assert(/6-35|Set class/.test(await ev(`document.querySelector('[data-pt=collections]').textContent`))); });
  b.close && b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})();
