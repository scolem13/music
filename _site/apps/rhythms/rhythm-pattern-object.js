const rhythmPatternObject = {

// Duple, macrobeats and microbeats

"Duple-M-m-2-4":
`X:1
M:2/4
L: 1/4
K: clef=none
B B/B/ | B B/B/|

X:2
M:2/4
L:1/4
K: clef=none
B/B/ B | B B/B/|

X:3
M:2/4
L:1/4
K: clef=none
B/B/B/B/ | B/B/ B|

X:4
M:2/4
L:1/4
K: clef=none
B/B/ B | B/B/B/B/|

X:5
M:2/4
L:1/4
K: clef=none
B/B/ B | B/B/ B|

X:6
M:2/4
L:1/4
K: clef=none
B B/B/ | B/B/ B|

X:7
M:2/4
L:1/4
K: clef=none
B/B/B/B/ | B B/B/|

X:8
M:2/4
L:1/4
K: clef=none
B B/B/ |B/B/B/B/|


`,

"Duple-M-m-4-4":
`X:1
M: 4/4
L: 1/4
K: clef=none
B B/B/ B B/B/|

X:2
M:4/4
L:1/4
K: clef=none
B/B/ B B B/B/|

X:3
M:4/4
L:1/4
K: clef=none
B/B/B/B/ B/B/ B|

X:4
M:4/4
L:1/4
K: clef=none
B/B/ B B/B/B/B/|

X:5
M:4/4
L:1/4
K: clef=none
B/B/ B B/B/ B|

X:6
M:4/4
L:1/4
K: clef=none
B B/B/ B/B/ B|

X:7
M:4/4
L:1/4
K: clef=none
B/B/B/B/ B B/B/|

X:8
M:4/4
L:1/4
K: clef=none
B B/B/ B/B/B/B/|


`,

"Duple-M-m-2-2":
`X:1
M:2/2
L:1/2
K: clef=none
B B/B/ | B B/B/|

X:2
M:2/2
L:1/2
K: clef=none
B/B/ B | B B/B/|

X:3
M:2/2
L:1/2
K: clef=none
B/B/B/B/ | B/B/ B|

X:4
M:2/2
L:1/2
K: clef=none
B/B/ B | B/B/B/B/|

X:5
M:2/2
L:1/2
K: clef=none
B/B/ B | B/B/ B|

X:6
M:2/2
L:1/2
K: clef=none
B B/B/ | B/B/ B|

X:7
M:2/2
L:1/2
K: clef=none
B/B/B/B/ | B B/B/|

X:8
M:2/2
L:1/2
K: clef=none
B B/B/ | B/B/B/B/|


`,

// Triple, macrobeats and microbeats

"Triple-M-m-6/8":
`X:1
M: 6/8
L: 1/8
K: clef=none
BBB B3 | BBB B3 |

X:2
M: 6/8
L: 1/8
K: clef=none
B3 BBB | BBB B3 |

X:3
M: 6/8
L: 1/8
K: clef=none
BBB BBB | BBB B3 |

X:4
M: 6/8
L: 1/8
K: clef=none
BBB B3 | BBB BBB |

X:5
M: 6/8
L: 1/8
K: clef=none
B3 BBB |B3 BBB|

X:6
M: 6/8
L: 1/8
K: clef=none
BBB B3 | B3 BBB|

X:7
M: 6/8
L: 1/8
K: clef=none
BBB BBB | B3 BBB|

X:8
M: 6/8
L: 1/8
K: clef=none
B3 BBB | BBB BBB |

`,

"Triple-M-m-3/8":
`X:1
M: 3/8
L: 1/8
K: clef=none
BBB | B3 | BBB | B3 |

X:2
M: 3/8
L: 1/8
K: clef=none
B3 | BBB | BBB | B3 |

X:3
M: 3/8
L: 1/8
K: clef=none
BBB | BBB | BBB | B3 |

X:4
M: 3/8
L: 1/8
K: clef=none
BBB | B3 | BBB | BBB |

X:5
M: 3/8
L: 1/8
K: clef=none
B3 | BBB |B3 | BBB|

X:6
M: 3/8
L: 1/8
K: clef=none
BBB | B3 | B3 | BBB|

X:7
M: 3/8
L: 1/8
K: clef=none
BBB | BBB | B3 | BBB|

X:8
M: 3/8
L: 1/8
K: clef=none
B3 | BBB | BBB | BBB |

`,

"Triple-M-m-3/4":
`X:1
M: 3/4
L: 1/4
K: clef=none
BBB | B3 | BBB | B3 |

X:2
M: 3/4
L: 1/4
K: clef=none
B3 | BBB | BBB | B3 |

X:3
M: 3/4
L: 1/4
K: clef=none
BBB | BBB | BBB | B3 |

X:4
M: 3/4
L: 1/4
K: clef=none
BBB | B3 | BBB | BBB |

X:5
M: 3/4
L: 1/4
K: clef=none
B3 | BBB |B3 | BBB|

X:6
M: 3/4
L: 1/4
K: clef=none
BBB | B3 | B3 | BBB|

X:7
M: 3/4
L: 1/4
K: clef=none
BBB | BBB | B3 | BBB|

X:8
M: 3/4
L: 1/4
K: clef=none
B3 | BBB | BBB | BBB |

`,

// Duple, add divisions

"Duple-M-m-D-2/4":
`X:1
M: 2/4
L: 1/4
K: clef=none
B//B//B/ B | B//B//B/ B/B/ |

X:2
M: 2/4
L: 1/4
K: clef=none
B//B//B/ B/B/ | B//B//B//B// B |

X:3
M: 2/4
L: 1/4
K: clef=none
B/B//B// B//B//B/ | B//B//B//B// B/B/ |

X:4
M: 2/4
L: 1/4
K: clef=none
B/B/ B/B//B// | B//B//B/ B/B/ |

X:5
M: 2/4
L: 1/4
K: clef=none
B//B//B//B// B | B//B//B//B// B/B/ |

X:6
M: 2/4
L: 1/4
K: clef=none
B/B//B// B/B//B// | B/B//B// B/B/ |

X:7
M: 2/4
L: 1/4
K: clef=none
B//B//B/ B/B//B// | B//B//B/ B |

X:8
M: 2/4
L: 1/4
K: clef=none
B/B//B// B//B//B//B// | B/B/ B |

`,

"Duple-M-m-D-4/4":
`X:1
M: 4/4
L: 1/4
K: clef=none
B//B//B/ B  B//B//B/ B/B/ |

X:2
M: 4/4
L: 1/4
K: clef=none
B//B//B/ B/B/  B//B//B//B// B |

X:3
M: 4/4
L: 1/4
K: clef=none
B/B//B// B//B//B/  B//B//B//B// B/B/ |

X:4
M: 4/4
L: 1/4
K: clef=none
B/B/ B/B//B//  B//B//B/ B/B/ |

X:5
M: 4/4
L: 1/4
K: clef=none
B//B//B//B// B  B//B//B//B// B/B/ |

X:6
M: 4/4
L: 1/4
K: clef=none
B/B//B// B/B//B//  B/B//B// B/B/ |

X:7
M: 4/4
L: 1/4
K: clef=none
B//B//B/ B/B//B//  B//B//B/ B |

X:8
M: 4/4
L: 1/4
K: clef=none
B/B//B// B//B//B//B//  B/B/ B |

`,

"Duple-M-m-D-2/2":
`X:1
M: 2/2
L: 1/2
K: clef=none
B//B//B/ B | B//B//B/ B/B/ |

X:2
M: 2/2
L: 1/2
K: clef=none
B//B//B/ B/B/ | B//B//B//B// B |

X:3
M: 2/2
L: 1/2
K: clef=none
B/B//B// B//B//B/ | B//B//B//B// B/B/ |

X:4
M: 2/2
L: 1/2
K: clef=none
B/B/ B/B//B// | B//B//B/ B/B/ |

X:5
M: 2/2
L: 1/2
K: clef=none
B//B//B//B// B | B//B//B//B// B/B/ |

X:6
M: 2/2
L: 1/2
K: clef=none
B/B//B// B/B//B// | B/B//B// B/B/ |

X:7
M: 2/2
L: 1/2
K: clef=none
B//B//B/ B/B//B// | B//B//B/ B |

X:8
M: 2/2
L: 1/2
K: clef=none
B/B//B// B//B//B//B// | B/B/ B |

`,

// Triple, add divisions

"Triple-M-m-D-6/8":
`X:1
M: 6/8
L: 1/8
K: clef=none
B/B/BB B/B/BB | B/B/BB BBB |

X:2
M: 6/8
L: 1/8
K: clef=none
BBB/B/ BBB/B/ | BBB/B/ BBB|

X:3
M: 6/8
L: 1/8
K: clef=none
B/B/BB/B/ B3 | B/B/BB/B/ BBB |

X:4
M: 6/8
L: 1/8
K: clef=none
B/B/B/B/B/B/ B3 | B/B/B/B/B/B/ BBB |

X:5
M: 6/8
L: 1/8
K: clef=none
BB/B/B B3 | BB/B/B BBB |

X:6
M: 6/8
L: 1/8
K: clef=none
B/B/B/B/B B3 | B/B/B/B/B BBB |

X:7
M: 6/8
L: 1/8
K: clef=none
BB/B/B/B/ BB/B/B/B/ | B/B/B/B/B/B/ BBB |

X:8
M: 6/8
L: 1/8
K: clef=none
B/B/BB/B/ B/B/BB/B/ | B/B/B/B/B/B/ BBB |

`,

"Triple-M-m-D-3/8":
`X:1
M: 3/8
L: 1/8
K: clef=none
B/B/BB |B/B/BB | B/B/BB| BBB |

X:2
M: 3/8
L: 1/8
K: clef=none
BBB/B/| BBB/B/ | BBB/B/| BBB|

X:3
M: 3/8
L: 1/8
K: clef=none
B/B/BB/B/| B3 | B/B/BB/B/| BBB |

X:4
M: 3/8
L: 1/8
K: clef=none
B/B/B/B/B/B/| B3 | B/B/B/B/B/B/| BBB |

X:5
M: 3/8
L: 1/8
K: clef=none
BB/B/B| B3 | BB/B/B| BBB |

X:6
M: 3/8
L: 1/8
K: clef=none
B/B/B/B/B| B3 | B/B/B/B/B| BBB |

X:7
M: 3/8
L: 1/8
K: clef=none
BB/B/B/B/| BB/B/B/B/ | B/B/B/B/B/B/| BBB |

X:8
M: 3/8
L: 1/8
K: clef=none
B/B/BB/B/| B/B/BB/B/ | B/B/B/B/B/B/| BBB |

`,

"Triple-M-m-D-3/4":
`X:1
M: 3/8
L: 1/4
K: clef=none
B/B/BB |B/B/BB | B/B/BB| BBB |

X:2
M: 3/4
L: 1/4
K: clef=none
BBB/B/| BBB/B/ | BBB/B/| BBB|

X:3
M: 3/4
L: 1/4
K: clef=none
B/B/BB/B/| B3 | B/B/BB/B/| BBB |

X:4
M: 3/4
L: 1/4
K: clef=none
B/B/B/B/B/B/| B3 | B/B/B/B/B/B/| BBB |

X:5
M: 3/4
L: 1/4
K: clef=none
BB/B/B| B3 | BB/B/B| BBB |

X:6
M: 3/4
L: 1/4
K: clef=none
B/B/B/B/B| B3 | B/B/B/B/B| BBB |

X:7
M: 3/4
L: 1/4
K: clef=none
BB/B/B/B/| BB/B/B/B/ | B/B/B/B/B/B/| BBB |

X:8
M: 3/4
L: 1/4
K: clef=none
B/B/BB/B/| B/B/BB/B/ | B/B/B/B/B/B/| BBB |

`,

// Duple, add elongations

"Duple, M-m-D-E-2/4":
`X:1
M: 2/4
L: 1/4
K: clef=none
B/B/ B/B/ | B/>B/ B |

X:2
M: 2/4
L: 1/4
K: clef=none
B/ B B/ | B/>B/ B/B/ |

X:3
M: 2/4
L: 1/4
K: clef=none
B/B/ B/B/ | B/<B/ B/B/ |

X:4
M: 2/4
L: 1/4
K: clef=none
B/<B/ B/B/ | B//B/B// B/B/ |

X:5
M: 2/4
L: 1/4
K: clef=none
B3/ B/ | B/>B/ B |

X:6
M: 2/4
L: 1/4
K: clef=none
B//B/B// B/B/ | B B/B/ |

X:7
M: 2/4
L: 1/4
K: clef=none
B/ B3/ | B//B/B// B/B/ |

X:8
M: 2/4
L: 1/4
K: clef=none
B/ B B/ | B/ B3/ |

`,

"Duple, M-m-D-E-2/2":
`X:1
M: 2/2
L: 1/2
K: clef=none
B/B/ B/B/ | B/>B/ B |

X:2
M: 2/2
L: 1/2
K: clef=none
B/ B B/ | B/>B/ B/B/ |

X:3
M: 2/2
L: 1/2
K: clef=none
B/B/ B/B/ | B/<B/ B/B/ |

X:4
M: 2/2
L: 1/2
K: clef=none
B/<B/ B/B/ | B//B/B// B/B/ |

X:5
M: 2/2
L: 1/2
K: clef=none
B3/ B/ | B/>B/ B |

X:6
M: 2/2
L: 1/2
K: clef=none
B//B/B// B/B/ | B B/B/ |

X:7
M: 2/2
L: 1/2
K: clef=none
B/ B3/ | B//B/B// B/B/ |

X:8
M: 2/2
L: 1/2
K: clef=none
B/ B B/ | B/ B3/ |

`,

// Triple, add elongations

"Triple-M-m-D-E-6/8":
`X:1
M: 6/8
L: 1/8
K: clef=none
B2 B B2 B | BBB B3 |

X:2
M: 6/8
L: 1/8
K: clef=none
B/BB/B B2 B | B2 B BBB |

X:3
M: 6/8
L: 1/8
K: clef=none
B/BBB/ BBB | B/BBB/ B3 |

X:4
M: 6/8
L: 1/8
K: clef=none
BB/BB/ B2 B | BB/BB/ BBB|

X:5
M: 6/8
L: 1/8
K: clef=none
B>BB B3 | B B2 B3 |

X:6
M: 6/8
L: 1/8
K: clef=none
B B2 B2 B | B>BB BBB |

X:7
M: 6/8
L: 1/8
K: clef=none
BB<B BBB | BB<B BBB |

X:8
M: 6/8
L: 1/8
K: clef=none
B B2 B B2 | BB<B BBB |

`,

"Triple-M-m-D-E-3/8":
`X:1
M: 3/8
L: 1/8
K: clef=none
B2 B | B2 B | BBB | B3 |

X:2
M: 3/8
L: 1/8
K: clef=none
B/BB/B | B2 B | B2 B | BBB |

X:3
M: 3/8
L: 1/8
K: clef=none
B/BBB/ | BBB | B/BBB/ | B3 |

X:4
M: 3/8
L: 1/8
K: clef=none
BB/BB/ | B2 B | BB/BB/ | BBB|

X:5
M: 3/8
L: 1/8
K: clef=none
B>BB | B3 | B B2 | B3 |

X:6
M: 3/8
L: 1/8
K: clef=none
B B2 | B2 B | B>BB | BBB |

X:7
M: 3/8
L: 1/8
K: clef=none
BB<B | BBB | BB<B | BBB |

X:8
M: 3/8
L: 1/8
K: clef=none
B B2 | B B2 | BB<B | BBB |

`,

"Triple-M-m-D-E-3/4":
`X:1
M: 3/4
L: 1/4
K: clef=none
B2 B | B2 B | BBB | B3 |

X:2
M: 3/4
L: 1/4
K: clef=none
B/BB/B | B2 B | B2 B | BBB |

X:3
M: 3/4
L: 1/4
K: clef=none
B/BBB/ | BBB | B/BBB/ | B3 |

X:4
M: 3/4
L: 1/4
K: clef=none
BB/BB/ | B2 B | BB/BB/ | BBB|

X:5
M: 3/4
L: 1/4
K: clef=none
B>BB | B3 | B B2 | B3 |

X:6
M: 3/4
L: 1/4
K: clef=none
B B2 | B2 B | B>BB | BBB |

X:7
M: 3/4
L: 1/4
K: clef=none
BB<B | BBB | BB<B | BBB |

X:8
M: 3/4
L: 1/4
K: clef=none
B B2 | B B2 | BB<B | BBB |

`,

// Duple, add rests

"Duple, M-m-R-2/4":
`X:1
M: 2/4
L: 1/4
K: clef=none
B/B/ z/B/ | B/B/ B |

X:2
M: 2/4
L: 1/4
K: clef=none
z/ B/ B/B/ | z/ B/ B/B/ |

X:3
M: 2/4
L: 1/4
K: clef=none
B z | B/B/ z/ B/ |

X:4
M: 2/4
L: 1/4
K: clef=none
B/B/ z | z B/B/ |

X:5
M: 2/4
L: 1/4
K: clef=none
B/B/ z | B/B/ B/B/ |

X:6
M: 2/4
L: 1/4
K: clef=none
B/B/ z/ B/ | z B |

X:7
M: 2/4
L: 1/4
K: clef=none
z B/B/ | z B/B/ |

X:8
M: 2/4
L: 1/4
K: clef=none
z/ B/ z/ B/ | z/ B/ B |

`,

// Duple, add upbeats and divisons & elongations (again)

"Duple, M-m-D-E-R-U-2/4":
`X:1
M: 2/4
L: 1/4
K: clef=none
B/ | B/B/ B/B/ | B//B//B//B// B/ |

X:2
M: 2/4
L: 1/4
K: clef=none
B | B//B//B//B// B | B/B/ |

X:3
M: 2/4
L: 1/4
K: clef=none
B//B//B// | B/B/ B//B//B/ | B/B/ B// |

X:4
M: 2/4
L: 1/4
K: clef=none
B/ | B3/ B/ | B//B/B// B/ |

X:5
M: 2/4
L: 1/4
K: clef=none
B// | B/ B B/ | z/ B/ B3/4 |

X:6
M: 2/4
L: 1/4
K: clef=none
B | B z | B//B//B//B// |

X:7
M: 2/4
L: 1/4
K: clef=none
B/ | B//B/B// B//B/B// | B/B/- B/ |

X:8
M: 2/4
L: 1/4
K: clef=none
B//| B//B//B/ B/B//B// | B//B//B//B// B//B//B// |

`,

"Duple, M-m-D-E-R-U-T-2/4":
`X:1
M: 2/4
L: 1/4
K: clef=none
B/B/ B- |B B/B/ |

X:2
M: 2/4
L: 1/4
K: clef=none
B/B/ z/ B/- | B/B/ B |

X:3
M: 2/4
L: 1/4
K: clef=none
B B/B/- | B/B/ B |

X:4
M: 2/4
L: 1/4
K: clef=none
B//B//B/ B/B//B//- | B//B//B/ B |

X:5
M: 2/4
L: 1/4
K: clef=none
B/B/ B- | B/B/ B |

X:6
M: 2/4
L: 1/4
K: clef=none
B/<B/ B/B/- | B//B/B// B/B/ |

X:7
M: 2/4
L: 1/4
K: clef=none
B B/B/- | B B/B/ |

X:8
M: 2/4
L: 1/4
K: clef=none
B/ | B/B//B/ B/B//B/- | B/B/- B/ |

`,

// Patterns transcribed from "Jump Right In" Student Book Two, rhythm register
// (source: pattern-pdfs/book 2 patterns.pdf). Keys are page numbers. Pages 325, 327,
// and 329 are already covered above (as "Duple, M-m-R-2/4", "Duple, M-m-D-E-R-U-2/4",
// and "Duple, M-m-D-E-R-U-T-2/4" respectively) so they're skipped here.

// p326: Macrobeats, Microbeats, and Rests in Triple Meter
"326":
`X:1
M:6/8
L:1/8
K: clef=none
BBB z2B | BBB B3 |

X:2
M:6/8
L:1/8
K: clef=none
zBB BBB | zBB BBB |

X:3
M:6/8
L:1/8
K: clef=none
BzB BzB | zBB BBB |

X:4
M:6/8
L:1/8
K: clef=none
BBB B3 | z3 BBB |

X:5
M:6/8
L:1/8
K: clef=none
BBB z3 | BBB z3 |

X:6
M:6/8
L:1/8
K: clef=none
BBB z2B | z2B BBB |

X:7
M:6/8
L:1/8
K: clef=none
zBB zBB | zBB BBB |

X:8
M:6/8
L:1/8
K: clef=none
z3 BBB | BBB z3 |
`,

// p328: Macrobeats, Microbeats, Divisions, Elongations, Rests, and Upbeats in Triple Meter
"328":
`X:1
M:6/8
L:1/8
K: clef=none
B | BBB B2B | BBB B2 |

X:2
M:6/8
L:1/8
K: clef=none
B/ | B3/2B/B B3 | B/B/B/B/B/B/ B3- B/ |

X:3
M:6/8
L:1/8
K: clef=none
B2 | B B2 B2 B | BBB B |

X:4
M:6/8
L:1/8
K: clef=none
BB | BBB z3 | B3- B |

X:5
M:6/8
L:1/8
K: clef=none
B | B/B/BB B3 | B/B/BB B2 |

X:6
M:6/8
L:1/8
K: clef=none
B/B/ | z2B BBB | B2B B2 |

X:7
M:6/8
L:1/8
K: clef=none
B3 | B/B/BB BBB/B/ | BBB/B/ |

X:8
M:6/8
L:1/8
K: clef=none
B | zBB zBB | B/B/B/B/B/B/ B |
`,

// p330: Macrobeats, Microbeats, Divisions, Elongations, Rests, Upbeats, and Ties in Triple Meter
// NOTE: this page's syncopated/tied patterns (X:2, X:4, X:6, X:8) were the hardest to read
// precisely from the source scan and should be spot-checked against the PDF.
"330":
`X:1
M:6/8
L:1/8
K: clef=none
BBB B3- | BBB B3 |

X:2
M:6/8
L:1/8
K: clef=none
BBB z2B- | BBB B3 |

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB- | BBB |

X:4
M:6/8
L:1/8
K: clef=none
B/B/B/B/ BB- | B/B/B/B/B/B/ BBB |

X:5
M:6/8
L:1/8
K: clef=none
BBB B3- | B3 BBB |

X:6
M:6/8
L:1/8
K: clef=none
B/B/B/B/ BB- | B/B/B/B/B/B/ B3 |

X:7
M:6/8
L:1/8
K: clef=none
B3 BBB- | BBB B3 |

X:8
M:6/8
L:1/8
K: clef=none
B zBB zB- | B B/B/B/B/ B |
`,

// p331: Macrobeats and Microbeats in Unusual Paired Meter (5/8, 3+2 / 2+3)
"331":
`X:1
M:5/8
L:1/8
K: clef=none
BBB BB | BBB B2 |

X:2
M:5/8
L:1/8
K: clef=none
BBB B2 | BBB BB |

X:3
M:5/8
L:1/8
K: clef=none
B3 BB | B3 BB |

X:4
M:5/8
L:1/8
K: clef=none
BBB B2 | B3 BB |

X:5
M:5/8
L:1/8
K: clef=none
BB BBB | BB BBB |

X:6
M:5/8
L:1/8
K: clef=none
BB B3 | B2 BBB |

X:7
M:5/8
L:1/8
K: clef=none
BB B3 | B2 B3 |

X:8
M:5/8
L:1/8
K: clef=none
B2 BBB | BB B3 |
`,

// p332: Macrobeats, Microbeats, and Divisions in Unusual Paired Meter (5/8)
"332":
`X:1
M:5/8
L:1/8
K: clef=none
B/B/BB B/B/B | BBB BB |

X:2
M:5/8
L:1/8
K: clef=none
BBB B2 | B B/B/B/B/ BB |

X:3
M:5/8
L:1/8
K: clef=none
B/B/B/B/B BB/B/ | B/B/B/B/B B2 |

X:4
M:5/8
L:1/8
K: clef=none
BBB B2 | B B/B/B/B/ BB |

X:5
M:5/8
L:1/8
K: clef=none
BB BB/B/B | BB BB/B/B |

X:6
M:5/8
L:1/8
K: clef=none
B/B/B/B/ B3 | B/B/B/B/ BBB |

X:7
M:5/8
L:1/8
K: clef=none
B2 B/B/B/B/B/B/ | B2 B3 |

X:8
M:5/8
L:1/8
K: clef=none
B/B/B/B/ B/B/B/B/B/B/ | B/B/B/B/ BBB |
`,

// p333: Macrobeats and Microbeats in Unusual Unpaired Meter (7/8)
"333":
`X:1
M:7/8
L:1/8
K: clef=none
BBB BB BB | BBB B2 BB |

X:2
M:7/8
L:1/8
K: clef=none
BBB BB B2 | B3 B2 B2 |

X:3
M:7/8
L:1/8
K: clef=none
B3 BB BB | B3 BB B2 |

X:4
M:7/8
L:1/8
K: clef=none
B3 B2 B2 | BBB BB BB |

X:5
M:7/8
L:1/8
K: clef=none
BB BBB BB | B2 B3 B2 |

X:6
M:7/8
L:1/8
K: clef=none
BB B3 B2 | B2 BBB B2 |

X:7
M:7/8
L:1/8
K: clef=none
BB BB BBB | BB B2 B3 |

X:8
M:7/8
L:1/8
K: clef=none
B2 BB BBB | BB B2 BBB |
`,

// p334: Macrobeats and Microbeats in Combined Meter
"334":
`X:1
M:2/4
L:1/4
K: clef=none
B/B/ B | (3B/B/B/ B |

X:2
M:2/4
L:1/4
K: clef=none
B (3B/B/B/ | B/B/ B |

X:3
M:2/4
L:1/4
K: clef=none
B/B/ (3B/B/B/ | B B/B/ |

X:4
M:2/4
L:1/4
K: clef=none
B/B/ (3B/B/B/ | (3B/B/B/ B/B/ |

X:5
M:6/8
L:1/8
K: clef=none
BBB (2BB | (2BB BBB |

X:6
M:6/8
L:1/8
K: clef=none
BBB BBB | (2BB (2BB |

X:7
M:6/8
L:1/8
K: clef=none
BBB B3 | B3 (2BB |

X:8
M:6/8
L:1/8
K: clef=none
(2BB (2BB | (2BB BBB |
`,

// Patterns transcribed from "Jump Right In" Rhythm Register Book One
// (source: pattern-pdfs/JRI Rhythm Register LSAs book 1 FULL....pdf). This was a
// FAST, LOW-CONFIDENCE pass (no consolidated text source existed like the tonal
// book had) -- ties, dots, rests, and combined-meter tuplets are approximate.
// Expect to need manual correction. Keys are the book's own Unit-Section-Criterion
// codes (e.g. "1A1"), prefixed r1- for "rhythm book 1".

// p3: Unit 1 Section A Criterion 1 -- 2/4 duple
"r1-1A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B/ B/B/ | B/B/ B/B/ ||

X:2
M:2/4
L:1/4
K: clef=none
B B/B/ | B/B/ B ||

X:3
M:2/4
L:1/4
K: clef=none
B B | B B ||
`,

// p4: Unit 1 Section B Criterion 1 -- 6/8 triple
"r1-1B1":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B3

X:2
M:6/8
L:1/8
K: clef=none
BBB BBB

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB
`,

// p5: Unit 2 Section A Criterion 1 -- 2/4 duple
"r1-2A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B/ B

X:2
M:2/4
L:1/4
K: clef=none
B B/B/

X:3
M:2/4
L:1/4
K: clef=none
B B
`,

// p6: Unit 2 Section A Criterion 2 -- 6/8 triple
"r1-2A2":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B3

X:2
M:6/8
L:1/8
K: clef=none
BBB BBB

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB
`,

// p7: Unit 2 Section B Criterion 1 -- 2/4 duple
"r1-2B1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B/ B

X:2
M:2/4
L:1/4
K: clef=none
B B/B/

X:3
M:2/4
L:1/4
K: clef=none
B B
`,

// p8: Unit 2 Section C Criterion 1 -- 6/8 triple
"r1-2C1":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B3

X:2
M:6/8
L:1/8
K: clef=none
BBB BBB

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB
`,

// p9: Unit 3 Section A Criterion 1 -- 2/4 duple
"r1-3A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B/ B/>B/

X:2
M:2/4
L:1/4
K: clef=none
B B/B//B//B/

X:3
M:2/4
L:1/4
K: clef=none
B B/B/>
`,

// p10: Unit 3 Section A Criterion 2 -- 2/4 duple
"r1-3A2":
`X:1
M:2/4
L:1/4
K: clef=none
B. B//B// | B/B/ B/B/

X:2
M:2/4
L:1/4
K: clef=none
B/B//B// B | B/B//B// B

X:3
M:2/4
L:1/4
K: clef=none
B B//B/. | B//B/. B
`,

// p11: Unit 3 Section B Criterion 1 -- 6/8 triple
"r1-3B1":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B3

X:2
M:6/8
L:1/8
K: clef=none
BBB BBB

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB
`,

// p12: Unit 3 Section B Criterion 2 -- 6/8 triple
"r1-3B2":
`
X:1
M:6/8
L:1/8
K: clef=none
B/B/B/B/ B3

X:2
M:6/8
L:1/8
K: clef=none
B/ B3

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB
`,

// p13: Unit 4 Section A Criterion 1 -- 2/4 duple
"r1-4A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B B/B3/4B//

X:2
M:2/4
L:1/4
K: clef=none
B B/B/B/B/

X:3
M:2/4
L:1/4
K: clef=none
B B/B3/4B//
`,

// p14: Unit 4 Section A Criterion 2 -- 6/8 triple
"r1-4A2":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B3

X:2
M:6/8
L:1/8
K: clef=none
BBB BBB

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB
`,

// p15: Unit 4 Section B Criterion 1 -- 2/4 duple
"r1-4B1":
`
X:1
M:2/4
L:1/4
K: clef=none
B B/B3/4B//

X:2
M:2/4
L:1/4
K: clef=none
B B/B/B/B/

X:3
M:2/4
L:1/4
K: clef=none
B B/B3/4B//
`,

// p16: Unit 4 Section B Criterion 2 -- 2/4 duple
"r1-4B2":
`
X:1
M:2/4
L:1/4
K: clef=none
B3/4B// B/

X:2
M:2/4
L:1/4
K: clef=none
B/B/B/B/ B

X:3
M:2/4
L:1/4
K: clef=none
B B3/4B//
`,

// p17: Unit 4 Section C Criterion 1 -- 6/8 triple
"r1-4C1":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B3

X:2
M:6/8
L:1/8
K: clef=none
BBB BBB

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB
`,

// p18: Unit 4 Section C Criterion 2 -- 6/8 triple
"r1-4C2":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B3

X:2
M:6/8
L:1/8
K: clef=none
B/B3

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB
`,

// p19: Unit 5 Section A Criterion 1 -- 2/4 duple
"r1-5A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B/ B3/4B//

X:2
M:2/4
L:1/4
K: clef=none
B/B B/

X:3
M:2/4
L:1/4
K: clef=none
B3/4B// B
`,

// p20: Unit 5 Section A Criterion 2 -- 2/4 duple
"r1-5A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B/ B/B/ B/

X:2
M:2/4
L:1/4
K: clef=none
B/B/ B3/4

X:3
M:2/4
L:1/4
K: clef=none
B/B/B/ B
`,

// p21: Unit 5 Section A Criterion 3 -- 2/4 duple
"r1-5A3":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B/ B/ B

X:2
M:2/4
L:1/4
K: clef=none
B B/B//B//B//B//

X:3
M:2/4
L:1/4
K: clef=none
(3B/B/B/ B
`,

// p22: Unit 5 Section B Criterion 1 -- 6/8 triple
"r1-5B1":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B3

X:2
M:6/8
L:1/8
K: clef=none
B/B/B/B/B/B/ B3

X:3
M:6/8
L:1/8
K: clef=none
B/B/B/B/B/B/ B3
`,

// p23: Unit 5 Section B Criterion 2 -- 6/8 triple
"r1-5B2":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB BBB

X:2
M:6/8
L:1/8
K: clef=none
B/B/B/B/B/B/ B3

X:3
M:6/8
L:1/8
K: clef=none
BBB B3
`,

// p24: Unit 5 Section B Criterion 3 -- 6/8 triple
"r1-5B3":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB BBB

X:2
M:6/8
L:1/8
K: clef=none
BBB B3

X:3
M:6/8
L:1/8
K: clef=none
BBB BBB
`,

// p25: Unit 6 Section A Criterion 1 -- 2/4->6/8 combined, single pattern (no E/M/D)
"r1-6A1":
`X:1
M:2/4
L:1/4
K: clef=none
B/B/B/B/ B|B B/|B/ BBB B3|B/ B|B3
`,

// p26: Unit 6 Section A Criterion 2 -- 6/8->2/4 combined, single pattern (no E/M/D)
"r1-6A2":
`X:1
M:6/8
L:1/8
K: clef=none
BBB B3|B3 BBB|B3 B/|B/B/ B/B/|B/B/ B B/B/
`,

// p27: Unit 7 Section A Criterion 1 -- 2/4 duple
"r1-7A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B/ B

X:2
M:2/4
L:1/4
K: clef=none
B B/B/

X:3
M:2/4
L:1/4
K: clef=none
B B3/4B//
`,

// p28: Unit 7 Section A Criterion 2 -- 6/8 triple
"r1-7A2":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B3

X:2
M:6/8
L:1/8
K: clef=none
B3 B/B3

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB
`,

// p29: Unit 7 Section B Criterion 1 -- 2/4 duple
"r1-7B1":
`
X:1
M:2/4
L:1/4
K: clef=none
B3/4B// B

X:2
M:2/4
L:1/4
K: clef=none
B/B/ B

X:3
M:2/4
L:1/4
K: clef=none
B B/B/
`,

// p30: Unit 7 Section B Criterion 2 -- 6/8 triple
"r1-7B2":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B3

X:2
M:6/8
L:1/8
K: clef=none
B/B3 B3

X:3
M:6/8
L:1/8
K: clef=none
BBB BBB
`,

// p31: Unit 8 Section A Criterion 1 -- 2/4 duple
"r1-8A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B/ B

X:2
M:2/4
L:1/4
K: clef=none
B B/

X:3
M:2/4
L:1/4
K: clef=none
B B
`,

// p32: Unit 8 Section A Criterion 2 -- 2/4 duple
"r1-8A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B/- B

X:2
M:2/4
L:1/4
K: clef=none
B- B

X:3
M:2/4
L:1/4
K: clef=none
B B-
`,

// p33: Unit 8 Section A Criterion 3 -- 2/4 duple
"r1-8A3":
`
X:1
M:2/4
L:1/4
K: clef=none
B/

X:2
M:2/4
L:1/4
K: clef=none
B/

X:3
M:2/4
L:1/4
K: clef=none
B/B//B//
`,

// p34: Unit 8 Section B Criterion 1 -- 6/8 triple
"r1-8B1":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB z

X:2
M:6/8
L:1/8
K: clef=none
BB z

X:3
M:6/8
L:1/8
K: clef=none
B BBB
`,

// p35: Unit 8 Section B Criterion 2 -- 6/8 triple
"r1-8B2":
`
X:1
M:6/8
L:1/8
K: clef=none
B3- BBB

X:2
M:6/8
L:1/8
K: clef=none
BB B-

X:3
M:6/8
L:1/8
K: clef=none
B B3-
`,

// p36: Unit 8 Section B Criterion 3 -- 6/8 triple
"r1-8B3":
`
X:1
M:6/8
L:1/8
K: clef=none
B

X:2
M:6/8
L:1/8
K: clef=none
BBB BBB

X:3
M:6/8
L:1/8
K: clef=none
B B3
`,

// p37: Unit 9 Section A Criterion 1 -- 2/4 duple
"r1-9A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B/ B/B//B//B//-

X:2
M:2/4
L:1/4
K: clef=none
B B/B//B//B//

X:3
M:2/4
L:1/4
K: clef=none
B/B//B//B// B3/4B//
`,

// p38: Unit 9 Section A Criterion 2 -- 6/8 triple
"r1-9A2":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B3/4B//-

X:2
M:6/8
L:1/8
K: clef=none
B/B3B//

X:3
M:6/8
L:1/8
K: clef=none
B/B3B//
`,

// p39: Unit 9 Section B Criterion 1 -- 2/4 duple
"r1-9B1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B/ B

X:2
M:2/4
L:1/4
K: clef=none
B B/

X:3
M:2/4
L:1/4
K: clef=none
B B
`,

// p40: Unit 9 Section B Criterion 2 -- 2/4 duple
"r1-9B2":
`
X:1
M:2/4
L:1/4
K: clef=none
B3/4B// B/B/

X:2
M:2/4
L:1/4
K: clef=none
B B/-

X:3
M:2/4
L:1/4
K: clef=none
B B-
`,

// p41: Unit 9 Section B Criterion 3 -- 2/4 duple
"r1-9B3":
`
X:1
M:2/4
L:1/4
K: clef=none
B/

X:2
M:2/4
L:1/4
K: clef=none
B/

X:3
M:2/4
L:1/4
K: clef=none
B/B//B//
`,

// p42: Unit 9 Section C Criterion 1 -- 6/8 triple
"r1-9C1":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B3

X:2
M:6/8
L:1/8
K: clef=none
B3 z/BB

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB
`,

// p43: Unit 9 Section C Criterion 2 -- 6/8 triple
"r1-9C2":
`
X:1
M:6/8
L:1/8
K: clef=none
B3 B-

X:2
M:6/8
L:1/8
K: clef=none
B3 B3-

X:3
M:6/8
L:1/8
K: clef=none
B3 B/B/-
`,

// p44: Unit 9 Section C Criterion 3 -- 6/8 triple
"r1-9C3":
`
X:1
M:6/8
L:1/8
K: clef=none
B/BB B3

X:2
M:6/8
L:1/8
K: clef=none
B3 BBB

X:3
M:6/8
L:1/8
K: clef=none
B/B3
`,

// p45: Unit 10 Section A Criterion 1 -- 2/4 duple
"r1-10A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B/ B

X:2
M:2/4
L:1/4
K: clef=none
B B/

X:3
M:2/4
L:1/4
K: clef=none
B B
`,

// p46: Unit 10 Section A Criterion 2 -- 2/4 duple
"r1-10A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B/- B/B/

X:2
M:2/4
L:1/4
K: clef=none
B3/4B//- B/

X:3
M:2/4
L:1/4
K: clef=none
B B-
`,

// p47: Unit 10 Section A Criterion 3 -- 2/4 duple
"r1-10A3":
`
X:1
M:2/4
L:1/4
K: clef=none
B/

X:2
M:2/4
L:1/4
K: clef=none
B/B//B//

X:3
M:2/4
L:1/4
K: clef=none
B/B//B//B//
`,

// p48: Unit 10 Section B Criterion 1 -- 6/8 triple
"r1-10B1":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B3

X:2
M:6/8
L:1/8
K: clef=none
B3 z/BB

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB
`,

// p49: Unit 10 Section B Criterion 2 -- 6/8 triple
"r1-10B2":
`
X:1
M:6/8
L:1/8
K: clef=none
B3 B-

X:2
M:6/8
L:1/8
K: clef=none
B3 B3-

X:3
M:6/8
L:1/8
K: clef=none
B3 B/-
`,

// p50: Unit 10 Section B Criterion 3 -- 6/8 triple
"r1-10B3":
`
X:1
M:6/8
L:1/8
K: clef=none
B/BB B3

X:2
M:6/8
L:1/8
K: clef=none
BBB BBB

X:3
M:6/8
L:1/8
K: clef=none
B/B3
`,

// p51: Unit 11 Section A Criterion 1 -- 2/4 duple
"r1-11A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/ B/

X:2
M:2/4
L:1/4
K: clef=none
B/B//B//B/

X:3
M:2/4
L:1/4
K: clef=none
B/.B// z
`,

// p52: Unit 11 Section A Criterion 2 -- 2/4 duple
"r1-11A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B/.B//- B//B//B//z/

X:2
M:2/4
L:1/4
K: clef=none
B B-

X:3
M:2/4
L:1/4
K: clef=none
B/B/- B
`,

// p53: Unit 11 Section A Criterion 3 -- 2/4 duple
"r1-11A3":
`
X:1
M:2/4
L:1/4
K: clef=none
B/ B/-

X:2
M:2/4
L:1/4
K: clef=none
B/ B/.

X:3
M:2/4
L:1/4
K: clef=none
B/-B/ B/
`,

// p54: Unit 11 Section B Criterion 1 -- 6/8 triple
"r1-11B1":
`
X:1
M:6/8
L:1/8
K: clef=none
B/BB B3

X:2
M:6/8
L:1/8
K: clef=none
B/BB B3

X:3
M:6/8
L:1/8
K: clef=none
BBB B3
`,

// p55: Unit 11 Section B Criterion 2 -- 6/8 triple
"r1-11B2":
`
X:1
M:6/8
L:1/8
K: clef=none
B/BB B3-

X:2
M:6/8
L:1/8
K: clef=none
BBB B3-

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB-
`,

// p56: Unit 11 Section B Criterion 3 -- 6/8 triple
"r1-11B3":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B3

X:2
M:6/8
L:1/8
K: clef=none
B/B/BB. B/

X:3
M:6/8
L:1/8
K: clef=none
B/ BBB
`,

// p57: Unit 12 Section A Criterion 1 -- 2/4 duple
"r1-12A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B// z/B

X:2
M:2/4
L:1/4
K: clef=none
B/B// B/-

X:3
M:2/4
L:1/4
K: clef=none
B/B/ B/
`,

// p58: Unit 12 Section A Criterion 2 -- 6/8 triple
"r1-12A2":
`
X:1
M:6/8
L:1/8
K: clef=none
z B/

X:2
M:6/8
L:1/8
K: clef=none
BB B3-

X:3
M:6/8
L:1/8
K: clef=none
B/BB B/
`,

// p59: Unit 12 Section B Criterion 1 -- 2/4 duple
"r1-12B1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/ B/

X:2
M:2/4
L:1/4
K: clef=none
BB B/B/

X:3
M:2/4
L:1/4
K: clef=none
B3/4B// z
`,

// p60: Unit 12 Section B Criterion 2 -- 2/4 duple
"r1-12B2":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B/ B/B//B//z/

X:2
M:2/4
L:1/4
K: clef=none
BB B3-

X:3
M:2/4
L:1/4
K: clef=none
B/B/ B3-
`,

// p61: Unit 12 Section B Criterion 3 -- 2/4 duple
"r1-12B3":
`
X:1
M:2/4
L:1/4
K: clef=none
B/ B/-

X:2
M:2/4
L:1/4
K: clef=none
B/ B/

X:3
M:2/4
L:1/4
K: clef=none
B/B/ B/
`,

// p62: Unit 12 Section C Criterion 1 -- 6/8 triple
"r1-12C1":
`
X:1
M:6/8
L:1/8
K: clef=none
B3 BBB

X:2
M:6/8
L:1/8
K: clef=none
B/B/BB. B/

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB
`,

// p63: Unit 12 Section C Criterion 2 -- 6/8 triple
"r1-12C2":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B/-

X:2
M:6/8
L:1/8
K: clef=none
BBB B3-

X:3
M:6/8
L:1/8
K: clef=none
B3 BB B/-
`,

// p64: Unit 12 Section C Criterion 3 -- 6/8 triple
"r1-12C3":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B3

X:2
M:6/8
L:1/8
K: clef=none
B/BBB. B/

X:3
M:6/8
L:1/8
K: clef=none
B/BB z
`,

// p65: Unit 13 Section A Criterion 1 -- 2/4 duple
"r1-13A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B B/

X:2
M:2/4
L:1/4
K: clef=none
B B/

X:3
M:2/4
L:1/4
K: clef=none
B B
`,

// p66: Unit 13 Section A Criterion 2 -- 2/4 duple
"r1-13A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B/.B//- B B

X:2
M:2/4
L:1/4
K: clef=none
B3-B/ B/

X:3
M:2/4
L:1/4
K: clef=none
B B-
`,

// p67: Unit 13 Section A Criterion 3 -- 2/4 duple
"r1-13A3":
`
X:1
M:2/4
L:1/4
K: clef=none
B/ B/

X:2
M:2/4
L:1/4
K: clef=none
B/B// B/

X:3
M:2/4
L:1/4
K: clef=none
B/B//B//B// B/
`,

// p68: Unit 13 Section B Criterion 1 -- 6/8 triple
"r1-13B1":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B3

X:2
M:6/8
L:1/8
K: clef=none
B3 z/B3

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB
`,

// p69: Unit 13 Section B Criterion 2 -- 6/8 triple
"r1-13B2":
`
X:1
M:6/8
L:1/8
K: clef=none
B/BB B3-

X:2
M:6/8
L:1/8
K: clef=none
BBB B3-

X:3
M:6/8
L:1/8
K: clef=none
B/B/- B3
`,

// p70: Unit 13 Section B Criterion 3 -- 6/8 triple
"r1-13B3":
`
X:1
M:6/8
L:1/8
K: clef=none
B/BB B3

X:2
M:6/8
L:1/8
K: clef=none
BBB BBB

X:3
M:6/8
L:1/8
K: clef=none
B/B3
`,

// p71: Unit 14 Section A Criterion 1 -- 2/4 duple
"r1-14A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B B/.B//

X:2
M:2/4
L:1/4
K: clef=none
B B/B//B//B//

X:3
M:2/4
L:1/4
K: clef=none
B B/(3B//B//B//
`,

// p72: Unit 14 Section A Criterion 2 -- 2/4 duple
"r1-14A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B3B// B/.B//

X:2
M:2/4
L:1/4
K: clef=none
B/B/B/B/ B/.B//

X:3
M:2/4
L:1/4
K: clef=none
B3(3B//B//B// B/.B//
`,

// p73: Unit 14 Section B Criterion 1 -- 6/8 triple
"r1-14B1":
`
X:1
M:6/8
L:1/8
K: clef=none
B/BB B3

X:2
M:6/8
L:1/8
K: clef=none
BBB B/BB.

X:3
M:6/8
L:1/8
K: clef=none
B3 B/BB.
`,

// p74: Unit 14 Section B Criterion 2 -- 6/8 triple
"r1-14B2":
`
X:1
M:6/8
L:1/8
K: clef=none
B/BB B3

X:2
M:6/8
L:1/8
K: clef=none
B/.B// B/BB.

X:3
M:6/8
L:1/8
K: clef=none
BBB B/BB.
`,

// p75: Unit 15 Section A Criterion 1 -- 6/8->2/4 combined, single pattern (no E/M/D)
"r1-15A1":
`X:1
M:6/8
L:1/8
K: clef=none
B/BB B/.B//|B/.B// B3|B B/B/ B/.B//|B/
`,

// p76: Unit 15 Section A Criterion 2 -- 2/4->6/8 combined, single pattern (no E/M/D)
"r1-15A2":
`X:1
M:2/4
L:1/4
K: clef=none
B/ B z/B/|B B/ z/|B/ B/B/ B/|B B/
`,

// p77: Unit 16 Section A Criterion 1 -- 2/4 usual combined
"r1-16A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B B3(3B/B/B/

X:2
M:2/4
L:1/4
K: clef=none
(3B/B/B/ B(3B/B/B/

X:3
M:2/4
L:1/4
K: clef=none
(3B/B/B/ B(3B/B/B/
`,

// p78: Unit 16 Section A Criterion 2 -- 2/4 usual combined
"r1-16A2":
`
X:1
M:2/4
L:1/4
K: clef=none
(3B/B/B/ B

X:2
M:2/4
L:1/4
K: clef=none
(3B/B/B/(3B/B/B/

X:3
M:2/4
L:1/4
K: clef=none
(3B/B/B/(3B/B/B/
`,

// p79: Unit 17 Section A Criterion 1 -- 2/4 usual combined
"r1-17A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/.B//(3B/B/B/

X:2
M:2/4
L:1/4
K: clef=none
(3B/B/B/B/ B/B/

X:3
M:2/4
L:1/4
K: clef=none
B(3B/B/B/ B/B/
`,

// p80: Unit 17 Section A Criterion 2 -- 2/4 usual duple (combined)
"r1-17A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B(3B/B/B/

X:2
M:2/4
L:1/4
K: clef=none
BBB B/B/

X:3
M:2/4
L:1/4
K: clef=none
BBB B/B/
`,

// p81: Unit 17 Section A Criterion 3 -- 2/4 usual combined
"r1-17A3":
`
X:1
M:2/4
L:1/4
K: clef=none
(3B/B/B/B/ B

X:2
M:2/4
L:1/4
K: clef=none
(3B/B/B/B/(3B/B/B/

X:3
M:2/4
L:1/4
K: clef=none
(3B/B/B/B/(3B/B/B/
`,

// p82: Unit 18 Section A Criterion 1 -- 2/4 usual combined
"r1-18A1":
`
X:1
M:2/4
L:1/4
K: clef=none
(3B/B/B/B/ B

X:2
M:2/4
L:1/4
K: clef=none
(3B/B/B/B/B/ B/B/

X:3
M:2/4
L:1/4
K: clef=none
B/.B// B/(3B/B/B/
`,

// p83: Unit 18 Section A Criterion 2 -- 2/4 usual combined
"r1-18A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B (3B/B/B/B/

X:2
M:2/4
L:1/4
K: clef=none
(3B/B/B/(3B/B/B/B/

X:3
M:2/4
L:1/4
K: clef=none
BBB(3B/B/B/ B3
`,

// p84: Unit 19 Section A Criterion 1 -- 2/4 duple, single pattern (no E/M/D)
"r1-19A1":
`X:1
M:2/4
L:1/4
K: clef=none
B/B/ B|B/B/ B|B3B/B/|B/.B// B
`,

// p85: Unit 19 Section A Criterion 2 -- 2/4 duple, single pattern (no E/M/D)
"r1-19A2":
`X:1
M:2/4
L:1/4
K: clef=none
B/B/B/ B|B/B/ B/B/ B|B/ B|B/B/B/ B3
`,

// p86: Unit 19 Section B Criterion 1 -- 6/8 triple, single pattern (no E/M/D)
"r1-19B1":
`X:1
M:6/8
L:1/8
K: clef=none
BBB B3|z. B3|B/B/B/B/B/B/ B/|B3 B/B/B/B/B/B/
`,

// p87: Unit 19 Section B Criterion 2 -- 6/8 triple, single pattern (no E/M/D)
"r1-19B2":
`X:1
M:6/8
L:1/8
K: clef=none
BBB BBB|B/ B3|B3 B3|B/BB. B/BB.
`,

// Patterns transcribed from "Jump Right In" Rhythm Register Book Two (LSAs)
// (source: pattern-pdfs/JRI LSAs Rhythm Register Book 2 FULL.pdf). This was a
// FAST, LOW-CONFIDENCE pass (no consolidated text source existed like the tonal
// book had) -- ties, dots, rests, and combined-meter tuplets are approximate.
// Expect to need manual correction. Keys are the book's own Unit-Section-Criterion
// codes (e.g. "1A1"), prefixed r2- for "rhythm LSA book 2".

// p3: Unit 20 Section A Criterion 1 -- 5/8 unusual paired
"r2-20A1":
`
X:1
M:5/8
L:1/8
K: clef=none
BB BBB

X:2
M:5/8
L:1/8
K: clef=none
BBB B

X:3
M:5/8
L:1/8
K: clef=none
BB B3
`,

// p4: Unit 20 Section A Criterion 2 -- 5/8 unusual paired
"r2-20A2":
`
X:1
M:5/8
L:1/8
K: clef=none
B/BB/B BB

X:2
M:5/8
L:1/8
K: clef=none
BBB B

X:3
M:5/8
L:1/8
K: clef=none
BB B
`,

// p5: Unit 20 Section B Criterion 1 -- 7/8 unusual unpaired
"r2-20B1":
`
X:1
M:7/8
L:1/8
K: clef=none
BB BBB

X:2
M:7/8
L:1/8
K: clef=none
BBB B/.

X:3
M:7/8
L:1/8
K: clef=none
BBB B/.
`,

// p6: Unit 20 Section B Criterion 2 -- 7/8 unusual unpaired
"r2-20B2":
`
X:1
M:7/8
L:1/8
K: clef=none
BBBB BBB

X:2
M:7/8
L:1/8
K: clef=none
BBB BBB

X:3
M:7/8
L:1/8
K: clef=none
BB/B3
`,

// p7: Unit 21 Section A Criterion 1 -- 2/4 duple, single pattern (no E/M/D)
"r2-21A1":
`X:1
M:2/4
L:1/4
K: clef=none
B B|B B|B/.B// B/B/|B/B/ B/B/
`,

// p8: Unit 21 Section A Criterion 2 -- 2/4 duple, single pattern (no E/M/D)
"r2-21A2":
`X:1
M:2/4
L:1/4
K: clef=none
B/BB/B B|B/.B// B/|B/ B/|B/BB/B B/.
`,

// p9: Unit 21 Section B Criterion 1 -- 6/8 triple, single pattern (no E/M/D)
"r2-21B1":
`X:1
M:6/8
L:1/8
K: clef=none
BBB B3|z. B/BB|B/B/B/B/B/B/ B/|B/BB. B3
`,

// p10: Unit 21 Section B Criterion 2 -- 6/8 triple, single pattern (no E/M/D)
"r2-21B2":
`X:1
M:6/8
L:1/8
K: clef=none
B/B/B/B/B/B/ B/|BBB B/BB.|B/BB. B/BB.|
`,

// p11: Unit 22 Section A Criterion 1 -- 5/8 unusual paired
"r2-22A1":
`
X:1
M:5/8
L:1/8
K: clef=none
BBB BB

X:2
M:5/8
L:1/8
K: clef=none
B3 BB

X:3
M:5/8
L:1/8
K: clef=none
B3 BB
`,

// p12: Unit 22 Section A Criterion 2 -- 7/8 unusual unpaired
"r2-22A2":
`
X:1
M:7/8
L:1/8
K: clef=none
BBB BBB

X:2
M:7/8
L:1/8
K: clef=none
BBB B3

X:3
M:7/8
L:1/8
K: clef=none
BB3 BB
`,

// p13: Unit 22 Section B Criterion 1 -- 5/8 unusual paired
"r2-22B1":
`
X:1
M:5/8
L:1/8
K: clef=none
BB BB

X:2
M:5/8
L:1/8
K: clef=none
BBB B

X:3
M:5/8
L:1/8
K: clef=none
BB B3
`,

// p14: Unit 22 Section B Criterion 2 -- 5/8 unusual paired
"r2-22B2":
`
X:1
M:5/8
L:1/8
K: clef=none
BBB BBB

X:2
M:5/8
L:1/8
K: clef=none
BBB B

X:3
M:5/8
L:1/8
K: clef=none
BB B
`,

// p15: Unit 22 Section C Criterion 1 -- 7/8 unusual unpaired
"r2-22C1":
`
X:1
M:7/8
L:1/8
K: clef=none
BBB BB

X:2
M:7/8
L:1/8
K: clef=none
BBB B/.

X:3
M:7/8
L:1/8
K: clef=none
BB/.
`,

// p16: Unit 22 Section C Criterion 2 -- 7/8 unusual unpaired
"r2-22C2":
`
X:1
M:7/8
L:1/8
K: clef=none
BBBB B

X:2
M:7/8
L:1/8
K: clef=none
BBB BBB

X:3
M:7/8
L:1/8
K: clef=none
BB/BB. BB
`,

// p17: Unit 23 Section A Criterion 1 -- 2/4 duple
"r2-23A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/ B/

X:2
M:2/4
L:1/4
K: clef=none
B/B//B//B/

X:3
M:2/4
L:1/4
K: clef=none
B3 z
`,

// p18: Unit 23 Section A Criterion 2 -- 2/4 duple
"r2-23A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B/.B//- B/B//B//B//z/

X:2
M:2/4
L:1/4
K: clef=none
B/B/-B/

X:3
M:2/4
L:1/4
K: clef=none
B/B/-B/
`,

// p19: Unit 23 Section A Criterion 3 -- 2/4 duple
"r2-23A3":
`
X:1
M:2/4
L:1/4
K: clef=none
B/. B/-

X:2
M:2/4
L:1/4
K: clef=none
B/. B/

X:3
M:2/4
L:1/4
K: clef=none
B/. B/
`,

// p20: Unit 23 Section B Criterion 1 -- 6/8 triple
"r2-23B1":
`
X:1
M:6/8
L:1/8
K: clef=none
B/BB. B/BB.

X:2
M:6/8
L:1/8
K: clef=none
B/BBB. z/B/

X:3
M:6/8
L:1/8
K: clef=none
B/BB. B/BB.
`,

// p21: Unit 23 Section B Criterion 2 -- 6/8 triple
"r2-23B2":
`
X:1
M:6/8
L:1/8
K: clef=none
B/BB B/-

X:2
M:6/8
L:1/8
K: clef=none
BB B-

X:3
M:6/8
L:1/8
K: clef=none
B3 B-
`,

// p22: Unit 23 Section B Criterion 3 -- 6/8 triple
"r2-23B3":
`
X:1
M:6/8
L:1/8
K: clef=none
BBB B/

X:2
M:6/8
L:1/8
K: clef=none
B/BBB. B/

X:3
M:6/8
L:1/8
K: clef=none
B/B/ z
`,

// p23: Unit 24 Section A Criterion 1 -- 2/4 duple
"r2-24A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B//B//B/ B/

X:2
M:2/4
L:1/4
K: clef=none
B3

X:3
M:2/4
L:1/4
K: clef=none
B3-
`,

// p24: Unit 24 Section A Criterion 2 -- 6/8 triple
"r2-24A2":
`
X:1
M:6/8
L:1/8
K: clef=none
B/BB. z/B/

X:2
M:6/8
L:1/8
K: clef=none
BBB B/B//B//B/z/

X:3
M:6/8
L:1/8
K: clef=none
BBB z/B/
`,

// p25: Unit 24 Section B Criterion 1 -- 2/4 duple
"r2-24B1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/BB. z/B/B/

X:2
M:2/4
L:1/4
K: clef=none
B/ z/B/B/B//B//

X:3
M:2/4
L:1/4
K: clef=none
B/z/B/(3B//B//B//. B/
`,

// p26: Unit 24 Section B Criterion 2 -- 6/8 triple
"r2-24B2":
`
X:1
M:6/8
L:1/8
K: clef=none
B/B3-B/

X:2
M:6/8
L:1/8
K: clef=none
z/B/ B-

X:3
M:6/8
L:1/8
K: clef=none
z. B/B//B//B//B//. B/
`,

// p27: Unit 25 Section A Criterion 1 -- 2/4->5/8 multimetric
"r2-25A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B/ B/B/

X:2
M:2/4
L:1/4
K: clef=none
BBB B3

X:3
M:2/4
L:1/4
K: clef=none
B B
`,

// p28: Unit 25 Section A Criterion 2 -- 2/4->7/8 multimetric
"r2-25A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B/B/B/ B/B/

X:2
M:2/4
L:1/4
K: clef=none
B B

X:3
M:2/4
L:1/4
K: clef=none
B B.
`,

// p29: Unit 26 Section A Criterion 1 -- 2/4 usual combined
"r2-26A1":
`
X:1
M:2/4
L:1/4
K: clef=none
BBB(3B/B/B/

X:2
M:2/4
L:1/4
K: clef=none
B/.(3B//B//B// (3B/B/B/B/

X:3
M:2/4
L:1/4
K: clef=none
BBB. B3(3B/B/B/
`,

// p30: Unit 26 Section A Criterion 2 -- 2/4 usual combined
"r2-26A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B/(3B/B/B/ B/.B//

X:2
M:2/4
L:1/4
K: clef=none
B/(3B/B/B/ B B/

X:3
M:2/4
L:1/4
K: clef=none
(3B/B/B/(3B/B/B/ B/B/
`,

// p31: Unit 27 Section A Criterion 1 -- 2/4 usual combined
"r2-27A1":
`
X:1
M:2/4
L:1/4
K: clef=none
(3B/B/B/ B(3B/B/B/

X:2
M:2/4
L:1/4
K: clef=none
(3B/B/B/ B-

X:3
M:2/4
L:1/4
K: clef=none
(3B/B/B/(3B/B/B/ B(3B/B/B/
`,

// p32: Unit 27 Section A Criterion 2 -- 2/4 usual combined
"r2-27A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B(3B/B/B/ B(3B/B/B/

X:2
M:2/4
L:1/4
K: clef=none
B/B/ (3B/B/B/(3B/B/B/

X:3
M:2/4
L:1/4
K: clef=none
(3B/B/B/(3B/B/B/ B-
`,

// p33: Unit 27 Section A Criterion 3 -- 2/4 usual combined
"r2-27A3":
`
X:1
M:2/4
L:1/4
K: clef=none
(3B/B/B/(3B/B/B/ B-

X:2
M:2/4
L:1/4
K: clef=none
B/(3B/B/B/ B/

X:3
M:2/4
L:1/4
K: clef=none
(3B/B/B/(3B/B/B/ B/B/
`,

// p34: Unit 28 Section A Criterion 1 -- 2/4->6/8 combined, single pattern (no E/M/D)
"r2-28A1":
`X:1
M:2/4
L:1/4
K: clef=none
(3B/B/B/B B/B//B//z/|B/. B/(3B/B/B/z/|B/. B3
`,

// p35: Unit 28 Section A Criterion 2 -- 2/4->2/4 combined, single pattern (no E/M/D)
"r2-28A2":
`X:1
M:2/4
L:1/4
K: clef=none
B/ B/B//B//z/-B/|(3B/B/B/ B/z/B/-B/|(3B/B/B/ B/
`,

// p36: Unit 29 Section A Criterion 1 -- 2/4 duple
"r2-29A1":
`
X:1
M:2/4
L:1/4
K: clef=none
BBB B/.B//z/

X:2
M:2/4
L:1/4
K: clef=none
BBB B-

X:3
M:2/4
L:1/4
K: clef=none
BBB B/-
`,

// p37: Unit 29 Section A Criterion 2 -- 2/4 duple
"r2-29A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B/BB. B/-

X:2
M:2/4
L:1/4
K: clef=none
B3B/B//B//z/

X:3
M:2/4
L:1/4
K: clef=none
B3- B/z.
`,

// p38: Unit 29 Section B Criterion 1 -- 6/8 triple
"r2-29B1":
`
X:1
M:6/8
L:1/8
K: clef=none
B3B/BB. B/z

X:2
M:6/8
L:1/8
K: clef=none
BBB z/B/-

X:3
M:6/8
L:1/8
K: clef=none
B/z/B/z.
`,

// p39: Unit 29 Section B Criterion 2 -- 6/8 triple
"r2-29B2":
`
X:1
M:6/8
L:1/8
K: clef=none
B/B/B/B/B/B/ B/

X:2
M:6/8
L:1/8
K: clef=none
B/B/-B3

X:3
M:6/8
L:1/8
K: clef=none
B/BBB. B/-
`,

// p40: Unit 30 Section A Criterion 1 -- 6/8->7/8 multimetric, single pattern (no E/M/D)
"r2-30A1":
`X:1
M:6/8
L:1/8
K: clef=none
BBB BBB|BBB B/|BBB BBB|B/ B3
`,

// p41: Unit 30 Section A Criterion 2 -- 7/8->5/8 multimetric, single pattern (no E/M/D)
"r2-30A2":
`X:1
M:7/8
L:1/8
K: clef=none
B B3B/|BBB B B3|B/BB B/|B3
`,

// p42: Unit 31 Section A Criterion 1 -- 2/4 duple
"r2-31A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/ B/B/(3B//B//B//z/

X:2
M:2/4
L:1/4
K: clef=none
B/BB/B/ B/z3/4B//

X:3
M:2/4
L:1/4
K: clef=none
B3 z
`,

// p43: Unit 31 Section A Criterion 2 -- 2/4 duple
"r2-31A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B//B//B/-B/(3B//B//B//z/

X:2
M:2/4
L:1/4
K: clef=none
B/ B-

X:3
M:2/4
L:1/4
K: clef=none
B/B//B//B/-B/
`,

// p44: Unit 31 Section A Criterion 3 -- 2/4 duple
"r2-31A3":
`
X:1
M:2/4
L:1/4
K: clef=none
B/. B/-

X:2
M:2/4
L:1/4
K: clef=none
B/. B/-

X:3
M:2/4
L:1/4
K: clef=none
B/B/. B/.
`,

// p45: Unit 31 Section B Criterion 1 -- 6/8 triple
"r2-31B1":
`
X:1
M:6/8
L:1/8
K: clef=none
B3 B/

X:2
M:6/8
L:1/8
K: clef=none
B/BBB. B/

X:3
M:6/8
L:1/8
K: clef=none
B/BB. B/
`,

// p46: Unit 31 Section B Criterion 2 -- 6/8 triple
"r2-31B2":
`
X:1
M:6/8
L:1/8
K: clef=none
B/BBB. B/

X:2
M:6/8
L:1/8
K: clef=none
B/BB. B/-

X:3
M:6/8
L:1/8
K: clef=none
B/BB. B/-
`,

// p47: Unit 31 Section B Criterion 3 -- 6/8 triple
"r2-31B3":
`
X:1
M:6/8
L:1/8
K: clef=none
B/BB. B/-

X:2
M:6/8
L:1/8
K: clef=none
B/BBB. B/. z

X:3
M:6/8
L:1/8
K: clef=none
B/B/BB. z
`,

// p48: Unit 32 Section A Criterion 1 -- 2/4 usual combined
"r2-32A1":
`
X:1
M:2/4
L:1/4
K: clef=none
BBB(3B/B/B/ BBB(3B/B/B/

X:2
M:2/4
L:1/4
K: clef=none
B/(3B/B/B/-B/(3B/B/B/(3B/B/B/

X:3
M:2/4
L:1/4
K: clef=none
(3B/B/B/(3B/B/B/-B/(3B/B/B/(3B/B/B/
`,

// p49: Unit 32 Section A Criterion 2 -- 2/4 usual combined
"r2-32A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B(3B/B/B/B/.(3B//B//B//

X:2
M:2/4
L:1/4
K: clef=none
B/(3B/B/B/(3B/B/B/ B/

X:3
M:2/4
L:1/4
K: clef=none
(3B/B/B/(3B/B/B/-B/(3B/B/B/B/
`,

// p50: Unit 33 Section A Criterion 1 -- 2/4 usual combined
"r2-33A1":
`
X:1
M:2/4
L:1/4
K: clef=none
(3B/B/B/(3B/B/B/-B/(3B/B/B/

X:2
M:2/4
L:1/4
K: clef=none
B/(3B/B/B/-(3B/B/B/(3B/B/B/

X:3
M:2/4
L:1/4
K: clef=none
(3B/B/B/(3B/B/B/-B/(3B/B/B/
`,

// p51: Unit 33 Section A Criterion 2 -- 2/4 usual combined
"r2-33A2":
`
X:1
M:2/4
L:1/4
K: clef=none
(3B/B/B/(3B/B/B/-B/(3B/B/B/

X:2
M:2/4
L:1/4
K: clef=none
(3B/B/B/(3B/B/B/-B/(3B/B/B/

X:3
M:2/4
L:1/4
K: clef=none
(3B/B/B/(3B/B/B/-B/(3B/B/B/
`,

// p52: Unit 34 Section A Criterion 1 -- 2/4 usual combined
"r2-34A1":
`
X:1
M:2/4
L:1/4
K: clef=none
BBB(3B/B/B/ B

X:2
M:2/4
L:1/4
K: clef=none
BBB(3B/B/B/(3B/B/B/z/

X:3
M:2/4
L:1/4
K: clef=none
BBB(3B/B/B/(3B/B/B/z/
`,

// p53: Unit 34 Section A Criterion 2 -- 2/4 usual combined
"r2-34A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B/BB(3B/B/B/-B/

X:2
M:2/4
L:1/4
K: clef=none
B/B(3B/B/B/-(3B/B/B/

X:3
M:2/4
L:1/4
K: clef=none
B/B/B/B/(3B/B/B/ z/
`,

// p54: Unit 35 Section A Criterion 1 -- 5/8 unusual paired
"r2-35A1":
`
X:1
M:5/8
L:1/8
K: clef=none
BB BBB

X:2
M:5/8
L:1/8
K: clef=none
BB BB

X:3
M:5/8
L:1/8
K: clef=none
BB B3
`,

// p55: Unit 35 Section A Criterion 2 -- 5/8 unusual paired
"r2-35A2":
`
X:1
M:5/8
L:1/8
K: clef=none
BB BBB

X:2
M:5/8
L:1/8
K: clef=none
BBB B

X:3
M:5/8
L:1/8
K: clef=none
BB B
`,

// p56: Unit 35 Section B Criterion 1 -- 7/8 unusual unpaired
"r2-35B1":
`
X:1
M:7/8
L:1/8
K: clef=none
BB BBB

X:2
M:7/8
L:1/8
K: clef=none
BBB B/.

X:3
M:7/8
L:1/8
K: clef=none
BB/.B B
`,

// p57: Unit 35 Section B Criterion 2 -- 7/8 unusual unpaired
"r2-35B2":
`
X:1
M:7/8
L:1/8
K: clef=none
BBBB BBB

X:2
M:7/8
L:1/8
K: clef=none
BBB B/.

X:3
M:7/8
L:1/8
K: clef=none
BB/.B B
`,

// p58: Unit 36 Section A Criterion 1 -- 2/4 duple, single pattern (no E/M/D)
"r2-36A1":
`X:1
M:2/4
L:1/4
K: clef=none
B/z3/4B// B/|z3/4B//B/B/z/|B/z B/
`,

// p59: Unit 36 Section A Criterion 2 -- 2/4 duple, single pattern (no E/M/D)
"r2-36A2":
`X:1
M:2/4
L:1/4
K: clef=none
B/B//B//B//B//z/B/|z/B/. z/B/.B/|B/.B/ B/
`,

// p60: Unit 36 Section B Criterion 1 -- 6/8 triple, single pattern (no E/M/D)
"r2-36B1":
`X:1
M:6/8
L:1/8
K: clef=none
B/z3|B/BBB. z.|B/BB. B/BB.|B/BB
`,

// p61: Unit 36 Section B Criterion 2 -- 6/8 triple, single pattern (no E/M/D)
"r2-36B2":
`X:1
M:6/8
L:1/8
K: clef=none
B/BBB. B/|BBB B/. z/|B/BBB. B/|
`,

// p62: Unit 37 Section A Criterion 1 -- 5/8 unusual paired
"r2-37A1":
`
X:1
M:5/8
L:1/8
K: clef=none
BB BB

X:2
M:5/8
L:1/8
K: clef=none
BBB B

X:3
M:5/8
L:1/8
K: clef=none
BB B3
`,

// p63: Unit 37 Section A Criterion 2 -- 5/8 unusual paired
"r2-37A2":
`
X:1
M:5/8
L:1/8
K: clef=none
BB BBB

X:2
M:5/8
L:1/8
K: clef=none
BBB B

X:3
M:5/8
L:1/8
K: clef=none
BB B3
`,

// p64: Unit 37 Section B Criterion 1 -- 7/8 unusual unpaired
"r2-37B1":
`
X:1
M:7/8
L:1/8
K: clef=none
BB BBB

X:2
M:7/8
L:1/8
K: clef=none
BBB B

X:3
M:7/8
L:1/8
K: clef=none
BB/. B
`,

// p65: Unit 37 Section B Criterion 2 -- 7/8 unusual unpaired
"r2-37B2":
`
X:1
M:7/8
L:1/8
K: clef=none
BBBB B

X:2
M:7/8
L:1/8
K: clef=none
BBB B

X:3
M:7/8
L:1/8
K: clef=none
BB/.BB
`,

// p66: Unit 38 Section A Criterion 1 -- 2/4 duple, single pattern (no E/M/D)
"r2-38A1":
`X:1
M:2/4
L:1/4
K: clef=none
B/z3/4B// B/|B/.B// B/B/(3B//B//B//|B/B/(3B//B//B// B/|z B/
`,

// p67: Unit 38 Section A Criterion 2 -- 2/4 duple, single pattern (no E/M/D)
"r2-38A2":
`X:1
M:2/4
L:1/4
K: clef=none
B/B//B//B// B/-B/z/|B/. B/.z/B/|B/. z/B/
`,

// p68: Unit 38 Section B Criterion 1 -- 6/8 triple, single pattern (no E/M/D)
"r2-38B1":
`X:1
M:6/8
L:1/8
K: clef=none
B/z. B/BBB. z|B/BBB. B/BB. z/|B/. B/BB
`,

// p69: Unit 38 Section B Criterion 2 -- 6/8 triple, single pattern (no E/M/D)
"r2-38B2":
`X:1
M:6/8
L:1/8
K: clef=none
B/B/BB. B/|B/BB. B/-B/z/|B/BB. B/BB.|B/
`,

// p70: Unit 39 Section A Criterion 1 -- 2/4->5/8 multimetric
"r2-39A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/ B/

X:2
M:2/4
L:1/4
K: clef=none
BBB B/.

X:3
M:2/4
L:1/4
K: clef=none
B/B/. B/.
`,

// p71: Unit 39 Section B Criterion 1 -- 2/4->5/8 multimetric
"r2-39B1":
`
X:1
M:2/4
L:1/4
K: clef=none
B B

X:2
M:2/4
L:1/4
K: clef=none
BBB B

X:3
M:2/4
L:1/4
K: clef=none
B B
`,

// p72: Unit 39 Section B Criterion 2 -- 2/4->7/8 multimetric
"r2-39B2":
`
X:1
M:2/4
L:1/4
K: clef=none
BBB B

X:2
M:2/4
L:1/4
K: clef=none
B3 B

X:3
M:2/4
L:1/4
K: clef=none
B3 B
`,

// p73: Unit 40 Section A Criterion 1 -- 2/4 usual combined
"r2-40A1":
`
X:1
M:2/4
L:1/4
K: clef=none
(3B/B/B/B B-

X:2
M:2/4
L:1/4
K: clef=none
(3B/B/B/B/B/B/(3B/B/B/z/B/. B/.

X:3
M:2/4
L:1/4
K: clef=none
(3B/B/B/B/B/-B/(3B/B/B/z/B/.
`,

// p74: Unit 40 Section A Criterion 2 -- 2/4 usual combined
"r2-40A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B/(3B/B/B/ B-

X:2
M:2/4
L:1/4
K: clef=none
B/(3B/B/B/(3B/B/B/z/B/

X:3
M:2/4
L:1/4
K: clef=none
B/B/ B(3B/B/B/-z/B/
`,

// p75: Unit 41 Section A Criterion 1 -- 2/4->5/8 multimetric
"r2-41A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B/B3 B/B/

X:2
M:2/4
L:1/4
K: clef=none
B/B/B/B/B/. B/B/. B/

X:3
M:2/4
L:1/4
K: clef=none
B3 B/B/B/.
`,

// p76: Unit 41 Section A Criterion 2 -- 2/4->5/8 multimetric
"r2-41A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B/ B/

X:2
M:2/4
L:1/4
K: clef=none
B/B/B/B/B/. B/.

X:3
M:2/4
L:1/4
K: clef=none
B3B/.
`,

// p77: Unit 42 Section A Criterion 1 -- 2/4 duple
"r2-42A1":
`
X:1
M:2/4
L:1/4
K: clef=none
B B/

X:2
M:2/4
L:1/4
K: clef=none
B/BB/B/ B/-

X:3
M:2/4
L:1/4
K: clef=none
B/B//B//B/ B/-
`,

// p78: Unit 42 Section A Criterion 2 -- 2/4 duple
"r2-42A2":
`
X:1
M:2/4
L:1/4
K: clef=none
B/BB/B/ B/-

X:2
M:2/4
L:1/4
K: clef=none
B/. B/BB/B/z/B/-

X:3
M:2/4
L:1/4
K: clef=none
B/BB/B/ B/z.
`,

// p79: Unit 42 Section B Criterion 1 -- 6/8 triple
"r2-42B1":
`
X:1
M:6/8
L:1/8
K: clef=none
B/BB. B/-

X:2
M:6/8
L:1/8
K: clef=none
BBB B/z/B/-

X:3
M:6/8
L:1/8
K: clef=none
B B/B/B/-
`,

// p80: Unit 42 Section B Criterion 2 -- 6/8 triple
"r2-42B2":
`
X:1
M:6/8
L:1/8
K: clef=none
B/B/B/B/B/B/ B/-

X:2
M:6/8
L:1/8
K: clef=none
B/B/-B/B/. B/

X:3
M:6/8
L:1/8
K: clef=none
B/B/B/B/B/-z/B/
`,

// ---- Rhythm patterns from the MLT books (DMTI 1-3, JRI Recorder Teacher's Guide, Mullen, JRI Music Play); checked by tests/patterns/source-sets.test.js ----
// Sets already in the site (JRI Recorder macro/micro, upbeat, 5/8 and combined-meter sets) are not repeated. Measures that are not full are pickups or
// one-beat tails as printed.

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 1: C Instruments (Treble Clef) (GIA, 2006), Unit 1 "Long, Long Ago", Echo Rhythm Patterns in duple meter (macrobeat = quarter note), p. 2; the same eight patterns with rhythm syllables on p. vii.
"dmti1-unit1-rhythm":
`X:1
M:4/4
L:1/4
K: clef=none
B B/B/ B B/B/ |

X:2
M:4/4
L:1/4
K: clef=none
B/B/ B B/B/ B |

X:3
M:4/4
L:1/4
K: clef=none
B/B/B/B/ B/B/ B |

X:4
M:4/4
L:1/4
K: clef=none
B/B/B/B/ B/B/B/B/ |

X:5
M:4/4
L:1/4
K: clef=none
B/B/B/B/ B B/B/ |

X:6
M:4/4
L:1/4
K: clef=none
B B B/B/ B |

X:7
M:4/4
L:1/4
K: clef=none
B/B/ B B B |

X:8
M:4/4
L:1/4
K: clef=none
B B/B/ B/B/ B |
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 1: C Instruments (Treble Clef) (GIA, 2006), Unit 2 "Mary Ann", Echo Rhythm Patterns in duple meter, Latin style (macrobeat = quarter note; sixteenth notes DU TA DE TA), p. 18; with rhythm syllables on p. viii.
"dmti1-unit2-rhythm":
`X:1
M:4/4
L:1/4
K: clef=none
B B/B/ B B |

X:2
M:4/4
L:1/4
K: clef=none
B/B/B/B/ B B/B/ |

X:3
M:4/4
L:1/4
K: clef=none
B/B/4B/4 B B/4B/4B/ B/B/ |

X:4
M:4/4
L:1/4
K: clef=none
B3/2 B/ B/4B/4B/4B/4 B |

X:5
M:4/4
L:1/4
K: clef=none
B/ B B/ B3/4B/4 B/B/ |

X:6
M:4/4
L:1/4
K: clef=none
B/ B/4 B/4- B B/B/ B |

X:7
M:4/4
L:1/4
K: clef=none
B/B/ z z/ B/ B/B/ |

X:8
M:4/4
L:1/4
K: clef=none
B/4B/ B/4 B/B/ B3/4B/4 B/B/ |
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 1: C Instruments (Treble Clef) (GIA, 2006), Unit 3 "Joshua", Echo Rhythm Patterns in duple meter, swing style (macrobeat = half note, so two macrobeats a measure; paired eighth notes are swung, syllables DU DI DE DI), p. 34; with rhythm syllables on p. viii.
// Written there in 4/4 marked 2 macrobeats; here as 2/2, the same durations.
"dmti1-unit3-rhythm":
`X:1
M:2/2
L:1/4
K: clef=none
B B B B | B B B2 |

X:2
M:2/2
L:1/4
K: clef=none
B/B/B/B/ B B | B/B/ B2 B |

X:3
M:2/2
L:1/4
K: clef=none
B/B/B/B/B/B/B/B/ | B/ B B/- B z |

X:4
M:2/2
L:1/4
K: clef=none
B B B/ B3/2 | B/ B B/- B B |

X:5
M:2/2
L:1/4
K: clef=none
B/ B B/- B z | B/ B B/- B/ B/B/B/ |

X:6
M:2/2
L:1/4
K: clef=none
B/B/B/B/ B/ B3/2 | B2 B B |

X:7
M:2/2
L:1/4
K: clef=none
B/B/ B B B/B/ | B B B B |

X:8
M:2/2
L:1/4
K: clef=none
B/B/ B B2 | B B B2 |
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 1: C Instruments (Treble Clef) (GIA, 2006), Unit 4 "Simple Gifts", Echo Rhythm Patterns in duple meter (macrobeat = half note, eighth notes DU TA DE TA), p. 52; with rhythm syllables on p. ix. Patterns 1-4, 7 and 8 begin with a pickup, so the last measure is short.
// Written there in 4/4 marked 2 macrobeats; here as 2/2, the same durations.
"dmti1-unit4-rhythm":
`X:1
M:2/2
L:1/4
K: clef=none
B/B/ | B B/B/ B/B/B/B/ | B B/B/ B |

X:2
M:2/2
L:1/4
K: clef=none
B/B/ | B B B B | B/B/B/B/ B |

X:3
M:2/2
L:1/4
K: clef=none
B/ | B B/B/ B B/B/ | B B/B/ B z/ |

X:4
M:2/2
L:1/4
K: clef=none
B | B/B/B/B/ B B/B/ | B B B |

X:5
M:2/2
L:1/4
K: clef=none
B2 B3/2 B/ | B/B/B/B/ B B |

X:6
M:2/2
L:1/4
K: clef=none
B2 B2 | B/B/ B B2 |

X:7
M:2/2
L:1/4
K: clef=none
B | B/B/B/B/ B/B/B/B/ | B B B |

X:8
M:2/2
L:1/4
K: clef=none
B/ | B B B B/B/ | B B B z/ |
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 1: C Instruments (Treble Clef) (GIA, 2006), Unit 5 "Down by the Riverside", Echo Rhythm Patterns in duple meter, swing style (macrobeat = half note, paired eighth notes swung, syllables DU DI DE DI), p. 71; with rhythm syllables on p. ix. Pattern 3 begins with a three-eighth pickup, so its last measure is short.
// Written there in 4/4 marked 2 macrobeats; here as 2/2, the same durations.
"dmti1-unit5-rhythm":
`X:1
M:2/2
L:1/4
K: clef=none
B2 B B | B B B B |

X:2
M:2/2
L:1/4
K: clef=none
z B B3/2 B/ | B/ B B/- B/ z/ z |

X:3
M:2/2
L:1/4
K: clef=none
B/B/B/ | B B2 B | B/ B B/- B/ |

X:4
M:2/2
L:1/4
K: clef=none
B B B/ B B/ | B/B/B/B/ B B |

X:5
M:2/2
L:1/4
K: clef=none
B B B2- | B2 B B |

X:6
M:2/2
L:1/4
K: clef=none
B2 B B- | B B B2 |

X:7
M:2/2
L:1/4
K: clef=none
B/ B3/2 B B/B/- | B/B/ B B2 |

X:8
M:2/2
L:1/4
K: clef=none
B/ B3/2 B B- | B/ B B/ B B |
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 2: C Instruments (2nd ed., GIA, 2010), Unit 1 "When the Saints Go Marching In", Echo Rhythm Patterns in duple meter (macrobeat = quarter note), p. 2; the same patterns with rhythm syllables on p. vii. Most begin with a pickup, so the last measure is short.
"dmti2-unit1-rhythm":
`X:1
M:2/4
L:1/4
K: clef=none
B/ B/B/ | B2- | B/B/ B/B/ | B2- | B/ |

X:2
M:2/4
L:1/4
K: clef=none
B/ B/B/ | B B | B B | B2- | B/ |

X:3
M:2/4
L:1/4
K: clef=none
B3/2 B/ | B B | B2- | B z |

X:4
M:2/4
L:1/4
K: clef=none
B/ B/B/ | B3/2 B/ | B B/B/ | B/ B3/2- | B/ |

X:5
M:2/4
L:1/4
K: clef=none
B/B/ | B/ B B/ | B B/B/ | B2- | B |

X:6
M:2/4
L:1/4
K: clef=none
B | B2 | B B | B B | B |

X:7
M:2/4
L:1/4
K: clef=none
B/B/ | B3/2 B/ | B/ B3/2 | B B/B/ | B |

X:8
M:2/4
L:1/4
K: clef=none
B/B/ | B B | B B | B2- | B |
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 2: C Instruments (2nd ed., GIA, 2010), Unit 2 "Amazing Grace", Echo Rhythm Patterns in triple meter (3/4 with one macrobeat, the dotted half note, to the measure), p. 22; the same patterns with rhythm syllables on p. viii. Patterns 1-5 begin with a pickup quarter, so the last measure is short.
"dmti2-unit2-rhythm":
`X:1
M:3/4
L:1/4
K: clef=none
B | B2 B/B/ | B2 B | B2 B | B2 |

X:2
M:3/4
L:1/4
K: clef=none
B | B2 B/B/ | B2 B/B/ | B2 B | B2 |

X:3
M:3/4
L:1/4
K: clef=none
B | B2 B/B/ | B2 B | B3- | B2 |

X:4
M:3/4
L:1/4
K: clef=none
B | B3/2 B/ B/B/ | B2 B | B2 B/B/ | B2 |

X:5
M:3/4
L:1/4
K: clef=none
B | B3/2 B/ B/B/ | B3/2 B/ B/B/ | B B B | B2 |

X:6
M:3/4
L:1/4
K: clef=none
B2 B | B2 B | B B B | B3 |

X:7
M:3/4
L:1/4
K: clef=none
B B B | B2 B | B B B | B3 |

X:8
M:3/4
L:1/4
K: clef=none
B3/2 B/ B/B/ | B B B | B3/2 B/ B/B/ | B B B |
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 2: C Instruments (2nd ed., GIA, 2010), Unit 3 "Motherless Child", Echo Rhythm Patterns in duple meter with triplets (macrobeat = quarter note; triplet syllables DU DA DI), p. 40; with rhythm syllables on p. viii. Triplets are written (3 in ABC.
"dmti2-unit3-rhythm":
`X:1
M:4/4
L:1/4
K: clef=none
B/ B B/ B B/B/ | B/B/B/B/- B2 |

X:2
M:4/4
L:1/4
K: clef=none
B B/B/ B/ B B/ | (3BBB B z |

X:3
M:4/4
L:1/4
K: clef=none
B/ | B3/2 B/ B/B/ B | B3/2 B/ B3/2 |

X:4
M:4/4
L:1/4
K: clef=none
B/ | B3/2 B/ B/B/ B | B3- B/ |

X:5
M:4/4
L:1/4
K: clef=none
B/4B/4B/4B/4 B z (3B/B/B/ | B/B/ B z2 |

X:6
M:4/4
L:1/4
K: clef=none
B3/2 B/ B B | B/B/B/B/- B B |

X:7
M:4/4
L:1/4
K: clef=none
(3z/B/B/ B (3B/B/B/- B | B/B/B/B/- B2 |

X:8
M:4/4
L:1/4
K: clef=none
B3/2 B/ B3/2 B/ | B B B z |
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 3: C Instruments (GIA, 2010), Unit 1 "Saint Louis Blues", Echo Rhythm Patterns in duple meter, swing style (macrobeat = half note, paired eighths swung, syllables DU DI DE DI), p. 3; the same patterns with rhythm syllables on p. vii. Patterns 1-3 and 5 end with a one-beat measure.
"dmti3-unit1-rhythm":
`X:1
M:2/2
L:1/4
K: clef=none
B/B/B/B/- B2 | z/ B/ B/B/ B3/2 B/ | B |

X:2
M:2/2
L:1/4
K: clef=none
z/ B/ B/B/- B2 | z/ B/ B/B/ B3/2 B/ | B |

X:3
M:2/2
L:1/4
K: clef=none
B/B/B/B/- B/ B3/2 | z B/B/ B3/2 B/ | B |

X:4
M:2/2
L:1/4
K: clef=none
z/ B/ B/B/- B/ B3/2 | z/ B/ B/B/ B B/B/- | B |

X:5
M:2/2
L:1/4
K: clef=none
B/B/B/B/- B2 | z/ B B/ B B/B/- | B |

X:6
M:2/2
L:1/4
K: clef=none
z B/B/ B/B/ B | B/B/B/B/- B B |

X:7
M:2/2
L:1/4
K: clef=none
B2 B B | B/B/B/B/- B/B/ B |

X:8
M:2/2
L:1/4
K: clef=none
B B B/B/B/B/- | B B B z |
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 3: C Instruments (GIA, 2010), Unit 2 "Transformation", Echo Rhythm Patterns in duple meter, swing style, p. 24; with rhythm syllables on p. viii. Pattern 3 ends with a one-beat measure; patterns 5 and 7 begin with a pickup (5) or half rest (7).
"dmti3-unit2-rhythm":
`X:1
M:2/2
L:1/4
K: clef=none
B B B3/2 B/ | B B/B/- B z |

X:2
M:2/2
L:1/4
K: clef=none
z B/B/ B/ B B/- | B B/B/ B/ B3/2 |

X:3
M:2/2
L:1/4
K: clef=none
z z/ B/ B/B/B/B/ | B/B/B/B/B/B/B/B/ | B |

X:4
M:2/2
L:1/4
K: clef=none
z B B3/2 B/ | B B/B/- B3/2 z/ |

X:5
M:2/2
L:1/4
K: clef=none
B/ | B/B/B/B/ B B/B/- | B z B z |

X:6
M:2/2
L:1/4
K: clef=none
B z B B/B/- | B2 B/B/B/B/ |

X:7
M:2/2
L:1/4
K: clef=none
z2 B/B/B/B/- | B/B/B/B/- B B/B/ |

X:8
M:2/2
L:1/4
K: clef=none
z B/B/ B/ B B/- | B/B/ z/ B/ B/B/B/B/ |
`,

// Azzara & Grunow, Developing Musicianship through Improvisation, Book 3: C Instruments (GIA, 2010), Unit 3 "Red Wings", Echo Rhythm Patterns in duple meter, swing style, p. 48; with rhythm syllables on p. viii. Patterns 2-4 begin with a pickup.
"dmti3-unit3-rhythm":
`X:1
M:2/2
L:1/4
K: clef=none
B/B/B/B/- B B/B/- | B2 z2 |

X:2
M:2/2
L:1/4
K: clef=none
B/ B/B/ | B/B/B/B/ B B/B/- | B2 z2 |

X:3
M:2/2
L:1/4
K: clef=none
B/ B/- | B3/2 B/ B/ B B/- | B2 z2 |

X:4
M:2/2
L:1/4
K: clef=none
B/ B/B/ | B/B/B/B/- B z | B/B/B/B/- B z |

X:5
M:2/2
L:1/4
K: clef=none
B/ B3/2 z B | B/ B3/2 z2 |

X:6
M:2/2
L:1/4
K: clef=none
B/B/B/B/ B3/2 B/ | B/B/B/B/B/B/B/B/ |

X:7
M:2/2
L:1/4
K: clef=none
z B/B/ B/B/B/B/ | B/B/B/B/ B/B/ B |

X:8
M:2/2
L:1/4
K: clef=none
z/ B/ B/B/ B/B/B/B/ | B/B/B/B/ B B |
`,

// Grunow, Gordon, Azzara, Jump Right In: The Instrumental Series, Recorder Teacher's Guide (GIA, 1999), Rhythm Patterns from Student Book Two, printed p. 328 (PDF p. 329), 'Macrobeats, Microbeats, Divisions, Elongations, Rests, and Upbeats in Triple Meter', 8 patterns, all with an upbeat so first and last measures are partial, as in the book.
"jri-recorder-rhythm-triple-divisions-elongations-rests-upbeats":
`X:1
M:6/8
L:1/8
K: clef=none
B | BBB B2 B | BBB B2 |

X:2
M:6/8
L:1/8
K: clef=none
B/ | B3/2 B/ B B3 | B/B/B/B/B/B/ B2- B/ |

X:3
M:6/8
L:1/8
K: clef=none
B2 | B B2 B2 B | B B B B |

X:4
M:6/8
L:1/8
K: clef=none
B B | BBB z3 | B3- B |

X:5
M:6/8
L:1/8
K: clef=none
B | B/ B B B/ B3 | B/ B B B/ B2 |

X:6
M:6/8
L:1/8
K: clef=none
B/B/ | z2 B BBB | B2 B B2 |

X:7
M:6/8
L:1/8
K: clef=none
B3 | B/B/ B B B B/B/ B | B B B/B/ |

X:8
M:6/8
L:1/8
K: clef=none
B | z B B z B B | B/B/B/B/ B B2 |
`,

// Grunow, Gordon, Azzara, Jump Right In: The Instrumental Series, Recorder Teacher's Guide (GIA, 1999), Rhythm Patterns from Student Book Two, printed p. 329 (PDF p. 330), 'Macrobeats, Microbeats, Divisions, Elongations, Rests, Upbeats, and Ties in Duple Meter', 8 patterns (the last has an upbeat).
"jri-recorder-rhythm-duple-ties":
`X:1
M:2/4
L:1/4
K: clef=none
B/B/ B- | B B/B/ |

X:2
M:2/4
L:1/4
K: clef=none
B/B/ z/ B/- | B/ B/ B |

X:3
M:2/4
L:1/4
K: clef=none
B B/B/- | B/ B/ B |

X:4
M:2/4
L:1/4
K: clef=none
B/4B/4B/ B/B/4B/4- | B/4B/4B/ B |

X:5
M:2/4
L:1/4
K: clef=none
B/B/ B- | B/ B/ B |

X:6
M:2/4
L:1/4
K: clef=none
B3/4 B/4 B/ B/- | B/4 B/ B/4 B/B/ |

X:7
M:2/4
L:1/4
K: clef=none
B B/B/- | B B/B/ |

X:8
M:2/4
L:1/4
K: clef=none
B/ | B/4 B/ B/4 B/4 B/ B/4- | B/ B/- B/ |
`,

// Grunow, Gordon, Azzara, Jump Right In: The Instrumental Series, Recorder Teacher's Guide (GIA, 1999), Rhythm Patterns from Student Book Two, printed p. 330 (PDF p. 331), 'Macrobeats, Microbeats, Divisions, Elongations, Rests, Upbeats, and Ties in Triple Meter', 8 patterns (the last has an upbeat).
"jri-recorder-rhythm-triple-ties":
`X:1
M:6/8
L:1/8
K: clef=none
BBB B3- | B BB B3 |

X:2
M:6/8
L:1/8
K: clef=none
BBB z2 B- | B BB B3 |

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB- | B3 BBB |

X:4
M:6/8
L:1/8
K: clef=none
B/B/B B/B/ B/B/B B/B/- | B/B/B/B/B/B/ B B B |

X:5
M:6/8
L:1/8
K: clef=none
BBB B3- | B3 BBB |

X:6
M:6/8
L:1/8
K: clef=none
B/ B B B/ B B B- | B/ B B B/ B3 |

X:7
M:6/8
L:1/8
K: clef=none
B3 BBB- | B BB B3 |

X:8
M:6/8
L:1/8
K: clef=none
B | z B B z B B- | B/ B/ B/ B/ B B2 |
`,

// Grunow, Gordon, Azzara, Jump Right In: The Instrumental Series, Recorder Teacher's Guide (GIA, 1999), Rhythm Patterns from Student Book Two, printed p. 332 (PDF p. 333), 'Macrobeats, Microbeats, and Divisions in Unusual Paired Meter', 8 patterns in 5/8.
"jri-recorder-rhythm-unusual-paired-divisions":
`X:1
M:5/8
L:1/8
K: clef=none
B/B/ B B B/B/ B | B B B B B |

X:2
M:5/8
L:1/8
K: clef=none
B B B B2 | B B/B/B/B/ B B |

X:3
M:5/8
L:1/8
K: clef=none
B/B/B/B/ B B B/B/ | B/B/B/B/ B B2 |

X:4
M:5/8
L:1/8
K: clef=none
B/B/ B B/B/ B2 | B3 B/B/ B |

X:5
M:5/8
L:1/8
K: clef=none
B B B/B/ B B | B B B/B/ B B |

X:6
M:5/8
L:1/8
K: clef=none
B/B/B/B/ B3 | B/B/B/B/ B B B |

X:7
M:5/8
L:1/8
K: clef=none
B2 B/B/B/B/B/B/ | B2 B3 |

X:8
M:5/8
L:1/8
K: clef=none
B/B/B/B/ B/B/B/B/B/B/ | B/B/B/B/ B B B |
`,

// Grunow, Gordon, Azzara, Jump Right In: The Instrumental Series, Recorder Teacher's Guide (GIA, 1999), Rhythm Patterns from Student Book Two, printed p. 333 (PDF p. 334), 'Macrobeats and Microbeats in Unusual Unpaired Meter', 8 patterns in 7/8 (three macrobeats of 3+2+2, 2+3+2 or 2+2+3 eighths); syllables printed Du Ba Bi / Du Be.
"jri-recorder-rhythm-unusual-unpaired":
`X:1
M:7/8
L:1/8
K: clef=none
BBB BB BB | BBB B2 BB |

X:2
M:7/8
L:1/8
K: clef=none
BBB BB B2 | B3 B2 B2 |

X:3
M:7/8
L:1/8
K: clef=none
B3 BB BB | B3 BB B2 |

X:4
M:7/8
L:1/8
K: clef=none
B3 B2 B2 | BBB BB BB |

X:5
M:7/8
L:1/8
K: clef=none
BB BBB BB | B2 B3 B2 |

X:6
M:7/8
L:1/8
K: clef=none
BB B3 BB | B2 BBB B2 |

X:7
M:7/8
L:1/8
K: clef=none
BB BB BBB | BB B2 B3 |

X:8
M:7/8
L:1/8
K: clef=none
B2 BB BBB | BB B2 BBB |
`,

// Duple Meter, Macrobeats and Microbeats (Lesson 2 / Lesson 4, 8 patterns, 2/4): Mullen, The Literate Musician, 2nd ed., p. 37 (notation) and p. 39 (with Du De syllables).
"mullen-rhythm-duple-macro-micro":
`X:1
M:2/4
L:1/4
K: clef=none
B B | B B |

X:2
M:2/4
L:1/4
K: clef=none
B/B/ B/B/ | B/B/ B/B/ |

X:3
M:2/4
L:1/4
K: clef=none
B B/B/ | B/B/ B |

X:4
M:2/4
L:1/4
K: clef=none
B B/B/ | B B/B/ |

X:5
M:2/4
L:1/4
K: clef=none
B/B/ B | B/B/ B |

X:6
M:2/4
L:1/4
K: clef=none
B/B/ B/B/ | B/B/ B |

X:7
M:2/4
L:1/4
K: clef=none
B B | B/B/ B |

X:8
M:2/4
L:1/4
K: clef=none
B B/B/ | B B |
`,

// Triple Meter, Macrobeats and Microbeats (Lesson 3 / Lesson 5, 8 patterns, 6/8): Mullen, The Literate Musician, 2nd ed., p. 37 (notation) and p. 40 (with Du Da Di syllables).
"mullen-rhythm-triple-macro-micro":
`X:1
M:6/8
L:1/8
K: clef=none
B3 B3 | B3 B3 |

X:2
M:6/8
L:1/8
K: clef=none
BBB BBB | BBB BBB |

X:3
M:6/8
L:1/8
K: clef=none
B3 BBB | BBB B3 |

X:4
M:6/8
L:1/8
K: clef=none
B3 BBB | B3 BBB |

X:5
M:6/8
L:1/8
K: clef=none
BBB B3 | BBB B3 |

X:6
M:6/8
L:1/8
K: clef=none
BBB BBB | BBB B3 |

X:7
M:6/8
L:1/8
K: clef=none
B3 B3 | BBB B3 |

X:8
M:6/8
L:1/8
K: clef=none
B3 BBB | B3 B3 |
`,

// Macrobeats, Microbeats and Divisions in Duple Meter (Lesson 9, 12 patterns, 2/4; Ta = division): Mullen, The Literate Musician, 2nd ed., p. 45. B/4 is a sixteenth.
"mullen-rhythm-duple-divisions":
`X:1
M:2/4
L:1/4
K: clef=none
B B | B/4B/4B/4B/4 B |

X:2
M:2/4
L:1/4
K: clef=none
B B/4B/4B/4B/4 | B/B/ B |

X:3
M:2/4
L:1/4
K: clef=none
B/B/ B | B/4B/4B/4B/4 B |

X:4
M:2/4
L:1/4
K: clef=none
B/4B/4B/4B/4 B/B/ | B/B/ B |

X:5
M:2/4
L:1/4
K: clef=none
B B/4B/4B/4B/4 | B/4B/4B/4B/4 B |

X:6
M:2/4
L:1/4
K: clef=none
B/4B/4B/4B/4 B/4B/4B/4B/4 | B B |

X:7
M:2/4
L:1/4
K: clef=none
B/4B/4B/ B/4B/4B/ | B/B/ B |

X:8
M:2/4
L:1/4
K: clef=none
B/ B/4B/4 B/ B/4B/4 | B/B/ B |

X:9
M:2/4
L:1/4
K: clef=none
B/4B/4B/ B | B/ B/4B/4 B |

X:10
M:2/4
L:1/4
K: clef=none
B/ B/4B/4 B/4B/4B/ | B/4B/4B/4B/4 B |

X:11
M:2/4
L:1/4
K: clef=none
B/4B/4B/4B/4 B/4B/4B/ | B/ B/4B/4 B/4B/4B/4B/4 |

X:12
M:2/4
L:1/4
K: clef=none
B/4B/4B/ B/4B/4B/4B/4 | B/ B/4B/4 B |
`,

// Macrobeats, Microbeats and Divisions in Triple Meter (Lesson 10, 8 patterns, 6/8; Ta = division): Mullen, The Literate Musician, 2nd ed., p. 47. B/ is a sixteenth (L:1/8).
"mullen-rhythm-triple-divisions":
`X:1
M:6/8
L:1/8
K: clef=none
B/B/ B B B3 | B/B/ B B B3 |

X:2
M:6/8
L:1/8
K: clef=none
B B/B/ B B B/B/ B | B B/B/ B B3 |

X:3
M:6/8
L:1/8
K: clef=none
B3 B B B/B/ | B B B/B/ B3 |

X:4
M:6/8
L:1/8
K: clef=none
B B B B/B/ B/B/ B/B/ | B B B B3 |

X:5
M:6/8
L:1/8
K: clef=none
B/B/ B B B3 | B B/B/ B B3 |

X:6
M:6/8
L:1/8
K: clef=none
B B B/B/ B/B/ B/B/ B/B/ | B B/B/ B B3 |

X:7
M:6/8
L:1/8
K: clef=none
B B B/B/ B B/B/ B | B/B/ B B B3 |

X:8
M:6/8
L:1/8
K: clef=none
B/B/ B B B/B/ B/B/ B/B/ | B B B/B/ B B B |
`,

// Duple Elongation Rhythm Cells (Lesson 12; four one-measure cells in 2/4): Mullen, The Literate Musician, 2nd ed., p. 48.
"mullen-rhythm-duple-elongation-cells":
`X:1
M:2/4
L:1/4
K: clef=none
B3/2 B/ |

X:2
M:2/4
L:1/4
K: clef=none
B/ B3/2 |

X:3
M:2/4
L:1/4
K: clef=none
B/ B B/ |

X:4
M:2/4
L:1/4
K: clef=none
B2 |
`,

// Triple Elongation Rhythm Cells (Lesson 13; three one-measure cells in 6/8): Mullen, The Literate Musician, 2nd ed., p. 49.
"mullen-rhythm-triple-elongation-cells":
`X:1
M:6/8
L:1/8
K: clef=none
B2 B B3 |

X:2
M:6/8
L:1/8
K: clef=none
B B2 B3 |

X:3
M:6/8
L:1/8
K: clef=none
B6 |
`,

// Reynolds, Valerio, Bolton, Taggart and Gordon, The Early Childhood Music Curriculum: Guide for Parents, Teachers and Caregivers (Music Play) (GIA, 1998), Part 6, 'Rhythm Acculturation Patterns without Words: Stages 1-3', printed p. 32 (PDF p. 36), Usual Duple Meter: six one-measure (two-macrobeat) patterns, written with quarter-note macrobeats.
"musicplay-acculturation-rhythm-duple":
`X:1
M:2/4
L:1/4
K: clef=none
B3/4 B/4 B |

X:2
M:2/4
L:1/4
K: clef=none
B/4B/4B/4B/4 B |

X:3
M:2/4
L:1/4
K: clef=none
B/ B/4B/4 B |

X:4
M:2/4
L:1/4
K: clef=none
B/4B/4B/ B |

X:5
M:2/4
L:1/4
K: clef=none
B/4 B3/4 B |

X:6
M:2/4
L:1/4
K: clef=none
B/4 B/ B/4 B |
`,

// Reynolds, Valerio, Bolton, Taggart and Gordon, The Early Childhood Music Curriculum: Guide for Parents, Teachers and Caregivers (Music Play) (GIA, 1998), Part 6, 'Rhythm Acculturation Patterns without Words: Stages 1-3', printed p. 32 (PDF p. 36), Usual Triple Meter: five one-measure patterns, dotted-quarter macrobeats.
"musicplay-acculturation-rhythm-triple":
`X:1
M:6/8
L:1/8
K: clef=none
B3/2 B/ B B3 |

X:2
M:6/8
L:1/8
K: clef=none
B/ B3/2 B B3 |

X:3
M:6/8
L:1/8
K: clef=none
B B/ B3/2 B3 |

X:4
M:6/8
L:1/8
K: clef=none
B B3/2 B/ B3 |

X:5
M:6/8
L:1/8
K: clef=none
B/B/B/B/B/B/ B3 |
`,

// Reynolds, Valerio, Bolton, Taggart and Gordon, The Early Childhood Music Curriculum: Guide for Parents, Teachers and Caregivers (Music Play) (GIA, 1998), Part 6, 'Rhythm Imitation and Assimilation Patterns without Words: Stages 4-7', printed p. 36 (PDF p. 40), Usual Duple Meter: four two-measure (four-macrobeat) patterns.
"musicplay-imitation-rhythm-duple":
`X:1
M:2/4
L:1/4
K: clef=none
B B | B/B/ B |

X:2
M:2/4
L:1/4
K: clef=none
B B | B/4B/4B/4B/4 B |

X:3
M:2/4
L:1/4
K: clef=none
B/B/ B/B/ | B/4B/4B/4B/4 B |

X:4
M:2/4
L:1/4
K: clef=none
B/B/ B/B/ | B/ B/4B/4 B |
`,

// Reynolds, Valerio, Bolton, Taggart and Gordon, The Early Childhood Music Curriculum: Guide for Parents, Teachers and Caregivers (Music Play) (GIA, 1998), Part 6, 'Rhythm Imitation and Assimilation Patterns without Words: Stages 4-7', printed p. 36 (PDF p. 40), Usual Triple Meter: four two-measure patterns.
"musicplay-imitation-rhythm-triple":
`X:1
M:6/8
L:1/8
K: clef=none
B3 B3 | B/B/B/B/B/B/ B3 |

X:2
M:6/8
L:1/8
K: clef=none
B3 B3 | B3/2 B/ B B3 |

X:3
M:6/8
L:1/8
K: clef=none
BBB BBB | B/ B3/2 B B3 |

X:4
M:6/8
L:1/8
K: clef=none
BBB BBB | B/B/ B B B3 |
`,
}
