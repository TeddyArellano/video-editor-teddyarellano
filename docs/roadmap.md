# Roadmap

## Pendientes inmediatos
- [ ] **Re-exportar los videos de FEySS con el color correcto.** Se grabaron en HDR (HLG) y salieron con la conversión vieja, con la piel naranja:
  - "¿Cuánto esperas ganar?";
  - Día 2 (completo + Química/Alimentos/Industria + Tecnología/Sistemas/Finanzas);
  - "Empresa de tus sueños" (completo + Finanzas + Tecnología).

  Se puede hacer sin cambiar la edición: `reel sdr` + reconstruir el master con la misma EDL. Google Summit e Interpolitécnicos eran SDR y están bien.
- [ ] **Mochila: subir a Juan +5.4 dB** (`reel niveles --aplicar`) para que suene igual que Radio.
- [ ] Primer video **real nuevo** de punta a punta con la skill, incluida una ronda de notas en la página de revisión.
- [x] Commit inicial y push de este repo (GitHub, noviembre 2026).

## Reel Studio: hecho en noviembre 2026 (estilo CapCut)
- [x] Capas libres: textos, formas, superpuestos (PiP, pantalla completa, persona sin fondo), pistas de audio con fundidos y ducking, ajustes de color con filtros, transiciones en los cortes.
- [x] Fotogramas clave (posición, escala, giro, opacidad) en cualquier elemento movible; animaciones de entrada, salida y bucle.
- [x] Panel Medios: importar, soltar desde Finder, arrastrar a la línea de tiempo o a la vista previa.
- [x] Reordenar tramos arrastrando; ver recortes sin aplicar (orden nuevo y tramos extendidos) al instante desde los clips originales.
- [x] Curvas de velocidad (acelerar, frenar, suave).
- [x] Exportar con un botón: borrador / final / 4K, formatos 16:9 · 1:1 · 4:5, SRT y portada, carpeta, Compartir.
- [x] Atajos configurables.
- [x] Funciones automáticas: quitar fondo, limpiar voz, texto a voz.
- [x] Vista previa con los componentes propios del proyecto; color de la vista previa igual al render.
- [x] `pnpm dmg` para repartir la app.

## Reel Studio: hecho después (noviembre 2026)
- [x] **El `.dmg` funciona sin el repo** (probado con un HOME vacío: `e2e/instalar.spec.ts`, `REEL_PRUEBA_INSTALAR=1`): trae la skill dentro (`Contents/Resources/skill/editar-reel`); **Instalar / reparar** corre su `setup.sh` (toolkit + modelo) y enlaza la skill para Claude si no estaba. Firma ad-hoc.
- [x] **Publicar:** Exportar → TikTok / Instagram / YouTube Shorts abre la página de subida, muestra el video en Finder y copia el texto del post.
- [x] **Vista del plan con subtítulos y gráficos:** la plantilla real va encima sin su cámara (`sinCamara`) y con los cuadros de `data.json` acomodados al plan (`app/src/shared/planDatos.ts`).
- [x] **Clips sin conexión:** Cortes avisa si falta un clip original, Re-cortar no corre a ciegas y **Localizar…** lo vuelve a enlazar.

## Reel Studio: listo, solo falta la cuenta de cada servicio
- [x] **Firmar con Developer ID y notarizar:** `pnpm dmg:firmado` (`app/firmar.sh`, hardened runtime con `build/entitlements.mac.plist`). Necesita la cuenta de Apple Developer, el certificado "Developer ID Application" en el llavero y `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID` (o `APPLE_KEYCHAIN_PROFILE`).
- [x] **Subir directo a TikTok** (Content Posting API, a la bandeja de entrada) **e Instagram** (Graph API, Reel publicado con el texto del post): Preferencias → Redes. Necesita una app de TikTok con "Content Posting API" y una app de Meta con `instagram_content_publish`. Probado contra un simulador de ambas APIs (`e2e/redes.spec.ts`).

## Siguientes mejoras (cuando el uso real lo pida)
- **Equipo:** empaquetar la skill como plugin de Claude Code para otras personas (requieren Mac).
- **Volumen de producción:** procesar varios videos en cola (una carpeta por entrevista) y revisar todos los borradores juntos.
- **Datos:** registrar qué videos rinden mejor (gancho, duración, estilo) y ajustar el criterio con eso.
- **Tomas:** detectar repeticiones sin pausa entre tomas (hoy quedan en un solo enunciado).
- **Zooms:** seguir el objeto, no solo las manos, cuando se mueve mucho.
- **Fuera de macOS:** buscar alternativas a AVFoundation y Vision.

## Ideas descartadas o pospuestas
- ~~**Una interfaz web propia para editar**~~ → hecha como **Reel Studio** (`app/`, noviembre 2026). Claude sigue haciendo el criterio; la app cubre los cambios rápidos a mano y ya funciona como un editor tipo CapCut.
