"""Remotion data for the unboxing: captions, framing track, item chips, close-up cutaways, name tag."""
import json

import numpy as np

E = json.load(open('edl_final.json'))
F = json.load(open('faces_cut.json'))  # 5 fps over the master cut
FIX = {"Tiederellano,": "Teddy Arellano,", "corredita": "correita", "Supondré": "Supondré"}

words = []
for p in E:
    t0 = p['start'] / 30
    ws = p['words']
    for j, w in enumerate(ws):
        st = t0 + max(0, w[1] - p['in'])
        en = t0 + (ws[j + 1][1] - p['in']) if j + 1 < len(ws) else t0 + p['frames'] / 30
        words.append({"text": FIX.get(w[0], w[0]), "start": round(st, 3), "end": round(min(en, st + 1.2), 3), "sec": p['sec']})

# framing: biggest face per sample, smoothed (no cross-cut smoothing needed at this level of motion)
n = E[-1]['start'] + E[-1]['frames']
xs, ys = [], []
for fr in F:
    fs = sorted([f for f in fr if f[2] > 0.04], key=lambda f: -f[2])
    xs.append(fs[0][0] if fs else np.nan)
    ys.append(fs[0][1] if fs else np.nan)
xs, ys = np.array(xs), np.array(ys)
tt = np.arange(len(xs)) / 5
ok = ~np.isnan(xs)
xs = np.interp(tt, tt[ok], xs[ok]); ys = np.interp(tt, tt[ok], ys[ok])
def sm(v, s=0.8):
    return np.array([(np.exp(-0.5 * ((tt - t0) / s) ** 2) * v).sum() / np.exp(-0.5 * ((tt - t0) / s) ** 2).sum() for t0 in tt])
xs, ys = sm(xs), sm(ys)
fx = np.interp(np.arange(n) / 30, tt, xs).round(4).tolist()
fy = np.interp(np.arange(n) / 30, tt, ys).round(4).tolist()

# zoom: alternate 1.0 / 1.12 on every cut, a bit tighter on reaction lines
pieces = []
for k, p in enumerate(E):
    z = 1.04 if k % 2 == 0 else 1.16
    if p['sec'] == 'hook':
        z = 1.0
    pieces.append({"start": p['start'], "frames": p['frames'], "sec": p['sec'], "zoom": z})

def sec_span(sec):
    ps = [p for p in E if p['sec'] == sec]
    return ps[0]['start'] / 30, (ps[-1]['start'] + ps[-1]['frames']) / 30

def word_time(text, sec, nth=0):
    c = [w for w in words if w['sec'] == sec and w['text'].strip('.,¿?').lower() == text.lower()]
    return c[nth]['start']

CHIPS = [("botella", "BOTELLA"), ("gafete", "GAFETE DEL EVENTO"), ("organizador", "ORGANIZADOR"), ("correa", "LANYARD"),
         ("llaveros", "LLAVEROS"), ("te", "TÉ"), ("galletas", "PAN DE MUERTO"), ("caja", "LA CAJA GRANDE"), ("tetera", "SET DE TÉ")]
chips = []
for sec, text in CHIPS:
    a, b = sec_span(sec)
    chips.append({"sec": sec, "at": round(a + 0.15, 3), "end": round(min(b, a + 3.2), 3), "text": text})

broll = [
    {"file": "stickers", "at": round(sec_span('summit')[0] + 0.6, 3), "dur": 3.4},
    {"file": "llaveros_1", "at": round(word_time('decoraciones', 'llaveros') - 0.3, 3), "dur": 3.3},
    {"file": "llaveros_2", "at": round(word_time('decoraciones', 'llaveros') + 3.0, 3), "dur": 3.0},
    {"file": "galletas", "at": round(word_time('Se', 'galletas') - 0.2, 3), "dur": 3.5},
    {"file": "caja", "at": round(word_time('Para', 'caja') - 0.2, 3), "dur": 3.6},
]
name = {"at": round(word_time('Teddy Arellano', 'gafete') - 0.1, 3) if False else None}
nm = [w for w in words if w['text'].startswith('Teddy')][0]
name = {"at": round(nm['start'] - 0.1, 3), "end": round(nm['start'] + 2.8, 3)}

json.dump({"pieces": pieces, "words": words, "track": {"x": fx, "y": fy}, "broll": broll, "chips": chips, "name": name},
          open('../gcs_edit/src/data.json', 'w'), ensure_ascii=False)
print("frames", n, "| chips", [(c['text'], c['at']) for c in chips])
print("broll", broll)
print("name", name)
