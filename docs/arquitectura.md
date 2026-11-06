# Arquitectura

```
clips crudos (.MOV HDR/SDR, .HEIC)
   │  reel inventario · sdr · audio
   ▼
~/.reels-toolkit/cache/<id>/sdr/*.mp4      (SDR BT.709 1440x2560, tone-mapping de Apple)
   │  reel transcribir  (whisper.cpp DTW + inicios por energía + anti-bucles)
   ▼
proyecto_remotion/edicion/palabras/<clip>.json|.txt
   │  Claude escribe edicion/plan.json  (rangos de índices de palabra por pieza)   ← reel tomas / buscar ayudan
   │  reel edl     (márgenes en los límites reales de la voz, partir pausas, fusionar)
   │  reel cortar  (tramos en paralelo → video por copia + audio PCM exacto → 1 AAC; quitar silencios iterativo)
   ▼
proyecto_remotion/public/cut.mp4 + edicion/edl_final.json
   │  Claude escribe edicion/eventos.json  (gancho, secciones, objetos, zooms, SFX, etiquetas, montos, logos/QR…)
   │  reel datos   (subtítulos en tiempo del corte, encuadre por caras, anclas → cuadros, SFX automáticos)
   ▼
proyecto_remotion/src/data.json  +  src/estilo.json (preset + marca)
   │  Remotion (plantilla genérica)  · reel revisar (stills) · reel render (--borrador | final)
   ▼
<carpeta>/<Título>.mp4  (+ .srt, portada.jpg, versiones/, edicion/cambios.md)
```

## Piezas

| Pieza | Dónde | Qué hace |
|---|---|---|
| `reel.py` | `skill/editar-reel/scripts/` | CLI único con 26 subcomandos. Usa el Python del toolkit (`numpy`, `scipy`, `pillow`). |
| Swift | `skill/editar-reel/swift/` | `hdr_a_sdr` (AVFoundation, tone-mapping de Apple, orientación y recorte), `faces` y `hands` (Vision), `personmatte` (segmentación de persona), `qrscan`/`qrbox` (códigos) y `grab_frame_apple`. Se compilan en `~/.reels-toolkit/bin`. |
| Plantilla Remotion | `skill/editar-reel/plantilla_remotion/` | Composición `Reel` 1080×1920 a 30 fps. Componentes: `Camera` (encuadre por sección, empuje lento, zooms a objetos, proxy), `Hook` (elementos con animaciones y capas detrás/delante), `Captions`, `Overlays` (contador, x2, nombre, etiquetas, imágenes/QR, transición VS, b-roll, cierre, sonido) y `Extras` (montos, emojis, calendario, decoración gamer). Todo se lee de `data.json` + `estilo.json`. |
| Estilos | `skill/editar-reel/estilos/` | Colores, fuentes, subtítulos, cámara y SFX automáticos por tipo de video, más un `eventos.json` de ejemplo. |
| Marcas | `skill/editar-reel/marcas/` | Colores y logos que se aplican encima de un estilo. |
| Reel Studio | `app/` | App de escritorio (Electron + React). La vista previa es la composición `Reel` de la plantilla en `@remotion/player`, alimentada por props (`setDatos`). Edita `eventos.json`/`estilo.json`/`plan.json`/`notas.json` y ejecuta `reel.py --json` en una cola. Ver `app/README.md`. |
| Toolkit | `~/.reels-toolkit/` | `bin/`, `models/` (Whisper large-v3-turbo), `venv/`, `remotion/node_modules` (compartido por todos los proyectos vía symlink) y `cache/` (SDR, wav, tramos y proxies por proyecto). |

## Decisiones técnicas clave (y por qué)

1. **Sincronía exacta.**
   - El video de cada tramo sale con seek de entrada y `-frames:v N` exactos y se concatena por copia.
   - El audio de cada tramo sale en PCM con exactamente `N/30·48000` muestras y fundidos de 8 ms, y se codifica **un solo AAC**.
   - Por qué: el AAC por tramo agregaba ~20 ms de retraso por corte y desfasaba los labios.
   - Hay caché por tramo (hash de src, in, out, speed, ganancia, recorte y audio externo), así que repetir el corte es rápido.
