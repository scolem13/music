// The Theory Drills (theory/theory-drills.qmd, apps/shared/drills/drills.js) in headless Chrome: hundreds of generated
// questions are checked against abcjs's own reading of the drawn ABC (the note's pitch, the interval's size, the signature's
// sharps or flats), the link's settings load and a student's change is kept for that link only, keys and MIDI-style answers
// are graded, lock=1 hides the settings, and count=N ends with a score. Run after rendering:
//   quarto render theory/theory-drills.qmd; node tests/lessons/drills.cdp.js
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), SITE = ROOT + "/_site", { launch } = require(ROOT + "/tests/band/lead/cdp.js");
const type = f => f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html";
const PORT = 8536;
const srv = http.createServer((q, s) => { const f = path.join(SITE, decodeURIComponent(q.url.split(/[?#]/)[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": type(f) }); s.end(d); }); }).listen(PORT);
const URL = q => `http://127.0.0.1:${PORT}/theory/theory-drills.html${q}`;
(async () => {
  const b = await launch();
  let fails = 0; const check = (name, ok, info) => { console.log((ok ? "ok   " : "FAIL ") + name + (info !== undefined ? "  " + info : "")); if (!ok) fails++; };
  const ev = e => b.eval(e), errs = () => b.errors.filter(e => !/supabase|createClient|soundfont|fetch|load sound|favicon|sounds/i.test(e));
  await b.goto(URL("?ex=note")); await b.sleep(800);
  await ev(`localStorage.clear()`);

  // generated questions against abcjs's reading of them
  const gen = await ev(`(() => { const D = Drills, bad = [];
    const midis = abc => { const v = ABCJS.renderAbc(document.createElement('div'), abc)[0], out = [];
      v.setUpAudio().tracks.forEach(t => t.forEach(e => { if (e.cmd === 'note') out.push(e.pitch); })); return out; };
    const N = D.engines.note, sN = D.parseSettings('note', 'clef=treble,bass,alto,tenor&ledger=3&acc=double');
    for (let i = 0; i < 300; i++) { const q = N.make(sN), m = midis(q.abc); if (m[0] !== q.play[0]) bad.push('note ' + q.abc.split('\\n').pop() + ' ' + m + ' vs ' + q.play); }
    const I = D.engines.interval, sI = D.parseSettings('interval', 'ints=m2,M2,m3,M3,P4,A4,d5,P5,m6,M6,m7,M7,P8&clef=treble,bass,alto,tenor&start=any&dir=both&shape=both');
    const SEM = { m2:1,M2:2,m3:3,M3:4,P4:5,A4:6,d5:6,P5:7,m6:8,M6:9,m7:10,M7:11,P8:12 };
    for (let i = 0; i < 400; i++) { const q = I.make(sI), m = midis(q.abc); if (Math.abs(m[1] - m[0]) !== SEM[q.answer]) bad.push('int ' + q.answer + ' ' + q.abc.split('\\n').slice(-2).join(' ') + ' ' + m); }
    const K = D.engines.keysig, sK = D.parseSettings('keysig', 'mode=both&kinds=both&most=7&clef=treble,bass,alto,tenor');
    for (let i = 0; i < 200; i++) { const q = K.make(sK), v = ABCJS.renderAbc(document.createElement('div'), q.abc)[0], ks = v.getKeySignature();
      const n = (ks.accidentals || []).length, kind = n ? ks.accidentals[0].acc : '', want = K.counts(sK);
      const name = q.answer, maj = q.mode === 'major';
      const ref = maj ? {'C♭':-7,'G♭':-6,'D♭':-5,'A♭':-4,'E♭':-3,'B♭':-2,F:-1,C:0,G:1,D:2,A:3,E:4,B:5,'F♯':6,'C♯':7} : {'A♭':-7,'E♭':-6,'B♭':-5,F:-4,C:-3,G:-2,D:-1,A:0,E:1,B:2,'F♯':3,'C♯':4,'G♯':5,'D♯':6,'A♯':7};
      const k = ref[name.split(' ')[0]], got = kind === 'flat' ? -n : n;
      if (k !== got) bad.push('key ' + name + ' drawn ' + got); }
    return bad; })()`);
  check("300 notes, 400 intervals, 200 signatures: drawn = answer", gen.length === 0, gen.slice(0, 5).join(" | "));

  // settings from the link; a student's change kept for that link only
  await b.goto(URL("?ex=interval&ints=m3,M3&clef=bass&count=3")); await b.sleep(800);
  const s1 = await ev(`(() => { const d = document.querySelector('.drill'); return [document.querySelectorAll('.dr-ans').length, d._drill.question().clef, d._drill.settings().count]; })()`);
  check("link settings load (two intervals, bass clef, 3 questions)", s1[0] === 2 && s1[1] === "bass" && s1[2] === 3, JSON.stringify(s1));
  await ev(`(() => { const c = [...document.querySelectorAll('.dr-opt')].find(l => /perfect 5th/.test(l.textContent)).querySelector('input'); c.checked = true; c.dispatchEvent(new Event('change')); })()`);
  await b.goto(URL("?ex=interval&ints=m3,M3&clef=bass&count=3")); await b.sleep(800);
  const s2 = await ev(`document.querySelectorAll('.dr-ans').length`);
  await b.goto(URL("?ex=interval&ints=m3,P4&clef=bass")); await b.sleep(800);
  const s3 = await ev(`document.querySelectorAll('.dr-ans').length + '|' + [...document.querySelectorAll('.dr-ans')].map(x => x.textContent).join(',')`);
  check("student's change kept for the same link, not for another", s2 === 3 && s3 === "2|m3,P4", s2 + " / " + s3);

  // answering: buttons, keys, count -> score (the student's settings from above cleared first)
  await ev(`localStorage.clear()`);
  await b.goto(URL("?ex=interval&ints=m3,M3&clef=bass&count=3")); await b.sleep(800);
  const fin = await ev(`(async () => { const d = document.querySelector('.drill'), w = ms => new Promise(r => setTimeout(r, ms));
    d.querySelector('.dr-ans[data-a="' + d.getAttribute('data-answer') + '"]').click(); await w(1100);
    const a = d.getAttribute('data-answer'), wrong = a === 'm3' ? 'M3' : 'm3';
    d.querySelector('.dr-ans[data-a="' + wrong + '"]').click(); await w(100); const fb = d.querySelector('.dr-fb').textContent;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); await w(100);
    const k = d.getAttribute('data-answer');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: k[0] })); document.dispatchEvent(new KeyboardEvent('keydown', { key: k[1] })); await w(1100);
    return [d.getAttribute('data-done'), d.getAttribute('data-right'), fb, d.getAttribute('data-finished'), (d.querySelector('.dr-endtext') || {}).textContent]; })()`);
  check("right, wrong (told the answer), typed m3/M3; 3 questions -> score", fin[0] === "3" && fin[1] === "2" && /^No: .*It's (minor|major) 3rd/.test(fin[2]) && fin[3] === "1" && /2 of 3 \(67%\)/.test(fin[4]), JSON.stringify(fin));

  // keys for notes with accidentals, and the MIDI matcher
  await b.goto(URL("?ex=note&acc=both")); await b.sleep(800);
  const kn = await ev(`(async () => { const d = document.querySelector('.drill'), a = d.getAttribute('data-answer'), w = ms => new Promise(r => setTimeout(r, ms));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: a[0].toLowerCase() }));
    if (a[1] === '♯') document.dispatchEvent(new KeyboardEvent('keydown', { key: '#' })); if (a[1] === '♭') document.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); await w(50); return d.getAttribute('data-right'); })()`);
  check("note with accidentals typed: letter, # or -, Enter", kn === "1", kn);
  const mm = await ev(`(() => { const E = Drills.engines;
    const qi = { semis: 7 }, qk = { tonicPc: 2, mode: 'minor' }, qn = { play: [61] };
    return [E.interval.midiMatch(qi, [60, 67]), E.interval.midiMatch(qi, [67, 60]), E.interval.midiMatch(qi, [60, 66]),
      E.keysig.midiMatch(qk, [62, 65, 69]), E.keysig.midiMatch(qk, [62, 66, 69]), E.keysig.midiMatch(qk, [50]), E.note.midiMatch(qn, [73])].join(','); })()`);
  check("MIDI: P5 either order, not a tritone; D minor triad, not D major; tonic alone; note in any octave", mm === "true,true,false,true,false,true,true", mm);

  // triads (Hutchinson ch. 6): drawn chord = answer, close and spread; the book's own answers parse and grade; spelling and correction
  const tri = await ev(`(() => { const D = Drills, E = D.engines, bad = [];
    const pit = abc => { const v = ABCJS.renderAbc(document.createElement('div'), abc)[0], out = [];
      v.setUpAudio().tracks.forEach(t => t.forEach(e => { if (e.cmd === 'note') out.push(e.pitch); })); return out; };
    for (const voicing of ['close', 'spread']) {
      const s = D.parseSettings('triad', 'quals=maj,min,dim,aug,sus2,sus4&roots=any&inv=all&voicing=' + voicing + '&clef=treble,bass&doubles=yes');
      for (let i = 0; i < 250; i++) { const q = E.triad.make(s), m = pit(q.abc), pcs = [...new Set(m.map(x => x % 12))].sort().join(), want = [...new Set(q.pcs)].sort().join();
        if (pcs !== want || Math.min(...m) % 12 !== q.bassPc) bad.push(voicing + ' ' + q.answer + ' drawn ' + m);
        if (!E.triad.check(q, q.answer)) bad.push('own answer refused ' + q.answer); } }
    const ex = [['A#°', 'A♯', 'dim', null], ['Fsus4', 'F', 'sus4', null], ['Bb+', 'B♭', 'aug', null], ['Db', 'D♭', 'maj', null], ['E sus2', 'E', 'sus2', null],
      ['Dm/F', 'D', 'min', 'F'], ['Gm/D', 'G', 'min', 'D'], ['A#°/C#', 'A♯', 'dim', 'C♯'], ['F/A', 'F', 'maj', 'A'], ['Bb/F', 'B♭', 'maj', 'F'], ['Cm/G', 'C', 'min', 'G'], ['Fsus9', 'F', 'sus2', null], ['Co', 'C', 'dim', null]];
    const nm = n => 'CDEFGAB'[n.l] + ({'-1':'♭','0':'','1':'♯'})[n.a];
    // parse through check(): build a matching question by hand
    const P = t => { const q = { parsed: null }; return t; };
    const s0 = D.parseSettings('triad', 'quals=maj&roots=natural&inv=root');
    return { bad, parsed: ex.map(([t, r, qq, b]) => { const qn = { parsed: { root: null } };
      const R = (x => ({ l: 'CDEFGAB'.indexOf(x[0]), a: x[1] === '♯' ? 1 : x[1] === '♭' ? -1 : 0 }))(r), B = b ? (x => ({ l: 'CDEFGAB'.indexOf(x[0]), a: x[1] === '♯' ? 1 : x[1] === '♭' ? -1 : 0 }))(b) : R;
      return E.triad.check({ parsed: { root: R, q: qq, bass: B } }, t) && !E.triad.check({ parsed: { root: R, q: qq === 'maj' ? 'min' : 'maj', bass: B } }, t); }) }; })()`);
  check("500 triads (close and spread): drawn = answer; own answers accepted", tri.bad.length === 0, tri.bad.slice(0, 4).join(" | "));
  const cs = await ev(`(() => { const C = Drills.engines.triad.check, A = { l: 5, a: 0 }, Fs = { l: 3, a: 1 };
    const q = (r, qq) => ({ parsed: { root: r, q: qq, bass: r } });
    return [C(q(A, 'maj'), 'A'), C(q(A, 'min'), 'a'), C(q(A, 'min'), 'Am'), C(q(A, 'min'), 'am'), C(q(A, 'maj'), 'a'), C(q(A, 'min'), 'A'),
      C(q(A, 'aug'), 'a+'), C(q(Fs, 'dim'), 'f#°'), C(q({ l: 6, a: -1 }, 'min'), 'bb'), C({ parsed: { root: A, q: 'min', bass: { l: 2, a: 0 } } }, 'a/E')].join(); })()`);
  check("case: A major; a, Am, am minor; a is not major, A not minor; a+ refused; f#° dim; bb = B♭ minor; a/E", cs === "true,true,true,true,false,false,false,true,true,true", cs);
  check("the book's 6.7 answers parse and grade (A#°, Fsus4, Bb+, Db, E sus2, Dm/F ... Cm/G)", tri.parsed.every(Boolean), JSON.stringify(tri.parsed));
  const sp = await ev(`(() => { const D = Drills, E = D.engines.spell, bad = [];
    const pit = abc => { const v = ABCJS.renderAbc(document.createElement('div'), abc)[0], out = []; v.setUpAudio().tracks.forEach(t => t.forEach(e => { if (e.cmd === 'note') out.push(e.pitch % 12); })); return out; };
    const s = D.parseSettings('spell', 'quals=maj,min,dim,aug&roots=any&inv=all&task=both');
    for (let i = 0; i < 200; i++) { const q = E.make(s); if (!E.check(q, q.answer)) bad.push('refused ' + q.answer);
      if (q.abc) { const m = pit(q.abc).sort().join(), w = q.pcs.slice().sort().join(); if (m !== w) bad.push('misspelled sounds wrong ' + q.abc.split('\\n').pop()); } }
    const fake = { want: [{l:6,a:0},{l:1,a:0},{l:3,a:1}] };
    return [bad, E.check(fake, 'B D F#'), E.check(fake, 'b d f♯'), E.check(fake, 'B D Gb'), E.check(fake, 'D F# B')]; })()`);
  check("200 spellings / corrections: own answer accepted, misspelled chord sounds right", sp[0].length === 0, sp[0].slice(0, 3).join(" | "));
  check("spelling: 'B D F#' and 'b d f♯' right; 'B D Gb' and wrong order not", sp.slice(1).join() === "true,true,false,false", sp.slice(1).join());
  await b.goto(`http://127.0.0.1:${PORT}/theory/triads.html`); await b.sleep(1200);
  const pg = await ev(`(async () => { const ds = [...document.querySelectorAll('.drill')], d = ds[0], box = d.querySelector('.dr-text');
    box.value = d.getAttribute('data-answer'); box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r => setTimeout(r, 100)); const ok = d.getAttribute('data-right');
    const d2 = ds[2], b2 = d2.querySelector('.dr-text'); b2.value = 'C C C'; b2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
    return [ds.length, ds.filter(x => x.querySelector('.dr-paper svg') || x._drill.question()).length, ok, d2.getAttribute('data-right'), d2.querySelector('.dr-fb').textContent]; })()`);
  check("triads page: 9 drills, all with a question; typed right / wrong graded", pg[0] === 9 && pg[1] === 9 && pg[2] === "1" && pg[3] === "0" && /It's/.test(pg[4]), JSON.stringify(pg));

  // Roman numerals (Hutchinson ch. 7)
  const rn = await ev(`(() => { const D = Drills, E = D.engines, bad = [];
    const pit = abc => { const v = ABCJS.renderAbc(document.createElement('div'), abc)[0], out = []; v.setUpAudio().tracks.forEach(t => t.forEach(e => { if (e.cmd === 'note') out.push(e.pitch); })); return out; };
    const s = D.parseSettings('rn', 'mode=both&most=7&minorset=all&inv=all&clef=treble,bass');
    for (let i = 0; i < 400; i++) { const q = E.rn.make(s), m = pit(q.abc), pcs = [...new Set(m.map(x => x % 12))].sort().join(), want = [...new Set(q.pcs)].sort().join();
      if (pcs !== want || Math.min(...m) % 12 !== q.bassPc) bad.push('drawn ' + q.label + ' ' + q.answer + ' ' + m);
      if (!E.rn.check(q, q.answer)) bad.push('refused ' + q.answer); }
    const sw = D.parseSettings('rnwrite', 'mode=both&most=7&minorset=all&inv=all');
    for (let i = 0; i < 200; i++) { const q = E.rnwrite.make(sw); if (!E.rnwrite.check(q, q.answer)) bad.push('write refused ' + q.answer); }
    const sc = D.parseSettings('cadence', 'mode=both&most=4&cads=AC,PC,DC,HC&show=both'), want = { AC: /^(V|V)$/, PC: 1, DC: 1, HC: 1 };
    for (let i = 0; i < 200; i++) { const q = E.cadence.make(sc), r = q.rns, last = r[3], pen = r[2], maj = /^[IViv°+]+$/.test(r[0]) && r[0] === 'I';
      const ok = q.answer === 'AC' ? pen === 'V' && /^(I|i)$/.test(last) : q.answer === 'PC' ? /^(IV|iv)$/.test(pen) && /^(I|i)$/.test(last) : q.answer === 'DC' ? pen === 'V' && /^(vi|VI)$/.test(last) : last === 'V';
      const drawn = pit(q.abc).length; if (!ok || drawn !== 16) bad.push('cadence ' + q.answer + ' ' + r.join(' ') + ' notes ' + drawn); }
    return bad; })()`);
  check("400 numerals, 200 written, 200 cadences: drawn = answer, own answers accepted", rn.length === 0, rn.slice(0, 4).join(" | "));
  const book = await ev(`(() => { const D = Drills, E = D.engines;
    // the book's 7.1 tables, through the drill's own chord builder (keys given as signature count and mode)
    const keyOf = (k, mode) => { const MAJ = {'-7':'Cb','-6':'Gb','-5':'Db','-4':'Ab','-3':'Eb','-2':'Bb','-1':'F','0':'C','1':'G','2':'D','3':'A','4':'E','5':'B','6':'F#','7':'C#'};
      const s = D.parseSettings('rn', 'mode=' + mode + '&most=0'); return s; };
    return [E.rn.check({ answer: 'vii°/3rd' }, 'viio6'), E.rn.check({ answer: 'vii°/3rd' }, 'vii°/3rd'), E.rn.check({ answer: 'V' }, 'v'), E.rn.check({ answer: '♯vi°' }, '#vio'),
      E.rn.check({ answer: 'iv/5th' }, 'iv64'), E.rn.check({ answer: 'III+' }, 'III+'), E.rn.check({ answer: 'VII' }, 'vii'), E.rn.check({ answer: 'ii°' }, 'iio')].join(); })()`);
  check("numeral input: viio6 = vii°/3rd; v is not V; #vio; iv64; III+; vii is not VII; iio", book === "true,true,false,true,true,true,false,true", book);
  const tables = await ev(`(() => { const D = Drills, C = (k, c) => D.chordIn(k, c), nm = n => n.map(D.noteName).join(' ');
    const G = D.keyFrom('G', 'major'), f = D.keyFrom('F', 'minor'), c = D.keyFrom('C', 'minor'), g = D.keyFrom('G', 'minor'), a = D.keyFrom('A', 'minor'), Dm = D.keyFrom('D', 'major');
    const V = C(g, [5, [7], '']), iv = C(a, [4, [], '']), vii = C(Dm, [7, [], '']);
    return [C(G, [3, [], '']).rn, C(f, [2, [], '']).rn, C(c, [3, [], '']).rn, nm(V.notes) + '/' + D.noteName(V.notes[1]), nm(iv.notes) + '/' + D.noteName(iv.notes[2]), nm(vii.notes) + '/' + D.noteName(vii.notes[1])].join('|'); })()`);
  check("the book's 7.1 examples: G: Bm iii; f: G° ii°; c: E♭ III; g: V/3rd = D F♯ A over F♯; a: iv/5th = D F A over A; D: vii°/3rd = C♯ E G over E", tables === "iii|ii°|III|D F♯ A/F♯|D F A/A|C♯ E G/E", tables);

  // seventh chords (Hutchinson ch. 8)
  const sv = await ev(`(() => { const D = Drills, E = D.engines, bad = [];
    const pit = abc => { const v = ABCJS.renderAbc(document.createElement('div'), abc)[0], out = []; v.setUpAudio().tracks.forEach(t => t.forEach(e => { if (e.cmd === 'note') out.push(e.pitch); })); return out; };
    const chk = (ex, set, n) => { const s = D.parseSettings(ex, set); for (let i = 0; i < n; i++) { const q = E[ex].make(s); if (!q) { bad.push(ex + ' no question'); continue; }
      if (q.abc) { const m = pit(q.abc), pcs = [...new Set(m.map(x => x % 12))].sort().join(), want = [...new Set(q.pcs)].sort().join();
        if (m.length !== 4 || pcs !== want || Math.min(...m) % 12 !== q.bassPc) bad.push(ex + ' drawn ' + q.answer + ' ' + m); }
      if (!E[ex].check(q, q.answer)) bad.push(ex + ' refused ' + q.answer); } };
    chk('seventh', 'roots=any&inv=all&doubles=yes&clef=treble,bass', 400); chk('spell7', 'roots=any&inv=all', 200);
    chk('rn7', 'mode=both&most=7&inv=all&clef=treble,bass', 400); chk('rn7write', 'mode=both&most=7&inv=all', 200);
    return bad; })()`);
  check("400 sevenths, 200 written, 400 seventh numerals, 200 written: drawn = answer, own answers accepted", sv.length === 0, sv.slice(0, 4).join(" | "));
  const b8 = await ev(`(() => { const D = Drills, E = D.engines, C = (k, c) => D.chordIn7(k, c), nm = n => n.map(D.noteName).join(' ');
    // 8.4 exercise 1: D7 in G = V7; GΔ7 in D = IVM7; D♯ø7 in c♯ = iiø7; Bm7/D in G = iii7/3rd; C♯°7/E in d = vii°7/3rd
    const G = D.keyFrom('G', 'major'), Dk = D.keyFrom('D', 'major'), cs = D.keyFrom('C♯', 'minor'), d = D.keyFrom('D', 'minor');
    const r = [C(G, [5, [], '']), C(Dk, [4, [], '']), C(cs, [2, [], '']), C(G, [3, [], '']), C(d, [7, [7], ''])];
    const tbl = r.map(x => x.rn + ':' + nm(x.notes)).join('|');
    const maj = D.MAJOR_7.map(c => C(D.keyFrom('C', 'major'), c).rn).join(' '), min = D.MINOR_7.map(c => C(D.keyFrom('A', 'minor'), c).rn).join(' ');
    const sym = ['D7', 'GΔ7', 'D#ø7', 'Bm7/D', 'C#°7/E', 'Emaj7/G#', 'Am7b5', 'Bdim7', 'bm7', 'b7', 'c#o7/e', 'cmaj7', 'Cm7(♭5)'].map(t => { const p = D.parseSymbol7(t); return p ? D.noteName(p.root) + ':' + p.q + (p.bass ? '/' + D.noteName(p.bass) : '') : 'x'; }).join(' ');
    const nrn = ['V7', 'IVmaj7', 'IVΔ7', 'iiø7', 'iih7', 'iii7/3rd', 'iii65', 'viio7/3', 'V42', 'V2', 'V43', 'V', 'iiøM7', 'vii°7/7th'].map(D.normRN7).join(' ');
    return [tbl, maj, min, sym, nrn]; })()`);
  check("8.4 ex. 1 through chordIn7: V7 D F♯ A C; IVM7 G B D F♯; iiø7 D♯ F♯ A C♯; iii7; vii°7 C♯ E G B♭", b8[0] === "V7:D F♯ A C|IVM7:G B D F♯|iiø7:D♯ F♯ A C♯|iii7:B D F♯ A|vii°7:C♯ E G B♭", b8[0]);
  check("8.3 tables: C: IM7 ii7 iii7 IVM7 V7 vi7 viiø7; a: i7 iiø7 IIIM7 iv7 V7 VIM7 vii°7", b8[1] === "IM7 ii7 iii7 IVM7 V7 vi7 viiø7" && b8[2] === "i7 iiø7 IIIM7 iv7 V7 VIM7 vii°7", b8[1] + " / " + b8[2]);
  check("seventh symbols: book's labels; small root = minor (b7 = Bm7, cmaj7 refused)", b8[3] === "D:dom7 G:maj7 D♯:hdim7 B:min7/D C♯:dim7/E E:maj7/G♯ A:hdim7 B:dim7 B:min7 B:min7 C♯:dim7/E x C:hdim7", b8[3]);
  check("seventh numerals: maj7/Δ7 = M7, h = ø, 65 43 42 2, a triad and iiøM7 refused", b8[4] === "V7 IVM7 IVM7 iiø7 iiø7 iii7/3rd iii7/3rd vii°7/3rd V7/7th V7/7th V7/5th   vii°7/7th", JSON.stringify(b8[4]));
  await b.goto(`http://127.0.0.1:${PORT}/theory/seventh-chords.html`); await b.sleep(1200);
  const pg8 = await ev(`[document.querySelectorAll('.drill').length, [...document.querySelectorAll('.drill')].filter(x => x.querySelector('.dr-paper svg, .dr-symbol')).length].join()`);
  check("seventh-chords page: every drill has a question", /^(\d+),\1$/.test(pg8) && pg8 !== "0,0", pg8);

  // harmonic progression and function (Hutchinson ch. 9)
  const pr = await ev(`(() => { const D = Drills, E = D.engines, bad = [];
    const pit = abc => { const v = ABCJS.renderAbc(document.createElement('div'), abc)[0], out = []; v.setUpAudio().tracks.forEach(t => t.forEach(e => { if (e.cmd === 'note') out.push(e.pitch); })); return out; };
    for (const ans of ['rn', 'symbols']) { const s = D.parseSettings('prog', 'groups=circle,function,pop&mode=both&most=5&show=both&answer=' + ans);
      for (let i = 0; i < 200; i++) { const q = E.prog.make(s), m = pit(q.abc), want = q.play.flat();
        if (m.slice().sort().join() !== want.slice().sort().join()) bad.push('drawn ' + q.answer + ' ' + m.length + '/' + want.length);
        if (!E.prog.check(q, q.answer)) bad.push('refused ' + q.answer); } }
    const sf = D.parseSettings('func', 'mode=both&most=7&show=staff&clef=treble,bass'), fk = {};
    for (let i = 0; i < 300; i++) { const q = E.func.make(sf); fk[q.rn] = q.answer; if (pit(q.abc).length !== 3) bad.push('func drawn ' + q.rn); }
    return [bad, Object.keys(fk).sort().map(k => k + '=' + fk[k]).join(' ')]; })()`);
  check("400 progressions (numerals and symbols), 300 functions: drawn = played, own answers accepted", pr[0].length === 0, pr[0].slice(0, 4).join(" | "));
  check("functions as the book's flowcharts", pr[1] === "I=T III=TP IV=PD V=D VI=TP i=T ii=PD iii=TP ii°=PD iv=PD vi=TP vii°=D", pr[1]);
  const b9 = await ev(`(() => { const D = Drills, E = D.engines, nm = c => c.notes.map(D.noteName).join('-');
    // 9.9 exercise 1: the circle of fifths in F major and B minor (the book's answers)
    const run = (tonic, mode, prog) => { const k = D.keyFrom(tonic, mode); return prog.split(' ').map(t => nm(D.chordIn(k, D.rnChord(t, mode === 'minor')))).join(' '); };
    const F = run('F', 'major', 'I IV vii° iii vi ii V I'), b = run('B', 'minor', 'i iv VII III VI ii° V i'), jude = run('F', 'major', '♭VII');
    const q = { answer: 'I vi IV V', chords: ['I', 'vi', 'IV', 'V'].map(rn => ({ rn })) }, qs = { answer: 'C Am F G', syms: 1, chords: [['C', 'maj'], ['A', 'min'], ['F', 'maj'], ['G', 'maj']].map(([r, qq]) => ({ notes: [{ l: 'CDEFGAB'.indexOf(r), a: 0 }], q: qq })) };
    return [F, b, jude, E.prog.check(q, 'I vi IV V'), E.prog.check(q, 'I-vi-IV-V'), E.prog.check(q, 'I VI IV V'), E.prog.check(q, 'I vi IV'), E.prog.check(qs, 'C Am F G'), E.prog.check(qs, 'C a F G'), E.prog.check(qs, 'C A F G'),
      E.prog.check({ answer: 'I ♭VII', chords: [{ rn: 'I' }, { rn: '♭VII' }] }, 'I bVII')]; })()`);
  check("9.9 ex. 1: F major circle F-A-C B♭-D-F E-G-B♭ A-C-E D-F-A G-B♭-D C-E-G", b9[0] === "F-A-C B♭-D-F E-G-B♭ A-C-E D-F-A G-B♭-D C-E-G F-A-C", b9[0]);
  check("9.9 ex. 1: B minor circle ... VII = A-C♯-E, ii° = C♯-E-G, V = F♯-A♯-C♯", b9[1] === "B-D-F♯ E-G-B A-C♯-E D-F♯-A G-B-D C♯-E-G F♯-A♯-C♯ B-D-F♯", b9[1]);
  check("♭VII in F is E♭ G B♭; progression answers: dashes ok, case matters, length matters, symbols with a = minor, bVII", b9.slice(2).join() === "E♭-G-B♭,true,true,false,false,true,true,false,true", b9.slice(2).join());

  await b.goto(`http://127.0.0.1:${PORT}/theory/progressions.html`); await b.sleep(1500);
  const pg9 = await ev(`[document.querySelectorAll('.drill').length, [...document.querySelectorAll('.drill')].filter(x => x._drill && x._drill.question()).length].join()`);
  check("progressions page: every drill has a question", /^(\d+),\1$/.test(pg9) && pg9 !== "0,0", pg9);

  // ch. 10: the drawn melody (abcjs's pitches) = the notes the drill made; answering by key and button; the feedback explains
  await b.goto(`http://127.0.0.1:${PORT}/theory/non-chord-tones.html`); await b.sleep(1500);
  const pg10 = await ev(`[document.querySelectorAll('.drill').length, [...document.querySelectorAll('.drill')].filter(x => x._drill && x._drill.question()).length].join()`);
  check("non-chord-tones page: every drill has a question", /^(\d+),\1$/.test(pg10) && pg10 !== "0,0", pg10);
  const p10 = await ev(`(() => { const D = Drills, E = D.engines.nct, bad = [], s = D.parseSettings('nct', 'mode=both&most=5');
    for (let i = 0; i < 300; i++) { const q = E.make(s), v = ABCJS.renderAbc(document.createElement('div'), q.abc)[0];
      let want = q.mel.map(n => 12 * (n.o + 1) + [0,2,4,5,7,9,11][n.l] + n.a);
      if (/[a-gA-G][,']*\\d*- /.test(q.abc.split('[V:1]')[1].split('\\n')[0])) want = want.filter((p, k) => k !== q.marks[0]);   // a tie: one note sounds
      const top = v.setUpAudio().tracks[0].filter(e => e.cmd === 'note').map(e => e.pitch);
      if (top.join() !== want.join()) bad.push(q.answer + ' ' + top + ' vs ' + want + ' ' + q.abc.split('\\n').slice(-3).join(' ')); }
    return bad; })()`);
  check("300 non-chord-tone questions: abcjs plays the melody the drill made (spelling, accidentals in the bar, ties)", p10.length === 0, p10.slice(0, 3).join(" | "));
  const f10 = await ev(`(() => { const h = document.querySelectorAll('.drill')[2], q = h._drill.question(), key = { PT: 'p', NT: 'n' }[q.answer];
    document.dispatchEvent(new KeyboardEvent('keydown', { key })); const fb = h.querySelector('.dr-fb').textContent;
    return [/^Right/.test(fb), /approached by/.test(fb), h.querySelectorAll('.dr-ans').length, h.querySelector('.dr-ans').textContent].join(); })()`);
  check("10.3 drill: answer by key, feedback says how it was approached; two buttons with names", f10 === "true,true,2,Passing tone", f10);
  // ch. 17: abcjs plays the two chords the drill made; typed answers are graded through the page
  await b.goto(`http://127.0.0.1:${PORT}/theory/secondary-dominants.html`); await b.sleep(1500);
  const pg17 = await ev(`[document.querySelectorAll('.drill').length, [...document.querySelectorAll('.drill')].filter(x => x._drill && x._drill.question()).length].join()`);
  check("secondary-dominants page: every drill has a question", /^(\d+),\1$/.test(pg17) && pg17 !== "0,0", pg17);
  const p17 = await ev(`(() => { const D = Drills, E = D.engines.secdom, bad = [], s = D.parseSettings('secdom', 'mode=both&most=6&kind=both&inv=all');
    for (let i = 0; i < 300; i++) { const q = E.make(s), v = ABCJS.renderAbc(document.createElement('div'), q.abc)[0];
      const got = v.setUpAudio().tracks.flat().filter(e => e.cmd === 'note').map(e => e.pitch).sort((a, b) => a - b).join();
      if (got !== q.play.flat().sort((a, b) => a - b).join()) bad.push(q.answer + ' ' + got + ' vs ' + q.play.flat() + ' ' + q.abc.split('\\n').slice(-2).join(' ')); }
    return bad; })()`);
  check("300 secondary dominants: abcjs plays the chord and its resolution as the drill made them", p17.length === 0, p17.slice(0, 3).join(" | "));
  const t17 = await ev(`(() => { const h = document.querySelectorAll('.drill')[2], box = h.querySelector('input'), out = [];
    for (const wrong of [false, true]) { h._drill.next && h._drill.next(); const q = h._drill.question(); box.value = wrong ? 'V/vii°' : q.answer;
      box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); out.push(h.querySelector('.dr-fb').textContent.slice(0, 5)); }
    return out.join(); })()`);
  check("17.3 drill: the typed answer is right, a wrong one is not", /^Right,No/.test(t17), t17);
  // ch. 18: the same for secondary diminished chords
  await b.goto(`http://127.0.0.1:${PORT}/theory/secondary-diminished.html`); await b.sleep(1500);
  const pg18 = await ev(`[document.querySelectorAll('.drill').length, [...document.querySelectorAll('.drill')].filter(x => x._drill && x._drill.question()).length].join()`);
  check("secondary-diminished page: every drill has a question", /^(\d+),\1$/.test(pg18) && pg18 !== "0,0", pg18);
  const p18 = await ev(`(() => { const D = Drills, E = D.engines.secdim, bad = [], s = D.parseSettings('secdim', 'mode=both&most=6&kind=both&inv=all');
    for (let i = 0; i < 300; i++) { const q = E.make(s), v = ABCJS.renderAbc(document.createElement('div'), q.abc)[0];
      const got = v.setUpAudio().tracks.flat().filter(e => e.cmd === 'note').map(e => e.pitch).sort((a, b) => a - b).join();
      if (got !== q.play.flat().sort((a, b) => a - b).join()) bad.push(q.answer + ' ' + got + ' vs ' + q.play.flat() + ' ' + q.abc.split('\\n').slice(-2).join(' ')); }
    return bad; })()`);
  check("300 secondary diminished chords: abcjs plays the chord and its resolution as the drill made them", p18.length === 0, p18.slice(0, 3).join(" | "));
  const t18 = await ev(`(() => { const out = [];
    for (const [ix, alt] of [[2, a => a], [3, a => a.replace('°', 'o').replace('ø', 'h')]]) { const h = document.querySelectorAll('.drill')[ix], box = h.querySelector('input');
      for (const wrong of [false, true]) { h._drill.next && h._drill.next(); const q = h._drill.question(); box.value = wrong ? 'vii°7/vii°' : alt(q.answer);
        box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); out.push(h.querySelector('.dr-fb').textContent.slice(0, 5)); } }
    return out.join(); })()`);
  check("18.2 and 18.3 drills: the typed answer (o / h for ° / ø on the staff drill) is right, a wrong one is not", /^Right,No.*,Right,No/.test(t18), t18);
  // ch. 21: augmented sixths: abcjs plays the drawn chord as the drill made it; typed, button and ear answers
  await b.goto(`http://127.0.0.1:${PORT}/theory/augmented-sixths.html`); await b.sleep(1500);
  const pg21 = await ev(`[document.querySelectorAll('.drill').length, [...document.querySelectorAll('.drill')].filter(x => x._drill && x._drill.question()).length].join()`);
  check("augmented-sixths page: every drill has a question", pg21 === "11,11", pg21);
  const p21 = await ev(`(() => { const E = Drills.engines.aug6, bad = [], s = Drills.parseSettings('aug6', 'mode=both&most=4&types=It,Fr,Ger,EnGer,V7N&clef=treble,bass');
    for (let i = 0; i < 300; i++) { const q = E.make(s), v = ABCJS.renderAbc(document.createElement('div'), q.abc)[0];
      const got = v.setUpAudio().tracks.flat().filter(e => e.cmd === 'note').map(e => e.pitch).sort((a, b) => a - b).join();
      if (got !== q.play[0].slice().sort((a, b) => a - b).join()) bad.push(q.answer + ' ' + got + ' vs ' + q.play[0]); }
    return bad; })()`);
  check("300 augmented sixth chords: abcjs plays the drawn chord as the drill made it", p21.length === 0, p21.slice(0, 3).join(" | "));
  const t21 = await ev(`(() => { const out = [], h = document.querySelectorAll('.drill')[3], box = h.querySelector('input');
    for (const wrong of [false, true]) { h._drill.next && h._drill.next(); const q = h._drill.question();
      box.value = wrong ? 'C#m7' : q.answer.replace(/♭/g, 'b').replace(/♯/g, '#'); box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      out.push(h.querySelector('.dr-fb').textContent.slice(0, 5)); }
    for (const ix of [2, 6]) { const d = document.querySelectorAll('.drill')[ix], q = d._drill.question();
      [...d.querySelectorAll('.dr-ans')].find(x => x.getAttribute('data-a') === q.answer).click(); out.push(d.querySelector('.dr-fb').textContent.slice(0, 5)); }
    return out.join(); })()`);
  check("21.4 typed symbol right / wrong; 21.3 and 21.8 answered by button", /^Right,No.*,Right,Right$/.test(t21), t21);
  // ch. 19: mode mixture (mixture.js): abcjs plays what each drill made; typed and ear answers graded through the page
  await b.goto(`http://127.0.0.1:${PORT}/theory/mode-mixture.html`); await b.sleep(1500);
  const pg19 = await ev(`[document.querySelectorAll('.drill').length, [...document.querySelectorAll('.drill')].filter(x => x._drill && x._drill.question()).length].join()`);
  check("mode-mixture page: every drill has a question", /^(\d+),\1$/.test(pg19) && pg19 !== "0,0", pg19);
  const p19 = await ev(`(() => { const D = Drills, bad = [];
    for (const [ex, set] of [['mix', 'most=7&inv=all'], ['mixdc', 'most=4&show=both'], ['picardy', 'most=4&show=both']]) {
      const E = D.engines[ex], s = D.parseSettings(ex, set);
      for (let i = 0; i < 200; i++) { const q = E.make(s), v = ABCJS.renderAbc(document.createElement('div'), q.abc)[0];
        const got = v.setUpAudio().tracks.flat().filter(e => e.cmd === 'note').map(e => e.pitch).sort((a, b) => a - b).join();
        if (got !== q.play.flat().sort((a, b) => a - b).join()) bad.push(ex + ' ' + q.answer + ' ' + got + ' vs ' + q.play.flat()); } }
    return bad; })()`);
  check("600 borrowed chords and phrases: abcjs plays what the drill made", p19.length === 0, p19.slice(0, 3).join(" | "));
  const t19 = await ev(`(() => { const ds = [...document.querySelectorAll('.drill')], out = [];
    const typed = (h, v) => { const box = h.querySelector('input'); box.value = v; box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return h.querySelector('.dr-fb').textContent.slice(0, 5); };
    const mix = ds.find(h => h.getAttribute('data-ex') === 'mix');
    for (const wrong of [false, true]) { mix._drill.next(); const q = mix._drill.question(); out.push(typed(mix, wrong ? 'V/V' : q.answer.replace('♭', 'b').replace('°', 'o').replace('ø', 'h'))); }
    const dc = ds.find(h => h.getAttribute('data-ex') === 'mixdc'); dc._drill.next();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: dc._drill.question().answer === 'vi' ? 'v' : 'b' })); out.push(dc.querySelector('.dr-fb').textContent.slice(0, 5));
    return out.join(); })()`);
  check("19.3 drill: typed answer (b / o / h) right, a wrong one not; 19.4 ear drill answered by key", /^Right,No: V,Right$/.test(t19), t19);
  // ch. 20: the Neapolitan drills (neapolitan.js) on their page: abcjs plays what the drills made; typed and button answers graded
  await b.goto(`http://127.0.0.1:${PORT}/theory/neapolitan.html`); await b.sleep(1500);
  const pg20 = await ev(`[document.querySelectorAll('.drill').length, [...document.querySelectorAll('.drill')].filter(x => x._drill && x._drill.question()).length].join()`);
  check("neapolitan page: every drill has a question", /^(\d+),\1$/.test(pg20) && pg20 !== "0,0", pg20);
  const p20 = await ev(`(() => { const D = Drills, bad = [], pitches = abc => ABCJS.renderAbc(document.createElement('div'), abc)[0].setUpAudio().tracks.flat().filter(e => e.cmd === 'note').map(e => e.pitch).sort((a, b) => a - b).join();
    const E = D.engines.neap, s = D.parseSettings('neap', 'mode=both&most=6&inv=both&chords=pd');
    for (let i = 0; i < 300; i++) { const q = E.make(s), got = pitches(q.abc); if (got !== q.play.flat().sort((a, b) => a - b).join()) bad.push(q.answer + ' ' + got + ' vs ' + q.play.flat() + ' ' + q.abc.split('\\n').slice(-2).join(' ')); }
    const H = D.engines.neapear, sh = D.parseSettings('neapear', 'mode=both&most=4');
    for (let i = 0; i < 200; i++) { const q = H.make(sh), got = pitches(q.abc); if (got !== q.play.flat().sort((a, b) => a - b).join()) bad.push('ear ' + q.answer + ' ' + got + ' vs ' + q.play.flat()); }
    return bad; })()`);
  check("300 Neapolitan staff questions and 200 cadences: abcjs plays what the drill made", p20.length === 0, p20.slice(0, 3).join(" | "));
  const t20 = await ev(`(() => { const out = [];
    for (const [ix, alt] of [[2, a => a], [5, a => a.replace('N', 'bII')]]) { const h = document.querySelectorAll('.drill')[ix], box = h.querySelector('input');
      for (const wrong of [false, true]) { h._drill.next(); const q = h._drill.question(); box.value = wrong ? 'V/N' : alt(q.answer);
        box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); out.push(h.querySelector('.dr-fb').textContent.slice(0, 5)); } }
    const h = document.querySelectorAll('.drill')[3]; h._drill.next(); const q = h._drill.question();
    h.querySelector('.dr-ans[data-a="' + q.answer + '"]').click(); out.push(h.querySelector('.dr-fb').textContent.slice(0, 5), h.querySelectorAll('.dr-ans').length, !!q.ear);
    return out.join(); })()`);
  check("20.1 and 20.3 drills: the typed answer (bII for N) is right, a wrong one is not; the ear drill: three buttons, sound only", t20 === "Right,No: V,Right,No: V,Right,3,true", t20);
  // ch. 31: jazz chords (jazz.js): abcjs plays the drawn grand-staff chord and the scale as the drill made them; typed and button answers
  await b.goto(`http://127.0.0.1:${PORT}/theory/jazz-theory.html`); await b.sleep(1500);
  const pg31 = await ev(`[document.querySelectorAll('.drill').length, [...document.querySelectorAll('.drill')].filter(x => x._drill && x._drill.question()).length].join()`);
  check("jazz-theory page: every drill has a question", pg31 === "19,19", pg31);
  const p31 = await ev(`(() => { const bad = [], s = Drills.parseSettings('jzname', 'groups=add,dom,maj,min,hdim,sus,alt,other&roots=all'), s2 = Drills.parseSettings('jzscale', 'roots=all');
    for (let i = 0; i < 300; i++) { const q = Drills.engines.jzname.make(s), v = ABCJS.renderAbc(document.createElement('div'), q.abc)[0];
      const got = v.setUpAudio().tracks.flat().filter(e => e.cmd === 'note').map(e => e.pitch).sort((a, b) => a - b).join();
      if (got !== q.play[0].slice().sort((a, b) => a - b).join()) bad.push(q.answer + ' ' + got + ' vs ' + q.play[0]);
      const r = Drills.engines.jzscale.make(s2), w = ABCJS.renderAbc(document.createElement('div'), r.abc)[0];
      const g2 = w.setUpAudio().tracks.flat().filter(e => e.cmd === 'note').map(e => e.pitch).join();
      if (g2 !== r.play.join()) bad.push(r.answer + ' ' + g2 + ' vs ' + r.play); }
    return bad; })()`);
  check("300 jazz chords and 300 scales: abcjs plays what the drill drew", p31.length === 0, p31.slice(0, 3).join(" | "));
  const t31 = await ev(`(() => { const out = [], h = document.querySelectorAll('.drill')[3], box = h.querySelector('input');
    for (const wrong of [false, true]) { h._drill.next && h._drill.next(); const q = h._drill.question();
      box.value = wrong ? 'C#m7' : q.answer.replace(/♭/g, 'b').replace(/♯/g, '#').replace(/Δ/g, 'maj'); box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      out.push(h.querySelector('.dr-fb').textContent.slice(0, 5)); }
    for (const ix of [6, 12]) { const d = document.querySelectorAll('.drill')[ix], q = d._drill.question();
      [...d.querySelectorAll('.dr-ans')].find(x => x.getAttribute('data-a') === q.answer).click(); out.push(d.querySelector('.dr-fb').textContent.slice(0, 5)); }
    return out.join(); })()`);
  check("31.6 typed name right (maj for Δ) / wrong; 31.7 ear and 31.9 scale by button", /^Right,No.*,Right,Right$/.test(t31), t31);
  // ch. 11: the motive drill (motives.js) on its page: abcjs plays what the drill made; answering by key
  await b.goto(`http://127.0.0.1:${PORT}/theory/melodic-analysis.html`); await b.sleep(1500);
  const pg11 = await ev(`[document.querySelectorAll('.drill').length, [...document.querySelectorAll('.drill')].filter(x => x._drill && x._drill.question()).length].join()`);
  check("melodic-analysis page: every drill has a question", /^(\d+),\1$/.test(pg11) && pg11 !== "0,0", pg11);
  const p11 = await ev(`(() => { const E = Drills.engines.motive, bad = [], s = Drills.parseSettings('motive', 'mode=both');
    for (let i = 0; i < 300; i++) { const q = E.make(s), v = ABCJS.renderAbc(document.createElement('div'), q.abc)[0];
      const got = v.setUpAudio().tracks[0].filter(e => e.cmd === 'note').map(e => e.pitch);
      if (got.join() !== q.play.join()) bad.push(q.answer + ' ' + got + ' vs ' + q.play); }
    return bad; })()`);
  check("300 motive questions: abcjs plays the two bars the drill made", p11.length === 0, p11.slice(0, 3).join(" | "));
  const k11 = await ev(`(() => { const h = document.querySelectorAll('.drill')[0], q = h._drill.question(), key = { INV: 'i', RET: 'g', SEQ: 's' }[q.answer];
    document.dispatchEvent(new KeyboardEvent('keydown', { key })); const fb = h.querySelector('.dr-fb').textContent;
    return [/^Right/.test(fb), /Bar 2 has/.test(fb), h.querySelectorAll('.dr-ans').length].join(); })()`);
  check("11.2 drill: answer by key, the feedback says what changed; three buttons", k11 === "true,true,3", k11);
  // lock
  await b.goto(URL("?ex=keysig&mode=minor&most=3&lock=1")); await b.sleep(800);
  const lk = await ev(`[document.querySelector('.dr-settings').hidden, document.getElementById('dr-pick').hidden, document.querySelectorAll('.dr-ans').length, /minor key/.test(document.querySelector('.dr-prompt').textContent)].join(',')`);
  check("lock=1 hides settings and menu; minor keys up to 3 accidentals (7 answers)", lk === "true,true,7,true", lk);
  check("no errors", !errs().length, errs().join(" | "));
  await b.close(); srv.close();
  console.log(fails ? fails + " failed" : "all passed"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
