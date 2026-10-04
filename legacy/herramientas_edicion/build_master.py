"""For each area video: render the interview master cut (original audio) and write the Remotion data files."""
import json
import os
import subprocess
import sys

D = "/Users/teddyarellano/Content Creator/Claude - Test/Interpolitecnicos Esports 2026/FEySS/Dia 2 - Entrevistas empresas"
ROOT = "/private/tmp/claude-501/-Users-teddyarellano-Content-Creator-Claude---Test-Interpolitecnicos-Esports-2026/ffc75327-f45f-470d-9505-ff4b08ed94cf/scratchpad"
LOUD = {"JARRITOS": -12.4, "PwC": -12.9, "AXTEL": -10.6, "GRUPO INIX": -12.4, "SNGULAR": -13.2, "E-GLOBAL": -12.0,
        "TCM PARTNERS": -12.1, "ALS GLOBAL": -14.2, "GRUPO SPIN": -10.3}
KEYS = {"JARRITOS": "jarritos", "PwC": "pwc", "AXTEL": "axtel", "GRUPO INIX": "inix", "SNGULAR": "sngular",
        "E-GLOBAL": "eglobal", "TCM PARTNERS": "tcm", "ALS GLOBAL": "als", "GRUPO SPIN": "spin"}
FIX = {"iGlobal,": "e-global,", "inters": "interns", "Singular": "Sngular", "mecatrónicas,": "mecatrónica,",
       "busca?": "buscan?"}

for g in sys.argv[1:]:
    E = json.load(open(f'{ROOT}/dia2/edl_{g}.json'))
    out_dir = f'{ROOT}/dia2_{g}'
    os.makedirs(f'{out_dir}/public', exist_ok=True)
    os.makedirs(f'{out_dir}/src', exist_ok=True)
    srcs = sorted(set(p['src'] for p in E))
    idx = {s: i for i, s in enumerate(srcs)}
    inputs = []
    for s in srcs:
        inputs += ['-i', f"{D}/IMG_{s}.MOV"]
    t = 0
    vl, al = [], []
    for k, p in enumerate(E):
        nf = round((p['out'] - p['in']) * 30)
        d = nf / 30
        p['frames'] = nf
        p['start'] = t
        t += nf
        i = idx[p['src']]
        vl.append(f"[{i}:v]trim=start={p['in']}:duration={d},setpts=PTS-STARTPTS,fps=30,scale=1440:2560:flags=lanczos[v{k}]")
        al.append(f"[{i}:a]atrim=start={p['in']}:duration={d},asetpts=PTS-STARTPTS,"
                  f"afade=t=in:d=0.008,afade=t=out:st={d - 0.008}:d=0.008[a{k}]")
    n = len(E)
    fc = ";".join(vl + al) + ";" + "".join(f"[v{k}][a{k}]" for k in range(n)) + \
        f"concat=n={n}:v=1:a=1[cv][oa];[cv]eq=contrast=1.04:saturation=1.08[ov]"
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', *inputs, '-filter_complex', fc, '-map', '[ov]', '-map', '[oa]',
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-g', '15',
                    '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', f'{out_dir}/public/cut.mp4'], check=True)

    words = []
    for k, p in enumerate(E):
        t0 = p['start'] / 30
        ws = p['words']
        for j, w in enumerate(ws):
            st = t0 + max(0, w[1] - p['in'])
            en = t0 + (ws[j + 1][1] - p['in']) if j + 1 < len(ws) else t0 + p['frames'] / 30
            words.append({"piece": k, "company": p['company'], "role": p['role'], "text": FIX.get(w[0], w[0]),
                          "start": round(st, 3), "end": round(min(en, st + 1.2), 3)})
    comps = []
    for p in E:
        if not comps or comps[-1]['name'] != p['name']:
            comps.append({"name": p['name'], "key": KEYS[p['name']], "start": p['start'], "end": p['start'] + p['frames'],
                          "gain": round(10 ** ((-13.5 - LOUD[p['name']]) / 20), 3)})
        else:
            comps[-1]['end'] = p['start'] + p['frames']
    pieces = [{"start": p['start'], "frames": p['frames'], "company": p['company'], "src": p['src']} for p in E]
    json.dump(words, open(f'{out_dir}/src/words.json', 'w'), ensure_ascii=False, indent=0)
    json.dump(comps, open(f'{out_dir}/src/companies.json', 'w'), ensure_ascii=False, indent=1)
    json.dump(pieces, open(f'{out_dir}/src/pieces.json', 'w'), indent=0)
    json.dump(E, open(f'{ROOT}/dia2/edl_{g}_final.json', 'w'), ensure_ascii=False, indent=1)
    print(g, "frames", t, round(t / 30, 1), "s", [c['name'] for c in comps])
