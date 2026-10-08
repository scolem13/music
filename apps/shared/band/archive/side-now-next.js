// ARCHIVED 2026-10-08. Not loaded by any page.
//
// The first chord diagram beside the Backing Track chart: ONE small keyboard (or fretboard, when the
// guitar comps) showing two chords at once, the chord sounding NOW (teal) and the NEXT different chord
// (amber, a shared key split in two; on the fretboard now = filled dot, next = ring).
// "Now" was the comp event the band had generated for the chord; "next" a pinned voicing or
// BandHarmony.peek() from the notes sounding ("likely").
//
// It was replaced in tools/_backing-track.qmd by the Chord Sheet's own superimposed view (an embedded
// tools/chord-sheet.html?embed=super) with the same two colours. To bring this one back: paste the
// script section below into the page's IIFE in place of the current "chord diagram beside the chart"
// section, the CSS into its <style>, make #bt-side hold only <div id="bt-side-body"></div>, and add
// `sideRecs[rec.bar] = rec; delete sideRecs[rec.bar - 4];` to the player's onBarEvents.
// It uses the page's enSlots(), enNames(), compDef(), voicingChoice(), practice(), pins, state, player.

/* ---------------------------------- CSS ----------------------------------
/* the chart with the chord diagram beside it (above it on a narrow screen) * /
#bt-root .bt-chartrow{display:flex;gap:1rem;align-items:flex-start}
#bt-root .bt-chartrow #bt-chart{flex:1 1 0;min-width:0}
#bt-root .bt-side{flex:0 0 clamp(16rem,27vw,25rem);position:sticky;top:4.5rem;padding:.7rem .8rem;border:1px solid var(--site-border,#e0d8ce);border-radius:10px;background:var(--site-surface,#fff);
  --bt-now:#1f8f83;--bt-next:#e08a1e}
#bt-root .bt-side svg{display:block;width:100%;height:auto;margin-top:.5rem}
#bt-root .bt-side p{margin:0 0 .25rem;font-size:.92rem;line-height:1.35}
#bt-root .bt-side p b{font-size:1.1rem;margin-right:.35rem}
#bt-root .bt-side p small{color:var(--site-ink-2,#5c5246)}
#bt-root .bt-side .bt-sw{display:inline-block;width:.85rem;height:.85rem;border-radius:50%;margin-right:.4rem;vertical-align:-.08rem;background:var(--bt-now)}
#bt-root .bt-side .bt-sw.is-next{background:transparent;box-shadow:inset 0 0 0 .22rem var(--bt-next)}
#bt-root .bt-side .bt-side-tag{display:inline-block;min-width:2.7rem;font:600 .68rem/1 var(--font-mono,monospace);letter-spacing:.06em;text-transform:uppercase;color:var(--site-ink-2,#5c5246)}
@media (max-width:900px){
  #bt-root .bt-chartrow{flex-direction:column}
  #bt-root .bt-chartrow #bt-chart{flex:none;width:100%}
  #bt-root .bt-side{order:-1;position:static;flex:none;width:100%;box-sizing:border-box}
}

--------------------------------------------------------------------------- */

