// Basic vim keys for a <textarea>: VimTextarea.attach(ta, opts) -> { mode(), setMode(m), off() }.
// Normal mode (Esc): h j k l, w b e, 0 ^ $, gg G, f F t T (; ,), counts (3w, 2dd); x X r~ J, d c y with a motion,
// dd cc yy D C Y s S, p P, u / Ctrl+r, i a I A o O, v V (visual: a motion extends; d x c y ~ > <; Esc).
// The caret in normal mode is the one character selected. Text changes fire "input" on the textarea, as typing does.
// opts: { status: el | fn(text) for "-- INSERT --" etc., keys: { "=": fn(pos) -> new pos | undefined } (extra normal keys),
//         start: "normal" | "insert" }. Tab and Ctrl/Meta keys are left to the page (Ctrl+r is redo).
(function (global) {
  function attach(ta, opts) {
    opts = opts || {};
    var mode = opts.start || "normal", reg = { text: "", line: false }, undo = [], redo = [], pending = "", count = "", vAnchor = 0, lastF = null, insStart = null;
    var val = function () { return ta.value; };
    var ls = function (p) { return val().lastIndexOf("\n", p - 1) + 1; };
    var le = function (p) { var i = val().indexOf("\n", p); return i < 0 ? val().length : i; };
    var cls = function (c) { return c === undefined ? -1 : /\s/.test(c) ? 0 : /\w/.test(c) ? 1 : 2; };
    function show() {
      var t = mode === "insert" ? "-- INSERT --" : mode === "visual" ? "-- VISUAL --" : mode === "vline" ? "-- VISUAL LINE --" : (pending || count) ? count + pending : "";
      if (typeof opts.status === "function") opts.status(t, mode); else if (opts.status) opts.status.textContent = t;
      ta.classList.toggle("vim-normal", mode !== "insert");
    }
    var pos = 0;
    function clampN(p) { var a = ls(p), b = le(p); return Math.max(a, Math.min(p, b > a ? b - 1 : a)); }
    function put(p) {   // place the normal-mode block caret (or the visual range)
      pos = mode === "insert" ? p : clampN(p);
      if (mode === "visual") { var a = Math.min(vAnchor, pos), b = Math.max(vAnchor, pos) + 1; ta.setSelectionRange(a, Math.min(b, val().length), vAnchor <= pos ? "forward" : "backward"); }
      else if (mode === "vline") { var a2 = ls(Math.min(vAnchor, pos)), b2 = le(Math.max(vAnchor, pos)); ta.setSelectionRange(a2, b2); }
      else if (mode === "insert") ta.setSelectionRange(pos, pos);
      else ta.setSelectionRange(pos, Math.min(pos + 1, Math.max(pos, le(pos))) || pos);
    }
    function snap() { undo.push({ v: val(), p: pos }); if (undo.length > 200) undo.shift(); redo = []; }
    function setText(v, p) { ta.value = v; ta.dispatchEvent(new Event("input", { bubbles: true })); put(p); }
    function setMode(m) {
      if (m === "insert" && mode !== "insert") { snap(); insStart = val(); }
      if (mode === "insert" && m !== "insert" && insStart === val()) undo.pop();   // nothing typed: no undo step
      mode = m; show();
    }
    // ---- motions: from p, n times -> { to, incl (the character at `to` is taken by an operator), line (linewise) }
    function motion(k, p, n, arg) {
      var v = val(), L = v.length, i, col;
      switch (k) {
        case "h": return { to: Math.max(ls(p), p - n) };
        case "l": return { to: Math.min(le(p), p + n) };
        case "0": return { to: ls(p) };
        case "^": i = ls(p); while (i < le(p) && /[ \t]/.test(v[i])) i++; return { to: i };
        case "$": i = p; for (var c = 1; c < n; c++) i = le(i) + 1; return { to: Math.max(ls(i), le(i) - 1), incl: true };
        case "j": case "k":
          col = p - ls(p); i = p;
          for (var c2 = 0; c2 < n; c2++) { if (k === "j") { if (le(i) >= L) break; i = le(i) + 1; } else { if (ls(i) === 0) break; i = ls(i) - 1; } }
          var a = ls(i); return { to: Math.min(a + col, Math.max(a, le(a) - (mode === "insert" ? 0 : 1))), line: true };
        case "G": if (arg === "gg") { i = 0; return { to: i, line: true }; }
          i = L; if (count) { i = 0; for (var c3 = 1; c3 < n; c3++) { var nx = v.indexOf("\n", i); if (nx < 0) break; i = nx + 1; } } return { to: ls(i), line: true };
        case "w": i = p;
          for (var c4 = 0; c4 < n; c4++) { var k0 = cls(v[i]); if (k0 > 0) while (i < L && cls(v[i]) === k0) i++; while (i < L && cls(v[i]) === 0) i++; }
          return { to: i };
        case "e": i = p;
          for (var c5 = 0; c5 < n; c5++) { i++; while (i < L && cls(v[i]) === 0) i++; var k1 = cls(v[i]); while (i + 1 < L && cls(v[i + 1]) === k1) i++; }
          return { to: Math.min(i, L - 1), incl: true };
        case "b": i = p;
          for (var c6 = 0; c6 < n; c6++) { i--; while (i > 0 && cls(v[i]) === 0) i--; var k2 = cls(v[i]); while (i > 0 && cls(v[i - 1]) === k2) i--; }
          return { to: Math.max(0, i) };
        case "f": case "t": case "F": case "T":
          i = p;
          for (var c7 = 0; c7 < n; c7++) {
            var fwd = k === "f" || k === "t", from = fwd ? i + 1 + (k === "t" && c7 === 0 ? 1 : 0) : i - 1 - (k === "T" && c7 === 0 ? 1 : 0);
            var j = fwd ? v.indexOf(arg, from) : v.lastIndexOf(arg, from);
            if (j < 0 || (fwd ? j >= le(p) : j < ls(p))) return null;
            i = j;
          }
          if (k === "t") i--; if (k === "T") i++;
          return { to: i, incl: k === "f" || k === "t" };
      }
      return null;
    }
    function range(m, p) {   // an operator's [a, b) and whether it is whole lines
      if (m.line) { var a = ls(Math.min(p, m.to)), b = le(Math.max(p, m.to)); return { a: a, b: Math.min(b + 1, val().length), line: true }; }
      var x = Math.min(p, m.to), y = Math.max(p, m.to) + (m.incl ? 1 : 0);
      return { a: x, b: y, line: false };
    }
    function apply(op, r) {   // d c y > < ~ on [r.a, r.b)
      var v = val(), t = v.slice(r.a, r.b);
      if (op === "y") { reg = { text: t, line: r.line }; put(r.a); return; }
      if (op === ">" || op === "<") {
        snap(); var a = ls(r.a), seg = v.slice(a, r.b);
        seg = seg.replace(/^/gm, op === ">" ? "  " : "").replace(op === "<" ? /^ {1,2}/gm : /$^/, "");
        setText(v.slice(0, a) + seg + v.slice(r.b), a); return;
      }
      if (op === "~") { snap(); setText(v.slice(0, r.a) + t.replace(/./g, function (c) { return c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase(); }) + v.slice(r.b), r.a); return; }
      reg = { text: t, line: r.line };
      if (op === "c") {
        snap(); var keepNl = r.line && t.slice(-1) === "\n";
        var nv = v.slice(0, r.a) + (keepNl ? "\n" : "") + v.slice(r.b);
        mode = "insert"; insStart = null; setText(nv, r.a); show(); return;
      }
      snap();
      var nv2 = v.slice(0, r.a) + v.slice(r.b), at = r.a;
      if (r.line && r.b >= v.length && r.a > 0 && v[r.a - 1] === "\n" && t.slice(-1) !== "\n") { nv2 = v.slice(0, r.a - 1); at = ls(r.a - 1); }   // the last line: take the newline before it
      setText(nv2, r.line ? at : at);
    }
    function paste(after, n) {
      var v = val(), t = new Array(n + 1).join(reg.text);
      if (!reg.text) return;
      snap();
      if (reg.line) {
        if (t.slice(-1) !== "\n") t += "\n";
        var at = after ? le(pos) + 1 : ls(pos);
        if (after && le(pos) >= v.length) { setText(v + "\n" + t.slice(0, -1), v.length + 1); return; }
        setText(v.slice(0, at) + t + v.slice(at), at); return;
      }
      var at2 = after && v.length ? Math.min(pos + 1, le(pos)) : pos;
      setText(v.slice(0, at2) + t + v.slice(at2), at2 + t.length - 1);
    }
    function doUndo(stackA, stackB) { var s = stackA.pop(); if (!s) return; stackB.push({ v: val(), p: pos }); setText(s.v, s.p); }
    function wordEnd(p, n) {
      var v = val(), i = p;
      for (var c = 0; c < n; c++) { if (c) { i++; while (i < v.length && cls(v[i]) === 0) i++; } var kk = cls(v[i]); while (i + 1 < v.length && cls(v[i + 1]) === kk) i++; }
      return { to: i, incl: true };
    }
    var MOTIONS = "hjkl0^$wbeGftFT;,";
    function key(e) {
      if (e.isComposing || e.key === "Tab") return;
      if (mode === "insert") {
        if (e.key === "Escape" || (e.ctrlKey && e.key === "[")) { e.preventDefault(); var p0 = ta.selectionStart; setMode("normal"); put(p0 > ls(p0) ? p0 - 1 : p0); }
        return;
      }
      if (e.ctrlKey && e.key === "r") { e.preventDefault(); doUndo(redo, undo); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length > 1 && !/^(Escape|Backspace|Enter|Arrow\w+)$/.test(e.key)) return;   // Shift, F keys ... pass
      e.preventDefault();
      var k = { ArrowLeft: "h", ArrowRight: "l", ArrowUp: "k", ArrowDown: "j", Backspace: "h", Enter: "j" }[e.key] || e.key;
      if (k === "Escape") { pending = ""; count = ""; if (mode !== "normal") { mode = "normal"; put(pos); } show(); return; }
      pos = mode === "visual" || mode === "vline" ? pos : ta.selectionStart;
      // a character argument: r f t F T
      if (pending === "r" || /[fFtT]$/.test(pending)) {
        var pd = pending, n0 = +count || 1; pending = ""; count = "";
        if (pd === "r") { var v0 = val(); if (pos < le(pos)) { snap(); setText(v0.slice(0, pos) + k.repeat(Math.min(n0, le(pos) - pos)) + v0.slice(pos + Math.min(n0, le(pos) - pos)), pos + Math.min(n0, le(pos) - pos) - 1); } show(); return; }
        var fk = pd.slice(-1), op0 = pd.length > 1 ? pd[0] : ""; lastF = { k: fk, c: k };
        var m0 = motion(fk, pos, n0, k);
        if (m0) { if (op0) apply(op0, range(m0, pos)); else put(m0.to); }
        show(); return;
      }
      if (/[0-9]/.test(k) && (k !== "0" || count)) { count += k; show(); return; }
      var n = +count || 1, op = /^[dcy><]$/.test(pending) ? pending : "";
      if (pending === "g" || pending === op + "g") { pending = op; if (k === "g") k = "gg"; else { pending = ""; count = ""; show(); return; } }
      if (k === "g") { pending = op + "g"; show(); return; }
      if (/^[fFtT]$/.test(k)) { pending = op + k; show(); return; }
      if (k === ";" || k === ",") { if (!lastF) { count = ""; return; } var rev = { f: "F", F: "f", t: "T", T: "t" }; k = k === ";" ? lastF.k : rev[lastF.k]; var mm = motion(k, pos, n, lastF.c); count = ""; pending = ""; if (mm) { if (op) apply(op, range(mm, pos)); else put(mm.to); } show(); return; }
      if (k === "gg" || MOTIONS.indexOf(k) >= 0) {
        var m = motion(k === "gg" ? "G" : k, pos, n, k === "gg" ? "gg" : undefined);
        if (op === "c" && k === "w" && cls(val()[pos]) !== 0) m = wordEnd(pos, n);   // cw changes to the word's end, as ce
        pending = ""; count = "";
        if (m) {
          if (op) { var rg = range(m, pos); if (!m.line && k === "w" && op !== "c" && val().slice(rg.a, rg.b).indexOf("\n") >= 0) rg.b = le(pos); apply(op, rg); }
          else put(m.to);
        }
        show(); return;
      }
      // visual
      if (mode === "visual" || mode === "vline") {
        var va = mode === "vline" ? ls(Math.min(vAnchor, pos)) : Math.min(vAnchor, pos), vb = mode === "vline" ? Math.min(le(Math.max(vAnchor, pos)) + 1, val().length) : Math.max(vAnchor, pos) + 1, line = mode === "vline";
        count = "";
        if (k === "v" || k === "V") { var want = k === "v" ? "visual" : "vline"; mode = mode === want ? "normal" : want; put(pos); show(); return; }
        if (k === "o") { var t0 = vAnchor; vAnchor = pos; put(t0); return; }
        if (/^[dxcy~><DXCYS]$/.test(k)) {
          var o = { x: "d", D: "d", X: "d", C: "c", S: "c", Y: "y" }[k] || k; if (/[DXCYS]/.test(k)) line = true;
          if (line) { va = ls(va); vb = Math.min(le(Math.max(vb - 1, va)) + 1, val().length); }
          mode = "normal"; apply(o, { a: va, b: vb, line: line }); if (mode === "normal") put(o === "y" ? va : pos > val().length ? val().length : Math.min(va, val().length)); show(); return;
        }
        if (k === "p" || k === "P") { var keep = reg; mode = "normal"; apply("d", { a: va, b: vb, line: line }); var kept = reg; reg = keep; pos = va; paste(false, 1); reg = kept; show(); return; }
        if (k === "=" && opts.keys && opts.keys["="]) { mode = "normal"; var np0 = opts.keys["="](pos); put(np0 != null ? np0 : pos); show(); return; }
        return;
      }
      // operators
      if (/^[dcy><]$/.test(k)) {
        if (op === k) { pending = ""; var nn = n; count = ""; var a1 = ls(pos), e1 = pos; for (var c1 = 1; c1 < nn; c1++) e1 = Math.min(le(e1) + 1, val().length); apply(k, { a: a1, b: Math.min(le(e1) + 1, val().length), line: true }); show(); return; }
        pending = k; show(); return;
      }
      pending = ""; count = "";
      var v = val();
      switch (k) {
        case "i": setMode("insert"); put(pos); break;
        case "a": setMode("insert"); put(Math.min(pos + (le(pos) > ls(pos) ? 1 : 0), le(pos))); break;
        case "I": setMode("insert"); var ii = ls(pos); while (ii < le(pos) && /[ \t]/.test(v[ii])) ii++; put(ii); break;
        case "A": setMode("insert"); put(le(pos)); break;
        case "o": setMode("insert"); setText(v.slice(0, le(pos)) + "\n" + v.slice(le(pos)), le(pos) + 1); break;
        case "O": setMode("insert"); setText(v.slice(0, ls(pos)) + "\n" + v.slice(ls(pos)), ls(pos)); break;
        case "x": if (pos < le(pos)) apply("d", { a: pos, b: Math.min(pos + n, le(pos)) }); break;
        case "X": if (pos > ls(pos)) apply("d", { a: Math.max(ls(pos), pos - n), b: pos }); break;
        case "s": apply("c", { a: pos, b: Math.min(pos + n, le(pos)) }); break;
        case "S": apply("c", { a: ls(pos), b: Math.min(le(pos) + 1, v.length), line: true }); break;
        case "D": apply("d", { a: pos, b: le(pos) }); break;
        case "C": apply("c", { a: pos, b: le(pos) }); break;
        case "Y": apply("y", { a: ls(pos), b: Math.min(le(pos) + 1, v.length), line: true }); put(pos); break;
        case "p": case "P": paste(k === "p", n); break;
        case "u": doUndo(undo, redo); break;
        case "~": if (pos < le(pos)) { apply("~", { a: pos, b: Math.min(pos + n, le(pos)) }); put(Math.min(pos + n, le(pos))); } break;
        case "J": if (le(pos) < v.length) { snap(); var e2 = le(pos), s2 = e2 + 1; while (s2 < v.length && /[ \t]/.test(v[s2])) s2++; setText(v.slice(0, e2) + " " + v.slice(s2), e2); } break;
        case "r": pending = "r"; break;
        case "v": vAnchor = pos; mode = "visual"; put(pos); break;
        case "V": vAnchor = pos; mode = "vline"; put(pos); break;
        default:
          if (opts.keys && opts.keys[k]) { var np = opts.keys[k](pos); if (np != null) put(np); }
      }
      show();
    }
    function onFocus() { setTimeout(function () { if (mode !== "insert") put(ta.selectionStart === ta.selectionEnd ? ta.selectionStart : ta.selectionStart); show(); }, 0); }
    function onUp() { if (mode === "normal") put(ta.selectionStart); else if (mode === "visual" || mode === "vline") { pos = ta.selectionEnd - (mode === "visual" ? 1 : 0); } }
    ta.addEventListener("keydown", key);
    ta.addEventListener("focus", onFocus);
    ta.addEventListener("mouseup", onUp);
    show();
    return {
      mode: function () { return mode; },
      setMode: function (m) { mode = m; show(); put(ta.selectionStart); },
      put: function (p) { put(p); },
      off: function () { ta.removeEventListener("keydown", key); ta.removeEventListener("focus", onFocus); ta.removeEventListener("mouseup", onUp); ta.classList.remove("vim-normal"); if (typeof opts.status === "function") opts.status("", "off"); else if (opts.status) opts.status.textContent = ""; }
    };
  }
  global.VimTextarea = { attach: attach };
})(typeof window !== "undefined" ? window : this);
