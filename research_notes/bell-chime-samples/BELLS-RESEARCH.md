# Bell acoustics for the additive bell model (research, 2026-11-28)

For: extending the additive bell (one sine per partial: ratio, level, T60, doublet split) beyond the
Westminster Abbey tenor (Hibbert). Priority: East Asian temple bells, ahead of a recording of a
Vietnamese temple bell.

Rule used here: a number is either cited (source key in [brackets], see the list at the end, with page/table)
or marked **EST** (my estimate, to be replaced by measurement). Ratios are relative to the lowest mode
measured in that source.

## 1. What could and could not be read

- READ in full text: Korean Seongdeok bell papers [KimYM2025], [Cho2023], [KimYH1997]; Japanese bonshō paper
  [Sakurai2020]; Lehr's carillon paper on Hibbert's site [Lehr]; Hibbert's tuning pages [Hib-tuning],
  [Hib-quality]; Rossing's ASA lay paper on Asian bells [Rossing2004]; a Vietnamese paper on Nguyễn-dynasty
  bells [Nguyen2025]; the Vietnam National Museum of History page [BTLS].
- ABSTRACT ONLY: Rossing 1989 "Acoustics of Eastern and Western bells, old and new" [Rossing1989] (J-STAGE PDF
  download kept truncating; no PDF tools to read the part that arrived). Kurihara's 115-bonshō studies, Okuma
  1997 "Historical changes in the sound decay time of temple bells", Aoki et al. 1970 on adjusting the beat
  (J-STAGE abstracts via search only, not cited for numbers).
- NOT FOUND: any measured T60 per partial for any temple bell (only "how long it is heard"); any acoustic
  measurement of a Vietnamese bell (none in English or Vietnamese searches); a partial table for the Yongle
  bell or any Chinese Buddhist zhong; Kim Seock-hyun's JSV 2005 full text (beat periods below come from his
  co-workers' later papers instead); measured per-partial decay for Western bells (Hibbert says only that hum,
  prime and tierce last "many seconds"; Perrin et al. 1983 not read); a contact-time figure for the wooden
  beam (shumoku / dangmok).

## 2. Korean beomjong: Divine Bell of King Seongdeok (771 CE, 3.66 m, ~20 t [Rossing2004])

Struck by a log on the dangjwa (flat lotus boss) [Rossing2004]; the designated striking point is Point 1 of
24 around the lower body, struck "lightly" with a dedicated wooden hammer in the 2020-22 survey [KimYM2025 §2.1].

Paired frequencies, years 1996-2022 [KimYM2025 Table 1]:

| mode | L (Hz) | H (Hz) | split |
|---|---|---|---|
| 1 (hum) | 64.06-64.16 | 64.38-64.50 | 0.32-0.37 Hz; 0.34 Hz in 2021 and 2022, beat 2.94 s [§3.2] |
| 2 ("fundamental") | 168.31-168.63 | 168.44-168.75 | 0.10-0.13 Hz; beat measured as 9 s in the waveform [§3.2] |

Note the 9 s beat is longer than 1/0.13 = 7.7 s; the paper gives both. [Cho2023 Table 1] gives 0.08 Hz /
12.5 s for this pair. Sources disagree; use ~0.1 Hz.

Parameter table (ratios to 64.35 Hz; mean pair). Higher pairs from [Cho2023 Table 1], whose rows are
printed misaligned; my pairing below is the reading that makes each beat frequency equal the pair difference.
[KimYH1997 Fig. 8] lists 64.06, 64.38, 168.31, 168.44, 189.13, ~190.4, 281.63, 282.31, 345.50, 346.94, 348.44,
349.50 Hz, agreeing within ~1 Hz.

| ratio | Hz | split (Hz) | rel. level | T60 |
|---|---|---|---|---|
| 1.000 | 64.35 | 0.34 [KimYM2025] | 0 dB, strongest in the 56 s average spectrum [KimYH1997 §3.4] | longest; the only component left after ~10 s [KimYH1997 abstract]; **EST 60-90 s** (recorded 90 s [KimYH1997 §2]) |
| 2.62 | 168.7 | 0.10-0.13 [KimYM2025]; 0.08 [Cho2023] | **EST -6 dB** | "lasts for about 20 seconds after impact" [KimYM2025 §3.3]; **EST T60 25 s** |
| 2.95 | 190.1 | 1.26 [Cho2023] | **EST -10 dB** | **EST 10 s** |
| 3.55 | 228.3 | 0.32 [Cho2023] | **EST -12 dB** | **EST 8 s** |
| 4.39 | 282.6 | 0.66 [Cho2023]; 0.68 [KimYH1997] | **EST -12 dB** | **EST 6 s** |
| 5.38-5.43 | 346.2-349.9 | four close lines 1.44 / 1.46 / 0.80 [Cho2023] | **EST -15 dB** | **EST 5 s** |
| >6 | up to 800 Hz+ | | about 50 modes under 1000 Hz [KimYM2025 §3.1] | high partials "almost gone after 10-20 s" [KimYH1997 §3.3] |

