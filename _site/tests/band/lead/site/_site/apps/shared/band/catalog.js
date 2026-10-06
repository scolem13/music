// catalog.js — names and plain-language descriptions of what the backing band can play
// (BandCatalog). ONE list, read by the Backing Track page (its menus) and the
// Accompaniment Styles page (its catalog cards), so the two never drift apart.
// Load after comp.js: comping entries pick up their rhythm from BandComp.FIGURES.
//
//   BandCatalog.bass   -> [{ id, label, feel, desc, tags }]      id = ctx.opts.bassFeel
//   BandCatalog.comp   -> [{ id, label, feel, desc, tags, hits }] id = ctx.opts.compRhythm
//       hits = [[beat, "L" | "S"], ...] for a fixed one-bar figure (x.5 = the off-beat eighth,
//       L = held, S = short stab), or null when the rhythm is not one fixed bar.
//   BandCatalog.feels / .cymbals -> [{ id, label, desc }]         ids = opts.feel / opts.ride
//   BandCatalog.url({ bass, rhythm, feel, comp }) -> link that opens the Backing Track
//       page with those choices preselected (it reads the same query names).
// feel on an entry = the feel it is written for ("swing" | "straight" | "any").

(function (global) {
  var FIG = (global.BandComp && global.BandComp.FIGURES) || {};
  function hits(id){ return FIG[id] ? FIG[id].map(function (h){ return [h[0], h[1]]; }) : null; }

  var bass = [
    { id:"walk", label:"Walking", feel:"swing", tags:["Jazz","Swing","Blues"],
      desc:"One note on every beat (four quarter notes in 4/4, three in 3/4, dotted quarters in 12/8): the root on beat 1 when the chord changes, chord tones and scale steps in between, and an approach note on beat 4 that leads into the next bar." },
    { id:"two", label:"Two-feel", feel:"swing", tags:["Jazz","Swing"],
      desc:"Half notes on beats 1 and 3, root then fifth, with an occasional pickup into the next bar. The lighter feel a band often plays on the head before the bass starts to walk." },
    { id:"riff", label:"Boogaloo riff", feel:"straight", tags:["Boogaloo","Soul jazz","Rock"],
      desc:"A repeated straight-eighths figure: root on 1, root pushed on the and of 2, then a fifth and flat seventh on beat 4 leading back to the root. The kind of line under Watermelon Man. In 6/8 and 12/8 it becomes a shuffle: each beat played long-short, climbing root, 3rd, 5th, 6th." }
  ];

  var comp = [
    { id:"auto", label:"Varied", feel:"any", tags:["Jazz"],
      desc:"The band chooses: two-bar phrases built from the figures below, with some bars left empty. In straight eighths it plays the boogaloo stabs.", hits:null },
    { id:"charleston", label:"Charleston", feel:"swing", tags:["Jazz","Swing"],
      desc:"A held chord on beat 1 and a short one on the and of 2. The first comping rhythm most players learn.", hits:hits("charleston") },
    { id:"reverse", label:"Reverse Charleston", feel:"swing", tags:["Jazz","Swing"],
      desc:"The Charleston displaced: a short chord on the and of 1 and a held one on beat 3.", hits:hits("reverse") },
    { id:"garland", label:"Red Garland", feel:"swing", tags:["Jazz","Hard bop"],
      desc:"Chords on the and of 2 and the and of 4. The second one anticipates the next bar's chord and is held across the barline.", hits:hits("garland") },
    { id:"offbeats", label:"Off-beats", feel:"swing", tags:["Jazz"],
      desc:"Chords on the and of 1 and the and of 3, never on a downbeat.", hits:hits("offbeats") },
    { id:"pad", label:"Long notes", feel:"any", tags:["Ballad","Jazz"],
      desc:"One held chord per bar (or per chord). Leaves the most room for a soloist.", hits:hits("pad") },
    { id:"four", label:"Four to the bar", feel:"swing", tags:["Swing","Big band"],
      desc:"A short chord on every beat with 2 and 4 a little louder, the way Freddie Green played rhythm guitar.", hits:[[0,"S"],[1,"S"],[2,"S"],[3,"S"]] },
    { id:"stabs", label:"Boogaloo stabs", feel:"straight", tags:["Boogaloo","Soul jazz","Rock"],
      desc:"A stab on beat 1, the chord pushed and held on the and of 2, and sometimes an answering stab late in the bar. Locks with the boogaloo bass riff.", hits:[[0,"S"],[1.5,"L"]] }
  ];

  var feels = [
    { id:"swing", label:"Swing", desc:"Off-beat eighths are played late: close to a triplet at medium tempos, evening out as the tempo rises." },
    { id:"straight", label:"Straight eighths", desc:"Even eighths, with kick on 1 and 3 and cross-stick on 2 and 4." }
  ];
  var cymbals = [
    { id:"ride", label:"Ride", desc:"The ride cymbal keeps time, with the hi-hat foot on 2 and 4." },
    { id:"hat", label:"Closed hi-hat", desc:"Time on the closed hi-hat instead of the ride." },
    { id:"bell", label:"Ride bell", desc:"The bell of the ride on the beats, the bow of the cymbal in between." }
  ];

  function url(o){
    o = o || {}; var q = [];
    ["bass", "rhythm", "feel", "comp"].forEach(function (k){ if (o[k]) q.push(k + "=" + encodeURIComponent(o[k])); });
    return "/tools/backing-track.html" + (q.length ? "?" + q.join("&") : "");
  }
  function byId(list, id){ for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  global.BandCatalog = { bass: bass, comp: comp, feels: feels, cymbals: cymbals, url: url, byId: byId };
})(typeof window !== "undefined" ? window : globalThis);
