// Prints the notes each step of an instrument lesson shows, in a few keys (a reading aid, not a test).
// From tests/band/lead with the server on 8500:  node ../lessons/dump.cdp.js guitar 7 5
const { launch } = require("../lead/cdp.js");
(async () => { const b = await launch({ width: 1280, height: 1200 }); const [inst, ...keys] = process.argv.slice(2);
  try {
    await b.eval(`0`).catch(() => {}); await b.goto("http://127.0.0.1:8500/lessons/blues-" + inst + ".html"); await b.sleep(1500);
    for (const k of keys.length ? keys : ["7"]) {
      console.log("== key " + k);
      console.log(await b.eval(`(function(){ var s = document.getElementById("bl-key"); s.value = ${k}; s.dispatchEvent(new Event("change"));
        return Array.prototype.map.call(document.querySelectorAll(".bl-step"), function (h){ var w = h.__bl; if (!w) return h.getAttribute("data-part") + ": NOT BUILT";
          var labs = Array.prototype.map.call(h.querySelectorAll(".ld-label"), function (t){ return t.textContent; });
          return h.getAttribute("data-part") + "  " + w.results().map(function (r, i){ return labs[i] + " " + r.notes.map(function (n){ return (n.string != null ? "s" + n.string + "f" + n.fret : n.midi + (n.hand || "")) + (n.soft ? "~" : "") + (n.root ? "R" : ""); }).join(" ") + " pin[" + (r.pin || []).join(",") + "]"; }).join(" | "); }).join("\\n"); })()`));
    }
    if (process.env.SHOT) await b.shot(process.env.SHOT);
    console.log(b.errors.filter(e => !/supabase/i.test(e)), b.failed.filter(f => !/favicon/.test(f)));
  } finally { await b.close(); }
})();
