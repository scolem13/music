// MusicalTyping: play notes on the computer keyboard, the way a DAW's "musical typing" does.
//
//   Two rows of keys are two piano rows (physical positions, so any keyboard layout works):
//     upper   2 3   5 6 7   9 0        black keys      Q W E R T Y U I O P   white keys
//     lower    S D   G H J   L ;       black keys      Z X C V B N M , . /   white keys
//   The lower row starts on C of the base octave and the upper row on the C an octave above.
//   Arrow Up / Arrow Down move the base octave.
//
//   var typing = MusicalTyping.attach({
//     onOn:  function (midi, velocity, timeStamp) {},
//     onOff: function (midi, timeStamp) {},
//     onOctave: function (octave) {},             // optional: the base octave changed
//     enabled: function () { return true; },      // optional: false makes the keys do nothing
//     octave: 3                                   // optional: base octave (C4 = middle C = 60)
//   });
//   typing.octave() / typing.setOctave(n) / typing.releaseAll() / typing.detach()
//
// Keys typed into a text box, a menu or a number field are left alone, as are keys held with Shift, Ctrl, Alt or Cmd.
(function (global) {
  "use strict";

  // physical key -> semitones above the base octave's C
  var SEMI = {
    KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4, KeyV: 5, KeyG: 6, KeyB: 7, KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11,
    Comma: 12, KeyL: 13, Period: 14, Semicolon: 15, Slash: 16,
    KeyQ: 12, Digit2: 13, KeyW: 14, Digit3: 15, KeyE: 16, KeyR: 17, Digit5: 18, KeyT: 19, Digit6: 20, KeyY: 21,
    Digit7: 22, KeyU: 23, KeyI: 24, Digit9: 25, KeyO: 26, Digit0: 27, KeyP: 28
  };

  function editable(el) {
    if (!el || !el.tagName) return false;
    var t = el.tagName;
    if (t === "INPUT") return !/^(checkbox|radio|button|range|submit|reset|color|file)$/i.test(el.type);
    return t === "TEXTAREA" || t === "SELECT" || el.isContentEditable;
  }

  function attach(cfg) {
    var octave = cfg.octave == null ? 3 : cfg.octave;
    var down = {};                                  // code -> midi that is sounding for it
    var live = true;

    function on() { return !cfg.enabled || cfg.enabled(); }
    function setOctave(n) {
      n = Math.max(0, Math.min(7, n));
      if (n === octave) return;
      releaseAll(); octave = n;
      if (cfg.onOctave) cfg.onOctave(octave);
    }
    function releaseAll(t) {
      Object.keys(down).forEach(function (c) { var m = down[c]; delete down[c]; if (cfg.onOff) cfg.onOff(m, t == null ? performance.now() : t); });
    }
    function keydown(e) {
      if (!live || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || editable(e.target) || !on()) return;
      if (e.code === "ArrowUp" || e.code === "ArrowDown") {
        if (e.repeat) { e.preventDefault(); return; }
        e.preventDefault(); setOctave(octave + (e.code === "ArrowUp" ? 1 : -1)); return;
      }
      if (!Object.prototype.hasOwnProperty.call(SEMI, e.code)) return;
      e.preventDefault();
      if (e.repeat || down[e.code] != null) return;
      var m = 12 * (octave + 1) + SEMI[e.code];
      if (m > 127) return;
      down[e.code] = m;
      cfg.onOn(m, 0.7, e.timeStamp || performance.now());
    }
    function keyup(e) {
      if (down[e.code] == null) return;
      var m = down[e.code]; delete down[e.code];
      if (cfg.onOff) cfg.onOff(m, e.timeStamp || performance.now());
    }
    function blur() { releaseAll(); }
    document.addEventListener("keydown", keydown);
    document.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);

    return {
      octave: function () { return octave; },
      setOctave: setOctave,
      releaseAll: releaseAll,
      detach: function () {
        live = false; releaseAll();
        document.removeEventListener("keydown", keydown); document.removeEventListener("keyup", keyup); window.removeEventListener("blur", blur);
      }
    };
  }

  global.MusicalTyping = { attach: attach, SEMI: SEMI };
})(window);
