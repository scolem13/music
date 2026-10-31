// Accompaniment Styles page: every ▶ plays through AbcPlay's tracks mode on the band's samples (no abcjs synth): the keyboard
// cards sound their keys, bass and drum channel; the drum-only cards sound the kit (and congas where written), never the staff
// positions of the drawn drum staff. Render first:
//   quarto render tools/accomp-styles.qmd
//   node tests/band/styles/accomp-play.cdp.js        (SITE=<dir> tests a render made elsewhere)
// Samples from the mirror tests/band/lead/site/sf/ (tests/band/README.md, "Samples in page tests"). NEG=1 must fail.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../../.."), SITE = process.env.SITE || ROOT + "/_site", SF = ROOT + "/tests/band/lead/site";
const { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".mp3") ? "audio/mpeg" : "text/html";
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]);
  const f = u.startsWith("/sf/") ? path.join(SF, u) : u.startsWith("/apps/") ? path.join(ROOT, u) : path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8572);
const U = "http://127.0.0.1:8572";
(async () => {
  const b = await launch({});
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  const wait = async (cond, n = 80) => { for (let i = 0; i < n; i++) { if (await ev(cond)) return true; await b.sleep(150); } return false; };
  await b.goto(U + "/tools/accomp-styles.html");
  await ev(`Object.defineProperty(window, "getSoundfontUrl", { configurable: true, value: () => Promise.resolve(location.origin + "/sf/") }), 0`);
  check("the examples are drawn", await wait(`document.querySelectorAll('#as-genre .as-notation svg').length > 5`));
  check("no abcjs player on the page", await ev(`!document.querySelector('.abcjs-midi-start, #as-synth')`));
  // record what each ▶ asks the band's bank for
  await ev(`AbcPlay.ctx().then(s => { const p = s.bank.play.bind(s.bank); window.__hits = []; s.bank.play = (name, spec, when, out) => { __hits.push(name + ":" + (spec.piece || spec.midi)); return p(name, spec, when, out); }; }), 0`);
  await wait(`!!window.__hits`, 40);
  const playCard = async (sel) => {
    await ev(`__hits.length = 0, document.querySelector(${JSON.stringify(sel)}).click(), 0`);
    await wait(`__hits.length > 4`, 120);
    const hits = await ev(`__hits.slice()`);
    const on = await ev(`document.querySelector(${JSON.stringify(sel)}).classList.contains('as-play--on') && !!AbcPlay.playing()`);
    const lit = await wait(`document.querySelectorAll('#as-root .abc-on').length > 0`, 60);
    await ev(`document.querySelector(${JSON.stringify(sel)}).click(), 0`);
    const off = await wait(`!AbcPlay.playing() && !document.querySelector('.as-play--on')`, 20);
    return { hits, on, lit, off };
  };
  const bossa = await playCard('[data-style="bossa"]');
  const names = [...new Set(bossa.hits.map(h => h.split(":")[0]))];
  check("bossa: keys, and the drum channel on the kit", names.includes("kit") && names.some(n => /piano|rhodes|epiano/.test(n)), names.join(","));
  check("bossa: the button shows it playing, the notes are lit", bossa.on && bossa.lit);
  check("bossa: ▶ again stops it", bossa.off);
  const styles = await ev(`[...document.querySelectorAll('[data-style]')].map(x => x.dataset.style).filter((x, i, a) => a.indexOf(x) === i)`);
  for (const id of styles) {
    if (id === "bossa") continue;
    const r = await playCard(`[data-style="${id}"]`), bad = r.hits.filter(h => !/^(kit|congas):[a-zA-Z]|^[a-z]+:\d+$/.test(h));
    check(`style ${id}: plays on the band's sounds`, r.hits.length > 4 && !bad.length && r.off, [...new Set(r.hits.map(h => h.split(":")[0]))].join(",") + (bad.length ? " BAD " + bad.slice(0, 3) : ""));
  }
  const ids = await ev(`[...document.querySelectorAll('[data-drum]')].map(x => x.dataset.drum)`);
  for (const id of ids) {
    const r = await playCard(`[data-drum="${id}"]`);
    const bad = r.hits.filter(h => !/^(kit|congas):[a-zA-Z]/.test(h));
    const ok = process.env.NEG ? bad.length === 0 && r.hits.some(h => /^piano/.test(h)) : r.hits.length > 4 && bad.length === 0;
    check(`drums ${id}: only kit / conga pieces`, ok, [...new Set(r.hits)].slice(0, 8).join(" ") + (bad.length ? "  BAD " + bad.slice(0, 3) : ""));
  }
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all ok"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
