# Problemas conocidos y diagnóstico

## Instalación / entorno
- **`toolkit incompleto`**: corre `zsh ~/.claude/skills/editar-reel/setup.sh`. Es idempotente y vuelve a compilar el Swift si cambió.
- **Se borró algo en `/tmp`** (scratchpad): no importa. Todo lo persistente vive en `~/.reels-toolkit` y en la skill.
- **zsh:** un comando guardado en una variable no se parte en palabras; usa `${=REEL}`. `$VAR:l` es un modificador: escribe `${VAR}`.
- **FFmpeg dentro de un `while read`** se come la lista: usa `-nostdin` (`reel` ya lo usa) o haz el ciclo en Python.
- **FFmpeg de Homebrew no trae `drawtext`:** todo texto va en Remotion.
- **Disco lleno:**
  - `df -h ~` antes de empezar;
  - `reel limpiar -p P` borra la caché (SDR ~1 GB por cada 4 min, tramos y wav);
  - el render final pesa ~80–120 MB/min.

## Whisper
- **Alucinación en bucle** (la misma frase repetida decenas de veces con el mismo tiempo, en silencios o música): `transcribir` la detecta y reintenta sin contexto (`-mc 0`). Si avisa "quedan N palabras sospechosas", no uses esos índices.
- **Inicio de palabra tarde** (típico en "Porque" y en la primera palabra tras una pausa): `transcribir` corrige los inicios que caen en silencio, y `edl` busca dónde empieza de verdad la voz (umbral relativo al ruido local; sirve en ferias). Si aun así falta una sílaba, usa `mas_inicio` en la pieza.
- **DTW devuelve −1:** falta `-nfa` (ya va en `reel transcribir`).
- **El `to` de cada token es impreciso** (~0.4 s antes del inicio DTW): `reel` estima el fin de palabra con el inicio de la siguiente. No uses los `to` crudos.
- **Nombres propios mal escritos:** usa `--prompt "Juan, Radio, Victus, ESCOM…"` al transcribir y `fix` en `eventos.json`.
- **Tomas repetidas y ruido de feria:** transcribe por clip y elige por índices. Verifica con `cortar --verificar`.

## Corte / audio
- **Fuentes de audio a 44.1/22 kHz** (micrófonos externos, otras cámaras): el corte remuestrea a 48 kHz antes de recortar por muestras. Antes del arreglo, el audio se desincronizaba (`atrim=end_sample` cuenta muestras a la frecuencia de entrada).
- **Sílaba final suave cortada** ("Azcapotzal…"): el final de pieza respeta una duración mínima plausible de la palabra. Si aún pasa, usa `mas_final`.
- **La verificación a 2× confunde a Whisper:** si suena raro algo en cámara rápida, transcribe ese tramo con `atempo=0.5` antes de concluir que hay un error.
- **Labios desfasados:** nunca concatenes AAC por tramo. `reel cortar` corta en PCM con muestras exactas y codifica una sola vez.
- **Quedan silencios** ("no se pueden quitar sin cortar voz"): mira `edicion/edl_final.json` cerca de ese tiempo. Puede ser un tramo sin palabras o una pausa dentro de una palabra arrastrada. Ajusta el `plan.json` (`quitar`, o parte la pieza).
- **Se come una sílaba al inicio o final:** en el `plan.json`, amplía `de`/`a` una palabra, o pártelo con `quitar`. Los márgenes automáticos son 0.14/0.12 s.
- **Volumen distinto entre personas:** usa `gain_db` por pieza en el `plan.json` (solo ganancia). Mide con `ffmpeg -ss A -to B -i public/cut.mp4 -af ebur128 -f null -`.

## Color
- **Piel naranja o colores fuertes:** la fuente es HLG (`color_transfer = arib-std-b67`) y no pasó por `reel sdr`, o el master quedó etiquetado BT.2020. Pasa por `reel sdr` y vuelve a cortar; `cortar` etiqueta bt709 y `render` usa `--color-space=bt709`.
- **No uses** `eq=saturation`, `scale_vt` de VideoToolbox ni `colorspace` de FFmpeg para HLG.

