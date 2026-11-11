// tuning-kit.js — widgets for tunings that are not twelve-note: scales written in notation with their cents from the piano,
// and pitch-entry surfaces (isomorphic grids, Janko, LinnStrument-style pads, a microtonal fretboard). They are synth-kit kinds
// (same card, volume bar, one-sound-at-a-time), added through SynthKit.kinds / SynthKit.kit, so load this AFTER synth-kit.js.
// Kinds (<div class="sk" data-w="...">):
//   scale      a scale in a chosen tuning, written out (abcjs, quarter-tone accidentals) with each note's cents from the nearest
//              piano key above it; click a note to hear it; buttons play the scale, the piano's version, and BOTH TOGETHER
//              (the beating). data-set keys: tun (et24 et12 sanfen5 sanfen7 pure5 lu12), mode (0.. = which degree to start on,
//              for the pentatonic / seven-note ones), root (C Db D ... B), click (tuned piano both)
//   pitchgrid  an isomorphic grid you press to sound a note: layout (linn janko jankoq wicki harmonic strip custom), edo (12 24 19 31),
//              start octave, and x / y = how many steps one cell right / one row up moves. The notes you press are entered on a
//              staff (quarter-tone accidentals, cents when the pitch is between two written ones) and can be played back.
//   microfret  a fretboard with one fret per step of an equal division (12 24 19 31), real fret spacing, strings of a guitar or
//              bass; press a fret; the same staff entry.
// Facts: tunings below are exact arithmetic (ratios -> cents). The Chinese pitch names / which scale is which, the keyboard layouts'
// histories and the LinnStrument default row interval are from memory and NOT yet checked against a source (the lesson says so).
//   raga       a raga from six (Yaman Bhairav Bhupali Todi Malkauns Khamaj): swaras in 5-limit just intonation, ascent and descent written out,
//              a grid of which notes go up / down / both with vadi and samvadi, a drone, "as a plain scale" (what a raga adds), just vs piano
//              together, a slide (meend) and a wobble (andolan). Raga facts from memory: unverified (the lessons/ragas page says so).
//   unevenfret a 12-fret neck whose frets can be dragged; placements equal / rule of 18 / just / meantone / Pythagorean / Werckmeister III;
//              cents and mm (25.5 in scale) from equal under each fret; both together fret by fret.
//   tunesong   a tune from the site's collection (loaded on demand, searchable) with every note moved into a tuning (12 / 19 / 22 / 31 / 53-TET,
//              just, Pythagorean, meantone, neutral): play it tuned, on the piano, one then the other, or both at once.
//   splitkeys  a keyboard of split keys: ordinary, historical split sharps (14, quarter-comma meantone), and a MODEL (white in 3, black in 2,
//              31 equal steps; cut across, or wide keys cut lengthwise "hot-dog") that is NOT documented as a real instrument.
// Test: node tests/lessons/tuning-kit.cdp.js [shots dir] (after rendering lessons/tuning-systems, ragas and uneven-frets; copy this file into _site/apps/shared/lessons/ if it changed since).
(function (global) {
  var SK = global.SynthKit;
  if (!SK || !SK.kit) { console.error("tuning-kit.js needs synth-kit.js loaded first"); return; }
  var K = SK.kit, el = K.el, button = K.button, tone = K.tone, Base = K.Base, viewer = K.viewer, fmtHz = K.fmtHz, ROOTS = K.ROOTS;
  var C4 = 261.6256;
  function cf(c) { return C4 * Math.pow(2, c / 1200); }            // cents above middle C -> Hz
  function ratioC(n, d) { return 1200 * Math.log2(n / d); }
  function rich(c, out, f, t, dur, v) { tone(c, out, f, t, dur, v); tone(c, out, f * 2, t, dur, v * .35); tone(c, out, f * 3, t, dur, v * .15); }   // a few partials, so beats show in more than one place

  // ---------- spelling: cents above C4 -> a written note ----------
  var QT = [["C", ""], ["C", "^/"], ["C", "^"], ["D", "_/"], ["D", ""], ["D", "^/"], ["D", "^"], ["E", "_/"], ["E", ""], ["E", "^/"], ["F", ""], ["F", "^/"],
            ["F", "^"], ["G", "_/"], ["G", ""], ["G", "^/"], ["G", "^"], ["A", "_/"], ["A", ""], ["A", "^/"], ["B", "_"], ["B", "_/"], ["B", ""], ["B", "^/"]];
  var QN = ["C", "C¼♯", "C♯", "D¼♭", "D", "D¼♯", "D♯", "E¼♭", "E", "E¼♯", "F", "F¼♯", "F♯", "G¼♭", "G", "G¼♯", "G♯", "A¼♭", "A", "A¼♯", "B♭", "B¼♭", "B", "B¼♯"];
  // quarter: round to the nearest quarter tone (50 cents); otherwise to the nearest semitone. Returns the written note, the
  // piano key it is read against (base: the semitone below a ¼♯, above a ¼♭), and two offsets in cents:
  //   off  = from that piano key (what the lesson's "cents from the piano" shows), offW = from the written pitch itself.
  function spell(c, quarter) {
    var q = quarter ? Math.round(c / 50) : 2 * Math.round(c / 100), oct = Math.floor(q / 24), i = ((q % 24) + 24) % 24, t = QT[i];
    var base = i % 2 === 0 ? i / 2 : (t[1] === "^/" ? (i - 1) / 2 : (i + 1) / 2);
    var baseC = oct * 1200 + base * 100, o = oct;
    var L = o <= 0 ? t[0] : t[0].toLowerCase() + (o >= 2 ? "'".repeat(o - 1) : "");
    if (o < 0) L = t[0] + ",".repeat(-o);
    return { q: q, oct: oct, i: i, letter: t[0], acc: t[1], name: QN[i], key: t[1] + L, pitch: t[0] + oct, baseC: baseC, off: c - baseC, offW: c - q * 50, f: cf(q * 50), fPiano: cf(baseC) };
  }
  // ABC for a list of spelled notes: bar every 4, a new line every `row`. notes[i] = {s: spelled, top: text above, bot: text below}.
  // Accidentals persist inside a bar, so a repeat of the same letter+octave drops the sign, and a natural after a sharp is written =.
  function abcOf(notes, row) {
    var out = "X:1\nL:1/4\nM:none\nK:C\n", st = {}, toks = [];
    notes.forEach(function (n, i) {
      var s = n.s, k = s.pitch, want = s.acc, has = st[k] || "", pre = "";
      if (want.indexOf("/") >= 0) pre = want; else if (want !== has) pre = want || "="; st[k] = want;
      var body = pre + s.key.slice(s.acc.length);
      var ann = (n.top ? '"^' + n.top + '"' : "") + (n.bot ? '"_' + n.bot + '"' : "");
      var a = out.length; out += ann + body; toks.push([a, out.length]);
      var last = i === notes.length - 1;
      if (last) out += " |]\n"; else if ((i + 1) % row === 0) { out += " |\n"; st = {}; } else if ((i + 1) % 4 === 0) { out += " | "; st = {}; } else out += " ";
    });
    return { text: out, toks: toks };
  }
  function signed(v) { var r = Math.round(v); return (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r); }
  function draw(host, abc, onClick) {
    if (!global.ABCJS) { host.textContent = "(notation library missing)"; return; }
    ABCJS.renderAbc(host, abc.text, { responsive: "resize", add_classes: true, paddingleft: 0, paddingright: 0, staffwidth: 740, clickListener: function (e) {
      if (!onClick) return; for (var i = 0; i < abc.toks.length; i++) if (e.startChar >= abc.toks[i][0] && e.startChar < abc.toks[i][1]) { onClick(i); return; } } });
  }

  // ---------- the tunings (cents above the first note; one octave, top note included) ----------
  var P5 = ratioC(3, 2);
  function fifths(n) { var c = n * P5; return ((c % 1200) + 1200) % 1200; }
  var TUN = {
    et24: { label: "24-tone equal temperament (quarter tones)", quarter: true, row: 13,
            deg: function () { var a = []; for (var i = 0; i <= 24; i++) a.push(i * 50); return a; }, names: null, rat: null,
            note: "Every second note is a piano key; the others lie exactly halfway between two keys, 50 cents from both." },
    et12: { label: "12-tone equal temperament (the piano)", quarter: false, row: 13,
            deg: function () { var a = []; for (var i = 0; i <= 12; i++) a.push(i * 100); return a; }, names: null, rat: null, note: "The reference: every note is exactly a piano key." },
    sanfen5: { label: "Chinese pentatonic, sanfen sunyi (chain of pure fifths)", quarter: false, row: 6, modes: true,
               deg: function () { return [0, fifths(2), fifths(4), fifths(1), fifths(3)].map(function (x) { return x; }).sort(function (a, b) { return a - b; }); },
               names: ["gong 宮", "shang 商", "jue 角", "zhi 徵", "yu 羽"], rat: ["1", "9:8", "81:64", "3:2", "27:16"],
               note: "Five notes from a chain of pure 3:2 fifths folded into one octave. The thirds (jue) are Pythagorean: 81:64, about 8 cents wider than the piano's." },
    sanfen7: { label: "Chinese seven-note, sanfen sunyi (adds bian-zhi and bian-gong)", quarter: false, row: 8, modes: true,
               deg: function () { return [0, fifths(2), fifths(4), fifths(6), fifths(1), fifths(3), fifths(5)].sort(function (a, b) { return a - b; }); },
               names: ["gong 宮", "shang 商", "jue 角", "bian-zhi 變徵", "zhi 徵", "yu 羽", "bian-gong 變宮"], rat: ["1", "9:8", "81:64", "729:512", "3:2", "27:16", "243:128"],
               note: "The five plus two 'changing' notes, all from the same fifths chain. Bian-zhi (729:512) is a sharp fourth, 11.7 cents above the piano's F♯." },
    pure5: { label: "Pentatonic in pure ratios (5-limit, major thirds and sixths pure)", quarter: false, row: 6, modes: true,
             deg: function () { return [0, ratioC(9, 8), ratioC(5, 4), ratioC(3, 2), ratioC(5, 3)]; },
             names: ["1", "2", "3", "5", "6"], rat: ["1", "9:8", "5:4", "3:2", "5:3"],
             note: "Compare with the sanfen sunyi pentatonic: the third and sixth are about 22 cents lower, where the harmonic series puts them." },
    lu12: { label: "The twelve lü (sanfen sunyi, eleven fifths up from huangzhong)", quarter: false, row: 13,
            deg: function () { var a = []; for (var i = 0; i < 12; i++) a.push(fifths(i)); a.sort(function (x, y) { return x - y; }); return a; },
            names: ["huangzhong 黃鐘", "dalü 大呂", "taicu 太簇", "jiazhong 夾鐘", "guxian 姑洗", "zhonglü 仲呂", "ruibin 蕤賓", "linzhong 林鐘", "yize 夷則", "nanlü 南呂", "wuyi 無射", "yingzhong 應鐘"],
            rat: ["1", "2187:2048", "9:8", "19683:16384", "81:64", "177147:131072", "729:512", "3:2", "6561:4096", "27:16", "59049:32768", "243:128"],
            note: "Twelve notes from eleven pure fifths, not twelve, so the chain does not close: the twelfth fifth would be off by the Pythagorean comma, 23.5 cents (the wolf of the lesson on commas). Zhonglü, at the end of the chain, is 521.5 cents, sharp of the piano's F." }
  };
  function edo(n, label, note) { return { label: label, quarter: true, row: 13, deg: function () { var a = []; for (var i = 0; i <= n; i++) a.push(i * 1200 / n); return a; }, names: null, rat: null, note: note }; }
  TUN.et19 = edo(19, "19-tone equal temperament", "Steps of 63.2 cents. The minor third (315.8) is almost pure 6:5; the fifth (694.7) is 7 cents narrow. The 'sharp' and 'flat' of a note are different pitches here, and each is read against the nearest piano key, so the cents shown can be large.");
  TUN.et31 = edo(31, "31-tone equal temperament", "Steps of 38.7 cents. Major third 387.1 (pure is 386.3), fifth 696.8, and the seventh harmonic is close (967.7 against 968.8). Each step is about a fifth of a tone.");
  TUN.et53 = edo(53, "53-tone equal temperament", "Steps of 22.6 cents. The fifth is within 0.07 cent of 3:2 and the major third within 1.4 cents, so it can stand in for just intonation. Notes are spelled to the nearest quarter tone; the figure over each is its distance from the piano key.");
  TUN.rast = { label: "Arabic maqam Rast (24-TET approximation)", quarter: true, row: 8, names: null, rat: null,
               deg: function () { return [0, 200, 350, 500, 700, 900, 1050, 1200]; }, note: "Rast with its neutral third and seventh written as 350 and 1050 cents, the quarter-tone approximation. Performers' actual intervals vary by region and player (the lesson says so); unverified." };
  TUN.bayati = { label: "Arabic maqam Bayati (24-TET approximation)", quarter: true, row: 8, names: null, rat: null,
                 deg: function () { return [0, 150, 300, 500, 700, 800, 1000, 1200]; }, note: "Bayati: a neutral second (150 cents) above the tonic, then a minor third. A 24-TET approximation; unverified." };
  TUN.hijaz = { label: "Arabic maqam Hijaz (12-TET reading)", quarter: false, row: 8, names: null, rat: null,
                deg: function () { return [0, 100, 400, 500, 700, 800, 1000, 1200]; }, note: "Hijaz: a half step, then an augmented second (300 cents). Usually written on the piano keys; performers often tune the notes a little differently. Unverified." };
  TUN.slendro = { label: "Gamelan slendro (five near-equal steps)", quarter: true, row: 6, names: null, rat: null,
                  deg: function () { return [0, 240, 480, 720, 960, 1200]; }, note: "Five equal steps of 240 cents. Real slendro is rarely equal and no two gamelans match, so this is the idealised version. Unverified for any one ensemble." };
  TUN.pelog = { label: "Gamelan pelog (an illustration)", quarter: true, row: 8, names: null, rat: null,
                deg: function () { return [0, 120, 270, 540, 670, 785, 950, 1200]; }, note: "Seven unequal steps: small, small-large, a big gap. These numbers are an illustration written from memory, not a measured ensemble; every gamelan is tuned differently. Unverified." };
  var TUN_ORDER = ["et24", "et12", "et19", "et31", "et53", "sanfen5", "sanfen7", "pure5", "lu12", "rast", "bayati", "hijaz", "slendro", "pelog"];
  // the notes of a tuning, rotated to start on degree `mode`: [{c: cents above the root, name, rat}], with the octave on top
  function degrees(tun, mode) {
    var T = TUN[tun], d = T.deg(), n = T.names ? d.length : d.length - 1, out = [], k = T.modes ? mode % n : 0, i;
    if (!T.names) { for (i = 0; i <= n; i++) out.push({ c: d[i], name: "", rat: "" }); return out; }
    for (i = 0; i <= n; i++) { var j = (k + i) % n, up = k + i >= n ? 1200 : 0; out.push({ c: d[j] + up - d[k], name: T.names[j], rat: T.rat[j] }); }
    out[n].name = T.names[k]; return out;
  }

  // ---------- injected CSS ----------
  var css = el("style"); css.textContent =
    ".tk-staff{margin:.4rem 0}.tk-staff svg{max-width:100%}.tk-note{font-size:.85rem;color:var(--site-ink-2);margin:.3rem 0}" +
    ".tk-grid{width:100%;touch-action:none;user-select:none;-webkit-user-select:none}.tk-grid .tk-c{cursor:pointer;stroke:var(--site-border);stroke-width:1.2}" +
    ".tk-grid .tk-c.w{fill:var(--site-surface)}.tk-grid .tk-c.b{fill:color-mix(in srgb,var(--site-ink) 16%,var(--site-surface))}" +
    ".tk-grid .tk-c.q{fill:color-mix(in srgb,var(--site-accent) 22%,var(--site-surface))}.tk-grid .tk-c.o{stroke:var(--site-accent-dk);stroke-width:2.4}" +
    ".tk-grid .tk-c.on,.tk-fret .tk-z.on{fill:var(--site-accent)!important}.tk-grid text,.tk-fret text{pointer-events:none;font:13px system-ui,sans-serif;fill:var(--site-ink);text-anchor:middle}" +
    ".tk-fret{width:100%;touch-action:none;user-select:none;-webkit-user-select:none}.tk-fret .tk-z{fill:transparent;cursor:pointer}.tk-fret .tk-z:hover{fill:color-mix(in srgb,var(--site-accent) 18%,transparent)}" +
    ".tk-fret .fr12{stroke:var(--site-ink);stroke-width:2}.tk-fret .frq{stroke:var(--site-accent-dk);stroke-width:1;stroke-dasharray:3 3}.tk-fret .str{stroke:var(--site-ink-2)}" +
    ".tk-ragagrid{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem;margin:.4rem 0}.tk-sw{display:inline-block;min-width:2.1rem;text-align:center;padding:.15rem .3rem;border:1px solid var(--site-border);border-radius:4px;font-size:.85rem}" +
    ".tk-sw.both{background:var(--site-accent);color:#fff}.tk-sw.up{background:color-mix(in srgb,var(--site-accent) 30%,var(--site-surface))}.tk-sw.up::after{content:\" ▲\";font-size:.6rem}.tk-sw.down{background:color-mix(in srgb,var(--site-accent) 30%,var(--site-surface))}.tk-sw.down::after{content:\" ▼\";font-size:.6rem}.tk-sw.none{opacity:.45}.tk-sw.vadi{outline:2px solid var(--site-ink);outline-offset:1px}.tk-sw.sam{outline:2px dashed var(--site-ink);outline-offset:1px}" +
    ".tk-uneven .frg{stroke:var(--site-ink-2);stroke-width:1;stroke-dasharray:2 4;opacity:.7}.tk-uneven .fru{stroke:var(--site-accent-dk)}.tk-uneven .tk-handle{fill:var(--site-accent);cursor:ew-resize;stroke:var(--site-ink);stroke-width:1}.tk-uneven .tk-hl{fill:#fff;font-size:10px}.tk-uneven .tk-lh{text-anchor:start;font-size:10px;opacity:.7}" +
    ".tk-keys{width:100%;touch-action:none;user-select:none;-webkit-user-select:none}.tk-keys .tk-p{cursor:pointer;stroke:var(--site-ink-2);stroke-width:1}.tk-keys .tk-p.n{fill:var(--site-surface)}.tk-keys .tk-p.q{fill:color-mix(in srgb,var(--site-accent) 22%,var(--site-surface))}.tk-keys .tk-p.blk.n{fill:#2b2b2b}.tk-keys .tk-p.blk.q{fill:color-mix(in srgb,var(--site-accent-dk) 70%,#222)}.tk-keys .tk-p.on{fill:var(--site-accent)!important}.tk-keys text{pointer-events:none;font:10px system-ui,sans-serif;fill:var(--site-ink);text-anchor:middle}.tk-keys .tk-bl{fill:#fff}" +
    ".tk-key{display:flex;flex-wrap:wrap;gap:.3rem 1rem;font-size:.78rem;color:var(--site-ink-2);margin:.2rem 0}.tk-key i{display:inline-block;width:.9em;height:.9em;border:1px solid var(--site-border);vertical-align:-.1em;margin-right:.3em}";
  document.head.appendChild(css);

  // ======================================================================================
  // scale: a tuning written out, beside the piano.
  function Scale(host) {
    var w = Base(host, "A scale, in notation, against the piano"), info = el("p", "sk-info", "Click a note to hear it."), staff = el("div", "tk-staff"), note = el("p", "tk-note");
    w.playLabel = "▶ Play"; w.playBtn.remove();
    var state = { notes: [] };
    w.pick("tun", "Tuning", TUN_ORDER.map(function (k) { return [k, TUN[k].label]; }), "sanfen5", null, function () { modeSel(); rebuild(); });
    var modeBox = w.pick("mode", "Start on", [["0", "1st note"]], "0", null, function () { rebuild(); });
    w.pick("root", "First note", ROOTS.map(function (r) { return [r[0], r[1] + "4"]; }), "C", null, function () { rebuild(); });
    w.pick("click", "A click plays", [["tuned", "The note in this tuning"], ["piano", "The nearest piano note"], ["both", "Both together (beats)"]], "tuned");
    function modeSel() {
      var T = TUN[w.P.tun], s = modeBox.input; s.innerHTML = "";
      (T.modes ? T.names : ["1st note"]).forEach(function (nm, i) { var o = el("option", null, nm); o.value = String(i); s.appendChild(o); });
      modeBox.el.style.display = T.modes ? "" : "none"; s.value = "0"; w.P.mode = "0";
    }
    var row = el("div", "sk-presets");
    button(row, "▶ Up the scale", function () { play("tuned"); });
    button(row, "▶ The piano's notes", function () { play("piano"); });
    button(row, "▶ This tuning, then the piano", function () { play("then"); });
    button(row, "▶ Both together, one note at a time", function () { play("both"); });
    button(row, "■", function () { w.stop(); });
    w.body.insertBefore(row, w.ctls.nextSibling);
    w.body.appendChild(staff); w.body.appendChild(info); w.body.appendChild(note);
    w.view = viewer(w.body, { noScope: false, ms: 40 });
    var rootC = function () { return (ROOTS.filter(function (r) { return r[0] === w.P.root; })[0][2] % 12) * 100; };
    function rebuild() {
      var T = TUN[w.P.tun], ds = degrees(w.P.tun, +w.P.mode || 0), r0 = rootC();
      state.notes = ds.map(function (d) {
        var s = spell(r0 + d.c, T.quarter), lab = Math.abs(s.off) < .5 ? "0" : signed(s.off);
        return { s: s, d: d, f: cf(r0 + d.c), fp: s.fPiano, top: lab === "0" ? "" : lab, bot: d.name ? d.name.split(" ")[0] : "" };
      });
      draw(staff, abcOf(state.notes, T.row), one);
      note.textContent = T.note; info.textContent = "Click a note to hear it. The figure above each note is its distance in cents from the piano key it is read against.";
      w.stop();
    }
    function fireInfo(i) {
      var n = state.notes[i], d = Math.abs(n.s.off) < .5 ? 0 : n.s.off, beat = Math.abs(n.f - n.fp);
      info.textContent = (n.d.name ? n.d.name + " " : "") + n.s.name + ": " + fmtHz(n.f) + (n.d.rat ? " (" + n.d.rat + " above the first note)" : "") + ". Piano: " + fmtHz(n.fp) + ". "
        + (d === 0 ? "The same pitch." : Math.abs(d).toFixed(1) + " cents " + (d > 0 ? "above" : "below") + " the piano key") + (d === 0 ? "" : "; together they beat " + (beat < 10 ? beat.toFixed(2) : beat.toFixed(1)) + " times a second.");
    }
    function one(i) {
      w.start(); var c = SK.ac(), t = c.currentTime + .02, n = state.notes[i], m = w.P.click;
      if (m === "tuned" || m === "both") rich(c, w.out, n.f, t, m === "both" ? 3 : 1.4, m === "both" ? .2 : .3);
      if (m === "piano" || m === "both") rich(c, w.out, n.fp, t, m === "both" ? 3 : 1.4, m === "both" ? .2 : .3);
      fireInfo(i);
    }
    var timer = null;
    w.onStart = function () { return function () { clearTimeout(timer); }; };
    function play(how) {
      w.stop(); w.start(); var c = SK.ac(), t = c.currentTime + .05, N = state.notes.length, step = how === "both" ? 2.2 : .5, end = 0;
      state.notes.forEach(function (n, i) {
        if (how === "tuned") rich(c, w.out, n.f, t + i * step, .45, .28);
        else if (how === "piano") rich(c, w.out, n.fp, t + i * step, .45, .28);
        else if (how === "then") { rich(c, w.out, n.f, t + i * step, .45, .28); rich(c, w.out, n.fp, t + (N + 1) * step + i * step, .45, .28); }
        else { rich(c, w.out, n.f, t + i * step, 2, .2); rich(c, w.out, n.fp, t + i * step, 2, .2); }
      });
      end = (how === "then" ? 2 * N + 1 : N) * step + 1.5;
      info.textContent = how === "tuned" ? "The scale in this tuning." : how === "piano" ? "The same notes on a piano (the nearest key to each)." : how === "then" ? "This tuning, a pause, then the piano's notes."
        : "Each note with the piano's key at the same moment. Where they differ by a few cents you hear a slow wobble, the beating; a note that is the same on both is steady.";
      timer = setTimeout(function () { w.stop(); }, end * 1000);
    }
    modeSel(); rebuild();
    w.rebuild = rebuild; w.notes = function () { return state.notes; };
    return w;
  }

  // ======================================================================================
  // shared: a staff of the notes entered so far
  function entryLine(w, host, edo, getNote) {
    var box = el("div", "tk-entry"), staff = el("div", "tk-staff"), row = el("div", "sk-presets"), list = [];
    box.appendChild(row); box.appendChild(staff); host.appendChild(box);
    function redraw() {
      if (!list.length) { staff.innerHTML = '<p class="tk-note">Press a pad to sound it; the notes you press are written here.</p>'; return; }
      var ns = list.map(function (e) { var lab = (e.s.acc.indexOf("/") >= 0 && edo === 24) || Math.abs(e.s.offW) < 1 ? "" : signed(e.s.offW); return { s: e.s, top: lab }; });
      draw(staff, abcOf(ns, 12));
    }
    var timer = null;
    button(row, "▶ Play what I entered", function () {
      if (!list.length) return; w.stop(); w.start(); var c = SK.ac(), t = c.currentTime + .05;
      list.forEach(function (e, i) { rich(c, w.out, e.f, t + i * .45, .5, .28); });
      clearTimeout(timer); timer = setTimeout(function () { w.stop(); }, list.length * 450 + 800);
    });
    button(row, "Undo", function () { list.pop(); redraw(); });
    button(row, "Clear", function () { list = []; redraw(); });
    redraw();
    return { add: function (f) { var c = 1200 * Math.log2(f / C4); list.push({ f: f, s: spell(c, true) }); if (list.length > 36) list.shift(); redraw(); }, list: function () { return list; } };
  }
  // a held voice: a few partials, a short attack, a release
  function voice(c, out, f) {
    var g = c.createGain(), os = [1, 2, 3].map(function (k, i) { var o = c.createOscillator(), og = c.createGain(); o.frequency.value = f * k; og.gain.value = [1, .35, .15][i]; o.connect(og); og.connect(g); o.start(); return o; });
    var t = c.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.26, t + .015); g.connect(out);
    return function () { var t2 = c.currentTime; g.gain.cancelScheduledValues(t2); g.gain.setValueAtTime(g.gain.value, t2); g.gain.linearRampToValueAtTime(0, t2 + .18); os.forEach(function (o) { o.stop(t2 + .22); }); setTimeout(function () { try { g.disconnect(); } catch (e) {} }, 400); };
  }

  // ======================================================================================
  // pitchgrid
  var NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function stepsFor(edo, ratio) { return Math.round(edo * Math.log2(ratio)); }
  var LAYOUTS = {
    linn: { label: "LinnStrument-style pads (rows a fourth apart)", shape: "sq", cols: 16, rows: 8, x: function (n) { return 1; }, y: function (n) { return stepsFor(n, 4 / 3); }, shift: 0 },
    janko: { label: "Janko (rows are whole-tone scales, each a semitone above the last)", shape: "sq", cols: 14, rows: 6, x: function (n) { return n / 6; }, y: function (n) { return n / 12; }, shift: .5 },
    jankoq: { label: "Quarter-tone Janko (rows by semitone, offset by a quarter tone)", shape: "sq", cols: 14, rows: 6, x: function (n) { return Math.max(1, n / 12); }, y: function (n) { return Math.max(1, n / 24); }, shift: .5 },
    wicki: { label: "Wicki–Hayden (whole tone along a row, a fifth up and to the right)", shape: "hex", cols: 13, rows: 7, x: function (n) { return n / 6; }, y: function (n) { return stepsFor(n, 3 / 2); }, shift: .5 },
    harmonic: { label: "Harmonic table (fifths along a row, major thirds up)", shape: "hex", cols: 13, rows: 7, x: function (n) { return stepsFor(n, 3 / 2); }, y: function (n) { return stepsFor(n, 5 / 4); }, shift: .5 },
    strip: { label: "Chromatic strip (one row per octave)", shape: "sq", cols: 24, rows: 3, x: function (n) { return 1; }, y: function (n) { return n; }, shift: 0 },
    custom: { label: "Your own: choose the two steps below", shape: "sq", cols: 14, rows: 6, x: function (n) { return 2; }, y: function (n) { return 1; }, shift: 0 }
  };
  var EDOS = [["12", "12 per octave (the piano)"], ["24", "24 per octave (quarter tones)"], ["19", "19 per octave"], ["31", "31 per octave"]];
  function Pitchgrid(host) {
    var w = Base(host, "A grid for entering pitches"), svgEl = svg("svg", { "class": "tk-grid", role: "group", "aria-label": "Grid of pads. Each pad sounds one pitch." });
    w.playLabel = "▶ Play"; w.playBtn.remove();
    w.pick("layout", "Layout", Object.keys(LAYOUTS).map(function (k) { return [k, LAYOUTS[k].label]; }), "linn", null, function (v) { setLayout(v); });
    w.pick("edo", "Notes per octave", EDOS, "24", null, function () { setLayout(w.P.layout); });
    w.pick("oct", "Lowest pad", [["2", "C2"], ["3", "C3"], ["4", "C4"]], "3", null, function () { build(); });
    var cx = w.num("x", { label: "Steps per cell, right", min: 1, max: 40, step: 1, value: 1, fmt: function (v) { return Math.round(v) + (+w.P.edo === 24 ? " (" + (v / 2) + " st)" : ""); }, on: function () { build(); } });
    var cy = w.num("y", { label: "Steps per row, up", min: 0, max: 60, step: 1, value: 10, fmt: function (v) { return Math.round(v); }, on: function () { build(); } });
    var key = el("div", "tk-key"); key.innerHTML = '<span><i style="background:var(--site-surface)"></i>natural note</span><span><i style="background:color-mix(in srgb,var(--site-ink) 16%,var(--site-surface))"></i>sharp / flat</span><span><i style="background:color-mix(in srgb,var(--site-accent) 22%,var(--site-surface))"></i>between piano keys</span><span>ringed = C</span>';
    var info = el("p", "sk-info", "");
    w.body.appendChild(svgEl); w.body.appendChild(key); w.body.appendChild(info);
    var entry = entryLine(w, w.body, 24), cells = [], down = {};
    w.view = viewer(w.body, { ms: 40 });
    w.onStart = function () { return function () { Object.keys(down).forEach(release); }; };
    function edo() { return +w.P.edo; }
    function setLayout(v) {
      var L = LAYOUTS[v], n = edo(); if (v !== "custom") { cx.set(Math.max(1, Math.round(L.x(n)))); cy.set(Math.round(L.y(n))); } build();
    }
    function nameOf(step) {
      var n = edo(), within = ((step % n) + n) % n, oct = Math.floor(step / n);
      if (n === 12 || n === 24) { var s = spell(within * 1200 / n, true); return s.name; }
      return String(within);
    }
    function build() {
      svgEl.innerHTML = ""; cells = []; Object.keys(down).forEach(release);
      var L = LAYOUTS[w.P.layout], n = edo(), dx = +w.P.x, dy = +w.P.y, cw = 46, ch = L.shape === "hex" ? cw * 1.1547 : 40, pitch = L.shape === "hex" ? ch * .75 : ch;
      var cols = L.cols, rows = L.rows, shift = L.shift, base = (+w.P.oct - 4) * n;
      var W = (cols + (shift ? rows * shift : 0) + .5) * cw, H = (rows - 1) * pitch + ch + 6;
      svgEl.setAttribute("viewBox", "0 0 " + W.toFixed(0) + " " + H.toFixed(0));
      var shifted = shift ? Math.min(rows, 8) : 0;
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        var step = base + dx * x + dy * y, px = (x + y * shift) * cw + cw / 2, py = H - 3 - ch / 2 - y * pitch, within = ((step % n) + n) % n, cents = within * 1200 / n;
        var onPiano = Math.abs(cents / 100 - Math.round(cents / 100)) < .02, white = onPiano && [0, 2, 4, 5, 7, 9, 11].indexOf(Math.round(cents / 100)) >= 0;
        var cls = "tk-c " + (onPiano ? (white ? "w" : "b") : "q") + (within === 0 ? " o" : "");
        var shape;
        if (L.shape === "hex") { var r = cw / 2, pts = [0, 1, 2, 3, 4, 5].map(function (k) { var a = Math.PI / 180 * (60 * k - 30); return (px + r * Math.cos(a)).toFixed(1) + "," + (py + r * 1.1547 * Math.sin(a)).toFixed(1); }).join(" "); shape = svg("polygon", { points: pts, "class": cls }, svgEl); }
        else shape = svg("rect", { x: px - cw / 2 + 1, y: py - ch / 2 + 1, width: cw - 2, height: ch - 2, rx: 5, "class": cls }, svgEl);
        shape.setAttribute("data-step", step);
        var lab = svg("text", { x: px, y: py + 4 }, svgEl); lab.textContent = (n === 12 || n === 24) ? nameOf(step) : String(within);
        cells.push(shape);
      }
      info.textContent = "One cell right = " + dx + " step" + (dx === 1 ? "" : "s") + " (" + (dx * 1200 / n).toFixed(0) + " cents), one row up = " + dy + " step" + (dy === 1 ? "" : "s") + " (" + (dy * 1200 / n).toFixed(0) + " cents)."
        + (n !== 12 && n !== 24 ? " The number on a pad is its step within the octave (0–" + (n - 1) + ")." : "");
    }
    function fOf(step) { return cf((step - 0) * 1200 / edo()); }   // step counts from C4 (base already includes the octave offset)
    function press(id, cellEl) {
      if (!cellEl || !cellEl.getAttribute) return; var st = cellEl.getAttribute("data-step"); if (st == null) return;
      w.start(); var c = SK.ac(), f = fOf(+st); down[id] = { el: cellEl, stop: voice(c, w.out, f) }; cellEl.classList.add("on"); entry.add(f);
      var s = spell(1200 * Math.log2(f / C4), true);
      info.textContent = (edo() === 12 || edo() === 24 ? s.name + ": " : "step " + st + ": ") + fmtHz(f) + (Math.abs(s.off) < .5 ? "." : ", " + signed(s.off) + " cents from the piano key " + noteLetter(s) + ".");
    }
    function noteLetter(s) { var b = Math.round(s.baseC / 100) % 12; return ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"][((b % 12) + 12) % 12]; }
    function release(id) { var d = down[id]; if (!d) return; d.stop(); d.el.classList.remove("on"); delete down[id]; }
    svgEl.addEventListener("pointerdown", function (e) { e.preventDefault(); try { svgEl.setPointerCapture(e.pointerId); } catch (x) {} press(e.pointerId, e.target); });
    svgEl.addEventListener("pointermove", function (e) {
      var d = down[e.pointerId]; if (!d) return; var t = document.elementFromPoint(e.clientX, e.clientY);
      if (t && t !== d.el && t.getAttribute && t.getAttribute("data-step") != null) { release(e.pointerId); press(e.pointerId, t); }
    });
    ["pointerup", "pointercancel"].forEach(function (ev) { svgEl.addEventListener(ev, function (e) { release(e.pointerId); }); });
    w.press = function (step) { var c = cells.filter(function (x) { return +x.getAttribute("data-step") === step; })[0]; if (c) { press("api", c); return true; } return false; };
    w.release = function () { release("api"); };
    w.entry = entry; w.cells = function () { return cells; };
    setLayout("linn");
    return w;
  }

  // ======================================================================================
  // microfret
  var STRINGS = { guitar: { label: "Guitar (E A D G B E)", midi: [64, 59, 55, 50, 45, 40] }, bass: { label: "Bass (E A D G)", midi: [43, 38, 33, 28] },
                  violin: { label: "Violin-like, fretless dots (G D A E)", midi: [76, 69, 62, 55] } };
  function Microfret(host) {
    var w = Base(host, "A fretboard with a fret for every step"), box = svg("svg", { "class": "tk-fret", role: "group", "aria-label": "Fretboard. Press between two frets to sound the note." });
    w.playLabel = "▶ Play"; w.playBtn.remove();
    w.pick("edo", "Frets per octave", EDOS, "24", null, function () { build(); });
    w.pick("inst", "Strings", Object.keys(STRINGS).map(function (k) { return [k, STRINGS[k].label]; }), "guitar", null, function () { build(); });
    w.pick("lab", "Labels", [["name", "Note names"], ["cents", "Cents above the open string"], ["none", "None"]], "name", null, function () { build(); });
    var info = el("p", "sk-info", ""), key = el("div", "tk-key");
    key.innerHTML = '<span><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="currentColor" stroke-width="2"/></svg> a fret the piano has</span><span><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="currentColor" stroke-dasharray="3 3"/></svg> an extra fret</span>';
    w.body.appendChild(box); w.body.appendChild(key); w.body.appendChild(info);
    var entry = entryLine(w, w.body, 24), down = {}, zones = [];
    w.view = viewer(w.body, { ms: 40 });
    w.onStart = function () { return function () { Object.keys(down).forEach(release); }; };
    function build() {
      box.innerHTML = ""; zones = []; Object.keys(down).forEach(release);
      var n = +w.P.edo, S = STRINGS[w.P.inst].midi, W = 960, left = 56, wide = W - left - 14, gap = 30, H = 28 + S.length * gap + 22, top = 26;
      box.setAttribute("viewBox", "0 0 " + W + " " + H);
      function fx(k) { return left + wide * 2 * (1 - Math.pow(2, -k / n)); }   // real spacing, shortened so the octave fills the board
      var dots = {}; [3, 5, 7, 9, 12, 15, 17, 19, 21, 24].forEach(function (d) { dots[Math.round(d * n / 12)] = 1; });
      for (var k = 0; k <= n; k++) {
        var onPiano = n % 12 === 0 && k % (n / 12) === 0, x = fx(k);
        svg("line", { x1: x, y1: top - 4, x2: x, y2: top + (S.length - 1) * gap + 4, "class": k === 0 ? "fr12" : onPiano ? "fr12" : "frq" }, box);
        if (n <= 24 || k % 2 === 0 || k === n) { var t = svg("text", { x: k === 0 ? x - 12 : (x + fx(k - 1)) / 2, y: 14 }, box); t.textContent = k === 0 ? "" : String(k); }
        if (k > 0 && dots[k] && onPiano) svg("circle", { cx: (x + fx(k - 1)) / 2, cy: top + (S.length - 1) * gap + 14, r: 3.5, fill: "currentColor", opacity: .4 }, box);
      }
      S.forEach(function (m, si) {
        var y = top + si * gap;
        svg("line", { x1: left - 6, y1: y, x2: fx(n), y2: y, "class": "str", "stroke-width": 1 + (si / S.length) * 1.6 }, box);
        for (var k2 = 0; k2 <= n; k2++) {
          var x0 = k2 === 0 ? 8 : fx(k2 - 1), x1 = k2 === 0 ? left - 6 : fx(k2), cents = (m - 60) * 100 + k2 * 1200 / n, z = svg("rect", { x: x0 + 1, y: y - gap / 2 + 1, width: Math.max(1, x1 - x0 - 2), height: gap - 2, "class": "tk-z" }, box);
          z.setAttribute("data-c", cents.toFixed(3)); z.setAttribute("data-s", si); z.setAttribute("data-f", k2); zones.push(z);
          if (w.P.lab !== "none" && (k2 > 0 || true) && (n <= 24 || k2 % 2 === 0)) {
            var tx = svg("text", { x: (x0 + x1) / 2, y: y + 4, opacity: .75 }, box), s = spell(cents, true);
            tx.textContent = w.P.lab === "cents" ? String(Math.round(k2 * 1200 / n)) : (n === 12 || n === 24 ? s.name : String(k2));
            if (n > 24 && w.P.lab === "name") tx.textContent = String(k2);
          }
        }
      });
      info.textContent = "Frets are spaced as on a real neck (each step shortens the string by the same ratio), squeezed so one octave fills the board. Press between two frets, as a finger would; the part left of the nut is the open string.";
    }
    function press(id, z) {
      if (!z || !z.getAttribute || z.getAttribute("data-c") == null) return; var cents = +z.getAttribute("data-c"), f = cf(cents);
      w.start(); down[id] = { el: z, stop: voice(SK.ac(), w.out, f) }; z.classList.add("on"); entry.add(f);
      var s = spell(cents, true), fr = +z.getAttribute("data-f");
      info.textContent = (fr ? "Fret " + fr : "Open string") + ": " + (+w.P.edo === 12 || +w.P.edo === 24 ? s.name + ", " : "") + fmtHz(f) + (Math.abs(s.off) < .5 ? "." : ", " + signed(s.off) + " cents from the nearest piano key at or below the written note.");
    }
    function release(id) { var d = down[id]; if (!d) return; d.stop(); d.el.classList.remove("on"); delete down[id]; }
    box.addEventListener("pointerdown", function (e) { e.preventDefault(); try { box.setPointerCapture(e.pointerId); } catch (x) {} press(e.pointerId, e.target); });
    box.addEventListener("pointermove", function (e) { var d = down[e.pointerId]; if (!d) return; var t = document.elementFromPoint(e.clientX, e.clientY); if (t && t !== d.el && t.getAttribute && t.getAttribute("data-c") != null) { release(e.pointerId); press(e.pointerId, t); } });
    ["pointerup", "pointercancel"].forEach(function (ev) { box.addEventListener(ev, function (e) { release(e.pointerId); }); });
    w.press = function (si, fr) { var z = zones.filter(function (x) { return +x.getAttribute("data-s") === si && +x.getAttribute("data-f") === fr; })[0]; if (z) { press("api", z); return true; } return false; };
    w.release = function () { release("api"); };
    w.entry = entry; w.zones = function () { return zones; };
    build();
    return w;
  }


  // ======================================================================================
  // raga: a raga is not a scale. Swaras in just intonation (a 5-limit reading of the 22 shrutis), an ascent and a descent that differ,
  // the vadi / samvadi (the two notes that matter most), the notes each way drawn as a grid, a drone, and the ornaments (meend, andolan).
  var SW = { S: 0, r: ratioC(16, 15), R: ratioC(9, 8), g: ratioC(6, 5), G: ratioC(5, 4), M: ratioC(4, 3), "M#": ratioC(45, 32), P: ratioC(3, 2), d: ratioC(8, 5), D: ratioC(5, 3), n: ratioC(16, 9), N: ratioC(15, 8) };
  var SW_ORDER = ["S", "r", "R", "g", "G", "M", "M#", "P", "d", "D", "n", "N"];
  var SW_NAME = { S: "Sa", r: "re (komal)", R: "Re", g: "ga (komal)", G: "Ga", M: "Ma", "M#": "Ma (tivra)", P: "Pa", d: "dha (komal)", D: "Dha", n: "ni (komal)", N: "Ni" };
  var RAGAS = {
    yaman: { name: "Yaman", asc: "N, R G M# D N S'", desc: "S' N D P M# G R S", vadi: "G", sam: "N", time: "early evening",
             note: "Tivra Ma, all other notes shuddha. It is usually begun from the low Ni, not from Sa, and Pa is often passed over going up: the ascent skips and the descent does not." },
    bhairav: { name: "Bhairav", asc: "S r G M P d N S'", desc: "S' N d P M G r S", vadi: "d", sam: "r", time: "early morning",
               note: "Komal re and komal dha with shuddha Ga and Ni. Both komal notes are given a slow, wide swing (andolan). The same seven notes up and down, but they are not 'a scale': they are used in different phrases and given different weights." },
    bhupali: { name: "Bhupali", asc: "S R G P D S'", desc: "S' D P G R S", vadi: "G", sam: "D", time: "early night",
               note: "Five notes, no Ma and no Ni. On the piano it is a major pentatonic; the Ga is the pure 5:4, about 14 cents below the piano's." },
    todi: { name: "Todi", asc: "S r g M# P d N S'", desc: "S' N d P M# g r S", vadi: "d", sam: "g", time: "late morning",
            note: "Komal re, ga and dha with tivra Ma: seven notes with the most 'bent' character. The komal Ga is given a slow oscillation." },
    malkauns: { name: "Malkauns", asc: "S g M d n S'", desc: "S' n d M g S", vadi: "M", sam: "S", time: "midnight",
                note: "Five notes, no Re and no Pa. The same notes up and down, but the music revolves around Ma and Sa, not around the ends of a scale." },
    khamaj: { name: "Khamaj", asc: "S G M P D N S'", desc: "S' n D P M G R S", vadi: "G", sam: "N", time: "late evening",
              note: "The clearest case where ascent and descent differ: going up it leaves out Re and uses shuddha Ni; coming down it adds Re and uses komal ni. Two different Nis in one raga." }
  };
  function parseSw(str) { return str.split(/\s+/).map(function (t) { var up = /'$/.test(t), lo = /,$/.test(t), k = t.replace(/['\,]$/, ""); return { k: k, c: SW[k] + (up ? 1200 : lo ? -1200 : 0), tok: t }; }); }
  var DRONE_KEY = "S";
  function Raga(host) {
    var w = Base(host, "A raga, not a scale"), info = el("p", "sk-info"), staff = el("div", "tk-staff"), grid = el("div", "tk-ragagrid"), note = el("p", "tk-note");
    w.playLabel = "▶ Play"; w.playBtn.remove();
    w.pick("raga", "Raga", Object.keys(RAGAS).map(function (k) { return [k, RAGAS[k].name]; }), "yaman", null, function () { rebuild(); });
    w.pick("root", "Sa", ROOTS.map(function (r) { return [r[0], r[1] + "4"]; }), "C", null, function () { rebuild(); });
    w.pick("drone", "Drone", [["on", "Sa and Pa (tanpura-like)"], ["off", "None"]], "on");
    var row = el("div", "sk-presets");
    button(row, "▶ Ascent, then descent", function () { play("raga"); });
    button(row, "▶ As a plain scale (the same notes both ways, piano tuning)", function () { play("scale"); });
    button(row, "▶ Raga in just tuning and on the piano, together", function () { play("both"); });
    button(row, "▶ A slide and a wobble (meend, andolan)", function () { play("orn"); });
    button(row, "■", function () { w.stop(); });
    w.body.insertBefore(row, w.ctls.nextSibling);
    w.body.appendChild(grid); w.body.appendChild(staff); w.body.appendChild(info); w.body.appendChild(note);
    w.view = viewer(w.body, { ms: 40 });
    var cur = null;
    function r0() { return (ROOTS.filter(function (r) { return r[0] === w.P.root; })[0][2] % 12) * 100; }
    function rebuild() {
      var R = RAGAS[w.P.raga], a = parseSw(R.asc), d = parseSw(R.desc), base = r0(); cur = { R: R, asc: a, desc: d };
      var mk = function (list) { return list.map(function (x) { var c = base + x.c, s = spell(c, false), lab = Math.abs(s.off) < .5 ? "" : signed(s.off); return { s: s, c: c, f: cf(c), fp: cf(s.baseC), top: lab, bot: x.k === "M#" ? "M♯" : x.k }; }); };
      cur.an = mk(a); cur.dn = mk(d);
      // the ascent and the descent each on a line of their own
      var n1 = cur.an.length, text = abcOf(cur.an, 99).text.replace(/\|\]\n$/, "|\n") + abcOf(cur.dn, 99).text.replace(/^X:1\nL:1\/4\nM:none\nK:C\n/, "");
      cur.abc = { text: text, toks: [] }; draw(staff, cur.abc, null);
      var inA = {}, inD = {}; a.forEach(function (x) { inA[x.k] = 1; }); d.forEach(function (x) { inD[x.k] = 1; });
      grid.innerHTML = ""; grid.appendChild(el("span", "sk-cl", "Notes of the raga"));
      SW_ORDER.forEach(function (k) {
        var c = el("span", "tk-sw " + (inA[k] && inD[k] ? "both" : inA[k] ? "up" : inD[k] ? "down" : "none") + (k === R.vadi ? " vadi" : "") + (k === R.sam ? " sam" : ""), k === "M#" ? "M♯" : k);
        c.title = SW_NAME[k] + (inA[k] && inD[k] ? ": up and down" : inA[k] ? ": only going up" : inD[k] ? ": only coming down" : ": not used") + (k === R.vadi ? " (vadi)" : k === R.sam ? " (samvadi)" : ""); grid.appendChild(c);
      });
      var legend = el("span", "tk-note", "  filled = up and down · ▲ up only · ▼ down only · ringed = vadi · dashed ring = samvadi");
      grid.appendChild(legend);
      note.textContent = R.name + " (" + R.time + "): " + R.note;
      info.textContent = "Ascent: " + R.asc.replace(/M#/g, "M♯") + ". Descent: " + R.desc.replace(/M#/g, "M♯") + ". Vadi " + R.vadi.replace("M#", "M♯") + ", samvadi " + R.sam.replace("M#", "M♯") + ". The figure above a note is its distance from the piano key; the letters below are the swaras (capital = shuddha, lowercase = komal, M♯ = tivra Ma).";
      w.stop();
    }
    var timer = null;
    w.onStart = function () { return function () { clearTimeout(timer); }; };
    function dronePlay(c, t, dur) { if (w.P.drone !== "on") return; var sa = cf(r0() - 1200), pa = sa * 1.5; [sa, pa, sa * 2].forEach(function (f, i) { rich(c, w.out, f, t, dur, [.12, .09, .07][i]); }); }
    function glide(c, f1, f2, t, dur, v) { var o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(f1, t); o.frequency.setValueAtTime(f1, t + dur * .25); o.frequency.exponentialRampToValueAtTime(f2, t + dur * .7); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .03); g.gain.setValueAtTime(v, t + dur - .08); g.gain.linearRampToValueAtTime(0, t + dur); o.connect(g); g.connect(w.out); o.start(t); o.stop(t + dur + .05); }
    function wobble(c, f, t, dur, v, cents, hz) { var o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain(); o.frequency.value = f; l.frequency.value = hz; lg.gain.value = f * (Math.pow(2, cents / 1200) - 1); l.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .05); g.gain.setValueAtTime(v, t + dur - .1); g.gain.linearRampToValueAtTime(0, t + dur); o.connect(g); g.connect(w.out); o.start(t); l.start(t); o.stop(t + dur + .05); l.stop(t + dur + .05); }
    function play(how) {
      w.stop(); w.start(); var c = SK.ac(), t = c.currentTime + .05, step = .55, R = cur.R, end;
      if (how === "raga") {
        var seq = cur.an.concat([null], cur.dn); end = (seq.length) * step + .8; dronePlay(c, t, end);
        seq.forEach(function (n, i) { if (n) rich(c, w.out, n.f, t + i * step, step * .95, .3); });
        info.textContent = "The raga: first the ascent, then the descent, over the drone. Notice how the two lines are not mirror images" + (R.asc.split(" ").length !== R.desc.split(" ").length || R.name === "Khamaj" ? "." : ": here the notes are the same but the phrases that matter are not.");
      } else if (how === "scale") {
        var ks = {}; parseSw(R.asc).concat(parseSw(R.desc)).forEach(function (x) { ks[x.k + (x.c < 0 ? "-" : x.c >= 1200 ? "+" : "")] = x.c; });
        var cs = Object.keys(ks).map(function (k) { return ks[k]; }).sort(function (a, b) { return a - b; }), up = cs.filter(function (v, i) { return cs.indexOf(v) === i; });
        var seq2 = up.concat(up.slice(0, -1).reverse()); end = seq2.length * step + .8; dronePlay(c, t, end);
        seq2.forEach(function (v, i) { rich(c, w.out, cf(r0() + Math.round(v / 100) * 100), t + i * step, step * .95, .3); });
        info.textContent = "The same notes as a plain scale on the piano: every note up in order, then back down in the same order, at the piano's pitches. A listener who knew the raga would not recognise it: nothing says where the music lingers, which notes are only passed through, or how they are approached.";
      } else if (how === "both") {
        var sq = cur.an.concat(cur.dn); end = sq.length * 2.2 + 1; dronePlay(c, t, end);
        sq.forEach(function (n, i) { rich(c, w.out, n.f, t + i * 2.2, 2, .2); rich(c, w.out, n.fp, t + i * 2.2, 2, .2); });
        info.textContent = "Each swara with the piano's nearest key at the same moment. The slow wobble is the beating of a note that is a few cents off; the pure Ga and Ni sit well below the piano's.";
      } else {
        var vd = SW[R.vadi] + r0(), sm = SW[R.sam] + r0(), fa = cf(vd), fb = cf(sm); end = 9; dronePlay(c, t, end);
        rich(c, w.out, fa, t, 1.2, .26); rich(c, w.out, fb, t + 1.4, 1.2, .26);
        glide(c, fa, fb, t + 3, 1.6, .28); wobble(c, fa, t + 5, 3, .28, 30, 3);
        info.textContent = "Two steps of the raga (vadi, then samvadi), the same two joined by a slide (meend), then the vadi swinging slowly about its pitch (andolan). In a raga the way a note is approached is part of the note.";
      }
      timer = setTimeout(function () { w.stop(); }, end * 1000);
    }
    rebuild();
    w.rebuild = rebuild; w.raga = function () { return cur; };
    return w;
  }

  // ======================================================================================
  // unevenfret: a fretboard whose frets are not equally spaced. Choose a placement or drag a fret.
  var FRETSETS = {
    equal: { label: "Equal (12-tone equal temperament, the usual guitar)", c: function () { var a = [0]; for (var i = 1; i <= 12; i++) a.push(i * 100); return a; }, note: "Every fret multiplies the string's length by 1/2^(1/12) = 0.9439, so each fret is about 5.6% closer than the one before." },
    rule18: { label: "Rule of 18 (a workshop shortcut: each fret takes 1/18 of what is left)", c: function () { var a = [0]; for (var i = 1; i <= 12; i++) a.push(i * 1200 * Math.log2(18 / 17)); return a; }, note: "Taking 1/18 of the remaining string makes a ratio of 18/17 = 1.0588 where 2^(1/12) = 1.0595. Each step is 1.1 cents small, and by the twelfth fret the octave is about 13 cents flat, which is why builders using it correct the later frets." },
    just: { label: "Just intonation (5-limit ratios from the open string)", c: function () { return [0, ratioC(16, 15), ratioC(9, 8), ratioC(6, 5), ratioC(5, 4), ratioC(4, 3), ratioC(45, 32), ratioC(3, 2), ratioC(8, 5), ratioC(5, 3), ratioC(16, 9), ratioC(15, 8), 1200]; }, note: "Pure intervals measured from the open string. This is perfect only for chords built on that string's note; in any other key some intervals are out." },
    meantone: { label: "Quarter-comma meantone (lute and vihuela era)", c: function () { return [0, 76.05, 193.16, 310.26, 386.31, 503.42, 579.47, 696.58, 772.63, 889.74, 1006.84, 1082.89, 1200]; }, note: "Pure major thirds (386.3 cents) on the white notes; sharps and flats are different pitches, here the sharps. The sharps (like the D♯ at fret 3 of a C string) are wrong for the flat keys, so players moved frets for the piece." },
    pyth: { label: "Pythagorean (a chain of pure fifths)", c: function () { return [0, ratioC(2187, 2048), ratioC(9, 8), ratioC(32, 27), ratioC(81, 64), ratioC(4, 3), ratioC(729, 512), ratioC(3, 2), ratioC(128, 81), ratioC(27, 16), ratioC(16, 9), ratioC(243, 128), 1200]; }, note: "All fifths pure. Wide major thirds (81:64) and narrow minor thirds (32:27)." },
    werck: { label: "Werckmeister III (a well temperament)", c: function () { return [0, 90.225, 192.18, 294.135, 390.225, 498.045, 588.27, 696.09, 792.18, 888.27, 996.09, 1092.18, 1200]; }, note: "A well temperament: each key a little different, and none unusable. From C; fret numbers read against the open string's note." }
  };
  var FRET_L = 647.7;   // mm: a 25.5 inch scale
  function Unevenfret(host) {
    var w = Base(host, "A neck with unevenly spaced frets"), box = svg("svg", { "class": "tk-fret tk-uneven", role: "group", "aria-label": "Fretboard with frets 1 to 12. Drag the dots at the top to move a fret." });
    w.playLabel = "▶ Play"; w.playBtn.remove();
    var fc = FRETSETS.equal.c(), info = el("p", "sk-info"), note = el("p", "tk-note"), open = 40;
    w.pick("set", "Fret placement", Object.keys(FRETSETS).map(function (k) { return [k, FRETSETS[k].label]; }), "equal", null, function (v) { fc = FRETSETS[v].c(); draw0(); note.textContent = FRETSETS[v].note; });
    w.pick("open", "Open string", [["40", "E2 (low E)"], ["45", "A2"], ["50", "D3"], ["55", "G3"], ["59", "B3"], ["64", "E4 (high E)"]], "40", null, function (v) { open = +v; });
    w.pick("ghost", "Show the equal frets", [["on", "Yes, faint"], ["off", "No"]], "on", null, function () { draw0(); });
    var row = el("div", "sk-presets");
    button(row, "▶ Frets 0–12, these frets", function () { play("mine"); });
    button(row, "▶ Frets 0–12, equal", function () { play("eq"); });
    button(row, "▶ Both together, fret by fret", function () { play("both"); });
    button(row, "Reset to equal", function () { w.c.set.set("equal"); });
    button(row, "■", function () { w.stop(); });
    w.body.insertBefore(row, w.ctls.nextSibling);
    w.body.appendChild(box); w.body.appendChild(info); w.body.appendChild(note);
    w.view = viewer(w.body, { ms: 40 }); note.textContent = FRETSETS.equal.note;
    var W = 960, left = 70, wide = 840, S = 6, gap = 30, top = 38, H = top + S * gap + 28, down = {};
    function fx(c) { return left + wide * 2 * (1 - Math.pow(2, -c / 1200)); }           // squeezed so a 1200-cent fret is at the right edge
    function toC(x) { return -1200 * Math.log2(1 - (x - left) / (2 * wide)); }
    box.setAttribute("viewBox", "0 0 " + W + " " + H);
    var STR = [64, 59, 55, 50, 45, 40];
    function f0() { return cf((open - 60) * 100); }
    function draw0() {
      box.innerHTML = "";
      svg("rect", { x: left - 4, y: top - 12, width: wide + 8, height: S * gap - 6, fill: "color-mix(in srgb,var(--site-ink) 6%,var(--site-surface))", rx: 4 }, box);
      for (var s2 = 0; s2 < S; s2++) svg("line", { x1: left - 10, y1: top + s2 * gap + gap / 2 - 12, x2: left + wide + 4, y2: top + s2 * gap + gap / 2 - 12, "class": "str", "stroke-width": 1 + s2 * .35 }, box);
      var y1 = top - 12, y2 = top + S * gap - 18;
      for (var k = 0; k <= 12; k++) {
        var x = fx(fc[k]), xe = fx(k * 100);
        if (k > 0 && w.P.ghost !== "off") svg("line", { x1: xe, y1: y1, x2: xe, y2: y2, "class": "frg" }, box);
        svg("line", { x1: x, y1: y1, x2: x, y2: y2, "class": k === 0 ? "fr12" : "fru", "stroke-width": k === 0 ? 5 : 2.4 }, box);
        if (k > 0) {
          var h = svg("circle", { cx: x, cy: y1 - 14, r: 8, "class": "tk-handle" }, box); h.setAttribute("data-fret", k);
          var t = svg("text", { x: x, y: y1 - 10 }, box); t.textContent = k; t.setAttribute("class", "tk-hl");
          var off = fc[k] - k * 100, mm = FRET_L * ((1 - Math.pow(2, -fc[k] / 1200)) - (1 - Math.pow(2, -k * 100 / 1200)));
          var lab = svg("text", { x: x, y: y2 + 18 }, box); lab.textContent = Math.abs(off) < .5 ? "0" : signed(off);
          var lab2 = svg("text", { x: x, y: y2 + 32, opacity: .7 }, box); lab2.textContent = Math.abs(mm) < .05 ? "" : (mm > 0 ? "+" : "−") + Math.abs(mm).toFixed(1) + " mm";
        }
      }
      // zones: left of the nut = the open string; between fret k-1 and fret k = fret k (a finger behind fret k)
      for (var j = 0; j <= 12; j++) {
        var xa = j === 0 ? 8 : fx(fc[j - 1]) + 3, xb = j === 0 ? left - 6 : fx(fc[j]) - 3, z = svg("rect", { x: xa, y: y1, width: Math.max(3, xb - xa), height: y2 - y1, "class": "tk-z" }, box);
        z.setAttribute("data-fret", j);
      }
      svg("text", { x: 6, y: y2 + 18, "class": "tk-lh" }, box).textContent = "cents from equal";
      svg("text", { x: 6, y: y2 + 32, "class": "tk-lh" }, box).textContent = "mm on a 25.5″ neck";
    }
    function press(id, z) {
      if (!z || !z.getAttribute || !z.hasAttribute("data-fret") || z.classList.contains("tk-handle")) return;
      var k = +z.getAttribute("data-fret"), f = f0() * Math.pow(2, fc[Math.min(k, 12)] / 1200);
      w.start(); down[id] = { el: z, stop: voice(SK.ac(), w.out, f) }; z.classList.add("on");
      var eq = f0() * Math.pow(2, k / 12), cents = 1200 * Math.log2(f / eq);
      info.textContent = (k ? "Fret " + k : "Open string") + ": " + fmtHz(f) + ". Equal temperament would give " + fmtHz(eq) + ": " + (Math.abs(cents) < .5 ? "the same." : signed(cents) + " cents, and beating " + Math.abs(f - eq).toFixed(2) + " times a second against it.");
    }
    function release(id) { var d = down[id]; if (!d) return; d.stop(); d.el.classList.remove("on"); delete down[id]; }
    var drag = null;
    function svgX(e) { var pt = box.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(box.getScreenCTM().inverse()).x; }
    box.addEventListener("pointerdown", function (e) {
      e.preventDefault(); try { box.setPointerCapture(e.pointerId); } catch (x) {}
      if (e.target.classList && e.target.classList.contains("tk-handle")) { drag = { k: +e.target.getAttribute("data-fret"), id: e.pointerId }; return; }
      press(e.pointerId, e.target);
    });
    box.addEventListener("pointermove", function (e) {
      if (drag && drag.id === e.pointerId) {
        var c = toC(svgX(e)), k = drag.k, lo = fc[k - 1] + 5, hi = (k < 12 ? fc[k + 1] : 1300) - 5; fc[k] = Math.max(lo, Math.min(hi, c)); draw0(); return;
      }
      var d = down[e.pointerId]; if (!d) return; var t = document.elementFromPoint(e.clientX, e.clientY);
      if (t && t !== d.el && t.hasAttribute && t.hasAttribute("data-fret") && !t.classList.contains("tk-handle")) { release(e.pointerId); press(e.pointerId, t); }
    });
    ["pointerup", "pointercancel"].forEach(function (ev) { box.addEventListener(ev, function (e) { if (drag && drag.id === e.pointerId) { var k = drag.k; drag = null; info.textContent = "Fret " + k + " moved to " + fc[k].toFixed(1) + " cents above the open string (equal: " + k * 100 + ")."; } release(e.pointerId); }); });
    var timer = null;
    w.onStart = function () { return function () { clearTimeout(timer); Object.keys(down).forEach(release); }; };
    function play(how) {
      w.stop(); w.start(); var c = SK.ac(), t = c.currentTime + .05, f = f0(), step = how === "both" ? 2.2 : .45;
      for (var k = 0; k <= 12; k++) {
        if (how !== "eq") rich(c, w.out, f * Math.pow(2, fc[k] / 1200), t + k * step, how === "both" ? 2 : .4, how === "both" ? .2 : .28);
        if (how !== "mine") rich(c, w.out, f * Math.pow(2, k / 12), t + k * step, how === "both" ? 2 : .4, how === "both" ? .2 : .28);
      }
      info.textContent = how === "both" ? "Each fret with the equal-tempered pitch at the same moment: the more a fret has been moved, the faster the beating." : "A chromatic run up one string: the open string, then frets 1 to 12.";
      timer = setTimeout(function () { w.stop(); }, 13 * step * 1000 + 800);
    }
    draw0();
    w.frets = function () { return fc; }; w.setFret = function (k, c) { fc[k] = c; draw0(); }; w.press = function (k) { var z = box.querySelector('.tk-z[data-fret="' + k + '"]'); if (z) { press("api", z); return true; } return false; }; w.release = function () { release("api"); };
    return w;
  }

  // ======================================================================================
  // splitkeys: a keyboard whose keys are cut into pieces, each its own pitch.
  //   ordinary: 12 keys.   split14: the historical split sharps (D♯/E♭ and G♯/A♭ in two), quarter-comma meantone.
  //   split31 / split31h: a MODEL in which each white key is cut in three and each black key in two, 7 x 3 + 5 x 2 = 31 pieces, 31 equal steps
  //   (whole tone 5 steps, diatonic semitone 3, chromatic 2); split31h is wide keys cut lengthwise. Not documented as a real instrument: the lesson says so.
  var KB = {
    ordinary: { label: "An ordinary keyboard (12 equal keys)",
      white: [[0], [200], [400], [500], [700], [900], [1100]], black: [[100], [300], [600], [800], [1000]],
      wn: [["C"], ["D"], ["E"], ["F"], ["G"], ["A"], ["B"]], bn: [["C♯"], ["E♭"], ["F♯"], ["A♭"], ["B♭"]] },
    split14: { label: "Historical split sharps: 14 pieces, quarter-comma meantone",
      white: [[0], [193.16], [386.31], [503.42], [696.58], [889.74], [1082.89]], black: [[76.05], [269.21, 310.26], [579.47], [772.63, 813.69], [1006.84]],
      wn: [["C"], ["D"], ["E"], ["F"], ["G"], ["A"], ["B"]], bn: [["C♯"], ["D♯", "E♭"], ["F♯"], ["G♯", "A♭"], ["B♭"]] },
    split31: { label: "Model: white keys in 3, black keys in 2, 31 equal steps (keys cut across)", steps: 31,
      white: [[0, 1, 2], [5, 6, 7], [10, 11, 12], [13, 14, 15], [18, 19, 20], [23, 24, 25], [28, 29, 30]], black: [[3, 4], [8, 9], [16, 17], [21, 22], [26, 27]] },
    split31h: { label: "Model: the same 31 pieces on wide keys cut lengthwise (hot-dog splits)", steps: 31, hot: true,
      white: [[0, 1, 2], [5, 6, 7], [10, 11, 12], [13, 14, 15], [18, 19, 20], [23, 24, 25], [28, 29, 30]], black: [[3, 4], [8, 9], [16, 17], [21, 22], [26, 27]] }
  };
  Object.keys(KB).forEach(function (k) { var d = KB[k]; if (!d.steps) return;
    var cents = function (a) { return a.map(function (s) { return s * 1200 / d.steps; }); }, names = function (a) { return a.map(String); };
    d.wn = d.white.map(names); d.bn = d.black.map(names); d.white = d.white.map(cents); d.black = d.black.map(cents); });
  var BLACK_AFTER = [0, 1, 3, 4, 5];   // a black key sits to the right of white keys C D F G A
  function Splitkeys(host) {
    var w = Base(host, "A keyboard with split keys"), box = svg("svg", { "class": "tk-keys", role: "group", "aria-label": "Piano keyboard in which keys may be split into several pitches." });
    w.playLabel = "▶ Play"; w.playBtn.remove();
    w.pick("kb", "Keyboard", Object.keys(KB).map(function (k) { return [k, KB[k].label]; }), "split31", null, function () { build(); });
    w.pick("oct", "Lowest C", [["3", "C3"], ["4", "C4"]], "3", null, function () { build(); });
    var info = el("p", "sk-info"), note = el("p", "tk-note"), key = el("div", "tk-key");
    key.innerHTML = '<span><i style="background:var(--site-surface)"></i>within 12 cents of a piano key</span><span><i style="background:color-mix(in srgb,var(--site-accent) 22%,var(--site-surface))"></i>between piano keys</span><span>pitch rises toward the back of a cross-cut key, left to right in a lengthwise one</span>';
    var row = el("div", "sk-presets");
    button(row, "▶ Walk up every piece", function () { play("mine"); });
    button(row, "▶ The nearest piano keys", function () { play("piano"); });
    button(row, "▶ Both together, one piece at a time", function () { play("both"); });
    button(row, "■", function () { w.stop(); });
    w.body.insertBefore(row, w.ctls.nextSibling);
    w.body.appendChild(box); w.body.appendChild(key); w.body.appendChild(info); w.body.appendChild(note);
    w.view = viewer(w.body, { ms: 40 });
    var entry = entryLine(w, w.body, 24), down = {}, pieces = [];
    var NOTES = { ordinary: "A normal piano: every key is one pitch.", split14: "Real instruments of the 16th and 17th centuries had keys like this: the black keys for D♯/E♭ and G♯/A♭ cut across, the front half sounding one note and the back half the other, so that both a D♯ for an E-major chord and an E♭ for a C-minor chord could be pure in meantone. (Which half is which, the lesson has not checked.)",
      split31: "A model, not a documented instrument: cut each of the 7 white keys in three and each of the 5 black keys in two and you have 31 pieces, exactly the 31 steps of 31-tone equal temperament (whole tone = 5 steps, diatonic semitone = 3, chromatic semitone = 2, fifth = 18 steps = 696.8 cents). Fokker's 31-note organ was a real instrument; none is checked here to match this layout.",
      split31h: "The same 31 pieces, but the keys are wide and each is cut lengthwise like a hot dog, so the pieces sit side by side and pitch rises left to right through the key. Also a model for this page, not a documented instrument." };
    w.onStart = function () { return function () { Object.keys(down).forEach(release); }; };
    function build() {
      var K2 = KB[w.P.kb], hot = !!K2.hot, ww = hot ? 70 : 44, wh = 160, bw = hot ? 42 : 26, bh = 98, oct0 = (+w.P.oct - 4) * 1200, nOct = 2, W2 = 7 * nOct * ww + ww; box.innerHTML = ""; pieces = [];
      box.setAttribute("viewBox", "0 0 " + W2 + " " + (wh + 6));
      function add(shape, cents, name, label) {
        var near = Math.round(cents / 100) * 100, cls = "tk-p" + (Math.abs(cents - near) < 12 ? " n" : " q"); shape.setAttribute("class", cls);
        shape.setAttribute("data-c", (cents + oct0).toFixed(3)); shape.setAttribute("data-n", name); pieces.push(shape);
      }
      function piecesOf(x, y, wd, ht, centsList, names, oc, isBlack) {
        var n = centsList.length, fr = n === 3 ? [.3, .3, .4] : [.4, .6], acc = 0;
        centsList.forEach(function (c, j) {
          var y0, h0, x0 = x, w0 = wd;
          if (n > 1 && hot) { w0 = wd / n; x0 = x + j * w0; y0 = y; h0 = ht; }
          else if (isBlack) { h0 = ht / n; y0 = y + ht - (j + 1) * h0; }
          else if (n === 1) { y0 = y; h0 = ht; } else { h0 = ht * fr[j]; acc += h0; y0 = y + ht - acc; }
          var r = svg("rect", { x: x0 + .5, y: y0, width: w0 - 1, height: h0, rx: 3 }, box); add(r, c + oc * 1200, names[j]); if (isBlack) r.classList.add("blk");
          var t = svg("text", { x: x0 + w0 / 2, y: y0 + h0 / 2 + 3, "class": isBlack ? "tk-bl" : "" }, box); t.textContent = names[j];
        });
      }
      var o, i;
      for (o = 0; o <= nOct; o++) for (i = 0; i < 7; i++) {
        if (o === nOct && i > 0) break;
        var x = (o * 7 + i) * ww;
        if (o === nOct) { var cs = K2.white[0].slice(0, 1); piecesOf(x, 3, ww, wh, [0], [K2.wn[0][0]], o, false); }
        else piecesOf(x, 3, ww, wh, K2.white[i], K2.wn[i], o, false);
      }
      for (o = 0; o < nOct; o++) BLACK_AFTER.forEach(function (wi, bi) { piecesOf((o * 7 + wi + 1) * ww - bw / 2, 3, bw, bh, K2.black[bi], K2.bn[bi], o, true); });
      info.textContent = "Press a piece to sound it. " + (/^split31/.test(w.P.kb) ? "Pieces are numbered by step (0–30, then 0 again an octave up)." : "");
      note.textContent = NOTES[w.P.kb];
    }
    function press(id, z) {
      if (!z || !z.getAttribute || z.getAttribute("data-c") == null) return; var c = +z.getAttribute("data-c"), f = cf(c), s = spell(c, true), near = cf(Math.round(c / 100) * 100);
      w.start(); down[id] = { el: z, stop: voice(SK.ac(), w.out, f) }; z.classList.add("on"); entry.add(f);
      var off = c - Math.round(c / 100) * 100;
      info.textContent = "Piece " + z.getAttribute("data-n") + ": " + fmtHz(f) + (Math.abs(off) < .5 ? ", a piano key." : ", " + signed(off) + " cents from the nearest piano key (" + fmtHz(near) + ").");
    }
    function release(id) { var d = down[id]; if (!d) return; d.stop(); d.el.classList.remove("on"); delete down[id]; }
    box.addEventListener("pointerdown", function (e) { e.preventDefault(); try { box.setPointerCapture(e.pointerId); } catch (x) {} press(e.pointerId, e.target); });
    box.addEventListener("pointermove", function (e) { var d = down[e.pointerId]; if (!d) return; var t = document.elementFromPoint(e.clientX, e.clientY); if (t && t !== d.el && t.getAttribute && t.getAttribute("data-c") != null) { release(e.pointerId); press(e.pointerId, t); } });
    ["pointerup", "pointercancel"].forEach(function (ev) { box.addEventListener(ev, function (e) { release(e.pointerId); }); });
    var timer = null;
    function play(how) {
      w.stop(); w.start(); var c = SK.ac(), t = c.currentTime + .05, cs = pieces.map(function (p) { return +p.getAttribute("data-c"); }).sort(function (a, b) { return a - b; });
      var step = how === "both" ? 2 : .22;
      cs.forEach(function (v, i) { var pn = cf(Math.round(v / 100) * 100);
        if (how !== "piano") rich(c, w.out, cf(v), t + i * step, how === "both" ? 1.8 : .25, how === "both" ? .2 : .26);
        if (how !== "mine") rich(c, w.out, pn, t + i * step, how === "both" ? 1.8 : .25, how === "both" ? .2 : .26); });
      info.textContent = how === "both" ? "Each piece with the nearest piano key at the same moment." : how === "piano" ? "The nearest piano key to each piece, in order: pieces between keys repeat a key." : "Every piece from the lowest up, in pitch order.";
      timer = setTimeout(function () { w.stop(); }, cs.length * step * 1000 + 800);
    }
    w.press = function (i) { var p = pieces[i]; if (p) { press("api", p); return true; } return false; };
    w.release = function () { release("api"); };
    w.pieces = function () { return pieces; }; w.entry = entry;
    build();
    return w;
  }


  // ======================================================================================
  // tunesong: a tune from the site's collection, every note moved into another tuning.
  //   The tonic is the key letter of the tune's K: line. Each note's distance from the tonic in piano semitones (s) is mapped to the tuning:
  //   an equal division of the octave takes the nearest step to the piano's pitch (round(s * N / 12)); the 12-note tables (just, Pythagorean,
  //   quarter-comma meantone) give each semitone its cents; "neutral" moves thirds and sevenths to 350 / 1050 as a demonstration (not a claim
  //   about any maqam). Octaves are exactly 1200 cents (no stretch).
  var JUST = [0, 111.73, 203.91, 315.64, 386.31, 498.04, 590.22, 701.96, 813.69, 884.36, 1017.6, 1088.27];
  var PYTH = [0, 90.22, 203.91, 294.13, 407.82, 498.04, 611.73, 701.96, 792.18, 905.87, 996.09, 1109.78];
  var MEAN = [0, 76.05, 193.16, 310.26, 386.31, 503.42, 579.47, 696.58, 772.63, 889.74, 1006.84, 1082.89];
  function edoMap(n) { return function (r) { return Math.round(r * n / 12) * 1200 / n; }; }
  var TS = {
    et12: { label: "12-TET: the piano (the reference)", f: edoMap(12) },
    et19: { label: "19-TET", f: edoMap(19) }, et22: { label: "22-TET", f: edoMap(22) }, et31: { label: "31-TET", f: edoMap(31) }, et53: { label: "53-TET", f: edoMap(53) },
    just: { label: "Just intonation (5-limit)", f: function (r) { return JUST[r]; } },
    pyth: { label: "Pythagorean (pure fifths)", f: function (r) { return PYTH[r]; } },
    mean: { label: "Quarter-comma meantone", f: function (r) { return MEAN[r]; } },
    neutral: { label: "Neutral thirds and sevenths (350 and 1050 cents)", f: function (r) { return r === 3 || r === 4 ? 350 : r === 10 || r === 11 ? 1050 : r * 100; } }
  };
  var DEGN = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];
  var PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var FEATURED = ["amazing-grace", "twinkle", "greensleeves", "joy"];
  var tuneCache = null, tuneLoading = null;
  function loadScript(src) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { no(new Error("could not load " + src)); }; document.head.appendChild(s); }); }
  function loadTunes() {
    if (tuneCache) return Promise.resolve(tuneCache);
    if (tuneLoading) return tuneLoading;
    var chain = Promise.resolve();
    if (!global.AbcCore) chain = chain.then(function () { return loadScript("/apps/shared/abc-core.js"); });
    if (!global.AbcTune) chain = chain.then(function () { return loadScript("/apps/tune-assessment/abc-tune.js"); });
    if (typeof tunesObject === "undefined") chain = chain.then(function () { return loadScript("/apps/tunes/tunes-object.js"); });
    return (tuneLoading = chain.then(function () {
      var list = [], seen = {};
      Object.keys(tunesObject).forEach(function (k) {
        String(tunesObject[k]).split(/\n(?=X:)/).forEach(function (abc) {
          var t = /^T:\s*(.+)$/m.exec(abc), id = /^%%id\s+(\S+)/m.exec(abc); if (!t || !/^K:/m.test(abc)) return;
          var key = id ? id[1] : t[1]; if (seen[key]) return; seen[key] = 1; list.push({ id: id ? id[1] : "", title: t[1].trim(), abc: abc });
        });
      });
      list.sort(function (a, b) { return a.title.localeCompare(b.title); });
      return (tuneCache = list);
    }));
  }
  // the notes of an ABC tune as {midi, t0, d} in seconds-free L units, plus the tonic and the speed
  function tuneNotes(abc) {
    var m = global.AbcTune.melodyNotes(abc), k = /^K:\s*([A-G])([#b]?)/m.exec(abc), pc = k ? ((PCS[k[1]] + (k[2] === "#" ? 1 : k[2] === "b" ? -1 : 0)) + 12) % 12 : 0;
    return { notes: m.notes, total: m.total, lq: m.lq, qpm: (m.tempoQ || 100) * (m.tempoNote || 1), tonic: 60 + pc, key: k ? k[1] + k[2] : "C" };
  }
  function Tunesong(host) {
    var w = Base(host, "A familiar tune in another tuning"), tunes = [], cur = null, info = el("p", "sk-info"), note = el("p", "tk-note"), table = el("div", "tk-ragagrid"), timer = null;
    w.playLabel = "▶ Play"; w.playBtn.remove();
    w.pick("tun", "Tuning", Object.keys(TS).map(function (k) { return [k, TS[k].label]; }), "et31", null, function () { rebuild(); });
    w.pick("spd", "Speed", [["0.7", "Slow"], ["1", "As written"], ["1.3", "Quick"]], "1");
    var pickBox = el("div", "sk-presets"), find = el("input"), sel = el("select");
    find.type = "search"; find.placeholder = "Search the tune collection…"; find.className = "form-control form-control-sm"; find.style.maxWidth = "16rem";
    sel.className = "form-select form-select-sm"; sel.style.maxWidth = "22rem"; sel.setAttribute("aria-label", "Tune");
    pickBox.appendChild(el("span", "sk-cl", "Tune")); pickBox.appendChild(find); pickBox.appendChild(sel);
    var row = el("div", "sk-presets");
    button(row, "▶ In this tuning", function () { play("tuned"); });
    button(row, "▶ On the piano", function () { play("piano"); });
    button(row, "▶ This tuning, then the piano", function () { play("then"); });
    button(row, "▶ Both at once", function () { play("both"); });
    button(row, "■", function () { w.stop(); });
    w.body.insertBefore(row, w.ctls.nextSibling); w.body.insertBefore(pickBox, w.ctls);
    var abcBox = el("div", "tk-staff"); w.body.appendChild(abcBox); w.body.appendChild(table); w.body.appendChild(info); w.body.appendChild(note);
    w.view = viewer(w.body, { ms: 40 });
    info.textContent = "Loading the tune collection…";
    function fill() {
      var q = find.value.trim().toLowerCase(), shown = tunes.filter(function (t) { return !q || t.title.toLowerCase().indexOf(q) >= 0; }), f = [];
      if (!q) { FEATURED.forEach(function (id) { var t = tunes.filter(function (x) { return x.id === id; })[0]; if (t) f.push(t); }); shown = f.concat(shown.filter(function (t) { return f.indexOf(t) < 0; })); }
      sel.innerHTML = ""; shown.slice(0, 200).forEach(function (t) { var o = el("option", null, t.title); o.value = t.id || t.title; sel.appendChild(o); });
      if (shown.length > 200) { var o = el("option", null, "… " + (shown.length - 200) + " more: type to narrow"); o.disabled = true; sel.appendChild(o); }
      if (shown.length && (!cur || shown.indexOf(cur.tune) < 0)) { sel.selectedIndex = 0; choose(shown[0]); } else if (cur) sel.value = cur.tune.id || cur.tune.title;
    }
    function choose(t) { var m; try { m = tuneNotes(t.abc); } catch (e) { info.textContent = "That tune could not be read."; return; } cur = { tune: t, m: m }; rebuild(); }
    function tunedC(midi) { var s = midi - cur.m.tonic, r = ((s % 12) + 12) % 12, o = Math.floor(s / 12); return (cur.m.tonic - 60) * 100 + o * 1200 + TS[w.P.tun].f(r); }
    function rebuild() {
      w.stop(); if (!cur) return; var used = {}, m = cur.m;
      m.notes.forEach(function (n) { used[n.midi - m.tonic] = 1; });
      table.innerHTML = ""; table.appendChild(el("span", "sk-cl", "Notes used (key of " + m.key + "), cents from the piano:"));
      Object.keys(used).map(Number).sort(function (a, b) { return a - b; }).forEach(function (s) {
        var r = ((s % 12) + 12) % 12, off = TS[w.P.tun].f(r) - r * 100, b = el("span", "tk-sw" + (Math.abs(off) < .5 ? "" : " up"), DEGN[r] + (Math.abs(off) < .5 ? "" : " " + signed(off)));
        b.title = "Scale degree " + DEGN[r] + ": " + (Math.abs(off) < .5 ? "the same as the piano" : off.toFixed(1) + " cents from the piano key"); table.appendChild(b);
      });
      var shown = m.notes.map(function (n) { return Math.abs(tunedC(n.midi) - (n.midi - 60) * 100); });
      var max = shown.reduce(function (a, b) { return Math.max(a, b); }, 0);
      note.textContent = TS[w.P.tun].label + ": the farthest any note of this tune moves from its piano pitch is " + Math.round(max) + " cents. Each note takes the nearest note of the tuning to the piano's pitch (or the table's value, for just, Pythagorean and meantone); the tonic is the key letter of the tune, and octaves are exactly 1200 cents.";
      info.textContent = cur.tune.title + ": " + m.notes.length + " notes. Play it in the tuning, on the piano, or both.";
      if (global.ABCJS) { try { ABCJS.renderAbc(abcBox, cur.tune.abc.replace(/^w:.*$/gm, "").replace(/"[^"]*"/g, ""), { responsive: "resize", paddingleft: 0, paddingright: 0, staffwidth: 740 }); } catch (e) {} }
    }
    find.addEventListener("input", fill);
    sel.addEventListener("change", function () { var t = tunes.filter(function (x) { return (x.id || x.title) === sel.value; })[0]; if (t) choose(t); });
    w.onStart = function () { return function () { clearTimeout(timer); }; };
    function play(how) {
      if (!cur) return; w.stop(); w.start(); var c = SK.ac(), m = cur.m, u = 60 / (m.qpm * (+w.P.spd)) * m.lq, t0 = c.currentTime + .08, span = m.total * u + .8;
      function run(at, tuned) { m.notes.forEach(function (n) {
        var f = tuned ? cf(tunedC(n.midi)) : cf((n.midi - 60) * 100), d = Math.max(.12, n.dur * u * .95);
        rich(c, w.out, f, at + n.onset * u, d, how === "both" ? .15 : .26); }); }
      if (how === "tuned") run(t0, true); else if (how === "piano") run(t0, false);
      else if (how === "then") { run(t0, true); run(t0 + span + .6, false); span = 2 * span + .6; } else { run(t0, true); run(t0, false); }
      timer = setTimeout(function () { w.stop(); }, (span + .5) * 1000);
    }
    loadTunes().then(function (l) { tunes = l; fill(); }).catch(function (e) { info.textContent = "The tune collection could not be loaded (" + e.message + ")."; });
    w.tuned = function () { return cur ? cur.m.notes.map(function (n) { return tunedC(n.midi); }) : []; };
    w.setTune = function (id) { var t = tunes.filter(function (x) { return x.id === id; })[0]; if (t) { choose(t); return true; } return false; };
    w.loaded = function () { return tunes.length; }; w.title2 = function () { return cur && cur.tune.title; };
    return w;
  }

  SK.kinds.scale = Scale; SK.kinds.raga = Raga; SK.kinds.unevenfret = Unevenfret; SK.kinds.splitkeys = Splitkeys; SK.kinds.tunesong = Tunesong; SK.kinds.pitchgrid = Pitchgrid; SK.kinds.microfret = Microfret;
  global.TuningKit = { TUN: TUN, TUN_ORDER: TUN_ORDER, degrees: degrees, spell: spell, abcOf: abcOf, LAYOUTS: LAYOUTS, cf: cf };
})(window);