Envelope: three stages, the strike (broad, almost "white noise" to 800 Hz), the decay (highs die), and the
"yeoeum" afterglow where only the 64 Hz pair beats at ~3 s [KimYH1997 abstract, §3.1, Fig. 3]. The 168 Hz beat
is heard as sound that "fades away, then comes back to life ... for about 9 seconds" [KimYM2025 §3.3].
Beat depth depends on direction: amplitude ratio of the two 64 Hz lines ~10 in one direction, ~2 in another
[Cho2023 §2.2]; the hum beat is clear at Points 3-4 but not at the striking point or 90° from it
[KimYM2025 §3.3]. For the model: a per-partial "beat depth" (relative level of L and H) is worth adding.
Cracks shorten the beat: the Sangwonsa (Boshingak) bell had a 102 Hz hum with 0.5 s beat when cracked,
105 Hz and 4.5 s after welding [KimYM2025 §1].

## 3. Japanese bonshō

Measured, Mii-dera bell, mic beside the bell [Sakurai2020 §3(2), Fig. 3]: 109, 253, 320/323, 350, 216, 409,
466/477, 567 Hz (listed in order of strength; "/" = split peak). With a mic inside the bell a 47 Hz peak
appears, weak outside but long-lasting; a 191 Hz peak too [same]. At 13 s after the strike only 109 and 216 Hz
remain (plus 47 Hz inside) [same].

Earlier ratio claims [quoted in Sakurai2020 §1]: Obata & Tesima 1934, 2:5:7:9:11; Rossing 1989 (30.3 cm bell),
2:5:7:9:11:13:16; Nishiguchi & Takazawa 1997 (80 cm bell, lowest 137.8 Hz) 1 : 2.190 : 2.747 : 2.840 : 3.159
: 3.733 : 4.051. Across eight CD-recorded temple bells the lowest peak is 41-129 Hz and the second partial
109-312 Hz, ratio 2.32-2.80, mean 2.55 [Sakurai2020 abstract, Table 3]. The sources disagree because the
"lowest" peak measured differs.

Parameter table, Mii-dera, ratios to 109 Hz (the audible "fundamental"):

| ratio | Hz | split | rel. level | T60 |
|---|---|---|---|---|
| 0.43 | 47 | ? | weak outside the bell [Sakurai2020] — **EST -20 dB** | long [Sakurai2020]; **EST 40 s** |
| 1.00 | 109 | ? | strongest [Sakurai2020 order] | still present at 13 s; **EST 30 s** |
| 1.98 | 216 | ? | 5th strongest at 3 s | present at 13 s; **EST 25 s** |
| 2.32 | 253 | ? | 2nd | **EST 8 s** |
| 2.94-2.96 | 320/323 | ~3 Hz [Sakurai2020] | 3rd | **EST 7 s** |
| 3.21 | 350 | ? | 4th | **EST 6 s** |
| 3.75 | 409 | ? | 6th | **EST 5 s** |
| 4.28-4.38 | 466/477 | ~11 Hz (a pair of modes, not a doublet?) | 7th | **EST 4 s** |
| 5.20 | 567 | ? | 8th | **EST 3 s** |

Levels by period: the 2nd partial is relatively louder in Nara and Edo bells, the 3rd louder since Edo;
the fundamental's level peaks in Nanbokuchō bells [Kurihara, via search abstract only, unverified].
Beat ("unari"): Japanese research adjusts beat rate and afterglow length with local masses (Aoki 1970,
abstract only); no beat periods found. Terminology: Murata calls the stages tsuki (strike), oshi / okuri;
Murata and Wikipedia disagree which is "decay" (search result; unverified, not used).
Striking point: the tsukiza (lotus boss), struck by the shumoku log. Obata & Tesima found partial frequencies
do not change with the striking point (search summary of a 1930s paper; unverified).

## 4. Chinese temple bells

- Buddhist zhong / Yongle bell: no partial table found. Size: 4.5 m, est. 52 t [Rossing2004]. A
  frequency range "22-800 Hz" and 120 dB appear only on Wikipedia (weak provenance, not used).
