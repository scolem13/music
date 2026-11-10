// Feel in the DAW page (lessons/daw-arrange.qmd): Write the parts tight (default) is on the grid, with Band feel it is not, Humanize clip works once, Quantize takes it out.
// SITE=<dir> PORT=<n> (default _site, 8533). Render first: quarto render lessons/daw-arrange.qmd
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", PORT = +process.env.PORT || 8533, { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: [] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), U = "http://127.0.0.1:" + PORT + "/lessons/daw-arrange.html";
  await b.resize(1200, 900); await b.goto(U); await ev(`localStorage.clear()`); await b.goto(U); await b.sleep(400);
  const off = `const off = c => c.notes.filter(n => { const g = n.t * 12, g4 = n.t * 4; return Math.abs(g - Math.round(g)) > 1e-3 && Math.abs(g4 - Math.round(g4)) > 1e-3; }).length;`;
  const t1 = await ev(`(() => { ${off} const D = MiniDaw.all[0]; D.chartIn.value = 'C | Am | F | G'; D.styleSel.value = 'rock'; D.timesIn.value = 2; D.feelSel.value = '0'; D.bandWrite();
    return D.p.tracks.map(t => t.name + ':' + off(t.clips[0]) + ':' + !!t.clips[0].felt).join(' '); })()`);
  check("Tight (the default): every part exactly on the grid, no feel mark", /^Drums:0:false Bass:0:false Chords:0:false$/.test(t1), t1);
  const t2 = await ev(`(() => { ${off} const D = MiniDaw.all[0]; D.p.tracks = []; D.setPos(0); D.feelSel.value = '1'; D.bandWrite();
    return D.p.tracks.map(t => t.name + ':' + (off(t.clips[0]) > t.clips[0].notes.length * 0.5) + ':' + t.clips[0].felt + ':' + t.clips[0].notes.every(n => n.t >= 0 && n.t < t.clips[0].len)).join(' ') + ' | ' + D.p.tempo; })()`);
  check("Band feel: most notes of each part are off the grid, all still inside their clip, tempo untouched", /^Drums:true:1:true Bass:true:1:true Chords:true:1:true \| 100$/.test(t2), t2);
  const t3 = await ev(`(() => { ${off} const D = MiniDaw.all[0]; D.p.tracks = []; D.setPos(0); D.feelSel.value = '0'; D.bandWrite(); D.sel = { track: 1, clip: 0, slot: -1, notes: [] };
    D.humanize(5); const a = off(D.clip()), felt = D.clip().felt; const snap = JSON.stringify(D.clip().notes); D.humanize(6); const same = JSON.stringify(D.clip().notes) === snap, msg = D.statusEl.textContent.slice(0, 22);
    D.quantize(1); return [a > 0, felt, same, msg, off(D.clip()), D.clip().felt].join(' | '); })()`);
  check("Humanize clip: moves the Bass notes once (a second press refuses), and Quantize takes it out", t3.startsWith("true | 1 | true | This clip already has") && t3.endsWith("| 0 | "), t3);
  await b.close(); srv.close(); console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
