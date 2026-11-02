import PDFKit
import AppKit
let a = CommandLine.arguments
let doc = PDFDocument(url: URL(fileURLWithPath: a[1]))!
for i in 0..<doc.pageCount {
  let p = doc.page(at: i)!; let b = p.bounds(for: .mediaBox); let sc: CGFloat = 1600 / b.width
  let img = NSImage(size: NSSize(width: b.width*sc, height: b.height*sc))
  img.lockFocus(); NSColor.white.set(); NSRect(origin: .zero, size: img.size).fill()
  let ctx = NSGraphicsContext.current!.cgContext; ctx.scaleBy(x: sc, y: sc); p.draw(with: .mediaBox, to: ctx); img.unlockFocus()
  let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(a[2])/p\(String(format:"%02d", i+1)).png"))
}
