# The Sources lessons (Sources 1–3). Checked Oct 2026: pages fetched, except the IB statement (read through search results and
# school summaries quoting it; the IB site refuses scripted requests).
S1, S2, S3 = "lessons/sources-start.qmd", "lessons/sources-check.qmd", "lessons/sources-dp.qmd"
SOURCES = [
    web('Williams, Rhiannon. "Why Google\'s AI Overviews Gets Things Wrong." *MIT Technology Review*, 31 May 2024, URL.',
        "https://www.technologyreview.com/2024/05/31/1093019/why-are-googles-ai-overviews-results-so-bad", [S1, S2, S3], who="student"),
    web('Jaźwińska, Klaudia, and Aisvarya Chandrasekar. "AI Search Has a Citation Problem." *Columbia Journalism Review*, Tow Center for Digital Journalism, 6 Mar. 2025, URL.',
        "https://www.cjr.org/tow_center/we-compared-eight-ai-search-engines-theyre-all-bad-at-citing-news.php", [S2, S3], who="student"),
    web('Caulfield, Mike. "SIFT (The Four Moves)." *Hapgood*, 19 June 2019, URL.', "https://hapgood.us/2019/06/19/sift-the-four-moves/", [S2, S3], who="student"),
    web('"How Do I Cite Generative AI in MLA Style?" *MLA Style Center*, Modern Language Association, URL.', "https://style.mla.org/citing-generative-ai/", [S2, S3], who="student"),
    web('*MLA Style Center*. Modern Language Association, URL.', "https://style.mla.org/", [S1, S2, S3], who="student"),
    web('International Baccalaureate Organization. "Statement from the IB about ChatGPT and Artificial Intelligence in Assessment and Education." 2023, URL.',
        "https://ibo.org/news/news-about-the-ib/statement-from-the-ib-about-chatgpt-and-artificial-intelligence-in-assessment-and-education/", [S3], who="teacher",
        note="Read through search results and school summaries quoting it."),
    web('Coleman, Sean. "Assessment Guidance." *IB Music*, URL.', "https://dp-music.seancoleman.org/book/assessment-guidance.html", [S3], who="student",
        note="A synthesis of the IB\'s DP Music Additional Guidance (2024) and the subject reports, Nov. 2022 to May 2025."),
    web('Coleman, Sean. "Exploring: Common Mistakes." *IB Music*, URL.', "https://dp-music.seancoleman.org/book/exploring-common-mistakes.html", [S3], who="student"),
    web('Coleman, Sean. "Exploring: Criterion Guidance." *IB Music*, URL.', "https://dp-music.seancoleman.org/book/exploring-criterion-guidance.html", [S3], who="student"),
    web('*Grove Music Online*. Oxford UP, URL.', "https://www.oxfordmusiconline.com/", [S2, S3], who="student", note="Subscription; most school and public libraries give access."),
    web('*RILM Abstracts of Music Literature*. Répertoire International de Littérature Musicale, URL.', "https://www.rilm.org/abstracts/", [S3], who="teacher"),
    web('*JSTOR*. ITHAKA, URL.', "https://www.jstor.org/", [S2, S3], who="student"),
    web('*IMSLP: Petrucci Music Library*. URL.', "https://imslp.org/", [S2, S3], who="student"),
]

# The Annotated Bibliography lessons. Checked Oct 2026 (pages fetched).
A1, A2, A3 = "lessons/annotate-start.qmd", "lessons/annotate-check.qmd", "lessons/annotate-dp.qmd"
SOURCES += [
    web('"What Guidance Should I Give My Students for Preparing an Annotated Bibliography?" *MLA Style Center*, Modern Language Association, 4 Nov. 2016, URL.',
        "https://style.mla.org/annotated-bibliographies/", [A1, A2, A3], who="student", note="Written for the eighth edition of the *MLA Handbook*."),
    web('"How to Prepare an Annotated Bibliography: The Annotated Bibliography." Cornell University Library, URL.',
        "https://guides.library.cornell.edu/annotatedbibliography", [A2, A3], who="student"),
    web('"Annotated Bibliographies." *Purdue Online Writing Lab*, Purdue University, URL.',
        "https://owl.purdue.edu/owl/general_writing/common_writing_assignments/annotated_bibliographies/index.html", [A1, A2], who="student"),
    web('"Annotated Bibliography Samples." *Purdue Online Writing Lab*, Purdue University, URL.',
        "https://owl.purdue.edu/owl/general_writing/common_writing_assignments/annotated_bibliographies/annotated_bibliography_samples.html", [A2, A3], who="student"),
    web('Coleman, Sean. "Exploring: Task Reference." *IB Music*, URL.', "https://dp-music.seancoleman.org/book/exploring-tasks.html", [A3], who="student",
        note="With the Experimenting (book/ewm-tasks.html) and CMM (book/cmm-tasks.html) task references, and the Turabian advice on paraphrasing quoted in all three."),
    book('Turabian, Kate L. *A Manual for Writers of Research Papers, Theses, and Dissertations*. 8th ed., U of Chicago P, 2013.', [A2, A3], who="teacher",
        note="The paraphrasing advice (pp. 80–81) as quoted in the course book\'s task references; edition assumed from the 2013 date."),
    book('Kahn, Ashley. *Kind of Blue: The Making of the Miles Davis Masterpiece*. Da Capo Press, 2000.', [A3], who="student"),
]
for s in SOURCES:
    if "lessons/sources-dp.qmd" in s["pages"] and ("Grove" in s["mla"] or "JSTOR" in s["mla"]): s["pages"] = s["pages"] + [A2, A3]
SOURCES += [
    book('Davis, Miles. *Kind of Blue*. Columbia, 1959.', [A1, A3], who="student", note="The recording."),
    wiki("Modal Jazz", "Modal_jazz", [A1], who="student"),
]
