"""Corte maestro con sincronía exacta (audio/video) — el método que SÍ funciona para videos largos.

Uso:
    python build_master_sync.py edl.json <carpeta_fuentes> public/cut.mp4 [--sdr carpeta_sdr] [--jobs 4]

edl.json = lista de tramos en orden: {"src": "IMG_0636", "in": 12.34, "out": 15.67, "speed": 1.0}
  - src: nombre del archivo sin extensión (.MOV en <carpeta_fuentes>)
  - speed: opcional; 2.0 = cámara rápida (video setpts, audio atempo → la voz conserva el tono)

Si las fuentes son HDR de iPhone, primero conviértelas con hdr_a_sdr (Swift) a <carpeta_sdr>/<src>.mp4 y pasa --sdr:
el video se toma de ahí (ya viene vertical, 1440x2560, BT.709) y el audio del .MOV original.

Por qué así:
  * Un solo filter_complex gigante con 4K tarda >30 min.
  * Codificar AAC por tramo y concatenar desfasa ~20 ms por corte (priming) → labios desfasados.
  → Video: cada tramo por separado (seek de entrada, N cuadros exactos) y concat por copia.
  → Audio: PCM con número exacto de muestras por tramo (frames/30*48000), fundidos de 8 ms, concat y UN solo AAC.
Escribe también <salida>.edl.json con 'frames' y 'start' (cuadro de inicio en el corte) para Remotion.
"""
import argparse
import concurrent.futures as cf
import json
import os
import subprocess
import tempfile

ap = argparse.ArgumentParser()
ap.add_argument('edl'); ap.add_argument('src_dir'); ap.add_argument('out')
ap.add_argument('--sdr', default=None); ap.add_argument('--jobs', type=int, default=4); ap.add_argument('--fps', type=int, default=30)
a = ap.parse_args()
SR, FPS = 48000, a.fps
E = json.load(open(a.edl))
t = 0
for p in E:
    p.setdefault('speed', 1.0)
    p['frames'] = round((p['out'] - p['in']) * FPS / p['speed'])
    p['start'] = t
    t += p['frames']
tmp = tempfile.mkdtemp(prefix='seg_', dir=os.path.dirname(os.path.abspath(a.out)))


def build(i):
    p = E[i]
    mov = f"{a.src_dir}/{p['src']}.MOV"
    n, sp = p['frames'], p['speed']
    d, src_d = n / FPS, p['out'] - p['in']
    tags = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
    if a.sdr:
        vin, vf = f"{a.sdr}/{p['src']}.mp4", f"setpts=PTS/{sp},fps={FPS}"
    else:  # SDR source (not iPhone HDR)
        vin, vf = mov, f"setpts=PTS/{sp},fps={FPS},scale=1440:2560:flags=lanczos"
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', str(p['in']), '-t', str(src_d + 0.2), '-i', vin,
                    '-frames:v', str(n), '-an', '-vf', vf, '-c:v', 'libx264', '-preset', 'medium', '-crf', '16',
                    '-pix_fmt', 'yuv420p', '-g', '15', *tags, f'{tmp}/{i:03d}.mp4'], check=True)
    tempo = f"atempo={sp}," if sp != 1 else ""
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', str(p['in']), '-t', str(src_d + 0.2), '-i', mov, '-vn',
                    '-ac', '2', '-ar', str(SR), '-af',
                    f"{tempo}apad,atrim=end_sample={round(d * SR)},afade=t=in:d=0.008,afade=t=out:st={d - 0.008}:d=0.008",
                    '-c:a', 'pcm_s16le', f'{tmp}/{i:03d}.wav'], check=True)


with cf.ThreadPoolExecutor(a.jobs) as ex:
    list(ex.map(build, range(len(E))))
for ext, lst in (('mp4', 'v.txt'), ('wav', 'a.txt')):
    open(f'{tmp}/{lst}', 'w').write("".join(f"file '{tmp}/{i:03d}.{ext}'\n" for i in range(len(E))))
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{tmp}/v.txt', '-c', 'copy', f'{tmp}/video.mp4'], check=True)
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{tmp}/a.txt', '-c', 'copy', f'{tmp}/audio.wav'], check=True)
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', f'{tmp}/video.mp4', '-i', f'{tmp}/audio.wav', '-map', '0:v', '-map', '1:a',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', a.out], check=True)
for f in os.listdir(tmp):
    os.remove(f'{tmp}/{f}')
os.rmdir(tmp)
json.dump(E, open(a.out + '.edl.json', 'w'), ensure_ascii=False, indent=1)
print("tramos", len(E), "| cuadros", t, f"({t / FPS:.1f} s)")
