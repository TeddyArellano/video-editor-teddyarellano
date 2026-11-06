#!/usr/bin/env python3
"""Narración limpia por SEGMENTOS DE VOZ (validado en Google Cloud Summit 2026 · Estudiantes, oct 2026).

Por qué: Whisper sobre la narración completa "limpia" las trabas, se salta retomas enteras y pone finales de palabra
antes de que termine la voz → `reel cortar` recorta sílabas y deja repeticiones. Aquí la unidad es el segmento de voz
real (energía), transcrito por separado; tú eliges frases completas y los cortes caen siempre en silencio.

  voz.py segmentos -p P [--audio VOZ.mov] [--umbral -38]
      VAD por energía (10 ms, une huecos < 60 ms, descarta < 50 ms) + whisper por segmento (-ml 1, sin contexto).
      → edicion/segmentos.txt (léelo: índice, inicio-fin, texto) y edicion/segmentos.json
      Pistas: las alucinaciones típicas en segmentos cortos ("Gracias", "Suscríbete al canal") son ruido o una palabra
      suelta; un segmento demasiado corto para su texto es un arranque fallido ("muchos" en 0.16 s = "mu-").
      La retoma buena suele ser la ÚLTIMA completa. Dos segmentos seguidos con < 0.1 s de hueco son la misma frase.

  voz.py plan -p P
      Lee edicion/frases.json  → reescribe edicion/palabras/VOZ.json (respaldo en VOZ.whisper.json) y edicion/plan.json.
      frases.json = [["sec", inicio, fin, "texto exacto", {"mas_inicio": -0.24, "mas_final": -0.165}], …]  (en orden narrativo;
      inicio/fin = límites de segmentos de segmentos.txt; varias filas contiguas del original se pueden unir en una sola).
      Luego: reel edl → reel cortar --verificar → voz.py revisar.

  voz.py revisar -p P
      Compara cada frase con su tramo en edl_final: avisa si el corte empieza tarde o termina antes que la voz
      (cut_words limita cada palabra a 1.2 s: una "palabra" larga como "NotebookLM" se recorta → pártela en dos).
"""
import argparse, json, math, re, shutil, struct, subprocess, sys
from pathlib import Path

WHISPER_MODEL = Path.home() / '.reels-toolkit' / 'models' / 'ggml-large-v3-turbo.bin'
SR = 16000


