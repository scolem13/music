// works/uses/shouldice.js: songs and pieces named in posts of Heather Shouldice's Everyday Musicality (podcast and blog), for the Tune Directory's
// Concepts view. Format: see the shared contract in the Tune Directory loader. LINKS ONLY, notes in our words. The podcast pages are show notes: a
// "Mentioned in this episode" list with no account of how each item is used, so most notes say "listed as an example of <tonality>" and that is
// all that is verified (audio not heard). Composers/artists were added from general knowledge where the page gives none: marked "(unverified)".
// Work ids: an existing works-data.js id where one matches ("jri-bow-belinda"); otherwise a new id (title + composer let it stand alone).
(function () {
  "use strict";
  var H = "https://everydaymusicality.com/";
  function it(work, title, composer, concept, note, path, where, date, mlt) {
    var o = { work: work, title: title, composer: composer, concept: concept, note: note, url: H + path, where: where, date: date };
    if (mlt) o.mlt = mlt; return o;
  }
  var ex = "Listed in the show notes as an example; the page does not say how it is used.";
  var TON = [{ book: "mullen", unit: "ch9", page: "43" }];
  var items = [
    // E01.40 Aeolian
    it("wayfaring-stranger", "Poor Wayfaring Stranger", "traditional", "Aeolian tonality", ex + " The page corrects one slip in the audio: the recording is by Jack White.", "2022/02/08/e01-40-aid-for-aeolian/", "E01.40: Aid for Aeolian", "2022-02-08", TON),
    it("beat-it-michael-jackson", "Beat It", "Michael Jackson (unverified)", "Aeolian tonality", ex, "2022/02/08/e01-40-aid-for-aeolian/", "E01.40: Aid for Aeolian", "2022-02-08", TON),
    it("jolene-dolly-parton", "Jolene", "Dolly Parton (unverified)", "Aeolian tonality", ex, "2022/02/08/e01-40-aid-for-aeolian/", "E01.40: Aid for Aeolian", "2022-02-08", TON),
    // E01.32 Lydian
    it("dance-of-the-mountain-kings-daughter", "Dance of the Mountain King's Daughter", "unverified", "Lydian tonality", ex, "2021/09/10/e01-32-leaping-into-lydian/", "E01.32: Leaping Into Lydian", "2021-09-10", TON),
    it("sparkle-bake-off", "Sparkle (Great British Bake Off)", "unverified", "Lydian tonality", ex, "2021/09/10/e01-32-leaping-into-lydian/", "E01.32: Leaping Into Lydian", "2021-09-10", TON),
    it("the-simpsons-theme", "The Simpsons theme", "Danny Elfman (unverified)", "Lydian tonality", ex, "2021/09/10/e01-32-leaping-into-lydian/", "E01.32: Leaping Into Lydian", "2021-09-10", TON),
    it("six-feet-under-theme", "Six Feet Under theme", "Thomas Newman (unverified)", "Lydian tonality", ex, "2021/09/10/e01-32-leaping-into-lydian/", "E01.32: Leaping Into Lydian", "2021-09-10", TON),
    it("the-west-wing-end-credits", "The West Wing end credits", "W. G. Snuffy Walden (unverified)", "Lydian tonality", ex, "2021/09/10/e01-32-leaping-into-lydian/", "E01.32: Leaping Into Lydian", "2021-09-10", TON),
    // E01.28 Phrygian
    it("run-it-chris-brown", "Run It", "Chris Brown", "Phrygian tonality", ex, "2021/05/18/e01-28-fiddling-with-phrygian/", "E01.28: Fiddling With Phrygian", "2021-05-18", TON),
    it("gin-and-juice-snoop-dogg", "Gin and Juice", "Snoop Dogg", "Phrygian tonality", ex + " (The page carries an explicit-content warning.)", "2021/05/18/e01-28-fiddling-with-phrygian/", "E01.28: Fiddling With Phrygian", "2021-05-18", TON),
    it("how-you-like-that-blackpink", "How You Like That", "Blackpink", "Phrygian tonality", ex, "2021/05/18/e01-28-fiddling-with-phrygian/", "E01.28: Fiddling With Phrygian", "2021-05-18", TON),
    it("ravel-la-bas-vers-leglise", "Cinq mélodies populaires grecques: Là-bas, vers l'église", "Maurice Ravel", "Phrygian tonality", ex, "2021/05/18/e01-28-fiddling-with-phrygian/", "E01.28: Fiddling With Phrygian", "2021-05-18", TON),
    // E01.17 Dorian
    it("stayin-alive-bee-gees", "Stayin' Alive", "Bee Gees", "Dorian tonality", ex, "2020/11/24/e01-17-dabbling-in-dorian/", "E01.17: Dabbling in Dorian", "2020-11-24", TON),
    it("yorktown-hamilton", "Yorktown (The World Turned Upside Down)", "Hamilton (Lin-Manuel Miranda, unverified)", "Dorian tonality", ex, "2020/11/24/e01-17-dabbling-in-dorian/", "E01.17: Dabbling in Dorian", "2020-11-24", TON),
    it("mad-world-gary-jules", "Mad World", "Gary Jules (recording)", "Dorian tonality", ex, "2020/11/24/e01-17-dabbling-in-dorian/", "E01.17: Dabbling in Dorian", "2020-11-24", TON),
    it("radioactive-imagine-dragons", "Radioactive", "Imagine Dragons", "Dorian tonality", ex, "2020/11/24/e01-17-dabbling-in-dorian/", "E01.17: Dabbling in Dorian", "2020-11-24", TON),
    // E01.12 Mixolydian
    it("uptight-stevie-wonder", "Uptight (Everything's Alright)", "Stevie Wonder", "Mixolydian tonality", ex, "2020/09/15/e01-12-mixolydian-meanderings/", "E01.12: Mixolydian Meanderings", "2020-09-15", TON),
    it("no-rain-blind-melon", "No Rain", "Blind Melon", "Mixolydian tonality", ex, "2020/09/15/e01-12-mixolydian-meanderings/", "E01.12: Mixolydian Meanderings", "2020-09-15", TON),
    it("born-this-way-lady-gaga", "Born This Way", "Lady Gaga", "Mixolydian tonality", ex, "2020/09/15/e01-12-mixolydian-meanderings/", "E01.12: Mixolydian Meanderings", "2020-09-15", TON),
    it("royals-lorde", "Royals", "Lorde", "Mixolydian tonality", ex, "2020/09/15/e01-12-mixolydian-meanderings/", "E01.12: Mixolydian Meanderings", "2020-09-15", TON),
    it("mirrorball-chanticleer", "Mirrorball", "Chanticleer (recording)", "Mixolydian tonality", ex, "2020/09/15/e01-12-mixolydian-meanderings/", "E01.12: Mixolydian Meanderings", "2020-09-15", TON),
    // E01.56 Locrian
    it("fantasy-no-7-locrian", "Fantasy No. 7 in Locrian mode", "unverified", "Locrian tonality", ex, "2023/06/20/e01-56-lumbering-in-locrian/", "E01.56: Lumbering in Locrian", "2023-06-20", TON),
    it("dust-to-dust", "Dust to Dust", "unverified", "Locrian tonality", ex, "2023/06/20/e01-56-lumbering-in-locrian/", "E01.56: Lumbering in Locrian", "2023-06-20", TON),
    // E01.58 subjective tonality
    it("stay-kid-laroi-bieber", "Stay", "The Kid LAROI and Justin Bieber", "subjective tonality (tonal centre felt differently by different listeners)", "Listed as an example of music whose tonal centre can be heard more than one way; the page does not say which way.", "2023/09/19/e01-58-subjective-tonality/", "E01.58: Subjective Tonality", "2023-09-19", TON),
    it("army-of-me-bjork", "Army of Me", "Björk", "subjective tonality (tonal centre felt differently by different listeners)", "Listed as an example of music whose tonal centre can be heard more than one way; the page does not say which way.", "2023/09/19/e01-58-subjective-tonality/", "E01.58: Subjective Tonality", "2023-09-19", TON),
    it("started-from-the-bottom-drake", "Started from the Bottom", "Drake", "subjective tonality (tonal centre felt differently by different listeners)", "Listed as an example of music whose tonal centre can be heard more than one way; the page does not say which way.", "2023/09/19/e01-58-subjective-tonality/", "E01.58: Subjective Tonality", "2023-09-19", TON),
    it("analyse-thom-yorke", "Analyse", "Thom Yorke", "subjective tonality (tonal centre felt differently by different listeners)", "Listed as an example of music whose tonal centre can be heard more than one way; the page does not say which way.", "2023/09/19/e01-58-subjective-tonality/", "E01.58: Subjective Tonality", "2023-09-19", TON),
    // E01.07 meters
    it("niska-banja", "Niška Banja", "traditional (Serbian)", "unusual (asymmetric) meter", "Listed as a recording mentioned in the meters episode; the page does not say which meter it illustrates.", "2020/04/14/e01-07-menu-of-meters/", "E01.07: Menu of Meters", "2020-04-14", [{ book: "mullen", unit: "ch10", page: "51" }]),
    // E01.60
    it("out-in-the-backyard-biermann", "Out in the Backyard", "Caity Biermann", "Mixolydian tonality; harmonizing and improvising", "The model tune for the episode's levelled harmonizing and improvising exercises in Mixolydian, used with the composer's permission.", "2024/01/30/e01-60-musicking-in-mixolydian/", "E01.60: Musicking in Mixolydian", "2024-01-30", [{ book: "mullen", step: "u3-tonal-second-whole", page: "138–144" }]),
    // E01.46 tunes by course participants
    it("lemon-lime-soda-wright", "Lemon Lime Soda", "Ashley Wright", "major tonality", "One of 40 short tunes in eight tonalities, by participants in a 2022 GIML levels course; this one is the major example.", "2022/09/06/e01-46-tunes-in-varied-tonalities/", "E01.46: Tunes in Varied Tonalities", "2022-09-06", TON),
    it("evening-stroll-vajda", "Evening Stroll", "Victoria Vajda", "harmonic minor tonality", "One of the episode's tunes: a harmonic minor example.", "2022/09/06/e01-46-tunes-in-varied-tonalities/", "E01.46: Tunes in Varied Tonalities", "2022-09-06", TON),
    it("windshield-wipers-wright", "Windshield Wipers", "Ashley Wright", "harmonic minor tonality", "One of the episode's tunes: a harmonic minor example.", "2022/09/06/e01-46-tunes-in-varied-tonalities/", "E01.46: Tunes in Varied Tonalities", "2022-09-06", TON),
    it("pink-horizon-hill", "Pink Horizon", "Stuart Hill", "Mixolydian tonality", "One of the episode's tunes: a Mixolydian example.", "2022/09/06/e01-46-tunes-in-varied-tonalities/", "E01.46: Tunes in Varied Tonalities", "2022-09-06", TON),
    it("octopi-are-dancing-steffke", "Octopi Are Dancing", "Madeline Steffke", "Mixolydian tonality", "One of the episode's tunes: a Mixolydian example.", "2022/09/06/e01-46-tunes-in-varied-tonalities/", "E01.46: Tunes in Varied Tonalities", "2022-09-06", TON),
    it("a-dorian-tune-schoon", "A Dorian Tune", "Maria Schoon", "Dorian tonality", "One of the episode's tunes: a Dorian example.", "2022/09/06/e01-46-tunes-in-varied-tonalities/", "E01.46: Tunes in Varied Tonalities", "2022-09-06", TON),
    it("phrygian-can-bounce-salvador", "Phrygian Can Bounce", "Karen Salvador", "Phrygian tonality", "One of the episode's tunes: a Phrygian example.", "2022/09/06/e01-46-tunes-in-varied-tonalities/", "E01.46: Tunes in Varied Tonalities", "2022-09-06", TON),
    it("bumble-bee-walters", "Bumble Bee", "Dillon Walters", "Phrygian tonality", "One of the episode's tunes: a Phrygian example.", "2022/09/06/e01-46-tunes-in-varied-tonalities/", "E01.46: Tunes in Varied Tonalities", "2022-09-06", TON),
    it("forest-traipsing-hill", "Forest Traipsing", "Stuart Hill", "Phrygian tonality", "One of the episode's tunes: a Phrygian example.", "2022/09/06/e01-46-tunes-in-varied-tonalities/", "E01.46: Tunes in Varied Tonalities", "2022-09-06", TON),
    it("phrygian-melody-vajda", "Phrygian Melody", "Victoria Vajda", "Phrygian tonality", "One of the episode's tunes: a Phrygian example.", "2022/09/06/e01-46-tunes-in-varied-tonalities/", "E01.46: Tunes in Varied Tonalities", "2022-09-06", TON),
    it("yellow-kite-walters", "Yellow Kite", "Dillon Walters", "Lydian tonality", "One of the episode's tunes: a Lydian example.", "2022/09/06/e01-46-tunes-in-varied-tonalities/", "E01.46: Tunes in Varied Tonalities", "2022-09-06", TON),
    it("lylt-salvador", "Lylt", "Karen Salvador", "Lydian tonality", "One of the episode's tunes: a Lydian example.", "2022/09/06/e01-46-tunes-in-varied-tonalities/", "E01.46: Tunes in Varied Tonalities", "2022-09-06", TON),
    it("race-against-the-clock-hill", "Race Against the Clock", "Stuart Hill", "Aeolian tonality", "One of the episode's tunes: an Aeolian example.", "2022/09/06/e01-46-tunes-in-varied-tonalities/", "E01.46: Tunes in Varied Tonalities", "2022-09-06", TON),
    it("avocado-on-an-everything-bagel-wright", "Avocado on an Everything Bagel", "Ashley Wright", "Locrian tonality", "One of the episode's tunes: a Locrian example.", "2022/09/06/e01-46-tunes-in-varied-tonalities/", "E01.46: Tunes in Varied Tonalities", "2022-09-06", TON),
    // RTRL.34
    it("jri-bow-belinda", "Bow, Belinda", "traditional", "singing achievement versus tonal aptitude", "The one song each child sang for the study's singing rating; the post draws the lesson that singing and tonal aptitude are separate. (Matched by title to the Jump Right In entry; the study's own version of the tune is unverified.)", "2020/01/08/relationships-between-tonal-aptitude-singing-achievement-and-grade-level-among-elementary-students-hornbach-taggart-2005/", "RTRL.34: Tonal Aptitude, Singing Achievement, and Grade Level (Hornbach & Taggart, 2005)", "2020-01-08", [{ book: "jri-lsa", step: "p2-aptitude", page: "25–27" }])
  ];
  (window.WORK_USES = window.WORK_USES || []).push({ src: "shouldice", label: "Heather Shouldice, Everyday Musicality", url: "https://everydaymusicality.com", items: items });
})();
