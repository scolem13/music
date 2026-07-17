// rhythm-cells.js — flat, labeled, matchable rhythm-cell vocabulary drawn from the same
// duple/triple/other pattern collections the Rhythm Sequences practice tool uses
// (rhythmPatternObject), so other tools can filter/search by "does this melody contain
// this rhythm cell". Each cell also carries the same macrobeat/microbeat/division/
// elongation/rest tags Rhythm Sequences uses for its criteria checkboxes.
//
//   RhythmCells.pool() -> [{ abc, family, defaultL, events:[{type:'note'|'rest', durQ}],
//                            label, required:{macrobeat?,microbeat?,division?,elongation?,rest?} }]
//     family: "duple" (simple/beat-divides-by-2) | "triple" (compound 6/8-style,
//       beat-divides-by-3) | "other" (irregular meters — 5/8, 7/8, combined meter;
//       not macrobeat/microbeat classified, so `required` is always {}).
//     durQ = duration in quarter-note units, rounded to 3 decimals — the same units/rounding
//     AbcTune.melodyNotes() uses (dur * lq), so cell events compare directly against a tune's
//     note/rest event stream regardless of the tune's own meter or L: unit.
//     defaultL is the L: unit to render `abc` with, for tools that want a notation preview.
//
// Depends on ABCJS.TuneBook + rhythmPatternObject (apps/rhythms/rhythm-pattern-object.js).

