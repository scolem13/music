// The tune's notation on the Backing Track page, in headless Chrome. Needs the test server (see tests/band/README.md); run from tests/band/lead.
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
const URL = "http://127.0.0.1:8500/tools/backing-track.html";
const SEC = `X:1\nT:Two parts\nM:4/4\nL:1/4\nQ:1/4=200\nK:C\nP:Verse\n"C"CDEF | "G"GFED |\n"C"CDEF | "G"G4 |\nP:Chorus\n"F"FGAB | "C"c4 | "G"BAGF | "C"E4 |]\nw:sing-ing la la-la loud and long\n`;
(async () => {
  const b = await launch({ width: 1280, height: 900 }); const $v = id => `document.getElementById(${JSON.stringify(id)})`;
  const waitFor = async (fn, ms, what) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error("timeout: " + what); await b.sleep(100); } };
  try {
    await b.goto(URL); await b.sleep(800);
    // the ABC the page holds, with notes in it
    await b.eval(`(function(){ var t = ${$v("bt-abc")}; t.value = ${JSON.stringify(SEC)}; t.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    await b.sleep(700);
    assert.strictEqual(await b.eval(`${$v("bt-tune")}.hidden`), true, "grid view first: the notation is hidden");
    await b.eval(`document.querySelector('[data-view="tune"]').click()`);
    await waitFor(() => b.eval(`!!document.querySelector('#bt-tune-cur svg')`), 8000, "notation drawn");
    assert.strictEqual(await b.eval(`${$v("bt-chart")}.hidden`), true, "Tune notation hides the grid");
    assert.strictEqual(await b.eval(`document.querySelector('[data-view="tune"]').getAttribute("aria-pressed")`), "true");
    const lit = await b.eval(`(function(){ var n = 0; document.querySelectorAll('#bt-tune-cur svg *').forEach(function(){ n++; }); return n; })()`); assert(lit > 20, "svg has content");
    await b.eval(`document.querySelector('[data-view="both"]').click()`);
    assert.strictEqual(await b.eval(`${$v("bt-chart")}.hidden || ${$v("bt-tune")}.hidden`), false, "Both shows both");
    // a section at a time, with the start of the next
    await b.eval(`(function(){ var s = ${$v("bt-tune-scope")}; s.value = "section"; s.dispatchEvent(new Event("change", { bubbles: true })); })()`);
    await waitFor(() => b.eval(`${$v("bt-tune-secl")}.hidden === false && !!document.querySelector('#bt-tune-nx svg')`), 8000, "section + next drawn");
    const verse = await b.eval(`document.querySelector('#bt-tune-cur').textContent`);
    assert.strictEqual(await b.eval(`${$v("bt-tune-nextl")}.textContent`), "Next: Chorus");
    assert(/sing/.test(await b.eval(`document.querySelector('#bt-tune-nx').textContent`)), "the words of the next section are shown under its notes");
    // the band plays: the live bar is lit, and the view turns to the next section
    await b.eval(`${$v("bt-play")}.click()`);
    await waitFor(() => b.eval(`document.querySelectorAll('#bt-tune-cur .bt-tl').length > 0`), 20000, "a bar lit in the notation");
    await waitFor(() => b.eval(`${$v("bt-tune-sec")}.value === "1"`), 30000, "turned to the Chorus");
    await b.eval(`${$v("bt-play")}.click()`); await b.sleep(300);
    console.log("TUNE VIEW OK (lit bar, section turn)");
    // a tune from the collection: the picker, then the notes go to the band
    await b.eval(`${$v("bt-tune-load")}.click()`);
    await waitFor(() => b.eval(`document.querySelectorAll('#bt-tunepick .tl-row, #bt-tunepick li, #bt-tunepick .tl-item').length > 0`), 30000, "picker filled");
    console.log("picker rows:", await b.eval(`document.querySelectorAll('#bt-tunepick .tl-row, #bt-tunepick li, #bt-tunepick .tl-item').length`));
    await b.eval(`(document.querySelector('#bt-tunepick .tl-row, #bt-tunepick li, #bt-tunepick .tl-item')).click()`);
    await waitFor(() => b.eval(`window.__melCount = 0, true`), 1000, "");
    await b.sleep(1500);
    const info = await b.eval(`JSON.stringify({ title: ${$v("bt-tune-title")}.textContent, mel: ${$v("bt-mel-score")}.getAttribute("data-abc") ? 1 : 0, svg: !!document.querySelector('#bt-tune-cur svg'), note: ${$v("bt-tune-note")}.textContent })`);
    console.log(info); assert(JSON.parse(info).mel === 1 && JSON.parse(info).svg, "melody attached and notation drawn");
    const bad = b.errors.filter(e => !/supabase|createClient|favicon/.test(e)); assert.strictEqual(bad.length, 0, bad.join("\n"));
    console.log("TUNE UI OK");
  } catch (e) { console.log("FAIL", e.message); console.log(b.errors.slice(0, 5)); process.exitCode = 1; } finally { await b.close(); }
})();
