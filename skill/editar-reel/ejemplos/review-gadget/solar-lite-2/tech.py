# Review de gadget (HAYLOU Solar Lite 2): genera src/tech.json desde src/data.json (palabras ya sincronizadas con sync.py).
# Todo se ancla a palabras del corte: w("sol") = cuadro en que se dice; w("link", 1) = 2a aparición.
import json, re, unicodedata
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
N = D['n']

# ---------- tomas de apoyo: [src, a, b, anim, desde(s)] — anim: in | out | whip | whipL | pop
broll = [
    ['broll/muneca.mp4', w('quitado') - 6, w('lo', 1) - 2, 'in', 0.7],
    ['broll/pasos.mp4', w('ver', 0) - 3, w('cuanto') - 3, 'whip', 1.3],
    ['broll/anillos.mp4', w('cuanto') - 3, w('y', 2) - 2, 'out', 0.7],
    ['broll/sueno.mp4', w('y', 2) - 2, S['dia']['b'], 'whipL', 0.8],
    ['broll/sol1.mp4', w('pantalla') - 3, w('aunque') - 3, 'in', 0.0],
    ['broll/sol2.mp4', w('aunque') - 3, w('de', 0) - 2, 'out', 0.0],
    ['broll/brillo.mp4', w('bastante') - 4, S['pantalla']['b'], 'whip', 0.0],
    ['broll/notif.mp4', w('aqui') - 2, w('contesto') - 1, 'whipL', 0.2],
    ['broll/musica.mp4', w('puedo') - 3, w('sin', 0), 'in', 0.8],
    ['broll/galeria.mp4', w('trae') - 2, w('aunque', 1) - 3, 'whip', 0.6],
    ['broll/mia.mp4', w('aunque', 1) - 3, S['caratulas']['b'], 'in', 0.2],
    ['broll/caja2.mp4', S['config']['a'], w('lo', 3) - 3, 'out', 0.1],
    ['broll/emparejar.mp4', w('prendes') - 4, w('qr') - 6, 'whip', 0.2],
    ['broll/qr.mp4', w('qr') - 6, w('haylou', 0) - 2, 'in', 0.0],
    ['broll/listo.mp4', w('haylou', 0) - 2, S['config']['b'], 'pop', 0.0],
    ['broll/caja.mp4', S['cierre']['a'], w('si', 0) - 2, 'out', 0.6],
    ['broll/muneca2.mp4', w('smartwatch') - 4, w('tanto', end=True) + 3, 'whipL', 0.0],
]
broll = [dict(src=s, a=a, b=b, anim=an, desde=round(de * FPS)) for s, a, b, an, de in broll]

# ---------- batería del gancho: se descarga de 100 % a 4 % en "una semana…", parpadea en "batería"
bateria = dict(a=0, b=S['gancho']['b'], drena=[w('semana'), w('pidio')], low=w('bateria'))

# ---------- fichas técnicas (HUD): etiqueta chica + valor grande; cuenta = número que sube
fichas = [
    dict(a=w('pantalla') - 2, b=w('de', 0) - 4, label='PANTALLA', valor='AMOLED', sub='SE VE A PLENO SOL', sub_en=w('sol')),
    dict(a=w('200') - 3, b=w('aunque', 1) - 3, label='CARÁTULAS', valor='+200', cuenta=200),
    dict(a=w('cosa') - 3, b=w('lo', 3) - 3, label='CONFIGURACIÓN', valor='1 MIN', reloj=True),
]

# ---------- checklist de funciones (sin sacar el celular)
checklist = dict(a=w('aqui') - 2, b=S['funciones']['b'], titulo='SIN SACAR EL CELULAR',
                 items=[['NOTIFICACIONES', w('notificaciones')], ['LLAMADAS', w('llamadas')], ['MÚSICA', w('musica')]])

# ---------- pasos de configuración
pasos = dict(a=w('lo', 3) - 3, b=S['config']['b'], items=[['PRENDE', w('prendes')], ['ESCANEA EL QR', w('escaneas')], ['LISTO', w('listo')]])

# ---------- título del producto (caída, blanco + amarillo)
titulo = dict(a=w('haylou', 1) - 4, b=w('si', 0) - 2, l1='HAYLOU', l2='SOLAR LITE 2', t1=w('haylou', 1), t2=w('solar'))

