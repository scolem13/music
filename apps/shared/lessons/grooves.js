// grooves.js — the Pieces, Songs and Grooves lessons (global GroovesQuiz).
// <div class="gq" data-title="…"></div> becomes a sorting quiz: one example at a time (title, artist, a link to Ethan Hein's post on
// it), buttons Piece / Song / Groove / In between; the answer is the category Hein gives it in "Pieces vs Songs vs Grooves" (2021),
// with his reason for the in-between ones. Score and a Next button; each answer goes to SiteRecord (tool "grooves") when loaded.
//   GroovesQuiz.items -> the list;  GroovesQuiz.widgets -> [{ host, ask(i), answer(cat), current() }]
(function (global) {
  "use strict";
  var B = "http://www.ethanhein.com/wp/";
  var ITEMS = [
    ["Bach fugues (The Art of Fugue)", "J. S. Bach", "piece", "tag/art-of-fugue/"],
    ["Nocturne Op. 9 No. 1", "Frédéric Chopin", "piece", "2020/jazzy-harmony-and-crazy-tuplets-in-chopins-nocturne-op-9-no-1/"],
    ["Pathétique Sonata", "Ludwig van Beethoven", "piece", "2020/beethovens-pathetique-sonata/"],
    ["Mikrokosmos No. 133, Syncopation", "Béla Bartók", "piece", "2020/remixing-bartoks-mikrokosmos-no-133-syncopation/"],
    ["Kiss", "Prince", "song", "2021/the-best-guitar-solo-ever-recorded/"],
    ["Wellerman", "", "song", "2021/wellerman/"],
    ["Children of Production", "Parliament", "song", "2020/children-of-production/"],
    ["Greensleeves", "", "song", "2020/greensleeves/"],
    ["Eleanor Rigby", "The Beatles", "song", "2020/eleanor-rigby/"],
    ["Oye Como Va", "Santana", "groove", "2021/oye-como-va/"],
    ["Green Onions", "Booker T. & the MGs", "groove", "2021/green-onions/"],
    ["Sonnymoon for Two", "Sonny Rollins", "groove", "2021/sonnymoon-for-two/"],
    ["Don't See Us", "The Roots", "groove", "2021/the-roots-dont-see-us/"],
    ["Get Ur Freak On", "Missy Elliott", "groove", "2020/transcribing-missy-elliott/"],
    ["Chain of Fools", "Aretha Franklin", "groove", "2021/chain-of-fools/"],
    ["Keep On Truckin'", "Eddie Kendricks", "between", "2021/keep-on-truckin/", "Excellent grooves organized into a nominal song structure."],
    ["Chaconne", "J. S. Bach", "between", "2021/deep-dive-into-the-bach-chaconne/", "A piece that rests on a groove foundation."],
    ["My Favorite Things", "John Coltrane's version", "between", "2021/my-favorite-things/", "A song from The Sound of Music that Coltrane turned into a groove."],
    ["In a Silent Way", "Miles Davis", "between", "2021/miles-davis-in-a-silent-way/", "Grooves edited together into a large-scale piece."]
  ].map(function (r) { return { title: r[0], who: r[1], cat: r[2], url: B + r[3], why: r[4] || "" }; });
  var NAMES = { piece: "Piece", song: "Song", groove: "Groove", between: "In between" };
  var WHY = { piece: "linear: non-repeating events in a set order", song: "a linear arrangement of circular parts",
              groove: "a short cell that repeats, with no larger-scale structure" };
  var widgets = [];
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function mount(host) {
    var order = ITEMS.map(function (_, i) { return i; }), pos = 0, right = 0, done = 0, cur = -1, answered = false;
    for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
    host.innerHTML = "";
    if (host.dataset.title) host.appendChild(el("div", "gq-title", host.dataset.title));
    var card = el("div", "gq-card"), btns = el("div", "gq-btns"), fb = el("div", "gq-fb"), foot = el("div", "gq-foot");
    var score = el("span", "gq-score"), next = el("button", "btn btn-sm btn-outline-secondary", "Next →");
    foot.appendChild(score); foot.appendChild(next);
    Object.keys(NAMES).forEach(function (k) {
      var b = el("button", "btn btn-sm btn-outline-primary", NAMES[k]); b.dataset.cat = k;
      b.addEventListener("click", function () { answer(k); }); btns.appendChild(b);
    });
    host.appendChild(card); host.appendChild(btns); host.appendChild(fb); host.appendChild(foot);
    function ask(i) {
      cur = i; answered = false; var it = ITEMS[i];
      card.innerHTML = ""; card.appendChild(el("b", null, it.title)); if (it.who) card.appendChild(el("span", "gq-who", " · " + it.who));
      fb.textContent = ""; fb.className = "gq-fb";
      [].forEach.call(btns.children, function (b) { b.disabled = false; b.classList.remove("gq-right", "gq-wrong"); });
      score.textContent = right + " / " + done;
    }
    function answer(k) {
      if (answered) return; answered = true; done++; var it = ITEMS[cur], ok = k === it.cat; if (ok) right++;
      [].forEach.call(btns.children, function (b) { b.disabled = true; if (b.dataset.cat === it.cat) b.classList.add("gq-right"); else if (b.dataset.cat === k) b.classList.add("gq-wrong"); });
      fb.className = "gq-fb " + (ok ? "ok" : "no");
      fb.innerHTML = "";
      fb.appendChild(document.createTextNode((ok ? "Yes. " : "Hein calls it: " + NAMES[it.cat] + ". ") + (it.why || WHY[it.cat] + ".") + " "));
      var a = el("a", null, "His post on it"); a.href = it.url; a.target = "_blank"; a.rel = "noopener"; fb.appendChild(a);
      score.textContent = right + " / " + done;
      try {
        if (global.SiteRecord) {
          var rec = global.SiteRecord.add("grooves", { ex: "Pieces, songs and grooves", q: { text: "Piece, song or groove? " + it.title }, want: NAMES[it.cat] });
          rec.at.push([NAMES[k], ok ? 1 : 0, 0]); global.SiteRecord.save();
        }
      } catch (e) {}
    }
    next.addEventListener("click", function () { pos = (pos + 1) % order.length; ask(order[pos]); });
    ask(order[0]);
    var w = { host: host, ask: ask, answer: answer, current: function () { return ITEMS[cur].cat; } };
    widgets.push(w); return w;
  }
  function boot() { [].forEach.call(document.querySelectorAll("div.gq"), mount); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  global.GroovesQuiz = { items: ITEMS, widgets: widgets, mount: mount };
})(window);
