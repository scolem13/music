// AbcEditor: an ABC text box with the Notation page's vim keys (vim-textarea.js), a bar-length check, and edits kept in
// the browser per tune, for any page that shows ABC.
//
//   var ed = AbcEditor.mount(el, { id: "lightly-row", abc: "X:1…", onApply: function (abc) { …draw it… } });
//   ed.set(id, abc)      another tune (its kept edit, if any, comes up instead of abc)
//   AbcEditor.edited(id, abc)   the tune as edited in this browser, else abc (use it wherever the tune is drawn)
//   AbcEditor.all()      { id: abc } every kept edit
//
// Edits live in localStorage "abc-edits" ({ id: { abc, saved } }). "Download edits" writes them as one .json
// ({ app: "abc-edits", edits: { id: abc } }); `node scripts/apply-abc-edits.mjs <file>` writes them into
// apps/tunes/tunes-object.js by %%id (no model needed). The vim switch is shared site-wide (localStorage "abcVim").
// Needs abcjs (ABCJS.parseOnly) for the check; vim-textarea.js for vim (loaded on demand when missing).
(function (global) {
  "use strict";
  var KEY = "abc-edits", VIM = "abcVim", VIM_SRC = "/apps/shared/vim-textarea.js?v=1";
  function store() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function keep(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function edited(id, abc) { var e = id && store()[id]; return e ? e.abc : abc; }
  function all() { var s = store(), out = {}; Object.keys(s).forEach(function (k) { out[k] = s[k].abc; }); return out; }

  // bar lengths (as scripts/clean-tunes.mjs checks them): the inner bars against the meter; first and last may be short
  function check(abc) {
    if (!global.ABCJS || !ABCJS.parseOnly) return null;
    var r; try { r = ABCJS.parseOnly(abc)[0]; } catch (e) { return { bad: [], warns: [String(e)] }; }
    if (!r) return { bad: [], warns: ["Nothing to read."] };
    var mt = r.getMeterFraction ? r.getMeterFraction() : { num: 4, den: 4 }, barLen = mt.num / mt.den, lens = [], cur = 0, tup = 1;
    (r.lines || []).forEach(function (line) { (line.staff || []).forEach(function (st) { (st.voices || []).forEach(function (v) { v.forEach(function (e) {
      if (e.el_type === "note") { if (e.startTriplet && e.tripletMultiplier) tup = e.tripletMultiplier; cur += (e.duration || 0) * tup; if (e.endTriplet) tup = 1; }
      else if (e.el_type === "bar") { if (cur > 0) lens.push(cur); cur = 0; }
    }); }); }); });
    if (cur > 0) lens.push(cur);
    var bad = [];
    for (var i = 1; i < lens.length - 1; i++) if (Math.abs(lens[i] - barLen) > 1e-6) bad.push(i + 1);
    return { bad: bad, bars: lens.length, warns: (r.warnings || []).map(function (w) { return String(w).replace(/<[^>]*>/g, ""); }).filter(function (w) { return !/Unknown directive: id/.test(w); }) };
  }

  function loadVim(cb) {
    if (global.VimTextarea) return cb();
    var s = document.querySelector('script[data-abc-vim]');
    if (!s) { s = document.createElement("script"); s.src = VIM_SRC; s.dataset.abcVim = "1"; document.head.appendChild(s); }
    s.addEventListener("load", cb);
  }

  var styled = false;
  function style() {
    if (styled) return; styled = true;
    var css = document.createElement("style");
    css.textContent =
      ".abced { margin: .6rem 0; }" +
      ".abced textarea { width: 100%; min-height: 12rem; font: .9rem/1.4 ui-monospace, 'SF Mono', Menlo, monospace; padding: .5rem; border: 1px solid #ced4da; border-radius: .3rem; }" +
      ".abced textarea.vim-normal { caret-color: transparent; }" +
      ".abced-row { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-top: .3rem; font-size: .85rem; }" +
      ".abced-row button { font-size: .85rem; }" +
      ".abced-vimline { font: .8rem ui-monospace, monospace; min-height: 1.2em; opacity: .75; }" +
      ".abced-msg { color: #6c757d; } .abced-msg.bad { color: #b02a37; } .abced-tag { color: #0d6efd; font-weight: 600; }";
    document.head.appendChild(css);
  }

  function mount(el, opts) {
    opts = opts || {}; style();
    el.classList.add("abced");
    el.innerHTML =
      '<textarea spellcheck="false" aria-label="ABC"></textarea>' +
      '<div class="abced-vimline" aria-live="polite"></div>' +
      '<div class="abced-row">' +
      '<button type="button" class="abced-apply" title="Draw it (Ctrl+Enter)">Apply</button>' +
      '<button type="button" class="abced-revert" title="Back to the tune as the site has it (drops this browser\'s edit)">Revert</button>' +
      '<label><input type="checkbox" class="abced-vim"> vim keys</label>' +
      '<span class="abced-tag" hidden>edited in this browser</span>' +
      '<span class="abced-msg" aria-live="polite"></span>' +
      '<span style="flex:1"></span>' +
      '<button type="button" class="abced-copy" title="This tune\'s ABC to the clipboard">Copy</button>' +
      '<button type="button" class="abced-dl" title="Every tune edited in this browser, in one .json for scripts/apply-abc-edits.mjs">Download edits (<span class="abced-n">0</span>)</button>' +
      "</div>";
    var ta = el.querySelector("textarea"), msg = el.querySelector(".abced-msg"), tag = el.querySelector(".abced-tag"),
        vimBox = el.querySelector(".abced-vim"), id = null, base = "", vim = null;
    function q(s) { return el.querySelector(s); }
    function count() { q(".abced-n").textContent = Object.keys(store()).length; }
    function say(t, bad) { msg.textContent = t || ""; msg.classList.toggle("bad", !!bad); }
    function report() {
      var c = check(ta.value);
      if (!c) { say(""); return; }
      if (c.warns.length) say(c.warns[0], true);
      else if (c.bad.length) say("Bar" + (c.bad.length > 1 ? "s " : " ") + c.bad.slice(0, 8).join(", ") + (c.bad.length > 8 ? "…" : "") + " not the meter's length", true);
      else say(c.bars + " bars, lengths right");
    }
    function apply() {
      var abc = ta.value, s = store();
      if (id) {
        if (abc === base) delete s[id]; else s[id] = { abc: abc, saved: new Date().toISOString() };
        keep(s);
      }
      tag.hidden = !(id && s[id]); count(); report();
      if (opts.onApply) opts.onApply(abc, id);
    }
    function set(newId, abc) {
      id = newId || null; base = abc || "";
      ta.value = edited(id, base);
      tag.hidden = ta.value === base; count(); report();
    }
    function setVim(on) {
      if (vim) { vim.off(); vim = null; }
      try { localStorage.setItem(VIM, on ? "1" : "0"); } catch (e) {}
      if (on) loadVim(function () { if (vimBox.checked && !vim) vim = VimTextarea.attach(ta, { status: q(".abced-vimline") }); });
      else q(".abced-vimline").textContent = "";
    }
    var timer = null;
    ta.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(report, 400); });
    // keys typed here stay here (the page's shortcuts, Space to play, don't fire); Ctrl/Cmd+Enter applies
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); apply(); }
      e.stopPropagation();
    });
    ta.addEventListener("keyup", function (e) { e.stopPropagation(); });
    q(".abced-apply").addEventListener("click", apply);
    q(".abced-revert").addEventListener("click", function () {
      if (ta.value !== base && !confirm("Drop the edit and go back to the site's version?")) return;
      ta.value = base; apply();
    });
    q(".abced-copy").addEventListener("click", function () {
      if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(function () { say("Copied."); }, function () { say("Could not copy.", true); });
    });
    q(".abced-dl").addEventListener("click", function () {
      var edits = all();
      if (!Object.keys(edits).length) { say("No edits yet: change a tune and Apply."); return; }
      var url = URL.createObjectURL(new Blob([JSON.stringify({ app: "abc-edits", version: 1, saved: new Date().toISOString(), edits: edits }, null, 1) + "\n"], { type: "application/json" }));
      var a = document.createElement("a"); a.href = url; a.download = "abc-edits-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
    var on = true; try { on = localStorage.getItem(VIM) !== "0"; } catch (e) {}
    vimBox.checked = on; setVim(on);
    vimBox.addEventListener("change", function () { setVim(vimBox.checked); });
    if (opts.id || opts.abc) set(opts.id, opts.abc);
    count();
    return { set: set, value: function () { return ta.value; }, textarea: ta, apply: apply };
  }

  global.AbcEditor = { mount: mount, edited: edited, all: all, check: check };
})(window);
