// Chord Sheet: "Enter voicings (MIDI)". The outlined keyboard card takes the notes played, named by
// ChordVoicings.identify. Run from tests/band/lead, server on 8500:   node ../sheet/voice.cdp.js
const { launch } = require("../lead/cdp.js"); const assert = require("assert");
(async () => { const b = await launch({ width: 1280, height: 1200 }); const B = "http://127.0.0.1:8500";
  const ev = x => Promise.race([b.eval(x), b.sleep(8000).then(() => { throw new Error("eval timed out: " + x.slice(0, 60)); })]);
  const kb = `Array.from(document.querySelectorAll("#sheet-output .keyboard-grid .diagram-card"))`;
  const card = (i, f) => ev(`(function(c){ return ${f}; })(${kb}[${i}])`);
  try {
    await ev(`0`).catch(() => {}); await b.goto(B + "/tools/chord-sheet.html"); await b.sleep(1500);
    await ev(`(function(){ var ta = document.getElementById("chords-textarea"); ta.value = "C7 F7 Dm7"; ta.dispatchEvent(new Event("blur")); })()`); await b.sleep(600);
    await ev(`(function(){ var g = document.querySelector('input[data-inst-id="keyboard"], [data-inst-id="keyboard"] input[type=checkbox]'); if (g && !g.checked) g.click(); })()`); await b.sleep(600);
    assert.strictEqual(await ev(`${kb}.length`), 3, "three keyboard cards"); assert(await ev(`!!document.getElementById("btn-voice")`));
    await ev(`__sheetVoice.on(); 0`); assert.strictEqual(await card(0, `c.classList.contains("is-voicing")`), true);
    // C7: E A Bb D is the rootless A form; the card shows exactly those notes and the outline moves on
    await ev(`__sheetVoice.enter([62, 52, 58, 57]); 0`);
    assert.strictEqual(await card(0, `c._midis.join(" ")`), "52 57 58 62"); assert(/^Rootless \(A\/B forms\): A form/.test(await card(0, `c.querySelector("select.voicing-sel").options[0].textContent`)));
    assert(/C7: Rootless .* Next: F7\./.test(await ev(`document.getElementById("voice-note").textContent`)), await ev(`document.getElementById("voice-note").textContent`));
    assert.strictEqual(await ev(`__sheetVoice.at()`), 1); assert.strictEqual(await card(1, `c.classList.contains("is-voicing")`), true); assert.strictEqual(await card(0, `c.classList.contains("is-voicing")`), false);
    // F7: guide tones; Dm7: something the library has no name for
    await ev(`__sheetVoice.enter([57, 63]); 0`); assert(/^Guide tones/.test(await card(1, `c.querySelector("select.voicing-sel").options[0].textContent`))); assert.strictEqual(await card(1, `c._midis.join(" ")`), "57 63");
    await ev(`__sheetVoice.enter([50, 60, 65, 69, 76]); 0`); assert(/^As played \(R ♭7 ♭3 5 9\)/.test(await card(2, `c.querySelector("select.voicing-sel").options[0].textContent`)), await card(2, `c.querySelector("select.voicing-sel").options[0].textContent`));
    assert(/last chord/.test(await ev(`document.getElementById("voice-note").textContent`)));
    // clicking a card makes it the one being voiced; the picker hands a chord back to the menu
    await card(0, `(c.querySelector("svg") || c).dispatchEvent(new MouseEvent("click", { bubbles:true })), 0`); assert.strictEqual(await ev(`__sheetVoice.at()`), 0);
    await card(1, `(function(s){ s.value = "1"; s.dispatchEvent(new Event("change", { bubbles:true })); })(c.querySelector("select.voicing-sel")), 0`); await b.sleep(500);
    assert.notStrictEqual(await card(1, `c._midis.join(" ")`), "57 63"); assert.strictEqual(await card(0, `c._midis.join(" ")`), "52 57 58 62", "the others keep theirs");
    assert.strictEqual(await card(0, `c.classList.contains("is-voicing")`), true, "still outlined after a redraw");
    // changing the menu style leaves a played voicing alone
    await ev(`(function(){ var s = Array.from(document.querySelectorAll("select")).filter(function(x){ return Array.from(x.options).some(function(o){ return o.value === "drop2"; }) && Array.from(x.options).some(function(o){ return o.value === "rootless"; }); })[0]; s.value = "drop2"; s.dispatchEvent(new Event("change", { bubbles:true })); })()`); await b.sleep(600);
    assert.strictEqual(await card(0, `c._midis.join(" ")`), "52 57 58 62"); assert.strictEqual(await card(1, `c._midis.length`), 4, "F7 follows the menu again");
    const errs = b.errors.filter(e => !/supabase/i.test(e)); assert.deepStrictEqual(errs, [], errs.join(" | "));
    console.log("SHEET VOICE OK");
  } catch (e) { console.log("FAILED:", e.message); process.exitCode = 1; } finally { await b.close(); }
})();
