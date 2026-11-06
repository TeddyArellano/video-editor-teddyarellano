# Criterio editorial: cómo decide un buen editor (aprendido de las correcciones del creador)

## El creador
Teddy Arellano hace contenido vertical para el IPN/FEySS, eventos y marcas: entrevistas en ferias, promos, unboxings y videos de humor con estudiantes. Quiere videos **cortos, limpios y divertidos sin ser recargados**, y que el editor **lo haga todo solo** y entregue el resultado.

## Selección de material
- **Tomas repetidas** (el creador repite la frase hasta que sale): compara todas las versiones en la transcripción y elige la más fluida, sin tropiezos y con buena energía, normalmente la última completa. En el gancho esto es crítico: es lo primero que se ve.
- **Arranques en falso** dentro de una respuesta ("Segundo y primero, ah no, espérate, otra vez…"): no los uses. Busca la repetición limpia más adelante.
- **Fuera:**
  - las preguntas de logística ("¿ya?", "¿sigue grabando?", "¿sí puedo decir marcas?");
  - las risas largas y los "sí, sí, sí";
  - las repeticiones de información, las muletillas ("o sea", "este") y los cierres en falso;
  - la plática después de terminar (en Mochila, todo lo que dice Radio después de "Y ya es todo").
- **Entrevistas en serie:** la pregunta se oye **solo en la primera persona**; las demás empiezan directo en la respuesta. Por persona: respuesta → por qué → carrera/escuela, unos 20–25 s.
- **Empresas:** qué hace la empresa (1 frase) → qué carreras buscan → prácticas/becas solo si es corto. Se quitan las preguntas del entrevistador, salvo la primera del video.
- **Humor / objetos:** quédate con cada objeto nombrado y con los comentarios graciosos ("un mazapán bien aplastado", "la pobrecísima que media escuela tiene", "por si sale algo en los baños"). Lo que es pura lista va en **x2**: el contador sube rápido y eso también es gracioso.

- **Volumen entre personas:** corre `reel niveles`. En Mochila, Juan quedó 5.4 dB más bajo que Radio; `--aplicar` lo empareja solo con ganancia.
- **Las ayudas sugieren, no deciden:** `reel tomas` agrupa las repeticiones y marca una toma sugerida. Si el creador repite la frase sin pausa, varias tomas quedan juntas en un mismo enunciado: lee el texto y elige tú.

## Ritmo
- **Sin silencios:** los cortes van de palabra a palabra. `reel cortar` deja 0.12 s de aire en cada pausa removida.
- **Duración:**
  - humor ≈ 60–80 s;
  - entrevista ≈ 20–25 s por persona;
  - unboxing ≈ 45–70 s.
  - Si una compilación pasa de ~1:30–2:00, **sugiere** dividirla en 2 videos por tema (no es automático ni aplica a todos los videos), **cada uno con su gancho propio**. En el 2.º video también va la etiqueta del área (por ejemplo "Finanzas, gobierno y más").
- **Cámara rápida x2:** úsala en tramos de lista o relleno, nunca en el gancho ni en el remate.

## Encuadre y zooms
- Un encuadre por sección, siguiendo las caras, con un acercamiento lento (+4 %) y cambios con easing de 15 cuadros.
- **Nada de punch-in alternado en cada corte:** el creador lo describió como "golpes" y "bugueado".
- Haz un **zoom pequeño a las manos u objeto** cuando enseñan algo curioso: ×1.5 durante ~1.5–1.8 s, con el objeto un poco arriba del centro para que no lo tapen los subtítulos. **Centra mirando la cuadrícula** (`reel cuadricula`); la detección de manos (`hands`) solo sirve como pista.
- Si el objeto se enseña antes de nombrarlo (la laptop: "la lap… una Victus"), el zoom va desde que lo enseña (`en` + `hasta`).
- Si el creador pide un zoom concreto ("cuando dice X hazle zoom"), aplica el mismo tratamiento que a los demás objetos.

## Texto en pantalla
- **Gancho:** grande, vistoso, con tipografías mezcladas y animación por línea; dura lo que la intro.
  - Ejemplos: "¿Qué lleva en su MOCHILA? 1ER SEMESTRE VS 9NO SEMESTRE", "¿CUÁNTO ESPERAS GANAR AL EGRESAR?", "Google CLOUD SUMMIT" (letras detrás de la persona).
  - Al creador le gustó que el gancho fuera **más grande y vistoso** y que las letras salieran **detrás** de él.
