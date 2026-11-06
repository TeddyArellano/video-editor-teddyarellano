#!/usr/bin/env python3
"""frases_clips.py P  — como `voz.py plan` pero para VARIOS clips con voz a cámara.
Lee P/edicion/frases.json = [["sec", "CLIP", inicio, fin, "texto exacto verificado", {opciones de pieza}], …] en orden narrativo.
Cada frase se transcribe AISLADA (whisper -ml 1 -sow) para tener tiempos por palabra; si el número de palabras coincide con el
texto verificado se usan esos tiempos, si no se reparten por letras. Reescribe P/edicion/palabras/<CLIP>.json (respaldo .whisper.json)
y P/edicion/plan.json. Luego: reel edl → reel cortar --verificar."""
import json, re, shutil, subprocess, sys, tempfile
from pathlib import Path
P = Path(sys.argv[1]); ED = P / 'edicion'
F = json.loads((ED / 'frases.json').read_text())
fuentes = Path(json.loads((ED / 'proyecto.json').read_text())['fuentes'])
MODEL = Path.home() / '.reels-toolkit/models/ggml-large-v3-turbo.bin'
def clip(c): return next(f for f in fuentes.iterdir() if f.stem == c and f.suffix.lower() in ('.mov', '.mp4', '.m4v'))
def whisper_words(c, a, b):
    w = Path(tempfile.mktemp(suffix='.wav'))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a), '-to', str(b), '-i', str(clip(c)), '-af', 'apad=pad_dur=0.5', '-ac', '1', '-ar', '16000', str(w)], check=True)
    out = subprocess.run(['whisper-cli', '-m', str(MODEL), '-l', 'es', '-ml', '1', '-sow', '-mc', '0', '-f', str(w)], capture_output=True, text=True).stdout
    ws = []
    for l in out.splitlines():
        m = re.match(r'\[(\d+):(\d+):([\d.]+) --> (\d+):(\d+):([\d.]+)\]\s*(.*)', l)
        if m and m.group(7).strip() and re.search(r'\w', m.group(7)):
            ws.append((round(a + int(m.group(2)) * 60 + float(m.group(3)), 3), round(a + int(m.group(5)) * 60 + float(m.group(6)), 3)))
    return ws
words = {}; rows = []
for k, f in enumerate(F):
    sec, c, a, b, txt = f[:5]
    toks = txt.split(); ts = whisper_words(c, a, b)
    if len(ts) == len(toks):
        tw = [[t, max(a, s), min(b, max(e, s + 0.05))] for t, (s, e) in zip(toks, ts)]
        modo = 'whisper'
    else:
        tot = sum(len(t) + 2 for t in toks); t0 = a; tw = []
        for t in toks:
            d = (b - a) * (len(t) + 2) / tot; tw.append([t, round(t0, 3), round(t0 + d, 3)]); t0 += d
        modo = f'proporcional ({len(ts)}≠{len(toks)})'
    tw[0][1] = a; tw[-1][2] = b
    for i in range(1, len(tw)):  # contiguas: sin huecos falsos dentro de la frase (los silencios reales los quita `cortar`)
        tw[i][1] = max(tw[i][1], tw[i - 1][1] + 0.02); tw[i - 1][2] = tw[i][1]
    words.setdefault(c, []).append((a, k, tw)); rows.append(f"{k:2d} {sec:10s} {c} {a:7.2f}-{b:7.2f} [{modo}] {txt}")
idx = {}
for c, lst in words.items():
    lst.sort(); allw = []
    for a, k, tw in lst:
        idx[k] = (len(allw), len(allw) + len(tw) - 1); allw += tw
    pj = ED / 'palabras' / f'{c}.json'; bk = ED / 'palabras' / f'{c}.whisper.json'
    if pj.exists() and not bk.exists(): shutil.copy(pj, bk)
    pj.write_text(json.dumps(allw, ensure_ascii=False))
piezas = []
for k, f in enumerate(F):
    pz = {'src': f[1], 'de': idx[k][0], 'a': idx[k][1], 'sec': f[0]}
    if len(f) > 5: pz.update(f[5])
    piezas.append(pz)
(ED / 'plan.json').write_text(json.dumps({'piezas': piezas}, ensure_ascii=False, indent=1))
print('\n'.join(rows)); print(f"✓ {len(F)} frases → plan.json · {sum(f[3]-f[2] for f in F):.1f} s de voz")
