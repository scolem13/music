// My Saxophone Practice page: the steps for a lesson, the new notes' fingerings, an echo round checked through the "microphone"
// (notes fed in), songs playable with the notes known. Render first: quarto render practice/sax-home.qmd
//   node tests/mlt/sax-home.cdp.js        (SITE=<dir> tests a render made elsewhere)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8553);
(async () => {
  const b = await launch({}); let fails = 0;
  const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), wait = async (c, n = 60) => { for (let i = 0; i < n; i++) { if (await ev(c)) return true; await b.sleep(150); } return false; };
  await b.resize(1200, 900);
  await b.goto("http://127.0.0.1:8553/practice/sax-home.html");
  await wait(`document.querySelectorAll('#sh-sec option').length === 24`);
  check("starts at Unit 1A: breathing, singing, rhythm, articulation, no notes yet", await ev(`(() => { const ids = [...document.querySelectorAll('.sh-card')].map(c => c.id).join(','); return ids === 'sh-warm,sh-sing,sh-rhythm,sh-artic,sh-play,sh-try,sh-care' && /first song/.test(document.querySelector('#sh-play').textContent); })()`),
    await ev(`[...document.querySelectorAll('.sh-card')].map(c => c.id).join(',')`));
  await ev(`(() => { const s = document.querySelector('#sh-sec'); s.value = '3B'; s.onchange(); })()`);
  const nn = await ev(`[...document.querySelectorAll('#sh-new .sh-nl')].map(x => x.textContent).join(', ')`);
  check("3B new notes: DO to MI and low SO on G-DO, then the second key's DO and TI (alto)", nn === "DO G4, TI F♯4, RE A4, MI B4, SO D4, DO C5, TI B4", nn);
  check("3B: Major Duple is playable with the notes known", await ev(`/Major Duple/.test(document.querySelector('#sh-play').textContent) && [...document.querySelectorAll('#sh-play .sh-song')].some(r => /Major Duple/.test(r.textContent) && /Band only/.test(r.textContent))`),
    await ev(`[...document.querySelectorAll('#sh-play .sh-song')].map(r => r.textContent.slice(0, 60)).join(' | ')`));
  // an echo round with the microphone simulated: one known pattern, the right notes fed in
  await ev(`(() => { SaxHome._micOn(true); SaxHome.noEstablish = true; const k = SaxHome.known('3B', 'alto'); const p = [k.notes[2], k.notes[3]]; SaxHome.patterns = () => [p]; window.__p = p;
    const c = document.querySelector('#sh-echo'); c.querySelector('input').checked = false; [...c.querySelectorAll('button')].find(x => /Start/.test(x.textContent)).click(); })()`);
  await wait(`/Your turn/.test(document.querySelector('#sh-echo .sh-big').textContent)`, 80);
  await ev(`__p.forEach((n, i) => setTimeout(() => SaxHome._noteIn(n.written), 200 + i * 300))`);
  check("echo: the right notes are marked right", await wait(`/1 of 1 right/.test(document.querySelector('#sh-echo .sh-big').textContent)`, 80), await ev(`document.querySelector('#sh-echo .sh-big').textContent`));
  await ev(`(() => { const s = document.querySelector('#sh-inst'); s.value = 'tenor'; s.onchange(); })()`);
  check("tenor: the same lesson written for tenor (concert B♭ = C-DO)", await ev(`[...document.querySelectorAll('#sh-new .sh-nl')].map(x => x.textContent).slice(0, 2).join(', ')`) === "DO C5, TI B4");
  check("the fingering chart lists every note met", await ev(`document.querySelectorAll('#sh-chart .sh-note').length`) >= 6);
  await ev(`(() => { try { localStorage.removeItem('sax-home'); } catch (e) {} })()`);
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
