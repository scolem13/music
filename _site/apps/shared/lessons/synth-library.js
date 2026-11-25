// synth-library.js — the student patch workflow under the two-synth widget (lessons/synth-compare.qmd).
// Students watch a patch-recreation video, build the sound on one of the page's panels, and save it as a JSON file the teacher
// collects; the teacher checks the files with `node scripts/synth-patches/add.mjs <files...>` and they join the Library.
//
// Mounts after each SynthCompare widget (<div class="scmp">), using only its public API: SynthCompare.PROFILES / full(),
// widget.st[id], widget.set(id, key, v, quiet), widget.translate(from, animate), widget.stop(). New synth ids in PROFILES are
// picked up by themselves.
//
// PATCH FILE (version 1):
//   { kind: "synth-patch", version: 1, synth: "<PROFILES id>", state: {<key in PROFILES[synth].def>: value},
//     song, artist, year, genre, source: { url, channel, title, at }, by, notes, made: ISO date,
//     checked: true (teacher only: the settings were compared with the record), origin: "manual" (a manual's own recipe),
//     whatif: [ids] (only when "What if…" features were on: not the real instrument; PROFILES[synth].whatif) }
// Library: apps/shared/data/synth-patches/index.json = { patches: [{ file, synth, song, artist, year, genre, checked, origin }] },
// one patch file each beside it. Assignments: assignments.json there = { videos: [{ synth, url, channel, title, songs:
// [{ song, artist, at }] }] }, each confirmed to exist (title and channel from YouTube's oEmbed).
//
// SynthLibrary.validate(obj, PROFILES) -> list of problems ([] = fine); shared with add.mjs. Works under node.
(function (global) {
  "use strict";
  var DATA = "/apps/shared/data/synth-patches/";
  var HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com", "vimeo.com",
    "vintageking.com", "cdn.inmusicbrands.com", "sequential.com", "www.moogmusic.com", "moogmusic.com"];

  function host(u) { try { return new URL(u).hostname.toLowerCase(); } catch (e) { return null; } }
  function validate(o, PROFILES) {
    var err = [];
    if (!o || typeof o !== "object") return ["not a JSON object"];
    if (o.kind !== "synth-patch") err.push('kind must be "synth-patch"');
    if (o.version !== 1) err.push("version must be 1");
    var P = PROFILES && PROFILES[o.synth];
    if (!P) err.push("unknown synth: " + o.synth);
    if (!o.state || typeof o.state !== "object") err.push("no state");
    else if (P) for (var k in o.state) {
      if (!(k in P.def)) err.push("setting " + k + " is not on the " + P.name);
      else if (typeof o.state[k] !== typeof P.def[k]) err.push("setting " + k + " should be a " + typeof P.def[k]);
    }
    if (!o.song || typeof o.song !== "string") err.push("no song");
    var s = o.source || {}, h = host(s.url);
    if (!h) err.push("no source URL");
    else if (HOSTS.indexOf(h) < 0) err.push("source URL is not YouTube or a known site: " + h);
    if (o.year != null && o.year !== "" && !/^\d{4}$/.test(String(o.year))) err.push("year should be four digits");
    if (o.whatif != null) { var WI = (P && P.whatif || []).map(function (w) { return w.id; });
      if (!Array.isArray(o.whatif)) err.push("whatif should be a list"); else o.whatif.forEach(function (m) { if (WI.indexOf(m) < 0) err.push("no what-if " + m + " on the " + (P ? P.name : o.synth)); }); }
    return err;
  }
  function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40); }

  var SL = { validate: validate, HOSTS: HOSTS, slug: slug, libs: [] };
  if (typeof module !== "undefined" && module.exports) module.exports = SL;
  if (typeof document === "undefined") { global.SynthLibrary = SL; return; }

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function getJSON(f) { return fetch(DATA + f).then(function (r) { if (!r.ok) throw new Error(f + " " + r.status); return r.json(); }); }

  SL.mount = function (W, after) {
    var SC = global.SynthCompare, PR = SC.PROFILES, L = { W: W };
    var box = el("div", "slib"); after.parentNode.insertBefore(box, after.nextSibling);
    function synths() { return Object.keys(PR).filter(function (id) { return W.st && W.st[id]; }); }
    function name(id) { return PR[id] ? PR[id].name : id; }
    var msg = el("p", "slib-msg"); msg.setAttribute("role", "status");
    function say(t, bad) { msg.textContent = t; msg.classList.toggle("slib-bad", !!bad); }

    // ---- load a patch into its panel and translate from it ----
    L.load = function (o) {
      var e = validate(o, PR); if (e.length) { say("That patch cannot be opened: " + e.join("; ") + ".", true); return false; }
      if (!W.st[o.synth]) { say("This page has no " + name(o.synth) + " panel.", true); return false; }
      if (W.stop) W.stop();
      var full = SC.full(o.synth, o.state);
      W.st[o.synth] = full;
      for (var k in full) W.set(o.synth, k, full[k], true);
      if (W.setMods) W.setMods(o.synth, o.whatif || []);
      W.translate(o.synth, true);
      say("Loaded " + o.song + (o.artist ? " (" + o.artist + ")" : "") + " on the " + name(o.synth) + ".");
      L.loaded = o; return true;
    };
    L.openText = function (t) { var o; try { o = JSON.parse(t); } catch (e) { say("That file is not JSON.", true); return false; } return L.load(o); };

    // ---- Save this patch ----
    var save = el("details", "slib-part slib-save"); save.appendChild(el("summary", null, "Save this patch"));
    save.appendChild(el("p", "slib-hint", "Build the sound on one panel, fill in where it came from, and download the file. Hand it to your teacher, who checks it and adds it to the Library."));
    var f = el("form", "slib-form"), F = {};
    function field(key, label, type, opts) {
      var lab = el("label", "slib-f"), inp;
      lab.appendChild(el("span", null, label));
      if (type === "select") { inp = el("select"); }
      else if (type === "area") { inp = el("textarea"); inp.rows = 2; }
      else { inp = el("input"); inp.type = type || "text"; }
      inp.name = key; if (opts) for (var k in opts) inp[k] = opts[k];
      lab.appendChild(inp); f.appendChild(lab); F[key] = inp; return inp;
    }
    field("song", "Song", "text", { required: true }); field("artist", "Artist"); field("year", "Year", "text", { inputMode: "numeric", placeholder: "1979" });
    field("genre", "Genre"); var sel = field("synth", "Which synth", "select");
    function fillSynths() { var v = sel.value; sel.innerHTML = ""; synths().forEach(function (id) { var o = el("option", null, name(id)); o.value = id; sel.appendChild(o); }); sel.value = v || W.from; if (!sel.value) sel.value = W.from; }
    fillSynths();
    field("url", "Video URL", "url", { required: true, placeholder: "https://www.youtube.com/watch?v=…" });
    field("channel", "Channel"); field("title", "Video title"); field("at", "Time in the video", "text", { placeholder: "1:04" });
    field("by", "Your name (optional)"); field("notes", "Notes (what you could not copy, what you guessed)", "area");
    var bSave = el("button", "btn btn-sm btn-primary", "Download the patch file"); bSave.type = "submit"; f.appendChild(bSave);
    save.appendChild(f); box.appendChild(save);
    L.patch = function () {
      var syn = sel.value || W.from, st = {}, d = PR[syn].def;
      for (var k in d) st[k] = W.st[syn][k];
      return { kind: "synth-patch", version: 1, synth: syn, state: st, song: F.song.value.trim(), artist: F.artist.value.trim(),
        year: F.year.value.trim(), genre: F.genre.value.trim(),
        source: { url: F.url.value.trim(), channel: F.channel.value.trim(), title: F.title.value.trim(), at: F.at.value.trim() },
        by: F.by.value.trim(), notes: F.notes.value.trim(), made: new Date().toISOString().slice(0, 10) };
    };
    var patch0 = L.patch;   // what-if mods are kept apart from the real instrument's settings
    L.patch = function () { var o = patch0(), m = W.whatif ? W.whatif(o.synth) : []; if (m.length) o.whatif = m; return o; };
    f.addEventListener("submit", function (ev) {
      ev.preventDefault(); var o = L.patch(), e = validate(o, PR);
      if (e.length) { say("Not saved: " + e.join("; ") + ".", true); return; }
      var a = el("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(o, null, 2)], { type: "application/json" }));
      a.download = [o.synth, slug(o.artist), slug(o.song), slug(o.by)].filter(Boolean).join("-") + ".json";
      document.body.appendChild(a); a.click(); a.remove(); L.saved = o;
      say("Saved " + a.download + ".");
    });
    L.prefill = function (v, song) {
      save.open = true; fillSynths(); sel.value = v.synth;
      F.song.value = song.song || ""; F.artist.value = song.artist || ""; F.url.value = v.url; F.channel.value = v.channel || "";
      F.title.value = v.title || ""; F.at.value = song.at || ""; F.year.value = song.year || ""; F.genre.value = song.genre || "";
      save.scrollIntoView({ behavior: "smooth", block: "nearest" }); F.song.focus({ preventScroll: true });
    };

    // ---- Open a patch file ----
    var open = el("div", "slib-part slib-open"), lab = el("label", "slib-f slib-file");
    lab.appendChild(el("span", null, "Open a patch file")); var fin = el("input"); fin.type = "file"; fin.accept = ".json,application/json";
    lab.appendChild(fin); open.appendChild(lab); box.appendChild(open); box.appendChild(msg);
    fin.addEventListener("change", function () { var file = fin.files && fin.files[0]; if (!file) return; var r = new FileReader(); r.onload = function () { L.openText(String(r.result)); fin.value = ""; }; r.readAsText(file); });

    // ---- Library ----
    var lib = el("details", "slib-part slib-lib"); lib.appendChild(el("summary", null, "Library"));
    var filt = el("div", "slib-filt"), fSyn = el("select"), fArt = el("select"), fGen = el("select"), fTxt = el("input");
    fTxt.type = "search"; fTxt.placeholder = "song or artist"; [fSyn, fArt, fGen, fTxt].forEach(function (x) { filt.appendChild(x); });
    fSyn.setAttribute("aria-label", "Synth"); fArt.setAttribute("aria-label", "Artist"); fGen.setAttribute("aria-label", "Genre"); fTxt.setAttribute("aria-label", "Search");
    var list = el("ul", "slib-list"); lib.appendChild(filt); lib.appendChild(list); box.appendChild(lib);
    L.patches = [];
    function opts(s, all, vals) { s.innerHTML = ""; var o = el("option", null, all); o.value = ""; s.appendChild(o); vals.forEach(function (v) { var x = el("option", null, v[1]); x.value = v[0]; s.appendChild(x); }); }
    function uniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }).sort(); }
    function badge(p) {
      if (p.checked) return ["slib-ok", "checked by the teacher"];
      if (p.origin === "manual") return ["slib-man", "the guide's recipe, as named in the guide"];
      return ["slib-stu", "settings from the video (student)"];
    }
    function drawList() {
      list.innerHTML = ""; var q = fTxt.value.toLowerCase(), n = 0;
      L.patches.forEach(function (p) {
        if (fSyn.value && p.synth !== fSyn.value || fArt.value && p.artist !== fArt.value || fGen.value && p.genre !== fGen.value) return;
        if (q && (p.song + " " + p.artist).toLowerCase().indexOf(q) < 0) return;
        n++; var li = el("li", "slib-item"), b = el("button", "btn btn-sm", "▶ load"), bg = badge(p);
        b.type = "button"; b.onclick = function () { getJSON(p.file).then(L.load, function (e) { say("Could not fetch " + p.file + ".", true); }); };
        li.appendChild(b);
        var t = el("span", "slib-t"); t.appendChild(el("b", null, p.song)); t.appendChild(document.createTextNode(" — " + (p.artist || "?") + (p.year ? " (" + p.year + ")" : "") + " · " + name(p.synth)));
        li.appendChild(t);
        if (p.source && p.source.url) { var a = el("a", "slib-src", p.source.title || "source"); a.href = p.source.url; a.target = "_blank"; a.rel = "noopener"; li.appendChild(a); }
        li.appendChild(el("span", "slib-badge " + bg[0], bg[1])); list.appendChild(li);
      });
      if (!n) list.appendChild(el("li", "slib-none", L.patches.length ? "Nothing matches." : "No patches yet."));
    }
    [fSyn, fArt, fGen].forEach(function (s) { s.onchange = drawList; }); fTxt.oninput = drawList;
    L.ready = getJSON("index.json").then(function (ix) {
      L.patches = (ix.patches || []).filter(function (p) { return PR[p.synth]; });
      opts(fSyn, "every synth", uniq(L.patches.map(function (p) { return p.synth; })).map(function (s) { return [s, name(s)]; }));
      opts(fArt, "every artist", uniq(L.patches.map(function (p) { return p.artist; })).map(function (s) { return [s, s]; }));
      opts(fGen, "every genre", uniq(L.patches.map(function (p) { return p.genre; })).map(function (s) { return [s, s]; }));
      drawList();
    }, function () { list.appendChild(el("li", "slib-none", "The Library could not be fetched.")); });

    // ---- Build it from a video (assignments) ----
    var asg = document.querySelector(".slib-assign");
    L.assignReady = asg ? getJSON("assignments.json").then(function (a) {
      L.videos = a.videos || []; asg.innerHTML = "";
      synths().forEach(function (id) {
        var vs = L.videos.filter(function (v) { return v.synth === id; }); if (!vs.length) return;
        asg.appendChild(el("h4", "slib-ah", name(id)));
        var ul = el("ul", "slib-alist");
        vs.forEach(function (v) {
          var li = el("li"), a = el("a", null, v.title); a.href = v.url; a.target = "_blank"; a.rel = "noopener";
          li.appendChild(a); li.appendChild(document.createTextNode(" — " + v.channel + (v.note ? ". " + v.note : "")));
          var sub = el("div", "slib-songs");
          (v.songs || []).forEach(function (s) {
            var b = el("button", "btn btn-sm slib-build", "Build " + s.song + (s.at ? " (" + s.at + ")" : "")); b.type = "button";
            b.title = s.artist; b.onclick = function () { L.prefill(v, s); }; sub.appendChild(b);
          });
          li.appendChild(sub); ul.appendChild(li);
        });
        asg.appendChild(ul);
      });
    }, function () { asg.textContent = "The video list could not be fetched."; }) : Promise.resolve();
    SL.libs.push(L); return L;
  };

  function init() {
    var SC = global.SynthCompare; if (!SC || !SC.widgets) return;
    SC.widgets.forEach(function (W) { if (W.host && !W._slib) { W._slib = SL.mount(W, W.host); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(init, 0); }); else setTimeout(init, 0);
  global.SynthLibrary = SL;
})(typeof window !== "undefined" ? window : globalThis);
