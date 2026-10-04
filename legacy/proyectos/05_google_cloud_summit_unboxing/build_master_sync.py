"""Sample-exact master: video pieces concatenated by stream copy, audio cut as PCM (no AAC priming per piece)
and encoded once, so lips stay in sync for the whole video."""
import concurrent.futures as cf
import json
import os
import subprocess

D = "/Users/teddyarellano/Content Creator/Claude - Test/Interpolitecnicos Esports 2026/Google Claude Summit"
V = f"{D}/A001_10011814_C048.MOV"
OUT = "../gcs_edit/public"
os.makedirs("seg2", exist_ok=True)
E = json.load(open('edl_final.json'))
SR = 48000


def piece(k):
    p = E[k]
    n = p['frames']
    d = n / 30
    v = f"seg2/{k:03d}.mp4"
    a = f"seg2/{k:03d}.wav"
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-hwaccel', 'videotoolbox', '-ss', str(p['in']), '-i', V,
                    '-frames:v', str(n), '-an', '-vf', 'fps=30,scale=1440:2560:flags=lanczos,eq=contrast=1.04:saturation=1.08',
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-g', '15', v], check=True)
    # exact number of samples = frames/30 * 48000, with 8 ms fades at both ends
    ns = round(d * SR)
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', str(p['in']), '-i', V, '-vn', '-ac', '2', '-ar', str(SR),
                    '-af', f'apad,atrim=end_sample={ns},afade=t=in:d=0.008,afade=t=out:st={d - 0.008}:d=0.008',
                    '-c:a', 'pcm_s16le', a], check=True)
    return v, a


with cf.ThreadPoolExecutor(4) as ex:
    res = list(ex.map(piece, range(len(E))))
open('seg2/v.txt', 'w').write("".join(f"file '{os.path.abspath(v)}'\n" for v, _ in res))
open('seg2/a.txt', 'w').write("".join(f"file '{os.path.abspath(a)}'\n" for _, a in res))
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'seg2/v.txt', '-c', 'copy', 'seg2/video.mp4'], check=True)
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'seg2/a.txt', '-c', 'copy', 'seg2/audio.wav'], check=True)
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', 'seg2/video.mp4', '-i', 'seg2/audio.wav', '-map', '0:v', '-map', '1:a',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', f'{OUT}/cut.mp4'], check=True)
tot = sum(p['frames'] for p in E)
print("frames", tot, "| expected audio samples", round(tot / 30 * SR))
