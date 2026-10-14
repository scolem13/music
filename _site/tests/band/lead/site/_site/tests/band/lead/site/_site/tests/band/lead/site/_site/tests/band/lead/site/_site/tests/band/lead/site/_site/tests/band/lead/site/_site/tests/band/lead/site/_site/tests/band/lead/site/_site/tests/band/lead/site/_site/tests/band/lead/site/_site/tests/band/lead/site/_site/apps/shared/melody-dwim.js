// MelodyDwim: pick some bars of a melody and ask "what did I mean?". The panel lists the other ways the same playing could have been written for those
// bars (ChordEntry.alternatives), best first, each with a small score of it to look at, and a button to use it.
// Plain script, one global; needs ChordEntry. A page gives it what it knows:
//
//   var d = MelodyDwim.attach({
//     host,                       // the element to build the panel in
//     log(),                      // the take's log if the melody on the page is still that take's, else null
//     none(),                     // (optional) what to say when there is no log
//     bars(),                     // how many bars the page shows
//     toLog(a, b),                // (optional) the page's bars a..b (0-based) -> { from, to } in the log's bars; default the same
//     apply(variant, from, to),   // put the variant's bars in place; returns a sentence to say
//     draw(el, abc),              // draw an ABC string in el
//     options()                   // (optional) { beam, tie } to write the previews with
//     mmOffset()                  // (optional) how many measures the notation has in front of the page's bar 1 (a pickup bar of the melody's own)
//   });
//   d.pick(classes, extend)       // a note was clicked in the page's notation (abcjs's class string); extend: shift was held
//   d.markScore(el)               // colour the picked bars in the page's notation
(function (global){
  "use strict";
  var CSS = "" +
    ".md-box{margin-top:.9rem;padding:.8rem .9rem;border:1px dashed var(--site-border,#d6cdbf);border-radius:10px;background:var(--site-surface-2,#f7f3ec)}" +
    ".md-row{display:flex;gap:.6rem 1rem;flex-wrap:wrap;align-items:flex-end}" +
    ".md-row label{display:flex;flex-direction:column;gap:.25rem;font:600 .68rem/1 var(--font-mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--site-ink-2,#5c5246)}" +
    ".md-row input{height:2.2rem;width:4.6rem;padding:0 .5rem;border:1px solid var(--site-border,#e0d8ce);border-radius:7px;font:inherit;font-size:.92rem;background:var(--site-surface,#fff);color:inherit}" +
    ".md-btn{height:2.2rem;padding:0 .9rem;border:1px solid var(--site-accent-dk,#2b9c90);border-radius:7px;background:var(--site-surface,#fff);color:var(--site-accent-text,#0a4f47);font:inherit;font-size:.9rem;cursor:pointer}" +
    ".md-btn:hover{background:var(--site-accent-bg,rgba(63,194,180,.12))}.md-btn.is-main{background:var(--site-accent-dk,#2b9c90);color:#fff}" +
    ".md-say{margin:.55rem 0 0;font-size:.86rem;color:var(--site-ink-2,#5c5246);max-width:70ch}" +
    ".md-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(19rem,1fr));gap:.7rem;margin-top:.7rem}" +
    ".md-card{background:var(--site-surface,#fff);border:1px solid var(--site-border,#e0d8ce);border-radius:9px;padding:.6rem .7rem;display:flex;flex-direction:column;gap:.35rem}" +
    ".md-card.is-best{border-color:var(--site-accent-dk,#2b9c90);box-shadow:0 0 0 1px var(--site-accent-dk,#2b9c90)}" +
    ".md-card.is-now{opacity:.85}" +
    ".md-head{font-weight:600;font-size:.9rem}.md-tag{font:700 .62rem/1 var(--font-mono,monospace);letter-spacing:.08em;text-transform:uppercase;color:#fff;background:var(--site-accent-dk,#2b9c90);border-radius:4px;padding:.15rem .35rem;margin-left:.4rem;vertical-align:.1em}" +
    ".md-why{margin:0;font-size:.8rem;color:var(--site-ink-2,#5c5246)}.md-meta{margin:0;font:.7rem var(--font-mono,monospace);color:var(--site-ink-2,#8a7f70)}" +
    ".md-prev{overflow-x:auto;background:#fff;border-radius:6px}" +
    ".md-selected,.md-selected *{fill:#d9822b !important;stroke:#d9822b !important}";
  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function attach(o){
    if (!document.getElementById("md-style")){ var st = el("style"); st.id = "md-style"; st.textContent = CSS; document.head.appendChild(st); }
    var box = el("div", "md-box"), row = el("div", "md-row"), sel = { a: 0, b: 0 };
    var from = el("input"), to = el("input"), go = el("button", "md-btn is-main", "What did I mean?"), say = el("p", "md-say"), list = el("div", "md-list");
    from.type = to.type = "number"; from.min = to.min = "1"; from.setAttribute("aria-label", "First bar"); to.setAttribute("aria-label", "Last bar");
    go.type = "button"; go.title = "Tries the other ways this playing could be written, for these bars, and shows each.";
    var l1 = el("label", null, "From bar"), l2 = el("label", null, "To bar"); l1.appendChild(from); l2.appendChild(to);
    row.appendChild(l1); row.appendChild(l2); row.appendChild(go);
    box.appendChild(row); box.appendChild(say); box.appendChild(list); o.host.appendChild(box);
    say.textContent = "Pick bars (click a note in the notation, shift-click for a range, or type them) and ask what you meant. The notes are re-read from how they were played, so this only works on the take you have just made.";
    function nb(){ return Math.max(1, (o.bars && o.bars()) || 1); }
    function clamp(x){ return Math.max(0, Math.min(nb() - 1, x | 0)); }
    var ready = false;
    function mark(){ if (ready && o.mark) o.mark(sel.a, sel.b); }
    function setRange(a, b){ a = clamp(a); b = Math.max(a, clamp(b)); sel.a = a; sel.b = b; from.value = a + 1; to.value = b + 1; list.innerHTML = ""; mark(); }
    from.addEventListener("change", function (){ setRange((parseInt(from.value, 10) || 1) - 1, Math.max((parseInt(from.value, 10) || 1), parseInt(to.value, 10) || 1) - 1); });
    to.addEventListener("change", function (){ setRange((parseInt(from.value, 10) || 1) - 1, (parseInt(to.value, 10) || 1) - 1); });
    setRange(0, 0);
    function card(cls, title, tag, why, meta, abc, use){
      var c = el("div", "md-card " + cls), h = el("div", "md-head", title);
      if (tag){ h.appendChild(el("span", "md-tag", tag)); }
      c.appendChild(h); if (why) c.appendChild(el("p", "md-why", why));
      var pv = el("div", "md-prev"); c.appendChild(pv); if (meta) c.appendChild(el("p", "md-meta", meta));
      if (use){ var b = el("button", "md-btn", "Use this"); b.type = "button"; b.addEventListener("click", use); c.appendChild(b); }
      list.appendChild(c); if (o.draw && abc) { try { o.draw(pv, abc); } catch (e) { pv.textContent = "(could not draw)"; } }
    }
    function run(){
      list.innerHTML = ""; var log = o.log && o.log();
      if (!log){ say.textContent = o.none ? o.none() : "There is no take to re-read here: record one first."; return; }
      var lr = o.toLog ? o.toLog(sel.a, sel.b) : { from: sel.a, to: sel.b }, res;
      try { res = global.ChordEntry.alternatives(log, lr.from, lr.to, o.options ? o.options() : {}); }
      catch (e){ say.textContent = "The take could not be read again: " + e.message; return; }
      if (!res.variants.length){ say.textContent = "Nothing else this playing could mean here under these settings: every reading writes the same notes."; return; }
      say.textContent = res.variants.length + " other way" + (res.variants.length === 1 ? "" : "s") + " to write bar" + (sel.a === sel.b ? " " + (sel.a + 1) : "s " + (sel.a + 1) + "–" + (sel.b + 1)) + ", the best first. “Moved” is how far the notes had to be shifted to fit; “left out” counts played notes not written.";
      card("is-now", "As first written", null, null, "cost " + Math.round(res.current.score * 10) / 10 + (res.current.lost ? " · " + res.current.lost + " left out" : ""), res.current.abc, null);
      res.variants.forEach(function (v){
        card(v.suggested ? "is-best" : "", v.label, v.suggested ? "suggested" : null, v.why, "cost " + Math.round(v.score * 10) / 10 + (v.lost ? " · " + v.lost + " left out" : " · none left out"), v.abc, function (){
          var msg = o.apply ? o.apply(v, lr.from, lr.to) : ""; list.innerHTML = ""; setRange(sel.a, sel.b); say.textContent = msg || "Done.";
        });
      });
    }
    go.addEventListener("click", run);
    ready = true;
    return {
      setRange: setRange, range: function (){ return { from: sel.a, to: sel.b }; }, run: run,
      pick: function (classes, extend){ var m = /abcjs-mm(\d+)/.exec(classes || ""); if (!m) return; var i = +m[1] - (o.mmOffset ? o.mmOffset() : 0); if (i < 0) i = 0; if (extend) setRange(Math.min(sel.a, i), Math.max(sel.b, i)); else setRange(i, i); },
      markScore: function (scoreEl){
        if (!scoreEl) return; Array.prototype.forEach.call(scoreEl.querySelectorAll(".md-selected"), function (e){ e.classList.remove("md-selected"); });
        var off = o.mmOffset ? o.mmOffset() : 0; for (var i = sel.a; i <= sel.b; i++) Array.prototype.forEach.call(scoreEl.querySelectorAll(".abcjs-mm" + (i + off)), function (e){ e.classList.add("md-selected"); });
      },
      say: function (t){ say.textContent = t; }
    };
  }
  global.MelodyDwim = { attach: attach };
})(typeof window !== "undefined" ? window : globalThis);
