// justin-link.js: "On JustinGuitar" links on pages that already show a song. LINKS ONLY (title + address); nothing of his lessons is copied.
//   <script src="/apps/shared/works/justin-link.js?v=1"></script>
//   JustinLink.of(keys) -> [[lesson title, url] …]   keys: "tune:<%%id>" | "song:<Words & Chords id>" | "billboard:<McGill id>" | "work:<works-data id>" (a string or an array of them)
//   JustinLink.line(keys) -> <p class="jg-line"> "On JustinGuitar: …" with one link a lesson, or null when there is none
// Used by: Works.mount (the Tune Library panel, kind "tune", and the work's own id), song-page.js (Words & Chords). The data between the markers below is
// written by scripts/guitar/justin-gen.mjs (matching rules in its header: tune and Words & Chords matches are by title only, so a different song with the
// same title would also match; works-data matches check an artist word).
(function (global) {
  "use strict";
  /* justin-index:begin (written by scripts/guitar/justin-gen.mjs) */
var INDEX = {
  "billboard:1014": [["Play That Funky Music by Wild Cherry","https://www.justinguitar.com/songs/wild-cherry-play-that-funky-music-chords-tabs-guitar-lesson-st-366"]],
  "billboard:1040": [["Lay Down Sally by Eric Clapton","https://www.justinguitar.com/songs/eric-clapton-lay-down-sally-chords-tabs-guitar-lesson-bs-209"]],
  "billboard:1058": [["Ain't No Sunshine by Bill Withers","https://www.justinguitar.com/songs/bill-withers-ain-t-no-sunshine-chords-tabs-guitar-lesson-bs-292"]],
  "billboard:107": [["Sweet Home Alabama [1/2] by Lynyrd Skynyrd","https://www.justinguitar.com/songs/lynyrd-skynyrd-sweet-home-alabama-1-2-chords-tabs-guitar-lesson-st-310"],["Sweet Home Alabama [2/2] by Lynyrd Skynyrd","https://www.justinguitar.com/songs/lynyrd-skynyrd-sweet-home-alabama-2-2-chords-tabs-guitar-lesson-st-3102"]],
  "billboard:1107": [["Ob-La-Di, Ob-La-Da by The Beatles","https://www.justinguitar.com/songs/the-beatles-ob-la-di-ob-la-da-chords-tabs-guitar-lesson-sg-200"]],
  "billboard:1139": [["Are You Sure Hank Done It This Way by Waylon Jennings","https://www.justinguitar.com/songs/waylon-jennings-are-you-sure-hank-done-it-this-way-chords-tabs-guitar-lesson-sg-082"]],
  "billboard:1171": [["Night Moves by Bob Seger","https://www.justinguitar.com/songs/bob-seger-night-moves-chords-tabs-guitar-lesson-sg-163"]],
  "billboard:120": [["Be My Baby by The Ronettes","https://www.justinguitar.com/songs/the-ronettes-be-my-baby-chords-tabs-guitar-lesson-sb-415"]],
  "billboard:140": [["La Grange by ZZ Top","https://www.justinguitar.com/songs/zz-top-la-grange-chords-tabs-guitar-lesson-sb-303"]],
  "billboard:217": [["Jessie's Girl by Rick Springfield","https://www.justinguitar.com/songs/rick-springfield-jessie-s-girl-chords-tabs-guitar-lesson-bs-826"]],
  "billboard:229": [["Honky Tonk Women by The Rolling Stones","https://www.justinguitar.com/songs/the-rolling-stones-honky-tonk-women-chords-tabs-guitar-lesson-st-356"]],
  "billboard:249": [["Old Time Rock And Roll by Bob Seger","https://www.justinguitar.com/songs/bob-seger-old-time-rock-and-roll-chords-tabs-guitar-lesson-bs-125"]],
  "billboard:269": [["Money by Pink Floyd","https://www.justinguitar.com/songs/pink-floyd-money-chords-tabs-guitar-lesson-rf-011"]],
  "billboard:29": [["The Joker by The Steve Miller Band","https://www.justinguitar.com/songs/the-steve-miller-band-the-joker-chords-tabs-guitar-lesson-sg-215"]],
  "billboard:314": [["I Got You (I Feel Good)  by James Brown","https://www.justinguitar.com/songs/james-brown-i-got-you-i-feel-good-chords-tabs-guitar-lesson-st-371"]],
  "billboard:421": [["Pinball Wizard by The Who","https://www.justinguitar.com/songs/the-who-pinball-wizard-chords-tabs-guitar-lesson-sb-420"]],
  "billboard:473": [["Come Together by The Beatles","https://www.justinguitar.com/songs/the-beatles-come-together-chords-tabs-guitar-lesson-sg-123"]],
  "billboard:50": [["Love Me Do by The Beatles","https://www.justinguitar.com/songs/the-beatles-love-me-do-chords-tabs-guitar-lesson-bs-108"]],
  "billboard:587": [["Unchained Melody by The Righteous Brothers","https://www.justinguitar.com/songs/the-righteous-brothers-unchained-melody-chords-tabs-guitar-lesson-sb-410"]],
  "billboard:605": [["The Thrill Is Gone [SOLO] by BB King","https://www.justinguitar.com/songs/bb-king-the-thrill-is-gone-solo-chords-tabs-guitar-lesson-cs-006"],["The Thrill Is Gone by BB King","https://www.justinguitar.com/songs/bb-king-the-thrill-is-gone-chords-tabs-guitar-lesson-st-352"]],
  "billboard:629": [["Beat It by Michael Jackson","https://www.justinguitar.com/songs/michael-jackson-beat-it-chords-tabs-guitar-lesson-sg-281"]],
  "billboard:645": [["(Sittin' On) The Dock Of The Bay by Otis Redding","https://www.justinguitar.com/songs/otis-redding-sittin-on-the-dock-of-the-bay-chords-tabs-guitar-lesson-bs-402"]],
  "billboard:727": [["Eight Days A Week by The Beatles","https://www.justinguitar.com/songs/the-beatles-eight-days-a-week-chords-tabs-guitar-lesson-st-817"]],
  "billboard:803": [["True Colors by Cyndi Lauper","https://www.justinguitar.com/songs/cyndi-lauper-true-colors-chords-tabs-guitar-lesson-sb-212"]],
  "billboard:841": [["Born to Be Wild by Steppenwolf","https://www.justinguitar.com/songs/steppenwolf-born-to-be-wild-chords-tabs-guitar-lesson-sb-305"]],
  "billboard:852": [["Bad Moon Rising by Creedence Clearwater Revival","https://www.justinguitar.com/songs/creedence-clearwater-revival-bad-moon-rising-chords-tabs-guitar-lesson-bs-121"]],
  "billboard:86": [["Space Oddity by David Bowie","https://www.justinguitar.com/songs/david-bowie-space-oddity-chords-tabs-guitar-lesson-st-357"]],
  "billboard:94": [["Wild Horses [OPEN G] by The Rolling Stones","https://www.justinguitar.com/songs/the-rolling-stones-wild-horses-open-g-chords-tabs-guitar-lesson-sg-016"]],
  "billboard:945": [["Riders On The Storm by The Doors","https://www.justinguitar.com/songs/the-doors-riders-on-the-storm-chords-tabs-guitar-lesson-st-355"]],
  "billboard:958": [["Miss You by The Rolling Stones","https://www.justinguitar.com/songs/the-rolling-stones-miss-you-chords-tabs-guitar-lesson-st-369"]],
  "billboard:979": [["Karma Chameleon by Culture Club","https://www.justinguitar.com/songs/culture-club-karma-chameleon-chords-tabs-guitar-lesson-sg-236"]],
  "song:deck-the-halls": [["Deck The Halls by Xmas Classic","https://www.justinguitar.com/songs/xmas-classic-deck-the-halls-chords-tabs-guitar-lesson-st-117"]],
  "song:end-of-beginning": [["End Of Beginning by Djo","https://www.justinguitar.com/songs/djo-end-of-beginning-chords-tabs-guitar-lesson-sg-283"]],
  "song:santa-claus-is-coming-to-town": [["Santa Claus Is Coming To Town by Xmas Classic","https://www.justinguitar.com/songs/xmas-classic-santa-claus-is-coming-to-town-chords-tabs-guitar-lesson-st-110"]],
  "song:silent-night": [["Silent Night by Xmas Classic","https://www.justinguitar.com/songs/xmas-classic-silent-night-chords-tabs-guitar-lesson-st-111"]],
  "song:viva-la-vida": [["Viva La Vida by Coldplay","https://www.justinguitar.com/songs/coldplay-viva-la-vida-chords-tabs-guitar-lesson-st-813"]],
  "song:we-wish-you-a-merry-christmas": [["We Wish You A Merry Christmas (Easy Arr.) by Xmas Classic","https://www.justinguitar.com/songs/xmas-classic-we-wish-you-a-merry-christmas-easy-arr-chords-tabs-guitar-lesson-st-112"],["We Wish You A Merry Christmas (Fingerstyle) by Xmas Classic","https://www.justinguitar.com/songs/xmas-classic-we-wish-you-a-merry-christmas-fingerstyle-chords-tabs-guitar-lesson-st-113"],["We Wish You A Merry Christmas [EASY] by Xmas Classic","https://www.justinguitar.com/songs/xmas-classic-we-wish-you-a-merry-christmas-easy-chords-tabs-guitar-lesson-st-119"]],
  "song:winter-wonderland": [["Winter Wonderland by Dean Martin","https://www.justinguitar.com/songs/dean-martin-winter-wonderland-chords-tabs-guitar-lesson-st-118"]],
  "tune:alison": [["Alison by Elvis Costello","https://www.justinguitar.com/songs/elvis-costello-alison-chords-tabs-guitar-lesson-sb-319"]],
  "tune:all-of-me": [["All Of Me by John Legend","https://www.justinguitar.com/songs/john-legend-all-of-me-chords-tabs-guitar-lesson-st-388"]],
  "tune:all-of-me-2": [["All Of Me by John Legend","https://www.justinguitar.com/songs/john-legend-all-of-me-chords-tabs-guitar-lesson-st-388"]],
  "tune:all-of-me-3": [["All Of Me by John Legend","https://www.justinguitar.com/songs/john-legend-all-of-me-chords-tabs-guitar-lesson-st-388"]],
  "tune:all-of-me-4": [["All Of Me by John Legend","https://www.justinguitar.com/songs/john-legend-all-of-me-chords-tabs-guitar-lesson-st-388"]],
  "tune:cissy-strut": [["Cissy Strut by The Meters","https://www.justinguitar.com/songs/the-meters-cissy-strut-chords-tabs-guitar-lesson-st-365"]],
  "tune:dancing-in-the-dark": [["Dancing In The Dark by Bruce Springsteen","https://www.justinguitar.com/songs/bruce-springsteen-dancing-in-the-dark-chords-tabs-guitar-lesson-bs-891"]],
  "tune:flowers": [["Flowers by Miley Cyrus","https://www.justinguitar.com/songs/miley-cyrus-flowers-chords-tabs-guitar-lesson-sg-209"]],
  "tune:green-onions": [["Green Onions by Booker T. & the M.G.s","https://www.justinguitar.com/songs/booker-t-the-m-g-s-green-onions-chords-tabs-guitar-lesson-sb-427"]],
  "tune:hello": [["Hello by Adele","https://www.justinguitar.com/songs/adele-hello-chords-tabs-guitar-lesson-st-358"]],
  "tune:i-remember-you": [["I Remember You by Skid Row","https://www.justinguitar.com/songs/skid-row-i-remember-you-chords-tabs-guitar-lesson-sg-264"]],
  "tune:killing-me-softly-with-his-song": [["Killing Me Softly With His Song by Roberta Flack","https://www.justinguitar.com/songs/roberta-flack-killing-me-softly-with-his-song-chords-tabs-guitar-lesson-bs-401"]],
  "tune:last-train-home": [["Last Train Home by John Mayer","https://www.justinguitar.com/songs/john-mayer-last-train-home-chords-tabs-guitar-lesson-sg-075"]],
  "tune:moonlight-in-vermont": [["Moonlight In Vermont by Johnny Smith","https://www.justinguitar.com/songs/johnny-smith-moonlight-in-vermont-chords-tabs-guitar-lesson-sg-042"]],
  "tune:stormy-monday": [["Stormy Monday by The Allman Brothers Band","https://www.justinguitar.com/songs/the-allman-brothers-band-stormy-monday-chords-tabs-guitar-lesson-sg-248"]],
  "tune:sunny": [["Sunny by Bobby Hebb","https://www.justinguitar.com/songs/bobby-hebb-sunny-chords-tabs-guitar-lesson-sg-169"]],
  "tune:superstition": [["Superstition by Stevie Wonder","https://www.justinguitar.com/songs/stevie-wonder-superstition-chords-tabs-guitar-lesson-sg-065"]],
  "tune:vincent": [["Vincent by Don McLean","https://www.justinguitar.com/songs/don-mclean-vincent-chords-tabs-guitar-lesson-bs-804"]],
  "tune:what-a-wonderful-world": [["What A Wonderful World (UKE) by Louis Armstrong","https://www.justinguitar.com/songs/louis-armstrong-what-a-wonderful-world-uke-chords-tabs-guitar-lesson-us-108"],["What a Wonderful World by Sam Cooke","https://www.justinguitar.com/songs/sam-cooke-what-a-wonderful-world-chords-tabs-guitar-lesson-sg-226"]]
};
/* justin-index:end */
  function of(keys) {
    var out = [], seen = {};
    [].concat(keys).forEach(function (k) { (INDEX[k] || []).forEach(function (x) { if (!seen[x[1]]) { seen[x[1]] = 1; out.push(x); } }); });
    return out;
  }
  function line(keys) {
    var list = of(keys); if (!list.length) return null;
    var p = document.createElement("p"); p.className = "jg-line"; p.style.cssText = "font-size:.85rem;margin:.4rem 0";
    p.appendChild(document.createTextNode("On JustinGuitar: "));
    list.forEach(function (x, i) {
      if (i) p.appendChild(document.createTextNode("; "));
      var a = document.createElement("a"); a.href = x[1]; a.target = "_blank"; a.rel = "noopener"; a.textContent = x[0]; p.appendChild(a);
    });
    return p;
  }
  global.JustinLink = { of: of, line: line };
})(window);
