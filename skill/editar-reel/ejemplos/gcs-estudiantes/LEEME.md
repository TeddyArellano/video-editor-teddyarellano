# Ejemplo real: Google Cloud Summit 2026 · Estudiantes (vlog con voz en off, oct 2026)

**Formato:** vlog educativo de "3 herramientas de Google para estudiar" (LearnLM, NotebookLM, Google Workspace). El creador narra en un MP3 aparte (2:38, con **muchas retomas y trabas**). Encima van clips del evento, su unboxing (un video ya editado, con subtítulos quemados) y tomas de él estudiando.

**Resultado:** 65.7 s, −12 LUFS. Se aprobó en la v5 y se entregó en 4K.

## Cómo se trabajó (replícalo en ese orden)
1. **`reel nuevo --estilo vlog` → `vlog.py preparar` → `inventario` → `sdr`.** Las hojas de contacto no bastan para ver los clips: se sacaron 8 cuadros por clip en cuadrícula con su tiempo.
2. **Narración por segmentos (`scripts/voz.py`)**, no con la transcripción de Whisper completa:
   - `voz.py segmentos` → leer `segmentos.txt` → escribir `frases.json` (aquí está el real) → `voz.py plan` → `reel edl` → `reel cortar --verificar` → `voz.py revisar`.
   - En la v2 se colaron, con el método normal, "que muchos / muchos", "Funciona? / Funciona como", "si te atoras en / si te atoras en…", "te lle… paso, paso, para porque…", "y no solamente te ha… / y no solamente te haga", "pero ahora / pero ahora con la IA", "ya conoces… ya conoces" y "pod… podcast". Además había finales de palabra cortados: "LearnLM", "conoces", "ahora".
   - "NotebookLM" como una sola palabra de 1.18 s se recortaba (`cut_words` limita a 1.2 s) → se partió en "Notebook" + "LM.".
   - Para el CTA se usó **una sola toma continua** (la última). Se cortó en el silencio de 30 ms entre "mensaje" y "para" (`mas_final: -0.165`), verificando con la energía cada 10 ms y con whisper sobre el archivo final.
3. **Orden:** título (gancho) → **CTA "Comenta la palabra ESTUDIANTE y te paso los links y guías por mensaje"** → problema → intro → #1 → #2 → #3 → "Nos vemos". El CTA va justo después del título (lo pidió el creador).
4. **Montaje (`vlog.json`):**
   - prioridad a **tomas del creador a cámara** (selfies del evento) y a cosas de Google (stands, letreros, pantallas) **sin otras personas**;
   - tomas rápidas de él estudiando (tablet, laptop, código) sobre "programación", "tarea", "PDFs" y "guías de estudio";
   - el unboxing **solo en el primer segundo** (pidió menos).
5. **Unboxing con subtítulos quemados:** `scripts/desub.py` (inpainting) por tramos, escritos en la caché global como clips `UB1…UB7`. El tramo de la bolsa blanca no se pudo limpiar y se descartó.
6. **Gráficos propios del proyecto** (copiar a `P/src/components/` y conectar como en `Reel.tsx`):
   - `GanchoTitulo.tsx` + `titulo.py`: título del gancho. Hay 3 variantes; se le enseñaron al creador como **avances de 9 s** (`npx remotion render … --frames=0-269 --scale=0.6667`) y eligió **`caida`**: palabras que caen de arriba al ritmo de la voz, rápido (spring stiffness 420, damping 13, mass 0.5, caída de 300 px), Archivo Black, **solo blanco + amarillo**, 2 bloques, y al final el bloque se cae fuera de cuadro. Rechazadas: `marcador` (párrafo con trazo de marcador) y `revelado` (serif + máscara).
   - `Captions.tsx`: las palabras de `enfasis` usan **el mismo efecto "caída"** (Archivo Black amarilla). Fueron 16 palabras clave en 66 s.
   - `Herramienta.tsx` + `herramientas.py`: tarjeta "HERRAMIENTA #N". El número gigante es del color de Google de cada una, debajo va una barra de 4 colores y luego el logo oficial con el texto en blanco. LearnLM no tiene logo oficial, así que lleva el logo de Google + "LearnLM" en texto. Los subtítulos se ocultan mientras se ve la tarjeta.
7. **SFX:**
   - **tecleo REAL** (`sfx/teclear.wav`, grabación de dominio público) durante "Comenta la palabra estudiante". Los `tecla1–4` sintéticos "no se acercan para nada";
   - `pop` en "aprender", `impact` + `ding` en "destacar";
   - `whoosh` + `impact` en cada tarjeta #N;
   - teclas en "copiar y pegar" (con B/N cómico);
   - `estilo.sfx_auto.aparece = null`: el pop automático de los logos molestaba.

## Correcciones del creador (en orden)
1. Gancho: "no me gusta como presentas, quita los destellos, letras tan grandes, tantos colores, tan separados en varias tomas" → opciones → **caída**, y luego "más rápida".
2. Quitar **todos los emojis** en pantalla (💎 🎧 📋).
3. Logos PNG oficiales al decir cada herramienta.
4. CTA después del título, cortado justo en "mensaje" (sin el "par…").
5. Más tomas suyas a cámara y menos de otras personas; menos unboxing y más evento/stands; tomas rápidas de él estudiando.
6. **Audio:** "muchas palabras no las terminas, me trabo y lo dejas, repito una palabra dos veces y lo dejas" → método por segmentos.
7. Quitar las **etiquetas tipo marcador** ("TU TUTOR PERSONAL"), la ráfaga de fotos y su obturador, y el trombón.
8. SFX de tecleo real.
