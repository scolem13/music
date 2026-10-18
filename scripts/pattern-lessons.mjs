#!/usr/bin/env node
// pattern-lessons.mjs — writes one lesson page for every accompaniment pattern the Backing Track band knows (the bass
// lines, comping rhythms, drum grooves and conga parts of apps/shared/band/catalog.js) into lessons/patterns/, and
// the index page that lists them.
//
//   node scripts/pattern-lessons.mjs          # writes lessons/patterns/*.qmd
//   quarto render lessons/patterns
//
// Each page builds its pattern up a step at a time from simpler patterns in the same list (PLAN.<kind>.<id>.ladder),
// plays every step on the band (an .ar-demo of arrange-kit.js, which writes out what the band played), then the
// pattern up to tempo in its home style, with two chords in a bar, in 3/4 where it is played in 3/4, in the other
// styles it fits, and how it relates to the other patterns: the ones it builds on, the ones that build on it, the
// same rhythm in another instrument (SAME) and the parts it plays with in its style.
// The descriptions of the patterns are the catalog's own; what is written here is the order to learn them in and the tips.
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "lessons/patterns");
const ctx = { window: {}, console }; ctx.self = ctx.window; vm.createContext(ctx);
for (const f of ["comp.js", "catalog.js"]) vm.runInContext(fs.readFileSync(path.join(root, "apps/shared/band", f), "utf8"), ctx, { filename: f });
const C = ctx.window.BandCatalog;

const KINDS = {
  bass:   { list: C.bass,   opt: "bassFeel",   part: "bass",   noun: "Bass line",      who: "bass",      dir: "bass" },
  comp:   { list: C.comp,   opt: "compRhythm", part: "comp",   noun: "Comping rhythm", who: "piano or guitar", dir: "chords" },
  drums:  { list: C.drums,  opt: "groove",     part: "drums",  noun: "Drum groove",    who: "drum kit",  dir: "drums" },
  congas: { list: C.congas, opt: "congas",     part: "congas", noun: "Conga part",     who: "congas",    dir: "congas" }
};
const SKIP = { drums: ["none"], congas: ["none"] };

// a chart and tempo for each style, and a harder chart (two chords in some bars) in the same harmony
const STYLE = {
  swing: ["Dm7|G7|Cmaj7|A7|Dm7|G7|Cmaj7|Cmaj7", 120, "Dm7 G7|Em7 A7|Dm7 G7|Cmaj7"],
  ballad: ["Dm7|G7|Cmaj7|A7|Dm7|G7|Cmaj7|Cmaj7", 66, "Dm7 G7|Em7 A7|Dm7 G7|Cmaj7"],
  boogaloo: ["F7|F7|Bb7|F7", 112, "F7|Bb7 C7|F7|Gm7 C7"],
  stride: ["C|A7|D7|G7", 132, "C A7|Dm7 G7|C C7|F G7"],
  ragtime: ["C|C|G7|C", 92, "C G7|C F|C G7|C"],
  jump: ["C7|F7|C7|G7", 160, "C7|F7 F#dim7|C7|G7 F7"],
  boogie: ["C7|C7|F7|C7|G7|F7|C7|G7", 132, "C7|F7 F#dim7|C7|G7 F7"],
  bossa: ["Am7|D7|Gmaj7|Gmaj7", 120, "Am7 D7|Gmaj7 Em7|Am7 D7|Gmaj7"],
  montuno: ["C|F|G7|C", 100, "C F|G7 C|C F|G7 C"],
  chacha: ["Am|Dm|E7|Am", 112, "Am Dm|E7 Am|Dm E7|Am"],
  tango: ["Am|Am|E7|Am", 104, "Am Dm|E7 Am|Dm E7|Am"],
  calypso: ["C|F|G7|C", 110, "C F|G7 C|F G7|C"],
  reggae: ["C|F|G|C", 80, "C F|G C|Am F|G"],
  reggaeton: ["Am|F|C|G", 92, "Am F|C G|Am F|C G"],
  rock: ["C|Am|F|G", 112, "C G|Am F|C G|F G"],
  emo: ["C|G|Am|F", 150, "C G|Am F|C G|F G"],
  strum: ["C|G|Am|F", 96, "C G|Am F|C G|F G"],
  pop: ["C|Am|F|G", 72, "C G|Am F|Dm G|C"],
  dance: ["Am|F|C|G", 120, "Am F|C G|Am F|C G"],
  motown: ["C|Am|F|G", 112, "C Am|F G|C Am|F G"],
  doowop: ["C|Am|F|G", 66, "C Am|F G|C Am|F G"],
  train: ["G|G|C|D", 120, "G|C D|G C|D G"],
  folk: ["G|C|D|G", 104, "G C|D G|C D|G"],
  freylekhs: ["Dm|Dm|A7|Dm", 132, "Dm Gm|A7 Dm|Gm A7|Dm"],
  prine: ["G|C|D|G", 100, "G C|D G|C D|G"],
  waltz: ["C|F|G7|C", 150, "C|F G7|C F|G7 C"],
  hymn: ["C|F|G|C", 80, "C F|G C|Am F|G C"],
  carol: ["G|C|D|G", 96, "G C|D G|C D|G"]
};
const WALTZ = "C|C|F|F|G7|G7|C|C";

