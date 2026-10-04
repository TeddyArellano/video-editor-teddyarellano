#!/bin/zsh
# Instala la skill /editar-reel desde este repo:
#   1) ~/.claude/skills/editar-reel → <repo>/skill/editar-reel (enlace: el repo es la fuente de verdad)
#   2) toolkit en ~/.reels-toolkit (ffmpeg, whisper, modelo, venv, Swift, Remotion, SFX)
# Si ya existía una copia (no enlace) de la skill, se respalda en ~/.reels-toolkit/respaldos/ (fuera de ~/.claude/skills,
# para que Claude no la cargue como una segunda skill).
set -e
REPO="${0:A:h}"
SRC="$REPO/skill/editar-reel"
DST="$HOME/.claude/skills/editar-reel"
mkdir -p "$HOME/.claude/skills"
if [ -L "$DST" ]; then
  ln -sfn "$SRC" "$DST"
elif [ -e "$DST" ]; then
  mkdir -p "$HOME/.reels-toolkit/respaldos"
  BK="$HOME/.reels-toolkit/respaldos/editar-reel-$(date +%Y%m%d-%H%M%S)"
  mv "$DST" "$BK"
  echo "· copia anterior de la skill respaldada en $BK"
  ln -s "$SRC" "$DST"
else
  ln -s "$SRC" "$DST"
fi
echo "✓ skill enlazada: $DST → $SRC"
zsh "$SRC/setup.sh"
echo "✓ listo. Prueba: ~/.reels-toolkit/venv/bin/python $DST/scripts/reel.py prueba"
