// SamplerPads: an MPC / SP-404 style sampler for the sampling lessons. window.SamplerPads. Needs turntables.js (its shared audio engine:
// Turntables.audio). Loaded by lessons/_dj-kit.qmd, which calls SamplerPads.init().
//
// Markup:  <div class="sp-pads" data-id="sp-chop" data-loop="demo:break100" data-slice="equal" data-show="wave pads edit pattern library"
//               data-bars="2" data-mode="repitch"></div>
//   data-loop    what loads at start ("demo:<id>", a URL, "<source>:<track>", as Turntables.load takes)
//   data-slice   "equal" (16 equal slices: a bar of sixteenths for a one-bar loop), "beats" (one slice a beat, from the BPM),
//                or "transients" (cut at the 16 strongest hits)
//   data-show    parts shown (all when absent): wave (waveform with slice markers, drag a marker to move a chop), pads (4×4),
//                edit (the selected pad: pitch, stretch, mode, reverse, gate, level), pattern (record / play a 1–4 bar pattern), library
//   data-bars    pattern length at start (1, 2 or 4 bars); data-mode   pitch mode for every pad at start: "repitch" | "stretch"
//
// Playing: click a pad, or keys with the widget focused (MPC layout, pad 1 bottom left): z x c v = pads 1–4, a s d f = 5–8,
//   q w e r = 9–12, 1 2 3 4 = 13–16; or a MIDI keyboard / pad controller ("Connect MIDI"): notes 36–51 (C1 up: the MPC / Ableton
//   Push / most controllers' first bank), velocity sets the level.
// Each pad: Pitch (semitones), Stretch (length ×0.5..×2), Mode — Repitch (speed and pitch move together: a record sped up, an SP-404's
//   or MPC's "pitch") or Stretch (pitch and length apart: time-stretch by overlap-add, which smears transients — listen for it),
//   Reverse, Gate (sounds only while held; else one-shot), Level.
// Pattern: Tempo (starts at the loop's BPM), Bars, Quantize (off / 1/16 / 1/8), Click; ● Rec records pad hits into the loop as it
//   goes round (overdub), ▶ plays it, Undo removes the last pass's hits, Clear empties it.
//
// API: SamplerPads.all, SamplerPads.byId(id); a widget p: p.load(src) -> Promise, p.slices [{start, end}] (s), p.pads [{pitch, stretch,
//   mode, reverse, gate, level}], p.hit(i, vel?) (plays pad i now; recorded when recording), p.release(i), p.select(i), p.slice(kind),
//   p.setSlice(i, startSec), p.render(i) -> AudioBuffer (what pad i plays), p.play(), p.stop(), p.record(on), p.pattern [{step, pad, vel}],
//   p.tempo, p.bars, p.quant, p.playing, p.recording, p.active (voices sounding).
// Output through one gain registered with window.AudioTap ("Sampler pads").
(function () {
  "use strict";
  const A = () => window.Turntables.audio;
  const KEYS = ["z", "x", "c", "v", "a", "s", "d", "f", "q", "w", "e", "r", "1", "2", "3", "4"];
  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const btn = (txt, title, cls) => { const b = h("button", "btn btn-sm btn-outline-secondary " + (cls || ""), txt); b.type = "button"; if (title) b.title = title; return b; };
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  let OUT = null;
  const out = () => { const c = A().ctx(); if (!OUT) { OUT = c.createGain(); OUT.gain.value = 0.9; OUT.connect(c.destination); if (window.AudioTap) try { AudioTap.register(c, OUT, "Sampler pads"); } catch (e) {} } return OUT; };
  const all = [];

  class Pads {
    constructor(el) {
      this.el = el; el._sp = this; this.id = el.dataset.id || "sp" + all.length;
      const show = (el.dataset.show || "wave pads edit pattern library").split(/\s+/); this.show = s => show.includes(s);
      this.sliceKind = el.dataset.slice || "equal"; this.bars = +(el.dataset.bars || 2); this.quant = 4; this.click = true;
      const mode = el.dataset.mode || "repitch";
      this.pads = Array.from({ length: 16 }, () => ({ pitch: 0, stretch: 1, mode, reverse: false, gate: false, level: 1 }));
      this.slices = []; this.sel = 0; this.pattern = []; this.passes = []; this.voices = new Set(); this.cache = {};
      this.playing = false; this.recording = false; this.tempo = 90; this.track = null;
      el.classList.add("sp-made"); el.tabIndex = 0; el.innerHTML = "";
      this.ui(); all.push(this);
      A().configSources(el); this.fillLib(); A().onSources(() => this.fillLib());
      if (el.dataset.loop) this.load(el.dataset.loop);
    }
    get active() { return this.voices.size; }
    status(s) { this.statusEl.textContent = s; }
    async load(src) {
      this.status("Loading…");
      try {
        const t = await A().getBuffer(src); if (!t) return null;
        if (!t.bpm) { t.bpm = A().detectBpm(t.buffer); t.bpmGuessed = true; }
        this.track = t; this.buffer = t.buffer; this.peaks = A().peaks(t.buffer, 600); this.cache = {};
        this.tempo = t.bpm; this.tempoIn.value = t.bpm; this.titleEl.textContent = t.title + "  ·  " + t.bpm + " BPM" + (t.key ? "  ·  " + t.key : "");
        this.slice(this.sliceKind); this.status(""); this.drawWave(); return t;
      } catch (e) { console.warn(e); this.status("Could not load: " + e.message); return null; }
    }
    slice(kind) {
      this.sliceKind = kind; if (this.sliceSel) this.sliceSel.value = kind;
      const dur = this.buffer ? this.buffer.duration : 1; let starts;
      if (kind === "transients" && this.buffer) { starts = A().onsets(this.buffer, 16); if (!starts.length || starts[0] > 0.02) starts.unshift(0); starts = starts.slice(0, 16); }
      else if (kind === "beats" && this.track) { const bl = 60 / this.track.bpm; starts = []; for (let i = 0; i < 16 && i * bl < dur - 0.01; i++) starts.push(i * bl); }
      else starts = Array.from({ length: 16 }, (_, i) => i * dur / 16);
      this.slices = starts.map((s, i) => ({ start: s, end: i + 1 < starts.length ? starts[i + 1] : dur }));
      this.cache = {}; this.drawPads(); this.drawWave();
    }
    setSlice(i, t) {
      if (i <= 0 || !this.slices[i]) return;
      const lo = this.slices[i - 1].start + 0.005, hi = this.slices[i].end - 0.005; t = Math.max(lo, Math.min(hi, t));
      this.slices[i].start = t; this.slices[i - 1].end = t; delete this.cache[i]; delete this.cache[i - 1]; this.drawWave();
    }
    render(i) {
      const p = this.pads[i], s = this.slices[i]; if (!p || !s || !this.buffer) return null;
      const key = [s.start, s.end, p.pitch, p.stretch, p.mode, p.reverse].join(); if (this.cache[i] && this.cache[i].key === key) return this.cache[i].buf;
      const c = A().ctx(), b = this.buffer, a = Math.floor(s.start * b.sampleRate), e = Math.max(a + 64, Math.floor(s.end * b.sampleRate));
      let seg = c.createBuffer(b.numberOfChannels, e - a, b.sampleRate);
      for (let ch = 0; ch < b.numberOfChannels; ch++) { const d = b.getChannelData(ch).subarray(a, e).slice(); if (p.reverse) d.reverse();
        const fade = Math.min(64, d.length >> 2); for (let k = 0; k < fade; k++) { d[k] *= k / fade; d[d.length - 1 - k] *= k / fade; } seg.copyToChannel(d, ch); }
      if (p.mode === "stretch") { const f = p.stretch * Math.pow(2, p.pitch / 12); if (Math.abs(f - 1) > 1e-3) seg = A().stretch(seg, f); }
      this.cache[i] = { key, buf: seg }; return seg;
    }
    rate(i) { const p = this.pads[i]; return p.mode === "stretch" ? Math.pow(2, p.pitch / 12) : Math.pow(2, p.pitch / 12) / p.stretch; }
    voice(i, when, vel = 1) {
      const buf = this.render(i); if (!buf) return null;
      const c = A().ctx(), s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; s.playbackRate.value = this.rate(i);
      g.gain.value = this.pads[i].level * vel; s.connect(g); g.connect(out()); s.start(when || 0);
      const v = { s, g, i }; this.voices.add(v); s.onended = () => { this.voices.delete(v); this.light(i, false); };
      return v;
    }
    hit(i, vel = 1) {
      if (!this.slices[i]) return; A().ctx(); this.release(i, true);
      const v = this.voice(i, 0, vel); this.held = this.held || {}; this.held[i] = v; this.light(i, true);
      if (this.recording && this.playing) {
        const c = A().ctx(), sd = 60 / this.tempo / 4, total = this.bars * 16;
        let st = (c.currentTime - this.t0) / sd; st = ((st % total) + total) % total;
        if (this.quant) st = Math.round(st / (16 / (this.quant * 4)) ) * (16 / (this.quant * 4)) % total;
        this.pattern.push({ step: st, pad: i, vel, pass: this.pass }); this.drawPattern();
      }
      this.select(i);
    }
    release(i, retrig) {
      const v = this.held && this.held[i]; if (!v) return;
      if (this.pads[i].gate || retrig) { const t = A().ctx().currentTime; v.g.gain.setTargetAtTime(0, t, 0.01); try { v.s.stop(t + 0.06); } catch (e) {} }
      this.held[i] = null;
    }
    light(i, on) { const b = this.padEls && this.padEls[i]; if (b) b.classList.toggle("sp-lit", on); }
    select(i) { this.sel = i; this.drawPads(); this.drawEdit(); this.drawWave(); }
    play() {
      if (this.playing || !this.buffer) return; const c = A().ctx(); this.playing = true; this.t0 = c.currentTime + 0.08; this.nextStep = 0; this.pass = 0;
      this.playBtn.classList.add("sp-on");
      const sd = () => 60 / this.tempo / 4;
      const tick = () => {
        if (!this.playing) return;
        const total = this.bars * 16, now = c.currentTime;
        while (this.t0 + this.nextStep * sd() < now + 0.12) {
          const n = this.nextStep, t = this.t0 + n * sd(), st = n % total;
          if (st === 0 && n > 0) { this.pass++; }
          if (this.click && st % 4 === 0) this.clickAt(t, st === 0);
          for (const e of this.pattern) if (e.step >= st && e.step < st + 1 && !(this.recording && e.pass === this.pass)) { const v = this.voice(e.pad, t + (e.step - st) * sd(), e.vel); if (v) setTimeout(() => this.light(e.pad, true), Math.max(0, (t - now) * 1000)); }
          this.nextStep++;
        }
        this.posStep = ((now - this.t0) / sd()) % total; this.drawPattern();
      };
      this.timer = setInterval(tick, 25); tick();
    }
    stop() { this.playing = false; clearInterval(this.timer); this.playBtn.classList.remove("sp-on"); this.record(false); this.voices.forEach(v => { try { v.s.stop(); } catch (e) {} }); }
    record(on) {
      if (on && !this.playing) this.play();
      if (on) { this.passes.push(this.pattern.length); }
      this.recording = !!on; if (this.recBtn) this.recBtn.classList.toggle("sp-rec", this.recording);
    }
    clickAt(t, down) { const c = A().ctx(), o = c.createOscillator(), g = c.createGain(); o.frequency.value = down ? 1600 : 1100;
      g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04); o.connect(g); g.connect(out()); o.start(t); o.stop(t + 0.05); }
    async fillLib() {
      if (!this.libSel) return; const groups = await A().allTracks(), s = this.libSel; s.innerHTML = ""; s.append(h("option", "", "Load a loop…"));
      for (const g of groups) { if (!g.tracks.length) continue; const og = h("optgroup"); og.label = g.source.label;
        for (const t of g.tracks) { const o = h("option", "", t.title + (t.bpm ? "  " + t.bpm + " BPM" : "")); o.value = /^demo:/.test(t.url) ? t.url : g.source.id + ":" + t.id; og.append(o); } s.append(og); }
      const f = h("option", "", "Local file…"); f.value = "file"; s.append(f);
    }
    async midi() {
      if (!navigator.requestMIDIAccess) { this.status("This browser has no Web MIDI (try Chrome)."); return; }
      try { const m = await navigator.requestMIDIAccess(); let n = 0;
        m.inputs.forEach(inp => { n++; inp.onmidimessage = e => { const [st, note, vel] = e.data, i = note - 36; if (i < 0 || i > 15) return;
          if ((st & 0xf0) === 0x90 && vel) this.hit(i, vel / 127); else if ((st & 0xf0) === 0x80 || ((st & 0xf0) === 0x90 && !vel)) this.release(i); }; });
        this.status(n ? "MIDI: " + n + " input" + (n > 1 ? "s" : "") + " (notes 36–51 play the pads)" : "No MIDI inputs found.");
      } catch (e) { this.status("MIDI refused."); }
    }
    ui() {
      const el = this.el;
      const top = h("div", "sp-top"); this.titleEl = h("span", "sp-title", "(nothing loaded)"); this.statusEl = h("span", "sp-status");
      this.libSel = h("select", "sp-sel"); this.libSel.setAttribute("aria-label", "Load a loop");
      const file = h("input"); file.type = "file"; file.accept = "audio/*"; file.hidden = true; file.onchange = () => file.files[0] && this.load(file.files[0]);
      this.libSel.onchange = () => { const v = this.libSel.value; this.libSel.selectedIndex = 0; if (v === "file") file.click(); else if (v) this.load(v); };
      this.sliceSel = h("select", "sp-sel"); for (const [v, t] of [["equal", "16 equal slices"], ["beats", "One a beat"], ["transients", "At the hits"]]) { const o = h("option", "", t); o.value = v; this.sliceSel.append(o); }
      this.sliceSel.value = this.sliceKind; this.sliceSel.onchange = () => this.slice(this.sliceSel.value); this.sliceSel.setAttribute("aria-label", "How to slice");
      const whole = btn("▶ Whole loop", "Play the loop as it is"); whole.onclick = () => this.playWhole();
      const mid = btn("Connect MIDI", "Play the pads from a MIDI controller (notes 36–51)"); mid.onclick = () => this.midi();
      const lib = h("span", "sp-libwrap"); lib.append(this.libSel, file); if (!this.show("library")) lib.hidden = true;
      top.append(this.titleEl, lib, this.sliceSel, whole, mid, this.statusEl); el.append(top);
      this.wave = h("canvas", "sp-wave"); this.wave.height = 80; if (!this.show("wave")) this.wave.hidden = true; el.append(this.wave); this.waveDrag();
      const mid2 = h("div", "sp-mid");
      this.grid = h("div", "sp-grid"); this.padEls = [];
      for (let r = 3; r >= 0; r--) for (let c = 0; c < 4; c++) { const i = r * 4 + c, b = h("button", "sp-pad"); b.type = "button";
        b.append(h("span", "sp-n", String(i + 1)), h("span", "sp-k", KEYS[i].toUpperCase()));
        b.onpointerdown = e => { e.preventDefault(); this.el.focus({ preventScroll: true }); this.hit(i); };
        b.onpointerup = b.onpointerleave = () => this.release(i);
        this.padEls[i] = b; this.grid.append(b); }
      if (!this.show("pads")) this.grid.hidden = true;
      this.edit = h("div", "sp-edit"); if (!this.show("edit")) this.edit.hidden = true;
      mid2.append(this.grid, this.edit); el.append(mid2);
      const pat = h("div", "sp-pat"); if (!this.show("pattern")) pat.hidden = true;
      const bar = h("div", "sp-patbar");
      this.playBtn = btn("▶", "Play the pattern"); this.playBtn.onclick = () => this.playing ? this.stop() : this.play();
      const stopB = btn("■", "Stop"); stopB.onclick = () => this.stop();
      this.recBtn = btn("● Rec", "Record pad hits into the pattern as it loops", "sp-recbtn"); this.recBtn.onclick = () => this.record(!this.recording);
      const undo = btn("Undo", "Remove the hits of the last recording pass"); undo.onclick = () => { const n = this.passes.pop(); if (n != null) this.pattern.length = n; this.drawPattern(); };
      const clear = btn("Clear", "Empty the pattern"); clear.onclick = () => { this.pattern = []; this.passes = []; this.drawPattern(); };
      const lab = (t, inp) => { const l = h("label", "sp-lbl"); l.append(t + " ", inp); return l; };
      this.tempoIn = h("input"); this.tempoIn.type = "number"; this.tempoIn.min = 40; this.tempoIn.max = 200; this.tempoIn.value = this.tempo; this.tempoIn.onchange = () => this.tempo = +this.tempoIn.value || 90;
      const barsSel = h("select"); for (const b of [1, 2, 4]) { const o = h("option", "", b); o.value = b; barsSel.append(o); } barsSel.value = this.bars; barsSel.onchange = () => { this.bars = +barsSel.value; this.drawPattern(); };
      const qSel = h("select"); for (const [v, t] of [[0, "off"], [4, "1/16"], [2, "1/8"]]) { const o = h("option", "", t); o.value = v; qSel.append(o); } qSel.value = this.quant; qSel.onchange = () => this.quant = +qSel.value;
      const ck = h("input"); ck.type = "checkbox"; ck.checked = true; ck.onchange = () => this.click = ck.checked;
      bar.append(this.playBtn, stopB, this.recBtn, undo, clear, lab("Tempo", this.tempoIn), lab("Bars", barsSel), lab("Quantize", qSel), lab("Click", ck));
      this.patC = h("canvas", "sp-patc"); this.patC.height = 54;
      pat.append(bar, this.patC); el.append(pat);
      el.addEventListener("keydown", e => { if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
        const i = KEYS.indexOf(e.key.toLowerCase()); if (i >= 0) { e.preventDefault(); this.hit(i); } });
      el.addEventListener("keyup", e => { const i = KEYS.indexOf(e.key.toLowerCase()); if (i >= 0) this.release(i); });
      this.drawEdit(); this.drawPattern();
    }
    playWhole() { if (!this.buffer) return; const c = A().ctx(); if (this.whole) { try { this.whole.stop(); } catch (e) {} this.whole = null; return; }
      const s = c.createBufferSource(); s.buffer = this.buffer; s.connect(out()); s.start(); this.whole = s; s.onended = () => this.whole = null; }
    drawPads() { if (!this.padEls) return; this.padEls.forEach((b, i) => { b.classList.toggle("sp-sel", i === this.sel); b.disabled = !this.slices[i]; }); }
    drawEdit() {
      const e = this.edit, i = this.sel, p = this.pads[i]; e.innerHTML = ""; e.append(h("div", "sp-edtitle", "Pad " + (i + 1)));
      const row = (label, inp, val) => { const l = h("label", "sp-row"); l.append(h("span", "", label), inp); if (val) l.append(val); e.append(l); };
      const rng = (min, max, step, k, fmt) => { const r = h("input"); r.type = "range"; r.min = min; r.max = max; r.step = step; r.value = p[k]; const v = h("span", "sp-val", fmt(p[k]));
        r.oninput = () => { p[k] = +r.value; v.textContent = fmt(p[k]); }; r.onchange = () => this.hit(i); return [r, v]; };
      const [pr, pv] = rng(-12, 12, 1, "pitch", x => (x > 0 ? "+" : "") + x + " st"); row("Pitch", pr, pv);
      const [sr, sv] = rng(0.5, 2, 0.05, "stretch", x => "×" + x.toFixed(2)); row("Length", sr, sv);
      const m = h("select"); for (const [v, t] of [["repitch", "Repitch (speed + pitch together)"], ["stretch", "Stretch (pitch and length apart)"]]) { const o = h("option", "", t); o.value = v; m.append(o); }
      m.value = p.mode; m.onchange = () => { p.mode = m.value; this.hit(i); }; row("Mode", m);
      const chk = (k, t) => { const c = h("input"); c.type = "checkbox"; c.checked = p[k]; c.onchange = () => { p[k] = c.checked; if (k === "reverse") this.hit(i); }; row(t, c); };
      chk("reverse", "Reverse"); chk("gate", "Gate (only while held)");
      const [lr, lv] = rng(0, 1.5, 0.05, "level", x => Math.round(x * 100) + "%"); row("Level", lr, lv);
      const s = this.slices[i]; if (s) e.append(h("div", "sp-hint", "Slice " + s.start.toFixed(3) + "–" + s.end.toFixed(3) + " s (" + Math.round((s.end - s.start) * 1000) + " ms)"));
    }
    waveDrag() {
      const c = this.wave; let drag = -1;
      const tAt = e => { const r = c.getBoundingClientRect(); return (e.clientX - r.left) / r.width * (this.buffer ? this.buffer.duration : 1); };
      c.addEventListener("pointerdown", e => { if (!this.buffer) return; const t = tAt(e), px = this.buffer.duration / (c.clientWidth || 600);
        drag = this.slices.findIndex((s, i) => i > 0 && Math.abs(s.start - t) < px * 5);
        if (drag > 0) c.setPointerCapture(e.pointerId); else { drag = -1; const i = this.slices.findIndex(s => t >= s.start && t < s.end); if (i >= 0) this.hit(i); } });
      c.addEventListener("pointermove", e => { if (drag > 0) this.setSlice(drag, tAt(e)); });
      c.addEventListener("pointerup", () => { if (drag > 0) { this.drawEdit(); this.hit(drag); } drag = -1; });
    }
    drawWave() {
      const c = this.wave, w = c.clientWidth || 600; if (c.width !== w) c.width = w; const g = c.getContext("2d"), H = c.height; g.clearRect(0, 0, w, H);
      if (!this.peaks) return; const n = this.peaks.length, dur = this.buffer.duration, ink = css("--site-ink-2") || "#888";
      const s = this.slices[this.sel]; if (s) { g.fillStyle = "rgba(224,176,32,.22)"; g.fillRect(s.start / dur * w, 0, (s.end - s.start) / dur * w, H); }
      g.fillStyle = "#3a8fd0"; for (let x = 0; x < w; x++) { const v = this.peaks[Math.floor(x / w * n)]; g.fillRect(x, H / 2 - v * H / 2, 1, v * H || 0.5); }
      g.fillStyle = ink; g.font = "10px monospace";
      this.slices.forEach((sl, i) => { const x = sl.start / dur * w; g.fillRect(x, 0, i ? 2 : 1, H); g.fillText(String(i + 1), x + 3, 10); });
    }
    drawPattern() {
      const c = this.patC; if (!c) return; const w = c.clientWidth || 600; if (c.width !== w) c.width = w; const g = c.getContext("2d"), H = c.height, total = this.bars * 16;
      g.clearRect(0, 0, w, H); const ink = css("--site-ink-2") || "#888";
      for (let s = 0; s <= total; s++) { g.fillStyle = ink; g.globalAlpha = s % 16 === 0 ? 0.9 : s % 4 === 0 ? 0.5 : 0.18; g.fillRect(s / total * w, 0, 1, H); }
      g.globalAlpha = 1; g.fillStyle = "#d0703a";
      for (const e of this.pattern) { const x = e.step / total * w, y = (15 - e.pad) / 16 * (H - 4) + 2; g.fillRect(x, y, Math.max(3, w / total - 2), 3); }
      if (this.playing && this.posStep >= 0) { g.fillStyle = "#e03a2a"; g.fillRect(this.posStep / total * w, 0, 2, H); }
    }
  }
  function init(root) { (root || document).querySelectorAll(".sp-pads:not(.sp-made)").forEach(el => new Pads(el)); }
  window.SamplerPads = { init, all, byId: id => all.find(p => p.id === id), KEYS };
})();
