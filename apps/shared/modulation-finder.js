// modulation-finder.js — theory/analysed-scores/modulation-finder.qmd: every textbook modulation on the Analysed Scores pages in one
// list, filtered by the starting key's mode, the final key's mode, the distance in half steps from the first tonic up to the last, and
// the book. Data: <script id="mf-data"> (scripts/when-in-rome/build.mjs: id, book, name, page, anchor, head, from, to, path, bpm, keys,
// chords, abc). Each shown result is an .as-score made live by AnalysedScores.add (analysed-scores.js), so it plays and takes the
// page's beam and tenor buttons. The filters are kept in the address (?start=major&end=minor&dist=7&book=reger) so a search can be shared.
(function () {
  var DATA = JSON.parse(document.getElementById("mf-data").textContent);
  var NAT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var INTERVAL = ["same tonic", "minor 2nd up", "major 2nd up", "minor 3rd up", "major 3rd up", "perfect 4th up", "tritone",
    "perfect 5th up", "minor 6th up", "major 6th up", "minor 7th up", "major 7th up"];
  var PAGE = 8;   // scores drawn at a time

  function pc(k) { var m = /^([A-Ga-g])(#+|b+)?/.exec(k), a = !m[2] ? 0 : (m[2][0] === "#" ? 1 : -1) * m[2].length; return (NAT[m[1].toUpperCase()] + a + 24) % 12; }
  function minor(k) { return k[0] === k[0].toLowerCase(); }
  function keyName(k) {
    var acc = k.slice(1).replace(/^bb/, "𝄫").replace(/^b/, "♭").replace(/^##/, "𝄪").replace(/^#/, "♯");
    return k[0].toUpperCase() + acc + (minor(k) ? " minor" : " major");
  }
  function short(k) { return k[0] + k.slice(1).replace(/^bb/, "𝄫").replace(/^b/, "♭").replace(/^##/, "𝄪").replace(/^#/, "♯"); }
  function prep(x) { x.dist = (pc(x.to) - pc(x.from) + 12) % 12; x.startMode = minor(x.from) ? "minor" : "major"; x.endMode = minor(x.to) ? "minor" : "major"; }
  DATA.forEach(prep);

  var root = document.getElementById("mf"), $ = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(location.search);
  function bookList() {
    var books = []; DATA.forEach(function (x) { if (!books.some(function (b) { return b.key === x.book; })) books.push({ key: x.book, name: x.name, real: !x.page }); });
    var keep = $("mf-book").value || q.get("book") || "";
    $("mf-book").innerHTML = '<option value="">Textbooks and real pieces</option><option value="@text">Textbooks only</option><option value="@real">Real pieces only</option>' +
      books.map(function (b) { return '<option value="' + b.key + '">' + b.name + "</option>"; }).join("");
    $("mf-book").value = keep; if ($("mf-book").value !== keep) $("mf-book").value = "";
  }
  bookList();

  $("mf-start").value = q.get("start") || ""; $("mf-end").value = q.get("end") || ""; $("mf-book").value = q.get("book") || "";
  var dist = q.get("dist") === null || q.get("dist") === "" ? null : +q.get("dist"), shown = 0, hosts = [];

  function base() {   // every filter but the distance
    var s = $("mf-start").value, e = $("mf-end").value, b = $("mf-book").value;
    return DATA.filter(function (x) { return (!s || x.startMode === s) && (!e || x.endMode === e) && (!b || x.book === b || (b === "@text" && x.page) || (b === "@real" && !x.page)); });
  }
  function update() {
    var pool = base(), counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; pool.forEach(function (x) { counts[x.dist]++; });
    var max = Math.max.apply(null, counts.concat([1]));
    $("mf-dist").innerHTML = '<button type="button" class="mf-d mf-any" data-d="" aria-pressed="' + (dist === null) + '"><span class="mf-n">' + pool.length + '</span><span class="mf-l">Any distance</span></button>' +
      counts.map(function (c, d) {
        return '<button type="button" class="mf-d" data-d="' + d + '" aria-pressed="' + (dist === d) + '"' + (c ? "" : " disabled") + ' title="' + d + " half step" + (d === 1 ? "" : "s") + ": " + INTERVAL[d] + '">' +
          '<span class="mf-bar"><span style="height:' + Math.round(100 * c / max) + '%"></span></span><span class="mf-n">' + c + '</span><span class="mf-l">' + d + "</span></button>";
      }).join("");
    var list = dist === null ? pool : pool.filter(function (x) { return x.dist === dist; });
    $("mf-summary").textContent = list.length + (list.length === 1 ? " modulation" : " modulations") + (dist === null ? "" : ", " + dist + " half step" + (dist === 1 ? "" : "s") + " (" + INTERVAL[dist] + ")");
    var p = new URLSearchParams(); if ($("mf-start").value) p.set("start", $("mf-start").value); if ($("mf-end").value) p.set("end", $("mf-end").value);
    if (dist !== null) p.set("dist", dist); if ($("mf-book").value) p.set("book", $("mf-book").value);
    try { history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "")); } catch (e) {}
    hosts.forEach(function (h) { window.AnalysedScores.remove(h); }); hosts = [];
    $("mf-results").innerHTML = ""; shown = 0; current = list; more();
  }
  var current = [];
  function more() {
    var box = $("mf-results");
    current.slice(shown, shown + PAGE).forEach(function (x) {
      var card = document.createElement("article"); card.className = "mf-card";
      var href = x.page ? x.page + ".html#" + x.anchor : x.url, ext = x.page ? "" : ' target="_blank" rel="noopener" title="The analysis in When in Rome"';
      card.innerHTML = '<header><h3><a href="' + href + '"' + ext + ">" + x.head + '</a></h3><p class="mf-meta">' + x.name + (x.analyst ? " · analysis: " + x.analyst : "") +
        ' · <span class="mf-path">' + x.path.map(short).join(" → ") + '</span> · ' + keyName(x.from) + " to " + keyName(x.to) + ", " + x.dist + " half step" + (x.dist === 1 ? "" : "s") + "</p></header>";
      var host = document.createElement("div"); host.className = "as-score";
      host.setAttribute("data-piece", "mf-" + x.id); host.setAttribute("data-keys", JSON.stringify(x.keys)); host.setAttribute("data-bpm", x.bpm);
      host.setAttribute("data-pickup", "0"); host.setAttribute("data-chords", JSON.stringify(x.chords));
      var src = document.createElement("script"); src.type = "text/plain"; src.textContent = x.abc; host.appendChild(src);
      card.appendChild(host); box.appendChild(card); window.AnalysedScores.add(host); hosts.push(host);
    });
    shown = Math.min(current.length, shown + PAGE);
    $("mf-more").hidden = shown >= current.length;
    $("mf-more").textContent = "Show " + Math.min(PAGE, current.length - shown) + " more (" + (current.length - shown) + " left)";
  }
  ["mf-start", "mf-end", "mf-book"].forEach(function (id) { $(id).addEventListener("change", update); });
  $("mf-dist").addEventListener("click", function (e) { var b = e.target.closest(".mf-d"); if (!b || b.disabled) return; dist = b.getAttribute("data-d") === "" ? null : +b.getAttribute("data-d"); update(); });
  $("mf-more").addEventListener("click", more);
  $("mf-reset").addEventListener("click", function () { $("mf-start").value = ""; $("mf-end").value = ""; $("mf-book").value = ""; dist = null; update(); });
  update();
  // the excerpts from real pieces (scripts/when-in-rome/corpus.mjs), loaded after the page shows
  $("mf-summary").insertAdjacentHTML("afterend", '<span id="mf-loading" class="mf-loading">Loading passages from real pieces…</span>');
  fetch("/apps/shared/data/modulation-corpus.json?v=1").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (more) {
    more.forEach(function (x) { prep(x); DATA.push(x); }); bookList(); update();
  }).catch(function () { $("mf-loading").textContent = "The passages from real pieces did not load; the textbook examples are all here."; return true; })
    .then(function (failed) { if (!failed) { var l = $("mf-loading"); if (l) l.remove(); } });
})();