- **Subtítulos:** simples, 1–3 palabras, centrados, en MAYÚSCULAS y con el objeto o palabra clave en el color acento.
- **Etiquetas** (nombre, carrera, empresa): discretas y breves (~3 s). La de carrera va un poco abajo de los subtítulos.
- **Todo dentro de la zona segura con márgenes amplios a los lados:** el creador notó textos "pegados a las esquinas" con 70/150 px.

## Sonido
- **Voz original** (sin filtros), siempre.
- **SFX:**
  - en entrevistas, sutiles (`pop` al aparecer etiquetas, `whoosh` al cambiar de persona, `cash` en montos);
  - en humor, juguetones y más seguidos (el creador pidió "más efectos de sonido"): `ding` por objeto, `boom` en el remate, `coin`/`boing`/`tada` según el chiste, `ffwd` en la cámara rápida;
  - nunca encima de la palabra que importa ni en el cuadro 0.
- **Música** solo en promos, y suave.

## Lo que se rechazó (no repetir)
| Se hizo | Reacción | Ahora |
|---|---|---|
| EQ/denoise/compresor en la voz | "suena tapado" | Audio original, solo ganancia |
| Encodear AAC por tramo | audio desfasado | PCM + un solo AAC (`reel cortar`) |
| Zoom alterno en cada corte | "golpes", "bugueado" | Un zoom por sección + zooms a objetos |
| Saturación extra / HDR mal convertido | "piel muy naranja" | `reel sdr`, sin `eq` |
| Márgenes 70/150 | "pegan mucho a las orillas" | 125/175 y centrado en 540 |
| Subtítulos con `left` en AbsoluteFill | "están a la derecha" | Centrados sin `left` |
| B-roll encima del objeto; toma de 1 s | "no dejas ver qué objeto es", "se ve raro" | Solo tomas de entrevista |
| Congelado "silencio incómodo" con grillos | "esa parte no" | Termina en la última frase |
| Marcador final 32 vs 6 | "quítalo" | Sin tarjetas al final en humor |
| Whoosh en el cuadro 0 | tapó la 1ra palabra | SFX después de la palabra |
| Pregunta repetida en cada entrevista | repetitivo | Solo en la primera |
| Gancho con máquina de escribir + contador lento (vlog) | "no me gustó para nada" | Tipografía cinética: palabras de golpe en 3 cuadros, letras enormes |
| Gancho que sigue animándose después de la frase | "tarda un poquito" | Cada palabra 3 cuadros antes de decirse; el gancho termina con la frase |
| B/N + glitch + rojo neón en el gancho | quitarlo | Zooms de cámara por frase; B/N solo como chiste puntual |
| Permanent Marker en el gancho; verde lima, lavanda, azul apagado | "no me gusta" | Estilo "limpio": blanco + amarillo #FFD60A, Anton + Montserrat |
| Píldoras redondeadas para resaltar textos | "usas mucho ese efecto" | Trazo de marcador con orillas de brocha |
| Logos/imágenes en tarjeta blanca con sombra | quitar | Imagen sola con entradas variadas (tarjeta solo para QR) |
| Fotos con marco blanco y destello | "satura mucho" | Fotos tal cual, zoom de entrada + obturador, < 1 s |
| Etiqueta "TEDDY ARELLANO · KEYNOTE SPEAKER" | quitarla | Sin etiqueta de nombre del creador |
| Bloque de 3 palabras mostrado de golpe; conectores solos ("EN", "DE") antes del énfasis | "se cortan o no van acorde con mi voz" | Palabra por palabra al decirse, sin conectores sueltos |
| Rayitas de cómic alrededor del énfasis | quitarlas | Solo la palabra, grande y en amarillo |
| −14 LUFS | "un poquito más de volumen" | −12 LUFS (nuevo valor por defecto) |
| (Rocket Revolution) Perfil de IG o subtítulo que sigue en pantalla cuando ya empezó la siguiente entrevista | "que cada persona tenga su tiempo" | Todo termina antes del fin de su sección (los subtítulos ya se cortan solos); si el perfil queda < 2 s, súmale audio de la persona (ej. cuando dice su @) o adelántalo |
| (Rocket Revolution) Cierre con último cuadro desenfocado + pregunta en pantalla | "quita ese fin" | Las entrevistas terminan con la última frase; no uses `cierre` salvo que lo pida |
| (Rocket Revolution) Capturas de IG recortadas y con entradas laterales/giradas | "están salidas del centro y raras" | Captura completa, centrada en x e y, pop simple, subtítulos ocultos mientras se ve |

