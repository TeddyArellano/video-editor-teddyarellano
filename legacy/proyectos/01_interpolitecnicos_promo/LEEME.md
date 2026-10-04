# Proyecto Remotion – Interpolitécnicos Esports 2026

Cómo volver a renderizar:

    npm i
    npx remotion studio src/index.ts        # vista previa / editar
    npx remotion render src/index.ts Promo out.mp4 --codec=h264 --crf=16

Archivos clave:
- src/Promo.tsx     → orden de gráficos, efectos de sonido (SFX), volumen de la música, tarjeta final
- src/Camera.tsx    → zoom y encuadre de cada toma (SHOTS)
- src/Captions.tsx  → estilo de los subtítulos y palabras resaltadas
- src/Graphics.tsx  → banner oficial, sello "Inscripciones abiertas", logos, calendario, QR
- src/words.json    → texto y tiempos de los subtítulos
- public/cut.mp4    → corte maestro (mejores tomas, con corrección de color y audio limpio)
- edl_tomas_originales.json → segundos exactos de cada toma usada del .MOV original

Audio: la voz es el audio original sin filtros (volumen 0.8 en src/Promo.tsx para dejar espacio a la música).
Después del render solo se baja 1.2 dB toda la mezcla para evitar saturación:

    ffmpeg -i out.mp4 -c:v copy -af volume=-1.2dB -c:a aac -b:a 320k final.mp4
