// vl-check.js — checks four-part (SATB) writing against the common-practice rules (Hutchinson ch. 26–27: voice ranges 26.4, spacing
// 26.6, objectionable parallels 26.3, doubling 26.12, the leading tone and chordal 7th 27.3). Used to vet generated chorales and to grade
// a student's filled-in voice.
//   VLCheck.check(chords) -> [{ i, rule, voices, msg, level: "error" | "warn" }]
//   chords[i] = { v: [s, a, t, b] (midi, null = blank), pcs: [root, 3rd, 5th, (7th)] (pitch classes), lt (leading tone pc or null),
//                 seventh (pc of a chordal 7th, or null), resolveTo (index of the chord it resolves to, default i + 1) }
(function (global) {
  var RANGE = [[60, 81], [55, 74], [48, 67], [40, 62]], NAMES = ["soprano", "alto", "tenor", "bass"];   // C4–A5, G3–D5, C3–G4, E2–D4 (26.4)
  function pc(m) { return ((m % 12) + 12) % 12; }
  function check(chords) {
    var out = [];
    function add(i, rule, vs, msg, level) { out.push({ i: i, rule: rule, voices: vs, msg: msg, level: level || "error" }); }
    chords.forEach(function (c, i) {
      var v = c.v;
      v.forEach(function (m, k) {
        if (m == null) return;
        if (m < RANGE[k][0] || m > RANGE[k][1]) add(i, "range", [k], "The " + NAMES[k] + " is out of its range.");
        if (c.pcs.indexOf(pc(m)) < 0) add(i, "chord", [k], "The " + NAMES[k] + "'s note isn't in the chord.");
      });
      for (var k = 0; k < 3; k++) if (v[k] != null && v[k + 1] != null && v[k] < v[k + 1]) add(i, "crossing", [k, k + 1], "The " + NAMES[k] + " is below the " + NAMES[k + 1] + " (voice crossing).");
      if (v[0] != null && v[1] != null && v[0] - v[1] > 12) add(i, "spacing", [0, 1], "More than an octave between soprano and alto.");
      if (v[1] != null && v[2] != null && v[1] - v[2] > 12) add(i, "spacing", [1, 2], "More than an octave between alto and tenor.");
      if (v.every(function (m) { return m != null; })) {
        var have = v.map(pc);
        if (have.indexOf(c.pcs[0]) < 0) add(i, "complete", [], "The chord has no root.");
        if (have.indexOf(c.pcs[1]) < 0) add(i, "complete", [], "The chord has no 3rd.");
        if (c.pcs.length > 3 && have.indexOf(c.pcs[3]) < 0) add(i, "complete", [], "The seventh chord has no 7th.");
        if (c.lt != null && have.filter(function (x) { return x === c.lt; }).length > 1) add(i, "doubling", [], "The leading tone is doubled.");
        if (c.seventh != null && have.filter(function (x) { return x === c.seventh; }).length > 1) add(i, "doubling", [], "The chord's 7th is doubled.");
      }
      var n = chords[i + 1]; if (!n) return;
      for (var x = 0; x < 4; x++) for (var y = x + 1; y < 4; y++) {
        var a1 = v[x], b1 = v[y], a2 = n.v[x], b2 = n.v[y];
        if ([a1, b1, a2, b2].some(function (m) { return m == null; })) continue;
        if (a1 === a2 && b1 === b2) continue;                       // both held
        var i1 = (a1 - b1) % 12, i2 = (a2 - b2) % 12;
        if (i1 === 7 && i2 === 7 && a1 !== a2) add(i, "parallel5", [x, y], "Parallel 5ths between " + NAMES[x] + " and " + NAMES[y] + ".");
        if (i1 === 0 && i2 === 0 && a1 !== a2) add(i, "parallel8", [x, y], (a1 === b1 && a2 === b2 ? "Parallel unisons" : "Parallel octaves") + " between " + NAMES[x] + " and " + NAMES[y] + ".");
        if (x === 0 && y === 3 && (i2 === 7 || i2 === 0) && i1 !== i2 && (a2 - a1) * (b2 - b1) > 0 && Math.abs(a2 - a1) > 2)
          add(i, "direct", [0, 3], "Direct (hidden) " + (i2 === 7 ? "5th" : "octave") + " between the outer voices, with a leap in the soprano.", "warn");
      }
      v.forEach(function (m, k) {
        if (m == null || n.v[k] == null) return;
        var d = n.v[k] - m;
        if (c.lt != null && pc(m) === c.lt && (k === 0 || k === 3) && n.pcs[0] === pc(m + 1) && d !== 1)
          add(i, "leadingtone", [k], "The leading tone in the " + NAMES[k] + " should rise to the tonic.", "warn");
        if (c.seventh != null && pc(m) === c.seventh && d !== -1 && d !== -2 && d !== 0) add(i, "seventh", [k], "The chord's 7th in the " + NAMES[k] + " should fall by step.", "warn");
      });
    });
    return out;
  }
  global.VLCheck = { check: check, RANGE: RANGE, NAMES: NAMES };
})(typeof window !== "undefined" ? window : globalThis);
