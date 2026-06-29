// track.js (Quarto version) — measures ACTIVE time on each page AND logs
// in-app actions, reusing the site-wide Supabase client (window.sb).
//
// Page identity comes from the URL path, so every Quarto page is tracked
// separately with no per-page setup. e.g. /lessons/quarter-notes.html
// becomes the page id "lessons/quarter-notes".
//
// Time is counted only while the tab is visible (Page Visibility API) and
// flushed every 5s, so a forgotten background tab won't inflate it and a crash
// loses at most ~5s. Each page load is one page_sessions row.

(function () {
  if (!window.sb) { console.warn("track.js: window.sb missing"); return; }
  const db = window.sb;

  const PAGE =
    decodeURIComponent(location.pathname)
      .replace(/^\//, "").replace(/index\.html$/, "").replace(/\.html$/, "")
      .replace(/\/$/, "") || "index";

  let rowId = null;
  let activeSeconds = 0;
  let lastTick = Date.now();
  const visible = () => document.visibilityState === "visible";

  function accumulate() {
    if (visible()) activeSeconds += Math.round((Date.now() - lastTick) / 1000);
    lastTick = Date.now();
  }

  async function flush() {
    if (rowId === null) return;
    await db.from("page_sessions").update({
      active_seconds: activeSeconds, last_seen_at: new Date().toISOString()
    }).eq("id", rowId);
  }

  // Hook the same-origin app iframe (if this page embeds one) for actions.
  function hookActions(session) {
    const iframe = document.querySelector("iframe");
    if (!iframe) return;
    const actorName = session.user.user_metadata.full_name || session.user.email;

    iframe.addEventListener("load", () => {
      let doc;
      try { doc = iframe.contentDocument; } catch (e) { return; }
      if (!doc) return;

      const currentItem = () => {
        const sel = doc.getElementById("tune-selector");
        return sel && sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : null;
      };
      const log = (event, item) => db.from("activity_events").insert({
        student_id: session.user.id, actor_name: actorName,
        app: PAGE, item_id: item !== undefined ? item : currentItem(), event
      });

      doc.addEventListener("click", (e) => {
        if (e.target.closest(".abcjs-midi-start")) log("play");
        else if (e.target.closest('[class*="abcjs-note"]')) log("note_click");
      }, true);
      doc.addEventListener("change", (e) => {
        if (e.target.tagName === "SELECT") log("select", currentItem());
      }, true);
    });
  }

  async function init() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return; // not signed in -> nothing tracked

    const name = session.user.user_metadata.full_name || session.user.email;
    const { data, error } = await db.from("page_sessions").insert({
      student_id: session.user.id, student_name: name, page: PAGE
    }).select("id").single();
    if (error) { console.warn("track.js insert failed:", error.message); return; }
    rowId = data.id;

    lastTick = Date.now();
    setInterval(() => { accumulate(); flush(); }, 5000);
    document.addEventListener("visibilitychange", () => {
      accumulate();
      if (visible()) lastTick = Date.now(); else flush();
    });
    window.addEventListener("pagehide", () => { accumulate(); flush(); });

    hookActions(session);
  }

  init();
})();
