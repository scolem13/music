// Navbar Metronome and Drone, the Chords and Solfège page, and musical typing on Chord Entry.
// Needs the test server (tests/band/lead/serve.js, port 8500) and the pages rendered into tests/band/lead/site. Prints "CLEANUP OK".
const assert = require("assert"), cdp = require("../lead/cdp.js");
const B = "http://127.0.0.1:8500";
(async () => {
  const b = await cdp.launch({ width: 1280, height: 900 });
  const ev = x => b.eval(x);
  try {
    // ---- the widgets, on a page that has nothing to do with them ----
    await b.goto(B + "/index.html"); await b.sleep(600);
    assert(await ev(`!!document.querySelector('#pw-nav')`), "navbar has the widget buttons");
    assert.strictEqual(await ev(`document.querySelectorAll('#pw-nav .nav-link').length`), 3);
    await ev(`document.querySelector('#pw-nav .nav-link').click()`);
    assert.strictEqual(await ev(`document.getElementById('pw-metro').hidden`), false, "metronome opens");
    await ev(`document.getElementById('pw-metro-go').click()`); await b.sleep(1500);
    assert(await ev(`PracticeWidgets.metronome.running()`), "metronome runs");
    assert(await ev(`document.querySelector('#pw-nav .is-on')`) !== null, "button shows it is sounding");
    assert(await ev(`document.querySelectorAll('.pw-lamp').length`) === 4, "four lamps");
    await ev(`document.getElementById('pw-tap').click()`);
    await ev(`document.getElementById('pw-bpm-up').click()`);
    assert.strictEqual(await ev(`PracticeWidgets.drone.state().tempo`), 85);
    await ev(`document.getElementById('pw-metro-go').click()`);
    assert(!(await ev(`PracticeWidgets.metronome.running()`)), "metronome stops");
    await ev(`document.querySelectorAll('#pw-nav .nav-link')[1].click()`);
    assert.strictEqual(await ev(`document.getElementById('pw-metro').hidden`), true, "one panel at a time");
    assert.strictEqual(await ev(`document.getElementById('pw-drone').hidden`), false, "drone opens");
    await ev(`document.getElementById('pw-drone-go').click()`); await b.sleep(500);
    assert(await ev(`PracticeWidgets.drone.running()`), "drone runs");
    await ev(`document.querySelectorAll('.pw-pad')[4].click()`);                    // add Mi
    assert.deepStrictEqual(await ev(`PracticeWidgets.drone.state().pads`), [0, 7, 4]);
    await ev(`document.querySelector('#pw-tuning button[data-t=pure]').click()`);
    assert(/\-14|\-15|\+/.test(await ev(`document.querySelectorAll('.pw-pad')[4].textContent`)), "pure tuning shows cents: " + await ev(`document.querySelectorAll('.pw-pad')[4].textContent`));
    await ev(`document.querySelector('#pw-mode button[data-m=tanpura]').click()`); await b.sleep(400);
    assert.strictEqual(await ev(`PracticeWidgets.drone.state().mode`), "tanpura");
    assert(await ev(`document.getElementById('pw-sus').hidden && !document.getElementById('pw-tan').hidden`), "tanpura controls replace the pads");
    assert(await ev(`PracticeWidgets.drone.running()`), "tanpura keeps the drone running");
    await ev(`document.querySelector('#pw-tan-first button[data-step="5"]').click()`);
    assert(/low Fa, Do, Do, low Do/.test(await ev(`document.getElementById('pw-tan-note').textContent`)), "tanpura strings: " + await ev(`document.getElementById('pw-tan-note').textContent`));
    await ev(`document.querySelector('#pw-mode button[data-m=sustain]').click()`);
    assert(await ev(`!document.getElementById('pw-sus').hidden && document.getElementById('pw-tan').hidden`), "back to held notes");
    await ev(`document.getElementById('pw-drone-go').click()`);
    assert(!(await ev(`PracticeWidgets.drone.running()`)), "drone stops");
    await b.shot("/tmp/cleanup-widget.png", false);
    // ---- a tool page (embed-page header) has them too ----
    await b.goto(B + "/tools/chord-entry.html"); await b.sleep(800);
    assert(await ev(`!!document.querySelector('#pw-nav')`), "widgets on a tool page");

    // ---- Chords and Solfège ----
    await b.goto(B + "/tools/chords-solfege.html"); await b.sleep(800);
    assert.strictEqual(await ev(`document.querySelectorAll('#cs-kb .cs-k').length`), 37, "37 keys");
    await ev(`document.getElementById('cs-do').value = '0'; document.getElementById('cs-do').dispatchEvent(new Event('change'))`);
    const play = async ms => { for (const m of ms) await ev(`__cs.on(${m}, .7)`); };
    const stop = async ms => { for (const m of ms) await ev(`__cs.off(${m})`); };
    await play([57, 60, 64, 67]); let s = await ev(`__cs.state()`);
    assert(/^Am7/.test(s.chord), "Am7: " + s.chord); assert(/vi7/.test(s.sub) || /vi/.test(s.sub), "roman: " + s.sub);
    assert(/La Do Mi So/.test(s.sol), "solfege: " + s.sol);
    await stop([57, 60, 64, 67]);
    s = await ev(`__cs.state()`); assert(/last played/.test(s.sub) && /^Am7/.test(s.chord), "the last chord stays up: " + s.sub);
    await play([55, 59, 62, 65]); s = await ev(`__cs.state()`);
    assert(/^G7/.test(s.chord) && /V7/.test(s.sub), "G7 = V7: " + s.chord + " / " + s.sub); await stop([55, 59, 62, 65]);
    await play([60, 64, 67]); await stop([60, 64, 67]); await play([52, 55, 60]); s = await ev(`__cs.state()`);
    assert(/^C\/E/.test(s.chord) && /first inversion/.test(s.sub), "C/E: " + s.chord + " / " + s.sub); await stop([52, 55, 60]);
    await play([60, 67]); s = await ev(`__cs.state()`); assert(/Perfect 5th/.test(s.chord), "interval: " + s.chord); await stop([60, 67]);
    // Do moves: the same shape in D with Do = D
    await ev(`document.getElementById('cs-do').value = '2'; document.getElementById('cs-do').dispatchEvent(new Event('change'))`);
    await play([62, 66, 69]); s = await ev(`__cs.state()`); assert(/^D/.test(s.chord) && /Do Mi So/.test(s.sol) && /^I/.test(s.sub), "D major in D: " + s.chord + " " + s.sub + " " + s.sol); await stop([62, 66, 69]);
    // scale degrees and Sargam, in place of solfege; the choice is kept for the whole site
    await ev(`document.getElementById('cs-do').value = '0'; document.getElementById('cs-do').dispatchEvent(new Event('change'))`);
    await ev(`DegreeNames.set('degrees')`); await play([57, 60, 64, 67]); s = await ev(`__cs.state()`);
    assert(/6 1 3 5/.test(s.sol) && await ev(`document.querySelectorAll('#cs-sol .dn-d').length`) === 4, "degrees: " + s.sol); assert(/Scale degrees/.test(await ev(`document.getElementById('cs-solth').textContent`)));
    assert.strictEqual(await ev(`document.getElementById('cs-sys').value`), "degrees", "the menu follows");
    await ev(`DegreeNames.set('sargam')`); s = await ev(`__cs.state()`); assert(/Dha Sa Ga Pa/.test(s.sol), "sargam: " + s.sol);
    assert(/Dha/.test(await ev(`document.querySelector('#cs-kb [data-midi="57"] b').textContent`)), "keys relabelled");
    await stop([57, 60, 64, 67]);
    await ev(`document.getElementById('cs-home').value = 'minor'; document.getElementById('cs-do').value = '9'; document.getElementById('cs-do').dispatchEvent(new Event('change'))`);
    await play([57, 60, 64]); s = await ev(`__cs.state()`); assert(/Sa ga Pa/.test(s.sol), "Am in A minor, Sa is home: " + s.sol); await stop([57, 60, 64]);
    await ev(`DegreeNames.set('solfege'); document.getElementById('cs-home').value = 'major'; document.getElementById('cs-do').value = '0'; document.getElementById('cs-do').dispatchEvent(new Event('change'))`);
    // the widget and the other pages read the same choice
    await ev(`localStorage.setItem('degreeNames.system', 'sargam')`);
    await b.goto(B + "/tools/chord-sheet.html"); await b.sleep(900);
    assert.strictEqual(await ev(`document.getElementById('sel-note-sys').value`), "sargam", "Chord Sheet menu follows the choice");
    await ev(`document.getElementById('chk-solfege').click()`);
    await ev(`document.querySelector('#pw-nav .nav-link:nth-child(2)') && 0`);
    await b.goto(B + "/index.html"); await b.sleep(600); await ev(`document.querySelectorAll('#pw-nav .nav-link')[1].click()`);
    assert(/Sa/.test(await ev(`document.querySelectorAll('.pw-pad')[0].textContent`)), "drone pads in Sargam: " + await ev(`document.querySelectorAll('.pw-pad')[0].textContent`));
    await ev(`localStorage.setItem('degreeNames.system', 'degrees')`);
    await b.goto(B + "/tools/circle-of-fifths.html"); await b.sleep(900);
    assert.strictEqual(await ev(`document.getElementById('names-select').value`), "degrees");
    assert(/\(2\)/.test(await ev(`document.querySelector('#mode-select option[value="1"]').textContent`)), "Dorian (2)");
    await ev(`localStorage.removeItem('degreeNames.system')`);
    await b.goto(B + "/tools/chords-solfege.html"); await b.sleep(600);
    // computer keyboard
    await ev(`document.getElementById('cs-do').value = '0'; document.getElementById('cs-do').dispatchEvent(new Event('change'))`);
    const key = async (type, code) => b.send("Input.dispatchKeyEvent", { type, code, key: code.replace("Key", "").toLowerCase(), windowsVirtualKeyCode: 0 });
    await key("keyDown", "KeyZ"); await key("keyDown", "KeyC"); await key("keyDown", "KeyB");     // C3 E3 G3
    s = await ev(`__cs.state()`); assert(/^C/.test(s.chord) && /Do Mi So/.test(s.sol), "typed chord: " + s.chord + " " + s.sol);
    assert.strictEqual(await ev(`document.querySelectorAll('#cs-kb .cs-k.on').length`), 3, "typed keys light up");
    await key("keyUp", "KeyZ"); await key("keyUp", "KeyC"); await key("keyUp", "KeyB");
    assert.strictEqual(await ev(`document.querySelectorAll('#cs-kb .cs-k.on').length`), 0, "typed keys let go");
    await key("keyDown", "ArrowUp"); await key("keyUp", "ArrowUp");
    assert(/C4/.test(await ev(`document.getElementById('cs-oct-lab').textContent`)), "octave up from the keyboard");
    await b.shot("/tmp/cleanup-chords.png", false);
    await b.resize(390, 800); await b.sleep(300); await b.shot("/tmp/cleanup-chords-phone.png", false); await b.resize(1280, 900);

    // ---- Chord Entry: musical typing, melody ----
    await b.goto(B + "/tools/chord-entry.html"); await b.sleep(800);
    assert(await ev(`document.getElementById('ce-type').checked`), "typing is on");
    await ev(`(function(){ var m = document.getElementById('ce-mode'); m.value = 'step'; m.dispatchEvent(new Event('change')); })()`);
    await key("keyDown", "KeyZ"); await key("keyDown", "KeyC"); await key("keyDown", "KeyB");
    await key("keyUp", "KeyZ"); await key("keyUp", "KeyC"); await key("keyUp", "KeyB"); await b.sleep(150);
    const g = await ev(`JSON.stringify(__entry.grid().bars())`); assert(/"C"/.test(g), "typed C major into the chart: " + g);
    // off: nothing happens
    await ev(`document.getElementById('ce-type').click()`);
    await key("keyDown", "KeyZ"); await key("keyUp", "KeyZ");
    // a text box keeps its letters
    await ev(`document.getElementById('ce-type').click(); document.getElementById('ce-title').focus()`);
    const before = await ev(`document.getElementById('ce-heard').textContent`);
    await key("keyDown", "KeyZ"); await key("keyUp", "KeyZ");
    assert.strictEqual(await ev(`document.getElementById('ce-heard').textContent`), before, "typing into the title does not play");
    await b.shot("/tmp/cleanup-entry.png", false);
    // ---- the circle of fifths: the page, the navbar widget, and a lesson ----
    await b.goto(B + "/tools/circle-of-fifths.html"); await b.sleep(900);
    const geo = JSON.parse(await ev(`JSON.stringify(__cof.geometry())`));
    const click = async (ring, i) => {   // click the middle of a ring's wedge number i (clockwise from the top, as the wheel is laid out)
      const mid = (geo[ring].o + geo[ring].i) / 2, a = -Math.PI / 2 + i * Math.PI / 6;
      await ev(`(function(){ var c = __cof.canvas, r = c.getBoundingClientRect(), s = r.width / 490; c.dispatchEvent(new MouseEvent('click', { clientX: r.left + (245 + ${mid} * Math.cos(${a})) * s, clientY: r.top + (245 + ${mid} * Math.sin(${a})) * s, bubbles: true })); })()`);
    };
    assert.strictEqual(await ev(`__cof.state().keyNote`), "C", "starts on C");
    await click("notes", 1);                                                       // G
    assert.strictEqual(await ev(`__cof.state().keyNote`), "G", "click the notes ring: key G"); assert.strictEqual(await ev(`__cof.state().keySig`), 1);
    assert.strictEqual(await ev(`Tonality.getResting()`), 7, "the shared key follows");
    await click("syllables", 5);                                                   // C's 'la' step: Dorian? (the 6th degree of G major is E) -> a minor mode
    assert(await ev(`__cof.state().mode`) !== 0, "click the syllables ring: mode changes");
    await ev(`document.querySelector('#cof-host .cof-foot button').click()`);
    assert.strictEqual(await ev(`__cof.state().mode`), 0, "undo puts the mode back");
    await ev(`document.querySelector('#cof-host .cof-foot button').click()`);
    assert.strictEqual(await ev(`__cof.state().keyNote`), "C", "undo puts the key back"); assert.strictEqual(await ev(`Tonality.getResting()`), 0, "and the shared key");
    await ev(`document.getElementById('keysig-select').value = '-2'; document.getElementById('keysig-select').dispatchEvent(new Event('change'))`);
    assert.strictEqual(await ev(`__cof.state().keyNote`), "B\u266d", "sharps/flats menu: 2 flats is B-flat major");
    await ev(`document.getElementById('cofView').value = '2'; document.getElementById('cofView').dispatchEvent(new Event('change'))`);
    assert.strictEqual(await ev(`__cof.state().keyNote`), "C", "transposition lens shows the written key (B-flat instrument reads C)");
    await b.shot("/tmp/cleanup-circle.png", false);
    await ev(`localStorage.clear()`);

    // the navbar widget, on a lesson page with a Key menu: it moves the lesson, and Undo moves it back
    await b.goto(B + "/lessons/pop-changes.html"); await b.sleep(1500);
    assert(await ev(`!!document.getElementById('bl-key')`), "the lesson has a Key menu");
    const was = +await ev(`document.getElementById('bl-key').value`);
    await ev(`document.querySelectorAll('#pw-nav .nav-link')[2].click()`); await b.sleep(900);
    assert(await ev(`!!window.PracticeWidgets.circle()`), "circle mounted");
    assert.strictEqual(await ev(`PracticeWidgets.circle().state().root`), was, "it starts on the lesson's key");
    const to = (was + 7) % 12;
    await ev(`PracticeWidgets.circle().set({ root: ${to} }, 'click')`);
    assert.strictEqual(+await ev(`document.getElementById('bl-key').value`), to, "the circle changed the lesson's key");
    await ev(`document.querySelector('#pw-circle .cof-foot button').click()`);
    assert.strictEqual(+await ev(`document.getElementById('bl-key').value`), was, "Undo put the lesson's key back");
    // a circle placed in the page by its author, showing what they chose
    await ev(`(function(){ var d = document.createElement('div'); d.id = 'mine'; d.className = 'cof-widget'; d.dataset.rings = 'roman,syllables'; d.dataset.keysig = 'false'; d.dataset.picker = 'key,mode'; d.dataset.change = ''; d.dataset.size = '300'; d.dataset.root = '2'; d.dataset.mode = 'dorian'; document.body.insertBefore(d, document.body.firstChild); CircleOfFifths.auto(); })()`);
    assert.strictEqual(await ev(`document.querySelectorAll('#mine .cof-f').length`), 2, "two menus");
    assert.strictEqual(await ev(`document.querySelector('#mine .cof-foot').hidden`), true, "no undo when nothing can be changed on the wheel");
    assert.strictEqual(await ev(`document.getElementById('mine').style.maxWidth`), "300px");
    await ev(`document.getElementById('mine').scrollIntoView()`); await b.shot("/tmp/cleanup-circle-lesson.png", false);

    assert.deepStrictEqual(b.errors.filter(e => !/net::|sf\/|supabaseUrl/.test(e)), [], "no page errors");
    console.log("CLEANUP OK");
  } catch (e) { console.log("FAIL", e.message); console.log(b.errors.slice(0, 8)); process.exitCode = 1; }
  await b.close();
})();
