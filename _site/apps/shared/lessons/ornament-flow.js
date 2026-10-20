// ornament-flow.js — the "Which way do I play it?" flow chart on lessons/ornaments-by-period.qmd.
// Fills <div id="ob-flow"> (with #ob-chain, #ob-composer + #ob-composers datalist, #ob-restart). Each answer adds the next
// question below it, joined by an arrow; earlier answers stay on the chart and can be changed (the path below is redone).
// The last box is the advice: how to play it, what to avoid, and a link to the page's section for that period.
// Typing a composer from the list answers the period (and region / who) questions at once.
(function () {
  var root = document.getElementById("ob-flow"); if (!root) return;
  var chain = document.getElementById("ob-chain");

  // ---- the questions. opts: [label, small print, value]; next(state) names the following node, or "result".
  var SIGNS = [["A small note", "before a main note", "grace"], ["A trill", "tr, a wavy line, +", "trill"], ["A mordent", "a short zigzag", "mordent"],
    ["A turn", "∽", "turn"], ["Nothing written", "a slow melody, or a repeat", "none"], ["A fermata", "a pause near a cadence", "fermata"]];
  var NODES = {
    period: { q: "When was the piece written?", opts: [["Baroque", "before c. 1750", "baroque"], ["Classical", "c. 1750–1820", "classical"],
      ["Romantic", "c. 1820–1900", "romantic"], ["20th or 21st century", "concert music", "modern"], ["Jazz, blues, a chart", "lead sheet or band part", "jazz"]],
      next: function (s) { return { baroque: "region", classical: "sign", romantic: "who", modern: "legend", jazz: "part" }[s.period]; } },
    region: { q: "Where is the composer from, or whose style is it?", help: "French and English composers printed their own tables of signs.",
      opts: [["German", "Bach, Handel, Telemann", "german"], ["French", "Couperin, Rameau, d'Anglebert", "french"], ["Italian", "Corelli, Vivaldi, Scarlatti", "italian"], ["English", "Purcell", "english"]],
      next: function () { return "sign"; } },
    who: { q: "Who wrote it?", opts: [["Chopin", "", "chopin"], ["Early, to c. 1840", "Hummel, Schubert, Weber, Mendelssohn", "early"], ["Later", "Liszt, Brahms, Tchaikovsky, Grieg …", "late"]],
      next: function () { return "sign"; } },
    legend: { q: "Does the score have a performance note explaining its signs?", help: "Usually on a page before the music, or as footnotes.",
      opts: [["Yes", "", "yes"], ["No", "", "no"]], next: function (s) { return s.legend === "yes" ? "result" : "sign"; } },
    part: { q: "Where is the sign?", opts: [["A section part", "big band, horns", "section"], ["A lead sheet or a solo", "", "solo"]], next: function () { return "jsign"; } },
    sign: { q: "What is written?", opts: SIGNS, next: function (s) { return s.sign === "grace" && s.period !== "modern" ? "slash" : "result"; } },
    slash: { q: "Does the small note have a line through it?", opts: [["Yes", "an acciaccatura", "yes"], ["No", "", "no"]], next: function () { return "result"; } },
    jsign: { q: "Which sign?", opts: [["Fall", "a line falling after the note", "fall"], ["Doit", "a line rising after the note", "doit"],
      ["Scoop or plop", "a curve into the note", "scoop"], ["Shake", "shake, or a wavy line", "shake"], ["A small note", "", "grace"], ["Nothing written", "", "none"]],
      next: function () { return "result"; } }
  };

  // ---- composers -> answers
  var COMPOSERS = {
    "J. S. Bach": { period: "baroque", region: "german" }, "Handel": { period: "baroque", region: "german" }, "Telemann": { period: "baroque", region: "german" },
    "Buxtehude": { period: "baroque", region: "german" }, "Couperin": { period: "baroque", region: "french" }, "Rameau": { period: "baroque", region: "french" },
    "d'Anglebert": { period: "baroque", region: "french" }, "Lully": { period: "baroque", region: "french" }, "Marais": { period: "baroque", region: "french" },
    "Corelli": { period: "baroque", region: "italian" }, "Vivaldi": { period: "baroque", region: "italian" }, "D. Scarlatti": { period: "baroque", region: "italian" },
    "Geminiani": { period: "baroque", region: "italian" }, "Purcell": { period: "baroque", region: "english" },
    "C. P. E. Bach": { period: "classical" }, "Haydn": { period: "classical" }, "Mozart": { period: "classical" }, "Clementi": { period: "classical" },
    "Beethoven": { period: "classical" },
    "Hummel": { period: "romantic", who: "early" }, "Schubert": { period: "romantic", who: "early" }, "Weber": { period: "romantic", who: "early" },
    "Mendelssohn": { period: "romantic", who: "early" }, "Chopin": { period: "romantic", who: "chopin" }, "Schumann": { period: "romantic", who: "late" },
    "Liszt": { period: "romantic", who: "late" }, "Brahms": { period: "romantic", who: "late" }, "Tchaikovsky": { period: "romantic", who: "late" },
    "Grieg": { period: "romantic", who: "late" }, "Dvořák": { period: "romantic", who: "late" },
    "Debussy": { period: "modern" }, "Ravel": { period: "modern" }, "Bartók": { period: "modern" }, "Stravinsky": { period: "modern" },
    "Messiaen": { period: "modern" }, "Ligeti": { period: "modern" }, "Saariaho": { period: "modern" }, "Reich": { period: "modern" },
    "Ellington": { period: "jazz" }, "Basie": { period: "jazz" }, "Armstrong": { period: "jazz" }, "Gershwin (songs)": { period: "jazz" },
    "Monk": { period: "jazz" }, "Mingus": { period: "jazz" }
  };
  // Beethoven straddles the line: the Classical answer is the safer default, and the advice says so.

  // ---- advice. Each returns { title, play: [...], avoid: [...], link: [href, text], note? }
  var LINK = { baroque: ["#baroque", "Baroque examples"], classical: ["#classical", "Classical examples"], romantic: ["#romantic", "Romantic examples"],
    modern: ["#modern", "20th and 21st-century examples"], jazz: ["#jazz", "Jazz examples"] };
  var REGION = {
    french: "French music has its own signs, and each composer explains them in a table at the front of his book: check that table first.",
    english: "Purcell's signs are not the modern ones: two slanting strokes are a shake, a stroke rising into a note a forefall. His \"Rules for Graces\" (1696) explain them.",
    italian: "On slow movements an Italian player was expected to add divisions (running notes) between the written ones, more on a repeat.",
    german: ""
  };
  function early(s) {   // Baroque and Classical share most rules
    var P = s.period, B = P === "baroque";
    switch (s.sign) {
      case "grace":
        if (s.slash === "yes") return { title: "A short grace (acciaccatura)", play: ["Short, and still on the beat: the grace is struck with the harmony and let go at once."],
          avoid: ["Making it long: the slash says it's short."], note: B ? "The slashed small note is mostly a later sign. In Baroque prints, check the composer's table." : "" };
        return { title: "An appoggiatura: on the beat, and long", play: ["Play the small note on the beat, with the harmony, leaning on it.", "Give it half the main note (two-thirds of a dotted note). Before a long final note it can take more.",
          "Play the main note softer, as a resolution."], avoid: ["Flicking it before the beat: that is the 20th-century habit.", "Accenting the main note instead of the grace."],
          note: "Before quick notes, repeated notes, or notes that already make a dissonance, the grace is short, still on the beat." };
      case "trill":
        return { title: "A trill from the note above", play: ["Start on the note above, on the beat" + (B ? ", and lean on that first note." : "."), "Trill evenly; at a cadence end with a turn or a quick anticipation of the next note.",
          "A long trill can start slowly and speed up."], avoid: ["Starting on the main note: that is the 19th-century rule.", "A trill on the note of resolution: trill the note before it."],
          note: B ? "Some scholars argue that a main-note start is possible in Bach (Neumann). Most players still start above." : "Late Beethoven and Clementi's short trill are the edge cases: an upper start is the safe default." };
      case "mordent":
        return { title: "A mordent: main note, the note below, main note", play: ["On the beat, quick, then hold the main note.", "Use the scale note below unless an accidental is written under the sign."],
          avoid: ["Confusing it with the inverted mordent (the note above). In Baroque tables the plain zigzag with no stroke can mean the upper-note version."] };
      case "turn":
        return { title: "A turn: above, main, below, main", play: ["Over the note: start on the note above, on the beat.", "After the note (between two notes): play the main note first, then the turn at the end, into the next note."],
          avoid: ["Rushing it: in slow music a turn is four even, sung notes."] };
      case "none":
        return { title: B ? "Add your own, with taste" : "Decorate repeats only", play: B ? ["On long notes and the repeat of a slow movement, add graces or divisions.", "Put them on weak notes and long notes; leave cadences and downbeats clear.", "Use the composer's own written-out ornaments as a model where there are any (Bach's agréments)."] :
          ["Play the first time as written. On a repeat in a slow movement or an aria, decorate a little.", "Start and end each decoration on the written notes."],
          avoid: ["An ornament on every note.", B ? "A trill on a final note." : "Adding to fast movements or to music the composer has already decorated (Mozart often writes his out)."] };
      case "fermata":
        return { title: B ? "A pause: a short flourish or cadenza" : "A cadenza or an Eingang", play: B ? ["At a fermata on the chord before the final cadence, a short improvised flourish is expected in a concerto or sonata."] :
          ["Over the 6/4 chord near the end of a concerto movement: a cadenza, ending with a trill on the dominant.", "At a pause before a theme comes back: a short Eingang (lead-in), a few seconds long."],
          avoid: ["A long cadenza in a piece that isn't a concerto.", "Wandering into other keys in an Eingang."], note: !B ? "Use the composer's own cadenzas where they exist (Mozart wrote some; Beethoven wrote his for his concertos)." : "" };
    }
  }
  function romantic(s) {
    var C = s.who === "chopin", L = s.who === "late";
    switch (s.sign) {
      case "grace":
        if (C) return { title: "On the beat, with the bass", play: ["Strike the grace together with the bass note, quickly, then the main note.", "In the early Contredanse his editors put them before the beat: check the edition's notes."],
          avoid: ["A long Baroque appoggiatura."] };
        return { title: L || s.slash === "yes" ? "Short, usually before the beat" : "Short, on or just before the beat", play: [L ? "Play it just before the beat, so the main note sounds with the bass." : "Keep it short. Hummel still gives long appoggiaturas half the note when they're written as a longer value."],
          avoid: ["A long lean taking half the note, unless the grace is written as a long value."] };
      case "trill":
        return { title: "A trill from the main note", play: ["Start on the main note" + (C ? ", with the bass." : "."), "A small note before the trill means start on that note.", "End with a turn if written; otherwise as the phrase needs."],
          avoid: ["Adding an upper-note start the composer didn't write."] };
      case "mordent": return { title: "A quick mordent on the beat", play: ["Quick, light, on the beat; the sign now usually means the note above (the short trill)."], avoid: ["Making it heavy or slow."] };
      case "turn": return { title: "A sung turn", play: ["As written, over or after the note.", C ? "Chopin: \"not a quick gruppetto, but eight notes well sung\" (Ekier)." : "Shape it with the line: in slow music, unhurried."], avoid: ["A mechanical, fast turn."] };
      case "none": return { title: "Play what's written", play: ["Shape the written line with rubato, tone and timing instead of adding notes."], avoid: ["Adding ornaments: by now the composer writes them."],
        note: "Opera singers are the exception: in Rossini and Bellini repeats are still decorated." };
      case "fermata": return { title: "Hold, don't improvise", play: ["Hold the pause as long as the phrase needs.", "Where there's a cadenza, it is almost always written out."], avoid: ["Improvising a cadenza where none is written."] };
    }
  }
  function modern(s) {
    if (s.legend === "yes") return { title: "Follow the performance note", play: ["The composer's legend overrules every period rule on this page.", "Ask your teacher if a sign in it isn't clear."], avoid: ["Bringing in Baroque or Classical habits the note doesn't ask for."] };
    switch (s.sign) {
      case "grace": return { title: "Before the beat, as quick as possible", play: ["Play the small notes before the beat so the main note lands on it."], avoid: ["A long appoggiatura on the beat."] };
      case "trill": return { title: "From the main note, unmeasured", play: ["Start on the main note and trill as fast as is clean, without counting notes.", "A sharp or flat by the sign gives the other note."], avoid: ["An upper-note start or a measured trill, unless written."] };
      case "mordent": return { title: "Quick, from the main note", play: ["Treat it as a very short trill on the main note."], avoid: ["Guessing a period meaning: if it's unclear, ask or check other works by the composer."] };
      case "turn": return { title: "As written", play: ["Play it evenly and quickly, from the note above."], avoid: ["Expressive Romantic stretching unless the style calls for it."] };
      case "none": return { title: "Add nothing", play: ["Play exactly what's written. A box, a graphic, or ad lib. are the only invitations to improvise."], avoid: ["Adding ornaments of your own."] };
      case "fermata": return { title: "A pause, timed by the score", play: ["Some scores give a pause length in seconds, or different fermata shapes for short and long pauses."], avoid: ["Adding a cadenza."] };
    }
  }
  function jazz(s) {
    var sec = s.part === "section";
    var who = sec ? "Match the lead player: same length, same speed, same release." : "Make it yours; the sign is a suggestion.";
    var r = {
      fall: { title: "A fall", play: ["Hold the note its full value, then let the pitch drop away at the release.", who], avoid: ["Starting the fall before the beat, or before the note has sounded."] },
      doit: { title: "A doit", play: ["After the note has sounded, slide up and away into silence.", who], avoid: ["Making it a definite pitch: it rises \"into infinity\"."] },
      scoop: { title: "A scoop or plop", play: ["Scoop: start just below and slide up into the note, on the beat.", "Plop: drop into the note from above, before the beat.", who], avoid: ["A slow, obvious slide: it's a flavour of the attack."] },
      shake: { title: "A shake", play: ["A wide, loose lip trill (trumpet) or vibrato-like trill; start the note straight, then shake.", who], avoid: ["A neat, measured Classical trill."] },
      grace: { title: "A crushed note, before or across the beat", play: ["Quick and swung, sliding into the main note. On piano, crush the two notes together and let the grace go.", "A blue note grace (minor third into major third) always comes from below."],
        avoid: ["A long appoggiatura on the beat.", "A grace from above into the blue third: it sounds minor."] },
      none: { title: sec ? "Play it as the lead does" : "Shape the melody yourself", play: sec ? ["Copy the lead player's inflections, so the section phrases as one."] : ["Add scoops, falls, grace notes and changes of rhythm; the written melody is the outline.", "Listen to two or three singers or players on the tune first."],
        avoid: sec ? ["Adding your own falls in a section passage."] : ["Playing the lead sheet exactly as written, in straight time."] }
    };
    return r[s.jsign];
  }
  function advise(s) {
    var r = s.period === "jazz" ? jazz(s) : s.period === "romantic" ? romantic(s) : s.period === "modern" ? modern(s) : early(s);
    r.link = LINK[s.period];
    if (s.period === "baroque" && REGION[s.region]) r.note = (r.note ? r.note + " " : "") + REGION[s.region];
    if (s.composer === "Beethoven") r.note = (r.note ? r.note + " " : "") + "Beethoven's late works lean towards the 19th-century readings; ask what your edition says.";
    return r;
  }

  // ---- drawing
  var state = {}, path = [];   // path: node ids answered, in order
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function nodeAfter(id) { return NODES[id].next(state); }
  function draw() {
    chain.innerHTML = "";
    var id = "period", i = 0;
    while (id && id !== "result") {
      var n = NODES[id], box = el("div", "ob-node"), answered = state[id] != null && path.indexOf(id) >= 0;
      if (answered) box.classList.add("done");
      box.appendChild(el("div", "ob-q", n.q));
      if (n.help) box.appendChild(el("div", "ob-help", n.help));
      var row = el("div", "ob-opts");
      n.opts.forEach(function (o) {
        var b = el("button"); b.type = "button"; b.appendChild(document.createTextNode(o[0]));
        if (o[1]) b.appendChild(el("small", "", o[1]));
        if (answered && state[id] === o[2]) { b.classList.add("on"); b.setAttribute("aria-pressed", "true"); }
        b.onclick = (function (nid, v) { return function () { answer(nid, v); }; })(id, o[2]);
        row.appendChild(b);
      });
      box.appendChild(row); chain.appendChild(box);
      if (!answered) return;
      id = nodeAfter(id); i++;
    }
    if (id === "result") chain.appendChild(result(advise(state)));
  }
  function result(r) {
    var box = el("div", "ob-node ob-result");
    box.appendChild(el("h4", "", r.title));
    var ul = el("ul"); r.play.forEach(function (t) { ul.appendChild(el("li", "", t)); }); box.appendChild(ul);
    if (r.avoid && r.avoid.length) {
      box.appendChild(el("div", "ob-q", "Avoid"));
      var av = el("ul", "ob-avoid"); r.avoid.forEach(function (t) { var li = el("li"); li.appendChild(el("span", "", t)); av.appendChild(li); }); box.appendChild(av);
    }
    if (r.note) box.appendChild(el("p", "ob-help", r.note));
    if (r.link) { var a = el("a", "", "Hear the " + r.link[1] + " →"); a.href = r.link[0]; box.appendChild(a); }
    return box;
  }
  function answer(id, v) {
    // drop this answer and everything after it, then record it
    var k = path.indexOf(id);
    if (k >= 0) path.splice(k).forEach(function (p) { delete state[p]; });
    state[id] = v; path.push(id);
    draw();
    var last = chain.lastElementChild; if (last && last.scrollIntoView && path.length > 1) last.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function restart() { state = {}; path = []; composer.value = ""; draw(); }

  var composer = document.getElementById("ob-composer"), list = document.getElementById("ob-composers");
  Object.keys(COMPOSERS).forEach(function (c) { var o = document.createElement("option"); o.value = c; list.appendChild(o); });
  composer.addEventListener("input", function () {
    var v = composer.value.trim().toLowerCase(), hit = null;
    Object.keys(COMPOSERS).forEach(function (c) { if (c.toLowerCase() === v || (v.length > 3 && c.toLowerCase().replace(/^[a-z. ]+\. /, "") === v) && !hit) hit = c; });
    if (!hit) return;
    var a = COMPOSERS[hit];
    state = { composer: hit }; path = [];
    ["period", "region", "who"].forEach(function (k) { if (a[k]) { state[k] = a[k]; path.push(k); } });
    draw();
  });
  document.getElementById("ob-restart").onclick = restart;
  window.OrnamentFlow = { answer: answer, restart: restart, state: function () { return state; } };   // for tests
  draw();
})();
