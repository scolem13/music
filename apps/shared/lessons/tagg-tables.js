// tagg-tables.js — the chord tables on the Everyday Tonality lessons (global TaggTables).
// Every <button class="tg-play" data-chords="G⇄C"> plays its chords on the band (AbcPlay, apps/shared/abc-play.js: piano, bass
// and drums in a BandCatalog style) as a short chart: one chord a bar, the whole pattern twice (a shuttle "G⇄C" four bars:
// G C G C). The chord text is the book's: ⇄ (shuttle), spaces, "|" and "-" separate chords; ♭ ♯; "^" or "△" = maj7; "×6" and
// "…" and anything in [ ] or ( ) are left out (details, not chords); a token that is not a chord symbol is skipped.
// A second press, or another button, stops it. data-style (default "rock") and data-bpm (default 112) per button.
//   TaggTables.parse("C^⇄F6") -> ["Cmaj7", "F6"];  TaggTables.abc(chords, bars) -> ABC text
// Needs abcjs and soundfont.js on the page; abc-play.js is loaded on first use.
(function (global) {
  "use strict";
  var CHORD = /^[A-G][b#]?(?:m|maj7|maj9|maj|m7b5|m7|m9|m11|madd9|mmaj7|dim7?|aug|sus2|sus4|sus|add9|6add9|7sus4?|7b5|7#9|7b9|5|6|7|9|11|13|\+|°|ø|\/[A-G][b#]?)*$/;
  function parse(s) {
    s = String(s || "").replace(/\[[^\]]*\]|\([^)]*\)|…|×\s*\d+/g, " ").replace(/♭/g, "b").replace(/♯/g, "#").replace(/[\^△]/g, "maj7")
      .replace(/maj7(\d)/, "maj$1").replace(/[⇄|—–,;:]/g, " ").replace(/\s-\s|(?<=[A-Za-z0-9#])-(?=[A-G])/g, " ");
    s = s.replace(/\/([a-g])/g, function (m, b) { return "/" + b.toUpperCase(); });              // "B♭/c": bass note in lower case
    return s.split(/\s+/).map(function (t) { return t.replace(/^-+|-+$/g, "").replace(/°/, "dim").replace(/ø/, "m7b5").replace(/maj7maj7/, "maj7"); })
      .filter(function (t) { return CHORD.test(t); });
  }
  function abc(chords, reps) {
    var bars = [];
    for (var r = 0; r < (reps || 2); r++) chords.forEach(function (c) { bars.push('"' + c + '"z4'); });
    return "X:1\nM:4/4\nL:1/4\nK:C\n" + bars.join("|") + "|]\n";
  }
  var cur = null, playerP = null;
  function player() {
    if (global.AbcPlay) return Promise.resolve(global.AbcPlay);
    return playerP || (playerP = new Promise(function (res, rej) {
      var sc = document.createElement("script"); sc.src = "/apps/shared/abc-play.js"; sc.onload = function () { res(global.AbcPlay); };
      sc.onerror = rej; document.head.appendChild(sc);
    }));
  }
  function stop() {
    if (cur) { try { cur.h && cur.h.stop(); } catch (e) {} cur.btn.textContent = "▶"; cur.btn.classList.remove("on"); cur = null; }
  }
  function play(btn) {
    var was = cur && cur.btn === btn; stop(); if (was) return;
    var ch = parse(btn.getAttribute("data-chords")); if (!ch.length) return;
    var text = abc(ch, ch.length <= 2 ? 4 : 2);
    var box = document.createElement("div"); box.style.cssText = "position:absolute;left:-9999px;width:600px";
    document.body.appendChild(box);
    var vo = global.ABCJS.renderAbc(box, text)[0];
    var me = cur = { btn: btn, h: null }; btn.textContent = "■"; btn.classList.add("on");
    player().then(function (P) {
      if (cur !== me) return;
      me.h = P.play(vo, { abc: text, style: btn.getAttribute("data-style") || "rock", qpm: +btn.getAttribute("data-bpm") || 112,
        light: false, onEnd: function () { if (cur === me) stop(); box.remove(); } });
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".tg-play"); if (!b) return; e.preventDefault(); play(b);
  });
  global.TaggTables = { parse: parse, abc: abc, stop: stop };
})(window);
