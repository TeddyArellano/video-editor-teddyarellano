import Foundation
import Vision
let dir = CommandLine.arguments[1]
let files = try! FileManager.default.contentsOfDirectory(atPath: dir).filter{$0.hasSuffix(".jpg")}.sorted()
var out: [[[Double]]] = []
for f in files {
    let req = VNDetectFaceRectanglesRequest()
    try? VNImageRequestHandler(url: URL(fileURLWithPath: dir + "/" + f)).perform([req])
    out.append((req.results ?? []).map { [Double($0.boundingBox.midX), Double(1 - $0.boundingBox.midY), Double($0.boundingBox.width)] })
}
FileManager.default.createFile(atPath: CommandLine.arguments[2], contents: try! JSONSerialization.data(withJSONObject: out))
print("done", out.count)
