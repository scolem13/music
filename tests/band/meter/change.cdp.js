// Meter changes inside a tune, on the Backing Track page. Run from tests/band/lead, server on 8500.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1300 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const ABC = 'X:1\\nT:Changes\\nM:4/4\\nL:1/8\\nK:C\\n"C"z8|"F"z8|[M:6/8]"G"z6|"Am"z6|[M:7/8]"F"z7|[M:4/4]"C"z8|]';
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/tools/backing-track.html"); await b.sleep(1200);
    // a player of our own: where each bar starts (in beats of the tempo) and where the bass plays
    await ev(`(function(){ window.__r = { bars: [], bass: [], where: [] }; var p = BandPlayer.create({ parsed: TuneChart.parse('${ABC}'), tempo: 300, countIn: 1, choruses: 1, humanize: 0, seed: 3,
      opts: { bassFeel: "roots", compRhythm: "pad", groove: "rock", feel: "straight", comp: "piano", variation: 0 },
      onBar: function(i){ __r.bars.push(i.index + ":" + i.beats); var w = p.where(); if (w) __r.where.push(Math.round(w.pos * 10) / 10 + "/" + w.beats); },
      onEvent: function(e){ if (e.part === "bass") __r.bass.push(Math.round(e.L * 100) / 100); } }); window.__p = p; p.play(); return 0; })()`);
    await b.sleep(7500);
    const r = JSON.parse(await ev(`(function(){ try { __p.stop(); } catch (e) {} return JSON.stringify(__r); })()`));
    assert.strictEqual(r.bars.filter(x => !/^-1/.test(x)).slice(0, 6).join(" "), "0:4 1:4 2:2 3:2 4:7 5:4");
    // 4/4 bars are 4 beats long, 6/8 bars 3 (two dotted quarters), the 7/8 bar 3.5 (seven eighths)
    const L = r.bass; [4, 5, 8, 12, 13.5, 15, 16.5, 18, 18.5, 19, 21, 21.5, 22.5].forEach(x => assert(L.indexOf(x) >= 0, "bass at " + x + ": " + L.join(" ")));
    assert(L.indexOf(14) < 0 && L.indexOf(17.5) < 0 && L.indexOf(22) < 0, "nothing on the old grid: " + L.join(" "));
    // the page itself: the chart takes the changes, plays through them and draws the notation
    await ev(`(function(){ var t = document.getElementById("bt-abc"); t.value = '${ABC}'; t.dispatchEvent(new Event("input", { bubbles:true })); t.dispatchEvent(new Event("change", { bubbles:true })); })()`); await b.sleep(900);
    // each change is marked in the top left corner of its own bar (bars 3, 5 and 6), above the chord; no courtesy inside a row
    const sigs = () => ev(`Array.from(document.querySelectorAll("#bt-chart .tc-meter")).map(function(m){ return m.closest(".tc-bar").getAttribute("data-bar") + (m.classList.contains("tc-courtesy") ? "c" : "") + ":" + m.textContent; }).join(" ")`);
    assert.strictEqual(await sigs(), "2:68 4:78 5:44");
    assert.strictEqual(await ev(`(function(){ var m = document.querySelector("#bt-chart .tc-own"), c = m.closest(".tc-bar"), a = m.getBoundingClientRect(), r = c.getBoundingClientRect(), ch = c.querySelector(".tc-chord").getBoundingClientRect(); return a.left >= r.left && a.right < r.left + r.width / 2 && a.bottom <= ch.top + 4 && a.height < 16; })()`), true, "top left, one line, above the chord");
    // over a line break: also a grey stacked courtesy at the far right of the bar before
    await ev(`(function(){ var t = document.getElementById("bt-abc"); t.value = '${ABC}'.replace("|[M:7/8]", "|\\n[M:7/8]"); t.dispatchEvent(new Event("input", { bubbles:true })); t.dispatchEvent(new Event("change", { bubbles:true })); })()`); await b.sleep(900);
    assert.strictEqual(await sigs(), "2:68 3c:78 4:78 5:44");
    assert.strictEqual(await ev(`(function(){ var m = document.querySelector("#bt-chart .tc-courtesy"), a = m.getBoundingClientRect(), r = m.closest(".tc-bar").getBoundingClientRect(); return r.right - a.right < 8 && a.height > 16 && getComputedStyle(m).color !== getComputedStyle(document.querySelector("#bt-chart .tc-own")).color; })()`), true, "far right, stacked, grey");
    await ev(`(function(){ var t = document.getElementById("bt-abc"); t.value = '${ABC}'; t.dispatchEvent(new Event("input", { bubbles:true })); t.dispatchEvent(new Event("change", { bubbles:true })); })()`); await b.sleep(900);
    await ev(`(function(){ var d = document.getElementById("bt-notation"); if (d && "open" in d) d.open = true; document.getElementById("bt-countin").value = "1"; document.getElementById("bt-play").click(); })()`);
    // the beat dots beside Play: one for each beat of the bar sounding (4, then 2 in 6/8, 7 in 7/8), and back to the tune's own meter when stopped
    const t = Date.now(); let st = ""; const dots = {}; while (Date.now() - t < 30000){ const q = JSON.parse(await ev(`JSON.stringify([document.getElementById("bt-status").textContent, document.querySelectorAll("#bt-beats i").length, document.querySelectorAll("#bt-beats i.on").length])`)); st = q[0];
      const m = /bar (\d+)/i.exec(st); if (m && !/count/i.test(st)){ dots[m[1]] = q[1]; assert(q[2] <= 1); } if (/bar 6/i.test(st)) break; await b.sleep(60); }
    assert(/bar 6/i.test(st), "reached bar 6: " + st); await ev(`document.getElementById("bt-play").click(); 0`);
    assert.deepStrictEqual([dots[1], dots[3], dots[5], dots[6]], [4, 2, 7, 4], "dots per bar: " + JSON.stringify(dots)); await b.sleep(300);
    assert.strictEqual(await ev(`document.querySelectorAll("#bt-beats i").length`), 4, "back to four when stopped");
    // notation: a change of meter at the start of a line keeps each staff's clef (treble, bass, bass on every line)
    await ev(`new Promise(function(res){ if (window.ABCJS) return res(); var s = document.createElement("script"); s.src = "/apps/shared/abcjs-basic.js"; s.onload = res; document.head.appendChild(s); })`);
    assert.strictEqual(await ev(`(function(){ var p = TuneChart.parse('X:1\\nM:4/4\\nL:1/4\\nK:F\\n"C"z4|"F"z4|"G"z4|"C"z4|[M:3/4]"F"z3|"G"z3|]'), bars = BandMidi.generate(p, { bars: 6, tempo: 120, opts: { comp: "piano", variation: 0 } });
      var d = document.createElement("div"); document.body.appendChild(d); var t = ABCJS.renderAbc(d, BandNotation.toAbc(bars, { drums: true }))[0]; d.remove();
      return t.lines.filter(function(l){ return l.staff; }).map(function(l){ return l.staff.map(function(s){ return s.clef.type; }).join(","); }).join(" / "); })()`), "treble,bass,bass,perc / treble,bass,bass,perc");
    console.log("METER CHANGE UI OK");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
