// The instrument lessons on the blues (lessons/blues-bass, -guitar, -piano.qmd; apps/shared/lessons/): every step draws its
// diagrams and chart, the notes are the right chord tones in every key, the band plays exactly the notes shown (guitar, piano),
// the sounding chord is marked, a click on a chord name sounds it, and the view, label and leave-out controls work.
// Run from tests/band/lead with the test server on port 8500 (render the three pages into the test site first).
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1200 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const until = async (x, ms, what) => { const t = Date.now(); while (Date.now() - t < ms){ if (await ev(x)) return; await b.sleep(150); } throw new Error("timed out: " + what); };
  const setKey = k => ev(`var s = document.getElementById("bl-key"); s.value = ${k}; s.dispatchEvent(new Event("change")); 0`);
  // every step, as { part, chords:[{ label, notes:[{ midi, string, fret, soft, root, text }], pin }] }
  const steps = () => ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll(".bl-step"), function (h){ var w = h.__bl;
      var labs = Array.prototype.map.call(h.querySelectorAll(".ld-label"), function (t){ return t.firstChild.textContent; });
      return { part: h.getAttribute("data-part"), svgs: h.querySelectorAll(".bl-boards svg").length, bars: h.querySelectorAll(".tc-bar").length,
               chords: w ? w.results().map(function (r, i){ return { label: labs[i], notes: r.notes, pin: r.pin || null }; }) : null }; }))`).then(JSON.parse);
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const rootOf = l => (PC[l[0]] + (l[1] === "♭" ? -1 : l[1] === "♯" ? 1 : 0) + 12) % 12, minor = l => /m7/.test(l);
  const offs = (c, ns) => ns.map(n => ((n.midi - rootOf(c.label)) % 12 + 12) % 12).sort((x, y) => x - y).join(" ");
  const TUNE = { bass: [28, 33, 38, 43], guitar: [40, 45, 50, 55, 59, 64] };
  const WANT = {                                              // semitones above the root that each part shows on a dominant 7th
    bass: { roots: "0", fifth: "0 0 7", tones: "0 4 7 10", walk: "0 0 4 7 10" },
    guitar: { roots: "0", tones: "0 4 7 10", g54: "4 10", g43: "4 10", shell: "0 4 10" },
    piano: { roots: "0", tones: "0 4 7 10", guide: "0 4 10", shell: "0 4 10", rootless: "0 2 4 9 10" } };
  let heard = 0;
  try {
    for (const inst of ["bass", "guitar", "piano"]) {
      await ev(`0`).catch(() => {}); await b.goto(B + "/lessons/blues-" + inst + ".html"); await b.sleep(1500);
      await ev(`window.__err = []; window.addEventListener("error", function(e){ __err.push(e.message); }); 0`);
      for (let key = 0; key < 12; key++) {
        await setKey(key);
        for (const s of await steps()) {
          assert(s.chords && s.svgs >= 1 && s.bars === 12, inst + " " + s.part + " built");
          for (const c of s.chords) {
            const where = inst + " key " + key + " " + s.part + " " + c.label, shown = c.notes.filter(n => !(s.part.startsWith("g") && n.soft));
            const want = minor(c.label) ? WANT[inst][s.part].replace(/\b4\b/, "3").replace("2 3 9 10", "2 3 7 10") : WANT[inst][s.part];
            assert.strictEqual(offs(c, shown), want, where);
            if (TUNE[inst]) for (const n of c.notes) { assert.strictEqual(n.midi, TUNE[inst][n.string] + n.fret, where); assert(n.fret >= 0 && n.fret <= 15 && n.string >= 0 && n.string < TUNE[inst].length, where + " on the neck"); }
            if (inst === "guitar" && c.pin.length > 1) { const used = c.notes.filter(n => c.pin.includes(n.midi)); assert.strictEqual(new Set(used.map(n => n.string)).size, used.length, where + ": one note a string");
              const fr = used.map(n => n.fret).filter(f => f > 0); assert(Math.max(...fr) - Math.min(...fr) <= 3, where + ": within four frets"); }
            if (s.part === "g54") assert.deepStrictEqual(c.notes.filter(n => !n.soft).map(n => n.string), [1, 2], where);
            if (inst === "guitar" && (s.part === "g43" || s.part === "shell")) assert.deepStrictEqual(c.notes.filter(n => !n.root).map(n => n.string), [2, 3], where);
            if (s.part === "shell" && inst === "guitar") assert(c.notes.length === 3 && c.notes[0].string < 2, where + ": the root on string 6 or 5");
            if (inst === "piano") assert(c.notes.every(n => n.midi >= 36 && n.midi <= 84), where + " register");
          }
        }
      }
      // guitar guide tones: IV a fret below I and V a fret above, in every key; "Up a tritone" moves every shape six frets on the same strings
      if (inst === "guitar") for (let key = 0; key < 12; key++) {
        await setKey(key);
        const pairs = st => st.filter(s => /^(g54|g43|shell)$/.test(s.part) && s.chords.length === 3).map(s => s.chords.map(c => c.notes.filter(n => !n.root).map(n => n.string + ":" + n.fret)));
        const shift = (p, d) => p.map(x => x.split(":")[0] + ":" + (+x.split(":")[1] + d));
        const low = pairs(await steps()); assert.strictEqual(low.length, 3);
        for (const [I, IV, V] of low) { assert.deepStrictEqual(IV, shift(I, -1), "key " + key + " IV"); assert.deepStrictEqual(V, shift(I, 1), "key " + key + " V"); assert(IV.every(x => +x.split(":")[1] >= 1), "key " + key + " no open strings"); }
        await ev(`Array.prototype.forEach.call(document.querySelectorAll(".bl-step .bl-tools .btn"), function (b){ if (/tritone/.test(b.textContent)) b.click(); }); 0`);
        const st2 = await steps(), high = pairs(st2);
        high.forEach((p, i) => { const d = +p[0][0].split(":")[1] - +low[i][0][0].split(":")[1]; assert(d === 6 || d === -6, "key " + key + " tritone: " + d); p.forEach((c, k) => assert.deepStrictEqual(c, shift(low[i][k], d))); });
        for (const s of st2.filter(s => s.part === "shell")) for (const c of s.chords) assert(c.notes.length === 3 && c.notes[0].root && c.notes[0].string < 2, "key " + key + " shell root, up a tritone: " + c.label);
        await ev(`Array.prototype.forEach.call(document.querySelectorAll(".bl-step .bl-tools .btn"), function (b){ if (/tritone/.test(b.textContent)) b.click(); }); 0`);
      }
      await setKey(inst === "piano" ? 0 : 7);
      // staff notation under every step's diagrams; the flat-7 panel with three playable lines
      assert.strictEqual(await ev(`Array.prototype.every.call(document.querySelectorAll(".bl-step"), function (h){ return !!h.querySelector(".bl-abc svg"); })`), true, inst + " notation");
      const sc = JSON.parse(await ev(`(function(){ var h = document.querySelector(".bl-scale"); return JSON.stringify({ svgs: h.querySelectorAll(".bl-abc svg").length, btns: h.querySelectorAll(".bl-abc .btn").length, text: h.textContent }); })()`));
      assert.strictEqual(sc.svgs, 3); assert.strictEqual(sc.btns, 3);
      if (inst === "piano") assert(/C major scale/.test(sc.text) && /F major scale/.test(sc.text) && /top note of C7 is B♭, a half step lower than the B of/.test(sc.text), sc.text);
      else assert(/G major scale/.test(sc.text) && /C major scale/.test(sc.text) && /top note of G7 is F, a half step lower than the F♯/.test(sc.text) && /F natural/.test(sc.text), sc.text);
      await setKey(6); assert(/G♭ major scale/.test(await ev(`document.querySelector(".bl-scale").textContent`)) && /C♭ major scale/.test(await ev(`document.querySelector(".bl-scale").textContent`)));
      await setKey(inst === "piano" ? 0 : 7);
      // its audio is abcjs's, which needs every note of the piano: the local mirror has only the band's, so this goes to the CDN (and only warns without it)
      await ev(`window.__sf = window.getSoundfontUrl; Object.defineProperty(window, "getSoundfontUrl", { configurable: true, writable: true, value: function(){ return Promise.resolve("https://paulrosen.github.io/midi-js-soundfonts/MusyngKite/"); } });
        document.querySelector(".bl-scale .bl-abc .btn").click(); 0`);
      await b.sleep(4000);
      if (await ev(`document.querySelector(".bl-scale .bl-abc .btn").textContent`) === "■ Stop") { heard++; await ev(`document.querySelector(".bl-scale .bl-abc .btn").click(); 0`); }
      else console.log("  (" + inst + ": the scale's audio did not start: is the soundfont CDN reachable?)");
      assert.strictEqual(await ev(`document.querySelector(".bl-scale .bl-abc .btn").textContent`), "▶ Play");
      await ev(`Object.defineProperty(window, "getSoundfontUrl", { configurable: true, writable: true, value: window.__sf }); 0`);      // back to the local samples for the band
      // note names instead of chord tones
      if (inst === "bass") assert.strictEqual(await ev(`Array.prototype.every.call(document.querySelectorAll(".bl-step"), function (h){ var a = h.querySelectorAll(".bl-abc"); return a.length >= 2 && !!a[a.length - 1].querySelector("svg"); })`), true, "bass lines written");   // (the tune step has the tune as well)
      const first = `document.querySelector(".bl-step .bl-boards svg text[font-weight='800']:not(.ld-label)").textContent`;
      assert.strictEqual(await ev(first), "R"); await ev(`var s = document.getElementById("bl-dots"); s.value = "name"; s.dispatchEvent(new Event("change")); 0`);
      assert.strictEqual(await ev(first), inst === "piano" ? "C" : "G"); await ev(`var s = document.getElementById("bl-dots"); s.value = "tone"; s.dispatchEvent(new Event("change")); 0`);
      // the two views of a fretboard
      if (inst !== "piano") {
        assert.strictEqual(await ev(`document.querySelectorAll(".bl-step")[0].querySelectorAll(".bl-card").length`), 3);
        await ev(`document.querySelectorAll(".bl-step")[0].querySelectorAll(".bl-tools .btn")[2].click(); 0`);
        assert.strictEqual(await ev(`document.querySelectorAll(".bl-step")[0].querySelectorAll(".bl-boards svg").length`), 1);
        assert.strictEqual(await ev(`document.querySelectorAll(".bl-step")[0].querySelectorAll(".ld-label").length`), 3);
        await ev(`document.querySelectorAll(".bl-step")[0].querySelectorAll(".bl-tools .btn")[1].click(); 0`);
      }
      // a click on a chord name sounds it (the sample set loads; no error)
      await ev(`document.querySelector(".bl-step .ld-label").dispatchEvent(new MouseEvent("click", { bubbles: true })); 0`); await b.sleep(600);
      // play the last-but-one kind of step: the bar and the chord light up; the band's part is the diagram's
      const idx = (await steps()).findIndex(s => s.part === (inst === "bass" ? "tones" : inst === "guitar" ? "shell" : "guide"));
      const H = `document.querySelectorAll(".bl-step")[${idx}]`;
      await ev(`document.getElementById("bl-tempo-n").value = 200; document.getElementById("bl-tempo-n").dispatchEvent(new Event("change")); ${H}.querySelector(".btn-primary").click(); 0`);
      await until(`!!${H}.querySelector(".tc-bar.tc-live")`, 25000, inst + " playing");
      await until(`!!${H}.querySelector(${inst === "piano" ? '".ld-label.bl-live"' : '".bl-card.bl-live"'})`, 5000, inst + " chord marked");
      const seen = new Set(), t0 = Date.now();
      while (Date.now() - t0 < 7000){ seen.add(await ev(`(function(){ var a = ${H}.querySelectorAll(${inst === "piano" ? '".ld-label"' : '".bl-card"'}); for (var i = 0; i < a.length; i++) if (a[i].classList.contains("bl-live")) return i; return -1; })()`)); await b.sleep(120); }
      seen.delete(-1); assert(seen.size >= 2, inst + " chords marked: " + [...seen]);
      if (inst === "bass") { await until(`/as the band is playing it/.test(${H}.textContent)`, 8000, "the bass line of the chorus"); assert(await ev(`${H}.querySelectorAll(".bl-abc").length === 2 && !!${H}.querySelectorAll(".bl-abc")[1].querySelector("svg")`)); }
      await ev(`${H}.querySelector(".bl-check input").click(); 0`); await b.sleep(300); await ev(`${H}.querySelector(".bl-check input").click(); 0`);
      await setKey(inst === "piano" ? 5 : 9); await b.sleep(800);
      await until(`!!${H}.querySelector(".tc-bar.tc-live")`, 5000, inst + " still playing in a new key");
      await ev(`document.getElementById("bl-stop").click(); 0`);
      assert.strictEqual(await ev(`document.querySelectorAll(".tc-live").length + document.querySelectorAll(".bl-live").length + document.querySelectorAll(".bl-tools .btn-primary.bl-on").length`), 0);
      // the pins the band is given are the notes of the diagrams
      if (inst !== "bass") { const pins = JSON.parse(await ev(`JSON.stringify(${H}.__bl.pins())`)), st = (await steps())[idx];
        assert.strictEqual(Object.keys(pins).length, 12); assert.deepStrictEqual(pins["0:0"], st.chords[0].pin); assert.deepStrictEqual(pins["8:0"], st.chords[2].pin); }
      assert.deepStrictEqual(await ev(`window.__err`), []); assert.deepStrictEqual(b.errors.filter(e => !/supabase|Didn't load note/i.test(e)), []);   // (the test site has no Supabase address)
      if (process.env.SHOT) await b.shot(process.env.SHOT + "-" + inst + ".png");
      console.log(inst + " ok");
    }
    console.log("INSTRUMENT LESSONS OK" + (heard === 3 ? "" : " (scale audio started on " + heard + " of 3 pages)"));
  } catch (e) { console.error("FAIL", e.message, b.errors.slice(0, 5), b.failed.slice(0, 5)); process.exitCode = 1; }
  finally { await b.close(); }
})();
