# Ejemplo validado: review de gadget tech (HAYLOU · oct. 2026)

Dos reviews a cámara de productos HAYLOU, hechos uno tras otro con el mismo sistema:
- **HAYLOU Solar Lite 2** (smartwatch, 42.8 s) → `solar-lite-2/` (`tech.py`, `frases_multi.json`, `estilo.json`, `reloj_track.json`)
- **HAYLOU Flowbuds N55** (audífonos, 55.3 s) → los archivos de esta carpeta (la versión más nueva y completa de todo)

Cuando el creador diga "haz el mismo estilo que el de HAYLOU / el review del reloj / de los audífonos", **parte de esta carpeta**.
Estilo base: `unboxing` (proyecto.json → `"estilo": "unboxing"`), con componentes propios en `src/components/` y `edicion/`.

## Gustos del creador para reviews de gadget (lo que aprobó y lo que rechazó)

**Estructura del video**
- Gancho con una idea sensorial/visual del producto (Flowbuds: "Así suena mi día normalmente… y así suena con estos puestos"; Solar: batería que dura una semana). Luego diseño → uso diario → funciones (una ficha por función) → batería → veredicto → CTA.
- CTA siempre: "link en mi bio" + "comenta PALABRA y te mando el link por mensaje" (la palabra es el nombre corto del producto: RELOJ, FLOW).
- Muchas tomas de apoyo del producto (estuche, caja, detalles, al sol), ~1.5–3.5 s cada una, con entradas variadas (`in`, `out`, `whip`, `whipL`, `pop`).

**Subtítulos** (él elige entre 3 propuestas; quiere propuestas realmente distintas, no 3 parecidas)
- **Sin palabras resaltadas ni énfasis**: todas iguales, ninguna más grande o ladeada ("que todos los subtítulos sean iguales").
- Solar Lite 2: Poppins 800 MAYÚSCULAS con contorno. **Flowbuds (lo más reciente, el que más le gustó): Outfit 800, size 80, minúsculas, sin contorno, sombra suave, animación `barrido`** (`estilo.json → subtitulos`).

**Textos de arriba (fichas, checklist, modos, título)**
- Eligió el **HUD "C" línea minimalista**: etiqueta en Space Grotesk espaciada + valor en Unbounded 900 que se enfoca letra por letra (blur → nítido) + línea amarilla `#FFD60A` que crece. Es `tech.json → hud: 'C'` en `Tech.tsx` (las variantes base/A/B/D/E/F siguen ahí para proponer).
- **Rechazó**: la batería animada "días sin cargar" y la barra de capítulos/momentos del video. No las pongas.
- Etiquetas cortas y directas ("USO DIARIO", no "LOS USO DIARIO"). Nada de textos de relleno ("Y LA TUYA PERSONALIZADA" → quitado).

**CTA final** (le gusta escoger entre varias; `CtaVariantes.tsx`)
- Solar Lite 2: link "caída" (A) + comentario gigante (C).
- **Flowbuds: opción E "serif elegante"** — "link en mi" en Outfit + "*bio*" en Instrument Serif itálica amarilla que se escribe; "comenta" + "*Flow*" itálica enorme que se escribe de izquierda a derecha con trazo blanco debajo y "y te mando el link por mensaje". (`tech.json → cta2: 'E'`)
- Otras propuestas listas en el mismo archivo: D línea (igual que el HUD C), F espejo/cromo con giro 3D, G mensaje (comentario que se escribe + notificación de DM).

**Cámara y zooms**
- Zoom **pequeño y suave** al objeto (≈ ×1.2), nunca paneos bruscos. Si hay zoom al producto al inicio, que **empiece antes** para que llegue a tiempo con el efecto.
- Gancho con **zoom in progresivo lento** de principio a fin (`zooms` con `lento: true`, z ≈ 1.32).
- Destello en el contorno del producto cuando lo nombra ("este reloj"): anillo blanco que sigue al objeto (`Destello` en `Tech.tsx`, seguimiento por cuadro en `reloj_track.json` = [cuadro, x, y] normalizados) + SFX `destello`.

**Sonido**
- SFX por palabra/referencia para dar dinamismo (riser antes de una ficha, destello en "Hi-Res"/"al sol", tic-tac en horas, ffwd en contadores, click al cambiar de modo, shutter en QR), **bajitos y un poco antes o después de la palabra**, nunca encima.
- **Rechazó** como "feos": tadá en frases personales ("la mía") y cash/coin al hablar de precio. En reviews nada de SFX de dinero.
- Gancho de audífonos (Flowbuds, lo que más le gustó): ruido de calle sintético **continuo** desde el cuadro 0 (tráfico, moto, claxon, frenos, gente, sirena lejana; `synth_ciudad.py`) + cámara que vibra un poco con el ruido; al ponerse los audífonos el ruido **se cierra** (barrido de filtro 8 kHz → 60 Hz en 0.5 s) y queda **~1 s de silencio total** con la toma de él con los audífonos puestos, sin subtítulo. El volumen del ruido lo pidió bajar dos veces: **0.2** es el bueno (su voz no se debe perder).

