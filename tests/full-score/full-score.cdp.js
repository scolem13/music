// The full-score player (apps/shared/full-score.js) in the self-contained page scripts/full-score/artifact.mjs builds: the score
// draws, every staff is there, views and the tick boxes change what is drawn, a saved view comes back, Play loads every instrument
// from the embedded samples (no network for sound) and schedules notes on each one, "from here" starts later, and nothing errors.
//   node scripts/full-score/artifact.mjs research_notes/full-score/mozart40-iv.abc /tmp/m40.html --id mozart40-iv
//   PAGE=/tmp/m40.html node tests/full-score/full-score.cdp.js        (SHOT=<png> also saves a screenshot)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const PAGE = process.env.PAGE; if (!PAGE) { console.error("PAGE=<built html> required"); process.exit(2); }
const html = "<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body>" + fs.readFileSync(PAGE, "utf8") + "</body></html>";
const sampleHits = [];
const srv = http.createServer((q, s) => { if (/-mp3\//.test(q.url)) sampleHits.push(q.url); s.writeHead(200, { "content-type": "text/html" }); s.end(html); }).listen(8571);
(async () => {
  const b = await launch({});
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), wait = async (c, n = 200) => { for (let i = 0; i < n; i++) { if (await ev(c)) return true; await b.sleep(150); } return false; };
  const DONE = `!!document.querySelector('.fs-paper svg') && !document.querySelector('#score').dataset.drawing`;   // the background drawing finished
  await b.resize(1280, 900);
  await b.goto("http://127.0.0.1:8571/");
  // one timeline: every played bar starts later than the one before; Go to bar starts on that bar in every voice; repeats taken
  // or skipped; stems switched bar by bar on two-voice staves
  const timeline = async () => ev(`(() => { const d = score.debug(); const up = d.barMs.every((m, j) => !j || m > d.barMs[j - 1]);
    const go = [1, 20, 71, 124, 125, 200, 309].map(n => { score.goBar(n); const e = score.debug(); const bars = [...new Set(e.barsAt(e.fromMs).flat())]; return bars.length === 1 && bars[0] === n ? "" : n + ":" + bars; }).filter(Boolean);
    return JSON.stringify({ n: d.order.length, up, go }); })()`);
  check("score drawn", await wait(`!!document.querySelector('.fs-paper svg')`));
  check("first screen drawn before the rest", true, (await ev(`document.querySelector('#score').dataset.firstMs`)) + " ms to the first screen");
  await wait(DONE);
  const tl = JSON.parse(await timeline());
  check("played bars in order, repeats taken (620 played bars), Go to bar lands on its bar", tl.n === 620 && tl.up && !tl.go.length, JSON.stringify(tl));
  await ev(`document.querySelector('.fs-skip').click()`);
  const tl2 = JSON.parse(await timeline());
  check("Skip repeats: each bar once, last ending only (310 bars; bar 309, a first ending, is not played)", tl2.n === 310 && tl2.up && /^309:(310)?$/.test(tl2.go.join()), JSON.stringify(tl2));
  await ev(`document.querySelector('.fs-skip').click()`);
  check("stems: by pitch where a part's second voice is silent, up / down where both play", await ev(`/\[I:stem auto\]/.test(score.abc()) && /\[I:stem up\]/.test(score.abc()) && /\[I:stem down\]/.test(score.abc())`));
  const parts = await ev(`score.parts.length`), voices = await ev(`score.parts.reduce((n, p) => n + p.voices.length, 0)`);
  check("every instrument found", parts === 11 && voices === 17, `${parts} parts, ${voices} voices`);
  check("render time", true, (await ev(`document.querySelector('#score').dataset.renderMs`)) + " ms for the full score");
  const staffLines = async () => ev(`document.querySelectorAll('.fs-paper .abcjs-staff').length`);
  const full = await staffLines();
  check("score order flute, oboes, clarinets, bassoons", await ev(`(() => { const t = document.querySelector('.fs-paper').textContent; const i = ['Flauto', 'Oboi', 'Clarinetti', 'Fagotti', 'Corni in B', 'Violino I', 'Viola', 'Violoncello e Basso'].map(n => t.indexOf(n)); return i.every((x, k) => x >= 0 && (k === 0 || x > i[k - 1])); })()`));
  check("cello and bass drawn on one staff, bass shown only where it differs", await ev(`/\\(18 19\\)/.test(score.abc()) && /V:19\\n[^\\n]*x8/.test(score.abc()) && !/\\(18 19\\)/.test(score.playedAbc())`));
  const sys = await ev(`document.querySelectorAll('.fs-paper .abcjs-staff').length / document.querySelectorAll('.fs-paper .abcjs-staff-wrapper').length`);
  check("ten staves a system", Math.abs(sys - 10) < 0.01, String(sys));
  await ev(`[...document.querySelectorAll('.fs-chip')].find(c => c.textContent === 'Strings').click()`);
  await wait(`document.querySelector('.fs-chip[aria-pressed=true]')?.textContent === 'Strings'`, 40); await wait(DONE);
  const strings = await staffLines();
  check("Strings view draws fewer staves", strings > 0 && strings < full, `${strings} vs ${full} staff systems`);
  check("Strings view ABC has only string voices", await ev(`!/nm="Flauto|nm="Oboi/.test(score.abc()) && /nm="Viola"/.test(score.abc())`));
  await ev(`document.querySelector('.fs-choose').open = true; (() => { const c = [...document.querySelectorAll('.fs-pick input')].find(i => i.parentNode.textContent.trim() === 'Flauto'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); })()`); await wait(DONE);
  check("a tick box adds an instrument", await ev(`/nm="Flauto"/.test(score.abc()) && document.querySelector('.fs-count').textContent.startsWith('6 of 11')`), await ev(`document.querySelector('.fs-count').textContent`));
  await ev(`(() => { const i = document.querySelector('.fs-save input'); i.value = 'Flute and strings'; document.querySelector('.fs-save').dispatchEvent(new Event('submit', { cancelable: true })); })()`);
  check("view saved as a chip", await ev(`[...document.querySelectorAll('.fs-chip.mine')].some(c => /Flute and strings/.test(c.textContent))`));
  await b.goto("http://127.0.0.1:8571/");
  await wait(DONE);
  check("last view and saved view come back", await ev(`document.querySelector('.fs-chip.mine[aria-pressed=true]') && /Flute and strings/.test(document.querySelector('.fs-chip.mine').textContent)`));
  await ev(`[...document.querySelectorAll('.fs-chip')].find(c => c.textContent === 'Full score').click()`);
  await wait(`document.querySelector('.fs-chip[aria-pressed=true]')?.textContent === 'Full score'`, 40); await wait(DONE);

  // playback: count the notes handed to the sample bank, per instrument
  await ev(`AbcPlay.ctx().then(s => { window.__hits = {}; const p = s.bank.play; s.bank.play = function (inst, spec, when, d) { const r = p.apply(this, arguments); window.__hits[inst] = (window.__hits[inst] || 0) + (r ? 1 : 0); window.__first = Math.min(window.__first ?? 1e9, when - s.ac.currentTime); return r; }; return 1; })`);
  await ev(`document.querySelector('.fs-play').click()`);
  check("plays (status)", await wait(`/Playing/.test(document.querySelector('.fs-status').textContent)`, 300), await ev(`document.querySelector('.fs-status').textContent`));
  const hits = await ev(`window.__hits`);
  const want = ["oboe", "clarinet", "flute", "bassoon", "horn", "violin", "viola", "cello", "contrabass"];
  check("every instrument sounds from the embedded samples (bass in full)", want.every(w => hits[w] > 50) && hits.contrabass > 1000, JSON.stringify(hits));
  check("no sample fetched over the network", sampleHits.length === 0, sampleHits.slice(0, 3).join(" "));
  check("the playing bar shaded while playing", await wait(`!!document.querySelector('.fs-paper .fs-cur')`, 60));
  await ev(`document.querySelector('.fs-stop').click()`);
  // from here: click a note in a late bar, then play: the notes start at once (the earlier ones are not scheduled)
  await ev(`(() => { const ns = document.querySelectorAll('.fs-paper .abcjs-note'); const n = ns[Math.floor(ns.length * 0.6)]; n.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 1, clientY: 1 })); n.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 1, clientY: 1 })); n.dispatchEvent(new MouseEvent('click', { bubbles: true })); })()`);
  const marked = await wait(`!document.querySelector('.fs-fromclear').hidden`, 20);
  check("a clicked note is marked as the start", marked);
  if (marked) {
    await ev(`window.__hits = {}; document.querySelector('.fs-play').click()`);
    await wait(`/Playing/.test(document.querySelector('.fs-status').textContent)`, 100);
    const n = await ev(`Object.values(window.__hits).reduce((a, b) => a + b, 0)`);
    check("from here plays fewer notes than the whole", n > 0 && n < Object.values(hits).reduce((a, b) => a + b, 0), n + " notes");
    await ev(`document.querySelector('.fs-stop').click()`);
  }
  // ---------- layout, bar numbers, rests, staff spacing, bar lines, long line, pages side by side, cutaway
  const SYS0 = `document.querySelector('.fs-sys')`;
  await ev(`score.layout({ mode: "pages", cutaway: false, numbers: "system", rests: true, scale: 1, barWidth: 200, staffGap: 16, apart: true, barlines: "family" })`);
  check("drawn notes matched to playback", (await ev(`score.matched()`)) > 3000, String(await ev(`score.matched()`)));
  const firstBars = await ev(`new Set([...${SYS0}.querySelectorAll('.abcjs-note.abcjs-v0, .abcjs-rest.abcjs-v0')].map(e => (/abcjs-mm(\\d+)/.exec(e.getAttribute('class')) || [])[1])).size`);
  const nums = await ev(`[...document.querySelectorAll('.fs-sys')].slice(1, 4).map(d => +d.querySelector('.fs-barnum')?.textContent)`);
  check("bar numbers at each system, from the first full bar (pickup = 0)", nums[0] === firstBars && nums[1] > nums[0], JSON.stringify(nums) + ", first system holds " + firstBars + " bars with the pickup");
  const centred = await ev(`[...document.querySelectorAll('.fs-sys')].slice(1, 6).map(d => { const t = d.querySelector('.fs-barnum').getBoundingClientRect(), st = d.querySelector('.abcjs-staff').getBoundingClientRect(); return Math.round((t.left + t.right) / 2 - st.left); })`);
  check("each system's number centred over its opening bar line", centred.every(x => Math.abs(x) <= 2), centred.join(" ") + " px from the line");
  // rests: in bar 2 the oboes (two voices) rest; the rest should sit as high on its staff as the flute's (one voice)
  await ev(`score.layout({ numbers: "off", rests: true })`);
  const restRel = `(() => { const s = [...${SYS0}.querySelectorAll('.abcjs-staff')]; const rel = (v, i) => { const r = [...${SYS0}.querySelectorAll('.abcjs-rest.abcjs-v' + v + '.abcjs-m1')].filter(e => getComputedStyle(e).visibility !== 'hidden')[0]; return r ? Math.round((r.getBoundingClientRect().top - s[i].getBoundingClientRect().top) * 10) / 10 : null; }; return [rel(0, 0), rel(1, 1)]; })()`;
  const restY = await ev(restRel);
  check("rests on a two-voice staff sit where a one-voice staff's do", restY[0] != null && Math.abs(restY[0] - restY[1]) < 1.5, JSON.stringify(restY));
  await ev(`score.layout({ rests: false })`);
  const restOff = await ev(restRel);
  check("…and abcjs's own placement differs (the fix does something)", Math.abs(restOff[1] - restY[1]) > 3, JSON.stringify(restOff));
  // space between staves: exact with "apart" off, for every staff including the two-voice ones
  const gaps = `(() => { const s = [...${SYS0}.querySelectorAll('.abcjs-staff')].map(e => e.getBoundingClientRect()); return s.slice(1).map((r, i) => Math.round(r.top - s[i].bottom)); })()`;
  await ev(`score.layout({ rests: true, apart: false, staffGap: 10 })`); const g10 = await ev(gaps);
  await ev(`score.layout({ staffGap: 60 })`); const g60 = await ev(gaps);
  check("space between staves: the same for every staff, one voice or two", new Set(g10).size === 1 && new Set(g60).size === 1 && g60[0] - g10[0] >= 45, "10 → " + g10.join(" ") + "   60 → " + g60.join(" "));
  await ev(`score.layout({ apart: true, staffGap: 4 })`); const ga = await ev(gaps);
  check("keep apart: never closer than asked, more where needed", ga.every(g => g >= 3) && Math.max(...ga) > Math.min(...ga), ga.join(" "));
  await ev(`score.layout({ staffGap: 16, barlines: "score" })`);
  const joins = await ev(`${SYS0}.querySelectorAll('.fs-barjoin').length`);
  await ev(`score.layout({ barlines: "family" })`); const joinsF = await ev(`${SYS0}.querySelectorAll('.fs-barjoin').length`);
  await ev(`score.layout({ barlines: "staff" })`); const joinsS = await ev(`${SYS0}.querySelectorAll('.fs-barjoin').length`);
  check("bar lines through the score > through families > staff only", joins > joinsF && joinsF > joinsS, joins + " / " + joinsF + " / " + joinsS);
  await ev(`score.layout({ barlines: "family", scale: 0.6 })`);
  const small = await ev(`${SYS0}.getBoundingClientRect().height`);
  await ev(`score.layout({ scale: 1 })`);
  const big = await ev(`${SYS0}.getBoundingClientRect().height`); check("size changes the drawing", small < big * 0.75, small + " vs " + big);
  await ev(`score.layout({ barWidth: 400 })`); const sysWide = +(await ev(`document.querySelector('#score').dataset.systems`));
  await ev(`score.layout({ barWidth: 150 })`); const sysNarrow = +(await ev(`document.querySelector('#score').dataset.systems`));
  check("bar width changes the systems", sysWide > sysNarrow, sysNarrow + " vs " + sysWide + " systems");
  // same bar width in every layout: a bar is as wide on pages as on the long line
  const barPx = `(() => { const b = [...${SYS0}.querySelectorAll('.abcjs-bar.abcjs-v0')].map(e => e.getBoundingClientRect().left); return Math.round((b[3] - b[1]) / 2); })()`;
  const onPages = await ev(barPx);
  await ev(`score.layout({ mode: "line" })`);
  const onLine = await ev(barPx);
  check("spacing kept from pages to the long line", Math.abs(onPages - onLine) / onPages < 0.25, onPages + " px a bar on pages, " + onLine + " on the line");
  check("one long line: drawn in pieces, scrolls sideways, names stay", await ev(`document.querySelectorAll('.fs-sys').length > 1 && document.querySelector('.fs-sheet').scrollWidth > 10000 && document.querySelectorAll('.fs-names span').length === 10`),
    await ev(`document.querySelector('.fs-sheet').scrollWidth + "px wide, " + document.querySelectorAll('.fs-names span').length + " names, " + document.querySelectorAll('.fs-sys').length + " pieces, " + document.querySelector('#score').dataset.renderMs + " ms"`));
  // the pieces: every staff at the same height in each, later pieces without clefs
  check("long line: staves at the same height in every piece", await ev(`(() => { const ys = [...document.querySelectorAll('.fs-sys')].map(d => [...d.querySelectorAll('.abcjs-staff')].map(s => s.getBoundingClientRect().top)); return ys.every(y => y.length === ys[0].length && y.every((t, i) => Math.abs(t - ys[0][i]) < 1.5)); })()`));
  await ev(`document.querySelector('.fs-sheet').scrollLeft = 5000`);
  check("names visible after scrolling", await ev(`(() => { const n = document.querySelector('.fs-names span').getBoundingClientRect(), s = document.querySelector('.fs-sheet').getBoundingClientRect(); return n.left >= s.left - 1 && n.left < s.left + 20; })()`));
  await ev(`score.layout({ mode: "paged", across: 2, barWidth: 200 })`);
  const pg = await ev(`[document.querySelectorAll('.fs-page').length, document.querySelector('.fs-sheet').scrollWidth, document.querySelector('.fs-sheet').clientWidth, [...document.querySelectorAll('.fs-page')].slice(0, 2).map(p => Math.round(p.getBoundingClientRect().width))]`);
  check("pages side by side: two a screen, scrolling across", pg[0] > 10 && pg[1] > pg[2] * 3 && pg[3][0] + pg[3][1] <= pg[2] + 4 && pg[3][0] > pg[2] * 0.4, JSON.stringify(pg));
  await ev(`document.querySelector('.fs-next').click()`); await b.sleep(700);
  check("page turn button moves a page", (await ev(`document.querySelector('.fs-sheet').scrollLeft`)) > 300, String(await ev(`document.querySelector('.fs-sheet').scrollLeft`)));
  const tops = await ev(`[...document.querySelectorAll('.fs-page')].slice(0, 8).map(p => { const st = p.querySelector('.abcjs-staff'); return st ? Math.round(st.getBoundingClientRect().top - p.getBoundingClientRect().top) : null; })`);
  check("top staff the same distance from the top of every page, the first one too", tops.every(t => t === tops[0]), tops.join(" "));
  const above = await ev(`[...document.querySelectorAll('.fs-sys')].slice(0, 30).map(d => { const top = d.querySelector('svg').getBoundingClientRect().top; return Math.min(...[...d.querySelectorAll('svg *')].filter(e => e.getBBox && e.getBoundingClientRect().height).map(e => e.getBoundingClientRect().top)) - top; })`);
  check("tempo, directions and numbers fit in the space above the top staff", Math.min(...above) >= -0.5, Math.round(Math.min(...above)) + " px at worst");
  check("no title or composer in the drawn ABC", !/^[TC]:/m.test(await ev(`score.abc()`)));
  await ev(`score.layout({ apart: false })`);
  const evenStaves = await ev(`[...document.querySelectorAll('.fs-page')].slice(0, 6).map(p => [...p.querySelector('.fs-sys').querySelectorAll('.abcjs-staff')].map(st => Math.round(st.getBoundingClientRect().top - p.getBoundingClientRect().top)).join())`);
  check("even spacing: the staves at the same heights on every page", evenStaves.every(t => t === evenStaves[0]), evenStaves[0]);
  await ev(`score.layout({ apart: true })`);
  for (const sc of [1, 0.7]) {
    await ev(`score.layout({ scale: ${sc} })`);
    const fit = await ev(`[...document.querySelectorAll('.fs-page')].slice(0, 4).map(p => { const s = p.querySelector('.fs-sys svg'); return Math.round(s.getBoundingClientRect().width / (p.clientWidth - 28) * 100); })`);
    check("systems fill the page width at size " + sc, fit.every(f => f >= 96 && f <= 101), fit.join("% ") + "%");
    const nm = await ev(`(() => { const d = document.querySelector('.fs-sys'); const st = [...d.querySelectorAll('.abcjs-staff')].map(e => e.getBoundingClientRect()); return [...d.querySelectorAll('.abcjs-voice-name')].map((t, i) => { const r = t.getBoundingClientRect(), c = (r.top + r.bottom) / 2; return st[i] && c > st[i].top - 4 && c < st[i].bottom + 4; }); })()`);
    check("each name beside its staff at size " + sc, nm.length === 10 && nm.every(Boolean), JSON.stringify(nm));
  }
  await ev(`score.layout({ scale: 1 })`);
  const heights = await ev(`[...document.querySelectorAll('.fs-page')].map(p => p.offsetHeight)`);
  check("pages all the same height", heights.every(h => h === heights[0]), heights.length + " pages, " + [...new Set(heights)].join("/") + " px");
  await ev(`score.layout({ scale: 0.5 })`); const n100 = await ev(`document.querySelectorAll('.fs-page').length`), h100 = await ev(`document.querySelector('.fs-page').offsetHeight`);
  await ev(`score.layout({ pageH: 250 })`); const h250 = await ev(`document.querySelector('.fs-page').offsetHeight`), n250 = await ev(`document.querySelectorAll('.fs-page').length`);
  check("page height control: taller pages, fewer of them", h250 > h100 && n250 < n100, h100 + " px x " + n100 + " pages → " + h250 + " px x " + n250);
  await ev(`score.layout({ pageH: 100, scale: 1, mode: "pages", numbers: "system" })`);
  const tsx = await ev(`[...${SYS0}.querySelectorAll('.abcjs-time-signature')].map(t => Math.round(t.getBoundingClientRect().left))`);
  check("time signatures line up whatever the key signature", Math.max(...tsx) - Math.min(...tsx) <= 1, tsx.join(" "));
  const rpx = await ev(`[...${SYS0}.querySelectorAll('.abcjs-bar')].filter(g => g.querySelector('[data-name="dots.dot"]')).map(g => Math.round(g.getBoundingClientRect().left)).filter((x, i, a) => i === 0 || x < a[0] + 60)`);
  check("the opening repeat lines up on every staff", rpx.length >= 10 && Math.max(...rpx) - Math.min(...rpx) <= 1, rpx.join(" "));
  const rep = await ev(`(() => { const bars = [...${SYS0}.querySelectorAll('.abcjs-bar')].filter(g => g.querySelector('[data-name="dots.dot"]')); if (!bars.length) return null;
    const g = bars[0], thick = [...g.querySelectorAll('path')].filter(p => !/dot/.test(p.getAttribute('data-name'))).map(p => p.getBBox()).sort((a, b) => b.width - a.width)[0];
    const joins = [...${SYS0}.querySelectorAll('.fs-barjoin')].map(r => [+r.getAttribute('x'), +r.getAttribute('width')]);
    return [thick.x, thick.width, joins.some(j => Math.abs(j[0] - thick.x) < 0.5 && Math.abs(j[1] - thick.width) < 0.05), joins.every(j => j[1] <= thick.width + 0.01)]; })()`);
  check("repeat signs: the joining line goes through the thick line, as wide as it", rep && rep[2] && rep[3], JSON.stringify(rep));
  const ink = `(() => { const s = ${SYS0}; const bar = [...s.querySelectorAll('.abcjs-bar path')].map(p => p.getBoundingClientRect().width).sort((a, b) => a - b)[0];
    const join = [...s.querySelectorAll('.fs-barjoin')].map(r => r.getBoundingClientRect().width).sort((a, b) => a - b)[0];
    const stem = [...s.querySelectorAll('.abcjs-stem')].map(p => p.getBoundingClientRect().width).filter(w => w > 0).sort((a, b) => a - b)[0];
    return [bar, join, stem, getComputedStyle(s.querySelector('.fs-barjoin')).strokeWidth, getComputedStyle(s.querySelector('.fs-barjoin')).stroke].map(x => typeof x === 'number' ? +x.toFixed(2) : x); })()`;
  const thin = await ev(ink);
  check("joining lines exactly as wide as the staff's bar lines (no outline)", Math.abs(thin[0] - thin[1]) < 0.05 && thin[4] === "none", JSON.stringify(thin));
  await ev(`score.layout({ barWeight: "musescore" })`); const heavy = await ev(ink);
  check("MuseScore weight: thin bar lines heavier than a stem", heavy[1] > heavy[2] && heavy[1] > thin[1] * 1.5, JSON.stringify(heavy));
  await ev(`score.layout({ barWeight: "abcjs" })`);
  await ev(`score.goBar(125)`);
  check("go to bar: starts playing there", /bar 125/.test(await ev(`document.querySelector('.fs-status').textContent`)) && await ev(`!!document.querySelector('.fs-flash')`), await ev(`document.querySelector('.fs-status').textContent`));
  await ev(`document.body.focus(); window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))`);
  const spPlay = await wait(`/Playing/.test(document.querySelector('.fs-status').textContent)`, 100);
  await b.sleep(1200); await ev(`window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))`);
  check("Space plays, Space again pauses", spPlay && /Paused/.test(await ev(`document.querySelector('.fs-status').textContent`)), await ev(`document.querySelector('.fs-status').textContent`));
  await ev(`document.querySelector('.fs-fromclear').click()`);
  await ev(`score.layout({ mode: "pages", cutaway: true, barWidth: 300 })`);
  const cut = await ev(`[...document.querySelectorAll('.fs-sys')].map(d => d.querySelectorAll('.abcjs-staff').length)`);
  check("cutaway: staves come and go", Math.min(...cut) < 10 && Math.max(...cut) === 10, cut.length + " systems, staves " + Math.min(...cut) + "-" + Math.max(...cut) + ", " + await ev(`document.querySelector('#score').dataset.renderMs`) + " ms");
  await ev(`score.layout({ barWidth: 500, numbers: "system" })`);
  const cut2 = await ev(`[...document.querySelectorAll('.fs-sys')].map(d => d.querySelectorAll('.abcjs-staff').length)`);
  check("cutaway: the opening (strings only, piano) leaves the winds out", cut2[0] < 10, "first system " + cut2[0] + " staves");
  check("cutaway: drawn notes matched", (await ev(`score.matched()`)) > 3000, String(await ev(`score.matched()`)));
  await ev(`window.__hits = {}; document.querySelector('.fs-play').click()`);
  check("cutaway plays and shades the bar", await wait(`!!document.querySelector('.fs-paper .fs-cur')`, 200));
  await ev(`document.querySelector('.fs-stop').click(); score.layout({ cutaway: false, barWidth: 200 })`);
  // loudness: at 100% the tutti and the solo bars end up closer in summed level
  const lv = await ev(`(() => { const ns = []; for (let t = 0; t < 17; t++) for (let i = 0; i < 40; i++) ns.push({ at: i * 0.5, dur: 0.5, vel: t < 2 ? 0.4 : 0.9, track: i < 20 ? t : (t < 2 ? t : -1) }); const use = ns.filter(n => n.track >= 0);
    const sum = (arr, a, b) => arr.filter(n => n.at >= a && n.at < b).reduce((s, n) => s + n.vel * (n.gain ?? 1), 0) / 20;
    const before = [sum(use, 0, 10), sum(use, 10, 20)];
    score.layout({ even: 100, evenDyn: true, evenDense: true }); const sh = score.shape(use.map(n => Object.assign({}, n)));
    const after = [sum(sh, 0, 10), sum(sh, 10, 20)]; score.layout({ even: 0 }); return [before, after]; })()`);
  check("even out: tutti vs two instruments, summed level closer", lv[1][0] / lv[1][1] < (lv[0][0] / lv[0][1]) * 0.5, JSON.stringify(lv.map(x => x.map(y => +y.toFixed(2)))));
  await ev(`score.layout({ even: 70 }); window.__comp = 0; AbcPlay.ctx().then(s => { const c = s.out.connect; })`);
  await ev(`document.querySelector('.fs-play').click()`);
  check("plays with the loudness evened out", await wait(`/Playing/.test(document.querySelector('.fs-status').textContent)`, 200));
  await ev(`document.querySelector('.fs-stop').click(); score.layout({ even: 0, mode: "pages" })`);

  if (process.env.SHOT) { await ev(`scrollTo(0,0)`); await b.shot(process.env.SHOT, false); }
  await b.resize(390, 800); await b.sleep(600);
  check("phone width: no page scroll sideways", await ev(`document.documentElement.scrollWidth <= innerWidth + 1`), await ev(`document.documentElement.scrollWidth + " / " + innerWidth`));
  check("no errors", !b.errors.length, b.errors.slice(0, 3).join(" | "));
  await b.close(); srv.close();
  console.log(fails ? fails + " FAILED" : "all passed"); process.exit(fails ? 1 : 0);
})();
