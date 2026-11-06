// Concept "uses": the songs and pieces named in the show notes of Eric Rasmussen and Beau Taillefer's podcast Audiation in the Wild.
// Format: the shared contract (src/label/url/items). Links only; notes are in our words. Only what the notes name is listed (most notes name no
// piece), and how an episode uses a piece is mostly not stated there, so the notes below say so. Read Nov 2026; audio not heard.
(function (global) {
  "use strict";
  var P = "https://audiation-in-the-wild.simplecast.com/episodes/";
  (global.WORK_USES = global.WORK_USES || []).push({ src: "rasmussen", label: "Rasmussen and Taillefer, Audiation in the Wild", url: "https://audiation-in-the-wild.simplecast.com", items: [
    { work: "bridge-over-troubled-water", title: "Bridge over Troubled Water", composer: "Paul Simon",
      concept: "harmonic richness and reharmonisation", note: "The show notes for the Harmonic Learning Sequence 2.0 episode link a video of Jacob Collier reharmonising this song as an example of very rich harmony. What the hosts say about it is unverified (audio not heard).",
      url: "https://youtu.be/yxsfV3vGweQ", where: "s4e04: Harmonic Learning Sequence 2.0 (21 Oct 2024)", date: "2024-10-21", mlt: [] },
    { work: "gambale-lydian-lick", title: "A Lydian lick", composer: "Frank Gambale",
      concept: "Lydian tonality: a lick as an example", note: "The Lydian tonality episode's notes link a guitar lick in Lydian by Frank Gambale (the notes spell his name Gambole) as the example to listen to. The notes do not say what the hosts do with it.",
      url: "https://www.youtube.com/watch?v=uikYOrov01c", where: "s2e14: Lydian tonality (5 Apr 2023)", date: "2023-04-05", mlt: [{ book: "mullen", unit: "ch9", page: "43" }] }
  ] });
})(typeof window !== "undefined" ? window : globalThis);
