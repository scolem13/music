// The drum and cymbal widgets in a browser: compare panels drawn from FaithfulPanel layouts dk-* / cy-*; clicking the drawn head
// strikes it (centre / edge / rim by radius), the throw-off key turns the wires off, the tuning knob's key moves, the menu swaps
// the drawing (a kit); Translate reports a quality with notes; cymbal bell / edge by click; Light / Dark repaints; ▶ plays with
// no page errors (read from CDP, not page globals, so it works on the rendered site too); tour step, tracks 3, quiz.
// Run: node tests/lessons/drumkits.cdp.js   (NEG=1 must fail). Default: tests/lessons/drumkits-harness.html served from the repo.
// RENDERED=1 [SITE=<dir>]: the rendered lessons/drum-kit-compare.html, cymbal-compare.html and intro pages instead.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), REND = process.env.RENDERED === "1", SITE = process.env.SITE || (REND ? ROOT + "/_site" : ROOT), { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : "text/html";
const PORT = 8598;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
(async () => {
  const b = await launch({ args: ["--autoplay-policy=no-user-gesture-required"] }); let fails = 0; const NEG = process.env.NEG === "1";
  const check = (n, ok, info) => { if (NEG) ok = !ok; console.log((ok ? "ok   " : "FAIL ") + n + (info != null ? "  " + info : "")); if (!ok) fails++; };
  await b.resize(1300, 1000);
  const U = p => `http://127.0.0.1:${PORT}/` + p;
  await b.goto(U(REND ? "lessons/drum-kit-compare.html" : "tests/lessons/drumkits-harness.html")); await b.sleep(1500);
  const g = `document.querySelector('.dkc')._dkc`;
  check("two snare drawings", await b.eval(`document.querySelectorAll('.dkc')[0].querySelectorAll('.dk-face svg.fp-svg').length`) === 2);
  check("left Supraphonic, right Black Beauty", await b.eval(`${g}.a.id + ',' + ${g}.b.id`) === "supraphonic,blackbeauty");
  // click on the drawn head: centre then near the rim (panel units -> screen)
  const clickAt = (sel, x, y) => b.eval(`(() => { const svg = document.querySelector('${sel} .dk-face svg.fp-svg'); svg.scrollIntoView({block:'center'}); const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    const cx = r.left + (${x} - vb.x) * r.width / vb.width, cy = r.top + (${y} - vb.y) * r.height / vb.height, el = document.elementFromPoint(cx, cy) || svg;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: cx, clientY: cy })); return document.querySelector('${sel}').dataset.last || ''; })()`);
  check("click the head centre -> snare:centre", await clickAt(".dkc-a", 105, 118) === "snare:centre", await b.eval(`document.querySelector('.dkc-a').dataset.last`));
  check("click near the hoop -> snare:rim", await clickAt(".dkc-a", 105 + 82, 118) === "snare:rim");
  check("click the head between -> snare:edge", await clickAt(".dkc-a", 105 + 60, 118) === "snare:edge");
  check("the spectrum is drawn", await b.eval(`!!document.querySelector('.dkc-a .dk-plot path.dk-line')`));
  await b.eval(`document.querySelector('.dkc-a [data-ctl=wires]').dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
  check("throw-off key: wires off", await b.eval(`${g}.a.st.wires`) === false);
  await b.eval(`(() => { const k = document.querySelector('.dkc-a [data-ctl=tension]'); k.focus(); for (let i = 0; i < 5; i++) k.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); })()`);
  check("tuning knob: arrow keys raise the tension", await b.eval(`${g}.a.st.tension`) > 0.55, await b.eval(`${g}.a.st.tension`));
  await b.eval(`document.querySelector('.dkc-go').click()`);
  const q = await b.eval(`document.querySelector('.dkc').dataset.quality`);
  check("Translate A -> B gives a quality and notes; wires carried", /exact|approx|lost/.test(q) && await b.eval(`document.querySelectorAll('.dkc-res li').length`) > 0 && await b.eval(`${g}.b.st.wires`) === false, q);
  await b.eval(`(() => { const s = document.querySelector('.dkc-b .dk-pick'); s.value = 'rock'; s.dispatchEvent(new Event('change')); })()`); await b.sleep(700);
  check("menu swaps to a kit drawing (kick port key)", await b.eval(`!!document.querySelector('.dkc-b [data-ctl="kick.port"]')`));
  await clickAt(".dkc-b", 260, 50); check("click the kick in the kit", await b.eval(`document.querySelector('.dkc-b').dataset.last`) === "kick:centre");
  const t0 = await b.eval(`document.querySelector('.dkc-a .fp-w').dataset.theme`);
  await b.eval(`document.querySelector('.dkc-a .fp-theme').click()`);
  check("Light / Dark repaints", await b.eval(`[...document.querySelectorAll('.fp-w')].every(w => w.dataset.theme !== '${t0}')`));
  await b.eval(`document.querySelector('.dkc-a .fp-theme').click()`);
  await b.eval(`document.querySelector('.dkc-b .dk-groove').click()`); await b.sleep(800);
  check("▶ Groove plays: AudioContext running", await b.eval(`DrumKits.ctx().state === 'running'`));
  await b.eval(`DrumKits.stop()`);
  if (REND) { await b.goto(U("lessons/cymbal-compare.html")); await b.sleep(1500); }
  const c = REND ? ".dkc" : ".dkc:nth-of-type(2)";
  check("cymbal drawings", await b.eval(`document.querySelectorAll('${c} .dk-face svg.fp-svg').length`) === 2);
  check("click the cymbal bell -> bell", (await clickAt(`${c} .dkc-a`, 150, 135)).endsWith(":bell"));
  check("click the cymbal edge -> edge", (await clickAt(`${c} .dkc-a`, 150 + 105, 135)).endsWith(":edge"));
  await b.eval(`document.querySelector('${c} .dkc-go').click()`);
  check("Translate K -> A: approx with a brightness note", await b.eval(`document.querySelector('${c}').dataset.quality`) === "approx" && await b.eval(`[...document.querySelectorAll('${c} .dkc-res li')].some(l => /Brighter|Darker/.test(l.textContent))`));
  await b.eval(`DrumKits.stop()`);
  if (REND) { await b.goto(U("lessons/intro-jazz-kit.html")); await b.sleep(1500); }
  check("standalone jazz kit mounted", await b.eval(`DrumKits.widgets.some(w => w.id === 'jazz')`));
  await b.eval(`document.querySelectorAll('.dk-hear')[${REND ? 3 : 0}].click()`); await b.sleep(300);
  if (!REND) check("tour step sets the kick port and plays the kick", await b.eval(`(() => { const W = DrumKits.widgets.filter(w => w.id === 'jazz').pop(); return W.st.kick.port === true; })()`));
  await b.eval(`DrumKits.stop()`); await b.sleep(400);
  check("tracks: 3 listed", await b.eval(`document.querySelector('.dk-tracks').dataset.n`) === "3");
  await b.eval(`document.querySelector('.dk-q li').click()`); check("quiz marks an answer", await b.eval(`!!document.querySelector('.dk-q li.dk-right, .dk-q li.dk-wrong')`));
  const errs = b.errors.filter(e => !/favicon|404|supabase/.test(e));
  check("no page errors (CDP)", errs.length === 0, errs.join(" | "));
  console.log(fails ? `${fails} FAILED` : "all passed"); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
