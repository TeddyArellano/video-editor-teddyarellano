"""v3 master (video from Apple-tonemapped SDR BT.709 copies, no colour grading): drop micro-fragments, play the less important stretch of Juan at 2x (pitch preserved), sample-exact sync."""
import concurrent.futures as cf
import json
import os
import subprocess

D = "/Users/teddyarellano/Content Creator/Claude - Test/Interpolitecnicos Esports 2026/Qué lleva en su mochila"
OUT = "../moch_edit/public"
SR = 48000
E = json.load(open('edl_final_v1.json'))
FAST = set(range(10, 26))     # pila … botella del Pura
KEEP_SHORT = {18}             # "un" (of "un inhalador")
pieces = []
for k, p in enumerate(E):
    if p['out'] - p['in'] < 0.25 and k not in KEEP_SHORT:
        continue
    q = {key: v for key, v in p.items() if key not in ('frames', 'start')}
    q['speed'] = 2.0 if k in FAST else 1.0
    q['orig'] = k
    pieces.append(q)
t = 0
for p in pieces:
    p['frames'] = round((p['out'] - p['in']) * 30 / p['speed'])
    p['start'] = t
    t += p['frames']
os.makedirs('seg3', exist_ok=True)


def build(i):
    p = pieces[i]
    src = f"{D}/{p['src']}.MOV"
    n = p['frames']
    d = n / 30
    src_d = p['out'] - p['in']
    vf = f"setpts=PTS/{p['speed']},fps=30"
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', str(p['in']), '-t', str(src_d + 0.2), '-i', f"sdr/{p['src']}.mp4",
                    '-frames:v', str(n), '-an', '-vf', vf, '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-g', '15', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
                    f'seg3/{i:03d}.mp4'], check=True)
    tempo = f"atempo={p['speed']}," if p['speed'] != 1 else ""
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', str(p['in']), '-t', str(src_d + 0.2), '-i', src, '-vn', '-ac', '2', '-ar', str(SR),
                    '-af', f"{tempo}apad,atrim=end_sample={round(d * SR)},afade=t=in:d=0.008,afade=t=out:st={d - 0.008}:d=0.008",
                    '-c:a', 'pcm_s16le', f'seg3/{i:03d}.wav'], check=True)


with cf.ThreadPoolExecutor(4) as ex:
    list(ex.map(build, range(len(pieces))))
open('seg3/v.txt', 'w').write("".join(f"file '{os.path.abspath(f'seg3/{i:03d}.mp4')}'\n" for i in range(len(pieces))))
open('seg3/a.txt', 'w').write("".join(f"file '{os.path.abspath(f'seg3/{i:03d}.wav')}'\n" for i in range(len(pieces))))
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'seg3/v.txt', '-c', 'copy', 'seg3/video.mp4'], check=True)
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'seg3/a.txt', '-c', 'copy', 'seg3/audio.wav'], check=True)
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', 'seg3/video.mp4', '-i', 'seg3/audio.wav', '-map', '0:v', '-map', '1:a',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', f'{OUT}/cut.mp4'], check=True)
json.dump(pieces, open('edl_final.json', 'w'), ensure_ascii=False, indent=1)
print("pieces", len(pieces), "| frames", t, round(t / 30, 1), "s")
