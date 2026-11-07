// Concept "uses": the songs and pieces Eric Bluestine's blog (Helping Children Audiate Music) uses, with how each post uses them.
// Format: the shared contract (src/label/url/items). Links only; notes are in our words. Not every title has a works-data.js entry:
// ids beginning "bluestine-" or without an entry stand alone from title/composer. Read Nov 2026.
(function (global) {
  "use strict";
  var P = "https://ericmbluestine.substack.com/p/";
  var L1 = { url: P + "audiation-lecture-1-an-overview-of", where: "Audiation Lecture 1: An Overview of the Stages", date: "2026-08-18" };
  function u(o, base) { for (var k in base) o[k] = base[k]; return o; }
  (global.WORK_USES = global.WORK_USES || []).push({ src: "bluestine", label: "Bluestine, Helping Children Audiate Music", url: "https://ericmbluestine.substack.com", items: [
    u({ work: "bach-gavotte-english-suite-3", title: "Gavotte, English Suite no. 3 in G minor, BWV 808", composer: "Johann Sebastian Bach",
        concept: "audiation stage 4: modulation and form", note: "Played by Bluestine as a test of stage 4: can you hear which key the A section modulates to, and where the sections fall? His piano recording is the example.",
        mlt: [{ book: "mullen", unit: "ch2", page: "15" }] }, L1),
    u({ work: "bach-magnificat-quia-fecit", title: "Magnificat, \"Quia fecit mihi magna\"", composer: "Johann Sebastian Bach",
        concept: "audiation stage 5/6: recalling patterns from other music", note: "Paired with a Handel ensemble that turns out to be almost the same piece, composed independently; used to show the 'where have I heard that?' comparison of stage 6 (his numbering).",
        mlt: [] }, L1),
    u({ work: "handel-partenope-non-e-incauto", title: "Partenope, \"Non è incauto il mio consiglio\"", composer: "George Frideric Handel",
        concept: "audiation stage 5/6: recalling patterns from other music", note: "The other half of the Bach/Handel pair above: the shared features are discerned by comparing it with the Bach aria in memory.", mlt: [] }, L1),
    u({ work: "fulani-chant-sweet-honey", title: "Fulani Chant", composer: "Sweet Honey in the Rock",
        concept: "audiation stage 1: retention of aftersound", note: "The first minute of a ten-minute, much-repeated vocal piece, played to show how hard it is to keep attention and a memory of the sound going at stage 1.", mlt: [] }, L1),
    u({ work: "room-222-theme", title: "Theme from Room 222", composer: "Jerry Goldsmith (unverified; the post gives the show only)",
        concept: "audiation stage 3: establishing meter", note: "A TV theme played as the meter example for stage 3, where students can name the meter, which Bluestine thinks is too small a place for understanding to stop.", mlt: [] }, L1),
    u({ work: "tonal-imma", title: "Tonal test, Intermediate Measures of Music Audiation (excerpts)", composer: "Edwin E. Gordon",
        concept: "audiation stage 2: keyality instead of tonality", note: "Excerpts from the test, played to show that it is anchored to a keyality (C), so that young children can audiate it at stage 2.",
        mlt: [{ book: "jri-lsa", page: "25–27" }] }, L1),
    u({ work: "skip-to-my-lou", title: "Skip to My Lou", composer: "traditional",
        concept: "steady beat while singing (an over-written objective)", note: "Named only inside a mock lesson objective ('perform a steady beat while singing ... as the music moves forward in time') from a methods class he took in the 1980s, to say that music does not move only forward in time.",
        mlt: [{ book: "mullen", step: "u1-first-whole", page: "104" }] }, L1),
    u({ work: "sandy-land", title: "Sandy Land", composer: "traditional",
        concept: "ostinato on percussion while singing (an over-written objective)", note: "The second song in the same mock objectives: an ostinato on percussion instruments while singing.", mlt: [] }, L1),
    u({ work: "bach-sinfonia-1-bwv-787", title: "Sinfonia no. 1 in C major, BWV 787", composer: "Johann Sebastian Bach",
        concept: "subject, inversion and stretto in a fugal piece", note: "His own recording, with a bar-by-bar listening guide: the rising four-note subject in nearly every bar, inverted entries, stretti in bars 10-11 and 16-17, a deceptive cadence and a move to D minor.",
        url: P + "bach-sinfonia-1-in-c-major-performed", where: "Bach - Sinfonia #1 in C major, performed by Eric Bluestine", date: "2026-10-27",
        mlt: [] }, {}),
    u({ work: "bach-invention-1-bwv-772", title: "Two-part Invention no. 1 in C major, BWV 772", composer: "Johann Sebastian Bach",
        concept: "shared motive across Bach C major pieces", note: "Cited in the Sinfonia post as using the same four-note rising start as the Sinfonia, the Little Fugue BWV 952 and the C major fugue of WTC I.",
        url: P + "bach-sinfonia-1-in-c-major-performed", where: "Bach - Sinfonia #1 in C major, performed by Eric Bluestine", date: "2026-10-27", mlt: [] }, {}),
    u({ work: "bach-two-part-inventions", title: "Two-part Inventions (Nos. 1, 2, 4, 6, 7, 8, 10, 12-15)", composer: "Johann Sebastian Bach",
        concept: "listening examples, performed", note: "A playlist of ten of the fifteen inventions on piano with a time index; he left out Nos. 3, 5, 9 and 11.",
        url: P + "bach-inventions-4-14-and-15-performed", where: "Bach: 2-Part Inventions (performed by Eric Bluestine)", date: "2026-03-24", mlt: [] }, {}),
    u({ work: "beethoven-piano-sonata-in-f-minor-op-2-no-1-mvt-1", title: "Piano Sonata in F Minor, op. 2, no. 1, mvt. 1", composer: "Ludwig van Beethoven",
        concept: "listening examples, performed", note: "His recording of the movement; the post has no commentary.",
        url: P + "beethoven-sonata-1-in-f-minor-op", where: "Beethoven - Sonata #1 In F Minor, Op. 2/1 - 1. Allegro", date: "2026-05-28", mlt: [] }, {}),
    u({ work: "beethoven-piano-sonata-in-f-minor-op-2-no-1-mvt-2", title: "Piano Sonata in F Minor, op. 2, no. 1, mvt. 2", composer: "Ludwig van Beethoven",
        concept: "listening examples, performed", note: "His recording of the Adagio; the post has no commentary.",
        url: P + "beethoven-sonata-1-in-f-minor-op-055", where: "Beethoven - Sonata #1 In F Minor, Op. 2/1 - 2. Adagio", date: "2026-10-13", mlt: [] }, {}),
    u({ work: "chopin-impromptu-no-3-in-g-flat-major-op-51", title: "Impromptu no. 3 in G-flat Major, op. 51", composer: "Frédéric Chopin",
        concept: "listening examples, performed", note: "His recording; the post has no commentary.",
        url: P + "chopin-impromptu-in-g-flat-major", where: "Chopin - Impromptu in G flat major, op. 51", date: "2026-10-29", mlt: [] }, {}),
    u({ work: "mozart-symphony-40", title: "Symphony no. 40 in G minor, K. 550", composer: "Wolfgang Amadeus Mozart",
        concept: "goal: understand a whole minor-key masterpiece, not only 'minor tonality'", note: "Named as the kind of piece a teacher should aim students toward, rather than stopping at minor patterns and teacher-made minor songs.",
        url: P + "music-education", where: "A Note To My Music Teacher Colleagues", date: "2025-08-18",
        mlt: [{ book: "mullen", step: "u2-first-whole", page: "118" }] }, {})
  ] });
})(typeof window !== "undefined" ? window : globalThis);
