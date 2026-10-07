// Chord Sheet: two-note chord styles on string pairs, following the hand. Server on 8500.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1100 }); const ev = x => b.eval(x);
  try {
    await b.goto("http://127.0.0.1:8500/tools/chord-sheet.html"); await b.sleep(1200);
    await ev(`(function(){ var t = document.getElementById("chords-textarea"); t.value = "Dm7 G7 Cmaj7 A7 Dm7 G7 C6"; t.dispatchEvent(new Event("blur")); })()`); await b.sleep(500);
    await ev(`(function(){ document.querySelectorAll("[data-inst-id]").forEach(function(c){ var want = c.dataset.instId === "guitar"; if (c.checked !== want){ c.checked = want; c.dispatchEvent(new Event("change", { bubbles:true })); } }); })()`); await b.sleep(400);
    const opts = await ev(`(function(){ var row = document.querySelector('[data-inst-id="guitar"]').closest(".inst-row"), sels = row.querySelectorAll("select"), s = sels[sels.length - 1]; window.__sty = s;
      return Array.from(s.options).filter(function(o){ return o.value.indexOf("pair:") === 0; }).map(function(o){ return o.value + "=" + o.textContent; }).join(" | "); })()`);
    console.log("options:", opts); assert(/pair:3=Two notes: strings 2-3/.test(opts) && /pair:2=Two notes: strings 3-4/.test(opts) && /pair:1=Two notes: strings 4-5/.test(opts) && /pair:all/.test(opts));
    for (const st of ["pair:all", "pair:2"]){
      await ev(`window.__sty.value = "${st}"; window.__sty.dispatchEvent(new Event("change", { bubbles:true }))`); await b.sleep(900);
      const shapes = await ev(`Array.from(document.querySelectorAll(".diagram-card .voicing-sel")).map(function(s){ return s.options[s.selectedIndex].textContent; }).join(" | ")`);
      console.log(st, "->", shapes); const list = shapes.split(" | "); assert.strictEqual(list.length, 7);
      list.forEach(x => assert(/^Strings (2-3|3-4|4-5) · /.test(x.replace("3-2", "2-3").replace("4-3", "3-4").replace("5-4", "4-5")), x));
      const frets = list.map(x => +/fret (\d+)/.exec(x)[1]); assert(Math.max(...frets) - Math.min(...frets) <= 5, "the hand stays in one area: " + frets);
      await b.shot("pairs-" + st.replace(":", "-") + ".png");
    }
    const errs = b.errors.filter(e => !/supabaseUrl|createClient/.test(e)); assert.strictEqual(errs.length, 0, JSON.stringify(errs)); console.log("PAIRS OK");
  } finally { await b.close(); } })().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