2. **Remuestrear antes de recortar.** `aresample=48000` va antes de `atrim=end_sample`; si no, las fuentes a 44.1/22 kHz se desincronizan.
3. **HDR.** Se usa el tone-mapping de Apple vía AVFoundation, con el master etiquetado bt709 y el render con `--color-space=bt709`. Por qué: FFmpeg, `scale_vt` y un master etiquetado HLG dejaban la piel naranja.
4. **Tiempos de palabra.**
   - Se usa el **DTW** de whisper.cpp (`-nfa -dtw large.v3.turbo`).
   - Los `offsets.to` son imprecisos, así que el fin de palabra se estima como `min(inicio siguiente, inicio + 0.08·letras + 0.25)`.
   - Los inicios que caen en silencio se mueven al primer inicio de voz sostenido (`refine_onsets`).
5. **Puntos de corte.**
   - `edl` camina desde la palabra mientras haya voz (umbral = ruido local + 8 dB, tolera huecos ≤ 80 ms) hasta 90–100 ms de silencio real.
   - Sin silencio claro, usa los márgenes fijos (0.14/0.12 s).
   - Si la verificación lo pide, se ajusta a mano con `mas_inicio`/`mas_final`.
6. **Sin pausas.** `cortar` itera: `silencedetect` (−40 dB, 0.35 s), lo mapea a tiempos de la fuente (respetando la velocidad), parte tramos y recorta colas y cabezas en los límites entre tramos. Descarta pedacitos sin voz de menos de 0.6 s.
7. **Anclas por palabra.** Los eventos se anclan a palabras (`"sec:palabra#n"`), no a segundos, así que sobreviven a cambios en el corte. `datos` valida todas antes de seguir.
8. **Plantilla configurable por datos.** Un video normal no requiere escribir TSX. Lo específico de un video va en `eventos.json`; el look, en `estilo.json`.
9. **Las ayudas sugieren, Claude decide.** `tomas`, `zooms` y `niveles` producen propuestas e imágenes de verificación; la elección final la hace Claude leyendo y mirando.
10. **Revisión con el creador.** Página (artifact) con el borrador como asset y notas en `db` (`comentarios`: `t`, `texto`, `autor`, `estado`, `respuesta`). Claude las lee y actualiza con `ArtifactData`.
11. **Plantilla alimentada por props.**
    - `theme.ts` expone `D`/`E`/`VLOG` como datos intercambiables: `setDatos()` desde los props de `Reel`.
    - Lo que se calcula a partir de los datos (bloques de subtítulos, tramos de cámara…) va en `derivado()`.
    - Los archivos de `public/` se piden con `asset()`.
    - Sin props, el render por CLI usa los JSON de `src/` como siempre. Se verificó con 141 stills de 5 proyectos reales, idénticos píxel a píxel.
12. **Posición libre.** `dx`/`dy`/`escala`/`rot` en `eventos.json` mueven cualquier elemento sobre su posición normal.
    - El envoltorio `<Pos data-reel="lista:i">` no altera el dibujo si faltan.
    - `reel datos` copia esos campos más `ev` (índice en `eventos.json`) a `data.json`.
13. **`reel.py --json`.** Salida en líneas JSON con progreso, para la app.
    - El id de caché queda guardado en `proyecto.json`, así que mover la carpeta no pierde la caché.
    - El seguimiento de caras va en caché con la huella de `cut.mp4`, así que `datos` sin cambios de corte tarda unos 0.05 s.

## Datos por proyecto (`proyecto_remotion/edicion/`)
- `proyecto.json`: fuentes, estilo, nombre, marca, `recorte_x`, `audio_externo` y `revision_url`.
- `inventario.json` y `hojas/`.
- `palabras/`.
- `tomas.txt`.
- `plan.json`.
- `edl.json` y `edl_final.json`.
- `verificacion.txt`.
- `eventos.json`.
- `revision/` (stills, cuadrículas, zooms y página de revisión).
- `cambios.md`.
- `respaldo/`.
- `borrador.mp4`.

Esquema completo de `eventos.json` y `data.json`: `skill/editar-reel/referencia/eventos.md`.
