// The drum lesson and the melody-instrument lesson (lessons/blues-drums.qmd, blues-melody.qmd; apps/shared/lessons/blues-kit.js).
// Drums: every step writes two bars and the chorus on a drum staff, plays in its own feel and tempo, and writes out the chorus being played.
// Melody: every line is made of the right chord tones in every key, is written in the reader's key for each instrument, and the band is
// given it at sounding pitch. Run from tests/band/lead with the test server on port 8500 (render both pages into the test site first).
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1200 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const until = async (x, ms, what) => { const t = Date.now(); while (Date.now() - t < ms){ if (await ev(x)) return; await b.sleep(150); } throw new Error("timed out: " + what); };
  const set = (id, v) => ev(`var s = document.getElementById("${id}"); s.value = ${JSON.stringify(String(v))}; s.dispatchEvent(new Event("change")); 0`);
  const open = async page => { await ev(`0`).catch(() => {}); await b.goto(B + "/lessons/blues-" + page + ".html"); await b.sleep(1500); await ev(`window.__err = []; window.addEventListener("error", function(e){ __err.push(e.message); }); 0`); };
  const clean = async () => { assert.deepStrictEqual(await ev(`window.__err`), []); assert.deepStrictEqual(b.errors.filter(e => !/supabase|Didn't load note/i.test(e)), []); };
  try {
    // ---- drums ----
    await open("drums");
    assert.strictEqual(await ev(`!!document.querySelector(".bl-drumkey svg")`), true, "the drum key");
    assert.strictEqual(await ev(`document.getElementById("bl-dots").parentNode.hidden`), true);
    const parts = JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll(".bl-step"), function (h){ return [h.getAttribute("data-part"), !!h.__bl, h.querySelectorAll(".bl-abc svg").length, h.querySelectorAll(".tc-bar").length]; }))`));
    assert.deepStrictEqual(parts.map(p => p[0]), ["quarters", "ride", "time", "fills", "shuffle", "slow", "straight", "grab", "fills"]);        // (the last is the tune)
    parts.forEach((p, i) => assert(p[1] && p[2] === (i === 8 ? 3 : 2) && p[3] === 12, "drum step " + p));
    const step = i => `document.querySelectorAll(".bl-step")[${i}]`;
    // every drum note head names its piece; a chord's heads differ; the kit picture has a button per piece on the right line or space
    const KNOWN = ["Ride cymbal", "Ride cymbal, on the bell", "Crash cymbal", "Hi-hat (closed), with the stick", "Hi-hat, open", "Hi-hat, with the foot", "Snare drum", "High tom", "Mid tom", "Floor tom", "Bass drum"];
    const tips = () => ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll("svg .abcjs-notehead"), function (h){ var t = h.querySelector("title"); return [t ? t.textContent : null, h.parentNode.parentNode.querySelectorAll(".abcjs-notehead").length, !!h.closest(".bl-drumkey, .bl-abc.abcjs-container")]; }).filter(function (x){ return x[2]; }))`).then(JSON.parse);
    const checkTips = async where => { const t = await tips(); assert(t.length > 40, where + ": drum heads found " + t.length);
      t.forEach(x => assert(x[0] && (KNOWN.includes(x[0]) || /^Cross-stick/.test(x[0])), where + ": a head without a known name: " + JSON.stringify(x))); return t; };
    await checkTips("at load");
    assert.strictEqual(await ev(`(function(){ var g = Array.prototype.find.call(document.querySelectorAll(".bl-abc .abcjs-note"), function (n){ return n.querySelectorAll(".abcjs-notehead").length > 1; }); if (!g) return "nochord"; var t = Array.prototype.map.call(g.querySelectorAll(".abcjs-notehead"), function (h){ return h.querySelector("title").textContent; }); return new Set(t).size === t.length ? "ok" : t.join("|"); })()`), "ok", "a chord's heads tell each other apart");
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll(".bl-drumkey .abcjs-notehead"), function (h){ return h.querySelector("title").textContent; }))`)),
      ["Hi-hat (closed), with the stick", "Hi-hat, open", "Ride cymbal", "Ride cymbal, on the bell", "Crash cymbal", "Snare drum", "Cross-stick (stick laid across the snare, tapping the rim)", "High tom", "Mid tom", "Floor tom", "Bass drum", "Hi-hat, with the foot"]);
    // the picture: one button a piece, each on its own line or space of the staff drawn in it, and a click calls the band's kit
    await ev(`window.__hits = []; BandPlayer.hit = function (p){ __hits.push(p); return Promise.resolve(); }; 0`);
    const kit = JSON.parse(await ev(`JSON.stringify((function(){ var s = document.querySelector("svg.dk"), ys = {}; Array.prototype.forEach.call(s.querySelectorAll(".dk-staff"), function (l){ ys[l.getAttribute("data-step")] = +l.getAttribute("y1"); });
      return Array.prototype.map.call(s.querySelectorAll('[role=button][data-piece]'), function (b){ var h = b.querySelector(".dk-nh"), bb = h.getBBox(); return { piece: b.getAttribute("data-piece"), step: b.getAttribute("data-step"), tab: b.getAttribute("tabindex"), label: b.getAttribute("aria-label"), y: bb.y + bb.height / 2, ys: ys }; }); })())`));
    assert.deepStrictEqual(kit.map(k => k.piece).sort(), ["crash", "hatClosed", "hatFoot", "hatOpen", "kick", "ride", "rideBell", "rim", "snare", "tomHi", "tomLo", "tomMid"]);
    const want = { crash: 10, ride: 8, hatClosed: 9, tomHi: 7, tomMid: 6, snare: 5, tomLo: 3, kick: 1, hatFoot: -1 };
    kit.forEach(k => { assert(k.tab === "0" && /Play it/.test(k.label), k.piece + " is focusable and named"); if (k.piece in want) { assert.strictEqual(+k.step, want[k.piece], k.piece + " step");
      const y0 = k.ys[0], h = k.ys[2] - k.ys[0]; assert(Math.abs(k.y - (y0 + h / 2 * want[k.piece])) < 1.5, k.piece + " head drawn at its place " + k.y); } });
    for (const p of Object.keys(want).concat(["hatOpen", "rideBell", "rim"])) await ev(`document.querySelector('svg.dk [role=button][data-piece="${p}"]').dispatchEvent(new MouseEvent("click", { bubbles: true })); 0`);
    await ev(`document.querySelector('svg.dk [role=button][data-piece="snare"]').dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); 0`);
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(__hits)`)), Object.keys(want).concat(["hatOpen", "rideBell", "rim", "snare"]), "each click plays its piece");
    await ev(`__hits.length = 0; document.querySelector(".bl-drumkey .ld-hit[data-piece=sticks]").dispatchEvent(new MouseEvent("click", { bubbles: true })); 0`);
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(__hits)`)), ["rim"], "a head on the key staff plays the cross-stick");
    await ev(`${step(4)}.querySelector(".btn-primary").click(); 0`);                                   // the shuffle
    await until(`!!${step(4)}.querySelector(".tc-bar.tc-live")`, 25000, "the shuffle playing");
    assert.strictEqual(await ev(`document.getElementById("bl-feel").value`), "swing");
    await until(`/as the band is playing it/.test(${step(4)}.textContent)`, 8000, "the chorus written as played");
    await ev(`${step(4)}.querySelectorAll(".bl-check input")[1].click(); 0`); await b.sleep(300); await ev(`${step(4)}.querySelectorAll(".bl-check input")[0].click(); 0`); await b.sleep(300);
    await ev(`${step(5)}.querySelector(".btn-primary").click(); 0`);                                   // the slow blues: its own feel and tempo
    assert.strictEqual(await ev(`document.getElementById("bl-feel").value`), "doowop"); assert.strictEqual(await ev(`document.getElementById("bl-tempo-n").value`), "60");
    assert.strictEqual(await ev(`${step(4)}.querySelector(".btn-primary").textContent`), "▶ Play with the band");
    await until(`!!${step(5)}.querySelector(".tc-bar.tc-live")`, 15000, "the slow blues playing");
    await set("bl-feel", "swing"); await b.sleep(700); await until(`!!${step(5)}.querySelector(".tc-bar.tc-live")`, 5000, "still playing after a change of feel");
    await checkTips("after the chorus was redrawn while the band played");
    await ev(`document.getElementById("bl-stop").click(); 0`);
    assert.strictEqual(await ev(`document.querySelectorAll(".tc-live").length + document.querySelectorAll(".bl-tools .bl-on").length`), 0);
    await clean(); if (process.env.SHOT) await b.shot(process.env.SHOT + "-drums.png"); console.log("drums ok");

    // ---- melody instruments ----
    await open("melody");
    assert.strictEqual(await ev(`document.querySelector('label[for="bl-key"]').textContent`), "Concert key");
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(document.getElementById("bl-horn").options, function (o){ return o.value; }))`)), ["violin", "concert", "alto", "tenor", "bb", "bari"]);
    const lines = () => ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll(".bl-step:not([data-tune])"), function (h){ var w = h.__bl; return { part: h.getAttribute("data-part"), chart: h.getAttribute("data-chart") || "basic", svgs: h.querySelectorAll(".bl-abc svg").length,
        first: h.querySelector(".tc-lt").textContent, says: h.querySelector(".bl-abc + .bl-legend").textContent,
        bars: w.notes().map(function (bar){ return bar.map(function (n){ return { pos: n.pos, dur: n.dur, midi: n.midi, root: n.ch.root, label: n.ch.label }; }); }),
        band: w.parsed().bars.map(function (bar){ return (bar.melody || []).map(function (n){ return n.midi; }); }) }; }))`).then(JSON.parse);
    const T = { violin: 0, concert: 0, alto: 9, tenor: 14, bb: 2, bari: 21 }, m12 = n => ((n % 12) + 12) % 12;
    for (const horn of Object.keys(T)) for (const key of [5, 10, 0, 7, 3, 9]) {
      await set("bl-horn", horn); await set("bl-key", key);
      const wk = m12(key + T[horn]), d0 = key - 5, semis = d0 > 6 ? d0 - 12 : d0;
      for (const s of await lines()) {
        const where = horn + " concert " + key + " " + s.part + (s.chart === "jazz" ? " (jazz)" : ""), flat = [].concat(...s.bars), offs = flat.map(n => m12(n.midi - n.root));
        assert.strictEqual(s.svgs, 1, where); assert.strictEqual(s.bars.length, 12, where);
        assert.strictEqual(s.bars[0][0].root, wk, where + ": the first chord is the written key's");
        assert(flat.every(n => n.midi >= 55 && n.midi <= 86), where + " range: " + flat.map(n => n.midi));
        s.bars.forEach((bar, i) => { assert(Math.abs(bar.reduce((t, n) => Math.max(t, n.pos + n.dur), 0) - 4) < 1e-6 || s.part === "rhythm", where + " bar " + i + " full");
          assert.deepStrictEqual(s.band[i], bar.map(n => n.midi - T[horn] - semis), where + ": the band gets sounding pitch, before its own transposition"); });
        if (s.part === "roots") assert(offs.every(o => o === 0), where);
        if (s.part === "tones") assert(offs.every((o, i) => [0, 3, 4, 7, 10].includes(o)) && offs.slice(0, 4).join() === "0,4,7,10", where + " " + offs.slice(0, 4));
        if (/^guide|rhythm/.test(s.part)) { assert(offs.every(o => [3, 4, 10].includes(o)), where + " guide tones only: " + offs);
          assert.strictEqual(offs[0], s.part === "guide7" ? 10 : 4, where + " starts on the right one");
          flat.forEach((n, i) => { if (i) assert(Math.abs(n.midi - flat[i - 1].midi) <= (s.chart === "jazz" ? 3 : 2), where + ": moves by step (a third at most into VI7), note " + i + " (" + flat[i - 1].midi + " to " + n.midi + ")"); }); }
        if (s.part === "rhythm") s.bars.forEach(bar => assert.deepStrictEqual(bar.map(n => n.pos), [0, 1.5], where));
        if (s.part === "riff") { const I = s.bars[0].map(n => n.midi), IV = s.bars[4].map(n => n.midi), V = s.bars[8].map(n => n.midi);
          assert.deepStrictEqual(I.map(m => m12(m - wk)), [4, 7, 9, 7], where); assert.deepStrictEqual(IV, [I[0] - 1, I[1], I[2], I[3]], where + ": only the first note changes over IV");
          assert.deepStrictEqual(V.map(m => m12(m - wk - 7)), [4, 7, 9, 7], where + " over V"); }
      }
    }
    // what a reader sees: an alto in concert F reads in D, a tenor in G; the flat-7 panel follows
    await set("bl-key", 5); await set("bl-horn", "alto"); let L = await lines();
    assert.strictEqual(L[0].first, "D7"); assert(/Written for alto sax \(E♭\): it sounds a major sixth lower, in concert F/.test(L[0].says), L[0].says);
    assert(/D major scale/.test(await ev(`document.querySelector(".bl-scale").textContent`)));
    await set("bl-horn", "tenor"); L = await lines(); assert.strictEqual(L[0].first, "G7"); assert(/G major scale/.test(await ev(`document.querySelector(".bl-scale").textContent`)));
    await set("bl-horn", "concert"); L = await lines(); assert.strictEqual(L[0].first, "F7"); assert(!/Written for/.test(L[0].says));
    // the flat-7 panel carries the player's own chart: Violin = a finger chart in every key; saxophones and concert pitch = none
    const panelCharts = () => ev(`document.querySelectorAll(".bl-scale .bl-boards:not([hidden]) svg").length`);
    await set("bl-horn", "violin");
    for (const key of [5, 10, 0, 7, 3]) { await set("bl-key", key); assert.strictEqual(await panelCharts(), 2, "violin finger chart for the major scale and for Mixolydian, key " + key);
      assert(/finger/.test(await ev(`document.querySelector(".bl-scale .bl-boards").textContent`)), "a finger chart"); }
    for (const horn of ["concert", "alto", "bari"]) { await set("bl-horn", horn); assert.strictEqual(await panelCharts(), 0, horn + ": no chart"); }
    await set("bl-key", 5); await set("bl-horn", "concert");
    // the band's play button sits in a row directly above the chord grid, not above the notation
    assert.strictEqual(await ev(`(function(){ var h = document.querySelectorAll(".bl-step")[1], g = h.querySelector(".btn-primary"); return !!g.parentElement.nextElementSibling.querySelector(".tc-bar") && g.parentElement.previousElementSibling !== null && h.firstElementChild !== g.parentElement; })()`), true, "melody play button beside the chord grid");
    // the tone names under the notes (abcjs lyrics), and the band
    assert(await ev(`document.querySelectorAll(".bl-step")[1].querySelectorAll(".bl-abc svg .abcjs-lyric").length`) >= 48, "tone names under the notes");
    const H = `document.querySelectorAll(".bl-step")[4]`;
    await set("bl-tempo-n", 200); await ev(`${H}.querySelector(".btn-primary").click(); 0`);
    await until(`!!${H}.querySelector(".tc-bar.tc-live")`, 25000, "the line with the band");
    await ev(`${H}.querySelector(".bl-check input").click(); 0`); await b.sleep(300); await set("bl-horn", "alto"); await b.sleep(600); await set("bl-key", 10); await b.sleep(800);
    await until(`!!${H}.querySelector(".tc-bar.tc-live")`, 5000, "still playing after instrument and key changes");
    await ev(`document.getElementById("bl-stop").click(); 0`);
    // the line alone, through abcjs (needs the soundfont CDN: a warning without it)
    await ev(`Object.defineProperty(window, "getSoundfontUrl", { configurable: true, writable: true, value: function(){ return Promise.resolve("https://paulrosen.github.io/midi-js-soundfonts/MusyngKite/"); } });
      ${H}.querySelector(".bl-abc .btn").click(); 0`);
    await b.sleep(4000);
    const heard = await ev(`${H}.querySelector(".bl-abc .btn").textContent`) === "■ Stop"; if (heard) await ev(`${H}.querySelector(".bl-abc .btn").click(); 0`);
    assert.strictEqual(await ev(`${H}.querySelector(".bl-abc .btn").textContent`), "▶ Play");
    await clean(); if (process.env.SHOT) await b.shot(process.env.SHOT + "-melody.png"); console.log("melody ok" + (heard ? "" : " (the line alone did not start: is the soundfont CDN reachable?)"));
    console.log("DRUM AND MELODY LESSONS OK");
  } catch (e) { console.error("FAIL", e.message, b.errors.slice(0, 5), b.failed.slice(0, 5)); process.exitCode = 1; }
  finally { await b.close(); }
})();
