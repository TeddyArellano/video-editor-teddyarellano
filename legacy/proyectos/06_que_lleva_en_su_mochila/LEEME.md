# Proyecto Remotion: Qué lleva en su mochila (1er vs 9no semestre)

Video final: `../Que lleva en su mochila - 1er vs 9no semestre.mp4` (76.4 s). Guía general: `../../GUIA_EDICION_REELS.md` (§5.4).

## Volver a renderizar
```bash
npm i
npx remotion studio src/index.ts                 # vista previa / editar
npx remotion render src/index.ts Mochila out/raw.mp4 --codec=h264 --crf=17 --audio-bitrate=320k --color-space=bt709
```
Después, ganancia a ~−14 LUFS más un limitador (comando en la guía §4.11).

## Archivos
- `public/cut.mp4`: corte maestro (BT.709, audio original, Juan de "pila" a "botella" en x2).
- `public/sfx/`: ding, boom, scratch, crickets, coin, boing, tada, ffwd, trombone, pop, whoosh, whoosh2.
- `src/Mochila.tsx`: todo el diseño.
  - `SAFE`: márgenes.
  - `Camera`: encuadre por sección + zooms a las manos (`CENTER`, `EXTRA_ZOOMS`).
  - `Hook`, `Counter`, `NameTag`, `Captions`, `VsWipe` y `FastBadge`.
  - Lista `SFX`.
- `src/data.json`: palabras, secciones, track de caras, objetos del contador, zooms, cues de SFX y cámara rápida.

## Scripts que generaron el corte (rutas relativas al scratchpad original; de referencia)
1. `sdr.swift`: HDR → SDR de cada .MOV usado (IMG_0634 Radio, IMG_0636 Juan, IMG_0639 intro).
2. `build_v3.py`: master sincronizado con cámara rápida (equivale a `herramientas_edicion/build_master_sync.py`).
3. `build_data2.py`: genera `src/data.json`.

`build_v2.py` es la versión anterior, que tenía saturación extra.
