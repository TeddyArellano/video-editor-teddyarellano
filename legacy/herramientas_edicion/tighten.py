"""Quita las pausas que quedaron DENTRO del corte (audio corrido, sin huecos).

Uso:
    python tighten.py edl_con_frames.json public/cut.mp4 edl_apretada.json [--db -40] [--min 0.35] [--keep 0.12]

1. silencedetect sobre el corte maestro.
2. Cada silencio > --min se mapea al archivo fuente y el tramo se parte ahí, dejando --keep s de aire a cada lado.
3. Vuelve a correr build_master_sync.py con la EDL nueva y repite hasta que silencedetect no encuentre nada.
La EDL de entrada necesita 'start' y 'frames' (los escribe build_master_sync.py en <cut>.edl.json).
"""
import argparse
import json
import re
import subprocess

ap = argparse.ArgumentParser()
ap.add_argument('edl'); ap.add_argument('cut'); ap.add_argument('out')
ap.add_argument('--db', type=float, default=-40); ap.add_argument('--min', type=float, default=0.35); ap.add_argument('--keep', type=float, default=0.12)
a = ap.parse_args()
E = json.load(open(a.edl))
r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'info', '-i', a.cut, '-vn', '-af', f'silencedetect=noise={a.db}dB:d={a.min}', '-f', 'null', '-'],
                   capture_output=True, text=True).stderr
sil = list(zip(map(float, re.findall(r'silence_start: ([\d.]+)', r)), map(float, re.findall(r'silence_end: ([\d.]+)', r))))
out, removed = [], 0.0
for p in E:
    sp = p.get('speed', 1.0)
    a_cut, b_cut = p['start'] / 30, (p['start'] + p['frames']) / 30
    cuts = []
    for s, e in sil:
        s2, e2 = max(s, a_cut), min(e, b_cut)
        if e2 - s2 > a.min:
            cuts.append(((s2 - a_cut) * sp + p['in'], (e2 - a_cut) * sp + p['in']))
    cur = p['in']
    segs = []
    for s, e in cuts:
        lo, hi = s + a.keep, e - a.keep
        if lo > cur + 0.05:
            segs.append((cur, lo))
        cur = max(cur, hi)
        removed += max(0, hi - lo)
    if p['out'] > cur + 0.05:
        segs.append((cur, p['out']))
    for s, e in segs:
        q = {k: v for k, v in p.items() if k not in ('start', 'frames')}
        q.update({'in': round(s, 3), 'out': round(e, 3)})
        if 'words' in p:
            q['words'] = [w for w in p['words'] if s - 0.15 <= w[1] < e]
        out.append(q)
json.dump(out, open(a.out, 'w'), ensure_ascii=False, indent=1)
print("silencios", len(sil), "| tramos", len(E), "->", len(out), "| quitado", round(removed, 1), "s")
