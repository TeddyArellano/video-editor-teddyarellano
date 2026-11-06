# Corte limpio de la narración (v3): solo segmentos de voz completos (VAD a -38 dB, huecos < 60 ms) con la mejor toma.
# Reescribe edicion/palabras/VOZ.json y edicion/plan.json. Tiempos en segundos del MP3.
import json, sys
from pathlib import Path
P = Path(sys.argv[1])
# (sec, inicio, fin, texto)  — cada fila es una frase completa; los límites caen en silencio real
F = [
 ("gancho", 6.85, 9.28, "El 80% de los estudiantes en México"),
 ("gancho", 9.37, 10.98, "ya usan inteligencia artificial"),
 ("gancho", 11.10, 11.76, "para estudiar."),
 ("cta", 146.11, 147.30, "Comenta la palabra estudiante"),
 ("cta", 147.59, 149.44, "y te paso los links y guías por mensaje."),
 ("problema", 13.77, 16.47, "El problema es que muchos solo la usan para copiar y pegar."),
 ("intro", 21.15, 23.30, "Por eso aquí te dejo tres herramientas de Google"),
 ("intro", 23.43, 24.92, "que de verdad te van a ayudar a aprender"),
 ("intro", 25.12, 26.60, "y destacar este semestre."),
 ("learn", 44.58, 45.25, "Número 1."),
 ("learn", 45.77, 46.61, "Google Learn"),
 ("learn", 48.75, 49.33, "LM."),
 ("learn", 50.26, 51.85, "No es solo un chat que te da respuestas,"),
 ("learn", 52.09, 54.62, "es un modelo diseñado para la educación."),
 ("learn", 55.88, 57.41, "Funciona como tutor personal."),
 ("learn", 58.94, 60.59, "Si te atoras en programación o en cálculo,"),
 ("learn", 63.07, 65.17, "te guía paso a paso para que entiendas el porqué"),
 ("learn", 69.11, 70.56, "y no solamente te haga la tarea."),
 ("notebook", 77.44, 78.04, "Número 2."),
 ("notebook", 78.18, 78.63, "Notebook"),
 ("notebook", 78.82, 79.36, "LM."),
 ("notebook", 81.12, 81.85, "Esta es una joya."),
 ("notebook", 82.27, 84.91, "Literal es tu libreta de apuntes inteligente."),
 ("notebook", 86.84, 87.44, "Subes tus fotos,"),
 ("notebook", 88.06, 89.44, "PDFs, libros, notas"),
 ("notebook", 94.43, 97.13, "y la IA te genera guías de estudio o cuestionarios."),
 ("notebook", 100.16, 101.81, "Incluso puede convertir tus notas en un"),
 ("notebook", 104.72, 106.71, "podcast para escucharlo camino a clases."),
 ("notebook", 109.71, 112.56, "Todo basado solo en documentos, cero información inventada."),
 ("workspace", 113.48, 114.15, "Número 3."),
 ("workspace", 114.35, 115.29, "Google Workspace."),
 ("workspace", 117.78, 119.65, "Ya conoces Docs y Slides,"),
 ("workspace", 123.49, 124.85, "pero ahora con la IA integrada"),
 ("workspace", 125.45, 130.24, "puedes pedirle a Google Docs que te estructure tu ensayo usando la información que ya tienes guardada en tu Drive,"),
 ("workspace", 132.62, 136.99, "o arma el borrador de una presentación en segundos con datos totalmente respaldados por ti."),
 ("cierre", 152.57, 153.05, "Nos vemos."),
]
words, piezas = [], []
orden = sorted(range(len(F)), key=lambda k: F[k][1])
idx = {}
for k in orden:
    sec, a, b, txt = F[k]
    toks = txt.split()
    tot = sum(len(t) + 2 for t in toks)
    t, i0 = a, len(words)
    for tk in toks:
        d = (b - a) * (len(tk) + 2) / tot
        words.append([tk, round(t, 3), round(t + d, 3)]); t += d
    words[-1][2] = b
    idx[k] = (i0, len(words) - 1)
for k, (sec, a, b, txt) in enumerate(F):
    pz = {"src": "VOZ", "de": idx[k][0], "a": idx[k][1], "sec": sec}
    if txt.startswith("Esta es una joya"): pz["mas_inicio"] = -0.24  # deja fuera el "Este…" previo
    if txt.endswith("por mensaje."): pz["mas_final"] = -0.165  # termina en el silencio de 149.44 s, antes de "para…"
    piezas.append(pz)
(P / 'edicion' / 'palabras' / 'VOZ.json').write_text(json.dumps(words, ensure_ascii=False))
(P / 'edicion' / 'plan.json').write_text(json.dumps({"piezas": piezas}, ensure_ascii=False, indent=1))
print(len(words), 'palabras ·', len(piezas), 'frases ·', round(sum(b - a for _, a, b, _ in F), 1), 's de voz')
