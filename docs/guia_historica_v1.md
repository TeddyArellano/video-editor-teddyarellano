# Guía maestra de edición: Reels / TikTok de Teddy Arellano

> **Actualización:** todo este flujo ahora está empaquetado como la skill global **`/editar-reel`** (`~/.claude/skills/editar-reel/`), con un CLI (`reel`), una plantilla Remotion genérica, estilos predefinidos y las reglas del creador. Úsala para videos nuevos.
> Este documento queda como historia detallada de cómo se hicieron los primeros videos.

Esta guía explica cómo se editaron todos los videos verticales de esta carpeta, para que **cualquier chat de Claude (o cualquier persona)** pueda repetir el mismo flujo con material nuevo sin tener que preguntar.

- Los scripts de apoyo están en `herramientas_edicion/`.
- Cada video terminado tiene al lado su `proyecto_remotion/` editable. Usa el más parecido como plantilla.

> **Para Claude:** lee primero `CLAUDE.md`, luego esta guía y después el proyecto de referencia del tipo de video que vas a editar (§1).
> El creador prefiere que **orquestes todo solo**, sin preguntar a mitad del proceso, y que entregues el video terminado.

---

## 1. Videos hechos (y cuál usar de plantilla)

| Video | Tipo | Carpeta | Plantilla Remotion | Rasgos clave |
|---|---|---|---|---|
| Interpolitécnicos Esports 2026 | Promo a cámara, varias tomas por frase | raíz (`Interpolitecnicos_Esports_2026_EDIT.mp4`) | `proyecto_remotion/` | Mejor toma por frase; logos IPN y del evento; QR de inscripción; música original |
| FEySS: ¿Cuánto esperas ganar al egresar? | Entrevistas a estudiantes | `FEySS/` | `FEySS/proyecto_remotion/` | Monto en verde pixel; stickers emoji; pregunta solo al inicio |
| FEySS Día 2: ¿Qué carreras buscan las empresas? | Entrevistas a empresas | `FEySS/Dia 2 - Entrevistas empresas/` | `proyecto_remotion_quimica/`, `_tecnologia/` | Tomas del stand; tarjeta QR por empresa; dividido en 2 videos por área |
| FEySS: ¿Cuál es la empresa de tus sueños? | Entrevistas a estudiantes | `FEySS/Cual es la empresa de tus sueños/` | `proyecto_remotion/`, `_finanzas/`, `_tecnologia/` | Logo de la empresa al decirla; etiqueta de carrera por persona; 2 videos con gancho propio |
| Google Cloud Summit: unboxing | Unboxing a cámara (1 persona) | `Google Claude Summit/` | `Google Claude Summit/proyecto_remotion/` | Gancho grande con letras **detrás** de la persona; zooms suaves; tarjeta con nombre |
| Qué lleva en su mochila (1er vs 9no semestre) | Humor / comparación, 2 entrevistados | `Qué lleva en su mochila/` | `Qué lleva en su mochila/proyecto_remotion/` | Contador de objetos; cámara rápida x2; zoom a las manos; SFX de comedia; HDR→SDR correcto |

---

## 2. Preferencias del creador (no negociables)

Todas salen de correcciones reales que pidió el creador:

