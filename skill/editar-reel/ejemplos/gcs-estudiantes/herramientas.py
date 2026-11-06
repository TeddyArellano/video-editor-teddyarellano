# Tarjetas "#N" de cada herramienta (componente propio del proyecto: src/components/Herramienta.tsx).
# Lee src/data.json (reel datos) → src/herramientas.json en cuadros. Córrelo después de cada `reel datos`.
import json, sys, unicodedata
from pathlib import Path
P = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
D = json.loads((P / 'src' / 'data.json').read_text())
W = D['words']
norm = lambda s: ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if c.isalnum())
TOOLS = [
    {"sec": "learn", "n": 1, "color": "#4285F4", "nombre": "LearnLM", "logo_pre": "logos/google.png", "nom_en": "learn"},
    {"sec": "notebook", "n": 2, "color": "#EA4335", "logo": "logos/notebooklm_blanco.png", "nom_en": "notebook"},
    {"sec": "workspace", "n": 3, "color": "#34A853", "logo": "logos/googleworkspace_blanco.png", "nom_en": "workspace"},
]
out = []
for t in TOOLS:
    i = next(k for k, w in enumerate(W) if w['sec'] == t['sec'] and norm(w['text']) == 'numero')
    j = next(k for k in range(i, len(W)) if norm(W[k]['text']) == t['nom_en'])
    a = round((W[i]['start'] - 0.1) * 30)
    nom = round(W[j - 1 if t['sec'] == 'learn' else j]['start'] * 30) - 3  # el nombre entra con "Google" (learn) o con su palabra
    j2 = j + 1 if norm(W[j + 1]['text']) == 'lm' else j
    b = round((W[j2 + 1]['start'] + 0.35) * 30)
    out.append({**{k: v for k, v in t.items() if k != 'nom_en'}, "a": a, "num": round(W[i + 1]['start'] * 30) - 2, "nom": nom, "b": b})
(P / 'src' / 'herramientas.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
for o in out: print(o)
