# Ejemplo real: IEEE ESCOM Vlog (estilo `vlog`)

**Formato:** vlog con voz en off. El creador narra en un MP3 aparte (2:04, con varias tomas repetidas) sobre 18 clips del evento de reactivación de la rama estudiantil IEEE ESCOM-IPN. Él fue keynote speaker.

**Resultado:** 57.5 s, −12 LUFS. Aprobado después de 12 versiones; las correcciones del creador están resumidas abajo.

## Archivos
- `plan.json`: mejores tomas de la narración (solo `src: VOZ`). Para "y hoy por fin regresa a mi escuela" se usó la primera toma, que está limpia (77–89). La retoma tenía un tropiezo.
- `eventos.json`:
  - `gancho` con `dur: 5.3` y `elementos: []`; el gancho real está en vlog.json.
  - SFX de tensión: `tension_reloj`, `succion` y `braam`.
  - Logo de IEEE y las capturas de los perfiles de Instagram de @notionatipn, @wie.upiitaipn, @itiel_sanz (GitHub Campus Expert) y @ieee.escom, sin tarjeta.
  - Etiqueta con el título de la charla y ❌ "NO ES EL FORMATO DE CITAS".
- `vlog.json`:
  - montaje de 22 tomas y palabras extra;
  - gancho cinético "limpio" de 4 escenas: ESTA COMUNIDAD ESTUDIANTIL → ESTUVO INACTIVA POR… → 15 AÑOS → y por fin… ¡REACTIVADA! + IEEE ESCOM;
  - 4 ráfagas de fotos;
  - B/N cómico en "y no, no me refiero al formato de citas…";
  - globo en "la comunidad técnica más grande de todo el mundo… presencia en muchísimas universidades".

## Correcciones del creador (en orden)
1. Tartamudeo en una frase → usar la toma limpia.
2. Gancho "más llamativo, letras grandes, fuentes distintas" → el de máquina de escribir y contador **no le gustó para nada**. Funcionó la tipografía cinética rápida con golpes de zoom.
3. Imágenes sin sombra ni tarjeta y con entradas distintas; textos destacados **sin píldora redondeada** (se cambió a trazo de marcador).
4. Fotos del evento en ráfagas de menos de 1 s con obturador → después **sin marco blanco ni destello** ("satura mucho").
5. Quitar el B/N y el glitch del gancho. Paleta: probó neón, lavanda y cian/magenta, y eligió **"limpio"** (blanco + amarillo #FFD60A, Anton + Montserrat). Rechazó Permanent Marker.
6. Quitar la etiqueta "TEDDY ARELLANO · KEYNOTE SPEAKER".
7. B/N **sí**, pero como chiste puntual ("y no, no me refiero a tus citas…").
8. Subtítulos clave en amarillo, no en verde lima. Globo animado para "todo el mundo / universidades".
9. Sonido de tensión para "15 años".
10. Más volumen (−12 LUFS) y gancho al ritmo exacto de la voz (palabras 3 cuadros antes, termina con la frase).
11. Destacar las palabras de énfasis → `eventos.enfasis` con 15 palabras (acústica + guion), 6 con SFX pequeño (boing, impact, ding, whoosh2, pop, impact).
