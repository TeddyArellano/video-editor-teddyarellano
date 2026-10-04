# Kits de marca

Una marca = `marcas/<id>/marca.json` + sus archivos (logos, QR). Se aplica **encima** de un estilo:
- **`colores`**: reemplaza solo los colores que define, en `src/estilo.json → colores`.
- **`fuentes`** (opcional): reemplaza fuentes del estilo, p. ej. `{"subtitulos": "Montserrat"}`.
- **`logos`**: se copian a `public/marca/<nombre>.<ext>`. Úsalos en el gancho (`{"tipo": "imagen", "src": "marca/ipn.png"}`) o en `imagenes`.
- **`creador`**: texto para la etiqueta del creador.

Uso: `reel nuevo <carpeta> --estilo entrevista --marca ipn`, o en un proyecto existente: `reel marca -p P ipn`.
Para crear una marca de un cliente nuevo, copia una carpeta, cambia colores y logos (usa `reel logos` para bajar logos oficiales) y listo.
Usa solo logos oficiales que dé el cliente o el creador.
