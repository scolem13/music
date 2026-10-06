const fs = require("fs"), vm = require("vm"), assert = require("assert"), path = require("path");
const { open, clipShot, wait } = require("./lib.js");
vm.runInThisContext(fs.readFileSync("/Users/sean.coleman/Projects/everything-music-site/apps/shared/voicings.js", "utf8"));
const CV = ChordVoicings, mod12 = n => ((n % 12) + 12) % 12;
const SHOTS = path.join(__dirname, "shots"); fs.mkdirSync(SHOTS, { recursive: true });
const PROGS = ["Dm7 G7 Cmaj7 A7", "F7 Bb7 Bdim7 Am7b5 D7b9"];
const R = { checks: 0, notes: [], styles: {}, unavail: {}, errors: [] };
const ok = (c, msg) => { R.checks++; if (!c) { R.notes.push("FAIL: " + msg); console.log("FAIL:", msg); } };
const J = x => JSON.stringify(x);

(async () => {
  const b = await open({ width: 1300, height: 900 });
  const only = process.argv[2] || "all", want = s => only === "all" || only === s;
  try {
    // ---------- menus ----------
    await b.eval(`__t.setChords(${J(PROGS[0])}); __t.enable('guitar', true)`); await wait(500);
    const kbMenu = await b.eval("__t.styles('keyboard')"), gMenu = await b.eval("__t.styles('guitar')");
    R.styles.keyboard = kbMenu.map(s => s.id + "=" + s.label); R.styles.guitar = gMenu.map(s => s.id + "=" + s.label + (s.group ? " [" + s.group + "]" : ""));
    ok(kbMenu.map(s => s.id).join() === CV.styles("piano").map(s => s.id).join(), "keyboard menu = registry");
    ok(kbMenu.map(s => s.label).join() === CV.styles("piano").map(s => s.label).join(), "keyboard labels = registry");
    ok(gMenu.map(s => s.id).join() === "standard,shell,drop2,drop3,set3:all,set3:0,set3:1,set3:2,set3:3", "guitar menu " + gMenu.map(s => s.id));
    ok(gMenu[0].label === "Standard" && gMenu[1].label === "Shell (R-3-7)" && gMenu[2].label === "Drop 2", "guitar labels");

    // ---------- every menu item renders ----------
    if (want("all") || want("menus")) for (const prog of PROGS){
      await b.eval(`__t.setChords(${J(prog)})`); await wait(400);
      const n = prog.split(" ").length;
      for (const st of kbMenu){
        ok(await b.eval(`__t.setStyle('keyboard','${st.id}')`), "set kb " + st.id); await wait(250);
        const cards = await b.eval("__t.cards('Keyboard')");
        ok(cards.length === n, `kb ${st.id} ${prog}: ${cards.length} cards`);
        cards.forEach((c, i) => { ok(!c.unavail && c.midis && c.midis.length >= 2, `kb ${st.id} ${prog}[${i}] drawn`); ok(c.labels.length >= c.midis.length, "markers"); });
        const sw = await b.eval("__t.sweep('Keyboard')");
        sw.forEach((o, i) => { ok(o.length >= 1 && o.every(m => m && m.length >= 2 && m.every((x, k) => k === 0 || x > m[k-1])), `kb ${st.id} sweep ${i} ascending`); });
        if (st.id === "rootless" || st.id === "guide") sw.forEach((o, i) => o.forEach(m => ok(m[0] >= 48 && m[m.length-1] <= 77, `kb ${st.id} register ${m}`)));
        R.styles["kb-sweep:" + st.id] = (R.styles["kb-sweep:" + st.id] || 0) + sw.reduce((a, o) => a + o.length, 0);
      }
      await b.eval("__t.setStyle('keyboard','standard')");
      for (const st of gMenu){
        ok(await b.eval(`__t.setStyle('guitar','${st.id}')`), "set guitar " + st.id); await wait(250);
        const cards = await b.eval("__t.cards('Guitar')");
        ok(cards.length === n, `guitar ${st.id}: ${cards.length} cards`);
        const un = cards.filter(c => c.unavail).length; R.unavail[st.id] = (R.unavail[st.id] || 0) + un;
        cards.forEach(c => { if (!c.unavail) ok(c.midis.length >= 2, "guitar notes"); });
      }
      await b.eval("__t.setStyle('guitar','standard')");
    }
    R.errorsAfterMenus = b.errors.slice();

    // ---------- notation ----------
    if (want("all") || want("notation")) {
      await b.eval(`__t.setChords(${J(PROGS[0])}); __t.setStyle('keyboard','rootless'); __t.setStyle('guitar','drop2')`); await wait(500);
      ok(await b.eval("document.querySelectorAll('.notation-wrap').length") === 0, "no notation wraps while off");
      ok(await b.eval("!window.ABCJS"), "abcjs not loaded while notation has never been on");
      await b.eval("__t.check('chk-notation', true)"); await wait(1800);
      ok(await b.eval("!!window.ABCJS"), "abcjs loaded lazily");
      for (const name of ["Keyboard", "Guitar"]){
        const cards = await b.eval(`__t.cards('${name}')`), nt = await b.eval(`__t.notation('${name}')`);
        ok(nt.length === 4 && nt.every(n => n.svg), `${name}: one notation SVG per card ${J(nt.map(n => n.svg))}`);
        nt.forEach((n, i) => ok(n.heads === cards[i].midis.length, `${name} card ${i}: ${n.heads} noteheads vs ${cards[i].midis.length} notes`));
        nt.forEach(n => ok(n.w <= n.cardW, `${name}: notation fits its card (${n.w} <= ${n.cardW})`));
        if (name === "Guitar") ok(nt.every(n => /8va/.test(n.cap)), "guitar caption mentions 8va");
      }
      // updates with the picker
      const before = await b.eval("__t.notation('Keyboard')[0].sig"); await b.eval("__t.pick('Keyboard',0,1)"); await wait(300);
      const after = await b.eval("__t.notation('Keyboard')[0].sig"); ok(before !== after, "notation changes with the picker");
      // and with the style and voice leading
      const s1 = await b.eval("J=JSON.stringify(__t.notation('Keyboard').map(n=>n.sig))"); await b.eval("__t.setStyle('keyboard','guide')"); await wait(500);
      const s2 = await b.eval("JSON.stringify(__t.notation('Keyboard').map(n=>n.sig))"); ok(s1 !== s2, "notation changes with the style");
      const gc = await b.eval("__t.cards('Keyboard')"), gn = await b.eval("__t.notation('Keyboard')");
      gn.forEach((n, i) => ok(n.heads === gc[i].midis.length && gc[i].midis.length === 2, "guide tones: two noteheads"));
      await b.eval("__t.setStyle('keyboard','rootless'); __t.check('chk-voice-leading', true)"); await wait(600);
      const vc = await b.eval("__t.cards('Keyboard')"), vn = await b.eval("__t.notation('Keyboard')");
      vn.forEach((n, i) => ok(n.heads === vc[i].midis.length, "voice-led notation matches notes"));
      R.voiceLedRootless = vc.map(c => c.midis.join("."));
      await b.eval("__t.check('chk-voice-leading', false)"); await wait(300);
      // print: only when on
      await b.send("Emulation.setEmulatedMedia", { media: "print" });
      R.printOn = await b.eval("[...document.querySelectorAll('.notation-wrap')].map(w=>getComputedStyle(w).display).join()");
      ok(!/none/.test(R.printOn), "notation prints when switched on");
      await b.eval("__t.check('chk-notation', false)"); await wait(400);
      R.printOff = await b.eval("document.querySelectorAll('.notation-wrap').length + ':' + document.querySelectorAll('.notation-wrap svg').length");
      ok(R.printOff === "0:0", "no notation elements in print when off: " + R.printOff);
      await b.send("Emulation.setEmulatedMedia", { media: "" });
      // screenshots
      await b.eval("__t.check('chk-notation', true); __t.enable('guitar', false); __t.setStyle('keyboard','rootless')"); await wait(900);
      await clipShot(b, path.join(SHOTS, "keyboard-rootless-notation.png"), "#sheet-output");
      await b.eval("__t.enable('guitar', true); __t.enable('keyboard', false)"); await wait(900);
      await clipShot(b, path.join(SHOTS, "guitar-drop2-notation.png"), "#sheet-output");
      await b.eval("__t.enable('keyboard', true); __t.check('chk-notation', false)");
    }

    // ---------- roman numerals ----------
    if (want("all") || want("roman")) {
      await b.eval(`__t.setChords(${J(PROGS[0])}); __t.setKey(0)`); await wait(400);
      await b.eval("__t.select('sel-chord-display','roman')"); await wait(400);
      R.romanTitles = await b.eval("__t.titles()"); R.romanChips = await b.eval("__t.chips()");
      ok(J(R.romanChips) === J(["ii7", "V7", "Imaj7", "VI7"]), "roman chips " + J(R.romanChips));
      ok(R.romanTitles.slice(0, 4).join() === "ii7,V7,Imaj7,VI7", "roman titles " + J(R.romanTitles));
      await b.eval("__t.select('sel-chord-display','both')"); await wait(400);
      R.bothTitles = await b.eval("__t.titles()"); R.bothChips = await b.eval("__t.chips()");
      ok(J(R.bothChips) === J(["Dm7 · ii7", "G7 · V7", "Cmaj7 · Imaj7", "A7 · VI7"]), "both chips " + J(R.bothChips));
      ok(R.bothTitles.slice(0, 4).join() === "Dm7 · ii7,G7 · V7,Cmaj7 · Imaj7,A7 · VI7", "both titles");
      await clipShot(b, path.join(SHOTS, "roman-both.png"), "#chord-sheet-root");
      await b.eval("__t.setKey(2)"); await wait(400);   // key of D: the same chords read differently
      R.romanInD = await b.eval("__t.chips()"); ok(J(R.romanInD) === J(["Dm7 · iim7".replace("iim7", "i7"), "G7 · IV7", "Cmaj7 · bVIImaj7", "A7 · V7"]), "roman in D " + J(R.romanInD));
      await b.eval("__t.setKey(0); __t.select('sel-chord-display','letters')"); await wait(300);
      ok(J(await b.eval("__t.chips()")) === J(["Dm7", "G7", "Cmaj7", "A7"]), "letters again");
      // every chord kind gets a numeral
      await b.eval(`__t.setChords("C Cm C5 Csus2 Csus4 C6 Cm6 C7 Cmaj7 Cm7 Cadd9 Cm(add9) C9 Cmaj9 Cm9 C11 Cm11 C13 Cmaj13 Cm13 C7sus4 C7b9 C7#9 C7b5 C7#5 C7b13 C7alt Cdim Cdim7 Cm7b5 Caug C+7 C+maj7 Cm(maj7) F#7 Bbmaj7"); __t.select('sel-chord-display','roman')`); await wait(500);
      R.romanKinds = await b.eval("__t.chips()"); ok(R.romanKinds.length === 36 && R.romanKinds.every(x => /^[b#]*[ivIV]+/.test(x)), "roman kinds " + J(R.romanKinds));
      await b.eval("__t.select('sel-chord-display','letters')");
    }

    // ---------- Play with the band ----------
    if (want("all") || want("band")) {
      await b.eval(`__t.setChords("F7 Bb7 Bdim7 Am7b5 D7b9 Cmaj7"); __t.setKey(5); __t.setStyle('keyboard','rootless'); document.getElementById('inp-title').value='Blues Test'; document.getElementById('inp-title').dispatchEvent(new Event('input'))`); await wait(500);
      await b.eval("__t.pick('Keyboard',1,1)"); await wait(300);           // a manual picker choice
      await b.eval("document.querySelectorAll('#sheet-output .diagram-card')[2].querySelector('.note-marker')&&0"); await wait(100);
      const shown = await b.eval("__t.cards('Keyboard').map(c=>c.midis)");
      await b.eval("document.getElementById('btn-band').click()"); await wait(1200);
      const url = await b.eval("location.href"); ok(/\/tools\/backing-track\.html\?from=chord-sheet$/.test(url), "navigates to the backing track: " + url);
      const h = JSON.parse(await b.eval("localStorage.getItem('bandHandoff')"));
      R.handoff = h;
      ok(h.v === 1 && h.from === "chord-sheet" && Math.abs(Date.now() - h.at) < 15000, "handoff envelope");
      ok(h.comp === "piano" && h.voicing === "rootless", "comp/voicing " + h.comp + "/" + h.voicing);
      ok(/^X:1\nT:Blues Test\nM:4\/4\nL:1\/4\nK:F\n"F7"z4 \| "Bb7"z4 \| "Bdim7"z4 \| "Am7b5"z4 \|\n"D7b9"z4 \| "Cmaj7"z4 \|\]\n$/.test(h.abc), "abc text: " + J(h.abc));
      ok(h.pins.length === 6 && h.pins.every((p, i) => p.bar === i && p.pos === 0 && Array.isArray(p.midis) && p.midis.length >= 2), "pins shape");
      ok(h.pins.every((p, i) => p.midis.join() === shown[i].join()), "pins = notes shown " + J(h.pins.map(p => p.midis)) + " vs " + J(shown));
      ok(h.pins.map(p => p.sym).join() === "F7,Bb7,Bdim7,Am7b5,D7b9,Cmaj7", "pin syms");
      // guitar-first and no-instrument variants
      await b.goto(require("./lib.js").BASE); await b.eval(fs.readFileSync(path.join(__dirname, "helpers.js"), "utf8"));
      await b.eval(`localStorage.removeItem('bandHandoff'); __t.setChords("Dm7 G7 Cmaj7"); __t.enable('keyboard', false); __t.enable('guitar', true); __t.setStyle('guitar','set3:1')`); await wait(500);
      const g = await b.eval("__t.cards('Guitar').map(c=>c.midis)");
      await b.eval("document.getElementById('btn-band').click()"); await wait(1000);
      const h2 = JSON.parse(await b.eval("localStorage.getItem('bandHandoff')"));
      ok(h2.comp === "guitar" && h2.voicing === "shell3" && h2.pins.length === 3 && h2.pins.every((p, i) => p.midis.join() === g[i].join()), "guitar pins " + J(h2));
      ok(/K:C\n/.test(h2.abc) && /"Dm7"z4 \| "G7"z4 \| "Cmaj7"z4 \|\]/.test(h2.abc), "guitar abc " + J(h2.abc));
      await b.goto(require("./lib.js").BASE); await b.eval(fs.readFileSync(path.join(__dirname, "helpers.js"), "utf8"));
      await b.eval(`localStorage.removeItem('bandHandoff'); __t.setChords("Dm7 G7"); __t.enable('keyboard', false); __t.enable('guitar', false); __t.enable('bass', true)`); await wait(400);
      await b.eval("document.getElementById('btn-band').click()"); await wait(1000);
      const h3 = JSON.parse(await b.eval("localStorage.getItem('bandHandoff')")); ok(h3.pins.length === 0 && /"Dm7"z4/.test(h3.abc), "no pins without keyboard/guitar");
      R.handoffGuitar = h2; R.handoffNone = { pins: h3.pins.length };
    }

    // ---------- As played ----------
    if (want("all") || want("played")) {
      const base = require("./lib.js").BASE;
      const kbChords = [["Dm7", [53, 57, 60, 64]], ["G7", [59, 64, 65, 69]], ["Cmaj7", [52, 55, 59, 62]], ["A7", [49, 54, 55, 59]], ["Bb7/F", [53, 58, 62, 64]]];
      const mk = (comp, voicing, chords, at) => ({ v: 1, from: "backing-track", at: at == null ? Date.now() : at, key: "C", comp, voicing, chords: chords.map(([sym, midis]) => ({ sym, midis })) });
      async function load(h, q) {
        await b.goto(base); await b.eval("localStorage.clear()");
        await b.eval(`localStorage.setItem('bandHandoff', ${J(JSON.stringify(h))})`);
        await b.goto(base.replace("chord-sheet.html", "chord-sheet.html") + (q || "?from=backing-track")); await b.eval(fs.readFileSync(path.join(__dirname, "helpers.js"), "utf8")); await wait(900);
      }
      await load(mk("piano", "rootless", kbChords));
      const cards = await b.eval("__t.cards('Keyboard')");
      ok(cards.length === 5, "as played: 5 cards"); cards.forEach((c, i) => { ok(c.midis.join() === kbChords[i][1].join(), `as played kb ${i}: ${c.midis} vs ${kbChords[i][1]}`); ok(c.options.join() === "As played", "label " + c.options); });
      ok(await b.eval("localStorage.getItem('bandHandoff')") === null, "handoff removed after use");
      ok((await b.eval("__t.styles('keyboard')"))[0].label === "As played", "As played in the menu");
      ok(await b.eval("document.getElementById('sel-key').value") === "0", "key set to C");
      R.playedChips = await b.eval("__t.chips()"); R.playedInstr = await b.eval("[...document.querySelectorAll('[data-inst-id]')].filter(c=>c.checked).map(c=>c.dataset.instId).join()");
      await clipShot(b, path.join(SHOTS, "as-played-keyboard.png"), "#chord-sheet-root");
      // switching away works, and back
      await b.eval("__t.setStyle('keyboard','drop2')"); await wait(400);
      const d2 = await b.eval("__t.cards('Keyboard')"); ok(d2.every(c => c.options.length >= 3 && c.options[0] !== "As played"), "switch away from As played");
      await b.eval("__t.setStyle('keyboard','played')"); await wait(400);
      ok((await b.eval("__t.cards('Keyboard')"))[1].midis.join() === "59,64,65,69", "switch back to As played");
      // notation of the played voicing
      await b.eval("__t.check('chk-notation', true)"); await wait(1500);
      const nt = await b.eval("__t.notation('Keyboard')"); nt.forEach((n, i) => ok(n.heads === kbChords[i][1].length, "played notation heads " + n.heads));
      await b.eval("__t.check('chk-notation', false)");
      // guitar: a library shape (exact match) and an arbitrary shape (lowest-fret fallback)
      const gd2 = CV.guitar({ root: 2, intervals: [0,3,7,10] }, "drop2", { allPositions: true }).find(v => v.midis[0] >= 45).midis;
      const gset = CV.guitar({ root: 7, intervals: [0,4,7,10] }, "shell3", { allPositions: true })[0].midis;
      const gchords = [["Dm7", gd2], ["G7", gset], ["Cmaj7", [48, 52, 55, 59]], ["Am", [57, 64, 69, 72]]];
      await load(mk("guitar", "drop2", gchords));
      const gc = await b.eval("__t.cards('Guitar')");
      ok(gc.length === 4, "guitar played cards"); gc.forEach((c, i) => { ok(!c.unavail && c.midis.join() === gchords[i][1].join(), `as played guitar ${i}: ${c.midis} vs ${gchords[i][1]}`); ok(c.options.join() === "As played", "guitar label"); });
      R.playedGuitarInstr = await b.eval("[...document.querySelectorAll('[data-inst-id]')].filter(c=>c.checked).map(c=>c.dataset.instId).join()");
      ok(R.playedGuitarInstr === "guitar", "only guitar enabled " + R.playedGuitarInstr);
      ok(await b.eval("[...document.querySelectorAll('#instrument-list select')].some(s=>s.value==='guitar-standard')"), "standard tuning");
      await b.eval("__t.check('chk-notation', true)"); await wait(1500);
      await clipShot(b, path.join(SHOTS, "as-played-guitar.png"), "#chord-sheet-root");
      await b.eval("__t.check('chk-notation', false)");
      await b.eval("__t.setStyle('guitar','drop2')"); await wait(400);
      ok((await b.eval("__t.cards('Guitar')")).every(c => c.options[0] !== "As played"), "guitar switch away");
      // stale / wrong hand-offs are ignored
      await load(mk("piano", "rootless", kbChords, Date.now() - 3600e3));
      ok((await b.eval("__t.cards('Keyboard')")).length === 0 && /too old/.test(await b.eval("document.getElementById('handoff-note').textContent")), "stale hand-off ignored");
      await load(Object.assign(mk("piano", "rootless", kbChords), { from: "chord-sheet" }));
      ok((await b.eval("__t.cards('Keyboard')")).length === 0 && await b.eval("localStorage.getItem('bandHandoff')") !== null, "a chord-sheet hand-off is left alone");
      await load(mk("piano", "rootless", kbChords), "?x=1");     // no ?from= -> not consumed
      ok(await b.eval("localStorage.getItem('bandHandoff')") !== null && (await b.eval("__t.cards('Keyboard')")).length === 0, "needs ?from=backing-track");
    }

    // ---------- phone width ----------
    if (want("all") || want("mobile")) {
      await b.goto(require("./lib.js").BASE); await b.eval(fs.readFileSync(path.join(__dirname, "helpers.js"), "utf8"));
      await b.resize(390, 800);
      await b.eval(`localStorage.clear(); __t.setChords(${J(PROGS[0])}); __t.enable('guitar', true); __t.setStyle('keyboard','rootless'); __t.setStyle('guitar','drop2'); __t.check('chk-notation', true); __t.select('sel-chord-display','both')`); await wait(1800);
      R.mobile = await b.eval("({sw:document.documentElement.scrollWidth, iw:innerWidth, cards:[...document.querySelectorAll('.diagram-card')].filter(c=>c.getBoundingClientRect().right>innerWidth+1).length, notationOver:[...document.querySelectorAll('.notation-wrap')].filter(w=>w.getBoundingClientRect().right>w.parentNode.getBoundingClientRect().right+1).length})");
      ok(R.mobile.sw <= R.mobile.iw + 1, "no horizontal scroll at 390px " + J(R.mobile)); ok(R.mobile.notationOver === 0, "notation inside cards");
      await clipShot(b, path.join(SHOTS, "mobile-390.png"), "#sheet-output");
      await b.resize(1300, 900);
    }
    R.errors = b.errors.filter(e => !/supabase/i.test(e));
  } finally { await b.close(); }
  console.log(JSON.stringify(R, null, 1).slice(0, 6000));
  console.log("CHECKS", R.checks, "FAILS", R.notes.length, "ERRORS", R.errors.length);
})().catch(e => { console.error(e); process.exit(1); });
