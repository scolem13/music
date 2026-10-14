// DegreeNames: the ways the site can name the notes of a scale, and the one choice of which to use.
//
//   solfege   Do Ra Re Me Mi Fa Se So Le La Te Ti      counted from Do (the key signature's major tonic)
//   degrees   1̂ ♭2̂ 2̂ ♭3̂ 3̂ 4̂ ♯4̂ 5̂ ♭6̂ 6̂ ♭7̂ 7̂          counted from the home note (caret on top; flats and sharps against the major scale)
//   sargam    Sa re Re ga Ga Ma Ma♯ Pa dha Dha ni Ni     counted from the home note (small letters are komal, Ma♯ is tivra)
//
// The home note is the key's resting tone: the tonic of a minor key or a mode, which for a major key is Do. A page that
// knows only Do passes only Do. A solfège La-minor key has Do on C and its home note on A, so there A is "La", "1̂" and "Sa".
//
//   DegreeNames.label(pc, { doPc, restPc })        -> the name in the chosen system for pitch class pc (0-11)
//   DegreeNames.get() / .set(id) / .onChange(fn)   the choice, remembered across pages in localStorage
//   DegreeNames.bind(selectEl)                     fills a <select> with the systems and keeps it in step with the choice
//   DegreeNames.first()                            what the home note itself is called ("Do", "1̂", "Sa")
//   DegreeNames.term()                             "solfège" / "scale degrees" / "Sargam", for labels that mention the system
(function (global) {
  "use strict";
  if (global.DegreeNames) return;                    // loaded twice (a page and the site-wide widgets): keep the first, with its listeners
  var KEY = "degreeNames.system";
  var CARET = "̂";
  var SOLFEGE = ["Do", "Ra", "Re", "Me", "Mi", "Fa", "Se", "So", "Le", "La", "Te", "Ti"];
  var DEGREES = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"].map(function (d) { return d + CARET; });
  var SARGAM = ["Sa", "re", "Re", "ga", "Ga", "Ma", "Ma♯", "Pa", "dha", "Dha", "ni", "Ni"];
  var SYSTEMS = [
    { id: "solfege", label: "Solfège", term: "solfège", names: SOLFEGE, fromHome: false },
    { id: "degrees", label: "Scale degrees", term: "scale degrees", names: DEGREES, fromHome: true },
    { id: "sargam", label: "Sargam", term: "Sargam", names: SARGAM, fromHome: true }
  ];
  function mod12(n) { return ((n % 12) + 12) % 12; }
  function find(id) { for (var i = 0; i < SYSTEMS.length; i++) if (SYSTEMS[i].id === id) return SYSTEMS[i]; return SYSTEMS[0]; }

  var current = "solfege", cbs = [];
  try { var saved = localStorage.getItem(KEY); if (saved) current = find(saved).id; } catch (e) {}

  function get() { return current; }
  function set(id, quiet) {
    id = find(id).id; if (id === current) return;
    current = id;
    try { localStorage.setItem(KEY, id); } catch (e) {}
    if (!quiet) cbs.slice().forEach(function (f) { try { f(id); } catch (e) {} });
  }
  function onChange(f) { cbs.push(f); }
  function label(pc, key, system) {
    var s = find(system || current), k = key || {}, d = k.doPc == null ? 0 : k.doPc;
    var base = s.fromHome && k.restPc != null ? k.restPc : d;
    return s.names[mod12(pc - base)];
  }
  function first(system) { return find(system || current).names[0]; }
  function term(system) { return find(system || current).term; }
  function bind(sel) {
    sel.innerHTML = "";
    SYSTEMS.forEach(function (s) { var o = document.createElement("option"); o.value = s.id; o.textContent = s.label; sel.appendChild(o); });
    sel.value = current;
    sel.addEventListener("change", function () { set(sel.value); });
    onChange(function (id) { sel.value = id; });
  }
  window.addEventListener("storage", function (e) {   // another tab changed it
    if (e.key === KEY && e.newValue && find(e.newValue).id !== current) { current = find(e.newValue).id; cbs.slice().forEach(function (f) { try { f(current); } catch (x) {} }); }
  });

  // The caret is a combining mark in the plain strings, which many fonts draw crooked. Where the text is HTML, html() puts the digit
  // in a span and the stylesheet draws a plain ^ over it; the SVG and canvas drawing code on the pages does the same by hand.
  var HAS_CARET = /\d\u0302/;
  function html(s) {
    s = String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return s.replace(/(\d)\u0302/g, '<span class="dn-d">$1</span>');
  }
  if (typeof document !== "undefined") {
    var st = document.createElement("style");
    st.textContent = ".dn-d{position:relative;display:inline-block}.dn-d::after{content:'^';position:absolute;left:50%;top:-.36em;transform:translateX(-50%) scale(.72);font-weight:inherit;line-height:1}";
    document.head.appendChild(st);
  }

  global.DegreeNames = { html: html, hasCaret: function (s) { return HAS_CARET.test(s); }, SYSTEMS: SYSTEMS, label: label, get: get, set: set, onChange: onChange, bind: bind, first: first, term: term };
})(window);
