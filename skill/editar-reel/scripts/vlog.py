"""vlog — estilo VLOG de /editar-reel: narración en audio aparte (MP3/WAV de voz en off) + clips mudos encima.

La skill normal asume clips con voz. Para un vlog, la voz es la "fuente" y los clips se montan después:

  1) reel nuevo <carpeta> --estilo vlog --nombre "Título"
  2) vlog.py preparar -p P --audio "<narración>.mp3"   → <carpeta>/VOZ.mov (video negro + audio) + edicion/vlog.json
  3) reel inventario / sdr (los clips) · reel transcribir -p P VOZ · tomas · plan.json (solo src "VOZ") · edl · cortar --verificar
  4) edicion/vlog.json → "montaje" (qué clip va sobre cada frase) · vlog.py montaje -p P   → public/cut.mp4 = clips + voz
  5) eventos.json (gancho {"dur", "elementos": []}, imágenes, etiquetas, sfx…) · reel datos -p P
  6) vlog.py datos -p P   → src/vlog.json (gancho cinético, fotos, B/N, globo) + palabras que faltan en los subtítulos
  7) reel revisar / render (--lufs -12, preferencia del creador)

Después de CADA `reel cortar`: vlog.py montaje → reel datos → vlog.py datos.  Después de cada `reel datos`: vlog.py datos.
Formato de edicion/vlog.json y anclas: referencia/vlog.md · ejemplo real: ejemplos/vlog/.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
TK = Path.home() / '.reels-toolkit'
FPS = 30


def ff(*args):
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', *map(str, args)], check=True)


def proyecto(p):
    p = Path(p).expanduser().resolve()
    if not (p / 'edicion' / 'proyecto.json').exists() and (p / 'proyecto_remotion' / 'edicion' / 'proyecto.json').exists():
        p = p / 'proyecto_remotion'
    if not (p / 'edicion' / 'proyecto.json').exists():
        sys.exit(f"✗ {p} no es un proyecto de /editar-reel")
    return p


def sdr_global(P, clip):
    """SDR en la caché global de `reel sdr` (misma clave que reel.py → Proyecto.sdr_global)."""
    import hashlib, json
    try:
        fuentes = Path(json.loads((P / 'edicion' / 'proyecto.json').read_text())['fuentes'])
    except Exception:
        return None
    src = next((f for f in fuentes.iterdir() if f.stem == clip and f.is_file()), None)
    key = hashlib.md5(str(src.resolve() if src else fuentes / clip).encode()).hexdigest()[:12]
    f = TK / 'cache' / 'sdr_global' / f'{clip}_{key}.mp4'
    return f if f.exists() and f.stat().st_size > 0 else None


def cache_sdr(P):
    import hashlib
    return TK / 'cache' / hashlib.md5(str(P).encode()).hexdigest()[:10] / 'sdr'


def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    return re.sub(r"[^\w*]+", '', ''.join(c for c in s if unicodedata.category(c) != 'Mn'))


# ---------------------------------------------------------------- preparar
def cmd_preparar(a):
    P = proyecto(a.proyecto)
    cfg = json.loads((P / 'edicion' / 'proyecto.json').read_text())
    src = Path(a.audio).expanduser().resolve()
    voz = Path(cfg['fuentes']) / 'VOZ.mov'
    ff('-f', 'lavfi', '-i', 'color=c=black:s=1080x1920:r=30', '-i', src, '-shortest', '-c:v', 'libx264', '-preset', 'ultrafast',
       '-pix_fmt', 'yuv420p', '-c:a', 'pcm_s16le', '-ar', '48000', voz)
    vj = P / 'edicion' / 'vlog.json'
    if not vj.exists():
        shutil.copy(SKILL / 'ejemplos' / 'vlog' / 'vlog.json', P / 'edicion' / 'vlog.ejemplo.json')
        vj.write_text(json.dumps({"montaje": [], "palabras_extra": [], "gancho": None, "fotos": [], "bn": [], "globo": None}, indent=1))
    for d in ('fotos', 'perfiles'):
        (P / 'public' / d).mkdir(parents=True, exist_ok=True)
    print(f"✓ {voz.name} creado en la carpeta del material (la narración como 'clip' VOZ)\n"
          f"  edicion/vlog.json listo (ejemplo real en edicion/vlog.ejemplo.json)\n"
          f"  fotos del evento → public/fotos/ · capturas de perfiles → public/perfiles/\n"
          f"  siguiente: reel inventario + reel sdr (clips) · reel transcribir -p P VOZ --prompt \"nombres\"")


# ---------------------------------------------------------------- montaje
def cmd_montaje(a):
    P = proyecto(a.proyecto)
    V = json.loads((P / 'edicion' / 'vlog.json').read_text())
    E = json.loads((P / 'edicion' / 'edl_final.json').read_text())
    cut, voz = P / 'public' / 'cut.mp4', P / 'public' / 'cut_voz.mp4'
    # cut.mp4 más viejo que edl_final = recién salido de `reel cortar` (voz sola) → se guarda como cut_voz.mp4
    if not voz.exists() or cut.stat().st_mtime <= (P / 'edicion' / 'edl_final.json').stat().st_mtime:
        shutil.copy(cut, voz)
    # palabras que Whisper no ubicó (retomas, finales de frase): [texto, inicio, fin] en segundos de VOZ
    for w in V.get('palabras_extra', []):
        for p in E:
            if p['in'] - 0.05 <= w['t'] <= p['out'] + 0.05:
                ws = [x for x in p['words'] if [x[0], x[1]] != [w['texto'], w['t']]]
                for x in ws:  # recorta la palabra anterior para que no se encime
                    if x[1] < w['t'] < x[2]:
                        x[2] = w['t']
                ws.append([w['texto'], w['t'], w['fin']])
                p['words'] = sorted(ws, key=lambda x: x[1])
                break
        else:
            print(f"  ⚠ palabra extra '{w['texto']}' ({w['t']} s) no cae en ninguna pieza del corte")
    (P / 'edicion' / 'edl_final.json').write_text(json.dumps(E, ensure_ascii=False, indent=1))

    n = int(subprocess.check_output(['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v', '-show_entries',
                                     'stream=nb_read_packets', '-of', 'csv=p=0', voz]))
    def tpos(x):  # "Pk+o" = inicio de la pieza k del corte + o s · número = s del corte
        if isinstance(x, (int, float)):
            return x
        k, _, o = x[1:].partition('+')
        return E[int(k)]['start'] / FPS + float(o or 0)
    M = [[c, ss, tpos(x)] for c, ss, x in V['montaje']]
    C = cache_sdr(P)
    tmp = P / 'edicion' / 'montaje_tmp'
    tmp.mkdir(exist_ok=True)
    lst = []
    for i, (clip, ss, t0) in enumerate(M):
        f0 = round(t0 * FPS)
        f1 = round(M[i + 1][2] * FPS) if i + 1 < len(M) else n
        src = C / f'{clip}.mp4'
        if not src.exists():
            src = sdr_global(P, clip) or src
        if not src.exists():
            sys.exit(f"✗ falta el SDR de {clip}: corre  reel sdr -p P {clip}")
        out = tmp / f'{i:02d}.mp4'
        ff('-ss', ss, '-i', src, '-an', '-frames:v', f1 - f0, '-vf', 'fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1',
           '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', out)
        got = int(subprocess.check_output(['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v', '-show_entries',
                                           'stream=nb_read_packets', '-of', 'csv=p=0', out]))
        if got < f1 - f0:
            sys.exit(f"✗ {clip} desde {ss}s no alcanza {(f1 - f0) / FPS:.2f}s (solo {got} cuadros): empieza antes en el clip")
        lst.append(f"file '{out}'")
        print(f"  {i:02d} {clip:<10} {ss:>6}s → {f0 / FPS:6.2f}-{f1 / FPS:6.2f}")
    (tmp / 'lista.txt').write_text('\n'.join(lst))
    ff('-f', 'concat', '-safe', '0', '-i', tmp / 'lista.txt', '-i', voz, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-frames:v', n, cut)
    shutil.rmtree(tmp)
    print(f"✓ public/cut.mp4 = {len(M)} tomas sobre la voz ({n} cuadros) · siguiente: reel datos → vlog.py datos")


# ---------------------------------------------------------------- datos
class Anclas:
    """ "sec:palabra#n+0.3" | "palabra" | número (s) → cuadro. +/- offset en segundos."""

    def __init__(self, words):
        self.w = words

    def s(self, an):
        if isinstance(an, (int, float)):
            return float(an)
        m = re.match(r'^(?:([\w-]+):)?(.+?)(?:#(\d+))?([+-][\d.]+)?$', an.strip())
        sec, word, n, off = m.group(1), m.group(2), int(m.group(3) or 0), float(m.group(4) or 0)
        q = [norm(x) for x in word.split()]
        hits = [i for i in range(len(self.w) - len(q) + 1) if (not sec or self.w[i]['sec'] == sec)
                and all(norm(self.w[i + k]['text']) == q[k] for k in range(len(q)))]
        if len(hits) <= n:
            raise KeyError(f"{an!r} (coincidencias: {len(hits)})")
        return self.w[hits[n]]['start'] + off

    def f(self, an, lead=0):
        return round(self.s(an) * FPS) - lead


def cmd_datos(a):
    P = proyecto(a.proyecto)
    V = json.loads((P / 'edicion' / 'vlog.json').read_text())
    D = json.loads((P / 'src' / 'data.json').read_text())
    A = Anclas(D['words'])
    out, bad = {}, []

    def F(an, lead=0):
        if isinstance(an, (int, float)):  # número = segundos del corte exactos (sin adelanto)
            return round(an * FPS)
        try:
            return A.f(an, lead)
        except KeyError as e:
            bad.append(str(e))
            return -1

    g = V.get('gancho')
    if g:
        lead = g.get('lead', 3)  # cada palabra entra 3 cuadros antes de decirse (al ritmo de la voz)
        esc = []
        for e in g['escenas']:
            ls = [{**{k: v for k, v in l.items() if k != 'en'}, 'f': F(l['en'], lead)} for l in e['lineas']]
            esc.append({'top': e.get('top', 930), 'lineas': ls, 'a': min(x['f'] for x in ls)})
        for i, e in enumerate(esc):
            e['b'] = esc[i + 1]['a'] if i + 1 < len(esc) else D['hookEnd'] + 1
        out['gancho'] = {'variante': g.get('variante', 'limpio'), 'escenas': esc,
                         'zooms': [F(z, lead) for z in g.get('zooms', [])],
                         'golpes': [{'f': F(x['en'], lead), 'flash': x.get('flash', 0), 'sacudida': x.get('sacudida', 0)} for x in g.get('golpes', [])]}
        if g.get('particulas'):
            out['gancho']['particulas'] = F(g['particulas'], lead)
        if g.get('franja'):
            out['gancho']['franja'] = {'t': g['franja']['t'], 'f': F(g['franja']['en'], lead)}
    fotos, k = [], 0
    for r in V.get('fotos', []):
        try:
            a0, b0 = A.s(r['desde']), A.s(r['hasta'])
        except KeyError as e:
            bad.append(str(e))
            continue
        d = min(0.95, (b0 - a0) / len(r['fotos']))  # cada foto < 1 s
        for i, fn in enumerate(r['fotos']):
            fotos.append({'a': round((a0 + i * d) * FPS), 'b': round((a0 + (i + 1) * d) * FPS), 'src': f"fotos/{fn}" if '.' in fn else f"fotos/{fn}.jpg",
                          'rot': [-4, 3.5, -2.5, 4.5][k % 4]})
            k += 1
    out['fotos'] = fotos
    out['bn'] = [[F(x['desde'], 2), F(x['hasta'])] for x in V.get('bn', [])]
    gl = V.get('globo')
    if gl:
        out['globo'] = {'a': F(gl['desde']), 'b': F(gl['hasta']), 'arcos': F(gl.get('arcos', gl['desde'])), 'pines': F(gl.get('pines', gl['desde'])),
                        **({'birretes': F(gl['birretes'])} if gl.get('birretes') else {}),
                        **{k2: gl[k2] for k2 in ('origen', 'ciudades', 'centro') if k2 in gl}}
    if bad:
        sys.exit("✗ anclas de vlog.json que no están en el corte:\n  " + "\n  ".join(bad))
    (P / 'src' / 'vlog.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(f"✓ src/vlog.json · gancho {'sí (' + str(len(out['gancho']['escenas'])) + ' escenas)' if g else 'no'} · fotos {len(fotos)} · "
          f"B/N {len(out['bn'])} · globo {'sí' if gl else 'no'}")
    for x in fotos:
        print(f"    foto {x['src']:<18} {x['a'] / FPS:6.2f}-{x['b'] / FPS:6.2f} ({(x['b'] - x['a']) / FPS:.2f}s)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    s = sp.add_parser('preparar'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('--audio', required=True)
    s = sp.add_parser('montaje'); s.add_argument('-p', '--proyecto', required=True)
    s = sp.add_parser('datos'); s.add_argument('-p', '--proyecto', required=True)
    a = ap.parse_args()
    {'preparar': cmd_preparar, 'montaje': cmd_montaje, 'datos': cmd_datos}[a.cmd](a)


if __name__ == '__main__':
    main()
