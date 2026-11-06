# Review de gadget (HAYLOU Flowbuds N55): genera src/tech.json desde src/data.json (palabras ya sincronizadas con sync.py).
# Todo se ancla a palabras del corte: w("espejo") = cuadro en que se dice; w("son", 1) = 2a aparición.
# Correr siempre: edicion/rehacer.sh  (reel datos → sync.py → tech.py)
import json, re, unicodedata, wave
from pathlib import Path

P = Path(__file__).resolve().parent.parent
D = json.loads((P / 'src/data.json').read_text())
FPS = 30
norm = lambda s: re.sub(r'[^a-z0-9ñ]', '', unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode())


def w(txt, n=0, end=False):
    hits = [x for x in D['words'] if norm(x['text']) == norm(txt)]
    x = hits[n]
    return round((x['end'] if end else x['start']) * FPS)


S = {s['id']: s for s in D['secs']}
# gancho con pausa: Whisper del corte se desfasa alrededor del silencio → límites desde edl_final (cada frase en su pieza, nada en la pausa)
_E = json.loads((P / 'edicion/edl_final.json').read_text())
_GT = json.loads((P / 'edicion/gancho_tiempos.json').read_text())
_g = [x for x in D['words'] if x['sec'] == 'gancho']
_g[5]['start'] = max(_g[5]['start'], _E[1]['start'] / FPS + 0.03)            # "y" (empieza la 2a pieza)
_g[-1]['end'] = min(_g[-1]['end'], _GT['cierra'] / FPS)                       # "puestos." no se queda en la pausa
_nx = D['words'][len(_g)]; _nx['start'] = max(_nx['start'], _GT['fin'] / FPS + 0.03)   # "Pero" después del silencio
N = D['n']

# ---------- tomas de apoyo: [src, a, b, anim, desde(s)] — anim: in | out | whip | whipL | pop
broll = [
    ['broll/brillo.mp4', w('ese') - 3, w('lo', 1) - 2, 'whip', 0.3],
    ['broll/abre.mp4', w('lo', 1) - 2, S['diseno']['b'], 'out', 1.0],
    ['broll/quitar.mp4', w('aunque') - 2, w('ademas') - 3, 'whipL', 0.3],
    ['broll/detalle.mp4', w('asi', 2) - 2, S['sonido']['b'], 'in', 0.0],
    ['broll/gomitas.mp4', w('se', 2) - 2, S['comodidad']['b'], 'whip', 0.0],
    ['broll/carga.mp4', S['bateria']['a'], w('hasta') - 3, 'in', 0.0],
    ['broll/estuche.mp4', w('hasta') - 3, S['bateria']['b'], 'whipL', 1.0],
    ['broll/caja.mp4', S['cierre']['a'], w('si', 2) - 2, 'out', 0.0],
    ['broll/abierto.mp4', w('vean') - 4, w('sin') - 3, 'whip', 0.0],
]
broll = [dict(src=s, a=a, b=b, anim=an, desde=round(de * FPS)) for s, a, b, an, de in broll]

# ---------- fichas técnicas (HUD): etiqueta chica + valor grande; cuenta = número que sube (fmt)
fichas = [
    dict(a=w('semana') - 3, b=w('en', 0) - 3, label='USO DIARIO', valor='1 SEMANA'),
    dict(a=w('certificacion') - 3, b=w('asi', 2) - 2, label='CERTIFICACIÓN', valor='HI-RES'),
    dict(a=w('10') - 3, b=w('hasta') - 3, label='POR CARGA · CON ANC', valor='10 H', cuenta=10, fmt='{n} H'),
    dict(a=w('35') - 3, b=S['bateria']['b'], label='CON EL ESTUCHE', valor='35 H', cuenta=35, fmt='{n} H'),
]

# ---------- listas que se marcan al decirse
checklists = [
    dict(a=w('en', 0) - 3, b=S['uso']['b'], titulo='TODO EL DÍA', items=[['TRANSPORTE', w('transporte')], ['CAMINANDO', w('caminando')], ['ESCUELA', w('escuela')]]),
    dict(a=w('se', 2) - 2, b=S['comodidad']['b'], titulo='SIEMPRE PUESTOS', items=[['ANTIBACTERIALES', w('antibacteriales')], ['AGUANTAN LLUVIA', w('lluvia')]]),
]

# ---------- interruptor de modos
modos = dict(a=w('cancelacion', 0) - 3, b=S['ruido']['b'], titulo='MODO', items=['CANCELACIÓN', 'TRANSPARENCIA'], cambio=w('transparencia'))

# ---------- chispas sobre el acabado espejo (toma brillo.mp4)
chispas = [dict(f=w('espejo') + 1, x=0.47, y=0.53, s=1.3), dict(f=w('espejo') + 8, x=0.66, y=0.60, s=0.9)]