| Tema | Regla |
|---|---|
| **Audio** | **Original, sin filtros.** Nada de EQ, paso-altos, reducción de ruido, compresor ni loudnorm creativo, porque sonaba "tapado". Solo se permite **ganancia pareja** (volume), micro-fundidos de 8 ms en los cortes y un limitador transparente al final para los picos. |
| **Audio corrido** | **Sin huecos de silencio.** Los cortes van pegados, de palabra a palabra. Se verifica con `silencedetect` (§4.9). |
| **Sincronía** | Labios perfectamente sincronizados. Usa **siempre** `build_master_sync.py`; el método viejo desfasaba (§4.5). |
| **Color natural** | **Sin saturación ni contraste extra.** Los iPhone graban en **HDR (HLG)**: hay que convertir a SDR con el motor de Apple (§4.2). Si no, la piel sale naranja. |
| **Zona segura** | Todo texto dentro de **x 125–905, y 260–1500** (lienzo 1080×1920). Los márgenes laterales generosos son importantes: con 70/150 px "pegaban mucho a las orillas" (§7). |
| **Subtítulos centrados** | Centrados exactamente en x = 540. Ojo con el bug de `AbsoluteFill` (§6). |
| **Pregunta repetida** | En entrevistas en serie, la pregunta se escucha **solo al inicio**. Las demás entrevistas entran directo a la respuesta. |
| **Errores al hablar** | Se quitan tropiezos, arranques fallidos, "¿ya?", repeticiones y muletillas largas. Si el creador repite una frase varias veces, se usa **la mejor toma**. |
| **Duración** | Lo más corto posible. ~20–25 s por persona. Si pasa de ~1:30–2:00, se **divide en 2 videos por tema**, cada uno con su gancho. Si sobra algo poco importante, se puede usar **cámara rápida x2** (§4.7). |
| **Zooms** | Suaves y con easing. **Nada de "golpes"** (punch-in en cada corte se veía "bugueado"). Un encuadre por sección con acercamiento lento, más zooms pequeños puntuales a las manos/objeto. |
| **B-roll** | Solo si aporta. **Nunca** tapar el objeto o la cara de quien está hablando de algo, y nunca tomas de ~1 s sueltas ("se ve raro"). En "Mochila" se quitaron todas: solo quedaron las tomas de entrevista. |
| **Gimmicks que NO gustaron** | Congelados de "silencio incómodo", marcador final o tarjetas de resultado al final, y whoosh encima de una palabra importante. El video termina con la última frase. |
| **Lo que SÍ gustó** | Contador de objetos que sube; cámara rápida con el contador subiendo rápido; zoom a las manos que enseñan algo; SFX de humor puntuales; gancho grande y vistoso con tipografías distintas; letras que aparecen detrás de la persona. |
| **Imágenes** | En videos de empresas: nada de emojis ni imágenes decorativas, solo QR y datos de registro. En estudiantes sí se usaron stickers emoji y logos de empresas (de Wikimedia). |
| **Datos** | No se inventan logos, URLs ni datos. Se usan los que da el creador (`logo.png`, `ipn.png`, `qr.png`). |
| **Groserías** | Se censuran con **beep** y en el subtítulo aparece `P***`. |

---

## 3. Herramientas e instalación (macOS)

| Herramienta | Para qué | Instalar |
|---|---|---|
| **FFmpeg 8** | Cortes, escalado, concat y medición (ebur128, silencedetect). **No tiene `drawtext`**: los textos van en Remotion. | `brew install ffmpeg` |
| **whisper.cpp** + `ggml-large-v3-turbo.bin` | Transcripción en español con tiempos por palabra (DTW) | `brew install whisper-cpp`, luego `curl -L -o ggml-large-v3-turbo.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin` (~1.6 GB) |
| **Remotion 4** (4.0.529) | Composición: cámara virtual, subtítulos, gancho, gráficos y SFX | `npm i` dentro de cualquier `proyecto_remotion/` |
| **Swift / Apple frameworks** | Caras, manos, recorte de persona, QR, HDR→SDR | `swiftc -O archivo.swift -o archivo` (requiere Xcode CLT) |
| **Python venv** | EDL, datos, SFX sintetizados | `python3 -m venv venv && venv/bin/pip install numpy scipy pillow` |

### Herramientas de `herramientas_edicion/`

