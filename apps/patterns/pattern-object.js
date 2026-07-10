// so much repeated nonsense! Get rid of it all except:
// X:
// K:
// (tune, without V)

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

// Patterns transcribed from "Jump Right In" Student Book Two, tonal register
// (source: pattern-pdfs/book 2 patterns.pdf). Keys are page numbers; where a
// page has multiple sections they're suffixed a/b in reading order.

// p322a: Tonic and Dominant Functions in Minor Tonality (D minor)
"322a":
`X:1
K:Dm
[V: V1] D0 F0 D0
w: La Do La

X:2
K:Dm
[V: V1] E0 ^C0 E0
w: Ti Si Ti

X:3
K:Dm
[V: V1] D0 F0 A0
w: La Do Mi

X:4
K:Dm
[V: V1] A0 G0 E0
w: Mi Re Ti

X:5
K:Dm
[V: V1] F0 A0 D0
w: Do Mi La

X:6
K:Dm
[V: V1] E0 ^C0 A0
w: Ti Si Mi

X:7
K:Dm
[V: V1] A0 ^C0 E0
w: Mi Si Ti

X:8
K:Dm
[V: V1] D0 F0 D0
w: La Do La

X:9
K:Dm
[V: V1] D0 F0
w: La Do

X:10
K:Dm
[V: V1] E0 A0
w: Ti Mi

X:11
K:Dm
[V: V1] A0 G0
w: Mi Re

X:12
K:Dm
[V: V1] G0 E0
w: Re Ti

X:13
K:Dm
[V: V1] D0 A0
w: La Mi

X:14
K:Dm
[V: V1] A0 ^C0
w: Mi Si

X:15
K:Dm
[V: V1] E0 G0
w: Ti Re

X:16
K:Dm
[V: V1] F0 D0
w: Do La
`,

// p322b: Tonic, Dominant, and Subdominant Functions in Minor Tonality (D minor)
"322b":
`X:1
K:Dm
[V: V1] D0 A0 F0
w: La Mi Do

X:2
K:Dm
[V: V1] G0 _B0 d0
w: Re Fa La

X:3
K:Dm
[V: V1] ^c0 A0 E0
w: Si Mi Ti

X:4
K:Dm
[V: V1] D0 F0 A0
w: La Do Mi

X:5
K:Dm
[V: V1] G0 _B0 G0
w: Re Fa Re

X:6
K:Dm
[V: V1] A0 ^c0 e0
w: Mi Si Ti

X:7
K:Dm
[V: V1] ^c0 e0 A0
w: Si Ti Mi

X:8
K:Dm
[V: V1] d0 A0 D0
w: La Mi La

X:9
K:Dm
[V: V1] D0 A0
w: La Mi

X:10
K:Dm
[V: V1] F0 D0
w: Do La

X:11
K:Dm
[V: V1] D0 G0
w: La Re

X:12
K:Dm
[V: V1] _B0 G0
w: Fa Re

X:13
K:Dm
[V: V1] A0 ^c0
w: Mi Si

X:14
K:Dm
[V: V1] d0 A0
w: La Mi

X:15
K:Dm
[V: V1] G0 _B0
w: Re Fa

X:16
K:Dm
[V: V1] A0 d0
w: Mi La
`,

// p323a: Tonic and Subtonic Functions in Dorian Tonality (D Dorian)
"323a":
`X:1
K:Ddor
[V: V1] D0 F0 D0
w: Re Fa Re

X:2
K:Ddor
[V: V1] C0 E0 G0
w: Do Mi So

X:3
K:Ddor
[V: V1] E0 G0 C0 E0
w: Mi So Do Mi

X:4
K:Ddor
[V: V1] D0 F0 A0
w: Re Fa La

X:5
K:Ddor
[V: V1] A0 F0 D0 F0
w: La Fa Re Fa

X:6
K:Ddor
[V: V1] E0 G0 E0 C0 E0
w: Mi So Mi Do Mi

X:7
K:Ddor
[V: V1] E0 G0
w: Mi So

X:8
K:Ddor
[V: V1] F0 A0 D0 F0 D0
w: Fa La Re Fa Re

X:9
K:Ddor
[V: V1] C0 G0 E0 C0
w: Do So Mi Do

X:10
K:Ddor
[V: V1] D0 F0
w: Re Fa

X:11
K:Ddor
[V: V1] C0 E0
w: Do Mi

X:12
K:Ddor
[V: V1] D0 F0 A0 F0 D0
w: Re Fa La Fa Re
`,

