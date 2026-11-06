#!/bin/zsh
# Construye Reel Studio.app y lo instala en /Applications (o en la carpeta que pases como argumento).
# Úsalo también para ACTUALIZAR la app después de un `git pull` (la plantilla de la skill va empaquetada en la app).
set -e
cd "$(dirname "$0")"
DESTINO="${1:-/Applications}"
echo "… dependencias"
pnpm install --frozen-lockfile >/dev/null
echo "… compilando"
pnpm run -s dist >/dev/null
APP="$(ls -d dist/mac*/Reel\ Studio.app | head -1)"
[ -d "$APP" ] || { echo "✗ no se generó la app"; exit 1; }
rm -rf "$DESTINO/Reel Studio.app"
cp -R "$APP" "$DESTINO/"
# sin firma de Apple: se quita la cuarentena para que abra con doble clic
xattr -dr com.apple.quarantine "$DESTINO/Reel Studio.app" 2>/dev/null || true
echo "✓ $DESTINO/Reel Studio.app"