| Archivo | Qué hace |
|---|---|
| `hdr_a_sdr.swift` | **HDR iPhone → SDR BT.709** con el tone-mapping de Apple. Gira a vertical, 1440×2560. Mantiene la línea de tiempo. |
| `build_master_sync.py` | **Corte maestro con sincronía exacta** a partir de una EDL. Soporta `speed` (cámara rápida). |
| `tighten.py` | Quita pausas que quedaron dentro del corte (parte los tramos en la fuente). |
| `build_edl.py` | Ejemplo de EDL a partir de rangos de palabras de Whisper (proyecto FEySS). |
| `verificar_cortes.py` | Vuelve a transcribir cada tramo para confirmar que no se comen sílabas. |
| `faces.swift` | `faces <carpeta_jpg> salida.json` → caras por cuadro `[x_centro, y_centro, ancho]` normalizados (y desde arriba). |
| `hands.swift` | `hands img1.jpg img2.jpg …` → centro de cada mano detectada (JSON). Sirve para los zooms a objetos. |
| `personmatte.swift` | `personmatte <in_dir> <out_dir> <w> <h>` → PNG RGBA con solo la persona (texto detrás de la persona). |
| `qrscan.swift` / `qrbox.swift` | Leer a dónde lleva un QR / caja exacta del QR para recortarlo. |
| `grab_frame_apple.swift` | Un cuadro decodificado por AVFoundation (referencia visual). |
| `synth_sfx_musica.py` | SFX "limpios" (whoosh, pop, cash, impact, glitch, beep) y música original de la promo. |
| `synth_sfx_comedia.py` | SFX de humor: ding, boom (vine), scratch, crickets, coin, boing, tada, ffwd, trombone. |
| `build_master.py` | **Legado** (FEySS). Usa un filtro gigante: lento con 4K y no es exacto en sincronía. Mejor `build_master_sync.py`. |

Comando de Whisper con tiempos por palabra (el DTW **solo funciona con `-nfa`**):

```bash
ffmpeg -nostdin -i X.MOV -vn -ac 1 -ar 16000 X.wav
whisper-cli -m ggml-large-v3-turbo.bin -f X.wav -l es -t 8 -nfa -dtw large.v3.turbo -ojf -of w_X --prompt "Nombres propios: Juan, Radio, Victus, ESCOM, IPN"
```

El `--prompt` con nombres propios (personas, empresas, escuelas, productos) mejora mucho la transcripción.

---

## 4. Flujo de trabajo paso a paso

### 4.1 Inventario
1. Corre `ffprobe` en cada archivo para ver duración, `creation_time`, rotación y **color**:
   ```bash
   ffprobe -v error -select_streams v:0 -show_entries stream=width,height,color_transfer,color_primaries:stream_side_data=rotation -of csv=p=0 X.MOV
   ```
   `arib-std-b67,bt2020` = **HDR HLG de iPhone**, y hay que pasar por §4.2. Los iPhone vienen en 3840×2160 con `rotation=-90`, o sea verticales.
2. Agrupa por hora de grabación. Lo largo es la entrevista; lo corto suele ser b-roll o tomas repetidas; los HEIC son fotos (`sips -s format jpeg x.HEIC --out x.jpg`).
3. Arma hojas de contacto para ver todo rápido: `ffmpeg -i X.MOV -vf "fps=1,scale=120:-1,tile=15x1" -frames:v 1 hoja.jpg`.

### 4.2 HDR → SDR (si `color_transfer = arib-std-b67`)
```bash
swiftc -O herramientas_edicion/hdr_a_sdr.swift -o hdr_a_sdr
./hdr_a_sdr "IMG_0636.MOV" sdr/IMG_0636.mp4      # ~1 min por cada 4 min de 4K
```
- El video se toma de `sdr/`; el audio, del `.MOV` original.
- **No** uses `eq=saturation`, ni `scale_vt` de VideoToolbox, ni conversión directa de FFmpeg: todos dejan la piel naranja o lavada.
- El master debe quedar etiquetado `bt709`. Si queda etiquetado HLG/BT.2020, Chrome (Remotion) lo reinterpreta y satura.

