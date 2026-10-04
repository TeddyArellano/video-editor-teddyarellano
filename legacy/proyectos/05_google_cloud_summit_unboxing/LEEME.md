# Proyecto Remotion: Google Cloud Summit (unboxing)

Video final: `../Google Cloud Summit - Unboxing.mp4`. Guía general: `../../GUIA_EDICION_REELS.md` (§5.3).

## Volver a renderizar
```bash
npm i
npx remotion studio src/index.ts
npx remotion render src/index.ts Unboxing out/raw.mp4 --codec=h264 --crf=17 --audio-bitrate=320k --color-space=bt709
```
Después, ganancia a ~−14 LUFS más un limitador (guía §4.11).

## Archivos
- `public/cut.mp4`: corte maestro, con el gancho elegido entre ~6 tomas y las partes que el creador pidió quitar ya fuera.
- `public/hookfg/NNNN.png`: recortes de la persona (`personmatte.swift`) para los primeros 120 cuadros. Se dibujan **encima** del texto del gancho con la misma transformación de cámara, así las letras quedan detrás de la persona.
- `public/broll/`, `public/img/`, `public/sfx/`: tomas de apoyo, imágenes y efectos.
- `src/Unboxing.tsx`: cámara (zoom suave por sección), gancho "Google Cloud Summit", subtítulos, tarjeta de nombre y SFX.
- `build_edl.py` → `build_master_sync.py` (master con sincronía exacta) → `tighten.py` (quitar pausas) → `build_data.py` (`src/data.json`).
