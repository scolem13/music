# IPA chart

- The IPA chart (`tools/ipa-chart.qmd`, `apps/shared/ipa/`): its vowel trapezoid is draggable through `ipa-synth.js` (`window.IpaSynth`,
  a four-formant voice; API at its top). The lesson `lessons/vowel-formants.qmd` (F1, F2, F3, singer's formant, formant tuning) uses
  the same synth. Tests: `node tests/ipa/ipa-chart.cdp.js`, `node tests/lessons/formants.cdp.js` (after rendering both pages).
