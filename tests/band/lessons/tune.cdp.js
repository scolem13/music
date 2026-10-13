// Blues in the Closet in every lesson, the lit note in the notation, and the improvising lesson (lessons/blues-*.qmd; apps/shared/lessons/).
// Every page has the tune written above a chart of its changes; a note lights when abcjs plays it and while the band plays; nothing stays
// lit after Stop. The improvising lesson's scales are the right notes on the right roots in every key for every instrument.
// Run from tests/band/lead with the test server on port 8500 (render the seven lesson pages into the test site first).
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1200 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const until = async (x, ms, what) => { const t = Date.now(); while (Date.now() - t < ms){ if (await ev(x)) return; await b.sleep(120); } throw new Error("timed out: " + what); };
  const set = (id, v) => ev(`var s = document.getElementById("${id}"); s.value = ${JSON.stringify(String(v))}; s.dispatchEvent(new Event("change")); 0`);
  const open = async page => { await ev(`0`).catch(() => {}); await b.goto(B + "/lessons/blues-" + page + ".html"); await b.sleep(1600); await ev(`window.__err = []; window.addEventListener("error", function(e){ __err.push(e.message); }); 0`); };
  const clean = async () => { assert.deepStrictEqual(await ev(`window.__err`), []); assert.deepStrictEqual(b.errors.filter(e => !/supabase|Didn't load note/i.test(e)), []); };
  const CDN = `Object.defineProperty(window, "getSoundfontUrl", { configurable: true, writable: true, value: function(){ return Promise.resolve("https://paulrosen.github.io/midi-js-soundfonts/MusyngKite/"); } });`;
  let alone = 0;
  try {
    for (const page of ["changes", "bass", "guitar", "piano", "drums", "melody", "improv"]) {
      await open(page);
      // the step that holds the tune: the last one on the page that has its title in notation
      const H = `(function(){ var a = document.querySelectorAll(".bl-step"), h = null; for (var i = 0; i < a.length; i++) if (/Blues in the Closet, by Oscar Pettiford/.test(a[i].textContent)) { h = a[i]; ${page === "improv" || page === "melody" ? "break;" : ""} } return h; })()`;
      assert.strictEqual(await ev(`!!${H}`), true, page + " has the tune");
      const S = `(function(){ var rows = ${H}.querySelectorAll(".bl-abc"); for (var i = 0; i < rows.length; i++) if (/Blues in the Closet/.test(rows[i].textContent)) return rows[i]; return null; })()`;
      assert.strictEqual(await ev(`!!${S}.querySelector("svg")`), true, page + " notation");
      assert.strictEqual(await ev(`Array.prototype.map.call(${H}.querySelectorAll(".tc-bar"), function (x){ return Array.prototype.map.call(x.querySelectorAll(".tc-rn"), function (c){ return c.textContent; }).join(" "); }).join("|")`),
        "I7|I7|I7|I7|IV7|IV7|I7|I7|ii7|V7|I7|V7", page + " changes");
      const lit = `${S}.querySelectorAll(".ls-on").length`, sig = `Array.prototype.map.call(${S}.querySelectorAll(".abcjs-note"), function (n, i){ return n.classList.contains("ls-on") ? i : ""; }).join("")`;
      // the band: the bar lights on the chart and a note lights in the tune, and it moves
      await set("bl-tempo-n", 180);
      await ev(`${H}.querySelector(".bl-tools .btn-primary").click(); 0`);
      await until(`!!${H}.querySelector(".tc-bar.tc-live")`, 25000, page + " band playing");
      await until(`${lit} > 0`, 6000, page + " a note lit with the band");
      const seen = new Set(), t0 = Date.now(); while (Date.now() - t0 < 4000){ seen.add(await ev(sig)); await b.sleep(90); }
      assert(seen.size >= 5, page + " lit note moves: " + [...seen].join(","));
      if (page === "bass" || page === "drums") assert(await ev(`${H}.querySelectorAll(".ls-on").length > ${lit}`), page + ": its own line is lit too");
      if (page === "guitar" || page === "piano") await until(`(function(){ var st = ${H}.querySelectorAll(".bl-abc"); for (var i = 0; i < st.length; i++) if (!/Blues in the Closet/.test(st[i].textContent) && st[i].querySelector(".ls-on")) return true; return false; })()`, 4000, page + ": the chord's bar of the staff is lit");
      if (page !== "changes") { await set("bl-key", 10); await b.sleep(900); await until(`!!${H}.querySelector(".tc-bar.tc-live")`, 5000, page + " still playing in a new key"); }
      await ev(`document.getElementById("bl-stop").click(); 0`);
      assert.strictEqual(await ev(`document.querySelectorAll(".ls-on").length + document.querySelectorAll(".tc-live").length`), 0, page + ": nothing lit after Stop");
      // by itself, through abcjs (the soundfont CDN: a warning without it)
      await ev(`${CDN} ${S}.querySelector(".btn").click(); 0`);
      let ok = false; for (let t = Date.now(); Date.now() - t < 7000 && !ok;) { ok = await ev(`${S}.querySelector(".btn").textContent === "■ Stop" && ${lit} > 0`); await b.sleep(150); }
      if (ok) { alone++; const s2 = new Set(), t1 = Date.now(); while (Date.now() - t1 < 2500){ s2.add(await ev(sig)); await b.sleep(90); } assert(s2.size >= 3, page + " lit note moves when the notation plays: " + [...s2].join(",")); }
      if (await ev(`${S}.querySelector(".btn").textContent`) === "■ Stop") await ev(`${S}.querySelector(".btn").click(); 0`);
      assert.strictEqual(await ev(`document.querySelectorAll(".ls-on").length`), 0, page + ": nothing lit after the notation stops");
      await clean(); console.log(page + " ok");
    }
    // ---- the 12-bar blues lesson: the tune's changes as a step of its own
    await open("changes");
    assert.strictEqual(await ev(`Array.prototype.map.call(document.querySelectorAll('[data-step="closet"] .tc-bar'), function(x, i){ return x.classList.contains("bl-new") ? i + 1 : 0; }).filter(Boolean).join(" ")`), "9 10 12");
    assert.strictEqual(await ev(`document.querySelectorAll(".bl-step").length`), 8);
    await set("bl-key", 3); assert.strictEqual(await ev(`document.querySelector('[data-step="closet"] .tc-lt').textContent`), "E♭7");
    assert.strictEqual(await ev(`!!document.querySelector('[data-step="closet"] .bl-abc svg')`), true);
    // ---- the melody lesson: the tune is written in the reader's key
    await open("melody"); await set("bl-horn", "alto"); await set("bl-key", 5);
    const tune = JSON.parse(await ev(`(function(){ var h = document.querySelector('.bl-step[data-tune]'), w = h.__bl; return JSON.stringify({ first: w.notes()[0][0].midi, chart: h.querySelector(".tc-lt").textContent, words: h.querySelectorAll(".abcjs-lyric").length, says: h.textContent }); })()`));
    assert.strictEqual(((tune.first % 12) + 12) % 12, 2, "an alto in concert F starts on written D"); assert.strictEqual(tune.chart, "D7"); assert(tune.words >= 40, "tone names under the tune: " + tune.words);
    assert(/Written for alto sax \(E♭\)/.test(tune.says));
    // ---- the improvising lesson: its scales, written and on each instrument
    await open("improv");
    const kinds = JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll(".bl-notes"), function (h){ return h.getAttribute("data-scale") + ":" + (h.getAttribute("data-on") || "I"); }))`));
    assert.deepStrictEqual(kinds, ["minorblues:I", "majorblues:I", "minorpent:I", "majorpent:I", "minorpent:vi", "mixolydian:I", "mixolydian:IV", "mixolydian:V", "dorian:ii"]);
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(document.getElementById("bl-horn").options, function (o){ return o.value; }))`)), ["violin", "guitar", "bass", "piano", "concert", "alto", "tenor", "bb", "bari"]);
    const WANT = { minorblues: [0, 3, 5, 6, 7, 10, 12], majorblues: [0, 2, 3, 4, 7, 9, 12], minorpent: [0, 3, 5, 7, 10, 12], majorpent: [0, 2, 4, 7, 9, 12], mixolydian: [0, 2, 4, 5, 7, 9, 10, 12], dorian: [0, 2, 3, 5, 7, 9, 10, 12] };
    const ON = { I: 0, IV: 5, V: 7, ii: 2, vi: 9 }, T = { violin: 0, guitar: 12, bass: 12, piano: 0, concert: 0, alto: 9, tenor: 14, bb: 2, bari: 21 }, TUN = { guitar: [40, 45, 50, 55, 59, 64], bass: [28, 33, 38, 43], violin: [55, 62, 69, 76] };
    const m12 = n => ((n % 12) + 12) % 12, BLACK = [1, 3, 6, 8, 10], at = k => kinds.indexOf(k);
    for (const horn of Object.keys(T)) for (let key = 0; key < 12; key++) {
      await set("bl-horn", horn); await set("bl-key", key);
      const sc = JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll(".bl-notes"), function (h){ var b = h.__bl; return { midis: b.midis, title: b.title, svg: !!h.querySelector(".bl-abc svg"), words: h.querySelectorAll(".abcjs-lyric").length, chart: b.chart, charts: h.querySelectorAll(".bl-boards svg").length, shown: !h.querySelector(".bl-boards").hidden }; }))`));
      const wk = m12(key + T[horn]);
      sc.forEach((s, i) => { const [kind, on] = kinds[i].split(":"), where = horn + " concert " + key + " " + kinds[i], up = WANT[kind], root = m12(wk + ON[on]), pcs = up.map(o => m12(root + o));
        assert(s.svg && s.words === s.midis.length, where + " drawn with a number under every note");
        assert.strictEqual(m12(s.midis[0]), root, where + " root");
        assert.deepStrictEqual(s.midis.map(m => m - s.midis[0]), up.concat(up.slice(0, -1).reverse()), where + " notes, up and back");
        assert(s.midis.every(m => m >= 58 && m <= 86), where + " range");
        if (horn === "guitar" || horn === "bass" || horn === "violin") { const tun = TUN[horn], c = s.chart; assert(c && s.shown && s.charts === (horn === "violin" ? 1 : 2), where + " chart");
          c.spots.forEach(p => { assert.strictEqual(p.midi, tun[p.string] + p.fret, where); assert(pcs.includes(m12(p.midi)), where + ": a note of the scale"); });
          if (horn === "violin") assert(c.spots.every(p => p.fret >= 0 && p.fret <= 7), where + ": first position");
          else { assert(c.hi - c.lo <= 4 && c.spots.every(p => p.fret >= c.lo && p.fret <= c.hi), where + ": one hand position, frets " + c.lo + " to " + c.hi);
            // every note of the scale that the position can reach is shown, and the tablature is the run, inside the position
            tun.forEach((open, st) => { for (let f = c.lo; f <= c.hi; f++) if (pcs.includes(m12(open + f))) assert(c.spots.some(p => p.string === st && p.fret === f), where + ": missing string " + st + " fret " + f); });
            assert.deepStrictEqual(c.run.map(p => p.midi - c.run[0].midi), up.concat(up.slice(0, -1).reverse()), where + " tablature"); assert.strictEqual(m12(c.run[0].midi), root, where + " tablature starts on the root"); } }
        else if (horn === "piano") { assert(s.chart && s.charts === 1, where + " keyboard");
          if (up.length === 8) { const fg = s.chart.fingers, ms = s.chart.midis; assert(fg, where + " fingered");
            ["R", "L"].forEach(hd => { assert.strictEqual(fg[hd].length, 8); fg[hd].forEach((f, k) => { assert(f >= 1 && f <= 5, where + " " + hd + " finger " + f); if (f === 1) assert(!BLACK.includes(m12(ms[k])), where + ": " + hd + " thumb on a black key"); }); });
            // right hand: the fingers count up between thumbs; left hand: down to them
            for (let k = 1; k < 8; k++) { assert(fg.R[k] === fg.R[k - 1] + 1 || fg.R[k] === 1, where + " R.H. " + fg.R); assert(fg.L[k] === fg.L[k - 1] - 1 || fg.L[k - 1] === 1, where + " L.H. " + fg.L); } }
          else assert.strictEqual(s.chart.fingers, null, where + ": no fingering claimed"); }
        else assert(!s.shown && s.charts === 0, where + ": notation only"); });
      const set7 = k => [...new Set(sc[at(k)].midis.map(m12))].sort((x, y) => x - y).join(" ");
      assert.strictEqual(set7("dorian:ii"), set7("mixolydian:V"), "ii Dorian and V Mixolydian are the same notes");
      assert.strictEqual(set7("minorpent:vi"), set7("majorpent:I"), "the minor pentatonic a minor 3rd below is the major pentatonic");
      const I = set7("mixolydian:I").split(" "), IV = set7("mixolydian:IV").split(" "); assert.strictEqual(I.filter(x => !IV.includes(x)).length, 1, "I and IV Mixolydian differ by one note");
      assert.strictEqual(+I.filter(x => !IV.includes(x))[0], m12(wk + 4), "and it is the 3rd of the home chord");
    }
    await set("bl-horn", "piano"); await set("bl-key", 5);
    assert.deepStrictEqual(JSON.parse(await ev(`JSON.stringify(Array.prototype.map.call(document.querySelectorAll(".bl-notes"), function (h){ return h.__bl.title; }))`)),
      ["F minor blues scale", "F major blues scale", "F minor pentatonic scale", "F major pentatonic scale", "D minor pentatonic scale", "F Mixolydian", "B♭ Mixolydian", "C Mixolydian", "G Dorian"]);
    const fm = JSON.parse(await ev(`JSON.stringify(document.querySelectorAll(".bl-notes")[5].__bl.chart.fingers)`));           // F Mixolydian = the B flat major scale from F
    assert.deepStrictEqual(fm, { R: [1, 2, 3, 4, 1, 2, 3, 4], L: [3, 2, 1, 3, 2, 1, 4, 3] });
    await set("bl-key", 7); const gm = JSON.parse(await ev(`JSON.stringify(document.querySelectorAll(".bl-notes")[5].__bl.chart.fingers)`));   // G Mixolydian = C major from G
    assert.deepStrictEqual(gm, { R: [2, 3, 4, 1, 2, 3, 1, 2], L: [1, 3, 2, 1, 4, 3, 2, 1] });
    await set("bl-key", 5);
    // a bass reads bass clef; the guitar's minor pentatonic in A is the box at the fifth fret
    await set("bl-horn", "bass"); assert(await ev(`document.querySelectorAll(".bl-notes .bl-abc svg .abcjs-staff-extra, .bl-notes .bl-abc svg").length`) > 0); assert(/Written in bass clef/.test(await ev(`document.querySelector(".bl-step").textContent`)));
    await set("bl-horn", "guitar"); await set("bl-key", 9);
    assert.strictEqual(await ev(`document.querySelectorAll(".bl-notes")[2].__bl.chart.spots.filter(function (p){ return p.fret >= 5; }).map(function (p){ return p.string + ":" + p.fret; }).join(" ")`), "0:5 0:8 1:5 1:7 2:5 2:7 3:5 3:7 4:5 4:8 5:5 5:8");
    assert.strictEqual(await ev(`document.querySelectorAll(".bl-notes")[2].__bl.chart.run.map(function (p){ return p.string + ":" + p.fret; }).slice(0, 6).join(" ")`), "0:5 0:8 1:5 1:7 2:5 2:7");
    await set("bl-horn", "concert"); await set("bl-key", 5);
    // a scale plays by itself and its notes light (before the next check, whose false starts on the local samples abcjs remembers)
    await ev(`${CDN} document.querySelector(".bl-notes .btn").click(); 0`);
    let sok = false; for (let t = Date.now(); Date.now() - t < 7000 && !sok;) { sok = await ev(`document.querySelectorAll(".bl-notes .ls-on").length > 0`); await b.sleep(150); }
    if (await ev(`document.querySelector(".bl-notes .btn").textContent`) === "■ Stop") await ev(`document.querySelector(".bl-notes .btn").click(); 0`);
    assert.strictEqual(await ev(`document.querySelectorAll(".ls-on").length`), 0);
    // the tune's notation by itself is swung unless the feel is straight eighths; the Backing Track opens with the tune handed over
    await ev(`window.__opt = []; var C0 = ABCJS.synth.CreateSynth; ABCJS.synth.CreateSynth = function (){ var sy = new C0(), init0 = sy.init; sy.init = function (o){ __opt.push(o.options.swing); return init0.call(sy, o); }; return sy; };
      window.__open = []; window.open = function (u){ __open.push(u); return null; }; 0`);
    const tb = `document.querySelector(".bl-step[data-tune] .bl-abc:not([hidden]) .btn")`;
    await ev(`${tb}.click(); 0`); await b.sleep(300); await ev(`${tb}.click(); 0`); await set("bl-feel", "boogaloo"); await ev(`${tb}.click(); 0`); await b.sleep(300); await ev(`${tb}.click(); 0`); await set("bl-feel", "swing");
    assert.deepStrictEqual([...new Set(await ev(`window.__opt`))], [66, 0], "swing handed to abcjs");      // (with the local samples a start may fail and the second click start again)
    await ev(`LessonScore.stop(); 0`);
    await ev(`Array.prototype.filter.call(document.querySelectorAll(".bl-step[data-tune] .bl-tools .btn"), function (x){ return /Backing Track/.test(x.textContent); })[0].click(); 0`);
    assert.deepStrictEqual(await ev(`window.__open`), ["/tools/backing-track.html?from=chord-entry"]);
    const hand = JSON.parse(await ev(`localStorage.getItem("bandHandoff")`)); assert(hand.v === 1 && hand.from === "chord-entry" && /T:Blues in the Closet/.test(hand.abc) && hand.style === "swing" && hand.tempo > 0 && Date.now() - hand.at < 5000);
    // the last step has nothing written and still plays
    const last = `document.querySelectorAll(".bl-step")[document.querySelectorAll(".bl-step").length - 1]`;
    assert.strictEqual(await ev(`${last}.querySelectorAll(".bl-abc svg").length`), 0); assert(/the chorus is yours/.test(await ev(`${last}.textContent`)));
    await ev(`${last}.querySelector(".btn-primary").click(); 0`); await until(`!!${last}.querySelector(".tc-bar.tc-live")`, 15000, "the open chorus"); await ev(`document.getElementById("bl-stop").click(); 0`);
    await clean();
    // ---- the Backing Track really takes the hand-off (the page as last rendered into the test site)
    await ev(`localStorage.setItem("bandHandoff", JSON.stringify({ v: 1, from: "chord-entry", at: Date.now(), abc: BluesTunes.closet.abc, tempo: 132, style: "swing" })); 0`);
    await b.goto(B + "/tools/backing-track.html?from=chord-entry"); await b.sleep(2500);
    assert(/Blues in the Closet/.test(await ev(`document.getElementById("bt-abc").value`)), "the Backing Track has the tune");
    assert.strictEqual(await ev(`document.getElementById("bt-tempo-n").value`), "132");
    // ---- the bass lesson: step 3 is the chord-tone line
    await open("bass");
    assert.strictEqual(await ev(`document.querySelectorAll(".bl-step")[3].__bl.bass`), "arp"); assert.strictEqual(await ev(`document.querySelectorAll(".bl-step")[4].__bl.bass`), "walk");
    assert.strictEqual(await ev(`!!BandCatalog.byId(BandCatalog.bass, "arp")`), true);
    // ---- the Lessons landing page
    await ev(`0`).catch(() => {}); await b.goto(B + "/lessons/index.html"); await b.sleep(1200);
    const shown = () => ev(`JSON.stringify(Array.prototype.filter.call(document.querySelectorAll("#ll-list li"), function (li){ return !li.hidden; }).map(function (li){ return li.querySelector(".ll-step").textContent + "|" + li.querySelector("a").getAttribute("href").split("/").pop(); }))`).then(JSON.parse);
    assert.strictEqual((await shown()).length, 10, "all");
    const pick = i => ev(`document.querySelector('#ll-pick [data-inst="${i}"]').click(); 0`);
    await pick("bass"); assert.deepStrictEqual(await shown(), ["Lesson 1|blues-changes.html", "Lesson 2|blues-bass.html", "Lesson 3|blues-improv.html"]);
    await pick("drums"); assert.deepStrictEqual(await shown(), ["Lesson 1|blues-changes.html", "Lesson 2|blues-drums.html", "Lesson 3|hihat-grooves.html"]);
    await pick("sax"); assert.deepStrictEqual(await shown(), ["Lesson 1|blues-changes.html", "Lesson 2|blues-melody.html", "Lesson 3|blues-improv.html"]);
    assert.strictEqual(await ev(`document.querySelector('#ll-pick [aria-pressed="true"]').getAttribute("data-inst")`), "sax");
    await b.goto(B + "/lessons/index.html"); await b.sleep(900); assert.strictEqual((await shown()).length, 3, "the choice is kept");
    await b.goto(B + "/lessons/index.html?instrument=guitar"); await b.sleep(900); assert.deepStrictEqual((await shown()).map(x => x.split("|")[1]), ["blues-changes.html", "blues-guitar.html", "blues-improv.html"]);
    for (const h of ["blues-changes", "blues-bass", "blues-guitar", "blues-piano", "blues-drums", "blues-melody", "blues-improv"]) assert.strictEqual((await (await fetch(B + "/lessons/" + h + ".html")).status), 200, h + " exists");
    console.log("TUNE AND IMPROVISING LESSONS OK" + (alone === 7 && sok ? "" : " (notation played by itself on " + alone + " of 7 pages" + (sok ? "" : ", the scale did not") + ": is the soundfont CDN reachable?)"));
  } catch (e) { console.error("FAIL", e.message, b.errors.slice(0, 5), b.failed.slice(0, 5)); process.exitCode = 1; }
  finally { await b.close(); }
})();
