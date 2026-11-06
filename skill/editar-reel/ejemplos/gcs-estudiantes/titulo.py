# Título del gancho (componente propio: src/components/GanchoTitulo.tsx). Uso: python3 edicion/titulo.py . [caida|marcador|revelado]
# Cada palabra del título se ancla a la palabra dicha (sección gancho de src/data.json) y entra LEAD cuadros antes.
import json, sys, unicodedata
from pathlib import Path
P = Path(sys.argv[1]); VAR = sys.argv[2] if len(sys.argv) > 2 else 'caida'
LEAD = 3
D = json.loads((P / 'src' / 'data.json').read_text())
norm = lambda s: ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if c.isalnum())
G = [w for w in D['words'] if w['sec'] == 'gancho']
def f(token, n=0):
    hits = [w for w in G if norm(w['text']) == norm(token)]
    return max(0, round(hits[n]['start'] * 30) - LEAD)
Y = 'y'  # palabra en amarillo
# escenas → líneas → palabras [texto, palabra dicha, estilo]
if VAR == 'caida':
    escenas = [
        [[['EL', 'El'], ['80%', '80%', Y]], [['DE', 'de'], ['LOS', 'los']], [['ESTUDIANTES', 'estudiantes']], [['EN', 'en'], ['MÉXICO', 'México', Y]]],
        [[['YA', 'ya'], ['USAN', 'usan']], [['INTELIGENCIA', 'inteligencia']], [['ARTIFICIAL', 'artificial']], [['PARA', 'para'], ['ESTUDIAR', 'estudiar', Y]]],
    ]
elif VAR == 'marcador':
    escenas = [[[['El', 'El'], ['80%', '80%', Y], ['de', 'de'], ['los', 'los']], [['estudiantes', 'estudiantes'], ['en', 'en']],
                [['México', 'México'], ['ya', 'ya'], ['usan', 'usan']], [['inteligencia', 'inteligencia', Y]], [['artificial', 'artificial', Y]],
                [['para', 'para'], ['estudiar.', 'estudiar']]]]
else:  # revelado
    escenas = [[[['el', 'El', 'serif'], ['80%', '80%', 'serifY']], [['DE', 'de'], ['LOS', 'los'], ['ESTUDIANTES', 'estudiantes']],
                [['EN', 'en'], ['MÉXICO', 'México'], ['YA', 'ya'], ['USAN', 'usan']], [['INTELIGENCIA', 'inteligencia'], ['ARTIFICIAL', 'artificial']],
                [['para', 'para', 'serif'], ['estudiar', 'estudiar', 'serifY']]]]
out = {'variante': VAR, 'fin': D['hookEnd'], 'escenas': []}
for i, esc in enumerate(escenas):
    lineas = [[{'t': w[0], 'f': f(w[1]), 'e': w[2] if len(w) > 2 else ''} for w in l] for l in esc]
    out['escenas'].append({'a': lineas[0][0]['f'] if i else 0, 'lineas': lineas})
for i in range(len(out['escenas'])):
    out['escenas'][i]['b'] = out['escenas'][i + 1]['a'] if i + 1 < len(out['escenas']) else out['fin']
(P / 'src' / 'titulo.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(VAR, [(e['a'], e['b']) for e in out['escenas']], 'fin', out['fin'])
