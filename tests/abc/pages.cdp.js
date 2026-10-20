// Every page that loads an ABC parser, in headless Chrome, twice: with the frozen old parsers (baseline/) served in place
// of the current ones, then with the current ones. Page errors and what each app built from its first tune or pattern
// must be the same both times.
//   1. Render the pages (see tests/band/README.md; any output folder), e.g.
//      quarto render practice/assessment.qmd --output-dir <site>   (and the other pages in PAGES)
//   2. SITE=<site> node pages.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const { launch } = require("../band/lead/cdp.js");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE, PORT = +(process.env.PORT || 8510);
if (!SITE) { console.log("set SITE to the rendered pages' folder"); process.exit(2); }
const OLD = { "/apps/assessment/abc-pitch.js": "abc-pitch.js", "/apps/rhythm-assessment/abc-rhythm.js": "abc-rhythm.js",
              "/apps/tune-assessment/abc-tune.js": "abc-tune.js" };
let useOld = false;
const TYPES = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".svg":"image/svg+xml" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  let file = path.join(/^\/(apps\/|config\.js|track\.js)/.test(p) ? ROOT : SITE, p);
  if (useOld && OLD[p]) file = path.join(__dirname, "baseline", OLD[p]);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }); res.end(data);
  });
}).listen(PORT, "127.0.0.1");

const PAGES = ["practice/assessment", "practice/assessment-rhythm", "practice/assessment-tune", "practice/reading-benchmarks",
  "practice/lsa-practice", "practice/lsa-practice-notated", "practice/lsa-rhythm-assessment", "lessons/blues-changes",
  "lessons/four-chord-loops", "lessons/pop-changes", "lessons/blues-melody", "tools/backing-track", "tools/chord-entry"];
// what the page has: the globals, and the targets the assessment apps built (top-level `let`s, so read them by name)
const PROBE = `(() => {
  const g = n => { try { return eval(n); } catch (e) { return undefined; } };
  const pick = t => t && JSON.stringify({ n: (t.notes || t.events || []).length, on: t.onsets, total: t.total, first: (t.notes || [])[0] });
  return { core: typeof AbcCore, pitch: typeof AbcPitch, rhythm: typeof AbcRhythm, tune: typeof AbcTune,
           baseTargets: JSON.stringify(g("baseTargets")), target: pick(g("target")),
           tuneOk: typeof AbcTune === "object" ? AbcTune.melodyNotes("K:D\\nF G A|f2").notes.map(n => n.midi).join() : null };
})()`;

(async () => {
  const b = await launch();
  const run = async page => {
    b.errors.length = 0; b.failed.length = 0;
    await b.goto(`http://127.0.0.1:${PORT}/${page}.html`);
    await b.sleep(2500);
    // the frozen baseline predates AbcPitch.tonicPc, which the assessment's current app.js calls: not a difference in parsing
    const errors = b.errors.filter(e => !(useOld && /AbcPitch\.tonicPc is not a function/.test(e)));
    return { probe: await b.eval(PROBE), errors: errors.sort(), failed: b.failed.filter(f => /\/apps\//.test(f)).sort() };
  };
  let bad = 0;
  for (const page of PAGES){
    useOld = true;  const before = await run(page);
    useOld = false; const after = await run(page);
    const parsers = ["pitch", "rhythm", "tune"].filter(k => after.probe[k] === "object");
    const same = JSON.stringify({ ...before, probe: { ...before.probe, core: 0 } }) === JSON.stringify({ ...after, probe: { ...after.probe, core: 0 } });
    const ok = same && after.probe.core === "object" && parsers.length > 0;
    if (!ok) bad++;
    console.log((ok ? "ok   " : "DIFF ") + page.padEnd(32) + " parsers: " + parsers.join("+") +
      (after.probe.target ? "  target " + after.probe.target.slice(0, 70) : "") +
      (after.probe.baseTargets ? "  targets " + after.probe.baseTargets : "") +
      (after.errors.length ? "  (" + after.errors.length + " page errors" + (same ? ", same as before)" : ")") : ""));
    if (!same){ console.log("  before: " + JSON.stringify(before).slice(0, 600)); console.log("  after:  " + JSON.stringify(after).slice(0, 600)); }
  }
  await b.close();
  console.log(bad ? bad + " PAGES DIFFER" : "PAGES SAME");
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
