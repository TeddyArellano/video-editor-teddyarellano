# Corte 4K real (2160x3840) con los MISMOS tramos de edicion/edl_final.json, desde SDR 4K (tone-mapping Apple),
# piezas en paralelo con el codificador de hardware (VideoToolbox) y el audio de public/cut.mp4.
# uso: python3 edicion/k4_cut.py <dir_sdr4k> <dir_trabajo>
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); os.chdir(P)
SDR, W = sys.argv[1], sys.argv[2]; os.makedirs(W, exist_ok=True)
E = json.load(open('edicion/edl_final.json'))
tags = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
def pieza(ip):
    i, p = ip; o = f'{W}/{i:03d}.mp4'; sp = p.get('speed', 1.0)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(p['in']), '-t', str(p['out'] - p['in'] + 0.2), '-i', f"{SDR}/{p['src']}.mp4",
                    '-frames:v', str(p['frames']), '-an', '-vf', f'setpts=PTS/{sp},fps=30', '-c:v', 'h264_videotoolbox', '-b:v', '70M',
                    '-pix_fmt', 'yuv420p', '-g', '15', *tags, o], check=True)
    return o
with ThreadPoolExecutor(6) as ex: fs = list(ex.map(pieza, enumerate(E)))
open(f'{W}/v.txt', 'w').write(''.join(f"file '{f}'\n" for f in fs))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{W}/v.txt', '-i', 'public/cut.mp4', '-map', '0:v', '-map', '1:a',
                '-c', 'copy', '-movflags', '+faststart', f'{W}/cut4k.mp4'], check=True)
n = sum(p['frames'] for p in E); print(f'✓ {W}/cut4k.mp4  {n} cuadros ({n/30:.2f} s)')
