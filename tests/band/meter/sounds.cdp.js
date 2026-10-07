// Real page: Watermelon Man preset, stop time on bar 14, electric piano / bass, second ride, drum kit
// faders, and notation switched on when the voicings go over to the Chord Sheet. Server on 8500.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1100 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(6000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const v = id => ev(`document.getElementById("${id}").value`);
  const set = (id, val, type) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${val}"; e.dispatchEvent(new Event("${type || "change"}", { bubbles:true })); })()`);
  const waitFor = async (expr, ms, what) => { const t = Date.now(); for (;;) { try { if (await ev(expr)) return; } catch (e) {} if (Date.now() - t > ms) throw new Error("timeout " + what); await b.sleep(100); } };
  const status = re => `/${re}/.test(document.getElementById("bt-status").textContent)`;
  try {
    await b.goto(B + "/tools/backing-track.html"); await b.sleep(1000);
    // log every note the sample bank is asked for
    await ev(`(function(){ var mk = BandSounds.create; window.__plays = []; window.__chokes = [];
      BandSounds.create = function(ctx){ var bank = mk(ctx), play = bank.play, choke = bank.choke;
        bank.play = function(inst, spec, when, dest){ window.__plays.push({ inst: inst, piece: spec.piece, gain: spec.gain, when: when, dur: spec.dur }); return play.apply(bank, arguments); };
        bank.choke = function(g, when){ window.__chokes.push({ g: g, when: when }); return choke.apply(bank, arguments); };
        return bank; }; })()`);
    await set("bt-changes", "watermelon"); await b.sleep(300);
    const st = JSON.parse(await ev(`JSON.stringify({ bars: document.querySelectorAll('#bt-chart .tc-bar[data-bar]').length, feel: document.getElementById("bt-feel").value,
      bass: document.getElementById("bt-bass").value, rhythm: document.getElementById("bt-rhythm").value, stops: document.getElementById("bt-stops").value, tempo: document.getElementById("bt-tempo-n").value,
      marked: Array.from(document.querySelectorAll('#bt-chart .tc-bar[data-bar]')).map(function(c, i){ return c.classList.contains("bt-stop") ? i + 1 : 0; }).filter(Boolean),
      chart: Array.from(document.querySelectorAll('#bt-chart .tc-bar[data-bar]')).map(function(c){ return c.textContent.trim(); }).join("|") })`));
    console.log("watermelon:", JSON.stringify(st));
    assert.deepStrictEqual([st.bars, st.feel, st.bass, st.rhythm, st.stops, st.tempo], [16, "straight", "riff", "stabs", "14", "132"]); assert.deepStrictEqual(st.marked, [14]);
    assert(/^F7\|F7\|F7\|F7\|B♭7\|B♭7\|F7\|F7\|C7\|B♭7\|C7\|B♭7\|C7\|B♭7\|F7\|F7$/.test(st.chart.replace(/\s/g, "")), st.chart);
    // electric piano + electric bass, second ride, ride fader down, then play a chorus
    await set("bt-comp", "epiano"); await set("bt-bass-sound", "electric"); await set("bt-ride", "ride"); await set("bt-ride-sound", "ride2");
    assert.strictEqual(await ev(`document.getElementById("bt-vol-comp-label").textContent`), "Electric piano volume");
    assert(/rootless/.test(await ev(`Array.from(document.getElementById("bt-voicing").options).map(function(o){ return o.value; }).join(",")`)), "electric piano offers the piano voicings");
    await ev(`document.getElementById("bt-kit").open = true`); await set("bt-kit-kick", "50", "input"); await set("bt-kit-crash", "0", "input");
    await set("bt-countin", "0"); await set("bt-tempo-n", "240");
    await ev(`document.getElementById("bt-play").click()`);
    await waitFor(status("Chorus 2 · bar 3"), 60000, "a chorus and a bit");
    await ev(`document.getElementById("bt-play").click()`); await b.sleep(300);
    const res = await ev(`performance.getEntriesByType("resource").map(function(r){ return r.name; }).filter(function(n){ return /-mp3\\//.test(n); }).map(function(n){ return n.split("/").slice(-2)[0]; }).filter(function(x, i, a){ return a.indexOf(x) === i; }).join(",")`);
    console.log("sample sets fetched:", res);
    assert(/electric_piano_1/.test(res) && /electric_bass_finger/.test(res) && /percussion/.test(res), "electric sounds loaded"); assert(!/guitar/.test(res), "guitar not loaded when unused");
    const plays = JSON.parse(await ev(`JSON.stringify(window.__plays)`)), chokes = JSON.parse(await ev(`JSON.stringify(window.__chokes)`));
    const by = {}; plays.forEach(p => { const k = p.inst + (p.piece ? ":" + p.piece : ""); by[k] = (by[k] || 0) + 1; }); console.log("plays:", JSON.stringify(by));
    assert(by.epiano > 10 && by.ebass > 20 && !by.piano && !by.bass, "electric instruments are the ones playing");
    assert(by["kit:ride2"] > 20 && !by["kit:ride"], "second ride in use");
    plays.filter(p => p.piece === "kick").forEach(p => assert(Math.abs(p.gain - 0.25) < 1e-9, "kick fader 50% -> gain " + p.gain));
    plays.filter(p => p.piece === "crash").forEach(p => assert.strictEqual(p.gain, 0)); plays.filter(p => p.piece === "snare").forEach(p => assert.strictEqual(p.gain, 1));
    // the stop: after the hit, nothing at all on beat 2, then only the bass until the barline
    assert.strictEqual(chokes.length, 1, "one stop in one chorus: " + chokes.length); assert.strictEqual(chokes[0].g, "cymbals");
    const spb = 60 / 240, t0 = chokes[0].when - 0.3 * spb, rel = plays.map(p => ({ ...p, beat: (p.when - t0) / spb })).filter(p => p.beat > -0.2 && p.beat < 4.2);
    console.log("stop bar:", rel.map(p => p.beat.toFixed(2) + " " + p.inst + (p.piece ? ":" + p.piece : "")).join(", "));
    const hit = rel.filter(p => p.beat < 0.2), b2 = rel.filter(p => p.beat >= 0.6 && p.beat < 1.9), lead = rel.filter(p => p.beat >= 1.9 && p.beat < 3.9), back = rel.filter(p => p.beat >= 3.9);
    assert(hit.some(p => p.piece === "kick") && hit.some(p => p.inst === "epiano") && hit.some(p => p.inst === "ebass"), "everyone hits beat 1");
    hit.filter(p => p.dur != null).forEach(p => assert(p.dur < 0.8 * spb, "beat-1 notes are short"));
    assert.strictEqual(b2.length, 0, "silence on beat 2"); assert(lead.length >= 2 && lead.every(p => p.inst === "ebass"), "only the bass leads in");
    assert(back.some(p => p.piece === "crash") && back.some(p => p.inst === "epiano"), "the band comes back in");
    await b.shot("watermelon.png");
    // over to the Chord Sheet: every voicing is drawn AND written on a staff
    for (const comp of ["epiano", "guitar"]){
      if (comp === "guitar"){ await b.goto(B + "/tools/backing-track.html"); await b.sleep(900); await set("bt-comp", "guitar"); await set("bt-countin", "0"); await set("bt-tempo-n", "260");
        await ev(`document.getElementById("bt-play").click()`); await waitFor(status("bar 9"), 30000, "guitar plays"); await ev(`document.getElementById("bt-play").click()`); await b.sleep(300); }
      await ev(`window.open = function(u){ setTimeout(function(){ location.href = u; }, 50); return window; }; Array.from(document.querySelectorAll("#bt-root button")).filter(function(x){ return /Chord Sheet/.test(x.textContent); })[0].click()`);
      await waitFor(`location.pathname.indexOf("chord-sheet") >= 0 && document.readyState === "complete"`, 15000, "arrive at chord sheet");
      await waitFor(`document.querySelectorAll(".diagram-card .notation-wrap svg").length > 0`, 15000, "notation drawn");
      await b.sleep(800);
      const cs = JSON.parse(await ev(`JSON.stringify({ on: document.getElementById("chk-notation").checked, cards: document.querySelectorAll(".diagram-card").length,
        staves: document.querySelectorAll(".diagram-card .notation-wrap svg").length, diagrams: Array.from(document.querySelectorAll(".diagram-card")).filter(function(c){ return c.querySelector("svg"); }).length,
        chords: document.getElementById("chords-textarea").value })`));
      console.log(comp, "-> chord sheet:", JSON.stringify(cs));
      assert(cs.on && cs.cards >= 3 && cs.staves === cs.cards && cs.diagrams === cs.cards, "a staff under every diagram");
      await b.shot("asplayed-" + comp + ".png");
    }
    const errs = b.errors.filter(e => !/supabaseUrl|createClient/.test(e)); console.log("errors:", JSON.stringify(errs)); assert.strictEqual(errs.length, 0);
    console.log("SOUNDS + STOP PAGES OK");
  } finally { await b.close(); } })().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
