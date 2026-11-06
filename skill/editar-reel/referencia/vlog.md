# Estilo `vlog`: narración en audio aparte + clips encima

Para videos donde el creador graba su **voz en off** (MP3/WAV) y aparte tiene **clips mudos o de ambiente** del evento o lugar.
La skill normal corta clips que ya traen voz. Aquí la narración es la única "fuente" de voz, y los clips se montan encima de cada frase.

Validado de punta a punta con **IEEE ESCOM Vlog** (oct 2026, 57.5 s, 18 clips + 11 fotos). Ejemplo real: `ejemplos/vlog/`.

## Flujo

```bash
REEL="$HOME/.reels-toolkit/venv/bin/python $HOME/.claude/skills/editar-reel/scripts/reel.py"
VLOG="$HOME/.reels-toolkit/venv/bin/python $HOME/.claude/skills/editar-reel/scripts/vlog.py"
```

| # | Comando | Qué hace / qué haces tú |
|---|---|---|
| 1 | `${=REEL} nuevo "<carpeta>" --estilo vlog --nombre "Título"` | Proyecto con la plantilla, que ya trae el gancho cinético, las fotos, el globo y el B/N. |
| 2 | `${=VLOG} preparar -p P --audio "<narración>.mp3"` | Crea `<carpeta>/VOZ.mov` (video negro + la narración) y `edicion/vlog.json`. |
| 3 | `${=REEL} inventario -p P` y `${=REEL} sdr -p P` | Revisa las hojas de contacto. Para ver mejor cada clip, saca cuadrículas de cuadros con su tiempo. |
| 4 | `${=REEL} transcribir -p P VOZ --prompt "Nombres"` y `tomas` | El creador repite frases: elige la **mejor toma** de cada una y quita los tropiezos ("y hoy por… y hoy por fin"). |
| 5 | `edicion/plan.json` (solo `"src": "VOZ"`), luego `edl`, `cortar --verificar` | Una sección por bloque narrativo (gancho, intro, …). Lee la verificación. |
| 6 | `edicion/vlog.json → "montaje"`, luego `${=VLOG} montaje -p P` | Qué clip va sobre cada frase. Resultado: `public/cut.mp4` = clips + voz. |
| 7 | `edicion/eventos.json`, luego `${=REEL} datos -p P` | `gancho: {"dur": <fin de la frase>, "elementos": []}`, imágenes (sin tarjeta), etiquetas, SFX. |
| 8 | `${=VLOG} datos -p P` | Resuelve `vlog.json` en `src/vlog.json`: gancho, fotos, B/N, globo y palabras extra. |
| 9 | `revisar`, luego `render` (−12 LUFS por defecto) y `extras` | Revisa los stills del gancho cuadro por cuadro. |

**Orden obligatorio:**
- Después de cada `reel cortar`: `vlog.py montaje` → `reel datos` → `vlog.py datos`.
- Después de cada `reel datos`: `vlog.py datos`.

`vlog.py montaje` necesita los SDR en la caché. Si se borraron (`reel limpiar`), corre `reel sdr` otra vez.

## `edicion/vlog.json`

Las anclas son como las de `eventos.json`: `"sec:palabra#n"`, con desplazamiento opcional (`"cierre:Sigan#1-0.05"`), o un número de segundos del corte.

```jsonc
{
  // 1) Qué clip va sobre cada frase: [clip, segundo de inicio DENTRO del clip, cuándo entra en el corte]
  //    "Pk+o" = inicio de la pieza k del corte (edl_final) + o segundos. Así sobrevive a re-cortes.
  //    Cada fila dura hasta la siguiente. Si el clip no alcanza, el comando avisa: empieza antes en el clip.
  "montaje": [["IMG_9664", 12.6, "P0"], ["IMG_9677", 4.4, "P1"], ["IMG_9656", 2.4, "P1+1.9"]],

  // 2) Palabras que Whisper no ubicó (retomas, finales de frase), en segundos de VOZ: se insertan en los subtítulos
  "palabras_extra": [{"texto": "mundo.", "t": 38.3, "fin": 38.55}],

  // 3) Gancho de tipografía cinética (ver abajo)
  "gancho": {
    "variante": "limpio",            // limpio (aprobado) | neon | electrico | calido
    "lead": 3,                        // cada palabra entra 3 cuadros ANTES de decirse (va al ritmo de la voz)
    "escenas": [                      // cada escena se reemplaza por la siguiente con un zoom que atraviesa el texto
      {"top": 930, "lineas": [
        {"t": "ESTA", "en": 0, "rol": "chico", "color": "key", "desde": "izq", "size": 130},
        {"t": "COMUNIDAD", "en": 0.1, "rol": "grande"},
        {"t": "ESTUDIANTIL", "en": "gancho:estudiantil", "rol": "acento", "color": "acc", "desde": "der", "rot": -5, "mt": -18}]}
    ],
    "zooms": [0, "gancho:estuvo", "gancho:15"],                    // golpes de cámara sobre el video
    "golpes": [{"en": "gancho:15", "flash": 0.55, "sacudida": 26}], // destello + sacudida en la palabra fuerte
    "particulas": "gancho:reactivando",                             // confeti
    "franja": {"t": "IEEE ESCOM", "en": "gancho:reactivando+0.17"}  // franja final con el nombre
  },

  // 4) Ráfagas de fotos: cada foto dura lo mismo dentro de la ráfaga (siempre < 1 s), tal cual, con obturador
  "fotos": [{"desde": "evento:Además-0.05", "hasta": "evento:con+0.15", "fotos": ["f06", "f09", "f14"]}],  // public/fotos/f06.jpg…

  // 5) Blanco y negro cómico puntual (p. ej. al desmentir: "y no, no me refiero a…")
  "bn": [{"desde": "que:y", "hasta": "ieee:IEEE"}],

  // 6) Globo terráqueo de puntos (frases de "todo el mundo", presencia global, universidades, países…)
  "globo": {"desde": "ieee:comunidad", "arcos": "ieee:mundo", "pines": "ieee:presencia", "birretes": "ieee:universidades",
            "hasta": "ieee:y#1", "origen": [-99.1, 19.4], "centro": -115}   // origen de los arcos = CDMX; centro = longitud inicial
}
```

