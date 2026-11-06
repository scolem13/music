// books/bluestine.js: Eric Bluestine's blog "Helping Children Audiate Music" (Substack, https://ericmbluestine.substack.com), post by post,
// as steps for mlt-walk.js. Format in mlt-walk.js's header; two extra step fields used here: href (link to the post) and
// xref: [{ book, step | unit, page, label? }] (the same idea in a book already on the site).
// LINKS ONLY: no post text is copied. Every teacher line is a summary in our words, written from reading each post in November 2026.
// Bluestine is the author of The Ways Children Learn Music (GIA, 1995; 2nd ed. 2000, per catalogue listings), and the teacher has his permission to link
// to the posts. "page" here is the post's date (there are no pages). Podcast-only pages (Episode 1, Episode 4) carry audio and no text:
// the matching newsletter posts were read instead (unverified that the audio says the same). A post's date is Substack's post_date.
// Guest appearances (unit "guests"): Audiation in the Wild 033 (Simplecast) and the two-part Keys to Music Learning interview (Buzzsprout, 30 Jan and 6 Feb 2025). Substack podcast posts have
// Substack's own transcript (the page's Transcript button, per the post data; the page was not opened in a browser), recorded in each step's transcript field; text posts have none to record.
// Posts reached (archive, Nov 2026): 15 pages = 12 distinct posts + 3 podcast-feed duplicates. Not reached: the "Audiation Lecture"
// series continues (8 planned; only Lecture 1 is out); the Substack's own /podcast feed lists audio only.
(function (global) {
  "use strict";
  var B = global.MLTBooks = global.MLTBooks || {};
  var S = "https://ericmbluestine.substack.com/p/";
  B.bluestine = {
    id: "bluestine", title: "Helping Children Audiate Music (blog)", author: "Eric Bluestine", year: 2026,
    note: "Eric Bluestine's blog and podcast (Substack), linked post by post with the site's own summary, the MLT ideas each covers, a class activity where the post describes one, and links to the matching steps in the Mullen and Gordon books. The posts are not reproduced: open each one at its link.",
    parts: [
      { id: "p1", title: "The blog, in order of reading", page: "posts 2025–2026", units: [
        { id: "teaching", title: "Why teach music, and what songs can and cannot do (Aug 2025 – Jun 2026)", page: "posts 2025–2026", steps: [
          { id: "welcome", title: "A Note To My Music Teacher Colleagues (\"Please Read This First\")", page: "post 18 Aug 2025", phase: "plan",
            href: S + "music-education", site: "Substack",
            teacher: "The opening post. Bluestine says music education is usually defended with claims that have nothing to do with understanding music, and that even Music Learning Theory teachers can stop at teaching 'minor tonality' through simple teacher-made songs and patterns. He treats patterns and rote songs as a needed foundation (he likens them to vitamin supplements) but wants students also to meet whole pieces, naming Mozart's G minor symphony as a goal. The blog is his professional diary.",
            book: ["Ideas: patterns and rote songs are necessary but not enough; real repertoire is the goal", "MLT ideas: functional patterns, tonality, whole pieces"],
            xref: [{ book: "mullen", step: "ch13-first-whole", page: "89–92", label: "rote songs as First Whole" }, { book: "mullen", step: "ch12-launch", page: "72–77", label: "pattern work from the audiation foundation" }] },
          { id: "podcast-ep1", title: "Episode 1 - A Note To My Music Teacher Colleagues (podcast)", page: "post 18 Aug 2025", phase: "plan",
            href: S + "episode-1-a-note-to-my-music-teacher", site: "Substack", transcript: S + "episode-1-a-note-to-my-music-teacher",
            teacher: "The audio of the post above. The page carries no text, so this is the podcast version of the welcome note (the audio itself was not heard, unverified that it matches).",
            book: ["Audio only"] },
          { id: "classroom-management", title: "Classroom Management: An Eight-Point Approach", page: "post 18 Aug 2025", phase: "plan",
            href: S + "classroom-management-an-eight-point", site: "Substack",
            teacher: "After 35 years of teaching, Bluestine lists what he did when classes went well and left undone when they went badly: earn trust, win parents' support, teach the exact behaviours you want, praise them consistently, answer rule-breaking consistently, write individual plans for disruptive students, hand control to students gradually, and let colleagues watch and advise. His point is that keeping a noisy class in the hall is a single tactic and works only inside a long, many-part plan. He says plainly that he is not an expert in the field.",
            book: ["Not an MLT topic; included because it is a post on the blog", "Eight practices, long-term plan rather than one tactic"],
            activities: [] },
          { id: "rote-songs", title: "Rote Songs: What They're Good For, and Why They Aren't Enough", page: "post 22 Aug 2025", phase: "plan",
            href: S + "rote-songs", site: "Substack",
            teacher: "Songs are indispensable: hearing and singing them is the aural/oral level and the base of every later skill, and Bluestine still sings major, minor, duple and triple songs with his piano students. But the songs we teach are short, single-line, in one mode and one meter, and show no tonality or meter developing over time, so they cannot take upper elementary children past stage 3 of audiation. He argues against Reimer's 'real music is the basis' view, yet also against playing complex recordings with no musicianship teaching; he proposes short 10 to 30 second excerpts that make children listen actively.",
            book: ["Ideas: songs are the aural/oral foundation; stage 3 limit; short recorded excerpts as a supplement", "MLT ideas: Gordon's skill learning sequence (aural/oral), stages of audiation, rote song"],
            xref: [{ book: "mullen", step: "ch13-first-whole", page: "89–92", label: "Rote Song Procedure" }, { book: "mullen", step: "u1-first-whole", page: "104", label: "a unit's rote songs" }, { book: "jri-lsa", step: "p1-aptitude", page: "15–16" }],
            activities: ["rote-song"],
            student: { type: "tunes", tunes: [{ name: "Skip to My Lou", id: "skip-to-my-lou" }] } },
          { id: "podcast-ep4", title: "What Rote Songs are Good For, and Why They Aren't Enough (podcast, Episode 4)", page: "post 23 Aug 2025", phase: "plan",
            href: S + "episode-4-rote-song-what-theyre-good", site: "Substack", transcript: S + "episode-4-rote-song-what-theyre-good",
            teacher: "The spoken version of the Rote Songs post (revised audio). The page carries no text; the audio was not heard (unverified that it matches).",
            book: ["Audio only"] },
          { id: "same-different", title: "The Concepts of \"Same\" and \"Different\" in Music Learning Theory (Episode 6)", page: "post 1 Sep 2025", phase: "plan",
            href: S + "the-concepts-of-same-and-different", site: "Substack",
            teacher: "Built on Gordon's 1981 monograph on how children audiate 'same' and 'different'. Very young children first sort the world into 'this' and 'not this'; by about 5 to 7, whether two things are alike matters a great deal to them; by about 9 they find the question too obvious and think in categories (tonic major, alto register, duple meter). Bluestine uses it to set listening units by grade: 1st graders compare two items (vocal or instrumental), 2nd graders hear forte or piano, 3rd graders adagio, andante or allegro, 4th graders soprano, alto, tenor or bass, the older ones labelling instead of comparing. Activity the post describes: hold up a pencil and say 'first', hold up a stapler and say 'second', and ask whether they are the same or different (he used this to prepare 1st and 2nd graders for the IMMA); in a listening unit, play two vocal or instrumental examples and have young children say same or different before any labelling.",
            book: ["Ideas: same/not-same, same/different, categories by ages; listening units by grade", "MLT ideas: Audie, IMMA, aptitude, discrimination, Generalization (Aural/Oral)", "Source cited in the post: Gordon 1981, Gordon 1982 (IMMA), Gordon 1989 (Audie)"],
            xref: [{ book: "jri-lsa", step: "p2-aptitude", page: "25–27", label: "aptitude testing" }, { book: "jri-lsa", step: "p1-aptitude", page: "15–16" }, { book: "mullen", unit: "ch8", page: "32", label: "skill learning sequence" }],
            activities: [] },
          { id: "same-different-notes", title: "\"Same\" and \"Different\" in Music Learning Theory (podcast notes)", page: "post 1 Sep 2025", phase: "plan",
            href: S + "the-concepts-of-same-and-different-84a", site: "Substack", transcript: S + "the-concepts-of-same-and-different-84a",
            teacher: "The podcast feed's copy of the Episode 6 post, which holds only the reference list (Gordon 1981, 1982, 1989, and the Audiation in the Wild podcast episode with Bluestine as guest). Nothing new beyond the post above.",
            book: ["References only"] },
          { id: "why-music-ed", title: "Why Children Need Music Education", page: "post 25 Jun 2026", phase: "plan",
            href: S + "why-children-need-music-education-393", site: "Substack",
            teacher: "Bluestine rejects the usual reasons given for music study (test scores, patience, memory, social skills) because other subjects offer the same and administrators know it. His five reasons that only music supplies: children learn to understand expressive elements in great pieces; to understand musical structure and how elements interact; that music has its own culture and history, so that a people's music can be a way into the culture itself (his example is the many tonalities in a Jewish Friday-evening service); the joy of creating, improvising and composing, which needs a vocabulary of patterns first; and that performance is a creative act, so students grow into making their own interpretive choices.",
            book: ["Five reasons; the culture example names aeolian, mixolydian, a phrygian-like mode, major and harmonic minor", "MLT ideas: tonality and meter vocabulary, creativity/improvisation, independence"],
            xref: [{ book: "mullen", step: "ch12-launch", page: "72–77", label: "backwards design from the audiation foundation" }] }
        ] },
        { id: "audiation", title: "Audiation lectures", page: "posts 2026", steps: [
          { id: "audiation-1", title: "Audiation Lecture 1: An Overview of the Stages", page: "post 18 Aug 2026", phase: "plan",
            href: S + "audiation-lecture-1-an-overview-of", site: "Substack", transcript: S + "audiation-lecture-1-an-overview-of",
            teacher: "The first of eight planned lectures. Bluestine redefines audiation as mentally organising musical elements, alone and together, to understand how a piece develops, and stresses that we audiate only the essential pitches and durations, not at performance speed. He walks through Gordon's six stages, with listening examples at each (a long repetitive chant for stage 1, the tonal IMMA for stage 2, medieval chant and a TV theme for stage 3, a Bach gavotte for the modulations of stage 4, a Bach and a Handel piece that happen to sound alike for stage 5, anticipation at stage 6). He then proposes a seventh stage, placed after Gordon's 4th: hearing how elements develop in cooperation or conflict, shown with a poem whose line lengths can be heard two ways, and says stages 6 and 7 (comparing, predicting) run alongside the others from about stage 2c.",
            book: ["Gordon stages 1-6 (Learning Sequences in Music, 1988/2012) with Bluestine's proposed new stage 5", "Pieces used as listening examples: see the Tune Directory 'uses' list for this post", "MLT ideas: audiation stages, essential patterns, tonality and meter at stage 3, form and modulation at stage 4"],
            xref: [{ book: "mullen", unit: "ch2", page: "15", label: "Ch. 2 Audiation (outline only)" }, { book: "mullen", step: "ch12-anatomy", page: "78–84", label: "audiating before responding" }] }
        ] },
        { id: "performing", title: "Recordings played by Bluestine", page: "posts 2026", steps: [
          { id: "perf-inventions", title: "Bach: 2-Part Inventions (performed by Eric Bluestine)", page: "post 24 Mar 2026", phase: "plan",
            href: S + "bach-inventions-4-14-and-15-performed", site: "Substack", transcript: S + "bach-inventions-4-14-and-15-performed",
            teacher: "A playlist of his piano recordings of ten of the fifteen two-part inventions with a time index (Nos. 1, 2, 4, 6, 7, 8, 10, 12, 13, 14, 15). He skipped 3, 5, 9 and 11 because he does not like them, and says the Sinfonias are next. No teaching commentary.",
            book: ["Recordings only", "Use: listening examples for an upper-grade class"] },
          { id: "perf-beethoven-1", title: "Beethoven: Sonata No. 1 in F minor, Op. 2/1, 1st movement (performed by Eric Bluestine)", page: "post 28 May 2026", phase: "plan",
            href: S + "beethoven-sonata-1-in-f-minor-op", site: "Substack", transcript: S + "beethoven-sonata-1-in-f-minor-op",
            teacher: "His recording of the first movement. The page carries no commentary.", book: ["Recording only"] },
          { id: "perf-beethoven-2", title: "Beethoven: Sonata No. 1 in F minor, Op. 2/1, 2nd movement (Adagio)", page: "post 13 Oct 2026", phase: "plan",
            href: S + "beethoven-sonata-1-in-f-minor-op-055", site: "Substack", transcript: S + "beethoven-sonata-1-in-f-minor-op-055",
            teacher: "His recording of the Adagio. The page carries no commentary.", book: ["Recording only"] },
          { id: "perf-sinfonia-1", title: "Bach: Sinfonia No. 1 in C major (performed by Eric Bluestine)", page: "post 27 Oct 2026", phase: "plan",
            href: S + "bach-sinfonia-1-in-c-major-performed", site: "Substack", transcript: S + "bach-sinfonia-1-in-c-major-performed",
            teacher: "Starts his Sinfonia series. He hears the piece as built on one subject, a rising four-note figure, shown in original or inverted form almost every bar with no countersubject; two strettos (bars 10-11 and 16-17, the second with the subject against its own inversion); a deceptive cadence in E minor at bar 10 and a move to D minor at bar 13. He notes the same four-note start in other Bach C major pieces (the Little Fugue BWV 952, the C major Invention, and the C major Fugue of WTC I).",
            book: ["Listening focus: subject, inversion, stretto, deceptive cadence", "MLT ideas: stage 4 audiation (form, modulation), tonal patterns across pieces (stage 5/6)"],
            activities: [] },
          { id: "perf-chopin", title: "Chopin: Impromptu in G-flat major, Op. 51 (performed by Eric Bluestine)", page: "post 29 Oct 2026", phase: "plan",
            href: S + "chopin-impromptu-in-g-flat-major", site: "Substack", transcript: S + "chopin-impromptu-in-g-flat-major",
            teacher: "His recording of Chopin's third Impromptu. The page carries no commentary.", book: ["Recording only"] }
        ] },
        { id: "guests", title: "Guest appearances (other people's podcasts)", page: "2022, 2025", steps: [
          { id: "guest-aitw-033", title: "Audiation in the Wild, 033: Special Guest Eric Bluestine (podcast, hosts Eric Rasmussen and Beau Taillefer)", page: "post 2022-09-16", phase: "plan",
            href: "https://audiation-in-the-wild.simplecast.com/episodes/033-special-guest-eric-bluestine-0AAxSC9E", hrefLabel: "Open the episode", site: "Simplecast", transcript: false,
            teacher: "Bluestine as the guest on Rasmussen and Taillefer's show. The show notes (not the audio, which was not heard) link his blog post on music and language, books on clear thinking and the origin of language, the Gordon archive at the University of South Carolina, Sandra Trehub's research on infants and music, and Darrel Walters's writing, which he recommends as the best writing on MLT. His later post on same and different says he appeared on this podcast and that Rasmussen told a story about Gordon in it. No transcript is published.",
            book: ["Show notes only (audio not heard)", "MLT ideas: music and language; clear writing about MLT; same and different"],
            xref: [{ book: "rasmussen", step: "ep-033", page: "post 2022-09-16", label: "the same episode in the podcast book" }, { book: "bluestine", step: "same-different", page: "post 1 Sep 2025", label: "his post that mentions it" }] },
          { id: "guest-keys-1", title: "Keys to Music Learning: Getting to know Eric Bluestine, author of The Ways Children Learn Music, Part 1 (podcast, hosts Krista Jadro and Hannah Mayo)", page: "post 2025-01-30", phase: "plan",
            href: "https://keystomusiclearning.buzzsprout.com/1595053/episodes/16483671-getting-to-know-eric-bluestine-author-of-the-ways-children-learn-music-part-i", hrefLabel: "Open the episode", site: "Buzzsprout",
            transcript: "https://www.buzzsprout.com/1595053/16483671/transcript",
            teacher: "The first of a two-part interview (the show was called Music, Learning, Conversation in the request; the name was not found, see the report). By the show notes: he describes moving from public-school teaching to private piano lessons, why going page by page through a method book falls short, ways to engage young students, how Music Learning Theory fits, and how he came to write his book, ending on the value of listening skills. The show notes were read, the audio was not heard. A transcript is published (the show's transcript page).",
            book: ["Show notes read, audio not heard; transcript linked", "MLT ideas: audiation-based piano teaching; learning by listening before reading"],
            xref: [{ book: "mullen", unit: "ch1", page: "11", label: "Ch. 1 Learning Music Learning Theory" }] },
          { id: "guest-keys-2", title: "Keys to Music Learning: Getting to know Eric Bluestine, Part 2 (podcast, hosts Krista Jadro and Hannah Mayo)", page: "post 2025-02-06", phase: "plan",
            href: "https://keystomusiclearning.buzzsprout.com/1595053/episodes/16526258-getting-to-know-eric-bluestine-author-of-the-ways-children-learn-music-part-2", hrefLabel: "Open the episode", site: "Buzzsprout",
            transcript: "https://www.buzzsprout.com/1595053/16526258/transcript",
            teacher: "The second half. By the show notes: partial synthesis and why it matters, common misunderstandings of Music Learning Theory, how whole-part-whole teaching links patterns to real music, generalization and creativity as a pair, improvisation as a route to understanding, movement for rhythm and tonality in piano lessons, and a look at his blog. The notes were read, the audio was not heard. A transcript is published.",
            book: ["Show notes read, audio not heard; transcript linked", "MLT ideas: partial synthesis; whole-part-whole; generalization and creativity"],
            xref: [{ book: "mullen", step: "u5-tonal-lsa", page: "172–174", label: "Unit 5 tonal, Partial Synthesis" }, { book: "mullen", unit: "ch5", page: "25", label: "Ch. 5 Whole-Part-Whole" }] }
        ] }
      ] }
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
