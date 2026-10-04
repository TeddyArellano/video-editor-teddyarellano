# video-editor-teddyarellano

Editor autónomo de videos verticales (TikTok / Reels / Shorts, 1080×1920) hecho con **Claude Code**. A partir de los clips crudos de iPhone o cámara, Claude:

- transcribe y elige las mejores tomas;
- corta sin pausas y con los labios sincronizados;
- corrige el color HDR;
- compone en Remotion el gancho, los subtítulos, los zooms, los contadores, las etiquetas, los logos/QR y los efectos de sonido;
- entrega el MP4, los subtítulos (.srt), la portada y, si se pide, una página de revisión con notas al segundo exacto.

Lo usa **Teddy Arellano**, creador de contenido del IPN, para entrevistas FEySS, promos, unboxings y videos de humor.

## Cómo se usa

1. Instala una vez (solo macOS, ver abajo).
2. Abre Claude Code en la carpeta con los clips.
3. Escribe, por ejemplo:

```
/editar-reel estilo mochila, son 2 estudiantes de diseño comparando sus estuches
```

o pídelo normal: *"edita los videos de esta carpeta como la promo de Interpolitécnicos"*.

Claude sigue el flujo de la skill y deja `<Título>.mp4` en la misma carpeta, con su `proyecto_remotion/` editable al lado. Para corregir, abre Claude en esa carpeta y pide el cambio ("en el 0:23 quita esa frase").

## Instalación (macOS)

```bash
git clone https://github.com/TeddyArellano/video-editor-teddyarellano.git
cd video-editor-teddyarellano
./install.sh
```

`install.sh` hace dos cosas:
1. Enlaza `skill/editar-reel` → `~/.claude/skills/editar-reel`. El repo queda como la fuente de verdad: lo que cambies aquí lo usa Claude de inmediato.
2. Corre `skill/editar-reel/setup.sh`, que instala ffmpeg, whisper-cpp y node (Homebrew), el modelo Whisper large-v3-turbo (1.6 GB), un venv de Python, las herramientas Swift (Apple Vision/AVFoundation) y Remotion. Todo queda en `~/.reels-toolkit` (~2.7 GB).

Para comprobar que todo funciona (14 pasos, ~35 s):

```bash
~/.reels-toolkit/venv/bin/python ~/.claude/skills/editar-reel/scripts/reel.py prueba
```

## Estructura

```
skill/editar-reel/        La skill (lo que Claude carga)
  SKILL.md                Instrucciones: reglas del creador, flujo, estilos, revisión
  scripts/reel.py         CLI del pipeline (26 comandos; reel.py --help)
  scripts/synth_*.py      SFX y música originales (sin derechos)
  swift/                  HDR→SDR, caras, manos, recorte de persona, QR
  plantilla_remotion/     Plantilla Remotion genérica (data.json + estilo.json)
  estilos/                5 estilos + ejemplo de eventos por estilo
  marcas/                 Kits de marca (IPN, Interpolitécnicos)
  ejemplos/               plan.json + eventos.json reales de cada estilo (validados)
  referencia/             Esquema de eventos, estilos, criterio editorial, problemas resueltos
  revision/               Página de revisión con notas por código de tiempo
  setup.sh                Instalador del toolkit (~/.reels-toolkit)
docs/                     Contexto del proyecto (historia, preferencias, arquitectura, validación, roadmap)
legacy/                   Código de los primeros videos (antes de la skill) y scripts sueltos
install.sh                Enlaza la skill y corre el setup
CLAUDE.md                 Contexto para Claude cuando trabaja en ESTE repo
```

## Documentación
- [docs/historia.md](docs/historia.md): cada video que se hizo, qué pidió corregir el creador y qué se aprendió.
- [docs/preferencias_creador.md](docs/preferencias_creador.md): las reglas de edición del creador, con su porqué.
- [docs/arquitectura.md](docs/arquitectura.md): cómo funciona el pipeline por dentro y las decisiones técnicas.
- [docs/validacion.md](docs/validacion.md): resultados de regenerar cada estilo con material real.
- [docs/roadmap.md](docs/roadmap.md): pendientes y siguientes pasos.
- [skill/editar-reel/SKILL.md](skill/editar-reel/SKILL.md): el manual que sigue Claude.

## Requisitos
- macOS con Xcode Command Line Tools: `swiftc`, AVFoundation y Vision.
- Homebrew y Node.
- Claude Code (app de escritorio o CLI).
- ~3 GB para el toolkit, más espacio de caché por proyecto (~1 GB por cada 4 min de 4K HDR; se borra con `reel limpiar`).

Los videos crudos, los renders y las cachés **no** van en el repo (ver `.gitignore`).
