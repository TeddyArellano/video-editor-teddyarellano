# `edicion/eventos.json`: esquema completo

Todos los campos son opcionales. Los tiempos son **anclas**:
- un número (segundos del corte);
- `"palabra"`, `"sec:palabra"` o `"sec:palabra#n"` (n-ésima aparición, desde 0);
- `{"palabra": "otra cosa", "sec": "radio", "n": 0, "offset": 0.1}`; la palabra puede ser una frase de varias palabras.

La comparación ignora mayúsculas, acentos y puntuación. `reel datos` valida todas las anclas y lista las que faltan. Para ver qué palabras hay en el corte, lee `edicion/verificacion.txt` (sale de `cortar --verificar`) o busca en `src/data.json → words`.

```jsonc
{
  // Corrige lo que Whisper escuchó mal. Se aplica palabra por palabra, conservando la puntuación.
  "fix": {"lab": "lap", "iGlobal": "e-global", "catorce": "14", "pendejo": "P***"},

  // ÉNFASIS: palabras que el narrador carga o que llevan el sentido de la frase. Salen SOLAS en el subtítulo, ~2× más grandes,
  // en color acento, caen con rebote y giro, con rayitas de acento estilo cómic. Opcional: un SFX pequeño (vol ~0.15).
  // Candidatas acústicas con `reel enfasis -p P`: elige ~1 cada 3–5 s, solo palabras con sentido (no artículos ni "y"/"tuve"),
  // y suma las clave del guion aunque se digan suave (nombre del evento, tema, remate). En IEEE ESCOM fueron 15 en 57 s.
  "enfasis": ["que:IEEE", "que:no#1", {"en": "ieee:grande", "sfx": "impact", "vol": 0.16}, {"en": "cierre:pronto", "sfx": "pop", "vol": 0.18}],

  // Palabras extra a pintar en color acento en los subtítulos (los objetos ya se resaltan solos).
  "resaltar": ["ESCOM", "Google", "30K"],

  // Una entrada por sección del plan (sec). Todo es opcional.
  "secciones": {
    "intro": {"zoom": 1.0, "caras": 1},
    "juan":  {"zoom": 1.12, "caras": 2, "color": "#2F80ED",
              "contador": {"label": "1ER SEM.", "color": "#2F80ED"}}   // muestra el contador OBJETOS en esta sección
  },
  // zoom: encuadre base de la sección (1.0 toma abierta · 1.12 pareja · 1.22 grupo · 1.4–1.5 una persona en promo · 1.05 entrevista cerrada)
  // caras: cuántas caras (las más grandes) centra la cámara (1 = presentador, 2 = entrevistador + entrevistado)
  // sujeto: "izquierda" | "derecha" | "centro" = quién enseña los objetos (lo usa  reel zooms  para elegir sus manos)

  // Gancho de los primeros segundos (sin subtítulos mientras dura).
  "gancho": {
    "top": 820,          // y del bloque (entre 300 y 1000; que no tape la cara)
    "dur": 4.3,          // opcional: por defecto dura lo que la 1ra sección (si hay varias) o 3 s
    "detras": false,     // true: la persona tapa el texto (antes corre  reel recorte -p P --frames 120);
                         //   en cada elemento, "delante": true lo deja ENCIMA de la persona (para que se lea)
    "decoracion": null,  // "gamer": esquinas HUD + △○✕□ flotando durante el gancho (promos de esports)
    "elementos": [
      {"tipo": "texto", "texto": "¿Qué lleva en su", "fuente": "Permanent Marker", "size": 64, "color": "#fff",
       "contorno": 10, "rot": -3, "anim": "slide", "at": 2, "sombra": false, "align": "center", "peso": 400, "italic": false, "mt": 0},
      // anim: pop | slide | rise | letras (cada letra sube) · at: cuadro de entrada (o "en": ancla, para que entre cuando se dice)
      // el tamaño se reduce solo si la línea no cabe en el ancho seguro
      {"tipo": "stickers", "items": [{"texto": "1ER SEMESTRE", "bg": "#2F80ED"}, {"texto": "9NO SEMESTRE", "bg": "#EB5757"}], "vs": "VS", "at": 18, "size": 44},
      {"tipo": "nota", "texto": "estudiantes de Ing. en Sistemas", "at": 40},           // post-it amarillo
      {"tipo": "pildora", "texto": "FERIA DEL EMPLEO 2026", "bg": "#FFE81A", "color": "#111"},
      {"tipo": "imagen", "src": "logo.png", "ancho": 420}                                  // archivo en public/
    ],
    "sfx": [{"f": 18, "sfx": "pop", "vol": 0.35}]   // SFX del gancho por cuadro (no en el cuadro 0)
  },

  // Etiqueta de nombre, arriba a la derecha.
  "nombres": [{"en": "juan:Juan", "dur": 3, "nombre": "JUAN", "sub": "1ER SEMESTRE", "color": "#2F80ED"}],

  // Píldora centrada bajo los subtítulos (carrera, escuela, "EMPRESA 1 DE 5", dato).
  "etiquetas": [{"en": "p1:ESCOM", "dur": 3, "texto": "ING. EN SISTEMAS · ESCOM", "color": "#7B1E3C"}],

  // Monto (SFX cash automático). estilo.json → "monto": {"estilo": "golpe"} = cifra GRANDE verde con golpe 2.6→1, sacudida,
  // destello y ráfaga de billetes/monedas (Rocket Revolution; la favorita) · "pixel" = verde pixel con máquina de escribir (FEySS).
  // sub = sello amarillo debajo ("MXN", "ESTA TEMPORADA"). top/size/color opcionales. Súmale "coin" 0.3 en sfx con offset 0.05.
  "montos": [{"en": "p1:25", "dur": 2.6, "texto": "$25,000", "sub": "MXN"}, {"en": "p2:110", "dur": 2.6, "texto": "$110K - $130K", "sub": "MXN"}],

  // Sticker emoji en tarjeta blanca arriba al centro (entrevistas a estudiantes). texto opcional debajo.
  "emojis": [{"en": "p1:robótica", "dur": 2, "emoji": "🤖"}],

  // Hoja de calendario (promos): arriba, sin tapar la cara.
  "calendario": [{"en": "6", "hasta": "registrarte", "dia": "6", "mes": "OCTUBRE", "texto": "FECHA LÍMITE"}],

  // Contador: cada ancla suma 1 en el contador de su sección y resalta la palabra. SFX automático (estilo.sfx_auto.objeto).
  "objetos": ["juan:Luigi", "juan:mazapán", "juan:inhalador#2", "radio:audífonos"],

  // Zoom suave a manos/objeto. cx, cy = centro del objeto (0–1, sale de  reel cuadricula). z por defecto: estilo.camara.zoom_objeto.
  // Dura `dur` s desde el ancla (offset por defecto −0.15) o hasta otra ancla con `hasta`. Nunca cruza el final de la sección.
  "zooms": [{"en": "juan:Luigi", "dur": 1.8, "cx": 0.38, "cy": 0.54},
            {"en": "juan:lap", "hasta": "juan:Victus", "cx": 0.42, "cy": 0.5, "z": 1.45}],

  // SFX manuales: boom, coin, boing, tada, scratch, crickets, trombone, ding, ffwd, pop, whoosh, whoosh2, click, impact, riser, glitch, cash, beep
  "sfx": [{"en": "juan:aplastado", "offset": 0.15, "sfx": "boing", "vol": 0.4, "dur": 1.5}],

  // Transición tipo VS antes de una sección (barrido diagonal con los colores de ambas secciones).
  "transiciones": [{"antes_de": "radio", "texto": "9NO SEMESTRE", "color_a": "#2F80ED", "color_b": "#EB5757"}],

  // Logos (arriba/centro) o tarjeta QR (abajo; los subtítulos suben solos mientras se ve).
  // PERFILES DE INSTAGRAM: src "perfiles/<equipo>.jpg" (captura completa tal cual) → sale CENTRADA en x e y con pop simple y sin
  // subtítulos; usa "pos": "centro", "ancho": 880 y un "dur" que termine ANTES de la siguiente sección (calcúlalo con data.json → secs).
  "imagenes": [
    {"en": "p2:Google", "dur": 2.5, "src": "logos/google.png", "pos": "arriba", "ancho": 380, "tarjeta": true},
    {"en": "e1:registrarte", "dur": 6, "src": "qr/nestle.jpg", "pos": "abajo", "ancho": 500, "titulo": "NESTLÉ", "texto": "ESCANEA PARA POSTULARTE"}
  ],

  // B-roll silencioso a pantalla completa (solo si aporta: nunca encima del objeto del que hablan ni de 1 s).
  "broll": [{"en": 5.0, "dur": 3, "src": "broll/stand.mp4"}],

  // Censura: beep sobre la palabra (pon también "fix": {"palabra": "P***"}).
  "censura": [{"en": "juan:pendejo", "dur": 0.6}],

  // Intro espacial 3D sobre la intro del creador (sección antes de la pregunta). Ver SKILL.md §2a y ejemplos/rocket/.
  // en = anclas de [línea 1, línea 2, hud]; monedas = ancla donde salen las monedas 3D ($) por los lados. planeta/cohete/warp opcionales (true).
  "intro_espacio": {"sec": "teddy", "titulo": ["SEMANA MUNDIAL", "DEL ESPACIO"], "hud": "ROCKET REVOLUTION",
                    "en": ["teddy:Semana", "teddy:Espacio", "teddy:Vamos"], "monedas": "teddy:dinero"},
  // Con intro del creador SIN 3D: "gancho": {"tras_intro": true, ...} (el gancho empieza en la 2a sección y antes hay subtítulos).

  // Cierre opcional (solo entrevistas; el creador lo quitó en Rocket Revolution: no lo uses salvo que lo pida): último cuadro desenfocado + pregunta + CTA. Los videos de humor NO llevan cierre.
  "cierre": {"pregunta": "¿Y TÚ CUÁNTO ESPERAS GANAR?", "cta": "COMÉNTALO 👇", "dur": 2.3},

  // Música (solo promos): genera con  python scripts/synth_musica.py P/public/music.wav --dur <s>
  "musica": {"src": "music.wav", "vol": 0.12}
}
```

