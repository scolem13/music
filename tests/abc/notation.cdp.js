// The Notation page in headless Chrome: notes before a rhythm, meter gate, rhythm bank, key guess and confirm, chunks,
// click a note and move it with the arrows, ABC typed back in. Setup as in tests/band/README.md (render tools/notation.qmd
// into tests/band/lead/site, serve on 8500).  node tests/abc/notation.cdp.js -> "NOTATION PAGE OK"
const { launch } = require("../band/lead/cdp.js");
const assert = require("assert");
(async () => {
  const b = await launch({ width: 1500, height: 1400 });
  try {
    await b.goto("http://127.0.0.1:8500/tools/notation.html");
    await b.eval("localStorage.clear()");
    await b.goto("http://127.0.0.1:8500/tools/notation.html");
    await b.sleep(400);
    const key = k => b.eval(`document.dispatchEvent(new KeyboardEvent("keydown", ${JSON.stringify(k)})), 1`);
    const doc = () => b.eval("NotationPage.doc()");

    // notes first: letters, no meter -> they wait; rhythm panel asks for a meter
    for (const l of "gbdcbag") await key({ key: l });
    await key({ key: "f" }); await key({ key: "=" }); await key({ key: "g" });   // f then raise it: F#
    let d = await doc();
    assert.deepStrictEqual(d.chunks[0].pitches, [67, 71, 74, 72, 71, 69, 67, 66, 67]);
    assert.strictEqual(await b.eval("document.getElementById('nt-rhythm-nometer').hidden"), false);
    assert.strictEqual(await b.eval("document.getElementById('nt-pending-wrap').hidden"), false);
    assert.strictEqual(await b.eval("document.querySelectorAll('#nt-pending .abcjs-note').length"), 9);

    // key guess needs a yes
    assert.strictEqual(await b.eval("document.getElementById('nt-keyguess').hidden"), false);
    assert.ok(/G major/.test(await b.eval("document.getElementById('nt-keyguess-text').textContent")));
    assert.strictEqual(d.keyConfirmed, false);
    await b.eval("document.getElementById('nt-keyguess-yes').click()");
    d = await doc(); assert.strictEqual(d.key, "G"); assert.strictEqual(d.keyConfirmed, true);

    // meter, then rhythm patterns from the bank
    await b.eval("document.querySelector('#nt-meter-quick button:nth-child(3)').click()");   // 4/4
    const cells = await b.eval("document.querySelectorAll('#nt-cells .cell-btn').length");
    assert.ok(cells > 1, "rhythm bank has patterns: " + cells);
    assert.strictEqual(await b.eval("document.querySelector('#nt-cells .cell-number').textContent"), "1");
    assert.ok(await b.eval("document.querySelector('#nt-cells .cell-btn').style.height === '50px'"), "cells sized like the Song Builder's");
    for (let i = 0; i < 7; i++) await b.eval("document.querySelector('#nt-cells .cell-btn').click()");
    await key({ key: "1" });                                                              // the 8th by its number
    d = await doc();
    assert.strictEqual(d.chunks[0].rhythm.length, 8);
    assert.strictEqual(await b.eval("document.querySelectorAll('#nt-paper .abcjs-note').length"), 8);
    assert.strictEqual(await b.eval("document.querySelectorAll('#nt-pending .abcjs-note').length"), 1);   // 9 notes, 8 slots
    { const txt = await b.eval("document.getElementById('nt-abc-text').value"); assert.ok(/G2 B2 d2 c2 \| B2 A2 G2 F2 \|\]/.test(txt), txt); }
    // clicking the first note of a bar finds it (abcjs starts it at the space after the barline), and Shift+click makes a range
    { const click = (i, shift) => b.eval(`(() => { const n = document.querySelectorAll('#nt-paper .abcjs-note')[${i}], r = n.getBoundingClientRect(), o = { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, shiftKey: ${!!shift}, button: 0 };
        n.dispatchEvent(new MouseEvent('mousedown', o)); n.dispatchEvent(new MouseEvent('mouseup', o)); })()`);
      await click(4); await b.sleep(150);
      assert.strictEqual(await b.eval("NotationPage.sel() && NotationPage.sel().slot"), 4, "the first note of bar 2 is clickable");
      await click(1); await b.sleep(150); await click(5, true); await b.sleep(150);
      assert.strictEqual(await b.eval("[...document.querySelectorAll('#nt-paper .abcjs-note')].map(n => n.classList.contains('nt-sel') ? 1 : 0).join('')"), "01111100", "Shift+click selects the range, across the barline");
      await click(7); await b.sleep(150); }

    // click the 3rd note, move it: step down (d -> c), semitone up (c -> c#), octave down
    await b.eval("document.querySelectorAll('#nt-paper .abcjs-note')[2].dispatchEvent(new MouseEvent('mousedown',{bubbles:true})), document.querySelectorAll('#nt-paper .abcjs-note')[2].dispatchEvent(new MouseEvent('mouseup',{bubbles:true})), 1");
    await b.sleep(50);
    assert.deepStrictEqual(await b.eval("NotationPage.sel()"), { chunk: 0, voice: 0, slot: 2 });
    await key({ key: "ArrowDown" });
    assert.strictEqual((await doc()).chunks[0].pitches[2], 72);
    await key({ key: "ArrowUp", shiftKey: true });
    assert.strictEqual((await doc()).chunks[0].pitches[2], 73);
    await key({ key: "ArrowDown", altKey: true });
    assert.strictEqual((await doc()).chunks[0].pitches[2], 61);
    assert.strictEqual(await b.eval("document.querySelectorAll('#nt-paper .nt-sel').length > 0"), true);
    await key({ key: "ArrowRight" });
    assert.deepStrictEqual(await b.eval("NotationPage.sel()"), { chunk: 0, voice: 0, slot: 3 });
    await key({ key: "Escape" });

    // a second chunk: rhythm first, slashes until notes arrive by computer piano keys
    await b.eval("document.getElementById('nt-c-add').click()");
    for (let i = 0; i < 4; i++) await key({ key: "1" });
    assert.ok(/"\^Chunk 2"/.test(await b.eval("document.getElementById('nt-abc-text').value")));
    assert.strictEqual((await b.eval("document.getElementById('nt-abc-text').value")).split("!style=rhythm!").length - 1, 4);
    await b.eval("document.querySelector('[data-mode=piano]').click()");
    await b.eval(`document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyZ", key: "z" })), document.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyZ", key: "z" })), 1`);
    d = await doc(); assert.deepStrictEqual(d.chunks[1].pitches.length, 1);
    assert.strictEqual((await b.eval("document.getElementById('nt-abc-text').value")).split("!style=rhythm!").length - 1, 3);

    await b.eval("document.querySelector('[data-mode=letters]').click()");

    // the sheet: one row per chunk, bars and layers, no note counts; rename
    let rows = await b.eval("[...document.querySelectorAll('#nt-sheet tbody tr')].map(r => [...r.cells].map(c => c.textContent.trim() || (c.querySelector('input') || {}).value))");
    assert.deepStrictEqual(rows, [["1", "Chunk 1", "2", "\u00b7", "\u2713", "\u2713", "\u00b7", null], ["2", "Chunk 2", "1", "\u00b7", "\u2713", "\u2713", "\u00b7", null]], JSON.stringify(rows));
    await b.eval("(() => { const i = document.querySelector('#nt-sheet tbody tr:nth-child(2) input'); i.focus(); i.value = 'Chorus'; i.dispatchEvent(new Event('input')); i.blur(); })()");
    assert.ok(/"\^Chorus"/.test(await b.eval("document.getElementById('nt-abc-text').value")));
    // a meter change shows Meter/Key columns, on the row where it changes
    await b.eval("(() => { const s = document.getElementById('nt-c-meter'); s.value = '2/4'; s.dispatchEvent(new Event('change')); })()");
    let head = await b.eval("[...document.querySelectorAll('#nt-sheet thead th')].map(t => t.textContent)");
    assert.ok(head.includes("Meter") && head.includes("Key"), head.join());
    rows = await b.eval("[...document.querySelectorAll('#nt-sheet tbody tr')].map(r => r.cells[3].textContent)");
    assert.deepStrictEqual(rows, ["4/4", "2/4"]);
    assert.ok(/\[M:2\/4\]/.test(await b.eval("document.getElementById('nt-abc-text').value")));
    await b.eval("(() => { const s = document.getElementById('nt-c-meter'); s.value = ''; s.dispatchEvent(new Event('change')); })()");
    assert.ok(!(await b.eval("[...document.querySelectorAll('#nt-sheet thead th')].map(t => t.textContent)")).includes("Meter"));
    // duplicate, move up, merge, split
    await b.eval("document.getElementById('nt-c-dup').click()");
    assert.deepStrictEqual((await doc()).chunks.map(c => c.name), ["Chunk 1", "Chorus", "Chorus (copy)"]);
    await b.eval("document.getElementById('nt-c-up').click()");
    assert.deepStrictEqual((await doc()).chunks.map(c => c.name), ["Chunk 1", "Chorus (copy)", "Chorus"]);
    assert.strictEqual(await b.eval("NotationPage.cur()"), 1);
    await b.eval("document.getElementById('nt-c-merge').click()");
    d = await doc(); assert.deepStrictEqual(d.chunks.map(c => c.rhythm.length), [8, 8]);
    await b.eval("(() => { document.getElementById('nt-c-at').value = 1; document.getElementById('nt-c-split').click(); })()");
    d = await doc(); assert.deepStrictEqual(d.chunks.map(c => c.rhythm.length), [8, 4, 4]);
    await b.eval("(() => { document.getElementById('nt-c-at').value = 5; document.getElementById('nt-c-split').click(); })()");
    assert.strictEqual(await b.eval("document.getElementById('nt-c-msg').hidden"), false);

    // sections collapse; the jump bar opens and goes to them
    const navs = await b.eval("[...document.querySelectorAll('#nt-nav a')].map(a => a.textContent)");
    assert.deepStrictEqual(navs, ["Play it in", "The music", "Chunks", "The piece", "DWIM", "ABC", "ChordPro", "Other ways in", "Notes", "Chords", "Rhythm", "Words", "Play it in time: more"]);
    await b.eval("document.querySelector('#nt-rhythm > summary').click()");
    assert.strictEqual(await b.eval("document.getElementById('nt-rhythm').open"), false);
    await b.eval("[...document.querySelectorAll('#nt-nav a')].find(a => a.textContent === 'Rhythm').click()");
    assert.strictEqual(await b.eval("document.getElementById('nt-rhythm').open"), true);
    // the other ways in sit in a sidebar to the right at desktop width
    assert.ok(await b.eval("(() => { const a = document.querySelector('.nt-main'), c = document.querySelector('.nt-side'); return c.getBoundingClientRect().left > a.getBoundingClientRect().right && !!c.querySelector('#nt-rhythm'); })()"));

    // undo, then ABC typed in replaces the piece
    await b.eval("document.getElementById('nt-undo').click()");
    assert.strictEqual((await doc()).chunks.length, 2);
    await b.eval(`(() => { const t = document.getElementById('nt-abc-text'); t.value = "X:1\\nM:3/4\\nL:1/8\\nK:D\\nD2 F2 A2 | d6 |]\\n"; t.dispatchEvent(new Event('input')); })()`);
    await b.sleep(900);
    d = await doc();
    assert.strictEqual(d.meter, "3/4"); assert.strictEqual(d.key, "D");
    assert.deepStrictEqual(d.chunks[0].pitches, [62, 66, 69, 74]);
    assert.strictEqual(await b.eval("document.querySelectorAll('#nt-paper .abcjs-note').length"), 4);

    // chords typed by bar into a new chords-only chunk
    await b.eval("document.getElementById('nt-c-add').click()");
    const typeIn = (id, v) => b.eval(`(() => { const t = document.getElementById('${id}'); t.focus(); t.value = ${JSON.stringify(v)}; t.dispatchEvent(new Event('input')); })()`);
    await typeIn("nt-chords-text", "D | G A7 | D");
    await b.sleep(700); await b.eval("document.getElementById('nt-chords-text').dispatchEvent(new Event('blur'))");
    d = await doc();
    assert.deepStrictEqual(d.chunks[1].chords.map(c => c.name), ["D", "G", "A7", "D"]);
    assert.strictEqual(await b.eval("document.querySelector('#nt-sheet tbody tr:nth-child(2) td:nth-child(3)').textContent"), "3");
    assert.ok(/"G"x3 "A7"x3/.test(await b.eval("document.getElementById('nt-abc-text').value")));
    // chords played on the computer keys, one a bar
    await b.eval("document.getElementById('nt-chords-play').click()");
    for (const code of ["KeyZ", "KeyC", "KeyB"]) await b.eval(`document.dispatchEvent(new KeyboardEvent("keydown", { code: "${code}", key: "x" })), 1`);
    for (const code of ["KeyZ", "KeyC", "KeyB"]) await b.eval(`document.dispatchEvent(new KeyboardEvent("keyup", { code: "${code}", key: "x" })), 1`);
    d = await doc();
    assert.deepStrictEqual(d.chunks[1].chords.map(c => c.name), ["D", "G", "A7", "D", "C"]);
    assert.strictEqual(d.chunks[1].chords[4].at, 9);
    await b.eval("document.getElementById('nt-chords-play').click()");

    // a take: four quarter notes and a half note in 3/4 played against the click, quantized by Chord Entry's engine
    await b.eval("(() => { const s = document.getElementById('nt-t-what'); s.value = 'melody'; })()");
    await b.eval(`(() => { const cfg = NotationPage.takeCfg(); const ev = [];
      [[67,0],[69,1],[71,2],[72,3.04],[74,3.98]].forEach(([n,t]) => { ev.push({ k: "on", n, beat: t }); ev.push({ k: "off", n, beat: t + (n === 74 ? 1.9 : 0.9) }); });
      NotationPage.applyTake(cfg, ev, 2); })()`);
    d = await doc();
    assert.deepStrictEqual(d.chunks[1].pitches, [67, 69, 71, 72, 74]);
    assert.deepStrictEqual(d.chunks[1].rhythm.map(r => r.type[0] + r.durQ), ["n1", "n1", "n1", "n1", "n2"]);
    assert.strictEqual(d.chunks[1].chords.length, 5, "a notes take keeps the chords");

    // words under the notes
    await typeIn("nt-words-text", "Hap-py birth-day to");
    await b.sleep(600); await b.eval("document.getElementById('nt-words-text').dispatchEvent(new Event('blur'))");
    assert.ok(/w: +\| +\| Hap- py birth- \| day to \*/.test(await b.eval("document.getElementById('nt-abc-text').value")), await b.eval("document.getElementById('nt-abc-text').value"));
    assert.deepStrictEqual(await b.eval("[...document.querySelectorAll('#nt-paper .abcjs-lyric')].map(e => e.textContent.trim())"), ["", "", "", "", "Hap-", "py", "birth-", "day", "to", ""]);
    assert.ok(/\[D\]Hap/.test(await b.eval("document.getElementById('nt-cho-text').value")));

    // a second voice, entered by letters, on one staff
    await b.eval("document.getElementById('nt-voice-add').click()");
    assert.strictEqual(await b.eval("NotationPage.voice()"), 1);
    for (let i = 0; i < 2; i++) await key({ key: "1" });
    await b.eval("document.querySelector('[data-mode=letters]').click()");
    await key({ key: "d" }); await key({ key: "d" });
    d = await doc();
    assert.deepStrictEqual(d.chunks[1].parts[0].pitches.length, 2);
    let abcNow = await b.eval("document.getElementById('nt-abc-text').value");
    assert.ok(/%%score \(1 2\)/.test(abcNow) && /\[V:2\]/.test(abcNow), abcNow);
    assert.strictEqual(await b.eval("document.querySelectorAll('#nt-paper .abcjs-staff').length > 0"), true);
    await b.eval("document.querySelector('[data-together=\"0\"]').click()");
    assert.ok(/%%score 1 2/.test(await b.eval("document.getElementById('nt-abc-text').value")));

    // ChordPro read in
    await b.eval(`(() => { window.confirm = () => true; const t = document.getElementById('nt-cho-text'); t.focus(); t.value = "{time: 4/4}\\n{start_of_verse: Verse}\\n[G]Hello [C]there\\n"; t.dispatchEvent(new Event('input')); document.getElementById('nt-cho-read').click(); })()`);
    d = await doc();
    assert.deepStrictEqual(d.chunks.map(c => c.name), ["Verse"]);
    assert.strictEqual(d.chunks[0].words, "Hello there");

    // the user's two voices pasted as ABC
    await typeIn("nt-abc-text", "X:1\nM:2/4\nL:1/4\nK:G\n[V:1] D/2D/2 D | D/2D/2 D | D/2F/2 G,/2C/2 | D/2C/2 B,/2G,/2 |\n[V:2] B,/2B,/2 B, | A,/2A,/2 A, | G, G, | F, E, |\n");
    await b.sleep(900);
    d = await doc();
    assert.strictEqual(d.voices.length, 2);
    assert.strictEqual(await b.eval("document.querySelectorAll('#nt-paper .abcjs-note').length"), 24);
    await b.eval("document.getElementById('nt-abc-text').dispatchEvent(new Event('blur'))");

    // beams drawn: eight eighths in 4/4 make two beams
    await typeIn("nt-abc-text", "X:1\nM:4/4\nL:1/8\nK:C\nCDEFGABc | c2 B2 A2 G2 |]\n");
    await b.sleep(900); await b.eval("document.getElementById('nt-abc-text').dispatchEvent(new Event('blur'))");
    assert.ok(/CDEF GABc/.test(await b.eval("document.getElementById('nt-abc-text').value")));
    assert.strictEqual(await b.eval("document.querySelectorAll('#nt-paper .abcjs-beam-elem').length"), 2);

    // shift-click a span, copy, paste after it
    const clickNote = (i, shift) => b.eval(`(() => { const n = document.querySelectorAll('#nt-paper .abcjs-note')[${i}];
      n.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, shiftKey: ${!!shift} })); n.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, shiftKey: ${!!shift} })); })()`);
    await clickNote(1); await clickNote(3, true);
    assert.deepStrictEqual(await b.eval("NotationPage.sel()"), { chunk: 0, voice: 0, slot: 1, end: { chunk: 0, slot: 3 } });
    assert.ok(/span/.test(await b.eval("document.getElementById('nt-sel-what').textContent")));
    await b.eval(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "c", metaKey: true })), 1`);
    assert.deepStrictEqual((await b.eval("NotationPage.clip()")).map(c => c.pitch), [62, 64, 65]);
    await b.eval(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "v", metaKey: true })), 1`);
    d = await doc();
    assert.deepStrictEqual(d.chunks[0].pitches.slice(0, 7), [60, 62, 64, 65, 62, 64, 65]);
    // the whole pasted span moves up a step
    await key({ key: "ArrowUp" });
    assert.deepStrictEqual((await doc()).chunks[0].pitches.slice(4, 7), [64, 65, 67]);
    await key({ key: "Delete" });
    assert.deepStrictEqual((await doc()).chunks[0].pitches.slice(0, 5), [60, 62, 64, 65, 67]);

    // split here: a new chunk starts on the clicked note
    await clickNote(4);
    await b.eval("document.getElementById('nt-s-split').click()");
    d = await doc();
    assert.deepStrictEqual(d.chunks.map(c => c.pitches[0]), [60, 67]);
    assert.strictEqual(await b.eval("NotationPage.cur()"), 1);

    // sections: start one, fold it, duplicate it, move the copy up
    await b.eval("window.prompt = () => 'Verse'; document.getElementById('nt-c-sec').click()");
    assert.strictEqual(await b.eval("document.querySelectorAll('#nt-sheet tr.nt-sec').length"), 1);
    await b.eval("document.querySelector('#nt-sheet tr.nt-sec [data-s=dup]').click()");
    d = await doc();
    assert.deepStrictEqual(d.chunks.map(c => c.heading), [null, "Verse", "Verse (copy)"]);
    await b.eval("document.querySelectorAll('#nt-sheet tr.nt-sec')[1].querySelector('[data-s=up]').click()");
    assert.deepStrictEqual((await doc()).chunks.map(c => c.heading), [null, "Verse (copy)", "Verse"]);
    await b.eval("document.querySelector('#nt-sheet tr.nt-sec .nt-fold').click()");
    assert.strictEqual(await b.eval("document.querySelectorAll('#nt-sheet tbody tr:not(.nt-sec)').length"), 2);
    assert.ok(/\[P:Verse\]/.test(await b.eval("document.getElementById('nt-abc-text').value")));
    assert.ok(/\{start_of_verse: Verse \(copy\)\}/.test(await b.eval("document.getElementById('nt-cho-text').value")));

    // chunks by keyboard (state: Chunk 1 | Verse (copy): Chunk 1 (2) | Verse: Chunk 1 (2), the last section folded)
    await b.eval("document.querySelector('#nt-sheet tr.nt-sec .nt-fold').click()");          // unfold
    await b.eval("document.querySelector('[data-mode=letters]').click()");
    await b.eval("document.querySelector('#nt-sheet tbody tr[data-chunk=\"0\"]').click()");
    await key({ key: "j", code: "KeyJ" });
    assert.strictEqual(await b.eval("NotationPage.cur()"), 1);
    await key({ key: "k", code: "KeyK" });
    assert.strictEqual(await b.eval("NotationPage.cur()"), 0);
    const names = async () => (await doc()).chunks.map(c => c.heading || c.name);
    const before = await names();
    await key({ key: "\u2206", code: "KeyJ", altKey: true });
    assert.strictEqual(await b.eval("NotationPage.cur()"), 1);
    assert.deepStrictEqual(await names(), [before[1], before[0], before[2]]);
    await key({ key: "\u02da", code: "KeyK", altKey: true });
    assert.deepStrictEqual(await names(), before);
    await b.eval("document.querySelector('#nt-sheet tbody tr[data-chunk=\"2\"]').click()");
    await key({ key: "K", code: "KeyK", altKey: true, shiftKey: true });                  // the section "Verse" moves above "Verse (copy)"
    d = await doc();
    assert.deepStrictEqual(d.chunks.map(c => c.heading), [null, "Verse", "Verse (copy)"]);
    assert.strictEqual(await b.eval("NotationPage.cur()"), 1);

    // shift-click in the jump bar folds every other section
    await b.eval("[...document.querySelectorAll('#nt-nav a')].find(a => a.textContent === 'Words').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }))");
    assert.deepStrictEqual(await b.eval("[...document.querySelectorAll('details.nt-panel')].filter(p => p.open).map(p => p.id)"), ["nt-words"]);
    await b.eval("document.querySelectorAll('details.nt-panel').forEach(p => p.open = true)");

    // DWIM: a take of detached quarter notes, kept with the chunk through a reload, re-read as staccato
    await b.eval("window.confirm = () => true; document.getElementById('nt-new').click()");
    await b.eval("document.querySelector('#nt-meter-quick button:nth-child(3)').click()");      // 4/4
    await b.eval(`(() => { document.getElementById('nt-t-what').value = 'melody'; const cfg = NotationPage.takeCfg(); const ev = [];
      [60, 62, 64, 65].forEach((n, i) => { ev.push({ k: "on", n, beat: i }); ev.push({ k: "off", n, beat: i + 0.45 }); });
      NotationPage.applyTake(cfg, ev, 1); })()`);
    d = await doc();
    assert.strictEqual(d.chunks[0].takes.length, 1);
    await b.goto("http://127.0.0.1:8500/tools/notation.html"); await b.sleep(400);
    assert.strictEqual((await doc()).chunks[0].takes.length, 1, "the take is kept after a reload");
    await clickNote(0);
    assert.strictEqual(await b.eval("document.getElementById('nt-s-dwim').classList.contains('is-main')"), true);
    await b.eval("document.getElementById('nt-s-dwim').click()");
    await b.sleep(300);
    const cards = await b.eval("[...document.querySelectorAll('#nt-dwim-host .md-card .md-head')].map(e => e.textContent)");
    assert.ok(cards.length >= 2 && cards.some(c => /staccato/i.test(c)), JSON.stringify(cards));
    const before2 = JSON.stringify((await doc()).chunks[0].rhythm);
    await b.eval("[...document.querySelectorAll('#nt-dwim-host .md-card')].find(c => /staccato/i.test(c.textContent)).querySelector('button').click()");
    d = await doc();
    assert.notStrictEqual(JSON.stringify(d.chunks[0].rhythm), before2);
    assert.deepStrictEqual(d.chunks[0].pitches, [60, 62, 64, 65]);
    assert.ok(/now read/.test(await b.eval("document.querySelector('#nt-dwim-host .md-say').textContent")));
    // an edit after the take is reported
    await clickNote(1); await key({ key: "ArrowUp" }); await clickNote(1);
    await b.eval("document.getElementById('nt-s-dwim').click()"); await b.sleep(200);
    assert.ok(/Bar 1 changed after the take/.test(await b.eval("document.getElementById('nt-dwim-warn').textContent")));
    await key({ key: "Escape" });

    // the band: Style on a chunk opens the Backing Track (its own window) on the Band tab; what is changed there comes back to the chunk
    await typeIn("nt-chords-text", "C | F G"); await b.sleep(700); await b.eval("document.getElementById('nt-chords-text').dispatchEvent(new Event('blur'))");
    await b.eval("document.querySelector('#nt-sheet tbody tr[data-chunk=\"0\"] .nt-style').click()");
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) { await b.sleep(250); ready = await b.eval("!!(NotationPage.bt().ready && NotationPage.bt().win.document.getElementById('bt-style'))"); }
    assert.ok(ready, "the Backing Track window answered");
    await b.sleep(800);
    assert.strictEqual(await b.eval("NotationPage.bt().win.document.getElementById('dxa-tab-band').getAttribute('aria-selected')"), "true");
    assert.ok(/Chunk 1/.test(await b.eval("NotationPage.bt().win.document.getElementById('bt-sec-note').textContent")));
    const other = await b.eval(`(() => { const w = NotationPage.bt().win, sel = w.document.getElementById('bt-style');
      const o = [...sel.options].find(x => x.value !== sel.value && !x.disabled); sel.value = o.value; sel.dispatchEvent(new w.Event('change', { bubbles: true })); return o.value; })()`);
    let got = null;
    for (let i = 0; i < 20 && !got; i++) { await b.sleep(200); got = (await doc()).chunks[0].band; }
    assert.ok(got && got.state && got.state.style === other, "the chunk keeps the style chosen there: " + JSON.stringify(got && got.state && got.state.style) + " vs " + other);
    assert.ok(await b.eval("!document.querySelector('#nt-sheet tbody tr[data-chunk=\"0\"] .nt-style').classList.contains('is-inherited')"));
    await b.eval("NotationPage.bt().win.close()");

    // phone width: no sideways scroll of the page
    await b.resize(375, 800); await b.sleep(200);
    assert.ok(await b.eval("document.documentElement.scrollWidth <= 376"), "no horizontal scroll at 375px");
    await b.resize(1500, 1400); await b.sleep(200);
    await b.shot(process.env.SHOT || "/tmp/notation.png");

    const errs = b.errors.filter(e => !/soundfont|Audio|load note|supabase/i.test(e));
    assert.deepStrictEqual(errs, []);
    console.log("NOTATION PAGE OK");
  } catch (e) { console.error(e); console.error(b.errors); process.exitCode = 1; }
  finally { await b.close(); }
})();
