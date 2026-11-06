#!/bin/zsh
# Prepara los fixtures de las pruebas E2E (copias aisladas: nunca se toca un proyecto real).
#   zsh e2e/preparar.sh <carpeta destino> [proyecto real para el fixture grande]
# Deja:
#   <dest>/grande/proyecto_remotion   copia de un proyecto real (src/ edicion/ config copiados, public/ clonado APFS)
#   <dest>/chico/proyecto_remotion    proyecto de `reel prueba` con 2 secciones (la 2ª a −9 dB) e intro 3D
#   <dest>/foto_qr.jpg, <dest>/mic.wav  foto con un QR y "micrófono externo" (audio del clip con 0.7 s de retraso)
# Imprime las variables para correr: REEL_FIXTURE, REEL_FIXTURE2, REEL_FOTO_QR, REEL_MIC
set -e
setopt NULL_GLOB
DEST="${1:?carpeta destino}"; GRANDE="$2"
PY=~/.reels-toolkit/venv/bin/python
REEL="$(cd "$(dirname "$0")/../.." && pwd)/skill/editar-reel/scripts/reel.py"
mkdir -p "$DEST"

copiar() { # copia aislada de un proyecto: $1 origen, $2 destino
  rm -rf "$2"; mkdir -p "$2/public" "$2/edicion"
  cp -R "$1/src" "$2/src"
  for f in remotion.config.ts package.json tsconfig.json; do [ -f "$1/$f" ] && cp "$1/$f" "$2/"; done
  for f in "$1/edicion"/*.json "$1/edicion"/*.md "$1/edicion"/*.txt; do [ -f "$f" ] && cp "$f" "$2/edicion/"; done
  [ -d "$1/edicion/palabras" ] && cp -R "$1/edicion/palabras" "$2/edicion/palabras"
  cp -cR "$1/public/." "$2/public/"          # clon APFS: sin espacio extra; escribir aquí no toca el original
  ln -sfn ~/.reels-toolkit/remotion/node_modules "$2/node_modules"
  python3 -c "import json,sys;p=sys.argv[1];c=json.load(open(p));c.pop('id',None);json.dump(c,open(p,'w'),ensure_ascii=False,indent=1)" "$2/edicion/proyecto.json"
}

# --- chico: el material sintético de `reel prueba`
[ -f ~/.reels-toolkit/cache/autoprueba/material/CLIP01.mov ] || $PY "$REEL" prueba >/dev/null
CH="$DEST/chico"; rm -rf "$CH"; mkdir -p "$CH"
cp ~/.reels-toolkit/cache/autoprueba/material/CLIP01.mov "$CH/"
copiar ~/.reels-toolkit/cache/autoprueba/material/proyecto_remotion "$CH/proyecto_remotion"
python3 - "$CH" <<'PY'
import json, sys
C = sys.argv[1]; P = f'{C}/proyecto_remotion'
cfg = json.load(open(f'{P}/edicion/proyecto.json')); cfg['fuentes'] = C; cfg.pop('audio_externo', None)
json.dump(cfg, open(f'{P}/edicion/proyecto.json', 'w'), indent=1)
json.dump({'piezas': [{'src': 'CLIP01', 'de': 5, 'a': 13, 'sec': 'uno'}, {'src': 'CLIP01', 'de': 14, 'a': 27, 'sec': 'dos', 'gain_db': -9}]},
          open(f'{P}/edicion/plan.json', 'w'), indent=1)
ev = json.load(open(f'{P}/edicion/eventos.json'))
ev = {k: v for k, v in ev.items() if k in ('gancho', 'etiquetas', 'fix')}
ev['intro_espacio'] = {'sec': 'uno', 'titulo': ['PRUEBA', 'ESPACIAL'], 'hud': 'REEL STUDIO'}
json.dump(ev, open(f'{P}/edicion/eventos.json', 'w'), indent=1, ensure_ascii=False)
PY
for c in edl cortar datos; do $PY "$REEL" $c -p "$CH/proyecto_remotion" >/dev/null; done
ffmpeg -v error -y -i "$CH/CLIP01.mov" -vn -ac 1 -ar 48000 -af "adelay=700,volume=1.3" "$DEST/mic.wav"

# --- foto con un QR (CoreImage)
cat > "$DEST/qr.swift" <<'SW'
import CoreImage
import CoreImage.CIFilterBuiltins
import AppKit
let f = CIFilter.qrCodeGenerator()
f.message = "https://example.com/registro".data(using: .utf8)!
let qr = f.outputImage!.transformed(by: CGAffineTransform(scaleX: 24, y: 24))
let fondo = CIImage(color: CIColor(red: 0.55, green: 0.55, blue: 0.58)).cropped(to: CGRect(x: 0, y: 0, width: 1600, height: 1600))
let foto = qr.transformed(by: CGAffineTransform(translationX: 400, y: 450)).composited(over: fondo)
try! NSBitmapImageRep(ciImage: foto).representation(using: .jpeg, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
SW
swiftc -O "$DEST/qr.swift" -o "$DEST/qr" 2>/dev/null && "$DEST/qr" "$DEST/foto_qr.jpg"

# --- grande: copia de un proyecto real
if [ -n "$GRANDE" ]; then
  copiar "$GRANDE" "$DEST/grande/proyecto_remotion"
  $PY "$REEL" datos -p "$DEST/grande/proyecto_remotion" >/dev/null
fi
echo "REEL_FIXTURE=$DEST/grande/proyecto_remotion REEL_FIXTURE2=$CH/proyecto_remotion REEL_FOTO_QR=$DEST/foto_qr.jpg REEL_MIC=$DEST/mic.wav"
