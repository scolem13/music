// elements.js — the Elements of Music lessons (lessons/elements-*.qmd).
// 1. Note names. The pages are written in American names (quarter note, measure, staff). Any text inside
//    <span class="nn"> (Quarto: [quarter note]{.nn}) is swapped to British names (crotchet, bar, stave) when the reader
//    ticks "British names" in the bar this script puts at the top of the page. The choice is kept in localStorage
//    "el-names" and shared by every Elements page. The examples' captions (.ax-cap, from abc-ex.js) are switched too. ElNames.say(text) converts a whole string (used by the quizzes).
// 2. Quizzes. <div class="eq" data-set="texture"> becomes a listening/reading question from QUIZ[set] (data-set="all" mixes
//    every set), with answer buttons, a running score and Next. A question with abc gets a ▶ Listen button: the ABC is
//    drawn hidden and played through AbcPlay (the band's samples), with data in the question for sound and style.
// 3. Sheets. <div class="el-sheet"> holds <div class="el-card"> boxes (a one-page revision sheet: every term of one element
//    with its example). It gets a "Full screen" button that puts just the sheet on the whole screen (Esc leaves); the
//    examples and quiz inside keep working.
// Needs abcjs and soundfont.js on the page (lessons/_elements-kit.qmd loads them).
(function (global) {
  // ---------- note names ----------
  var PAIRS = [
    ["whole notes", "semibreves"], ["whole note", "semibreve"], ["half notes", "minims"], ["half note", "minim"],
    ["quarter notes", "crotchets"], ["quarter note", "crotchet"], ["eighth notes", "quavers"], ["eighth note", "quaver"],
    ["sixteenth notes", "semiquavers"], ["sixteenth note", "semiquaver"],
    ["whole rest", "semibreve rest"], ["half rest", "minim rest"], ["quarter rest", "crotchet rest"], ["eighth rest", "quaver rest"],
    ["sixteenth rest", "semiquaver rest"], ["measures", "bars"], ["measure", "bar"], ["staves", "staves"], ["staff", "stave"],
    ["half steps", "semitones"], ["half step", "semitone"], ["whole steps", "tones"], ["whole step", "tone"],
    ["fermata", "pause"], ["deceptive cadence", "interrupted cadence"], ["authentic cadence", "perfect cadence"],
    ["half cadence", "imperfect cadence"]
  ];
  var KEY = "el-names", uk = false;
  try { uk = localStorage.getItem(KEY) === "uk"; } catch (e) {}
  function caseLike(src, out) { return /^[A-Z]/.test(src) ? out.charAt(0).toUpperCase() + out.slice(1) : out; }
  function say(t) {
    if (!uk || !t) return t;
    PAIRS.forEach(function (p) { t = t.replace(new RegExp("\\b" + p[0].replace(/ /g, "[ -]") + "\\b", "gi"), function (m) { return caseLike(m, /-/.test(m) ? p[1].replace(/ /g, "-") : p[1]); }); });
    return t;
  }
  function apply() {
    document.querySelectorAll(".nn, .ax-cap").forEach(function (s) {
      if (s.dataset.us == null) s.dataset.us = s.textContent;
      s.textContent = say(s.dataset.us);
    });
    document.querySelectorAll(".eq").forEach(function (b) { if (b._redo) b._redo(); });
    var box = document.getElementById("el-uk"); if (box) box.checked = uk;
  }
  // "Show notation": off hides every staff (body.ax-hide-notes, abc-ex.js), the ▶ buttons stay. Kept in localStorage "el-notation".
  var hideNotes = false; try { hideNotes = localStorage.getItem("el-notation") === "off"; } catch (e) {}
  function notesBox() {
    var lab = el("label", "el-notes"), cb = document.createElement("input"); cb.type = "checkbox"; cb.className = "el-notes-cb"; cb.checked = !hideNotes;
    cb.addEventListener("change", function () {
      hideNotes = !cb.checked; try { localStorage.setItem("el-notation", hideNotes ? "off" : "on"); } catch (x) {}
      document.body.classList.toggle("ax-hide-notes", hideNotes);
      document.querySelectorAll(".el-notes-cb").forEach(function (c) { c.checked = !hideNotes; });
      window.dispatchEvent(new Event("resize"));
    });
    lab.appendChild(cb); lab.appendChild(document.createTextNode(" Show notation")); return lab;
  }
  function bar() {
    var title = document.querySelector("#title-block-header") || document.querySelector("main h1");
    if (!title || document.getElementById("el-names")) return;
    var d = document.createElement("div"); d.id = "el-names"; d.className = "el-names";
    d.innerHTML = '<label><input type="checkbox" id="el-uk"> British note names <span class="el-eg">(crotchet, quaver, bar, stave)</span></label>';
    if (document.querySelector(".abc-ex")) d.appendChild(notesBox());
    if (document.querySelector(".abc-ex")) d.appendChild(el("span", "el-eg el-click", "Click a note to play from its measure."));
    title.parentNode.insertBefore(d, title.nextSibling);
    document.body.classList.toggle("ax-hide-notes", hideNotes);
    d.querySelector("input").addEventListener("change", function (e) {
      uk = e.target.checked; try { localStorage.setItem(KEY, uk ? "uk" : "us"); } catch (x) {} apply();
    });
  }

  // ---------- orchestral sounds ----------
  // The band's bank has no orchestra, so these are added from the same MusyngKite soundfont (one sample every 3 semitones,
  // each instrument's usual range). Names as data-sound / sound: in a quiz. The kit loads sounds.js before this file.
  var ORCH = { violin: [55, 96], viola: [48, 84], cello: [36, 76], contrabass: [28, 60], flute: [60, 96], oboe: [58, 91],
    clarinet: [50, 91], bassoon: [34, 72], trumpet: [54, 84], french_horn: [41, 77], trombone: [40, 72], tuba: [28, 58],
    timpani: [40, 57], harpsichord: [29, 89], pizzicato_strings: [28, 96], string_ensemble_1: [28, 96], alto_sax: [49, 81], xylophone: [65, 96] };
  var NOTE = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  if (global.BandSounds) Object.keys(ORCH).forEach(function (name) {
    global.BandSounds.define(name, function (sf) {
      var lo = ORCH[name][0], hi = ORCH[name][1], zones = [];
      for (var m = lo + 1; m - 1 <= hi; m += 3) zones.push({ url: sf + name + "-mp3/" + NOTE[m % 12] + (Math.floor(m / 12) - 1) + ".mp3", midi: m, lo: m - 1, hi: m + 1 });
      return { zones: zones };
    });
  });

  // ---------- quizzes ----------
  // q: question; abc (optional): played by ▶ Listen; show: true also draws the ABC; opts: answers; a: index of the right one;
  // why: shown after answering; sound / style: for AbcPlay.
  var Q = {
    articulation: [
      { q: "How are these notes played?", abc: "X:1\nM:4/4\nL:1/4\nQ:1/4=100\nK:C\n.C .E .G .c|.G .E .C z|]", show: true, opts: ["Staccato", "Legato", "Accented", "Glissando"], a: 0, why: "A dot over or under the notehead: short and detached." },
      { q: "What does the curved line over these notes ask for?", abc: "X:1\nM:4/4\nL:1/4\nQ:1/4=90\nK:C\n(CDEF|G4)|]", show: true, opts: ["Play them smoothly, without breaks (a slur)", "Tie them into one long note", "Play them louder", "Play them faster"], a: 0, why: "A curve over different pitches is a slur: legato. Over two notes of the same pitch it would be a tie." },
      { q: "Which sign tells you to give a note extra force?", opts: ["> (accent)", ". (staccato)", "a curve (slur)", "a wavy line"], a: 0, why: "The accent, a > over or under the note." },
      { q: "A string player is told 'pizz.'. What do they do?", opts: ["Pluck the strings", "Use the bow", "Put on a mute", "Play two strings at once"], a: 0, why: "Pizzicato: plucked. 'Arco' tells them to go back to the bow." }
    ],
    dynamics: [
      { q: "Put these in order from quietest to loudest.", opts: ["pp p mp mf f ff", "p pp mp mf ff f", "mp mf p pp f ff", "pp mp p f mf ff"], a: 0, why: "Pianissimo, piano, mezzo piano, mezzo forte, forte, fortissimo." },
      { q: "Listen. What happens to the volume?", abc: "X:1\nM:4/4\nL:1/4\nQ:1/4=96\nK:C\n!pp!!crescendo(!C D E F|G A B c|d e f g|!crescendo)!!ff!c'4|]", opts: ["It gets gradually louder (crescendo)", "It gets gradually quieter (diminuendo)", "It stays the same", "Loud, then suddenly quiet"], a: 0, why: "From pp up to ff, a little at a time." },
      { q: "Baroque music often switches suddenly between loud and quiet sections instead of growing louder bit by bit. What is that called?", opts: ["Terraced dynamics", "Rubato", "A crescendo", "Sforzando"], a: 0, why: "Like steps on a terrace: one level, then another." },
      { q: "What does sfz mean?", opts: ["Sforzando: a sudden strong accent on one note", "Very soft", "Slowly getting faster", "Play smoothly"], a: 0, why: "Sforzando (also sf): suddenly loud, on that note only." }
    ],
    harmony: [
      { q: "Listen to the last two chords. Which cadence is it?", abc: "X:1\nM:4/4\nL:1/2\nQ:1/4=80\nK:C\n\"C\"E \"F\"F|\"G\"D \"C\"C|]", style: "hymn", opts: ["Authentic cadence (V–I)", "Plagal cadence (IV–I)", "Half cadence (ends on V)", "Deceptive cadence (V–vi)"], a: 0, why: "G to C is V to I: finished, final." },
      { q: "Listen to the last two chords. Which cadence is it?", abc: "X:1\nM:4/4\nL:1/2\nQ:1/4=80\nK:C\n\"C\"E \"F\"F|\"G\"D \"Am\"C|]", style: "hymn", opts: ["Deceptive cadence (V–vi)", "Authentic cadence (V–I)", "Plagal cadence (IV–I)", "Half cadence (ends on V)"], a: 0, why: "It gets to V and you expect I, but a minor chord (vi) arrives instead." },
      { q: "Listen to the last two chords. Which cadence is it?", abc: "X:1\nM:4/4\nL:1/2\nQ:1/4=80\nK:C\n\"C\"E \"G\"D|\"F\"C \"C\"C|]", style: "hymn", opts: ["Plagal cadence (IV–I)", "Authentic cadence (V–I)", "Deceptive cadence (V–vi)", "Half cadence (ends on V)"], a: 0, why: "F to C is IV to I, the 'Amen' at the end of hymns." },
      { q: "Listen to the last two chords. Which cadence is it?", abc: "X:1\nM:4/4\nL:1/2\nQ:1/4=80\nK:C\n\"C\"E \"F\"F|\"C\"E \"G\"D|]", style: "hymn", opts: ["Half cadence (ends on V)", "Authentic cadence (V–I)", "Plagal cadence (IV–I)", "Deceptive cadence (V–vi)"], a: 0, why: "It stops on G, chord V: it sounds like a question, not an ending." },
      { q: "A piece in a minor key ends on a major chord. What is that called?", opts: ["A Tierce de Picardie (Picardy third)", "A modulation", "A plagal cadence", "An interrupted cadence"], a: 0, why: "The third of the last chord is raised, making the minor tonic major." },
      { q: "What is a modulation?", opts: ["A change of key", "A change of tempo", "A change of time signature", "A change of instrument"], a: 0, why: "Most often to the dominant key or the relative major or minor." }
    ],
    instruments: [
      { q: "Which instrument family does the oboe belong to?", opts: ["Woodwind", "Brass", "Strings", "Percussion"], a: 0, why: "It is a double-reed woodwind instrument." },
      { q: "What are the four voices of an SATB choir, highest to lowest?", opts: ["Soprano, alto, tenor, bass", "Soprano, tenor, alto, bass", "Alto, soprano, bass, tenor", "Treble, alto, baritone, bass"], a: 0, why: "S, A, T, B, from the top down." },
      { q: "How many players in a quartet?", opts: ["4", "2", "3", "5"], a: 0, why: "Solo 1, duet 2, trio 3, quartet 4, quintet 5." },
      { q: "Which of these is the lowest string instrument of the orchestra?", opts: ["Double bass", "Cello", "Viola", "Violin"], a: 0, why: "Violin, viola, cello, double bass, from high to low." },
      { q: "'Con sordino' tells a player to...", opts: ["Use a mute", "Pluck", "Use vibrato", "Play two notes at once"], a: 0, why: "Sordino is Italian for mute; 'senza sordino' takes it off." }
    ],
    melody: [
      { q: "How does this melody move?", abc: "X:1\nM:4/4\nL:1/4\nQ:1/4=100\nK:C\nC D E F|G F E D|C4|]", show: true, opts: ["Conjunct (by step)", "Disjunct (by leap)", "Only repeated notes", "Chromatic"], a: 0, why: "Every note is the next letter up or down: steps." },
      { q: "How does this melody move?", abc: "X:1\nM:4/4\nL:1/4\nQ:1/4=100\nK:C\nC A, G e|c G, E c'|C4|]", show: true, opts: ["Disjunct (by leap)", "Conjunct (by step)", "It is an ostinato", "It is a sequence"], a: 0, why: "Big jumps between almost every note." },
      { q: "The same short idea, repeated a step higher each time. What is that?", abc: "X:1\nM:4/4\nL:1/8\nQ:1/4=100\nK:C\nCDEC D2 z2|DEFD E2 z2|EFGE F2 z2|G8|]", show: true, opts: ["A sequence", "An ostinato", "Imitation", "A pedal"], a: 0, why: "Same shape, different pitch: sequence. An ostinato would repeat at the same pitch." },
      { q: "What is the 5th note of the scale called?", opts: ["Dominant", "Subdominant", "Mediant", "Leading note"], a: 0, why: "1 tonic, 2 supertonic, 3 mediant, 4 subdominant, 5 dominant, 6 submediant, 7 leading note." },
      { q: "How far apart are C and G (counting both)?", opts: ["A 5th", "A 4th", "A 6th", "A 3rd"], a: 0, why: "C D E F G: five letter names, counting the first and the last." }
    ],
    metre: [
      { q: "Listen and count. How many beats in each measure?", abc: "X:1\nM:3/4\nL:1/4\nQ:1/4=120\nK:G\n\"G\"!>!G B d|\"D\"!>!A F D|\"G\"!>!G B d|\"C\"!>!c2 B|\"D\"!>!A F A|\"G\"!>!G3|]", style: "waltz", opts: ["3", "2", "4", "6"], a: 0, why: "ONE two three, ONE two three: a waltz in 3/4." },
      { q: "Simple or compound? Listen to how each beat divides.", abc: "X:1\nM:6/8\nL:1/8\nQ:3/8=96\nK:D\n\"D\"!>!ABA !>!F2D|\"A\"!>!EFE !>!C3|\"D\"!>!ABA !>!F2A|\"A\"!>!E3 \"D\"!>!D3|]", style: "pop", opts: ["Compound (beats split into threes)", "Simple (beats split into twos)"], a: 0, why: "Two dotted beats per measure, each split into three eighth notes: 6/8, compound duple." },
      { q: "Which time signature is compound?", opts: ["9/8", "3/4", "2/4", "4/4"], a: 0, why: "6/8, 9/8 and 12/8 are compound: 2, 3 and 4 dotted quarter-note beats." },
      { q: "What does C (common time) mean?", opts: ["4/4", "2/2", "3/4", "6/8"], a: 0, why: "C is another way of writing 4/4. C with a line through it is 2/2 (cut time)." }
    ],
    rhythm: [
      { q: "How many quarter-note beats does a half note last?", opts: ["2", "1", "4", "3"], a: 0, why: "Whole 4, half 2, quarter 1, eighth ½, sixteenth ¼." },
      { q: "How many beats does a dotted half note last?", opts: ["3", "2", "2½", "4"], a: 0, why: "A dot adds half the note's value: 2 + 1 = 3." },
      { q: "Which tempo is slowest?", opts: ["Lento", "Andante", "Moderato", "Allegro"], a: 0, why: "Lento and adagio are slow; andante is walking pace; moderato moderate; allegro fast." },
      { q: "Listen. What is the tempo doing?", abc: "X:1\nM:4/4\nL:1/4\nQ:1/4=80\nK:C\nC E G E|C E G E|[Q:1/4=104]C E G E|[Q:1/4=128]C E G E|[Q:1/4=152]C E G E|C4|]", opts: ["Accelerando: getting faster", "Ritardando: getting slower", "Staying the same", "Getting louder"], a: 0, why: "Same pattern each measure, but each one comes round faster." },
      { q: "Three eighth notes played in the time of two. What is that?", opts: ["A triplet", "A dotted rhythm", "Syncopation", "A tie"], a: 0, why: "Marked with a 3 over (or under) the group." }
    ],
    structure: [
      { q: "A B A. Which form is that?", opts: ["Ternary", "Binary", "Rondo", "Strophic"], a: 0, why: "Three parts, the first one coming back." },
      { q: "A B A C A. Which form is that?", opts: ["Rondo", "Ternary", "Binary", "Theme and variations"], a: 0, why: "The A section keeps coming back between contrasting episodes." },
      { q: "A hymn or folk song uses the same music for every verse. That is...", opts: ["Strophic", "Through-composed", "Binary", "Rondo"], a: 0, why: "Strophic: one tune, new words each verse." },
      { q: "A minuet and trio is in which time?", opts: ["Triple (3 beats)", "Duple (2 beats)", "Quadruple (4 beats)", "Compound"], a: 0, why: "It is a dance in 3/4." }
    ],
    style: [
      { q: "Bach, Vivaldi and Handel belong to which period?", opts: ["Baroque", "Classical", "Romantic", "20th century"], a: 0, why: "Baroque, about 1600–1750." },
      { q: "Mozart and Haydn belong to which period?", opts: ["Classical", "Baroque", "Romantic", "Renaissance"], a: 0, why: "Classical, about 1750–1820. Beethoven's music bridges it and the Romantic period." },
      { q: "Listen. Which style?", abc: "X:1\nM:4/4\nL:1/8\nQ:1/4=120\nK:C\n\"C7\"G2 _B2 c2 _B G|\"F7\"_E2 F2 G4|\"C7\"G2 _B2 c2 _B G|\"G7\"F2 _E2 \"C7\"C4|]", style: "swing", opts: ["Jazz / blues", "Baroque", "Classical", "Minimalism"], a: 0, why: "Swung rhythm, blue notes (the flattened 3rd and 7th), seventh chords." },
      { q: "A short theme linked to a character, coming back through an opera or film. What is it?", opts: ["A leitmotif", "An ostinato", "A cadence", "A basso continuo"], a: 0, why: "Wagner's operas made it famous; film composers use it constantly." }
    ],
    texture: [
      { q: "Listen. Which texture?", abc: "X:1\nM:4/4\nL:1/4\nQ:1/4=90\nK:C\nE D C D|E E E2|D D D2|E G G2|]", opts: ["Monophonic (one line)", "Homophonic", "Polyphonic", "Melody and accompaniment"], a: 0, why: "One line and nothing else." },
      { q: "Listen. Which texture?", abc: "X:1\nM:4/4\nL:1/4\nQ:1/4=80\nK:C\n[ECG,C,] [FDA,D,] [GEC,C,] [GDB,G,,]|[ECG,C,]4|]", opts: ["Homophonic (chords moving together)", "Monophonic", "Polyphonic", "Antiphonal"], a: 0, why: "All the parts move in the same rhythm, like a hymn." },
      { q: "Listen. Which texture?", abc: "X:1\nM:4/4\nL:1/8\nQ:1/4=84\nK:C\nV:1\nc2 d2 e2 c2|d2 e2 f2 d2|e4 z4|\nV:2\nz8|C2 D2 E2 C2|D2 E2 F2 D2|]", opts: ["Polyphonic (independent lines, here imitating)", "Homophonic", "Monophonic", "Melody and accompaniment"], a: 0, why: "The low part copies the top part a measure later: two independent lines." },
      { q: "An Alberti bass is...", opts: ["A broken-chord accompaniment: low, high, middle, high", "A bass that walks up and down the scale", "A long held bass note", "A repeated bass melody"], a: 0, why: "Common in Classical-period piano music." }
    ]
  };

  var playJs = null, playing = null;
  function abcPlay() {
    if (global.AbcPlay) return Promise.resolve(global.AbcPlay);
    return playJs || (playJs = new Promise(function (res, rej) {
      var sc = document.createElement("script"); sc.src = "/apps/shared/abc-play.js?v=7"; sc.onload = function () { res(global.AbcPlay); };
      sc.onerror = function () { playJs = null; rej(); }; document.head.appendChild(sc);
    }));
  }
  function stop() { if (playing) { var p = playing; playing = null; try { p.h && p.h.stop(); } catch (e) {} p.btn.textContent = "▶ Listen"; } }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function make(box) {
    var set = box.dataset.set || "all";
    var pool = set === "all" ? [].concat.apply([], Object.keys(Q).map(function (k) { return Q[k]; })) : (Q[set] || []);
    var order = shuffle(pool.map(function (_, i) { return i; })), at = 0, right = 0, tries = 0, cur = null, done = false;
    var q = el("div", "sq-q"), staff = el("div", "eq-staff"), tools = el("div", "eq-tools"), ans = el("div", "sq-a"), why = el("div", "sq-why"), foot = el("div", "sq-foot");
    var listen = el("button", "btn btn-sm btn-outline-secondary", "▶ Listen"), score = el("span"), next = el("button", "btn btn-sm btn-outline-secondary", "Next →");
    tools.appendChild(listen); foot.appendChild(score); foot.appendChild(next);
    box.classList.add("sq"); box.append(q, staff, tools, ans, why, foot);
    var hidden = el("div"); hidden.style.cssText = "position:absolute;left:-9999px;width:600px"; box.appendChild(hidden);
    function draw() {
      cur = pool[order[at % order.length]]; done = false;
      q.textContent = say(cur.q); why.textContent = ""; tools.style.display = cur.abc ? "" : "none";
      staff.innerHTML = ""; staff.style.display = cur.show ? "" : "none";
      if (cur.show) global.ABCJS.renderAbc(staff, cur.abc, { responsive: "resize", add_classes: true, staffwidth: 420 });
      ans.innerHTML = "";
      shuffle(cur.opts.map(function (o, i) { return i; })).forEach(function (i) {
        var b = el("button", "btn btn-sm btn-outline-secondary", say(cur.opts[i]));
        b.dataset.i = i;
        b.addEventListener("click", function () {
          if (done) return; tries++;
          if (i === cur.a) { right++; done = true; b.classList.add("sq-right"); why.textContent = "✓ " + say(cur.why); }
          else { b.classList.add("sq-wrong"); why.textContent = "Not quite. Try again."; }
          score.textContent = right + " right of " + tries + " tries";
        });
        ans.appendChild(b);
      });
    }
    box._redo = function () { if (!cur) return; var w = why.textContent; draw(); if (w) why.textContent = w; };
    listen.addEventListener("click", function () {
      var was = playing && playing.btn === listen; stop(); if (was) return;
      var me = { btn: listen }; playing = me; listen.textContent = "■ Stop";
      var vo = global.ABCJS.renderAbc(hidden, cur.abc)[0];
      abcPlay().then(function (AP) {
        if (playing !== me) return;
        me.h = AP.play(vo, { sound: cur.sound || "piano", abc: cur.abc, style: cur.style || "pop", onEnd: function () { if (playing === me) stop(); } });
      }).catch(function () { if (playing === me) stop(); });
    });
    next.addEventListener("click", function () { stop(); at++; draw(); });
    draw();
  }

  function sheet(box) {
    var bar = el("div", "el-sheet-bar"), btn = el("button", "btn btn-sm btn-outline-secondary el-fs", "⛶ Full screen");
    if (box.dataset.title) bar.appendChild(el("div", "el-sheet-title", box.dataset.title));
    bar.appendChild(notesBox()); bar.appendChild(btn); box.insertBefore(bar, box.firstChild);
    var fsEl = function () { return document.fullscreenElement || document.webkitFullscreenElement; };
    btn.addEventListener("click", function () {
      if (fsEl() === box) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (box.requestFullscreen || box.webkitRequestFullscreen).call(box);
    });
    var grid = box.querySelector(".el-grid");
    // staves drawn wider than their card (abcjs stretches a full measure) are scaled down to fit it
    function shrink() {
      box.querySelectorAll(".el-card .abc-ex svg").forEach(function (svg) {
        if (!svg.getAttribute("viewBox")) { var w = +svg.getAttribute("width"), h = +svg.getAttribute("height"); if (!w || !h) return; svg.setAttribute("viewBox", "0 0 " + w + " " + h); }
        svg.style.maxWidth = "100%"; svg.style.height = "auto";
      });
    }
    // full screen: zoom the grid out (not below 60%) until the whole sheet fits the screen without scrolling
    function fit() {
      if (!grid) return;
      grid.style.zoom = "";
      if (fsEl() !== box) return;
      var room = box.clientHeight - grid.offsetTop - 8, need = grid.scrollHeight;
      if (need <= room) return;
      // zooming out also lets more columns fit, so step back up to the largest zoom that still fits
      var z = Math.max(0.6, room / need);
      grid.style.zoom = z;
      var fits = function () { return grid.getBoundingClientRect().bottom <= box.getBoundingClientRect().bottom - 8; };
      while (z < 0.98) { grid.style.zoom = z + 0.02; if (!fits()) { grid.style.zoom = z; break; } z += 0.02; }
    }
    new MutationObserver(function () { shrink(); }).observe(box, { childList: true, subtree: true });
    shrink();
    ["fullscreenchange", "webkitfullscreenchange"].forEach(function (ev) {
      document.addEventListener(ev, function () { btn.textContent = fsEl() === box ? "✕ Exit full screen" : "⛶ Full screen"; setTimeout(fit, 50); });
    });
    window.addEventListener("resize", function () { setTimeout(fit, 50); });
  }

  function init() {
    var css = el("style"); css.textContent =
      ".el-names{font-size:.85rem;margin:.2rem 0 1rem;color:var(--site-ink-2)}.el-names{display:flex;flex-wrap:wrap;gap:.3rem 1.2rem;align-items:center}.el-names input{margin-right:.35rem}.el-notes{display:inline-flex;align-items:center;font-size:.85rem;color:var(--site-ink-2);cursor:pointer}.el-sheet-bar{align-items:center}.el-eg{opacity:.7}" +
      ".sq{border:1px solid var(--site-border);border-radius:8px;padding:.7rem 1rem;margin:1rem 0;background:var(--site-surface)}" +
      ".sq-q{font-weight:600;margin:.2rem 0 .4rem}.eq-staff{background:#fff;border-radius:6px;max-width:30rem;margin:.3rem 0}.eq-tools{margin:.3rem 0}" +
      ".sq-a{display:flex;flex-wrap:wrap;gap:.35rem;margin:.5rem 0}.sq-a .btn{font-size:.85rem}" +
      ".sq-a .sq-right{background:#e3f1e8;border-color:var(--site-pass);color:var(--site-pass)}.sq-a .sq-wrong{background:#f8e4e2;border-color:var(--site-fail);color:var(--site-fail)}" +
      ".sq-foot{display:flex;gap:.8rem;align-items:center;font-family:var(--font-mono);font-size:.8rem;color:var(--site-ink-2)}.sq-why{font-size:.9rem;min-height:1.3em}" +
      ".el-sheet{position:relative;margin:1rem 0}.el-sheet-bar{display:flex;justify-content:flex-end;gap:.5rem;margin-bottom:.5rem}" +
      ".el-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:.6rem}" +
      ".el-card{border:1px solid var(--site-border);border-radius:8px;padding:.5rem .7rem;background:var(--site-surface);font-size:.86rem;line-height:1.35}" +
      ".el-card h4{font-size:.98rem;margin:0 0 .25rem;font-weight:700;color:var(--site-accent-dk,var(--site-ink))}.el-card p{margin:0 0 .3rem}" +
      ".el-card .abc-ex{margin:.2rem 0 0}.el-card .ax-cap{font-size:.75rem}.el-card ul{margin:0 0 .3rem;padding-left:1.1rem}" +
      ".el-card.el-wide{grid-column:span 2}.el-card .sq{margin:.2rem 0;border:0;padding:0;background:none}" +
      ".el-sheet-title{display:none;font-size:1.3rem;font-weight:700;margin:0 auto 0 0}" +
      ".el-sheet:fullscreen,.el-sheet:-webkit-full-screen{background:var(--site-bg,#fff);padding:1rem 1.4rem;overflow:auto;margin:0}" +
      ".el-sheet:fullscreen .el-sheet-title{display:block}.el-sheet:-webkit-full-screen .el-sheet-title{display:block}" +
      ".el-card .abc-ex div{max-width:100%}.el-card .abc-ex svg{max-width:100%;height:auto}" +
      ".el-card .abc-ex button{font-size:.72rem;padding:.05rem .45rem;line-height:1.3}.el-card .abc-ex .ax-btns,.el-card .abc-ex>div:last-child{margin-top:.1rem}" +
      // full screen: as many columns as fit, smaller type, so the whole sheet sits on one screen
      ".el-sheet:fullscreen{padding:.6rem .9rem}.el-sheet:fullscreen .el-sheet-bar{margin-bottom:.3rem}" +
      ".el-sheet:fullscreen .el-grid{grid-template-columns:repeat(auto-fill,minmax(225px,1fr));gap:.4rem}" +
      ".el-sheet:fullscreen .el-card{font-size:.78rem;line-height:1.28;padding:.35rem .55rem}.el-sheet:fullscreen .el-card h4{font-size:.88rem;margin-bottom:.15rem}" +
      ".el-sheet:fullscreen .el-card p{margin-bottom:.15rem}" +
      "@media (max-width:600px){.el-card.el-wide{grid-column:auto}}" +
      ".el-recap{border-left:3px solid var(--site-accent);padding:.4rem .9rem;margin:.8rem 0;background:var(--site-surface);font-size:.95rem}";
    document.head.appendChild(css);
    bar();
    document.querySelectorAll(".eq").forEach(make);
    document.querySelectorAll(".el-sheet").forEach(sheet);
    apply();
  }
  global.ElNames = { say: function (t) { return say(t); }, isUK: function () { return uk; } };
  global.ElQuiz = Q;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
