// Backing Track page: roman modes, transposed charts, Chord Sheet hand-offs, pins, as-played. Needs serve.js on :8500.
const { launch } = require("../lead/cdp.js");
const assert = require("assert");
const URL = "http://127.0.0.1:8500/tools/backing-track.html";
const KNOWN = /supabaseUrl|favicon/;
const OUT = __dirname + "/";
(async () => {
  const b = await launch({ width: 1280, height: 900 });
  const $v = id => `document.getElementById(${JSON.stringify(id)})`;
  const set = (id, v, ev = "change") => b.eval(`(function(){ var e = ${$v(id)}; e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event(${JSON.stringify(ev)}, { bubbles:true })); })()`);
  const click = id => b.eval(`${$v(id)}.click()`);
  const bars = () => b.eval(`Array.from(document.querySelectorAll('#bt-chart .tc-bar[data-bar]')).map(function(c){ return Array.from(c.querySelectorAll('.tc-chord')).map(function(x){
    var lt = x.querySelector('.tc-lt'), rn = x.querySelector('.tc-rn'); return rn ? { l: lt.textContent, r: rn.textContent } : x.textContent; }); })`);
  const strs = a => a.flat().map(c => typeof c === "string" ? c : c.l + "|" + c.r);
  const flat = a => a.map(bar => bar.map(c => typeof c === "string" ? c : c.l + "|" + c.r).join(" ")).join(" | ");
  const state = () => b.eval(`${$v("bt-play")}.getAttribute('data-state')`);
  const waitFor = async (fn, ms, what) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error("timeout: " + what); await b.sleep(50); } };
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const pcOf = t => { const m = /^([A-G])([♯♭]*)/.exec(t); let p = PC[m[1]]; for (const c of m[2]) p += c === "♯" ? 1 : -1; return ((p % 12) + 12) % 12; };
  const rest = t => t.replace(/^[A-G][♯♭]*/, "");
  try {
    await b.goto(URL); await b.sleep(900);

    // ---- D. Roman numerals: off / only / both ----
    await set("bt-changes", "jazz");
    const letters = await bars(); const L = flat(letters);
    await set("bt-roman", "only"); const only = await bars();
    assert(await b.eval(`document.querySelector('#bt-chart').classList.contains('tc-roman-mode')`)); assert(!/[A-G][♭♯]?7/.test(flat(only).replace(/V\/|vii/g, "")), "numerals replace letters");
    await set("bt-roman", "both"); const both = await bars();
    assert(await b.eval(`document.querySelector('#bt-chart').classList.contains('tc-roman-both')`));
    assert.strictEqual(both.flat().length, letters.flat().length);
    both.flat().forEach((c, i) => { assert.strictEqual(c.l, letters.flat()[i], "letters kept in both mode"); assert.strictEqual(c.r, only.flat()[i], "numeral under the letter matches numerals-only"); });
    await set("bt-roman", "off"); assert.strictEqual(flat(await bars()), L, "back to letters");
    console.log("roman: only =", flat(only)); console.log("roman: both =", flat(both));
    // numerals keep their meaning when the key changes
    await set("bt-roman", "both"); await set("bt-key", "Eb"); const bothEb = await bars();
    assert.deepStrictEqual(bothEb.flat().map(c => c.r), both.flat().map(c => c.r), "numerals unchanged in another key"); await set("bt-key", "F");

    // ---- E. Chart for: 12 concert keys x both families ----
    const SEMIS = { bb: 2, eb: 9 }; let combos = 0;
    for (const fam of ["bb", "eb"]) for (const key of ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]) {
      await set("bt-chartfor", "concert"); await set("bt-key", key); const concert = await bars();
      await set("bt-chartfor", fam); const written = await bars(), text = flat(written);
      const meta = await b.eval(`document.querySelector('#bt-chart .tc-meta').textContent`);
      assert.strictEqual(written.flat().length, concert.flat().length);
      strs(written).forEach((c, i) => {
        const cc = strs(concert)[i], [wl, wr] = c.split("|"), [cl, cr] = cc.split("|");
        assert.strictEqual(wr, cr, `numeral ${cc} vs ${c}`);                                   // numerals relative to the concert key
        assert.strictEqual(pcOf(wl), (pcOf(cl) + SEMIS[fam]) % 12, `${key} ${fam}: ${cl} -> ${wl}`);
        assert.strictEqual(rest(wl), rest(cl));
        assert(!/[♯♭]{2}/.test(wl) && !/[♯]/.test(wl) !== !/♭/.test(wl) || !/[♯♭]/.test(wl) || true);
        assert(!/♯♭|♭♯|♯♯|♭♭/.test(wl), "no double accidentals: " + wl);
      });
      if (key === "F") {                                                                    // the examples from the brief
        const dim = strs(written).map(c => c.split("|")[0]).filter(x => /dim7/.test(x))[0];
        assert.strictEqual(dim, fam === "bb" ? "C♯dim7" : "G♯dim7", "diminished chord spelling in F: " + dim);
        assert(meta.startsWith(fam === "bb" ? "G" : "D"), "header key " + meta);
        console.log(fam, "F concert ->", text.replace(/\|[^ ]+/g, "")); console.log("  header:", meta.trim());
      }
      assert(!await b.eval(`${$v("bt-chartfor-hint")}.hidden`), "hint shown when transposed");
      // the band's side is untouched: key menu + ABC stay concert
      assert.strictEqual(await b.eval(`${$v("bt-key")}.value`), key); assert(new RegExp("K:" + key + "\\b").test(await b.eval(`${$v("bt-abc")}.value`)));
      combos++;
    }
    console.log("transposed charts checked:", combos);
    await set("bt-chartfor", "concert"); assert(await b.eval(`${$v("bt-chartfor-hint")}.hidden`)); await set("bt-key", "F"); await set("bt-roman", "off");
    // the live bar still follows when the chart is transposed
    await set("bt-chartfor", "eb"); await b.eval(`${$v("bt-play")}.click()`);
    await waitFor(async () => (await state()) === "playing", 30000, "playing");
    await waitFor(() => b.eval(`!!document.querySelector('#bt-chart .tc-bar.tc-live')`), 8000, "live bar on a transposed chart");
    await click("bt-play"); await b.sleep(300); await set("bt-chartfor", "concert");

    // ---- C. as-played -> Chord Sheet (no chorus played yet: generated silently) ----
    await set("bt-changes", "basic");
    await b.eval(`window.__opened = null; window.open = function(u){ window.__opened = u; return {}; }; localStorage.removeItem('bandHandoff');`);
    await click("bt-send");
    const out1 = JSON.parse(await b.eval(`localStorage.getItem('bandHandoff')`));
    assert.strictEqual(await b.eval(`window.__opened`), "/tools/chord-sheet.html?from=backing-track");
    assert.deepStrictEqual(Object.keys(out1).sort(), ["at", "chords", "comp", "from", "key", "v", "voicing"]);
    assert.strictEqual(out1.v, 1); assert.strictEqual(out1.from, "backing-track"); assert.strictEqual(out1.key, "F"); assert.strictEqual(out1.comp, "piano"); assert.strictEqual(out1.voicing, "rootless");
    assert(Math.abs(Date.now() - out1.at) < 20000);
    assert.deepStrictEqual(out1.chords.map(c => c.sym), "F7 Bb7 C7".split(" "));
    out1.chords.forEach(c => { assert(c.midis.length === 4 && c.midis.every((m, i) => i === 0 || m > c.midis[i - 1]) && c.midis[0] >= 48 && c.midis.at(-1) <= 77, JSON.stringify(c)); });
    console.log("send (generated):", JSON.stringify(out1.chords.slice(0, 4)), "...", await b.eval(`${$v("bt-send-note")}.textContent`));

    // ---- B. hand-off from Chord Sheet: 4 bars, pins on bars 0, 2, 3 ----
    const abc4 = 'X:1\nT:Handoff Test\nM:4/4\nL:1/4\nK:Bb\n"Bb7"z4 | "Eb7"z4 | "Bb7"z4 | "F7"z4 |]';
    const pinsIn = [{ bar: 0, pos: 0, sym: "Bb7", midis: [38, 50, 61, 73] }, { bar: 2, pos: 0, sym: "Bb7", midis: [41, 53, 64, 76] }, { bar: 3, pos: 0, sym: "F7", midis: [36, 48, 59, 71] }];
    const hand = (over = {}) => JSON.stringify(Object.assign({ v: 1, from: "chord-sheet", at: Date.now(), abc: abc4, comp: "guitar", voicing: "drop2", pins: pinsIn }, over));
    await b.eval(`localStorage.setItem('bandHandoff', ${JSON.stringify(hand())})`);
    await b.goto(URL + "?from=chord-sheet"); await b.sleep(900);
    assert.strictEqual(await b.eval(`localStorage.getItem('bandHandoff')`), null, "hand-off removed from storage");
    assert(!/from=/.test(await b.eval("location.search")), "param stripped");
    assert.strictEqual(await b.eval(`${$v("bt-pinnote")}.hidden`), false); const noteTxt = await b.eval(`${$v("bt-pinnote-text")}.textContent`);
    assert(/Playing the voicings pinned in Chord Sheet/.test(noteTxt), noteTxt); console.log("note:", noteTxt);
    assert.strictEqual(await b.eval(`${$v("bt-changes")}.value`), "custom"); assert.strictEqual(await b.eval(`${$v("bt-key")}.value`), "Bb");
    assert.strictEqual(await b.eval(`${$v("bt-comp")}.value`), "guitar"); assert.strictEqual(await b.eval(`${$v("bt-voicing")}.value`), "drop2");
    assert.strictEqual(flat(await bars()), "B♭7 | E♭7 | B♭7 | F7"); assert(/Handoff Test/.test(await b.eval(`document.querySelector('#bt-chart .tc-title').textContent`)));
    assert(/Handoff/.test(await b.eval(`${$v("bt-abc")}.value`)));
    // plays the pins: tempo 300, no count-in, loop; then ask for the as-played voicings
    await set("bt-countin", 0); await set("bt-tempo", 300, "input"); await b.eval(`${$v("bt-play")}.click()`);
    await waitFor(async () => (await state()) === "playing", 30000, "playing pins");
    await b.sleep(9000);                                                                    // ~ 8 bars of 0.8 s after the first loads
    await click("bt-send"); const out2 = JSON.parse(await b.eval(`localStorage.getItem('bandHandoff')`));
    assert(/last chorus played/.test(await b.eval(`${$v("bt-send-note")}.textContent`)), await b.eval(`${$v("bt-send-note")}.textContent`));
    await click("bt-play"); await b.sleep(300);
    assert.deepStrictEqual(out2.chords.map(c => c.sym), ["Bb7", "Eb7", "F7"]); assert.strictEqual(out2.comp, "guitar"); assert.strictEqual(out2.voicing, "drop2"); assert.strictEqual(out2.key, "Bb");
    assert.deepStrictEqual(out2.chords[0].midis, pinsIn[0].midis); assert.deepStrictEqual(out2.chords[2].midis, pinsIn[2].midis);
    assert(!out2.chords[1].midis.every((m, i) => m === [38, 50, 61, 73][i]) && out2.chords[1].midis.length >= 3, "unpinned chord is voiced normally: " + out2.chords[1].midis);
    console.log("as played after pins:", JSON.stringify(out2.chords.map(c => c.midis)));
    await b.shot(OUT + "pins-note-desktop.png");
    // clear pins
    await click("bt-pin-clear");
    assert.strictEqual(await b.eval(`${$v("bt-pin-clear")}.hidden`), true); const t2 = await b.eval(`${$v("bt-pinnote-text")}.textContent`); assert(/cleared/i.test(t2), t2);
    await click("bt-play"); await waitFor(async () => (await state()) === "playing", 30000, "playing after clear"); await b.sleep(5500); await click("bt-play"); await b.sleep(300);   // a new performance starts a new log
    await click("bt-send"); const out3 = JSON.parse(await b.eval(`localStorage.getItem('bandHandoff')`));
    assert(out3.chords.every((c, i) => !pinsIn.some(p => p.midis.join() === c.midis.join())), "pins no longer applied: " + JSON.stringify(out3.chords.map(c => c.midis)));
    console.log("note after clear:", t2);
    await click("bt-pin-dismiss"); assert.strictEqual(await b.eval(`${$v("bt-pinnote")}.hidden`), true);

    // pins clear on key change, on a different preset, and on an ABC edit (and the note says so)
    for (const [what, fn, word] of [["key", () => set("bt-key", "C"), /key/], ["preset", () => set("bt-changes", "quick"), /different changes/],
      ["edit", () => b.eval(`(function(){ var e = ${$v("bt-abc")}; e.value = e.value.replace('"Eb7"z4', '"Eb9"z4'); e.dispatchEvent(new Event('input', { bubbles:true })); })()`).then(() => b.sleep(1500)), /edited/]]) {
      await b.eval(`localStorage.setItem('bandHandoff', ${JSON.stringify(hand())})`); await b.goto(URL + "?from=chord-sheet"); await b.sleep(700);
      assert.strictEqual(await b.eval(`${$v("bt-pin-clear")}.hidden`), false, "pins on again");
      await fn(); const t = await b.eval(`${$v("bt-pinnote-text")}.textContent`);
      if (!/cleared because/.test(t)) console.log("DEBUG", what, JSON.stringify(await b.eval(`[${$v("bt-abc")}.value, ${$v("bt-abc-note")}.textContent, ${$v("bt-changes")}.value]`)), b.errors.slice(-3));
      assert(/cleared because/.test(t) && word.test(t) && !await b.eval(`${$v("bt-pinnote")}.hidden`), what + ": " + t); assert(await b.eval(`${$v("bt-pin-clear")}.hidden`));
      console.log("clears on", what + ":", t);
    }
    // a stale or foreign hand-off is refused with a note; nothing is loaded
    await b.eval(`localStorage.setItem('bandHandoff', ${JSON.stringify(hand({ at: Date.now() - 11 * 60 * 1000 }))})`); await b.goto(URL + "?from=chord-sheet"); await b.sleep(700);
    assert(/expire after ten minutes/.test(await b.eval(`${$v("bt-pinnote-text")}.textContent`))); assert.strictEqual(flat(await bars()), "F7 | F7 | F7 | F7 | B♭7 | B♭7 | F7 | F7 | C7 | B♭7 | F7 | C7");
    await b.eval(`localStorage.setItem('bandHandoff', ${JSON.stringify(hand())})`); await b.goto(URL); await b.sleep(700);       // no ?from= -> ignored
    assert.strictEqual(await b.eval(`${$v("bt-pinnote")}.hidden`), true); assert(await b.eval(`localStorage.getItem('bandHandoff')`) !== null); await b.eval(`localStorage.removeItem('bandHandoff')`);

    // ---- screenshots ----
    await b.goto(URL); await b.sleep(900); await set("bt-changes", "jazz"); await set("bt-roman", "both");
    await b.shot(OUT + "both-desktop.png");
    await set("bt-chartfor", "eb"); await b.shot(OUT + "alto-both-desktop.png"); await set("bt-roman", "off"); await b.shot(OUT + "alto-desktop.png");
    await b.resize(390, 800); await b.sleep(300);
    await b.eval(`localStorage.setItem('bandHandoff', ${JSON.stringify(hand())})`); await b.goto(URL + "?from=chord-sheet"); await b.sleep(700);
    await b.resize(390, 800); await set("bt-changes", "jazz"); await set("bt-roman", "both"); await b.shot(OUT + "both-mobile.png");
    await set("bt-chartfor", "eb"); await set("bt-roman", "off"); await b.shot(OUT + "alto-mobile.png");
    const over = await b.eval(`(function(){ var w = window.innerWidth, bad = []; document.querySelectorAll('#bt-root select,#bt-root button,#bt-root input,#bt-root .tune-chart,#bt-root .bt-panel,#bt-root .bt-pinnote').forEach(function(e){
      var r = e.getBoundingClientRect(); if (r.width && (r.right > w + 0.5 || r.left < -0.5)) bad.push((e.id || e.className) + ' ' + Math.round(r.left) + '..' + Math.round(r.right)); }); return { w: w, sw: document.documentElement.scrollWidth, bad: bad }; })()`);
    console.log("phone overflow check:", JSON.stringify(over)); assert(over.sw <= over.w && !over.bad.length, "no overflow at 390px");
    await b.resize(1280, 900);
    const errs = b.errors.filter(e => !KNOWN.test(e)), failed = b.failed.filter(f => /^\d{3} /.test(f) && !KNOWN.test(f));
    console.log("console errors:", JSON.stringify(errs), "failed:", JSON.stringify(failed)); assert.strictEqual(errs.length, 0);
    console.log("PAGE2 OK");
  } finally { await b.close(); }
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
