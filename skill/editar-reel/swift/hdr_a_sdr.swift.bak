// hdr_a_sdr <in.MOV> <out.mp4> [recorte_x=0.5]
// iPhone/Android HDR (HLG o PQ / BT.2020) -> SDR BT.709 con el tone-mapping de Apple (mismo look que Fotos),
// orientado, 1440x2560 vertical, H.264. Misma línea de tiempo que la fuente (start 0, misma duración): la EDL sigue válida.
// Video horizontal: se escala para cubrir 1440x2560 y se recorta; recorte_x (0–1) = qué parte horizontal queda al centro
// (0.5 = centro; `reel inventario` lo sugiere según dónde están las caras).
// Por qué: convertir con ffmpeg (o un master etiquetado HLG leído por Chrome/Remotion) deja la piel naranja.
// Build: swiftc -O hdr_a_sdr.swift -o hdr_a_sdr
import AVFoundation

let args = CommandLine.arguments
let src = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let cropX = args.count > 3 ? (Double(args[3]) ?? 0.5) : 0.5
let track = src.tracks(withMediaType: .video)[0]
let OW = 1440.0, OH = 2560.0
let comp = AVMutableVideoComposition(propertiesOf: src)
comp.renderSize = CGSize(width: OW, height: OH)
comp.colorPrimaries = AVVideoColorPrimaries_ITU_R_709_2
comp.colorTransferFunction = AVVideoTransferFunction_ITU_R_709_2
comp.colorYCbCrMatrix = AVVideoYCbCrMatrix_ITU_R_709_2
let ins = AVMutableVideoCompositionInstruction()
ins.timeRange = CMTimeRange(start: .zero, duration: src.duration)
let li = AVMutableVideoCompositionLayerInstruction(assetTrack: track)
// rectángulo ya orientado (después de preferredTransform)
let disp = CGRect(origin: .zero, size: track.naturalSize).applying(track.preferredTransform)
let dw = Double(abs(disp.width)), dh = Double(abs(disp.height))
let s = max(OW / dw, OH / dh)                       // cubrir todo el cuadro
let tx = min(0, max(OW - dw * s, OW / 2 - dw * s * cropX))
let ty = (OH - dh * s) / 2
let t = track.preferredTransform
  .concatenating(CGAffineTransform(translationX: -disp.minX, y: -disp.minY))
  .concatenating(CGAffineTransform(scaleX: s, y: s))
  .concatenating(CGAffineTransform(translationX: tx, y: ty))
li.setTransform(t, at: .zero)
ins.layerInstructions = [li]
comp.instructions = [ins]
let ex = AVAssetExportSession(asset: src, presetName: AVAssetExportPresetHighestQuality)!
ex.videoComposition = comp
ex.outputURL = URL(fileURLWithPath: args[2])
ex.outputFileType = .mp4
let sem = DispatchSemaphore(value: 0)
ex.exportAsynchronously { sem.signal() }
sem.wait()
print(ex.status == .completed ? "ok" : "fail \(String(describing: ex.error))")