// p323b: Tonic, Subtonic, and Subdominant Functions in Dorian Tonality (D Dorian)
"323b":
`X:1
K:Ddor
[V: V1] D0 A0 D0
w: Re La Re

X:2
K:Ddor
[V: V1] G0 E0
w: So Mi

X:3
K:Ddor
[V: V1] D0 F0 A0 F0
w: Re Fa La Fa

X:4
K:Ddor
[V: V1] D0 G0 B0 D0
w: Re So Ti Re

X:5
K:Ddor
[V: V1] E0 C0 E0 G0 E0
w: Mi Do Mi So Mi

X:6
K:Ddor
[V: V1] F0 D0 A0
w: Fa Re La

X:7
K:Ddor
[V: V1] G0 D0 B0 G0 D0
w: So Re Ti So Re

X:8
K:Ddor
[V: V1] A0 F0
w: La Fa

X:9
K:Ddor
[V: V1] G0 E0 C0 E0
w: So Mi Do Mi

X:10
K:Ddor
[V: V1] D0 F0 A0 D0 F0
w: Re Fa La Re Fa

X:11
K:Ddor
[V: V1] G0 C0 E0
w: So Do Mi

X:12
K:Ddor
[V: V1] F0 D0
w: Fa Re
`,

// p324a: Tonic and Subtonic Functions in Mixolydian Tonality (G Mixolydian)
"324a":
`X:1
K:Gmix
[V: V1] G0 B0 G0
w: So Ti So

X:2
K:Gmix
[V: V1] F0 A0 c0
w: Fa La Do

X:3
K:Gmix
[V: V1] A0 c0 F0 A0
w: La Do Fa La

X:4
K:Gmix
[V: V1] G0 B0 d0
w: So Ti Re

X:5
K:Gmix
[V: V1] d0 B0 G0 B0
w: Re Ti So Ti

X:6
K:Gmix
[V: V1] A0 c0 A0 F0 A0
w: La Do La Fa La

X:7
K:Gmix
[V: V1] A0 c0
w: La Do

X:8
K:Gmix
[V: V1] B0 d0 G0 B0 G0
w: Ti Re So Ti So

X:9
K:Gmix
[V: V1] F0 c0 A0 F0
w: Fa Do La Fa

X:10
K:Gmix
[V: V1] G0 B0
w: So Ti

X:11
K:Gmix
[V: V1] F0 A0
w: Fa La

X:12
K:Gmix
[V: V1] G0 B0 d0 B0 G0
w: So Ti Re Ti So
`,

// p324b: Tonic, Subtonic, and Subdominant Functions in Mixolydian Tonality (G Mixolydian)
"324b":
`X:1
K:Gmix
[V: V1] G0 d0 B0
w: So Re Ti

X:2
K:Gmix
[V: V1] c0 A0
w: Do La

X:3
K:Gmix
[V: V1] G0 B0 d0 B0
w: So Ti Re Ti

X:4
K:Gmix
[V: V1] G0 c0 e0 G0
w: So Do Mi So

X:5
K:Gmix
[V: V1] A0 F0 A0 c0 A0
w: La Fa La Do La

X:6
K:Gmix
[V: V1] B0 G0 d0
w: Ti So Re

X:7
K:Gmix
[V: V1] c0 G0 e0 c0 G0
w: Do So Mi Do So

X:8
K:Gmix
[V: V1] d0 B0
w: Re Ti

X:9
K:Gmix
[V: V1] c0 A0 F0 A0
w: Do La Fa La

X:10
K:Gmix
[V: V1] G0 B0 d0 G0 B0
w: So Ti Re So Ti

X:11
K:Gmix
[V: V1] c0 F0 A0
w: Do Fa La

X:12
K:Gmix
[V: V1] B0 G0
w: Ti So
`,

