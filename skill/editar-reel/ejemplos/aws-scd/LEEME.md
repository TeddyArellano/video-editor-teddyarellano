# Ejemplo validado: AWS Student Community Day CDMX 2026 — "Amazon llega a CDMX"

Promo de evento a cámara (una sola toma de 3:37 en 4K vertical → **42 s**). **Copia el estilo de un video de referencia** (`referencia.mp4`, que dio el creador) y no un preset de la skill. Se aprobó en la v10, tras 10 rondas (historial en "Lo que pidió" abajo).

## La lección principal
Cuando el creador da un **video de referencia**, ese video manda sobre los presets. La v1 usó el preset `unboxing` (subtítulos en MAYÚSCULAS, etiquetas, calendario) y el creador respondió: *"¿y qué referencia sacaste del video que te pasé? No vi que hayas implementado nada parecido"*.

Antes de escribir eventos, haz esto:
1. Extrae stills de la referencia cada ~0.5 s (y en cada corte) y **míralos**.
2. Haz una tabla "técnica de la referencia → cómo la implemento": gancho, subtítulos (caja, tamaño, altura, si van palabra por palabra o en bloque), cómo entran los logos, fotos, CTA y SFX.
3. Si la plantilla no lo tiene, **escribe componentes propios** del proyecto (`src/components/RefEstilo.tsx`) guiados por un JSON de tiempos (`src/ref.json`). No fuerces el estilo dentro de `eventos.json`.

## Qué se tomó de la referencia (y cómo se hizo)
| Técnica | Implementación |
|---|---|
| Gancho de **stickers** inclinados que entran palabra por palabra ("AMAZON" −11°, "LLEGA" +13°) + franja con la frase clave ("A CDMX", Bungee sobre franja naranja de la marca) + **logo con glitch** (logo AWS blanco, SFX `glitch`) | `GanchoRef`. Rápido: termina 12 cuadros después de la última palabra del gancho (`hookEnd`). |
| Subtítulos **en minúsculas**, frase completa de golpe (no palabra por palabra), Montserrat 800, 52 px, sombra suave, a la altura del pecho (top 1150) | `estilo.json → subtitulos` con `"mayus": false, "bloque": true` + `Captions.tsx` (modo bloque, rangos `ocultar`/`arriba` desde `ref.json → subs`). |
| Logos grandes arriba (~620–760 px de ancho), sin tarjeta | `LogosRef`. Deben **asomar por encima de la cabeza**, no taparla ni quedar tapados ("el logo queda tapado por la cabeza"). |
| Palabra gancho gigante ("GRATIS") | `GratisRef`: Bungee 150, degradado naranja de la marca, relieve, brillo, golpe de escala, destello y chispas. La v3 era "pixel con barrido" y la rechazó: "más grande y llamativo, como la referencia". |
| Elementos que **salen desde detrás de la persona** | `DetrasItems` + `PersonaDelante`: la persona recortada (`personmatte`) se dibuja encima. Los laterales salen en diagonal desde atrás de los hombros (135° a la izquierda, 45° a la derecha), con giro simétrico (±14–20°), pop/destello y SFX cada uno. |
| Foto del lugar a pantalla completa al nombrarlo | `FotoFullRef` (cuadrilatero.jpg, de "Centro…" a "mítico"). |
| CTA de comentario | `ComentarioRef`: caja de comentario tipo red social que **escribe "AMAZON" letra por letra** con teclado mecánico (`tecla1–4`, 2 golpes por letra, y `tecla_enter` + `pop` al enviar). Los subtítulos se ocultan mientras está. |
| QR de registro | `QRRef`: tarjeta blanca **arriba** (y 62, QR 286 px, título "REGÍSTRATE" en Bungee) que baja desde arriba cuando el creador señala hacia arriba, y **se va en "o comenta"**. Verificado con `qrscan` sobre un cuadro del video final. |

