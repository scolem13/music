# Classical Themes (tools/classical-themes.qmd): where its themes come from. Checked 18 Oct 2026 (dataset README, paper, MTD page).
CT = "tools/classical-themes.qmd"
SOURCES = [
    web('Zalkow, Frank, Stefan Balke, Vlora Arifi-Müller, and Meinard Müller. "MTD: A Multimodal Dataset of Musical Themes for MIR Research." *Transactions of the International Society for Music Information Retrieval*, 2020, doi:10.5334/tismir.68. URL.',
        "https://doi.org/10.5334/tismir.68", [CT], who="teacher"),
    web('International Audio Laboratories Erlangen. *MTD: Musical Theme Dataset*, version 1.0.0. URL.',
        "https://www.audiolabs-erlangen.de/resources/MIR/MTD", [CT], who="teacher",
        note="The themes on this page, converted to ABC; licensed CC BY 4.0."),
    book('Barlow, Harold, and Sam Morgenstern. *A Dictionary of Musical Themes*. Crown, 1948.', [CT], who="teacher",
         note="The book MTD's themes are taken from; not consulted directly."),
]
