// lessons/ornaments-by-period.qmd: every example draws, the flow chart walks a path to advice (and a changed answer redoes the
// path below it), a composer answers the period, and examples play (ABC through AbcPlay; a data-bend one through the guitar).
// Run after rendering:  sh scripts/render-test-page.sh lessons/ornaments-by-period.qmd; node tests/lessons/ornaments-by-period.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/tests/band/lead/site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".mp3") ? "audio/mpeg" : "text/html";
// the page comes from the test site; /apps/ from the source tree (so the newest scripts); samples from the local mirror at /sf/
const handler = (q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]);
  const f = u.startsWith("/sf/") ? path.join(SITE, u) : u.startsWith("/apps/") ? path.join(ROOT, u) : path.join(SITE, u);
  s.setHeader("access-control-allow-origin", "*");
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); };
const srv = http.createServer(handler).listen(8524);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  await b.goto("http://127.0.0.1:8524/lessons/ornaments-by-period.html"); await b.sleep(3000);
  const d = JSON.parse(await ev(`JSON.stringify({ ex: document.querySelectorAll('.abc-ex').length, svg: [...document.querySelectorAll('.abc-ex')].filter(e => e.querySelector('svg')).length })`));
  check("every example draws", d.ex >= 35 && d.svg === d.ex, JSON.stringify(d));
  // flow chart: Baroque -> French -> trill
  await ev(`OrnamentFlow.answer('period','baroque'); OrnamentFlow.answer('region','french'); OrnamentFlow.answer('sign','trill')`);
  let t = await ev(`document.querySelector('.ob-result h4').textContent + ' | ' + document.querySelector('.ob-result').textContent.includes('table')`);
  check("Baroque French trill -> upper note, check the table", /note above/.test(t) && /true$/.test(t), t);
  // change the period: the path below it is redone
  await ev(`[...document.querySelectorAll('#ob-chain .ob-node')][0].querySelectorAll('button')[2].click()`);
  t = await ev(`JSON.stringify({ nodes: document.querySelectorAll('#ob-chain .ob-node').length, result: !!document.querySelector('.ob-result') })`);
  check("changing the first answer drops the old path", t === JSON.stringify({ nodes: 2, result: false }), t);
  await ev(`OrnamentFlow.answer('who','chopin'); OrnamentFlow.answer('sign','grace'); OrnamentFlow.answer('slash','no')`);
  t = await ev(`document.querySelector('.ob-result h4').textContent`);
  check("Chopin grace -> with the bass", /bass/.test(t), t);
  await ev(`const c = document.getElementById('ob-composer'); c.value = 'Bach'; c.dispatchEvent(new Event('input'))`);
  t = await ev(`JSON.stringify(OrnamentFlow.state())`);
  check("typing Bach answers Baroque, German", /"period":"baroque"/.test(t) && /"region":"german"/.test(t) && /J. S. Bach/.test(t), t);
  // every path ends in advice (no blank result)
  const bad = await ev(`(() => { const out = []; const signs = ['grace','trill','mordent','turn','none','fermata'];
    for (const p of ['baroque','classical','romantic','modern']) for (const sg of signs) for (const sl of ['yes','no']) {
      OrnamentFlow.restart(); OrnamentFlow.answer('period', p);
      if (p === 'baroque') OrnamentFlow.answer('region','italian'); if (p === 'romantic') OrnamentFlow.answer('who','late'); if (p === 'modern') OrnamentFlow.answer('legend','no');
      OrnamentFlow.answer('sign', sg); if (sg === 'grace' && p !== 'modern') OrnamentFlow.answer('slash', sl);
      const h = document.querySelector('.ob-result h4'); if (!h || !h.textContent) out.push(p + '/' + sg + '/' + sl); }
    for (const pt of ['section','solo']) for (const j of ['fall','doit','scoop','shake','grace','none']) {
      OrnamentFlow.restart(); OrnamentFlow.answer('period','jazz'); OrnamentFlow.answer('part', pt); OrnamentFlow.answer('jsign', j);
      if (!document.querySelector('.ob-result h4')) out.push('jazz/' + pt + '/' + j); }
    OrnamentFlow.restart(); OrnamentFlow.answer('period','modern'); OrnamentFlow.answer('legend','yes'); if (!document.querySelector('.ob-result h4')) out.push('modern/legend');
    return out.join(','); })()`);
  check("every path ends in advice", bad === "", bad);
  // sound: a Classical example through AbcPlay, then the jazz fall through the guitar
  await ev(`Object.defineProperty(window, 'getSoundfontUrl', { configurable: true, value: () => Promise.resolve(location.origin + '/sf/') });
    window.__ex = [...document.querySelectorAll('.abc-ex')].find(e => /Played, second time/.test(e.textContent)); window.__ex.querySelector('button').click();`);
  let lit = 0; for (let k = 0; k < 40; k++) { await b.sleep(250); lit = Math.max(lit, await ev(`window.__ex.querySelectorAll('.abc-on').length`)); }
  check("an example plays through AbcPlay with notes lit", lit > 0 && await ev(`!!window.AbcPlay`), lit);
  await ev(`window.__ramps = []; const o = AudioParam.prototype.linearRampToValueAtTime;
    AudioParam.prototype.linearRampToValueAtTime = function (v, t) { window.__ramps.push(v); return o.call(this, v, t); };
    [...document.querySelectorAll('.abc-ex')].find(e => /With a fall/.test(e.textContent)).querySelector('button').click();`);
  await b.sleep(6000);
  const r = JSON.parse(await ev(`JSON.stringify({ fail: BandSounds.failures.length, rates: window.__ramps.filter(v => v > 0.2 && v < 4).length })`));
  check("the jazz fall slides on guitar", r.fail === 0 && r.rates >= 2, JSON.stringify(r));
  srv.close(); b.close(); process.exit(fails ? 1 : 0);
})();
