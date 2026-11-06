# Corte en 4K real (2160×3840) desde los originales, mismos tramos que edicion/edl_final.json → public/cut4k.mp4
# (audio = el de public/cut.mp4). Solo vuelve a armar las piezas que cambiaron (caché por tramo en edicion/k4/).
import json, os, subprocess, hashlib
from concurrent.futures import ThreadPoolExecutor
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
E = json.load(open('edicion/edl_final.json'))
def pieza(p):
    k = hashlib.md5(json.dumps([p['src'], p['in'], p['out'], p['frames']]).encode()).hexdigest()[:10]
    o = f'edicion/k4/{k}.mp4'
    if not os.path.exists(o):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(p['in']), '-t', str(p['out'] - p['in'] + 0.2), '-i', f"../{p['src']}.MOV", '-frames:v', str(p['frames']), '-an',
                        '-vf', 'fps=30,scale=2160:3840:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-g', '15',
                        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', o], check=True)
    return o
with ThreadPoolExecutor(3) as ex: fs = list(ex.map(pieza, E))
open('edicion/k4/v.txt', 'w').write(''.join(f"file '{os.path.basename(f)}'\n" for f in fs))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'edicion/k4/v.txt', '-i', 'public/cut.mp4', '-map', '0:v', '-map', '1:a', '-c', 'copy', '-movflags', '+faststart', 'public/cut4k.mp4'], check=True)
n = sum(p['frames'] for p in E)
print(f'✓ public/cut4k.mp4 {n} cuadros ({n / 30:.2f} s)')
