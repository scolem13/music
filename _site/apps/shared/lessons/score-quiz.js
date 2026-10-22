// score-quiz.js — drills for the Score Reading lessons. Each <div class="sq" data-quiz="..."> becomes a question with
// answer buttons, a running score and "Next". Kinds:
//   alto | tenor | bass | treble | clefs   name the note on the staff (clefs = any of the four)
//   sound     a written note for a transposing instrument: which note sounds?
//   keysig    the key signature on a part: what is the concert key?
//   reverse   a concert key: what key is the part in?
// Optional data-only="horn" limits sound/keysig/reverse to horn variants (or any instrument id, comma-separated).
// Needs abcjs and score-reading.js.
(function () {
  var S = window.ScoreReading, LET = "CDEFGAB";
  var RANGE = { treble: [30, 42], bass: [16, 28], alto: [22, 34], tenor: [20, 32] };   // diatonic steps from C0 (C4 = 28)
  var PCS = ["C", "C♯/D♭", "D", "E♭/D♯", "E", "F", "F♯/G♭", "G", "A♭/G♯", "A", "B♭/A♯", "B"], PCV = [0, 2, 4, 5, 7, 9, 11];
  var POOL = [["clar", 0], ["clar", 1], ["clar", 3], ["altosax", 0], ["tensax", 0], ["barisax", 0], ["tpt", 0], ["tpt", 2], ["tpt", 3],
    ["horn", 0], ["horn", 1], ["horn", 2], ["horn", 3], ["horn", 5], ["horn", 7], ["horn", 10], ["horn", 13], ["cora", 0], ["altofl", 0], ["tenhorn", 0], ["euph", 1], ["tuba", 2]];
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function abcNote(step) { var o = Math.floor(step / 7), L = LET[step % 7]; return o >= 5 ? L.toLowerCase() + "'".repeat(o - 5) : L + ",".repeat(4 - o); }
  function who(i, v) { return i.name + (v.key !== "C" || i.variants.length > 1 ? " in " + v.key : ""); }

  var css = el("style"); css.textContent =
    ".sq{border:1px solid var(--site-border);border-radius:8px;padding:.7rem 1rem;margin:1rem 0;background:var(--site-surface)}" +
    ".sq-q{font-weight:600;margin:.2rem 0 .4rem}.sq-staff{background:#fff;border-radius:6px;max-width:15rem}" +
    ".sq-a{display:flex;flex-wrap:wrap;gap:.35rem;margin:.5rem 0}.sq-a .btn{font-family:var(--font-mono);font-size:.82rem;min-width:2.6rem}" +
    ".sq-a .sq-right{background:#e3f1e8;border-color:var(--site-pass);color:var(--site-pass)}.sq-a .sq-wrong{background:#f8e4e2;border-color:var(--site-fail);color:var(--site-fail)}" +
    ".sq-foot{display:flex;gap:.8rem;align-items:center;font-family:var(--font-mono);font-size:.8rem;color:var(--site-ink-2)}.sq-why{font-size:.9rem;min-height:1.3em}";
  document.head.appendChild(css);

  function make(box) {
    var kind = box.dataset.quiz, only = box.dataset.only ? box.dataset.only.split(",") : null, right = 0, tries = 0, n = 0;
    var q = el("div", "sq-q"), staff = el("div", "sq-staff"), ans = el("div", "sq-a"), why = el("div", "sq-why"), foot = el("div", "sq-foot");
    var score = el("span"), next = el("button", "btn btn-sm btn-outline-secondary", "Next →");
    foot.append(score, next); box.append(q, staff, ans, why, foot);
    var pool = POOL.filter(function (p) { return !only || only.indexOf(p[0]) >= 0; });
    if (only && !pool.length) only.forEach(function (id) { S.find(id).variants.forEach(function (_, k) { pool.push([id, k]); }); });

    function ask() {
      ans.innerHTML = ""; why.textContent = ""; staff.innerHTML = ""; staff.style.display = "none"; n++;
      var opts, correct, explain;
      if (/^(alto|tenor|bass|treble|clefs)$/.test(kind)) {
        var clef = kind === "clefs" ? pick(["alto", "tenor", "bass", "treble"]) : kind, r = RANGE[clef];
        var step = r[0] + Math.floor(Math.random() * (r[1] - r[0] + 1));
        q.textContent = "Name this note (" + clef + " clef).";
        staff.style.display = "";
        ABCJS.renderAbc(staff, "X:1\nL:1/1\nK:C clef=" + clef + "\n" + abcNote(step) + " |]", { staffwidth: 160, paddingtop: 0, paddingbottom: 0, paddingleft: 0 });
        opts = LET.split(""); correct = LET[step % 7];
        explain = "It is " + correct + Math.floor(step / 7) + (Math.floor(step / 7) === 4 && correct === "C" ? " (middle C)." : ".");
      } else {
        var p = pick(pool), i = S.find(p[0]), v = i.variants[p[1]];
        if (kind === "sound") {
          var L = Math.floor(Math.random() * 7), pc = ((PCV[L] + v.semis) % 12 + 12) % 12;
          q.textContent = "A " + who(i, v) + " part shows a written " + LET[L] + ". Which note sounds?";
          opts = PCS; correct = PCS[pc];
          explain = who(i, v) + " sounds " + S.intervalName(v.semis) + " than written, so written " + LET[L] + " sounds " + correct + ".";
        } else {
          var f = Math.floor(Math.random() * 9) - 4, rev = kind === "reverse";
          var res = S.moveKey(f, rev ? -v.semis : v.semis); if (res === 6) res = -6;
          q.textContent = rev ? "The concert key is " + S.keyName(f) + ". What key is the " + who(i, v) + " part in?"
            : "A " + who(i, v) + " part has " + S.sigName(f) + " (" + S.keyName(f) + "). What is the concert key?";
          opts = []; for (var k = -6; k <= 5; k++) opts.push(S.keyName(k).replace(" major", ""));
          correct = S.keyName(res).replace(" major", "");
          explain = who(i, v) + " sounds " + S.intervalName(v.semis) + " than written: " + (rev ? "the part goes the other way, to " : "so the key moves to ") + correct + " major (" + S.sigName(res) + ").";
        }
      }
      var done = false;
      opts.forEach(function (o) {
        var b = el("button", "btn btn-sm btn-outline-secondary", o); ans.appendChild(b);
        b.addEventListener("click", function () {
          if (done) return; tries++;
          if (o === correct) { done = true; right++; b.classList.add("sq-right"); why.textContent = "✓ " + explain; }
          else { b.classList.add("sq-wrong"); why.textContent = "Not " + o + ". Try again."; }
          score.textContent = right + " right of " + n + " asked";
        });
      });
      score.textContent = right + " right of " + (n - 1) + " asked";
    }
    next.addEventListener("click", ask); ask();
  }
  function init() { Array.prototype.forEach.call(document.querySelectorAll(".sq[data-quiz]"), make); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
