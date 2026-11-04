# Sampling the MODX+ into one software kit (exploration, 2026-11-04)

Goal: one drum/percussion kit that combines the MODX sounds Sean picks on the Auditions page (gear/modx-perc.qmd) and
plays when the MODX isn't there: in a DAW, and maybe in the site's band.

## What the licence allows

MODX+ Owner's Manual, "About copyrights" (~/Documents/Manuals/Yamaha-MODX-plus-Owners-Manual.pdf):

- "Copying of the commercially available musical data including but not limited to MIDI data and/or audio data is strictly
  prohibited except for your personal use."
- The bundled contents (it lists "WAVE data") may not be distributed in media "in which these contents are saved or recorded
  and remain virtually the same or very similar to those in the product."
- Distributing *your performance or music production* using the sounds is allowed without asking Yamaha.

So: a sampled kit on Sean's own computers, used to make and play music = fine. Songs and recordings made with it = fine.
**Putting the samples on the site (even behind the password, for students) or sharing the kit = distributing the WAVE data:
not allowed** without Yamaha's permission. Forum opinion agrees (Yamaha Musicians forum, KVR "Legality of distributing
sampled synths"); not legal advice. This is why NOTES.org's "Sampling mode" TODO said check the licence first.

## What the MODX gives us to record from

From the Owner's Manual and Reference Manual (MODX+):

- USB audio out: **10 channels (5 stereo pairs), 44.1 kHz**. Each Part can go to its own pair (EDIT → Part Settings →
  General → "Part Output"), so one pass can record several kits at once on different channels, dry and separate.
- Per drum key (Reference Manual, Drum Key Edit): reverb and variation sends (**KeyRev / KeyVar**, set to 0 for dry
  samples), **Drum Key Out** (send one key to its own output), **Rcv Note Off** (most keys ignore note-off: hold time doesn't
  matter, record the full decay), **Alternate Group** (the hi-hat choke: closed cuts open; the software kit needs the same,
  SFZ `group` / `off_by`).
- Turn the Part's insert effects and the master EQ/compressor off for a neutral sample, or leave them on to keep the
  kit's character (the MODX kits are voiced with them; try both by ear).
- Velocity: wave names like "Sd Oak 1-4 St" or "Conga1 Hi Open 1-2" probably mean several velocity layers or alternates
  inside one wave (UNVERIFIED: the Data List does not say). Practical answer: record each key at several velocities and
  keep the ones that sound different.

## How many samples

A kit of the keys actually used (~25 drums + ~30 percussion), 5 velocities (e.g. 24, 48, 72, 100, 127), 2–3 takes each
(round robins, in case the board alternates samples), 2 s each (cymbals 4–6 s):
~55 keys × 5 × 3 ≈ 800 hits ≈ 30 minutes of recording, about 400 MB as 24-bit stereo WAV before trimming. Fine on a laptop.

## Ways to do it

1. **Logic Pro Auto Sampler** (Mac, in Logic since 10.5 by MusicTech's account; ask.audio described an earlier MainStage
   route). Sends MIDI out, records the audio back, builds a Sampler instrument with velocity layers and round robins.
   Built for pitched instruments across a key range; for a drum kit set the interval to every semitone and no looping.
   Velocity layers need a velocity-sensitive source (Apple's guide) — the MODX is. Output: a Logic Sampler instrument
   (EXS-style), so it stays in Logic/MainStage.
2. **SampleRobot** (Skylife; Yamaha has offered a "SampleRobot MONTAGE" edition to MONTAGE owners — whether it covers the
   MODX+ is UNVERIFIED). Automatic multi-velocity sampling; exports WAV, SFZ, SoundFont 2, Kontakt, EXS24, HALion and more.
   Paid; the most complete tool.
3. **Record in Ableton Live by hand** (Sean has Live 11/12): a MIDI clip that plays every key at every velocity with gaps,
   record the MODX's USB audio, slice to a Drum Rack. Live 12's Sampler does round robin in its Zone view; velocity zones per
   pad work but are fiddly. Cheapest, most manual.
4. **A site tool that does it (not built; would be ours)**: a page that sends each key/velocity over Web MIDI (BandModx, as
   the Auditions page does), records the MODX's USB audio input in the browser (getUserMedia), trims each hit at its onset
   and silence, and **saves a zip to the computer: WAVs + an .sfz file** (velocity layers `lovel`/`hivel`, round robins
   `seq_length`/`seq_position`, hi-hat choke `group`/`off_by`, one-shots `loop_mode=one_shot`, per sfzformat.com's drum
   tutorial). The kit list comes straight from the Auditions page's ☆ picks (key maps already in modx-kits.js /
   modx-perc.js), so "the kit I'd use" becomes one button. Nothing is uploaded, so the licence is kept.
   The .sfz plays in sforzando (free), Logic's Sampler (UNVERIFIED that it imports SFZ; it imports EXS), Live via a converter
   or a sampler plug-in, and Decent Sampler can be targeted too.
   The site band could then **load that folder from disk** for this browser only (File System Access or a file picker,
   kept in IndexedDB), never uploaded: the band plays Sean's MODX kit away from the MODX, students keep hearing the site's
   own samples.

## One combined kit: a key layout

Pop Latin Kit and Brush Kit are the chosen kits (2026-11-04), plus whichever rock/pop/R&B/hip-hop kits win on the Auditions
page. Two layouts work:

- **Keep General MIDI for the drum kit** (kick C1, snare D1, hats F#1/A#1, toms, crash, ride) so every GM MIDI file and the
  site band's drum map play it, then put the Pop Latin keys where GM has them free or on a second instrument/channel
  (congas/bongos/timbales on GM 60–68; the rest on a second kit). Simplest to use.
- **Several kits on one keyboard by octave**, as the MODX does inside a kit (Pop Latin's congas A#0–B1, bongos C2–B2 …):
  needs its own map for the band; more compact, less standard.

Recommendation: two instruments — "Sean Kit" (GM layout, best kick/snare/hats/toms/cymbals from the winning kits, brushes
from Brush Kit on the GM brush keys C#0–E0) and "Sean Latin" (Pop Latin Kit's layout as is, since the auditions already
use it) — on two channels, like the MODX setup.

## Open questions

- Which kits win (Auditions page ☆ picks, "By kit" count).
- Dry or with the kit's effects.
- Option 4 (build the sampler page) vs. buying SampleRobot vs. Logic's Auto Sampler.

Sources: MODX+ Owner's Manual and Reference Manual (Yamaha, 2020); "How to sample your hardware synths with Logic's Auto
Sampler", MusicTech; Apple, "Auto Sampler controls in Logic Pro for Mac"; SampleRobot release notes (Sonicstate 2022,
Synthanatomy 2016); Sound on Sound, "Live 12 Drum Racks Revisited" (2025) and Ableton help, "How to create Round-Robin
sample playback"; sfzformat.com, "Drum basics"; Yamaha Musicians forum and KVR forum threads on sampling and distribution.
