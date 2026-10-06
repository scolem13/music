// End-to-end check of the Backing Track page in headless Chrome (real page, real samples).
const { launch } = require("./cdp.js");
const assert = require("assert");
const URL = "http://127.0.0.1:8500/tools/backing-track.html";
const KNOWN = /supabaseUrl|favicon/;          // pre-existing site noise: unconfigured Supabase demo keys
(async () => {
  const b = await launch({ width: 1280, height: 900 });
  const $v = id => `document.getElementById(${JSON.stringify(id)})`;
  const set = (id, v, ev = "change") => b.eval(`(function(){ var e = ${$v(id)}; e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event(${JSON.stringify(ev)}, { bubbles:true })); })()`);
  const chords = () => b.eval(`Array.from(document.querySelectorAll('#bt-chart .tc-bar[data-bar]')).map(function(c){ return Array.from(c.querySelectorAll('.tc-chord')).map(function(x){ return x.textContent; }).join(' '); }).join(' | ')`);
  const state = () => b.eval(`${$v("bt-play")}.getAttribute('data-state')`);
  const status = () => b.eval(`${$v("bt-status")}.textContent`);
  const waitFor = async (fn, ms, what) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error("timeout: " + what); await b.sleep(50); } };
  try {
    await b.goto(URL); await b.sleep(800);
    assert.strictEqual(await b.eval("document.querySelectorAll('#bt-chart .tc-bar[data-bar]').length"), 12, "12 bars drawn");
    assert.strictEqual(await state(), "idle");
    console.log("basic F :", await chords());

    await set("bt-key", "Bb"); console.log("basic Bb:", await chords());
    assert(/K:Bb/.test(await b.eval(`${$v("bt-abc")}.value`)), "ABC box follows the key");
    await set("bt-changes", "jazz"); console.log("jazz  Bb:", await chords());
    assert.strictEqual(await b.eval(`${$v("bt-key")}.value`), "Bb", "preset keeps the chosen key");
    await set("bt-key", "F");

    // play: loading -> playing, bar highlight + status + beat dots follow the audio clock
    const t0 = Date.now();
    await b.eval(`${$v("bt-play")}.click()`);
    await waitFor(async () => (await state()) === "playing", 30000, "state playing");
    console.log("load + start took", Date.now() - t0, "ms");
    await waitFor(async () => /Count-in|Chorus/.test(await status()), 5000, "status text");
    const seen = new Set(), lives = new Set(), beats = new Set();
    const tEnd = Date.now() + 7000;
    while (Date.now() < tEnd) { seen.add(await status());
      lives.add(await b.eval(`(function(){ var e = document.querySelector('#bt-chart .tc-bar.tc-live'); return e ? e.getAttribute('data-bar') : 'none'; })()`));
      beats.add(await b.eval(`Array.from(document.querySelectorAll('#bt-beats i')).findIndex(function(e){ return e.classList.contains('on'); })`));
      await b.sleep(40); }
    console.log("status seen:", [...seen].join(" / ")); console.log("live bars:", [...lives].join(","), " beats lit:", [...beats].sort().join(","));
    assert(lives.has("0") && lives.has("1") && lives.has("2"), "chart highlight advances through the bars");
    assert([0, 1, 2, 3].every(n => beats.has(n)), "all four beat dots light");
    assert([...seen].some(s => /Chorus 1 · bar 2/.test(s)), "status counts bars");

    // live changes while playing must not throw or stop the band
    await set("bt-tempo", 200, "input"); await set("bt-bass", "two"); await set("bt-voicing", "guide");
    await set("bt-vol-drums", 60, "input"); await set("bt-key", "Eb"); await set("bt-changes", "basic");
    await b.eval(`(function(){ var e = ${$v("bt-abc")}; e.value = e.value.replace('"Eb7"z4', '"Eb13"z4'); e.dispatchEvent(new Event('input', { bubbles:true })); })()`);
    await b.sleep(1500);
    for (const [comp, voic] of [["guitar", "shell3"], ["guitar", "drop2"], ["guitar", "drop3"], ["guitar", "triad3"], ["piano", "drop2"], ["piano", "drop3"]]) {
      await set("bt-comp", comp); await set("bt-voicing", voic); await b.sleep(1800);
      assert.strictEqual(await b.eval(`${$v("bt-voicing")}.value`), voic, comp + " offers " + voic);
      assert.strictEqual(await state(), "playing", "playing in " + comp + "/" + voic);
    }
    console.log("guitar label:", await b.eval(`(${$v("bt-comp")}.value='guitar', ${$v("bt-comp")}.dispatchEvent(new Event('change')), ${$v("bt-vol-comp-label")}.textContent)`));
    await set("bt-comp", "piano");
    assert.strictEqual(await state(), "playing", "still playing after live changes");
    assert.strictEqual(await b.eval(`${$v("bt-changes")}.value`), "custom", "editing the ABC marks the changes Custom");
    console.log("after edits:", await chords());
    await b.eval(`${$v("bt-play")}.click()`); await b.sleep(300);
    assert.strictEqual(await state(), "idle", "stop -> idle");
    assert.strictEqual(await b.eval("document.querySelectorAll('#bt-chart .tc-live').length"), 0, "highlight cleared on stop");
    assert.strictEqual(await status(), "");

    // finite form: 1 chorus at 300 bpm plays through the ending and returns to idle on its own
    await set("bt-changes", "jazz"); await set("bt-tempo", 300, "input"); await set("bt-choruses", 1); await set("bt-countin", 0); await set("bt-bass", "walk"); await set("bt-voicing", "rootless");
    await b.eval(`${$v("bt-play")}.click()`);
    await waitFor(async () => (await state()) === "playing", 15000, "second start");
    const t1 = Date.now();
    await waitFor(async () => (await state()) === "idle", 25000, "finite run ends");
    console.log("1 chorus at 300 bpm ended after", ((Date.now() - t1) / 1000).toFixed(1), "s (12 bars = 9.6 s + ending)");

    // restart works, bad ABC is rejected without breaking the chart
    await b.eval(`(function(){ var e = ${$v("bt-abc")}; e.value = 'X:1\\nK:C\\nz4 | z4 |]'; e.dispatchEvent(new Event('input', { bubbles:true })); })()`); await b.sleep(500);
    assert(/No chord symbols/.test(await b.eval(`${$v("bt-abc-note")}.textContent`)), "empty changes explained");
    assert.strictEqual(await b.eval("document.querySelectorAll('#bt-chart .tc-bar[data-bar]').length"), 12, "chart kept");

    await b.shot("page-desktop.png");
    await b.resize(390, 800); await b.sleep(300);
    assert(await b.eval("document.documentElement.scrollWidth <= window.innerWidth"), "no horizontal scroll at phone width");
    await b.shot("page-mobile.png");
    const errs = b.errors.filter(e => !KNOWN.test(e)), failed = b.failed.filter(f => /^\d{3} /.test(f) && !KNOWN.test(f));
    console.log("console errors:", JSON.stringify(errs)); console.log("failed requests:", JSON.stringify(failed));
    assert.strictEqual(errs.length, 0, "no console errors");
    console.log("PAGE OK");
  } finally { await b.close(); }
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
