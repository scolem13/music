// pattern-set.js — the tonal pattern collections the tools use.
// The full archive stays in pattern-object.js, which only the LSA teacher pages still load.

const patternObject = {
"major-stepwise":
`X:1
K:C
[V: V1] C0 D0 E0 
w: Do Re Mi

X:2
K:C
[V: V1] E0 D0 C0 
w: Mi Re Do

X:3
K:C
[V: V1] C0 B,0 C0 
w: Do Ti Do

X:4
K:C
[V: V1] D0 E0 F0 
w: Re Mi Fa

X:5
K:C
[V: V1] F0 E0 D0 
w: Fa Mi Re

X:6
K:C
[V: V1] E0 F0 E0 
w: Mi Fa Mi

X:7
K:C
[V: V1] D0 E0 F0 G0 
w: Re Mi Fa So

X:8
K:C
[V: V1] G0 A0 G0 
w: So La So

X:9
K:C
[V: V1] G0 F0 E0 D0 C0 
w: So Fa Mi Re Do

X:10
K:C
[V: V1] G0 A0 B0 c0 
w: So La Ti Do
`,

"minor-stepwise":
`X:1
K:Cm
[V: V1] C0 D0 E0 
w: La Ti Do

X:2
K:Cm
[V: V1] E0 D0 C0 
w: Do Ti La

X:3
K:Cm
[V: V1] C0 =B,0 C0 

X:4
K:Cm
[V: V1] D0 E0 F0 

X:5
K:Cm
[V: V1] F0 E0 D0 

X:6
K:Cm
[V: V1] E0 F0 E0 

X:7
K:Cm
[V: V1] D0 E0 F0 G0 

X:8
K:Cm
[V: V1] G0 A0 G0 

X:9
K:Cm
[V: V1] G0 F0 E0 D0 C0 

X:10
K:Cm
[V: V1] G0 A0 =B0 c0 

`,

"major-I-V":
`X:1
K:C)
[V: V1] "C" C0 E0 C0 

X:2
K:C)
[V: V1] "G7" D0 B,0 D0 

X:3
K:C)
[V: V1] "C" C0 E0 G0 

X:4
K:C)
[V: V1] "G7" G0 F0 D0 

X:5
K:C)
[V: V1] "G7" B,0 D0 G0 

X:6
K:C)
[V: V1] "C" E0 G0 C0 

X:7
K:C)
[V: V1] "G7" D0 B,0 G0 

X:8
K:C)
[V: V1] "C" G0 E0 C0 

X:9
K:C)
[V: V1] "C" C0 E0  

X:10
K:C)
[V: V1] "G7" D0 G0  

X:11
K:C)
[V: V1] "G7" G0 F0

X:12
K:C)
[V: V1] "G7" D0 B,0

X:13
K:C)
[V: V1] "C" C0 G0 

X:14
K:C)
[V: V1] "G7" E0 G0 C0 

X:15
K:C)
[V: V1] "G7" D0 F0

X:16
K:C)
[V: V1] "C" E0 C0 

`,

"minor-i-V":
`X:1
K:Cm)
[V: V1] "Cm" C0 E0 C0 

X:2
K:Cm)
[V: V1] "G7" D0 =B,0 D0 

X:3
K:Cm)
[V: V1] "Cm" C0 E0 G0 

X:4
K:Cm)
[V: V1] "G7" G0 F0 D0 

X:5
K:Cm)
[V: V1] "G7" =B,0 D0 G0 

X:6
K:Cm)
[V: V1] "Cm" E0 G0 C0 

X:7
K:Cm)
[V: V1] "G7" D0 =B,0 G0 

X:8
K:Cm)
[V: V1] "Cm" G0 E0 C0 

X:9
K:Cm)
[V: V1] "Cm" C0 E0  

X:10
K:Cm)
[V: V1] "G7" D0 G0  

X:11
K:Cm)
[V: V1] "G7" G0 F0

X:12
K:Cm)
[V: V1] "G7" D0 =B,0

X:13
K:Cm)
[V: V1] "Cm" C0 G0 

X:14
K:Cm)
[V: V1] "G7" E0 G0 C0 

X:15
K:Cm)
[V: V1] "G7" D0 F0

X:16
K:Cm)
[V: V1] "Cm" E0 C0

`,

"322a":
`X:1
K:Dm
[V: V1] "Dm" D0 F0 D0
w: La Do La

X:2
K:Dm
[V: V1] "A7" E0 ^C0 E0
w: Ti Si Ti

X:3
K:Dm
[V: V1] "Dm" D0 F0 A0
w: La Do Mi

X:4
K:Dm
[V: V1] "A7" A0 G0 E0
w: Mi Re Ti

X:5
K:Dm
[V: V1] "Dm" F0 A0 D0
w: Do Mi La

X:6
K:Dm
[V: V1] "A7" E0 ^C0 A0
w: Ti Si Mi

X:7
K:Dm
[V: V1] "A7" A0 ^C0 E0
w: Mi Si Ti

X:8
K:Dm
[V: V1] "Dm" D0 F0 D0
w: La Do La

X:9
K:Dm
[V: V1] "Dm" D0 F0
w: La Do

X:10
K:Dm
[V: V1] "A7" E0 A0
w: Ti Mi

X:11
K:Dm
[V: V1] "A7" A0 G0
w: Mi Re

X:12
K:Dm
[V: V1] "A7" G0 E0
w: Re Ti

X:13
K:Dm
[V: V1] "Dm" D0 A0
w: La Mi

X:14
K:Dm
[V: V1] "A7" A0 ^C0
w: Mi Si

X:15
K:Dm
[V: V1] "A7" E0 G0
w: Ti Re

X:16
K:Dm
[V: V1] "Dm" F0 D0
w: Do La
`,

"322b":
`X:1
K:Dm
[V: V1] "Dm" D0 A0 F0
w: La Mi Do

X:2
K:Dm
[V: V1] "Gm" G0 _B0 d0
w: Re Fa La

X:3
K:Dm
[V: V1] "A7" ^c0 A0 E0
w: Si Mi Ti

X:4
K:Dm
[V: V1] "Dm" D0 F0 A0
w: La Do Mi

X:5
K:Dm
[V: V1] "Gm" G0 _B0 G0
w: Re Fa Re

X:6
K:Dm
[V: V1] "A7" A0 ^c0 e0
w: Mi Si Ti

X:7
K:Dm
[V: V1] "A7" ^c0 e0 A0
w: Si Ti Mi

X:8
K:Dm
[V: V1] "Dm" d0 A0 D0
w: La Mi La

X:9
K:Dm
[V: V1] "Dm" D0 A0
w: La Mi

X:10
K:Dm
[V: V1] "Dm" F0 D0
w: Do La

X:11
K:Dm
[V: V1] "Gm" D0 G0
w: La Re

X:12
K:Dm
[V: V1] "Gm" _B0 G0
w: Fa Re

X:13
K:Dm
[V: V1] "A7" A0 ^c0
w: Mi Si

X:14
K:Dm
[V: V1] "Dm" d0 A0
w: La Mi

X:15
K:Dm
[V: V1] "Gm" G0 _B0
w: Re Fa

X:16
K:Dm
[V: V1] "Dm" A0 d0
w: Mi La
`,

// 322b-major: 322b moved to the parallel major (D major) — tonic, dominant, and subdominant functions
"322b-major":
`X:1
K:D
[V: V1] "D" D0 A0 F0
w: Do So Mi

X:2
K:D
[V: V1] "G" G0 B0 d0
w: Fa La Do

X:3
K:D
[V: V1] "A7" c0 A0 E0
w: Ti So Re

X:4
K:D
[V: V1] "D" D0 F0 A0
w: Do Mi So

X:5
K:D
[V: V1] "G" G0 B0 G0
w: Fa La Fa

X:6
K:D
[V: V1] "A7" A0 c0 e0
w: So Ti Re

X:7
K:D
[V: V1] "A7" c0 e0 A0
w: Ti Re So

X:8
K:D
[V: V1] "D" d0 A0 D0
w: Do So Do

X:9
K:D
[V: V1] "D" D0 A0
w: Do So

X:10
K:D
[V: V1] "D" F0 D0
w: Mi Do

X:11
K:D
[V: V1] "G" D0 G0
w: Do Fa

X:12
K:D
[V: V1] "G" B0 G0
w: La Fa

X:13
K:D
[V: V1] "A7" A0 c0
w: So Ti

X:14
K:D
[V: V1] "D" d0 A0
w: Do So

X:15
K:D
[V: V1] "G" G0 B0
w: Fa La

X:16
K:D
[V: V1] "D" A0 d0
w: So Do
`,

"323a":
`X:1
K:Ddor
[V: V1] "Dm" D0 F0 D0
w: Re Fa Re

X:2
K:Ddor
[V: V1] "C" C0 E0 G0
w: Do Mi So

X:3
K:Ddor
[V: V1] "C" E0 G0 C0 E0
w: Mi So Do Mi

X:4
K:Ddor
[V: V1] "Dm" D0 F0 A0
w: Re Fa La

X:5
K:Ddor
[V: V1] "Dm" A0 F0 D0 F0
w: La Fa Re Fa

X:6
K:Ddor
[V: V1] "C" E0 G0 E0 C0 E0
w: Mi So Mi Do Mi

X:7
K:Ddor
[V: V1] "C" E0 G0
w: Mi So

X:8
K:Ddor
[V: V1] "Dm" F0 A0 D0 F0 D0
w: Fa La Re Fa Re

X:9
K:Ddor
[V: V1] "C" C0 G0 E0 C0
w: Do So Mi Do

X:10
K:Ddor
[V: V1] "Dm" D0 F0
w: Re Fa

X:11
K:Ddor
[V: V1] "C" C0 E0
w: Do Mi

X:12
K:Ddor
[V: V1] "Dm" D0 F0 A0 F0 D0
w: Re Fa La Fa Re
`,

"323b":
`X:1
K:Ddor
[V: V1] "Dm" D0 A0 D0
w: Re La Re

X:2
K:Ddor
[V: V1] "C" G0 E0
w: So Mi

X:3
K:Ddor
[V: V1] "Dm" D0 F0 A0 F0
w: Re Fa La Fa

X:4
K:Ddor
[V: V1] "G" D0 G0 B0 D0
w: Re So Ti Re

X:5
K:Ddor
[V: V1] "C" E0 C0 E0 G0 E0
w: Mi Do Mi So Mi

X:6
K:Ddor
[V: V1] "Dm" F0 D0 A0
w: Fa Re La

X:7
K:Ddor
[V: V1] "G" G0 D0 B0 G0 D0
w: So Re Ti So Re

X:8
K:Ddor
[V: V1] "Dm" A0 F0
w: La Fa

X:9
K:Ddor
[V: V1] "C" G0 E0 C0 E0
w: So Mi Do Mi

X:10
K:Ddor
[V: V1] "Dm" D0 F0 A0 D0 F0
w: Re Fa La Re Fa

X:11
K:Ddor
[V: V1] "C" G0 C0 E0
w: So Do Mi

X:12
K:Ddor
[V: V1] "Dm" F0 D0
w: Fa Re
`,

"324a":
`X:1
K:Gmix
[V: V1] "G" G0 B0 G0
w: So Ti So

X:2
K:Gmix
[V: V1] "F" F0 A0 c0
w: Fa La Do

X:3
K:Gmix
[V: V1] "F" A0 c0 F0 A0
w: La Do Fa La

X:4
K:Gmix
[V: V1] "G" G0 B0 d0
w: So Ti Re

X:5
K:Gmix
[V: V1] "G" d0 B0 G0 B0
w: Re Ti So Ti

X:6
K:Gmix
[V: V1] "F" A0 c0 A0 F0 A0
w: La Do La Fa La

X:7
K:Gmix
[V: V1] "F" A0 c0
w: La Do

X:8
K:Gmix
[V: V1] "G" B0 d0 G0 B0 G0
w: Ti Re So Ti So

X:9
K:Gmix
[V: V1] "F" F0 c0 A0 F0
w: Fa Do La Fa

X:10
K:Gmix
[V: V1] "G" G0 B0
w: So Ti

X:11
K:Gmix
[V: V1] "F" F0 A0
w: Fa La

X:12
K:Gmix
[V: V1] "G" G0 B0 d0 B0 G0
w: So Ti Re Ti So
`,

"324b":
`X:1
K:Gmix
[V: V1] "G" G0 d0 B0
w: So Re Ti

X:2
K:Gmix
[V: V1] "F" c0 A0
w: Do La

X:3
K:Gmix
[V: V1] "G" G0 B0 d0 B0
w: So Ti Re Ti

X:4
K:Gmix
[V: V1] "C" G0 c0 e0 G0
w: So Do Mi So

X:5
K:Gmix
[V: V1] "F" A0 F0 A0 c0 A0
w: La Fa La Do La

X:6
K:Gmix
[V: V1] "G" B0 G0 d0
w: Ti So Re

X:7
K:Gmix
[V: V1] "C" c0 G0 e0 c0 G0
w: Do So Mi Do So

X:8
K:Gmix
[V: V1] "G" d0 B0
w: Re Ti

X:9
K:Gmix
[V: V1] "F" c0 A0 F0 A0
w: Do La Fa La

X:10
K:Gmix
[V: V1] "G" G0 B0 d0 G0 B0
w: So Ti Re So Ti

X:11
K:Gmix
[V: V1] "F" c0 F0 A0
w: Do Fa La

X:12
K:Gmix
[V: V1] "G" B0 G0
w: Ti So
`,

// Blue note patterns: Azzara & Grunow, Developing Musicianship Through Improvisation, Book 3, Unit 1
// ("Saint Louis Blues"), pp. ix and 6; written there with F = DO, here with C = DO. Chords are the book's
// functions (I, IV7, V7, I7). "% tunes:" lists %%id values of tunes in apps/tunes/tunes-object.js where the
// pattern occurs on DO over the same chord function (found by script; pattern 5 occurs in none).
"dmti-blue-notes":
`X:1
K:C
% tunes: f-blues-tootsie st-louis-blues deccaphonie for-regulars-only
[V: V1] "C" _E0 =E0 C0
w: Me Mi Do

X:2
K:C
% tunes: blues-primitif f-blues-tootsie st-louis-blues blue-drag
[V: V1] "F7" _E0 D0 C0
w: Me Re Do

X:3
K:C
% tunes: d-natural-blues blues-after-dark trane-s-blues blues-for-p-k
[V: V1] "C" C0 _E0 C0
w: Do Me Do

X:4
K:C
% tunes: blues-clair bessie-s-blues for-regulars-only indiana
[V: V1] "C7" C0 B,0 _B,0
w: Do Ti Te

X:5
K:C
% tunes: (none in the collection)
[V: V1] "F7" ^G,0 A,0 C0 _E0 F0
w: Si La Do Me Fa

X:6
K:C
% tunes: d-natural-blues k-c-blues cool-struttin driftin
[V: V1] "F7" ^F0 =F0 _E0 C0
w: Fi Fa Me Do

X:7
K:C
% tunes: blues-primitif f-blues-tootsie blues-after-dark blues-a-la-mode
[V: V1] "C7" F0 _E0 C0
w: Fa Me Do

X:8
K:C
% tunes: blues-primitif st-louis-blues blues-clair deccaphonie
[V: V1] "C7" G0 _E0 C0
w: So Me Do

X:9
K:C
% tunes: blues-primitif 1974-blues afro-blue birdland
[V: V1] "G7" B,0 G,0 F,0
w: Ti So Fa

X:10
K:C
% tunes: blues-primitif f-blues-tootsie blue-monk for-regulars-only
[V: V1] "G7" _E0 =E0 G0
w: Me Mi So

X:11
K:C
% tunes: hay-burner
[V: V1] "C7" A0 _E0 C0
w: La Me Do

X:12
K:C
% tunes: blues-primitif blues-a-la-mode deccaphonie headin-home
[V: V1] "C7" G,0 _B,0 C0
w: So Te Do
`,

// Familiar Patterns in a Familiar Order (FPIFO), tonic and dominant: Mullen, The Literate Musician, 2nd ed., p. 57 (major,
// "in the key of C") and p. 59 (minor, "in the key of C minor"), in the book's order. Chords as the book's I / V marks (V written G7).
"mullen-fpifo-major":
`X:1
K:C
[V: V1] "C" C0 E0
w: Do Mi

X:2
K:C
[V: V1] "C" G0 C0
w: So Do

X:3
K:C
[V: V1] "G7" B,0 D0
w: Ti Re

X:4
K:C
[V: V1] "C" E0 C0
w: Mi Do

X:5
K:C
[V: V1] "C" C0 E0 G0
w: Do Mi So

X:6
K:C
[V: V1] "G7" G0 D0 G0
w: So Re So

X:7
K:C
[V: V1] "C" G0 E0 C0
w: So Mi Do

X:8
K:C
[V: V1] "C" C0 G0 E0
w: Do So Mi

X:9
K:C
[V: V1] "G7" G0 D0 B,0
w: So Re Ti

X:10
K:C
[V: V1] "G7" B,0 G0
w: Ti So

X:11
K:C
[V: V1] "G7" D0 F0
w: Re Fa

X:12
K:C
[V: V1] "C" E0 G0 C0
w: Mi So Do

X:13
K:C
[V: V1] "G7" G0 F0 D0
w: So Fa Re

X:14
K:C
[V: V1] "G7" B,0 D0 G0
w: Ti Re So

X:15
K:C
[V: V1] "C" C0 G0 C0
w: Do So Do
`,

"mullen-fpifo-minor":
`X:1
K:Cm
[V: V1] "Cm" C0 E0
w: La Do

X:2
K:Cm
[V: V1] "Cm" G0 C0
w: Mi La

X:3
K:Cm
[V: V1] "G7" =B,0 D0
w: Si Ti

X:4
K:Cm
[V: V1] "Cm" E0 C0
w: Do La

X:5
K:Cm
[V: V1] "Cm" C0 E0 G0
w: La Do Mi

X:6
K:Cm
[V: V1] "G7" G0 D0 G0
w: Mi Ti Mi

X:7
K:Cm
[V: V1] "Cm" G0 E0 C0
w: Mi Do La

X:8
K:Cm
[V: V1] "Cm" C0 G0 E0
w: La Mi Do

X:9
K:Cm
[V: V1] "G7" G0 D0 =B,0
w: Mi Ti Si

X:10
K:Cm
[V: V1] "G7" =B,0 G0
w: Si Mi

X:11
K:Cm
[V: V1] "G7" D0 F0
w: Ti Re

X:12
K:Cm
[V: V1] "Cm" E0 G0 C0
w: Do Mi La

X:13
K:Cm
[V: V1] "G7" G0 F0 D0
w: Mi Re Ti

X:14
K:Cm
[V: V1] "G7" =B,0 D0 G0
w: Si Ti Mi

X:15
K:Cm
[V: V1] "Cm" C0 G0 C0
w: La Mi La
`,

// ---- Patterns from the MLT books (Azzara & Grunow DMTI 1-3; JRI Recorder Teacher's Guide; Mullen, The Literate Musician; JRI Music Play) ----
// Sets whose patterns the site already had are not repeated: DMTI Book 1 Units 1-3 (= major-I-V, minor-i-V), the JRI Recorder minor, Dorian and
// Mixolydian sets (= 322a/b, 323a/b, 324a/b), Mullen's stepwise sets (= major-stepwise, minor-stepwise). Each set below is checked by
// tests/patterns/source-sets.test.js (written solfege = solfege computed from the pitches).

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 1: C Instruments (Treble Clef) (GIA, 2006), Unit 4 "Simple Gifts", Echo Tonal Patterns (Major, Tonic, Subdominant and Dominant, F major): the twelve patterns are written out with solfège on p. xi.
// Written there with F = DO, here C = DO. Chords are the book's I (F), IV (Bb) and V7 (C7).
"dmti1-unit4-tonal":
`X:1
K:C
[V: V1] "C" C0 E0 C0
w: Do Mi Do

X:2
K:C
[V: V1] "F" C0 F0 A0
w: Do Fa La

X:3
K:C
[V: V1] "G7" G0 F0 D0 B,0
w: So Fa Re Ti

X:4
K:C
[V: V1] "C" C0 G0 E0 C0 E0
w: Do So Mi Do Mi

X:5
K:C
[V: V1] "G7" D0 B,0 G0
w: Re Ti So

X:6
K:C
[V: V1] "G7" G0 F0
w: So Fa

X:7
K:C
[V: V1] "C" E0 G0 C0
w: Mi So Do

X:8
K:C
[V: V1] "G7" B,0 F0 G0
w: Ti Fa So

X:9
K:C
[V: V1] "C" E0 C0 E0 G0
w: Mi Do Mi So

X:10
K:C
[V: V1] "F" F0 C0 A0
w: Fa Do La

X:11
K:C
[V: V1] "G7" F0 D0
w: Fa Re

X:12
K:C
[V: V1] "C" G0 E0 C0
w: So Mi Do
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 1: C Instruments (Treble Clef) (GIA, 2006), Unit 5 "Down by the Riverside", Echo Tonal Patterns (Major, Tonic, Subdominant and Dominant, F major): the twelve patterns are written out with solfège on p. xi.
// Written there with F = DO, here C = DO. Chords are the book's I (F), IV (Bb) and V7 (C7).
"dmti1-unit5-tonal":
`X:1
K:C
[V: V1] "C" c0 G0 E0
w: Do So Mi

X:2
K:C
[V: V1] "F" F0 A0 c0
w: Fa La Do

X:3
K:C
[V: V1] "G7" B0 d0 G0
w: Ti Re So

X:4
K:C
[V: V1] "C" c0 G0 c0
w: Do So Do

X:5
K:C
[V: V1] "C" e0 c0 G0
w: Mi Do So

X:6
K:C
[V: V1] "F" A0 F0 c0
w: La Fa Do

X:7
K:C
[V: V1] "G7" B0 G0 F0
w: Ti So Fa

X:8
K:C
[V: V1] "C" E0 G0 c0
w: Mi So Do

X:9
K:C
[V: V1] "C" c0 G0
w: Do So

X:10
K:C
[V: V1] "F" F0 A0
w: Fa La

X:11
K:C
[V: V1] "G7" B0 G0
w: Ti So

X:12
K:C
[V: V1] "C" E0 c0
w: Mi Do
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 2: C Instruments (2nd ed., GIA, 2010), Unit 1 "When the Saints Go Marching In", Echo Tonal Patterns (Major, Tonic, Subdominant and Dominant, Bb major): p. 5; written out with solfège on p. ix (there in two octaves; the lower is used here).
// Written there with Bb = DO, here C = DO. Chords are the book's I (Bb), IV (Eb) and V7 (F7).
"dmti2-unit1-tonal":
`X:1
K:C
[V: V1] "C" c0 G0 E0
w: Do So Mi

X:2
K:C
[V: V1] "F" F0 A0 c0
w: Fa La Do

X:3
K:C
[V: V1] "G7" B0 d0 G0
w: Ti Re So

X:4
K:C
[V: V1] "C" c0 G0 c0
w: Do So Do

X:5
K:C
[V: V1] "C" e0 c0 G0
w: Mi Do So

X:6
K:C
[V: V1] "F" A0 F0 c0
w: La Fa Do

X:7
K:C
[V: V1] "G7" B0 G0 F0
w: Ti So Fa

X:8
K:C
[V: V1] "C" E0 G0 c0
w: Mi So Do

X:9
K:C
[V: V1] "C" c0 G0
w: Do So

X:10
K:C
[V: V1] "F" F0 A0
w: Fa La

X:11
K:C
[V: V1] "G7" B0 G0
w: Ti So

X:12
K:C
[V: V1] "C" E0 c0
w: Mi Do
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 2: C Instruments (2nd ed., GIA, 2010), Unit 2 "Amazing Grace", Echo Tonal Patterns (Major, Tonic, Subdominant and Dominant, F major): written out with solfège on p. ix.
// Written there with F = DO, here C = DO. Chords are the book's I (F), IV (Bb) and V7 (C7).
"dmti2-unit2-tonal":
`X:1
K:C
[V: V1] "C" C0 G0 E0
w: Do So Mi

X:2
K:C
[V: V1] "F" F0 C0 A0
w: Fa Do La

X:3
K:C
[V: V1] "G7" G0 F0 D0 B,0
w: So Fa Re Ti

X:4
K:C
[V: V1] "C" C0 E0 G0
w: Do Mi So

X:5
K:C
[V: V1] "F" F0 A0 C0 A0 F0
w: Fa La Do La Fa

X:6
K:C
[V: V1] "C" E0 G0 E0 C0
w: Mi So Mi Do

X:7
K:C
[V: V1] "G7" B,0 D0 F0 G0
w: Ti Re Fa So

X:8
K:C
[V: V1] "C" G0 E0 C0
w: So Mi Do

X:9
K:C
[V: V1] "F" F0 A0 F0
w: Fa La Fa

X:10
K:C
[V: V1] "C" E0 C0 E0 G0
w: Mi Do Mi So

X:11
K:C
[V: V1] "G7" G0 B,0 D0 F0
w: So Ti Re Fa

X:12
K:C
[V: V1] "C" E0 C0
w: Mi Do
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 2: C Instruments (2nd ed., GIA, 2010), Unit 3 "Motherless Child", Echo Tonal Patterns (Minor, Tonic, Subdominant and Dominant, D minor): written out with solfège on p. ix (there in two octaves; the lower is used here).
// Written there with D = LA (F = DO), here C = LA. Chords are the book's i (Dm), iv (Gm, Gm6) and V7 (A7); SI is the raised seventh, ME the lowered third.
"dmti2-unit3-tonal":
`X:1
K:Cm
[V: V1] "Cm" C0 G0 E0
w: La Mi Do

X:2
K:Cm
[V: V1] "Fm" F0 A0 c0
w: Re Fa La

X:3
K:Cm
[V: V1] "G7" =B0 G0 D0
w: Si Mi Ti

X:4
K:Cm
[V: V1] "Cm" C0 E0 G0
w: La Do Mi

X:5
K:Cm
[V: V1] "Fm6" F0 A0 F0 D0 C0
w: Re Fa Re Ti La

X:6
K:Cm
[V: V1] "Cm" E0 G0 c0
w: Do Mi La

X:7
K:Cm
[V: V1] "G7" =B0 d0 G0
w: Si Ti Mi

X:8
K:Cm
[V: V1] "Cm" _G0 F0 E0 C0
w: Me Re Do La

X:9
K:Cm
[V: V1] "Cm" C0 G0
w: La Mi

X:10
K:Cm
[V: V1] "Fm" A0 F0
w: Fa Re

X:11
K:Cm
[V: V1] "G7" G0 D0
w: Mi Ti

X:12
K:Cm
[V: V1] "Cm" E0 C0
w: Do La
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 3: C Instruments (GIA, 2010), Unit 1 "Saint Louis Blues", Echo Tonal Patterns (Major, Tonic, Subdominant and Dominant, F major, blues chords): p. 6; written out with solfège on p. ix (there in two octaves where a pattern is stacked; the lower is used here). The Blue Note Patterns of the same page are the set dmti-blue-notes.
// Written there with F = DO, here C = DO. Chords are the Echo page's I (F, F7), IV7 (Bb7) and V7 (C7).
"dmti3-unit1-tonal":
`X:1
K:C
[V: V1] "C" C0 G0 E0
w: Do So Mi

X:2
K:C
[V: V1] "F7" F0 A0 C0
w: Fa La Do

X:3
K:C
[V: V1] "C" E0 G0 E0 C0
w: Mi So Mi Do

X:4
K:C
[V: V1] "C7" E0 C0 _B,0
w: Mi Do Te

X:5
K:C
[V: V1] "F7" A,0 C0 F0
w: La Do Fa

X:6
K:C
[V: V1] "F7" C0 F0 A0
w: Do Fa La

X:7
K:C
[V: V1] "C7" G0 C0 E0
w: So Do Mi

X:8
K:C
[V: V1] "C7" G0 E0 C0
w: So Mi Do

X:9
K:C
[V: V1] "G7" B,0 D0 B,0 G,0
w: Ti Re Ti So

X:10
K:C
[V: V1] "G7" B,0 G,0 F,0
w: Ti So Fa

X:11
K:C
[V: V1] "C7" E,0 G,0 C0
w: Mi So Do

X:12
K:C
[V: V1] "C7" C0 E0 C0
w: Do Mi Do
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 3: C Instruments (GIA, 2010), Unit 2 "Transformation", Echo Tonal Patterns (Major, with supertonic, mediant, submediant, diminished, augmented and secondary-dominant chords, Bb major): written out with solfège on p. x (there in two octaves where a pattern is stacked; the lower is used here; directions of the steps read from the staff).
// Written there with Bb = DO, here C = DO. Chords are the book's.
"dmti3-unit2-tonal":
`X:1
K:C
[V: V1] "C" c0 G0 E0 c0
w: Do So Mi Do

X:2
K:C
[V: V1] "Am7" A0 c0 A0 G0 E0
w: La Do La So Mi

X:3
K:C
[V: V1] "Dm7" F0 D0 C0 D0
w: Fa Re Do Re

X:4
K:C
[V: V1] "G7" B,0 D0 F0 A0 G0
w: Ti Re Fa La So

X:5
K:C
[V: V1] "Em7" E0 G0 B0 d0
w: Mi So Ti Re

X:6
K:C
[V: V1] "A7" ^c0 e0 A0 G0
w: Di Mi La So

X:7
K:C
[V: V1] "Dm7" F0 A0 c0 e0
w: Fa La Do Mi

X:8
K:C
[V: V1] "Gaug7" ^d0 B0 G0 F0
w: Ri Ti So Fa

X:9
K:C
[V: V1] "C6/9" E0 G0 A0 d0 c0
w: Mi So La Re Do

X:10
K:C
[V: V1] "C7" _e0 =e0 _e0 ^c0 =c0 _B0
w: Me Mi Me Di Do Te

X:11
K:C
[V: V1] "F" A0 c0 F0
w: La Do Fa

X:12
K:C
[V: V1] "Gbdim7" ^F0 A0 c0 _e0
w: Fi La Do Me

X:13
K:C
[V: V1] "C/G" e0 c0 G0
w: Mi Do So

X:14
K:C
[V: V1] "A7(b9)" E0 G0 _B0 ^c0
w: Mi So Te Di

X:15
K:C
[V: V1] "Dm7" d0 c0 A0 F0 A0
w: Re Do La Fa La

X:16
K:C
[V: V1] "G7" _B0 _A0 G0 F0
w: Te Le So Fa

X:17
K:C
[V: V1] "C" E0 G0 c0
w: Mi So Do

X:18
K:C
[V: V1] "E7" B0 ^G0 E0 D0
w: Ti Si Mi Re

X:19
K:C
[V: V1] "A7" ^C0 E0 A0 G0
w: Di Mi La So

X:20
K:C
[V: V1] "D7" ^F0 A0 c0
w: Fi La Do

X:21
K:C
[V: V1] "G7" B0 d0 G0 F0
w: Ti Re So Fa

X:22
K:C
[V: V1] "Dm7" F0 A0 c0 d0
w: Fa La Do Re

X:23
K:C
[V: V1] "G7" B0 A0 G0 ^F0 =F0
w: Ti La So Fi Fa

X:24
K:C
[V: V1] "C" E0 G0 B0 d0 c0
w: Mi So Ti Re Do
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 3: C Instruments (GIA, 2010), Unit 3 "Red Wings", Echo Tonal Patterns (Major, with supertonic, half-diminished mediant, diminished, subtonic and secondary-dominant chords, F major): written out with solfège on p. xi (there in two octaves where a pattern is stacked; the lower is used here; directions of the steps read from the staff).
// Written there with F = DO, here C = DO. Chords are the book's.
"dmti3-unit3-tonal":
`X:1
K:C
[V: V1] "C" C0 E0 G0
w: Do Mi So

X:2
K:C
[V: V1] "Dm7" A0 F0 D0 C0
w: La Fa Re Do

X:3
K:C
[V: V1] "G7" B,0 D0 G,0
w: Ti Re So

X:4
K:C
[V: V1] "C" C0 G,0 D0 C0
w: Do So Re Do

X:5
K:C
[V: V1] "Ebdim(Maj7)" D0 _E0 C0 A,0 ^F,0
w: Re Me Do La Fi

X:6
K:C
[V: V1] "Dm7" A,0 C0 D0 F0
w: La Do Re Fa

X:7
K:C
[V: V1] "G7" G0 F0 D0 B,0
w: So Fa Re Ti

X:8
K:C
[V: V1] "Dm7" D0 F0 D0 C0
w: Re Fa Re Do

X:9
K:C
[V: V1] "A7" A,0 ^C0 E0 G0
w: La Di Mi So

X:10
K:C
[V: V1] "Dm7" F0 D0 C0
w: Fa Re Do

X:11
K:C
[V: V1] "G7" B,0 D0 G0 F0
w: Ti Re So Fa

X:12
K:C
[V: V1] "Dm7" A0 F0 D0 C0
w: La Fa Re Do

X:13
K:C
[V: V1] "G7" B,0 A0 G0 F0
w: Ti La So Fa

X:14
K:C
[V: V1] "CMaj7" E0 G0 B,0 C0
w: Mi So Ti Do

X:15
K:C
[V: V1] "C9" E0 G0 D0 C0 _B,0
w: Mi So Re Do Te

X:16
K:C
[V: V1] "Bb9" D0 F0 C0 _B,0 _A,0
w: Re Fa Do Te Le

X:17
K:C
[V: V1] "A7" G,0 A,0 ^C0 E0
w: So La Di Mi

X:18
K:C
[V: V1] "Dm7" D0 F0 C0 A,0
w: Re Fa Do La

X:19
K:C
[V: V1] "G7" B,0 D0 F0
w: Ti Re Fa

X:20
K:C
[V: V1] "Em7(b5)" G0 E0 D0 _B,0
w: So Mi Re Te

X:21
K:C
[V: V1] "A7" A,0 ^C0 A,0 G,0
w: La Di La So

X:22
K:C
[V: V1] "Dm7" F,0 A,0 D0 C0
w: Fa La Re Do

X:23
K:C
[V: V1] "G7" B,0 D0 G,0 F,0
w: Ti Re So Fa

X:24
K:C
[V: V1] "C6" E,0 G,0 A,0 C0
w: Mi So La Do
`,

// Grunow, Gordon, Azzara, Jump Right In: The Instrumental Series, Recorder Teacher's Guide (GIA, 1999), Tonal Patterns from Student Book Two, printed p. 321 (PDF p. 322), 'Tonic, Dominant, Subdominant Functions in Major Tonality', 3-note and 2-note patterns (16), C = DO as printed.
// Pattern lists read from the page images; chord symbols are not printed above individual patterns, so each is inferred from the function (tonic / dominant / subdominant / subtonic) the pattern's pitches belong to.
"jri-recorder-tonal-major-tds-2-3":
`X:1
K:C
[V: V1] "C" c0 G0 E0
w: Do So Mi

X:2
K:C
[V: V1] "F" F0 A0 c0
w: Fa La Do

X:3
K:C
[V: V1] "G7" B0 d0 G0
w: Ti Re So

X:4
K:C
[V: V1] "C" c0 G0 c0
w: Do So Do

X:5
K:C
[V: V1] "C" e0 c0 G0
w: Mi Do So

X:6
K:C
[V: V1] "F" A0 F0 c0
w: La Fa Do

X:7
K:C
[V: V1] "G7" B0 G0 F0
w: Ti So Fa

X:8
K:C
[V: V1] "C" E0 G0 c0
w: Mi So Do

X:9
K:C
[V: V1] "C" c0 G0
w: Do So

X:10
K:C
[V: V1] "F" F0 A0
w: Fa La

X:11
K:C
[V: V1] "G7" G0 B0
w: So Ti

X:12
K:C
[V: V1] "C" c0 e0
w: Do Mi

X:13
K:C
[V: V1] "C" e0 G0
w: Mi So

X:14
K:C
[V: V1] "F" c0 A0
w: Do La

X:15
K:C
[V: V1] "G7" B0 G0
w: Ti So

X:16
K:C
[V: V1] "C" E0 c0
w: Mi Do
`,

// Grunow, Gordon, Azzara, Jump Right In: The Instrumental Series, Recorder Teacher's Guide (GIA, 1999), Tonal Patterns from Student Book Two, printed p. 321 (PDF p. 322), 'Tonic, Dominant, Subdominant Functions in Major Tonality', 2-, 3-, 4- and 5-note patterns (12), C = DO as printed.
// Pattern lists read from the page images; chord symbols are not printed above individual patterns, so each is inferred from the function (tonic / dominant / subdominant / subtonic) the pattern's pitches belong to.
"jri-recorder-tonal-major-tds-2-5":
`X:1
K:C
[V: V1] "C" C0 E0 G0
w: Do Mi So

X:2
K:C
[V: V1] "F" F0 C0 A0
w: Fa Do La

X:3
K:C
[V: V1] "G7" G0 F0 D0 B0
w: So Fa Re Ti

X:4
K:C
[V: V1] "C" c0 G0
w: Do So

X:5
K:C
[V: V1] "F" F0 A0 C0 A0 F0
w: Fa La Do La Fa

X:6
K:C
[V: V1] "C" E0 G0 E0 C0
w: Mi So Mi Do

X:7
K:C
[V: V1] "G7" D0 F0 G0 B0
w: Re Fa So Ti

X:8
K:C
[V: V1] "C" c0 e0 G0
w: Do Mi So

X:9
K:C
[V: V1] "G7" B0 G0 F0 D0
w: Ti So Fa Re

X:10
K:C
[V: V1] "C" E0 G0 c0 E0 G0
w: Mi So Do Mi So

X:11
K:C
[V: V1] "G7" F0 B0
w: Fa Ti

X:12
K:C
[V: V1] "C" c0 G0 c0
w: Do So Do
`,

// Grunow, Gordon, Azzara, Jump Right In: The Instrumental Series, Recorder Teacher's Guide (GIA, 1999), Student Book One lesson plan, 'Tonal Pattern Echoes - Singing' (neutral syllable p. 46, solfege p. 47; PDF pp. 47-48), tonic and dominant patterns in G major (DO = G) in the 'familiar order' of the Student Book One CD (track 11/12), 3-note then 2-note (16). The 'unfamiliar order' list on p. 47-48 (PDF 048-049) is the same patterns rearranged (not repeated). Chords G / D7 from the establishing progression printed with it; per-pattern chord inferred.
// Pattern lists read from the page images; chord symbols are not printed above individual patterns, so each is inferred from the function (tonic / dominant / subdominant / subtonic) the pattern's pitches belong to.
"jri-recorder-tonal-major-td-sb1":
`X:1
K:C
[V: V1] "C" c0 e0 c0
w: Do Mi Do

X:2
K:C
[V: V1] "G7" d0 B0 d0
w: Re Ti Re

X:3
K:C
[V: V1] "C" c0 G0 c0
w: Do So Do

X:4
K:C
[V: V1] "G7" d0 B0 G0
w: Re Ti So

X:5
K:C
[V: V1] "G7" G0 d0 B0
w: So Re Ti

X:6
K:C
[V: V1] "C" c0 e0 g0
w: Do Mi So

X:7
K:C
[V: V1] "G7" g0 f0 d0
w: So Fa Re

X:8
K:C
[V: V1] "C" c0 e0 c0
w: Do Mi Do

X:9
K:C
[V: V1] "C" c0 e0
w: Do Mi

X:10
K:C
[V: V1] "G7" d0 g0
w: Re So

X:11
K:C
[V: V1] "G7" g0 f0
w: So Fa

X:12
K:C
[V: V1] "G7" f0 d0
w: Fa Re

X:13
K:C
[V: V1] "C" c0 g0
w: Do So

X:14
K:C
[V: V1] "G7" g0 B0
w: So Ti

X:15
K:C
[V: V1] "G7" d0 f0
w: Re Fa

X:16
K:C
[V: V1] "C" e0 c0
w: Mi Do
`,

// Familiar Patterns in a Familiar Order (FPIFO), Dorian: Mullen, The Literate Musician, 2nd ed., p. 22 ("Dorian Tonality, Reference Information"). The book prints it in C Dorian
// (two flats, RE = C, DO = Bb), which is the C = RE written here (K:Cdor). Chords as the book's i / VII / IV marks (Cm, Bb, F).
"mullen-fpifo-dorian":
`X:1
K:Cdor
[V: V1] "Cm" C0 E0
w: Re Fa

X:2
K:Cdor
[V: V1] "Cm" G0 C0
w: La Re

X:3
K:Cdor
[V: V1] "Bb" B,0 D0
w: Do Mi

X:4
K:Cdor
[V: V1] "Cm" E0 C0
w: Fa Re

X:5
K:Cdor
[V: V1] "Cm" C0 E0 G0
w: Re Fa La

X:6
K:Cdor
[V: V1] "F" F0 A0 c0
w: So Ti Re

X:7
K:Cdor
[V: V1] "Cm" c0 G0 C0
w: Re La Re

X:8
K:Cdor
[V: V1] "Bb" B,0 D0 F0
w: Do Mi So

X:9
K:Cdor
[V: V1] "Cm" E0 G0 C0
w: Fa La Re

X:10
K:Cdor
[V: V1] "F" F0 A0 F0
w: So Ti So

X:11
K:Cdor
[V: V1] "Cm" G0 C0 E0
w: La Re Fa

X:12
K:Cdor
[V: V1] "Bb" F0 D0 B,0
w: So Mi Do

X:13
K:Cdor
[V: V1] "Cm" C0 E0 c0 C0
w: Re Fa Re Re
`,

// FPIFO, Mixolydian: Mullen, The Literate Musician, 2nd ed., p. 23. The book prints it with one flat (DO = F, SO = C); written here with SO = C (K:Cmix, DO = F). Chords as the book's I / VII / IV marks
// (C, Bb, F). Printed solfege typos corrected from the notes: pattern 9 printed "so ti ri" (notes C E G = so ti re), pattern 10 printed "do la do" (notes F A F = do mi do).
"mullen-fpifo-mixolydian":
`X:1
K:Cmix
[V: V1] "C" C0 E0
w: So Ti

X:2
K:Cmix
[V: V1] "C" G0 C0
w: Re So

X:3
K:Cmix
[V: V1] "Bb" B,0 D0
w: Fa La

X:4
K:Cmix
[V: V1] "C" E0 C0
w: Ti So

X:5
K:Cmix
[V: V1] "C" C0 E0 G0
w: So Ti Re

X:6
K:Cmix
[V: V1] "Bb" F0 D0 B,0
w: Do La Fa

X:7
K:Cmix
[V: V1] "C" C0 G0 E0
w: So Re Ti

X:8
K:Cmix
[V: V1] "F" F0 c0 A0
w: Do So Mi

X:9
K:Cmix
[V: V1] "C" c0 E0 G0
w: So Ti Re

X:10
K:Cmix
[V: V1] "F" F0 A0 F0
w: Do Mi Do

X:11
K:Cmix
[V: V1] "C" E0 c0 E0
w: Ti So Ti

X:12
K:Cmix
[V: V1] "Bb" D0 B0 D0
w: La Fa La

X:13
K:Cmix
[V: V1] "C" c0 G0 E0 C0
w: So Re Ti So
`,

// FPIFO, Phrygian: Mullen, The Literate Musician, 2nd ed., p. 24. The book prints it in C Phrygian (four flats, MI = C, DO = Ab), written here with MI = C (K:Cphr).
// Chords as the book's i / vii / II / iv marks (Cm, Bbm, Db, Fm). Pattern 8 (iv) is printed "la fa la" but the notes F Ab F read la do la.
"mullen-fpifo-phrygian":
`X:1
K:Cphr
[V: V1] "Cm" C0 E0
w: Mi So

X:2
K:Cphr
[V: V1] "Cm" G0 C0
w: Ti Mi

X:3
K:Cphr
[V: V1] "Bbm" B,0 D0
w: Re Fa

X:4
K:Cphr
[V: V1] "Cm" E0 C0
w: So Mi

X:5
K:Cphr
[V: V1] "Cm" C0 E0 G0
w: Mi So Ti

X:6
K:Cphr
[V: V1] "Db" D0 F0 A0
w: Fa La Do

X:7
K:Cphr
[V: V1] "Cm" G0 E0 C0
w: Ti So Mi

X:8
K:Cphr
[V: V1] "Fm" F0 A0 F0
w: La Do La

X:9
K:Cphr
[V: V1] "Cm" E0 G0 C0
w: So Ti Mi

X:10
K:Cphr
[V: V1] "Bbm" F0 D0 B,0
w: La Fa Re

X:11
K:Cphr
[V: V1] "Cm" C0 E0 G0 c0
w: Mi So Ti Mi

X:12
K:Cphr
[V: V1] "Db" d0 F0
w: Fa La

X:13
K:Cphr
[V: V1] "Cm" c0 E0
w: Mi So

X:14
K:Cphr
[V: V1] "Bbm" B0 D0
w: Re Fa

X:15
K:Cphr
[V: V1] "Cm" C0 G0 E0 c0
w: Mi Ti So Mi
`,

// FPIFO, Lydian: Mullen, The Literate Musician, 2nd ed., p. 25. The book prints it with one sharp (DO = G, FA = C); written here with FA = C (K:Clyd, DO = G).
// Chords as the book's I / II / V marks (C, D, G).
"mullen-fpifo-lydian":
`X:1
K:Clyd
[V: V1] "C" C0 E0
w: Fa La

X:2
K:Clyd
[V: V1] "C" G0 C0
w: Do Fa

X:3
K:Clyd
[V: V1] "D" D0 F0
w: So Ti

X:4
K:Clyd
[V: V1] "C" E0 C0
w: La Fa

X:5
K:Clyd
[V: V1] "C" C0 E0 G0
w: Fa La Do

X:6
K:Clyd
[V: V1] "D" D0 F0 A0
w: So Ti Re

X:7
K:Clyd
[V: V1] "G" G0 B0 D0 G0
w: Do Mi So Do

X:8
K:Clyd
[V: V1] "C" E0 G0 C0
w: La Do Fa

X:9
K:Clyd
[V: V1] "D" F0 A0 D0
w: Ti Re So

X:10
K:Clyd
[V: V1] "G" G0 B,0 G0
w: Do Mi Do

X:11
K:Clyd
[V: V1] "C" C0 G0
w: Fa Do

X:12
K:Clyd
[V: V1] "D" A0 F0
w: Re Ti

X:13
K:Clyd
[V: V1] "C" E0 c0
w: La Fa

X:14
K:Clyd
[V: V1] "D" F0 d0
w: Ti So

X:15
K:Clyd
[V: V1] "C" c0 E0 G0 C0
w: Fa La Do Fa
`,

// FPIFO, Aeolian: Mullen, The Literate Musician, 2nd ed., p. 26. The book prints it in C Aeolian (three flats, LA = C, DO = Eb), written here with LA = C (K:Cm); no raised 7th (SI) in this set.
// Chords as the book's i / VII / VI / iv / III marks (Cm, Bb, Ab, Fm, Eb).
"mullen-fpifo-aeolian":
`X:1
K:Cm
[V: V1] "Cm" C0 E0
w: La Do

X:2
K:Cm
[V: V1] "Cm" G0 C0
w: Mi La

X:3
K:Cm
[V: V1] "Bb" B,0 D0
w: So Ti

X:4
K:Cm
[V: V1] "Cm" E0 C0
w: Do La

X:5
K:Cm
[V: V1] "Ab" A,0 C0 E0
w: Fa La Do

X:6
K:Cm
[V: V1] "Bb" B,0 D0 F0
w: So Ti Re

X:7
K:Cm
[V: V1] "Cm" C0 E0 G0
w: La Do Mi

X:8
K:Cm
[V: V1] "Eb" E0 B0 G0
w: Do So Mi

X:9
K:Cm
[V: V1] "Bb" D0 B0 F0
w: Ti So Re

X:10
K:Cm
[V: V1] "Cm" E0 G0 C0
w: Do Mi La

X:11
K:Cm
[V: V1] "Fm" F0 A0 F0
w: Re Fa Re

X:12
K:Cm
[V: V1] "Cm" E0 c0 E0
w: Do La Do

X:13
K:Cm
[V: V1] "Bb" D0 B0 D0
w: Ti So Ti

X:14
K:Cm
[V: V1] "Cm" C0 c0 E0 C0
w: La La Do La
`,

// FPIFO, Locrian: Mullen, The Literate Musician, 2nd ed., p. 27. The book prints it in C Locrian (five flats, TI = C, DO = Db), written here with TI = C (K:Cloc). The two
// stepwise patterns the book places in the same box (marked "Stepwise", no chord) are patterns 8 and 9. Chords as the book's i-dim / vii marks (Cdim, Bbm).
"mullen-fpifo-locrian":
`X:1
K:Cloc
[V: V1] "Cdim" C0 E0
w: Ti Re

X:2
K:Cloc
[V: V1] "Cdim" G0 C0
w: Fa Ti

X:3
K:Cloc
[V: V1] "Bbm" B,0 D0
w: La Do

X:4
K:Cloc
[V: V1] "Cdim" E0 C0
w: Re Ti

X:5
K:Cloc
[V: V1] "Cdim" C0 E0 G0
w: Ti Re Fa

X:6
K:Cloc
[V: V1] "Bbm" F0 D0 B,0
w: Mi Do La

X:7
K:Cloc
[V: V1] "Cdim" C0 G0 C0
w: Ti Fa Ti

X:8
K:Cloc
[V: V1] C0 D0 E0 F0 G0
w: Ti Do Re Mi Fa

X:9
K:Cloc
[V: V1] G0 F0 E0 D0 C0
w: Fa Mi Re Do Ti

X:10
K:Cloc
[V: V1] "Bbm" D0 B,0 F0
w: Do La Mi

X:11
K:Cloc
[V: V1] "Cdim" E0 G0 C0
w: Re Fa Ti
`,

// Major Subdominant FPIFO (I, IV, V): Mullen, The Literate Musician, 2nd ed., p. 293 (Lesson 10.4). "In the key of C" as printed; no transposition. Chords as the book's I / IV / V marks (V written G7).
"mullen-subdominant-major":
`X:1
K:C
[V: V1] "C" C0 E0 G0
w: Do Mi So

X:2
K:C
[V: V1] "F" F0 A0 c0
w: Fa La Do

X:3
K:C
[V: V1] "G7" G0 B0 d0
w: So Ti Re

X:4
K:C
[V: V1] "C" c0 G0 E0 C0
w: Do So Mi Do

X:5
K:C
[V: V1] "F" F0 A0 C0
w: Fa La Do

X:6
K:C
[V: V1] "G7" G0 F0 D0 B,0
w: So Fa Re Ti

X:7
K:C
[V: V1] "C" C0 c0 C0
w: Do Do Do

X:8
K:C
[V: V1] "F" F0 c0
w: Fa Do

X:9
K:C
[V: V1] "C" E0 c0
w: Mi Do

X:10
K:C
[V: V1] "G7" D0 B0
w: Re Ti

X:11
K:C
[V: V1] "F" A0 F0 c0
w: La Fa Do

X:12
K:C
[V: V1] "C" G0 E0 G0
w: So Mi So

X:13
K:C
[V: V1] "F" c0 F0 A0
w: Do Fa La

X:14
K:C
[V: V1] "G7" B0 G0 F0 D0
w: Ti So Fa Re

X:15
K:C
[V: V1] "C" c0 E0 G0 C0
w: Do Mi So Do
`,

// Minor Subdominant FPIFO (i, iv, V): Mullen, The Literate Musician, 2nd ed., p. 293 (Lesson 10.4). "In the key of C minor" (LA = C) as printed; no transposition. Chords as the book's
// i / iv / V marks (V written G7); SI is the raised 7th.
"mullen-subdominant-minor":
`X:1
K:Cm
[V: V1] "Cm" C0 E0 G0
w: La Do Mi

X:2
K:Cm
[V: V1] "Fm" F0 A0 c0
w: Re Fa La

X:3
K:Cm
[V: V1] "G7" G0 =B0 d0
w: Mi Si Ti

X:4
K:Cm
[V: V1] "Cm" c0 G0 E0 C0
w: La Mi Do La

X:5
K:Cm
[V: V1] "Fm" F0 A0 C0
w: Re Fa La

X:6
K:Cm
[V: V1] "G7" G0 F0 D0 =B,0
w: Mi Re Ti Si

X:7
K:Cm
[V: V1] "Cm" C0 c0 C0
w: La La La

X:8
K:Cm
[V: V1] "Fm" F0 c0
w: Re La

X:9
K:Cm
[V: V1] "Cm" E0 c0
w: Do La

X:10
K:Cm
[V: V1] "G7" D0 =B0
w: Ti Si

X:11
K:Cm
[V: V1] "Fm" A0 F0 c0
w: Fa Re La

X:12
K:Cm
[V: V1] "Cm" G0 E0 G0
w: Mi Do Mi

X:13
K:Cm
[V: V1] "Fm" c0 F0 A0
w: La Re Fa

X:14
K:Cm
[V: V1] "G7" =B0 G0 F0 D0
w: Si Mi Re Ti

X:15
K:Cm
[V: V1] "Cm" c0 E0 G0 C0
w: La Do Mi La
`,

// Reynolds, Valerio, Bolton, Taggart and Gordon, The Early Childhood Music Curriculum: Guide for Parents, Teachers and Caregivers (Music Play) (GIA, 1998), Part 6 'Developing a Repertoire of Tonal and Rhythm Patterns' (Gordon 1997 patterns), 'Tonal Acculturation Patterns without Words: Stages 1-3', printed p. 24 (PDF p. 28), D major (DO = D), 14 stepwise 3-note patterns; printed without syllables or chord symbols (the book says to transpose to the keyality of the preceding song). Sung on a neutral syllable.
"musicplay-acculturation-tonal-major":
`X:1
K:C
[V: V1] E0 D0 C0
w: Mi Re Do

X:2
K:C
[V: V1] G0 F0 E0
w: So Fa Mi

X:3
K:C
[V: V1] C0 D0 E0
w: Do Re Mi

X:4
K:C
[V: V1] E0 F0 G0
w: Mi Fa So

X:5
K:C
[V: V1] F0 E0 D0
w: Fa Mi Re

X:6
K:C
[V: V1] D0 E0 F0
w: Re Mi Fa

X:7
K:C
[V: V1] C0 D0 C0
w: Do Re Do

X:8
K:C
[V: V1] D0 C0 D0
w: Re Do Re

X:9
K:C
[V: V1] E0 D0 E0
w: Mi Re Mi

X:10
K:C
[V: V1] D0 E0 D0
w: Re Mi Re

X:11
K:C
[V: V1] F0 E0 F0
w: Fa Mi Fa

X:12
K:C
[V: V1] E0 F0 E0
w: Mi Fa Mi

X:13
K:C
[V: V1] G0 F0 G0
w: So Fa So

X:14
K:C
[V: V1] F0 G0 F0
w: Fa So Fa
`,

// Reynolds, Valerio, Bolton, Taggart and Gordon, The Early Childhood Music Curriculum: Guide for Parents, Teachers and Caregivers (Music Play) (GIA, 1998), Part 6 'Developing a Repertoire of Tonal and Rhythm Patterns' (Gordon 1997 patterns), 'Tonal Acculturation Patterns without Words: Stages 1-3', printed p. 24 (PDF p. 28), printed 'D Harmonic Minor' (one flat, LA = D, DO = F), 14 stepwise 3-note patterns; printed without syllables or chord symbols (the book says to transpose to the keyality of the preceding song). Sung on a neutral syllable.
"musicplay-acculturation-tonal-minor":
`X:1
K:Cm
[V: V1] E0 D0 C0
w: Do Ti La

X:2
K:Cm
[V: V1] G0 F0 E0
w: Mi Re Do

X:3
K:Cm
[V: V1] C0 D0 E0
w: La Ti Do

X:4
K:Cm
[V: V1] E0 F0 G0
w: Do Re Mi

X:5
K:Cm
[V: V1] F0 E0 D0
w: Re Do Ti

X:6
K:Cm
[V: V1] D0 E0 F0
w: Ti Do Re

X:7
K:Cm
[V: V1] C0 D0 C0
w: La Ti La

X:8
K:Cm
[V: V1] D0 C0 D0
w: Ti La Ti

X:9
K:Cm
[V: V1] E0 D0 E0
w: Do Ti Do

X:10
K:Cm
[V: V1] D0 E0 D0
w: Ti Do Ti

X:11
K:Cm
[V: V1] F0 E0 F0
w: Re Do Re

X:12
K:Cm
[V: V1] E0 F0 E0
w: Do Re Do

X:13
K:Cm
[V: V1] G0 F0 G0
w: Mi Re Mi

X:14
K:Cm
[V: V1] F0 G0 F0
w: Re Mi Re
`,

// Only the pattern of this set not already in the site (the other eleven are 323b). Grunow, Gordon, Azzara, Jump Right In: The Instrumental Series, Recorder Teacher's Guide (GIA, 1999), Tonal Patterns from Student Book Two, printed p. 323 (PDF p. 324), 'Tonic, Subtonic, and Subdominant Functions in Dorian Tonality', 2- to 5-note patterns (12), D Dorian (RE = D, DO = C) as printed.
// Pattern lists read from the page images; chord symbols are not printed above individual patterns, so each is inferred from the function (tonic / dominant / subdominant / subtonic) the pattern's pitches belong to.
"jri-recorder-tonal-dorian-tss-new":
`X:1
K:Cdor
[V: V1] "Cm" c0 G0 C0
w: Re La Re
`,

// Only the pattern of this set not already in the site (the others are in major-I-V). Reynolds, Valerio, Bolton, Taggart and Gordon, The Early Childhood Music Curriculum: Guide for Parents, Teachers and Caregivers (Music Play) (GIA, 1998), Part 6 'Developing a Repertoire of Tonal and Rhythm Patterns' (Gordon 1997 patterns), 'Tonal Imitation and Assimilation Patterns without Words: Stage 5', printed p. 28 (PDF p. 32), D major tonic and dominant (arpeggiated except so-fa); chords inferred.
"musicplay-imitation-tonal-stage5-major-new":
`X:1
K:C
[V: V1] "G7" G0 F0 B,0
w: So Fa Ti
`,

// Only the pattern of this set not already in the site (the others are in minor-i-V). Reynolds, Valerio, Bolton, Taggart and Gordon, The Early Childhood Music Curriculum: Guide for Parents, Teachers and Caregivers (Music Play) (GIA, 1998), Part 6 'Developing a Repertoire of Tonal and Rhythm Patterns' (Gordon 1997 patterns), 'Tonal Imitation and Assimilation Patterns without Words: Stage 5', printed p. 28 (PDF p. 32), harmonic minor tonic and dominant; labelled 'G Harmonic Minor' in the book but written with one flat (D minor, LA = D) and read here as D minor; chords inferred.
"musicplay-imitation-tonal-stage5-minor-new":
`X:1
K:Cm
[V: V1] "G7" G0 F0 =B,0
w: Mi Re Si
`,

};
