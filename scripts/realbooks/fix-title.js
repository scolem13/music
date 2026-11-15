// fix-title.js: undoes the OCR slips in the book-index titles (apps/realbooks/index/*.json) before build-catalogue.js merges them.
// The slips seen in the 57 indexes (2026-11-15): the pronoun I read as | ! 1 l (alone or glued to the next word: "|Am Loved",
// "! Hear Music", "1 Love You Truly"); O read as 0 ("0 Holy Night", "0oh Poo Pah Doo"); I dropped before 'll / 'm / 've
// ("'Ll Get By"); l read as ! at the end of a word ("Stil!"); If / Is / It / In / I'm read as lf / ls / lt / ln / lm; stray marks
// from the column to the left (") | ", "] ", "; ", "? ", "} ") and dot-leader junk ("coc ccc cece ... 120 |"). Numbers that are part
// of a title (Pt. 1, 2.0, "2 Down And 1 Across", "M-1-S-S-I-S-S-|-P-P") are left alone; anything not covered is in HAND.
// Also: ‘ before Round / Tis / Twas / Bout ... becomes the apostrophe ’ (it looked like a backtick); the Songfinder list goes through it too.
// Test: node scripts/realbooks/fix-title.js  (prints each title it changes; --check fails on a listed case that comes out wrong)
"use strict";
const HAND = {              // one-off slips the rules cannot tell from a real "!" (exclamations are common in titles)
  "And! Was Beautiful": "And I Was Beautiful", "I'm Alone Because! Love You": "I'm Alone Because I Love You",
  "That's How Young! Feel": "That's How Young I Feel", "Where Do! Go?": "Where Do I Go?", "Pve Never Said! Love You": "I've Never Said I Love You",
  "| Brush Up Your Shakespeare": "Brush Up Your Shakespeare", "| Bubbles In The Wine": "Bubbles In The Wine", ") { Missed The Last Rainbow": "I Missed The Last Rainbow",
  "; | Fee! Like A Feather in The Breeze": "I Feel Like A Feather in The Breeze", "> | Don't Think Il End It All Today": "I Don't Think I'll End It All Today",
  "| Don't Carelf The Sun Don't Shine": "I Don't Care If The Sun Don't Shine", "| Wonder What The King ts Doing Tonight": "I Wonder What The King Is Doing Tonight",
  ") t Had A Ball": "I Had A Ball", "Fee! Like A Feather in The Breeze": "I Feel Like A Feather in The Breeze", "My Heart Stood Stil!": "My Heart Stood Still",
  "Love To Tel! The Story": "I Love To Tell The Story", "The Rock 'N' Rol! Waltz": "The Rock 'N' Roll Waltz", "Since I Fel! For You": "Since I Fell For You",
  "Sleepy Time Ga!": "Sleepy Time Gal", "Pedacito del C!elo": "Pedacito del Cielo", "Don't Think Il End It All Today": "I Don't Think I'll End It All Today",
  "Don't Carelf The Sun Don't Shine": "I Don't Care If The Sun Don't Shine", "Wonder What The King ts Doing Tonight": "I Wonder What The King Is Doing Tonight",
  "ts This Where I Wake Up": "Is This Where I Wake Up", "t Had A Ball": "I Had A Ball",
  "Let Is Snow! Let It Snow! Let It Snow!": "Let It Snow! Let It Snow! Let It Snow!", "I Need Your Help ll!": "I Need Your Help II!",
  "IT 1 LOVE AGAIN": "IT I LOVE AGAIN", "Just Called To Say |! Love You": "I Just Called To Say I Love You",
  "May Be Wrong (But, ! Think You're Wonderful!)": "I May Be Wrong (But, I Think You're Wonderful!)",
  "Until You Come Back To Me (That's What !'m Gonna Do)": "Until You Come Back To Me (That's What I'm Gonna Do)",
  "' Ve Got the World Ona String": "I've Got the World On a String", "(ve Got) Beginner's Luck": "(I've Got) Beginner's Luck",
  "(tne) Gay Continental": "(The) Gay Continental", "{A) Melody From The Sky": "(A) Melody From The Sky", "Espana Can]": "España Cañí", "? Y Tu Que Has Hecho?": "¿Y Tu Que Has Hecho?",
  "Ihasta Siempre! (No Te Digo Apiés)": "¡Hasta Siempre! (No Te Digo Adiós)", "¡gua De Beber (Water To Drink)": "Água De Beber (Water To Drink)",
  "¡guas De MarÁo (Waters Of March)": "Águas De Março (Waters Of March)", "ci |, K": "", "a : '": "",
  "Praise The Lord And Pass The Ammunition! Loe": "Praise The Lord And Pass The Ammunition!",
  "Let Is Snow! Let It Snow! Let It Snow! =": "Let It Snow! Let It Snow! Let It Snow!",
  "PUN WTI! Ew IVI ANI SUG. re Se eee OU No Strings": "No Strings", "'Til) I Kissed You": "('Til) I Kissed You",
  "The Good, The Bad And The Usly (li Buona, II Brutto, Il Cattivo)": "The Good, The Bad And The Ugly (Il Buono, Il Brutto, Il Cattivo)",
  "M Sorry I Made You Cry": "I'm Sorry I Made You Cry", "Loving ls AWay Of Living": "Loving Is A Way Of Living",
};
// dot leaders: from the first run of 3+ tokens made of the letters OCR reads dots as (c e o n r s t v l . and the page number after)
function cutLeader(t) {
  const w = t.split(" "), dotty = (x) => /^[ceonrstvlw.]+$/.test(x) && /[ceo.]/.test(x);
  for (let i = 1; i < w.length - 2; i++) if (dotty(w[i]) && dotty(w[i + 1]) && dotty(w[i + 2]) && /c/.test(w.slice(i, i + 4).join(""))) return w.slice(0, i).join(" ");
  return t;
}
const KEEP_APOS = /^['‘’](round|s\b|tain|taint|til|tis|twas|way|deed|cause|n\b|bout|neath)/i;   // real leading apostrophes
function fixTitle(t0) {
  let t = String(t0 || "").replace(/\s+/g, " ").trim();
  if (HAND[t] != null) return HAND[t];
  t = cutLeader(t).replace(/\s+[_=]\s*!?$/, "");                                          // dot leaders read as letters, trailing marks
  t = t.replace(/^[)}{]\s+(?=(Heard|Saw|Fall|Let|Love|Loved|Feel|Got|Know|Don't|Believe|Think|Wish|Want|Have|Like|Could|Didn't|Was|Can|Remember|Hear|Get|Promise|Never|See|Talk|Will|Missed|Had|Whistle)\b)/, "I ").replace(/^\}\s+i\s/, "I ");            // ") Saw Three Ships": the I read as )
  t = t.replace(/^(?:[)\]};?>={]\s*)+(?=\S)/, "");                                       // marks from the column to the left
  t = t.replace(/^[`´]+\s*/, "").replace(/`/g, "'");
  t = t.replace(/(^|[\s(])‘(?=(round|deed|tain|taint|til|tis|twas|way|cause|bout|neath|s)\b)/gi, "$1’");   // ‘Round Midnight: an apostrophe, not an open quote
  t = t.replace(/^(?:\|\s*)+\|/, "|").replace(/^!\s*\|/, "|");                            // "| | Talk", "! | Still"
  t = t.replace(/^(\(?\s*)\|!?(?=(\s)|[A-Z])/, (m, a, sp) => a + (sp ? "I" : "I "));    // leading | or |! = I ("|Am Loved")
  t = t.replace(/^1'!/, "I'll").replace(/^1(?=\s+[A-Z]|'ll\s)/, "I");                     // "1 Love You Truly", "1'll", "1'! Never"
  t = t.replace(/^!\s(?=[A-Z])/, "I ");                                                      // "! Hear Music"
  t = t.replace(/^(?:''|"'|['‘’])\s?(ll|m|ve|d)\b/i, (m, w) => "I'" + w.toLowerCase());    // "'Ll Get By", "''m Gonna", "' Ve Got"
  t = t.replace(/^['‘’](?=[A-Z])/, (m) => (KEEP_APOS.test(t) ? m : ""));                 // "'The Big Rock Candy Mountain"
  t = t.replace(/^(?:lf|LF)\b/, "If").replace(/^lm\b/, "I'm").replace(/^\(I\)\s/, "I ");
  t = t.replace(/^M (?=A |[A-Z][a-z])/, "I'm ");                                          // "M Gettin' Sentimental": I' lost
  t = t.replace(/^0(?=\s+[a-z]+\s+[a-z]\s)/, "O").replace(/(^|[\s(])0(?=\s+[A-Z])/g, "$1O").replace(/(^|[\s(])0(?=[a-z])/g, "$1O"); // "0 Holy Night", "0oh"
  if (!/\d.*\d|-\d-/.test(t.replace(/^1/, "")))                                              // titles with numbers in them keep their 1s
    t = t.replace(/(\s)1(?=\s+[A-Za-z])/g, "$1I");                                           // "All 1 Do Is Dream"
  if (!/-\|-/.test(t)) {
    t = t.replace(/(^|[\s(])[|!](?=\s|\)|\?|$)/g, "$1I");                                   // "| " alone (also "Shouldn't |?")
    t = t.replace(/(^|\s)\|(?=[A-Z][a-z])/g, "$1I ");                                       // "|Wanna" (glued)
    t = t.replace(/([a-z])\|(?=\s)/g, "$1 I");                                              // "All| Touch"
    t = t.replace(/\|!/g, "I");
  }
  t = t.replace(/\bI'l!/g, "I'll").replace(/(\s)l(?=\s+[A-Z])/g, "$1I").replace(/(\s)ln(?=\s)/g, "$1In").replace(/(\s)lt\b/g, "$1It").replace(/\bls(?=\s)/g, "Is");
  t = t.replace(/^lf\b/, "If").replace(/(\s)lf(?=\s)/g, "$1If").replace(/\bDo lt\b/, "Do It");
  t = t.replace(/^\[(?=[A-Z])/, "I ").replace(/\s\[(?=[A-Z][a-z])/g, " I ");              // "[Like Him"
  t = t.replace(/^(?:[\])]\s*)+/, "").replace(/(?<=[a-z])\]$/, "").replace(/\s+\d\]$/, "").trim();   // "Topkapi]", "Street 3]"
  if (HAND[t] != null) return HAND[t];
  return t;
}
module.exports = fixTitle;

if (require.main === module) {
  const CASES = [["|Am Loved", "I Am Loved"], ["| Could Write A Book", "I Could Write A Book"], ["! Hear Music", "I Hear Music"],
    ["0 Holy Night", "O Holy Night"], ["0oh Poo Pah Doo", "Ooh Poo Pah Doo"], ["1 Love You Truly", "I Love You Truly"],
    ["1'll Keep You Satisfied", "I'll Keep You Satisfied"], ["1'! Never Love This Way Again", "I'll Never Love This Way Again"],
    ["All 1 Do is Dream of You", "All I Do is Dream of You"], ["All| Touch", "All I Touch"], [") | Could Go On Singing", "I Could Go On Singing"],
    ["] |Heard A Forest Praying", "I Heard A Forest Praying"], ["; | Promise You", "I Promise You"], ["| | Talk To The Trees", "I Talk To The Trees"],
    ["! | Still See Elisa", "I Still See Elisa"], ["Why Shouldn't |?", "Why Shouldn't I?"], ["When | Dance With The Person | Love", "When I Dance With The Person I Love"],
    ["'Ll Get by (As Long As | Have You)", "I'll Get by (As Long As I Have You)"], ["''m Gonna Wash That Man Right Out Of My Hair", "I'm Gonna Wash That Man Right Out Of My Hair"],
    ["'ve Got You Under My Skin", "I've Got You Under My Skin"], ["'The Big Rock Candy Mountain", "The Big Rock Candy Mountain"],
    ["'Round Her Neck She Wears a Yellow Ribbon", "'Round Her Neck She Wears a Yellow Ribbon"], ["‘Round Midnight", "’Round Midnight"], ["'S Wonderful", "'S Wonderful"],
    ["If l Had You", "If I Had You"], ["lf Not For You", "If Not For You"], ["LF My Friends Could See Me Now!", "If My Friends Could See Me Now!"],
    ["lm Popeye The Sailor Man", "I'm Popeye The Sailor Man"], ["So Do lt", "So Do It"], ["Every Time 1 See You", "Every Time I See You"],
    ["2 Down And 1 Across", "2 Down And 1 Across"], ["Cold Sweat, Pt. 1", "Cold Sweat, Pt. 1"], ["M-1-S-S-I-S-S-|-P-P", "M-1-S-S-I-S-S-|-P-P"],
    ["3,2,1,0", "3,2,1,0"], ["Night Train 0", "Night Train 0"], ["Help!", "Help!"], ["Hello, Dolly!", "Hello, Dolly!"], ["Wonderful! Wonderful!", "Wonderful! Wonderful!"],
    ["Topkapi]", "Topkapi"], ["Yeah oo ccc cece cece ccc ccc e cece enc cececceees 304 _!", "Yeah"], ["My Heart Stood Stil!", "My Heart Stood Still"],
    ["The Devil's Brigade March (| Want a Woman)", "The Devil's Brigade March (I Want a Woman)"], ["Kashmiri Song (Pale Hands | Loved)", "Kashmiri Song (Pale Hands I Loved)"],
    ["Li'l Darlin'", "Li'l Darlin'"], ["Blue Rondo a la Turk", "Blue Rondo a la Turk"], ["Me Voy Pa'l Pueblo", "Me Voy Pa'l Pueblo"],
    ["`Tis Autumn", "Tis Autumn"], [") [Like Him", "I Like Him"], ["Honky Tonk (Parts 1 & 2)", "Honky Tonk (Parts 1 & 2)"], ["M A Ding Dong Daddy From Dumas", "I'm A Ding Dong Daddy From Dumas"],
    ["0 for a Faith That Will Not Shrink", "O for a Faith That Will Not Shrink"], ["M.J.M.", "M.J.M."], ["Mélodie Au Crépuscule", "Mélodie Au Crépuscule"]];
  let bad = 0;
  CASES.forEach(([a, b]) => { const g = fixTitle(a); if (g !== b) { bad++; console.log("WRONG", JSON.stringify(a), "->", JSON.stringify(g), "want", JSON.stringify(b)); } });
  if (!process.argv.includes("--check")) {
    const fs = require("fs"), path = require("path"), dir = path.join(__dirname, "../../apps/realbooks/index");
    const seen = new Set();
    fs.readdirSync(dir).filter((f) => f.endsWith(".json")).forEach((f) => (JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).entries || []).forEach((e) => {
      const g = fixTitle(e.title); if (e.title && g !== e.title.trim() && !seen.has(e.title)) { seen.add(e.title); console.log(JSON.stringify(e.title), "->", JSON.stringify(g)); }
    }));
  }
  console.log(CASES.length - bad + "/" + CASES.length + " cases right");
  process.exitCode = bad ? 1 : 0;
}
