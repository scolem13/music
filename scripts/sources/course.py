# Sources for the Course pages: course/glossary.qmd and course/enrichment.qmd (the pathway's rubric facts are from the
# Task Sheets notes, which quote the MYP Arts guide; course/glossary.org names a source on every term).
# DP guide read in full from the copy in ~/Projects/website/music-website/pdfs/ (text pulled with PDFKit; print pages = PDF page - 6).
GL = "course/glossary.qmd"
EN = "course/enrichment.qmd"
SOURCES = [
    book("International Baccalaureate Organization. *Diploma Programme Music Guide*. First assessment 2022, International Baccalaureate Organization, 2020.", [GL],
         "Music and theory of knowledge, the TOK questions quoted on the glossary (p. 9); the four areas of inquiry and their example genres (pp. 22–23); "
         "personal, local and global contexts (pp. 23–24); musical processes and components (p. 24); musical roles of researcher, creator and performer (p. 25); "
         "the contemporary music-maker, artistic vision and collaboration (p. 37); assessment outline and weightings (pp. 42–43); "
         "achievement levels and assessment terms, with definitions (pp. 71–73)."),
    book("International Baccalaureate Organization. *MYP Arts Guide*. For use from September 2022/January 2023, International Baccalaureate Organization.", [GL, "course/pathway.qmd"],
         "Key concepts and arts related concepts with their arts elaborations (as collected on the MYP concepts site); the command terms and their definitions, "
         "as quoted in the course's task-sheet notes (page numbers not checked); the Year 1, 3 and 5 assessment criteria behind the pathway's rubric tables (pp. 39–46). Publication year not printed in the excerpt held."),
]
