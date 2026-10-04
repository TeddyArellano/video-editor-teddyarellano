"""Fast master cut: each EDL piece is extracted with input seeking (hardware decode), then stream-concatenated."""
import concurrent.futures as cf
import json
import os
import subprocess

D = "/Users/teddyarellano/Content Creator/Claude - Test/Interpolitecnicos Esports 2026/Google Claude Summit"
V = f"{D}/A001_10011814_C048.MOV"
OUT = "../gcs_edit/public"
os.makedirs("seg", exist_ok=True)
os.makedirs(f"{OUT}/broll", exist_ok=True)
E = json.load(open('edl.json'))
t = 0
for p in E:
    p['frames'] = round((p['out'] - p['in']) * 30)
    p['start'] = t
    t += p['frames']

ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-g', '15',
       '-c:a', 'aac', '-b:a', '320k', '-ar', '48000']


def piece(k):
    p = E[k]
    d = p['frames'] / 30
    out = f"seg/{k:03d}.mp4"
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-hwaccel', 'videotoolbox', '-ss', str(p['in']), '-i', V,
                    '-frames:v', str(p['frames']), '-t', str(d),
                    '-vf', 'fps=30,scale=1440:2560:flags=lanczos,eq=contrast=1.04:saturation=1.08',
                    '-af', f'afade=t=in:d=0.008,afade=t=out:st={d - 0.008}:d=0.008', *ENC, out], check=True)
    return out


with cf.ThreadPoolExecutor(4) as ex:
    files = list(ex.map(piece, range(len(E))))
open('seg/list.txt', 'w').write("".join(f"file '{os.path.abspath(f)}'\n" for f in files))
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'seg/list.txt',
                '-c', 'copy', '-movflags', '+faststart', f'{OUT}/cut.mp4'], check=True)
json.dump(E, open('edl_final.json', 'w'), ensure_ascii=False, indent=1)
print("frames", t, round(t / 30, 1), "s")

B = [("llaveros_1", V, 196.0, 3.4), ("llaveros_2", V, 207.5, 3.4), ("galletas", V, 293.4, 3.6), ("caja", V, 365.0, 3.8),
     ("stickers", f"{D}/A001_10011831_C050.MOV", 2.0, 3.6)]


def broll(b):
    name, src, ss, dur = b
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-hwaccel', 'videotoolbox', '-ss', str(ss), '-i', src, '-t', str(dur),
                    '-an', '-vf', 'fps=30,scale=1080:1920:flags=lanczos,eq=contrast=1.04:saturation=1.08',
                    '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', f'{OUT}/broll/{name}.mp4'], check=True)


with cf.ThreadPoolExecutor(3) as ex:
    list(ex.map(broll, B))
print("broll ok")