### 4.3 Transcribir y escoger qué se queda
1. Corre Whisper con DTW (§3) sobre cada archivo. Obtienes palabras `[texto, t_inicio, t_fin]` con índice.
2. Elige **rangos de índices de palabra** por bloque, con esta estructura según el tipo:
   - **Estudiantes**: pregunta (solo la primera) → respuesta → por qué → carrera/escuela.
   - **Empresas**: qué hace la empresa (1 frase) → qué carreras buscan → prácticas/becas (si es corto).
   - **Promo / unboxing con tomas repetidas**: la mejor toma de cada frase (normalmente la última completa y con energía). El **gancho** se elige entre todas sus repeticiones.
   - **Humor / comparación (Mochila)**: intro (mejor toma) → persona A con cada objeto → persona B → remate ("Y ya es todo").
3. Se descartan arranques fallidos, "¿ya?", "siguiente video", pausas, muletillas y repeticiones.

### 4.4 EDL
- Inicio del tramo = `t_palabra − 0.14 s` (PAD_IN), nunca antes de `fin_palabra_anterior + 0.02`.
- Fin del tramo = `min(t_fin_whisper, t_ini + 0.08·len + 0.25) + 0.14` (PAD_OUT ≈ 0.12–0.14), nunca después de `inicio_palabra_siguiente − 0.15`.
- Se parte el tramo si hay una pausa real > 0.30 s.
- Se fusionan tramos separados por < 0.25 s para evitar microcortes.
- Formato para `build_master_sync.py`: `[{"src": "IMG_0636", "in": 12.34, "out": 15.67, "speed": 1.0, "words": [...]}, ...]`.

### 4.5 Corte maestro con sincronía exacta
```bash
python herramientas_edicion/build_master_sync.py edl.json "<carpeta con los .MOV>" proyecto_remotion/public/cut.mp4 --sdr sdr
```
- Por cada tramo genera un video con seek de entrada y `-frames:v N` exacto, y un **WAV PCM** con exactamente `N/30·48000` muestras y fundidos de 8 ms. Luego concatena el video por copia y el audio en PCM, y codifica **un solo AAC**.
- Escribe `cut.mp4.edl.json` con `start` (cuadro donde empieza cada tramo en el corte) y `frames`.
- Por qué: con AAC por tramo cada corte agregaba ~20 ms de retraso (priming) y a los 70 s los labios iban ~140 ms tarde. Con un `filter_complex` gigante, el 4K tardaba más de 30 min.

### 4.6 Apretar pausas (audio corrido)
```bash
python herramientas_edicion/tighten.py cut.mp4.edl.json public/cut.mp4 edl_apretada.json   # luego repetir 4.5 con la nueva EDL
```
Repite hasta que `silencedetect=n=-40dB:d=0.35` no encuentre nada. Tira los tramos de menos de 0.25 s, salvo palabras necesarias.

### 4.7 Cámara rápida (opcional, para acortar)
- En la EDL, pon `"speed": 2.0` en los tramos menos importantes. El video usa `setpts=PTS/2` y el audio `atempo=2.0`: la voz se oye rápida pero **sin tono de ardilla**.
- En el video se marca con una insignia "▶▶ x2" debajo del contador, más un SFX `ffwd` al entrar y un `pop` al salir. El contador sube rápido solo.
- Para pasar un tiempo de la fuente al corte: `t_corte = start/30 + (t_fuente − in) / speed`.

### 4.8 Verificar cortes
- Vuelve a transcribir cada tramo aislado (`verificar_cortes.py`) o el corte completo, y compáralo con el texto esperado.
- Si falta una sílaba o se cuela la palabra siguiente, ajusta los márgenes de ese tramo.

