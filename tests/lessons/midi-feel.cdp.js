// MidiFeel on the Reading Swing lesson, in headless Chrome: a fake MIDI keyboard plays the first "Accents" example
// (swung, "and"s louder) after the count-in, and the report grades it. Run after: quarto render lessons/reading-swing.qmd
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8522);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  await b.goto("http://127.0.0.1:8522/lessons/reading-swing.html"); await b.sleep(2500);
  const n = await b.eval(`document.querySelectorAll('.mf-go').length`);
  check("every example has the keyboard button", n >= 16, n);
  const rep = await b.eval(`(async () => {
    const fake = { inputs: new Map(), onstatechange: null }; navigator.requestMIDIAccess = () => Promise.resolve(fake);
    const ex = [...document.querySelectorAll('.sw-ex')].find(e => /Accent every/.test(e.textContent));
    ex.querySelector('input[type=number]').value = 240;
    ex.querySelector('.mf-go').click();
    const msg = ex.querySelector('.mf-msg');
    while (!/Recording/.test(msg.textContent)) await new Promise(r => setTimeout(r, 5));
    const notes = MidiFeel.expected(ex.querySelector('script').textContent.trim()).notes, beat = 250;
    const t0 = performance.now();
    for (const nt of notes) {
      const t = nt.t_on % 1 ? Math.floor(nt.t_on) + 0.58 : nt.t_on, at = t0 + t * beat;
      setTimeout(() => MidiFeel.inject('on', nt.midi, nt.t_on % 1 ? 100 : 70, at), at - performance.now());
      setTimeout(() => MidiFeel.inject('off', nt.midi, 0), at - performance.now() + (nt.t_off - nt.t_on) * beat * 0.9);
    }
    const box = ex.querySelector('.mf-report');
    for (let k = 0; k < 400 && !box.textContent; k++) await new Promise(r => setTimeout(r, 25));
    return [...box.querySelectorAll('tr')].map(r => r.className + ':' + r.querySelector('th').textContent + (/Swing/.test(r.textContent) ? ' (' + r.textContent.slice(0, 60) + ')' : '')).join(',');
  })()`);
  check("report: notes, swing, accents all ✓", /mf-ok:Notes/.test(rep) && /mf-ok:Swing/.test(rep) && /mf-ok:Accents/.test(rep), rep);
  const errs = b.errors.filter(e => !/supabase|soundfont|fetch|load sound/i.test(e));
  check("no page errors", !errs.length, errs.join(" | "));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
