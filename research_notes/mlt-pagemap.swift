// Usage: swift research_notes/mlt-pagemap.swift BOOK.pdf research_notes/mlt-sources/text/BOOK.txt research_notes/mlt-sources/text/BOOK.pages.txt
// Writes, for each line of the text cache, the PDF page (1-based) whose own text contains it (0 = not found; use the nearest line above).
// Needed where pdftotext lost the page breaks (Mullen Du...De). macOS only (PDFKit); no other tools needed.
import PDFKit
// linemap.swift PDF TXT OUT : for each line of TXT, the PDF page (1-based) whose text contains it (whitespace-normalised), or 0
let a = CommandLine.arguments
let doc = PDFDocument(url: URL(fileURLWithPath: a[1]))!
func norm(_ s: String) -> String { s.lowercased().components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }.joined(separator: " ") }
var pages: [String] = []
for i in 0..<doc.pageCount { pages.append(norm(doc.page(at: i)?.string ?? "")) }
let lines = try! String(contentsOfFile: a[2], encoding: .utf8).components(separatedBy: "\n")
var out: [String] = []; var last = 0
for l in lines {
  let n = norm(l); var p = 0
  if n.count >= 25 {
    // search near the last hit first
    let order = Array(max(0, last - 3)..<pages.count) + Array(0..<max(0, last - 3))
    for i in order where pages[i].contains(n) { p = i + 1; break }
  }
  if p > 0 { last = p - 1 }
  out.append(String(p))
}
try! out.joined(separator: "\n").write(toFile: a[3], atomically: true, encoding: .utf8)
print("lines", lines.count, "mapped", out.filter { $0 != "0" }.count)
