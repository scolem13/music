// Modulation (theory/modulation.qmd, apps/shared/modulation.js) and the Moonlight extras on Analysed Scores, in headless Chrome.
//   quarto render theory/modulation.qmd theory/analysed-scores; node tests/lessons/modulation.cdp.js
// Checks: chord spelling by arithmetic (every chord's notes are the right semitones above its root, on successive letters), common
// chords are diatonic in both keys, related keys differ by at most one sharp/flat, every example and every quiz key draws and abcjs
// reads back exactly the voiced pitches; on Analysed Scores the key strips and form buttons are there and playBars lights the bars.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const PORT = 8547;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch();
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info !== undefined ? "  " + JSON.stringify(info) : "")); if (!ok) fails++; };
  const errs = () => b.errors.filter(e => !/supabase|createClient|soundfont|fetch|load sound|favicon|sounds/i.test(e));
  await b.goto(`http://127.0.0.1:${PORT}/theory/modulation.html`); await b.sleep(1500);
  const r = await b.eval(`(() => { const M = Modulation, K = M.parseKey, NAT = [0,2,4,5,7,9,11], pc = n => ((NAT[n.l] + n.a) % 12 + 12) % 12;
    const Q = { maj: [4,7], min: [3,7], dim: [3,6], aug: [4,8], dom7: [4,7,10], maj7: [4,7,11], min7: [3,7,10], hd7: [3,6,10], dim7: [3,6,9] };
    const keys = ["C","G","D","A","E","B","F#","Db","Ab","Eb","Bb","F","a","e","b","f#","c#","g#","eb","bb","f","c","g","d"];
    const bad = [];
    for (const k of keys) for (const t of M.triads(K(k))) { const n = t.chord.notes;
      Q[t.chord.q].forEach((iv, i) => { if ((pc(n[i+1]) - pc(n[0]) + 12) % 12 !== iv || (n[i+1].l - n[0].l + 7) % 7 !== 2 * (i+1) % 7) bad.push(k + " " + t.rn); }); }
    const scale = k => { const kk = K(k), s = kk.minor ? [0,2,3,5,7,8,10] : [0,2,4,5,7,9,11], t = pc(kk); return s.map(x => (t + x) % 12).concat(kk.minor ? [(t + 11) % 12] : []); };
    const notDia = [];
    for (const a of keys) for (const c of keys) for (const x of M.common(K(a), K(c))) for (const n of x.chord.notes) { if (!scale(a).includes(pc(n)) || !scale(c).includes(pc(n))) notDia.push(a + ">" + c + " " + x.name); }
    const rel = keys.every(k => M.related(K(k)).every(x => Math.abs(M.sig(x.key) - M.sig(K(k))) <= 1));
    // every example in every key that fits: abcjs reads back the voiced pitches
    const mism = []; let n = 0;
    for (const id of Object.keys(M.EXAMPLES)) { const e = M.EXAMPLES[id], h0 = K(e.home);
      for (const k of keys) { const h = K(k); if (h.minor !== h0.minor) continue; const st = M.transposeSteps(e.steps, h0, h); if (!M.exampleFits(st, h)) continue;
        const p = M.progression(st, h), vs = M.voice(p), abc = M.toAbc(p, h), v = ABCJS.renderAbc(document.createElement("div"), abc)[0], got = [];
        v.setUpAudio().tracks.forEach(t => t.forEach(ev => { if (ev.cmd === "note") got.push(Math.round(ev.start * 1000) + ":" + ev.pitch); }));
        const want = []; vs.forEach((x, i) => [x.bass].concat(x.up).forEach(y => want.push(i * 1000 + ":" + y.m)));
        got.sort(); want.sort(); n++;
        if (got.join() !== want.join()) mism.push(id + " in " + k);
      } }
    return { bad: bad.slice(0, 5), notDia: notDia.slice(0, 5), rel, mism: mism.slice(0, 8), n,
      cG: M.common(K("C"), K("G")).map(x => x.name).sort().join(","), cE: M.common(K("c#"), K("E")).map(x => x.a + "=" + x.b).join(","),
      exDrawn: document.querySelectorAll(".mod-ex svg").length, exHosts: document.querySelectorAll(".mod-ex").length,
      relBtns: document.querySelectorAll(".mod-relkey").length, pivRows: document.querySelectorAll(".mod-table tr.mod-common").length,
      quiz: document.querySelectorAll(".mod-quiz svg").length + "/" + document.querySelectorAll(".mod-quiz .mod-choices button").length,
      folds: document.querySelectorAll("section.sf").length }; })()`);
  check("every diatonic triad spelled right (intervals and letters)", !r.bad.length, r.bad);
  check("common chords are diatonic in both keys", !r.notDia.length, r.notDia);
  check("closely related keys differ by at most one sharp/flat", r.rel);
  check("C and G share C, Em, G, Am", r.cG === "Am,C,Em,G", r.cG);
  check("c♯ and E: iv = ii among the common chords", /iv=ii/.test(r.cE), r.cE);
  check("abcjs plays exactly the voiced notes of every example in every key (" + r.n + ")", !r.mism.length && r.n > 50, r.mism);
  check("every example drawn", r.exDrawn === r.exHosts && r.exHosts >= 8, r.exDrawn + "/" + r.exHosts);
  check("six related-key buttons", r.relBtns === 6, r.relBtns);
  check("C → G pivot table marks 4 common chords", r.pivRows === 4, r.pivRows);
  check("quiz drawn with 7 choices", r.quiz === "1/7", r.quiz);
  check("sections fold", r.folds >= 7, r.folds);
  const r2 = await b.eval(`(async () => {
    document.querySelector(".mod-relkey:nth-child(3)").click(); await new Promise(r => setTimeout(r, 200));
    const relDrawn = !!document.querySelector(".mod-related .mod-stage svg");
    document.querySelector(".mod-pivot tr.mod-common button").click(); await new Promise(r => setTimeout(r, 200));
    const pivDrawn = !!document.querySelector(".mod-pivot .mod-stage svg"), cap = document.querySelector(".mod-pivot .mod-cap").textContent;
    const q = document.querySelector(".mod-quiz"), ann0 = q.querySelectorAll("text.abcjs-annotation").length;
    q.querySelector(".mod-choices button").click(); await new Promise(r => setTimeout(r, 200));
    return { relDrawn, pivDrawn, cap, ann0, ann1: q.querySelectorAll("text.abcjs-annotation").length, score: q.querySelector(".mod-score").textContent }; })()`);
  check("a related key draws a modulation", r2.relDrawn);
  check("Pivot ▶ draws and explains", r2.pivDrawn && /in C major/.test(r2.cap), r2.cap);
  check("quiz hides numerals until answered", r2.ann0 === 0 && r2.ann1 > 0, r2);
  check("no errors on Modulation", !errs().length, errs());

  b.errors.length = 0;
  await b.goto(`http://127.0.0.1:${PORT}/theory/analysed-scores/beethoven-moonlight-1.html?piece=beethoven-moonlight-1&bars=7-8`); await b.sleep(2500);
  const r3 = await b.eval(`(async () => { const S = AnalysedScores.scores().find(s => s.host.offsetParent && s.host.dataset.piece === "beethoven-moonlight-1");
    const strips = [...document.querySelectorAll(".as-keys")].filter(s => s.querySelector(".as-key")).length;
    const keys = [...S.strip.querySelectorAll(".as-key")].map(k => k.textContent).join(" ");
    const hiFromUrl = S.paper.querySelectorAll(".as-hi").length;
    const formBtns = document.querySelectorAll(".as-form .as-form-play").length, secs = document.querySelectorAll(".as-form tr.as-sec").length;
    const links = document.querySelectorAll("a.as-bars").length;
    AnalysedScores.hiBars(S, 5, 9); const bars = new Set([...S.paper.querySelectorAll(".as-hi")].map(n => +/abcjs-mm(\\d+)/.exec(n.getAttribute("class"))[1] + 1));
    AnalysedScores.hiBars(S, 0, -1);
    return { strips, keys, hiFromUrl, formBtns, secs, links, bars: [...bars].sort((a,b)=>a-b).join(","), bar7: AnalysedScores.barMs(S, 7) }; })()`);
  check("a key strip on the Moonlight score", r3.strips === 1, r3.strips);
  check("Moonlight key strip: c♯ E e b f♯ c♯ …", /^c♯ E e b/.test(r3.keys), r3.keys);
  check("?bars=7-8 lights bars on load", r3.hiFromUrl > 0, r3.hiFromUrl);
  check("form table: 9 ▶ rows and 3 section rows", r3.formBtns === 9 && r3.secs === 3, r3);
  check("modulation table: 8 bar links", r3.links === 8, r3.links);
  check("hiBars(5, 9) lights exactly bars 5–9", r3.bars === "5,6,7,8,9", r3.bars);
  check("no errors on Analysed Scores", !errs().length, errs());
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})();
