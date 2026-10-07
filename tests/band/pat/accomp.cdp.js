// Accompaniment Styles page: every band card has a play button and four chords the band can read, the
// button starts and stops the Backing Track band, and the keyboard examples still draw on their own chords.
// Run from tests/band/lead with the test server on port 8500.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1200 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/tools/accomp-styles.html"); await b.sleep(1500);
    await ev(`window.__err = []; window.addEventListener("error", function(e){ __err.push(e.message); }); document.getElementById("as-band-tab").click(); 0`);
    const r = JSON.parse(await ev(`(function(){ var C = BandCatalog, out = { cards: 0, btns: document.querySelectorAll("#as-band .as-card .as-play").length, bad: [], uniq: {} };
      [["bass", C.bass], ["comp", C.comp], ["drums", C.drums]].forEach(function(g){ g[1].forEach(function(e){ out.cards++;
        var p = asBandPlan(e, g[0]), bars = p.chords.split("|"), syms = p.chords.split(/[| ]/);
        var okIds = C.byId(C.bass, p.opts.bassFeel) && C.byId(C.drums, p.opts.groove) && String(p.opts.compRhythm).split("+").every(function(x){ return C.byId(C.comp, x); });
        var okCh = syms.every(function(s){ var c = BandHarmony.parseChord(s, 0); return c && !c.nc && c.quality; });
        if (bars.length !== 4 || !okIds || !okCh || !(p.tempo >= 40) || !BandHarmony.hasStyle(p.opts.comp, p.opts.voicing)) out.bad.push(g[0] + ":" + e.id);
        out.uniq[p.chords] = 1; }); });
      out.uniq = Object.keys(out.uniq).length; out.lines = document.querySelectorAll("#as-band .as-band-chords").length;
      out.kb = Object.keys(asChords).filter(function(id){ return !document.querySelector("#as-n-" + id + " svg"); });
      return JSON.stringify(out); })()`));
    assert.deepStrictEqual(r.bad, [], "plans"); assert.strictEqual(r.btns, r.cards); assert.strictEqual(r.lines, r.cards); assert(r.uniq >= 20, "varied progressions: " + r.uniq);
    // play one card of each kind: the band starts (events are scheduled), the button shows stop, a second click stops it
    for (const key of ["bass:killerjoe", "comp:strumCamp", "drums:dembow", "bass:takefive"]){
      await ev(`document.querySelector('#as-band .as-card[data-band="${key}"] .as-play').click(); 0`);
      const t = Date.now(); let on = false;
      while (Date.now() - t < 20000){ on = await ev(`(function(){ var b = document.querySelector('#as-band .as-card[data-band="${key}"] .as-play'); return b.classList.contains("as-play--on") && !!document.querySelector("#as-band") && window.__err.length === 0; })()`); if (on) break; await b.sleep(200); }
      assert(on, key + " plays"); await b.sleep(1500);
      await ev(`document.querySelector('#as-band .as-card[data-band="${key}"] .as-play').click(); 0`);
      assert.strictEqual(await ev(`document.querySelectorAll(".as-play--on").length`), 0, key + " stops");
    }
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(window.__err)`)), []);
    // (keyboard examples draw when their tab is visible)
    await ev(`document.querySelector(".as-toggle button").click(); 0`); await b.sleep(800);
    const kb = JSON.parse(await ev(`JSON.stringify(Object.keys(asChords).filter(function(id){ var el = document.getElementById("as-n-" + id); return el && !el.querySelector("svg"); }))`));
    assert.deepStrictEqual(kb, [], "keyboard examples drawn");
    console.log("ACCOMP OK:", r.cards, "band cards,", r.uniq, "progressions");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
