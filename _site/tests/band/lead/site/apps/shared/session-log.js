// session-log.js — local-first class session logging + makeup replay.
// Shared by the assessment apps. Each app provides:
//   getState()  -> a small JSON-able snapshot of the current item/params (+ a
//                  human-readable `label`). Logged (deduped) whenever it changes.
//   applyState(s) -> set the app's controls to a logged snapshot (for replay).
//
// Teacher: improvise; the floating "Class log" panel records each presented item
// in order. Export JSON or "Copy link" (state encoded in the URL #makeup=…).
// Student: open that link → app enters replay mode and steps through the same
// sequence (Next/Prev).
//
// CLOUD MODE (optional): if Supabase is configured (window.sb + real CONFIG.URL),
// "Save lesson" stores the items in the `lessons` table and produces a short
// ?lesson=<uuid> link; opening that link fetches + replays it, and passes are
// logged to `makeup_events`. Until Supabase is set up, everything falls back to
// the local Export / #makeup=… link. (Run setup-lessons.sql to create the tables.)

(function (global) {
  let app = "", getState = () => null, applyState = () => {};
  let events = [], replay = false, items = null, ptr = 0, panel = null, done = false;
  let cloudLessonId = null;

  // Supabase is usable only when the shared client exists AND config isn't the placeholder.
  const cloudReady = () => !!(global.sb && typeof CONFIG !== "undefined" && CONFIG.URL && !/PASTE/.test(CONFIG.URL));
  const studentName = () => {
    let n = localStorage.getItem("makeupName");
    if (n === null){ n = (prompt("Your name (for makeup credit):", "") || "").trim(); localStorage.setItem("makeupName", n); }
    return n || null;
  };

  const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  const dec = s => { try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch(e){ return null; } };
  const stripMeta = e => { if (!e) return null; const { occurred_at, ...rest } = e; return rest; };
  const same = (a, b) => a && b && JSON.stringify(a) === JSON.stringify(b);

  function btn(label, fn){
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "font:13px inherit;margin:.45rem .4rem 0 0;padding:.3rem .6rem;border-radius:6px;border:1px solid #3a3f48;background:#262a31;color:#e8eaed;cursor:pointer";
    b.onclick = fn; return b;
  }
  function ensurePanel(){
    if (panel) return;
    panel = document.createElement("div");
    panel.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:99999;background:#1d2026;border:1px solid #2c3038;border-radius:10px;padding:.6rem .75rem;font:13px -apple-system,system-ui,sans-serif;color:#e8eaed;max-width:300px;box-shadow:0 6px 20px rgba(0,0,0,.45)";
    document.body.appendChild(panel);
  }
  function render(){
    ensurePanel();
    panel.innerHTML = "";
    if (replay && done){
      panel.innerHTML = `<b>✅ Makeup complete</b><div style="color:#9aa0a6;margin:.3rem 0">You did everything from class.</div>`;
      panel.appendChild(btn("◀ Back", () => { done = false; step(0); }));
      return;
    }
    if (replay){
      const it = items[ptr] || {};
      const h = document.createElement("div");
      h.innerHTML = `<b>📋 Makeup — step ${ptr+1} of ${items.length}</b>` +
                    `<div style="color:#9aa0a6;margin:.3rem 0">${it.label || ""}</div>`;
      panel.appendChild(h);
      panel.appendChild(btn("◀ Prev", () => step(-1)));
      panel.appendChild(btn("Next ▶", () => step(1)));
    } else {
      const h = document.createElement("div");
      h.innerHTML = `<b>📋 Class log</b> <span style="color:#9aa0a6">· ${events.length} item${events.length===1?"":"s"}</span>`;
      panel.appendChild(h);
      panel.appendChild(btn("New", () => { events = []; render(); }));
      panel.appendChild(btn("Export", exportJson));
      panel.appendChild(btn(cloudReady() ? "Save lesson" : "Copy link", cloudReady() ? saveLessonCloud : copyLink));
    }
  }
  function step(d){ done = false; ptr = Math.max(0, Math.min(items.length-1, ptr + d)); applyState(items[ptr]); render(); }

  // Student passed the current item in replay → auto-advance (after a beat so the
  // result is visible). On the last item, mark the makeup complete.
  function onResult(pass){
    if (!replay || !pass || done) return;
    logMakeup(true);
    if (ptr < items.length - 1){ flash("✓ Passed — next…"); setTimeout(() => { if (replay && !done) step(1); }, 1500); }
    else { done = true; flash("✓ Passed!"); setTimeout(render, 1500); }
  }
  function logMakeup(passed){
    if (!cloudReady() || !cloudLessonId) return;
    const it = items[ptr] || {};
    global.sb.from("makeup_events").insert({
      lesson_id: cloudLessonId, student_name: studentName(), idx: ptr,
      app, item_id: it.item != null ? String(it.item) : null, passed
    }).then(() => {}, () => {});   // best-effort; never block the student
  }

  function exportJson(){
    const data = { app, created: new Date().toISOString(), items: events };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type:"application/json" }));
    a.download = `classlog_${app}_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"")}.json`;
    a.click();
  }
  function copyLink(){
    const url = location.href.split("#")[0] + "#makeup=" + enc(events);
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => flash("Link copied ✓"), () => prompt("Makeup link:", url));
    else prompt("Makeup link:", url);
  }
  // Cloud: save the lesson and produce a short ?lesson=<uuid> makeup link.
  async function saveLessonCloud(){
    if (!cloudReady()){ copyLink(); return; }
    if (!events.length){ flash("Nothing logged yet."); return; }
    let user = null;
    try { user = (await global.sb.auth.getUser()).data.user; } catch(e){}
    const title = prompt("Name this lesson (for the makeup link):", `${app} — ${new Date().toLocaleDateString()}`);
    if (title === null) return;
    const { data, error } = await global.sb.from("lessons")
      .insert({ teacher_id: user ? user.id : null, title, app, items: events })
      .select("id").single();
    if (error){ flash("Save failed: " + error.message); return; }
    const url = location.href.split("#")[0].split("?")[0] + "?lesson=" + data.id;
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => flash("Lesson saved · link copied ✓"), () => prompt("Makeup link:", url));
    else prompt("Makeup link:", url);
  }
  function flash(msg){
    const f = document.createElement("div"); f.textContent = msg;
    f.style.cssText = "margin-top:.35rem;color:#22c55e"; panel.appendChild(f);
    setTimeout(() => f.remove(), 1600);
  }

  function present(){
    if (replay || global.LSA_PRACTICE_MODE) return;
    const s = getState(); if (!s) return;
    if (same(stripMeta(events[events.length-1]), s)) return;   // dedupe consecutive identical
    events.push(Object.assign({ occurred_at: new Date().toISOString() }, s));
    render();
  }
  function init(opts){
    app = opts.app; getState = opts.getState; applyState = opts.applyState;
    const lm = /[?&]lesson=([0-9a-fA-F-]+)/.exec(location.search);
    if (lm) cloudLessonId = lm[1];                       // cloud makeup link
    const m = /[#&]makeup=([^&]+)/.exec(location.hash);
    if (m){ const it = dec(m[1]); if (it && it.length){ replay = true; items = it; } }  // local makeup link
  }
  async function begin(){
    if (global.LSA_PRACTICE_MODE) return;   // no floating class-log panel on this page
    if (cloudLessonId && cloudReady()){
      try {
        const { data, error } = await global.sb.from("lessons").select("items").eq("id", cloudLessonId).single();
        if (!error && data && Array.isArray(data.items) && data.items.length){
          replay = true; items = data.items; ptr = 0; render(); applyState(items[0]); return;
        }
      } catch(e){}
      flash && flash("Couldn't load that lesson.");
    }
    render();
    if (replay){ ptr = 0; applyState(items[ptr]); render(); }
  }

  global.SessionLog = { init, begin, present, onResult, isReplay: () => replay };
})(window);