## Cortes de subtítulos
`"cortes": ["sec:palabra#n", …]`: esa palabra empieza un bloque de subtítulos nuevo (además de los cortes automáticos por puntuación, sección y tramo). Lo usa Reel Studio en el panel Subtítulos.

## Posición libre (Reel Studio)
`nombres`, `etiquetas`, `imagenes`, `montos`, `emojis`, `calendario` y los `elementos` del gancho aceptan además:
- `dx`, `dy`: desplazamiento en px sobre su posición normal (lienzo 1080×1920; `dy` positivo = hacia abajo).
- `escala`: 1 = tamaño normal.
- `rot`: grados. En los elementos del gancho `rot` ya existía (giro propio del elemento) y se respeta igual.

Sin estos campos todo se dibuja exactamente como antes. Los escribe Reel Studio al arrastrar un elemento en el lienzo; se pueden editar a mano. Mantén el elemento dentro de la zona segura (x 125–905, y 260–1500).

## Reglas automáticas de `reel datos`
- Nombres, etiquetas, imágenes, montos, emojis o calendario que empezarían durante el gancho se mueven a cuando termina (misma duración).
- Las imágenes `arriba` y los emojis se colocan debajo de lo que ocupe la esquina superior (contador, insignia x2, nombre) durante toda su duración.
- Con una tarjeta `abajo` (QR), los subtítulos suben arriba solos.
- Los subtítulos se parten en cada cambio de pieza del plan (`corte`), así no mezclan frases distintas.

