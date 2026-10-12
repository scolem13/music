// The chart's surroundings on the Backing Track page: the octave menus, the row of bars that previews the next section, a bar that
// holds a time signature with letters and numerals, and the chord diagram's own controls (on/off, beside or below, any instrument).
// Needs the test server (see ../README.md) with backing-track and chord-sheet rendered. Prints "CHART UI OK".
const assert = require("assert"), path = require("path"), { launch } = require("../lead/cdp.js");
const ABC = 'X:1\nT:Test\nM:4/4\nL:1/4\nK:F\nP:Verse\n"F7"z4 | "Bb7"z4 | "F7"z2 "D7"z2 | "Gm7"z2 "C7"z2 |\nP:Chorus\n[M:3/4] "Bbmaj7"z3 | "Am7"z3 | [M:4/4] "Gm7"z2 "C7"z2 | "F6"z4 | "Dm7"z4 |\nP:Verse\n"F7"z4 | "Bb7"z4 | "F7"z2 "D7"z2 | "Gm7"z2 "C7"z2 |]';
(async () => {
  const b = await launch({ width: 1440, height: 1000 });
  const ev = x => b.eval(x), wait = async (f, ms) => { const t = Date.now(); let v; while (Date.now() - t < (ms || 8000)) { v = await ev(f); if (v) return v; await b.sleep(80); } throw new Error("timed out: " + f.slice(0, 90)); };
  const set = (id, v, type) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event("${type || "change"}", { bubbles: true })); })()`);
  try {
    await b.goto("http://127.0.0.1:8500/tools/backing-track.html"); await b.sleep(800);
    await ev(`["btSide", "btSidePos", "btSideInst"].forEach(function(k){ localStorage.removeItem(k); })`); await b.goto("http://127.0.0.1:8500/tools/backing-track.html"); await b.sleep(800);
    // ---- octaves reach the band, and a saved setup keeps them
    await set("bt-oct-bass", "1"); await set("bt-oct-comp", "-1");
    assert.deepStrictEqual(await ev(`window.__btMenuOpts().octave`), { bass: 1, comp: -1, comp2: 0 });
    await set("bt-oct-bass", "0"); await set("bt-oct-comp", "0");
    // ---- the preview of the next section
    await ev(`(function(){ var t = document.getElementById("bt-abc"); t.value = ${JSON.stringify(ABC)}; t.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    await wait(`document.querySelectorAll("#bt-chart .bt-tabset .nav-link").length === 2`);
    await set("bt-roman", "both"); await b.sleep(300);
    const nx = await ev(`(function(){ var p = document.querySelectorAll("#bt-chart .bt-tabset .tab-pane"), out = [];
      Array.prototype.forEach.call(p, function(pane){ var l = pane.querySelector(".bt-next-line"); out.push({ head: l.querySelector("b").textContent, bars: Array.prototype.map.call(l.querySelectorAll(".bt-next-bars .tc-bar"), function(c){ return c.querySelector(".tc-lt") ? Array.prototype.map.call(c.querySelectorAll(".tc-lt"), function(x){ return x.textContent; }).join(" ") : ""; }),
        marked: l.querySelectorAll("[data-bar], .tc-section, .bt-start, .bt-cyc").length, rn: l.querySelectorAll(".tc-rn").length }); }); return out; })()`);
    assert.strictEqual(nx[0].head, "Next: Chorus"); assert.deepStrictEqual(nx[0].bars, ["B♭maj7", "Am7", "Gm7 C7"], "bars until four chords are shown");
    assert.strictEqual(nx[1].head, "Next: Verse"); assert.deepStrictEqual(nx[1].bars, ["F7", "B♭7", "F7 D7"]);
    assert.ok(nx.every(x => x.marked === 0 && x.rn >= 4), "copies carry the numerals and none of the chart's marks");
    assert.strictEqual(await ev(`document.querySelectorAll("#bt-chart .tc-bar[data-bar]").length`), 13, "the chart keeps its own bars");
    // ---- time signature, letters and numerals in one bar: three bands
    await ev(`document.querySelectorAll("#bt-chart .bt-tabset .nav-link")[1].click()`); await b.sleep(200);
    const g = await ev(`(function(){ var c = document.querySelector('#bt-chart .tab-pane.active .tc-bar[data-bar="4"]'), r = function(e){ var q = e.getBoundingClientRect(), k = c.getBoundingClientRect(); return [Math.round((q.top - k.top) / k.height * 100), Math.round((q.bottom - k.top) / k.height * 100)]; };
      var lt = c.querySelector(".tc-lt"), rn = c.querySelector(".tc-rn"); return { sig: c.classList.contains("tc-sig"), m: r(c.querySelector(".tc-meter")), lt: r(lt), rn: r(rn), fl: getComputedStyle(lt.querySelector(".tc-rt")).fontSize, fr: getComputedStyle(rn).fontSize }; })()`);
    assert.ok(g.sig && g.m[1] <= 22 && g.lt[0] >= 20 && g.lt[1] <= 62 && g.rn[0] >= 58 && g.rn[1] <= 100, "bands: " + JSON.stringify(g)); assert.strictEqual(g.fl, g.fr, "letters and numerals the same size");
    await b.shot(path.join(__dirname, "chartui-chart.png"), false);
    // ---- the diagram: beside by default, its switch with it; below; off; other instruments
    const geo = () => ev(`(function(){ var s = document.getElementById("bt-side").getBoundingClientRect(), c = document.getElementById("bt-chart").getBoundingClientRect(), o = document.getElementById("bt-side-on").getBoundingClientRect(), f = document.getElementById("bt-side-frame");
      return { beside: s.left >= c.right - 1, below: s.top >= c.bottom - 1, hidden: document.getElementById("bt-side").hidden, sw: o.width > 0, swNear: Math.abs(o.top - (document.getElementById("bt-side").hidden ? c.bottom : s.top)) < 60, fh: f ? Math.round(f.getBoundingClientRect().height) : 0,
        inner: f && f.contentDocument && f.contentDocument.getElementById("sheet-output") ? Math.round(f.contentDocument.getElementById("sheet-output").getBoundingClientRect().height) : 0, opts: document.querySelector(".bt-sideopts").open }; })()`);
    await wait(`(function(){ var f = document.getElementById("bt-side-frame"); return f && f.contentDocument && f.contentDocument.querySelector("#sheet-output svg") ? 1 : 0; })()`, 15000); await b.sleep(500);
    let s = await geo(); assert.ok(s.beside && !s.below && s.sw && s.swNear && !s.opts, "beside, switch by it, options folded: " + JSON.stringify(s)); assert.ok(Math.abs(s.fh - s.inner) <= 8, "no blank space under the drawing: " + JSON.stringify(s));
    await set("bt-side-pos", "below"); await b.sleep(700); s = await geo(); assert.ok(s.below && !s.beside && s.swNear, "below: " + JSON.stringify(s)); assert.ok(Math.abs(s.fh - s.inner) <= 8, "the frame follows the drawing's new height: " + JSON.stringify(s));
    await b.shot(path.join(__dirname, "chartui-below.png"), false);
    await set("bt-side-pos", "beside"); await b.sleep(700); s = await geo(); assert.ok(s.beside && Math.abs(s.fh - s.inner) <= 8, "and back: " + JSON.stringify(s));
    for (const inst of ["bass", "violin"]) {
      await set("bt-side-inst", inst); await b.sleep(200);
      const o = await ev(`(function(){ var box = document.getElementById("bt-side-own"), f = document.getElementById("bt-side-frame"); return { svg: box.querySelectorAll("svg").length, labels: Array.prototype.map.call(box.querySelectorAll(".ld-label"), function(t){ return t.textContent; }), dots: box.querySelectorAll("svg circle[stroke-width='2'], svg path").length, frame: f.getBoundingClientRect().height, text: document.getElementById("bt-side-body").textContent }; })()`);
      assert.ok(o.svg === 1 && o.labels.length === 2 && o.dots >= 6 && o.frame === 0, inst + ": " + JSON.stringify(o)); assert.ok(/^Now .*Next /.test(o.text) && !/not one of/.test(o.text), o.text);
      await b.shot(path.join(__dirname, "chartui-" + inst + ".png"), false);
    }
    await set("bt-side-inst", "guitar"); await wait(`(function(){ var d = document.getElementById("bt-side-frame").contentDocument; return document.getElementById("bt-side-frame").getBoundingClientRect().height > 100 && d.querySelectorAll("#sheet-output .super-card svg circle").length > 3 ? 1 : 0; })()`, 10000);
    assert.strictEqual(await ev(`document.getElementById("bt-comp").value`), "piano", "the band still plays the piano");
    await set("bt-side-inst", "band");
    await ev(`document.getElementById("bt-side-on").click()`); s = await geo(); assert.ok(s.hidden && s.sw && s.swNear, "off: only the switch, by the chart: " + JSON.stringify(s));
    await b.shot(path.join(__dirname, "chartui-off.png"), false);
    await ev(`document.getElementById("bt-side-on").click()`); s = await geo(); assert.ok(!s.hidden && s.beside);
    assert.deepStrictEqual(b.errors.filter(e => !/supabaseUrl/.test(e)), []);
    console.log("CHART UI OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
