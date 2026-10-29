// Timestamp Notes: u undoes (a deleted stamp comes back), parts hide with × and come back from the list, the help sits at the
// bottom folded, the Notation part shows a linked tune (?rec= with rec.tune) and lights the bar from the Bar map. The Tune
// Directory's spreadsheet filters and sorts. Render first:
//   quarto render tools/timestamp-notes.qmd practice/tune-directory.qmd
//   node tests/lessons/ts-undo-hide.cdp.js        (SITE=<dir> tests a render made elsewhere)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8562);
const U = "http://127.0.0.1:8562";
(async () => {
  const b = await launch({});
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  const wait = async (cond, n = 80) => { for (let i = 0; i < n; i++) { if (await ev(cond)) return true; await b.sleep(150); } return false; };
  const key = k => ev(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)}, bubbles: true })), 0`);
  await b.resize(1300, 900);

  await b.goto(U + "/tools/timestamp-notes.html");
  await ev(`localStorage.clear(), 0`); await b.goto(U + "/tools/timestamp-notes.html");
  await wait(`!!document.querySelector('.ts-nav ul li')`);
  check("help folded at the bottom", await ev(`(() => { const h = document.querySelector('.ts-help'); return !!h && !h.open && !!h.querySelector('.btp-steps') && !!(h.compareDocumentPosition(document.querySelector('.btp-layout')) & 2); })()`));
  check("no Notation part without a tune", await ev(`document.getElementById('ts-notation').hidden && !document.querySelector('.ts-nav a[data-for="ts-notation"]')`));
  // hide / show
  await ev(`document.querySelector('#ts-barmap .ts-hide').click()`);
  check("× hides the part", await ev(`getComputedStyle(document.getElementById('ts-barmap')).display === 'none' && document.querySelector('.ts-nav a[data-for="ts-barmap"]').classList.contains('is-shut')`));
  await ev(`document.querySelector('.ts-nav a[data-for="ts-barmap"]').click()`);
  check("the list shows it again", await ev(`getComputedStyle(document.getElementById('ts-barmap')).display !== 'none'`));
  check("summary no longer folds", await ev(`(() => { const d = document.getElementById('ts-words'); d.querySelector('summary').click(); return d.open; })()`));
  // undo: stamp twice, delete one, u brings it back
  await ev(`(() => { document.querySelector('.btp-paste-open').click(); document.querySelector('.btp-paste textarea').value = "00:10\\tFirst\\n00:20\\tSecond"; document.querySelector('.btp-paste-go').click(); })()`);
  await b.sleep(700);
  const n0 = await ev(`document.querySelectorAll('.btp-log-rows li').length`);
  await ev(`document.querySelector('.btp-log-rows li .btp-del').click()`);
  await b.sleep(700);
  const n1 = await ev(`document.querySelectorAll('.btp-log-rows li').length`);
  await key("u"); await b.sleep(300);
  const n2 = await ev(`document.querySelectorAll('.btp-log-rows li').length`);
  check("u undoes a deleted stamp", n0 === 2 && n1 === 1 && n2 === 2, [n0, n1, n2].join(" → "));

  // notation for a linked recording
  await ev(`localStorage.clear(), 0`);
  await b.goto(U + "/tools/timestamp-notes.html?rec=mullen-chew-chew-chew-c-with-vocals");
  check("Notation part shows the linked tune", await wait(`!!document.querySelector('#ts-notation .ts-nt-paper svg') && !document.getElementById('ts-notation').hidden`, 120));
  await ev(`(() => { const m = document.querySelector('.btp-barmap')._btpMap; m.load({ beatsPerBar: 2, bars: [0,1,2,3,4,5,6,7,8,9] }); })()`);
  await ev(`document.querySelector('.btp')._btp.seek(3.5), 0`);
  check("the bar the recording is in is lit", await wait(`document.querySelectorAll('#ts-notation .rs-bar').length > 0`, 40));

  // spreadsheet
  await b.goto(U + "/practice/tune-directory.html");
  check("spreadsheet drawn", await wait(`document.querySelectorAll('.tds tbody tr').length === 200`, 120));
  await ev(`(() => { const x = document.querySelector('[data-q="both"]'); x.checked = true; x.dispatchEvent(new Event('change')); })()`);
  await b.sleep(400);
  const both = await ev(`[...document.querySelectorAll('.tds tbody tr')].map(r => r.cells[0].textContent)`);
  check("notation and a recording: Chew Chew Chew among them", both.some(t => /chew/i.test(t)), both.length + " rows");
  await ev(`document.querySelector('th[data-k="recs"]').click()`); await b.sleep(200);
  const top = await ev(`+document.querySelector('.tds tbody tr').cells[7].textContent`);
  check("sort by recordings, most first", top >= 4, String(top));

  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
