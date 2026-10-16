// The IPA chart page in headless Chrome: charts draw, a click fills the detail panel, language filter and search dim symbols,
// sections fold and the right-hand contents bar opens a folded one, nothing overflows at 390px.
// Run after `quarto render tools/ipa-chart.qmd`: node tests/ipa/ipa-chart.cdp.js [screenshot dir]   (serves _site on 8512)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".svg") ? "image/svg+xml" : "text/html; charset=utf-8";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8512);
(async () => {
  const b = await launch({ width: 1280, height: 900 }), out = process.argv[2] || "/tmp";
  let fails = 0; const check = (n, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + n + (info ? "  " + info : "")); if (!ok) fails++; };
  await b.goto("http://127.0.0.1:8512/tools/ipa-chart.html"); await b.sleep(900);
  const count = await b.eval(`({v: document.querySelectorAll('#ipa-vowels .ipa-sym').length, c: document.querySelectorAll('#ipa-consonants .ipa-sym').length,
    a: document.querySelectorAll('#ipa-affricates .ipa-card').length, secs: document.querySelectorAll('section.level2.ls-sec').length, toc: document.querySelectorAll('#TOC a').length})`);
  check("charts drawn", count.v === 28 && count.c > 60 && count.a > 8 && count.secs === 9, JSON.stringify(count));
  check("contents bar lists the sections", count.toc >= 9, "" + count.toc);
  await b.eval(`document.querySelector('#ipa-vowels [data-id="ɯ"]').click()`);
  let t = await b.eval(`document.querySelector('#ipa-vowels .ipa-detail').innerText`);
  check("click shows description and examples", /Korean/.test(t) && /Japanese/.test(t) && /은행/.test(t) && /うみ|う/.test(t) && !/Hindi/.test(t.split('Not used')[0] || ''), t.slice(0, 120).replace(/\n/g, " | "));
  await b.eval(`document.querySelector('#ipa-vowels [data-id="y"]').click()`);
  t = await b.eval(`document.querySelector('#ipa-vowels .ipa-detail').innerText`);
  check("French/German only for y", /French/.test(t) && /German/.test(t) && /Not used in: English, Hindi, Marathi, Korean, Japanese/.test(t), t.replace(/\n/g, " | ").slice(-120));
  // filter by language: Japanese only
  await b.eval(`document.querySelector('#ipa-filter input[value=ja]').click()`);
  const f1 = await b.eval(`({dimU: document.querySelector('#ipa-vowels [data-id="u"]').classList.contains('ipa-dim'), litW: !document.querySelector('#ipa-vowels [data-id="ɯ"]').classList.contains('ipa-dim'),
    dimTh: document.querySelector('#ipa-consonants [data-id="θ"]').classList.contains('ipa-dim')})`);
  check("language filter dims sounds Japanese lacks", f1.dimU && f1.litW && f1.dimTh, JSON.stringify(f1));
  await b.eval(`document.querySelector('#ipa-filter #ipa-clear').click()`);
  await b.eval(`(() => { const q = document.querySelector('#ipa-q'); q.value = 'retroflex'; q.dispatchEvent(new Event('input')); })()`);
  const f2 = await b.eval(`({lit: [...document.querySelectorAll('#ipa-consonants .ipa-sym:not(.ipa-dim)')].map(x => x.dataset.id).join(''), dimP: document.querySelector('#ipa-consonants [data-id="p"]').classList.contains('ipa-dim')})`);
  check("search narrows to retroflex", f2.dimP && f2.lit.includes('ʈ') && f2.lit.includes('ɳ'), JSON.stringify(f2));
  await b.eval(`(() => { const q = document.querySelector('#ipa-q'); q.value = 'भ'; q.dispatchEvent(new Event('input')); })()`);
  const f3 = await b.eval(`[...document.querySelectorAll('#ipa-modified .ipa-card:not(.ipa-dim)')].map(x => x.dataset.id).join(' ')`);
  check("search finds Devanagari example", f3 === 'bʱ', f3);
  await b.eval(`document.querySelector('#ipa-filter #ipa-clear').click()`);
  // folding and the contents bar
  await b.eval(`document.querySelector('#consonants > h2').click()`);
  check("section folds", await b.eval(`document.getElementById('consonants').classList.contains('ls-shut')`));
  await b.eval(`document.querySelector('#TOC a[href$="#consonants"]').click()`); await b.sleep(300);
  check("contents link opens a folded section", await b.eval(`!document.getElementById('consonants').classList.contains('ls-shut')`));
  await b.eval(`document.querySelector('#series [data-sym="t͡ɕ͈"] .ipa-sym, #series [data-sym="t͡ɕʰ"] .ipa-sym').click()`);
  t = await b.eval(`document.querySelector('#ipa-series .ipa-detail').innerText`);
  check("series symbol opens its detail in the series section", /Korean/.test(t), t.slice(0, 60).replace(/\n/g, " "));
  await b.shot(out + "/ipa-desktop.png", false);
  await b.eval(`document.getElementById('vowels').scrollIntoView()`); await b.sleep(200);
  await b.shot(out + "/ipa-vowels.png", false);
  // vowel synth: formant grid, and a drag on the trapezoid moves the point and sounds
  const fm = await b.eval(`({i: IpaSynth.formants(0,0,0), u: IpaSynth.formants(0,2,1), a: IpaSynth.formants(6,0,0)})`);
  check("synth formants: [i] high F2, [u] low F2, [a] high F1", fm.i[1] > 2000 && fm.u[1] < 900 && fm.a[0] > 700, JSON.stringify(fm));
  const dr = await b.eval(`(() => { document.querySelector('.ipa-synth [data-k=r]').value = 0; const p = document.querySelector('#ipa-vowels .plot'), r = p.getBoundingClientRect();
    const ev = (t, x, y) => p.dispatchEvent(new PointerEvent(t, {bubbles: true, pointerId: 1, clientX: r.left + r.width * x, clientY: r.top + r.height * y}));
    ev('pointerdown', .97, .97); const s1 = IpaSynth.state(), on = IpaSynth.playing(); ev('pointermove', .2, .03); const s2 = IpaSynth.state(); ev('pointerup', .2, .03);
    return {s1, s2, on, off: !IpaSynth.playing(), read: document.querySelector('.ipa-vread').textContent}; })()`);
  check("drag sings through the chart", dr.on && dr.off && dr.s1.h > 5.5 && dr.s1.c > 1.8 && dr.s2.h < 0.5 && dr.s2.c < 0.3 && /nearest \[i\]/.test(dr.read), JSON.stringify(dr));
  const errs = b.errors.filter(e => !/supabaseUrl/.test(e)); check("no page errors (desktop)", !errs.length, errs.join(" | "));
  // phone width
  await b.resize(390, 800); await b.goto("http://127.0.0.1:8512/tools/ipa-chart.html"); await b.sleep(900);
  const ph = await b.eval(`({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, vw: document.querySelector('.ipa-vwrap').getBoundingClientRect().right})`);
  check("no horizontal page scroll at 390px", ph.sw <= ph.cw + 1, JSON.stringify(ph));
  await b.eval(`document.querySelector('#ipa-vowels [data-id="ø"]').click()`); await b.sleep(400);
  await b.eval(`document.getElementById('vowels').scrollIntoView()`); await b.sleep(300);
  await b.shot(out + "/ipa-phone.png", false);
  await b.eval(`document.getElementById('consonants').scrollIntoView()`); await b.sleep(300);
  await b.shot(out + "/ipa-phone-cons.png", false);
  const errs2 = b.errors.filter(e => !/supabaseUrl/.test(e)); check("no page errors (phone)", !errs2.length, errs2.join(" | "));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