(function (global) {
  // collections used per family — the same "beat-shape vocabulary" collections Rhythm
  // Sequences draws its cell bank from (SOURCE_COLLECTIONS there), plus an "other" bucket
  // for irregular/aksak and combined meters that Rhythm Sequences doesn't expose as cells.
  var FAMILY_INFO = {
    duple:  { defaultL: "1/4", unitsPerMacrobeat: 1, microbeatCount: 2,
      collections: ["Duple-M-m-2-4", "Duple-M-m-D-2/4", "Duple, M-m-D-E-2/4", "Duple, M-m-R-2/4", "Duple, M-m-D-E-R-U-2/4"] },
    triple: { defaultL: "1/8", unitsPerMacrobeat: 3, microbeatCount: 3,
      collections: ["Triple-M-m-6/8", "Triple-M-m-D-6/8", "Triple-M-m-D-E-6/8"] },
    other:  { defaultL: "1/8", unitsPerMacrobeat: null, microbeatCount: null,
      collections: ["331", "332", "333", "334"] }
  };
  // extra cells that don't occur as a single bar-group in the collections above (a
  // fully-elongated note spanning more than one macrobeat) — same list Rhythm Sequences
  // adds via getLongElongationCells().
  var LONG_ELONGATION_CELLS = {
    duple: [
      { abc: "B2", required: { elongation: true } },
      { abc: "B3 B", required: { elongation: true } },
      { abc: "B B3", required: { elongation: true } },
      { abc: "B4", required: { elongation: true } },
      { abc: "B> B", required: { elongation: true } },
      { abc: "B< B", required: { elongation: true } },
      { abc: "B/ B B/", required: { elongation: true } },
      { abc: "B//B/B/B/B//", required: { division: true, elongation: true } }
    ],
    triple: [
      { abc: "B6", required: { elongation: true } }
    ]
  };
  var FORCE_DIVISION_AND_ELONGATION = { "B/>B/": 1, "B/<B/": 1, "B//B/B//": 1 };

  // L: header fraction -> quarter-note value of one raw duration-multiplier unit
  // (a whole note = 4 quarters, so an L-unit of num/den whole-notes = (num/den)*4 quarters).
  function quarterPerLUnitOf(lHeader){
    var m = /^(\d+)\s*\/\s*(\d+)/.exec(lHeader || "");
    if (!m) return 0.25;
    return (parseInt(m[1], 10) / parseInt(m[2], 10)) * 4;
  }

  // tokenize one space-delimited (spaces are just beam breaks, harmless to skip) notation
  // group ("B/B/", "B3", "z/BB", "B> B", …) into {type:'note'|'rest', dur, tie} tokens
  // (dur in raw L-unit multipliers). Also reports whether any broken-rhythm (>/<) mark
  // was used, which Rhythm Sequences treats as the "elongation" signal.
  function parseGroupTokens(group){
    var tokens = [], i = 0, pendingMul = 1, hasElongationMark = false;
    while (i < group.length){
      var ch = group[i];
      if (ch === "B" || ch === "z"){
        var type = ch === "z" ? "rest" : "note";
        var j = i + 1, mod = "";
        while (j < group.length && /[\d/]/.test(group[j])){ mod += group[j]; j++; }
        var m = /^(\d*)(\/*)(\d*)$/.exec(mod || "");
        var num = m[1] ? parseInt(m[1], 10) : 1;
        var den = 1;
        if (m[2]) den = m[3] ? parseInt(m[3], 10) : Math.pow(2, m[2].length);
        var tie = false;
        if (group[j] === "-"){ tie = true; j++; }
        var dur = (num / den) * pendingMul; pendingMul = 1;
        if (group[j] === ">"){ dur *= 1.5; pendingMul = 0.5; hasElongationMark = true; j++; }
        else if (group[j] === "<"){ dur *= 0.5; pendingMul = 1.5; hasElongationMark = true; j++; }
        tokens.push({ type: type, dur: dur, tie: tie });
        i = j;
      } else i++;
    }
    return { tokens: tokens, hasElongationMark: hasElongationMark };
  }

  // merge tied notes into single sounding events (mirrors AbcTune.melodyNotes's tie handling).
  // Returns null for a group ending mid-tie (incomplete — can't resolve within one group).
  function tokensToEvents(tokens){
    var events = [], prevTie = false;
    tokens.forEach(function (t){
      if (t.type === "rest"){ events.push({ type: "rest", dur: t.dur }); prevTie = false; return; }
      if (prevTie && events.length && events[events.length - 1].type === "note") events[events.length - 1].dur += t.dur;
      else events.push({ type: "note", dur: t.dur });
      prevTie = t.tie;
    });
    return prevTie ? null : events;
  }

  // classify a single-macrobeat group into macrobeat/microbeat/division/elongation/rest,
  // the same criteria Rhythm Sequences' checkboxes filter by. Returns null if the group
  // isn't exactly one macrobeat long (rejected, same as Rhythm Sequences) or ends mid-tie.
  function classifyCell(group, familyInfo){
    var parsed = parseGroupTokens(group);
    if (!parsed.tokens.length || parsed.tokens[parsed.tokens.length - 1].tie) return null;
    var hasRest = parsed.tokens.some(function (t){ return t.type === "rest"; });
    var total = parsed.tokens.reduce(function (s, t){ return s + t.dur; }, 0);
    if (Math.abs(total - familyInfo.unitsPerMacrobeat) > 1e-9) return null;

    var microbeatDur = familyInfo.unitsPerMacrobeat / familyInfo.microbeatCount;
    var hasDivision = parsed.tokens.some(function (t){ return t.dur < microbeatDur - 1e-9; });
    var isMacrobeat = parsed.tokens.length === 1 && !hasRest && !parsed.hasElongationMark;
    var isMicrobeat = !isMacrobeat && !hasRest && !parsed.hasElongationMark && !hasDivision &&
      parsed.tokens.length === familyInfo.microbeatCount &&
      parsed.tokens.every(function (t){ return Math.abs(t.dur - microbeatDur) < 1e-9; });

    if (FORCE_DIVISION_AND_ELONGATION[group]) return { required: { division: true, elongation: true } };
    var required = {};
    if (isMacrobeat) required.macrobeat = true;
    else if (isMicrobeat) required.microbeat = true;
    else {
      if (hasDivision) required.division = true;
      if (parsed.hasElongationMark) required.elongation = true;
      if (hasRest) required.rest = true;
    }
    return { required: required };
  }

  function durName(q){
    var table = [[4,"whole"],[3,"dotted half"],[2,"half"],[1.5,"dotted quarter"],[1,"quarter"],
      [0.75,"dotted eighth"],[0.5,"eighth"],[0.375,"dotted sixteenth"],[0.25,"sixteenth"],[0.125,"thirty-second"]];
    for (var k = 0; k < table.length; k++) if (Math.abs(q - table[k][0]) < 1e-6) return table[k][1];
    return q.toFixed(3);
  }
  function labelOf(events){
    return events.map(function (e){ return (e.type === "rest" ? "rest · " : "") + durName(e.durQ); }).join(" + ");
  }
  function toDurQEvents(tokens, quarterPerLUnit){
    var events = tokensToEvents(tokens); if (!events) return null;
    return events.map(function (e){ return { type: e.type, durQ: Math.round(e.dur * quarterPerLUnit * 1000) / 1000 }; });
  }

  var cache = null;
  function pool(){
    if (cache) return cache;
    cache = [];
    // rhythmPatternObject is declared with a top-level `const` in its script, so it's a
    // global *lexical* binding, not a `window` property — reference the bare identifier
    // (guarded by typeof, which is safe even if the script never loaded).
    if (typeof rhythmPatternObject === "undefined" || !global.ABCJS) return cache;
    var seen = {};
    function addCell(abc, family, defaultL, events, required){
      var sig = family + ":" + events.map(function (e){ return e.type[0] + e.durQ; }).join(",");
      if (seen[sig]) return; seen[sig] = 1;
      cache.push({ abc: abc, family: family, defaultL: defaultL, events: events, label: labelOf(events), required: required || {} });
    }
    Object.keys(FAMILY_INFO).forEach(function (family){
      var info = FAMILY_INFO[family];
      info.collections.forEach(function (collKey){
        var src = rhythmPatternObject[collKey]; if (!src) return;
        var book; try { book = new global.ABCJS.TuneBook(src); } catch (e){ return; }
        book.tunes.forEach(function (t){
          var Lm = /^L:\s*(\d+\s*\/\s*\d+)/m.exec(t.abc);
          var quarterPerLUnit = quarterPerLUnitOf(Lm ? Lm[1] : info.defaultL);
          var bodyLine = "";
          t.abc.split("\n").forEach(function (line){ if (!/^[A-Za-z]:/.test(line) && line.trim()) bodyLine = line; });
          if (!bodyLine) return;
          bodyLine.split("|").forEach(function (bar){
            bar.trim().split(/\s+/).forEach(function (group){
              if (!group) return;
              if (family === "other"){
                var tokens = parseGroupTokens(group).tokens; if (!tokens.length) return;
                var ev = toDurQEvents(tokens, quarterPerLUnit); if (!ev) return;
                addCell(group, family, info.defaultL, ev, {});
              } else {
                var classified = classifyCell(group, info); if (!classified) return;
                var ev2 = toDurQEvents(parseGroupTokens(group).tokens, quarterPerLUnit); if (!ev2) return;
                addCell(group, family, info.defaultL, ev2, classified.required);
              }
            });
          });
        });
      });
      // long-elongation additions (duple/triple only — spans more than one macrobeat,
      // so they never occur as a single bar-group above).
      (LONG_ELONGATION_CELLS[family] || []).forEach(function (entry){
        var tokens = parseGroupTokens(entry.abc).tokens; if (!tokens.length) return;
        var ev3 = toDurQEvents(tokens, quarterPerLUnitOf(info.defaultL)); if (!ev3) return;
        addCell(entry.abc, family, info.defaultL, ev3, entry.required);
      });
    });
    cache.sort(function (a, b){ return (a.events.length - b.events.length) || a.label.localeCompare(b.label); });
    return cache;
  }

  global.RhythmCells = { pool: pool };
})(typeof window !== "undefined" ? window : globalThis);
