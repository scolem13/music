// Recordings linked to notation: the Recordings Catalogue, the Chord Grid by Ear, Timestamp Notes ?rec=, the Tune Library's
// MLT recordings panel and the 🎧 button on MLT song lists. Render first:
//   quarto render mlt/recordings.qmd practice/ear-grid.qmd tools/timestamp-notes.qmd mlt/mullen.qmd practice/tunes.qmd
//   node tests/mlt/rec-links.cdp.js        (SITE=<dir> tests a render made elsewhere)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8557);
const U = "http://127.0.0.1:8557";
(async () => {
  const b = await launch({});
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  const wait = async (cond, n = 80) => { for (let i = 0; i < n; i++) { if (await ev(cond)) return true; await b.sleep(150); } return false; };
  await b.resize(1200, 900);

  await b.goto(U + "/mlt/recordings.html?find=chew");
  check("catalogue lists the four Chew Chew Chew tracks", await wait(`document.querySelectorAll('.rc-row').length === 4`), await ev(`document.querySelectorAll('.rc-row').length`));
  check("guessed tonality marked", await ev(`!!document.querySelector('.rc-row .rc-ton.rc-guess')`));
  await ev(`(() => { const s = document.querySelector('.rc-row .rc-met'); s.value = 'triple'; s.dispatchEvent(new Event('change')); })()`);
  check("an edit is kept", await ev(`JSON.parse(localStorage.getItem('mlt-rec-meta-edits'))['mullen-chew-chew-chew-c-no-vocals'].meter === 'triple'`));
  await ev(`localStorage.removeItem('mlt-rec-meta-edits')`);

  await b.goto(U + "/practice/ear-grid.html?rec=mullen-chew-chew-chew-c-with-vocals");
  check("grid drawn (steady tempo, no timing map)", await wait(`document.querySelectorAll('.eg-bar').length > 8`, 120), await ev(`document.querySelectorAll('.eg-bar').length`));
  await ev(`(() => { const g = document.querySelectorAll('.eg-g'); [['C',0],['V7',1],['F',2]].forEach(([v,i]) => { g[i].value = v; g[i].dispatchEvent(new Event('input', { bubbles: true })); }); })()`);
  await ev(`document.querySelector('.eg-check').click()`);
  const cls = await ev(`[0,1,2].map(i => document.querySelectorAll('.eg-bar')[i].className).join('|')`);
  check("check: C right, V7 right, F wrong", /eg-ok/.test(cls.split("|")[0]) && /eg-ok/.test(cls.split("|")[1]) && /eg-no/.test(cls.split("|")[2]), cls);
  check("guesses kept", await ev(`JSON.parse(localStorage.getItem('ear-grid:mullen-chew-chew-chew-c-with-vocals')).guesses[1] === 'V7'`));
  await ev(`document.querySelector('.eg-reveal').click()`);
  check("answers shown in the recording's key", /G7 \(V7\)/.test(await ev(`document.querySelectorAll('.eg-bar')[1].textContent`)), await ev(`document.querySelectorAll('.eg-bar')[1].textContent`));

  await b.goto(U + "/tools/timestamp-notes.html?rec=mullen-chew-chew-chew-d-no-vocals");
  check("Timestamp Notes opens the recording", await wait(`(() => { const p = document.querySelector('.btp'); const s = p && p._btp && p._btp.source(); return !!(s && s.rec === 'mullen-chew-chew-chew-d-no-vocals'); })()`));
  check("its title filled in", /Chew/.test(await ev(`(document.querySelector('.btp-title') || {}).value || ''`)));

  await b.goto(U + "/practice/tunes.html?tune=chew-chew-chew");
  check("Tune Library shows the MLT recordings", await wait(`(() => { const m = document.querySelector('.wk-mlt'); return !!m && m.querySelectorAll('.wk-rec').length === 4; })()`, 160));

  await b.goto(U + "/mlt/mullen.html?view=student");
  check("song list has a 🎧 button for Chew, Chew, Chew", await wait(`!!document.querySelector('.mlt-recbtn[data-id="chew-chew-chew"]')`));
  await ev(`document.querySelector('.mlt-recbtn[data-id="chew-chew-chew"]').click()`);
  check("it lists the recordings, visible in student view", await ev(`(() => { const l = document.querySelector('.mlt-recbtn[data-id="chew-chew-chew"]').closest('li').querySelector('.mlt-rec-l'); return !!l && l.children.length === 4 && l.offsetParent !== null; })()`));

  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
