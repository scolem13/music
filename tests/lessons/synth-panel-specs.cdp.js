// SynthPanel specs for every SynthCompare profile (apps/shared/lessons/synth-panel-specs.js): each mounts with the profile's
// def as state, every item key is a def key, sliders are drawn, Beginner hides something, wave toggles are pictures.
// Run after copying the file into _site: node tests/lessons/synth-panel-specs.cdp.js (NEG=1 must fail)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8551);
(async () => {
  const b = await launch({}); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 1000); await b.goto("http://127.0.0.1:8551/lessons/model-d.html"); await b.sleep(800);
  await b.eval(`new Promise((r, j) => { const s = document.createElement('script'); s.src = '../apps/shared/lessons/synth-panel-specs.js'; s.onload = r; s.onerror = j; document.head.appendChild(s); })`);
  const ids = await b.eval(`Object.keys(SynthCompare.PROFILES)`), have = await b.eval(`Object.keys(SynthPanel.SPECS)`);
  const missing = ids.filter(i => !have.includes(i)); check("a spec for every profile", !missing.length, missing.join(" ") || ids.length + " synths");
  const res = await b.eval(`(() => { const out = {};
    for (const id of Object.keys(SynthPanel.SPECS)) { const r = out[id] = {}; const P = SynthCompare.PROFILES[id]; if (!P) { r.err = 'no profile'; continue; }
      const keys = []; (function walk(l) { l.forEach(it => it.items ? walk(it.items) : keys.push(it.k)); })(SynthPanel.SPECS[id].modules.map(m => ({ items: m.items })));
      r.bad = keys.filter(k => !(k in P.def));
      const d = document.createElement('div'); document.body.appendChild(d);
      try { const api = SynthPanel.mount(d, { spec: SynthPanel.SPECS[id], state: P.def, def: P.def, store: 'test-' + id }); api.level(false);
        r.sliders = d.querySelectorAll('.sp-sl').length; const vis = () => [...d.querySelectorAll('.sp-sl,.sp-tog,.sp-ch')].filter(e => e.offsetParent).length;
        const all = vis(); api.level(true); r.hid = all - vis();
        r.wordWaves = [...d.querySelectorAll('.sp-wv')].filter(x => x.textContent.trim() || !x.querySelector('svg path')).length;
      } catch (e) { r.err = String(e); } d.remove(); }
    return out; })()`);
  for (const id in res) { const r = res[id];
    check(id + ": mounts", !r.err, r.err); if (r.err) continue;
    check(id + ": keys are the profile's", !r.bad.length, r.bad.join(" "));
    check(id + ": sliders", r.sliders > 0, r.sliders);
    check(id + ": Beginner hides some", r.hid > 0, r.hid);
    check(id + ": waves are pictures", r.wordWaves === 0, r.wordWaves); }
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
