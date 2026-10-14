// tunes.js — the tunes the blues lessons are built on (BluesTunes), written in F like the lessons' charts.
//
//   BluesTunes.watermelon        the same shape, 16 bars, no words
//   BluesTunes.ode               Ode to Joy in C, for the reharmonizing lesson (no chords written in it)
//   BluesTunes.closet            { title, composer, abc, chart ("F7|F7|..." one entry a bar), pickup (quarter notes before bar 1),
//                                  words: for each line of music, the place of every note in the chord of the moment }
//   (a tune is written in F unless it says `key`)
//   BluesTunes.inKey(tune, "Eb", { words: true, octaves: -2, clef: "bass" })
//                                                   -> its ABC in that key (AbcTranspose spells it), with the words under the notes,
//                                                      moved by whole octaves and put in another clef if asked;
//                                                      barsPerLine: 2 = two bars to a line instead of four (a narrow screen)
//   BluesTunes.backingTrack(tune, { tempo, style }) -> opens the Backing Track page in a new tab with the tune loaded (that page's
//                                                      hand-off: localStorage.bandHandoff, read once and good for ten minutes)
//   BluesTunes.melody(abc, pickup)                  -> for each bar, its notes [{ pos, dur (quarter notes), midi }] (AbcTune reads them);
//                                                      a note tied over the barline belongs to the bar it starts in, and a pickup
//                                                      tied into bar 1 is played from beat 1
// Needs apps/shared/abc-transpose.js and apps/tune-assessment/abc-tune.js.

