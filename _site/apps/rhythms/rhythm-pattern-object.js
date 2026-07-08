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
}