### 4.9 Datos para Remotion (`src/data.json`)
Se generan con Python (ejemplo: `Qué lleva en su mochila/proyecto_remotion/build_data2.py`):
- `words`: `{text, start, end, sec}` en **tiempo del corte**. Corrige lo que Whisper escucha mal, con un diccionario `FIX`.
- `sections`: `{intro: [f0, f1], juan: [...], ...}` en cuadros.
- `track`: centro de encuadre por cuadro. Sale de `faces.swift` sobre el corte a 5 fps, con suavizado gaussiano (σ ≈ 0.9 s): 1 cara en el intro y el punto medio de las 2 más grandes en entrevistas, ignorando caras chicas (pósters).
- `items` / `cues` / `zooms` / `names` / `fast`: eventos con tiempo del corte para el contador, los SFX, los zooms, las etiquetas de nombre y la cámara rápida.

### 4.10 Encuadre y zooms
- **Cámara**: `OffthreadVideo` dentro de un `div` con `transform: translate(tx,ty) scale(z)`, con `transformOrigin: '0 0'` y `tx/ty` acotados para no salirse del cuadro (ver `Mochila.tsx → Camera`).
- **Zoom base por sección** (1.0 intro, 1.12 entrevista pareja) más un acercamiento lento de +4 % a lo largo de la sección. El cambio entre secciones dura 15 cuadros con `Easing.inOut(cubic)`.
- **Zoom a las manos / objeto** (Mochila): ×1.5 durante ~1.5–1.8 s desde que dicen el objeto, con entrada y salida de 9 cuadros. Se centra en el objeto y lo sube a ~48 % de la altura (encima de los subtítulos).
  - Para hallar el centro, extrae cuadros con cuadrícula y míralos:
    ```bash
    ffmpeg -ss 68.5 -i public/cut.mp4 -frames:v 1 -vf "scale=360:640,drawgrid=w=36:h=64:t=1:c=white@0.35" z.png   # cada celda = 0.1
    ```
  - `hands.swift` da una primera aproximación, pero **siempre verifica a ojo**: a veces detecta la mano equivocada.
  - Si el objeto se enseña antes de nombrarlo (la laptop "Victus"), el zoom empieza cuando lo enseña.
- Si el gancho tapa la cara, baja el encuadre durante el gancho y súbelo suave después.

### 4.11 Render y exportación
```bash
npx remotion render src/index.ts <Composicion> out/raw.mp4 --codec=h264 --crf=17 --audio-bitrate=320k --color-space=bt709
# medir y llevar a ~ -14 LUFS solo con ganancia + limitador transparente
I=$(ffmpeg -nostdin -i out/raw.mp4 -af ebur128 -f null - 2>&1 | grep -A1 "Integrated loudness" | grep "I:" | awk '{print $2}')
G=$(python3 -c "print(round(-14-($I),2))")
ffmpeg -nostdin -y -i out/raw.mp4 -c:v copy -af "volume=${G}dB,alimiter=limit=0.89:attack=1:release=60:level=disabled" -c:a aac -b:a 320k -movflags +faststart FINAL.mp4
```
Resultado típico: **−15 a −14 LUFS, pico ≤ −0.7 dBFS**.

### 4.12 Revisión final (siempre, antes de entregar)
- **Stills** de momentos clave con `npx remotion still src/index.ts <Comp> s.png --frame=N`, juntados con `hstack`. Revisa márgenes, centrado (dibuja una línea en x=540) y que los zooms caigan en el objeto.
- `ebur128=peak=true` para volumen y picos.
- `silencedetect=n=-40dB:d=0.35` en el final: no debe haber silencios.
- `ffprobe` del final: `color_primaries/transfer = bt709`.
- Compara la cara del intro contra la conversión de Apple: no debe verse naranja.
- Si hay QR, léelo **desde un cuadro del video final** con `qrscan`.
- Copia el video a la carpeta del proyecto y sincroniza el `proyecto_remotion/` editable (`rsync` sin `node_modules`, `out`, `stills`).

---

## 5. Estilos por tipo de video

