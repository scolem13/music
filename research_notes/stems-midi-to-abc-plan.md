# Recording → stems → MIDI → ABC: plan and research (noted 2026-11-28)

Goal: turn a recording into site ABC: the melody, and later bass/piano parts. The steps are stem split (audio-separator /
demucs), note detection, beat grid, quantize, then ABC. A demo of each note detector is in
`~/Downloads/Stem Split Demo - Never Gonna Give You Up/06 MIDI/REPORT.md` (basic-pitch, CREPE, PESTO, transkun, ByteDance,
ADTOF).

## The problems already seen (MIDI → ABC on this site)
- `midi2abc` lost pickups and triplets and made octave errors (`convert-mtd.py`), so don't use it.
- Even clean MIDI needs a per-beat choice between a sixteenth grid and a triplet grid, notes played shorter than written
  (`/0.95`), rests inferred from gaps, and pitch spelling from the key (`convert-bimmuda.py`).
- Transcribed MIDI adds more problems: no tempo map (the file says 120 bpm, the band doesn't), tempo drift, swing, long notes
  broken into repeats, short blips, octave jumps, and an unknown meter and pickup.

## Plan
1. **Beat grid from the audio, not from the MIDI.** Run a beat and downbeat tracker on the full mix, or on the drum stem.
   The output is beat times and bar starts, which give the meter (beats per bar) and the pickup (notes before the first
   downbeat).
   - **Beat This!** (ISMIR 2024, `beat_this`, PyTorch): accurate on many styles, with no DBN step.
   - **madmom** DBN (`DBNDownBeatTracker`): older, and still ties or beats Beat This! against human tapping (GlobalTap).
     It's hard to install on new Python.
   - Fallback: tap along in the site's Tap-Along or Timestamp Notes, so the beats come from a person.
2. **Turn note times into beat positions** by interpolating each note's start and end between the beat times on either side.
   This removes tempo drift and rubato before quantizing, so a fixed-tempo grid is never needed. `Q:` is the median beat
   interval.
3. **Clean the notes before quantizing (melody):** keep one note at a time (the loudest or longest), merge repeats of the
   same pitch with gaps under ~40 ms, drop notes under ~60 ms, and fix an isolated octave jump. Using CREPE or PESTO on the
   vocal stem avoids basic-pitch's chord and octave noise. basic-pitch is still the choice for bass, guitar and piano stems.
4. **Quantize (three levels):**
   - a. **Grid quantize per beat** (start here): reuse `convert-bimmuda.py`'s choice of sixteenths or triplets for each
     beat, applied to beat positions instead of ticks. Add a swing check: if off-beat eighths sit near 2/3 of the beat, write
     straight eighths and a "swing" note, as the Real Books do. Lengths: snap the end, or run each note to the next onset
     when a gap is under one grid step.
   - b. **Learned quantizers, piano MIDI:** PM2S (Liu et al. 2022, `cheriell/PM2S`) predicts beats, quantized onsets, key,
     time signature and hands. MIDI2ScoreTransformer (Beyer & Dai, ISMIR 2024) goes straight from performance MIDI to
     MusicXML. Both were trained on classical piano (ASAP), so treat them as an experiment for pop stems.
   - c. **HMM rhythm transcription** (Nakamura et al.): tempo is modelled as a hidden variable and triplets are handled
     well. The authors report it beats MuseScore and Finale quantization. The code is research C++.
   - Singing: Kim et al. 2025 ([arXiv 2502.12438](https://arxiv.org/abs/2502.12438)) predicts note values from singing
     audio directly, using beat tracking. Worth checking for code.
5. **Key and spelling:** estimate the key (music21 `analyze('key')`, or from the chords), then spell as `convert-bimmuda.py`
   already does.
6. **Write the ABC** with the site's own writer (bimmuda-style: L:1/8, beaming like `notation-doc.js`, `(3` triplets), or
   go through MusicXML → `abc-xml-converter`. Mark low-confidence bars with `%unsure [bars N-M]`, as in
   `rhythm-transcription.md`.
7. **Test** on the 30 s Never Gonna Give You Up lead vocal and bass: the melody is well known, so errors are easy to hear.
   Then try a Christmas show song.

## Sources
- PM2S: https://zenodo.org/records/7316682
- MIDI2ScoreTransformer: https://arxiv.org/abs/2410.00210
- Beat-annotation quantizer (Wachter et al.): https://arxiv.org/pdf/2604.22290
- Beat This!: https://arxiv.org/html/2407.21658v1 · GlobalTap benchmark: https://arxiv.org/pdf/2611.11137
- BeatNet: https://arxiv.org/pdf/2108.03576
- Nakamura HMM rhythm transcription: https://ar5iv.labs.arxiv.org/html/1701.08343 ·
  https://webspace.eecs.qmul.ac.uk/s.e.dixon/pub/2018/Nakamura-et-al-ICASSP2018.pdf
- Singing note values: https://arxiv.org/html/2502.12438v1 · ROSVOT: https://aclanthology.org/2024.acl-long.526
- Pop audio → MusicXML (statistical): https://www.cambridge.org/core/product/0AE8AEECB24DC3D9B689459E11DDA03F/core-reader
- Practitioner view (basic-pitch MIDI, unusable notation without cleanup): https://musescore.org/en/node/347954

## First test (2026-11-28): `scripts/midi-to-abc/beat_abc.py`
Output: `~/Downloads/Stem Split Demo - Never Gonna Give You Up/07 ABC/` (Beat This! beats in 18 s; the CREPE, PESTO and
basic-pitch vocals each with the basic-pitch bass). Key detected as A major. The vocal is only 3 cents off concert pitch, so
this rip really is in A.
- Works: the beat grid, bar lines and downbeats, Q:115, legato joining (a gap under an eighth closes up).
- Still wrong: backing-vocal and instrument bleed in the vocal stem before the voice enters; octave errors in the basic-pitch
  bass (F,, against F,,,); some (3:2:n groups where the music is straight. 8 of 14 vocal bars are %unsure.
- Next: drop melody notes before the first long sung phrase or below a confidence or velocity floor; fix bass octaves by
  keeping each note in the octave nearest a running median; raise the triplet penalty; use the CREPE vocal (the cleanest of
  the three).
