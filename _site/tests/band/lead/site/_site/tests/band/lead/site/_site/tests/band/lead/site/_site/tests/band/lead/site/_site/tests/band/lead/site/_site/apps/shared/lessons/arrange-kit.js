// arrange-kit.js — the arrangement lessons (ArrangeLesson): who in a band plays what, heard and seen on the Backing Track band,
// and the tonewheel organ taken apart (tonebars, chorus, swell pedal, Leslie) on the band's own organ model (sounds.js, ORGAN.md).
//
//   ArrangeLesson.init()       fills every .ar-demo and .ar-organ on the page; the bottom strip (#ar-bar) holds tempo and Stop.
//
//   <div class="ar-demo" data-style="rock" data-chart="C|Am|F|G" data-tempo="96" ...></div>
//     data-style    a BandCatalog style id: its bass line, comping, drums, feel and sounds
//     data-chart    bars separated by |, two chords in a bar separated by a space (default C|Am|F|G)
//     data-meter    "4/4" (default) | "3/4" | "12/8"
//     data-comp     "guitar" | "piano" | a sound id ("hammond", "epiano", "odguitar"...): who comps (default the style's own lead)
//     data-second   a sound id: a second chord player beside the first, playing what BandCatalog.secondFor gives it
//     data-on       the parts sounding at the start, e.g. "bass drums" (default all). Each part has a button to switch it.
//     data-choices  JSON [{ "label": "...", "opts": { band options } }]: one button each; the first is on at the start.
//                   The options go to player.setOpts while it plays (bassFeel, compRhythm, groove, voicing, octave ...).
//     data-staves   which staves to write under the demo: "comp bass drums" (default: the parts that are on)
//   Under the buttons the band's last four bars are written out (BandNotation), so what each player did can be read.
//
//   <div class="ar-organ"></div>   the organ: nine tonebars, registrations, chorus / vibrato, swell pedal, Leslie, a keyboard.
//     Every control acts on the "hammond" sound globally (BandSounds.setTonebars / setControl / setAmp), so a .ar-demo with
//     data-comp="hammond" further down the page plays with the settings made here, and the band's organist is told to leave
//     the pedal and the switch alone (opts.organ) while a hand is on them.
(function (global) {
  var PARTS = [{ id: 'bass', label: 'Bass' }, { id: 'comp', label: 'Chords' }, { id: 'comp2', label: 'Second chords' }, { id: 'drums', label: 'Drums' }, { id: 'congas', label: 'Congas' }];
  var player = null, now = null, tempoOverride = null, organHand = { swell: null, leslie: null };
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // ---------------- the band demos ----------------
  function abcOf(chart, meter) {
    var m = meter || '4/4', full = m === '3/4' ? 3 : m === '12/8' ? 12 : 4, L = m === '12/8' ? '1/8' : '1/4';
    var out = chart.split('|').map(function (b) { var c = b.trim().split(/\s+/);
      if (c.length > 1) { var h = full / c.length; return c.map(function (x) { return '"' + x + '"z' + h; }).join(' '); }
      return '"' + c[0] + '"z' + full; }), rows = [];
    for (var i = 0; i < out.length; i += 4) rows.push(out.slice(i, i + 4).join(' | '));
    return 'X:1\nT:Arrangement\nM:' + m + '\nL:' + L + '\nK:C\n' + rows.join(' |\n') + ' |]';
  }
  function bandOf(w) {
    var C = global.BandCatalog, st = C.byId ? C.byId(C.styles, w.style) : null, d = w.el.dataset, comp = d.comp || '';
    var fam = comp === 'guitar' || comp === 'piano' ? comp : comp ? (global.BandSounds.family(comp) === 'guitar' ? 'guitar' : 'piano') : null;
    var so = C.styleOpts(w.style, fam || undefined), o = Object.assign({}, so.opts), inst = so.instruments.slice();
    if (comp && comp !== 'guitar' && comp !== 'piano') { inst[inst.indexOf(o.compSound)] = comp; o.compSound = comp; }
    if (d.second) { o.second = C.secondFor(w.style, d.second); if (inst.indexOf(d.second) < 0) inst.push(d.second); }
    if (w.choice) Object.assign(o, w.choice);
    if (organHand.swell != null || organHand.leslie != null) o.organ = { swell: organHand.swell == null ? 'auto' : organHand.swell, leslie: organHand.leslie || 'auto' };
    if (o.second && o.organ) o.second.organ = o.organ;
    return { opts: o, instruments: inst, tempo: tempoOverride || +d.tempo || (st && st.feel === 'swing' ? 120 : 100) };
  }
  function volumes(w) { var v = {}; PARTS.forEach(function (p) { v[p.id] = w.on[p.id] ? 1 : 0; }); return v; }
  function hasPart(w, id) { var d = w.el.dataset; if (id === 'comp2') return !!d.second; if (id === 'congas') { var s = global.BandCatalog.byId(global.BandCatalog.styles, w.style); return !!((s && s.congas) || (w.choice && w.choice.congas && w.choice.congas !== 'none')); } return true; }

  function draw(w) {
    if (!global.BandNotation || !global.ABCJS || !w.log.length) return;
    var bars = w.log.slice(-4), show = {};
    var want = (w.el.dataset.staves || '').split(/\s+/).filter(Boolean);
    PARTS.forEach(function (p) { show[p.id] = want.length ? want.indexOf(p.id) >= 0 : (w.on[p.id] && hasPart(w, p.id)); });
    var names = { comp: compName(w.band.opts.compSound), comp2: w.band.opts.second ? compName(w.band.opts.second.compSound) : undefined };
    try { global.ABCJS.renderAbc(w.staff, global.BandNotation.toAbc(bars, { key: 'C', straight: w.band.opts.feel === 'straight', drums: show.drums, congas: show.congas, show: show, names: names, barsPerLine: 4 }), { responsive: 'resize', add_classes: true }); }
    catch (e) { if (global.console) console.warn('ArrangeLesson: notation', e); }
  }
  function compName(s) { if (!s) return 'Pno.'; if (s === 'hammond') return 'Org.'; if (s === 'epiano') return 'E.P.'; return global.BandSounds.family(s) === 'guitar' ? 'Gtr.' : 'Pno.'; }

  function stop() {
    if (player) player.stop();
    if (now) { now.btn.textContent = '▶ Play'; now.btn.classList.remove('ar-on'); now = null; }
    var s = $('ar-stop'); if (s) s.disabled = true; status('');
  }
  function status(t) { var s = $('ar-status'); if (s) s.textContent = t; }
  function play(w) {
    if (now === w) { stop(); return; }
    stop(); now = w; w.log = []; w.band = bandOf(w);
    var parsed = global.TuneChart.parse(abcOf(w.chart, w.el.dataset.meter)), b = w.band;
    var cfg = { parsed: parsed, tempo: b.tempo, transpose: 0, countIn: 1, choruses: 0, opts: b.opts, volumes: volumes(w),
      onState: function (s) { if (s === 'loading') status('Loading sounds…'); else if (s === 'playing') status(''); },
      onLoadProgress: function (d, t) { if (t) status('Loading sounds… ' + Math.round(100 * d / t) + '%'); },
      onBar: function (info) { if (now && !info.countIn && info.index >= 0) status('Bar ' + (info.index + 1)); },
      onBarEvents: function (rec) { var x = now; if (!x) return; x.log.push(rec); if (x.log.length % 4 === 0 || x.log.length < 4) draw(x); } };
    if (!player) player = global.BandPlayer.create(cfg);
    else { player.setChart(parsed); player.setTempo(b.tempo); player.setOpts(b.opts); PARTS.forEach(function (p) { player.setVolume(p.id, cfg.volumes[p.id]); }); }
    player.setInstruments(b.instruments);
    w.btn.textContent = '■ Stop'; w.btn.classList.add('ar-on'); var s = $('ar-stop'); if (s) s.disabled = false;
    var t = $('ar-tempo'); if (t && !tempoOverride) { t.value = b.tempo; $('ar-tempo-n').value = b.tempo; }
    // (the player is made once; its callbacks go to whichever demo is playing now)
    player.play().catch(function (e) { status('Could not play: ' + (e && e.message)); stop(); });
  }
  function refresh(w) {
    if (now !== w || !player) return;
    w.band = bandOf(w); player.setInstruments(w.band.instruments); player.setOpts(w.band.opts);
    PARTS.forEach(function (p) { player.setVolume(p.id, w.on[p.id] ? 1 : 0); });
  }

  function buildDemo(node) {
    var d = node.dataset, w = { el: node, style: d.style || 'rock', chart: d.chart || 'C|Am|F|G', on: {}, log: [], choice: null };
    var on = (d.on || 'bass comp comp2 drums congas').split(/\s+/);
    PARTS.forEach(function (p) { w.on[p.id] = on.indexOf(p.id) >= 0; });
    var tools = el('div', 'ar-tools'); w.btn = el('button', 'btn btn-sm btn-primary ar-play', '▶ Play'); w.btn.type = 'button';
    w.btn.addEventListener('click', function () { play(w); }); tools.appendChild(w.btn);
    var chips = el('span', 'ar-parts'); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'Parts');
    PARTS.forEach(function (p) {
      if (!hasPart(w, p.id) && p.id !== 'congas') return;
      var b = el('button', 'btn btn-sm btn-outline-secondary ar-chip', p.id === 'comp' ? compLabel(d.comp, w.style) : p.id === 'comp2' ? compLabel(d.second) : p.label); b.type = 'button';
      b.dataset.part = p.id; if (p.id === 'congas' && !hasPart(w, 'congas')) b.hidden = true;
      function paint() { b.setAttribute('aria-pressed', String(!!w.on[p.id])); b.classList.toggle('ar-on', !!w.on[p.id]); }
      b.addEventListener('click', function () { w.on[p.id] = !w.on[p.id]; paint(); refresh(w); draw(w); }); paint(); chips.appendChild(b);
    });
    tools.appendChild(el('span', 'ar-lbl', 'Who plays:')); tools.appendChild(chips); node.appendChild(tools);
    if (d.choices) {
      var list = JSON.parse(d.choices), row = el('div', 'ar-tools ar-choices'); row.setAttribute('role', 'group');
      row.appendChild(el('span', 'ar-lbl', d.choiceLabel || 'Try:'));
      list.forEach(function (c, i) {
        var b = el('button', 'btn btn-sm btn-outline-secondary', c.label); b.type = 'button';
        b.addEventListener('click', function () { w.choice = c.opts; Array.prototype.forEach.call(row.querySelectorAll('button'), function (x) { x.classList.toggle('ar-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
          var cg = chips.querySelector('[data-part=congas]'); if (cg) cg.hidden = !hasPart(w, 'congas'); refresh(w); });
        row.appendChild(b); if (i === 0) { w.choice = c.opts; b.classList.add('ar-on'); b.setAttribute('aria-pressed', 'true'); } else b.setAttribute('aria-pressed', 'false');
      });
      node.appendChild(row);
    }
    w.staff = el('div', 'ar-staff'); w.staff.appendChild(el('p', 'ar-hint', 'Press Play: the band\'s last four bars are written out here as it plays them.'));
    node.appendChild(w.staff);
  }
  function compLabel(sound, style) {
    if (!sound) { var C = global.BandCatalog, s = C.byId(C.styles, style); return s && s.sound && s.sound.lead === 'guitar' ? 'Guitar' : 'Piano'; }
    if (sound === 'guitar') return 'Guitar'; if (sound === 'piano') return 'Piano'; if (sound === 'hammond') return 'Organ'; if (sound === 'epiano') return 'Electric piano';
    return global.BandSounds.family(sound) === 'guitar' ? 'Guitar' : 'Keys';
  }

  // ---------------- the organ ----------------
  var FEET = ["16′", "5⅓′", "8′", "4′", "2⅔′", "2′", "1⅗′", "1⅓′", "1′"];
  var WHAT = ['an octave below', 'a 5th above (an octave down)', 'the note itself', 'an octave up', 'an octave and a 5th up', 'two octaves up', 'two octaves and a 3rd up', 'two octaves and a 5th up', 'three octaves up'];
  var STEP = [-12, 7, 0, 12, 19, 24, 28, 31, 36], COLOUR = ['brown', 'brown', 'white', 'white', 'black', 'white', 'black', 'black', 'white'];
  var NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  var REGS = [
    { id: '888000000', label: '88 8000 000: the three lowest, all out', what: 'Round and full: the default comping sound, and the start of most blues and soul jazz registrations.' },
    { id: '888800000', label: '88 8800 000: add the 4′', what: 'The same body with an octave on top: it cuts through a band more.' },
    { id: '008000000', label: '00 8000 000: the 8′ alone', what: 'Close to a sine wave: pure, flute-like, nothing above the note.' },
    { id: '800000008', label: '80 0000 008: 16′ and 1′', what: 'Two pitches four octaves apart with a hole in the middle: hollow and whistling.' },
    { id: '688600000', label: '68 8600 000: ballad', what: 'The 16′ and 4′ pulled back a little: warm and quiet under a singer.' },
    { id: '888888888', label: '88 8888 888: everything out', what: 'The full organ: loud, bright, used for a climax or a gospel shout.' },
    { id: '008080800', label: '00 8080 800: the odd pitches', what: 'The 8′ with the 5th and 3rd pitches above: reedy, like a clarinet.' },
    { id: '838000000', label: '83 8000 000: with the 5⅓′ low', what: 'The quint under the note thinned out: darker than the default.' }
  ];
  function mkOrgan(node) {
    var S = global.BandSounds, P = global.BandPlayer, held = [], heldKeys = {};
    var bars = S.getTonebars('hammond') || [8, 8, 8, 0, 0, 0, 0, 0, 0];
    node.innerHTML = '';
    // the tonebars
    var top = el('div', 'ao-top'), tb = el('div', 'ao-bars'); tb.setAttribute('role', 'group'); tb.setAttribute('aria-label', 'Tonebars');
    var inputs = [];
    FEET.forEach(function (f, i) {
      var col = el('div', 'ao-bar ao-' + COLOUR[i]), inp = el('input'); inp.type = 'range'; inp.min = 0; inp.max = 8; inp.step = 1; inp.value = bars[i];
      inp.setAttribute('orient', 'vertical'); inp.setAttribute('aria-label', f + ' tonebar: ' + WHAT[i]);
      var num = el('div', 'ao-num', String(bars[i])), lab = el('div', 'ao-feet', f);
      inp.addEventListener('input', function () { bars[i] = +inp.value; num.textContent = inp.value; apply(); });
      col.appendChild(num); col.appendChild(inp); col.appendChild(lab); tb.appendChild(col); inputs.push({ inp: inp, num: num });
    });
    top.appendChild(tb);
    // what the bars add up to: one line per pitch, its height the bar's level
    var spec = el('div', 'ao-spec'); top.appendChild(spec);
    node.appendChild(top);
    var regRow = el('div', 'ao-row'), reg = el('select', 'form-select form-select-sm ao-reg'); reg.setAttribute('aria-label', 'Registration');
    reg.appendChild(new Option('Registrations…', ''));
    REGS.forEach(function (r) { reg.appendChild(new Option(r.label, r.id)); });
    var regWhat = el('p', 'ao-what', '');
    reg.addEventListener('change', function () { var r = REGS.filter(function (x) { return x.id === reg.value; })[0]; if (!r) return;
      bars = r.id.split('').map(Number); inputs.forEach(function (x, i) { x.inp.value = bars[i]; x.num.textContent = bars[i]; }); regWhat.textContent = r.what; apply(); });
    regRow.appendChild(el('label', 'ar-lbl', 'Start from')); regRow.appendChild(reg); node.appendChild(regRow); node.appendChild(regWhat);

    // the keyboard: C3 to C5, and a chord to hold
    var kb = el('div', 'ao-keys'); kb.setAttribute('aria-label', 'Keyboard: hold a key to sound it');
    for (var m = 48; m <= 72; m++) (function (m) {
      var black = [1, 3, 6, 8, 10].indexOf(m % 12) >= 0, k = el('button', 'ao-key ' + (black ? 'ao-blk' : 'ao-wht')); k.type = 'button';
      k.setAttribute('aria-label', NAMES[m % 12] + (Math.floor(m / 12) - 1)); k.dataset.midi = m;
      k.addEventListener('pointerdown', function (e) { e.preventDefault(); k.setPointerCapture && k.setPointerCapture(e.pointerId); down(m); });
      k.addEventListener('pointerup', function () { up(m); }); k.addEventListener('pointercancel', function () { up(m); });
      k.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); down(m); } });
      k.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') up(m); });
      kb.appendChild(k);
    })(m);
    node.appendChild(kb);
    var chordRow = el('div', 'ao-row'), hold = el('button', 'btn btn-sm btn-outline-secondary', 'Hold a chord (C7)'); hold.type = 'button';
    hold.setAttribute('aria-pressed', 'false');
    hold.addEventListener('click', function () {
      var on = hold.getAttribute('aria-pressed') !== 'true'; hold.setAttribute('aria-pressed', String(on)); hold.classList.toggle('ar-on', on);
      [48, 58, 64, 67].forEach(function (m) { if (on) down(m, true); else up(m, true); });
    });
    chordRow.appendChild(hold); chordRow.appendChild(el('span', 'ao-hint', 'Hold the chord, then move the tonebars, the pedal and the Leslie while it sounds.'));
    node.appendChild(chordRow);
    function down(m, sticky) {
      if (heldKeys[m]) return; heldKeys[m] = { sticky: !!sticky, v: null };
      var k = kb.querySelector('[data-midi="' + m + '"]'); if (k) k.classList.add('ao-down');
      P.chord([m], { inst: 'hammond', dur: 120, vel: 0.8 }).then(function (v) { if (heldKeys[m]) heldKeys[m].v = v; else P.release(v, 0.02); });
    }
    function up(m, sticky) {
      var h = heldKeys[m]; if (!h || (h.sticky && !sticky)) return; delete heldKeys[m];
      var k = kb.querySelector('[data-midi="' + m + '"]'); if (k) k.classList.remove('ao-down');
      if (h.v) P.release(h.v, 0.02);
    }

    // chorus / vibrato, swell, Leslie, key click
    var ctl = el('div', 'ao-ctl');
    function group(title, kids) { var g = el('fieldset', 'ao-group'); g.appendChild(el('legend', '', title)); kids.forEach(function (k) { g.appendChild(k); }); ctl.appendChild(g); return g; }
    function seg(name, opts, value, fn) {
      var r = el('div', 'ao-seg'); r.setAttribute('role', 'radiogroup'); r.setAttribute('aria-label', name);
      opts.forEach(function (o) { var b = el('button', 'btn btn-sm btn-outline-secondary', o[1]); b.type = 'button'; b.setAttribute('role', 'radio');
        function sel() { Array.prototype.forEach.call(r.children, function (x) { var on = x === b; x.classList.toggle('ar-on', on); x.setAttribute('aria-checked', String(on)); }); }
        b.addEventListener('click', function () { sel(); fn(o[0]); }); r.appendChild(b); if (o[0] === value) sel(); else b.setAttribute('aria-checked', 'false'); });
      return r;
    }
    var amp = S.getAmp('hammond'), scan = amp[0];
    var chorusSeg = seg('Vibrato and chorus', [['0', 'Off'], ['0.5', 'C3 chorus'], ['1', 'V3 vibrato']], String(scan.mix), function (v) {
      var a = S.getAmp('hammond'); a[0].mix = +v; S.setAmp('hammond', a); });
    group('Vibrato and chorus', [chorusSeg, el('p', 'ao-hint', 'The scanner sweeps the sound back and forth through a tiny delay 6.9 times a second. Alone that bends the pitch (vibrato); mixed half and half with the straight sound it shimmers (chorus).')]);

    var swell = el('input', 'form-range ao-swell'); swell.type = 'range'; swell.min = 0; swell.max = 1; swell.step = 0.01;
    var sw0 = S.getControl('hammond', 'swell'); swell.value = typeof sw0 === 'number' ? sw0 : 0.7; swell.setAttribute('aria-label', 'Swell pedal');
    var swAuto = el('label', 'ao-auto'), swCb = el('input'); swCb.type = 'checkbox'; swCb.checked = true; swAuto.appendChild(swCb); swAuto.appendChild(document.createTextNode(' Let the band\'s organist work it'));
    var pedal = pedalSvg(); function paintPedal() { pedal.querySelector('.ao-plate').setAttribute('transform', 'rotate(' + (-22 + 22 * swell.value) + ' 20 70)'); }
    swell.addEventListener('input', function () { S.setControl('hammond', 'swell', +swell.value); swCb.checked = false; organHand.swell = +swell.value; paintPedal(); if (now) refresh(now); });
    swCb.addEventListener('change', function () { organHand.swell = swCb.checked ? null : +swell.value; if (now) refresh(now); });
    paintPedal();
    var swRow = el('div', 'ao-row'); swRow.appendChild(pedal); var swRight = el('div'); swRight.appendChild(el('div', 'ao-ends', '')); swRight.firstChild.innerHTML = '<span>heel down: quiet</span><span>toe down: full</span>'; swRight.appendChild(swell); swRight.appendChild(swAuto); swRow.appendChild(swRight);
    group('Swell pedal', [swRow, el('p', 'ao-hint', 'The organ has no touch: a key sounds the same however hard it is hit. The pedal is the only way to play louder or softer. Closed, it is 24 dB down, never silent, and it keeps the bass up.')]);

    var lesAuto = el('label', 'ao-auto'), lesCb = el('input'); lesCb.type = 'checkbox'; lesCb.checked = true; lesAuto.appendChild(lesCb); lesAuto.appendChild(document.createTextNode(' Let the band\'s organist switch it'));
    var rotor = rotorSvg(), speed = S.getControl('hammond', 'leslie') || 'slow';
    var lesSeg = seg('Leslie speed', [['stop', 'Stop'], ['slow', 'Slow (chorale)'], ['fast', 'Fast (tremolo)']], speed, function (v) {
      speed = v; S.setControl('hammond', 'leslie', v); lesCb.checked = false; organHand.leslie = v; if (now) refresh(now); });
    lesCb.addEventListener('change', function () { organHand.leslie = lesCb.checked ? null : speed; if (now) refresh(now); });
    group('Leslie speaker', [rotor, lesSeg, lesAuto, el('p', 'ao-hint', 'Above 800 Hz the sound goes to a spinning horn, below it to a spinning drum. As each turns toward you it gets louder and its pitch rises a little. The horn changes speed in about a second and a half; the heavy drum takes about five.')]);

    var click = el('input', 'form-range'); click.type = 'range'; click.min = 0; click.max = 1; click.step = 0.05; var c0 = S.getControl('hammond', 'click'); click.value = typeof c0 === 'number' ? c0 : 0.5;
    click.setAttribute('aria-label', 'Key click'); click.addEventListener('input', function () { S.setControl('hammond', 'click', +click.value); });
    group('Key click', [click, el('p', 'ao-hint', 'A key closes nine contacts, never quite together: a short tick at the start of each note. Players came to like it.')]);
    node.appendChild(ctl);

    // spin the picture at the model's own speeds, easing as the real rotors do
    var ang = { h: 0, d: 0 }, rate = { h: 0.8, d: 0.68 }, last = 0;
    var target = function () { var f = speed === 'fast' ? 6.67 : speed === 'stop' ? 0 : 0.8; return { h: f, d: f * 0.85 }; };
    function frame(t) {
      var dt = last ? Math.min(0.1, (t - last) / 1000) : 0; last = t; var g = target();
      rate.h += (g.h - rate.h) * (1 - Math.exp(-dt / (g.h > rate.h ? 0.5 : 0.8))); rate.d += (g.d - rate.d) * (1 - Math.exp(-dt / (g.d > rate.d ? 1.8 : 2.2)));
      ang.h = (ang.h + 360 * rate.h * dt) % 360; ang.d = (ang.d + 360 * rate.d * dt) % 360;
      rotor.querySelector('.ao-horn').setAttribute('transform', 'rotate(' + ang.h.toFixed(1) + ' 60 34)');
      rotor.querySelector('.ao-drum').setAttribute('transform', 'rotate(' + ang.d.toFixed(1) + ' 60 104)');
      rotor.querySelector('.ao-rpm').textContent = 'horn ' + Math.round(rate.h * 60) + ' rpm · drum ' + Math.round(rate.d * 60) + ' rpm';
      requestAnimationFrame(frame);
    }
    if (!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches)) requestAnimationFrame(frame);
    else rotor.querySelector('.ao-rpm').textContent = 'horn 48 rpm slow, 400 fast';

    function apply() { S.setTonebars('hammond', bars); paintSpec(); }
    function paintSpec() {
      var base = 60, W = 300, H = 120, ns = 'http://www.w3.org/2000/svg';
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="The pitches that sound for middle C, each as tall as its tonebar is pulled out">';
      // a log-frequency axis from C2 to C8
      function x(midi) { return 14 + (midi - 36) / 72 * (W - 28); }
      for (var o = 36; o <= 108; o += 12) s += '<line x1="' + x(o) + '" x2="' + x(o) + '" y1="8" y2="' + (H - 18) + '" class="ao-grid"/><text x="' + x(o) + '" y="' + (H - 5) + '" class="ao-ax">C' + (o / 12 - 1) + '</text>';
      STEP.forEach(function (st, i) {
        var m = base + st, h = bars[i] ? (bars[i] / 8) * (H - 34) : 0, cls = 'ao-line ao-l' + COLOUR[i];
        if (bars[i]) s += '<line x1="' + x(m) + '" x2="' + x(m) + '" y1="' + (H - 18) + '" y2="' + (H - 18 - h) + '" class="' + cls + '"/><text x="' + x(m) + '" y="' + (H - 21 - h) + '" class="ao-ax">' + FEET[i] + '</text>';
      });
      spec.innerHTML = s + '</svg><p class="ao-hint">What middle C sounds as: one line per tonebar pulled out, at its pitch, as tall as the bar is pulled.</p>';
    }
    paintSpec();
  }
  function pedalSvg() {
    var d = el('div', 'ao-pedal'); d.innerHTML = '<svg viewBox="0 0 80 84" width="80" height="84" aria-hidden="true"><rect x="8" y="70" width="64" height="8" rx="2" class="ao-base"/>'
      + '<g class="ao-plate"><rect x="14" y="58" width="56" height="10" rx="3" class="ao-shoe"/></g><circle cx="20" cy="70" r="4" class="ao-pivot"/></svg>'; return d;
  }
  function rotorSvg() {
    var d = el('div', 'ao-rotor'); d.innerHTML = '<svg viewBox="0 0 120 140" width="120" height="140" role="img" aria-label="The two rotors of the speaker, seen from above">'
      + '<rect x="4" y="4" width="112" height="132" rx="6" class="ao-cab"/>'
      + '<circle cx="60" cy="34" r="25" class="ao-ring"/><g class="ao-horn"><path d="M60 34 L84 26 L84 42 Z" class="ao-hornp"/><path d="M60 34 L42 30 L42 38 Z" class="ao-dummy"/><circle cx="60" cy="34" r="4" class="ao-hub"/></g>'
      + '<text x="60" y="68" class="ao-ax">horn: above 800 Hz</text>'
      + '<circle cx="60" cy="104" r="26" class="ao-ring"/><g class="ao-drum"><path d="M60 104 m-24 0 a24 24 0 0 1 48 0 Z" class="ao-drump"/><circle cx="60" cy="104" r="4" class="ao-hub"/></g>'
      + '<text x="60" y="134" class="ao-ax">drum: below</text></svg><div class="ao-rpm"></div>';
    return d;
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('.ar-demo'), buildDemo);
    Array.prototype.forEach.call(document.querySelectorAll('.ar-organ'), mkOrgan);
    var t = $('ar-tempo'), tn = $('ar-tempo-n');
    function setT(v) { v = Math.max(40, Math.min(220, +v || 100)); tempoOverride = v; t.value = v; tn.value = v; if (player && now) player.setTempo(v); }
    if (t) { t.value = tn.value = 100; t.addEventListener('input', function () { setT(t.value); }); tn.addEventListener('change', function () { setT(tn.value); }); }
    var s = $('ar-stop'); if (s) s.addEventListener('click', stop);
    if (global.PlayBar && $('ar-bar')) global.PlayBar.attach($('ar-bar'), { live: function () { return !!now; } });
  }
  global.ArrangeLesson = { init: init, abcOf: abcOf };
})(window);