### Gancho cinético: roles y colores
- **Roles** (tipografía de la variante):
  - `chico`: frases de apoyo (ESTA, ESTUVO, POR…).
  - `grande`: palabra principal en Anton, llena el ancho seguro.
  - `acento`: palabra que contrasta.
  - `script`: transición en minúsculas ("y por fin…").
  - `medio`: complemento (AÑOS).
  - `numero`: cifra gigante (720 px).
- **Colores:** `key` (principal de la variante), `acc` (secundario), `txt` (blanco) o un hex. **Sombras:** `sh`, `sh2`, `none` o un hex. `desde`: `grande` (escala), `izq`, `der` o `arriba`.
- **Tamaño:** se ajusta solo al ancho seguro. `size` lo fija; `mt` (margen superior negativo) junta las líneas, como el "AÑOS" debajo del "15".
- **Estructura que funcionó:** 3–4 escenas sincronizadas con la frase del gancho, máximo 3 líneas por escena, una palabra gigante por escena y un cierre con franja + confeti. El gancho termina cuando termina la frase (`eventos.gancho.dur`).
- **Sonido de tensión** (opcional, en `eventos.sfx`):
  - `tension_reloj` (tic-tac que se acelera), desde la frase previa al número;
  - `succion` (barrido en reversa), 0.55–0.65 s antes de la palabra fuerte;
  - `braam` (golpe de tráiler), en la palabra fuerte.
  - Remate: `riser` → `impact` + `ding`.

## Material extra que se integró
- **Fotos del evento** (`public/fotos/`): en ráfagas donde se habla del evento, del equipo o de la escuela, menos de 1 s cada una.
- **Capturas de perfiles de Instagram** (`public/perfiles/`): como imagen (`pos: centro`, `ancho: 860`, `tarjeta: false`), desde que se nombra a la comunidad hasta la siguiente (`en` + `hasta`). Las esquinas se redondean solas.
- **Logos oficiales** (`reel logos`): sin tarjeta, `pos: arriba`.

## Criterio de montaje (lo que funcionó)
- **Gancho:** debe salir **la cara del creador** (primer plano hablando). Busca la toma más cerrada en la que se le vea la cara.
- **Correspondencia:**
  - cada frase con la toma que la ilustra ("evento de reactivación" → diapositiva del evento; "speaker principal" → su diapositiva de keynote; "Notion" → la charla de Notion);
  - frases generales → público o planos abiertos;
  - final → aplausos.
- **Duración:** usa la mayoría de los clips; tomas de 1.3–4 s.
- **Clips horizontales:** `reel sdr` ya los recorta a vertical con `recorte_x`.

## Narración con retomas y trabas: corte por segmentos (Google Cloud Summit · Estudiantes, oct 2026)
Úsalo en lugar de los pasos 4–5 cuando el MP3 trae retomas, trabas o palabras repetidas (casi siempre):
```bash
VOZ="$HOME/.reels-toolkit/venv/bin/python $HOME/.claude/skills/editar-reel/scripts/voz.py"
${=VOZ} segmentos -p P          # VAD + whisper por segmento → edicion/segmentos.txt
# escribe edicion/frases.json: [["sec", inicio, fin, "texto exacto", {opcional mas_inicio/mas_final}], …] en orden narrativo
${=VOZ} plan -p P               # → VOZ.json + plan.json
${=REEL} edl -p P && ${=REEL} cortar -p P --verificar && ${=VOZ} revisar -p P
```
- Lee `segmentos.txt` con criterio:
  - un segmento muy corto para su texto es un arranque fallido;
  - "Gracias" o "Suscríbete" en un segmento corto es una alucinación;
  - si dos segmentos dicen lo mismo, es una retoma: usa la última completa;
  - si hay < 0.1 s entre dos segmentos, son la misma frase.
- Si `revisar` marca **CORTA EL FINAL** en una palabra larga, pártela en dos (`cut_words` limita a 1.2 s por palabra).
- Si una frase termina justo antes de otra palabra de la misma toma, verifica la energía cada 10 ms y corta en el silencio con `mas_final` negativo. Confírmalo con whisper sobre el **archivo final**.
- Si cambian las frases, cambian los índices `P<k>` del montaje: reajusta `vlog.json → montaje`.

## Material de un video ya editado (unboxing con subtítulos quemados)
`desub.py` borra los subtítulos por inpainting y escribe el tramo como un clip más en la caché global. Instrucciones y límites en la cabecera del script. Usa pocos tramos (el creador pidió menos unboxing) y descarta los que tengan etiquetas o nombres quemados arriba.

## Título del gancho "caída" y énfasis en caída
Componentes en `ejemplos/gcs-estudiantes/`. Si `src/titulo.json` existe, `Reel.tsx` usa `GanchoTitulo` en lugar del gancho cinético. Deja `vlog.json → gancho: null` para que no haya golpes ni destellos.