// Patterns transcribed from "Jump Right In" Tonal Register Book One
// (source: pattern-pdfs/JRI Tonal Register Analysis.docx, a text transcription
// of pattern-pdfs/"JRI Tonal Register LSAs Book 1 FULL...pdf"). Keys are the book's
// own Unit-Section-Criterion codes (e.g. "1A1" = Unit 1, Section A, Criterion 1),
// prefixed t1- for "tonal book 1". Octave placement uses a closest-voice-leading
// heuristic (each note placed nearest the previous), not verified against the
// original engraving note-by-note -- spot check before relying on exact octaves.

"t1-1A1":
`X:1
K:D
[V: V1] D0 F0
w: Do Mi

X:2
K:D
[V: V1] A0 F0 D0
w: So Mi Do

X:3
K:D
[V: V1] A0 d0 f0
w: So Do Mi
`,

"t1-1A2":
`X:1
K:D
[V: V1] A0 d0
w: So Do

X:2
K:D
[V: V1] A0 E0 A0
w: So Re So

X:3
K:D
[V: V1] C0 A,0 E,0
w: Ti So Re
`,

"t1-1A3":
`X:1
K:D
[V: V1] D0 F0 A0
w: Do Mi So

X:2
K:D
[V: V1] A0 F0 A0
w: So Mi So

X:3
K:D
[V: V1] D0 F0 D0
w: Do Mi Do
`,

"t1-1B1":
`X:1
K:Dm
[V: V1] F0 D0 A,0
w: Do La Mi

X:2
K:Dm
[V: V1] A0 ^c0
w: Mi Si

X:3
K:Dm
[V: V1] A0 E0 ^C0
w: Mi Ti Si
`,

"t1-1B2":
`X:1
K:Dm
[V: V1] ^C0 A,0
w: Si Mi

X:2
K:Dm
[V: V1] D0 A,0 F,0
w: La Mi Do

X:3
K:Dm
[V: V1] F0 A0
w: Do Mi
`,

"t1-1B3":
`X:1
K:Dm
[V: V1] A0 F0 A0
w: Mi Do Mi

X:2
K:Dm
[V: V1] E0 ^C0 A,0
w: Ti Si Mi

X:3
K:Dm
[V: V1] D0 F0 A0
w: La Do Mi
`,

"t1-2A1":
`X:1
K:F
[V: V1] F0 A0 c0
w: Do Mi So

X:2
K:F
[V: V1] C0 G,0 C0
w: So Re So

X:3
K:F
[V: V1] C0 A,0 F,0
w: So Mi Do
`,

"t1-2A2":
`X:1
K:Dm
[V: V1] F0 D0 A,0
w: Do La Mi

X:2
K:Dm
[V: V1] E0 ^C0 A,0
w: Ti Si Mi

X:3
K:Dm
[V: V1] F0 A0
w: Do Mi
`,

"t1-2B1":
`X:1
K:D
[V: V1] D0 F0
w: Do Mi

X:2
K:D
[V: V1] A0 F0 D0
w: So Mi Do

X:3
K:D
[V: V1] A0 d0 f0
w: So Do Mi
`,

"t1-2B2":
`X:1
K:D
[V: V1] A0 F0
w: So Mi

X:2
K:D
[V: V1] A0 E0 A0
w: So Re So

X:3
K:D
[V: V1] C0 F0 E0
w: Ti Mi Re
`,