## Material poco común
- **Video horizontal:** `inventario` sugiere `recorte_x` (centro de las caras) en `edicion/proyecto.json`; `sdr` y `cortar` lo usan.
- **60 fps o VFR:** se normaliza a 30 fps en el corte.
- **HDR PQ (Android):** se detecta como HDR (`smpte2084`) y pasa por `sdr` igual que HLG.
- **Micrófono externo:** `reel audio -p P CLIP mic.wav` (confianza ≥ 1.3×; si es menor, pasa `--offset`).

## Logos
- **`reel logos`:** usa el logo oficial actual de Wikidata (P154; sello P158 o escudo P94 para instituciones). Si no lo hay, toma imágenes "logo" del artículo cuyo nombre coincida, o busca en Commons. **Míralos siempre**; si alguno es incorrecto, usa `"Nombre=File:Archivo exacto.svg"`.

## Remotion / plantilla
- **Subtítulos o bloques descentrados:** `AbsoluteFill` trae `width: 100%`; un `left` lo corre a la derecha. Centra con `alignItems: 'center'` y un hijo de `width: W − 2·SIDE`.
- **Bloques que nunca aparecen:** calcula los `from` de todos los bloques antes de los `to` (ya está así en `Captions.tsx`).
- **Spring con rebote en escalas invertidas** (2.6 → 1): pasa por `interpolate(..., clamp)`.
- **Hooks de React después de un `return` anticipado:** error. Siempre ponlos antes.
- **`AbsoluteFill` anclado abajo con `height: 100%`** se sale de pantalla: usa `top` explícito.
- **Logos PNG con mucho margen transparente** se ven chiquitos: recórtalos (PIL `getbbox`).
- **El detector de caras agarra pósters o gente del fondo:** se usan las N caras más grandes (> 0.035 de ancho). Ajusta `caras` por sección.
- **El recorte de persona incluye lo que sostiene** (bolsas, cajas) y puede tapar el texto del gancho "detrás": pon `"delante": true` en las líneas que deben leerse.
- **Proyecto con plantilla vieja:** `reel actualizar -p P` (respalda en `edicion/respaldo/`).
- **`reel revisar` falla:** corre `npx tsc --noEmit -p P` dentro del proyecto para ver el error de TypeScript, y revisa que `src/data.json` exista (`reel datos`).
- **Fuente que no carga:** debe estar en `FONTS` de `src/theme.ts` con el nombre exacto.

## Prueba de la skill
`reel prueba` corre todo el flujo con un clip sintético (voz de macOS + patrón) en ~35 s. Debe salir "AUTOPRUEBA OK" después de cualquier cambio a la skill.

## Verificación final (siempre)
`reel render` imprime duración, LUFS (meta −14 a −15.5), pico (≤ −0.5 dBFS), color (bt709) y silencios (ninguno). Además:
- haz stills del gancho, subtítulos, zooms y transiciones con `reel revisar`;
- si hay QR: `ffmpeg -ss <t> -i final.mp4 -frames:v 1 q.png && ~/.reels-toolkit/bin/qrscan q.png`.

## Estilo vlog (IEEE ESCOM)
- **Render falla con `inputRange must be strictly monotonically increasing`:** un `interpolate` recibió `[a, a]` (por ejemplo, el último cuadro del gancho, donde empieza y termina la escena). Protégelo con `fin > ini ? interpolate(...) : 1`. Ya está corregido en `GanchoCinetico.tsx`.
- **`vlog.py montaje` usó el audio viejo:** `cut_voz.mp4` se refresca solo cuando `cut.mp4` es más viejo que `edl_final.json` (es decir, recién salido de `reel cortar`). No toques (`touch`) `edl_final.json` a mano. Si dudas, borra `public/cut_voz.mp4` y corre `reel cortar` + `vlog.py montaje`.
- **Ancla de vlog.json "no está en el corte":** las anclas ven las palabras **después** del `fix` de eventos.json (por ejemplo, si Whisper escuchó "blog" y el fix lo cambia a "vlog", el ancla es `gancho:vlog`).
- **Whisper pega una retoma o pierde una palabra** (sobre todo al final de una frase o en una retoma inmediata): agrégala en `vlog.json → palabras_extra` con su tiempo en VOZ.
- **Subtítulos con "¡Gracias!" al final** en la verificación: es una alucinación de Whisper sobre el silencio final; no está en el audio.


