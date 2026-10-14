// hands.js — schematic hand drawings for the chord-shape lessons: finger numbers, and hand position.
//
//   <div class="hand-fig" data-hand="guitar-fret"></div>   fretting hand (left hand of a right-handed player), back of the hand: 1 2 3 4 and T
//   <div class="hand-fig" data-hand="guitar-pick"></div>   picking hand (right), back of the hand: p i m a (little finger c, rarely used)
//   <div class="hand-fig" data-hand="piano-left"></div>     left hand, back of the hand: 5 4 3 2 1
//   <div class="hand-fig" data-hand="piano-right"></div>    right hand, back of the hand: 1 2 3 4 5 (the mirror image of the left)
//   <div class="hand-fig" data-hand="guitar-side"></div>    side view: fretting hand on the neck, end-on cross-section (thumb, arched fingers)
//   <div class="hand-fig" data-hand="piano-side"></div>     side view: a hand on the keys (level wrist, curved finger)
//   <div class="hand-row"> ... </div>                       lays several figures side by side (wraps on a narrow screen)
//
// Colours are the site tokens (--site-ink, --site-surface-2, --site-accent ...), so the drawings follow light and dark.
// Self-contained: no other script is needed. Add data-caption="..." to override the caption under a figure.
(function (global) {
  var NS = "http://www.w3.org/2000/svg";
  var S = 'stroke="var(--site-ink)" stroke-width="2" stroke-linejoin="round"';
  var FILL = 'fill="var(--site-surface-2)"';

  // Back of a right hand (thumb on the left) in a 200 x 230 box; a left hand mirrors the x of everything.
  // Fingers: [centre x, top y]; thumb: base point and angle.
  var FING = [[70, 48], [95, 30], [120, 40], [143, 66]];
  function hand(left, labels, hint) {
    var m = left ? function (x) { return 200 - x; } : function (x) { return x; };
    var o;
    // wrist and palm
    o = '<rect x="68" y="196" width="64" height="34" rx="6" ' + FILL + ' ' + S + '/>';
    o += '<rect x="48" y="104" width="104" height="100" rx="22" ' + FILL + ' ' + S + '/>';
    var tips = [];
    FING.forEach(function (f, i) {
      o += '<rect x="' + (f[0] - 11) + '" y="' + f[1] + '" width="22" height="' + (118 - f[1]) + '" rx="11" ' + FILL + ' ' + S + '/>';
      tips.push([f[0], f[1] + 12]);
    });
    // thumb: a capsule leaning out from the base of the palm
    o += '<g transform="translate(56,175) rotate(-35)"><rect x="-12" y="-56" width="24" height="66" rx="12" ' + FILL + ' ' + S + '/></g>';
    tips.unshift([56 - 44 * Math.sin(35 * Math.PI / 180), 175 - 44 * Math.cos(35 * Math.PI / 180)]);
    // fingertip labels: thumb first, then index ... little (labels given in the same order)
    var t = '';
    tips.forEach(function (p, i) {
      var lab = labels[i]; if (lab == null) return;
      var small = hint && hint[i];
      t += '<circle cx="' + m(p[0]) + '" cy="' + p[1] + '" r="' + (small ? 8 : 11) + '" fill="' + (small ? 'var(--site-surface)' : 'var(--site-accent)') + '" ' + (small ? 'stroke="var(--site-ink-3)" stroke-width="1.5"' : 'stroke="var(--site-accent-dk)" stroke-width="1.5"') + '/>' +
           '<text x="' + m(p[0]) + '" y="' + (p[1] + 5) + '" text-anchor="middle" font-family="var(--font-mono)" font-weight="700" font-size="' + (small ? 12 : 15) + '" fill="' + (small ? 'var(--site-ink-3)' : 'var(--site-accent-text)') + '">' + lab + '</text>';
    });
    return '<g' + (left ? ' transform="translate(200,0) scale(-1,1)"' : '') + '>' + o + '</g>'+ t; // labels are drawn unmirrored, at mirrored positions
  }
  // the group above is mirrored as a whole for a left hand; labels were positioned with m(), so they sit outside the group
  function wrap(inner) { return '<svg viewBox="0 0 200 232" role="img" xmlns="' + NS + '">' + inner + '</svg>'; }

  // Side views. Skin is drawn as a thick ink stroke with a thinner surface stroke on top, so each limb has an outline.
  function limb(d, w) { return '<path d="' + d + '" fill="none" stroke="var(--site-ink)" stroke-width="' + (w + 4) + '" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="' + d + '" fill="none" stroke="var(--site-surface-2)" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>'; }
  function note(x, y, txt, anchor) { return '<text x="' + x + '" y="' + y + '" text-anchor="' + (anchor || 'start') + '" font-family="var(--font-mono)" font-size="11" fill="var(--site-ink-2)">' + txt + '</text>'; }
  function line(x1, y1, x2, y2) { return '<path d="M' + x1 + ',' + y1 + ' L' + x2 + ',' + y2 + '" stroke="var(--site-ink-3)" stroke-width="1" fill="none"/>'; }

  function guitarSide() {
    // end-on view of the neck: fretboard face on top, rounded back below. The hand comes from the left.
    var o = '<path d="M120,120 L250,120 L250,128 C250,176 224,202 185,202 C146,202 120,176 120,128 Z" fill="var(--site-surface)" stroke="var(--site-ink)" stroke-width="2"/>';
    o += '<rect x="120" y="114" width="130" height="8" fill="var(--site-ink-2)"/>';
    [140, 156, 172, 188, 204, 220].forEach(function (x) { o += '<circle cx="' + x + '" cy="111" r="2.4" fill="var(--site-ink)"/>'; });
    // palm and wrist, hanging out from the neck's left side, below the fretboard line
    o += limb('M10,150 L52,134 L72,130', 40);
    // finger: knuckle, middle joint, tip on the string just above the fret line, arched
    o += limb('M72,128 C84,84 128,66 176,106', 17);
    o += '<circle cx="178" cy="106" r="7" fill="var(--site-accent)" stroke="var(--site-accent-dk)" stroke-width="1.5"/>';
    // thumb behind the neck, pad on the back, opposite the middle of the fingers
    o += limb('M60,152 C84,184 120,200 144,200 C156,200 164,196 170,192', 17);
    o += '<circle cx="171" cy="194" r="7" fill="var(--site-accent)" stroke="var(--site-accent-dk)" stroke-width="1.5"/>';
    o += note(120, 38, 'fingers curved: tip, not pad', 'start') + line(150, 42, 172, 98);
    o += note(6, 214, 'wrist straight-ish', 'start') + line(40, 202, 36, 166);
    o += note(266, 150, 'thumb behind the', 'start') + note(266, 164, 'neck, about opposite', 'start') + note(266, 178, 'finger 2', 'start') + line(262, 164, 180, 186);
    o += note(266, 105, 'string', 'start') + line(262, 108, 228, 111);
    return '<svg viewBox="0 0 400 230" role="img" xmlns="' + NS + '">' + o + '</svg>';
  }
  function pianoSide() {
    // a hand seen from the side, keyboard to the right (away from the player); a black key raised behind the white
    var o = '<rect x="60" y="150" width="220" height="30" fill="var(--site-surface)" stroke="var(--site-ink)" stroke-width="2"/>';
    o += '<rect x="206" y="124" width="74" height="30" rx="2" fill="var(--site-ink)"/>';
    o += '<path d="M60,180 L60,196" stroke="var(--site-ink)" stroke-width="2"/>';
    o += '<circle cx="118" cy="108" r="52" fill="none" stroke="var(--site-ink-3)" stroke-width="1.5" stroke-dasharray="5 5"/>';
    o += limb('M4,104 L70,104', 26);                       // forearm, level
    o += limb('M70,104 C86,92 108,86 120,90', 26);         // back of the hand, knuckle a little above the wrist
    o += limb('M122,90 C146,92 160,110 164,146', 15);      // finger curved, tip down on the key
    o += '<circle cx="164" cy="148" r="6.5" fill="var(--site-accent)" stroke="var(--site-accent-dk)" stroke-width="1.5"/>';
    o += note(4, 62, 'wrist level with the keys', 'start') + line(20, 68, 28, 90);
    o += note(130, 22, 'curved, as if holding a ball', 'start') + line(150, 28, 132, 62);
    o += note(190, 62, 'fingertip, near the', 'start') + note(190, 76, 'front edge of the key', 'start') + line(214, 82, 170, 142);
    o += note(70, 198, 'white key', 'start') + note(206, 198, 'black key', 'start');
    return '<svg viewBox="0 0 400 215" role="img" xmlns="' + NS + '">' + o + '</svg>';
  }

  var FIGS = {
    "guitar-fret": { svg: function () { return wrap(hand(true, ["T", 1, 2, 3, 4])); }, cap: "Fretting hand (left), back of the hand: index 1, middle 2, ring 3, little 4, thumb T" },
    "guitar-pick": { svg: function () { return wrap(hand(false, ["p", "i", "m", "a", "c"], [0, 0, 0, 0, 1])); }, cap: "Picking hand (right), back of the hand: thumb p, index i, middle m, ring a" },
    "piano-left": { svg: function () { return wrap(hand(true, [1, 2, 3, 4, 5])); }, cap: "Piano, left hand: thumb 1 ... little finger 5" },
    "piano-right": { svg: function () { return wrap(hand(false, [1, 2, 3, 4, 5])); }, cap: "Piano, right hand: thumb 1 ... little finger 5" },
    "guitar-side": { svg: guitarSide, cap: "Fretting hand on the neck, seen end-on from the headstock side" },
    "piano-side": { svg: pianoSide, cap: "Hand on the keys, seen from the side" }
  };

  function init() {
    var css = document.createElement("style");
    css.textContent = ".hand-row{display:flex;flex-wrap:wrap;gap:.8rem;align-items:flex-end;margin:.8rem 0 1.2rem}" +
      ".hand-fig{margin:0;padding:.4rem;border:1px solid var(--site-border);border-radius:6px;background:var(--site-surface);width:150px;max-width:100%}" +
      ".hand-fig.wide{width:min(100%,380px)}" +
      ".hand-fig svg{width:100%;height:auto;display:block}" +
      ".hand-fig .hand-cap{font-size:.78rem;line-height:1.3;color:var(--site-ink-2);margin-top:.3rem}";
    document.head.appendChild(css);
    document.querySelectorAll(".hand-fig[data-hand]").forEach(function (box) {
      var f = FIGS[box.getAttribute("data-hand")]; if (!f) return;
      if (/side$/.test(box.getAttribute("data-hand"))) box.classList.add("wide");
      box.innerHTML = f.svg() + '<div class="hand-cap">' + (box.getAttribute("data-caption") || f.cap) + '</div>';
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  global.LessonHands = { init: init };
})(window);
