// Layout of the lesson pages: no notation is cut off at any width, every line of a score starts at the same left edge (no indent for
// voice names), and the page never scrolls sideways. Run from tests/band/lead with the test server on 8500 and the pages rendered.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 900 }); const B = "http://127.0.0.1:8500"; let n = 0;
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out"); })]);
  const set = (id, v) => ev(`var s = document.getElementById(${JSON.stringify(id)}); if (s) { s.value = ${JSON.stringify(String(v))}; s.dispatchEvent(new Event("change")); } 0`);
  const CHECK = `(function(){ var bad = [], count = 0, vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > innerWidth + 1) bad.push("page scrolls sideways: " + document.documentElement.scrollWidth + " > " + innerWidth);
    document.querySelectorAll("svg").forEach(function (s){ if (!s.querySelector(".abcjs-staff")) return; count++;
      var sr = s.getBoundingClientRect(), tag = (s.parentNode.className || "") + "@" + Math.round(sr.width);
      if (sr.right > vw + 1 || sr.left < -1) bad.push(tag + " svg outside the window");
      for (var a = s.parentNode; a && a !== document.body; a = a.parentNode){ var cs = getComputedStyle(a), r = a.getBoundingClientRect();
        if ((cs.overflowX !== "visible") && (sr.right > r.right + 1 || sr.left < r.left - 1)) bad.push(tag + " clipped by " + a.className); }
      s.querySelectorAll("path,text,tspan,rect").forEach(function (e){ var r = e.getBoundingClientRect(); if (!r.width && !r.height) return;
        if (r.left < sr.left - 1 || r.right > sr.right + 1) bad.push(tag + " ink outside its svg: " + (e.getAttribute("class") || e.tagName) + " " + Math.round(r.left - sr.left) + "/" + Math.round(r.right - sr.right)); });
      var L = []; s.querySelectorAll(".abcjs-staff").forEach(function (e){ L.push(Math.round(e.getBoundingClientRect().left - sr.left)); });
      if (L.some(function (x){ return x !== L[0]; })) bad.push(tag + " lines start at different places: " + L);
      if (L[0] > 1 && !s.querySelector("[data-name=brace]")) bad.push(tag + " staff indented " + L[0]);
      var hr = s.parentNode.getBoundingClientRect(); if (sr.left < hr.left - 1 || sr.right > hr.right + 1) bad.push(tag + " wider than its box");
    }); return { bad: bad.slice(0, 6), count: count }; })()`;
  try {
    for (const page of ["changes", "bass", "guitar", "piano", "drums", "melody", "improv"]) {
      const cases = [{}, { "bl-key": 10 }, { "bl-key": 1 }, { "bl-key": 6 }, { "bl-key": 11 }, { "bl-key": 5 }];
      if (page === "melody" || page === "improv") for (const h of ["bass", "tenor", "bari"]) cases.push({ "bl-horn": h, "bl-key": 6 });
      for (const w of [390, 768, 1280]) { await b.resize(w, 900);
        for (const c of cases) { await b.goto(B + "/lessons/blues-" + page + ".html"); await b.sleep(900);
          for (const k in c) await set(k, c[k]); await b.sleep(400);
          const r = await ev(CHECK); n += r.count; assert(r.count > 0, page + " has notation");
          assert.deepStrictEqual(r.bad, [], page + " " + w + "px " + JSON.stringify(c)); } } }
    console.log("LESSON LAYOUT OK (" + n + " scores)");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
