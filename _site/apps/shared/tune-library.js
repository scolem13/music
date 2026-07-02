// tune-library.js — shared tune index + faceted search, used by the tune-assessment
// page and the Chord Sheet tool. Replaces the old "collections" organizing principle:
// every tune is a record with auto-derived attributes (chords / lyrics / meter / key /
// tonality / measures / pickup) plus HYBRID manual metadata read from the ABC:
//   %%id <slug>      stable id (baked into the data; falls back to a title slug)
//   %%tags a, b, c   manual tags (the old collection name is also added as a tag)
//
//   TuneLibrary.build(tunesObject)      // {collectionName: bigAbcString}; defaults to window.tunesObject
//   TuneLibrary.all() / .byId(id)
//   TuneLibrary.facets()                // {tags, tonality, meter, key, chords, lyrics} → {value: count}
//   TuneLibrary.filter({ text, tags, tonality, meter, key, hasChords, hasLyrics })
// Depends on TuneChart (parsing) + ABCJS (splitting collections into tunes).

(function (global) {
  var MODE = { "":"major", maj:"major", major:"major", ion:"major", ionian:"major",
    m:"minor", min:"minor", minor:"minor", aeo:"minor", aeolian:"minor",
    dor:"dorian", dorian:"dorian", phr:"phrygian", phrygian:"phrygian",
    lyd:"lydian", lydian:"lydian", mix:"mixolydian", mixolydian:"mixolydian",
    loc:"locrian", locrian:"locrian" };
  var FLAT = ["C","D♭","D","E♭","E","F","G♭","G","A♭","A","B♭","B"];
  var ROOTPC = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  // functional scale degrees by semitone interval above the tonic (major-relative, with
  // flats for chromatic) — key-independent, so it works for key-agnostic tunes.
  var DEGREE = ["I","♭II","II","♭III","III","IV","♯IV","V","♭VI","VI","♭VII","VII"];
  function chordRootPc(sym){ var m = /^([A-G])([#b]*)/.exec(sym || ""); if (!m) return null;
    var pc = ROOTPC[m[1]]; for (var i=0;i<m[2].length;i++) pc += (m[2][i]==="#"?1:-1); return ((pc%12)+12)%12; }
  function chordQuality(sym){ var s = (sym||"").replace(/^[A-G][#b]*/,"");   // the bit after the root
    if (/^(m7b5|ø|dim|°|o(?![a-z]))/i.test(s)) return "dim";
    if (/^(aug|\+)/.test(s)) return "aug";
    if (/^maj/i.test(s)) return "maj";
    if (/^m(?!aj)/.test(s)) return "min";
    return "maj"; }
  function romanOf(sym, tonicPc){ var r = chordRootPc(sym); if (r == null) return null;
    var base = DEGREE[((r - tonicPc) % 12 + 12) % 12], q = chordQuality(sym);
    if (q === "min") return base.toLowerCase();
    if (q === "dim") return base.toLowerCase() + "°";
    if (q === "aug") return base + "+";
    return base; }
  function isDom7(sym){ var s = (sym||"").replace(/^[A-G][#b]*/,""); return chordQuality(sym) === "maj" && /7/.test(s) && !/(maj7|M7|Δ|6)/.test(s); }
  function isChromaticRoman(roman){ return /[♯♭]/.test(roman) || ["II","III","VI","VII"].indexOf(roman) >= 0; }
  // diatonic chord at each scale-degree interval (major-relative) — used to name the
  // TARGET of an applied chord (e.g. the "V" in vii°/V).
  var DIATONIC_LABEL = { 0:"I", 2:"ii", 4:"iii", 5:"IV", 7:"V", 9:"vi", 11:"vii°" };
  // Applied-chord label by INTRINSIC spelling (the standard treatment — independent of
  // where it resolves): a diminished chord a half-step below a diatonic degree is the
  // secondary leading-tone of that degree (♯iv°7 = vii°/V); a chromatic major/dom7 chord
  // a fifth above a diatonic degree is its secondary dominant (II = V/V, I7 = V/IV).
  function appliedRoman(sym, tonicPc){
    var r = chordRootPc(sym); var plain = romanOf(sym, tonicPc);
    if (r == null) return plain;
    var iv = ((r - tonicPc) % 12 + 12) % 12, q = chordQuality(sym);
    if (q === "dim"){ var t = (iv + 1) % 12;
      if (t !== 0 && DIATONIC_LABEL.hasOwnProperty(t)) return "vii°/" + DIATONIC_LABEL[t]; return plain; }
    if (q === "maj"){ var t2 = ((iv - 7) % 12 + 12) % 12;
      if (t2 !== 0 && DIATONIC_LABEL.hasOwnProperty(t2) && (isChromaticRoman(plain) || isDom7(sym))) return "V/" + DIATONIC_LABEL[t2]; return plain; }
    return plain;
  }

  function field(abc, tag){ var m = new RegExp("^"+tag+":\\s*(.+)$","m").exec(abc); return m ? m[1].trim() : ""; }
  function directive(abc, name){ var m = new RegExp("^%%\\s*"+name+"\\s+(.+)$","m").exec(abc); return m ? m[1].trim() : ""; }
  function hasDirective(abc, name){ return new RegExp("^%%\\s*"+name+"\\b","m").test(abc); }   // flag directives (no value)
  function slugify(s){ return (s||"").toLowerCase().replace(/[—–]/g,"-").replace(/&/g," and ")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60) || "tune"; }
  function tonalityOf(keyField){
    var m = /^[A-Ga-g][#b]?\s*([A-Za-z]*)/.exec(keyField || "");
    var suf = (m && m[1] || "").toLowerCase();
    return MODE.hasOwnProperty(suf) ? MODE[suf] : (suf === "" ? "major" : "other");
  }
  // Normalize a meter to "N/D" display string (treats C as 4/4 and C| as 2/2).
  function meterLabel(n, d){ return n + "/" + d; }
  // Return short display name for a key field string (e.g. "Dm", "Bb", "G mix").
  function keyLabel(s){
    s = (s || "").trim(); if (!s) return "";
    var m = /^([A-Ga-g][#b]?)\s*([A-Za-z]*)/.exec(s); if (!m) return "";
    var root = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    var suf = (m[2] || "").toLowerCase();
    if (!suf || suf === "major" || suf === "maj" || suf === "ion" || suf === "ionian") return root;
    if (suf === "minor" || suf === "min" || suf === "m" || suf === "aeo" || suf === "aeolian") return root + "m";
    return root + " " + suf.slice(0, 3);
  }

  var records = [], byIdMap = {};

  function build(sources){
    sources = sources || (typeof global.tunesObject !== "undefined" ? global.tunesObject : {});
    records = []; byIdMap = {};
    var usedIds = {};
    Object.keys(sources).forEach(function (coll){
      var book; try { book = new global.ABCJS.TuneBook(sources[coll]); } catch (e){ return; }
      book.tunes.forEach(function (t){
        var abc = t.abc, p;
        try { p = global.TuneChart.parse(abc); } catch (e){ p = { bars:[], meterStr:"", meterN:4, meterD:4, keyPc:0, keyField:"", anacrusis:false }; }
        var title = field(abc, "T") || t.title || "Untitled";
        var id = directive(abc, "id"); if (!id){ id = slugify(title); var n = 2; while (usedIds[id]) id = slugify(title) + "-" + (n++); }
        usedIds[id] = 1;
        var tags = [coll];
        var manual = directive(abc, "tags");
        if (manual) manual.split(",").forEach(function (x){ x = x.trim(); if (x && tags.indexOf(x) < 0) tags.push(x); });
        // distinct chords + roman numerals (with applied-chord analysis), deduped in
        // first-appearance (musical) order.
        var chordSet = {}, romans = [], seenR = {};
        p.bars.forEach(function (b){ (b.chords||[]).forEach(function (ch){ chordSet[ch.sym] = 1;
          var lab = appliedRoman(ch.sym, p.keyPc);
          if (lab && !seenR[lab]){ seenR[lab] = 1; romans.push(lab); } }); });
        // allMeters: ordered unique meters in order of first appearance, normalized to N/D.
        var allMeters = [], seenM = {};
        function addMeter(n, d){ var s = meterLabel(n, d); if (!seenM[s]){ seenM[s] = 1; allMeters.push(s); } }
        addMeter(p.meterN, p.meterD);
        if (p.bars) p.bars.forEach(function (b){ if (b.meter) addMeter(b.meter.n, b.meter.d); });
        // allKeys: ordered unique keys (initial header + inline [K:X] changes).
        var allKeys = [], seenK = {};
        function addKey(s){ var k = keyLabel(s); if (k && !seenK[k]){ seenK[k] = 1; allKeys.push(k); } }
        addKey(p.keyField || field(abc, "K") || "");
        var kre = /\[K:([^\]]+)\]/g, km;
        while ((km = kre.exec(abc)) !== null) addKey(km[1]);
        var rec = {
          id: id, title: title, abc: abc, collection: coll, tags: tags,
          composer: field(abc, "C"),
          hasChords: p.bars.some(function (b){ return b.chords && b.chords.length; }),
          chordCount: Object.keys(chordSet).length, romans: romans,
          hasLyrics: /^w:/m.test(abc),
          meterStr: meterLabel(p.meterN, p.meterD), meterN: p.meterN, meterD: p.meterD,
          allMeters: allMeters,
          allKeys: allKeys,
          keyPc: p.keyPc, keyField: p.keyField || field(abc,"K"),
          tonality: tonalityOf(p.keyField || field(abc,"K")),
          keyName: FLAT[((p.keyPc % 12) + 12) % 12],
          // most tunes are key-agnostic; %%key-fixed marks a canonical/published key
          keyFixed: hasDirective(abc, "key-fixed"),
          measures: (p.bars ? p.bars.length : 0) - (p.anacrusis ? 1 : 0),
          hasPickup: !!p.anacrusis
        };
        records.push(rec); byIdMap[id] = rec;
      });
    });
    records.sort(function (a, b){ return a.title.localeCompare(b.title, undefined, { sensitivity:"base", numeric:true }); });   // default A→Z
    return records;
  }

  function tally(getter, list){
    var t = {}; (list || records).forEach(function (r){ var v = getter(r);
      (Array.isArray(v) ? v : [v]).forEach(function (x){ if (x == null || x === "") return; t[x] = (t[x] || 0) + 1; }); });
    return t;
  }
  function facets(){
    return {
      tags: tally(function (r){ return r.tags; }),
      tonality: tally(function (r){ return r.tonality; }),
      // Each tune contributes a count to every meter it contains; mixed-meter tunes also
      // get a "mixed meter" entry so users can filter for them specifically.
      meter: tally(function (r){ var ms = r.allMeters.slice(); if (ms.length > 1) ms.push("mixed meter"); return ms; }),
      // key is only meaningful for canonical-key tunes; agnostic tunes aren't grouped by key
      key: tally(function (r){ return r.keyName; }, records.filter(function (r){ return r.keyFixed; })),
      chords: { yes: records.filter(function (r){ return r.hasChords; }).length, no: records.filter(function (r){ return !r.hasChords; }).length },
      lyrics: { yes: records.filter(function (r){ return r.hasLyrics; }).length, no: records.filter(function (r){ return !r.hasLyrics; }).length }
    };
  }

  // criteria: arrays are OR-within / AND-across; booleans require that value; text matches title.
  function filter(crit){
    crit = crit || {};
    var anyOf = function (vals, v){ return !vals || !vals.length || vals.indexOf(v) >= 0; };
    var anyTag = function (vals, tags){ return !vals || !vals.length || vals.some(function (x){ return tags.indexOf(x) >= 0; }); };
    var txt = (crit.text || "").trim().toLowerCase();
    return records.filter(function (r){
      if (txt && r.title.toLowerCase().indexOf(txt) < 0) return false;
      if (!anyTag(crit.tags, r.tags)) return false;
      if (!anyOf(crit.tonality, r.tonality)) return false;
      if (crit.meter && crit.meter.length){
        var mOk = crit.meter.some(function(f){
          return f === "mixed meter" ? r.allMeters.length > 1 : r.allMeters.indexOf(f) >= 0;
        });
        if (!mOk) return false;
      }
      if (crit.key && crit.key.length && (!r.keyFixed || crit.key.indexOf(r.keyName) < 0)) return false;   // key filters canonical-key tunes only
      if (crit.hasChords === true && !r.hasChords) return false;
      if (crit.hasChords === false && r.hasChords) return false;
      if (crit.hasLyrics === true && !r.hasLyrics) return false;
      if (crit.hasLyrics === false && r.hasLyrics) return false;
      return true;
    });
  }

  // ---- shared picker UI (search + facets + results) ----
  function injectPickerCss(){
    if (typeof document === "undefined" || document.getElementById("tl-picker-css")) return;
    var css = ''
    + '.tl-picker{--tlp-ink:#22262c;--tlp-muted:#6b7280;--tlp-line:#d7dbe0;--tlp-bg:#fff;--tlp-soft:#f3f5f7;--tlp-accent:#1769d6;'
    +   'font-family:inherit;color:var(--tlp-ink);display:flex;flex-direction:column;gap:.55rem;min-height:0}'
    + '.tl-picker .tl-search{width:100%;box-sizing:border-box;padding:.5rem .7rem;border:1px solid var(--tlp-line);border-radius:8px;background:var(--tlp-bg);color:inherit;font:inherit}'
    + '.tl-picker .tl-facets{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center}'
    + '.tl-picker .tl-facet{position:relative}'
    + '.tl-picker .tl-facet>summary{list-style:none;cursor:pointer;padding:.32rem .6rem;border:1px solid var(--tlp-line);border-radius:999px;font-size:.8rem;background:var(--tlp-bg);white-space:nowrap;user-select:none}'
    + '.tl-picker .tl-facet>summary::-webkit-details-marker{display:none}'
    + '.tl-picker .tl-facet[data-active="1"]>summary{border-color:var(--tlp-accent);color:var(--tlp-accent);font-weight:600}'
    + '.tl-picker .tl-facet>.tl-pop{position:absolute;z-index:20;top:100%;left:0;margin-top:4px;min-width:150px;max-height:240px;overflow:auto;'
    +   'background:var(--tlp-bg);border:1px solid var(--tlp-line);border-radius:8px;box-shadow:0 10px 28px -12px rgba(0,0,0,.4);padding:.35rem}'
    + '.tl-picker .tl-pop label{display:flex;align-items:center;gap:.45rem;padding:.28rem .4rem;font-size:.82rem;border-radius:5px;cursor:pointer;white-space:nowrap}'
    + '.tl-picker .tl-pop label:hover{background:var(--tlp-soft)}'
    + '.tl-picker .tl-pop .tl-c{margin-left:auto;color:var(--tlp-muted);font-size:.74rem}'
    + '.tl-picker .tl-toggle{display:inline-flex;align-items:center;gap:.35rem;font-size:.8rem;padding:.32rem .6rem;border:1px solid var(--tlp-line);border-radius:999px;cursor:pointer;white-space:nowrap}'
    + '.tl-picker .tl-clear{font-size:.78rem;color:var(--tlp-accent);background:none;border:0;cursor:pointer;padding:.32rem .4rem}'
    + '.tl-picker .tl-count{font-size:.74rem;color:var(--tlp-muted);letter-spacing:.04em}'
    + '.tl-picker .tl-results{list-style:none;margin:0;padding:0;overflow:auto;border:1px solid var(--tlp-line);border-radius:8px;background:var(--tlp-bg)}'
    + '.tl-picker .tl-sort{font:inherit;font-size:.8rem;padding:.3rem 1.4rem .3rem .6rem;border:1px solid var(--tlp-line);border-radius:999px;background:var(--tlp-bg);color:inherit;cursor:pointer;'
    +   'appearance:none;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 13px) .85rem,calc(100% - 9px) .85rem;background-size:4px 4px;background-repeat:no-repeat}'
    + '.tl-picker .tl-results li{display:flex;align-items:flex-start;gap:.5rem;padding:.45rem .65rem;border-bottom:1px solid var(--tlp-line);cursor:pointer}'
    + '.tl-picker .tl-rmain{display:flex;flex-direction:column;gap:.12rem;min-width:0}'
    + '.tl-picker .tl-romans{font-family:"JetBrains Mono",monospace;font-size:.7rem;color:var(--tlp-muted);letter-spacing:.03em}'
    + '.tl-picker .tl-results li:last-child{border-bottom:0}'
    + '.tl-picker .tl-results li:hover{background:var(--tlp-soft)}'
    + '.tl-picker .tl-results li[aria-current="true"]{background:var(--tlp-soft);box-shadow:inset 3px 0 0 var(--tlp-accent)}'
    + '.tl-picker .tl-rt{font-weight:600;line-height:1.2}'
    + '.tl-picker .tl-rmeta{margin-left:auto;display:flex;gap:.5rem;color:var(--tlp-muted);font-size:.72rem;white-space:nowrap}'
    + '.tl-picker .tl-empty{padding:.7rem;color:var(--tlp-muted);font-size:.82rem}';
    var st = document.createElement("style"); st.id = "tl-picker-css"; st.textContent = css; document.head.appendChild(st);
  }

  // multi-select facet dropdown bound to crit[key] (an array)
  function facetDropdown(label, key, counts, crit, onChange, order){
    var keys = Object.keys(counts); keys.sort(order || function (a,b){ return counts[b] - counts[a]; });
    var d = document.createElement("details"); d.className = "tl-facet";
    var s = document.createElement("summary"); s.textContent = label; d.appendChild(s);
    var pop = document.createElement("div"); pop.className = "tl-pop"; d.appendChild(pop);
    keys.forEach(function (v){
      var lab = document.createElement("label");
      var cb = document.createElement("input"); cb.type = "checkbox"; cb.value = v;
      cb.checked = (crit[key] || []).indexOf(v) >= 0;
      cb.addEventListener("change", function (){
        var arr = crit[key] || [];
        if (cb.checked){ if (arr.indexOf(v) < 0) arr.push(v); } else arr = arr.filter(function (x){ return x !== v; });
        crit[key] = arr; d.setAttribute("data-active", arr.length ? "1" : "0"); onChange();
      });
      var txt = document.createElement("span"); txt.textContent = v;
      var c = document.createElement("span"); c.className = "tl-c"; c.textContent = counts[v];
      lab.appendChild(cb); lab.appendChild(txt); lab.appendChild(c); pop.appendChild(lab);
    });
    d.setAttribute("data-active", (crit[key] || []).length ? "1" : "0");
    return d;
  }

  // renderPicker(container, { onSelect(rec), selectedId, facets:[...] })
  function renderPicker(container, opts){
    injectPickerCss(); opts = opts || {};
    var wantFacets = opts.facets || ["tags","tonality","meter","key","chords","lyrics"];
    var crit = {}, F = facets();
    container.classList.add("tl-picker"); container.innerHTML = "";

    var search = document.createElement("input"); search.className = "tl-search"; search.type = "search";
    search.placeholder = "Search tunes…"; container.appendChild(search);

    var bar = document.createElement("div"); bar.className = "tl-facets"; container.appendChild(bar);
    var rerender, sortMode = "title";
    var sortSel = document.createElement("select"); sortSel.className = "tl-sort"; sortSel.setAttribute("aria-label","Sort");
    [["title","Sort: A–Z"],["chords-asc","Sort: fewest chords"],["chords-desc","Sort: most chords"]].forEach(function (o){
      var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; sortSel.appendChild(op); });
    sortSel.addEventListener("change", function (){ sortMode = sortSel.value; rerender(); });
    bar.appendChild(sortSel);
    var METER_ORDER = function (a,b){ return a.localeCompare(b); };
    var addFacet = function (name, label, counts, order){
      if (wantFacets.indexOf(name) < 0 || !Object.keys(counts).length) return;   // skip empty facets
      bar.appendChild(facetDropdown(label, name, counts, crit, function (){ rerender(); }, order));
    };
    addFacet("tags", "Tags", F.tags);
    addFacet("tonality", "Tonality", F.tonality);
    addFacet("meter", "Meter", F.meter, METER_ORDER);
    addFacet("key", "Key", F.key, METER_ORDER);
    function toggle(label, key){
      var l = document.createElement("label"); l.className = "tl-toggle";
      var cb = document.createElement("input"); cb.type = "checkbox";
      cb.addEventListener("change", function (){ crit[key] = cb.checked ? true : undefined; rerender(); });
      l.appendChild(cb); l.appendChild(document.createTextNode(" " + label)); return l;
    }
    if (wantFacets.indexOf("chords") >= 0) bar.appendChild(toggle("Chords", "hasChords"));
    if (wantFacets.indexOf("lyrics") >= 0) bar.appendChild(toggle("Lyrics", "hasLyrics"));
    var clear = document.createElement("button"); clear.type = "button"; clear.className = "tl-clear"; clear.textContent = "Clear";
    clear.addEventListener("click", function (){ renderPickerReset(); }); bar.appendChild(clear);

    var count = document.createElement("div"); count.className = "tl-count"; container.appendChild(count);
    var list = document.createElement("ul"); list.className = "tl-results"; container.appendChild(list);

    var selectedId = opts.selectedId || null, lastRes = [];
    function paintCurrent(){ list.querySelectorAll("li").forEach(function (x){
      var on = x.__id === selectedId; x.setAttribute("aria-current", on ? "true" : "false");
      if (on) x.scrollIntoView({ block:"nearest" }); }); }
    function renderPickerReset(){
      crit = {}; search.value = "";
      bar.querySelectorAll(".tl-facet").forEach(function (d){ d.setAttribute("data-active","0"); d.querySelectorAll("input").forEach(function (cb){ cb.checked = false; }); });
      bar.querySelectorAll(".tl-toggle input").forEach(function (cb){ cb.checked = false; });
      rerender();
    }
    rerender = function (){
      crit.text = search.value;
      lastRes = filter(crit);
      lastRes.sort(function (a,b){
        if (sortMode === "chords-asc") return (a.chordCount - b.chordCount) || a.title.localeCompare(b.title);
        if (sortMode === "chords-desc") return (b.chordCount - a.chordCount) || a.title.localeCompare(b.title);
        return a.title.localeCompare(b.title, undefined, { sensitivity:"base", numeric:true });
      });
      count.textContent = lastRes.length + (lastRes.length === 1 ? " tune" : " tunes");
      list.innerHTML = "";
      if (!lastRes.length){ var e = document.createElement("li"); e.className = "tl-empty"; e.textContent = "No tunes match these filters."; list.appendChild(e); return; }
      lastRes.forEach(function (r){
        var li = document.createElement("li"); li.__id = r.id; li.setAttribute("aria-current", r.id === selectedId ? "true" : "false");
        var main = document.createElement("div"); main.className = "tl-rmain";
        var t = document.createElement("span"); t.className = "tl-rt"; t.textContent = r.title; main.appendChild(t);
        if (r.romans && r.romans.length){ var rom = document.createElement("span"); rom.className = "tl-romans"; rom.textContent = r.romans.join("  "); main.appendChild(rom); }
        var meta = document.createElement("span"); meta.className = "tl-rmeta";
        var bits = [];
        // Key: show when canonical (keyFixed) or when the tune has inline key changes.
        if (r.keyFixed || r.allKeys.length > 1) bits.push(r.allKeys.join(" → "));
        // Meter: show all unique meters; prefix "mixed meter" when there is more than one.
        if (r.allMeters.length > 1) bits.push("mixed meter " + r.allMeters.join(" "));
        else if (r.allMeters.length) bits.push(r.allMeters[0]);
        if (r.hasChords) bits.push(r.chordCount + (r.chordCount === 1 ? " chord" : " chords")); if (r.hasLyrics) bits.push("lyrics");
        bits.forEach(function (b){ var s = document.createElement("span"); s.textContent = b; meta.appendChild(s); });
        li.appendChild(main); li.appendChild(meta);
        li.addEventListener("click", function (){ selectedId = r.id; paintCurrent(); if (opts.onSelect) opts.onSelect(r); });
        list.appendChild(li);
      });
    };
    search.addEventListener("input", rerender);
    rerender();
    return {
      refresh: rerender, reset: renderPickerReset,
      setSelected: function (id){ selectedId = id; paintCurrent(); },   // in-place highlight (no rebuild)
      next: function (){ if (!lastRes.length) return;
        var i = lastRes.map(function (r){ return r.id; }).indexOf(selectedId);
        var r = lastRes[(i + 1) % lastRes.length]; selectedId = r.id; paintCurrent(); if (opts.onSelect) opts.onSelect(r); }
    };
  }

  global.TuneLibrary = { build: build, all: function (){ return records.slice(); },
    byId: function (id){ return byIdMap[id] || null; }, facets: facets, filter: filter, renderPicker: renderPicker,
    roman: appliedRoman };   // chord symbol → roman (with applied-chord analysis); used by the chart's roman mode
})(typeof window !== "undefined" ? window : globalThis);