# ---------- capítulos (barra arriba)
caps = [['USO DIARIO', S['dia']['a']], ['PANTALLA', S['pantalla']['a']], ['FUNCIONES', S['funciones']['a']],
        ['CARÁTULAS', S['caratulas']['a']], ['CONFIG', S['config']['a']], ['VEREDICTO', S['cierre']['a']]]
capitulos = dict(a=S['dia']['a'], b=S['cta']['a'], items=caps)

# ---------- CTA: flecha "LINK EN MI BIO" (señala arriba) + comentario que se escribe
bio = dict(a=w('link', 0) - 3, b=w('comenta') - 2)
txt = 'RELOJ'
c0 = w('comenta') + 2
comentario = dict(a=w('comenta') - 3, b=N, texto=txt, letras=[c0 + 3 + 3 * i for i in range(len(txt))], enviar=c0 + 3 + 3 * len(txt) + 5, y=330)

# ---------- destello en el contorno del reloj al decir "este reloj" (seguimiento de la pantalla: edicion/reloj_track.json)
trk = json.loads((P / 'edicion/reloj_track.json').read_text())
destello = dict(a=w('este', 0) - 2, b=min(w('reloj', 0, end=True) + 6, trk[-1][0] + 1), pico=w('reloj', 0), track=trk, r=0.031)
out = dict(destello=destello, broll=broll, bateria=bateria, fichas=fichas, checklist=checklist, pasos=pasos, titulo=titulo, capitulos=capitulos, bio=bio, comentario=comentario)
(P / 'src/tech.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
print('✓ src/tech.json', len(broll), 'tomas de apoyo')

# ---------- SFX (se agregan a data.json → sfx; correr siempre: reel datos → sync.py → tech.py)
import wave
def wlen(n):
    with wave.open(str(P / 'public/sfx' / f'{n}.wav')) as x:
        return max(1, round(x.getnframes() / x.getframerate() * FPS))
sfx = []
def s(f, n, v, ln=None): sfx.append(dict(f=int(f), src=n, v=v, len=ln or wlen(n)))
for b in broll:
    if b['anim'] in ('whip', 'whipL'): s(b['a'] - 2, 'whoosh', 0.2)
    elif b['anim'] == 'pop': s(b['a'], 'ding', 0.22)
    else: s(b['a'] - 1, 'whoosh2', 0.12)
for x in fichas:
    s(x['a'], 'pop', 0.22)
    if x.get('cuenta'): s(x['a'] + 20, 'ding', 0.2)
    if x.get('sub_en') and x['sub_en'] > x['a'] + 6: s(x['sub_en'] + 2, 'pop', 0.16)
for _, at in checklist['items']: s(at + 3, 'ding', 0.2)
for _, at in pasos['items']: s(at + 2, 'click', 0.3)
s(titulo['t1'] - 4, 'whoosh', 0.16); s(titulo['t1'] + 1, 'impact', 0.28)
s(bio['a'], 'pop', 0.24)
s(destello['a'] + 1, 'destello', 0.42)
s(comentario['letras'][0] - 1, 'teclear', 0.55, comentario['enviar'] - comentario['letras'][0] + 1)
s(comentario['enviar'], 'tecla_enter', 0.5)
# SFX por palabra / referencia (dinamismo): nunca exactamente encima de la palabra, un poco antes o después y bajitos
s(w('semana') - 2, 'tension_reloj', 0.12, 30)              # "hace una semana": tic-tac de tiempo que pasa
s(w('pidio') + 4, 'succion', 0.2)                           # batería que se vacía
s(w('dormi') + 6, 'ding', 0.14)                             # sueño
s(w('pantalla') - 48, 'riser', 0.12)                        # sube hacia "pantalla AMOLED"
s(w('sol') + 3, 'destello', 0.26)                           # brilla al sol
s(w('perfecto') + 8, 'ding', 0.18)
s(w('brillosa') + 3, 'destello', 0.16)
s(w('cambiar') + 2, 'scratch', 0.18)                        # cambiar la música
s(fichas[1]['a'] + 2, 'ffwd', 0.14)                         # el +200 contando
s(fichas[2]['a'] + 2, 'tension_reloj', 0.13, fichas[2]['b'] - fichas[2]['a'])  # reloj de 1 minuto
s(w('qr') + 2, 'shutter', 0.26)                             # escanear el QR
s(w('gusto') + 8, 'pop', 0.14)
D['sfx'] = [x for x in D['sfx'] if not x.get('tech')] + [dict(x, tech=True) for x in sfx]
(P / 'src/data.json').write_text(json.dumps(D, ensure_ascii=False))
print('✓ sfx', len(sfx))
