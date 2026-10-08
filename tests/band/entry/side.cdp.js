// The chord diagram beside the Backing Track chart: the Chord Sheet's superimposed view in a frame
// (tools/chord-sheet.html?embed=super), the chord sounding now and the next one in two colours, the rest grey.
// Run from tests/band/lead, server on 8500:   node ../entry/side.cdp.js
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1100 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const set = (id, v) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${v}"; e.dispatchEvent(new Event("input", { bubbles:true })); e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const click = id => ev(`document.getElementById("${id}").click(); 0`);
  const side = () => ev(`Array.prototype.map.call(document.querySelectorAll("#bt-side-body p"), function(p){ return p.textContent; }).join("")`);
  // the frame's lane labels with their colour role, e.g. "F7:now Bb7:next C7:rest"
  const lanes = () => ev(`(function(){ var f = document.getElementById("bt-side-frame"), d = f && f.contentDocument; if (!d) return "";
    var role = { "#1f8f83": "now", "#e08a1e": "next", "#a9a39a": "rest" };
    return Array.prototype.map.call(d.querySelectorAll("#sheet-output .super-lane-label"), function(t){ return t.textContent + ":" + (role[t.getAttribute("fill")] || t.getAttribute("fill")); }).join(" "); })()`);
  const until = async (f, want, ms) => { const t = Date.now(); let v; while (Date.now() - t < ms){ v = await f(); if (want instanceof RegExp ? want.test(v) : v === want) return v; await b.sleep(60); } throw new Error("wanted " + want + ", last: " + v); };
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/tools/backing-track.html"); await b.sleep(1000);
    await ev(`localStorage.removeItem("btSide"); 0`); await b.goto(B + "/tools/backing-track.html"); await b.sleep(1200);
    // idle: the three chords of the blues, the first as now and the next different one as next
    assert.strictEqual(await side(), "Now F7Next B♭7");
    await until(lanes, "F7:now Bb7:next C7:rest", 15000);
    const box = JSON.parse(await ev(`(function(){ var a = document.getElementById("bt-side").getBoundingClientRect(), c = document.getElementById("bt-chart").getBoundingClientRect(), f = document.getElementById("bt-side-frame").getBoundingClientRect(); return JSON.stringify({ ax: a.left, cr: c.right, at: a.top, ct: c.top, aw: a.width, fh: f.height }); })()`));
    assert(box.ax >= box.cr && Math.abs(box.at - box.ct) < 40 && box.aw > 250 && box.fh > 120, "beside the chart: " + JSON.stringify(box));
    // only the diagram is visible in the frame, and it is the Chord Sheet's keyboard drawing
    const inner = JSON.parse(await ev(`(function(){ var d = document.getElementById("bt-side-frame").contentDocument, w = document.getElementById("bt-side-frame").contentWindow; var vis = function(sel){ var e = d.querySelector(sel); return !!e && e.getClientRects().length > 0; };
      return JSON.stringify({ svg: d.querySelectorAll("#sheet-output .super-card svg").length, cards: d.querySelectorAll("#sheet-output .diagram-card").length, ta: vis("#chords-textarea"), nav: vis("#quarto-header"), btn: vis("#establish-tonality-btn"), scroll: d.documentElement.scrollWidth <= w.innerWidth + 1 }); })()`));
    assert.deepStrictEqual(inner, { svg: 1, cards: 0, ta: false, nav: false, btn: false, scroll: true });
    // the start bar moves the colours; all four stay on show
    await set("bt-start", "5"); assert.strictEqual(await side(), "Now B♭7Next F7"); await until(lanes, "F7:next Bb7:now C7:rest", 5000); await set("bt-start", "1");
    // playing: count-in has no "now"; then the colours follow the band to B flat 7 in bar 5
    await set("bt-tempo-n", "260"); await set("bt-countin", "1"); await click("bt-play");
    const seen = []; let t0 = Date.now(), t = "";
    while (Date.now() - t0 < 30000){ t = await side(); if (seen[seen.length - 1] !== t) seen.push(t); if (/^Now B♭7/.test(t)) break; await b.sleep(40); }
    assert(/^Now B♭7Next F7/.test(t), "never reached B flat 7: " + seen.slice(-3).join(" || "));
    assert(seen.some(x => /^Now count-inNext F7/.test(x)), "count-in: " + seen.slice(0, 2).join(" || "));
    await until(lanes, "F7:next Bb7:now C7:rest", 3000);
    await click("bt-play"); await b.sleep(200); assert.strictEqual(await side(), "Now F7Next B♭7");
    // more than four chords: the first four, and a chord outside them is said to be so
    await set("bt-changes", "jazz"); await until(lanes, /^F7:now Bb7:next Cm7:rest Bdim7:rest$/, 8000);
    assert(/first four of the 8 different chords/.test(await side()), await side());
    await set("bt-start", "8"); assert(/^Now Am7 \(not one of the four shown\)Next D7 \(not one of the four shown\)/.test(await side()), await side()); await set("bt-start", "1");
    // guitar comping: the Chord Sheet's fretboard
    await set("bt-changes", "basic"); await set("bt-comp", "guitar"); await until(lanes, "F7:now Bb7:next C7:rest", 8000);
    assert(await ev(`(function(){ var d = document.getElementById("bt-side-frame").contentDocument; return d.querySelectorAll('#sheet-output .super-card svg circle[fill="#1f8f83"], #sheet-output .super-card svg path[fill="#1f8f83"]').length; })()`) >= 1, "fretboard dots in the now colour");
    // each of the band's guitar styles reaches the Chord Sheet under its own name there; two-note chords first
    const style = () => ev(`(function(){ var d = document.getElementById("bt-side-frame").contentDocument, s = Array.prototype.filter.call(d.querySelectorAll("select.tuning-sel.show"), function(x){ return Array.prototype.some.call(x.options, function(o){ return o.value === "pair:all"; }); })[0]; return s ? s.value : ""; })()`);
    const dots = () => ev(`(function(){ var d = document.getElementById("bt-side-frame").contentDocument; return d.querySelectorAll("#sheet-output .super-card svg circle[fill^='#1f'], #sheet-output .super-card svg circle[fill^='#e0'], #sheet-output .super-card svg circle[fill^='#a9'], #sheet-output .super-card svg path").length; })()`);
    await ev(`(function(){ var u = document.getElementById("bt-unlock"); if (!u.checked) u.click(); })()`);
    for (const [bt, cs] of [["guide2", "pair:all"], ["triad3", "set3:all"], ["top3", "set3:0"], ["mid3", "set3:1"], ["triadvl", "vl:triadvl:0"], ["uppervl", "vl:uppervl:0"], ["drop3", "drop3"], ["drop2", "drop2"], ["open", "standard"]]){
      assert(await ev(`Array.prototype.some.call(document.getElementById("bt-voicing").options, function(o){ return o.value === "${bt}"; })`), "the band offers " + bt);
      await set("bt-voicing", bt); await until(style, cs, 6000); await until(lanes, "F7:now Bb7:next C7:rest", 6000);
      if (bt === "guide2"){ const n = await dots(); assert(n >= 3 && n <= 6, "two notes a chord, three chords: " + n + " spots"); }
    }
    // the Chord Sheet on its own keeps its four colours
    await click("bt-side-on"); assert.strictEqual(await ev(`document.getElementById("bt-side").hidden`), true);
    await b.goto(B + "/tools/backing-track.html"); await b.sleep(1200); assert.strictEqual(await ev(`document.getElementById("bt-side").hidden + "|" + document.getElementById("bt-side-on").checked + "|" + !!document.getElementById("bt-side-frame")`), "true|false|false");
    await click("bt-side-on"); assert.strictEqual(await side(), "Now F7Next B♭7");
    const errs = b.errors.filter(e => !/supabase/i.test(e)); assert.deepStrictEqual(errs, [], errs.join(" | "));
    console.log("SIDE OK");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