// The order to learn each pattern in: `ladder` = simpler patterns of the same list, simplest first, that lead to it;
// `style` = its home style when that is not the first one it fits; `on` = which instrument it is for (comping:
// "piano", "guitar" or "piano guitar"); `meter`, `chart`, `tempo` where the style's own will not do; `tips` = how to play it.
const PLAN = {
  bass: {
    held: { style: "hymn", tips: "Pluck once, then let the note ring right through the bar: the left hand keeps the string down until the chord changes. This is the whole job of the bass in a hymn: the lowest voice, held. Listen to how each new root moves the chord above it." },
    halves: { ladder: ["held"], style: "carol", tips: "Two notes a bar, both the root. Count 1-2-3-4 aloud and pluck on 1 and 3. Let each note last its full two beats; the gap before the next one should be tiny. When a bar has two chords, the second root simply arrives on beat 3." },
    roots: { ladder: ["held", "halves"], style: "rock", tips: "A root on every beat, every note the same length. Keep the plucking hand alternating (index, middle) and the fretting finger down for the whole bar. The test is evenness: record yourself and listen for one beat that is louder or later than the others." },
    alt: { ladder: ["halves"], style: "folk", tips: "Root on 1, fifth on 3, both short so the chords can be heard on 2 and 4. The fifth is one string up and two frets up from the root, or on the string below at the same fret: use whichever is closer to the next root." },
    eighths: { ladder: ["halves", "roots"], tips: "Eight even roots a bar, a little heavier on the beats. On bass, alternate two fingers or use downstrokes with a pick, and mute with the fretting hand between notes so they do not blur. Lock with the kick drum: the beats are where it lands." },
    dotted: { ladder: ["halves", "roots"], style: "strum", tips: "Say it: ONE (and) two AND three. The note on the and of 2 is the push that makes it pop music. Every second bar, the last eighth note walks into the next root from a step below or above." },
    octaves: { ladder: ["roots", "eighths"], tips: "Root on the beat, the same note an octave higher on the off-beat. The octave is two strings up and two frets up: the hand stays in one place and the plucking hand jumps strings. Keep both notes short and the off-beats as loud as the beats." },
    polka: { ladder: ["alt", "roots"], tips: "Root, fifth, root, fifth: a short note on every beat. Get it steady at a slow tempo first, then add the run: the last three eighths of a phrase's last bar step up the scale (5, 6, 7) into the next root." },
    tresillo: { ladder: ["halves", "dotted"], style: "dance", tips: "Count eight eighth notes and play on 1, 4 and 7: ONE two three FOUR five six SEVEN eight. That is beat 1, the and of 2 and beat 4. The first two notes are the root, the last the fifth. It is the dotted line with its third note moved later." },
    motown: { ladder: ["alt", "dotted"], tips: "A two-bar line. The first bar is the dotted rhythm with the fifth on beat 3, then octave and fifth in eighths. The second bar leads by step into the next chord. Play it lightly and short; a Motown bass part bounces." },
    twelve8: { ladder: ["halves", "two"], style: "doowop", tips: "Count the bar as four beats of three: ONE-and-a TWO-and-a. The long notes on 1 and 3 (root, then fifth) each have a short pickup on the last eighth before them. Let the long notes ring; keep the pickup light." },
    bossa: { ladder: ["halves", "alt"], tips: "Root on 1, fifth on 3, and each one set up by an eighth note just before it: the fifth on the and of 2, and on the and of 4 the root of the next bar's chord. The low notes sound like a heartbeat: long, short-long, short." },
    tango: { ladder: ["halves", "dotted"], tips: "The habanera: a long root (a beat and a half), the fifth on the and of 2, then the octave on 3 and the fifth on 4. Play it marked and a little heavy, with every note clearly separated." },
    tumbao: { ladder: ["alt", "bossa"], style: "montuno", tips: "Do not play on beat 1. The fifth lands on the and of 2; on beat 4 you play the root of the next bar's chord early and hold it across the barline. Count aloud and clap beat 1 while you play, so you feel where the chord changes even though you are ahead of it." },
    chacha: { ladder: ["halves", "alt"], tips: "Root held through 1 and 2, fifth on 3, root on 4: three notes that sit under the cha-cha-cha of the chords. Keep beat 3 and beat 4 short and even, like the dancers' feet." },
    two: { ladder: ["halves"], style: "swing", tips: "Half notes on 1 and 3, root then fifth, with a swung pickup into the next bar now and then. Let each note ring for its full two beats: the line breathes in two while the drummer plays in four." },
    arp: { ladder: ["halves", "roots"], style: "swing", tips: "Root, 3rd, 5th, 7th, one to a beat, the same shape every bar. On a minor seventh chord the 3rd is three frets above the root; on a dominant or major chord, four. Say the chord tones as you play them." },
    walk: { ladder: ["halves", "two", "arp"], tips: "Beat 1: the root. Beats 2 and 3: any two other chord tones or scale steps. Beat 4: a note one fret above or below the next bar's root. Start from the chord tones of the step before and change only beat 4, then free up beats 2 and 3." },
    boogie: { ladder: ["roots", "arp"], style: "boogie", tips: "Eight swung eighths a bar, up the chord and back down: root, 3rd, 5th, 6th, flat 7th, 6th, 5th, 3rd. Learn the shape on one chord until the hand knows it, then move it up a fourth for the IV chord and a fifth for the V. The shape stays the same; only the root changes. Lean on beats 1 and 3." },
    boogieOct: { ladder: ["roots", "octaves"], style: "boogie", tips: "Root low, octave high, in swung eighths: the low note on the beat, the high one on the and. Keep the hand loose and let it roll rather than hit. Each new chord starts on its low root." },
    yancey: { ladder: ["halves", "tango"], style: "boogie", tempo: 84, tips: "Clap it first: 1, the and of 1, the and of 2, 3, 4. Then play root on 1, fifth on the and, root on the and of 2, fifth on 3, root on 4. Play it slowly and lazily, like a slow blues; the notes between the beats give the lilt, so do not rush them." },
    riff: { ladder: ["halves", "dotted"], style: "boogaloo", tips: "A straight-eighths riff: root on 1, root again on the and of 2, then fifth and flat seventh on beat 4 climbing back to the root. The push on the and of 2 is the same one as the dotted line; the ending is new. Play every bar the same." },
    riffwalk: { ladder: ["riff", "arp", "walk"], style: "boogaloo", tips: "Riff most of the time; at the end of some four-bar phrases, walk one bar of quarter notes into the next phrase. The skill is the switch: feel where the phrase ends and land on the next root exactly on 1." },
    sowhat: { ladder: ["held", "two"], style: "swing", chart: "Dm7|Dm7|Dm7|Dm7|Ebm7|Ebm7|Dm7|Dm7", tempo: 132, tips: "The bass has the tune here. Root, then eighth notes up from the fifth (5, 6, 7, root, 9), back down through the seventh to the root. Then wait while the chords answer. Sing it before playing it." },
    killerjoe: { ladder: ["halves", "two"], style: "swing", chart: "C7|Bb7|C7|Bb7", tempo: 112, tips: "Two chords a whole step apart, two bars each. Hold the root for two beats, then two quarter notes climbing into the next root from below. The same shape takes you down from C7 to B♭7 and back up." },
    songfather: { ladder: ["halves", "dotted"], style: "bossa", chart: "Fm7|Fm7|Eb7|Eb7|Db7|C7|Fm7|Fm7", tempo: 120, tips: "Root for a beat and a half, fifth on the and of 2, octave on beat 3 held to the end of the bar. It is the dotted line with the octave on beat 3. Hold the octave its full length." },
    footprints: { ladder: ["alt", "arp"], style: "swing", meter: "3/4", chart: "Cm7|Cm7|Cm7|Cm7|Fm7|Fm7|Cm7|Cm7", tempo: 132, tips: "A two-bar figure in 3/4: root, fifth, octave in the first bar, then the third above the octave held for two beats and the fifth leading back down. Feel it as one long bar of six." },
    allblues: { ladder: ["held", "twelve8"], style: "swing", meter: "6/8", chart: "G7|G7|G7|G7|Gm7|Gm7|G7|G7", tempo: 60, tips: "6/8: two beats of three eighths. Each bar is a long note and two short ones: root, fifth, sixth, then seventh, sixth, fifth. Rock gently on the long notes." },
    chameleon: { ladder: ["held", "roots"], style: "boogaloo", chart: "Bbm7|Eb7|Bbm7|Eb7", tempo: 100, tips: "The root on beat 1, then two eighths on beat 4 climbing by half steps into the next root. Leave beats 2 and 3 empty: the silence is half the groove." },
    maiden: { ladder: ["halves", "dotted"], style: "bossa", chart: "Dsus|Dsus|Fsus|Fsus|Dsus|Dsus|Fsus|Fsus", tempo: 112, tips: "The bass plays the same rhythm as the chords: 1, the and of 2 and 4 in the first bar (the note on 4 held over the barline), then the and of 2 and 4. Play with the piano's left hand, not against it." },
    takefive: { ladder: ["held", "halves"], style: "swing", meter: "5/4", chart: "Ebm7|Bbm7|Ebm7|Bbm7", tempo: 168, tips: "Count 1-2-3, 4-5. Root on 1, fifth on the and of 2, root on 4 and 5. Say the count aloud until 5/4 stops feeling like 4/4 with a beat too many." }
  },
  comp: {
    pad: { style: "pop", tips: "One chord, struck once, held for the bar. On piano, play it and keep the keys down (or the pedal down) until the chord changes; on guitar, strum once and let it ring. Use it to learn the chords and the changes before any rhythm." },
    quarters: { ladder: ["pad"], style: "pop", tips: "The chord on every beat. On piano: right hand plays the chord on each beat, left hand plays the root as the chord arrives. On guitar: four even downstrokes. Keep every chord the same loudness." },
    strumQuarters: { ladder: ["pad"], style: "strum", on: "guitar", tips: "Four downstrokes a bar, from the wrist, the hand moving down on every beat. Let each strum ring into the next. This is the motion every other strum is built on: the hand keeps going down on the beat." },
    strumFolk: { ladder: ["strumQuarters"], style: "carol", on: "guitar", tips: "Down on 1 and 3, down-up on 2 and 4. Keep the arm moving in eighths: down on every beat, up between. On 1 and 3 the up misses the strings." },
    strumCamp: { ladder: ["strumQuarters", "strumFolk"], style: "strum", on: "guitar", tips: "Down, down-up, (miss) up, down-up. The hand never stops moving down-up in eighths; on beat 3 it moves down without touching the strings. Say it: 1, 2-and, and, 4-and." },
    strumEights: { ladder: ["strumQuarters", "strumFolk"], style: "rock", on: "guitar", tips: "Every eighth note: down on the beat, up on the and. Lean on 2 and 4 to go with the snare. Keep the up-strokes lighter and on the top strings." },
    strumPunk: { ladder: ["strumQuarters", "strumEights"], style: "emo", on: "guitar", tips: "Verse: palm-muted downstrokes on every eighth, the side of the picking hand resting on the strings by the bridge. Chorus: lift the hand and play open down-up eighths. The change between them is the arrangement." },
    strum332: { ladder: ["strumQuarters", "strumCamp"], style: "strum", on: "guitar", tips: "The same down-up motion, with the weight on beat 1, the and of 2 and beat 4 (3+3+2). Play the accented strums across all the strings and the others lightly on the top strings." },
    strum16: { ladder: ["strumEights", "strumCamp"], style: "strum", on: "guitar", tips: "The D, D-U, U-D-U strum twice as fast, twice a bar. The hand now moves down-up in sixteenths. Keep it small and from the wrist; start at half tempo." },
    prine: { ladder: ["strumQuarters", "oompah"], style: "prine", on: "guitar", tips: "The thumb plays every beat: root, an inner string, the alternate bass, the inner string. On 2 and 4 a finger pinches a treble string together with the thumb, and on the and after it plays the string below. Get the thumb going alone first; it must not stop when the fingers join." },
    travis: { ladder: ["prine"], style: "prine", on: "guitar", tips: "The same thumb on every beat. The fingers pinch with the thumb on beat 1, then play in between the thumb notes: the and of 2, the and of 3, the and of 4. Thumb and fingers alternate like two players." },
    oompah: { ladder: ["quarters"], style: "folk", tips: "Short chords on 2 and 4 where the bass leaves room (on 2 and 3 in a waltz). On piano: left hand plays the bass on 1 and 3, right hand the chord on 2 and 4. On guitar: pick the bass note, then strum the chord." },
    waltz: { ladder: ["pad", "oompah"], style: "waltz", meter: "3/4", chart: WALTZ, tips: "Root on 1, light short chords on 2 and 3, the third the lightest. It is felt in one: one big beat a bar. The four bars of a phrase lean, rest, lean a little, and grow into the next phrase." },
    hymn: { ladder: ["pad"], style: "hymn", on: "piano", tips: "Four parts: left hand plays the root; right hand plays three notes that move as little as possible to the next chord. Keep any note two chords share in the same finger, and move the others to the nearest note of the new chord." },
    ballRock: { ladder: ["quarters", "hymn"], style: "pop", on: "piano", tips: "Left hand: an octave on the root, held. Right hand in quarter notes: the whole chord on 1, the thumb on 2, the top two notes on 3, the thumb on 4. The right hand rocks between the thumb and the top." },
    ballBroken: { ladder: ["ballRock", "arp"], style: "pop", on: "piano", tips: "Two bars. Bar one: three notes up the chord (thumb, middle, top), then the whole chord held from beat 3. Bar two: the chord held from 1, then the three notes on 3 and 4. Over held left-hand octaves." },
    ballSync: { ladder: ["quarters", "tresillo"], style: "pop", on: "piano", tips: "Three sounds a bar grouped 3+3+2: the chord on 1, its top two notes on the and of 2 and on 4. Hold each one until the next. The left hand stays on the root octave." },
    arp2: { ladder: ["pad"], style: "pop", tips: "Eighth notes rocking between the lowest and the highest note of the chord. On piano, thumb and little finger, the hand still; on guitar, the thumb on the bass string and a finger on the top string." },
    arp: { ladder: ["pad", "arp2"], style: "pop", tips: "The notes of the chord one at a time in eighths, up and back down, each left to ring. Piano: one hand position per chord, using the pedal. Guitar: hold the whole chord shape and pick string by string." },
    alberti: { ladder: ["hymn", "arp2"], style: "pop", on: "piano", tips: "Lowest, highest, middle, highest, in even eighths. Keep the chord under the hand and let the fingers do the work: 5-1-3-1 in the left hand, or 1-5-3-5 in the right. Quiet and even, the way Mozart wrote it." },
    stride: { ladder: ["oompah"], style: "stride", on: "piano", tips: "The left hand alone first: a low octave on the root on beat 1, a chord about two octaves higher on beat 2, the fifth down low on beat 3, the chord again on 4. Look at where the hand lands, not where it has been: the leap down is the hard one. Keep the bass notes short and the chords lighter. When it is steady, let the band's bass and drums join." },
    strideTenths: { ladder: ["oompah", "stride"], style: "stride", on: "piano", tips: "The stride left hand, stretched: on beat 1 the root with the 3rd an octave above it, both at once (roll them if your hand will not reach). On beat 3 the fifth, or, before a chord change, a tenth a step away from the next root, so the bass walks into it. Learn the leaps first with single notes, then add the top of each tenth." },
    boogie: { ladder: ["upbeats", "charleston"], style: "boogie", on: "piano", tips: "Short chords against the walking bass, a two-bar riff: 1, the and of 1, the and of 2 held; then the and of 1, 2, the and of 3 held. Keep the right hand light and swung, and play the same riff on every chord of the blues: it does not need to change, the bass does the moving." },
    triplets: { ladder: ["quarters"], style: "doowop", on: "piano", tips: "The chord on all three eighths of every beat: 1-and-a, 2-and-a. Right hand, light repeated chords from the wrist; left hand, the root on 1 and 3. Lean slightly on each beat." },
    eighths: { ladder: ["quarters"], style: "rock", tips: "The chord on every eighth note, beats a little louder. On piano, the right hand bounces from the wrist; on guitar, all downstrokes. Keep it tight with the hi-hat." },
    upbeats: { ladder: ["quarters", "oompah"], style: "reggae", tips: "Never on the beat: a short chord on every and. Count 1-AND-2-AND aloud, tap the beat with your foot and play only with the and. On guitar it is a chop, the chord choked right after it sounds." },
    tresillo: { ladder: ["quarters", "ballSync"], style: "dance", tips: "Three held chords grouped 3+3+2: beat 1, the and of 2, beat 4. Count eight eighths and play on 1, 4 and 7. Hold each chord until the next." },
    clave32: { ladder: ["tresillo"], style: "rock", tips: "Two bars: the tresillo (1, the and of 2, 4) in the first, then 2 and 3 in the second. That is the 3-2 son clave. Clap it before you play it." },
    barbara: { ladder: ["quarters", "clave32"], style: "motown", tips: "Two bars: 1, 2, 3 and the and of 4; then the and of 1, the and of 2 and 3. The chord on the and of 4 is the push into the second bar. Say it to the words of Barbara Ann." },
    g333322: { ladder: ["tresillo", "clave32"], style: "rock", tips: "Sixteen eighths over two bars grouped 3+3+3+3+2+2. Count the groups, not the beats: one-two-three, one-two-three, ... one-two, one-two. Play a chord on the first of each group." },
    g33433: { ladder: ["tresillo", "g333322"], style: "dance", tips: "Sixteen eighths over two bars grouped 3+3+4+3+3. As before, count the groups and play on the first of each; the 4 in the middle is the turnaround of the pattern." },
    g3x8: { ladder: ["tresillo", "strum16"], style: "dance", tempo: 96, tips: "Sixteenths in groups of three for a bar and a half, then four groups of two. The accents slide across the beat. Count sixteenths slowly, accent every third, and let the twos square it up." },
    charleston: { ladder: ["pad", "quarters"], style: "swing", tips: "A held chord on 1 and a short one on the and of 2 (swung). Say it: ONE ... and. On piano, a rootless voicing in the left hand; on guitar, a three-note shape with the second chord choked." },
    reverse: { ladder: ["pad", "charleston"], style: "swing", tips: "The Charleston moved over: a short chord on the and of 1, a held one on 3. It sounds lazier and leaves beat 1 to the bass." },
    offbeats: { ladder: ["charleston", "reverse"], style: "swing", tips: "Chords on the and of 1 and the and of 3, never on a downbeat. Keep them short and light; they float on top of the walking bass." },
    garland: { ladder: ["charleston", "offbeats"], style: "swing", tips: "Chords on the and of 2 and the and of 4; the second one is the next bar's chord, early, held across the barline. The anticipation pulls the band forward." },
    four: { ladder: ["pad", "quarters"], style: "swing", on: "guitar", tips: "A short chord on every beat, 2 and 4 a little louder, the way Freddie Green played. On guitar use three-note shapes on the middle strings and release the pressure right after each strum." },
    auto: { ladder: ["charleston", "reverse", "garland"], style: "swing", tips: "Real comping mixes the figures you have learned: two-bar phrases, some bars left empty. Choose one figure per bar and vary it; leave space for the soloist." },
    stabs: { ladder: ["pad", "charleston"], style: "boogaloo", tips: "A stab on 1, the chord pushed and held on the and of 2, and sometimes an answer late in the bar. It locks with the boogaloo bass riff, which pushes on the same and of 2." },
    sowhat: { ladder: ["pad", "offbeats"], style: "swing", chart: "Dm7|Dm7|Dm7|Dm7|Ebm7|Ebm7|Dm7|Dm7", tempo: 132, tips: "Two bars: nothing in the first while the bass plays the call; in the second, a chord a whole step above held from 3, then the chord itself, short, on the and of 4. 'So what.'" },
    maiden: { ladder: ["pad", "tresillo"], style: "bossa", chart: "Dsus|Dsus|Fsus|Fsus|Dsus|Dsus|Fsus|Fsus", tempo: 112, tips: "Two bars of held chords: 1, the and of 2 and 4 (held over the barline), then the and of 2 and 4. The bass plays the same rhythm: play together." },
    takefive: { ladder: ["pad", "charleston"], style: "swing", meter: "5/4", chart: "Ebm7|Bbm7|Ebm7|Bbm7", tempo: 168, tips: "5/4 grouped 3+2: held chord on 1, short on the and of 2, short chords on 4 and 5. It is the Charleston with two more beats." },
    bossa: { ladder: ["pad", "charleston"], style: "bossa", tips: "Two bars: beat 1, the and of 2 held, beat 3; then beat 2 and the and of 3. On guitar the thumb plays the bass on 1 and 3 while the fingers play this rhythm." },
    tango: { ladder: ["quarters"], style: "tango", tips: "A held chord on 1, then short marked ones on the and of 2, on 3 and on 4. Play it with weight and clear separation." },
    montuno: { ladder: ["quarters", "upbeats"], style: "montuno", tips: "Two bars of short chords: 1, 2, the and of 2, the and of 3, the and of 4; then every off-beat. Keep it dry and even. The second bar is the off-beat chop you learned in the step before." },
    chacha: { ladder: ["quarters", "oompah"], style: "chacha", tips: "A chord on 2, then cha-cha-cha: 3, the and of 3, 4. Keep the three short and even." }
  },
  drums: {
    quarters: { style: "swing", tips: "Right hand on the ride cymbal on every beat; left foot closes the hi-hat on 2 and 4. Nothing else. This is the pulse every jazz drummer plays on top of." },
    ridetime: { ladder: ["quarters"], style: "swing", tips: "Ding, ding-a, ding, ding-a: the ride on every beat, with a swung skip note before 3 and before 1. The hi-hat foot stays on 2 and 4." },
    hhswing: { ladder: ["quarters", "ridetime"], style: "swing", tips: "The ride pattern played on the hi-hat: open on 1 and 3, closed on 2 and 4 with the skip note. The foot closes the cymbals on 2 and 4." },
    auto: { ladder: ["quarters", "ridetime"], style: "swing", tips: "The ride pattern with a feathered kick on every beat (felt more than heard) and a few snare comments. Add one limb at a time to the ride pattern." },
    shuffle: { ladder: ["ridetime", "hhquarters"], style: "swing", tempo: 96, tips: "Swung eighths on the cymbal all the way through, kick on 1 and 3, a full snare on 2 and 4. The Chicago blues beat: heavier than jazz time." },
    hhquarters: { style: "rock", tempo: 88, tips: "Right hand on the closed hi-hat on every beat; kick on 1 and 3; left hand on the snare on 2 and 4. The first rock beat. Count aloud." },
    hheighths: { ladder: ["hhquarters"], style: "rock", tips: "The hi-hat now on every eighth, all one weight. Kick and snare stay where they were. Keep the hand going while the kick and snare join it." },
    hhaccents: { ladder: ["hheighths"], style: "rock", tips: "The same beat, with the hi-hat louder on the beat (shoulder of the stick) and soft on the and (tip). The accents make it swing forward." },
    hhoffbeats: { ladder: ["hheighths"], style: "rock", tips: "The hi-hat only on the ands, the kick on every beat, the snare on 2 and 4. The hand fills in between the foot." },
    hhopen: { ladder: ["hheighths"], style: "rock", tips: "Eighths on the closed hi-hat, with the and of 4 open: lift the foot just before it, close it again on 1 with the foot and stick together." },
    hhdance: { ladder: ["hheighths", "hhoffbeats"], style: "dance", tips: "Four on the floor: kick every beat, snare on 2 and 4, a closed hat on each beat and an open one on every and. The foot opens and closes in eighths." },
    hhfoot4: { ladder: ["hheighths"], style: "rock", tips: "Eighths on the ride, the hi-hat closed by the foot on all four beats, kick on 1 and 3, snare on 2 and 4. Four limbs, each with its own job." },
    hhsix: { ladder: ["hheighths", "hhaccents"], style: "rock", tempo: 84, tips: "Sixteenths on the closed hi-hat with one hand, beats a little stronger. Start slowly: the hand moves twice as fast as before." },
    hhsix2: { ladder: ["hheighths", "hhsix"], style: "rock", tempo: 84, tips: "Sixteenths with both hands, right-left-right-left; on 2 and 4 the right hand leaves the hat for the snare, so the hat is silent there." },
    rock: { ladder: ["hhquarters", "hheighths"], style: "rock", tips: "Eighths on the hat, full snare on 2 and 4, and a kick that changes over four bars: 1, 3 and the and of 3; then 1, the and of 2 and 3; the last bar adds a pickup on the and of 4." },
    strum: { ladder: ["hheighths"], style: "strum", tips: "A lighter backbeat: kick on 1, the and of 2 and 3 (with the dotted bass line), snare on 2 and 4. Fills are a snare note or two." },
    halftime: { ladder: ["hheighths", "rock"], style: "rock", tips: "The backbeat at half speed: kick on 1 and the and of 2, a single snare on beat 3. The chords go as fast, the song feels slower." },
    ballad: { ladder: ["hheighths", "strum"], style: "pop", tips: "Quiet eighths on the cymbal, cross-stick on 2 and 4 (the stick laid across the snare, tapping the rim), soft kick on 1, the and of 2 and 3. Play with half the force of a rock beat." },
    dance: { ladder: ["hhquarters", "hhdance"], style: "dance", tips: "Kick on every beat, snare and clap on 2 and 4, open hi-hat on every off-beat. The kick must not waver." },
    motown: { ladder: ["hheighths"], style: "motown", tips: "The snare on all four beats, louder on 2 and 4, over eighths on the cymbal. Light on 1 and 3, so the tambourine backbeat stands out." },
    funk: { ladder: ["hheighths", "rock"], style: "boogaloo", tips: "Snare on 2 and 4, eighths on the cymbal, and a syncopated kick: 1, the and of 2, the and of 3. Practise the kick against the hat alone first." },
    boomchick: { ladder: ["hhquarters"], style: "folk", tips: "Kick with the bass on 1 and 3, a soft snare with the chords on 2 and 4. In 3/4: kick on 1, snare on 2 and 3. Play it under the boom-chick of the guitar." },
    train: { ladder: ["boomchick"], style: "train", tips: "The snare on every eighth, leaning on 2 and 4, over a kick on 1 and 3. Alternate the hands and keep the unaccented notes soft. Folsom Prison Blues." },
    waltz: { ladder: ["boomchick"], style: "waltz", meter: "3/4", chart: WALTZ, tips: "Kick on 1, brushed snare on 2 and 3, felt in one. Lean on the first and third bars of each four-bar phrase." },
    brushes: { ladder: ["hheighths"], style: "carol", tips: "Very quiet hat eighths, soft kick on 1 and 3, light cross-stick on 2 and 4. No fills. Stay under the singer." },
    brushswing: { ladder: ["ridetime"], style: "swing", tips: "Left hand: a circle on the snare head, a swish on every beat, a little more on 2 and 4. Right hand: the ride pattern in taps. The foot closes the hat on 2 and 4. Keep the circle going even when the taps rest." },
    brushballad: { ladder: ["quarters"], style: "ballad", tips: "One slow circle across the snare head to the bar, a long sweep landing on 1 and again on 3, a light tap on 2 and 4. Let the sound hang; do not press the wires." },
    brushfolk: { ladder: ["brushes"], style: "folk", tips: "A swish on every beat with the weight on 2 and 4, light taps between, a soft kick on 1 and 3. It stays under the singer like Light time, with a backbeat you can hear." },
    twelve8: { ladder: ["hhquarters", "shuffle"], style: "doowop", tips: "Three eighths to every beat on the cymbal, kick on 1 and 3, snare on 2 and 4. Count 1-and-a 2-and-a." },
    bossa: { ladder: ["hheighths"], style: "bossa", tips: "Eighths on the cymbal; kick on 1 and 3 with a pickup before each; the two-bar bossa clave on the cross-stick. Learn hands and feet apart, then together." },
    clave: { ladder: ["hhquarters"], style: "montuno", tips: "The 2-3 son clave on the cross-stick over two bars (2 and 3, then 1, the and of 2, 4), a bell pattern on the cymbal, a light kick. Clap the clave first." },
    clave32: { ladder: ["clave"], style: "montuno", tips: "The same groove with its bars the other way round: three cross-stick notes in the first bar, two in the second. The tune decides which way round the clave goes." },
    bodiddley: { ladder: ["hhquarters", "clave32"], style: "rock", tips: "The 3-2 clave on the toms over a steady kick: 1, the and of 2, 4, then 2 and 3. The Bo Diddley beat." },
    dembow: { ladder: ["hhquarters", "dance"], style: "reggaeton", tips: "Kick on every beat; snare on the sixteenth before 2 and 4 and on the and of 2 and 4: 3+3+2 in sixteenths, twice a bar. Learn the snare against the kick slowly." },
    chacha: { ladder: ["hhquarters"], style: "chacha", tips: "The cymbal on every beat like the cha-cha bell, cross-stick on 2, two tom notes on 4 and the and of 4: the cha-cha-cha." },
    tango: { ladder: ["hhquarters"], style: "tango", tips: "Quarter notes on the cymbal over a light habanera on the kick. Stay out of the way: tango bands rarely have a drum kit." },
    calypso: { ladder: ["hheighths"], style: "calypso", tips: "Kick on 1 and 3, cross-stick on the and of 2 and on 4, cymbal eighths leaning on the off-beats." },
    jump: { ladder: ["shuffle"], style: "jump", tips: "The blues shuffle, harder: swung eighths on the cymbal, the snare hit hard on 2 and 4, and the kick played softly on all four beats (feathered: felt more than heard). Get the shuffle steady, then add the kick on 2 and 4 under the snare, quietly." },
    onedrop: { ladder: ["hheighths", "halftime"], style: "reggae", tips: "Nothing on beat 1. Kick and cross-stick together on beat 3, cymbal eighths leaning on the off-beats. The silence on 1 is the style." }
  },
  congas: {
    opens: { style: "chacha", tips: "Only the two right-hand open tones on 4 and the and of 4. Strike near the edge with the fingers flat and let the drum ring." },
    slapopen: { ladder: ["opens"], style: "chacha", tips: "The right hand alone: a slap on 2 (cupped fingers, sharp, near the edge), then the two open tones on 4 and the and of 4." },
    heeltoe: { ladder: ["opens", "slapopen"], style: "chacha", tips: "The left hand alone: heel on 1, toe on the and of 1, toe on the and of 2, heel on 3, toe on the and of 3. Rock the hand on the head, quietly." },
    tumbao: { ladder: ["opens", "slapopen", "heeltoe"], style: "chacha", tips: "Both hands: heel, toe, slap, toe, heel, toe, open, open. Heel and toe quiet; slap and open tones carry." },
    tumbao2: { ladder: ["tumbao"], style: "montuno", tips: "The tumbao, then in the second bar the right hand moves to the lower drum for two open tones on the and of 2 and on 3, then back up." },
    steady: { ladder: ["opens", "slapopen"], style: "rock", tips: "A quiet part that suits anything: slap on 2, open tones on 4 and the and of 4, light heel and toe between." }
  }
};

