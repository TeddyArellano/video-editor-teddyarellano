// Hand centres per image: hands <img1> <img2> ... -> JSON {"img": [[x, y, conf], ...]} (normalized, y from top)
import Foundation
import Vision

var out: [String: [[Double]]] = [:]
for p in CommandLine.arguments.dropFirst() {
    let req = VNDetectHumanHandPoseRequest()
    req.maximumHandCount = 6
    try? VNImageRequestHandler(url: URL(fileURLWithPath: p)).perform([req])
    var hands: [[Double]] = []
    for obs in req.results ?? [] {
        guard let pts = try? obs.recognizedPoints(.all) else { continue }
        let good = pts.values.filter { $0.confidence > 0.3 }
        if good.count < 4 { continue }
        let x = good.map { Double($0.location.x) }.reduce(0, +) / Double(good.count)
        let y = 1 - good.map { Double($0.location.y) }.reduce(0, +) / Double(good.count)
        hands.append([x, y, Double(obs.confidence)])
    }
    out[(p as NSString).lastPathComponent] = hands
}
let data = try! JSONSerialization.data(withJSONObject: out)
print(String(data: data, encoding: .utf8)!)
