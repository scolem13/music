// works.js: the pieces in works-data.js (window.WORKS) and the "Recordings & resources" panel shown with them.
//   <script src="/apps/shared/works/works-data.js?v=3"></script>
//   <script src="/apps/shared/works/works.js?v=5"></script>
//   Works.mount(host, "tune" | "theme" | "analysed", id)   draws the panel for whatever work holds that item (hides host if none)
//   Works.of(kind, id) -> work or null · Works.get(workId) · Works.ids() · Works.href(kind, ref) · Works.source(recording)
// A recording is yt (video id or URL), r2 (a path in the bucket, read against WORKS_CONFIG.r2Base) or url (audio/video file, or
// any page, which is then only linked). start / end are seconds or "m:ss". Only one recording plays at a time on a page.
// Set the bucket once, before this script: window.WORKS_CONFIG = { r2Base: "https://media.example.com" }.
(function (global) {
  "use strict";
  var CFG = global.WORKS_CONFIG = Object.assign({ r2Base: "", directory: "/practice/tune-directory.html" }, global.WORKS_CONFIG || {});
  var W = global.WORKS || {}, index = null, current = null;
  var KIND = { tune: "Tune Library", theme: "Classical Themes", analysed: "Analysed score" };
  var LINK = { article: "Article", video: "Video", lesson: "Lesson", sheet: "Sheet music", other: "Link" };

  function build() {
    index = {};
    Object.keys(W).forEach(function (wid) {
      var inn = W[wid].in || {};
      Object.keys(inn).forEach(function (kind) { (inn[kind] || []).forEach(function (x) { index[kind + ":" + (x && x.piece || x)] = wid; }); });
    });
  }
  function of(kind, id) { if (!index) build(); var wid = index[kind + ":" + id]; return wid ? Object.assign({ id: wid }, W[wid]) : null; }
  function get(wid) { return W[wid] ? Object.assign({ id: wid }, W[wid]) : null; }

  function secs(v) {
    if (v == null || v === "") return 0;
    if (typeof v === "number") return v;
    return String(v).split(":").reduce(function (a, b) { return a * 60 + (parseFloat(b) || 0); }, 0);
  }
  function ytId(s) {
    s = String(s || "");
    var m = /(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/.exec(s);
    return m ? m[1] : /^[\w-]{11}$/.test(s) ? s : null;
  }
  // { kind: "yt", id, start, end } | { kind: "audio", url, start, end } | { kind: "link", url } | { kind: "missing", why }
  function source(r) {
    var start = secs(r.start), end = secs(r.end);
    var yt = r.yt || (r.url && /youtu\.?be/.test(r.url) ? r.url : null);
    if (yt) {
      var id = ytId(yt), t = /[?&]t=(\d+)/.exec(yt);
      return id ? { kind: "yt", id: id, start: start || (t ? +t[1] : 0), end: end } : { kind: "missing", why: "not a YouTube link" };
    }
    if (r.r2) {
      if (!CFG.r2Base) return { kind: "missing", why: "the recordings bucket is not set up yet" };
      return { kind: "audio", url: CFG.r2Base.replace(/\/+$/, "") + "/" + String(r.r2).replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/"), start: start, end: end };
    }
    if (r.url) return /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm|mp4)(?:[?#]|$)/i.test(r.url) ? { kind: "audio", url: r.url, start: start, end: end } : { kind: "link", url: r.url };
    return { kind: "missing", why: "no source given" };
  }
  function href(kind, x) {
    if (kind === "tune") return "/practice/tunes.html?tune=" + encodeURIComponent(x);
    if (kind === "theme") return "/tools/classical-themes.html?theme=" + encodeURIComponent(x);
    if (kind === "analysed") return "/" + x.page.replace(/\.(qmd|html)$/, "") + ".html?piece=" + encodeURIComponent(x.piece);
    return "#";
  }
  function openUrl(s) {
    if (s.kind === "yt") return "https://www.youtube.com/watch?v=" + s.id + (s.start ? "&t=" + Math.floor(s.start) + "s" : "");
    return s.url || null;
  }
  function clock(t) { t = Math.floor(t); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function stop() {
    if (!current) return;
    var c = current; current = null;
    c.box.innerHTML = ""; c.box.hidden = true; c.btn.textContent = "▶"; c.btn.setAttribute("aria-label", "Play");
  }
  function play(btn, box, s) {
    if (current && current.btn === btn) { stop(); return; }
    stop();
    current = { btn: btn, box: box };
    btn.textContent = "■"; btn.setAttribute("aria-label", "Stop");
    box.hidden = false;
    if (s.kind === "yt") {
      var f = el("iframe", "wk-yt");
      f.src = "https://www.youtube-nocookie.com/embed/" + s.id + "?autoplay=1&rel=0" + (s.start ? "&start=" + Math.floor(s.start) : "") + (s.end ? "&end=" + Math.ceil(s.end) : "");
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; f.allowFullscreen = true; f.title = "Recording";
      box.appendChild(f);
    } else {
      var a = el("audio", "wk-audio"); a.controls = true; a.preload = "metadata"; a.src = s.url;
      if (s.start) a.addEventListener("loadedmetadata", function () { a.currentTime = s.start; }, { once: true });
      if (s.end) a.addEventListener("timeupdate", function () { if (a.currentTime >= s.end) a.pause(); });
      a.addEventListener("error", function () { box.appendChild(el("div", "wk-err", "This recording could not be loaded.")); });
      box.appendChild(a);
      a.play().catch(function () {});
    }
  }

  // a draft recording (r.draft) shows only in the teacher's browser (RecSync.teacher: opened once with ?teacher=1)
  function isVisible(r) {
    if (!r.draft) return true;
    if (global.RecSync) return global.RecSync.teacher();
    try { return localStorage.getItem("site-teacher") === "1"; } catch (e) { return false; }
  }
  function tuneOf(w) { return w && w.in && w.in.tune && w.in.tune[0] || null; }
  // Timestamp Notes for a recording: a file at its start, with its timing map or its marks, and the work's tune for notation
  function tsnUrl(r, w) {
    var s = source(r), t = tuneOf(w), title = r.title || [w && w.title, [r.performer, r.year].filter(Boolean).join(", ")].filter(Boolean).join(" — ");
    if (s.kind === "audio") return "/tools/timestamp-notes.html?media=" + encodeURIComponent(s.url) + "&at=" + Math.floor(s.start || 0) +
      "&title=" + encodeURIComponent(title) + (r.marks ? "&marks=" + encodeURIComponent(JSON.stringify(r.marks)) : "") +
      (r.timing ? "&timing=" + encodeURIComponent(r.timing) : "") + (t ? "&tune=" + encodeURIComponent(t) : "");
    if (s.kind === "yt") return "/tools/timestamp-notes.html?v=" + encodeURIComponent("https://www.youtube.com/watch?v=" + s.id) + (t ? "&tune=" + encodeURIComponent(t) : "");
    return null;
  }
  function recRow(r, w) {
    var s = source(r), li = el("li", "wk-rec");
    var line = el("div", "wk-line");
    if (s.kind === "yt" || s.kind === "audio") {
      var b = el("button", "wk-play", "▶"); b.type = "button"; b.setAttribute("aria-label", "Play"); line.appendChild(b);
      var box = el("div", "wk-player"); box.hidden = true;
      b.addEventListener("click", function () { play(b, box, s); });
      li.__box = box;
    } else line.appendChild(el("span", "wk-play wk-noplay", s.kind === "link" ? "↗" : "–"));
    var who = [r.performer, r.year].filter(Boolean).join(", ") || r.title || (s.kind === "yt" ? "YouTube recording" : "Recording");
    line.appendChild(el("span", "wk-who", who));
    if (r.draft) line.appendChild(el("span", "rs-draft", "draft: hidden from students"));
    if (r.timing) line.appendChild(el("span", "wk-meta", "the score plays it"));
    var bits = [];
    if (s.start || s.end) bits.push((s.start ? "from " + clock(s.start) : "") + (s.end ? (s.start ? " " : "") + "to " + clock(s.end) : ""));
    bits.push(s.kind === "yt" ? "YouTube" : r.r2 ? "site recording" : s.kind === "audio" ? "audio" : "");
    if (r.who === "teacher") bits.push("for teachers");
    var meta = el("span", "wk-meta", bits.filter(Boolean).join(" · ")); line.appendChild(meta);
    if (r.note) line.appendChild(el("span", "wk-note", r.note));
    if (s.kind === "missing") line.appendChild(el("span", "wk-err", "(" + s.why + ")"));
    var u = openUrl(s);
    if (u) { var a = el("a", "wk-open", s.kind === "link" ? "open ↗" : "↗"); a.href = u; a.target = "_blank"; a.rel = "noopener"; a.title = "Open in a new tab"; line.appendChild(a); }
    var tu = tsnUrl(r, w);
    if (tu) {                                                         // bars marked or not, and Timestamp Notes for it
      line.appendChild(el("span", "wk-bars " + (r.timing ? "wk-bars-on" : ""), r.timing ? "bars marked" : "bars not marked"));
      var tn = el("a", "wk-open", "⏱ Timestamp Notes"); tn.href = tu;
      tn.title = r.timing ? "Open it in Timestamp Notes with its bars" + (tuneOf(w) ? " and the notation" : "") : "Mark sections and bars on this recording in Timestamp Notes";
      line.appendChild(tn);
    }
    li.appendChild(line);
    if (li.__box) li.appendChild(li.__box);
    return li;
  }

  // here: { kind, id } of the page showing it (left out of "Also in"); none (the Tune Directory): the piece's title is the heading
  function panel(w, here) {
    var p = el("section", "wk-panel");
    var head = el("div", "wk-head");
    head.appendChild(el("span", "wk-title", here ? "Recordings & resources" : w.title));
    head.appendChild(el("span", "wk-work", here ? w.title + (w.composer ? " · " + w.composer : "") : w.composer || ""));
    p.appendChild(head);
    var recs = (w.recordings || []).filter(isVisible);
    if (recs.length) { var ol = el("ul", "wk-recs"); recs.forEach(function (r) { ol.appendChild(recRow(r, w)); }); p.appendChild(ol); }
    else p.appendChild(el("div", "wk-none", "No recordings yet."));
    var links = w.links || [];
    if (links.length) {
      var ul = el("ul", "wk-links");
      links.forEach(function (l) {
        var li = el("li"); li.appendChild(el("span", "wk-type", LINK[l.type] || "Link"));
        var a = el("a", null, l.title || l.url); a.href = l.url; if (/^https?:/.test(l.url)) { a.target = "_blank"; a.rel = "noopener"; }
        li.appendChild(a);
        if (l.note) li.appendChild(el("span", "wk-note", l.note));
        if (l.who === "teacher") li.appendChild(el("span", "wk-meta", "for teachers"));
        ul.appendChild(li);
      });
      p.appendChild(ul);
    }
    var also = el("div", "wk-also"), any = false;
    also.appendChild(el("span", "wk-type", here ? "Also in" : "In"));
    Object.keys(w.in || {}).forEach(function (kind) {
      (w.in[kind] || []).forEach(function (x) {
        var id = x && x.piece || x;
        if (here && here.kind === kind && String(here.id) === String(id)) return;
        var a = el("a", null, KIND[kind] + " · " + (kind === "theme" ? "No. " + String(id).replace(/^0+/, "") : id)); a.href = href(kind, x);
        also.appendChild(a); any = true;
      });
    });
    if (any) p.appendChild(also);
    if (here) { var dir = el("a", "wk-dir", "Tune Directory →"); dir.href = CFG.directory + "#" + w.id; p.appendChild(dir); }
    return p;
  }

  // The MLT / JRI book recordings linked to a tune (apps/shared/mlt/recordings.js, rec.tune), when that file is on the page.
  function mltPart(id) {
    var R = global.MLTRecordings, list = R && id ? R.forTune(id) : [];
    if (!list.length) return null;
    var p = el("div", "wk-panel wk-mlt");
    var h = el("div", "wk-head"); h.appendChild(el("span", "wk-title", "MLT / JRI recordings (" + list.length + ")"));
    var g = el("a", "wk-dir", "▦ Chord grid by ear →"); g.href = "/practice/ear-grid.html?tune=" + encodeURIComponent(id); h.appendChild(g);
    p.appendChild(h);
    var ul = el("ul", "wk-recs"); p.appendChild(ul);
    list.forEach(function (r) {
      var col = R.collections.filter(function (c) { return c.id === r.col; })[0] || {};
      var li = el("li", "wk-rec"), line = el("div", "wk-line"), box = el("div", "wk-player"); box.hidden = true;
      var url = R.url(r), b = el("button", "wk-play" + (url ? "" : " wk-noplay"), "▶"); b.type = "button";
      b.title = url ? "Play" : "The recordings are not online yet";
      if (url) b.addEventListener("click", function () { play(b, box, { kind: "audio", url: url }); });
      line.appendChild(b);
      line.appendChild(el("span", null, r.title));
      line.appendChild(el("span", "wk-meta", [r.kind && R.KINDS[r.kind], r.key && "in " + r.key, (col.title || r.col).replace(/^Jump Right In: /, "JRI ")].filter(Boolean).join(" · ")));
      line.appendChild(el("span", "wk-bars " + (r.timing ? "wk-bars-on" : ""), r.timing ? "bars marked" : "bars not marked"));
      var tl = el("a", "wk-meta", "⏱ Timestamp Notes"); tl.href = "/tools/timestamp-notes.html?rec=" + encodeURIComponent(r.id) + "&tune=" + encodeURIComponent(id); line.appendChild(tl);
      var gl = el("a", "wk-meta", "▦ grid"); gl.href = "/practice/ear-grid.html?rec=" + encodeURIComponent(r.id); line.appendChild(gl);
      li.appendChild(line); li.appendChild(box); ul.appendChild(li);
    });
    return p;
  }

  function mount(host, kind, id) {
    if (!host) return null;
    if (current && host.contains(current.btn)) stop();
    host.innerHTML = "";
    var w = id == null ? null : of(kind, id);
    if (w) host.appendChild(panel(w, { kind: kind, id: id }));
    var m = kind === "tune" ? mltPart(id) : null;
    if (m) host.appendChild(m);
    host.hidden = !w && !m;
    return w;
  }

  var css = el("style");
  css.textContent =
    ".wk-panel{border:1px solid var(--bs-border-color,#dee2e6);border-radius:6px;padding:.5rem .75rem;margin:.75rem 0;font-size:.9rem}" +
    ".wk-head{display:flex;flex-wrap:wrap;gap:.25rem .75rem;align-items:baseline;margin-bottom:.35rem}" +
    ".wk-title{font-weight:600}.wk-work{opacity:.7;font-size:.85rem}" +
    ".wk-recs,.wk-links{list-style:none;padding:0;margin:0 0 .35rem}" +
    ".wk-rec{padding:.15rem 0}.wk-line{display:flex;flex-wrap:wrap;align-items:baseline;gap:.2rem .55rem}" +
    ".wk-play{border:1px solid var(--bs-border-color,#ced4da);background:none;color:inherit;border-radius:4px;width:1.9rem;line-height:1.5;padding:0;text-align:center;cursor:pointer}" +
    ".wk-play:hover{border-color:var(--bs-primary,#0d6efd)}.wk-noplay{cursor:default;opacity:.6}" +
    ".wk-meta,.wk-type{opacity:.65;font-size:.8rem}.wk-type{margin-right:.4rem}.wk-note{font-style:italic;opacity:.85}" +
    ".wk-bars{font-size:.75rem;padding:0 .4em;border-radius:3px;background:var(--bs-secondary-bg,#eee);opacity:.8}.wk-bars-on{background:#d7efd9;color:#1d5426;opacity:1}" +
    ".wk-err{color:var(--bs-danger,#b02a37);font-size:.8rem}.wk-open{text-decoration:none}" +
    ".wk-player{margin:.35rem 0 .2rem 2.4rem;max-width:560px}.wk-yt{width:100%;aspect-ratio:16/9;border:0;border-radius:4px}.wk-audio{width:100%}" +
    ".wk-links li{padding:.1rem 0}.wk-links .wk-note,.wk-links .wk-meta{margin-left:.5rem}" +
    ".wk-also{display:flex;flex-wrap:wrap;gap:.2rem .8rem;align-items:baseline;margin:.2rem 0}" +
    ".wk-none{opacity:.65;margin-bottom:.3rem}.wk-dir{font-size:.8rem;display:inline-block;margin-top:.15rem}" +
    "@media (max-width:600px){.wk-player{margin-left:0}}";
  (document.head || document.documentElement).appendChild(css);

  global.Works = { of: of, get: get, ids: function () { return Object.keys(W); }, all: function () { return W; }, source: source, href: href, kindLabel: KIND,
    mount: mount, panel: panel, mltPart: mltPart, tsnUrl: tsnUrl, stop: stop, config: CFG, reindex: function () { W = global.WORKS || {}; build(); } };
})(window);
