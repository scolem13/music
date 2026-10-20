# François Couperin, L'Art de toucher le clavecin (Paris, 1716), "Agréments qui servent au jeu", pp. 6-7 of
# Nicolas Sceaux's edition (IMSLP #22200, engraved from the BnF 1716 print). Moved onto C.
TABLES = [dict(id="couperin-1716", cols=("Couperin's name", "Sign", "Played"), rows=[
    dict(name="Pincé simple", gloss="mordent: the note below once, then the note held", sign="!mordent!c8", played="cB c6",
         note="Written in small notes; their exact length is not given."),
    dict(name="Pincé double", gloss="a longer mordent, stopping on the note (<em>point d'arrêt</em>) inside its value",
         sign="!mordent!c16", played="cBcBcB c8-c2", width=(90, 160)),
    dict(name="Port de voix", gloss="the small note below \"strikes with the harmony\": on the beat; here with a pincé",
         sign="{B}!mordent!c8", played="B4 cB c2"),
    dict(name="Tremblement", gloss="always from the note or semitone above: the <em>appui</em> (leaned on), the beats (starting slower than they end), the <em>point d'arrêt</em>",
         sign="!trill!c16", played="d4 dcdcdc c6", width=(90, 160),
         note="The beats speed up; even notes here. The length of the <em>appui</em> is left to the player."),
])]
