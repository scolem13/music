// catalog.js — names and plain-language descriptions of what the backing band can play
// (BandCatalog). ONE list, read by the Backing Track page (its menus) and the
// Accompaniment Styles page (its catalog cards), so the two never drift apart.
// Load after comp.js: comping entries pick up their rhythm from BandComp.FIGURES.
//
//   BandCatalog.bass   -> [{ id, label, feel, desc, tags }]      id = ctx.opts.bassFeel
//   BandCatalog.comp   -> [{ id, label, feel, desc, tags, hits }] id = ctx.opts.compRhythm
//       hits = [[beat, "L" | "S"], ...] for a fixed one-bar figure (x.5 = the off-beat eighth,
//       L = held, S = short stab), or null when the rhythm is not one fixed bar.
//   BandCatalog.drums  -> [{ id, label, feel, desc, tags }]       id = ctx.opts.groove
//   BandCatalog.voicings -> { piano: { <style id>: { fits, tags } }, guitar: { ... } }  (names live in BandHarmony.styleList)
//   Every entry carries group (the menu heading: "Jazz" | "Latin" | "Caribbean" | "Folk, rock and pop")
//   and fits = the ids of the styles it belongs in. The Backing Track page offers only what fits the
//   chosen style unless its Unlock box is ticked.
//   BandCatalog.styles -> [{ id, label, group, genres, desc, feel, bass, rhythm, drums, voicing:{ piano, guitar } }]
//       a genre and its defaults: the feel, bass line, comping rhythm, drum groove and voicings that belong together.
//   BandCatalog.fits(entry, styleId) -> does that entry belong in that style
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
      desc:"A repeated straight-eighths figure: root on 1, root pushed on the and of 2, then a fifth and flat seventh on beat 4 leading back to the root. The kind of line under Watermelon Man. In 6/8 and 12/8 it becomes a shuffle: each beat played long-short, climbing root, 3rd, 5th, 6th." },
    { id:"roots", label:"Roots on every beat", feel:"any", group:"Folk, rock and pop", tags:["Rock","Pop","Folk"],
      desc:"The root of the chord on every beat and nothing else. The plainest line there is, under driving eighths or a strummed song." },
    { id:"alt", label:"Root and fifth", feel:"any", group:"Folk, rock and pop", tags:["Folk","Country","Polka","Waltz","Calypso"],
      desc:"The boom of boom-chick: the root on beat 1 and the fifth on beat 3, short, the same every bar. In 3/4 it is one note a bar, root one bar and fifth the next." },
    { id:"bossa", label:"Bossa nova", feel:"straight", group:"Latin", tags:["Bossa nova","Latin"],
      desc:"Root on 1 and fifth on 3, each one set up by an eighth note just before it: the fifth on the and of 2, the next chord's root on the and of 4." },
    { id:"tango", label:"Tango (habanera)", feel:"straight", group:"Latin", tags:["Tango","Latin"],
      desc:"The habanera rhythm: root held for a beat and a half, the fifth on the and of 2, then the root an octave up on 3 and the fifth on 4." },
    { id:"tumbao", label:"Tumbao", feel:"straight", group:"Latin", tags:["Son montuno","Salsa","Latin"],
      desc:"The Cuban bass line that never plays beat 1: the fifth on the and of 2, then on beat 4 the root of the NEXT bar's chord, held over the barline." },
    { id:"chacha", label:"Cha-cha", feel:"straight", group:"Latin", tags:["Cha-cha","Latin"],
      desc:"Root held through beats 1 and 2, the fifth on 3 and the root again on 4." }
  ];
  bass.forEach(function (b){ if (!b.group) b.group = "Jazz"; });

  var comp = [
    { id:"auto", label:"Varied", feel:"any", tags:["Jazz"],
      desc:"The band chooses: two-bar phrases built from the swing figures, with some bars left empty. In straight eighths it plays the boogaloo stabs. Tick rhythms under it and it varies between just those.", hits:null },
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
      desc:"A stab on beat 1, the chord pushed and held on the and of 2, and sometimes an answering stab late in the bar. Locks with the boogaloo bass riff.", hits:[[0,"S"],[1.5,"L"]] },
    { id:"oompah", label:"Boom-chick / oom-pah-pah", feel:"any", group:"Folk, rock and pop", tags:["Folk","Country","Polka","Waltz"],
      desc:"Short chords on the beats the bass leaves free: 2 and 4 in 4/4, 2 and 3 in a waltz. Goes with the Root and fifth bass line.", hits:[[1,"S"],[3,"S"]] },
    { id:"eighths", label:"Driving eighths", feel:"straight", group:"Folk, rock and pop", tags:["Rock","Pop"],
      desc:"The chord on every eighth note, the beats a little louder than the off-beats.", hits:[[0,"S"],[0.5,"S"],[1,"S"],[1.5,"S"],[2,"S"],[2.5,"S"],[3,"S"],[3.5,"S"]] },
    { id:"upbeats", label:"Every off-beat", feel:"straight", group:"Caribbean", tags:["Ska","Reggae","Calypso"],
      desc:"A short chord on the and of every beat and never on the beat: the ska and calypso afterbeat.", hits:[[0.5,"S"],[1.5,"S"],[2.5,"S"],[3.5,"S"]] },
    { id:"bossa", label:"Bossa nova", feel:"straight", group:"Latin", tags:["Bossa nova","Latin"],
      desc:"A two-bar pattern. First bar (shown): beat 1, the and of 2 held, beat 3. Second bar: beat 2 and the and of 3.", hits:[[0,"S"],[1.5,"L"],[3,"S"]] },
    { id:"tango", label:"Tango (habanera)", feel:"straight", group:"Latin", tags:["Tango","Latin"],
      desc:"A held chord on 1, then short ones on the and of 2, on 3 and on 4.", hits:[[0,"L"],[1.5,"S"],[2,"S"],[3,"S"]] },
    { id:"montuno", label:"Son montuno", feel:"straight", group:"Latin", tags:["Son montuno","Salsa","Latin"],
      desc:"A two-bar pattern of short chords. First bar (shown): 1, 2, the and of 2, the and of 3, the and of 4. Second bar: every off-beat. Here it is played as block chords, not the pianist's broken octaves.", hits:[[0,"S"],[1,"S"],[1.5,"S"],[2.5,"S"],[3.5,"S"]] },
    { id:"chacha", label:"Cha-cha", feel:"straight", group:"Latin", tags:["Cha-cha","Latin"],
      desc:"A chord on 2, then the cha-cha-cha: 3, the and of 3, and 4.", hits:[[1,"S"],[2,"S"],[2.5,"S"],[3,"L"]] },
    { id:"arp", label:"Arpeggio, up and down", feel:"any", group:"Folk, rock and pop", tags:["Ballad","Pop"],
      desc:"The notes of the voicing one at a time in eighth notes, up to the top and back down, each left to ring.", hits:[[0,"S"],[0.5,"S"],[1,"S"],[1.5,"S"],[2,"S"],[2.5,"S"],[3,"S"],[3.5,"S"]] },
    { id:"arp2", label:"Arpeggio, low and high", feel:"any", group:"Folk, rock and pop", tags:["Ballad","Pop","Folk"],
      desc:"Eighth notes rocking between the lowest and the highest note of the voicing.", hits:[[0,"S"],[0.5,"S"],[1,"S"],[1.5,"S"],[2,"S"],[2.5,"S"],[3,"S"],[3.5,"S"]] }
  ];
  comp.forEach(function (c){ if (!c.group) c.group = "Jazz"; });

  var drums = [
    { id:"auto", label:"Jazz time", feel:"any", group:"Jazz", tags:["Jazz","Swing","Boogaloo"],
      desc:"Follows the Feel menu. Swing: the ride pattern, hi-hat foot on 2 and 4, a feathered kick and a little snare. Straight eighths: eighths on the cymbal, kick on 1 and 3, cross-stick on 2 and 4." },
    { id:"funk", label:"Funk", feel:"straight", group:"Jazz", tags:["Funk","Boogaloo","Soul jazz"],
      desc:"Snare on 2 and 4 with a syncopated kick: beat 1, the and of 2 and the and of 3. Eighths on the cymbal." },
    { id:"bossa", label:"Bossa nova", feel:"straight", group:"Latin", tags:["Bossa nova"],
      desc:"Eighths on the cymbal, the kick on 1 and 3 with an eighth-note pickup before each, and the two-bar bossa clave on the cross-stick." },
    { id:"clave", label:"Son clave (2-3)", feel:"straight", group:"Latin", tags:["Son montuno","Salsa","Mambo"],
      desc:"The 2-3 son clave on the cross-stick over two bars, a bell pattern on the cymbal and a light kick with the tumbao bass. A drum-kit stand-in for the congas, timbales and clave of a real section." },
    { id:"chacha", label:"Cha-cha", feel:"straight", group:"Latin", tags:["Cha-cha"],
      desc:"The cymbal on every beat like the cha-cha bell, cross-stick on 2, and two tom notes on 4 and the and of 4." },
    { id:"tango", label:"Tango", feel:"straight", group:"Latin", tags:["Tango"],
      desc:"A light habanera on the kick under quarter notes on the cymbal. Tango bands rarely carry a drum kit, so this stays out of the way." },
    { id:"calypso", label:"Calypso", feel:"straight", group:"Caribbean", tags:["Calypso"],
      desc:"Kick on 1 and 3, cross-stick on the and of 2 and on 4, and cymbal eighths that lean on the off-beats." },
    { id:"onedrop", label:"Reggae one-drop", feel:"straight", group:"Caribbean", tags:["Reggae","Ska"],
      desc:"Nothing on beat 1. Kick and cross-stick together on beat 3, with cymbal eighths that lean on the off-beats." },
    { id:"boomchick", label:"Two-beat", feel:"any", group:"Folk, rock and pop", tags:["Folk","Country","Polka","Waltz"],
      desc:"Kick with the bass on 1 and 3, a soft snare with the chords on 2 and 4. In 3/4: kick on 1, snare on 2 and 3." },
    { id:"rock", label:"Rock backbeat", feel:"straight", group:"Folk, rock and pop", tags:["Rock","Pop"],
      desc:"Eighths on the cymbal, kick on 1, 3 and the and of 3, a full snare on 2 and 4." },
    { id:"halftime", label:"Half-time", feel:"straight", group:"Folk, rock and pop", tags:["Pop","Ballad","Rock"],
      desc:"The backbeat at half speed: kick on 1 and the and of 2, one snare on beat 3." }
  ];

  // which styles each entry belongs in
  var FITS = {
    bass: { walk:"swing ballad", two:"swing ballad", riff:"boogaloo", roots:"rock pop folk reggae", alt:"folk calypso reggae pop",
            bossa:"bossa", tango:"tango", tumbao:"montuno chacha", chacha:"chacha" },
    comp: { auto:"swing ballad boogaloo", charleston:"swing ballad", reverse:"swing", garland:"swing", offbeats:"swing", four:"swing", stabs:"boogaloo",
            pad:"swing ballad boogaloo bossa tango pop folk rock", oompah:"folk", eighths:"rock pop", upbeats:"calypso reggae", bossa:"bossa", tango:"tango",
            montuno:"montuno", chacha:"chacha", arp:"pop ballad folk", arp2:"pop folk" },
    drums: { auto:"swing ballad boogaloo", funk:"boogaloo rock", bossa:"bossa", clave:"montuno", chacha:"chacha", tango:"tango", calypso:"calypso",
             onedrop:"reggae", boomchick:"folk", rock:"rock pop", halftime:"pop rock" }
  };
  var JAZZ = "swing ballad boogaloo", PLAIN = "folk rock pop calypso reggae tango montuno chacha";
  var VOICE = {
    piano: { standard:[PLAIN, "Folk, rock, pop, Latin"], shell:[JAZZ + " bossa", "Jazz, bossa nova"], guide:[JAZZ, "Jazz"], rootless:[JAZZ + " bossa", "Jazz, bossa nova"],
             drop2:["swing ballad bossa tango montuno chacha", "Jazz, Latin"], drop3:["swing ballad bossa", "Jazz, bossa nova"], bh:["swing ballad", "Bebop"], auto:[JAZZ, "Jazz"] },
    guitar: { drop2:["swing ballad bossa tango montuno chacha", "Jazz, Latin"], drop3:["swing ballad bossa", "Jazz, bossa nova"], triad3:[PLAIN, "Folk, rock, pop, Latin"],
              shell3:[JAZZ + " bossa", "Jazz, bossa nova"], triadvl:[PLAIN, "Folk, rock, pop, Latin"], uppervl:[JAZZ + " bossa", "Jazz, bossa nova"], guide2:[JAZZ, "Jazz"],
              top3:[JAZZ + " bossa calypso reggae", "Jazz, funk, reggae"], mid3:[JAZZ + " bossa rock", "Jazz, funk, rock"], bh:["swing ballad", "Bebop"], auto:[JAZZ, "Jazz"] }
  };
  [["bass", bass], ["comp", comp], ["drums", drums]].forEach(function (p){ p[1].forEach(function (e){ e.fits = (FITS[p[0]][e.id] || "").split(" ").filter(Boolean); }); });
  var voicings = {};
  Object.keys(VOICE).forEach(function (inst){ voicings[inst] = {}; Object.keys(VOICE[inst]).forEach(function (id){
    voicings[inst][id] = { fits: VOICE[inst][id][0].split(" "), tags: VOICE[inst][id][1].split(", ") }; }); });

  var PLAINV = { piano:"standard", guitar:"triad3" }, JAZZV = { piano:"rootless", guitar:"shell3" };
  var styles = [
    { id:"swing", label:"Swing", group:"Jazz", genres:"Swing, bebop, hard bop, jazz blues", feel:"swing", bass:"walk", rhythm:"auto", drums:"auto", voicing:JAZZV,
      desc:"Walking bass, the ride cymbal and syncopated comping." },
    { id:"ballad", label:"Jazz ballad", group:"Jazz", genres:"Ballads, slow standards", feel:"swing", bass:"two", rhythm:"pad", drums:"auto", voicing:JAZZV,
      desc:"Bass in two, long chords, quiet time." },
    { id:"boogaloo", label:"Boogaloo", group:"Jazz", genres:"Boogaloo, soul jazz, funky blues", feel:"straight", bass:"riff", rhythm:"stabs", drums:"auto", voicing:JAZZV,
      desc:"A straight-eighths bass riff with chord stabs locked to it, as in Watermelon Man." },
    { id:"bossa", label:"Bossa nova", group:"Latin", genres:"Bossa nova, slow samba", feel:"straight", bass:"bossa", rhythm:"bossa", drums:"bossa", voicing:JAZZV,
      desc:"Root-and-fifth bass with pickups, a two-bar comping pattern and the bossa clave on the cross-stick." },
    { id:"montuno", label:"Son montuno", group:"Latin", genres:"Son, salsa, mambo", feel:"straight", bass:"tumbao", rhythm:"montuno", drums:"clave", voicing:PLAINV,
      desc:"Tumbao bass that anticipates each bar, the two-bar montuno rhythm and 2-3 son clave." },
    { id:"chacha", label:"Cha-cha", group:"Latin", genres:"Cha-cha-ch\u00e1", feel:"straight", bass:"chacha", rhythm:"chacha", drums:"chacha", voicing:PLAINV,
      desc:"A steady bell on the beats with the cha-cha-cha on 3, the and of 3, and 4." },
    { id:"tango", label:"Tango", group:"Latin", genres:"Tango, habanera", feel:"straight", bass:"tango", rhythm:"tango", drums:"tango", voicing:PLAINV,
      desc:"The habanera rhythm in the bass and chords." },
    { id:"calypso", label:"Calypso", group:"Caribbean", genres:"Calypso, mento, soca", feel:"straight", bass:"alt", rhythm:"upbeats", drums:"calypso", voicing:PLAINV,
      desc:"Root-and-fifth bass with chords on every off-beat." },
    { id:"reggae", label:"Ska / reggae", group:"Caribbean", genres:"Reggae, ska, rocksteady", feel:"straight", bass:"roots", rhythm:"upbeats", drums:"onedrop", voicing:PLAINV,
      desc:"Off-beat chords over a one-drop: the drums leave beat 1 empty." },
    { id:"folk", label:"Boom-chick", group:"Folk, rock and pop", genres:"Folk, country, polka; waltzes in 3/4", feel:"straight", bass:"alt", rhythm:"oompah", drums:"boomchick", voicing:PLAINV,
      desc:"Bass on 1 and 3, chords on 2 and 4. In 3/4 it is oom-pah-pah." },
    { id:"rock", label:"Rock", group:"Folk, rock and pop", genres:"Rock, pop-rock", feel:"straight", bass:"roots", rhythm:"eighths", drums:"rock", voicing:PLAINV,
      desc:"Root notes on the beat, chords in driving eighths and a backbeat." },
    { id:"pop", label:"Pop ballad", group:"Folk, rock and pop", genres:"Pop and rock ballads", feel:"straight", bass:"roots", rhythm:"arp", drums:"halftime", voicing:PLAINV,
      desc:"Arpeggiated chords over a half-time beat." }
  ];
  function fits(entry, styleId){ return !!(entry && entry.fits && entry.fits.indexOf(styleId) >= 0); }

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
    ["style", "bass", "rhythm", "drums", "feel", "comp"].forEach(function (k){ if (o[k]) q.push(k + "=" + encodeURIComponent(o[k])); });
    return "/tools/backing-track.html" + (q.length ? "?" + q.join("&") : "");
  }
  function byId(list, id){ for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  global.BandCatalog = { bass: bass, comp: comp, drums: drums, voicings: voicings, styles: styles, fits: fits, feels: feels, cymbals: cymbals, url: url, byId: byId };
})(typeof window !== "undefined" ? window : globalThis);
