# Legacy: antes de la skill

Código de los primeros videos, hecho a mano proyecto por proyecto antes de que existiera `/editar-reel`. Se conserva como referencia de diseño (cada `src/*.tsx` tiene el look exacto del video entregado). **No se usa en el flujo actual.**

- `proyectos/01_…06_…`: el `proyecto_remotion` de cada video entregado, sin `public/` (videos, logos, SFX) ni `node_modules`. Los scripts `build_*.py` apuntan a rutas del scratchpad de esa sesión, que ya no existe. Los `data.json`/`words.json` contienen las transcripciones.
- `herramientas_edicion/`: scripts sueltos previos a `reel.py` (`build_edl.py`, `build_master.py` legado, `build_master_sync.py`, `tighten.py`, Swift…).

Para un video nuevo usa la skill (`skill/editar-reel`). Si quieres recrear el look exacto de alguno de estos videos, revisa su `src/` y llévalo a un estilo o componente de la plantilla.
