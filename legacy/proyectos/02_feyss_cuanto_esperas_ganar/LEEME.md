# Proyecto Remotion – FEySS "¿Cuánto esperas ganar al egresar?"

    npm i remotion @remotion/cli @remotion/google-fonts react@18 react-dom@18
    npx remotion studio src/index.ts
    npx remotion render src/index.ts Entrevista out.mp4 --codec=h264 --crf=17
    ffmpeg -i out.mp4 -c:v copy -af volume=-3.8dB -c:a aac -b:a 320k final.mp4   # solo baja volumen, sin filtros

- src/Entrevista.tsx → MONEY (montos verdes), STICKERS (emojis), BADGES (carrera/escuela), título gancho, cierre
- src/words.json     → texto y tiempos de subtítulos (aquí se corrige cualquier palabra)
- src/edl.json       → tramos del corte y zoom de cada uno
- public/cut.mp4     → corte maestro con audio original (el "p***" ya va silenciado; el beep se agrega en Remotion)
- edl_tomas_originales.json → segundos exactos usados de 1.MOV–4.MOV