// patterns that play the same rhythm, or one built on the same idea, in another part of the band
const SAME = [
  ["bass:tresillo", "comp:tresillo", "comp:strum332", "comp:ballSync", "drums:dembow"],
  ["bass:bossa", "comp:bossa", "drums:bossa"], ["bass:tango", "comp:tango", "drums:tango"],
  ["bass:chacha", "comp:chacha", "drums:chacha", "congas:tumbao"], ["bass:maiden", "comp:maiden"], ["bass:sowhat", "comp:sowhat"],
  ["bass:takefive", "comp:takefive"], ["comp:clave32", "drums:clave32", "drums:bodiddley", "drums:clave"],
  ["bass:tumbao", "congas:tumbao", "congas:tumbao2", "comp:montuno", "drums:clave"], ["bass:twelve8", "comp:triplets", "drums:twelve8", "drums:shuffle"],
  ["bass:motown", "comp:barbara", "drums:motown"], ["bass:alt", "comp:oompah", "drums:boomchick", "comp:prine", "comp:travis"],
  ["comp:waltz", "drums:waltz"], ["bass:eighths", "comp:eighths", "comp:strumEights", "drums:hheighths"],
  ["bass:roots", "comp:quarters", "comp:strumQuarters", "drums:hhquarters"], ["comp:four", "drums:quarters", "bass:walk", "drums:ridetime"],
  ["bass:riff", "bass:riffwalk", "comp:stabs", "drums:funk"], ["bass:octaves", "drums:dance", "drums:hhdance"],
  ["bass:dotted", "drums:strum", "bass:songfather", "drums:ballad"], ["comp:upbeats", "drums:hhoffbeats", "drums:onedrop", "drums:calypso"],
  ["bass:arp", "comp:arp", "comp:arp2", "comp:alberti"], ["bass:held", "bass:halves", "comp:pad", "comp:hymn", "drums:brushes"],
  ["drums:train", "comp:strumFolk"], ["comp:stride", "comp:oompah", "bass:two", "bass:alt"], ["bass:boogie", "bass:arp", "comp:boogie", "drums:shuffle"], ["comp:strumPunk", "drums:rock", "bass:eighths"], ["comp:g3x8", "comp:strum16", "drums:hhsix", "drums:hhsix2"],
  ["bass:polka", "comp:upbeats"], ["comp:ballRock", "drums:ballad", "bass:dotted"], ["bass:footprints", "comp:waltz"], ["bass:allblues", "bass:twelve8"]
];
// patterns written for 3/4 (or that have a 3/4 version worth a step of its own)
const THREE = ["comp:stride", "bass:alt", "bass:polka", "bass:halves", "bass:held", "bass:walk", "bass:roots", "comp:oompah", "comp:hymn", "comp:prine", "comp:quarters",
  "comp:arp", "comp:arp2", "comp:alberti", "comp:pad", "comp:strumQuarters", "drums:hhquarters", "drums:hheighths", "drums:hhoffbeats", "drums:boomchick", "congas:steady"];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
