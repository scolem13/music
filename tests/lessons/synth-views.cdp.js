// Vital / Surge XT views of a Model D patch (apps/shared/lessons/synth-views.js): for the Basic patch and several patch sheets,
// toMoog(toView(s)) gives back every key the report calls exact, each spec mounts with SynthPanel.mount, every spec key is in viewState,
// every report entry says exact / approx / lost. Run after rendering (or copying the js into _site): node tests/lessons/synth-views.cdp.js (NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8552);
(async () => {
  const b = await launch({}); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.goto("http://127.0.0.1:8552/lessons/model-d.html"); await b.sleep(800);
  await b.eval(`new Promise((r, j) => { const s = document.createElement('script'); s.src = '/apps/shared/lessons/synth-views.js'; s.onload = r; s.onerror = j; document.head.appendChild(s); })`);
  const res = JSON.parse(await b.eval(`(async () => {
    const sheets = await (await fetch('/apps/shared/data/moog-sheets.json')).json(), out = [];
    const pats = [['basic', SynthCompare.PROFILES.moog.def]].concat(sheets.filter(e => !e.blank).filter((e, i) => i % 5 === 0).map(e => [e.id, MoogSheet.toState(e.sheet)]));
    for (const id of ['vital', 'surge']) { const V = SynthViews[id], keys = [];
      (function walk(a) { a.forEach(it => { if (it.items) walk(it.items); else if (it.k) keys.push(it.k); }); })(V.spec.modules);
      let mountErr = null; try { SynthPanel.mount(document.createElement('div'), { spec: V.spec, state: V.toView(pats[0][1]).viewState }); } catch (e) { mountErr = String(e); }
      for (const [pid, s] of pats) { const t = V.toView(s), back = V.toMoog(t.viewState, s), bad = [];
        t.report.filter(r => r.how === 'exact' && r.key in s).forEach(r => { const a = s[r.key], c = back[r.key];
          if (typeof a === 'number' ? Math.abs(a - c) > 0.01 : a !== c) bad.push(r.key + ':' + a + '->' + c); });
        out.push({ id, pid, bad, missing: keys.filter(k => !(k in t.viewState)), hows: t.report.every(r => /^(exact|approx|lost)$/.test(r.how) && r.label),
          nExact: t.report.filter(r => r.how === 'exact').length, mountErr }); } }
    return JSON.stringify(out); })()`));
  for (const r of res) {
    check(r.id + " " + r.pid + ": exact keys round-trip", r.bad.length === 0, r.bad.join(" ") || r.nExact + " exact");
    check(r.id + " " + r.pid + ": every spec key in viewState", r.missing.length === 0, r.missing.join(" "));
    check(r.id + " " + r.pid + ": report entries well formed", r.hows);
  }
  ["vital", "surge"].forEach(id => check(id + " spec mounts", !res.find(r => r.id === id).mountErr, res.find(r => r.id === id).mountErr));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