- One paper calls Chinese bells "relatively noisy" with "short resonance" next to Korean ones (ProQuest
  abstract seen in search; Korean-authored, partisan; unverified).
- Ancient bianzhong (two-tone): almond cross-section gives widely split pairs, two different notes from
  the sui and gu strike points [Rossing1989 abstract; Rossing2004]. Not a temple-bell model.
- Model: until measured, use the Korean/Japanese partial set with larger splits and shorter T60 (**EST**).

## 5. Vietnamese bells (chuông chùa, đại hồng chung)

No acoustic measurement found. Shape: "cylindrical body, square shoulder and flaring mouth", handle of two
dragons back to back, "four clapping-knobs in a flower shape" (the striking bosses) [BTLS]. Sizes:
Thiên Mụ đại hồng chung 1710: diameter 1.4 m, height 2.5 m, 3285 kg [Nguyen2025 p.118, quoting another
source]; a Nguyễn bell of 25 kg, 70 cm high, mouth 35 cm, body 52 cm [Nguyen2025]; Bái Đính 36 t, 5.5 m tall,
~3.5 m wide (news) [Vietnamnet]. Height/diameter ~1.8 at Thiên Mụ, so near-cylindrical like Chinese and
Japanese bells; no Korean sound tube (Korean tube is "not found in Chinese and Japanese" bells, search
result). **EST**: start from the Japanese table, since the flaring mouth and Chinese-style dragon loop
suggest the Chinese/Japanese family; replace with the recording.

## 6. Western bells (for a "bell type" choice)

Ratios to hum. T60 for Western bells: not found as numbers; Hibbert: hum, prime and tierce "often last ...
many seconds" [Hib-tuning]; quint "typically a very quiet partial", tierce "often the highest amplitude"
[Hib-quality].

| type | hum | prime | tierce | quint | nominal | source |
|---|---|---|---|---|---|---|
| ideal minor-third | 1 | 2 | 2.4 | 3 | 4 | [Hib-tuning] cents -2400/-1200/-900/-500/0 |
| Taylor 1980s (tuned) | 1 (293) | 2.00 (586) | 2.37 (693) | 3.01 (882) | 4.00 (1171.5 Hz) | [Hib-tuning] table |
| Mears 1859 (old style) | 1 (327.5) | 1.63 (535) | 2.17 (710) | 2.88 (944.5) | 3.58 (1172) | [Hib-tuning]: hum 2 semitones sharp, prime 1.5 flat |
| Thomas Both 1591 | 1 (321) | 1.76 (564) | 2.38 (763) | 3.00 (964) | 4.01 (1287) | [Lehr Table II] |
| van den Ghein 1615 (Lehr, rel. nominal/2) | 0.50 | 1.02 | 1.20 | 1.42 | 2.00 | [Lehr Table V]; also II-4 2.15, I-5 3.15, I-6 4.37 |
| Bourlet 1679 | 0.49 | 1.01 | 1.28 | 1.55 | 2.00 | [Lehr Table V] |
| Eijsbouts 1955 tuned carillon | 0.50 | 1.00 | 1.20 | 1.50 | 2.00 | [Lehr Table V]; I-5 2.99, I-6 4.15, I-7 5.40, I-8 6.78 |
| major-third carillon | — | — | major third replaces minor-third partial | | | [Rossing1989 abstract]; no ratios read |

