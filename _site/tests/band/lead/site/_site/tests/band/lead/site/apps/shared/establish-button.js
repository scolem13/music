// establish-button.js — drops a floating "♪ Establish tonality" button on any
// tonal app (plays the cadence in the current shared tonality via Tonality.establish).
// Skips apps that already have their own #establish button.
(function (global) {
  function make(){
    if (!global.Tonality || !global.Tonality.establish) return;
    if (document.getElementById("establish") || document.getElementById("establish-tonality-btn")) return;
    const b = document.createElement("button");
    b.id = "establish-tonality-btn"; b.type = "button"; b.textContent = "♪ Establish tonality";
    b.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:99999;font:13px -apple-system,system-ui,sans-serif;" +
      "padding:.45rem .7rem;border-radius:8px;border:1px solid #3a3f48;background:#262a31;color:#e8eaed;" +
      "cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4)";
    b.onclick = function(){ global.Tonality.establish(); };
    document.body.appendChild(b);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", make);
  else make();
  global.addEventListener("load", make);
})(window);