"t1-2B3":
`X:1
K:D
[V: V1] D0 F0 A0
w: Do Mi So

X:2
K:D
[V: V1] A0 F0 A0
w: So Mi So

X:3
K:D
[V: V1] D0 F0 D0
w: Do Mi Do
`,

"t1-2C1":
`X:1
K:Dm
[V: V1] F0 D0 A,0
w: Do La Mi

X:2
K:Dm
[V: V1] A0 ^c0
w: Mi Si

X:3
K:Dm
[V: V1] A0 E0 ^C0
w: Mi Ti Si
`,

"t1-2C2":
`X:1
K:Dm
[V: V1] ^C0 A,0
w: Si Mi

X:2
K:Dm
[V: V1] D0 A,0 F,0
w: La Mi Do

X:3
K:Dm
[V: V1] F0 A0
w: Do Mi
`,

"t1-2C3":
`X:1
K:Dm
[V: V1] A0 F0 A0
w: Mi Do Mi

X:2
K:Dm
[V: V1] E0 ^C0 A,0
w: Ti Si Mi

X:3
K:Dm
[V: V1] D0 F0 A0
w: La Do Mi
`,

"t1-3A1":
`X:1
K:F
[V: V1] A0 c0
w: Mi So

X:2
K:F
[V: V1] A0 F0 A0
w: Mi Do Mi

X:3
K:F
[V: V1] C0 F0 A0
w: So Do Mi
`,

"t1-3A2":
`X:1
K:Dm
[V: V1] D0 A,0 D0
w: La Mi La

X:2
K:Dm
[V: V1] D0 A,0
w: La Mi

X:3
K:Dm
[V: V1] D0 A,0 D0
w: La Mi La
`,

"t1-3B1":
`X:1
K:D
[V: V1] E0 C0 F0
w: Re Ti Mi

X:2
K:D
[V: V1] D0 F0 D0
w: Do Mi Do

X:3
K:D
[V: V1] E0 G0 A0 c0
w: Re Fa So Ti
`,

"t1-3B2":
`X:1
K:Bm
[V: V1] F0 ^A0 c0
w: Mi Si Ti

X:2
K:Bm
[V: V1] F0 B0 d0
w: Mi La Do

X:3
K:Bm
[V: V1] D0 B,0 D0
w: Do La Do
`,

"t1-4A1":
`X:1
K:Bb
[V: V1] C0 A,0
w: Re Ti

X:2
K:Bb
[V: V1] B0 d0 f0
w: Do Mi So

X:3
K:Bb
[V: V1] C0 A,0 F,0
w: Re Ti So
`,

"t1-4A2":
`X:1
K:Bb
[V: V1] D0 F0 D0
w: Mi So Mi

X:2
K:Bb
[V: V1] D0 B,0 F,0
w: Mi Do So
`,

"t1-4B1":
`X:1
K:Dm
[V: V1] ^C0 E0 A0
w: Si Ti Mi

X:2
K:Dm
[V: V1] E0 A0 ^c0
w: Ti Mi Si

X:3
K:Dm
[V: V1] D0 D0 F0
w: La La Do
`,

"t1-4B2":
`X:1
K:Dm
[V: V1] D0 D0 D0
w: La La La

X:2
K:Dm
[V: V1] D0 F0 D0
w: La Do La

X:3
K:Dm
[V: V1] D0 D0 A,0
w: La La Mi
`,

"t1-5A1":
`X:1
K:G
[V: V1] A0 F0
w: Re Ti

X:2
K:G
[V: V1] D0 F0 D0
w: So Ti So

X:3
K:G
[V: V1] F0 A0 c0 d0
w: Ti Re Fa So
`,

"t1-5A2":
`X:1
K:Gm
[V: V1] D0 D0 B,0
w: Mi Mi Do

X:2
K:Gm
[V: V1] A0 d0 A0
w: Ti Mi Ti

X:3
K:Gm
[V: V1] D0 D0 B,0
w: Mi Mi Do
`,