## Lo que se aprobó
- (Vlog IEEE ESCOM) Destacar las palabras de énfasis de la narración: análisis de volumen y tono (`reel enfasis`) + criterio del guion. Salen solas, 2× más grandes, caen con rebote y rayitas de cómic, y algunas llevan un SFX pequeño.
- (Vlog IEEE ESCOM) El gancho cinético "limpio" con golpes de zoom, sacudida y confeti; el B/N cómico al desmentir algo; el globo terráqueo animado para "todo el mundo / universidades"; las capturas de perfiles de Instagram al nombrar a cada comunidad; las ráfagas de fotos de menos de 1 s; el sonido de tensión (reloj → succión → braam) en la cifra del gancho.
- El contador de objetos (se pidió conservarlo) y la cámara rápida con el contador subiendo rápido.
- Los zooms a las manos con objeto.
- El gancho vistoso con tipografías distintas y las letras detrás de la persona.
- Los SFX de humor.
- Los videos divididos por tema con su propio gancho.
- Los logos de empresas al decirlas y las etiquetas de carrera.
- Los QR legibles desde el video.
- (Rocket Revolution) Entrevistas ordenadas de menor a mayor monto; montos grandes en verde dinero con golpe, sacudida y ráfaga de billetes + cash/coin.
- (Rocket Revolution) Intro del creador antes de la pregunta, con zoom ×1.4 y seguimiento de cara, y una animación 3D (three.js vía @remotion/three: planeta, cohete con humo, estrellas, salto a hipervelocidad) en la franja de arriba; monedas 3D por los lados al decir "dinero". El creador pidió algo "mucho más complejo y mejor visualmente" que emojis animados.

## Entrevistas en evento con cifras (Rocket Revolution, oct. 2026)
- **Material típico:** 1 clip de entrevista por equipo, seguido de clips cortos de su proyecto (b-roll), todo en orden por número de IMG. Al final, capturas de los perfiles de IG en el mismo orden.
- **Gancho:** la pregunta del creador. Mide **todas** las tomas de la pregunta (LUFS + contraste p90−p10 de RMS) y usa la mejor. En 2 partes, una toma distinta en cada una.
- **Intro:** si hay un clip del creador a cámara presentando el evento, va antes de la pregunta, con zoom ×1.4 y seguimiento de cara. De cada frase usa la toma con mejor volumen y la completa.
- **Orden:** la primera entrevista lleva la cifra más alta del video. La primera versión iba de menor a mayor y al creador le gustó, pero luego pidió abrir con la más alta.
- **Por equipo (~10–13 s):** cifra, desglose corto (etiquetas "40K ESTRUCTURA · 30K MOTOR"), b-roll del stand de 2–3 s durante el desglose (nunca sobre la cifra) y nombre con el perfil de IG centrado.
- **Montos:** estilo `golpe` + cash + coin. Sobre la cifra más alta, también `impact`.
- **Duración:** en ESTE video pidió dividir el de 2:00 en 2 partes de mínimo 1 min cada una. **No es regla general:** la duración y si se divide dependen del video (sobre todo en entrevistas largas, y cuando él lo pide).
- **Lo que se aprobó:** la intro 3D (planeta, cohete, hipervelocidad); las monedas 3D al decir "dinero"; los montos golpe; los perfiles centrados; que cada persona tenga su tiempo.
- **Lo que se rechazó:** el cierre desenfocado con pregunta; las capturas de IG recortadas o entrando de lado; la animación 2D de emojis (pidió "algo más complejo"); el reflejo azul de los lentes; cualquier pérdida de color.

