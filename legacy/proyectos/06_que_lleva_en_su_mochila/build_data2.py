"""v2 data: speed-aware captions/counter, fast-forward ranges, hand-centred zoom events, SFX cues."""
import json
import subprocess

import numpy as np

E = json.load(open('edl_final.json'))
F = json.load(open('faces_cut.json'))
FIX = {"lab,": "lap,", "lab.": "lap.", "ponchera?": "mochila?", "mostrame": "mostrarme"}
n = E[-1]['start'] + E[-1]['frames']

def to_cut(p, t):
    return p['start'] / 30 + max(0, t - p['in']) / p['speed']

words, items = [], []
for p in E:
    ws = p['words']
    for j, w in enumerate(ws):
        st = to_cut(p, w[1])
        en = to_cut(p, ws[j + 1][1]) if j + 1 < len(ws) else (p['start'] + p['frames']) / 30
        words.append({"text": FIX.get(w[0], w[0]), "start": round(st, 3), "end": round(min(en, st + 1.2), 3), "sec": p['sec']})
    for it in p['items']:
        items.append({"sec": p['sec'], "at": round(to_cut(p, it), 3)})
intro = [p for p in E if p['sec'] == 'intro']
txt = "¿Qué lleva en su mochila un estudiante de primer semestre contra uno de último? Vamos a verlo.".split()
a, b = intro[0]['start'] / 30 + 0.12, (intro[-1]['start'] + intro[-1]['frames']) / 30 - 0.1
tot = sum(len(x) + 1 for x in txt); t = a; iw = []
for x in txt:
    d = (b - a) * (len(x) + 1) / tot
    iw.append({"text": x, "start": round(t, 3), "end": round(t + d, 3), "sec": "intro"}); t += d
words = iw + words

secs = {}
for p in E:
    s = secs.setdefault(p['sec'], [p['start'], p['start'] + p['frames']])
    s[1] = p['start'] + p['frames']
fast = []
for p in E:
    if p['speed'] != 1:
        if fast and fast[-1][1] == p['start']:
            fast[-1][1] = p['start'] + p['frames']
        else:
            fast.append([p['start'], p['start'] + p['frames']])

# framing track (intro: biggest face; interviews: centre of two biggest faces)
tt = np.arange(len(F)) / 5
xs, ys = [], []
for i, fr in enumerate(F):
    f = i * 6
    sec = next((k for k, (a2, b2) in secs.items() if a2 <= f < b2), 'intro')
    fs = sorted([x for x in fr if x[2] > 0.035], key=lambda x: -x[2])[: (1 if sec == 'intro' else 2)]
    if fs:
        xx = [x[0] for x in fs]; xs.append((min(xx) + max(xx)) / 2); ys.append(float(np.mean([x[1] for x in fs])))
    else:
        xs.append(np.nan); ys.append(np.nan)
xs, ys = np.array(xs), np.array(ys); ok = ~np.isnan(xs)
xs = np.interp(tt, tt[ok], xs[ok]); ys = np.interp(tt, tt[ok], ys[ok])
sm = lambda v: np.array([(np.exp(-0.5 * ((tt - c) / 0.9) ** 2) * v).sum() / np.exp(-0.5 * ((tt - c) / 0.9) ** 2).sum() for c in tt])
xs, ys = sm(xs), sm(ys)
fx = np.interp(np.arange(n) / 30, tt, xs).round(4).tolist()
fy = np.interp(np.arange(n) / 30, tt, ys).round(4).tolist()

def wt(text, sec, nth=0):
    c = [w for w in words if w['sec'] == sec and w['text'].strip('.,¿?').lower() == text.lower()]
    return c[nth]['start']

# zoom events on the hands showing the most curious objects
Z = [('juan', 'Luigi'), ('juan', 'mazapán'), ('juan', 'Snoopy'), ('juan', 'lapicera'), ('juan', 'carpetita'),
     ('juan', 'Victus'), ('radio', 'audífonos'), ('radio', 'aburrida')]
zooms = []
for sec, word in Z:
    t0 = wt(word, sec) - 0.15
    f = int((t0 + 0.6) * 30)
    img = f"zf_{word}.jpg"
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', str(f / 30), '-i', '../moch_edit/public/cut.mp4', '-frames:v', '1',
                    '-vf', 'scale=720:1280', img], check=True)
    zooms.append({"sec": sec, "word": word, "at": round(t0, 3), "dur": 1.8, "img": img, "f": f})
H = json.loads(subprocess.run(['../tools/hands'] + [z['img'] for z in zooms], capture_output=True, text=True).stdout)
for z in zooms:
    fr = F[min(len(F) - 1, z['f'] // 6)]
    faces = sorted([x for x in fr if x[2] > 0.035], key=lambda x: -x[2])[:2]
    # the student is the left person with Juan and the right person with Radio
    stu = (min(faces, key=lambda x: x[0]) if z['sec'] == 'juan' else max(faces, key=lambda x: x[0])) if faces else [0.5, 0.35, 0.1]
    hands = [h for h in H.get(z['img'], []) if abs(h[0] - stu[0]) < 0.3 and h[1] > stu[1] + 0.06]
    if hands:
        cx = float(np.mean([h[0] for h in hands])); cy = float(np.mean([h[1] for h in hands]))
    else:
        cx, cy = stu[0], stu[1] + 0.2
    z.update({"cx": round(cx, 3), "cy": round(cy, 3), "hands": len(hands)})

cues = {
    "luigi": wt('Luigi', 'juan'), "aplastado": wt('aplastado', 'juan') + 0.15, "preparados": wt('Preparados', 'juan', 1),
    "inhalador3": [w for w in words if w['sec'] == 'juan' and w['text'].lower().startswith('inhalador')][2]['start'] + 0.2,
    "victus": wt('Victus', 'juan') + 0.3, "todo": wt('todo', 'radio') + 0.35,
}
data = {"n": n, "words": words, "items": items, "sections": secs, "fast": fast, "track": {"x": fx, "y": fy}, "zooms": zooms,
        "names": [{"at": round(wt('Juan', 'juan'), 3), "dur": 3.0, "name": "JUAN", "sem": "1ER SEMESTRE", "color": "#2F80ED"},
                  {"at": round(wt('Radio', 'radio'), 3), "dur": 3.0, "name": "RADIO", "sem": "9NO SEMESTRE", "color": "#EB5757"}],
        "cues": {k: round(v, 3) for k, v in cues.items()}}
json.dump(data, open('../moch_edit/src/data.json', 'w'), ensure_ascii=False)
print("frames", n, round(n / 30, 1), "| sections", {k: (round(v[0] / 30, 1), round(v[1] / 30, 1)) for k, v in secs.items()}, "| fast", [(round(a / 30, 1), round(b / 30, 1)) for a, b in fast])
for z in zooms:
    print("zoom", z['word'], z['at'], "→", (z['cx'], z['cy']), "hands", z['hands'])
print("cues", data['cues'])
