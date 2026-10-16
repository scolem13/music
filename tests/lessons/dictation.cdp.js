// The Dictation page (practice/dictation.qmd) with the Notation page as its remote window, in headless Chrome:
// opens Notation in dictation mode, checks it got the meter and key, writes the line there as ABC, hands it in, and
// checks the grade. Run after rendering both pages into _site:
//   quarto render practice/dictation.qmd; quarto render tools/notation.qmd; node tests/lessons/dictation.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8519);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required", "--disable-popup-blocking"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), noErr = () => b.errors.filter(e => !/supabase|soundfont|fetch/i.test(e));
  await b.goto("http://127.0.0.1:8519/practice/dictation.html"); await b.sleep(800);
  check("loads, lines listed", !noErr().length && await ev(`document.querySelectorAll('#dc-line option').length`) > 0, noErr().join(" | "));
  await ev(`localStorage.setItem('ntDoc', '{"keep":1}'); document.getElementById('dc-open').click()`); await b.sleep(2500);
  const nd = await ev(`(() => { const w = window.open('', 'dc-notation'); const d = w.NotationPage && w.NotationPage.doc(); return d ? d.meter + '|' + d.key + '|' + !w.document.getElementById('nt-dict').hidden : 'none'; })()`);
  check("Notation opens in dictation mode with the meter and key", nd === "2/4|Eb|true", nd);
  // write the right answer, with one wrong note, through the page's ABC box
  await ev(`(() => { const w = window.open('', 'dc-notation'), t = w.document.getElementById('nt-abc-text');
    t.value = 'X:1\\nM:2/4\\nL:1/8\\nK:Eb\\nE2 G2 | BB B2 | B2 A2 | EE E2 |]'; t.dispatchEvent(new w.Event('input')); })()`); await b.sleep(1200);
  await ev(`window.open('', 'dc-notation').document.getElementById('nt-dict-hand').click()`); await b.sleep(800);
  const out = await ev(`document.querySelector('#dc-out .dc-score') ? document.querySelector('#dc-out .dc-score').textContent : document.getElementById('dc-out').textContent`);
  check("handed in and graded (one wrong pitch of 10 = 95%)", out === "95%", out);
  check("the user's own Notation piece is untouched", await ev(`localStorage.getItem('ntDoc')`) === '{"keep":1}');
  check("logged", await ev(`JSON.parse(localStorage.getItem('dictationLog')).length`) === 1);
  check("no errors", !noErr().length, noErr().join(" | "));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