## Promo copiando un video de referencia (AWS Student Community Day, oct. 2026)
- **La referencia manda.** La v1 con el preset `unboxing` (MAYÚSCULAS, etiquetas, calendario) fue rechazada: "¿qué referencia sacaste del video que te pasé?". Lo aprobado replica lo concreto de la referencia: stickers, franja, glitch, subtítulos en minúsculas y en bloque, logos grandes y palabra gigante.
- **Rechazado:**
  - los textos tipo marcador;
  - el logo que entra después de la palabra;
  - "GRATIS" en pixel pequeño;
  - el logo de Amazon cuando el evento es de AWS;
  - un gancho lento;
  - logos tapados por la cabeza o tapándola;
  - pegatinas lejos de la persona o encima de ella;
  - el clic genérico para "escribir" (pidió teclado de verdad);
  - el QR y el comentario a la vez.
- **Aprobado:**
  - las imágenes del kit de marca saliendo **desde atrás** de la persona, en 45°/135°, con SFX;
  - la insignia y el IPN asomando sobre la cabeza;
  - la foto del lugar a pantalla completa;
  - el QR arriba cuando el creador señala hacia arriba;
  - la caja de comentario escribiendo la palabra clave con teclado mecánico;
  - el glitch del logo en el gancho (aquí sí, porque venía de la referencia).
- **Cortes:** en una sola toma larga hay falsos arranques pegados a la frase buena ("Tod…", "el mít… el mítico"). La verificación los delata: recorta con `mas_final` negativo o parte la pieza.
- **Post:** caption corto con el gancho, lo que incluye, fecha y lugar, el CTA doble (link o comentar la palabra clave) y hashtags.

## Entrega
- Video en la carpeta del material, con nombre descriptivo. Al lado queda el `proyecto_remotion/` editable.
- Un resumen corto de qué se hizo, con números: duración y qué se quitó o agregó.
- Si el creador pide correcciones, aplica **solo** eso y vuelve a verificar.

## Google Cloud Summit 2026 · Estudiantes (vlog, oct 2026)
- Gancho de título: rechazó letras gigantes, muchas escenas, 4 colores y destellos. Aprobó **"caída"** (`GanchoTitulo.tsx` del proyecto): palabras que caen de arriba al ritmo de la voz, rápido (spring stiffness 420), Archivo Black, solo blanco + amarillo, 2 bloques.
- **Sin emojis en pantalla** (💎 🎧 📋 se quitaron).
- CTA ("comenta X y te paso…") va **justo después del título**; cortarlo en una palabra completa, sin arranques de la siguiente.
- Fondo: preferir **tomas del creador a cámara** y cosas/stands de Google sin otras personas.
- Logos: el PNG oficial de cada herramienta cuando la nombra; si no existe oficial (LearnLM), logo de Google + nombre en texto.
- Proceso que funcionó para elegir un título: renderizar 3 avances de 9 s muy distintos (caída / marcador / revelado) y dejar que el creador elija. Eligió caída y pidió hacerla más rápida.
- Rechazado: etiquetas con trazo de marcador ("TU TUTOR PERSONAL"), ráfaga de fotos con obturador, trombón cómico tras "copiar y pegar" y teclazos sintéticos para "comenta…".
- Aprobado: `pop` en "aprender" + `impact`/`ding` en "destacar"; tecleo real durante "Comenta la palabra ESTUDIANTE".

## Reviews de gadget tech (HAYLOU Solar Lite 2 y Flowbuds N55, oct. 2026)
Detalle completo, código y flujo: `ejemplos/review-gadget/LEEME.md`.
- **Rechazado:** batería animada "días sin cargar"; barra de capítulos/momentos arriba; palabras resaltadas o de énfasis en los subtítulos ("que todos sean iguales"); zoom/paneo brusco al producto; textos de relleno arriba ("Y LA TUYA PERSONALIZADA"); SFX "feos" en frases personales (tadá) o al hablar de precio (cash/coin); ruido ambiente del gancho tan alto que tapa la voz (bajarlo hasta 0.2).
- **Aprobado:** subtítulos Outfit 800 minúsculas sin contorno con `barrido`; textos de arriba HUD "C" línea minimalista; CTA serif elegante (Instrument Serif itálica amarilla que se escribe); zoom pequeño (≈ ×1.2) que empieza antes y llega con el destello; destello en el contorno del producto al nombrarlo; SFX por palabra bajitos y desplazados; gancho de audífonos con ruido de calle continuo → cierre a silencio → ~1 s de pausa en silencio con la toma puesta; zoom lento progresivo en el gancho.
- **Cómo decide:** pide 3 propuestas de cada diseño (subtítulos, textos de arriba, CTA) en un video comparativo con etiqueta "OPCIÓN X"; si se parecen entre sí pide otras más distintas ("no importa que sean diferentes, pero que vayan bien con el video"). A veces combina (link de una + comentario de otra).
- **Entrega:** 1080 para Instagram + **4K real** regenerado desde los originales (no reescalado).

