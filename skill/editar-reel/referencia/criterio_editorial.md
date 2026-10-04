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
  - Si una compilación pasa de ~1:30–2:00, divídela en 2 videos por tema, **cada uno con su gancho propio**. En el 2.º video también va la etiqueta del área (por ejemplo "Finanzas, gobierno y más").
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

## Lo que se aprobó
- El contador de objetos (se pidió conservarlo) y la cámara rápida con el contador subiendo rápido.
- Los zooms a las manos con objeto.
- El gancho vistoso con tipografías distintas y las letras detrás de la persona.
- Los SFX de humor.
- Los videos divididos por tema con su propio gancho.
- Los logos de empresas al decirlas y las etiquetas de carrera.
- Los QR legibles desde el video.

## Entrega
- Video en la carpeta del material, con nombre descriptivo. Al lado queda el `proyecto_remotion/` editable.
- Un resumen corto de qué se hizo, con números: duración y qué se quitó o agregó.
- Si el creador pide correcciones, aplica **solo** eso y vuelve a verificar.
