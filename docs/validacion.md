# Validación (4 de octubre de 2026)

Cada estilo se regeneró **solo con la skill**, partiendo de los clips crudos originales, siguiendo el flujo de `SKILL.md`. Los `plan.json` y `eventos.json` resultantes están en `skill/editar-reel/ejemplos/`.

| Estilo | Material | Duración | LUFS / pico | Color | Silencios | Qué se validó |
|---|---|---|---|---|---|---|
| `humor-comparacion` | Qué lleva en su mochila (3 clips HDR) | 81.9 s* | −15.6 / −0.5 | bt709 | 0 | Contador por persona, x2, VS, zooms a objetos, SFX de chiste |
| `promo` | Interpolitécnicos (1 clip SDR, 202 palabras) | 36.2 s | −14.0 / −2.7 | bt709 | 0 | Mejor toma por frase, logos de juegos (Wikidata), calendario, QR leído desde el video final, decoración gamer, música, cierre |
| `unboxing` | Google Cloud Summit (7 min → 70 s) | 69.9 s | −14.3 / −0.5 | bt709 | 0 | Gancho detrás de la persona (`recorte`) con línea `delante`, zooms automáticos (8/10 correctos), bucle de Whisper corregido |
| `entrevista` | FEySS ¿Cuánto esperas ganar? (6 clips HDR) | 56.9 s | −14.0 / −4.0 | bt709 | 0 | Pregunta solo al inicio, gancho escalonado sincronizado con la voz, montos en pixel, emojis, etiquetas, censura, cierre, `dividir` en 2 |
| `empresas-qr` | FEySS Día 2 (2 empresas) | 60.6 s | −14.0 / −2.3 | bt709 | 0 | QR desde HEIC (formulario y WhatsApp) leídos desde el video final, b-roll del stand, etiquetas por empresa, ajuste automático del gancho |

\* Con el mismo plan que la primera prueba (92.7 s): los cortes por energía eliminaron ~11 s de aire muerto.

**Otras pruebas:**
- `reel prueba` (clip sintético con voz de macOS): 14 pasos ✓ en ~35 s.
- Conversión de video horizontal (recorte al centro y al 25 %) ✓.
- Sincronización de micrófono externo: offsets exactos (−3.216 s y +2.500 s), confianza 11–13× contra 1.0× con un audio que no corresponde ✓.
- `reel logos`: Google 2026, BBVA 2025, Coca-Cola, Grupo Bimbo, IPN, Deloitte, Nestlé y 6 videojuegos, todos correctos ✓.
- Página de revisión: publicada, video como asset, y ciclo de nota → consulta → marcar aplicada → borrar ✓.

**No validado con material real todavía:**
- Micrófono externo real.
- Video horizontal real.
- Android/PQ.
- Una ronda de notas del creador en la página de revisión.
