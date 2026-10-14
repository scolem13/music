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

};
