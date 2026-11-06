# Conferencia / el creador hablando al público (Notion Summit 2026, ESCOM IPN · nov. 2026)

**Receta por defecto** cuando el material sea una **conferencia, charla o el creador hablando al público** (clips de iPhone desde el público, sin micrófono aparte). Se sacaron 3 reels de ≥60 s + un video de highlights. Todo lo de abajo lo **aprobó el creador**; úsalo como punto de partida sin volver a preguntar cada detalle.

## Flujo que funcionó
1. `nuevo` (estilo `unboxing`) → `inventario` → `sdr` → `transcribir --prompt "Notion, ESCOM, …"`. Whisper se confunde en conferencia (oyó "Ocean Summit", "no ocurre de" en vez de "no curé mi"): corrige con `fix` y revisa el texto de verificación de `cortar`.
2. **Primero propón 3 temas de reel** leyendo las transcripciones (el creador elige). Cada reel dura **≥ 60 s** (lo pidió explícito: "mínimo 60 segundos"; si falta, súmale material de partes sin usar de los clips largos).
3. **Antes de armar, escribe el arco del texto.** Un reel que es una lista de temas sueltos se rechazó ("no tiene un sentido claro"). Arco que sí gustó: **afirmación/gancho → por qué (el problema) → qué hay que organizar → ejemplo propio → cierre con contraste** ("y antes tenía mil cosas"). Revisa de verdad lo que dice y reordena por sentido, no por orden de grabación. Usa `quitar` para muletillas y tropiezos.
4. Entrega **primero la preview 720p** (`ffmpeg scale=720:1280`, crf 23), itera con el creador y **solo con su visto bueno** renderiza `--4k` + extras (SRT, portada `--frame 70`, `post.txt` con 3 captions + hashtags; el 1.º caption termina con "Sígueme @usuario").
5. Al cierre, el creador puede pedir limpiar la carpeta: deja solo los videos finales (y lo que él nombre). Avisa antes qué reel está en 1080 y cuál en 4K.

## Estilo aprobado (mismo en los 3 reels)
- **Subtítulos simples**: Montserrat 700, 46 px, **minúsculas**, blancos con contorno 5, 1–3 palabras (`maxPalabras 3`, `maxChars 20`), **arriba de la cabeza siguiéndolo** (`sobreCabeza()` en `Captions.tsx`, dentro de la zona segura). Se ocultan durante el gancho + 8 cuadros. Sin énfasis ni adornos.
- **Gancho "caída"** (Archivo Black, blanco + una fila en amarillo #FFD60A), 3 filas arriba de la cabeza (`GanchoOpciones.tsx`, variante `a`, top 262, tamaño `min(84, 720/(chars·0.8))`). La frase sale de lo que dice el creador al inicio. Nada de letras gigantes, glitches ni emojis. Si nombras una herramienta, **su PNG oficial** entra con la palabra: el logo de Notion **centrado, a la altura del pecho, 210 px**, con rebote, dentro del gancho (no más tarde en el video; no a un lado).
- **Encuadre fijo con zoom automático** (`edicion/seguimiento.py`, corre tras `datos`; `--nuevo` la primera vez): sigue la silueta (`personmatte`) y calcula `data.zt` para que él mida siempre lo mismo en pantalla (cara ≈ 0.111 de la altura, `ZMAX 3.0`; más de 3× el corte se ve blando → ofrecer 4K desde el original en tomas lejanas). Tomas diminutas sin detección: `MANUAL` por clip.
- **Cuando NO sale en cuadro** (señala la pantalla o la cámara gira al público), nunca dejes el zoom sobre una pared vacía: `PANTALLA = [(t0,t1)…]` centra la cámara en la pantalla de la presentación (mancha brillante) y `CENTRO = [(t0,t1)…]` deja plano completo sin zoom si solo hay público. Se detectan mirando hojas de contacto y las corridas sin silueta; llenan `data.pantalla` (lo usan `Camera.tsx` y `Captions.tsx`, que baja los subtítulos fijos abajo). **Solo cuando sale en cuadro lo mantiene centrado.**
- **CTA final** (`CtaFollow.tsx` + `eventos.json → "cierre": {"pregunta":"@usuario","cta":"SÍGUEME","dur":2.0}` + cambios en `Reel.tsx`/`Camera.tsx`): los **últimos ~4 s** el video se desenfoca y oscurece, +2 s de último cuadro congelado (silencioso), su **foto en círculo con aro amarillo** (recorte **amplio**, no apretado a la cara; `assets/teddy_cta.jpg`), `@teddyarellano` y un botón "SÍGUEME" que se presiona y pasa a "SIGUIENDO". SFX bajitos: pop, whoosh2, click, ding. El aviso de "silencio" del render en esos 2 s finales es esperado.
- Sin música; audio original sin filtros; −12.3 LUFS automático.

## Highlights de la conferencia (cuando pida "un video con lo más importante, sin edición")
Unir clips **sin recodificar**: `ffmpeg -f concat -safe 0 -i lista.txt -map 0:v:0 -map 0:a:0 -c copy -movflags +faststart salida.mp4`, en **orden de `creation_time`** (no por nombre), omitiendo logística/fragmentos (pases de slide, "¿ya?", preguntas sueltas). Verifica con `ffprobe` (duración = suma) y `ffmpeg -v error -i salida -f null -`. Los iPhone mezclan 30 y 29.97 fps: el copy lo tolera.

## Entorno
Si `npx` falla con `dyld: Library not loaded … libsimdjson`, el node@22 de Homebrew quedó roto tras un `brew upgrade`: usa otro (`/opt/homebrew/Cellar/node/<versión>/bin` al inicio del `PATH`) en vez de reinstalar. Los stills de revisión: `npx remotion still … --props='{"proxy":false,"gancho":"a"}'` (sin `cut_proxy.mp4` el `proxy:true` falla).

## Archivos
`componentes/` (Camera, Captions, CtaFollow, GanchoOpciones), `Reel.tsx`, `theme.ts`, `estilo.json`, `seguimiento.py`, `plan.json` y `eventos.json` del reel 3 (con el arco final), `assets/teddy_cta.jpg`. Para un proyecto nuevo cópialos encima de lo que genera `nuevo`, cambia las filas del gancho, `PANTALLA`/`CENTRO`, el plan y el usuario del CTA.
