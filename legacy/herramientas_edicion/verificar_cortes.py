"""Re-transcribe every piece of an EDL to confirm no word was clipped at the cut points.

Uso:  python verificar_cortes.py edl.json carpeta_audios modelo.bin
      (carpeta_audios contiene IMG_XXXX.wav a 16 kHz mono, uno por video fuente)
"""
import json
import subprocess
import sys

edl, aud, model = sys.argv[1], sys.argv[2], sys.argv[3]
for k, p in enumerate(json.load(open(edl))):
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', str(p['in']), '-to', str(p['out']),
                    '-i', f"{aud}/IMG_{p['src']}.wav", '-af', 'adelay=300,apad=pad_dur=0.5', '/tmp/_piece.wav'])
    got = subprocess.run(['whisper-cli', '-m', model, '-f', '/tmp/_piece.wav', '-l', 'es', '-np', '-nt', '-t', '8'],
                         capture_output=True, text=True).stdout.strip()
    print(f"{k:2d} {p['in']:7.2f}-{p['out']:7.2f}\n   quiero: {p['text']}\n   oigo:   {got}")
