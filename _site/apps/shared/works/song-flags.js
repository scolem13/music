// SONG FLAGS (global SongFlags): songs written for, or made popular by, the blackface minstrel stage. They stay in the
// collection (many are in the MLT / JRI books and band books), but lesson pages don't use them as examples, and every place
// that lists a song shows a flag: the Tune Directory sheet (⚑ after the title, note on hover), the Tune Library (tag "minstrel"),
// and the Tunes page About panel.
//   SongFlags.of(title) -> { flag, name, note, checked } | null   (matched on the title with punctuation, "the", "oh"/"o" removed)
//   checked: true = the minstrel origin is stated in a source read on 2026-11-15 (listed in SOURCES below);
//            false = from memory or a search-result list only: unverified (rule 4 in CLAUDE.md), check before writing it on a page.
// Sources (search 2026-11-15; NPR read as a headline + summary only):
//   NPR, "The 'Jingle Bells' Song Has Roots in Minstrelsy" (2016-12-25), npr.org/2016/12/25/506898876
//   Wikipedia, "List of blackface minstrel songs"; St. Olaf American Music blog (Zip Coon / Turkey in the Straw);
//   Singing Bell, "Minstrel Songs: The Surprising Roots of Some Favorite Kids' Tunes"; Pitt American Music, "Blackface Minstrelsy".
// Adding a song: a row below. Keep the patterns tight: "Dixie Chicks", "Dixie Swing" and "Jingle Bell Rock" must not match.
(function (global) {
  "use strict";
  var NOTE = "Written for or made popular by blackface minstrel shows";
  var ROWS = [
    // [pattern on the normalised title, name, extra note, checked]
    [/\bsusanna\b/, "Oh! Susanna", "Stephen Foster, 1848; original words in mock dialect with a racial slur", true],
    [/\bcamptown races?\b|^gwine to run all night$/, "Camptown Races", "Stephen Foster, 1850; popularised by the Christy Minstrels", true],
    [/old folks at home|swanee river/, "Old Folks at Home (Swanee River)", "Stephen Foster, 1851, for the Christy Minstrels", true],
    [/turkey in the straw|\bzip coon\b|^do your ears hang low/, "Turkey in the Straw / Zip Coon", "an older fiddle tune made popular as the minstrel song \"Zip Coon\" (\"Do Your Ears Hang Low?\" is the same tune)", true],
    [/^jingle bells\b|^one horse open sleigh$/, "Jingle Bells", "first performed 1857 as \"The One Horse Open Sleigh\"; the minstrel-show premiere is argued over (NPR 2016)", true],
    [/^dixie$|^dixies? land$|^i wish i was in dixie/, "Dixie", "Dan Emmett, 1859, for Bryant's Minstrels", false],
    [/\bbuffalo gals\b/, "Buffalo Gals", "Cool White, 1844, a minstrel song", false],
    [/blue ?tail fly|jimmy crack corn/, "The Blue Tail Fly (Jimmy Crack Corn)", "a minstrel song of the 1840s", false],
    [/polly wolly doodle/, "Polly Wolly Doodle", "first printed in a minstrel songbook (1880s)", false],
    [/^old dan tucker$/, "Old Dan Tucker", "Dan Emmett, 1843, Virginia Minstrels", false],
    [/^golden slippers$|^dem golden slippers$/, "Oh, Dem Golden Slippers", "James Bland, 1879, a minstrel song", false],
    [/^carry me back to old virginn?y$/, "Carry Me Back to Old Virginny", "James Bland, 1878, a minstrel song", false],
    [/^my old kentucky home$/, "My Old Kentucky Home", "Stephen Foster, 1853, a minstrel-stage song", false],
    [/^old black joe$/, "Old Black Joe", "Stephen Foster, 1860", false],
    [/^shortnin'? bread$/, "Shortnin' Bread", "a plantation song popularised on the minstrel stage", false],
    [/jim along josie/, "Jim Along Josie", "a minstrel song of the 1840s", false],
    [/yellow rose of texas/, "The Yellow Rose of Texas", "first published 1858 as a minstrel song", false],
    [/^shoo fly don'?t bother me$/, "Shoo Fly, Don't Bother Me", "1869, a minstrel-show song", false],
    [/\bjim crow\b/, "Jump Jim Crow", "T. D. Rice, 1828, the act that started blackface minstrelsy", false],
    [/^nelly bly$|^ring de banjo$|^nelly was a lady$/, "Stephen Foster minstrel song", "", false]
  ];
  function norm(t) {
    return String(t || "").toLowerCase().replace(/\(.*?\)/g, " ").replace(/[!?.,"“”]/g, " ").replace(/[-–—_/]/g, " ")
      .replace(/^\s*(the|oh|o)\s+/, "").replace(/\s+/g, " ").trim();
  }
  function of(title) {
    var n = norm(title); if (!n) return null;
    for (var i = 0; i < ROWS.length; i++) if (ROWS[i][0].test(n))
      return { flag: "minstrel", name: ROWS[i][1], note: NOTE + (ROWS[i][2] ? ": " + ROWS[i][2] : "") + (ROWS[i][3] ? "" : " (unverified)"), checked: ROWS[i][3] };
    return null;
  }
  global.SongFlags = { of: of, norm: norm, rows: ROWS };
})(typeof window !== "undefined" ? window : globalThis);
if (typeof module !== "undefined") module.exports = globalThis.SongFlags || window.SongFlags;
