# Proyecto Remotion – FEySS Día 2 "¿Qué carreras buscan las empresas?"

    npm i remotion @remotion/cli @remotion/google-fonts react@18 react-dom@18
    npx remotion studio src/index.ts
    npx remotion render src/index.ts Vacantes out.mp4 --codec=h264 --crf=17
    ffmpeg -i out.mp4 -c:v copy -af volume=-1.2dB -c:a aac -b:a 320k final.mp4   # solo baja volumen, sin filtros

- src/Vacantes.tsx   → BROLL (tomas de stand por empresa), QR (textos de cada tarjeta), gancho, títulos, cierre
- src/companies.json → orden de empresas, inicio/fin y ganancia de volumen de cada entrevista
- src/words.json     → subtítulos (texto y tiempos)
- public/cut.mp4     → corte maestro de entrevistas con audio original
- public/broll/, public/qr/ → tomas del stand y QR recortados
- edl_tomas_originales.json → segundos exactos usados de cada IMG_XXXX.MOV