### 5.1 Entrevistas FEySS (estudiantes y empresas)
- **Fuentes**: Montserrat 800/900 (subtítulos y títulos) y Silkscreen 700 (montos en pixel verde `#3CFF3C`).
- **Colores**: palabras clave en amarillo `#FFE81A`; píldoras en guinda `#7B1E3C` o en amarillo con texto negro.
- **Gancho**: pregunta en 3–4 líneas escalonadas (`¿CUÁNTO / ESPERAS / GANAR / AL EGRESAR?`). Cada palabra entra cuando se dice, con píldoras del área y del evento ("FERIA DEL EMPLEO Y SERVICIO SOCIAL 2026").
- **Estudiantes**:
  - Monto con efecto máquina de escribir y SFX `cash`.
  - Stickers emoji en tarjeta blanca.
  - Etiqueta de carrera/escuela debajo de los subtítulos, discreta.
- **Empresa de tus sueños**:
  - Logo de la empresa al decirla, bajado de Wikimedia con `get_logos.py` (recorta márgenes transparentes con PIL).
  - Etiqueta de carrera por persona, un poco más abajo de los subtítulos.
  - SFX cuando hay varias personas en cuadro.
- **Empresas**:
  - Título "EMPRESA N DE M".
  - 2 tomas del stand por empresa (2–4 s, fundido de 5 cuadros).
  - Tarjeta de registro con QR los últimos 6 s, en la mitad inferior.
- **Cierre**: último cuadro congelado y desenfocado, pregunta para comentarios y píldora "COMÉNTALO 👇" (~2 s). *No* aplica a videos de humor.

### 5.2 Promo a cámara (Interpolitécnicos)
- Anton + Montserrat, guinda `#8C1D40` y dorado `#FFC83D`.
- Logo IPN × banner oficial.
- "TORNEO DE ESPORTS" con control, símbolos △○✕□ y esquinas HUD.
- Logos de juegos al nombrarlos, calendario y QR de inscripción que se queda hasta el final.
- Música original sintetizada ~13 LU debajo de la voz.

### 5.3 Unboxing (Google Cloud Summit)
- Montserrat + Poppins, colores de Google.
- **Gancho grande y vistoso**: "Google Cloud Summit" con letras que **suben por detrás de la persona**.
  - Se generan recortes de la persona con `personmatte.swift` para los primeros ~120 cuadros (`public/hookfg/0000.png…`).
  - Se dibujan **encima** del texto con exactamente la misma transformación de cámara. El orden de capas es video → texto → persona recortada.
- Tarjeta de nombre "TEDDY ARELLANO / CREADOR DE CONTENIDO".
- Zooms suaves y SFX sutiles.
- El video termina en "nos vemos a la próxima".
- **No** pongas un whoosh en el cuadro 0 si tapa la primera palabra.

### 5.4 Humor / comparación (Qué lleva en su mochila)
- **Fuentes**: Lilita One (subtítulos 80 px y números grandes), Permanent Marker (frases a mano), Bangers ("VS") y Bungee (contador).
- **Colores**: azul `#2F80ED` (persona A), rojo `#EB5757` (persona B), amarillo `#FFE14D` (palabras clave/objetos).
- **Gancho** tipo cuaderno con stickers:
  - "¿Qué lleva en su" en marker 64 px.
  - "MOCHILA?" en Lilita 150 px amarillo con contorno.
  - Stickers rotados "1ER SEMESTRE" **VS** "9NO SEMESTRE" (44 px).
  - Nota amarilla "estudiantes de Ing. en Sistemas".
  - Todo centrado en x = 540 y con `whiteSpace: nowrap`.
- **Contador "OBJETOS N"**:
  - Arriba a la izquierda (x = 125), con el color de cada persona.
  - Rebota (spring) y suena un `ding` con cada objeto.
  - Se reinicia en 0 al cambiar de persona.
- **Etiqueta de nombre** arriba a la derecha unos 3 s cuando dicen su nombre.
- **Transición "VS"** de 22 cuadros con barrido diagonal azul/rojo al pasar a la persona B, con whoosh.
- **SFX por chiste**: `coin` (peluche de Luigi), `boing` ("aplastado"), `tada` ("preparados"), `boom` (3er inhalador, laptop) y `whoosh2` muy bajo en cada zoom.

