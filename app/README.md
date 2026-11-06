# Reel Studio

App de escritorio (macOS) para editar los reels de la skill `/editar-reel` con interfaz gráfica: vista previa en vivo, mover textos en el video, línea de tiempo, subtítulos, estilo, cortes, pipeline completo y Claude integrado.

**Principio:** la app y la skill trabajan sobre **los mismos archivos** del proyecto (`edicion/eventos.json`, `plan.json`, `src/estilo.json`…). Puedes alternar entre la app y Claude Code cuando quieras; la app recarga sola lo que cambie Claude.

## Instalar / actualizar

```bash
cd app
./instalar.sh            # construye "Reel Studio.app" y lo copia a /Applications
```

Vuelve a correrlo después de un `git pull`: la plantilla de la skill va empaquetada dentro de la app.

**Requisitos:**
- el toolkit de la skill (`install.sh` en la raíz del repo);
- Node y pnpm.

No hace falta Xcode, Rust ni una cuenta de Apple Developer. La app no va firmada; `instalar.sh` le quita la cuarentena.

**Abrir un proyecto:**
- desde la biblioteca, con "Abrir carpeta…";
- arrastrando la carpeta al ícono;
- o con `open -a "Reel Studio" "<carpeta del material>"`.

## Qué hace

| Panel | Para qué |
|---|---|
| **Vista previa** | La composición `Reel` de la plantilla (la misma del render) en `@remotion/player`. Clic en un texto = seleccionarlo; arrastrar = moverlo; esquina = escalar; perilla = rotar. Imanes al centro (x 540) y a la zona segura (Alt los desactiva). |
| **Línea de tiempo** | Secciones, tramos del corte, bloques de subtítulos, gancho, eventos, zooms, SFX y notas. Arrastrar mueve; los bordes estiran. Al soltar, el inicio se pega a la palabra más cercana (Alt = libre). ⌘/Ctrl + rueda = zoom. |
| **Elementos** | Inspector del elemento seleccionado (texto, colores, ancla, duración, posición…) y paleta para agregar etiquetas, nombres, imágenes, montos, emojis, calendario, zooms y SFX en el cuadro actual. |
| **Subtítulos** | Transcripción sincronizada. Corregir palabra (`fix`), resaltar, énfasis y "cortar bloque aquí" (`cortes`). |
| **Estilo** | `src/estilo.json` por secciones, cambio de preset, marca y "guardar como preset". |
| **Cortes** | El plan como piezas de transcripción. Tachar palabras, recortar o extender por palabra, dividir (Alt+clic), reordenar, velocidad, ganancia y márgenes. Escuchar el clip original. **Re-cortar** corre `edl → cortar --verificar → datos`. |
| **Pipeline** | Todos los pasos de `reel.py` con botones y cola de trabajos con progreso: inventario, SDR, micrófono externo, transcribir, zooms, énfasis, recorte, intro 3D, borrador, render final (con nota / 4K), SRT + portada, logos, QR, b-roll y limpiar caché. |
| **Notas** | Notas de revisión en el cuadro actual (`edicion/notas.json`). Claude las aplica y las marca. |
| **Claude** | Pide cambios de criterio a Claude Code (tu sesión, con la skill). Ves lo que hace, la vista previa se actualiza sola y puedes **revertir** con un clic. |

**Atajos:**
- Espacio o K: play/pausa.
- ← / →: un cuadro (con Shift: 1 s).
- J / L: ±1 s.
- Home / End: inicio y final.
- ⌘Z / ⇧⌘Z: deshacer y rehacer.
- ⌘S: guardar.
- Supr: borrar el elemento.
- Esc: deseleccionar.

## Cómo funciona

```
Electron main (Node)                          Renderer (React)
  proyectos.ts  abrir, recientes, vigilante     store.ts     estado + historial (zundo) + guardado con debounce
  archivos.ts   escritura atómica + conflictos  Visor/Lienzo  Player de Remotion + selección y arrastre
  procesos.ts   cola de reel.py --json          Timeline, Inspector, Subtítulos, Estilo, Cortes, Pipeline, Notas, Claude
  medios.ts     reel-media:// (con Range)        shared/      anclas (= reel.py), elementos, subtítulos, cortes
  claude.ts     claude -p (stream-json)
```

**Flujo de una edición:**
1. Parche optimista a `data` + `eventos`: la vista previa cambia al instante.
2. Guardado atómico (450 ms), con detección de conflictos por hash.
3. `reel datos --json` en segundo plano: con caché de caras tarda unos 0.05 s.
4. Se recarga `src/data.json` solo si no hay ediciones más nuevas pendientes.

## Pruebas

```bash
pnpm typecheck
pnpm test                                     # unitarias (anclas, elementos, subtítulos, cortes)
REEL_PARIDAD=paridad.json pnpm test           # paridad de anclas con reel.py sobre proyectos reales
REEL_FIXTURE=<copia de un proyecto> pnpm e2e  # E2E con Playwright sobre la app real
REEL_EJECUTABLE="dist/mac-arm64/Reel Studio.app/Contents/MacOS/Reel Studio" …   # E2E contra la app empaquetada
REEL_E2E_CLAUDE=1 …                           # incluye la prueba con Claude real (usa tokens)
```

**Las E2E modifican el proyecto.** Usa siempre una copia:
- `src/` y `edicion/` copiados;
- `public/` clonado con `cp -cR` (clon APFS: no ocupa espacio y escribir ahí no toca el original).

**Qué cubren:**
- visor y medios;
- mover en el lienzo hasta que `data.json` queda regenerado por `reel datos`;
- inspector y deshacer;
- arrastre en la línea de tiempo;
- cambio externo (como lo haría Claude);
- agregar y borrar elementos;
- subtítulos y notas;
- estilo;
- re-corte real;
- proyecto nuevo de punta a punta con borrador;
- paneles;
- fidelidad: la vista previa contra `remotion still` en 6 cuadros.

## Límites conocidos

- **Proyectos con componentes propios** en `src/components` muestran "vista aproximada": la vista previa usa la plantilla de la skill y el render usa los del proyecto. `reel actualizar` (en Pipeline) los iguala si no son cambios intencionales.
- **Video de la vista previa:**
  - El `<video>` de Chromium se ve unos 10 niveles (de 255) más claro que el render.
  - Al buscar un cuadro puede quedar ±1 cuadro. El render final es exacto.
- **Fuentes:** se cargan de Google Fonts, así que la primera vez hace falta internet.
- **Re-cortar** reconstruye el corte con `reel cortar`. Los pasos manuales hechos después de cortar (p. ej. un `insertar.py`) hay que repetirlos.
