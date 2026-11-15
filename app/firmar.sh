#!/bin/zsh
# .dmg firmado con Developer ID y notarizado por Apple (abre con doble clic en cualquier Mac, sin "clic derecho → Abrir").
# Requiere una cuenta de Apple Developer y, en el llavero, el certificado "Developer ID Application: …".
# Credenciales de notarización (una de dos):
#   APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD (contraseña de app en appleid.apple.com) + APPLE_TEAM_ID
#   APPLE_KEYCHAIN_PROFILE (perfil guardado con `xcrun notarytool store-credentials`)
# Uso:  APPLE_ID=… APPLE_APP_SPECIFIC_PASSWORD=… APPLE_TEAM_ID=… ./firmar.sh
# Sin cuenta: `pnpm dmg` hace el .dmg con firma ad-hoc (la primera vez se abre con clic derecho → Abrir).
set -e
cd "${0:A:h}"
if [ -z "$APPLE_KEYCHAIN_PROFILE" ] && { [ -z "$APPLE_ID" ] || [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; }; then
  echo "✗ faltan las credenciales de notarización: APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID (o APPLE_KEYCHAIN_PROFILE)"
  exit 2
fi
ID="${REEL_IDENTIDAD:-$(security find-identity -v -p codesigning | sed -nE 's/.*"Developer ID Application: (.*)"/\1/p' | head -1)}"
if [ -z "$ID" ]; then
  echo "✗ no hay un certificado \"Developer ID Application\" en el llavero (créalo en developer.apple.com → Certificates)"
  exit 3
fi
echo "… firmando como: Developer ID Application: $ID"
~/.reels-toolkit/venv/bin/python ../skill/editar-reel/scripts/synth_sfx.py ../skill/editar-reel/plantilla_remotion/public/sfx >/dev/null
npx electron-vite build
npx electron-builder --mac dmg \
  -c.mac.identity="$ID" -c.mac.hardenedRuntime=true -c.mac.gatekeeperAssess=false \
  -c.mac.entitlements=build/entitlements.mac.plist -c.mac.entitlementsInherit=build/entitlements.mac.plist \
  -c.mac.notarize=true
DMG="$(ls -t dist/*.dmg | head -1)"
xcrun stapler validate "$DMG"
spctl -a -vvv -t install "$DMG"
echo "✓ firmado y notarizado: $DMG"
