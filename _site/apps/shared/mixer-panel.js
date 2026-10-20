// mixer-panel.js — the navbar Mixer (loaded by practice-widgets.js the first time its button is pressed).
// One strip per sound on the page: every AudioTap source (the drone and the metronome while they play, each part of the band and
// its melody, synth-kit, the Mini DAW, ...) and every <audio> / <video> element. Each strip has a level meter, a fader (0 to 150 %),
// Mute and Solo; strips with the same `group` (the band's: "Backing Track") sit together under its name.
//
// How a strip turns a source up or down, without changing its routing:
//   - a source that registered with AudioTap.register(ctx, node, label, { gain: someAudioParam }) is driven through that param;
//   - else, when the registered node is a GainNode, its own gain is scaled (from the value it had when the mixer first touched it);
//   - else the strip shows the level only ("level only").
//   - a source with get / set (the drone) has its own volume setting as the fader; Mute and Solo still use its gain.
// Media elements use their own .volume / .muted. Settings are kept per label for the tab (sessionStorage "mixer-v1") and put back
// when a source registers again (the band builds a new bus for each performance).
//
//   MixerPanel.build(host)   draws the strips into host; MixerPanel.refresh() redraws; MixerPanel.stop() stops the meters.
(function (global) {
  var host = null, raf = 0, strips = [], subM = [], set = {};   // subM: the meters of the open drum mix's strips
  try { set = JSON.parse(sessionStorage.getItem("mixer-v1") || "{}") || {}; } catch (e) { set = {}; }
  function save() { try { sessionStorage.setItem("mixer-v1", JSON.stringify(set)); } catch (e) {} }
  function conf(label) { return set[label] || (set[label] = { vol: 1, mute: false, solo: false }); }
  function keyOf(e) { return (e.group ? e.group + ": " : "") + e.label; }
  function anySolo() { return strips.some(function (s) { return conf(s.key).solo; }); }
  function shown(e) { return !(e.opts && e.opts.active) || e.opts.active(); }

  function paramOf(e) {
    if (e.gain && typeof e.gain.value === "number") return e.gain;
    if (global.GainNode && e.node instanceof global.GainNode) return e.node.gain;
    return null;
  }
  var bases = typeof WeakMap === "function" ? new WeakMap() : null;
  function apply(s) {
    var c = conf(s.key), on = !c.mute && (!anySolo() || c.solo), g = on ? (s.set ? 1 : c.vol) : 0;
    if (s.el) { s.el.muted = !on; s.el.volume = Math.max(0, Math.min(1, c.vol)); return; }
    var p = s.param; if (!p) return;
    if (bases && !bases.has(p)) bases.set(p, p.value || 1);
    var base = bases ? bases.get(p) : 1;
    try { p.cancelScheduledValues(s.ctx.currentTime); p.setTargetAtTime(base * g, s.ctx.currentTime, 0.02); } catch (e) { p.value = base * g; }
  }
  function applyAll() { strips.forEach(apply); }
  // a sub-mix (the drum kit's groups): Mute and Solo act among its own strips only, on each one's node (gain 1 or 0)
  function applySub(parentKey, sub) {
    if (!sub) return;
    var solo = sub.some(function (x) { return conf(parentKey + "/" + x.label).solo; });
    sub.forEach(function (x) {
      var c = conf(parentKey + "/" + x.label), on = !c.mute && (!solo || c.solo), p = x.node && x.node.gain;
      if (!p) return;
      try { p.cancelScheduledValues(x.ctx.currentTime); p.setTargetAtTime(on ? 1 : 0, x.ctx.currentTime, 0.02); } catch (e) { p.value = on ? 1 : 0; }
    });
  }
  // every source, the mixer's settings put back (also while the panel is shut)
  function applyToSources() {
    if (!global.AudioTap) return;
    global.AudioTap.sources().forEach(function (e) {
      var o = e.opts || {}, k = keyOf({ group: o.group, label: e.label }), c = set[k];
      if (c && (c.vol !== 1 || c.mute || c.solo)) apply({ key: k, label: e.label, ctx: e.ctx, param: paramOf(e), set: o.set });
      if (o.sub) applySub(k, o.sub);                                 // (a new performance: new nodes, the same mutes)
    });
  }

  function el(tag, cls, html) { var x = document.createElement(tag); if (cls) x.className = cls; if (html != null) x.innerHTML = html; return x; }
  function stop() {
    cancelAnimationFrame(raf); raf = 0;
    strips.concat(subM).forEach(function (s) { if (s.an) { try { s.node.disconnect(s.an); } catch (e) {} s.an = null; } });
    subM = [];
  }
  function meterLoop() {
    strips.concat(subM).forEach(function (s) {
      if (!s.an) return;
      s.an.getFloatTimeDomainData(s.buf);
      var pk = 0; for (var i = 0; i < s.buf.length; i++) { var a = Math.abs(s.buf[i]); if (a > pk) pk = a; }
      var db = pk > 0 ? 20 * Math.log10(pk) : -90, h = Math.max(0, Math.min(1, (db + 60) / 60));
      s.peak = Math.max(h, (s.peak || 0) - 0.015);
      s.bar.style.height = (h * 100).toFixed(1) + "%"; s.hold.style.bottom = (s.peak * 100).toFixed(1) + "%";
      s.bar.classList.toggle("mx-hot", db > -1);
    });
    raf = requestAnimationFrame(meterLoop);
  }
  function meterOn(s) {   // an analyser on the strip's node, in its own context
    if (s.node && s.ctx && s.node !== s.ctx.destination && s.node.connect) {
      try { s.an = s.ctx.createAnalyser(); s.an.fftSize = 1024; s.buf = new Float32Array(s.an.fftSize); s.node.connect(s.an); } catch (e) { s.an = null; }
    }
  }
  function build(h) { host = h || host; refresh(); }
  var openSub = {};
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  // the strip's name: plain, or a menu of its sounds (the Backing Track's way: the name is the menu), or the opener of its own faders
  function labelOf(s) {
    var lb = el("div", "mx-label");
    if (s.voices && s.setVoice) {
      var list = s.voices() || [], cur = s.voice ? s.voice() : null, curL = (list.filter(function (v) { return v.id === cur; })[0] || {}).label;
      lb.className = "mx-label mx-pick"; lb.title = "Change the sound";
      lb.innerHTML = '<span class="mx-name">' + esc(s.label) + '</span>' + (curL ? '<span class="mx-voice">' + esc(curL) + "</span>" : "");
      var sel = el("select"); sel.setAttribute("aria-label", s.label + " sound");
      list.forEach(function (v) { var o = new Option(v.label, v.id); if (v.id === cur) o.selected = true; sel.appendChild(o); });
      sel.addEventListener("change", function () { s.setVoice(sel.value); var l2 = (list.filter(function (v) { return v.id === sel.value; })[0] || {}).label; var vs = lb.querySelector(".mx-voice"); if (vs) vs.textContent = l2; });
      lb.appendChild(sel); return lb;
    }
    if (s.sub) {
      var b = el("button", "mx-label mx-pick mx-subbtn", '<span class="mx-name">' + esc(s.label) + "</span>");
      b.type = "button"; b.setAttribute("aria-expanded", String(!!openSub[s.key])); b.title = openSub[s.key] ? "Hide the " + s.label.toLowerCase() + " mix" : "Show the " + s.label.toLowerCase() + " mix";
      b.addEventListener("click", function () { openSub[s.key] = !openSub[s.key]; refresh(); });
      return b;
    }
    lb.textContent = s.label; return lb;
  }
  function subOf(s) {
    var box = el("div", "mx-sub"); box.setAttribute("role", "group"); box.setAttribute("aria-label", s.label + " mix");
    s.sub.forEach(function (x) {
      var st = el("div", "mx-strip mx-substrip"), f = el("input"); f.type = "range"; f.min = 0; f.max = 150; f.step = 1; f.className = "mx-fader";
      f.value = Math.round((x.get ? x.get() : 1) * 100); f.setAttribute("aria-label", x.label + " volume");
      var num = el("span", "mx-num", f.value + "%");
      f.addEventListener("input", function () { num.textContent = f.value + "%"; x.set(+f.value / 100); });
      var m = { node: x.node, ctx: x.ctx }, meter = el("div", "mx-meter"); m.bar = el("div", "mx-bar"); m.hold = el("div", "mx-hold"); meter.appendChild(m.bar); meter.appendChild(m.hold);
      meterOn(m); subM.push(m);
      var row = el("div", "mx-row"); row.appendChild(meter); row.appendChild(f);
      var c = conf(s.key + "/" + x.label), mute = el("button", "mx-btn", "M"), solo = el("button", "mx-btn", "S");
      mute.type = solo.type = "button"; mute.title = "Mute"; solo.title = "Solo";
      mute.setAttribute("aria-label", "Mute " + x.label); solo.setAttribute("aria-label", "Solo " + x.label + " (among the " + s.label.toLowerCase() + ")");
      function btns() { mute.setAttribute("aria-pressed", String(!!c.mute)); solo.setAttribute("aria-pressed", String(!!c.solo)); }
      mute.addEventListener("click", function () { c.mute = !c.mute; btns(); save(); applySub(s.key, s.sub); });
      solo.addEventListener("click", function () { c.solo = !c.solo; btns(); save(); applySub(s.key, s.sub); });
      if (!x.node) mute.disabled = solo.disabled = true;
      btns();
      var bt = el("div", "mx-btns"); bt.appendChild(mute); bt.appendChild(solo);
      st.appendChild(row); st.appendChild(num); st.appendChild(bt); st.appendChild(el("div", "mx-label", esc(x.label))); box.appendChild(st);
    });
    return box;
  }
  function refresh() {
    if (!host) return;
    stop(); strips = []; host.innerHTML = "";
    var list = el("div", "mx-strips");
    var src = global.AudioTap ? global.AudioTap.sources() : [];
    src.filter(shown).forEach(function (e) { var o = e.opts || {}; strips.push({ key: keyOf({ group: o.group, label: e.label }), group: o.group || "", label: o.mixLabel || e.label, ctx: e.ctx, node: e.node, param: paramOf(e), get: o.get, set: o.set,
      master: !!o.master, order: o.order == null ? 99 : o.order, voices: o.voices, voice: o.voice, setVoice: o.setVoice, sub: o.sub }); });
    strips.forEach(function (s, i) { s.i = i; });
    strips.sort(function (a, b) { return (a.group ? 1 : 0) - (b.group ? 1 : 0) || (a.group < b.group ? -1 : a.group > b.group ? 1 : 0) || (a.master ? 1 : 0) - (b.master ? 1 : 0) || a.order - b.order || a.i - b.i; });   // single sounds first, then each group, its Master strip last
    var media = global.AudioTap && global.AudioTap.mediaElements ? global.AudioTap.mediaElements() : [];
    media.forEach(function (m, i) { var lb = (m.tagName === "VIDEO" ? "Video" : "Audio") + (media.length > 1 ? " " + (i + 1) : ""); strips.unshift({ key: lb, group: "", label: lb, el: m }); });
    if (!strips.length) host.appendChild(el("p", "pw-note", "Nothing on this page has made a sound yet. Start something (the band, a lesson widget, the drone), then open the mixer again."));
    var groupEl = null, lastGroup = null;
    strips.forEach(function (s) {
      if (s.group !== lastGroup) {
        lastGroup = s.group;
        if (s.group) { groupEl = el("div", "mx-group"); groupEl.appendChild(el("div", "mx-gname", s.group.replace(/</g, "&lt;"))); var gs = el("div", "mx-gstrips"); groupEl.appendChild(gs); list.appendChild(groupEl); groupEl = gs; }
        else groupEl = list;
      }
      var c = conf(s.key), st = el("div", "mx-strip");
      var meter = el("div", "mx-meter"); s.bar = el("div", "mx-bar"); s.hold = el("div", "mx-hold"); meter.appendChild(s.bar); meter.appendChild(s.hold);
      var fader = el("input"); fader.type = "range"; fader.min = 0; fader.max = s.el ? 100 : 150; fader.step = 1; fader.value = Math.round((s.get ? s.get() : c.vol) * 100); if (s.set) fader.max = 100;
      fader.className = "mx-fader"; fader.setAttribute("aria-label", s.label + " volume"); fader.disabled = !s.el && !s.param && !s.set;
      var num = el("span", "mx-num", fader.disabled ? "level only" : fader.value + "%");
      fader.addEventListener("input", function () { num.textContent = fader.value + "%"; if (s.set) { s.set(+fader.value / 100); return; } c.vol = +fader.value / 100; save(); apply(s); });
      var mute = el("button", "mx-btn", "M"), solo = el("button", "mx-btn", "S");
      mute.type = solo.type = "button"; mute.title = "Mute"; solo.title = "Solo";
      function btns() { mute.setAttribute("aria-pressed", String(!!c.mute)); solo.setAttribute("aria-pressed", String(!!c.solo)); }
      mute.addEventListener("click", function () { c.mute = !c.mute; btns(); save(); applyAll(); });
      solo.addEventListener("click", function () { c.solo = !c.solo; btns(); save(); applyAll(); });
      if (fader.disabled) { mute.disabled = solo.disabled = true; }
      btns();
      var row = el("div", "mx-row"); row.appendChild(meter); row.appendChild(fader);
      var bt = el("div", "mx-btns"); bt.appendChild(mute); bt.appendChild(solo);
      st.appendChild(row); st.appendChild(num); st.appendChild(bt); st.appendChild(labelOf(s));
      if (s.master) {                                               // a group's Master stands after its box, at the far right, level with its strips
        var mb = el("div", "mx-group mx-ghost"); mb.appendChild(el("div", "mx-gname", "&nbsp;")); var ms = el("div", "mx-gstrips"); ms.appendChild(st); mb.appendChild(ms); list.appendChild(mb);
      } else groupEl.appendChild(st);
      if (s.sub && openSub[s.key]) groupEl.appendChild(subOf(s));
      meterOn(s);
    });
    host.appendChild(list);
    if (strips.length) host.appendChild(el("p", "pw-note", "M mutes a sound, S plays only the soloed ones. Settings last for this tab."));
    applyAll();
    strips.forEach(function (s) { if (s.sub) applySub(s.key, s.sub); });
    if (strips.concat(subM).some(function (s) { return s.an; })) raf = requestAnimationFrame(meterLoop);
  }
  var css = "#pw-mixer{width:auto;min-width:min(20rem,calc(100vw - 1.5rem));max-width:calc(100vw - 1.5rem)}" +
    ".mx-strips{display:flex;gap:.6rem;overflow-x:auto;padding:.25rem 0 .5rem}" +
    ".mx-strip{display:flex;flex-direction:column;align-items:center;gap:.3rem;min-width:3.8rem;max-width:5.5rem}" +
    ".mx-row{display:flex;gap:.35rem;align-items:stretch;height:9rem}" +
    ".mx-meter{position:relative;width:.55rem;background:color-mix(in srgb,currentColor 12%,transparent);border-radius:3px;overflow:hidden}" +
    ".mx-bar{position:absolute;left:0;right:0;bottom:0;height:0;background:#3a9a5b}.mx-bar.mx-hot{background:#d0453a}" +
    ".mx-hold{position:absolute;left:0;right:0;height:2px;background:currentColor;opacity:.6;bottom:0}" +
    ".mx-fader{writing-mode:vertical-lr;direction:rtl;width:1.4rem;height:100%;margin:0}" +
    ".mx-num{font:600 .72rem/1 system-ui,sans-serif;opacity:.8}" +
    ".mx-btns{display:flex;gap:.25rem}.mx-btn{font:700 .7rem/1 system-ui,sans-serif;padding:.25rem .45rem;border:1px solid currentColor;border-radius:4px;background:none;color:inherit;opacity:.75}" +
    ".mx-btn[aria-pressed=true]{opacity:1;background:currentColor}.mx-btn[aria-pressed=true]{color:inherit}.mx-btn[title=Mute][aria-pressed=true]{background:#d0453a;border-color:#d0453a;color:#fff}.mx-btn[title=Solo][aria-pressed=true]{background:#d9a400;border-color:#d9a400;color:#000}" +
    ".mx-group{border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:6px;padding:.25rem .4rem .35rem}" +
    ".mx-ghost{border-color:transparent}" +
    ".mx-gname{font:600 .72rem/1.4 system-ui,sans-serif;opacity:.75;margin-bottom:.2rem}.mx-gstrips{display:flex;gap:.6rem}" +
    ".mx-label{font:.72rem/1.2 system-ui,sans-serif;text-align:center;word-break:break-word}" +
    ".mx-pick{position:relative;cursor:pointer;border:0;background:none;color:inherit;padding:0}.mx-pick .mx-name{text-decoration:underline dotted;text-underline-offset:.2em}.mx-pick .mx-name::after{content:' \\25BE'}" +
    ".mx-subbtn[aria-expanded=true] .mx-name::after{content:' \\25B4'}" +
    ".mx-voice{display:block;opacity:.7;font-size:.66rem;margin-top:.1rem}" +
    ".mx-pick>select{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:0;padding:0}" +
    ".mx-pick:focus-within,.mx-subbtn:focus-visible{outline:2px solid currentColor;outline-offset:2px;border-radius:3px}" +
    ".mx-sub{display:flex;gap:.45rem;padding:.3rem .4rem 0;margin-top:-.3rem;align-self:stretch;border-left:2px solid color-mix(in srgb,currentColor 25%,transparent);border-right:2px solid color-mix(in srgb,currentColor 25%,transparent);background:color-mix(in srgb,currentColor 5%,transparent);border-radius:4px}" +
    ".mx-substrip{min-width:3rem}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  if (global.AudioTap && global.AudioTap.onChange) global.AudioTap.onChange(function () { applyToSources(); if (host && host.offsetParent) refresh(); });
  global.MixerPanel = { build: build, refresh: refresh, stop: stop };
})(window);
