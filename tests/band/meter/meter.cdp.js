// Real page: the Meter menu (3/4, 6/8, 12/8) plays, notates and exports; guitar voice-led triads
// play in the band and follow each other on the Chord Sheet. Needs the server on 8500 (see README).
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1100 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(6000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const v = id => ev(`document.getElementById("${id}").value`);
  const set = (id, val) => ev(`(function(){ var e = document.getElementById("${id}"); e.value = "${val}"; e.dispatchEvent(new Event("change", { bubbles:true })); })()`);
  const waitFor = async (expr, ms, what) => { const t = Date.now(); for (;;) { try { if (await ev(expr)) return; } catch (e) {} if (Date.now() - t > ms) throw new Error("timeout " + what); await b.sleep(100); } };
  try {
    await b.goto(B + "/tools/backing-track.html"); await b.sleep(1000);
    assert.strictEqual(await v("bt-meter"), "4/4");
    const WANT = { "3/4": { dots: 3, tempo: "132", unit: /bpm/, feelOff: false, sig: "M:3/4", ts: [3, 2] },
                   "6/8": { dots: 2, tempo: "72", unit: /dotted/, feelOff: true, sig: "M:6/8", ts: [6, 3] },
                   "12/8": { dots: 4, tempo: "60", unit: /dotted/, feelOff: true, sig: "M:12/8", ts: [12, 3] } };
    await set("bt-changes", "jazz"); await set("bt-countin", "1");
    for (const id of Object.keys(WANT)){ const w = WANT[id];
      await set("bt-meter", id); await b.sleep(300);
      const info = JSON.parse(await ev(`JSON.stringify({ dots: document.querySelectorAll("#bt-beats i").length, tempo: document.getElementById("bt-tempo-n").value,
        unit: document.getElementById("bt-tempo-unit").textContent, feelOff: document.getElementById("bt-feel").disabled, abc: document.getElementById("bt-abc").value,
        bars: document.querySelectorAll('#bt-chart .tc-bar[data-bar]').length })`));
      console.log(id, JSON.stringify({ dots: info.dots, tempo: info.tempo, unit: info.unit, feelOff: info.feelOff, bars: info.bars }));
      assert.strictEqual(info.dots, w.dots); assert.strictEqual(info.tempo, w.tempo); assert(w.unit.test(info.unit)); assert.strictEqual(info.feelOff, w.feelOff);
      assert(info.abc.includes(w.sig)); assert.strictEqual(info.bars, 12);
      // play fast through a chorus, then look at the notation and the MIDI file
      await set("bt-tempo-n", "260");
      await ev(`document.getElementById("bt-notation").open = true; document.getElementById("bt-nt-drums").checked = true; document.getElementById("bt-nt-drums").dispatchEvent(new Event("change", { bubbles:true })); document.getElementById("bt-play").click()`);
      await waitFor(`/Chorus 2/.test(document.getElementById("bt-status").textContent)`, 40000, id + " a chorus played");
      const dotsOn = await ev(`document.querySelectorAll("#bt-beats i.on").length`); assert(dotsOn <= 1);
      await ev(`document.getElementById("bt-play").click()`); await b.sleep(400);
      await ev(`document.getElementById("bt-nt-refresh").click()`); await b.sleep(900);
      const svg = await ev(`document.querySelectorAll("#bt-score svg").length`), warn = await ev(`(document.querySelector("#bt-score .abcjs-warning, #bt-score .error") || {}).textContent || ""`);
      console.log("  notation svgs:", svg, "| warnings:", JSON.stringify(warn)); assert(svg >= 1, id + " notation drawn");
      await b.shot("notation-" + id.replace("/", "-") + ".png");
      await ev(`document.getElementById("bt-export").open = true; (Array.from(document.querySelectorAll("#bt-export button")).filter(function(x){ return /midi|export|download/i.test(x.textContent); })[0] || {}).click && Array.from(document.querySelectorAll("#bt-export button")).filter(function(x){ return /midi|export|download/i.test(x.textContent); })[0].click()`);
      await b.sleep(300);
      const ts = JSON.parse(await ev(`(function(){ var u = window.__btLastMidi; if (!u) return "null"; for (var i = 0; i < u.length - 4; i++) if (u[i] === 0xff && u[i+1] === 0x58) return JSON.stringify([u[i+3], u[i+4]]); return "null"; })()`));
      console.log("  MIDI time signature:", JSON.stringify(ts)); assert.deepStrictEqual(ts, w.ts);
    }
    // the feel menu comes back with a simple meter; custom changes keep their own meter
    await set("bt-meter", "4/4"); assert.strictEqual(await ev(`document.getElementById("bt-feel").disabled`), false); assert.strictEqual(await v("bt-tempo-n"), "120");
    await ev(`(function(){ var t = document.getElementById("bt-abc"); t.value = 'X:1\\nT:Five\\nM:5/4\\nL:1/4\\nK:C\\n"Cm7"z5 | "F7"z5 |]'; t.dispatchEvent(new Event("input", { bubbles:true })); })()`); await b.sleep(700);
    assert.strictEqual(await v("bt-meter"), "5/4"); assert.strictEqual(await ev(`document.querySelectorAll("#bt-beats i").length`), 5);
    await set("bt-meter", "3/4"); assert.strictEqual(await v("bt-meter"), "5/4", "custom changes keep their meter");
    // guitar, voice-led triads
    await set("bt-changes", "jazz"); await set("bt-meter", "4/4"); await set("bt-comp", "guitar");
    const styles = await ev(`Array.from(document.getElementById("bt-voicing").options).map(function(o){ return o.value; }).join(",")`); console.log("guitar voicings:", styles);
    assert(/triadvl/.test(styles) && /uppervl/.test(styles));
    for (const st of ["triadvl", "uppervl"]){ await set("bt-voicing", st); await set("bt-tempo-n", "260"); await ev(`document.getElementById("bt-play").click()`);
      await waitFor(`/bar 6/.test(document.getElementById("bt-status").textContent)`, 20000, st + " plays"); await ev(`document.getElementById("bt-play").click()`); await b.sleep(300); }
    let errs = b.errors.filter(e => !/supabaseUrl/.test(e)); console.log("backing track errors:", JSON.stringify(errs)); assert.strictEqual(errs.length, 0);

    // Chord Sheet: voice-led triads on strings 4-3-2; picking a shape moves the chords after it
    await b.goto(B + "/tools/chord-sheet.html"); await b.sleep(1200);
    await ev(`(function(){ var t = document.getElementById("chords-textarea"); t.value = "Dm7 G7 Cmaj7 A7 Dm7 G7 C6"; t.dispatchEvent(new Event("blur")); })()`); await b.sleep(600);
    await ev(`(function(){ document.querySelectorAll("[data-inst-id]").forEach(function(c){ var want = c.dataset.instId === "guitar"; if (c.checked !== want){ c.checked = want; c.dispatchEvent(new Event("change", { bubbles:true })); } }); })()`); await b.sleep(500);
    const opts = await ev(`(function(){ var cb = document.querySelector('[data-inst-id="guitar"]'), row = cb.closest(".inst-row"), sels = row.querySelectorAll("select"), s = sels[sels.length - 1]; window.__sty = s;
      return Array.from(s.options).map(function(o){ return o.value; }).filter(function(x){ return x.indexOf("vl:") === 0; }).join(","); })()`);
    console.log("sheet voice-led options:", opts); assert(/vl:triadvl:1/.test(opts) && /vl:uppervl:3/.test(opts));
    const shapes = () => ev(`Array.from(document.querySelectorAll(".diagram-card .voicing-sel")).map(function(s){ return s.options[s.selectedIndex].textContent; }).join(" | ")`);
    for (const st of ["vl:triadvl:1", "vl:uppervl:1"]){
      await ev(`window.__sty.value = "${st}"; window.__sty.dispatchEvent(new Event("change", { bubbles:true }))`); await b.sleep(900);
      const a = await shapes(); console.log(st, "->", a); assert.strictEqual(a.split(" | ").length, 7);
      const frets = a.split(" | ").map(x => +/fret (\d+)/.exec(x)[1]); assert(Math.max(...frets) - Math.min(...frets) <= 7, "shapes stay close: " + frets);
      await ev(`(function(){ var s = document.querySelector(".diagram-card .voicing-sel"); s.value = String(s.options.length - 1); s.dispatchEvent(new Event("change", { bubbles:true })); })()`); await b.sleep(900);
      const c = await shapes(); console.log("   after moving the first chord up:", c); assert.notStrictEqual(c, a);
      const f2 = c.split(" | ").map(x => +/fret (\d+)/.exec(x)[1]); assert(f2[1] > frets[1], "the second chord followed the first up the neck");
      await b.shot("sheet-" + st.replace(/:/g, "-") + ".png");
    }
    errs = b.errors.filter(e => !/supabaseUrl/.test(e)); console.log("chord sheet errors:", JSON.stringify(errs)); assert.strictEqual(errs.length, 0);
    console.log("METER + TRIAD PAGES OK");
  } finally { await b.close(); } })().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
