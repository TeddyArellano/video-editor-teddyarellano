// grab_frame_apple <video> <seconds> <out.png>: one frame decoded by AVFoundation (quick visual reference).
// Note: the PNG keeps the source colour profile (BT.2020 for HDR), so compare it visually, not by raw pixel values.
import AVFoundation
import AppKit
let a = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
let g = AVAssetImageGenerator(asset: a)
g.appliesPreferredTrackTransform = true
g.requestedTimeToleranceBefore = .zero; g.requestedTimeToleranceAfter = .zero
let cg = try! g.copyCGImage(at: CMTime(seconds: Double(CommandLine.arguments[2])!, preferredTimescale: 600), actualTime: nil)
let rep = NSBitmapImageRep(cgImage: cg)
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[3]))
