// space-play.js — SPACE starts/stops abcjs playback (the synth play button).
// Ignored while typing in a form control.
(function (global) {
  document.addEventListener("keydown", function (e) {
    if (e.code !== "Space") return;
    var ae = document.activeElement;
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "SELECT" || ae.tagName === "TEXTAREA")) return;
    var btn = document.querySelector(".abcjs-midi-start");   // abcjs SynthController play/pause
    if (btn) { e.preventDefault(); btn.click(); }
  });
})(window);
