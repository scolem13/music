// tune-chart.js — shared iRealPro-style chord-chart renderer for ABC tunes.
// Used by BOTH the Chord Sheet (Stage Edition) tool and the Tune Assessment page, so
// chart features (sub-bar beat lines, beat-accurate chord placement, transposition…)
// live in one place. The host supplies a container + an ABC string; we parse the music
// (tracking note durations so each chord sits at its real beat) and build the grid.
//
//   var chart = TuneChart.render(containerEl, abcString, {
//     subBarBeats: 0,        // 0 = off, or draw a faint line every N beats (1, 2, …)
//     transpose: 0,          // semitones to transpose the chord symbols
//     preferFlats: true,     // spell transposed roots with flats (else sharps)
//     header: true,          // render a title + key/meter line inside the chart
//     barsPerRow: 4
//   });
//   chart.parsed                 // {title, composer, keyPc, keyName, meterN, meterD, …}
//   chart.barEls                 // the bar <div>s, in order (for highlighting)
//   chart.setSubBars(n)          // toggle/redraw beat lines
//   chart.setTranspose(semis)    // re-render in a new key
//   chart.setLive(i)             // mark bar i as the sounding bar (-1 = none)
//   chart.redraw()

(function (global) {
  var FLAT  = ["C","D♭","D","E♭","E","F","G♭","G","A♭","A","B♭","B"];
  var SHARP = ["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];
  var ASCII_FLAT = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  var PC = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  var TUPLET_TIME = { 2:3, 3:2, 4:3, 5:2, 6:2, 7:2, 8:3, 9:2 };   // default "in time of"

  function mod12(n){ return ((n % 12) + 12) % 12; }
  function esc(s){ return String(s).replace(/[&<>]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c]; }); }

  // ---- header fields ----
  function field(abc, tag){ var m = new RegExp("^"+tag+":\\s*(.+)$","m").exec(abc); return m ? m[1].trim() : ""; }
  function keyPcOf(k){ var m = /^([A-Ga-g])([#b]?)/.exec(k || ""); if (!m) return 0;
    return mod12(PC[m[1].toUpperCase()] + (m[2]==="#"?1:m[2]==="b"?-1:0)); }

  // meter "C" / "C|" / "n/d" / "none" -> {n, d}.  beat unit = 1/d note.
  function parseMeter(s){
    s = (s || "").trim();
    if (s === "C") return { n:4, d:4 };
    if (s === "C|") return { n:2, d:2 };
    var m = /^(\d+)\s*\/\s*(\d+)$/.exec(s);
    if (m) return { n:parseInt(m[1],10), d:parseInt(m[2],10) };
    return { n:4, d:4 };                                    // "none" / unknown → assume 4/4
  }
  // L: "1/8" -> whole-note fraction. If absent, ABC default depends on the meter.
  function parseUnit(abc, meter){
    var m = /^L:\s*(\d+)\s*\/\s*(\d+)/m.exec(abc);
    if (m) return parseInt(m[1],10) / parseInt(m[2],10);
    return (meter.n / meter.d) < 0.75 ? 1/16 : 1/8;         // standard ABC fallback
  }

  // ---- duration of one note token starting at text[i] (the letter is at `li`) ----
  // returns the duration in L-units for `num[/den]` style suffixes.
  function readDuration(text, i){
    var num = "", j = i;
    while (j < text.length && /\d/.test(text[j])) { num += text[j]; j++; }
    var den = 1, slashes = 0;
    while (j < text.length && text[j] === "/") { slashes++; j++; var d = ""; while (j < text.length && /\d/.test(text[j])) { d += text[j]; j++; }
      if (d) { den = parseInt(d, 10); break; } }
    if (slashes && den === 1) den = Math.pow(2, slashes);    // "/" = /2, "//" = /4
    var dur = (num ? parseInt(num, 10) : 1) / den;
    return { dur: dur, next: j };
  }

  // ---- parse the whole tune into bars with beat-positioned chords ----
  function parse(abc){
    var meter = parseMeter(field(abc, "M"));
    var unit  = parseUnit(abc, meter);                       // L-unit in whole notes
    var unitsPerBar  = (meter.n / meter.d) / unit;           // L-units in a full bar
    var unitsPerBeat = (1 / meter.d) / unit;                 // L-units per beat (1/d note)
    var keyField = field(abc, "K"), keyPc = keyPcOf(keyField);

    // music = every non-header, non-directive line joined
    var music = abc.split("\n").filter(function(l){ var t = l.trim();
      return t && !/^[A-Za-z]:/.test(t) && !/^%/.test(t); }).join(" ");

    var bars = [], pendingLeft = "plain", pendingEnding = null;
    function newBar(){ return { chords:[], left:pendingLeft, right:"plain", ending:pendingEnding, lengthUnits:0 }; }
    var cur = newBar(), content = false, pos = 0;
    var lastDur = 0, brokenMul = 1, tupletLeft = 0, tupletMul = 1;

    function flush(right){
      if (!content && !cur.chords.length){ if (right === "repeat-open") pendingLeft = "repeat-open"; return; }
      cur.right = right; cur.lengthUnits = pos; bars.push(cur);
      pendingLeft = (right === "repeat-close-open") ? "repeat-open" : "plain";
      pendingEnding = null; cur = newBar(); content = false; pos = 0; lastDur = 0; brokenMul = 1; tupletLeft = 0; tupletMul = 1;
    }
    function applyMods(dur){
      if (tupletLeft > 0){ dur *= tupletMul; tupletLeft--; if (tupletLeft === 0) tupletMul = 1; }
      if (brokenMul !== 1){ dur *= brokenMul; brokenMul = 1; }
      return dur;
    }

    var i = 0;
    while (i < music.length){
      var c = music[i];
      if (c === ' '){ i++; continue; }
      if (c === '"'){ var e = music.indexOf('"', i+1); if (e < 0) break;
        var s = music.slice(i+1, e).trim(); if (/^[A-G]/.test(s)) { cur.chords.push({ sym:s, onset:pos }); content = true; } i = e+1; continue; }
      if (c === '!'){ var e2 = music.indexOf('!', i+1); if (e2 >= 0){ i = e2+1; continue; } }
      if (c === '{'){ var e3 = music.indexOf('}', i+1); if (e3 >= 0){ i = e3+1; continue; } } // grace notes: 0 dur
      if (c === '>'){ pos += 0.5 * lastDur; brokenMul = 0.5; i++; continue; }                 // broken rhythm A>B
      if (c === '<'){ pos -= 0.5 * lastDur; brokenMul = 1.5; i++; continue; }                 // broken rhythm A<B
      // tuplet "(p" (vs slur "(")
      if (c === '(' && /\d/.test(music[i+1] || "")){ var p = parseInt(music[i+1], 10);
        tupletLeft = p; tupletMul = (TUPLET_TIME[p] || 2) / p; i += 2;
        if (music[i] === ':'){ while (i < music.length && /[:\d]/.test(music[i])) i++; }       // (p:q:r — ignore q/r
        continue; }
      if (c === '(' || c === ')' || c === '-'){ i++; continue; }                              // slurs / ties
      // inline field or note-chord group in brackets
      if (c === '['){
        if (/^[A-Z]:/.test(music.slice(i+1))){ var ef = music.indexOf(']', i+1); if (ef >= 0){ i = ef+1; continue; } }
        var eg = music.indexOf(']', i+1);
        if (eg >= 0){ var d = readDuration(music, eg+1); var dur = applyMods(d.dur); pos += dur; lastDur = dur; content = true; i = d.next; continue; }
      }
      // barlines (longest match first)
      if (music.substr(i,2) === "|]"){ flush("final"); i += 2; continue; }
      if (music.substr(i,2) === ":|" && music[i+2] === ":"){ flush("repeat-close-open"); i += 3; continue; }
      if (music.substr(i,2) === "::"){ flush("repeat-close-open"); i += 2; continue; }
      if (music.substr(i,2) === ":|"){ flush("repeat-close"); i += 2; continue; }
      if (music.substr(i,2) === "|:"){ flush("plain"); cur.left = pendingLeft = "repeat-open"; i += 2; continue; } // also tag the already-created next bar
      if (music.substr(i,2) === "||"){ flush("double"); i += 2; continue; }
      if (music.substr(i,2) === "[|"){ flush("double"); i += 2; continue; }
      if (c === '|'){ flush("plain"); i += 1; continue; }
      // note: [accidental][letter][octave marks][duration]
      var nm = /^(\^\^|\^|__|_|=)?([A-Ga-gxzZ])([,']*)/.exec(music.slice(i));
      if (nm){
        var dd = readDuration(music, i + nm[0].length);
        var dur2 = applyMods(dd.dur);
        pos += dur2; lastDur = dur2;                          // octave marks (nm[2]) don't affect duration
        content = true; i = dd.next; continue;
      }
      i++;                                                    // decorations / stray chars
    }
    if (content || cur.chords.length){ cur.right = (cur.right === "plain") ? "final" : cur.right; cur.lengthUnits = pos; bars.push(cur); }

    // Anacrusis (pickup): a partial leading bar. The first FULL bar is measure 1; the
    // pickup is measure 0. Numbering ripples from there (used by the chart + the
    // recording count-off so every tool agrees on "measure 1").
    var anacrusis = bars.length > 1 && (bars[0].lengthUnits + 1e-6) < unitsPerBar;
    var anacrusisUnits = anacrusis ? bars[0].lengthUnits : 0;
    if (anacrusis) bars[0].anacrusis = true;
    for (var bi = 0, mno = anacrusis ? 0 : 1; bi < bars.length; bi++) bars[bi].measureNo = mno++;

    // Per-tune layout, hard-codable in the ABC (opts can still override at render):
    //   %%score-bars N         → N measures per line (instead of the default 4)
    //   %%score-breaks a,b,c   → explicit measures-per-line for successive lines
    var bprM = /^%%\s*score-bars\s+(\d+)/m.exec(abc);
    var brkM = /^%%\s*score-breaks\s+([\d,\s]+)/m.exec(abc);
    var lineBreaks = brkM ? brkM[1].split(",").map(function(x){ return parseInt(x,10); }).filter(function(x){ return x > 0; }) : null;

    return {
      title: field(abc, "T") || "Untitled", composer: field(abc, "C"),
      meterStr: field(abc, "M") || "", meterN: meter.n, meterD: meter.d,
      keyField: keyField, keyPc: keyPc,
      unitsPerBar: unitsPerBar, unitsPerBeat: unitsPerBeat, beatsPerBar: meter.n,
      anacrusis: anacrusis, anacrusisUnits: anacrusisUnits,
      barsPerRow: bprM ? parseInt(bprM[1], 10) : 0, lineBreaks: lineBreaks,
      bars: bars, abc: abc, playOrder: computePlayOrder(bars)
    };
  }

  // Expand repeats into the sequence of WRITTEN-bar indices that playback visits, so a
  // measure-by-measure cursor (which follows the expanded timeline) can map each step
  // back to the right written bar. Handles |: … :| (incl. an implicit start-of-tune
  // open), :: , and skips 1st-ending bars on the repeat pass.
  function computePlayOrder(bars){
    var order = [], n = bars.length, startStack = [0];
    for (var i = 0; i < n; i++){
      var b = bars[i];
      if (b.left === "repeat-open") startStack.push(i);
      order.push(i);
      if (b.right === "repeat-close" || b.right === "repeat-close-open"){
        var start = startStack[startStack.length - 1];
        for (var j = start; j <= i; j++){ if (bars[j].ending === 1) continue; order.push(j); }
        if (startStack.length > 1) startStack.pop();
      }
    }
    return order;
  }

  // ---- chord symbol formatting + transpose ----
  function transposeSym(sym, semis, preferFlats){
    if (!semis) return sym;
    var names = preferFlats ? ASCII_FLAT : ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    return sym.replace(/([A-G])([#b]*)/g, function(m, L, acc){
      var pc = PC[L]; for (var k=0;k<acc.length;k++) pc += (acc[k]==="#"?1:-1);
      return names[mod12(pc + semis)];
    });
  }
  function fmtChord(sym, semis, preferFlats){
    sym = transposeSym(sym, semis, preferFlats);
    var bass = "", slash = sym.indexOf("/");
    if (slash >= 0){ bass = sym.slice(slash+1); sym = sym.slice(0, slash); }
    var m = /^([A-G][#b]*)(.*)$/.exec(sym); if (!m) return esc(sym);
    var pretty = function(s){ return esc(s).replace(/#/g,"♯").replace(/b/g,"♭"); };
    var html = '<span class="tc-rt">'+pretty(m[1])+'</span>';
    if (m[2]) html += '<span class="tc-q">'+pretty(m[2])+'</span>';
    if (bass) html += '<span class="tc-bass">/'+pretty(bass)+'</span>';
    return html;
  }
  // current key name for the header, given transpose
  function keyName(keyPc, semis, preferFlats){ return (preferFlats ? FLAT : SHARP)[mod12(keyPc + semis)]; }

  // ---- one-time scoped CSS ----
  function injectCss(){
    if (document.getElementById("tune-chart-css")) return;
    if (!document.getElementById("tune-chart-fonts")){            // load the chart fonts once
      var lk = document.createElement("link"); lk.id = "tune-chart-fonts"; lk.rel = "stylesheet";
      lk.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=JetBrains+Mono:wght@500;600&display=swap";
      document.head.appendChild(lk);
    }
    var css = ''
    + '.tune-chart{--tc-paper:#f4efe2;--tc-paper-2:#f7f2e6;--tc-edge:#e6dcc4;--tc-line:#cdbf9f;'
    +   '--tc-ink:#22201b;--tc-faint:#b7a987;--tc-sub:#d9ccae;--tc-live:#3fc2b4;--tc-live-soft:rgba(63,194,180,.16);'
    +   'background:linear-gradient(180deg,var(--tc-paper-2),var(--tc-paper));color:var(--tc-ink);'
    +   'border:1px solid var(--tc-edge);border-radius:6px;padding:clamp(1rem,2.4vw,1.8rem);font-family:"Oswald",sans-serif}'
    + '.tune-chart .tc-head{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;flex-wrap:wrap;'
    +   'border-bottom:2px solid var(--tc-ink);padding-bottom:.6rem;margin-bottom:1rem}'
    + '.tune-chart .tc-title{font-weight:700;text-transform:uppercase;letter-spacing:.02em;font-size:clamp(1.1rem,2.6vw,1.7rem);line-height:1}'
    + '.tune-chart .tc-by{font-family:Inter,system-ui,sans-serif;font-size:.78rem;color:#6f6450;font-style:italic;margin-top:.25rem}'
    + '.tune-chart .tc-meta{font-family:"JetBrains Mono",monospace;font-size:.8rem;color:#6f6450;text-align:right;white-space:nowrap}'
    + '.tune-chart .tc-meta b{color:var(--tc-ink);font-weight:600}'
    + '.tune-chart.tc-has-pickup{padding-top:calc(clamp(1rem,2.4vw,1.8rem) + .6rem)}'
    + '.tune-chart .tc-pickup{display:inline-flex;align-items:center;gap:.45rem;margin:0 0 .55rem;padding:.18rem .55rem;'
    +   'border:1.5px solid var(--tc-ink);border-radius:4px;background:rgba(0,0,0,.03);'
    +   'font-family:"JetBrains Mono",monospace;font-size:.62rem;text-transform:uppercase;letter-spacing:.12em;color:var(--tc-ink);transition:background .14s}'
    + '.tune-chart .tc-pickup .tc-pk-arrow{font-size:.9rem;line-height:1}'
    + '.tune-chart .tc-pickup .tc-pk-chord{font-family:"Oswald",sans-serif;font-size:1.05rem;letter-spacing:0;font-weight:600}'
    + '.tune-chart .tc-pickup.tc-live{background:var(--tc-live-soft);border-color:var(--tc-live)}'
    + '.tune-chart .tc-systems{display:flex;flex-direction:column;gap:.5rem}'
    + '.tune-chart .tc-system{display:grid;border-left:2px solid var(--tc-ink)}'
    + '.tune-chart .tc-bar{position:relative;min-height:60px;border-right:2px solid var(--tc-ink);'
    +   'border-top:1px solid var(--tc-line);border-bottom:1px solid var(--tc-line);overflow:hidden;transition:background .14s}'
    + '.tune-chart .tc-subline{position:absolute;top:0;bottom:0;width:1px;background:var(--tc-sub);pointer-events:none}'
    + '.tune-chart .tc-chord{position:absolute;top:50%;transform:translateY(-50%);white-space:nowrap;font-weight:600;line-height:.9;letter-spacing:.01em}'
    + '.tune-chart .tc-rt{font-size:1.6rem}'
    + '.tune-chart.tc-roman-mode .tc-rt{font-size:1.3rem;font-family:"JetBrains Mono",monospace;letter-spacing:.01em}'
    + '.tune-chart .tc-q{font-size:.95rem;font-weight:600;position:relative;top:-.55em;margin-left:.02em;color:#3a352b}'
    + '.tune-chart .tc-bass{font-size:1rem;color:#6f6450}'
    + '.tune-chart .tc-bar.tc-empty::after{content:"/";position:absolute;left:.7rem;top:50%;transform:translateY(-50%);color:var(--tc-faint);font-size:1.25rem}'
    + '.tune-chart .tc-bar[data-right="double"]{box-shadow:3px 0 0 -1px var(--tc-ink)}'
    + '.tune-chart .tc-bar[data-right="final"]{box-shadow:5px 0 0 -1px var(--tc-ink)}'
    + '.tune-chart .tc-bar[data-right="repeat-close"]{box-shadow:4px 0 0 -1px var(--tc-ink)}'
    + '.tune-chart .tc-bar[data-right="repeat-close"]::before{content:"";position:absolute;right:5px;top:50%;transform:translateY(-50%);width:4px;height:4px;border-radius:50%;background:var(--tc-ink);box-shadow:0 -8px 0 var(--tc-ink)}'
    + '.tune-chart .tc-bar[data-left="repeat-open"]{box-shadow:inset 3px 0 0 -1px var(--tc-ink)}'
    + '.tune-chart .tc-bar[data-left="repeat-open"] .tc-open{position:absolute;left:4px;top:50%;transform:translateY(-50%);width:4px;height:4px;border-radius:50%;background:var(--tc-ink);box-shadow:0 -8px 0 var(--tc-ink)}'
    + '.tune-chart .tc-ending{position:absolute;top:2px;left:5px;font-family:"JetBrains Mono",monospace;font-size:.62rem;color:var(--tc-ink);border-top:1.5px solid var(--tc-ink);border-left:1.5px solid var(--tc-ink);padding:1px 0 0 3px;min-width:1.3em}'
    + '.tune-chart .tc-bar.tc-live{background:var(--tc-live-soft)}'
    + '.tune-chart .tc-bar.tc-live::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--tc-live)}'
    + '.tune-chart .tc-bar.tc-live .tc-chord{color:#0c5a52}'
    + '@media (max-width:560px){.tune-chart .tc-rt{font-size:1.3rem}}';
    var st = document.createElement("style"); st.id = "tune-chart-css"; st.textContent = css; document.head.appendChild(st);
  }

  // ---- render ----
  function render(container, abc, opts){
    injectCss();
    opts = opts || {};
    var state = {
      parsed: (typeof abc === "string") ? parse(abc) : abc,
      subBarBeats: opts.subBarBeats || 0,
      transpose: opts.transpose || 0,
      preferFlats: opts.preferFlats !== false,
      roman: !!opts.roman,
      header: opts.header !== false,
      opts: opts,           // keep the explicit overrides; per-tune layout is read in draw()
      barEls: [], liveBar: -2
    };
    container.classList.add("tune-chart");

    // group the measure-bar indices into rows: explicit lineBreaks win, else barsPerRow
    function buildRows(indices, perRow, lineBreaks){
      var rows = [], i = 0;
      if (lineBreaks && lineBreaks.length){
        for (var L = 0; i < indices.length; L++){
          var n = (L < lineBreaks.length) ? lineBreaks[L] : perRow;
          rows.push(indices.slice(i, i + n)); i += n;
        }
      } else { for (; i < indices.length; i += perRow) rows.push(indices.slice(i, i + perRow)); }
      return rows;
    }
    function fillChord(cell, bar, upb){
      bar.chords.forEach(function(ch){
        var el = document.createElement("span"); el.className = "tc-chord";
        el.style.left = "calc(" + (100 * ch.onset / upb) + "% + .55rem)";
        if (state.roman && global.TuneLibrary && TuneLibrary.roman){   // roman numerals instead of letter chords
          var rn = TuneLibrary.roman(ch.sym, state.parsed.keyPc);      // key-independent → transpose doesn't change it
          el.innerHTML = '<span class="tc-rt">' + esc(rn || ch.sym) + '</span>';
        } else {
          el.innerHTML = fmtChord(ch.sym, state.transpose, state.preferFlats);
        }
        cell.appendChild(el);
      });
    }

    function draw(){
      var p = state.parsed;
      var perRow = state.opts.barsPerRow || p.barsPerRow || 4;
      var lineBreaks = state.opts.lineBreaks || p.lineBreaks || null;
      var upb = p.unitsPerBar || 1, beats = p.beatsPerBar || 4;
      container.innerHTML = "";
      container.classList.toggle("tc-has-pickup", !!p.anacrusis);
      container.classList.toggle("tc-roman-mode", !!state.roman);
      state.barEls = new Array(p.bars.length); state.liveBar = -2;   // fresh DOM ⇒ re-apply highlight

      if (state.header){
        var h = document.createElement("div"); h.className = "tc-head";
        var left = document.createElement("div");
        var t = document.createElement("div"); t.className = "tc-title"; t.textContent = p.title; left.appendChild(t);
        if (p.composer){ var by = document.createElement("div"); by.className = "tc-by"; by.textContent = "by " + p.composer; left.appendChild(by); }
        var meta = document.createElement("div"); meta.className = "tc-meta";
        meta.innerHTML = "<b>" + keyName(p.keyPc, state.transpose, state.preferFlats) + "</b>"
          + (state.transpose ? " <span style='color:#9c7a3d'>(from " + FLAT[p.keyPc] + ")</span>" : "")
          + (p.meterStr ? "  ·  " + esc(p.meterStr) : "");
        h.appendChild(left); h.appendChild(meta); container.appendChild(h);
      }

      // pickup flag (top-left). It IS bar 0 for highlighting, so the live bar can sit on
      // it while the anacrusis plays. May carry the pickup's chord.
      if (p.anacrusis){
        var pk = document.createElement("div"); pk.className = "tc-pickup";
        var arrow = document.createElement("span"); arrow.className = "tc-pk-arrow"; arrow.textContent = "⤴"; pk.appendChild(arrow);
        var lab = document.createElement("span"); lab.textContent = "Pickup"; pk.appendChild(lab);
        var pkc = p.bars[0].chords;
        if (pkc && pkc.length){ var cc = document.createElement("span"); cc.className = "tc-pk-chord";
          cc.innerHTML = fmtChord(pkc[0].sym, state.transpose, state.preferFlats); pk.appendChild(cc); }
        container.appendChild(pk); state.barEls[0] = pk;
      }

      var sys = document.createElement("div"); sys.className = "tc-systems"; container.appendChild(sys);
      var startBar = p.anacrusis ? 1 : 0, idxs = [];
      for (var bb = startBar; bb < p.bars.length; bb++) idxs.push(bb);
      var rows = buildRows(idxs, perRow, lineBreaks);

      rows.forEach(function(rowIdxs){
        var cols = lineBreaks ? rowIdxs.length : perRow;     // uniform mode pads to perRow
        var row = document.createElement("div"); row.className = "tc-system";
        row.style.gridTemplateColumns = "repeat(" + cols + ",1fr)";
        for (var c = 0; c < cols; c++){
          var cell = document.createElement("div"); cell.className = "tc-bar";
          if (c < rowIdxs.length){
            var b = rowIdxs[c], bar = p.bars[b];
            cell.setAttribute("data-left", bar.left); cell.setAttribute("data-right", bar.right);
            if (bar.left === "repeat-open"){ var od = document.createElement("span"); od.className = "tc-open"; cell.appendChild(od); }
            if (bar.ending){ var en = document.createElement("span"); en.className = "tc-ending"; en.textContent = bar.ending + "."; cell.appendChild(en); }
            if (state.subBarBeats > 0){
              for (var bt = state.subBarBeats; bt < beats; bt += state.subBarBeats){
                var beatUnits = bt * (p.unitsPerBeat || 1);
                if (beatUnits >= (bar.lengthUnits || upb) - 1e-6) continue;
                var ln = document.createElement("div"); ln.className = "tc-subline";
                ln.style.left = (100 * beatUnits / upb) + "%"; cell.appendChild(ln);
              }
            }
            if (bar.chords.length) fillChord(cell, bar, upb); else cell.classList.add("tc-empty");
            state.barEls[b] = cell;
          } else { cell.style.visibility = "hidden"; }
          row.appendChild(cell);
        }
        sys.appendChild(row);
      });
    }
    draw();

    // Playback sync is POSITIONAL: abcjs tags each note element with an absolute measure
    // class `abcjs-mmN` (N == our bar index, pickup = 0). Reading it from the current
    // event is robust to cycles/loops/seeks/repeats/mid-tune starts — no counting.
    function measureOf(ev){
      var els = ev && ev.elements; if (!els || !els.length) return null;
      for (var i = 0; i < els.length; i++){ var grp = els[i]; if (!grp) continue;
        for (var j = 0; j < grp.length; j++){
          var cls = grp[j] && grp[j].getAttribute && grp[j].getAttribute("class");
          var m = cls && /\babcjs-mm(\d+)\b/.exec(cls); if (m) return parseInt(m[1], 10);
        } }
      return null;
    }

    return {
      get parsed(){ return state.parsed; },
      get barEls(){ return state.barEls; },
      redraw: draw,
      setSubBars: function(n){ state.subBarBeats = n || 0; draw(); },
      setRoman: function(on){ state.roman = !!on; draw(); },
      setTranspose: function(semis, preferFlats){ state.transpose = semis || 0; if (preferFlats != null) state.preferFlats = preferFlats; draw(); },
      setTune: function(newAbc){ state.parsed = (typeof newAbc === "string") ? parse(newAbc) : newAbc; draw(); },
      setLive: function(i){ if (state.liveBar === i) return; state.liveBar = i;   // called per-event → dedupe
        state.barEls.forEach(function(el, k){ el.classList.toggle("tc-live", k === i); });
        var el = state.barEls[i]; if (el && i >= 0) el.scrollIntoView({ block:"nearest", behavior:"smooth" }); },
      // map the m-th played measure (cursor follows the expanded/repeated timeline)
      // back to its written bar and highlight that. m < 0 clears.
      setPlayMeasure: function(m){
        var po = state.parsed.playOrder || [];
        if (m < 0){ this.setLive(-1); return; }
        var bar = (m < po.length) ? po[m] : po[po.length - 1];
        this.setLive(bar == null ? -1 : bar);
      },
      // feed every abcjs cursor event here; highlights the written bar of the sounding
      // note (loop/seek/repeat-safe). Call resetPlayback() on start/finish.
      resetPlayback: function(){ this.setLive(-1); },
      onPlaybackEvent: function(ev){
        var mm = measureOf(ev); if (mm == null) return;
        var n = (state.parsed.bars || []).length;
        if (mm < 0) mm = 0; else if (mm >= n) mm = n - 1;
        this.setLive(mm);
      },
      get playOrder(){ return state.parsed.playOrder || []; }
    };
  }

  global.TuneChart = { parse: parse, render: render, transposeSym: transposeSym, fmtChord: fmtChord };
})(typeof window !== "undefined" ? window : globalThis);
