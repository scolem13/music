# Modelled bells, chime tubes and bass bars (2026-11-28)

Additive modal synthesis: one sine per partial, each with a level and a T60. Code: `MODAL` in `apps/shared/lessons/ambient-kit.js`
(used by the Ambient Generator's loop notes and wind-chime gusts, and by the `modal` widget on tools/ambient.qmd). Sources for the site:
`scripts/sources/ambient-models.py`. The owner's verdict (2026-11-28): wind chimes and bass bars are good enough to use; the bells need more work.

## Measured (with source)
- Church bell, ratios to the prime (Westminster Abbey tenor, Hibbert): hum .501, prime 1, tierce 1.187, quint 1.499, nominal 2, weak
  2.49 / 2.54 / 2.58 / 2.79, superquint 2.998, octave nominal 4.13 (3.73-4.36 with thickness), 5.36, 6.69, 8.05, 9.53.
- Tierce often the loudest, quint very quiet (Hibbert, "Musical sound quality"). Doublet 831.7 / 832.3 Hz on a 528 kg bell (Hibbert).
- Strike note: a virtual pitch about an octave below the nominal, from nominal, superquint and octave nominal; heavy bells add a
  secondary strike from I-7, a fourth above the nominal; above a 1600 Hz nominal the hum / prime set the note (Hibbert).
- Carillon bell C3: the low modes ring about 100 s; clapper contact 1-1.4 ms; harder strikes are brighter at 1.5-3 kHz (Rau, Das and
  Canfield-Dafilou, DAFx-19).
- Chime tube (free-free): 1, 2.756, 5.404, 8.933, 13.34, 18.64 (Hite p. 56); sustain mainly the fundamental; 1st overtone ~2 s at
  272 Hz (p. 57); C2 chime sounds about like C5 (pp. 15-16); dead centre misses the 1st overtone (Chimes.htm). Tubular bells (thick
  bronze): 1, 2.71, 5.19, 8.33, 11.95, 16.1, 20.5; mode 1 very quiet; strike note an octave below mode 4 (Hibbert, "Tubular bells").
- Bars: marimba 1:4:10 (Rossing 2004); decay 2 s at C3 to 1/50 s at C7, vibraphone 30 s low to 6 s high (US 4,411,187); overtones
  1 and 2 decay in 1/2 and 1/7 of the fundamental's time (Bork and Meyer via McCarthy 1994); low resonator builds up in ~0.7 s
  (McCarthy); contact time T damps above ~2/T (Kirkby).

## Estimates (no source yet)
Bell levels other than tierce / quint / nominal; bell T60 falling as 1/frequency; hum ringing 1.7x the prime; how quietly a long
tube radiates its fundamental (below ~250 Hz); wind-chime ring times beyond Hite's 2 s; wood bar times below C3; how much a
resonator lengthens (wood, x1.3) or shortens (metal, x0.8) the ring; the strike "thunk".

## Not read (blocked or paywalled)
Perpignan carillon damping study (campaners.com, TLS error); Fletcher and Rossing (file too large); Bork 1995 (paywall);
JSV 2022 bar-resonator paper (403); Rossing, Science of Percussion Instruments; Lehr in the original.

## Next: the bells
Only one bell (Westminster Abbey tenor) is measured in the model. The owner will record a Vietnamese-made bell at a Buddhist temple
in WA: East Asian temple bells are a different shape from Western church bells (no tuned minor-third profile), so the model needs a
second family, set from published measurements of East Asian bells and then from the owner's recording.
