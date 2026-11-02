import Vision
import AppKit
// ocr.swift IMG... : prints lines per image, left column then right column (split at page middle)
for path in CommandLine.arguments.dropFirst() {
  let img = NSImage(contentsOfFile: path)!
  var r = NSRect(origin: .zero, size: img.size)
  let cg = img.cgImage(forProposedRect: &r, context: nil, hints: nil)!
  let req = VNRecognizeTextRequest(); req.recognitionLevel = .accurate; req.usesLanguageCorrection = false
  req.recognitionLanguages = ["en-US","de-DE","fr-FR","it-IT"]
  try! VNImageRequestHandler(cgImage: cg).perform([req])
  let obs = (req.results ?? []).map { ($0.boundingBox, $0.topCandidates(1).first!.string) }
  print("=====PAGE \(path)")
  for col in [0, 1] {
    let ls = obs.filter { (col == 0) == ($0.0.minX < 0.48) }.sorted { $0.0.maxY > $1.0.maxY }
    print("--- col \(col)")
    for (b, s) in ls { print(String(format: "%.3f ", b.minX) + s) }
  }
}
