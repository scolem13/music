// The two draft layouts of the Backing Track (tools/backing-track-a.qmd, -b.qmd): each is the current page's markup and script with
// its controls moved. Checks that every control of the current page is still there once, that the faders stand upright, that mute
// and solo reach the player without moving a fader, that the EQ columns write what the page's own EQ reads, and that it plays.
// Needs the test server (see ../README.md) and the three pages rendered into lead/site. Prints "DRAFTS OK".
const assert = require("assert"), path = require("path"), { launch } = require("../lead/cdp.js");
const URL = "http://127.0.0.1:8500/tools/", IDS = `Array.prototype.map.call(document.querySelectorAll("#bt-root [id]"), function(e){ return e.id; }).filter(function(id){ return id.indexOf("bt-") === 0 && id !== "bt-nav" && !/^bt-(sec-\\d|tab-|pane-|side-frame)/.test(id); }).sort()`;
(async () => {
  const b = await launch({ width: 1440, height: 1000 });
  try {
    await b.goto(URL + "backing-track.html");
    const ids = await b.eval(IDS);
    const own = await b.eval(`(function(){ var v = document.getElementById("bt-voice-bass"); v.value = "electric"; v.dispatchEvent(new Event("change", { bubbles: true })); var r = v.getBoundingClientRect(), l = v.previousElementSibling.getBoundingClientRect();
      return [document.getElementById("bt-bass-sound").value, [].some.call(document.getElementById("bt-eq-inst").options, function(o){ return o.value === "ebass"; }), Math.abs(r.width - l.width) < 2 && r.height > 8]; })()`);
    assert.deepStrictEqual(own, ["electric", true, true], "current page: the name over the bass fader changes the bass");
    const remembered = await b.eval(`new Promise(function(r){ setTimeout(function(){ r(window.localStorage.getItem("btSections")); }, 300); })`);
    for (const x of ["a", "b"]) {
      await b.resize(1440, 1000);
      await b.goto(URL + "backing-track-" + x + ".html");
      const got = await b.eval(IDS);
      assert.deepStrictEqual(got, ids, "draft " + x + ": the same controls as the current page");
      const r = await b.eval(`(async function(){
        function $(id){ return document.getElementById(id); }
        function box(id){ var r = $(id).getBoundingClientRect(); return { w: r.width, h: r.height }; }
        function seen(id){ var r = $(id).getBoundingClientRect(); return r.width > 0 && r.height > 0; }
        var D = window.BTDraft, out = {};
        if (${JSON.stringify(x)} === "a"){ $("dxa-tab-band").click(); var q = function(id){ return $(id).getBoundingClientRect(); }, ba = q("bt-bass"), dr = q("bt-groove"), co = q("bt-comp"), se = q("bt-second");
          out.band = ba.width > 0 && dr.top > ba.bottom && Math.abs(dr.left - ba.left) < 4 && co.left > ba.right && se.left > co.right && Math.abs(co.top - ba.top) < 30 && Math.abs(se.top - ba.top) < 30; $("dxa-tab-mix").click(); }
        out.faders = ["bt-vol-bass", "bt-vol-comp", "bt-vol-drums", "bt-kit-kick", "bt-kit-toms", "bt-tb-0"].map(function(id){ return id === "bt-tb-0" && !seen(id) ? null : box(id); });
        out.eqGain = (function(){ var r = document.querySelector(".dx-eqband input[type=range]").getBoundingClientRect(); return { w: r.width, h: r.height }; })();
        out.qSlider = seen("bt-eq-q0");
        if (${JSON.stringify(x)} === "a"){
          var spot = function(){ var o = {}; ["bt-kit", "bt-eq"].forEach(function(id){ var r = $(id).getBoundingClientRect(); o[id] = [Math.round(r.left), Math.round(r.top)]; });
            var e = document.querySelector(".dx-eqband input[type=range]").getBoundingClientRect(), a = document.querySelector(".dxa-amp").getBoundingClientRect(); o.eq = [Math.round(e.left), Math.round(e.top)]; o.amp = Math.round(a.top); return o; };
          var ends = function(){ return Array.prototype.filter.call(document.querySelectorAll("#bt-sec-mix .dxa-console input.dx-v"), function(r){ return r.getBoundingClientRect().height > 0; }).map(function(r){ var q = r.getBoundingClientRect(); return Math.round(q.top) + ":" + Math.round(q.bottom); }); };
          var set = function(id, v){ $(id).value = v; $(id).dispatchEvent(new Event("change", { bubbles: true })); }, was = $("bt-comp").value, at0 = spot();
          out.ends0 = ends(); set("bt-comp", "wurli"); set("bt-second", "guitar"); await new Promise(function(r){ setTimeout(r, 80); });
          out.ends1 = ends(); out.stay = JSON.stringify(spot()) === JSON.stringify(at0); out.spots = [at0, spot()];
          out.ampLast = document.querySelector(".dxa-amp").getBoundingClientRect().top >= document.querySelector(".dxa-console").getBoundingClientRect().bottom;
          set("bt-comp", was); set("bt-second", ""); await new Promise(function(r){ setTimeout(r, 80); }); }
        // mute, solo
        function btn(id, cls){ return $(id).closest(".dx-strip").querySelector("." + cls); }
        btn("bt-vol-bass", "dx-m").click(); out.muted = Object.assign({}, D.sent); out.bassFader = $("bt-vol-bass").value;
        btn("bt-vol-bass", "dx-m").click(); btn("bt-vol-drums", "dx-s").click(); out.solo = Object.assign({}, D.sent);
        $("bt-vol-comp").value = 60; $("bt-vol-comp").dispatchEvent(new Event("input", { bubbles: true })); out.soloMoved = D.sent.comp;
        btn("bt-vol-drums", "dx-s").click(); out.clear = Object.assign({}, D.sent);
        btn("bt-kit-kick", "dx-s").click(); out.kitSolo = Object.assign({}, D.sent); btn("bt-kit-kick", "dx-s").click(); out.kitClear = Object.assign({}, D.sent);
        // the name over a fader is a menu of sounds
        var vc = $("bt-voice-comp"), was = $("bt-comp").value; vc.dispatchEvent(new Event("pointerdown")); vc.value = "guitar"; vc.dispatchEvent(new Event("change", { bubbles: true }));
        out.voice = [$("bt-comp").value, $("bt-vol-comp-label").textContent, vc.options.length === $("bt-comp").options.length, vc.getBoundingClientRect().height > 8];
        $("bt-comp").value = was; $("bt-comp").dispatchEvent(new Event("change", { bubbles: true })); out.voiceBack = vc.value === was;
        // the EQ columns
        var band = document.querySelectorAll(".dx-eqband")[2], q = band.querySelectorAll("input[type=number]")[1], f = band.querySelectorAll("input[type=number]")[0], g = band.querySelector("input[type=range]");
        f.value = 3000; f.dispatchEvent(new Event("change")); q.value = 2; q.dispatchEvent(new Event("change")); g.value = -6; g.dispatchEvent(new Event("input"));
        var inst = $("bt-eq-inst").value; out.eq = BandSounds.getEQ(inst)[2]; out.eqStored = JSON.parse(localStorage.getItem("btEQ"))[inst][2];
        $("bt-eq-reset").click(); out.eqFlat = BandSounds.getEQ(inst)[2]; await new Promise(function(r){ setTimeout(r, 50); }); out.eqShown = [f.value, q.value, g.value];
        // an amp: number boxes drive the page's sliders
        $("bt-comp").value = Array.prototype.filter.call($("bt-comp").options, function(o){ return BandSounds.getAmp(o.value); })[0].value; $("bt-comp").dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise(function(r){ setTimeout(r, 50); }); out.ampBoxes = document.querySelectorAll("#bt-amp-stages .dx-num input").length; out.ampSliders = document.querySelectorAll("#bt-amp-stages input[type=range]").length;
        out.remembered = localStorage.getItem("btSections");
        // play a couple of bars
        $("bt-countin").value = "0"; $("bt-countin").dispatchEvent(new Event("change", { bubbles: true }));
        $("bt-play").click(); var t0 = Date.now();
        while (Date.now() - t0 < 20000 && !/bar 2/.test($("bt-status").textContent)) await new Promise(function(r){ setTimeout(r, 100); });
        out.status = $("bt-status").textContent; out.live = !!document.querySelector("#bt-chart .tc-live"); $("bt-play").click();
        out.overflow = document.documentElement.scrollWidth - window.innerWidth;
        return out; })()`);
      if (x === "a") assert.strictEqual(r.band, true, "Band tab: bass over drums, chords beside them, second chords beside that");
      if (x === "a"){ assert.ok(r.ends0.length === 14 && r.ends1.length === 15 && r.ends0.concat(r.ends1).every(e => e === r.ends0[0]), "every fader of the console starts and ends on the same lines: " + r.ends0.join(" ") + " | " + r.ends1.join(" "));
        assert.ok(r.stay && r.ampLast, "the blocks stay where they are when the instruments change, the amp under them: " + JSON.stringify(r.spots)); }
      r.faders.forEach((f, i) => { if (f) assert.ok(f.h > f.w * 2, "draft " + x + ": fader " + i + " stands upright " + JSON.stringify(f)); });
      assert.ok(r.eqGain.h > r.eqGain.w * 2, "EQ amount is a vertical fader"); assert.strictEqual(r.qSlider, false, "no slider for Q");
      assert.strictEqual(r.muted.bass, 0); assert.strictEqual(r.bassFader, "100"); assert.ok(r.muted.comp > 0 && r.muted.drums > 0);
      assert.ok(r.solo.drums > 0 && r.solo.bass === 0 && r.solo.comp === 0, "solo silences the others"); assert.strictEqual(r.soloMoved, 0, "a fader moved under a solo stays silent");
      assert.strictEqual(r.clear.bass, 1); assert.strictEqual(r.clear.comp, 0.6);
      assert.ok(r.kitSolo["kit:kick"] > 0 && r.kitSolo["kit:snare"] === 0 && r.kitSolo["kit:rideBell"] === 0 && r.kitSolo.bass === 1, "kit solo stays inside the kit");
      assert.ok(r.kitClear["kit:snare"] > 0 && r.kitClear["kit:ride"] > 0);
      assert.deepStrictEqual([r.eq.f, r.eq.q, r.eq.gain], [3000, 2, -6]); assert.deepStrictEqual(r.eqStored, r.eq); assert.strictEqual(r.eqFlat.gain, 0); assert.deepStrictEqual(r.eqShown, ["1000", "1", "0"]);
      assert.deepStrictEqual(r.voice, ["guitar", "Guitar volume", true, true], "the name over the fader changes the sound"); assert.ok(r.voiceBack);
      assert.ok(r.ampBoxes > 3 && r.ampBoxes === r.ampSliders, "a number box for each amp setting");
      assert.strictEqual(r.remembered, remembered, "the current page's remembered panels are left alone");
      assert.ok(/bar 2/.test(r.status) && r.live, "it plays: " + r.status);
      assert.ok(r.overflow <= 0, "no sideways scroll at 1440: " + r.overflow);
      assert.deepStrictEqual(b.errors.filter(e => !/supabaseUrl/.test(e)), [], "no page errors");      // (the site's sign-in has no settings on the test server)
      await b.shot(path.join(__dirname, "draft-" + x + "-desktop.png"));
      await b.resize(390, 800); await b.sleep(300);
      const over = await b.eval(`document.documentElement.scrollWidth - window.innerWidth`); assert.ok(over <= 0, "draft " + x + ": no sideways scroll on a phone: " + over);
      await b.shot(path.join(__dirname, "draft-" + x + "-phone.png"));
    }
    // ---- the bar at the foot of the window (PlayBar): draft A and a lesson page. One row, the same height at every width; what does not
    // fit leaves by importance (Changes first, Play and Stop never) and is reached through Options.
    const bar = (id) => b.eval(`(function(){ var bar = document.getElementById("${id}"), r = bar.getBoundingClientRect(), pop = bar.nextElementSibling, more = bar.querySelector(".playbar-more");
      function ids(box){ return Array.prototype.map.call(box.querySelectorAll("[id]"), function(e){ return e.id; }); }
      return { h: Math.round(r.height), foot: Math.round(window.innerHeight - r.bottom), inBar: ids(bar), inPop: ids(pop), more: !more.hidden, popOpen: !pop.hidden, fits: Array.prototype.every.call(bar.children, function(c){ var q = c.getBoundingClientRect(); return q.width === 0 || (q.left >= -1 && q.right <= window.innerWidth + 1); }) }; })()`);
    const heights = [];
    for (const [url, id, keep, first] of [["backing-track-a.html", "dxa-bar", "bt-play", "bt-changes"], ["../lessons/blues-melody.html", "bl-bar", "bl-stop", "bl-dots"]]) {
      await b.resize(1700, 900); await b.goto(URL + url); await b.sleep(900);
      let w = await bar(id); heights.push(w.h); assert.ok(w.foot === 0 && w.fits && !w.more && w.inPop.length === 0, url + " wide: everything in the bar " + JSON.stringify(w));
      for (const width of [1000, 700, 390]) { await b.resize(width, 800); await b.sleep(400); const n = await bar(id); heights.push(n.h);
        assert.ok(n.fits && n.foot === 0 && n.inBar.indexOf(keep) >= 0, url + " at " + width + ": " + JSON.stringify(n));
        if (width === 390) { assert.ok(n.more && n.inPop.length >= 3, "narrow: Options holds the rest " + JSON.stringify(n)); if (id === "dxa-bar") assert.ok(n.inPop.indexOf(first) >= 0, "Changes left the bar"); } }
      await b.eval(`document.querySelector(".playbar-more").click()`); w = await bar(id); assert.ok(w.popOpen, "Options opens the panel");
      if (id === "dxa-bar") { await b.shot(path.join(__dirname, "draft-a-bar-phone.png"), false);
        // while playing, Fill now matters more than the tempo
        await b.resize(520, 800); await b.sleep(300); const idle = await bar(id);
        await b.eval(`(function(){ var c = document.getElementById("bt-countin"); c.value = "0"; c.dispatchEvent(new Event("change", { bubbles: true })); document.getElementById("bt-play").click(); })()`);
        const t0 = Date.now(); let live = idle; while (Date.now() - t0 < 20000) { live = await bar(id); if (live.inBar.indexOf("bt-fill") >= 0) break; await b.sleep(150); }
        assert.ok(idle.inBar.indexOf("bt-tempo-n") >= 0 && idle.inBar.indexOf("bt-fill") < 0 && live.inBar.indexOf("bt-fill") >= 0 && live.inBar.indexOf("bt-play") >= 0, "importance follows playing: " + JSON.stringify([idle.inBar, live.inBar]));
        await b.eval(`document.getElementById("bt-play").click()`); }
      else await b.shot(path.join(__dirname, "lesson-bar-phone.png"), false);
    }
    assert.ok(heights.every(h => h === heights[0]), "one height everywhere: " + heights.join(" "));
    console.log("DRAFTS OK");
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