## Identidad de marca (kit PDF del evento)
- El creador mandó `SCD2026_elementos.pdf`. Se extrajeron los PNG transparentes (logo del evento, insignia, xolos, nube pixel, Ángel de la Independencia, pan de muerto, café, pin) a `public/scd/` y se usaron sus colores (naranja + navy) y su tipografía display (Bungee como la más parecida).
- **Usa los elementos de la marca como pegatinas temáticas** ligadas a lo que se dice: el Ángel con "Ciudad de México", la nube con "nube", los xolos con "Build Day / hackatón", el pan y el café con "4 de noviembre", y el logo IPN con "mítico Cuadrilátero".
- Logos oficiales: AWS (no Amazon) al final y en el glitch, LinkedIn con "fotos profesionales", IPN grande desde atrás.

## Archivos
- `plan.json`, `eventos.json` (sobre todo SFX; el resto vive en `ref.json`), `estilo.json`.
- `ref.py`: genera `src/ref.json` desde `src/data.json` (busca las palabras por sección). **Córrelo después de cada `reel datos`.** También calcula `fg`, los cuadros que necesitan recorte de persona.
- `RefEstilo.tsx`: GanchoRef, LogosRef, GratisRef, DetrasItems, PersonaDelante, Pegatinas, FotoFullRef, QRRef y ComentarioRef.
- `Reel.tsx`: el orden de capas. `DetrasItems` va **debajo** de `PersonaDelante`, y el resto encima.
- `Captions.tsx`: la plantilla + modo bloque + ocultar/subir por rangos.
- Los índices de `plan.json` son de esa transcripción: úsalos como modelo, no copies los números.

## Flujo que funcionó
1. `nuevo` → `inventario` → `sdr` → `transcribir --prompt "AWS, Amazon, IPN, Build Day, LinkedIn"` → `tomas` → `plan.json` → `edl` → `cortar --verificar`.
2. Copia `RefEstilo.tsx`, `Captions.tsx` y `Reel.tsx` de este ejemplo al proyecto, y adapta `ref.py` (palabras, imágenes, posiciones).
3. `datos` → `python3 edicion/ref.py .` → recortes de persona para `ref.json → fg`:
   ```bash
   # extrae solo los cuadros necesarios, por rangos contiguos (una expresión select con cientos de eq() revienta ffmpeg)
   ffmpeg -nostdin -v error -i public/cut.mp4 -vf "select='between(n\,A\,B)',scale=1080:1920" -vsync 0 -start_number A $S/%04d.png
   ~/.reels-toolkit/bin/personmatte $S public/fg 1080 1920
   ```
   Si cambia el corte, o los tiempos mueven `fg`, rehaz los recortes.
4. `revisar` con stills de cada elemento → `render --borrador` → cambios → `render --nota` → `extras` + `post.txt` (con el link de registro).

## Lo que pidió el creador, ronda por ronda (todo quedó aprobado en la v10)
- **v2:** quitar los textos tipo marcador. El logo de LinkedIn salía tarde: debe entrar **en la palabra** ("fotos profesionales").
- **v5:** GRATIS como en la referencia, logo IPN más grande, gancho **más rápido**, y glitch con SFX usando el logo de **AWS, no Amazon**.
- **v6:** se colaron "Tod" a los 27 s y un arranque fallido "el mít" a los 35 s (se arreglaron con `mas_final: -0.35` y partiendo la pieza). El IPN sale desde atrás de la persona y el logo final es AWS.
- **v7:** usar el kit de marca (logo, fuentes, identidad).
- **v8:** insignia más grande; GRATIS con fuente nueva, brillo y animación; imágenes laterales más cerca, detrás de la persona, a 45°/135° y con SFX; "A CDMX" más llamativo.
- **v9:** logos tapados por la cabeza (que asomen por arriba); el comentario "AMAZON" llamativo con sonido de teclado; QR y foto del lugar.
- **v10:** quitar el logo de arriba al final y poner ahí el QR (el creador señala hacia arriba); el QR se va en "o comenta"; sonido de **teclado escribiendo** (mecánico), no clics.

## Caption entregado
```
¡Amazon llega a CDMX! 🚀 Primera edición del AWS Student Community Day México: sesiones para empezar en la nube, Build Day, hackatón oficial de AWS, revisión de CV y más. 100% gratis.
📅 4 de noviembre · 📍 El Cuadrilátero, IPN
Regístrate en <link> o comenta "AMAZON" y te paso el link 👇
#AWS #AWSStudentCommunityDay #IPN #CDMX #Estudiantes #Cloud #Hackathon
```
