// space-play.js — SPACE starts/stops playback: a button marked data-space-play (AbcPlay pages), else abcjs's synth play button.
// Ignored while typing in a form control.
(function (global) {
  document.addEventListener("keydown", function (e) {
    if (e.code !== "Space") return;
    var ae = document.activeElement;
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "SELECT" || ae.tagName === "TEXTAREA")) return;
    var btn = document.querySelector("[data-space-play], .abcjs-midi-start");
    if (btn) { e.preventDefault(); btn.click(); }
  });
})(window);