## SFX automáticos (en `src/estilo.json → sfx_auto`)
- `objeto`: cada objeto del contador (humor: `ding` 0.32).
- `zoom`: entrada de cada zoom (`whoosh2` 0.16).
- `transicion`: barrido VS (`whoosh`).
- `aparece`: nombres, etiquetas, imágenes, emojis y calendario (`pop` en entrevistas).
- Los montos siempre suenan `cash`.
- La cámara rápida siempre suena `ffwd` al entrar y `pop` al salir.

## Archivos que usa la plantilla
- `public/cut.mp4` (de `reel cortar`).
- `public/sfx/*.wav`.
- `public/hookfg/*.png` (de `reel recorte`).
- Logos, QR, b-roll o música: cópialos a `public/` y referéncialos sin `public/`.
- Para un b-roll: si el clip es HDR, conviértelo primero (`~/.reels-toolkit/bin/hdr_a_sdr clip.MOV sdr.mp4`) y luego recórtalo:
  `ffmpeg -ss <inicio> -t <dur> -i sdr.mp4 -an -vf "fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:v libx264 -crf 17 P/public/broll/x.mp4`

## Qué genera `reel datos` → `src/data.json`
`n`, `words`, `intro3d` (`fin`, `t`, `monedas`, `capa`) (`text`, `start`, `end`, `sec`, `key`, `corte`), `montos`, `emojis`, `calendario`, `secs` (`id`, `a`, `b`, `zoom`, `color`, `contador`), `track` (`x[]`, `y[]` por cuadro), `fast`, `items`, `zooms`, `names`, `labels`, `images`, `broll`, `transitions`, `sfx`, `hook`, `hookEnd`, `hookfg`, `cierre` y `musica`. Todo está en cuadros, a 30 fps. Cada elemento de `names`, `labels`, `images`, `broll`, `montos`, `emojis` y `calendario` lleva `ev` (su índice en la lista de `eventos.json`) y, si los tiene, `dx`/`dy`/`escala`/`rot`. Los componentes en `src/components/` leen solo esto y `estilo.json`.