---

## 6. Subtítulos (todos los videos)
- Bloques de **1 a 3 palabras**, máximo ~16 caracteres. Se corta en puntuación y al cambiar de persona o sección.
- Salen 2 cuadros antes de la palabra, con "pop" de escala 0.8 → 1 (spring) y se quedan como máximo +24 cuadros después.
- **Cálculo en dos pasadas**: primero el `from` de todos los bloques y después `to = min(siguiente.from, natural + 24)`.
- MAYÚSCULAS, blanco, contorno negro 11–12 px (`WebkitTextStroke` + `paintOrder: 'stroke fill'`). Las palabras clave/objetos van en amarillo.
- Posición: `top ≈ 1120–1190`. Si hay tarjeta QR abajo, suben a `top ≈ 290`.
- **Centrado correcto**: `AbsoluteFill` trae `width: 100%`. Si le pones `left: 125`, la caja se corre 125 px a la derecha y el texto queda descentrado. Usa `<AbsoluteFill style={{top: 1190, alignItems: 'center'}}>` con un hijo de `width: W − 2·175` y `textAlign: 'center'`.
- Durante el gancho no hay subtítulos.
- Corrige nombres mal transcritos y escribe los números con cifras ("catorce mil" → 14 mil).

---

## 7. Zona segura (1080×1920)

| Zona que tapa la interfaz | Margen |
|---|---|
| Arriba (Siguiendo / Para ti) | 0–250 px |
| Abajo (usuario, descripción, audio) | 1500–1920 px |
| Derecha (botones) | 905–1080 px |
| Izquierda | 0–125 px |

Constantes en el código: `SAFE = {top: 260, bottom: 1500, left: 125, right: 175}`. Para centrar bloques usa márgenes simétricos (`left: SAFE.right, width: W − 2·SAFE.right`).

Para comprobar, dibuja las zonas sobre un still:
```bash
ffmpeg -i s.png -vf "drawbox=x=0:y=0:w=1080:h=250:color=red@0.35:t=fill,drawbox=x=905:y=0:w=175:h=1920:color=red@0.25:t=fill,drawbox=x=0:y=0:w=125:h=1920:color=red@0.25:t=fill,drawbox=x=0:y=1500:w=1080:h=420:color=red@0.35:t=fill,drawbox=x=539:y=0:w=2:h=1920:color=blue" guia.jpg
```

---

## 8. Sonido
- **Voz**: original (§2).
- **SFX** sintetizados con `synth_sfx_musica.py` y `synth_sfx_comedia.py`. No tienen copyright.
  - Volúmenes típicos (en `<Audio volume>`): ding 0.32, pop 0.3–0.35, whoosh 0.25–0.45, whoosh2 en zooms 0.16, boom 0.35–0.45, coin/boing 0.4, tada 0.35, ffwd 0.4.
  - Cada SFX va en una `<Sequence>` de ≤ 45 cuadros, recortada para no pasar del final del video.
  - Ponlos **en el chiste** (unos cuadros después de la palabra), nunca encima de una palabra clave.
- **Música**: solo en la promo. Las entrevistas, el unboxing y el humor van **sin música**.

---

## 9. Estructura de un proyecto Remotion
```
proyecto_remotion/
├─ public/
│  ├─ cut.mp4          ← corte maestro (BT.709, audio original)
│  ├─ sfx/*.wav        ← efectos sintetizados
│  ├─ hookfg/*.png     ← (unboxing) recortes de la persona para el gancho
│  ├─ logos/, qr/, broll/  ← según el tipo de video
├─ src/
│  ├─ index.ts, Root.tsx   ← Composition 1080×1920, 30 fps, durationInFrames = cuadros del corte
│  ├─ <Video>.tsx          ← Camera, Hook, Captions, Counter/NameTag…, SFX[]
│  └─ data.json            ← words, sections, track, items, zooms, cues…
├─ build_*.py              ← scripts que generaron cut.mp4 y data.json
└─ package.json            ← remotion 4.0.529, @remotion/google-fonts
```
Para volver a renderizar: `npm i`, luego `npx remotion studio src/index.ts` (vista previa) y el render de §4.11.

