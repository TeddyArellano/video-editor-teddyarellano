# Historia del proyecto

Cronología de cómo se construyó el editor, video por video. Cada corrección del creador se convirtió en una regla de la skill. El material de estos videos vive fuera del repo (`~/Content Creator/Claude - Test/Interpolitecnicos Esports 2026/`); el código de cada uno está en `legacy/proyectos/`.

Periodo: finales de septiembre – 4 de octubre de 2026. Todo se hizo con Claude Code (Opus) usando Whisper (whisper.cpp), FFmpeg, Remotion y Apple Vision/AVFoundation vía Swift.

---

## 1. Promo Interpolitécnicos Esports 2026
**Material:** un clip a cámara (A001_09281601_C045.MOV), con cada frase repetida varias veces.
**Edición:**
- la mejor toma de cada frase;
- logo IPN × banner oficial y "TORNEO DE ESPORTS" con estética gamer;
- logos de juegos y calendario;
- QR de inscripción;
- música original sintetizada.

**Correcciones del creador → reglas:**
- "El audio suena tapado" → se quitó la cadena de filtros. **Audio original, solo ganancia.**
- Usar `logo.png` (banner oficial) y poner `qr.png` en pantalla cuando menciona la inscripción → **usar solo assets del creador.**
- Logo del IPN al inicio y algo alusivo a videojuegos.
- Recortar el tropiezo "no se pi… no te pierdas" → **quitar tropiezos.**
- Cambiar "torneo de videojuegos" por "torneo de **esports**".

## 2. FEySS: ¿Cuánto esperas ganar al egresar?
**Material:** entrevistas en la Feria del Empleo y Servicio Social (FEySS), con videos de referencia de estilo.
**Edición:**
- monto en pixel verde;
- stickers emoji;
- etiqueta de carrera/escuela;
- gancho escalonado.

**Correcciones → reglas:**
- El título del gancho debe ir **dentro de la zona segura**.
- **La pregunta solo se oye al inicio**, no en cada entrevista.

## 3. FEySS Día 2: ¿Qué carreras buscan las empresas?
**Material:** entrevistas a empresas, tomas del stand y fotos HEIC con QR de registro.
**Edición:**
- título "EMPRESA N DE M";
- 2 tomas de stand por empresa;
- tarjeta QR (verificada desde el video final);
- audio corrido, subtítulos simples y sin emojis.

**Corrección:** "es muy largo" → se dividió en **2 videos por área de carreras** (química/alimentos/industria y tecnología/sistemas/finanzas). Regla: **si pasa de ~2 min, dividir por tema.**

Después se pidió un `.md` con todo el contexto de cómo se edita, que dio origen a `docs/guia_historica_v1.md`.

## 4. FEySS: ¿Cuál es la empresa de tus sueños?
**Edición:** solo respuestas sobre la empresa soñada, logos de empresas (Wikimedia) al mencionarlas, sin silencios y en zona segura.

**Correcciones:**
- En 1:16 la persona no se veía bien → arreglar el encuadre.
- Poner abajo la **carrera** de cada persona (etiqueta).
- Dividir el video de 2 min en **2 de 1 min**.
- El video de Finanzas necesita **su propio gancho**.
- Bajar un poco el texto de las carreras.
- Cuando hay varias personas en cuadro, que suene un efecto.

## 5. Google Cloud Summit: unboxing
**Material:** un clip de 7 min de unboxing con el gancho repetido ~6 veces.

**Correcciones → reglas:**
- **"El audio se desfasa"**: la causa era codificar AAC por tramo y concatenar (~20 ms de retraso por corte). → **Corte maestro en PCM con muestras exactas y un solo AAC.**
- **"Zooms bugueados"**: un punch-in alternado en cada corte. → **Un encuadre por sección con easing; nada de golpes.**
- Quitar el final y terminar en "nos vemos a la próxima".
- Quitar la segunda toma de "hace poco fui al evento…".
- Quitar "sencilla y muy buena", "y justo me invitaron como creador de contenido", "yo lo usaría para guardar cables" y "ah no, es pan de muerto".
- Gancho **más grande y vistoso, con las letras apareciendo detrás de él** → recorte de persona con Apple Vision.
- Un whoosh en el cuadro 0 tapaba la palabra "Google" → **nunca SFX encima de la primera palabra.**

