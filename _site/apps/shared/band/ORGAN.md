# The tonewheel organ

The band's `hammond` sound (`sounds.js`), the organist's pedal and switch (`organist` in `comp.js`), and the panel on the
Backing Track page. Written 2026-10-10. **Nobody has listened to it.** Every level and rule below is either taken from a
source (linked) or is a first guess, and the two are kept apart so the guesses are easy to find and change.

What was asked for: all nine tonebars, the upper manual only, the C3 chorus, and a band that works the swell pedal and
the Leslie speed by itself. Not built: percussion, the lower manual, bass pedals, the other vibrato settings.

## How far to trust the sources

Three kinds, in falling order: technical write-ups read in full ([Electric Druid][druid], [Scott Healy's][healy] playing
tips, [Wikipedia][leslie]); documents quoted in search results but not opened ([the Hammond service text][b3world],
[Stefan Vorkoetter][stefanv]); and forum posts quoted in search results, where the link is to the thread the search named
and the exact post was not checked ([Keyboard Corner][kc], [Cantabile][cantabile], [Nord][nord], [Fractal][fractal]).
Anything resting only on the third kind is one player's word.

## How the sound is made

Nothing is sampled. Each note is three oscillators, a few milliseconds of noise, and then one chain shared by all the notes.

| Part | What it does | Where the numbers come from |
|---|---|---|
| Tonebars | Nine pitches for a key: 16′, 5⅓′, 8′, 4′, 2⅔′, 2′, 1⅗′, 1⅓′, 1′, at 0.5, 1.5, 1, 2, 3, 4, 5, 6 and 8 times the note | [Electric Druid][druid] |
| Tonebar steps | 0 is silent; each step from 8 down is 3 dB quieter | A clone's description of the real instrument ([Hammy 91][hammy]); widely repeated, not from a Hammond document |
| Tempering | The fifths and the third are tempered wheels, not pure harmonics: 1.4988, 2.9976, 5.0409 and 5.9953 times the note. So a note is one oscillator for the octaves, one for the three fifths, one for the third | [Electric Druid][druid] |
| Foldback | 91 wheels. Key 1 (C2) takes its 8′ from wheel 13. A pitch above wheel 91 is taken an octave lower; the bottom octave's 16′ an octave higher | [Electric Druid][druid] (its table did not survive being read by machine; the rule here reproduces its wheel ranges) |
| Leakage | A closed tonebar still lets a trace through (−48 dB, octaves only) | That it exists: [Electric Druid][druid]. The amount: a guess |
| Key click | A key's nine contacts do not close together. Here: 22 ms of filtered noise as a note starts, with its own slider | The cause: [Electric Druid][druid]. The sound of it: a guess |
| Touch | None. A note is the same level however it is played | [Scott Healy][healy]: "the organ isn't velocity-sensitive" |
| C3 chorus | A delay swept up and back 6.87 times a second (412 turns a minute), about 0.9 ms from end to end, mixed half and half with the straight sound | Rate and that the scanner runs up the line and back: [Hammond service text][b3world]. About 50 µs a stage over 18 stages: [Stefan Vorkoetter][stefanv] (an M-100, not a B-3). The half-and-half mix: a guess; no source gives the real ratio |
| Swell pedal | Never silent: 24 dB down at its quietest. Keeps the bass up as it closes. Sits before the tube stage, so opening it also adds growl | That it never closes, lifts bass and treble as it comes down, and drives the amp harder as it opens: [Nord forum, quoting a Hammond manual][nord]. The 24 dB and the 7 dB of bass: guesses; no source gives figures |
| Tube drive | The amp-chain drive already in the band, set low | A guess |
| Rotary speaker | Split at 800 Hz into a horn and a drum. Horn 48 turns a minute slow, 400 fast; drum 85% of that. Two microphones on opposite sides | Crossover and speeds: [Wikipedia][leslie]; 48 / 400 and 40 / 342 measured on a 147: [Fractal forum][fractal] |
| Speed changes | The horn gets most of the way in about 1.5 s, the drum in about 5 s | "Less than two seconds" and "4 to 10 seconds, depending on belt tension": one forum post, found by search. No measured figure exists that I could find, so treat it as anecdote |

Measured in `tests/band/pat/organ.cdp.js`: with every tonebar out, all nine pitches of A4 come out within 0.2 dB of each
other; the 1⅗′ sits at 2218 Hz, not the pure 2200; C7's 1′ sounds at 4186 Hz (two octaves folded back); two steps of a
tonebar are 6.0 dB; the pedal closed is 24 dB down; the speaker moves the level 0.8 times a second slow and 6.67 fast, and
summed to mono the swing all but cancels.

## The registrations in the menu

**None of these is sourced.** The searches named famous registrations (Jimmy Smith, Charles Earland, Groove Holmes,
Erroll Garner, "full organ") but gave no digits, so the menu describes each sound and attributes it to nobody.
The default is 88 8000 000.

## The organist: what the band does by itself

`BandComp.organist` decides, bar by bar, where the pedal sits and when the speaker changes speed. It uses no random
numbers. Each rule, and what it rests on:

**Swell pedal**

| Rule | Why |
|---|---|
| It follows how hard the band is playing: about half open when the band plays down, nearly open at full, a little more in a chorus | The organ has no touch, so the pedal is its only dynamics ([Healy][healy]: "vary the dynamics using the expression pedal") |
| The last bar of each four-bar phrase opens through the bar into the next one; more so going into a chorus | "Start with the expression pedal at minimum, then increase the pedal slowly"; a crescendo into the build ([Healy][healy]) |
| The first bar of a phrase settles back a little | "Back off the pedal as the speaker slows down" ([Healy][healy]) |
| A stop bar is hit and then pulled back sharply | "Pull the expression pedal back suddenly for a sforzando effect" ([Healy][healy]) |
| The last chord swells and is let go | A guess |

**Leslie**

| Rule | Why |
|---|---|
| Slow is home | Rock and blues players "lean on that chorale mostly" (a forum post: [Keyboard Corner][kc] or [Cantabile][cantabile]) |
| Fast through the last bar of a phrase that leads into a chorus or back to the top, or that the band is playing hard; slow again as the next phrase starts | "As your single note starts to build, pop your Leslie or rotary switch to fast, and depress the pedal" ([Healy][healy]). A forum player describes speeding up at the end of a phrase ([Cantabile][cantabile]) |
| On a chord held two bars or more, a flick to fast for the second half of the phrase's last bar and straight back | "Flip the Leslie to fast, then immediately flip it back to slow" under pads ([Healy][healy]) |
| In swing the speaker stays slow, until the last two bars of the last chorus | Jazz players mostly leave the speaker alone and rely on the chorus (a forum post, [Keyboard Corner][kc] or [Cantabile][cantabile]: they "stop the horn entirely for the vast majority of work"). Slow, not stopped, is my choice |
| Fast on the final chord | A guess; a common ending |

Thresholds that are mine: "playing hard" is an intensity of 0.66 or more; the flick lasts a beat and a half; the pedal's
range is 0.48 to 0.90 of its travel across the band's intensity.

**Nothing was found for gospel.** The searches turned up no description of gospel pedal or Leslie habits, so the
straight-eighth rules above are rock and blues habits applied to everything that is not swing.

## On the page

Mixer → *Organ: tonebars, swell and Leslie*, shown while the organ is the comping instrument or the second one: nine
tonebars, a registration menu, Leslie (Automatic / Slow / Fast / Stopped), Swell pedal (Automatic / By hand), key click.
The chorus, the pedal's range, the drive and the speaker's own numbers are in Mixer → *Tone (EQ)*, in the organ's amp.
Settings are kept in the browser (`localStorage.btOrgan`, and `btAmp` for the amp).

## Not modelled

- Percussion, the lower manual, pedals, V1 to V3 and C1, C2.
- Tapering (each wheel's own level across the keyboard), which a commenter on [Electric Druid][druid] calls the main reason for the instrument's scream.
- Leakage between neighbouring wheels at other pitches; contact bounce note by note.
- The cabinet: no reflections, no horn tone, one tube stage for both rotors.
- Tonebar moves, chorus on and off, and registration changes are not played by the band: only the pedal and the speed.
- The comping is the piano's voicings. An organist's held chords with a moving finger under a held top note
  ([Healy][healy], Ex. 2) are not written.

## To ask the player

1. When do you reach for fast: into every chorus, or only the last one? On held chords? At endings?
2. In jazz, do you leave the speaker slow, stopped, or off altogether with the chorus doing the work?
3. Where does your foot sit when comping: about half, or lower? How far do you open into a chorus?
4. Your comping registration, and whether you change it between verse and chorus.
5. Chorus C3 always on, or only for some styles?

[druid]: https://electricdruid.net/?p=316
[hammy]: https://native-instruments.com/en/reaktor-community/reaktor-user-library/entry/show/6257
[healy]: https://www.bluedogmusic.com/rock-organ-cred-3279
[b3world]: https://www.b3world.com/hammond-technical-information-02.html
[stefanv]: https://stefanv.com/electronics/hammond_vibrato_mod.html
[nord]: https://www.norduserforum.com/viewtopic.php?p=164390
[leslie]: https://en.wikipedia.org/wiki/Leslie_speaker
[fractal]: https://forum.fractalaudio.com/threads/leslie-different-speeds-for-treble-horn-and-bass-speaker.16193/
[cantabile]: https://community.cantabilesoftware.com/t/corky-s-vst-organ-tips-and-tweaks-page/3330?page=13
[kc]: https://forums.musicplayer.com/topic/173796-leslie-speed-control-foot-switch-or-half-moon-and-why/page/3/