## Rocket Revolution (oct. 2026): color, 3D, partes
- **Video "gris / apagado" tras dividir (el creador lo notó):**
  - **Causa:** los proyectos de cada parte no encontraban el SDR (la caché iba por proyecto) y la caché de tramos reusaba tramos armados con el HDR crudo (HLG/bt2020). Al re-etiquetarlo como bt709, se veía plano y gris.
  - **Arreglo en `reel`:** el SDR es global por archivo fuente (`~/.reels-toolkit/cache/sdr_global`), la clave del tramo incluye si había SDR, y `dividir` comparte el SDR.
  - **Diagnóstico:** `ffprobe -show_entries stream=color_transfer public/cut.mp4` debe decir `bt709`; si dice `arib-std-b67`, el corte salió del HDR.
- **Convertir cuadros RGB ↔ YUV con FFmpeg sin decir la matriz** usa BT.601 y desatura. Siempre usa `scale=in_color_matrix=bt709` y `out_color_matrix=bt709:out_range=tv`. Al concatenar, conserva las etiquetas (`h264_metadata` bsf).
- **Editar píxeles por HSV de 8 bits (PIL)** degrada todo el cuadro. Cambia solo los píxeles enmascarados (`np.where(mask, nuevo, original)`).
- **Lentes con reflejo azul en el zoom:** es el antirreflejante real, no un overlay. Se corrige con `reel lentes`.
  - **Ojo:** un degradado oscuro semitransparente que pase sobre los ojos los "tiñe" de azul; las máscaras de la intro 3D terminan al 29% del alto.
- **three.js en Remotion:**
  - necesita `Config.setChromiumOpenGlRenderer('angle')`;
  - con blending aditivo normal, las partículas oscuras escriben alfa y salen como **puntos negros** sobre el video: usa el blending "luz" de `IntroEspacio.tsx` (no toca el alfa);
  - todo debe ser determinista por cuadro: nada de estado ni `useFrame`, calcula las posiciones con `frame`.
- **Monedas o partículas sobre la cara:** salen por los lados (x ±1.4–2.0 en coordenadas de la escena) y no desde el centro.
- **Perfil de IG o subtítulo que se queda en la siguiente entrevista:** los subtítulos ya se cortan al fin de su sección. Para los perfiles, calcula `dur` con `data.json → secs`.
- **Whisper con nombres de equipos:** "Silicon" era **Iluikatl**, "Multuroquetry" era **Vultur Rocketry**, "Leica" era **Laika**, "chantas" era **llantas** y "qarteam.sem" era **@qrteam.cem**. Contrasta con las capturas de IG o con el b-roll del stand (laptop, banner) y corrige con `fix`.
- **SendUserFile tiene un límite de 30 MB:** manda una vista previa 720p y deja el final en la carpeta.
- **(AWS SCD) El clip fuente quedó excluido** porque el `nombre` del proyecto coincidía con el nombre del archivo fuente ("AWS Student Community Day.MOV"): el inventario lo tomó como la salida. Da al proyecto un nombre distinto del clip (por ejemplo, "Reel …").
- **(AWS SCD) La expresión `select` de ffmpeg es demasiado larga** con cientos de `eq(n\,N)`. Extrae por rangos contiguos con `between(n\,A\,B)` y `-start_number A`, un ffmpeg por rango.
- **(AWS SCD) Recortes de persona (`public/fg/NNNN.png`) desfasados** después de cambiar el plan: se nombran por cuadro absoluto del corte. Si cambia `cut.mp4`, bórralos y rehazlos.