const slug = (kind, id) => `${KINDS[kind].dir}-${id.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}`;
const entry = (kind, id) => C.byId ? C.byId(KINDS[kind].list, id) : KINDS[kind].list.find((e) => e.id === id);
const style = (id) => C.styles.find((s) => s.id === id);
const plan = (kind, id) => PLAN[kind][id] || {};
const link = (kind, id) => { const e = entry(kind, id); return e ? `[${e.label}](${slug(kind, id)}.qmd)` : id; };
const kindWord = { bass: "bass line", comp: "comping rhythm", drums: "drum groove", congas: "conga part" };
const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);

function homeStyle(kind, e) {
  const p = plan(kind, e.id);
  if (p.style) return p.style;
  const key = { bass: "bass", comp: "rhythm", drums: "drums", congas: "congas" }[kind];
  const own = C.styles.find((s) => String(s[key] || "").split("+").includes(e.id));
  return own ? own.id : (e.fits && e.fits[0]) || "rock";
}
function instruments(kind, e) {
  if (kind !== "comp") return [null];
  const p = plan(kind, e.id); if (p.on) return p.on.split(" ");
  return ["piano", "guitar"];
}
function demo({ st, chart, meter, tempo, on, staves, comp, choices, label }) {
  const a = [`data-style="${st}"`, `data-chart="${chart}"`, `data-tempo="${tempo}"`, `data-on="${on}"`, `data-staves="${staves}"`];
  if (meter) a.push(`data-meter="${meter}"`);
  if (comp) a.push(`data-comp="${comp}"`);
  if (label) a.push(`data-choice-label="${esc(label)}"`);
  if (choices) a.push(`data-choices='${esc(JSON.stringify(choices))}'`);
  return `<div class="ar-demo" ${a.join(" ")}></div>`;
}
const slow = (t) => Math.max(50, Math.round(t * 0.7 / 2) * 2);

