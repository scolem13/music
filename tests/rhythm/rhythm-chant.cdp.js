// "Conversational" checkbox on every page that plays rhythm patterns, and that it routes to RhythmChant; plus a real render of the voice
// (OfflineAudioContext): a swell grows through its note, a decay does not.
// Render first:  sh scripts/render-test-page.sh practice/rhythms.qmd practice/rhythm-sequences.qmd practice/assessment-rhythm.qmd \
//                  practice/lsa-practice.qmd practice/lsa-practice-notated.qmd practice/lsa-rhythm-assessment.qmd practice/audiation.qmd
// Run: node tests/rhythm/rhythm-chant.cdp.js   (serves /apps live from the repo and the pages from tests/band/lead/site)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/tests/band/lead/site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ico": "image/x-icon" };
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), base = /^\/(apps\/|config\.js|track\.js)/.test(u) ? ROOT : SITE, f = path.join(base, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" }); s.end(d); }); });
(async () => {
  await new Promise(r => srv.listen(0, "127.0.0.1", r)); const host = "http://127.0.0.1:" + srv.address().port;
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), sleep = ms => new Promise(r => setTimeout(r, ms));
  const spy = `window.__rc=[];var P=RhythmChant.play;RhythmChant.play=function(abc,o){__rc.push({abc:abc,ctx:!!o.ctx,when:o.when,spq:o.secPerQuarter,qpm:o.qpm,gain:o.gain});
    var h=P.apply(this,arguments);return h;};true`;

  // ---- pages on rhythm-assessment/app.js and its fork: the checkbox beside Hear pattern; ticked, Hear pattern chants the model on the page's clock
  for (const [pg, dflt] of [["assessment-rhythm", false], ["lsa-practice", true], ["lsa-practice-notated", true], ["lsa-rhythm-assessment", false]]) {
    await b.goto(`${host}/practice/${pg}.html`); await ev(`localStorage.clear()`); await b.goto(`${host}/practice/${pg}.html`); await sleep(1500);
    check(`${pg}: Conversational checkbox beside Hear pattern`, await ev(`!!document.querySelector("#play + label.rc-conv .rc-conv-box")`));
    check(`${pg}: default ${dflt ? "on" : "off"}`, (await ev(`document.querySelector(".rc-conv-box").checked`)) === dflt);
    await ev(spy);
    await ev(`localStorage.clear(); document.querySelector(".rc-conv-box").checked || document.querySelector(".rc-conv-box").click(); true`);
    check(`${pg}: ticking sets RhythmChant.enabled()`, await ev(`RhythmChant.enabled()`) === true);
    if (/lsa-practice/.test(pg)) { await ev(`typeof RA_SEQUENCE`); }
    await ev(`document.getElementById("play").click(); true`); await sleep(600);
    const r = JSON.parse(await ev(`JSON.stringify(__rc)`));
    if (pg.startsWith("lsa-practice")) check(`${pg}: Hear pattern chants via RhythmChant on the page's context`, r.length === 1 && r[0].ctx && r[0].when > 0 && r[0].spq > 0 && /B/.test(r[0].abc), JSON.stringify(r[0] || {}).slice(0, 120));
    else check(`${pg}: Hear pattern chants via RhythmChant on the page's context`, r.length === 1 && r[0].ctx && r[0].when > 0 && r[0].spq > 0, JSON.stringify(r[0] || {}).slice(0, 120));
    await ev(`document.querySelector(".rc-conv-box").click(); __rc.length=0; document.getElementById("play").click(); true`); await sleep(500);
    check(`${pg}: unticked, the old click/woodblock model plays (no RhythmChant)`, (await ev(`__rc.length`)) === 0);
  }

  // ---- pages on abcjs's own player: checkbox + Chant button replace the abcjs control
  for (const pg of ["rhythms", "rhythm-sequences"]) {
    await b.goto(`${host}/practice/${pg}.html`); await sleep(2000);
    check(`${pg}: Conversational checkbox`, await ev(`!!document.querySelector(".rc-bar .rc-conv-box")`));
    await ev(`localStorage.clear(); true`); await ev(spy);
    check(`${pg}: abcjs player shown while off`, await ev(`getComputedStyle(document.getElementById("audio")).display !== "none"`));
    await ev(`document.querySelector(".rc-conv-box").click(); true`);
    check(`${pg}: ticked, the abcjs control is replaced by Chant / Stop`, await ev(`getComputedStyle(document.getElementById("audio")).display === "none" && getComputedStyle(document.querySelector(".rc-play")).display !== "none"`));
    await ev(`document.querySelector(".rc-play").click(); true`); await sleep(500);
    const r = JSON.parse(await ev(`JSON.stringify(__rc)`));
    console.log("   rc calls:", JSON.stringify(r).slice(0, 200));
    check(`${pg}: Chant plays the pattern shown`, r.length === 1 && /M:/.test(r[0].abc), (r[0] || {}).abc && r[0].abc.split("\n").slice(-2).join(" / "));
    await ev(`document.querySelector(".rc-stop").click(); document.querySelector(".rc-conv-box").click(); true`);
    check(`${pg}: unticked, the abcjs control is back`, await ev(`getComputedStyle(document.getElementById("audio")).display !== "none"`));
  }

  // ---- audiation: the hook in playList
  await b.goto(`${host}/practice/audiation.html`); await sleep(2000);
  check("audiation: checkbox in a rhythm-capable panel", await ev(`document.querySelectorAll(".au-grid .rc-conv-box").length >= 1`));
  await ev(`localStorage.clear(); ${spy}; window.__ap=0; AbcPlay.stop=function(){}; AbcPlay.play=function(v,o){__ap++;setTimeout(function(){o.onEnd&&o.onEnd();},5);return{stop(){}}}; true`);
  await ev(`window.__rcOpts=[];RhythmChant.play=function(abc,o){__rc.push({abc:abc,qpm:o.qpm});__rcOpts.push({syllables:o.syllables});setTimeout(function(){o.onEnd&&o.onEnd();},5);return{stop(){}}}; true`);
  await ev(`document.querySelector("#au-ps .au-content").value="dt"; document.querySelector(".au-grid .rc-conv-box").click(); true`);
  await ev(`__rc.length=0; __ap=0; document.querySelector("#au-ps .au-go").click(); true`);
  for (let k = 0; k < 100 && !(await ev(`/Which/.test(document.querySelector("#au-ps .au-status").textContent)`)); k++) await sleep(100);
  const nr = await ev(`__rc.length`), na = await ev(`__ap`);
  check("audiation: rhythm patterns chant (6 patterns), nothing goes to AbcPlay", nr === 6 && na === 0, `rc ${nr}, abcplay ${na}`);

  // ---- Syllables: only where they give nothing away
  check("syllables option only in Read it and Answer with your own", await ev(`[...document.querySelectorAll("#au-ps,#au-sd,#au-tr,#au-gs,#au-ci")].map(r => !!r.querySelector(".rc-syl-box")).join()`) === "false,false,false,true,true");
  await ev(`localStorage.clear(); true`);
  await ev(`document.querySelector("#au-gs .au-content").value="duple"; true`);
  await ev(`document.querySelector("#au-gs .rc-syl-box").click(); __rc.length=0; document.querySelector("#au-gs .au-go").click(); true`); await sleep(500);
  await ev(`[...document.querySelectorAll("#au-gs .au-bar button")].find(b => /Hear it/.test(b.textContent)).click(); true`); await sleep(500);
  const hs = JSON.parse(await ev(`JSON.stringify(window.__rcOpts || [])`));
  check("Read it: Hear it with Syllables ticked asks for the syllables", hs.length > 0 && hs[hs.length - 1].syllables === "rhythm", JSON.stringify(hs));
  check("translate has the experimental Check button; nothing else does", await ev(`!!document.querySelector("#au-tr .au-bar button:last-child") && /Check my syllables/.test(document.querySelector("#au-tr").textContent) && !/Check my syllables/.test(document.querySelector("#au-ps").textContent)`));

  // ---- Check my syllables, with a fake microphone that "hears" the chant synthesised by a different voice (a woman's formants, f0 200)
  await ev(`localStorage.clear(); document.querySelector("#au-tr .au-ready").click(); document.querySelector("#au-tr .au-content").value="duple"; document.querySelector("#au-tr .au-go").click(); true`); await sleep(800);
  await ev(`[...document.querySelectorAll("#au-tr .au-bar button")].find(b => /Show the answer/.test(b.textContent)).click(); true`);
  const syl = await ev(`document.querySelector("#au-tr .au-solf").textContent`);
  check("translate rhythm shows the syllables to compare with", /Du/.test(syl), syl);
  await ev(`(function(){
    var set = Audiation.rhythmSet("duple"), p = set.patterns.find(function (q) { return q.syl === ${JSON.stringify(syl)}; }), tempo = +document.querySelector("#au-tr .au-tempo").value;
    var abc = Audiation.rhythmAbc(p.abc, "B"), qpm = Math.round(tempo * 0.75), s = 1.16;
    var plan = RhythmChant.plan(abc, { qpm: qpm, syllables: "rhythm", seed: 9, f0: 200, formantScale: s, jitterMs: 3, vowels: { u: [370/s, 950/s, 2400/s], e: [470/s, 2400/s, 2900/s], a: [850/s, 1220/s, 2800/s], i: [310/s, 2790/s, 3300/s] } });
    var x = RhythmChant.render(plan, 44100), lead = Math.round(0.7 * 44100), y = new Float32Array(lead + x.length); y.set(x, lead); window.__take = y;
    PitchDetect.mic = function (o) { return { start: function () { return Promise.resolve().then(function () { for (var i = 0; i < y.length; i += 1024) o.onBlock(y.subarray(i, i + 1024), i, 44100); }); }, stop: function () {} }; };
    window.__syls = plan.notes.map(function (n) { return n.syl; });
  })(); true`);
  await ev(`window.__chk = [...document.querySelectorAll("#au-tr .au-bar button")].find(b => /Check my syllables/.test(b.textContent)); __chk.click(); true`); await sleep(500);
  check("Check: listening", /Stop and check/.test(await ev(`__chk.textContent`)));
  await ev(`__chk.click(); true`); await sleep(500);
  const res2 = await ev(`(function(){ var m = /(\\d+)% matched/.exec([...document.querySelectorAll("#au-tr .au-explain")].pop().textContent); return m && +m[1]; })()`);
  console.log("   panel text:", await ev(`[...document.querySelectorAll("#au-tr .au-explain")].pop().textContent`)); check("Check: a synthetic chant in another voice, started 0.7 s late, is mostly recognised", res2 >= 70, res2 + "% matched");
  check("translate has the experimental Check button; partial synthesis does not", !/Check my syllables/.test(await ev(`document.querySelector("#au-ps").textContent`)));

  // ---- the voice itself, rendered offline
  await b.goto(`${host}/practice/lsa-practice.html`); await sleep(1200);
  const res = JSON.parse(await ev(`(async function(){
    var sr=44100;
    async function render(abc){ var p=RhythmChant.plan(abc,{macroBpm:60}); var oc=new OfflineAudioContext(1,Math.ceil((p.total+0.3)*sr),sr);
      RhythmChant.schedule(oc,p,0.02); var buf=await oc.startRendering(), d=buf.getChannelData(0);
      function rms(a,b){var s=0,n=0;for(var i=Math.floor(a*sr);i<Math.min(d.length,Math.floor(b*sr));i++){s+=d[i]*d[i];n++}return Math.sqrt(s/Math.max(n,1));}
      return {p:p,rms:rms,peak:Math.max.apply(null,Array.prototype.map.call(d,Math.abs).slice(0,1)),d:d}; }
    // dotted quarter into an anacrusis at 60 macrobeats/min: 1.5 s note
    var sw=await render("X:1\\nM:2/4\\nL:1/4\\nK:C clef=none\\nB3/2 B/ | B B |");
    var dc=await render("X:1\\nM:2/4\\nL:1/4\\nK:C clef=none\\nB B | B B |");
    var t0=0.02, n=sw.p.notes[0];
    var swEarly=sw.rms(t0+0.15,t0+0.45), swLate=sw.rms(t0+n.dur-0.3,t0+n.dur-0.03);
    var dcEarly=dc.rms(t0+0.0,t0+0.12), dcLate=dc.rms(t0+0.4,t0+0.9);
    var max=0; for(var i=0;i<sw.d.length;i++) max=Math.max(max,Math.abs(sw.d[i]));
    return JSON.stringify({shape:n.shape,swEarly:swEarly,swLate:swLate,dcEarly:dcEarly,dcLate:dcLate,max:max});})()`));
  check("voice: a swell grows through its note (late rms > 1.5 x early)", res.shape === "swell" && res.swLate > res.swEarly * 1.5, JSON.stringify(res));
  check("voice: a plain quarter decays (silent well before the next beat)", res.dcLate < res.dcEarly * 0.1, "");
  check("voice: no clipping", res.max < 0.95 && res.max > 0.05, res.max);

  await b.close(); srv.close();
  console.log(fails ? fails + " FAILED" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
