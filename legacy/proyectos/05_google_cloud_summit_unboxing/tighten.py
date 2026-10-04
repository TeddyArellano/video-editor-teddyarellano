"""Remove every remaining pause (>0.35 s) inside the cut by splitting the source pieces around it."""
import json
import re
import subprocess

E = json.load(open('edl_final.json'))
r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'info', '-i', '../gcs_edit/public/cut.mp4', '-vn',
                    '-af', 'silencedetect=noise=-40dB:d=0.35', '-f', 'null', '-'], capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r)]
ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r)]
sil = list(zip(starts, ends))
KEEP = 0.12  # breathing room left on each side of a removed pause
out = []
removed = 0.0
for p in E:
    a_cut, b_cut = p['start'] / 30, (p['start'] + p['frames']) / 30
    cuts = []
    for s, e in sil:
        s2, e2 = max(s, a_cut), min(e, b_cut)
        if e2 - s2 > 0.35:
            cuts.append((s2 - a_cut + p['in'], e2 - a_cut + p['in']))
    segs = []
    cur = p['in']
    for s, e in cuts:
        lo, hi = s + KEEP, e - KEEP
        if lo > cur + 0.05:
            segs.append((cur, lo))
        cur = max(cur, hi)
        removed += max(0, hi - lo)
    if p['out'] > cur + 0.05:
        segs.append((cur, p['out']))
    for a, b in segs:
        ws = [w for w in p['words'] if a - 0.15 <= w[1] < b]
        out.append({**p, "in": round(a, 3), "out": round(b, 3), "words": ws})
json.dump(out, open('edl.json', 'w'), ensure_ascii=False, indent=1)
print("silences", len(sil), "| pieces", len(E), "->", len(out), "| removed", round(removed, 1), "s | new total",
      round(sum(p['out'] - p['in'] for p in out), 1), "s")
