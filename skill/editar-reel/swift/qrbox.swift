import Foundation
import Vision
for p in CommandLine.arguments.dropFirst() {
    let req = VNDetectBarcodesRequest()
    try? VNImageRequestHandler(url: URL(fileURLWithPath: p)).perform([req])
    for r in req.results ?? [] {
        let b = r.boundingBox
        print(p.split(separator: "/").last!, String(format: "%.4f %.4f %.4f %.4f", b.minX, 1 - b.maxY, b.width, b.height), r.payloadStringValue ?? "")
    }
}