---

## 10. Problemas que ya resolvimos (no repetirlos)
- **Piel naranja / colores muy fuertes**: la fuente era HDR HLG, quedó etiquetada BT.2020 en el master y además tenía `eq=saturation`. Solución: §4.2, etiquetas bt709 y `--color-space=bt709`.
- **Audio desfasado**: AAC por tramo + concat. Solución: PCM + un solo AAC (`build_master_sync.py`).
- **Render del master eterno**: `filter_complex` con decenas de `trim` de 4K. Solución: tramos en paralelo con seek de entrada.
- **Zooms "bugueados"**: punch-in alternado en cada corte. Solución: un zoom por sección con easing y zooms puntuales suaves.
- **Subtítulos corridos a la derecha**: `AbsoluteFill` con `left` (§6).
- **Textos pegados a las orillas**: márgenes laterales 125/175 y gancho más chico con `nowrap`.
- **B-roll que tapa el objeto** del que se habla, o tomas de 1 s: se quitaron.
- **DTW de Whisper devuelve −1**: falta `-nfa`.
- **Whisper desfasado con tomas repetidas**: transcribe por archivo y ancla con tiempos por palabra. Verifica volviendo a transcribir.
- **FFmpeg dentro de `while read` se come la lista**: usa `-nostdin` o corre el ciclo desde Python.
- **zsh**: `$VAR:l` es un modificador (usa `${VAR}`); `$x` no se parte en palabras (usa `${=x}`).
- **Spring con rebote en escalas invertidas** (2.6 → 1): usa `interpolate(..., clamp)`.
- **Hooks de React** siempre antes de cualquier `return` anticipado.
- **`AbsoluteFill` anclado abajo** con `height: 100%` se sale de pantalla: usa `justifyContent: 'flex-end'` o `height: 'auto', top: 0`.
- **Logos PNG con mucho margen transparente** se ven chiquitos: recórtalos con PIL (`getbbox`).
- **Detector de caras que agarra pósters**: usa solo las 2 caras más grandes y filtra por tamaño (> 0.035).
- **Beep de censura que no tapa la palabra completa**: amplía la ventana ±0.1 s.
- **Disco casi lleno** (~8 GB libres): borra intermedios propios con rutas explícitas y revisa `df -h` antes de renderizar. El render de Remotion pesa ~80–120 MB/min; los tramos temporales del master, ~0.5 GB por cada 3 min.

---

## 11. Checklist para un video nuevo
1. [ ] Inventario: duración, rotación, **¿HDR?** y agrupación por hora.
2. [ ] Si es HDR → `hdr_a_sdr` de cada fuente usada.
3. [ ] Whisper con DTW y `--prompt` de nombres propios.
4. [ ] Elegir mejores tomas y rangos (pregunta solo al inicio; quitar tropiezos).
5. [ ] EDL → `build_master_sync.py` → `tighten.py` (repetir hasta 0 silencios) → verificar transcribiendo.
6. [ ] ¿Muy largo? Cámara rápida x2 en lo menos importante, o dividir en 2 videos.
7. [ ] `data.json`: words, sections, track (caras), eventos (items, zooms, cues).
8. [ ] Composición: gancho centrado en zona segura, subtítulos centrados, gráficos del tipo de video, zooms suaves, SFX puntuales.
9. [ ] Stills de revisión (márgenes, centrado, zooms, color de piel).
10. [ ] Render con `--color-space=bt709` → ganancia a ~−14 LUFS + limitador → silencedetect / ebur128 / ffprobe.
11. [ ] Copiar el video final y el `proyecto_remotion/` editable a la carpeta del video.
