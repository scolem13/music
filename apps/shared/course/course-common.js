// course-common.js: shared by the course pages (glossary, pathway, enrichment).
//   CourseKit.load(key, fallback) / save(key, value)   localStorage, never throws (private windows, blocked storage)
//   CourseKit.pack(obj) / unpack(str)                  object <-> URL-safe text, for share links (?p=...)
//   CourseKit.esc(s), CourseKit.md(s)                  escape HTML; *bold* and /italic/ in short labels
//   CourseKit.shareLink(param, obj)                    this page's URL with ?param=packed (other query kept)
//   CourseKit.json(url)                                fetch JSON or resolve null
// One day this state moves to Supabase (the site already loads it); keep everything that is saved going through load/save.
(function () {
  "use strict";
  var PREFIX = "course:";
  function load(key, fallback) {
    try { var v = localStorage.getItem(PREFIX + key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function save(key, value) { try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) {} }
  function pack(obj) {
    var bytes = new TextEncoder().encode(JSON.stringify(obj)), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function unpack(str) {
    try {
      var bin = atob(str.replace(/-/g, "+").replace(/_/g, "/")), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) { return null; }
  }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function md(s) {
    return esc(s).replace(/(^|[\s(“"])\*([^*]+?)\*(?=[\s.,;:)”"]|$)/g, "$1<strong>$2</strong>")
      .replace(/(^|[\s(“"])\/([^/]+?)\/(?=[\s.,;:)”"]|$)/g, "$1<em>$2</em>");
  }
  function shareLink(param, obj) {
    var u = new URL(location.href); u.hash = "";
    u.searchParams.set(param, pack(obj));
    return u.toString();
  }
  function json(url) { return fetch(url, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function copy(text, btn) {
    var done = function () { if (btn) { var t = btn.textContent; btn.textContent = "Copied"; setTimeout(function () { btn.textContent = t; }, 1400); } };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {}); else done();
  }
  window.CourseKit = { load: load, save: save, pack: pack, unpack: unpack, esc: esc, md: md, shareLink: shareLink, json: json, copy: copy };
})();