/* --------------------------- script section ------------------------------ */
  // ---- the chord diagram beside the chart: the chord sounding now and the one that follows, in two colours ----
  // "Now" is what the comping instrument actually played for the chord when the bar has been generated;
  // "next" is a voicing you set, or the one the band would move to from here (it may choose otherwise).
  var sideInfo = null, sideRecs = {}, sideLast = null, sideSig = "", sideReady = true;
  function sideOn(){ return $("bt-side-on").checked; }
  function sidePick(rec, slot, beat){                                    // the latest comp chord for this slot at or before `beat`
    var best = null;
    ((rec && rec.parts && rec.parts.comp) || []).forEach(function(e){
      if (e.of !== slot.key || e.passing || e.arp || !e.midis || !e.midis.length) return;
      if (!best || (e.pos <= beat + 0.01 && e.pos >= best.pos)) best = e; });
    return best ? { midis: best.midis.slice().sort(function(a, b){ return a - b; }), strings: best.strings || null, how: "" } : null;
  }
  function sideGuess(slot, prev){
    var pin = pins && pins.map[slot.key], c = compDef();
    if (pin && pin.length) return { midis: pin.slice().sort(function(a, b){ return a - b; }), strings: (c.inst === "guitar" && BandHarmony.gripOf(pin)) || null, how: pins.mine ? "your voicing" : "pinned" };
    var r = BandHarmony.peek(slot.chord, String(voicingChoice()).split("+")[0], prev || null, c.inst);
    return r.midis.length ? { midis: r.midis.slice().sort(function(a, b){ return a - b; }), strings: r.strings, how: "likely" } : null;
  }
  function sideNext(slots, i){ for (var k = 1; k < slots.length; k++){ var o = slots[(i + k) % slots.length]; if (o.chord.key !== slots[i].chord.key) return o; } return null; }
  function sideBeat(beat){
    if (!sideOn() || !sideInfo || sideInfo.ending) return;
    var slots = enSlots(), info = sideInfo, i = -1; if (!slots.length) return;
    if (info.countIn || info.index < 0){                                   // before the top: nothing sounds yet, the first chord is next
      var first = slots[player && info.countIn ? Math.max(0, slots.map(function(o){ return o.bar; }).indexOf((practice().cyc ? practice().from : practice().start) - 1)) : 0];
      sideDraw(null, null, first, sideGuess(first, null)); return; }
    slots.forEach(function(o, k){ if (o.bar === info.index && o.pos <= beat + 1e-6) i = k; });
    if (i < 0) return;
    var cur = slots[i], rec = sideRecs[info.bar], next = sideNext(slots, i);
    var cv = sidePick(rec, cur, beat) || (sideLast && sideLast.key === cur.key ? sideLast.v : null) || (sideLast && sideLast.ckey === cur.chord.key ? sideLast.v : null) || sideGuess(cur, sideLast && sideLast.v.midis);
    if (cv) sideLast = { key: cur.key, ckey: cur.chord.key, v: cv };
    var nv = next ? (sidePick(rec, next, 99) || sideGuess(next, cv && cv.midis)) : null;
    sideDraw(cur, cv, next, nv);
  }
  // not playing: the chord at the start bar (or the one being voiced) and the one after it
  function sideIdle(){
    if (!sideReady || !$("bt-side")) return;
    $("bt-side").hidden = !sideOn();
    if (!sideOn() || state === "playing" || !parsedC) return;
    var slots = enSlots(); if (!slots.length){ sideSig = ""; $("bt-side-body").innerHTML = "<p>No chords yet.</p>"; return; }
    var i = 0, p = practice(), at = (p.cyc ? p.from : p.start) - 1;
    if (enLis && enVoicing() && $("bt-entry").open) i = Math.min(Math.max(0, enVAt), slots.length - 1);
    else slots.some(function(o, k){ if (o.bar === at){ i = k; return true; } return false; });
    var cur = slots[i], next = sideNext(slots, i), cv = sideGuess(cur, null);
    sideLast = null; sideDraw(cur, cv, next, next ? sideGuess(next, cv && cv.midis) : null);
  }
  function sideLine(tag, slot, v, cls){
    if (!slot) return '<p><span class="bt-sw ' + cls + '"></span><span class="bt-side-tag">' + tag + '</span> <small>count-in</small></p>';
    return '<p><span class="bt-sw ' + cls + '"></span><span class="bt-side-tag">' + tag + '</span> <b>' + TuneChart.fmtChord(slot.chord.sym, 0, true) + '</b>' +
      (v ? enNames(v.midis).replace(/b/g, "\u266d").replace(/#/g, "\u266f") + (v.how ? " <small>(" + v.how + ")</small>" : "") : "<small>the band rests</small>") + '</p>';
  }
  function sideKeys(a, b){
    var all = a.concat(b), lo = Math.min.apply(null, all.concat([43])), hi = Math.max.apply(null, all.concat([79]));
    lo -= ((lo % 12) + 12) % 12; hi += 11 - (((hi % 12) + 12) % 12);
    var W = 14, H = 84, BW = 9, BH = 52, x = 0, whites = "", blacks = "", inA = {}, inB = {}, NOW = "var(--bt-now)", NEXT = "var(--bt-next)";
    a.forEach(function(m){ inA[m] = 1; }); b.forEach(function(m){ inB[m] = 1; });
    function key(m, kx, w, h, base){
      var s = '<rect x="' + kx + '" y="0" width="' + w + '" height="' + h + '" fill="' + (inA[m] && !inB[m] ? NOW : inB[m] && !inA[m] ? NEXT : base) + '" stroke="#3a342c" stroke-width="0.6"/>';
      if (inA[m] && inB[m]) s += '<rect x="' + kx + '" y="0" width="' + w / 2 + '" height="' + h + '" fill="' + NOW + '"/><rect x="' + (kx + w / 2) + '" y="0" width="' + w / 2 + '" height="' + h + '" fill="' + NEXT + '"/>' +
        '<rect x="' + kx + '" y="0" width="' + w + '" height="' + h + '" fill="none" stroke="#3a342c" stroke-width="0.6"/>';
      return s;
    }
    for (var m = lo; m <= hi; m++){
      var pc = m % 12, black = [1, 3, 6, 8, 10].indexOf(pc) >= 0;
      if (black) blacks += key(m, x - BW / 2, BW, BH, "#2a2622");
      else { whites += key(m, x, W, H, "#fff") + (pc === 0 ? '<text x="' + (x + W / 2) + '" y="' + (H + 9) + '" font-size="7" text-anchor="middle" fill="#6b6257">C' + (Math.floor(m / 12) - 1) + '</text>' : ""); x += W; }
    }
    return '<svg viewBox="-1 -1 ' + (x + 2) + ' ' + (H + 13) + '" role="img" aria-label="Keyboard">' + whites + blacks + '</svg>';
  }
  function sideFrets(a, b){
    var all = a.concat(b), top = Math.max.apply(null, all.map(function(s){ return s.fret; }).concat([5])), lo = Math.max(0, Math.min.apply(null, all.filter(function(s){ return s.fret > 0; }).map(function(s){ return s.fret; }).concat([99])) - 1);
    if (lo === 98 || lo < 2) lo = 0; var n = Math.max(5, top - lo + 1), FW = 30, SH = 15, L = 26, s = "", f, i;
    for (i = 0; i < 6; i++) s += '<line x1="' + L + '" y1="' + (10 + i * SH) + '" x2="' + (L + n * FW) + '" y2="' + (10 + i * SH) + '" stroke="#6b6257" stroke-width="' + (0.7 + i * 0.22) + '"/>';
    for (f = 0; f <= n; f++) s += '<line x1="' + (L + f * FW) + '" y1="10" x2="' + (L + f * FW) + '" y2="' + (10 + 5 * SH) + '" stroke="#3a342c" stroke-width="' + (f === 0 && lo === 0 ? 3 : 1) + '"/>';
    for (f = 1; f <= n; f++) s += '<text x="' + (L + (f - 0.5) * FW) + '" y="' + (10 + 5 * SH + 14) + '" font-size="8" text-anchor="middle" fill="#6b6257">' + (lo + f) + '</text>';
    function xy(d){ return { x: d.fret === 0 ? L - 11 : L + (d.fret - lo - 0.5) * FW, y: 10 + (5 - d.string) * SH }; }   // string 0 = the lowest, drawn at the bottom
    a.forEach(function(d){ var p = xy(d); s += '<circle cx="' + p.x + '" cy="' + p.y + '" r="5.2" fill="var(--bt-now)"/>'; });
    b.forEach(function(d){ var p = xy(d); s += '<circle cx="' + p.x + '" cy="' + p.y + '" r="7" fill="none" stroke="var(--bt-next)" stroke-width="2.6"/>'; });
    return '<svg viewBox="0 0 ' + (L + n * FW + 8) + ' ' + (10 + 5 * SH + 18) + '" role="img" aria-label="Fretboard">' + s + '</svg>';
  }
  function sideDraw(cur, cv, next, nv){
    var sig = [cur && cur.key, cv && cv.midis.join(","), next && next.key, nv && nv.midis.join(","), nv && nv.how, compDef().inst].join("|");
    if (sig === sideSig) return; sideSig = sig;
    var a = cv ? cv.midis : [], b = nv ? nv.midis : [], fret = compDef().inst === "guitar" && (!cv || cv.strings) && (!nv || nv.strings) && (cv || nv);
    $("bt-side-body").innerHTML = sideLine("Now", cur, cv, "") + (next ? sideLine("Next", next, nv, "is-next") : "") +
      (fret ? sideFrets(cv ? cv.strings : [], nv ? nv.strings : []) : (a.length || b.length) ? sideKeys(a, b) : "");
  }
  try { if (localStorage.getItem("btSide") === "off") $("bt-side-on").checked = false; } catch (e) {}
  $("bt-side-on").addEventListener("change", function(){ try { localStorage.setItem("btSide", sideOn() ? "on" : "off"); } catch (e) {} sideSig = ""; sideIdle(); });
  ["bt-start", "bt-cyc-on", "bt-cyc-from"].forEach(function(id){ $(id).addEventListener("change", sideIdle); });

