// rhythm-library.js — the Rhythm Library (tools/rhythm-library.qmd, global RhythmLibrary): named timelines (claves, bell patterns,
// cells) as x/. grids, each with a Polyrhythm player (apps/shared/polyrhythm.js) under it.
//
// An entry:
//   id, name, aka: [other names], fam: section id (FAMS), grid: "x..x..x...x.x..." (x onset, . rest; one char a pulse),
//   beats: main beats in the cycle (the player's beat layer), where: region / music, about: what the source says,
//   rel: how it relates to others, src: key in SRC, check: "read" (grid read from the source's own box notation or text grid)
//   or "derived" (worked out from the source's staff notation or prose: the page says so).
// Rules for adding one: the grid comes from a source in SRC, never from memory; a new source also goes in
// scripts/sources/rhythm-library.py. Test: node tests/rhythm-library/rhythm-library.test.js (NEG=1 must fail).
(function (global) {
  var SRC = {
    t2002: "Toussaint 2002, “A Mathematical Analysis of African, Brazilian, and Cuban Clave Rhythms” (Bridges), Fig. 3 and §2",
    t2003: "Toussaint 2003, “Classification and Phylogenetic Analysis of African Ternary Rhythm Timelines” (Bridges), Fig. 3 and §2",
    wClave: "Wikipedia, “Clave (rhythm)”",
    wBell: "Wikipedia, “Bell pattern”",
    wTres: "Wikipedia, “Tresillo (rhythm)”",
    wCinq: "Wikipedia, “Cinquillo”",
    wContra: "Wikipedia, “Contradanza” (the Habanera article redirects there)",
    wBo: "Wikipedia, “Bo Diddley beat”",
    wClaveBr: "Wikipedia, “Clave (rhythm)”, section “Other Brazilian examples” (its list of agogô / surdo strings; the article gives no source for the list)",
    tBook: "Toussaint, The Geometry of Musical Rhythm, 2nd ed. (2020)",
    kippen: "Kippen, “Hindustani Tāla”, Garland Encyclopedia of World Music vol. 5 (2000), pp. 110-37; checked against Clayton, Time in Indian Music (2000), Ex. 5.1 pp. 58-59, and Courtney's tal pages",
    nelson: "Nelson, “Karnatak Tāla”, Garland Encyclopedia of World Music vol. 5 (2000), pp. 138-57",
    court: "Courtney, “Index of Tals” (chandrakantha.com; thekas reprinted from his Learning the Tabla), cross-checked with the Wikipedia tala articles",
    wTala: "Wikipedia, “Tala (music)”: sections Strokes, Jatis, Gati and the Suladi Sapta Tala table",
    panyam: "Wikipedia, “Tala (music)” (Khanda chapu a 10-count, Misra chapu a 14-count); grouping from Panyam, “Common Talas” (Notations Library)",
    jingju: "Wichmann, Listening to Theatre (1991), pp. 59-70 and Fig. 7"
  };

  var FAMS = [
    { id: "four", title: "The six 4/4 timelines (Toussaint)" },
    { id: "clave", title: "Claves: 2-3, 3-2 and 12/8 forms" },
    { id: "cells", title: "Tresillo and its family" },
    { id: "twelve", title: "The ten 12/8 bell patterns (Toussaint)" },
    { id: "shiko", title: "Shiko rotations and Arabic drum timelines" },
    { id: "brazil", title: "Brazilian bells and surdo" },
    { id: "hindustani", title: "Hindustani tāl (North India)" },
    { id: "carnatic", title: "Carnatic tāḷa (South India)" },
    { id: "chinese", title: "Chinese opera: ban and yan" }
  ];

  var R = [
    // ---- Toussaint 2002: the six fundamental 4/4 timelines (16 pulses) ----
    { id: "son32", fam: "four", name: "Son clave (3-2)", aka: ["Clave son", "Havana clave", "Kpanlogo bell"], grid: "x..x..x...x.x...", beats: 4,
      where: "Cuba (son, salsa, guaguancó); Ghana (Kpanlogo, on the ngongo bell); Guinea (secondary bell of Kassa); highlife",
      about: "Toussaint: “most well known around the world as the clave Son”; the first bar has three notes, the second two, hence 3-2.",
      rel: "Its first three strokes are the tresillo. The same onsets are the Bo Diddley beat.", src: "t2002", check: "read" },
    { id: "rumba32", fam: "four", name: "Rumba clave (3-2)", aka: ["Clave rumba"], grid: "x..x...x..x.x...", beats: 4,
      where: "Cuba (guaguancó, yambú, conga de comparsa, Mozambique); a bell pattern of the Ibo and Yoruba of Nigeria",
      about: "Toussaint: the only one of the six with no isosceles triangle, no mirror axis and no right angle when drawn on the circle.",
      rel: "Son clave with the third stroke one pulse later.", src: "t2002", check: "read" },
    { id: "shiko", fam: "four", name: "Shiko", aka: [], grid: "x...x.x...x.x...", beats: 4,
      where: "Nigeria (the name used); Guinea (Moribayasa, Malinke); Haiti (Banda); Cuba (on a wood block in Makuta); Benin (Adzogbo, Fon)",
      about: "Toussaint writes it in one bar of eight as x.xx.xx.; here at sixteen pulses as in his Fig. 3. A palindrome.",
      rel: "Its eight-pulse form has the same onsets as the cinquillo. See the rotations below.", src: "t2002", check: "read" },
    { id: "soukous", fam: "four", name: "Soukous", aka: [], grid: "x..x..x...xx....", beats: 4,
      where: "Central Africa (Congolese rumba, later soukous), after Cuban music became popular there after the Second World War",
      about: "Toussaint: usually on a wood block or snare drum; the last two notes close together.",
      rel: "Son clave with the last note one pulse earlier.", src: "t2002", check: "read" },
    { id: "bossa", fam: "four", name: "Bossa nova clave", aka: [], grid: "x..x..x...x..x..", beats: 4,
      where: "Brazil: bossa nova, samba, Afro-Brazilian folk music of Bahia",
      about: "Toussaint: on claves, wood block or snare rim; a palindrome and maximally even (four gaps of 3, one of 4).",
      rel: "Son clave with the last stroke one pulse later. (Wikipedia's Bossa nova article says the two side is pushed by an eighth note; Toussaint's grid has one sixteenth.)", src: "t2002", check: "read" },
    { id: "gahu", fam: "four", name: "Gahu", aka: [], grid: "x..x..x...x...x.", beats: 4,
      where: "Ewe of Ghana (Gahu), played on the gankogui double bell: the first note on the low bell, the other four on the high",
      about: "Toussaint: created by Yoruba speakers of Benin and Nigeria and first taken to Ghana in the early 1950s.",
      rel: "Bossa nova clave with the last note one pulse later.", src: "t2002", check: "read" },

    // ---- claves in other forms ----
    { id: "son23", fam: "clave", name: "Son clave (2-3)", aka: [], grid: "..x.x...x..x..x.", beats: 4,
      where: "Cuban music that starts on the two side", about: "Toussaint gives it as a cyclic shift of 3-2: the two bars swapped.",
      rel: "Son clave 3-2 turned round by eight pulses.", src: "t2002", check: "read" },
    { id: "rumba23", fam: "clave", name: "Rumba clave (2-3)", aka: [], grid: "..x.x...x..x...x", beats: 4,
      where: "Cuban music that starts on the two side", about: "Toussaint gives it as a cyclic shift of 3-2.",
      rel: "Rumba clave 3-2 turned round by eight pulses.", src: "t2002", check: "read" },
    { id: "son68", fam: "clave", name: "Son clave in 12/8", aka: ["Triple-pulse son clave"], grid: "x.x.x..x.x..", beats: 4,
      where: "Widespread in sub-Saharan Africa; least common in Cuba",
      about: "Wikipedia prints this grid. London reads the bell's five strokes as 2-2-3-2-3.", rel: "", src: "wClave", check: "read" },
    { id: "rumba68", fam: "clave", name: "Rumba clave in 12/8", aka: ["Triple-pulse rumba clave"], grid: "x.x..x.x.x..", beats: 4,
      where: "Cuba (traced to the Abakuá ekón bell; clapped in batá)", about: "Wikipedia prints this grid.", rel: "", src: "wClave", check: "read" },
    { id: "std44", fam: "clave", name: "Standard pattern in 4/4", aka: ["Duple-pulse standard pattern"], grid: "x..x..xx..x.x..x", beats: 4,
      where: "Sub-Saharan Africa and Cuba", about: "Wikipedia prints this grid beside the 12/8 standard pattern (Bembé below).", rel: "", src: "wClave", check: "read" },
    { id: "bo", fam: "clave", name: "Bo Diddley beat", aka: [], grid: "x..x..x...x.x...", beats: 4,
      where: "US rhythm and blues and rock and roll, from the 1955 single “Bo Diddley”",
      about: "Wikipedia: “essentially the Afro-Cuban clave rhythm”, a variation of the 3-2 clave. Grid worked out from the article's staff notation.",
      rel: "The same onsets as son clave 3-2.", src: "wBo", check: "derived" },

    // ---- tresillo family (8 sixteenths = one bar of 2/4) ----
    { id: "tresillo", fam: "cells", name: "Tresillo", aka: ["3+3+2", "Malfouf (Egypt, Levant)"], grid: "x..x..x.", beats: 2,
      where: "Throughout the Caribbean, Latin America and US popular music; brought by the Atlantic slave trade",
      about: "Spanish for “triplet”. Wikipedia: “introduced in the New World through the Atlantic slave trade”. Grid from the article's staff notation.",
      rel: "The three side of son clave.", src: "wTres", check: "derived" },
    { id: "charleston", fam: "cells", name: "Charleston", aka: [], grid: "x..x....", beats: 2,
      where: "US, 1920s", about: "Wikipedia (Tresillo): the first two strokes of the tresillo.", rel: "Tresillo without its third stroke.", src: "wTres", check: "derived" },
    { id: "habanera", fam: "cells", name: "Habanera", aka: ["Congo", "Tango-congo", "Tango"], grid: "x..xx.x.", beats: 2,
      where: "Cuban contradanza and habanera; Argentine tango; New Orleans",
      about: "Wikipedia: the contradanza was “the first written music to be rhythmically based on an African rhythm pattern”; “La Pimienta” (1836) is the earliest known piece with it in the left hand.",
      rel: "Tresillo plus the second beat.", src: "wContra", check: "derived" },
    { id: "cinquillo", fam: "cells", name: "Cinquillo", aka: [], grid: "x.xx.xx.", beats: 2,
      where: "Cuban contradanza and danzón; Dominican pambiche; Puerto Rican bomba; Martinique bélé and biguine",
      about: "Wikipedia: “a common bell pattern found throughout sub-Saharan Africa”. Carpentier's claim that Haitian émigrés brought it to Santiago in the 1790s is disputed (Manuel).",
      rel: "An embellished tresillo. The same onsets as Shiko in eight pulses.", src: "wCinq", check: "derived" },
    { id: "baqueteo", fam: "cells", name: "Baqueteo", aka: ["Danzón pattern"], grid: "x.xx.xx.x.x.x.x.", beats: 4,
      where: "Cuban danzón (timbales)", about: "Wikipedia: a cinquillo followed by four plain eighth notes; it holds every stroke of son clave.",
      rel: "Cinquillo + four eighths.", src: "wCinq", check: "derived" },

    // ---- Toussaint 2003: the ten 12/8 bell patterns ----
    { id: "soli", fam: "twelve", name: "Soli", aka: [], grid: "x.x.x.x.xx.x", beats: 4,
      where: "West Africa", about: "Toussaint: the most used of Soli's three bell patterns.", rel: "", src: "t2003", check: "read" },
    { id: "tambu", fam: "twelve", name: "Tambú", aka: ["Long African bell pattern"], grid: "x.x.x.xx.x.x", beats: 4,
      where: "Curaçao (the name used), Haiti (Yanvalou, Zepaule, Camberto, Mahi), West Africa", about: "", rel: "", src: "t2003", check: "read" },
    { id: "bembe", fam: "twelve", name: "Bembé (the standard pattern)", aka: ["Standard pattern", "Short African bell pattern", "6/8 bell", "Ibo (Haiti)", "Bembé"], grid: "x.x.xx.x.x.x", beats: 4,
      where: "Ewe and Yoruba (Agbekor, Agbadza), Guinea (Tiriba, Liberté), Congo (Zebola); Cuba (on the guataca in bembé, palo, columbia and others); Haiti; Brazil",
      about: "Toussaint: “probably the most (internationally) well known of all the African ternary timelines”; Desmond K. Tai's “Standard Pattern”.", rel: "", src: "t2003", check: "read" },
    { id: "bembe2", fam: "twelve", name: "Bembé-2", aka: [], grid: "xx.x.xx.x.x.", beats: 4,
      where: "Cuba (the low bell in bembé); a hand-clapping pattern in Ghana", about: "Toussaint's own name for this second bell.", rel: "", src: "t2003", check: "read" },
    { id: "yoruba", fam: "twelve", name: "Yoruba", aka: [], grid: "x.x.xx.x.xx.", beats: 4,
      where: "Yoruba sacred music; Cuba (columbia)", about: "Toussaint's name for it.", rel: "", src: "t2003", check: "read" },
    { id: "tonada", fam: "twelve", name: "Tonada", aka: [], grid: "x.xx.xx.x.x.", beats: 4,
      where: "Cuba (tonada songs); Martinique (bélé); Ghana (Ashanti, Akan adowa); Guinea (Mandiani)", about: "", rel: "", src: "t2003", check: "read" },
    { id: "asaadua", fam: "twelve", name: "Asaadua", aka: [], grid: "x.x.x.xx.xx.", beats: 4,
      where: "Akan of Ghana (processional music, on the dawuro bell); Guinea (Kakilambe, Sokou)", about: "", rel: "", src: "t2003", check: "read" },
    { id: "sorsonet", fam: "twelve", name: "Sorsonet", aka: [], grid: "xxx.x.x.x.x.", beats: 4,
      where: "Baga of Guinea", about: "Toussaint: “does not appear to be widely used”.", rel: "", src: "t2003", check: "read" },
    { id: "bemba", fam: "twelve", name: "Bemba", aka: [], grid: "x.xx.x.x.xx.", beats: 4,
      where: "Northern Zimbabwe", about: "Not to be confused with the Cuban Bembé.", rel: "", src: "t2003", check: "read" },
    { id: "ashanti", fam: "twelve", name: "Ashanti", aka: [], grid: "x.xx.x.xx.x.", beats: 4,
      where: "Ashanti of Ghana, in several rhythms", about: "", rel: "", src: "t2003", check: "read" },

    // ---- Shiko rotations and Arabic timelines (8 pulses = one bar of 4/4 in eighths) ----
    { id: "timint", fam: "shiko", name: "Timint", aka: [], grid: "xx.xx.x.", beats: 4,
      where: "Senegal", about: "Toussaint: the Shiko started on its second note.", rel: "Rotation of Shiko.", src: "t2002", check: "read" },
    { id: "kromanti", fam: "shiko", name: "Kromanti", aka: [], grid: "xx.x.xx.", beats: 4,
      where: "Suriname", about: "Toussaint: the Shiko started on its fourth note; the first bar of Kassa (Guinea).", rel: "Rotation of Shiko.", src: "t2002", check: "read" },
    { id: "maqsum", fam: "shiko", name: "Maqsum", aka: [], grid: "xx.xx.x.", parts: "DT.TD.T.", beats: 4,
      where: "Egypt and the Arab world", about: "Toussaint (book p. 28): D = dum (low, centre of the drum), T = tek (high, rim). Maqsum, baladi and saidi share one rhythm; only dum and tek move.",
      rel: "Same onsets as Timint.", src: "tBook", check: "read" },
    { id: "baladi", fam: "shiko", name: "Baladi", aka: ["Masmudi (a slow baladi)"], grid: "xx.xx.x.", parts: "DD.TD.T.", beats: 4,
      where: "Egypt and the Arab world", about: "Toussaint (book p. 28); masmudi is “a slow baladi”.", rel: "Maqsum with the second stroke a dum.", src: "tBook", check: "read" },
    { id: "saidi", fam: "shiko", name: "Saidi", aka: [], grid: "xx.xx.x.", parts: "DD.DD.T.", beats: 4,
      where: "Upper Egypt", about: "Toussaint (book p. 28).", rel: "Baladi with the fourth stroke a dum.", src: "tBook", check: "read" },
    { id: "bondo", fam: "twelve", name: "Bondo", aka: [], grid: "xx.x.x.xx.x.", beats: 4,
      where: "Aka (Central Africa), on metal strips", about: "Toussaint (book pp. 70-71): the one rotation of the bembé pattern missing from his 2003 list of ten; the bembé played backwards.", rel: "Mirror image of Bembé.", src: "tBook", check: "read" },
    { id: "sambaT", fam: "brazil", name: "Samba timeline (Toussaint)", aka: [], grid: "x.x.x..x.x.x.x..", beats: 4,
      where: "Brazil, samba", about: "Toussaint (book p. 227, Fig. 32.3): onsets 0, 2, 4, 7, 9, 11, 13. His American variant moves the last onset from 13 to 12 (x.x.x..x.x.xx...), heard in “Rock Around the Clock” and “You Can't Hurry Love”.", rel: "", src: "tBook", check: "read" }
  ];

  // ---- Brazilian bells and surdo: Wikipedia's strings, two bars of 2/4 in sixteenths. L low bell, H high bell, O open surdo,
  // X muffled surdo. `parts` is the string as printed (without the |); each letter becomes its own layer.
  function br(id, name, parts, where, about, rel){
    var str = parts.replace(/\|/g, "");
    R.push({ id: id, fam: "brazil", name: name, aka: [], grid: str.replace(/[^.]/g, "x"), parts: str, beats: 4, where: where,
      about: "As printed: " + parts + ". " + (about || ""), rel: rel || "", src: "wClaveBr", check: "read" });
  }
  br("samba32", "Samba bell (3:2)", "LL.L.H.H|L.L.L.H.", "Brazil, samba, on the agogô", "");
  br("samba32b", "Samba bell (3:2), more common form", ".L.L.H.H|L.L.L.H.", "Brazil, samba, on the agogô", "The article calls this the more common 3:2 form.", "The first form without its first stroke.");
  br("partido", "Partido alto (2:3)", "L.H..L.L|.H..L.L.", "Brazil: partido alto, a variation of the samba style, on the agogô", "Wikipedia's Partido alto article only shows a staff image and cites no source for the rhythm.");
  br("maracatu32", "Maracatu bell (3:2)", "LH.HL.H.|L.H.LH.H", "Brazil (Pernambuco): maracatu, on the gonguê bell", "");
  br("maracatu23", "Maracatu bell (2:3)", "L.H.L.H.|LH.HL.H.", "Brazil (Pernambuco): maracatu", "", "Not simply the 3:2 form with its bars swapped: the article's second bar here is the 3:2 form's first, but its first bar has no low-high pair.");
  br("ijexa", "Ijexá bell (3:2)", "LL.L.LL.|L.L.L.L.", "Brazil (Bahia): ijexá, the rhythm of the afoxé groups", "The article also gives HH.L.LL.|H.H.L.L.");
  br("surdo3", "Third surdo (2:3)", "X...O.O.|X...OO.O", "Brazil: samba, the third surdo", "X muffled, O open.");
  br("sambareggae", "Samba-reggae / bossa nova (3:2)", "O..O..O.|..O..O..", "Brazil (Bahia): samba-reggae; bossa nova", "", "The same strokes as the bossa nova clave above (Toussaint's grid), hence the article's double name.");

  // ---- Hindustani tāl: vibhāg lengths, the sign over each vibhāg (x sam, a number tālī = clap, 0 khālī = wave),
  // and the theka one bol per mātrā as Courtney prints it (- = the stroke held).
  function hin(id, name, aka, vib, marks, bols, where, about){
    var n = vib.reduce(function (a, b){ return a + b; }, 0), g = "", i;
    vib.forEach(function (v){ g += "x" + Array(v).join("."); });
    R.push({ id: id, fam: "hindustani", name: name, aka: aka, grid: g, beats: n, vib: vib, marks: marks, bols: bols, where: where,
      about: about, rel: "", src: "kippen", check: "read" });
  }
  hin("tintal", "Tīntāl", ["Teental", "Trital"], [4,4,4,4], ["x","2","0","3"],
    "Dhaa Dhin Dhin Dhaa Dhaa Dhin Dhin Dhaa Dhaa Tin Tin Taa Taa Dhin Dhin Dhaa",
    "North India: “without any doubt the most common tal” (Courtney); kheyal, instrumental music, tabla solos",
    "Clap, clap, wave, clap. Kippen: players use dha in slow tempo and na in fast (na dhin dhin na …); Courtney prints Naa where Kippen and Clayton have tā. Clayton: in practice the khālī bols (tin tin) sound one mātrā late, on 10-13.");
  hin("jhaptal", "Jhaptāl", [], [2,3,2,3], ["x","2","0","3"], "Dhin Naa Dhin Dhin Naa Tin Naa Dhin Dhin Naa",
    "North India: kheyal (medium tempo), tarana, bhajan, Rabindra sangeet", "Courtney: “the most common 10 beat tal”. Not symmetrical: 2+3+2+3.");
  hin("ektal", "Ektāl", [], [2,2,2,2,2,2], ["x","0","2","0","3","4"], "Dhin Dhin DhaaGe TiRaKiTa Toon Naa Kat Taa DhaaGe TiRaKiTa Dhin Naa",
    "North India: kheyal (bada kheyal is sung “almost exclusively in very slow ektal”), Rabindra Sangeet",
    "Kippen: “Some musicians substitute the syllable tin for tu”. Its clap marks are the same as chautāl's (Clayton: “borrowed”).");
  hin("rupak", "Rūpak", ["Roopak"], [3,2,2], ["0","2","3"], "Tin Tin Naa Dhin Naa Dhin Naa",
    "North India: film songs, khyal, ghazal, instrumental music; Kippen: “the tabla's answer to tivra” (the pakhavaj tāl below)",
    "The only tāl whose sam is khālī, shown by a wave (Kippen, Clayton, Courtney). Kippen: writing X on the first beat is “more commonly, but incorrectly” done. Clayton gives the first vibhāg as tin tā trkt.");
  hin("dadra", "Dādrā", [], [3,3], ["x","0"], "Dhaa Dhin Naa Dhaa Tin Naa",
    "North India: qawwali, film songs, bhajans, gazals, folk music; the dadra style of singing", "Kippen prints this theka; Clayton gives dhā dhin nā | tak dhina dhin. Courtney: any folk tāl of 3, 6 or 12 mātrās tends to be called dadra.");
  hin("kaherva", "Kaharvā", ["Keherwa", "Kaherava"], [4,4], ["x","0"], "Dhaa Ge Naa Tin Naa Ka Dhin Naa",
    "North India: folk, film songs, qawwali, Rabindra sangeet, gazal; not kheyal or dhrupad",
    "Clayton's theka; Kippen has dha dhin na tin. Kippen: “Many drum-pattern types come under the general rubric of kaharva”, stressed 3+3+2.");
  hin("dhamar", "Dhamār", ["Dhammar"], [5,2,3,4], ["x","2","0","3"], "Kat Dhee Ta Dhee Ta Dhaa - Ga Tee Ta Tee Ta Taa -",
    "North India: dhamar and dhrupad singing, on pakhawaj", "5+2+3+4 per Kippen, Clayton and Courtney (others count 3+4+3+4 or 5+5+4). Kippen: really “a largely open seven-beat pattern … mirroring itself with a seven-beat closed pattern”. Bols vary: Kippen kat dhe te dhe te | dha – | kat te te | te te ta –.");
  hin("jhumra", "Jhūmrā", ["Jhoomra"], [3,4,3,4], ["x","2","0","3"],
    "Dhin -Dhaa TiRaKiTa Dhin Dhin DhaaGe TiRaKiTa Tin -Taa TiRaKiTa Dhin Dhin DhaaGe TiRaKiTa",
    "North India: slow khyal", "Kippen and Courtney: “-Dhaa”, the Dhin held and Dhaa on the half beat. Clayton's standard form starts dhā dhā trkt (the held form is Amir Khan's).");
  hin("dipchandi", "Dīpchandī", ["Chanchar"], [3,4,3,4], ["x","2","0","3"], "Dhaa Dhin - Dhaa Dhaa Tin - Taa Tin - Dhaa Dhaa Dhin -",
    "North India: thumri (this theka); a different one for film songs", "Kippen: also called cancar, “a compressed version of its sixteen-beat counterpart”. Clayton gives both the 14- and 16-mātrā forms.");
  hin("chautal", "Chautāl", ["Chowtal", "Cautal", "Chartal"], [2,2,2,2,2,2], ["x","0","2","0","3","4"], "Dhaa Dhaa Din Taa KiTa Dhaa Din Taa TiTe KaTa GaDi GiNa",
    "North India: dhrupad, on pakhawaj, medium tempos", "Kippen and Clayton: six vibhāgs of 2, “khali counts on the second and fourth” (Courtney gives 4+4+2+2 with no wave). Kippen: “The feel of the tala is really three sections of four beats”.");

  hin("tivra", "Tīvrā", ["Tevra"], [3,2,2], ["x","2","3"], "Dhaa Din Taa TiTe KaTa GaDi GiNa",
    "North India: dhrupad, on pakhavaj", "Kippen: no khālī; its pattern, like sūltāl's, is “clearly related to or even derived from” chautāl's.");
  hin("sultal", "Sūltāl", ["Sūrphaktā"], [2,2,2,2,2], ["x","0","2","3","0"], "Dhaa Dhaa Din Taa KiTa Dhaa TiTe KaTa GaDi GiNa",
    "North India: dhrupad, on pakhavaj", "Kippen: the pakhavaj counterpart of jhaptāl. Clayton prints the same theka and marks.");
  hin("tilwada", "Tilwāḍā", ["Tilvara"], [4,4,4,4], ["x","2","0","3"], "Dhaa TiRaKiTa Dhin Dhin Dhaa DhaaGe Tin Tin Taa TiRaKiTa Dhin Dhin Dhaa DhaaGe Dhin Dhin",
    "North India: slow khyal", "Kippen's theka; tīntāl's claps with heavier bols. Clayton's has dhā dhā in place of DhaaGe.");
  hin("adachautal", "Āḍā chautāl", ["Aracautal"], [2,2,2,2,2,2,2], ["x","2","0","3","0","4","0"], "Dhin TiRaKiTa Dhin Naa Tu Naa Kat Taa TiRaKiTa Dhin Naa Dhin Dhin Naa",
    "North India: khyal", "Kippen: “an extended version of ektal”. Clayton prints the same.");

  // ---- Carnatic tāḷa from its aṅgas (Wikipedia, Tala (music)): l laghu (a clap, then fingers counted: jāti beats in all),
  // O dhrutam (a clap palm down, then palm up), U anudhrutam (one clap). Each akṣara is split into `nadai` mātrās.
  var JATI = { tisra: 3, chatusra: 4, khanda: 5, misra: 7, sankeerna: 9 };
  var SULADI = { Dhruva: "lOll", Matya: "lOl", Rupaka: "Ol", Jhampa: "lUO", Triputa: "lOO", Ata: "llOO", Eka: "l" };
  var NADAI_SYL = { 3: "Tha Ki Ta", 4: "Tha Ka Dhi Mi", 5: "Tha Ka Tha Ki Ta", 7: "Tha Ki Ta Tha Ka Dhi Mi", 9: "Tha Ka Dhi Mi Tha Ka Tha Ki Ta" };
  function kriyas(angas, n){     // one action per akṣara: C clap, P palm up, 1..8 a finger
    var a = [];
    angas.split("").forEach(function (g){
      if (g === "l"){ a.push("C"); for (var i = 1; i < n; i++) a.push(String(i)); }
      else if (g === "O") a.push("C", "P"); else if (g === "U") a.push("C");
    });
    return a;
  }
  function car(id, name, aka, tala, jati, nadai, where, about){
    var k = kriyas(SULADI[tala], JATI[jati]);
    R.push({ id: id, fam: "carnatic", name: name, aka: aka, grid: k.map(function (c){ return c === "C" ? "x" : "."; }).join(""), beats: k.length,
      kriya: k, tala: tala, jati: jati, nadai: nadai || 4, where: where, about: about, rel: "", src: "nelson", check: "read" });
  }
  car("adi", "Ādi tāḷa", ["Chatusra-nadai chatusra-jāti triputa tāḷa"], "Triputa", "chatusra", 4,
    "South India: the most common tāḷa (kritis, varnams)",
    "Triputa with a four-beat laghu: clap, pinkie, ring, middle | clap, wave | clap, wave (Nelson Fig. 2). Usually four pulses a beat at 72-120 beats a minute; in slow pieces “two-count” (rendu kalai), each beat counted twice at 36-60.");
  car("rupaka", "Rūpaka tāḷa (on paper)", ["Chatusra-jāti rūpaka"], "Rupaka", "chatusra", 4, "South India: many kritis", "The suladi form: dhrutam then laghu, 2+4 = 6. Nelson: in practice it is “almost always counted as three beats” (next card).");
  R.push({ id: "rupaka3", fam: "carnatic", name: "Rūpaka tāḷa (as counted)", aka: [], grid: "xx.", beats: 3, kriya: ["C","C","P"], nadai: 4,
    where: "South India; one of the four tāḷas a mridangam student learns first", about: "Nelson: “a clap (anudrutam) followed by a clap and a wave (drutam)”, even in slow tempo.", rel: "", src: "nelson", check: "read" });
  car("ata", "Aṭa tāḷa", ["Khanda-jāti aṭa"], "Ata", "khanda", 4, "South India: “around half of the varnams”", "Two five-beat laghus and two dhrutams: 5+5+2+2 = 14 akṣaras.");
  car("tisraadi", "Ādi tāḷa in tisra nadai", ["Tisra-nadai chatusra-jāti triputa"], "Triputa", "chatusra", 3,
    "South India: “a few fast-paced kritis”", "The same eight akṣaras as Ādi, each split in three: “a twenty-four beat cycle”, sometimes sung in Rūpaka.");
  function chapu(id, name, kr, where, about){
    R.push({ id: id, fam: "carnatic", name: name, aka: [], grid: kr.map(function (c){ return c === "-" ? "." : "x"; }).join(""), beats: kr.length, kriya: kr, nadai: 4,
      where: where, about: about, rel: "", src: "nelson", check: "read" });
  }
  chapu("misrachapu", "Miśra chāpu", ["u","u","-","C","-","C","-"], "South India: many padams, kritis",
    "Nelson Fig. 5: claps palm up on beats 1 and 2, palm down on 4 and 6. The clap on 2 may be left out, which gives the same gestures as Hindustani rūpak. Outside the 35-tāḷa scheme; usually two pulses a beat.");
  chapu("khandachapu", "Khaṇḍa chāpu", ["C","-","C","C","-"], "South India: kritis, tillanas",
    "Nelson Fig. 5: claps palm down on beats 1, 3 and 4 (“the first clap may be with the palm up or down”).");

  // ---- Chinese opera metre (jingju): ban (板, the clapper) on the strong beat, yan (眼) the weaker beats on the drum.
  function cn(id, name, aka, grid, where, about){
    R.push({ id: id, fam: "chinese", name: name, aka: aka, grid: grid, beats: grid.length, ban: true, where: where, about: about, rel: "", src: "jingju", check: "read" });
  }
  cn("sanyan", "One ban, three yan (4/4)", ["一板三眼 yiban sanyan"], "x...", "Jingju: manban (slow), kuaisanyan", "Wichmann: “one accented beat [for every] three eyes”, X O O O. The clapper on the ban; the drum may mark the yan.");
  cn("yiyan", "One ban, one yan (2/4)", ["一板一眼 yiban yiyan"], "x.", "Jingju: yuanban (about 72 beats a minute), erliu", "Wichmann: “one accented beat [for every] one eye”, X O X O.");
  cn("liushui", "Ban only (1/4)", ["有板无眼"], "x", "Jingju: liushui, kuaiban, fast erliu; the band under yaoban", "Wichmann: “having accented beats [but] no eyes”, X X X X.");

  function onsets(g){ var a = []; for (var i = 0; i < g.length; i++) if (g[i] === "x") a.push(i); return a; }
  function gaps(g){ var o = onsets(g), n = g.length; return o.map(function (p, i){ return (o[(i + 1) % o.length] - p + n) % n || n; }); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function (c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pick(str, ch, acc){ return str.split("").map(function (c, i){ return c === ch ? (i === 0 && acc ? "X" : "x") : "."; }).join(""); }

  // The player's layers for an entry: [{grid, name, sound}], the last an even count (its bpm = that count's speed)
  function layers(r){
    if (r.parts){
      var NM = { L: ["Low bell", "lo"], H: ["High bell", "hi"], O: ["Open surdo", "kick"], X: ["Muffled surdo", "mid"], D: ["Dum", "kick"], T: ["Tek", "hi"] }, out = [];
      "LHOXDT".split("").forEach(function (c){ if (r.parts.indexOf(c) >= 0) out.push({ grid: pick(r.parts, c), name: NM[c][0], sound: NM[c][1] }); });
      out.push({ grid: String(r.beats), name: "Beats", sound: "shaker" }); return out;
    }
    if (r.vib){
      var clap = "", wave = "";
      r.vib.forEach(function (v, i){ var m = r.marks[i], pad = Array(v).join(".");
        clap += (m === "0" ? "." : (m === "x" ? "X" : "x")) + pad; wave += (m === "0" ? (i === 0 ? "X" : "x") : ".") + pad; });
      var L = [{ grid: clap, name: "Clap (tālī)", sound: "wood" }];
      if (wave.indexOf("x") >= 0 || wave.indexOf("X") >= 0) L.push({ grid: wave, name: "Wave (khālī)", sound: "shaker" });
      L.push({ grid: String(r.beats), name: "Mātrās", sound: "hi" }); return L;
    }
    if (r.kriya){
      var k = r.kriya, L2 = [{ grid: k.map(function (c, i){ return c === "C" ? (i ? "x" : "X") : "."; }).join(""), name: "Clap", sound: "wood" }];
      if (k.indexOf("u") >= 0) L2.unshift({ grid: k.map(function (c, i){ return c === "u" ? (i ? "x" : "X") : "."; }).join(""), name: "Clap, palm up", sound: "lo" });
      if (k.indexOf("P") >= 0) L2.push({ grid: k.map(function (c){ return c === "P" ? "x" : "."; }).join(""), name: "Wave", sound: "shaker" });
      if (k.some(function (c){ return /\d/.test(c); })) L2.push({ grid: k.map(function (c){ return /\d/.test(c) ? "x" : "."; }).join(""), name: "Finger counts", sound: "mid" });
      if (r.nadai !== 1) L2.push({ grid: String(k.length * r.nadai), name: "Nadai (" + r.nadai + " a beat)", sound: "hi" });
      L2.push({ grid: String(k.length), name: "Akṣaras", sound: "kick" }); return L2;
    }
    if (r.groups) return [{ grid: r.grid.replace("x", "X"), name: "Group starts", sound: "wood" }, { grid: String(r.beats), name: "Beats", sound: "hi" }];
    if (r.ban){ var B = [{ grid: "X" + r.grid.slice(1), name: "Ban (clapper)", sound: "wood" }];
      if (r.grid.length > 1) B.push({ grid: "." + Array(r.grid.length).join("x"), name: "Yan (drum)", sound: "mid" });
      B.push({ grid: String(r.beats), name: "Beats", sound: "hi" }); return B; }
    return [{ grid: r.grid, name: r.name, sound: "wood" }, { grid: String(r.beats), name: "Beats", sound: "kick" }];
  }

  function bolTable(r){
    var b = r.bols.split(" "), h = "<table class='rl-bols'><tr>", i = 0;
    r.vib.forEach(function (v, j){ h += "<td class='rl-vib'><div class='rl-mark'>" + esc(r.marks[j]) + "</div>";
      for (var k = 0; k < v; k++, i++) h += "<span>" + esc(b[i]) + "</span>"; h += "</td>"; });
    return h + "</tr></table>";
  }
  function kriyaRow(r){
    var W = { C: "clap", P: "wave", u: "clap, palm up", "-": "·" }, F = ["", "pinkie", "ring", "middle", "index", "thumb", "pinkie", "ring", "middle"];
    return "<div class='rl-kriya'>" + r.kriya.map(function (c){ return "<span>" + (W[c] || F[+c]) + "</span>"; }).join("") + "</div>" +
      (r.nadai !== 4 ? "<p>Each beat in " + r.nadai + ": <i>" + NADAI_SYL[r.nadai] + "</i></p>" : "");
  }

  function card(r){
    var d = document.createElement("div"); d.className = "rl-card"; d.id = "rl-" + r.id;
    d.dataset.text = [r.name, r.aka.join(" "), r.where, r.about, r.rel, r.bols || ""].join(" ").toLowerCase();
    d.dataset.pulses = r.grid.length;
    var shape = r.vib ? r.vib.join("+") + " = " + r.beats + " mātrās" : r.kriya ? (r.tala ? SULADI[r.tala] + " (" + r.jati + ") = " : "") + r.beats + " beats" :
      r.groups ? r.groups.join("+") + " = " + r.beats + " beats" : r.ban ? r.beats + " beat" + (r.beats > 1 ? "s" : "") + " a bar" :
      "<code>" + r.grid + "</code> " + r.grid.length + " pulses · gaps " + gaps(r.grid).join("-");
    d.innerHTML = "<h3>" + esc(r.name) + "</h3>" +
      (r.aka.length ? "<div class='rl-aka'>Also: " + esc(r.aka.join(", ")) + "</div>" : "") +
      "<div class='rl-grid'><span>" + shape + "</span></div>" +
      (r.parts ? "<div class='rl-grid'><code>" + (r.parts.length === 16 ? r.parts.slice(0, 8) + "|" + r.parts.slice(8) : r.parts) + "</code></div>" : "") +
      (r.vib ? bolTable(r) : "") + (r.kriya ? kriyaRow(r) : "") +
      "<p><b>Where:</b> " + esc(r.where) + "</p>" +
      (r.about ? "<p>" + esc(r.about) + "</p>" : "") +
      (r.rel ? "<p><b>Related:</b> " + esc(r.rel) + "</p>" : "") +
      "<div class='rl-src'>Source: " + esc(SRC[r.src]) + (r.check === "derived" ? " (worked out from the source's notation or words)" : "") + "</div>";
    var L = layers(r), p = document.createElement("div"); p.className = "poly";
    p.dataset.layers = L.map(function (l){ return l.grid; }).join(";"); p.dataset.names = L.map(function (l){ return l.name; }).join(";");
    p.dataset.sounds = L.map(function (l){ return l.sound; }).join(";"); p.dataset.beat = String(L.length - 1);
    p.dataset.bpm = r.vib || r.kriya || r.groups || r.ban ? (r.beats > 10 ? "120" : "90") : r.grid.length === 12 ? "60" : "80";
    d.appendChild(p);
    return d;
  }

  // Any of the 35 suladi tāḷas, from the menus in #rl-build
  function builder(){
    var box = document.getElementById("rl-build"); if (!box) return;
    var opt = function (o, sel){ return Object.keys(o).map(function (k){ return "<option" + (k === sel ? " selected" : "") + ">" + k + "</option>"; }).join(""); };
    box.innerHTML = "<div class='rl-bar'><label>Tāḷa <select class='form-select' data-k='t'>" + opt(SULADI, "Triputa") + "</select></label>" +
      "<label>Jāti (laghu) <select class='form-select' data-k='j'>" + opt(JATI, "chatusra") + "</select></label>" +
      "<label>Nadai <select class='form-select' data-k='n'>" + opt({ 3: 1, 4: 1, 5: 1, 7: 1, 9: 1 }, "4") + "</select></label></div><div class='rl-out'></div>";
    function draw(){
      var t = box.querySelector("[data-k=t]").value, j = box.querySelector("[data-k=j]").value, n = +box.querySelector("[data-k=n]").value;
      var k = kriyas(SULADI[t], JATI[j]);
      var r = { id: "built", fam: "carnatic", name: j[0].toUpperCase() + j.slice(1) + "-jāti " + t + " tāḷa" + (n !== 4 ? ", " + n + " in a beat" : ""), aka: [],
        grid: k.map(function (c){ return c === "C" ? "x" : "."; }).join(""), beats: k.length, kriya: k, tala: t, jati: j, nadai: n,
        where: "Built from the aṅgas", about: "", rel: "", src: "nelson", check: "read" };
      var out = box.querySelector(".rl-out"); out.innerHTML = ""; var c = card(r); c.querySelector(".rl-src").remove(); out.appendChild(c);
      if (global.Polyrhythm) Polyrhythm.mount(c.querySelector(".poly"));
    }
    box.querySelectorAll("select").forEach(function (s){ s.addEventListener("change", draw); }); draw();
  }

  function mount(){
    FAMS.forEach(function (f){
      var box = document.getElementById("rl-" + f.id); if (!box) return;
      R.filter(function (r){ return r.fam === f.id; }).forEach(function (r){
        var c = card(r); box.appendChild(c); if (global.Polyrhythm) Polyrhythm.mount(c.querySelector(".poly"));
      });
    });
    builder();
    var q = document.getElementById("rl-q"), pu = document.getElementById("rl-pulses");
    function filt(){
      var s = (q.value || "").toLowerCase().trim(), n = pu.value;
      document.querySelectorAll(".rl-list .rl-card").forEach(function (c){
        c.hidden = !((!s || c.dataset.text.indexOf(s) >= 0 || c.textContent.toLowerCase().indexOf(s) >= 0) && (!n || c.dataset.pulses === n));
      });
    }
    if (q) { q.addEventListener("input", filt); pu.addEventListener("change", filt); }
  }
  global.RhythmLibrary = { RHYTHMS: R, FAMS: FAMS, SRC: SRC, onsets: onsets, gaps: gaps, layers: layers, kriyas: kriyas, SULADI: SULADI, JATI: JATI };
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount(); }
  if (typeof module !== "undefined") module.exports = global.RhythmLibrary;
})(typeof window !== "undefined" ? window : globalThis);
