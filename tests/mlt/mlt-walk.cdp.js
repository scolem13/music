// MLT book pages: the Mullen walk-through renders its steps, the teacher/student switch hides the teacher parts,
// the players play, and the activities page filters. Render first:
//   quarto render mlt/index.qmd mlt/mullen.qmd mlt/activities.qmd
//   node tests/mlt/mlt-walk.cdp.js        (SITE=<dir> tests a render made elsewhere)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8551);
const U = "http://127.0.0.1:8551";
(async () => {
  const b = await launch({});
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  const wait = async (cond, n = 60) => { for (let i = 0; i < n; i++) { if (await ev(cond)) return true; await b.sleep(150); } return false; };
  await b.resize(1200, 900);

  await b.goto(U + "/mlt/mullen.html?view=teacher");
  await wait(`document.querySelectorAll('.mlt-step').length > 0`);
  check("Unit 1 has its six steps", await ev(`document.querySelectorAll('#u1, [data-unit=u1] .mlt-step').length`) === 6);
  check("every unit has steps", await ev(`[...document.querySelectorAll('.mlt-unit')].every(u => u.querySelector('.mlt-step'))`));
  check("reading players built", await ev(`document.querySelectorAll('#u6-read-duple .mlt-score svg, #u7-fpifo-notation .mlt-score svg').length`) === 2);
  check("enrhythmic step shows 4/4", await ev(`(() => { const sv = document.querySelector('#u6-enrhythmic .mlt-score svg'); return !!sv && sv.querySelectorAll('.abcjs-time-signature').length > 0; })()`));
  check("outline lists Part I chapters", await ev(`document.querySelectorAll('.mlt-outline li').length`) >= 9);
  check("tune links go to the tune page", await ev(`document.querySelector('.mlt-tunes a').getAttribute('href')`) === "/practice/tunes.html?tune=chew-chew-chew");
  check("teacher sees page citations", await ev(`[...document.querySelectorAll('.mlt-cite')].some(e => e.offsetParent)`));
  check("echo players built", await ev(`document.querySelectorAll('.mlt-do .next').length`) >= 10, String(await ev(`document.querySelectorAll('.mlt-do .next').length`)));
  check("Unit 1 First Whole lists its recordings", await ev(`document.querySelectorAll('#u1-first-whole .mlt-recs li').length`) === 5);
  check("recordings say they are not online while the bucket is unset", await ev(`!window.MLT_REC_BASE === /not online/.test(document.querySelector('#u1-first-whole .mlt-recs').textContent)`));
  // play a tonal pattern and a rhythm pattern
  await ev(`(window.__ab = []), (() => { const p = AbcPlay.play; AbcPlay.play = function (v, o) { __ab.push(o.qpm); return p.call(this, v, o); };
    if (window.RhythmChant) { const r = RhythmChant.play; RhythmChant.play = function (a, o) { __ab.push((o || {}).qpm); return r.call(this, a, o); }; } })()`);   // the rhythm echo plays through RhythmChant
  await ev(`document.querySelector('#u1-tonal-lsa .next').click()`);
  await ev(`document.querySelector('#u1-rhythm-lsa .next').click()`);
  check("players call AbcPlay / RhythmChant", await wait(`__ab.length >= 2`), await ev(`JSON.stringify(__ab)`));
  await ev(`(() => { const s = document.querySelector('#u1-tonal-lsa .m'); s.value = 'rest'; document.querySelector('#u1-tonal-lsa .ans').click(); })()`);
  check("resting-tone answer is DO in major", await wait(`/\\(DO\\)/.test(document.querySelector('#u1-tonal-lsa .mlt-msg').textContent)`));
  // student view
  await ev(`document.querySelector('.mlt-view input[value=student]').click()`);
  check("student view hides teacher text", await ev(`[...document.querySelectorAll('.mlt-step .mlt-t')].every(e => !e.offsetParent)`));
  check("student view keeps the activities", await ev(`[...document.querySelectorAll('.mlt-do')].filter(e => e.offsetParent).length`) === await ev(`document.querySelectorAll('.mlt-do').length`));
  check("student view shows student lines of activities", await ev(`[...document.querySelectorAll('#u1-rhythm-second-whole .mlt-act')].filter(e => e.offsetParent).length`) >= 8);

  // DMTI: the units' exercises are generated and play through the band
  await b.goto(U + "/mlt/dmti.html?view=teacher");
  await wait(`document.querySelectorAll('.mlt-dmti').length > 50`, 120);
  const dm = await ev(`JSON.stringify({ steps: document.querySelectorAll('.mlt-step').length, cards: document.querySelectorAll('.mlt-dmti').length,
    todo: [...document.querySelectorAll('.mlt-unit')].filter(u => /Not entered yet: /.test(u.textContent)).length })`);
  check("DMTI: eleven units of eight steps, none waiting", /"steps":88,.*"todo":0/.test(dm), dm);
  await ev(`(window.__dp = []), (() => { const p = AbcPlay.play; AbcPlay.play = function (v, o) { __dp.push({ style: o.style, melody: o.melody, hasAbc: !!o.abc }); return { stop() {} }; }; })()`);
  await ev(`(() => { const c = document.querySelectorAll('#d1u1-p4a .mlt-dmti')[0]; [...c.querySelectorAll('button')].find(x => /Example/.test(x.textContent)).click(); [...c.querySelectorAll('button')].find(x => /Band only/.test(x.textContent)).click(); })()`);
  const dp = await ev(`JSON.stringify(__dp)`);
  check("DMTI: Example plays with the band in the unit's style; Band only leaves out the melody", dp === '[{"style":"folk","melody":true,"hasAbc":true},{"style":"folk","melody":false,"hasAbc":true}]', dp);
  const ne = await ev(`(() => { const c = document.querySelectorAll('#d1u1-p4a .mlt-dmti')[0]; [...c.querySelectorAll('button')].find(x => /notation/.test(x.textContent)).click();
    const a = c.querySelector('.mlt-dscore').innerHTML; [...c.querySelectorAll('button')].find(x => /New example/.test(x.textContent)).click(); return a.length > 500 && a !== c.querySelector('.mlt-dscore').innerHTML; })()`);
  check("DMTI: New example draws a different example", ne);
  const v2 = await ev(`(() => { const c = document.querySelectorAll('#d1u1-p4a .mlt-dmti')[1]; [...c.querySelectorAll('button')].find(x => /notation/.test(x.textContent)).click();
    return [...c.querySelectorAll('.mlt-dim')].map(x => x.textContent).join(' | '); })()`);
  check("DMTI: Skill 2 parts as in the book (DO SO, DO TI, MI FA, SO)", v2 === "Bass line: DO and SO | DO and TI | MI and FA | SO", v2);

  // the bottom strip's Stop: present, lit while sound plays, stops it (DMTI card through the band, and the chant)
  await b.goto(U + "/mlt/dmti.html?view=teacher");
  await wait(`document.querySelectorAll('.mlt-dmti').length > 50`, 120);
  check("Stop: the bottom strip has a disabled Stop when idle", await ev(`(() => { const s = document.querySelector('#mlt-stopbar #mlt-stop'); return !!s && s.disabled && s.offsetParent !== null; })()`));
  await ev(`(() => { const c = document.querySelectorAll('#d1u1-p4a .mlt-dmti')[0]; [...c.querySelectorAll('button')].find(x => /Example/.test(x.textContent)).click(); })()`);
  check("Stop: enabled while the band plays a DMTI example", await wait(`!document.querySelector('#mlt-stop').disabled`, 80));
  await ev(`document.querySelector('#mlt-stop').click()`);
  check("Stop: click stops it (AbcPlay idle, button disabled again)", await wait(`!AbcPlay.playing() && document.querySelector('#mlt-stop').disabled`, 40));
  await ev(`window.__ch = RhythmChant.play('X:1\\nM:4/4\\nL:1/4\\nK:C\\nCCCC|CCCC|CCCC|CCCC|', { qpm: 60 })`);
  check("Stop: enabled while the chant sounds", await ev(`!document.querySelector('#mlt-stop').disabled`));
  await ev(`document.querySelector('#mlt-stop').click()`);
  check("Stop: click silences the chant", await wait(`document.querySelector('#mlt-stop').disabled`, 40));

  // JRI recorder on saxophone: the notes of a section, written for the chosen saxophone
  await b.goto(U + "/mlt/jri-sax.html?view=teacher");
  await wait(`document.querySelectorAll('.mlt-sax-card').length > 10`, 80);
  const sx = await ev(`JSON.stringify({ steps: document.querySelectorAll('.mlt-step').length,
    alto: [...document.querySelectorAll('#jr3B-2 .mlt-sax-l')].map(x => x.textContent).join(', '),
    minor: [...document.querySelectorAll('#jr5A-2 .mlt-sax-l')].map(x => x.textContent).join(', '),
    tenor: (() => { const sel = document.querySelector('#jr3B-2 .mlt-ctl select'); sel.value = 'tenor'; sel.onchange(); return [...document.querySelectorAll('#jr3B-2 .mlt-sax-l')].map(x => x.textContent).join(', '); })(),
    drawn: document.querySelectorAll('.mlt-sax-card svg .sxc-down').length > 20 })`);
  check("JRI on sax: 24 sections x 3 parts; concert B\u266d on alto is written G-DO (TI below), E\u266d is C-DO, C minor is A-LA; tenor writes C-DO",
    sx === JSON.stringify({ steps: 72, alto: "DO G4, TI F\u266f4, RE A4, MI B4, SO D4, DO C5, TI B4", minor: "LA A4, SI G\u266f4, TI B4, DO C5, MI E4", tenor: "DO C5, TI B4, RE D5, MI E5, SO G4, DO F4, TI E4", drawn: true }), sx);
  await ev(`(() => { try { localStorage.removeItem('mlt-sax'); } catch (e) {} })()`);

  // the lesson planner: build, run, and the class screen follows over BroadcastChannel (here in an iframe)
  await b.goto(U + "/mlt/lesson-builder.html");
  await wait(`document.querySelectorAll('#lb-unit option').length > 3`, 80);
  const lb = await ev(`(() => { document.querySelector('#lb-book').value = 'mullen'; document.querySelector('#lb-book').onchange();
    document.querySelector('#lb-unit').value = 'u1'; document.querySelector('#lb-build').click();
    return JSON.stringify({ items: document.querySelectorAll('.lb-item').length, summary: document.querySelector('#lb-summary').textContent, title: document.querySelector('#lb-title').textContent }); })()`);
  check("planner: a 45-minute plan for Mullen Unit 1 opens on its song", /"summary":"\d+ items, 45 of 45 minutes".*"title":"First Whole: major and duple songs"/.test(lb), lb);
  await ev(`(() => { const f = document.createElement('iframe'); f.id = 'cs'; f.src = location.pathname + '?screen=class'; f.style.cssText = 'width:900px;height:600px'; document.body.appendChild(f); })()`);
  await wait(`(() => { try { return !!document.querySelector('#cs').contentDocument.querySelector('#cs-title'); } catch (e) { return false; } })()`, 120);
  await b.sleep(1500);
  await ev(`document.querySelector('#lb-skip').click()`);
  const cs = await wait(`(() => { const d = document.querySelector('#cs').contentDocument; return /Rhythm Lesson 2/.test(d.querySelector('#cs-title').textContent) && !!d.querySelector('#cs-body .mlt-do'); })()`, 60);
  check("planner: the class screen shows the next item's student activity", cs, await ev(`document.querySelector('#cs').contentDocument.querySelector('#cs-title').textContent`));
  const hid = await ev(`(() => { const d = document.querySelector('#cs').contentDocument; return [...d.querySelectorAll('.mlt-t')].every(x => !x.offsetParent) && !d.querySelector('#lesson-builder').offsetParent; })()`);
  check("planner: the class screen hides the teacher's material", hid);

  await b.goto(U + "/mlt/activities.html?view=teacher");
  await wait(`document.querySelectorAll('.mlt-activities .mlt-act').length > 0`);
  const MLTN = require(ROOT + "/apps/shared/mlt/activities.js").length;
  const n = await ev(`document.querySelectorAll('.mlt-activities .mlt-act').length`);
  check("activities page lists all", n === MLTN, String(n));
  const g = await ev(`(() => { const s = document.querySelector('.f-kind'); s.value = 'game'; s.dispatchEvent(new Event('change')); return document.querySelectorAll('.mlt-activities .mlt-act').length; })()`);
  check("filter by kind", g > 0 && g < n, String(g));
  const t = await ev(`(() => { document.querySelector('.f-kind').value = ''; const q = document.querySelector('.f-q'); q.value = 'puppet'; q.dispatchEvent(new Event('input')); return document.querySelectorAll('.mlt-activities .mlt-act').length; })()`);
  check("search", t >= 2 && t < n, String(t));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
