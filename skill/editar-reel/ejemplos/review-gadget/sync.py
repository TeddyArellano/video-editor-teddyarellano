# Afina los tiempos de src/data.json → words con whisper palabra por palabra sobre public/cut.mp4 (edicion/cut_whisper.json).
# Las palabras vienen de segmentos de voz (reparto proporcional); aquí se alinean con difflib y se usa el inicio de whisper.
import json, re, difflib, unicodedata
from pathlib import Path
P = Path(__file__).resolve().parent.parent
norm = lambda s: re.sub(r'[^a-z0-9ñ]', '', unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode())
D = json.loads((P / 'src/data.json').read_text())
W = [(s['text'].strip(), s['offsets']['from'] / 1000, s['offsets']['to'] / 1000) for s in json.loads((P / 'edicion/cut_whisper.json').read_text())['transcription'] if s['text'].strip()]
A, B = [norm(w['text']) for w in D['words']], [norm(w[0]) for w in W]
sm = difflib.SequenceMatcher(a=A, b=B, autojunk=False)
n = 0
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == 'equal' or (tag == 'replace' and i2 - i1 == j2 - j1):
        for k in range(i2 - i1):
            w, (t, s, e) = D['words'][i1 + k], W[j1 + k]
            s = max(s, w['start'] - 0.35)  # whisper DTW a veces adelanta: no más de 0.35 s
            w['start'] = round((s + w['start']) / 2 if abs(s - w['start']) > 0.25 else s, 3)
            n += 1
for i, w in enumerate(D['words']):
    if i + 1 < len(D['words']) and D['words'][i + 1]['sec'] == w['sec']:
        w['end'] = round(max(w['start'] + 0.08, min(w['end'], D['words'][i + 1]['start'])), 3)
(P / 'src/data.json').write_text(json.dumps(D, ensure_ascii=False))
print(f'✓ sync: {n}/{len(A)} palabras alineadas')