"t1-5B1":
`X:1
K:Bb
[V: V1] C0 A,0
w: Re Ti

X:2
K:Bb
[V: V1] B0 d0 f0
w: Do Mi So

X:3
K:Bb
[V: V1] C0 A,0 F,0
w: Re Ti So
`,

"t1-5B2":
`X:1
K:Bb
[V: V1] D0 F0 D0
w: Mi So Mi

X:2
K:Bb
[V: V1] D0 B,0 F,0
w: Mi Do So

X:3
K:Bb
[V: V1] A0 F0 A0
w: Ti So Ti
`,

"t1-5C1":
`X:1
K:Dm
[V: V1] ^C0 E0 A0
w: Si Ti Mi

X:2
K:Dm
[V: V1] E0 A0 ^c0
w: Ti Mi Si

X:3
K:Dm
[V: V1] D0 D0 F0
w: La La Do
`,

"t1-5C2":
`X:1
K:Dm
[V: V1] D0 D0 D0
w: La La La

X:2
K:Dm
[V: V1] D0 F0 D0
w: La Do La

X:3
K:Dm
[V: V1] D0 D0 A,0
w: La La Mi
`,

"t1-7A1":
`X:1
K:C
[V: V1] A0 F0 A0 G0 c0
w: La Fa La So Do

X:2
K:C
[V: V1] A0 c0 f0 c0 G0 E0
w: La Do Fa Do So Mi

X:3
K:C
[V: V1] C0 A,0 F,0 C,0 E,0 C,0
w: Do La Fa Do Mi Do
`,

"t1-7A2":
`X:1
K:C
[V: V1] F0 C0 G,0 G,0
w: Fa Do So So

X:2
K:C
[V: V1] C0 A,0 F,0 C,0 G,0 C0
w: Do La Fa Do So Do

X:3
K:C
[V: V1] C0 C0 F0 G0 c0 e0
w: Do Do Fa So Do Mi
`,

"t1-7B1":
`X:1
K:C
[V: V1] D0 F0 E0 C0 E0
w: Re Fa Mi Do Mi

X:2
K:C
[V: V1] A0 F0 D0 A,0 E,0 A,0
w: La Fa Re La Mi La

X:3
K:C
[V: V1] F0 A0 d0 c0 A0 c0
w: Fa La Re Do La Do
`,

"t1-7B2":
`X:1
K:Cm
[V: V1] A0 F0 C0 C0 G,0 C0
w: Fa Re La La Mi La

X:2
K:Cm
[V: V1] F0 A0 c0 e0 g0 c'0
w: Re Fa La Do Mi La

X:3
K:Cm
[V: V1] C0 A,0 C0 E0 C0 E0
w: La Fa La Do La Do
`,

"t1-8A1":
`X:1
K:C
[V: V1] A0 F0 A0 G0 c0
w: La Fa La So Do

X:2
K:C
[V: V1] A0 c0 f0 c0 G0 E0
w: La Do Fa Do So Mi

X:3
K:C
[V: V1] C0 A,0 F,0 C,0 E,0 C,0
w: Do La Fa Do Mi Do
`,

"t1-8A2":
`X:1
K:C
[V: V1] F0 C0 G,0 G,0
w: Fa Do So So

X:2
K:C
[V: V1] C0 A,0 F,0 C,0 E,0 C,0
w: Do La Fa Do Mi Do

X:3
K:C
[V: V1] C0 C0 F0 G0 c0 e0
w: Do Do Fa So Do Mi
`,

"t1-8B1":
`X:1
K:Cm
[V: V1] F0 A0 G0 E0 G0
w: Re Fa Mi Do Mi

X:2
K:Cm
[V: V1] C0 A,0 F,0 C,0 G,0 C0
w: La Fa Re La Mi La

X:3
K:Cm
[V: V1] A0 c0 f0 e0 c0 e0
w: Fa La Re Do La Do
`,

