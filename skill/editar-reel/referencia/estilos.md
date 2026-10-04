# Estilos (presets) y diseño por tipo de video

Cada estilo = `estilos/<nombre>.json` (va a `P/src/estilo.json`) + `estilos/<nombre>.eventos.json` (ejemplo real, va a `P/edicion/eventos.ejemplo.json`).
Fuentes disponibles en la plantilla: **Lilita One, Permanent Marker, Bangers, Bungee, Montserrat (600–900 + itálica), Poppins, Anton, Silkscreen**.
Para agregar otra fuente: impórtala en `src/theme.ts → FONTS` del proyecto (o de la plantilla para que quede global).

## humor-comparacion: "Qué lleva en su mochila"
- **Fuentes:** Lilita One (subtítulos 80 px, nombres, stickers), Permanent Marker (frases a mano, nota), Bangers ("VS") y Bungee (números del contador).
- **Colores:** azul `#2F80ED` (persona A), rojo `#EB5757` (persona B), amarillo `#FFE14D` (objetos y palabras clave).
- **Gancho tipo cuaderno:** "¿Qué lleva en su" (marker 64, entra deslizando), "MOCHILA?" (Lilita 150 amarillo, pop), stickers "1ER SEMESTRE" VS "9NO SEMESTRE" y una nota "estudiantes de Ing. en Sistemas". SFX: pop, boom y pop.
- **Contador "OBJETOS N"** arriba a la izquierda, del color de cada persona. Se reinicia por sección y suena `ding` con cada objeto.
- **Etiqueta de nombre** arriba a la derecha al decir el nombre (3 s).
- **Transición VS** (22 cuadros) con `whoosh` al pasar a la persona B.
- **Cámara rápida x2** en lo menos importante, con insignia "▶▶ x2" debajo del contador.
- **Zoom ×1.5 a las manos** en los objetos curiosos, con `whoosh2` bajito.
- **SFX de chiste:** `coin` (peluche de Luigi), `boing` ("aplastado"), `tada` ("preparados"), `boom` (3er inhalador, laptop "Victus").
- **Sin b-roll, sin congelados y sin marcador final.** Termina en "Y ya es todo".

## entrevista: FEySS "¿Cuánto esperas ganar?" / "¿Empresa de tus sueños?"
- **Fuentes:** Montserrat 800 en subtítulos (74 px, contorno 11) y 900 itálica en ganchos. Montos con el componente `montos`: Silkscreen en pixel verde `#3CFF3C`, máquina de escribir, cursor y SFX cash.
- **Colores:** amarillo `#FFE81A` (palabras clave: montos, carreras, escuelas, empresas) y guinda `#7B1E3C` (píldoras).
- **Gancho:** la pregunta en 3–4 líneas escalonadas izquierda/derecha (`align`). Cada línea entra cuando se dice (`"en": "p1:cuánto"`). Abajo, píldoras con el área y el evento.
- **Encuadre:** una sección por persona. Pareja (entrevistador + entrevistado) con zoom 1.52; grupo con 1.22.
- **Etiqueta guinda** con la carrera/escuela debajo de los subtítulos, discreta.
- **Logos de empresas** (Wikimedia, recortando el margen transparente) en pos `arriba` al decir la empresa, con `pop`.
- **Cierre:** pregunta para comentarios y "COMÉNTALO 👇" (~2.3 s).
- Si hay varias personas en cuadro, un SFX suave al cambiar de persona.
- Stickers emoji con `emojis` (tarjeta blanca arriba al centro) en el video de estudiantes; en el de empresas, **no**.

## empresas-qr: FEySS Día 2 "¿Qué carreras buscan las empresas?"
- **Sin emojis ni imágenes decorativas.** Solo título de empresa, tomas del stand y QR.
- **Por empresa:**
  - etiqueta "EMPRESA N DE M · NOMBRE" (top 880);
  - 2 tomas de stand de 2–4 s (la primera ~2 s después de empezar la empresa, la segunda al ~45 % del bloque);
  - **tarjeta de registro los últimos ~6 s** (pos `abajo`, QR de ~500 px, acción en negro: "ESCANEA PARA POSTULARTE", "MANDA TU CV POR WHATSAPP"…).
- **QR:**
  - `qrscan` sobre la foto para saber a dónde lleva;
  - `qrbox` para recortarlo cuadrado con 32 % de margen y escalarlo a 900×900;
  - léelo otra vez **desde un cuadro del video final**.
- Si no hay QR (volante con correo), el dato va grande sobre amarillo.
- Si pasa de ~2 min, se divide en 2 videos por área de carreras, cada uno con su gancho.

## unboxing: "Google Cloud Summit"
- **Fuentes y colores:** Montserrat 900 + Poppins 800, colores de Google.
- **Gancho grande con letras que suben detrás de la persona:**
  - `"detras": true` + `reel recorte` (recortes de persona con Apple Vision para los primeros 120 cuadros);
  - las líneas usan `anim: letras`; la que deba leerse sin obstáculos va con `"delante": true`;
  - se elige la mejor de las varias tomas del gancho.
- **Etiqueta** "TEDDY ARELLANO · CREADOR DE CONTENIDO".
- Zooms suaves al producto y SFX sutiles. **No** pongas whoosh en el cuadro 0 (tapó la palabra "Google").
- Se quitaron tomas repetidas y frases de relleno ("sencilla y muy buena", "yo lo usaría para…"). Termina en la despedida ("nos vemos a la próxima").

## promo: "Interpolitécnicos Esports 2026"
- **Fuentes y colores:** Anton + Montserrat, guinda `#8C1D40`, dorado `#FFC83D`.
- **Gancho:** logo IPN × banner oficial (el que da el creador), "TORNEO DE ESPORTS" con control y "▶ PRESS START". Estética gamer con `"decoracion": "gamer"` en el gancho: esquinas HUD y símbolos △○✕□.
- Logos de juegos al nombrarlos (`reel logos`), `calendario` con la fecha y **QR de inscripción** (pos `abajo`) desde que se menciona hasta el final. Con `--marca interpolitecnicos` se agregan el logo y el QR.
- **Música original** (`synth_musica.py`) ~13 LU debajo de la voz, con drop y golpe final.
- Si el creador tropieza ("no se pi… no te pierdas"), se recorta y queda solo la versión limpia.

## Crear un estilo nuevo
1. Copia el estilo más parecido: `estilos/<nuevo>.json` y `estilos/<nuevo>.eventos.json`.
2. Ajusta los `colores` (acento = palabras clave; a/b = personas o secciones; pildora = etiquetas), los `subtitulos` (fuente, tamaño, top 1120–1190), la `camara` (empuje, zoom_objeto) y los `sfx_auto`.
3. Si necesita un elemento visual que no existe, créalo como componente en `plantilla_remotion/src/components/`, alimentado por un campo nuevo de `eventos.json` que `reel datos` pase tal cual (hazlo genérico, no para un solo video).
4. Agrégalo a la tabla de §3 de `SKILL.md`.
