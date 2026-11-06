# Tomas SIN voz en cámara rápida (el creador: "pon todo el recorrido completo pero con mucha velocidad"; "la toma de yo entregando
# mis documentos y el pulgar arriba, en cámara rápida"). `reel cortar` las quitaría como silencio, así que se insertan DESPUÉS de
# cortar (mismo método que ejemplos/review-gadget/pausa.py) y se rearma public/cut.mp4. Correr SIEMPRE después de cada `reel cortar`.
import json, sys, os
sys.path.insert(0, os.path.expanduser('~/.claude/skills/editar-reel/scripts'))
import reel
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
pr = reel.Proyecto('.')
E = [p for p in json.load(open('edicion/edl_final.json')) if not p.get('insertado')]
def tramo(src, a, b, sp, sec):
    return {"src": src, "in": a, "out": b, "speed": sp, "gain_db": -60.0, "sec": sec, "bloque": 900, "words": [], "text": "", "insertado": True}
def despues_de(src, palabra):
    return next(i for i, p in enumerate(E) if p['src'] == src and any(palabra in w[0] for w in p['words'])) + 1
i = despues_de('IMG_2529', 'Acompáñame')
E[i:i] = [tramo('IMG_2529', 79.35, 107.5, 8.0, 'recorrido')]          # afuera → tapete IPN → pasillo → ventanillas (28 s → 3.5 s)
i = despues_de('IMG_2530', 'regresar')
E[i:i] = [tramo('IMG_2530', 11.8, 46.8, 12.0, 'entrega'),              # entrega de documentos en la ventanilla (35 s → 2.9 s)
          tramo('IMG_2530', 46.8, 48.9, 1.0, 'entrega')]               # pulgar arriba de la ventanilla, a velocidad real
for k, p in enumerate(E):
    p['bloque'] = k + 1
n = reel.build_master(pr, E, pr.P / 'public' / 'cut.mp4')
json.dump(E, open('edicion/edl_final.json', 'w'), ensure_ascii=False)
for p in E:
    if p.get('insertado'):
        print(f"✓ {p['sec']:9s} {p['src']} {p['in']}–{p['out']} x{p['speed']:g} → {p['start']/30:.2f}–{(p['start']+p['frames'])/30:.2f} s")
print(f"✓ cut.mp4 {n} cuadros ({n/30:.1f} s)")
