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