**Cortes**
- Revisa finales de palabra: dos veces se comió la última sílaba ("y lis…", "escuel…"). Cuando una palabra tiene una micro pausa interna (la "-la" de escuela después de la oclusiva), Whisper la marca como segmento aparte: alarga `b` de la frase hasta el final real de la voz (mide RMS) + `mas_final`.
- Arranques muy de golpe ("aquí me llegan todas mis notificaciones"): `mas_inicio` pequeño.
- Repeticiones que se cuelan ("aunque, aunque los traiga…"): pasa cuando `reel edl` busca el inicio de voz hacia atrás y atrapa una toma fallida pegada. Se arregla con **`mas_inicio` negativo** (p. ej. −0.42) para empezar después de la toma mala.

**Entrega**
- El final es **4K real** (2160×3840) además del 1080 para Instagram; él lo espera sin pedirlo ("¿el final no debe ser 4K?").

## Flujo de trabajo (orden real)

1. `reel inventario/transcribir` como siempre; segmentos por clip (`segmentos.txt`). Las frases elegidas van en **`edicion/frases_multi.json`**: `[sec, clip, a, b, texto, {mas_inicio/mas_final}]` (varios clips de voz: C063 gancho/diseño/uso, C064 ruido/sonido/comodidad…).
2. `python3 edicion/frases_plan.py` → palabras por clip + `plan.json` → `reel edl` → `reel cortar`.
3. **Si hay pausa intencional** (regla 2 tiene esta excepción): `reel cortar` siempre quita silencios, así que después corre `~/.reels-toolkit/venv/bin/python edicion/pausa.py` (alarga la pieza a mano y rearma `cut.mp4` con `reel.build_master`), luego `synth_ciudad.py` (lee los tiempos de `edl_final.json` → `edicion/gancho_tiempos.json`).
4. `zsh edicion/rehacer.sh` = `reel datos` → Whisper del corte → `sync.py` (alinea palabras con difflib) → `tech.py` (tomas de apoyo, fichas, checklists, modos, chispas, título, CTA, SFX, zoom lento, `silencio`/`temblor`).
   - `tech.py` ancla todo a palabras: `w('espejo')`, `w('asi', 2)` (3a aparición), `S['diseno']['b']`.
   - Alrededor de la pausa Whisper del corte se desfasa: `tech.py` fija "y", "puestos" y la palabra siguiente con los límites de `edl_final`.
5. Propuestas: renderiza solo el tramo con `--props='{"cta2":"E","etiqueta":"OPCIÓN E"}'` (o `hud`, etc.) y concatena en `Propuestas … (D-E-F-G).mp4`. **Bundlea una sola vez** (`npx remotion bundle … --out-dir`) y renderiza stills/tramos desde ese bundle; varios `remotion still` en paralelo sin bundle tardan muchísimo y chocan en la caché de webpack.
6. `reel render -p .` (1080) → **4K**: `python3 edicion/k4.py` (piezas 2160×3840 desde los .MOV originales con los mismos in/out/frames de `edl_final`, caché por pieza, audio de `cut.mp4`) → cambia `public/cut.mp4` por `cut4k.mp4` y `public/broll` por `broll4k` → `reel render -p . --4k` → restaura `cut.mp4` 1440 (`edicion/k4/cut1440.mp4`) y `broll` 1080.
   - Verifica que coincidan cuadro a cuadro: mismo número de cuadros y PSNR > 40 dB contra el corte 1440.
   - `--4k` ya escribe su propio archivo "NOMBRE 4K.mp4". **Nunca renombres salidas** a mano: una vez se sobrescribió el 4K con el 1080.
7. `reel extras -p .` (srt + portada) y `post.txt` con 3 opciones de caption + hashtags.

## Archivos
- `tech.py`: todo el contenido anclado a palabras + SFX. `Tech.tsx`: tomas de apoyo, fichas, checklists, modos (switch cancelación/transparencia), chispas, título caída, destello, variantes de HUD (base/A–F) y CTA A/B/C. `CtaVariantes.tsx`: CTA D/E/F/G.
- `Camera.tsx`: zoom `lento`, `temblor` (vibración con zoom extra para no ver bordes) y `volCut` (silencia el audio de la toma durante `data.silencio`). `Captions.tsx`: animaciones pop/rebote/barrido/enfoque y corte del subtítulo al entrar al silencio.
- `synth_ciudad.py` (ruido de calle continuo + cierre + `anc.wav`), `pausa.py`, `k4.py`, `frases_plan.py`, `sync.py`, `rehacer.sh`, `estilo.json`, `theme.ts` (fuentes: Outfit, Archivo Black, Instrument Serif Italic, Space Grotesk, Unbounded).
- SFX extra: `destello.wav` (ya está en `plantilla_remotion/public/sfx/`).
