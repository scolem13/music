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
[V: V2] C,0 D,0 E,0 

X:2
K:C
[V: V1] E0 D0 C0 
w: Mi Re Do
[V: V2] E,0 D,0 C,0 

X:3
K:C
[V: V1] C0 B,0 C0 
w: Do Ti Do
[V: V2] C,0 B,,0 C,0 

X:4
K:C
[V: V1] D0 E0 F0 
w: Re Mi Fa
[V: V2] D,0 E,0 F,0 

X:5
K:C
[V: V1] F0 E0 D0 
w: Fa Mi Re
[V: V2] F,0 E,0 D,0 

X:6
K:C
[V: V1] E0 F0 E0 
w: Mi Fa Mi
[V: V2] E,0 F,0 E,0 

X:7
K:C
[V: V1] D0 E0 F0 G0 
w: Re Mi Fa So
[V: V2] D,0 E,0 F,0 G,0 

X:8
K:C
[V: V1] G0 A0 G0 
w: So La So
[V: V2] G,0 A,0 G,0 

X:9
K:C
[V: V1] G0 F0 E0 D0 C0 
w: So Fa Mi Re Do
[V: V2] G,0 F,0 E,0 D,0 C,0 

X:10
K:C
[V: V1] G0 A0 B0 c0 
w: So La Ti Do
[V: V2] G,0 A,0 B,0 c,0 
[V: V3] 
`,

"minor-stepwise":
`X:1
K:Cm
[V: V1] C0 D0 E0 
w: La Ti Do
[V: V2] C,0 D,0 E,0 

X:2
K:Cm
[V: V1] E0 D0 C0 
w: Do Ti La
[V: V2] E,0 D,0 C,0 

X:3
K:Cm
[V: V1] C0 =B,0 C0 
[V: V2] C,0 =B,,0 C,0 

X:4
K:Cm
[V: V1] D0 E0 F0 
[V: V2] D,0 E,0 F,0 

X:5
K:Cm
[V: V1] F0 E0 D0 
[V: V2] F,0 E,0 D,0 

X:6
K:Cm
[V: V1] E0 F0 E0 
[V: V2] E,0 F,0 E,0 

X:7
K:Cm
[V: V1] D0 E0 F0 G0 
[V: V2] D,0 E,0 F,0 G,0 

X:8
K:Cm
[V: V1] G0 A0 G0 
[V: V2] G,0 A,0 G,0 

X:9
K:Cm
[V: V1] G0 F0 E0 D0 C0 
[V: V2] G,0 F,0 E,0 D,0 C,0 

X:10
K:Cm
[V: V1] G0 A0 =B0 c0 
[V: V2] G,0 A,0 =B,0 c,0 
[V: V3] 

`,

"major-I-V":
`X:1
K:C)
[V: V1] "C" C0 E0 C0 
[V: V2] "C" C,0 E,0 C,0 

X:2
K:C)
[V: V1] "G7" D0 B,0 D0 
[V: V2] "G7" D,0 B,,0 D,0 

X:3
K:C)
[V: V1] "C" C0 E0 G0 
[V: V2] "C" C,0 E,0 G,0 

X:4
K:C)
[V: V1] "G7" G0 F0 D0 
[V: V2] "G7" G,0 F,0 D,0 

X:5
K:C)
[V: V1] "G7" B,0 D0 G0 
[V: V2] "G7" B,,0 D,0 G,0 

X:6
K:C)
[V: V1] "C" E0 G0 C0 
[V: V2] "C" E,0 G,0 C,0 

X:7
K:C)
[V: V1] "G7" D0 B,0 G0 
[V: V2] "G7" D,0 B,,0 G,0 

X:8
K:C)
[V: V1] "C" G0 E0 C0 
[V: V2] "C" G,0 E,0 C,0 

X:9
K:C)
[V: V1] "C" C0 E0  
[V: V2] "C" C,0 E,0 

X:10
K:C)
[V: V1] "G7" D0 G0  
[V: V2] "G7" D,0 G,0 

X:11
K:C)
[V: V1] "G7" G0 F0
[V: V2] "G7" G,0 F,0

X:12
K:C)
[V: V1] "G7" D0 B,0
[V: V2] "G7" D,0 B,,0

X:13
K:C)
[V: V1] "C" C0 G0 
[V: V2] "C" C,0 G,0 

X:14
K:C)
[V: V1] "G7" E0 G0 C0 
[V: V2] "G7" E,0 G,0 C,0 

X:15
K:C)
[V: V1] "G7" D0 F0
[V: V2] "G7" D,0 F,0

X:16
K:C)
[V: V1] "C" E0 C0 
[V: V2] "C" E,0 C,0 
[V: V3] 

`,

"minor-i-V":
`X:1
K:Cm)
[V: V1] "Cm" C0 E0 C0 
[V: V2] "Cm" C,0 E,0 C,0 

X:2
K:Cm)
[V: V1] "G7" D0 =B,0 D0 
[V: V2] "G7" D,0 =B,,0 D,0 

X:3
K:Cm)
[V: V1] "Cm" C0 E0 G0 
[V: V2] "Cm" C,0 E,0 G,0 

X:4
K:Cm)
[V: V1] "G7" G0 F0 D0 
[V: V2] "G7" G,0 F,0 D,0 

X:5
K:Cm)
[V: V1] "G7" =B,0 D0 G0 
[V: V2] "G7" =B,,0 D,0 G,0 

X:6
K:Cm)
[V: V1] "Cm" E0 G0 C0 
[V: V2] "Cm" E,0 G,0 C,0 

X:7
K:Cm)
[V: V1] "G7" D0 =B,0 G0 
[V: V2] "G7" D,0 =B,,0 G,0 

X:8
K:Cm)
[V: V1] "Cm" G0 E0 C0 
[V: V2] "Cm" G,0 E,0 C,0 

X:9
K:Cm)
[V: V1] "Cm" C0 E0  
[V: V2] "Cm" C,0 E,0 

X:10
K:Cm)
[V: V1] "G7" D0 G0  
[V: V2] "G7" D,0 G,0 

X:11
K:Cm)
[V: V1] "G7" G0 F0
[V: V2] "G7" G,0 F,0

X:12
K:Cm)
[V: V1] "G7" D0 =B,0
[V: V2] "G7" D,0 =B,,0

X:13
K:Cm)
[V: V1] "Cm" C0 G0 
[V: V2] "Cm" C,0 G,0 

X:14
K:Cm)
[V: V1] "G7" E0 G0 C0 
[V: V2] "G7" E,0 G,0 C,0 

X:15
K:Cm)
[V: V1] "G7" D0 F0
[V: V2] "G7" D,0 F,0

X:16
K:Cm)
[V: V1] "Cm" E0 C0 
[V: V2] "Cm" E,0 C,0 
[V: V3] 

`
}