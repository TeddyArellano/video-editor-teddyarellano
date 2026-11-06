# frases_multi.json (segmentos de voz por clip) → palabras/<clip>.json (reparto proporcional) + plan.json
import json, shutil, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
F = json.load(open('edicion/frases_multi.json'))
words, idx = {}, {}
for k, (sec, src, a, b, txt, *_) in sorted(enumerate(F), key=lambda x: (x[1][1], x[1][2])):
    W = words.setdefault(src, []); toks = txt.split(); tot = sum(len(t) + 2 for t in toks); t = a; i0 = len(W)
    for tk in toks:
        d = (b - a) * (len(tk) + 2) / tot; W.append([tk, round(t, 3), round(t + d, 3)]); t += d
    W[-1][2] = b; idx[k] = (i0, len(W) - 1)
for src, W in words.items():
    p = f'edicion/palabras/{src}.json'; bk = f'edicion/palabras/{src}.whisper.json'
    if os.path.exists(p) and not os.path.exists(bk): shutil.copy(p, bk)
    json.dump(W, open(p, 'w'), ensure_ascii=False)
json.dump({'piezas': [dict({'src': f[1], 'de': idx[k][0], 'a': idx[k][1], 'sec': f[0]}, **(f[5] if len(f) > 5 else {})) for k, f in enumerate(F)]}, open('edicion/plan.json', 'w'), ensure_ascii=False, indent=1)
print('✓ plan', len(F), 'frases')
