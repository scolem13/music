// corpus-verify.cjs — after corpus.mjs: draws every excerpt in apps/shared/data/modulation-corpus.json with the site's abcjs (headless
// Chrome) and keeps only those whose playback is exactly the notes of their source bars (start and pitch, ties joined), as corpus.mjs
// recorded them. The ones dropped are listed; the file is rewritten without them.
//   node scripts/when-in-rome/corpus-verify.cjs
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", DATA = ROOT + "/apps/shared/data/modulation-corpus.json";
const data = JSON.parse(fs.readFileSync(DATA)), want = JSON.parse(fs.readFileSync(os.tmpdir() + "/modulation-corpus-want.json"));
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : "text/html" }); s.end(d); }); }).listen(8551);
(async () => {
  const { launch } = require(ROOT + "/tests/band/lead/cdp.js"), b = await launch();
  await b.goto("http://127.0.0.1:8551/theory/analysed-scores/bach-o-haupt.html"); await b.sleep(1500);
  const keep = [], dropped = [];
  for (const x of data) {
    const plain = x.abc.replace(/:\|/g, "|").replace(/\|:/g, "|");   // repeats played once
    const got = await b.eval(`(() => { const v = ABCJS.renderAbc(document.createElement('div'), ${JSON.stringify(plain)})[0], out = [];
      v.setUpAudio().tracks.forEach(t => t.forEach(e => { if (e.cmd === 'note') out.push(e.start.toFixed(4) + ':' + e.pitch); })); return out.sort(); })()`);
    const w = want[x.id];
    if (w && got.join() === w.join()) keep.push(x); else dropped.push(x.id);
  }
  fs.writeFileSync(DATA, JSON.stringify(keep));
  console.log(keep.length, "of", data.length, "excerpts kept (abcjs plays their source notes exactly)" + (dropped.length ? "; dropped: " + dropped.join(", ") : ""));
  srv.close(); process.exit(0);
})();
