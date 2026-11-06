#!/usr/bin/env python3
"""revisar_frases.py P — transcribe CADA frase del corte final (public/cut.mp4) por separado y la compara con el texto verificado
de edicion/frases.json. Detecta: palabras cortadas al inicio/final, repeticiones, muletillas que se colaron."""
import json, re, subprocess, sys, tempfile, unicodedata
from pathlib import Path
P = Path(sys.argv[1]); ED = P / 'edicion'
F = json.loads((ED / 'frases.json').read_text()); E = json.loads((ED / 'edl_final.json').read_text())
MODEL = Path.home() / '.reels-toolkit/models/ggml-large-v3-turbo.bin'
norm = lambda s: ' '.join(re.sub(r'[^a-z0-9ñ ]', ' ', ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')).split())
malos = 0
for f in F:
    c, a, b, txt = f[1], f[2], f[3], f[4]
    ts = [x for x in E if x['src'] == c and x['in'] < b and x['out'] > a]
    if not ts: print(f'✗ FALTA: {txt}'); malos += 1; continue
    s = min(x['start'] for x in ts) / 30; e = max(x['start'] + x['frames'] for x in ts) / 30
    w = tempfile.mktemp(suffix='.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{s:.3f}', '-to', f'{e:.3f}', '-i', str(P / 'public/cut.mp4'), '-af', 'apad=pad_dur=0.5', '-ac', '1', '-ar', '16000', w], check=True)
    oido = subprocess.run(['whisper-cli', '-m', str(MODEL), '-l', 'es', '-mc', '0', '-nt', '-f', w], capture_output=True, text=True).stdout.strip().replace('\n', ' ')
    ok = norm(oido) == norm(txt)
    malos += not ok
    print(f"{'✓' if ok else '≠'} {s:6.2f}-{e:6.2f}  {txt}" + ('' if ok else f"\n      se oye: {oido}"))
print('✓ todas las frases se oyen completas y exactas' if not malos else f'→ {malos} frases distintas: escúchalas (puede ser solo ortografía de Whisper)')
