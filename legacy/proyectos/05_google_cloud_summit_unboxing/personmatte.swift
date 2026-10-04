// Person cut-out per frame: input dir of JPG/PNG frames -> output dir of RGBA PNGs (person only, transparent elsewhere).
// usage: personmatte <in_dir> <out_dir> <out_width> <out_height>
import AppKit
import CoreImage
import Foundation
import Vision

let args = CommandLine.arguments
let inDir = args[1], outDir = args[2]
let outW = Double(args[3])!, outH = Double(args[4])!
let ctx = CIContext(options: [.useSoftwareRenderer: false])
let files = try! FileManager.default.contentsOfDirectory(atPath: inDir).filter { $0.hasSuffix(".jpg") || $0.hasSuffix(".png") }.sorted()
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

for f in files {
    let url = URL(fileURLWithPath: inDir + "/" + f)
    guard let src = CIImage(contentsOf: url) else { continue }
    let req = VNGeneratePersonSegmentationRequest()
    req.qualityLevel = .accurate
    req.outputPixelFormat = kCVPixelFormatType_OneComponent8
    let handler = VNImageRequestHandler(ciImage: src, options: [:])
    try? handler.perform([req])
    guard let maskBuf = req.results?.first?.pixelBuffer else { continue }
    var mask = CIImage(cvPixelBuffer: maskBuf)
    // scale mask to source size, soften the edge a touch
    mask = mask.transformed(by: CGAffineTransform(scaleX: src.extent.width / mask.extent.width, y: src.extent.height / mask.extent.height))
    mask = mask.applyingGaussianBlur(sigma: 1.2).cropped(to: src.extent)
    let clear = CIImage(color: .clear).cropped(to: src.extent)
    let cut = src.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: clear, kCIInputMaskImageKey: mask])
    let scaled = cut.transformed(by: CGAffineTransform(scaleX: outW / src.extent.width, y: outH / src.extent.height))
    let rect = CGRect(x: 0, y: 0, width: outW, height: outH)
    guard let cg = ctx.createCGImage(scaled, from: rect, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)) else { continue }
    let rep = NSBitmapImageRep(cgImage: cg)
    let png = rep.representation(using: .png, properties: [:])!
    let name = (f as NSString).deletingPathExtension + ".png"
    try! png.write(to: URL(fileURLWithPath: outDir + "/" + name))
}
print("done", files.count)