## `vlog.py montaje`: "falta el SDR de IMG_…" aunque `reel sdr` terminó bien (oct 2026, Google Cloud Summit estudiantes)
`reel sdr` ahora escribe en la caché global (`cache/sdr_global/<clip>_<hash>.mp4`), pero `vlog.py` solo buscaba en la caché vieja por proyecto.
Arreglado: `vlog.py` cae a `sdr_global()` con la misma clave que `reel.py` (`Proyecto.sdr_global`).

## Narración con muchas retomas: palabras cortadas, trabas y repeticiones que se cuelan (oct 2026, GCS estudiantes v3)
- Whisper sobre el MP3 completo **limpia** las trabas, se salta voz (retomas enteras sin transcribir) y pone finales de palabra antes de que termine la voz → `cortar` recorta sílabas ("LearnLM", "conoces", "ahora") y deja repeticiones ("que muchos / muchos", "pero ahora / pero ahora").
- Solución que funcionó: VAD por energía (−38 dB, unir huecos < 60 ms) → transcribir **cada segmento por separado** (`whisper-cli -ml 1 -mc 0`) → elegir segmentos completos (la última toma limpia) → reescribir `VOZ.json` y `plan.json` desde esa lista (ver `edicion/voz_limpia.py` del proyecto). Los límites caen en silencio real.
- Revisar después que cada frase del corte cubra su segmento (`edl_final` in/out vs. segmento): una "palabra" > 1.2 s se recorta (`cut_words` limita `end` a start+1.2) → partirla en dos palabras.
- `mas_inicio` negativo recorta el arranque (útil para dejar fuera un "Este…" pegado).

## Review de gadget (HAYLOU, oct. 2026)
- **Repetición que se cuela al inicio de una frase** ("aunque, aunque…"): `reel edl` busca el inicio de voz hasta 0.6 s antes y atrapa una toma fallida pegada. Usa `mas_inicio` **negativo** en la pieza (p. ej. −0.42) para empezar después.
- **Se come la última sílaba** ("escuel…"): la palabra tiene una micro pausa interna y Whisper deja el final como segmento aparte. Mide el RMS de la fuente y alarga `b` de la frase hasta el final real + `mas_final` ~0.08.
- **Pausa intencional en silencio:** `reel cortar` siempre la quita. Alárgala después con `ejemplos/review-gadget/pausa.py` (`reel.build_master`), silencia el audio de la toma en Remotion (`volCut`) y fija los tiempos de las palabras vecinas desde `edl_final` (Whisper del corte se desfasa alrededor del silencio).
- **Stills/tramos de propuestas lentísimos:** cada `remotion still` vuelve a bundlear y en paralelo chocan en la caché de webpack. Bundlea una vez (`npx remotion bundle src/index.ts --out-dir=… --public-dir=public`) y renderiza desde esa carpeta.
- **4K:** `reel render --4k` escribe su propio "NOMBRE 4K.mp4"; no renombres salidas a mano (una vez se sobrescribió el 4K con el 1080).

## Conferencia (Notion Summit, nov. 2026)
- **`npx`/`node` falla con `dyld: Library not loaded … libsimdjson/simdutf`:** un `brew upgrade` rompió node@22. Pon otro node del Cellar (`/opt/homebrew/Cellar/node/<v>/bin`) al inicio del `PATH`; no hace falta reinstalar.
- **Stills con `"proxy":true` fallan** si no existe `public/cut_proxy.mp4`: usa `"proxy":false` o corre `render --borrador` antes.
- **`seguimiento.py` con `PANTALLA=[]` y `CENTRO=[]`** debe saltarse el bloque `data.pantalla` (ya lo hace); si todo es NaN `np.interp` falla.
- **Tomas sin silueta** no son siempre "fuera de cuadro": en tomas lejanas el creador es diminuto y no se detecta. Mira hojas de contacto (`ffmpeg … fps=1/1.2,tile`) antes de declarar un tramo como `PANTALLA`/`CENTRO`.