def pcm(audio, ss=None, t=None):
    cmd = ['ffmpeg', '-v', 'error']
    if ss is not None:
        cmd += ['-ss', str(ss), '-t', str(t)]
    cmd += ['-i', str(audio), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return struct.unpack('%df' % (len(raw) // 4), raw)


def energia(x, h=160):
    return [20 * math.log10(math.sqrt(sum(v * v for v in x[i:i + h]) / h) + 1e-9) for i in range(0, len(x) - h, h)]


def segmentos(args):
    P = Path(args.p)
    audio = Path(args.audio) if args.audio else Path(json.loads((P / 'edicion' / 'proyecto.json').read_text())['fuentes']) / 'VOZ.mov'
    E = energia(pcm(audio))
    on = [e > args.umbral for e in E]
    seg, i = [], 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and on[j]:
                j += 1
            if seg and i - seg[-1][1] < 6:
                seg[-1][1] = j
            else:
                seg.append([i, j])
            i = j
        else:
            i += 1
    seg = [[a / 100, b / 100] for a, b in seg if b - a >= 5]
    tmp = P / 'edicion' / 'segmentos_tmp'
    tmp.mkdir(exist_ok=True)
    out, lines = [], []
    for k, (a, b) in enumerate(seg):
        w = tmp / f's{k}.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(max(0, a - 0.12)), '-t', str(b - a + 0.24), '-i', str(audio),
                        '-af', 'apad=pad_dur=0.6', '-ar', str(SR), '-ac', '1', str(w)], check=True)
        txt = subprocess.run(['whisper-cli', '-m', str(WHISPER_MODEL), '-l', 'es', '-ml', '1', '-sow', '-mc', '0', '-f', str(w)],
                             capture_output=True, text=True).stdout
        ws = []
        for l in txt.splitlines():
            m = re.match(r'\[(\d+):(\d+):([\d.]+) --> (\d+):(\d+):([\d.]+)\]\s*(.*)', l)
            if m and m.group(7).strip():
                t0 = int(m.group(2)) * 60 + float(m.group(3))
                ws.append([m.group(7).strip(), round(a - 0.12 + t0, 2)])
        out.append({'i': k, 'a': a, 'b': b, 'words': ws})
        lines.append(f"{k:3d} {a:7.2f}-{b:7.2f} ({b - a:4.2f}s)  {' '.join(x[0] for x in ws)}")
    shutil.rmtree(tmp, ignore_errors=True)
    (P / 'edicion' / 'segmentos.json').write_text(json.dumps(out, ensure_ascii=False))
    (P / 'edicion' / 'segmentos.txt').write_text('\n'.join(lines) + '\n')
    print('\n'.join(lines))
    print(f"✓ {len(seg)} segmentos → edicion/segmentos.txt · escribe edicion/frases.json y corre  voz.py plan -p P")


def plan(args):
    P = Path(args.p)
    F = json.loads((P / 'edicion' / 'frases.json').read_text())
    vj = P / 'edicion' / 'palabras' / 'VOZ.json'
    bk = P / 'edicion' / 'palabras' / 'VOZ.whisper.json'
    if vj.exists() and not bk.exists():
        shutil.copy(vj, bk)
    words, idx = [], {}
    for k in sorted(range(len(F)), key=lambda k: F[k][1]):
        sec, a, b, txt = F[k][:4]
        toks = txt.split()
        tot = sum(len(t) + 2 for t in toks)
        t, i0 = a, len(words)
        for tk in toks:  # reparto proporcional por letras: suficiente para subtítulos y anclas
            d = (b - a) * (len(tk) + 2) / tot
            words.append([tk, round(t, 3), round(t + d, 3)])
            t += d
        words[-1][2] = b
        idx[k] = (i0, len(words) - 1)
    piezas = []
    for k, f in enumerate(F):
        pz = {'src': 'VOZ', 'de': idx[k][0], 'a': idx[k][1], 'sec': f[0]}
        if len(f) > 4:
            pz.update(f[4])
        piezas.append(pz)
    vj.write_text(json.dumps(words, ensure_ascii=False))
    (P / 'edicion' / 'plan.json').write_text(json.dumps({'piezas': piezas}, ensure_ascii=False, indent=1))
    print(f"✓ {len(words)} palabras · {len(piezas)} frases · {sum(f[2] - f[1] for f in F):.1f} s de voz → reel edl → reel cortar --verificar → voz.py revisar")


def revisar(args):
    P = Path(args.p)
    F = json.loads((P / 'edicion' / 'frases.json').read_text())
    E = json.loads((P / 'edicion' / 'edl_final.json').read_text())
    malos = 0
    for f in F:
        sec, a, b, txt = f[:4]
        ts = [x for x in E if x['in'] < b and x['out'] > a]
        if not ts:
            print(f"✗ {a:.2f}-{b:.2f} no está en el corte: {txt}")
            malos += 1
            continue
        lo, hi = min(x['in'] for x in ts), max(x['out'] for x in ts)
        flag = (' ← EMPIEZA TARDE' if lo > a + 0.02 else '') + (f' ← CORTA EL FINAL ({b - hi:.2f}s)' if hi < b - 0.03 else '')
        malos += bool(flag)
        print(f"{a:7.2f}-{b:7.2f} | corte {lo:7.2f}-{hi:7.2f}{flag}  {txt[:50]}")
    print('✓ todas las frases completas' if not malos else f'✗ {malos} frases para revisar (parte palabras largas o ajusta mas_inicio/mas_final)')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    s = sp.add_parser('segmentos'); s.add_argument('-p', required=True); s.add_argument('--audio'); s.add_argument('--umbral', type=float, default=-38)
    s = sp.add_parser('plan'); s.add_argument('-p', required=True)
    s = sp.add_parser('revisar'); s.add_argument('-p', required=True)
    a = ap.parse_args()
    {'segmentos': segmentos, 'plan': plan, 'revisar': revisar}[a.cmd](a)
