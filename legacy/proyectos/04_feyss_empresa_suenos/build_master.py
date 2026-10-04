"""Master cut (original audio, beep window muted) + Remotion data for 'empresa de tus sueños'."""
import json
import os
import re
import subprocess

import numpy as np

D = "/Users/teddyarellano/Content Creator/Claude - Test/Interpolitecnicos Esports 2026/FEySS/Cual es la empresa de tus sueños"
OUT = "../suenos_edit"
os.makedirs(f"{OUT}/public", exist_ok=True)
os.makedirs(f"{OUT}/src", exist_ok=True)
E = json.load(open('edl.json'))
BEEP = {"IMG_9553": (10.98, 11.45)}
FIX = {"desbañar.": "soñar.", "va": "vale", "a": "", "MBA": "BBVA", "CCT.": "SECIHTI.", "comproba": "compraba",
       "sabritas": "Sabritas", "Fleming": "Flamin'", "mames.": "m***s.", "Femsa.": "FEMSA.", "sedita": ""}

srcs = sorted(set(p['src'] for p in E))
idx = {s: i for i, s in enumerate(srcs)}
inputs = []
for s in srcs:
    inputs += ['-i', f"{D}/{s}.MOV"]
t = 0
vl, al = [], []
for k, p in enumerate(E):
    nf = round((p['out'] - p['in']) * 30)
    d = nf / 30
    p['frames'] = nf
    p['start'] = t
    t += nf
    i = idx[p['src']]
    vl.append(f"[{i}:v]trim=start={p['in']}:duration={d},setpts=PTS-STARTPTS,fps=30,scale=1440:2560:flags=lanczos[v{k}]")
    mute = ""
    if p['src'] in BEEP and p['in'] < BEEP[p['src']][0] < p['out']:
        a0, a1 = BEEP[p['src']][0] - p['in'], BEEP[p['src']][1] - p['in']
        p['beep'] = [round(a0, 3), round(a1, 3)]
        mute = f",volume=enable='between(t,{a0:.3f},{a1:.3f})':volume=0"
    al.append(f"[{i}:a]atrim=start={p['in']}:duration={d},asetpts=PTS-STARTPTS{mute},"
              f"afade=t=in:d=0.008,afade=t=out:st={d - 0.008}:d=0.008[a{k}]")
n = len(E)
fc = ";".join(vl + al) + ";" + "".join(f"[v{k}][a{k}]" for k in range(n)) + \
    f"concat=n={n}:v=1:a=1[cv][oa];[cv]eq=contrast=1.04:saturation=1.08[ov]"
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', *inputs, '-filter_complex', fc, '-map', '[ov]', '-map', '[oa]',
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-g', '15',
                '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', f'{OUT}/public/cut.mp4'], check=True)

# --- captions + logo events on the cut timeline
words, logos = [], []
for k, p in enumerate(E):
    t0 = p['start'] / 30
    ws = p['words']
    for j, w in enumerate(ws):
        txt = FIX.get(w[0], w[0])
        st = t0 + max(0, w[1] - p['in'])
        en = t0 + (ws[j + 1][1] - p['in']) if j + 1 < len(ws) else t0 + p['frames'] / 30
        if txt:
            words.append({"piece": k, "seg": p['seg'], "role": p['role'], "text": txt,
                          "start": round(st, 3), "end": round(min(en, st + 1.2), 3)})
        for wi, key in p['logos']:
            if wi == w[3]:
                logos.append({"key": key, "seg": p['seg'], "at": round(st, 3)})

# --- per-segment loudness → gain to −13.5 LUFS (pure gain)
segs = []
for p in E:
    if not segs or segs[-1]['seg'] != p['seg']:
        segs.append({"seg": p['seg'], "src": p['src'], "start": p['start'], "end": p['start'] + p['frames']})
    else:
        segs[-1]['end'] = p['start'] + p['frames']
for s in segs:
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'info', '-ss', str(s['start'] / 30), '-to', str(s['end'] / 30),
                        '-i', f'{OUT}/public/cut.mp4', '-vn', '-af', 'ebur128', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1])
    s['lufs'] = I
    s['gain'] = round(min(1.6, 10 ** ((-13.5 - I) / 20)), 3)

# --- framing: face-group centre per source second (5 fps), smoothed; zoom from group span
tracks = {}
for c in srcs:
    F = json.load(open(f'ff/faces_{c}.json'))
    cx, cy, span = [], [], []
    for fr in F:
        fs = [f for f in fr if f[2] > 0.03]
        if fs:
            xs = [f[0] for f in fs]
            cx.append((min(xs) + max(xs)) / 2)
            cy.append(float(np.mean([f[1] for f in fs])))
            span.append(max(xs) - min(xs) + 0.14)
        else:
            cx.append(np.nan); cy.append(np.nan); span.append(np.nan)
    cx, cy, span = map(np.array, (cx, cy, span))
    tt = np.arange(len(cx)) / 5
    ok = ~np.isnan(cx)

    def sm(v, s=1.0):
        v = np.interp(tt, tt[ok], v[ok])
        return np.array([(np.exp(-0.5 * ((tt - t0) / s) ** 2) * v).sum() / np.exp(-0.5 * ((tt - t0) / s) ** 2).sum() for t0 in tt])
    tracks[c] = (tt, sm(cx), sm(cy), sm(span, 2.0))
X, Y = [], []
for p in E:
    tt, cx, cy, sp = tracks[p['src']]
    a, b = p['in'], p['out']
    m = (tt >= a) & (tt <= b)
    spn = float(np.median(sp[m])) if m.any() else 0.5
    p['zoom'] = round(min(1.5, max(1.08, 0.78 / max(spn, 0.2))), 3)
    for f in range(p['frames']):
        ts = a + f / 30
        X.append(round(float(np.interp(ts, tt, cx)), 4))
        Y.append(round(float(np.interp(ts, tt, cy)), 4))
alt = 0
for k, p in enumerate(E):
    prev = E[k - 1] if k else None
    newseg = prev is None or prev['seg'] != p['seg']
    p['cut'] = 'new' if newseg else 'jump'
    alt = 0 if newseg else alt ^ 1
    p['zoomAlt'] = 1.08 if alt else 1.0

pieces = [{"start": p['start'], "frames": p['frames'], "seg": p['seg'], "zoom": p['zoom'], "zoomAlt": p['zoomAlt'],
           "cut": p['cut'], "beep": p.get('beep')} for p in E]
json.dump(words, open(f'{OUT}/src/words.json', 'w'), ensure_ascii=False, indent=0)
json.dump(logos, open(f'{OUT}/src/logos.json', 'w'), indent=1)
json.dump(segs, open(f'{OUT}/src/segments.json', 'w'), indent=1)
json.dump(pieces, open(f'{OUT}/src/pieces.json', 'w'), indent=0)
json.dump({"x": X, "y": Y}, open(f'{OUT}/src/track.json', 'w'))
json.dump(E, open('edl_final.json', 'w'), ensure_ascii=False, indent=1)
print("frames", t, round(t / 30, 1))
for s in segs:
    print(s)
print([(l['key'], l['at']) for l in logos])
print([(k, p['zoom']) for k, p in enumerate(E)])
