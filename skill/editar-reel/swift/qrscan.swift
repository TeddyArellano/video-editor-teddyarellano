import Foundation
import Vision
for p in CommandLine.arguments.dropFirst() {
    let req = VNDetectBarcodesRequest()
    try? VNImageRequestHandler(url: URL(fileURLWithPath: p)).perform([req])
    let r = (req.results ?? []).compactMap { $0.payloadStringValue }
    print(p.split(separator: "/").last!, r.isEmpty ? "NO DETECTADO" : r.joined(separator: " | "))
}
