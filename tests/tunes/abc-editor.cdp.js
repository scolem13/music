// The Tunes page's ABC editor (abc-editor.js): the tune's ABC in the box, an edit applied redraws the score and is kept
// in the browser (drawn again after a reload), vim keys on, the bar check, Revert. Render first:
//   quarto render practice/tunes.qmd
//   node tests/tunes/abc-editor.cdp.js        (SITE=<dir> tests a render made elsewhere)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8563);
const U = "http://127.0.0.1:8563";
(async () => {
  const b = await launch({});
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  const wait = async (cond, n = 80) => { for (let i = 0; i < n; i++) { if (await ev(cond)) return true; await b.sleep(150); } return false; };
  await b.goto(U + "/practice/tunes.html?tune=yankee-doodle");
  await ev(`localStorage.clear(), 0`); await b.goto(U + "/practice/tunes.html?tune=yankee-doodle");
  check("the box holds the tune", await wait(`/%%id yankee-doodle/.test((document.querySelector('#tune-abc-edit textarea') || {}).value || '')`));
  check("vim keys on", await ev(`document.querySelector('#tune-abc-edit .abced-vim').checked`) && await wait(`document.querySelector('#tune-abc-edit textarea').classList.contains('vim-normal')`, 20));
  check("bar check says the lengths are right", await wait(`/lengths right/.test(document.querySelector('#tune-abc-edit .abced-msg').textContent)`, 20), await ev(`document.querySelector('#tune-abc-edit .abced-msg').textContent`));
  const notes0 = await ev(`document.querySelectorAll('#paper .abcjs-note').length`);
  await ev(`(() => { const t = document.querySelector('#tune-abc-edit textarea'); t.value = t.value.replace('EE FG | EG', 'EE FG | EGG'); t.dispatchEvent(new Event('input')); document.querySelector('.abced-apply').click(); })()`);
  await b.sleep(300);
  check("Apply redraws the score", await ev(`document.querySelectorAll('#paper .abcjs-note').length`) === notes0 + 1, notes0 + " notes before");
  check("a bar off its length is named", /Bar 2 /.test(await ev(`document.querySelector('#tune-abc-edit .abced-msg').textContent`)));
  check("the edit is kept and counted", await ev(`JSON.parse(localStorage.getItem('abc-edits'))['yankee-doodle'] && document.querySelector('.abced-n').textContent === '1' && !document.querySelector('.abced-tag').hidden`));
  await b.goto(U + "/practice/tunes.html?tune=yankee-doodle");
  check("after a reload the edit is drawn", await wait(`document.querySelectorAll('#paper .abcjs-note').length === ${notes0 + 1}`) && /EGG/.test(await ev(`document.querySelector('#tune-abc-edit textarea').value`)));
  await ev(`window.confirm = () => true; document.querySelector('.abced-revert').click(), 0`); await b.sleep(300);
  check("Revert goes back to the site's tune", await ev(`document.querySelectorAll('#paper .abcjs-note').length`) === notes0 && await ev(`!localStorage.getItem('abc-edits').includes('yankee')`));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
