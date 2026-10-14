// ipa-data.js — the data behind tools/ipa-chart.qmd: IPA symbols with reference words in English (General American
// "GA" and RP), Hindi, Marathi, German, French, Korean and Japanese. Plain data, no DOM: the page script
// (ipa-chart.js) and tests/ipa/ipa-data.test.js both load it.
//
// Example strings are "word|romanisation|gloss|note". {braces} mark the part of the word that has the sound.
// For Korean the whole syllable is marked (Hangul writes a syllable as one block). An empty language list means
// the language has no such sound (it is left blank on purpose rather than forced).
(function (root) {
  var LANGS = [
    { id: "en", name: "English", short: "EN" }, { id: "hi", name: "Hindi", short: "HI" },
    { id: "mr", name: "Marathi", short: "MR" }, { id: "de", name: "German", short: "DE" },
    { id: "fr", name: "French", short: "FR" }, { id: "ko", name: "Korean", short: "KO" },
    { id: "ja", name: "Japanese", short: "JA" }
  ];
  var VROWS = ["Close", "Near-close", "Close-mid", "Mid", "Open-mid", "Near-open", "Open"];
  var PLACES = ["Bilabial", "Labiodental", "Dental", "Alveolar", "Post-alveolar", "Retroflex", "Palatal", "Velar", "Uvular", "Pharyngeal", "Glottal"];
  var MANNERS = ["Plosive", "Nasal", "Trill", "Tap / flap", "Fricative", "Lateral fricative", "Approximant", "Lateral approximant"];

  var S = [];
  // v(id, name, row 0-6, column 0 front .. 2 back, rounded?, description, examples, tip)
  function v(id, name, y, c, r, desc, ex, tip) { S.push({ id: id, cat: "v", name: name, y: y, c: c, r: r, desc: desc, ex: ex || {}, tip: tip || "" }); }
  // c(id, name, place, manner, voiced?, description, examples, tip)
  function c(id, name, pl, mn, vd, desc, ex, tip) { S.push({ id: id, cat: "c", name: name, pl: pl, mn: mn, vd: vd, desc: desc, ex: ex || {}, tip: tip || "" }); }
  // o(cat, id, name, description, examples, tip): cat "a" affricates and other consonants, "m" modified sounds, "d" diacritics and marks
  function o(cat, id, name, desc, ex, tip) { S.push({ id: id, cat: cat, name: name, desc: desc, ex: ex || {}, tip: tip || "" }); }

  /* ------------------------------------------------------------------ vowels */
  v("i", "close front unrounded vowel", 0, 0, 0, "Tongue high and forward, lips spread. The vowel of Italian and Spanish 'i'.", {
    en: ["{ee}l|||GA [i], RP [iː]", "happ{y}|||final -y is [i] (GA) / [ɪ]~[i] (RP)"],
    hi: ["द{ी}प|dīp|lamp|long ई"], mr: ["द{ी}प|dīp|lamp|long ई", "{इ}थे|ithe|here|short इ is also [i], not lax"],
    de: ["L{ie}be||love", "V{i}deo||video"], fr: ["{i}ci||here", "v{i}e||life"],
    ko: ["{이}|i|tooth; two"], ja: ["{い}ぬ|inu|dog"] }, "Keep it tall and forward but not pinched; it tends to narrow the pharynx, so check the jaw stays released.");
  v("y", "close front rounded vowel", 0, 0, 1, "Say [i] and round the lips as for [u], keeping the tongue forward.", {
    de: ["k{ü}hl||cool", "{Ü}bung||exercise"], fr: ["l{u}ne||moon", "s{u}r||on"] },
    "The 'ee' tongue with 'oo' lips. The most common fault is sliding towards [u] or [i].");
  v("ɨ", "close central unrounded vowel", 0, 1, 0, "Tongue high and central, lips unrounded. Russian ы; not a phoneme in any of these languages.", {});
  v("ʉ", "close central rounded vowel", 0, 1, 1, "Tongue high and central, lips rounded (Swedish u). Many English accents have a fronted 'goose' vowel near this, but no language here has it as a separate phoneme.", {});
  v("ɯ", "close back unrounded vowel", 0, 2, 0, "Tongue high and back, lips not rounded. Korean ㅡ is [ɯ]. Japanese う is a little further forward and with the lips compressed, not protruded: [ɯ̟ᵝ].", {
    ko: ["{은}행|eunhaeng|bank|syllable ㅡ", "{그}림|geurim|picture"],
    ja: ["{う}み|umi|sea|[ɯ̟ᵝ], lips compressed, not rounded", "か{く}|kaku|to write|[ɯ̟ᵝ]"] },
    "For Japanese, do not use English 'oo'. Spread the lips slightly and keep them still, as if saying 'oo' without pushing the lips forward.");
  v("u", "close back rounded vowel", 0, 2, 1, "Tongue high and back, lips rounded and pushed forward.", {
    en: ["g{oo}se|||GA [u], RP [uː]"], hi: ["{ऊ}पर|ūpar|above|long ऊ"], mr: ["{ऊ}स|ūs|sugarcane|long ऊ", "{उ}द्या|udyā|tomorrow|short उ"],
    de: ["g{u}t||good", "Sch{u}le||school"], fr: ["v{ou}s||you (plural)", "r{ou}ge||red"], ko: ["{우}유|uyu|milk"], ja: [] },
    "Italianate 'u'. In English, the 'oo' of goose often drifts forward and closes into [w]; hold the pure vowel in singing.");
  v("ɪ", "near-close near-front unrounded vowel", 1, 0.5, 0, "A lax [i], slightly lower and more central.", {
    en: ["k{i}t|||GA & RP"], hi: ["{इ}धर|idhar|here|short इ, often transcribed [ɪ]~[i]"], de: ["b{i}tte||please", "{I}nsel||island"], mr: [], fr: [], ko: [], ja: [] },
    "A very short-lived vowel when sung; singers often choose a brighter [i]-ward or [e]-ward colour on long notes, depending on the style.");
  v("ʏ", "near-close near-front rounded vowel", 1, 0.5, 1, "A lax [y].", { de: ["h{ü}bsch||pretty", "F{ü}nf||five", "M{ü}ll||rubbish"] });
  v("ʊ", "near-close near-back rounded vowel", 1, 1.5, 1, "A lax [u], slightly lower and more central.", {
    en: ["f{oo}t|||GA & RP"], hi: ["{उ}स|us|that (oblique)|short उ, often transcribed [ʊ]~[u]"], de: ["m{u}ss||must", "H{u}nd||dog"], mr: [], fr: [], ko: [], ja: [] });
  v("e", "close-mid front unrounded vowel", 2, 0, 0, "Tongue mid-high and forward, lips spread. Italian 'e chiuso'. English has no pure [e]; face is the diphthong [eɪ].", {
    en: ["f{a}ce|||really [eɪ]; singers hold the first part, a pure [e]"], hi: ["{ए}क|ek|one|long ए"], mr: ["{ए}क|ek|one"],
    de: ["S{ee}||lake", "B{e}te||beet"], fr: ["{é}t{é}||summer", "chant{er}||to sing", "parl{ez}||you speak"], ko: ["{게}|ge|crab|ㅔ; ㅔ and ㅐ have largely merged"], ja: ["{え}き|eki|station"] },
    "In sung English, hold the [e] of 'day' and put the [ɪ] glide at the very end.");
  v("ø", "close-mid front rounded vowel", 2, 0, 1, "Say [e] with rounded lips.", { de: ["sch{ö}n||beautiful", "L{ö}wen||lions"], fr: ["p{eu}||little", "bl{eu}||blue"] });
  v("ɘ", "close-mid central unrounded vowel", 2, 1, 0, "Between [e] and [ə]. No separate phoneme in these languages.", {});
  v("ɵ", "close-mid central rounded vowel", 2, 1, 1, "Rounded counterpart of [ɘ]. No separate phoneme in these languages.", {});
  v("ɤ", "close-mid back unrounded vowel", 2, 2, 0, "Unrounded [o]. Mandarin e. Not a phoneme in these languages (Korean ㅓ is a lower back vowel, see [ʌ]).", {});
  v("o", "close-mid back rounded vowel", 2, 2, 1, "Tongue mid-high and back, lips rounded. Italian 'o chiuso'. English has no pure [o]; goat is [oʊ].", {
    en: ["g{oa}t|||really [oʊ] (GA) / [əʊ] (RP); sing a pure [o] first"], hi: ["म{ो}र|mor|peacock|ओ"], mr: ["म{ो}र|mor|peacock|ओ"],
    de: ["B{oo}t||boat", "r{o}t||red"], fr: ["b{eau}||beautiful", "m{o}t||word", "{au}tre||other"], ko: ["{오}리|ori|duck"], ja: ["{お}と|oto|sound"] });
  v("ə", "mid central vowel (schwa)", 3, 1, 0, "Relaxed, neutral tongue and lips.", {
    en: ["{a}bout|||GA & RP", "sof{a}|||"], hi: ["{क}ल|kal|tomorrow / yesterday|inherent अ ≈ [ə]; often shorter or dropped at word end", "{अ}ब|ab|now"],
    mr: ["{क}मळ|kamaḷ|lotus|inherent अ ≈ [ə]"], de: ["bitt{e}||please", "Gab{e}||gift"], fr: ["l{e}||the", "p{e}tit||small|the 'mute e', often sung as a short [ø]~[ə]"], ko: [], ja: [] },
    "In English singing, unstressed syllables are often brightened (e.g. 'a-' toward [a] or [ɑ]) on long notes; check the style you sing in. French mute e is pronounced when sung, on its own note.");
  v("ɜ", "open-mid central unrounded vowel", 4, 1, 0, "Between [ɛ] and [ə]. In English NURSE: RP [ɜː]; GA has an r-coloured vowel [ɝ].", {
    en: ["b{ir}d|||RP [ɜː]; GA [ɝ]", "n{ur}se|||RP [ɜː]; GA [ɝ]"] });
  v("ɞ", "open-mid central rounded vowel", 4, 1, 1, "Rounded counterpart of [ɜ]. No separate phoneme in these languages.", {});
  v("ʌ", "open-mid back unrounded vowel", 4, 2, 0, "Tongue open-mid and back, lips unrounded.", {
    en: ["c{u}p|||GA & RP; RP is often more forward [ɐ]"], ko: ["{어}머니|eomeoni|mother|ㅓ; also described as [ɔ]"], hi: [], mr: [], de: [], fr: [], ja: [] });
  v("ɔ", "open-mid back rounded vowel", 4, 2, 1, "Tongue open-mid and back, lips rounded. Italian 'o aperto'.", {
    en: ["th{ou}ght|||RP [ɔː]; GA [ɔ]~[ɑ] by region"], hi: ["{औ}रत|aurat|woman|औ ≈ [ɔː]", "{कॉ}लेज|kôlej|college|loan ऑ"], mr: ["{ऑ}फिस|ôphis|office|loan ऑ"],
    de: ["S{o}nne||sun", "H{o}lz||wood"], fr: ["p{o}rt||port", "p{o}mme||apple"], ko: [], ja: [] });
  v("ɛ", "open-mid front unrounded vowel", 4, 0, 0, "Tongue open-mid and forward, lips spread. Italian 'e aperto'.", {
    en: ["dr{e}ss|||GA & RP"], hi: ["{ऐ}सा|aisā|such|ऐ ≈ [ɛː]~[æː]"], de: ["B{e}tt||bed", "K{ä}se||cheese|ä may be long [ɛː] or [eː]"], fr: ["m{è}re||mother", "f{ai}re||to do"],
    ko: ["{애}기|aegi|baby|ㅐ; merged with ㅔ for most speakers"], mr: [], ja: [] });
  v("œ", "open-mid front rounded vowel", 4, 0, 1, "Say [ɛ] with rounded lips.", { de: ["G{ö}tter||gods", "k{ö}nnen||can"], fr: ["p{eu}r||fear", "s{œu}r||sister", "n{eu}f||nine"] });
  v("æ", "near-open front unrounded vowel", 5, 0.2, 0, "Tongue low and forward; between [ɛ] and [a].", {
    en: ["tr{a}p|||GA [æ]; RP has [a]"], mr: ["{बॅ}ट|bæṭ|bat|loan ॅ"], hi: [], de: [], fr: [], ko: [], ja: [] });
  v("ɐ", "near-open central vowel", 5, 1, 0, "Tongue low, central; a short, neutral open vowel.", {
    de: ["Lehr{er}||teacher|final -er is vocalised to [ɐ]"], en: [], hi: [], mr: [], fr: [], ko: [], ja: [] });
  v("a", "open front unrounded vowel", 6, 0, 0, "Tongue low and forward, jaw open.", {
    en: ["tr{a}p|||RP [a] (older / some speakers)"], hi: ["{आ}म|ām|mango|long आ, [aː]"], mr: ["{आ}ई|āī|mother|long आ"],
    de: ["M{a}nn||man", "T{a}g||day|long [aː]"], fr: ["p{a}tte||paw", "t{a}ble||table"], ko: ["{아}기|agi|baby"], ja: ["{あ}め|ame|rain"] });
  v("ɶ", "open front rounded vowel", 6, 0, 1, "Rounded [a]. Not a phoneme in these languages.", {});
  v("ɑ", "open back unrounded vowel", 6, 2, 0, "Tongue low and back, lips unrounded.", {
    en: ["f{a}ther|||GA & RP [ɑː]", "l{o}t|||GA [ɑ]"], fr: ["p{â}te||paste|older / some speakers; mostly merged with [a]"], hi: [], mr: [], de: [], ko: [], ja: [] });
  v("ɒ", "open back rounded vowel", 6, 2, 1, "Tongue low and back, lips rounded.", { en: ["l{o}t|||RP [ɒ]; GA has no [ɒ]"], hi: [], mr: [], de: [], fr: [], ko: [], ja: [] });

  /* -------------------------------------------------------------- consonants */
  c("p", "voiceless bilabial plosive", 0, 0, 0, "Lips close, air builds up, then bursts out.", {
    en: ["{p}en|||aspirated [pʰ] at the start of a stressed syllable; plain [p] in s{p}in"], hi: ["{प}ानी|pānī|water|unaspirated"], mr: ["{प}ाणी|pāṇī|water|unaspirated"],
    de: ["{P}ost||post|lightly aspirated"], fr: ["{p}ain||bread|never aspirated"], ko: ["{바}지|baji|trousers|lax ㅂ at the start of a word: [p]~[p̥]"], ja: ["{ぱ}ん|pan|bread"] });
  c("b", "voiced bilabial plosive", 0, 0, 1, "As [p] with the voice on.", {
    en: ["{b}at"], hi: ["{ब}ात|bāt|talk"], mr: ["{ब}ाग|bāg|garden"], de: ["{B}all||ball"], fr: ["{b}on||good"], ko: ["아{버}지|abeoji|father|lax ㅂ between vowels becomes voiced"], ja: ["{ば}ら|bara|rose"] });
  c("t̪", "voiceless dental plosive", 2, 0, 0, "Tongue tip touches the back of the upper teeth. Hindi/Marathi त, French t.", {
    hi: ["{त}ुम|tum|you"], mr: ["{त}ू|tū|you (singular)"], fr: ["{t}ante||aunt|dental to alveolar"], en: [], de: [], ko: [], ja: [] },
    "Tongue-tip-to-teeth gives the clear, light attack of Hindi/Marathi dental stops. The English alveolar [t] sounds heavier to a Hindi/Marathi ear.");
  c("d̪", "voiced dental plosive", 2, 0, 1, "As [t̪] with voicing. Hindi/Marathi द, French d.", {
    hi: ["{द}ाल|dāl|lentils"], mr: ["{द}ार|dār|door"], fr: ["{d}ent||tooth|dental to alveolar"], en: [], de: [], ko: [], ja: [] });
  c("t", "voiceless alveolar plosive", 3, 0, 0, "Tongue tip or blade touches the ridge behind the upper teeth.", {
    en: ["{t}op|||aspirated [tʰ] initially; GA flap [ɾ] in wa{t}er; glottal [ʔ] in bu{tt}on"], de: ["{T}ag||day|lightly aspirated"], ko: ["{다}리|dari|leg; bridge|lax ㄷ at the start of a word: [t]~[t̥]"], ja: ["{た}け|take|bamboo|dental to alveolar"], hi: [], mr: [], fr: [] });
  c("d", "voiced alveolar plosive", 3, 0, 1, "As [t] with voicing.", {
    en: ["{d}og"], de: ["{D}ach||roof"], ko: ["바{다}|bada|sea|lax ㄷ between vowels is voiced"], ja: ["{ど}こ|doko|where"], hi: [], mr: [], fr: [] });
  c("ʈ", "voiceless retroflex plosive", 5, 0, 0, "Tongue tip curled back; contact is behind the ridge, hard and 'cupped'. Hindi/Marathi ट.", {
    hi: ["{ट}ोपी|ṭopī|hat"], mr: ["{ट}ोपी|ṭopī|cap"], en: [], de: [], fr: [], ko: [], ja: [] },
    "Hindi and Marathi speakers hear English 't' and 'd' as retroflex, and French/Italian dentals as त/द. Learning to keep the two series apart matters when singing Hindustani or Marathi texts.");
  c("ɖ", "voiced retroflex plosive", 5, 0, 1, "As [ʈ] with voicing. Hindi/Marathi ड.", {
    hi: ["{ड}ाल|ḍāl|branch|compare दाल dāl 'lentils' [d̪]"], mr: ["{ड}ोंगर|ḍoṅgar|hill"], en: [], de: [], fr: [], ko: [], ja: [] });
  c("c", "voiceless palatal plosive", 6, 0, 0, "Tongue blade against the hard palate. Not a phoneme here (Hindi/Marathi च is an affricate, see [t͡ʃ]).", {});
  c("ɟ", "voiced palatal plosive", 6, 0, 1, "As [c] with voicing. Not a phoneme here.", {});
  c("k", "voiceless velar plosive", 7, 0, 0, "Back of tongue against the soft palate.", {
    en: ["{k}ite|||aspirated [kʰ] initially; plain in s{k}y"], hi: ["{क}ल|kal|tomorrow / yesterday"], mr: ["{क}मळ|kamaḷ|lotus"], de: ["{K}atze||cat"], fr: ["{c}afé||coffee"],
    ko: ["{가}방|gabang|bag|lax ㄱ at the start of a word: [k]~[k̥]"], ja: ["{か}さ|kasa|umbrella"] });
  c("ɡ", "voiced velar plosive", 7, 0, 1, "As [k] with voicing.", {
    en: ["{g}o"], hi: ["{ग}ाय|gāy|cow"], mr: ["{ग}ाव|gāv|village"], de: ["{G}ut||good"], fr: ["{g}are||station"], ko: ["아{기}|agi|baby|lax ㄱ between vowels is voiced"], ja: ["{が}く|gaku|study|some speakers use a nasal [ŋ] inside words"] });
  c("q", "voiceless uvular plosive", 8, 0, 0, "Back of tongue against the uvula. Hindi क़ is in theory [q] (Urdu loans); most speakers say [k].", {
    hi: ["{क़}ीमत|qīmat|price|usually [k]"], mr: [], en: [], de: [], fr: [], ko: [], ja: [] });
  c("ɢ", "voiced uvular plosive", 8, 0, 1, "Voiced uvular stop. Not a phoneme here.", {});
  c("ʔ", "glottal stop", 10, 0, 0, "The vocal folds close and release. English 'uh-oh'. Classical English and German style usually avoid unwanted glottal onsets; German inserts it before stressed vowel-initial syllables.", {
    en: ["uh{-}oh", "bu{tt}on|||GA [ˈbʌʔn̩]"], de: ["be{'}achten||to heed|the stop is not written: [bəˈʔaxtn̩]", "ver{'}eisen||to ice over"], hi: [], mr: [], fr: [], ko: [], ja: [] },
    "Singers distinguish a clean legato onset from a hard glottal one. German dictionaries prescribe a light glottal onset before a stressed initial vowel; in legato singing it is often softened.");

  c("m", "bilabial nasal", 0, 1, 1, "Lips closed, air through the nose.", {
    en: ["{m}an"], hi: ["{म}छली|machhlī|fish"], mr: ["{म}ासा|māsā|fish"], de: ["{M}ann||man"], fr: ["{m}ain||hand"], ko: ["{물}|mul|water"], ja: ["{ま}め|mame|bean"] });
  c("ɱ", "labiodental nasal", 1, 1, 1, "Teeth on lower lip, air through the nose. A neighbour-driven variant of m before f/v.", {
    en: ["co{m}fort|||variant of /m/ before f"], de: ["Sy{m}phonie||symphony|variant of /m/ before f"], hi: [], mr: [], fr: [], ko: [], ja: [] });
  c("n̪", "dental nasal", 2, 1, 1, "Tongue tip on the teeth. Hindi/Marathi न.", { hi: ["{न}ाम|nām|name"], mr: ["{न}ाव|nāv|name"], en: [], de: [], fr: [], ko: [], ja: [] });
  c("n", "alveolar nasal", 3, 1, 1, "Tongue tip or blade on the ridge, air through the nose.", {
    en: ["{n}o"], de: ["{N}ase||nose"], fr: ["{n}ez||nose|dental to alveolar"], ko: ["{나}무|namu|tree"], ja: ["{な}つ|natsu|summer"], hi: [], mr: [] });
  c("ɳ", "retroflex nasal", 5, 1, 1, "Retroflex nasal. Hindi/Marathi ण.", { hi: ["गु{ण}|guṇ|quality"], mr: ["पा{ण}ी|pāṇī|water"], en: [], de: [], fr: [], ko: [], ja: [] });
  c("ɲ", "palatal nasal", 6, 1, 1, "Middle of the tongue against the hard palate: Spanish ñ, Italian gn.", {
    fr: ["monta{gn}e||mountain", "a{gn}eau||lamb"], hi: ["प{ं}च|pañc|five|anusvara before च is [ɲ]"], ja: ["{に}ほん|nihon|Japan|に is [ɲi]~[ni]"], ko: [], mr: [], en: [], de: [] },
    "Not [n] followed by [j]: one single palatal gesture, as in Italian 'gnocchi'.");
  c("ŋ", "velar nasal", 7, 1, 1, "Back of tongue on the soft palate, air through the nose.", {
    en: ["si{ng}", "thi{n}k"], hi: ["अं{ग}ूर|aṅgūr|grape|ङ / anusvara before a velar"], mr: ["रं{ग}|raṅg|colour|anusvara before a velar"], de: ["Ri{ng}||ring", "la{ng}||long"],
    fr: ["parki{ng}||car park|loanwords only"], ko: ["{방}|bang|room|final ㅇ"], ja: ["ぎ{ん}こう|ginkō|bank|ん before k/g"] });
  c("ɴ", "uvular nasal", 8, 1, 1, "Nasal with the back of the tongue against the uvula.", { ja: ["ほ{ん}|hon|book|word-final ん"], en: [], hi: [], mr: [], de: [], fr: [], ko: [] });
  c("ʙ", "bilabial trill", 0, 2, 1, "Lips vibrate (a 'raspberry'). Not a phoneme here.", {});
  c("r", "alveolar trill", 3, 2, 1, "Tongue tip vibrates against the ridge. The rolled r; in classical singing of German and French it is the traditional choice.", {
    de: ["{R}ose||rose|stage German [r]; everyday [ʁ]"], fr: ["{r}ose||rose|classical singing tradition; everyday [ʁ]"], hi: ["{र}ात|rāt|night|tap [ɾ] more usual; trill when emphatic"], mr: ["{र}ात|rāt|night|tap [ɾ] more usual"],
    en: [], ko: [], ja: [] }, "Quick single tap [ɾ] for between-vowel r; trill for initial or double r in classical diction. Keep the tongue loose and let air do the work.");
  c("ʀ", "uvular trill", 8, 2, 1, "Uvula vibrates. An older variant of French/German r; not used in the standard forms of these languages today.", {});
  c("ⱱ", "labiodental flap", 1, 3, 1, "A flap from lip to teeth. Not a phoneme here.", {});
  c("ɾ", "alveolar tap", 3, 3, 1, "Tongue tip flicks once against the ridge.", {
    en: ["wa{t}er|||GA flap", "ci{t}y|||GA flap"], hi: ["{र}ात|rāt|night|r is a tap"], mr: ["{र}ात|rāt|night"], ko: ["나{라}|nara|country|ㄹ between vowels"], ja: ["さく{ら}|sakura|cherry blossom|ら行 is [ɾ]"], de: [], fr: [] });
  c("ɽ", "retroflex flap", 5, 3, 1, "Tongue tip curls back and flaps forward. Hindi ड़.", { hi: ["ब{ड़}ा|baṛā|big"], mr: [], en: [], de: [], fr: [], ko: [], ja: [] });

  c("ɸ", "voiceless bilabial fricative", 0, 4, 0, "Air through the narrowed lips, no teeth: like blowing out a candle.", { ja: ["{ふ}ね|fune|boat|ふ is [ɸɯ̟ᵝ]"], en: [], hi: [], mr: [], de: [], fr: [], ko: [] },
    "Not English 'f' (teeth on lip). Blow gently across the lips.");
  c("β", "voiced bilabial fricative", 0, 4, 1, "Voiced [ɸ]. Spanish b between vowels. Not a phoneme here.", {});
  c("f", "voiceless labiodental fricative", 1, 4, 0, "Upper teeth on the lower lip.", {
    en: ["{f}ish"], hi: ["{फ़}र्क|farq|difference|nuqta letter फ़ (loans)"], de: ["{F}isch||fish", "{V}ater||father"], fr: ["{f}eu||fire"], mr: [], ko: [], ja: [] });
  c("v", "voiced labiodental fricative", 1, 4, 1, "Upper teeth on the lower lip, with voice.", {
    en: ["{v}an"], de: ["{W}asser||water"], fr: ["{v}ent||wind"], hi: [], mr: [], ko: [], ja: [] });
  c("θ", "voiceless dental fricative", 2, 4, 0, "Tongue tip between or behind the teeth.", { en: ["{th}ink"], hi: [], mr: [], de: [], fr: [], ko: [], ja: [] });
  c("ð", "voiced dental fricative", 2, 4, 1, "As [θ] with voice.", { en: ["{th}is"], hi: [], mr: [], de: [], fr: [], ko: [], ja: [] });
  c("s", "voiceless alveolar fricative", 3, 4, 0, "Air hissing over the front of the tongue.", {
    en: ["{s}un"], hi: ["{स}ाल|sāl|year"], mr: ["{स}ाल|sāl|year"], de: ["Wa{ss}er||water", "Ha{ss}||hatred"], fr: ["{s}oleil||sun"], ko: ["{사}람|saram|person|lax ㅅ, slightly aspirated"], ja: ["{さ}かな|sakana|fish"] });
  c("z", "voiced alveolar fricative", 3, 4, 1, "As [s] with voice.", {
    en: ["{z}oo"], hi: ["{ज़}मीन|zamīn|ground|nuqta letter ज़ (loans)"], de: ["{S}onne||sun", "Ro{s}e||rose"], fr: ["{z}éro||zero", "ro{s}e||pink"], ja: ["{ざ}っし|zasshi|magazine|often [dz] at the start of a word"], mr: [], ko: [] });
  c("ɬ", "voiceless alveolar lateral fricative", 3, 5, 0, "Air hissing along the sides of the tongue. Welsh ll. Not a phoneme here.", {});
  c("ɮ", "voiced alveolar lateral fricative", 3, 5, 1, "Voiced [ɬ]. Not a phoneme here.", {});
  c("ʃ", "voiceless post-alveolar fricative", 4, 4, 0, "'sh': tongue blade behind the ridge, lips slightly rounded in English.", {
    en: ["{sh}e"], hi: ["{श}ाम|shām|evening"], mr: ["{श}ाळा|shāḷā|school"], de: ["{Sch}ule||school", "{S}tein||stone|st- and sp- at the start of a word"], fr: ["{ch}at||cat"], ko: [], ja: [] });
  c("ʒ", "voiced post-alveolar fricative", 4, 4, 1, "As [ʃ] with voice.", {
    en: ["mea{s}ure", "vi{s}ion"], fr: ["{j}our||day", "{g}ens||people"], de: ["{G}enie||genius|loans only"], hi: [], mr: [], ko: [], ja: [] });
  c("ʂ", "voiceless retroflex fricative", 5, 4, 0, "'sh' with the tongue tip curled back. Devanagari ष was originally [ʂ]; in practice most Hindi and many Marathi speakers say [ʃ].", {
    hi: ["{ष}ट्कोण|ṣaṭkoṇ|hexagon|usually pronounced [ʃ]"], mr: ["व{र्ष}|varṣ|year|[ʂ]~[ʃ]"], en: [], de: [], fr: [], ko: [], ja: [] });
  c("ʐ", "voiced retroflex fricative", 5, 4, 1, "Voiced [ʂ]. Not a phoneme here.", {});
  c("ç", "voiceless palatal fricative", 6, 4, 0, "Air over the hard palate: the German ich-Laut.", {
    de: ["i{ch}||I", "Mil{ch}||milk", "Mäd{ch}en||girl"], en: ["{hu}ge|||many speakers say [çudʒ] for [hj]"], ko: ["{힘}|him|strength|ㅎ before ㅣ"], ja: ["{ひ}と|hito|person|ひ is [çi]"], hi: [], mr: [], fr: [] },
    "Say a whispered 'y' of 'yes'. German ch after front vowels, l, n, r and in -chen.");
  c("ʝ", "voiced palatal fricative", 6, 4, 1, "Voiced [ç]. Not a phoneme here.", {});
  c("x", "voiceless velar fricative", 7, 4, 0, "Air rubbing at the soft palate: the German ach-Laut.", {
    de: ["Ba{ch}||brook", "Bu{ch}||book", "a{ch}||oh"], hi: ["{ख़}बर|khabar|news|nuqta letter ख़ (loans)"], en: ["lo{ch}|||Scots"], mr: [], fr: [], ko: [], ja: [] },
    "German ch after a, o, u and au. A soft velar rub, with no scrape.");
  c("ɣ", "voiced velar fricative", 7, 4, 1, "Voiced [x]. Hindi ग़ in Urdu loans.", { hi: ["{ग़}लत|ghalat|wrong|nuqta letter ग़ (loans); often [ɡ]"], mr: [], en: [], de: [], fr: [], ko: [], ja: [] });
  c("χ", "voiceless uvular fricative", 8, 4, 0, "Air at the uvula. German ch after a, o, u in some regional speech. Not a phoneme here.", {});
  c("ʁ", "voiced uvular fricative / approximant", 8, 4, 1, "Back of tongue near the uvula, voiced: the usual everyday r of French and German.", {
    de: ["{R}ose||rose", "ge{r}ne||gladly|variant after vowels: [ɐ]~[ʁ]"], fr: ["{r}ouge||red", "Pa{r}is||Paris", "ma{r}||sea"], en: [], hi: [], mr: [], ko: [], ja: [] },
    "A gentle vibration at the back of the throat. For classical German and French the tongue-tip [r] is often used instead (see the trill).");
  c("ħ", "voiceless pharyngeal fricative", 9, 4, 0, "Arabic ح. Not a phoneme here.", {});
  c("ʕ", "voiced pharyngeal fricative", 9, 4, 1, "Arabic ع. Not a phoneme here.", {});
  c("h", "voiceless glottal fricative", 10, 4, 0, "Breathy air through the open glottis.", {
    en: ["{h}at"], hi: ["{ह}ाथ|hāth|hand"], mr: ["{ह}ात|hāt|hand"], de: ["{H}aus||house"], ko: ["{하}나|hana|one"], ja: ["{は}る|haru|spring"], fr: [] });
  c("ɦ", "voiced glottal fricative", 10, 4, 1, "Breathy-voiced h. Hindi/Marathi ह between vowels.", {
    hi: ["ब{ह}ुत|bahut|very|ह between vowels"], mr: ["स{ह}ा|sahā|six|ह between vowels"], en: [], de: [], fr: [], ko: [], ja: [] });

  c("ʋ", "labiodental approximant", 1, 6, 1, "Lips near teeth, no friction. Hindi/Marathi व.", { hi: ["{व}ह|vah|that"], mr: ["{व}ाट|vāṭ|path"], en: [], de: [], fr: [], ko: [], ja: [] });
  c("ɹ", "alveolar approximant", 3, 6, 1, "The English r: tongue tip raised or bunched, no tap or trill.", { en: ["{r}ed|||GA bunched/retroflex; RP [ɹ]"], hi: [], mr: [], de: [], fr: [], ko: [], ja: [] },
    "Classical English diction traditions differ on r: some use a flipped [ɾ] between vowels and drop r after vowels; check the style you sing.");
  c("ɻ", "retroflex approximant", 5, 6, 1, "Tongue tip curled back; the 'American' r in some speakers. Not a separate phoneme.", {});
  c("j", "palatal approximant", 6, 6, 1, "The 'y' of 'yes': the middle of the tongue rises toward the palate.", {
    en: ["{y}es"], hi: ["{य}ाद|yād|memory"], mr: ["{य}ेणे|yeṇe|to come"], de: ["{J}a||yes"], fr: ["{y}eux||eyes", "pa{y}s||country"],
    ko: ["{야}구|yagu|baseball"], ja: ["{や}ま|yama|mountain"] });
  c("ɰ", "velar approximant", 7, 6, 1, "Back of tongue raised toward the soft palate, lips unrounded.", {
    ko: ["{의}사|uisa|doctor|ㅢ [ɰi]"], ja: ["{わ}たし|watashi|I|わ is [ɰ̟ᵝa]~[wa]"], en: [], hi: [], mr: [], de: [], fr: [] });
  c("l", "alveolar lateral approximant", 3, 7, 1, "Tongue tip on the ridge, air out along the sides.", {
    en: ["{l}ight|||clear l"], hi: ["{ल}ाल|lāl|red"], mr: ["{ल}ाल|lāl|red"], de: ["{L}ied||song"], fr: ["{l}ac||lake"], ko: ["{달}|dal|moon|final ㄹ"], ja: [] });
  c("ɭ", "retroflex lateral approximant", 5, 7, 1, "Retroflex 'l'. Marathi ळ.", { mr: ["शा{ळ}ा|śāḷā|school"], en: [], hi: [], de: [], fr: [], ko: [], ja: [] });
  c("ʎ", "palatal lateral approximant", 6, 7, 1, "Italian gl, Spanish ll. Not a phoneme here.", {});
  c("ʟ", "velar lateral approximant", 7, 7, 1, "Not a phoneme here.", {});

  /* ------------------------------------------- affricates and other symbols */
  o("a", "t͡s", "voiceless alveolar affricate", "[t] released into [s] in one gesture.", {
    de: ["{Z}eit||time", "Kat{z}e||cat"], mr: ["{च}ार|cār|four|च before a, ā, u, o"], ja: ["{つ}き|tsuki|moon|つ is [tsɯ̟ᵝ]"], en: [], hi: [], fr: [], ko: [] });
  o("a", "d͡z", "voiced alveolar affricate", "[d] released into [z].", { mr: ["{ज}वळ|javaḷ|near|ज before a, ā, u, o"], ja: ["{ず}っと|zutto|always|at the start of a word, ず is [dz]"], en: [], hi: [], de: [], fr: [], ko: [] });
  o("a", "t͡ʃ", "voiceless post-alveolar affricate", "[t] released into [ʃ].", {
    en: ["{ch}ur{ch}"], hi: ["{च}ाय|chāy|tea"], mr: ["{चि}ंच|ciñc|tamarind|च before i, e"], de: ["Deu{tsch}||German", "{Tsch}üss||bye"], fr: [], ko: [], ja: [] });
  o("a", "d͡ʒ", "voiced post-alveolar affricate", "[d] released into [ʒ].", {
    en: ["{j}udge"], hi: ["{ज}ल|jal|water"], mr: ["{जी}व|jīv|life|ज before i, e"], de: ["{J}azz||jazz|loans"], fr: [], ko: [], ja: [] });
  o("a", "p͡f", "voiceless labiodental affricate", "[p] released into [f].", { de: ["{Pf}erd||horse", "Ko{pf}||head"], en: [], hi: [], mr: [], fr: [], ko: [], ja: [] });
  o("a", "t͡ɕ", "voiceless alveolo-palatal affricate", "[t] released into [ɕ]; the tongue is flat against the front palate. Korean ㅈ, Japanese ち.", {
    ko: ["{지}도|jido|map|lax ㅈ at the start of a word"], ja: ["{ち}ず|chizu|map|ち"], en: [], hi: [], mr: [], de: [], fr: [] });
  o("a", "d͡ʑ", "voiced alveolo-palatal affricate", "[d] released into [ʑ].", {
    ko: ["아{주}|aju|very|ㅈ between voiced sounds"], ja: ["{じ}かん|jikan|time|じ at the start of a word"], en: [], hi: [], mr: [], de: [], fr: [] });
  o("a", "ɕ", "voiceless alveolo-palatal fricative", "Like [ʃ] but with the tongue flat and fronted, lips not rounded.", {
    ja: ["{し}ろ|shiro|white"], ko: ["{시}간|sigan|time|ㅅ before ㅣ"], en: [], hi: [], mr: [], de: [], fr: [] });
  o("a", "ʑ", "voiced alveolo-palatal fricative", "Voiced [ɕ].", { ja: ["ふ{じ}|fuji|Fuji|じ between vowels"], en: [], hi: [], mr: [], de: [], fr: [], ko: [] });
  o("a", "w", "labial-velar approximant", "Lips rounded and tongue back raised, like a very short [u].", {
    en: ["{w}et"], fr: ["{ou}i||yes", "{oi}seau||bird"], ko: ["{와}|wa|wow|ㅘ [wa]"], hi: [], mr: [], de: [], ja: [] });
  o("a", "ɥ", "labial-palatal approximant", "A very short [y]: lips rounded, tongue forward.", { fr: ["n{u}it||night", "l{u}i||him"], en: [], hi: [], mr: [], de: [], ko: [], ja: [] });
  o("a", "ʍ", "voiceless labial-velar fricative", "Voiceless [w]; kept by some English speakers in 'which'.", { en: ["{wh}ich|||only for speakers who distinguish it from witch"], hi: [], mr: [], de: [], fr: [], ko: [], ja: [] });
  o("a", "ɫ", "velarised alveolar lateral approximant", "'Dark l': [l] with the back of the tongue pulled toward the soft palate.", { en: ["fu{ll}|||GA dark l", "mi{l}k|||"], hi: [], mr: [], de: [], fr: [], ko: [], ja: [] });

  /* --------------------------------- modified sounds: stop series and nasals */
  o("m", "pʰ", "aspirated voiceless bilabial plosive", "[p] followed by a puff of breath before the next vowel.", {
    en: ["{p}ie|||initial in a stressed syllable"], hi: ["{फ}ल|phal|fruit|फ"], mr: ["{फ}ळ|phaḷ|fruit|फ"], de: ["{P}ark||park"], ko: ["{파}|pa|green onion|ㅍ"], fr: [], ja: [] });
  o("m", "tʰ", "aspirated voiceless alveolar plosive", "[t] with a puff of breath.", { en: ["{t}ie"], de: ["{T}ür||door"], ko: ["{타}다|tada|to ride|ㅌ"], hi: [], mr: [], fr: [], ja: [] });
  o("m", "kʰ", "aspirated voiceless velar plosive", "[k] with a puff of breath.", {
    en: ["{k}ey"], hi: ["{ख}ाना|khānā|food|ख"], mr: ["{ख}ेळ|kheḷ|game|ख"], de: ["{K}ind||child"], ko: ["{카}페|kape|café|ㅋ"], fr: [], ja: [] });
  o("m", "t̪ʰ", "aspirated voiceless dental plosive", "Dental [t̪] with a puff of breath. Hindi/Marathi थ.", { hi: ["{थ}ाल|thāl|plate"], mr: ["{थ}ंड|thaṇḍ|cool"], en: [], de: [], fr: [], ko: [], ja: [] });
  o("m", "ʈʰ", "aspirated voiceless retroflex plosive", "Retroflex [ʈ] with a puff of breath. Hindi/Marathi ठ.", { hi: ["{ठ}ंड|ṭhaṇḍ|cold"], mr: ["{ठि}काण|ṭhikāṇ|place"], en: [], de: [], fr: [], ko: [], ja: [] });
  o("m", "t͡ʃʰ", "aspirated voiceless post-alveolar affricate", "[t͡ʃ] with a puff of breath. Hindi छ.", { hi: ["{छ}ाता|chātā|umbrella"], en: [], mr: [], de: [], fr: [], ko: [], ja: [] });
  o("m", "t͡sʰ", "aspirated voiceless alveolar affricate", "[t͡s] with a puff of breath. Marathi छ before a, ā, u, o.", { mr: ["{छ}त्री|chatrī|umbrella"], en: [], hi: [], de: [], fr: [], ko: [], ja: [] });
  o("m", "t͡ɕʰ", "aspirated voiceless alveolo-palatal affricate", "[t͡ɕ] with a puff of breath. Korean ㅊ.", { ko: ["{차}|cha|tea; car|ㅊ"], en: [], hi: [], mr: [], de: [], fr: [], ja: [] });
  o("m", "bʱ", "breathy-voiced bilabial plosive", "A voiced [b] whose release is murmured, with breathy voice through the next vowel: not [b] + [h]. Hindi/Marathi भ.", {
    hi: ["{भ}ाई|bhāī|brother"], mr: ["{भ}ाऊ|bhāū|brother"], en: [], de: [], fr: [], ko: [], ja: [] },
    "Keep the voice running through the release; a plain [b] then an audible [h] is the usual learner error.");
  o("m", "d̪ʱ", "breathy-voiced dental plosive", "Breathy [d̪]. Hindi/Marathi ध.", { hi: ["{ध}न|dhan|wealth"], mr: ["{ध}ागा|dhāgā|thread"], en: [], de: [], fr: [], ko: [], ja: [] });
  o("m", "ɖʱ", "breathy-voiced retroflex plosive", "Breathy [ɖ]. Hindi/Marathi ढ.", { hi: ["{ढ}ोल|ḍhol|drum"], mr: ["{ढ}ग|ḍhag|cloud"], en: [], de: [], fr: [], ko: [], ja: [] });
  o("m", "ɡʱ", "breathy-voiced velar plosive", "Breathy [ɡ]. Hindi/Marathi घ.", { hi: ["{घ}र|ghar|house"], mr: ["{घ}र|ghar|house"], en: [], de: [], fr: [], ko: [], ja: [] });
  o("m", "d͡ʒʱ", "breathy-voiced post-alveolar affricate", "Breathy [d͡ʒ]. Hindi झ.", { hi: ["{झ}ील|jhīl|lake"], en: [], mr: [], de: [], fr: [], ko: [], ja: [] });
  o("m", "d͡zʱ", "breathy-voiced alveolar affricate", "Breathy [d͡z]. Marathi झ before a, ā, u, o.", { mr: ["{झ}ाड|jhāḍ|tree"], en: [], hi: [], de: [], fr: [], ko: [], ja: [] });
  o("m", "p͈", "tense bilabial plosive", "Korean tense (fortis) ㅃ: voiceless, no aspiration, with tension in the larynx and a short, sharp release. The following vowel starts higher in pitch.", {
    ko: ["{빠}르다|ppareuda|to be fast|ㅃ"], en: [], hi: [], mr: [], de: [], fr: [], ja: [] }, "Closer to a tight, unaspirated French [p] than to English [pʰ]. Nothing like a glottalised or ejective stop.");
  o("m", "t͈", "tense alveolar plosive", "Korean tense ㄸ.", { ko: ["{딸}|ttal|daughter|ㄸ"], en: [], hi: [], mr: [], de: [], fr: [], ja: [] });
  o("m", "k͈", "tense velar plosive", "Korean tense ㄲ.", { ko: ["{까}치|kkachi|magpie|ㄲ"], en: [], hi: [], mr: [], de: [], fr: [], ja: [] });
  o("m", "t͡ɕ͈", "tense alveolo-palatal affricate", "Korean tense ㅉ. Often written t͡ɕ͈.", { ko: ["{짜}다|jjada|to be salty|ㅉ"], en: [], hi: [], mr: [], de: [], fr: [], ja: [] });
  o("m", "s͈", "tense alveolar fricative", "Korean tense ㅆ: a longer, tenser [s].", { ko: ["{싸}다|ssada|to be cheap|ㅆ"], en: [], hi: [], mr: [], de: [], fr: [], ja: [] });
  o("m", "ã", "nasalised open front vowel", "[a] with the soft palate lowered so air also flows through the nose. Hindi/Marathi chandrabindu and anusvara.", { hi: ["{हाँ}|hā̃|yes", "म{ाँ}|mā̃|mother"], mr: ["{सां}ग|sā̃g|tell|anusvara"], en: [], de: [], fr: [], ko: [], ja: [] });
  o("m", "ɑ̃", "nasalised open back vowel", "French an, en, am, em: no [n] or [m] is heard after it.", { fr: ["{en}fant||child", "d{an}s||in", "v{en}t||wind"], en: [], hi: [], mr: [], de: [], ko: [], ja: [] },
    "Lower the soft palate without closing the tongue against the ridge: if [n] is audible you have gone too far.");
  o("m", "ɛ̃", "nasalised open-mid front vowel", "French in, ain, ein.", { fr: ["v{in}||wine", "p{ain}||bread", "s{ym}bole||symbol"], hi: ["{हैं}|hɛ̃|are"], en: [], mr: [], de: [], ko: [], ja: [] });
  o("m", "ɔ̃", "nasalised open-mid back vowel", "French on, om.", { fr: ["b{on}||good", "m{on}||my"], en: [], hi: [], mr: [], de: [], ko: [], ja: [] });
  o("m", "œ̃", "nasalised open-mid front rounded vowel", "French un, um; for many speakers it has merged with [ɛ̃].", { fr: ["br{un}||brown", "l{un}di||Monday"], en: [], hi: [], mr: [], de: [], ko: [], ja: [] });
  o("m", "ĩ", "nasalised close front vowel", "[i] with the nasal passage open. Hindi/Marathi.", { hi: ["नह{ीं}|nahī̃|no"], en: [], de: [], fr: [], ko: [], ja: [] });

  /* ---------------------------------------------------- diacritics and marks */
  o("d", "ː", "length mark", "Placed after a vowel or consonant: it is held about twice as long. In Hindi, Marathi, German and Japanese length is a significant, not decorative, feature.", {
    en: ["s{ee}|||RP [iː]; in GA the length is a by-product of stress"], hi: ["{आ}म|ām|mango|[aː]"], mr: ["{आ}ई|āī|mother|[aː]"],
    de: ["B{ah}n||railway|[baːn]; compare Ba{nn} [ban]"], ja: ["お{じい}さん|ojīsan|grandfather|[oʑiːsaɴ]; compare おじさん ojisan 'uncle'", "き{っ}て|kitte|stamp|a doubled consonant is a long [tː]"], fr: [], ko: [] },
    "In sung text the note's length is not the phoneme's length: in German, a short vowel followed by two consonants keeps its short quality even on a long note.");
  o("d", "◌̃", "nasalisation", "A tilde over the vowel: the soft palate lowers so air flows through the nose as well as the mouth. French nasal vowels are written with it (see ɑ̃, ɛ̃, ɔ̃, œ̃); Hindi and Marathi have it too.", {
    fr: ["b{on}||good|[bɔ̃]"], hi: ["{हाँ}|hā̃|yes"], mr: ["{सां}ग|sā̃g|tell"], en: ["s{ing}ing|||nasalised in connected speech, not a contrast"], de: [], ko: [], ja: [] });
  o("d", "ʰ", "aspirated", "A raised h: a puff of breath after a stop, before the vowel. See the stop series.", {
    en: ["{p}in|||initial stressed pʰ"], hi: ["{ख}ाना|khānā|food"], mr: ["{ख}ेळ|kheḷ|game"], de: ["{P}ark||park"], ko: ["{카}페|kape|café"], fr: [], ja: [] });
  o("d", "ʱ", "breathy voice", "A raised h with hook: the voice stays on, but the glottis is slightly open, giving murmur. The fourth Hindi/Marathi stop series.", {
    hi: ["{भ}ाई|bhāī|brother"], mr: ["{भ}ाऊ|bhāū|brother"], en: [], de: [], fr: [], ko: [], ja: [] });
  o("d", "◌̪", "dental", "A bridge below: the contact is on the teeth. See [t̪] and [d̪].", { hi: ["{त}ुम|tum|you"], mr: ["{द}ार|dār|door"], fr: ["{t}ante||aunt"], en: [], de: [], ko: [], ja: [] });
  o("d", "◌̟", "advanced", "A plus sign below: articulated further forward than the plain symbol. Japanese う is [ɯ̟].", { ja: ["{う}み|umi|sea|[ɯ̟ᵝ]"], en: [], hi: [], mr: [], de: [], fr: [], ko: [] });
  o("d", "ᵝ", "compressed lips", "A superscript beta: lips pulled toward each other (compressed), not pushed forward (rounded). Japanese う [ɯ̟ᵝ].", { ja: ["{う}み|umi|sea"], en: [], hi: [], mr: [], de: [], fr: [], ko: [] });
  o("d", "◌̚", "unreleased", "The stop closes but there is no audible release. Korean final stops are always unreleased.", {
    ko: ["{밥}|bap|rice|[pap̚]", "{부}엌|bueok|kitchen|[puʌk̚]"], en: ["ca{p}|||GA, often unreleased before a pause"], hi: [], mr: [], de: [], fr: [], ja: [] });
  o("d", "◌̥", "voiceless", "A ring below: a normally voiced sound spoken voiceless. Japanese i and u between voiceless consonants are often devoiced.", {
    ja: ["{す}き|suki|like|[sɯ̥ki]", "{で}す|desu|is|[desɯ̥]"], en: ["{pl}ease|||[pl̥iz]"], de: [], fr: [], hi: [], mr: [], ko: [] });
  o("d", "◌̩", "syllabic", "A short vertical bar below: a consonant that forms a syllable on its own.", {
    en: ["bott{le}|||[ˈbɒtl̩]", "butt{on}|||[ˈbʌʔn̩]"], de: ["Ha{ben}||to have|[haːbn̩] (or [haːbm̩])"], hi: [], mr: [], fr: [], ko: [], ja: [] });
  o("d", "◌̯", "non-syllabic", "A breve below a vowel symbol: it is the glide of a diphthong, not a separate syllable.", {
    en: ["h{i}|||[haɪ̯]"], de: ["{Ei}s||ice|[aɪ̯s]", "N{eu}||new|[nɔʏ̯]"], fr: [], hi: [], mr: [], ko: [], ja: [] },
    "In singing, hold the first element of the diphthong and place the glide at the end of the note.");
  o("d", "͡", "tie bar", "A tie above or below two symbols marks them as one sound: an affricate (t͡ʃ) or a diphthong.", { de: ["{Z}eit||time|[t͡saɪt]"], en: ["{ch}ur{ch}|||[t͡ʃɜːt͡ʃ]"], hi: [], mr: [], fr: [], ko: [], ja: [] });
  o("d", "ˈ", "primary stress", "Placed before the stressed syllable.", { en: ["ˈ{wa}ter|||[ˈwɔːtə]"], de: [], hi: [], mr: [], fr: [], ko: [], ja: [] });
  o("d", "ˌ", "secondary stress", "Placed before a syllable with secondary stress.", { en: [], de: [], hi: [], mr: [], fr: [], ko: [], ja: [] });
  o("d", ".", "syllable break", "A full stop marks a syllable boundary. Useful in singing, where syllables fall on notes.", {});
  o("d", "‿", "linking", "A tie below: sounds run together across a word boundary. French liaison and enchaînement are written with it.", { fr: ["le{s a}mis||the friends|[le‿z‿ami] (liaison)", "il {a}ime||he loves|[i‿lɛm] (enchaînement)"], en: [], hi: [], mr: [], de: [], ko: [], ja: [] });

  // The two series tables (Stop series section): rows of symbol ids by language, kept here so the test can check each id exists.
  var SERIES = [
    { id: "hi-mr", title: "Hindi and Marathi: four-way stops", note: "Voiceless, voiceless aspirated, voiced, breathy-voiced; at five places (dental, retroflex, and either palatal affricate or, in Marathi, ts / dz before back vowels).",
      cols: ["voiceless", "aspirated", "voiced", "breathy"],
      rows: [["Labial", "p", "pʰ", "b", "bʱ"], ["Dental", "t̪", "t̪ʰ", "d̪", "d̪ʱ"], ["Retroflex", "ʈ", "ʈʰ", "ɖ", "ɖʱ"],
             ["Palatal (Hindi)", "t͡ʃ", "t͡ʃʰ", "d͡ʒ", "d͡ʒʱ"], ["Palatal (Marathi, before a, ā, u, o)", "t͡s", "t͡sʰ", "d͡z", "d͡zʱ"], ["Velar", "k", "kʰ", "ɡ", "ɡʱ"]] },
    { id: "ko", title: "Korean: three-way stops", note: "Lax (lenis), tense (fortis) and aspirated. The lax series is voiceless at the start of a word and voiced between vowels.",
      cols: ["lax", "tense", "aspirated"],
      rows: [["Labial", "p", "p͈", "pʰ"], ["Alveolar", "t", "t͈", "tʰ"], ["Palatal", "t͡ɕ", "t͡ɕ͈", "t͡ɕʰ"], ["Velar", "k", "k͈", "kʰ"], ["Fricative", "s", "s͈", ""]] },
    { id: "others", title: "English, German, French and Japanese: two-way stops", note: "English and German: voiceless stops aspirated at the start of a stressed syllable, voiced stops with variable voicing. French: voiceless unaspirated against fully voiced. Japanese: plain voiceless against voiced.",
      cols: ["voiceless", "voiced"],
      rows: [["Labial", "p", "b"], ["Alveolar", "t", "d"], ["Velar", "k", "ɡ"]] }
  ];

  var api = { LANGS: LANGS, VROWS: VROWS, PLACES: PLACES, MANNERS: MANNERS, SYMBOLS: S, SERIES: SERIES };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.IPA_DATA = api;
})(typeof window !== "undefined" ? window : globalThis);
