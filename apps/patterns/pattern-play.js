// pattern-play.js — the play bar for Tonal Patterns and Tonal Sequences.
// The pattern data writes every note with zero length ("C0 D0 E0", drawn without stems), which abcjs's synth
// can't play. Here each note is given a beat before playing, and the tune plays through AbcPlay (the band's samples).
//   PatternPlay.bar(el, { abc: () => string, transpose: () => semitones, onEnd }) -> { play(), stop(), playing() }
// SPACE starts / stops (ignored while typing).
(function (global) {
  var SOUNDS = [["piano", "Piano"], ["flute", "Flute"], ["clarinet", "Clarinet"], ["trumpet", "Trumpet"],
                ["violin", "Violin"], ["cello", "Cello"], ["trombone", "Trombone"]];

  // "C0" / "^F,0" -> a beat each; "||" between cells becomes a short rest so the patterns stay apart.
  function playable(abc, beats) {
    var len = beats === 2 ? "4" : "2";
    return abc.split("\n").map(function (l) {
      if (/^[A-Za-z]:/.test(l) && !/^\[V:/.test(l) || /^%/.test(l)) return /^M:/.test(l) ? "M:none" : l;
      return l.replace(/"[^"]*"/g, "").replace(/([A-Ga-gz][,']*)0(?![0-9\/])/g, "$1" + len).replace(/\|\|/g, "z2 |");
    }).filter(function (l) { return !/^Q:/.test(l); }).join("\n");
  }

  function bar(el, o) {
    el.classList.add("pp-bar");
    el.innerHTML =
      '<button type="button" class="pp-play" aria-label="Play">▶ Play</button>' +
      '<label class="pp-f">Tempo <input type="range" class="pp-tempo" min="40" max="200" value="90"><span class="pp-bpm">90</span></label>' +
      '<label class="pp-f">Notes <select class="pp-len"><option value="1">beat each</option><option value="2">2 beats each</option></select></label>' +
      '<label class="pp-f">Sound <select class="pp-sound">' + SOUNDS.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join("") + '</select></label>' +
      '<label class="pp-f pp-chk"><input type="checkbox" class="pp-loop"> Repeat</label>' +
      '<div class="pp-off" aria-hidden="true"></div>';
    var btn = el.querySelector(".pp-play"), tempo = el.querySelector(".pp-tempo"), h = null, run = 0;
    tempo.oninput = function () { el.querySelector(".pp-bpm").textContent = tempo.value; };
    function show(on) { btn.textContent = on ? "■ Stop" : "▶ Play"; btn.classList.toggle("on", on); }
    function stop() { run++; if (h) { var x = h; h = null; x.stop(); } show(false); }
    function play() {
      stop(); var me = ++run;
      if (!global.AbcPlay) return;
      var src = playable(o.abc(), +el.querySelector(".pp-len").value);
      var v = ABCJS.renderAbc(el.querySelector(".pp-off"), src)[0];
      show(true);
      h = AbcPlay.play(v, { sound: el.querySelector(".pp-sound").value, qpm: +tempo.value, transpose: o.transpose ? o.transpose() : 0,
        light: false, onEnd: function () {
          if (me !== run) return; h = null;
          if (el.querySelector(".pp-loop").checked) setTimeout(function () { if (me === run) play(); }, 600);
          else { show(false); if (o.onEnd) o.onEnd(); }
        } });
    }
    btn.onclick = function () { h ? stop() : play(); };
    document.addEventListener("keydown", function (e) {
      if (e.code !== "Space" || e.ctrlKey || e.metaKey) return;
      var a = document.activeElement;
      if (a && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(a.tagName) && a.type !== "checkbox" && a.type !== "range") return;
      e.preventDefault(); h ? stop() : play();
    });
    return { play: play, stop: stop, playing: function () { return !!h; } };
  }

  if (!document.getElementById("pp-style")) {
    var s = document.createElement("style"); s.id = "pp-style";
    s.textContent =
      ".pp-bar{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .9rem}" +
      ".pp-play{font-size:1.05rem;font-weight:600;padding:.45rem 1.1rem;border-radius:.4rem;border:1px solid #2780e3;background:#2780e3;color:#fff;cursor:pointer;min-width:6.5rem}" +
      ".pp-play.on{background:#fff;color:#c0392b;border-color:#c0392b}" +
      ".pp-f{display:inline-flex;align-items:center;gap:.35rem;font-size:.85rem;color:#495057;margin:0}" +
      ".pp-f select{width:auto;height:auto;padding:.2rem .3rem}.pp-tempo{width:110px}.pp-bpm{min-width:2ch;font-variant-numeric:tabular-nums}" +
      ".pp-chk input{width:1.1rem;height:1.1rem}.pp-off{position:absolute;left:-9999px;width:400px;height:1px;overflow:hidden}";
    document.head.appendChild(s);
  }
  global.PatternPlay = { bar: bar, playable: playable };
})(window);
