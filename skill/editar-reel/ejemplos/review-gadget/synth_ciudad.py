# SFX propios del gancho: ciudad.wav = ruido de calle CONTINUO desde el cuadro 0 hasta que se pone los audífonos,
# ahí se "cierra" (barrido de filtro hacia lo grave + caída) y queda en silencio total.
# Los tiempos salen de edicion/edl_final.json → correr después de pausa.py:  ~/.reels-toolkit/venv/bin/python edicion/synth_ciudad.py
import json
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt
SR = 44100; FPS = 30; rng = np.random.default_rng(3)
E = json.load(open('edicion/edl_final.json'))
cut_t = lambda k, t: E[k]['start'] / FPS + (t - E[k]['in'])     # segundo de la fuente → segundo del corte
CIERRA = cut_t(1, 27.98)     # termina "puestos" y sube las manos a las orejas
BARRIDO = 0.5                # el ruido se va apagando en medio segundo → silencio
f2 = lambda x, f, k: sosfilt(butter(2, f, k, fs=SR, output='sos'), x)
def save(n, x, pk=0.85):
    x = x / (np.abs(x).max() + 1e-9) * pk
    wavfile.write(f'public/sfx/{n}.wav', SR, (np.stack([x, x], 1) * 32767).astype(np.int16))
    return x

d = CIERRA + BARRIDO + 0.05; t = np.arange(int(d * SR)) / SR; n = len(t)
bump = lambda t0, w: np.exp(-((t - t0) / w) ** 2)
# tráfico: rumor grave constante con oleadas
brown = np.cumsum(rng.standard_normal(n)); brown = f2(brown - np.convolve(brown, np.ones(4410) / 4410, 'same'), 300, 'lowpass')
trafico = brown / np.abs(brown).max() * (0.75 + 0.25 * np.sin(2 * np.pi * 0.5 * t))
# camión / autobús: motor diésel grave con armónicos
motor = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) / (i + 1) for i, f in enumerate((38, 76, 114, 152)))
motor = f2(motor * (1 + 0.3 * np.sin(2 * np.pi * 9 * t)), 400, 'lowpass') * 0.25 * (0.6 + 0.4 * bump(2.4, 1.2))
# coches que pasan
pasa = f2(rng.standard_normal(n), [250, 2500], 'bandpass') * (bump(0.9, 0.45) * 0.9 + bump(3.2, 0.5) * 0.6)
# moto que pasa: zumbido con tono que baja (efecto Doppler)
fm = np.where(t < 1.9, 210, 150) + 40 * np.tanh((1.9 - t) * 3)
moto = f2(np.sign(np.sin(2 * np.pi * np.cumsum(fm) / SR)), [120, 3000], 'bandpass') * bump(1.9, 0.55) * 0.35
# sirena a lo lejos
fs = 750 + 350 * np.sin(2 * np.pi * 0.45 * t)
sirena = f2(np.sin(2 * np.pi * np.cumsum(fs) / SR), [500, 1500], 'bandpass') * 0.09 * np.clip(t / 1.5, 0, 1)
# murmullo de gente: bandas de voz moduladas al azar
mod = np.interp(t, np.linspace(0, d, 60), rng.uniform(0.3, 1, 60))
gente = f2(rng.standard_normal(n), [500, 1800], 'bandpass') * mod * 0.35
# claxons (dos tonos, diente de sierra filtrado)
def claxon(t0, dur, fr=(415, 523), g=0.7):
    tt = t - t0; env = f2(((tt > 0) & (tt < dur)).astype(float), 60, 'lowpass')
    return f2(sum(((f * tt) % 1 - 0.5) for f in fr) * env, [300, 3000], 'bandpass') * g
bocina = claxon(0.02, 0.22) + claxon(0.32, 0.55) + claxon(2.75, 0.3, (370, 466), 0.45)
# frenos de aire de camión (silbido agudo corto)
freno = f2(rng.standard_normal(n), [3500, 6000], 'bandpass') * bump(2.2, 0.18) * 0.5
x = trafico * 0.9 + motor + pasa + moto + sirena + gente + bocina + freno
x *= np.minimum(1, t / 0.02)
# cierre: filtro paso-bajas que baja de 8 kHz a 60 Hz en BARRIDO s (como cuando se sella el oído) y el nivel cae a cero
i0 = int(CIERRA * SR); ch = 40; m = n - i0
for i in range(ch):
    a, b = i0 + i * m // ch, i0 + (i + 1) * m // ch
    fc = 8000 * (60 / 8000) ** (i / (ch - 1))
    x[a:b] = f2(x[max(0, a - 4410):b], fc, 'lowpass')[-(b - a):]
k = np.clip((t - CIERRA) / BARRIDO, 0, 1)
x *= (1 - k) ** 2.2
save('ciudad', x, 0.9)
# anc: "pff" de presión al sellar el oído (barrido de ruido de 6 kHz a 80 Hz)
d = 0.45; t = np.arange(int(d * SR)) / SR; n = len(t)
nz = rng.standard_normal(n); out = np.zeros(n); ch = 30
for i in range(ch):
    a, b = i * n // ch, (i + 1) * n // ch; fc = 6000 * (80 / 6000) ** (i / (ch - 1))
    out[a:b] = f2(nz, fc, 'lowpass')[a:b]
out *= np.exp(-t * 6) * np.minimum(1, t / 0.01)
save('anc', out, 0.7)
json.dump(dict(cierra=round(CIERRA * FPS), silencio=round((CIERRA + BARRIDO) * FPS), fin=E[1]['start'] + E[1]['frames']),
          open('edicion/gancho_tiempos.json', 'w'))
print(f'✓ ciudad.wav {CIERRA + BARRIDO:.2f} s (se cierra en {CIERRA:.2f} s), anc.wav')
