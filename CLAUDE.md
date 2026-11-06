# Contexto para Claude: repo `video-editor-teddyarellano`

Este repo es la **fuente de verdad** de la skill `/editar-reel`: el sistema con el que Claude edita los Reels/TikTok de Teddy Arellano. Si `install.sh` ya corrió, `~/.claude/skills/editar-reel` es un enlace a `skill/editar-reel/` de este repo, así que cualquier cambio aquí lo usa Claude de inmediato en cualquier carpeta.

## Antes de tocar algo, lee
1. `skill/editar-reel/SKILL.md`: reglas del creador, flujo y estilos. Es lo que ve Claude al editar.
2. `docs/preferencias_creador.md` y `docs/historia.md`: por qué cada regla existe (vienen de correcciones reales).
3. `docs/arquitectura.md`: cómo encajan `reel.py`, la plantilla Remotion y los datos.

## Cómo trabajar en el repo
- **Nunca rompas el flujo.** Después de cualquier cambio en `skill/` corre la prueba de humo (14 pasos, ~35 s; debe terminar en "AUTOPRUEBA OK"):
  ```bash
  ~/.reels-toolkit/venv/bin/python skill/editar-reel/scripts/reel.py prueba
  ```
- **Cambios en la plantilla Remotion** (`skill/editar-reel/plantilla_remotion/`): compílala con `ln -sfn ~/.reels-toolkit/remotion/node_modules node_modules && npx tsc --noEmit -p . ; rm node_modules`. Los proyectos existentes se actualizan con `reel actualizar -p P`.
- **Cambio visual:** valídalo con `reel revisar` en un proyecto real o en `~/.reels-toolkit/cache/prueba_mochila` / `validacion/*` si siguen ahí, y mira los stills antes de dar algo por bueno.
- **Preferencia nueva y general del creador** (llega como corrección en un video): agrégala a `SKILL.md §1`, `skill/editar-reel/referencia/criterio_editorial.md` y `docs/preferencias_creador.md`, y anótala en `docs/historia.md`.
- **Bug resuelto:** agrégalo a `skill/editar-reel/referencia/problemas.md`.
- **Nuevo estilo:** `skill/editar-reel/estilos/<id>.json` + `<id>.eventos.json` + `ejemplos/<id>/`, más la fila en la tabla de `SKILL.md §3`.
- **Reel Studio (`app/`):** la app usa la MISMA plantilla (`@plantilla` → `skill/editar-reel/plantilla_remotion/src`). Si cambias la plantilla o `reel.py`, corre también:
  ```bash
  cd app && pnpm typecheck && pnpm test
  REEL_FIXTURE=<copia de un proyecto> pnpm e2e
  ```
  - La copia del proyecto lleva `src/` y `edicion/` copiados y `public/` clonado con `cp -cR`. Nunca uses un proyecto real.
  - La plantilla debe seguir leyendo los datos con `setDatos`/`derivado`/`asset` de `theme.ts` (nada de imports de JSON ni de cálculos a nivel de módulo en los componentes).
  - Los elementos movibles van envueltos en `<Pos>`.
  - Después: `./instalar.sh` para actualizar la app instalada.
- **Commits:** solo cuando el usuario lo pida. No subas videos, audio, cachés ni `node_modules` (ver `.gitignore`).

## Entorno
- macOS. Toolkit en `~/.reels-toolkit`:
  - `bin/`: binarios Swift;
  - `models/`: Whisper large-v3-turbo;
  - `venv/`;
  - `remotion/node_modules`;
  - `cache/`.
- `skill/editar-reel/setup.sh` lo instala o repara (idempotente).
- El material de los videos ya hechos vive fuera del repo, en `~/Content Creator/Claude - Test/Interpolitecnicos Esports 2026/` (carpetas FEySS, Google Claude Summit, Qué lleva en su mochila…).

## Idioma
Todo (docs, mensajes del CLI, comentarios de la plantilla) está en español, como lo usa el creador.
