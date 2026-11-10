import PDFKit
let d = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1]))!
var s = ""
for i in 0..<d.pageCount { s += "=== p\(i+1)\n" + (d.page(at: i)?.string ?? "") + "\n" }
try! s.write(toFile: CommandLine.arguments[2], atomically: true, encoding: .utf8)
print(d.pageCount)