## Conferencia / hablando al público (Notion Summit 2026 · ESCOM, nov. 2026)
- Receta completa y aprobada: `ejemplos/conferencia-notion-summit/LEEME.md`. Aplícala por defecto a charlas y videos de él hablando al público.
- **Aprobado:** gancho "caída" blanco + amarillo con logo PNG centrado a la altura del pecho; subtítulos minúsculas simples sobre la cabeza; encuadre fijo (zoom automático); cámara a la pantalla/público cuando no sale en cuadro; CTA final (últimos ~4 s en blur, +2 s congelados, foto en círculo, @usuario, botón SÍGUEME→SIGUIENDO); ≥ 60 s; preview 720p antes del 4K.
- **Rechazado:** reel como lista de temas sin hilo (reordenar con arco: afirmación → problema → ejemplo → cierre); logo del gancho a un lado o en una palabra tardía; foto del CTA recortada muy apretada a la cara; zoom sobre pared vacía cuando no sale en cuadro.

## Anuncio a cámara con muchas retomas (Brigadas IPN Otoño 2026, nov. 2026)
La v1 fue rechazada: "de los videos más pésimos… muchas muletillas o errores no los cortas… frases repetidas… no me dejas terminar bien las frases".
- **Causa:** se armó el plan con la transcripción completa de Whisper. Con ruido de exterior Whisper fusionó 3–4 retomas en una frase, puso "¿Cómo puedes inscribirte? ¿Cómo…" dentro de un solo tramo y marcó mal los finales; `cortar --verificar` también alucinó (repetía o inventaba el inicio de la frase porque la transcribe con contexto).
- **Cómo se arregló (y cómo se hace siempre desde ahora):** segmentos de voz por energía con umbral según el ruido de cada clip → elegir la última toma completa → `oir.sh` en aislado para cada frase → `frases.json` + `frases_clips.py` → `revisar_frases.py` sobre el corte final (19/19 y 24/24 frases exactas).
- Ejemplos de retomas pegadas que hay que partir con la energía de 10 ms: "que ahí está todo… toda la información", "así que… así que aún estás", "nos vemos en… en las brigadas".
- **B-roll:** cortes de 2 s seguidos con fundido = "cambios bruscos, duran muy poco". Aprobado: 3 tomas largas (3–4 s) separadas por ≥ 4 s, de golpe, sin fundido.
- **Subtítulos:** el pop palabra por palabra + énfasis amarillos se rechazó en este formato ("te dije que eran sencillos"): bloque fijo blanco (`subtitulos.simple`).
- **QR:** se puso abajo y él señalaba arriba de su cabeza ("no sé por qué lo pones abajo"). Mirar hacia dónde señala.
- **Banner:** a 760 px se veía chico: "mucho más grande, no importa que agarre toda la pantalla" → `pos: "completa"`.
- **Gancho:** el logo IPN va arriba de la cabeza, no en la columna del texto. Para el título del gancho enséñale 3 tipografías (Anton / Lilita One / Montserrat Black itálica).
- **v3 (Reel 2):** las etiquetas con trazo de marcador se veían feas → se le mostraron 3 estilos (barra inferior / tarjeta con pin / marco HUD) y eligió **barra inferior**, sin subtítulos encima. El recorrido hasta la ventanilla y la entrega de documentos con el pulgar arriba se pidieron **completos en cámara rápida** (×8 y ×12, el pulgar a velocidad real), no como b-roll suelto.
- **v4 gancho:** eligió **Bowlby One** (opción 1 del video de opciones). En el Reel 1 pidió quitar el título del gancho ("BRIGADAS OTOÑO 2026") "para que no se sepa desde el inicio que es un video de brigadas, sino de servicio social en general": el gancho no revela el tema si la frase hablada es más amplia. El logo IPN (ancho 300) va **donde iba el texto** y el encuadre vuelve a ser cerrado, para no dejar espacio vacío arriba de la cabeza.
