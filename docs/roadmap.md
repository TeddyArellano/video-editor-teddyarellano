# Roadmap

## Pendientes inmediatos
- [ ] **Re-exportar los videos de FEySS con el color correcto.** Se grabaron en HDR (HLG) y salieron con la conversión vieja, con la piel naranja:
  - "¿Cuánto esperas ganar?";
  - Día 2 (completo + Química/Alimentos/Industria + Tecnología/Sistemas/Finanzas);
  - "Empresa de tus sueños" (completo + Finanzas + Tecnología).

  Se puede hacer sin cambiar la edición: `reel sdr` + reconstruir el master con la misma EDL. Google Summit e Interpolitécnicos eran SDR y están bien.
- [ ] **Mochila: subir a Juan +5.4 dB** (`reel niveles --aplicar`) para que suene igual que Radio.
- [ ] Primer video **real nuevo** de punta a punta con la skill, incluida una ronda de notas en la página de revisión.
- [ ] Commit inicial y push de este repo (cuando el creador lo pida).

## Siguientes mejoras (cuando el uso real lo pida)
- **Equipo:** empaquetar la skill como plugin de Claude Code para otras personas (requieren Mac).
- **Volumen de producción:** procesar varios videos en cola (una carpeta por entrevista) y revisar todos los borradores juntos.
- **Datos:** registrar qué videos rinden mejor (gancho, duración, estilo) y ajustar el criterio con eso.
- **Tomas:** detectar repeticiones sin pausa entre tomas (hoy quedan en un solo enunciado).
- **Zooms:** seguir el objeto, no solo las manos, cuando se mueve mucho.
- **Fuera de macOS:** buscar alternativas a AVFoundation y Vision.

## Ideas descartadas o pospuestas
- **Una interfaz web propia para editar:** pospuesta. Lo difícil (elegir tomas, chistes, zooms) es criterio de Claude; la página de revisión cubre la parte de dar notas.
