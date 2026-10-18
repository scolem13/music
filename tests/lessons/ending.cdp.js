// The Write an Ending lesson (lessons/write-an-ending.qmd) with the Notation page framed in it (?ending=1), in headless Chrome:
// the unfinished songs are found in the tune library, the frame gets the song and opens on its first empty chunk, an edit
// there comes back to the lesson and is kept per song, and the user's own Notation piece is untouched. Run after rendering:
//   quarto render lessons/write-an-ending.qmd; quarto render tools/notation.qmd; node tests/lessons/ending.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8521);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), noErr = () => b.errors.filter(e => !/supabase|soundfont|fetch|load sound/i.test(e));
  await b.goto("http://127.0.0.1:8521/lessons/write-an-ending.html");
  await ev(`localStorage.clear(); localStorage.setItem('ntDoc', '{"keep":1}')`);
  await b.goto("http://127.0.0.1:8521/lessons/write-an-ending.html"); await b.sleep(3000);
  const n = await ev(`document.querySelectorAll('#we-pick button').length`);
  check("five unfinished songs found", n === 5, n);
  const F = `document.getElementById('we-frame').contentWindow`;
  const got = await ev(`(() => { const w = ${F}, P = w.NotationPage; if (!P) return 'none'; const d = P.doc(); return d.title + '|' + d.key + '|' + P.cur() + '/' + d.chunks.length + '|' + w.document.getElementById('nt-start-panel').offsetParent; })()`);
  check("frame has song 1, on its first empty chunk, pared down", got === "Unfinished Song #1|D|5/7|null", got);
  await ev(`document.querySelectorAll('#we-pick button')[1].click()`); await b.sleep(1200);
  const g2 = await ev(`${F}.NotationPage.doc().title + '|' + ${F}.NotationPage.doc().key`);
  check("picking song 2 loads it (D minor)", g2 === "Unfinished Song #2|Dm", g2);
  await ev(`(() => { const w = ${F}, t = w.document.getElementById('nt-abc-text');
    t.value = 'X:1\\nT:Unfinished Song #2\\nM:6/8\\nL:1/8\\nK:Dm\\n"Dm"A2B A2G | F2E D3 | "A"E3 ^C3 | "Dm"D6 |]'; t.dispatchEvent(new w.Event('input')); })()`); await b.sleep(1500);
  const kept = await ev(`localStorage.getItem('ending:unfinished-song-2') || ''`);
  check("the edit comes back and is kept for song 2", /\^C3|_D3/.test(kept) || /D6/.test(kept), kept.slice(-60));
  // the frame is only Rhythm and Notes; rhythm fills the open bars in order and stops when the song is complete
  await ev(`localStorage.removeItem('ending:unfinished-song-1'); document.querySelectorAll('#we-pick button')[0].click()`); await b.sleep(1500);
  const shown = await ev(`[...${F}.document.querySelectorAll('#nt-root details.nt-panel')].filter(p => p.offsetParent).map(p => p.id).join(',')`);
  check("only Rhythm and Notes shown", shown.split(',').sort().join(',') === "nt-pitch,nt-rhythm", shown);
  const fill = await ev(`(async () => { const w = ${F}, P = w.NotationPage, n = () => P.doc().chunks.length;
    const before = n(), btn = () => w.document.querySelector('#nt-cells .cell-btn');
    if (!btn()) return 'no cells';
    for (let k = 0; k < 12; k++) { btn().click(); await new Promise(r => setTimeout(r, 120)); }
    const d = P.doc(), len = ci => d.chunks[ci].rhythm.reduce((s, e) => s + e.durQ, 0);
    return before + '|' + n() + '|' + len(5) + '|' + len(6) + '|' + w.document.getElementById('nt-status').textContent; })()`);
  check("rhythm fills bars 7-8, then stops (no new bar)", /^7\|7\|2\|2\|The song is complete/.test(fill), fill);
  const notes = await ev(`(async () => { const w = ${F}; w.focus(); for (const l of 'abcdefga') { w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: l, bubbles: true })); await new Promise(r => setTimeout(r, 80)); }
    const d = w.NotationPage.doc(); return d.chunks[5].pitches.filter(x => x != null).length + '|' + d.chunks[6].pitches.filter(x => x != null).length; })()`);
  check("letters fill bar 7, then bar 8", /^[1-9]\d*\|[1-9]/.test(notes), notes);
  check("ending drawn on the lesson", await ev(`!!document.querySelector('#we-mine svg')`));
  check("the user's own Notation piece is untouched", await ev(`localStorage.getItem('ntDoc')`) === '{"keep":1}');
  check("no errors", !noErr().length, noErr().join(" | "));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