function page(kind, e) {
  const K = KINDS[kind], p = plan(kind, e.id), st = homeStyle(kind, e), S = style(st) || C.styles[0];
  const sd = STYLE[st] || STYLE.rock, chart = p.chart || (p.meter === "3/4" ? WALTZ : sd[0]), meter = p.meter, tempo = p.tempo || sd[1];
  const insts = instruments(kind, e), comp = insts[0];
  const part = K.part, opt = (id) => ({ [K.opt]: id });
  const rungOn = kind === "drums" ? "drums" : kind === "congas" ? "congas bass" : `${part} drums`;
  const ladder = (p.ladder || []).filter((id) => entry(kind, id));
  const fits = (e.fits || []).map(style).filter(Boolean);
  const who = kind === "comp" ? insts.join(" or ") : K.who;
  const L = [];
  L.push("---", `title: "${K.noun}: ${e.label.replace(/"/g, "'")}"`, `subtitle: "For ${who}, built up a step at a time"`, "toc: true", "toc-depth: 2", "---", "");
  L.push(`This is a lesson on one ${kindWord[kind]} the [Backing Track](../../tools/backing-track.qmd) band plays: **${e.label}**. ` +
    (ladder.length ? `It is built up from ${ladder.length === 1 ? "a simpler pattern" : ladder.length + " simpler patterns"}, one step at a time, and every step is played by the band and written out as it plays.` :
      "It is one of the first patterns to learn, so this page starts from it and takes it into the band.") +
    ` How the examples work: press ▶ Play, switch players in and out with the buttons beside it, and read the band's last four bars on the staff underneath. The tempo slider at the bottom of the page slows everything down.`, "");
  L.push(`[All the accompaniment patterns](index.qmd) · [${K.noun}s](index.qmd#${K.dir})`, "");

  L.push("## The pattern", "", e.desc, "");
  if (fits.length) L.push(`It belongs in ${fits.map((s) => `*${s.label}*`).join(", ").replace(/, ([^,]*)$/, " and $1")}. Here it is in the ${S.label.toLowerCase()} style with the whole band. Switch the other players off to hear it alone.`, "");
  L.push(demo({ st, chart, meter, tempo, on: "bass comp drums congas", staves: kind === "drums" ? "drums" : `${part}${kind === "bass" ? " drums" : kind === "congas" ? " bass" : ""}`, comp, choices: [{ label: e.label, opts: opt(e.id) }], label: `${K.noun}:` }), "");

  let n = 1;
  ladder.forEach((id, i) => {
    const r = entry(kind, id);
    L.push(`## Step ${n++}: ${r.label}`, "");
    L.push(i === 0 ? `Start with something simpler. ${r.desc}` : r.desc, "");
    L.push(`This is a pattern of its own: [the lesson on it](${slug(kind, id)}.qmd) takes it further. Here it is only a step on the way, slowly.` +
      (kind === "drums" ? " The drums play alone first; switch the bass and chords on when it is steady." : kind === "congas" ? " The bass plays with you; switch the drums and chords on when it is steady." : " The drums keep time with you; switch the others on when it is steady."), "");
    L.push(demo({ st, chart, meter, tempo: slow(tempo), on: rungOn, staves: part, comp, choices: [{ label: r.label, opts: opt(id) }], label: "Step:" }), "");
  });

  L.push(`## Step ${n++}: ${e.label}, slowly`, "");
  if (ladder.length) L.push(`Now the pattern itself. Compare it with the step before: press each button while the band plays and watch what changes on the staff.`, "");
  L.push(`**How to play it.** ${p.tips || e.desc}`, "");
  if (kind === "comp" && insts.length > 1) L.push("The band plays it on " + comp + " here; the step after next has it on " + insts[1] + ".", "");
  L.push(demo({ st, chart, meter, tempo: slow(tempo), on: rungOn, staves: part, comp, label: "Compare:",
    choices: [{ label: e.label, opts: opt(e.id) }].concat(ladder.length ? [{ label: entry(kind, ladder[ladder.length - 1]).label + " (the step before)", opts: opt(ladder[ladder.length - 1]) }] : []) }), "");

  L.push(`## Step ${n++}: Up to tempo, with the band`, "");
  L.push(`The whole band, at ${tempo} beats a minute. Play along, then switch the band's ${kind === "comp" ? "chord player" : K.who} off and take the part yourself.`, "");
  L.push(demo({ st, chart, meter, tempo, on: "bass comp drums congas", staves: kind === "drums" ? "drums bass" : `${part} ${kind === "bass" ? "drums" : "bass"}`, comp, choices: [{ label: e.label, opts: opt(e.id) }], label: `${K.noun}:` }), "");

  if (kind === "comp" && insts.length > 1) {
    L.push(`## Step ${n++}: On the ${insts[1]}`, "");
    L.push(`The same rhythm on the ${insts[1]}. ${insts[1] === "guitar" ? "On guitar each chord is a strum or a pluck of a chord shape; a short chord is choked by easing the fretting hand off the strings." : "On piano the left hand takes the root or a low shell and the right hand the chord; a short chord is lifted off the keys at once."}`, "");
    L.push(demo({ st, chart, meter, tempo, on: "bass comp drums congas", staves: "comp bass", comp: insts[1], choices: [{ label: e.label, opts: opt(e.id) }], label: `${K.noun}:` }), "");
  }

  if (!meter && sd[2] && kind !== "drums" && kind !== "congas") {
    L.push(`## Step ${n++}: Two chords in a bar`, "");
    L.push(`Harder: now some bars have two chords, two beats each. ${kind === "bass" ? "Each chord gets its root when it arrives; the pattern squeezes into the beats it has." : "The pattern keeps its rhythm and changes chord where the bar does: watch the staff for the hit that lands on beat 3."}`, "");
    L.push(demo({ st, chart: sd[2], tempo, on: "bass comp drums congas", staves: kind === "bass" ? "bass" : "comp bass", comp, choices: [{ label: e.label, opts: opt(e.id) }], label: `${K.noun}:` }), "");
  }
  if (THREE.includes(`${kind}:${e.id}`) && meter !== "3/4") {
    L.push(`## Step ${n++}: In 3/4`, "");
    L.push((e.feel === "swing" ? "The same pattern in a jazz waltz:" : "The same pattern in a waltz:") + " three beats to the bar. Listen for what it keeps and what it drops when the bar is a beat shorter.", "");
    L.push(demo({ st: kind === "drums" || kind === "congas" || e.feel === "swing" ? st : "waltz", chart: WALTZ, meter: "3/4", tempo: 120, on: "bass comp drums congas", staves: kind === "drums" ? "drums" : part, comp, choices: [{ label: e.label, opts: opt(e.id) }], label: `${K.noun}:` }), "");
  }

  const others = fits.filter((s) => s.id !== st && STYLE[s.id]).slice(0, 3);
  if (others.length) {
    L.push("## In other styles", "");
    L.push(`The same ${kindWord[kind]} in ${others.length === 1 ? "another style" : "other styles"} it fits. The other players change; yours does not. Notice how the same part sounds different in a different band.`, "");
    others.forEach((s) => { const d = STYLE[s.id]; L.push(`**${s.label}**`, "", demo({ st: s.id, chart: s.id === "waltz" ? WALTZ : d[0], meter: s.id === "waltz" ? "3/4" : undefined, tempo: d[1], on: "bass comp drums congas", staves: kind === "drums" ? "drums" : part, comp, choices: [{ label: e.label, opts: opt(e.id) }], label: `${K.noun}:` }), ""); });
  }

  L.push("## How it relates to the other patterns", "");
  const key = `${kind}:${e.id}`, up = [], same = new Set();
  for (const k of Object.keys(PLAN)) for (const [id, q] of Object.entries(PLAN[k])) if ((q.ladder || []).includes(e.id) && k === kind && entry(k, id)) up.push(link(k, id));
  SAME.forEach((g) => { if (g.includes(key)) g.forEach((x) => { if (x !== key) same.add(x); }); });
  if (ladder.length) L.push(`- **Builds on:** ${ladder.map((id) => link(kind, id)).join(", ")}.`);
  if (up.length) L.push(`- **Leads to:** ${up.join(", ")}: the patterns that use this one as a step.`);
  const sameL = [...same].map((x) => { const [k, id] = x.split(":"); return entry(k, id) ? `${link(k, id)} (${kindWord[k]})` : null; }).filter(Boolean);
  if (sameL.length) L.push(`- **The same idea elsewhere in the band:** ${sameL.join(", ")}.`);
  const partners = [["bass", S.bass], ["comp", S.rhythm], ["drums", S.drums], ["congas", S.congas]]
    .filter(([k, v]) => v && k !== kind).flatMap(([k, v]) => String(v).split("+").map((id) => [k, id])).filter(([k, id]) => entry(k, id) && !(SKIP[k] || []).includes(id));
  if (partners.length) L.push(`- **Plays with, in ${S.label.toLowerCase()}:** ${partners.map(([k, id]) => `${link(k, id)} (${kindWord[k]})`).join(", ")}.`);
  const sib = K.list.filter((x) => x.id !== e.id && x.group === e.group && !(SKIP[kind] || []).includes(x.id)).slice(0, 8);
  if (sib.length) L.push(`- **Other ${kindWord[kind]}s in the ${e.group} group:** ${sib.map((x) => link(kind, x.id)).join(", ")}.`);
  L.push("", "{{< include ../_arrange-kit.qmd >}}", "", '<script src="/apps/shared/lessons/sections.js?v=1"></script>', "");
  return L.join("\n");
}