"t1-8B2":
`X:1
K:Cm
[V: V1] A0 F0 C0 C0 G,0 C0
w: Fa Re La La Mi La

X:2
K:Cm
[V: V1] F0 A0 c0 e0 g0 c'0
w: Re Fa La Do Mi La

X:3
K:Cm
[V: V1] C0 A,0 C0 E0 C0 E0
w: La Fa La Do La Do
`,

"t1-9A1":
`X:1
K:D
[V: V1] D0 B,0 F,0 D,0
w: Do La Mi Do

X:2
K:D
[V: V1] D0 B,0 F,0 A,0
w: Do La Mi So

X:3
K:D
[V: V1] D0 D0 B,0 C0 A,0 G,0 E,0
w: Do Do La Ti So Fa Re
`,

"t1-9A2":
`X:1
K:D
[V: V1] D0 B,0 D0 G0 D0
w: Do La Do Fa Do

X:2
K:D
[V: V1] D0 B,0 D0 D0 B,0 D0
w: Do La Do Do La Do

X:3
K:D
[V: V1] D0 B,0 G,0 E,0 C,0
w: Do La Fa Re Ti
`,

"t1-9A3":
`X:1
K:D
[V: V1] A0 d0 e0 f0 e0
w: So Do Re Mi Re

X:2
K:D
[V: V1] B0 d0 g0 g0 b0 d'0
w: La Do Fa Fa La Do

X:3
K:D
[V: V1] B0 G0 C0 C0
w: La Fa Ti Ti
`,

"t1-9B1":
`X:1
K:Bm
[V: V1] E0 B,0 F,0 B,0
w: Re La Mi La

X:2
K:Bm
[V: V1] B0 F0 B0 c0 ^A0 F0
w: La Mi La Ti Si Mi

X:3
K:Bm
[V: V1] E0 G0 B0 c0 f0 ^a0
w: Re Fa La Ti Mi Si
`,

"t1-9B2":
`X:1
K:Bm
[V: V1] G0 B0 ^A0 c0 ^A0
w: Fa La Si Ti Si

X:2
K:Bm
[V: V1] B0 G0 D0 ^A,0 F,0 ^A,0
w: La Fa Do Si Mi Si

X:3
K:Bm
[V: V1] G0 B0 e0 f0 d0 B0
w: Fa La Re Mi Do La
`,

"t1-9B3":
`X:1
K:Bm
[V: V1] B0 G0 F0 C0
w: La Fa Mi Ti

X:2
K:Bm
[V: V1] B0 e0 e0 g0
w: La Re Re Fa

X:3
K:Bm
[V: V1] G0 D0 B,0 C0 E0 F0 ^A0
w: Fa Do La Ti Re Mi Si
`,

"t1-10A1":
`X:1
K:D
[V: V1] D0 F0 A0 G0 B0 G0
w: Do Mi So Fa La Fa

X:2
K:D
[V: V1] A0 F0 D0 A,0 C0 E0
w: So Mi Do So Ti Re

X:3
K:D
[V: V1] D0 F0 A0 E0 G0 A0 c0
w: Do Mi So Re Fa So Ti
`,

"t1-10A2":
`X:1
K:D
[V: V1] E0 C0 A,0 B,0 D0
w: Re Ti So La Do

X:2
K:D
[V: V1] G0 B0 d0
w: Fa La Do
`,

"t1-18A3":
`X:1
K:F
[V: V1] F0 D0 F0 E0 G0 E0
w: Do La Do Ti Re Ti

X:2
K:F
[V: V1] D0 B,0 D0 D0 F0 D0
w: La Fa La La Do La

X:3
K:F
[V: V1] D0 D0 B,0 A,0 F,0 C,0
w: La La Fa Mi Do So
`,
}
