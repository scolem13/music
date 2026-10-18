// The hand-drum and microphone drawings, the proximity / off-axis widgets and the groove pictures, in headless Chrome.
// Gear 9 draws congas, bongos, djembe and tabla (every part titled); Recording 2 and 3 draw the mic figures and build the
// widgets, which sound and redraw when moved; a drum step and a conga step light their picture while the band plays
// (skipped when the band's samples can't load). Run after rendering lessons/gear-drums, rec-mics, rec-placement,
// hihat-grooves, congas-basics: node tests/lessons/perc-mics.cdp.js   (screenshots: SHOTS=dir)
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".json") ? "application/json" : f.endsWith(".mp3") ? "audio/mpeg" : "text/html";
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(8527);
const U = p => "http://127.0.0.1:8527/lessons/" + p + ".html", SHOTS = process.env.SHOTS;
(async () => {
  const b = await launch({}); let fails = 0;
  const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info ? "  " + info : "")); if (!ok) fails++; };
  const shot = async n => { if (SHOTS) await b.shot(path.join(SHOTS, n + ".png")); };
  await b.eval(`sessionStorage.setItem("audio-check-v1", "{}")`).catch(() => {});

  await b.goto(U("gear-drums")); await b.sleep(500);
  const drums = await b.eval(`[...document.querySelectorAll(".gear-fig")].map(f => f.dataset.fig + ":" + f.querySelectorAll("svg .gd-part title").length).join(" ")`);
  check("Gear 9: four hand drums drawn, parts titled", /congas:\d\d/.test(drums) && /bongos:\d/.test(drums) && /djembe:\d/.test(drums) && /tabla:\d\d/.test(drums), drums);
  await shot("gear-drums");

  await b.goto(U("rec-mics")); await b.sleep(600);
  const figs = await b.eval(`[...document.querySelectorAll(".gear-fig svg")].length + " " + document.querySelectorAll(".rk[data-w=offaxis] canvas").length`);
  check("Recording 2: polar, off-axis, cupping, response figures and two off-axis widgets", figs === "4 2", figs);
  const off = await b.eval(`(async () => { const h = document.querySelector(".rk[data-w=offaxis]"), btn = h.querySelector(".sk-head .btn"); btn.click();
    await new Promise(r => setTimeout(r, 300)); const r = h.querySelector(".sk-ctls input[type=range]"); const i0 = h.querySelector(".sk-info").textContent;
    r.value = 150; r.dispatchEvent(new Event("input")); const i1 = h.querySelector(".sk-info").textContent;
    [...h.querySelectorAll("button")].find(x => /Cup/.test(x.textContent)).click(); const i2 = h.querySelector(".sk-info").textContent; btn.click(); return [i0, i1, i2]; })()`);
  check("off axis: on axis reads 0 dB", /0° off axis/.test(off[0]) && /\+0\.0 dB/.test(off[0]), off[0]);
  check("off axis: 150° is much quieter in the treble than at 1 kHz", (() => { const m = off[1].match(/1 kHz ([+-][\d.]+) dB.*8 kHz ([+-][\d.]+) dB/); return m && +m[2] < +m[1] && +m[1] < -10; })(), off[1]);
  check("off axis: cupped, the back is much louder", (() => { const a = +off[1].match(/1 kHz ([+-][\d.]+)/)[1], c = +off[2].match(/1 kHz ([+-][\d.]+)/)[1]; return /cupped/.test(off[2]) && c > a + 8; })(), off[2]);
  await shot("rec-mics");

  await b.goto(U("rec-placement")); await b.sleep(600);
  const prox = await b.eval(`(async () => { const h = document.querySelector(".rk[data-w=proximity]"), btn = h.querySelector(".sk-head .btn"); btn.click(); await new Promise(r => setTimeout(r, 300));
    const r = h.querySelector(".sk-ctls input[type=range]"), sel = h.querySelector(".sk-ctls select"), out = [];
    for (const v of [2, 0.5]) { r.value = v; r.dispatchEvent(new Event("input")); out.push(h.querySelector(".sk-info").textContent); }
    sel.value = "omni"; sel.dispatchEvent(new Event("change")); out.push(h.querySelector(".sk-info").textContent); btn.click(); return out; })()`);
  const bass = s => +s.match(/100 Hz ([+-][\d.]+)/)[1];
  check("proximity: 3 cm boosts the bass far more than 1 m", bass(prox[1]) > 15 && bass(prox[0]) < 3, prox.map(bass).join(" / "));
  check("proximity: omni has none", Math.abs(bass(prox[2])) < 0.1, prox[2]);
  await shot("rec-placement");

  for (const [page, kind] of [["hihat-grooves", "kit"], ["congas-basics", "congas"]]) {
    await b.goto(U(page)); await b.sleep(800);
    check(page + ": every step has its picture", await b.eval(`document.querySelectorAll(".bl-step .ga svg").length === document.querySelectorAll(".bl-step").length && document.querySelectorAll(".bl-step").length > 0`));
    await b.eval(`document.querySelector(".bl-step .btn-primary").click()`);
    let lit = 0; for (let k = 0; k < 100 && !lit; k++) { await b.sleep(250); lit = await b.eval(kind === "kit" ? `document.querySelectorAll(".bl-step .ga .ga-lit").length` : `document.querySelectorAll(".bl-step .ga .ga-hand").length`); }
    const loaded = await b.eval(`!/could not/.test(document.getElementById("bl-status").textContent)`);
    if (!loaded) console.log("skip " + page + ": the band's sounds could not load");
    else check(page + ": the picture lights while the band plays", lit > 0, lit + " lit");
    await shot(page); await b.eval(`document.getElementById("bl-stop").click()`);
  }
  const errs = b.errors.filter(e => !/AudioContext|autoplay|supabase/i.test(e));
  check("no script errors", !errs.length, errs.slice(0, 3).join(" | "));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
