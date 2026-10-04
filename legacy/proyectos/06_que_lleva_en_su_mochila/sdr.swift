// sdr <in.MOV> <out.mp4>: HDR (HLG) -> SDR BT.709 with Apple's tone mapping, rotated, 1440x2560
import AVFoundation
let src = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
let track = src.tracks(withMediaType: .video)[0]
let comp = AVMutableVideoComposition(propertiesOf: src)
comp.renderSize = CGSize(width: 1440, height: 2560)
comp.colorPrimaries = AVVideoColorPrimaries_ITU_R_709_2
comp.colorTransferFunction = AVVideoTransferFunction_ITU_R_709_2
comp.colorYCbCrMatrix = AVVideoYCbCrMatrix_ITU_R_709_2
let ins = AVMutableVideoCompositionInstruction()
ins.timeRange = CMTimeRange(start: .zero, duration: src.duration)
let li = AVMutableVideoCompositionLayerInstruction(assetTrack: track)
let s = 1440.0 / Double(min(track.naturalSize.width, track.naturalSize.height))
li.setTransform(track.preferredTransform.concatenating(CGAffineTransform(scaleX: s, y: s)), at: .zero)
ins.layerInstructions = [li]
comp.instructions = [ins]
let ex = AVAssetExportSession(asset: src, presetName: AVAssetExportPresetHighestQuality)!
ex.videoComposition = comp
ex.outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
ex.outputFileType = .mp4
let sem = DispatchSemaphore(value: 0)
ex.exportAsynchronously { sem.signal() }
sem.wait()
print(ex.status == .completed ? "ok" : "fail \(String(describing: ex.error))")