## 6. Qué lleva en su mochila (1er vs 9no semestre)
**Material:** intro con varias tomas, Juan (1er semestre) y Radio (9no semestre), estudiantes de Ing. en Sistemas.

**v1:** gancho tipo cuaderno con tipografías mezcladas, contador de objetos, transición VS, SFX de humor, b-roll de los objetos, congelado de "silencio incómodo" y marcador final.

**Correcciones v2:**
- Textos pegados a las orillas → **márgenes laterales 125/175**.
- Mover el contador un poco a la derecha (y conservarlo).
- Más corto: lo menos importante de Juan en **cámara rápida x2**, con el contador subiendo rápido.
- Quitar las tomas generales: tapaban el objeto ("por si está aburrida la clase") y había una de 1 s que se veía rara → **solo tomas de entrevista.**
- **Más efectos de sonido.**
- **Zoom pequeño a las manos** de quien enseña un objeto curioso.
- Quitar el "silencio incómodo".

**Correcciones v3:**
- "Mi piel se ve muy naranja": las fuentes eran **HDR (HLG)** y quedaron etiquetadas BT.2020; Chrome/Remotion las reinterpretaba, y además había +10 % de saturación. → **Conversión con el tone-mapping de Apple (AVFoundation), sin `eq`, etiquetado bt709.**
- Subtítulos un poco a la derecha: `AbsoluteFill` con `left` desplazaba la caja → **centrar en x = 540.**
- Quitar el marcador final.

**Corrección v4:** zoom también en "por si sale algo en los baños" y "por si sale otra cosa en los baños".

Nota posterior: `reel niveles` mostró que **Juan quedó 5.4 dB más bajo que Radio** en el video entregado (pendiente, ver roadmap).

## 7. De guía a skill
1. Se escribió `GUIA_EDICION_REELS.md` + `CLAUDE.md` en la carpeta de videos (hoy `docs/guia_historica_v1.md`).
2. La pregunta "¿cómo escalar esto?" llevó a una **skill global** `/editar-reel` (`~/.claude/skills/`). Incluye un CLI `reel`, una plantilla Remotion genérica configurada con JSON, estilos y un toolkit permanente en `~/.reels-toolkit`. El scratchpad temporal donde vivían el modelo y las herramientas se había borrado, y eso motivó esa decisión.
3. Primera validación: Mochila regenerado desde los clips crudos solo con la skill.

## 8. Mejoras de la skill (v2)
Hechas a partir de una lista de áreas de mejora:
- **Piezas faltantes:**
  - montos en pixel, emojis, calendario y decoración gamer;
  - `reel logos` (Wikidata P154), `reel qr` (HEIC → recorte verificado) y `reel broll`;
  - `reel dividir`.
- **Ayudas que sugieren:** `reel tomas` (repeticiones y logística), `reel zooms` (manos del sujeto) y `reel niveles` (LUFS por persona).
- **Robustez:** video horizontal (`recorte_x`), micrófono externo (`reel audio`, correlación) y HDR PQ.
- **Entregables:** `.srt` y portada (`reel extras`).
- **Flujo:**
  - borrador en ~40 s (proxy);
  - versiones y `cambios.md`;
  - kits de marca;
  - `reel actualizar`;
  - `reel prueba` (prueba de humo sintética);
  - página de revisión con notas por código de tiempo (artifact con `db`).

**Bugs encontrados al validar con material real** (todos corregidos):
- `atrim=end_sample` contaba muestras a la frecuencia de entrada → audio desincronizado con fuentes a 44.1/22 kHz.
- Whisper DTW marca tarde "Porque" y la primera palabra tras una pausa → inicios por energía y caminata de voz con umbral relativo al ruido.
- Whisper en bucle ("y para completar" ×30) → detección y reintento con `-mc 0`.
- Calendario sobre la cara, montos y ganchos largos fuera de pantalla, etiquetas encimadas con el gancho → acomodo automático.
- El recorte de persona incluía bolsas que tapaban el gancho → `"delante": true` por línea.

Resultados en [validacion.md](validacion.md).
