// DegreeFrame: what the numbers under the notes count from — the chord of the moment ("chord": R 3 5 ♭7 …) or the key ("key":
// 1 2 ♭3 … from the key's tonic). One choice for the whole site, remembered across pages.
//
//   DegreeFrame.get() / .set("chord" | "key") / .onChange(fn)   the choice (localStorage; fn(frame) on every page element in step)
//   DegreeFrame.toggle()          -> a small two-button control (Chord | Key) bound to the choice; put it next to the notation
//   DegreeFrame.keyName(semis)    -> the key degree for a note that many half steps above the tonic: "1" "♭2" "2" "♭3" … "7"
//   DegreeFrame.legend()          -> a sentence saying what the numbers are now, for the text under a score
// A page that draws numbers redraws them in onChange.
(function (global) {
  "use strict";
  if (global.DegreeFrame) return;
  var KEY = "degreeFrame", NAMES = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];
  var frame = "chord", fns = [];
  try { if (global.localStorage.getItem(KEY) === "key") frame = "key"; } catch (e) {}
  function get() { return frame; }
  function set(v) {
    v = v === "key" ? "key" : "chord"; if (v === frame) return; frame = v;
    try { global.localStorage.setItem(KEY, v); } catch (e) {}
    fns.forEach(function (f) { try { f(v); } catch (e) {} });
  }
  function onChange(fn) { fns.push(fn); }
  function keyName(semis) { return NAMES[((semis % 12) + 12) % 12]; }
  function legend() {
    return frame === "key" ? "Under each note is its scale degree in the key (1 = the key note)."
      : "Under each note is its place in the chord of the moment (R = root).";
  }
  function css() {
    if (document.getElementById("degree-frame-css")) return;
    var st = document.createElement("style"); st.id = "degree-frame-css";
    st.textContent = ".df-toggle{display:inline-flex;align-items:center;gap:.35rem;font-size:.75rem}"
      + ".df-toggle span{font-family:var(--font-mono,monospace);text-transform:uppercase;letter-spacing:.05em;color:var(--site-ink-2,#666)}"
      + ".df-toggle button{border:1px solid var(--site-border,#ccc);background:transparent;color:inherit;font:inherit;padding:.1rem .55rem;cursor:pointer}"
      + ".df-toggle button:first-of-type{border-radius:4px 0 0 4px}.df-toggle button:last-of-type{border-radius:0 4px 4px 0;margin-left:-1px}"
      + ".df-toggle button[aria-pressed=true]{background:var(--site-accent-dk,#2b9c90);border-color:var(--site-accent-dk,#2b9c90);color:#fff}";
    document.head.appendChild(st);
  }
  function toggle() {
    css();
    var box = document.createElement("span"), lab = document.createElement("span"); box.className = "df-toggle"; box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Numbers under the notes count from"); lab.textContent = "Numbers from"; box.appendChild(lab);
    var bs = [["chord", "Chord", "R 3 5 ♭7: the note's place in the chord it is played over"], ["key", "Key", "1 2 3 … 7: the note's scale degree in the key"]].map(function (d) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = d[1]; b.title = d[2]; b.value = d[0];
      b.addEventListener("click", function () { set(d[0]); }); box.appendChild(b); return b;
    });
    function show() { bs.forEach(function (b) { b.setAttribute("aria-pressed", String(b.value === frame)); }); }
    show(); onChange(show);
    return box;
  }
  global.DegreeFrame = { get: get, set: set, onChange: onChange, toggle: toggle, keyName: keyName, legend: legend, NAMES: NAMES };
})(typeof window !== "undefined" ? window : globalThis);
