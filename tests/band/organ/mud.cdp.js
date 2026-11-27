// Organ mud A/B (gear/organ-mud.qmd): renders the page's chords offline with each fix and reports the share of energy
// below 300 Hz and the spectral centroid. The defaults must render exactly as before the switches existed (bass 7, peak 0).
// Run after `quarto render gear/organ-mud.qmd`: node tests/band/organ/mud.cdp.js   NEG=1 must fail.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../../.."), SITE = ROOT + "/_site", { launch } = require("../lead/cdp.js");
const PORT = +(process.env.PORT || 8533), NEG = process.env.NEG === "1";
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]); const f = u.startsWith("/apps/") ? path.join(ROOT, u) : path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": /\.js$/.test(f) ? "text/javascript" : "text/html" }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ width: 900, height: 700 }); let fail = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fail++; };
  try {
    await b.goto(`http://127.0.0.1:${PORT}/gear/organ-mud.html`); await b.sleep(1200);
    const r = JSON.parse(await b.eval(`(async () => {
      const O = "hammond", base = BandSounds.getAmp(O), out = {};
      async function render(f){
        BandSounds.setTonebars(O, f.reg ? "888400000" : "888000000");
        BandSounds.setAmp(O, base.map(s => { const c = Object.assign({}, s); if (s.swell != null) c.bass = f.sw ? 2 : 7; if (s.drive != null) c.drive = f.dr ? 0.9 : 1.5; if (s.leslie != null) c.hornPeak = f.hn ? 4 : 0; return c; }));
        BandSounds.setControl(O, "swell", 0.6); BandSounds.setControl(O, "leslie", "stop");
        const sr = 44100, ctx = new OfflineAudioContext(1, sr * 2, sr), bank = BandSounds.create(ctx); await bank.load([O]);
        [74, 77, 81, 84].forEach(m => bank.play(O, { midi: m, dur: 1.8 }, 0.05));
        const x = (await ctx.startRendering()).getChannelData(0).slice(sr * 0.5, sr * 0.5 + 16384);
        let lo = 0, all = 0, cw = 0, N = x.length;                       // plain DFT on bins up to 8 kHz
        for (let k = 1; k < N * 8000 / sr; k += 2){ let re = 0, im = 0; for (let n = 0; n < N; n += 2){ const a = 2 * Math.PI * k * n / N; re += x[n] * Math.cos(a); im -= x[n] * Math.sin(a); }
          const p = re * re + im * im, hz = k * sr / N; all += p; cw += p * hz; if (hz < 300) lo += p; }
        let rms = 0; for (const v of x) rms += v * v;
        return { low: +(100 * lo / all).toFixed(1), centroid: Math.round(cw / all), rms: +Math.sqrt(rms / N).toFixed(4) };
      }
      for (const [k, f] of [["before", {}], ["reg", { reg: 1 }], ["swell", { sw: 1 }], ["drive", { dr: 1 }], ["horn", { hn: 1 }], ["all", { reg: 1, sw: 1, dr: 1, hn: 1 }]]) out[k] = await render(f);
      return JSON.stringify(out); })()`));
    for (const k in r) console.log("     " + k.padEnd(7) + " below 300 Hz " + r[k].low + "%  centroid " + r[k].centroid + " Hz  rms " + r[k].rms);
    ok(r.before.rms > 0.001, "the organ sounds");
    ok(NEG ? r.all.centroid <= r.before.centroid : r.all.centroid > r.before.centroid, "all fixes brighter than before");
    ok(r.reg.centroid > r.before.centroid && r.horn.centroid > r.before.centroid, "4' and horn peak each brighter");
    ok(r.swell.low < r.before.low, "smaller swell lift: less below 300 Hz");
  } catch (e) { console.log("FAIL " + e.stack); fail++; }
  await b.close(); srv.close(); console.log(fail ? fail + " failed" : "all ok"); process.exit(fail ? 1 : 0);
})();
