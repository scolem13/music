// Timestamp Notes: basic view (Player + Timestamps only), Advanced button, the strip with the clock, folding the Parts list,
// no title / Works Cited. Run after: quarto render tools/timestamp-notes.qmd; node tests/lessons/ts-basic.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8519);
(async () => {
  const b = await launch({}); let fails = 0;
  const check = (n, ok, i) => { console.log((ok ? "ok   " : "FAIL ") + n + (i ? "  " + i : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), vis = id => ev(`(() => { const e = document.querySelector('${id}'); return !!e && e.offsetParent !== null || (!!e && getComputedStyle(e).position === 'fixed'); })()`);
  const url = "http://127.0.0.1:8519/tools/timestamp-notes.html";
  await b.goto(url); await ev(`localStorage.clear()`); await b.goto(url); await b.sleep(700);
  check("title hidden", !(await ev(`(() => { const e = document.getElementById('title-block-header'); return !!e && e.offsetParent !== null; })()`)));
  check("no Works Cited", !(await ev(`!!document.querySelector('.works-cited')`)));
  check("basic: player and timestamps shown", await vis('#ts-player') && await vis('#ts-log'));
  for (const id of ['#ts-bars', '#ts-barmap', '#ts-words', '#ts-clock', '#ts-grid']) check("basic: " + id + " hidden", !(await vis(id)));
  check("clock strip shown", await vis('.ts-clock-t'));
  await ev(`document.querySelector('.ts-adv-toggle').click()`); await b.sleep(200);
  check("advanced: bar map and words shown", await vis('#ts-barmap') && await vis('#ts-words'));
  await ev(`document.querySelector('.ts-nav-toggle').click()`); await b.sleep(200);
  check("parts list folded, clock still shown", !(await vis('.ts-nav ul')) && await vis('.ts-clock-t'));
  await b.goto(url); await b.sleep(600);
  check("choices remembered", await vis('#ts-barmap') && !(await vis('.ts-nav ul')));
  // notation: find a tune, tap bars, the lit bar moves
  await ev(`document.querySelector('.ts-nt-q').value = 'chew'; document.querySelector('.ts-nt-go').click()`); await b.sleep(2500);
  check("finder lists tunes", await ev(`document.querySelectorAll('.ts-nt-res button').length > 0`));
  await ev(`document.querySelector('.ts-nt-res button').click()`); await b.sleep(1500);
  check("a score is drawn", await ev(`!!document.querySelector('#ts-notation .ts-nt-paper svg') && document.querySelectorAll('.fs-bar').length > 0 && getComputedStyle(document.querySelector('#ts-notation .fs-bar')).display === 'none'`));
  await ev(`document.querySelector('.btp-barmap')._btpMap.load({ beatsPerBar: 2, bars: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19] })`);
  const bar = async t => { await ev(`document.querySelector('.btp')._btp.seek(${t}), 0`); await b.sleep(450); return ev(`document.querySelector('#ts-notation .ts-nt-st').textContent`); };
  const a1 = await bar(2.5), a2 = await bar(9.5);
  check("lit bar follows the time", /Tune bar 3 /.test(a1) && /recording bar 3/.test(a1) && /recording bar 10/.test(a2), a1 + " | " + a2);
  check("a bar is shaded", await ev(`document.querySelectorAll('#ts-notation .fs-cur').length === 1`));
  await ev(`window.innerWidth`);
  check("no errors", !b.errors.filter(e => !/supabaseUrl|youtube/i.test(e)).length, b.errors.join(" | "));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
