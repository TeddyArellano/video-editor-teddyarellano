#!/bin/zsh
# Instala (o repara) el toolkit permanente de /editar-reel en ~/.reels-toolkit. Idempotente: se puede correr siempre.
#   zsh ~/.claude/skills/editar-reel/setup.sh
set -e
SKILL="${0:A:h}"
TK="$HOME/.reels-toolkit"
mkdir -p "$TK"/{bin,models,remotion}
echo "== toolkit en $TK"

# 1) binarios de sistema
for pkg in ffmpeg whisper-cpp node; do
  if ! brew list --formula "$pkg" >/dev/null 2>&1; then echo "-- brew install $pkg"; brew install "$pkg"; fi
done

# 2) modelo de Whisper (1.6 GB)
M="$TK/models/ggml-large-v3-turbo.bin"
if [ ! -s "$M" ] || [ "$(stat -f %z "$M")" -lt 1500000000 ]; then
  echo "-- descargando modelo Whisper large-v3-turbo"
  curl -L --fail -o "$M.part" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin && mv "$M.part" "$M"
fi

# 3) Python venv
if [ ! -x "$TK/venv/bin/python" ]; then python3 -m venv "$TK/venv"; fi
"$TK/venv/bin/pip" install -q --upgrade pip numpy scipy pillow

# 4) herramientas Swift (Apple Vision / AVFoundation)
for f in "$SKILL"/swift/*.swift; do
  b="$TK/bin/${${f:t}%.swift}"
  if [ ! -x "$b" ] || [ "$f" -nt "$b" ]; then echo "-- swiftc ${f:t}"; swiftc -O "$f" -o "$b" >/dev/null 2>&1 || { echo "✗ falló ${f:t}:"; swiftc -O "$f" -o "$b"; }; fi
done

# 5) dependencias de Remotion compartidas por todos los proyectos (cada proyecto enlaza node_modules aquí)
cp "$SKILL/plantilla_remotion/package.json" "$TK/remotion/package.json"
if [ ! -d "$TK/remotion/node_modules/remotion" ] || [ "$SKILL/plantilla_remotion/package.json" -nt "$TK/remotion/node_modules/.stamp" ]; then
  echo "-- npm install (Remotion)"; (cd "$TK/remotion" && npm install --no-audit --no-fund --loglevel=error && touch node_modules/.stamp)
fi

# 6) SFX sintetizados de la plantilla
"$TK/venv/bin/python" "$SKILL/scripts/synth_sfx.py" "$SKILL/plantilla_remotion/public/sfx" >/dev/null

echo "== listo"
ls "$TK/bin"