fs.mkdirSync(OUT, { recursive: true });
const idx = ["---", 'title: "Accompaniment Patterns"', 'subtitle: "A lesson for every bass line, comping rhythm, drum groove and conga part the band plays"', "toc: true", "toc-depth: 2", "---", "",
  "Every pattern the [Backing Track](../../tools/backing-track.qmd) band can play has a lesson here. Each one starts from simpler patterns in the same list, plays every step on the band and writes out what it played, then takes the pattern into its styles and shows how it relates to the rest. A pattern marked ○ is a starting point: it builds on nothing else.", ""];
let count = 0;
for (const kind of Object.keys(KINDS)) {
  const K = KINDS[kind];
  idx.push(`## ${K.noun}s {#${K.dir}}`, "");
  const groups = [...new Set(K.list.map((x) => x.group))];
  for (const g of groups) {
    const items = K.list.filter((x) => x.group === g && !(SKIP[kind] || []).includes(x.id));
    if (!items.length) continue;
    idx.push(`**${g}**`, "");
    for (const e of items) {
      fs.writeFileSync(path.join(OUT, slug(kind, e.id) + ".qmd"), page(kind, e)); count++;
      const lad = (plan(kind, e.id).ladder || []);
      idx.push(`- ${lad.length ? "" : "○ "}[${e.label}](${slug(kind, e.id)}.qmd)${lad.length ? ` — from ${lad.map((id) => entry(kind, id)?.label).join(" → ")}` : ""}`);
    }
    idx.push("");
  }
}
idx.push('<script src="/apps/shared/lessons/sections.js?v=1"></script>', "");
fs.writeFileSync(path.join(OUT, "index.qmd"), idx.join("\n"));
const missing = Object.keys(KINDS).flatMap((k) => KINDS[k].list.filter((e) => !(SKIP[k] || []).includes(e.id) && !PLAN[k][e.id]).map((e) => k + ":" + e.id));
console.log(`wrote ${count} lessons and the index to lessons/patterns/` + (missing.length ? `; no plan for: ${missing.join(", ")}` : ""));
