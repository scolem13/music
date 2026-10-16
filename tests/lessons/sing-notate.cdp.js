// Sing and Notate (lessons/sing-and-notate.qmd) in headless Chrome, with no microphone: the song (Unfinished Song #1) is read from
// the tune library and sets the key, tonality and meter (their choices hidden); three takes of A2 A2 | D4 (injected) are found;
// the Notation frame gets the song; writing the ending into its bars 7-8 gives ONE combined confirmation.
//   quarto render lessons/sing-and-notate.qmd; quarto render tools/notation.qmd; node tests/lessons/sing-notate.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8523);
(async () => {
  const b = await launch({});
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), noErr = () => b.errors.filter(e => !/supabase|soundfont|fetch|load sound/i.test(e));
  await b.goto("http://127.0.0.1:8523/lessons/sing-and-notate.html"); await b.sleep(3000);
  const st = await ev(`(() => { const s = SingNotatePage.state().chosen; return s ? s.key + '|' + s.meter + '|' + document.querySelector('.sn-row').offsetParent + '|' + !!document.querySelector('#sn-song svg') : 'none'; })()`);
  check("the song sets D major, 2/4; choices hidden; song drawn", st === "D|2/4|null|true", st);
  // three takes of A2 A2 | D4 (quarters after bar 7's downbeat), a little loose
  await ev(`SingNotatePage.setTakes([0, 0.1, -0.12].map(d => ({ notes: [{ q: 0 + d, midi: 69.2 }, { q: 1 - d, midi: 68.9 }, { q: 2 + d, midi: 62.3 }] })))`); await b.sleep(1500);
  const r = await ev(`(() => { const r = SingNotatePage.state().result; return r ? r.ok + '|' + r.best.notes.map(n => n.semis + '@' + n.q + '/' + n.dur).join(' ') : 'none'; })()`);
  check("A2 A2 | D4 found", r === "true|7@0/1 7@1/1 0@2/2", r);
  const F = `document.getElementById('sn-frame').contentWindow`;
  const got = await ev(`(() => { const d = ${F}.NotationPage.doc(); return d.title + '|' + d.chunks.length; })()`);
  check("the frame has the song", /^Unfinished Song #1/.test(got), got);
  await ev(`(() => { const w = ${F}, t = w.document.getElementById('nt-abc-text');
    t.value = 'X:1\\nM:2/4\\nL:1/8\\nK:D\\nDE FG | AF D2 | CD EA | F2 D2 |\\nDE FG | AB A2 | "A"A2 A2 | "D"D4 |]'; t.dispatchEvent(new w.Event('input')); })()`); await b.sleep(1500);
  const conf = await ev(`[...document.querySelectorAll('#sn-confirms .sn-ok')].map(d => d.textContent).join(' / ')`);
  check("one combined confirmation", /^Rhythm and pitches correct/.test(conf) && !conf.includes(" / "), conf);
  check("no errors", !noErr().length, noErr().join(" | "));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