Old bells: "the hum is often a tone or more sharp ... the prime often a tone or more flat" [Hib-quality].
Splits for Western bells: none read here (the current model's Westminster values stay as they are).

## 7. The wooden beam strike

No measured contact time found. What the sources do say: initial amplitudes depend on how the strike
deforms the bell [Rossing IOA 1997, search snippet]; the Seongdeok strike starts with energy spread evenly
to 800 Hz [KimYH1997 §3.2], so the log does excite the upper modes, which then die in 10-20 s.
**EST for the model**: a raised-cosine force pulse of ~5-15 ms (a soft heavy log), which acts as a low-pass
around 1/(contact time) ≈ 70-200 Hz knee in level per partial; plus a short thud of noise at the strike.

## 8. What the recording of the Vietnamese bell should capture

- Mics: one 1-2 m from the bell at the height of the striking boss, 90° round from it (where Korean
  beats are clearest, not at the striking point [KimYM2025 §3.3]); a second inside or under the mouth
  (the lowest mode showed only there at Mii-dera [Sakurai2020]); a third 5-10 m away for the overall sound.
  A mic flat to 20 Hz or lower; 48 kHz / 24 bit; level set on the loudest strike, no limiting.
- Strikes: at least 5 normal strikes, each left to ring out fully (≥ 90 s; the Seongdeok was recorded 90 s
  [KimYH1997]), plus 2-3 soft and 2-3 hard ones; note the time and who struck. If allowed, a few light taps
  with a small mallet at other points (quarter turns) to see the doublets.
- Note: bell height, mouth diameter, weight if known, the beam (wood, length, how hung), the striking point,
  and the temperature. Photograph the bell and the setup. Quiet time of day.
- Measure later: peak frequencies with long FFT windows (≥ 16 s for 1/16 Hz resolution, as [KimYH1997 §3.4]);
  each pair's split and beat period from the envelope; each partial's decay in dB/s → T60; levels at 0.5 s
  after the strike; how levels change with strike force; the onset noise.

## Works Cited (MLA 9; only what was read)

- [Cho2023] Cho, Wan-Ho, et al. "Reconstruction of the Spatial Radiation Characteristics of Large Korean Bell."
  *Forum Acusticum 2023*, European Acoustics Association, 2023, pp. 2857-60,
  dael.euracoustics.org/confs/fa2023/data/articles/001039.pdf.
- [KimYH1997] Kim, Yang-Hann, and Sea-Moon Kim. "An Analysis of the Sound Radiation Characteristics of the King
  Song-Dok Bell Using Cylindrical Acoustic Holography." *Journal of the Acoustical Society of Korea*, vol. 16,
  no. 4, 1997, pp. 94-100, koreascience.kr/article/JAKO199715875841672.pdf.
- [KimYM2025] Kim, Yeon-mi, and Sungeun Lee. "Acoustic Study of the Sacred Bell of King Seongdeok."
  *International Archives of the Photogrammetry, Remote Sensing and Spatial Information Sciences*, vol.
  XLVIII-M-9-2025, 2025, pp. 735-40, doi:10.5194/isprs-archives-XLVIII-M-9-2025-735-2025. (Title as given in
  the search listing; check.)
- [Lehr] Lehr, André. "A General Bell-Formula." Hibbert, www.hibberts.co.uk/?p=1841. Accessed 28 Nov. 2026.
  (Page title not confirmed; tables II and V used.)
- [Hib-tuning] Hibbert, Bill. "Basic Principles of Bell Tuning." hibberts.co.uk/?p=657. Accessed 28 Nov. 2026.
- [Hib-quality] Hibbert, Bill. "The Musical Sound Quality of Church Bells."
  www.hibberts.co.uk/the-musical-sound-quality-of-church-bells/. Accessed 28 Nov. 2026.
- [Rossing2004] Rossing, Thomas D. "Acoustics of Asian Bells." Lay-language paper 4pMU3, 147th Meeting of the
  Acoustical Society of America, 2004, acoustics.org/pressroom/httpdocs/147th/Rossing_AsianBells2.htm.
- [Rossing1989] Rossing, Thomas D. "Acoustics of Eastern and Western Bells, Old and New." *Journal of the
  Acoustical Society of Japan (E)*, vol. 10, no. 5, 1989, pp. 241-52. Abstract only,
  www.jstage.jst.go.jp/article/ast1980/10/5/10_5_241/_article/-char/en.
- [Sakurai2020] Sakurai, Naoki, et al. "Nihon no bonshō no bubun'on to shindō mōdo ni tsuite" [Partials and
  vibration modes of Japanese temple bells]. *Ningen Kankyō Kagaku*, vol. 27, 2020, pp. 3-13,
  tezukayama.repo.nii.ac.jp/record/1281/files/jinkanken27-2_sakurai.pdf.
- [Nguyen2025] Nguyễn Hồng Dương. "Chuông đồng Phật giáo thời Nguyễn: biểu tượng triết mỹ và di sản văn hóa."
  *Tạp chí Văn hóa Nghệ thuật*, no. 627, Dec. 2025, pp. 118-, vjol.info.vn/tcvanhoanghethuat/article/download/140261/114655/.
- [BTLS] "Bronze Bells in Le-Nguyen Dynasty in the Vietnam National Museum of History." Vietnam National Museum of
  History, baotanglichsu.vn/en/Articles/3188/18669/. Accessed 28 Nov. 2026.
- [Vietnamnet] "Vietnam's Largest Bronze Bell Rings Out from Sacred Bai Dinh Pagoda." *VietNamNet*,
  vietnamnet.vn/en/vietnam-s-largest-bronze-bell-rings-out-from-sacred-bai-dinh-pagoda-2439639.html (search
  snippet only).
