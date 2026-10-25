// modx-page.js — the MODX page (gear/modx-band.qmd): connect, call up the Performance, set the offset by ear, compare each site
// sound with the MODX's, route the winners, edit the drum maps. Everything it changes lives in BandModx.cfg (modx.js).
(function () {
  var M = window.BandModx, S = window.BandSounds, $ = function (id){ return document.getElementById(id); };
  var VKEY = "modx.verdicts", ctx = null, bank = null, timers = [];
  function audio(){
    if (!ctx){ ctx = new (window.AudioContext || window.webkitAudioContext)(); bank = S.create(ctx);
      if (window.AudioTap) window.AudioTap.register(ctx, ctx.destination, "MODX page"); }
    return ctx.resume().then(function (){ return bank; });
  }
  function later(fn, ms){ timers.push(setTimeout(fn, ms)); }
  function stopAll(){ timers.forEach(clearTimeout); timers = []; if (bank) bank.stopAll(); M.stop(); syncOn = false; $("mx-sync").textContent = "Start";
    Object.keys(M.cfg.routes).forEach(function (k){ M.force(k, null); }); }
  function verdicts(){ try { return JSON.parse(localStorage.getItem(VKEY) || "{}"); } catch (e) { return {}; } }
  function setVerdict(id, v){ var d = verdicts(); d[id] = v; try { localStorage.setItem(VKEY, JSON.stringify(d)); } catch (e) {} }

  // ---- connect ----
  function status(){
    var on = M.connected(), el = $("mx-status");
    el.textContent = on ? "Connected: " + M.portName() : "Not connected"; el.className = "mx-status " + (on ? "ok" : "bad");
    var sel = $("mx-port"), list = M.outputs();
    sel.innerHTML = list.length ? list.map(function (o){ return "<option value=\"" + o.id + "\">" + o.name.replace(/</g, "&lt;") + "</option>"; }).join("") : "<option>(not connected)</option>";
    if (on) sel.value = M.cfg.outId;
  }
  $("mx-connect").onclick = function (){ M.connect().then(status, function (e){ $("mx-status").textContent = e.message; $("mx-status").className = "mx-status bad"; }); };
  $("mx-port").onchange = function (){ M.useOutput(this.value); status(); };
  $("mx-on").checked = !!M.cfg.on;
  $("mx-on").onchange = function (){ M.cfg.on = this.checked; M.save(); if (this.checked && !M.connected()) $("mx-connect").onclick(); };
  M.onChange(status);

  // ---- performance ----
  [["mx-pch","ch"],["mx-msb","msb"],["mx-lsb","lsb"],["mx-pc","pc"]].forEach(function (p){
    var el = $(p[0]); el.value = M.cfg.perf[p[1]]; el.onchange = function (){ M.cfg.perf[p[1]] = +el.value || 0; M.save(); };
  });
  $("mx-perf-auto").checked = !!M.cfg.perf.sendOnConnect;
  $("mx-perf-auto").onchange = function (){ M.cfg.perf.sendOnConnect = this.checked; M.save(); };
  $("mx-perf").onclick = function (){ if (!M.selectPerformance()) $("mx-status").textContent = "Connect first."; };

  // ---- timing: a click from each side together, every half second ----
  var syncOn = false, off = $("mx-off");
  function showOff(){ $("mx-off-n").textContent = M.cfg.offsetMs; off.value = M.cfg.offsetMs; }
  off.oninput = function (){ M.cfg.offsetMs = +off.value; showOff(); M.save(); }; showOff();
  $("mx-sync").onclick = function (){
    if (syncOn){ stopAll(); return; }
    if (!M.connected()){ $("mx-status").textContent = "Connect first."; return; }
    audio().then(function (b){ return b.load(["kit"]).then(function (){
      syncOn = true; $("mx-sync").textContent = "Stop"; M.force("kit", "site");
      var next = ctx.currentTime + 0.2;
      (function tick(){
        if (!syncOn) return;
        while (next < ctx.currentTime + 0.3){ b.play("kit", { piece: "sticks", vel: 0.9 }, next); M.play("kit", { piece: "rim", vel: 0.9 }, next, ctx); next += 0.5; }
        later(tick, 100);
      })();
    }); });
  };

  // ---- compare: one phrase per row, notes as [beat, midi | piece, beats long, velocity] at 100 bpm ----
  var SPB = 0.6;
  function seq(notes){ return notes.map(function (n){ return typeof n[1] === "string" ? { at: n[0], piece: n[1], vel: n[3] || 0.75 } : { at: n[0], midi: n[1], dur: n[2], vel: n[3] || 0.7 }; }); }
  function chord(at, ms, beats, vel, roll){ return ms.map(function (m, i){ return [at + (roll || 0) * i, m, beats, vel]; }); }
  var BASS = seq([[0,36,.9],[1,40,.9],[2,43,.9],[3,45,.9],[4,46,.9],[5,45,.9],[6,43,.9],[7,41,.9],[8,36,3.5,.8]]);
  var KEYS = seq([].concat(chord(0,[48,52,55,59],1.8,.6), [[2,72,.45],[2.5,74,.45],[3,76,.45],[3.5,79,.9],[4.5,76,.45],[5,74,.9]],
                           chord(6,[41,53,57,60,64],5,.55), [[6,69,5,.6]]));
  var GTR  = seq([].concat(chord(0,[48,52,55,60,64],1.9,.7,.03), chord(2,[45,52,57,60,64],1.9,.6,.03), chord(4,[41,48,53,57,60],1.9,.65,.03),
                           chord(6,[43,47,50,55,59],1.9,.6,.03), [[8,64,.5],[8.5,67,.5],[9,69,.5],[9.5,72,1.5]]));
  function bar(at, list){ return list.map(function (x){ return [at + x[0], x[1], 0, x[2]]; }); }
  var e8 = [0,.5,1,1.5,2,2.5,3,3.5];
  var ROCK = seq([].concat(bar(0, [[0,"kick",.9],[2,"kick",.85],[1,"snare",.85],[3,"snare",.9]].concat(e8.map(function (b){ return [b,"hatClosed",b % 1 ? .5 : .7]; }))),
                           bar(4, [[0,"kick",.9],[2.5,"kick",.7],[2,"kick",.85],[1,"snare",.85],[3,"snare",.9],[3.5,"hatOpen",.6]].concat(e8.slice(0,7).map(function (b){ return [b,"hatClosed",b % 1 ? .5 : .7]; }))),
                           bar(8, [[0,"crash",.9],[0,"kick",.9]])));
  var JAZZ = seq([].concat([0,4].reduce(function (a, at){ return a.concat(bar(at, [[0,"ride",.7],[1,"ride",.75],[1.67,"ride",.55],[2,"ride",.7],[3,"ride",.75],[3.67,"ride",.55],[1,"hatFoot",.6],[3,"hatFoot",.6],[0,"kick",.35],[2,"kick",.3]])); }, []),
                           bar(8, [[0,"rideBell",.7]])));
  var FILL = seq(bar(0, [[0,"snare",.8],[.5,"snare",.7],[1,"tomHi",.8],[1.5,"tomHi",.7],[2,"tomMid",.8],[2.5,"tomMid",.75],[3,"tomLo",.85],[3.5,"tomLo",.8],[4,"crash",.95],[4,"kick",.95]]));
  var BRUSH = seq([0,4].reduce(function (a, at){ return a.concat(bar(at, [[0,"brushSweep",.7],[2,"brushSweep",.7],[1,"brushTap",.7],[3,"brushTap",.75],[1.67,"brushTap",.45],[3.67,"brushTap",.45],[0,"kick",.3]])); }, []));
  var CONGA = seq([0,4].reduce(function (a, at){ return a.concat(bar(at, [[0,"congaMute",.6],[1,"congaSlap",.85],[1.5,"congaMute",.5],[2,"congaHeel",.5],[2.5,"congaToe",.5],[3,"congaOpen",.8],[3.5,"tumbaOpen",.85]])); }, []));
  var PHRASE = { bass: BASS, piano: KEYS, guitar: GTR };
  var ROWS = [];
  ["bass","piano","guitar"].forEach(function (fam){ S.sounds(fam).forEach(function (s){ ROWS.push({ id: s.id, inst: s.id, label: s.label || s.id, notes: PHRASE[fam] }); }); });
  ROWS.forEach(function (r){ if (r.inst === "bass") r.label = "Bass (upright)"; if (r.inst === "ebass") r.label = "Bass (electric)"; if (r.inst === "piano") r.label = "Piano"; });
  ROWS.push({ id: "kit:rock", inst: "kit", label: "Drums: rock beat, crash", notes: ROCK }, { id: "kit:jazz", inst: "kit", label: "Drums: jazz ride", notes: JAZZ },
            { id: "kit:fill", inst: "kit", label: "Drums: tom fill", notes: FILL }, { id: "kit:brush", inst: "kit", label: "Drums: brushes", notes: BRUSH },
            { id: "congas", inst: "congas", label: "Congas: tumbao", notes: CONGA });
  function length(notes){ return notes.reduce(function (m, n){ return Math.max(m, n.at + (n.dur || 1)); }, 0) * SPB + 0.6; }
  function playRow(r, how, at){
    M.force(r.inst, how);
    var t0 = ctx.currentTime + 0.15 + (at || 0);
    r.notes.forEach(function (n){ bank.play(r.inst, n.piece ? { piece: n.piece, vel: n.vel } : { midi: n.midi, vel: n.vel, dur: n.dur * SPB }, t0 + n.at * SPB); });
  }
  function run(r, which){
    stopAll();
    if (which !== "site" && !M.connected()){ $("mx-status").textContent = "Connect first."; return; }
    // the MODX needs no samples: a failed download only silences the site's half
    audio().then(function (b){ return b.load([r.inst]).catch(function (e){ $("mx-win-msg").textContent = "The site's samples did not load (" + (e && e.message) + "): only the MODX will sound."; }); }).then(function (){
      var len = length(r.notes);
      if (which === "both"){ playRow(r, "site", 0); later(function (){ M.force(r.inst, null); playRow(r, "modx", 0); }, len * 1000); later(function (){ M.force(r.inst, null); }, len * 2000); }
      else { playRow(r, which, 0); later(function (){ M.force(r.inst, null); }, len * 1000); }
    });
  }
  function drawCompare(){
    var v = verdicts();
    $("mx-compare").innerHTML = "<tr><th>Sound</th><th>Play</th><th>Better</th></tr>" + ROWS.map(function (r, i){
      return "<tr><td>" + r.label + "</td><td><button data-i=\"" + i + "\" data-w=\"both\">▶ Site, then MODX</button> <button data-i=\"" + i + "\" data-w=\"site\">Site</button> <button data-i=\"" + i + "\" data-w=\"modx\">MODX</button></td>" +
        "<td class=\"mx-v\">" + ["site","same","modx"].map(function (k){ return "<button data-i=\"" + i + "\" data-v=\"" + k + "\"" + (v[r.id] === k ? " class=\"on\"" : "") + ">" + { site: "Site", same: "Same", modx: "MODX" }[k] + "</button>"; }).join(" ") + "</td></tr>";
    }).join("");
  }
  $("mx-compare").onclick = function (e){
    var b = e.target.closest("button"); if (!b) return; var r = ROWS[+b.dataset.i];
    if (b.dataset.w) run(r, b.dataset.w);
    if (b.dataset.v){ setVerdict(r.id, b.dataset.v); drawCompare(); }
  };
  $("mx-stop").onclick = stopAll;
  $("mx-win").onclick = function (){
    var v = verdicts(), score = {}, moved = [];
    ROWS.forEach(function (r){ var x = v[r.id]; if (x === "modx") score[r.inst] = (score[r.inst] || 0) + 1; if (x === "site") score[r.inst] = (score[r.inst] || 0) - 1; });
    Object.keys(score).forEach(function (k){ if (!M.cfg.routes[k]) return; var on = score[k] > 0; if (M.cfg.routes[k].on !== on) moved.push(k + (on ? " → MODX" : " → site")); M.cfg.routes[k].on = on; });
    M.save(); drawRoutes(); $("mx-win-msg").textContent = moved.length ? moved.join(", ") : "Nothing changed (instruments with no choice yet are left as they are).";
  };

  // ---- routing ----
  function nameOf(k){ var r = ROWS.filter(function (x){ return x.inst === k; })[0]; return k === "kit" ? "Drums" : k === "congas" ? "Congas" : r ? r.label : k; }
  function drawRoutes(){
    $("mx-routes").innerHTML = "<tr><th>Instrument</th><th>To the MODX</th><th>Channel</th></tr>" + Object.keys(M.cfg.routes).map(function (k){
      var r = M.cfg.routes[k];
      return "<tr><td>" + nameOf(k) + "</td><td><input type=\"checkbox\" data-k=\"" + k + "\"" + (r.on ? " checked" : "") + "></td><td><input type=\"number\" min=\"1\" max=\"16\" data-c=\"" + k + "\" value=\"" + r.ch + "\"></td></tr>";
    }).join("");
  }
  $("mx-routes").onchange = function (e){
    var t = e.target; if (t.dataset.k) M.cfg.routes[t.dataset.k].on = t.checked;
    if (t.dataset.c) M.cfg.routes[t.dataset.c].ch = Math.max(1, Math.min(16, +t.value || 1));
    M.save();
  };
  [["mx-pb","pbRange"],["mx-les","leslieCC"]].forEach(function (p){ var el = $(p[0]); el.value = M.cfg[p[1]]; el.onchange = function (){ M.cfg[p[1]] = +el.value; M.save(); }; });
  $("mx-reset").onclick = function (){ if (!confirm("Reset routing, channels, offset and drum maps here?")) return; M.reset(); location.reload(); };

  // ---- drum maps ----
  function drawMap(id, key, inst, title){
    var map = M.cfg[key];
    $(id).innerHTML = "<tr><th>" + title + "</th><th>Key</th><th></th></tr>" + Object.keys(map).map(function (p){
      return "<tr><td>" + p + "</td><td><input type=\"number\" min=\"0\" max=\"127\" data-p=\"" + p + "\" value=\"" + map[p] + "\"></td><td><button data-h=\"" + p + "\">▶</button></td></tr>"; }).join("");
    $(id).onchange = function (e){ var p = e.target.dataset.p; if (p){ map[p] = Math.max(0, Math.min(127, +e.target.value || 0)); M.save(); } };
    $(id).onclick = function (e){ var p = e.target.dataset && e.target.dataset.h; if (!p) return;
      if (!M.connected()){ $("mx-status").textContent = "Connect first."; return; }
      audio().then(function (){ M.play(inst, { piece: p, vel: 0.8 }, ctx.currentTime + 0.05, ctx); }); };
  }

  drawCompare(); drawRoutes(); drawMap("mx-kit", "kit", "kit", "Drum"); drawMap("mx-congas", "congas", "congas", "Hand drum"); status();
  if (M.cfg.on && !M.connected()) M.connect().then(status, function (){});
})();