(function (global) {
  var closet = {
    title: "Blues in the Closet", composer: "Oscar Pettiford", pickup: 0.5,
    chart: "F7|F7|F7|F7|Bb7|Bb7|F7|F7|Gm7|C7|F7|C7",
    abc: 'X:1\nT:Blues in the Closet\nC:Oscar Pettiford\nM:4/4\nL:1/4\nQ:1/4=132\nK:F\n'
       + 'F/-| "F7"F A/F/ B A/F/ | "F7"B A/F/- F/ C F/- | "F7"F A/F/ B A/F/- | "F7" F/ C3/2-C z/ F/-|\n'
       + '"Bb7"F _A/F/ B A/F/ | "Bb7"B _A/F/- F/ C F/- | "F7"F =A/F/ B A/F/- | "F7" F/ C3/2-C z/ F/-|\n'
       + '"Gm7"F A/F/ B A/F/ | "C7"B A/F/- F/ C F/- | "F7"F A/F/ B A/F/- | "C7"F2 z2 |]',
    // (a note that anticipates the next bar is named by the chord it lands on; * = the second half of a tie)
    words: ["R | * 3 R 4 3 R | 4 3 R * 5 R | * 3 R 4 3 R | * 5 * R |",
            "* \u266d7 5 R \u266d7 5 | R \u266d7 5 * 9 R | * 3 R 4 3 R | * 5 * \u266d7 |",
            "* 9 \u266d7 \u266d3 9 \u266d7 | \u266d7 6 4 * R R | * 3 R 4 3 R | * |"]
  };

  // Watermelon Man (Herbie Hancock), the melody as the repo's tune collection holds it (apps/tunes/tunes-object.js, X:821), 16 bars in F.
  // The chart is the Backing Track preset's. (Bar 14 is Bb7 all the way: the collection also writes an F7 on its last beat, which the
  // lessons leave to the next bar.) No words: the lessons that use it are percussion lessons. pickup 0.
  var watermelon = {
    title: "Watermelon Man", composer: "Herbie Hancock", pickup: 0,
    chart: "F7|F7|F7|F7|Bb7|Bb7|F7|F7|C7|Bb7|C7|Bb7|C7|Bb7|F7|F7",
    abc: 'X:1\nT:Watermelon Man\nC:Herbie Hancock\nM:4/4\nL:1/8\nQ:1/4=120\nK:F\n'
       + '"F7"_e8- | "F7"e2 FF c d2 F- | "F7"F8- | "F7"F8 |\n'
       + '"Bb7"f8- | "Bb7"f2 FF c d2 F- | "F7"F8- | "F7"F8 |\n'
       + '"C7"z2 cc g2 a2 | "Bb7"_ag fd f2 g2 | "C7"z2 cc g2 a2 | "Bb7"_ag fd f2 d2 |\n'
       + '"C7"z2 cc g2 a2 | "Bb7"_a2 FF c d2 F- | "F7"F8- | "F7"F8 |]'
  };

  // Ode to Joy (Beethoven, the theme of the last movement of the Ninth Symphony; public domain), in C: the tune for the reharmonizing lesson.
  // No chord symbols: the lesson writes the chords. pickup 0.
  var ode = {
    title: "Ode to Joy", composer: "Ludwig van Beethoven", pickup: 0, key: "C",
    abc: 'X:1\nT:Ode to Joy\nC:Ludwig van Beethoven\nM:4/4\nL:1/4\nQ:1/4=100\nK:C\n'
       + 'E E F G | G F E D | C C D E | E3/2 D/ D2 |\n'
       + 'E E F G | G F E D | C C D E | D3/2 C/ C2 |]'
  };

  // every note of the music lines moved n octaves (chord symbols, decorations and header lines are left alone)
  function octaves(abc, n){
    if (!n) return abc;
    return abc.split("\n").map(function (l){
      if (/^[A-Za-z]:/.test(l) || /^%/.test(l)) return l;
      return l.split(/("[^"]*"|![^!]*!)/).map(function (seg, i){ if (i % 2) return seg;
        return seg.replace(/([A-Ga-g])([,']*)/g, function (_, L, marks){
          var oct = (L === L.toUpperCase() ? 4 : 5) + (marks.match(/'/g) || []).length - (marks.match(/,/g) || []).length + n, U = L.toUpperCase();
          return oct <= 4 ? U + new Array(5 - oct).join(",") : U.toLowerCase() + new Array(oct - 4).join("'"); }); }).join("");
    }).join("\n");
  }
  function backingTrack(tune, o){
    o = o || {};
    try { global.localStorage.setItem("bandHandoff", JSON.stringify({ v: 1, from: "chord-entry", at: Date.now(), abc: tune.abc, tempo: o.tempo || 132, style: o.style || "swing" })); } catch (e){}
    return global.open("/tools/backing-track.html?from=chord-entry", "_blank");
  }
  function inKey(tune, key, o){
    var T = global.AbcTranspose, abc = (T && key && key !== (tune.key || "F")) ? T.transpose(tune.abc, key) : tune.abc;
    if (o && o.octaves) abc = octaves(abc, o.octaves);
    if (o && o.clef) abc = abc.replace(/^(K:[^\n]*)$/m, "$1 clef=" + o.clef);
    // a line of music (or of its words) cut in two after its second bar, for a narrow screen; the pickup stays with bar 1
    function halves(l, first){
      var segs = l.split("|"), tail = segs.pop(), lead = first && tune.pickup ? segs.shift() + "|" : "";
      return segs.length < 4 ? [l] : [lead + segs.slice(0, 2).join("|") + "|", segs.slice(2).join("|") + "|" + tail];
    }
    var two = o && o.barsPerLine === 2, words = o && o.words && tune.words, k = 0;
    if (!two && !words) return abc;
    return abc.split("\n").map(function (l){
      if (!/\|/.test(l) || /^[A-Za-z]:/.test(l)) return l;
      var ms = two ? halves(l, k === 0) : [l], ws = words && tune.words[k] ? (two ? halves(tune.words[k], k === 0) : [tune.words[k]]) : []; k++;
      return ms.map(function (m, i){ return m + (ws[i] ? "\nw: " + ws[i] : ""); }).join("\n");
    }).join("\n");
  }
  function melody(abc, pickup){
    var P = global.AbcTune; if (!P) return [];
    var m = P.melodyNotes(abc.split("\n").filter(function (l){ return !/^w:/.test(l); }).join("\n")), q = m.lq || 1, bars = [];
    m.notes.forEach(function (n){
      var at = n.onset * q - (pickup || 0), dur = n.dur * q; if (at < 0){ dur += at; at = 0; } if (dur <= 0) return;
      var b = Math.floor(at / 4 + 1e-6); (bars[b] = bars[b] || []).push({ pos: at - 4 * b, dur: dur, midi: n.midi });
    });
    for (var i = 0; i < bars.length; i++) bars[i] = bars[i] || [];
    return bars;
  }

  global.BluesTunes = { closet: closet, watermelon: watermelon, ode: ode, inKey: inKey, melody: melody, octaves: octaves, backingTrack: backingTrack };
})(typeof window !== "undefined" ? window : globalThis);