pasos = dict(a=0, b=0, items=[])
titulo = dict(a=w('haylou') - 4, b=w('si', 2) - 2, l1='HAYLOU', l2='FLOWBUDS N55', t1=w('haylou'), t2=w('flowbuds'))
capitulos = dict(a=0, b=0, items=[['', 0]])
bateria = dict(a=0, b=0, drena=[0, 1], low=0)

# ---------- CTA: link en mi bio (A, caída) + comentario gigante (C) que se escribe
bio = dict(a=w('link', 0) - 3, b=w('comenta') - 2)
txt = 'FLOW'
c0 = w('comenta') + 2
comentario = dict(a=w('comenta') - 3, b=N, texto=txt, letras=[c0 + 3 + 3 * i for i in range(len(txt))], enviar=c0 + 3 + 3 * len(txt) + 5, y=330, mensaje=w('mensaje') - 4)

out = dict(hud='C', cta2='E', broll=broll, bateria=bateria, fichas=fichas, checklists=checklists, modos=modos, chispas=chispas, pasos=pasos, titulo=titulo, capitulos=capitulos, bio=bio, comentario=comentario)
(P / 'src/tech.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
print('✓ src/tech.json', len(broll), 'tomas de apoyo')

# ---------- SFX (se agregan a data.json → sfx)
def wlen(n):
    with wave.open(str(P / 'public/sfx' / f'{n}.wav')) as x:
        return max(1, round(x.getnframes() / x.getframerate() * FPS))
sfx = []
def s(f, n, v, ln=None): sfx.append(dict(f=int(f), src=n, v=v, len=ln or wlen(n)))
# gancho: la calle suena fuerte y CONTINUA desde el cuadro 0; al subir las manos a las orejas se cierra (filtro + caída)
# y queda ~1 s de silencio total con los audífonos puestos (synth_ciudad.py / pausa.py → edicion/gancho_tiempos.json)
GT = json.loads((P / 'edicion/gancho_tiempos.json').read_text())
s(0, 'ciudad', 0.2)
s(GT['cierra'] + 2, 'anc', 0.2)
D['silencio'] = dict(a=GT['cierra'], b=GT['silencio'], fin=GT['fin'])   # Camera.tsx: el audio de la toma se apaga ahí
D['temblor'] = dict(a=0, b=GT['cierra'], amp=7)                         # cámara que vibra con el ruido y se calma al ponérselos
for b in broll:
    if b['anim'] in ('whip', 'whipL'): s(b['a'] - 2, 'whoosh', 0.2)
    elif b['anim'] == 'pop': s(b['a'], 'ding', 0.22)
    else: s(b['a'] - 1, 'whoosh2', 0.12)
for x in fichas:
    s(x['a'], 'pop', 0.22)
    if x.get('cuenta'): s(x['a'] + 20, 'ding', 0.2)
for c in checklists:
    for _, at in c['items']: s(at + 3, 'ding', 0.2)
s(modos['a'], 'pop', 0.22); s(modos['cambio'] + 1, 'click', 0.35); s(modos['cambio'] - 2, 'whoosh2', 0.12)
s(titulo['t1'] - 4, 'whoosh', 0.16); s(titulo['t1'] + 1, 'impact', 0.28)
s(bio['a'], 'pop', 0.24)
s(chispas[0]['f'] - 2, 'destello', 0.32)
s(comentario['letras'][0] - 1, 'teclear', 0.55, comentario['enviar'] - comentario['letras'][0] + 1)
s(comentario['enviar'], 'tecla_enter', 0.5)
# SFX por palabra / referencia: un poco antes o después de la palabra y bajitos
s(fichas[1]['a'] - 40, 'riser', 0.12)                       # sube hacia "Hi-Res"
s(w('hires') + 3, 'destello', 0.18)
s(fichas[2]['a'] + 2, 'tension_reloj', 0.12, 24)            # horas que corren
s(fichas[3]['a'] + 2, 'ffwd', 0.13)                         # 35 h contando rápido
# zoom in progresivo, poco a poco, durante todo el gancho (Camera.tsx → lento)
D['zooms'] = [z for z in D['zooms'] if not z.get('lento')] + [dict(a=0, b=S['gancho']['b'], cx=0.5, cy=0.3, z=1.32, lento=True)]
D['sfx'] = [x for x in D['sfx'] if not x.get('tech')] + [dict(x, tech=True) for x in sfx]
(P / 'src/data.json').write_text(json.dumps(D, ensure_ascii=False))
print('✓ sfx', len(sfx))
for b in broll: print(f"  {b['src']:22s} {b['a']:5d}-{b['b']:5d} ({(b['b']-b['a'])/FPS:.1f}s) {b['anim']}")
