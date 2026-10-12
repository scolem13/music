// Opens a lesson page, optionally sets menus, saves a picture and prints page errors (a looking aid).
// From tests/band/lead with the server on 8500:  SHOT=/path/out.png node ../lessons/peek.cdp.js melody bl-horn=alto bl-key=10
const { launch } = require("../lead/cdp.js");
(async () => { const b = await launch({ width: 1280, height: 1200 }); const [page, ...sets] = process.argv.slice(2);
  try {
    await b.eval(`0`).catch(() => {}); await b.goto("http://127.0.0.1:8500/lessons/blues-" + page + ".html"); await b.sleep(1800);
    for (const s of sets) { const [id, v] = s.split("="); await b.eval(`var s = document.getElementById(${JSON.stringify(id)}); s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event("change")); 0`); }
    await b.sleep(500);
    console.log(await b.eval(`Array.prototype.map.call(document.querySelectorAll(".bl-step"), function (h){ return h.getAttribute("data-part") + ": " + (h.__bl ? "built, " + h.querySelectorAll("svg").length + " svg" : "NOT BUILT"); }).join("\\n")`));
    console.log(b.errors.filter(e => !/supabase/i.test(e)), b.failed.filter(f => !/favicon/.test(f)));
    if (process.env.SHOT) await b.shot(process.env.SHOT);
  } finally { await b.close(); }
})();
