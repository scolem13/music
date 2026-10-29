// Rote Song by Ear (apps/shared/mlt/rote-song.js): the steps list, Next / Back, no notation shown, the cue then the song,
// the resting-tone stops, and step 8 (the song cut in its last quarter, Space timed against its last note). Render first:
//   quarto render mlt/rote-song.qmd mlt/mullen.qmd
//   node tests/mlt/rote-song.cdp.js        (SITE=<dir> tests a render made elsewhere)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = process.env.SITE || ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const SF = ROOT + "/tests/band/lead/site";   // samples from the local mirror at /sf/ (tests/band/README.md)
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split(/[?#]/)[0]), f = path.join(u.startsWith("/sf/") ? SF : SITE, u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8553);
const U = "http://127.0.0.1:8553";
(async () => {
  const b = await launch({});
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e);
  const wait = async (cond, n = 80) => { for (let i = 0; i < n; i++) { if (await ev(cond)) return true; await b.sleep(150); } return false; };
  await b.resize(1200, 900);
  await b.goto(U + "/mlt/rote-song.html?tune=shoo-fly-shoo-major");
  const sf = `Object.defineProperty(window, 'getSoundfontUrl', { configurable: true, value: () => Promise.resolve(location.origin + '/sf/') }), 0`;
  await ev(sf);
  check("procedure mounts", await wait(`!!document.querySelector('.rs-steps')`));
  check("nine steps listed", await ev(`document.querySelectorAll('.rs-steps li').length`) === 9);
  check("no notation in the widget", await ev(`document.querySelectorAll('.rs svg').length`) === 0);
  check("starts on step 1", /^1\./.test(await ev(`document.querySelector('.rs-title').textContent`)));
  await ev(`document.querySelector('.rs-next').click()`);
  check("Next goes to step 2", /^2\./.test(await ev(`document.querySelector('.rs-title').textContent`)));
  await ev(`document.querySelectorAll('.rs-steps button')[2].click()`);
  check("the list jumps to step 3, lights shown", /^3\./.test(await ev(`document.querySelector('.rs-title').textContent`)) && await ev(`document.querySelector('.rs-lights').style.display === ''`));
  await ev(`window.__p = []; (() => { const p = AbcPlay.play; AbcPlay.play = function (v, o) { __p.push({ until: o.untilMs, from: o.fromMs }); return p.call(this, v, o); }; })()`);
  await ev(`document.querySelector('.rs-ctl button').click()`);
  check("cue, then the song", await wait(`__p.length >= 2`, 120), await ev(`JSON.stringify(__p)`));
  check("beat lights flash", await wait(`!!document.querySelector('.rs-l.on')`, 120));
  // resting tone: stops partway
  await ev(`document.querySelectorAll('.rs-steps button')[5].click(); __p = []`);
  await ev(`document.querySelectorAll('.rs-ctl button')[1].click()`);
  check("the song stops for the resting tone", await wait(`/Sing the resting tone/.test(document.querySelector('.rs-msg').textContent) && /Stop!/.test(document.querySelector('.rs-msg').textContent)`, 160), await ev(`JSON.stringify(__p)`));
  // step 8: cut in the last quarter
  await ev(`document.querySelectorAll('.rs-steps button')[7].click(); __p = []; window.__s = null; (() => { const p = AbcPlay.play; AbcPlay.play = function (v, o) { const os = o.onStart; o.onStart = s => { __s = s; os && os(s); }; return p.call(this, v, o); }; })()`);
  await ev(`document.querySelector('.rs-ctl button').click()`);
  check("armed after the cut", await wait(`/Audiate!/.test(document.querySelector('.rs-msg').textContent)`, 160));
  const last = await ev(`document.querySelector('.rote-song').roteSong.lastOnset()`);
  check("cut in the last quarter", await ev(`(() => { const u = __p[__p.length - 1].until; return u >= ${last} * 0.75 && u < ${last}; })()`), await ev(`__p[__p.length-1].until`) + " / " + last);
  // wait for the moment of the last note, then press Space
  await wait(`(__s.ac.currentTime - __s.t0) * 1000 >= ${last} - 20`, 200);
  await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }))`);
  const res = await ev(`document.querySelector('.rs-msg').textContent`);
  check("a tap on the last note is right on it", /Right on it|Close/.test(res), res);
  // the unit pages: the by-ear button
  await b.goto(U + "/mlt/mullen.html?view=student"); await ev(sf);
  check("units have by-ear buttons", await wait(`document.querySelectorAll('.mlt-rote').length > 5`));
  await ev(`document.querySelector('.mlt-rote').click()`);
  check("by-ear opens the procedure under the list", await wait(`!!document.querySelector('.mlt-do .rs-steps')`, 120));
  console.log(fails ? fails + " failed" : "all passed");
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
