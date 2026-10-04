"""Música original para promos (sin derechos): base electrónica 120 BPM, Am–F–C–G, con drop y golpe final.

Uso:  python synth_musica.py public/music.wav --dur 30 [--bpm 120] [--drop 16.5] [--fin 28.7]
  --drop: segundo donde entra el arpegio + golpe (tras un riser)
  --fin:  segundo del golpe final (después solo cola del pad). Por defecto dur-1.3
En Remotion va a ~0.12 de volumen (~13 LU debajo de la voz). Solo para promos: entrevistas/humor/unboxing van sin música.
"""
import argparse

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

ap = argparse.ArgumentParser()
ap.add_argument('out'); ap.add_argument('--dur', type=float, required=True); ap.add_argument('--bpm', type=float, default=120)
ap.add_argument('--drop', type=float); ap.add_argument('--fin', type=float)
a = ap.parse_args()
SR = 44100
rng = np.random.default_rng(7)
T = lambda d: np.arange(int(d * SR)) / SR
lp = lambda x, f: sosfilt(butter(2, f, 'lowpass', fs=SR, output='sos'), x)
hp = lambda x, f: sosfilt(butter(2, f, 'highpass', fs=SR, output='sos'), x)
bp = lambda x, lo, hi: sosfilt(butter(2, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
DUR = a.dur; beat = 60 / a.bpm; END = a.fin or DUR - 1.3; DROP = a.drop or DUR * 0.48
n = int(DUR * SR); t = np.arange(n) / SR
L = np.zeros(n); R = np.zeros(n)


def add(buf, x, at):
    i = int(at * SR); j = min(n, i + len(x))
    if 0 <= i < n:
        buf[i:j] += x[:j - i]


def sweep_noise(d, f0, f1, bw=0.6, chunks=40):
    m = int(d * SR); noise = rng.standard_normal(m + SR); out = np.zeros(m)
    e = np.linspace(0, m, chunks + 1).astype(int)
    for i in range(chunks):
        f = f0 * (f1 / f0) ** (i / chunks)
        out[e[i]:e[i + 1]] = bp(noise[:e[i + 1] + 2000], max(30, f * 0.7), min(SR / 2 - 100, f * 1.3))[e[i]:e[i + 1]]
    return out


tt = T(0.4); K = np.sin(2 * np.pi * np.cumsum(45 + 110 * np.exp(-tt * 35)) / SR) * np.exp(-tt * 9)
tt = T(0.25); C = bp(rng.standard_normal(len(tt)), 900, 3500) * (np.exp(-tt * 25) + 0.6 * np.exp(-np.maximum(tt - 0.012, 0) * 30) * (tt > 0.012))
hat = lambda o: hp(rng.standard_normal(len(T(0.15 if o else 0.04))), 7000) * np.exp(-T(0.15 if o else 0.04) * (18 if o else 90))
nb = int(DUR / beat)
for b in range(nb):
    tb = b * beat
    if tb >= END + 0.01:
        break
    add(L, K * 0.9, tb); add(R, K * 0.9, tb)
    if b % 2:
        add(L, C * 0.55, tb); add(R, C * 0.5, tb + 0.004)
    for h in range(2):
        hh = hat(h == 1) * (0.18 if h else 0.1); add(L, hh * 0.8, tb + h * beat / 2); add(R, hh, tb + h * beat / 2)
sc = np.ones(n)
for b in range(nb):
    i = int(b * beat * SR); m = int(0.3 * SR); j = min(n, i + m)
    sc[i:j] = np.minimum(sc[i:j], 0.25 + 0.75 * (np.arange(j - i) / m) ** 0.6)
roots = [55.0, 43.65, 65.41, 49.0]
chords = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392.0], [196.0, 246.94, 293.66]]
sub = np.zeros(n); pad = np.zeros(n); arp = np.zeros(n); bar = 4 * beat
for k in range(int(DUR / bar) + 1):
    i0 = int(k * bar * SR); i1 = min(n, int((k + 1) * bar * SR))
    if i0 >= n:
        break
    ta = np.arange(i1 - i0) / SR; ix = k % 4
    sub[i0:i1] = np.sin(2 * np.pi * roots[ix] * ta) + 0.3 * np.sin(4 * np.pi * roots[ix] * ta)
    for f in chords[ix]:
        for dt in (-0.12, 0.0, 0.13):
            pad[i0:i1] += (2 * ((ta * f * (1 + dt / 100)) % 1.0) - 1) * 0.1
    for j in range(16):
        f = chords[ix][j % 3] * (2 if j % 4 == 3 else 1)
        a0 = i0 + int(j * beat / 4 * SR); a1 = min(n, a0 + int(beat / 4 * SR))
        if a0 >= n:
            break
        tq = np.arange(a1 - a0) / SR; arp[a0:a1] += np.sign(np.sin(2 * np.pi * f * 2 * tq)) * np.exp(-tq * 18) * 0.5
pad = lp(pad, 1400); arp = lp(arp, 3000)
tail = np.where(t < END, 1.0, np.exp(-(t - END) * 1.2))
mix = sub * sc * 0.45 * (t < END) + pad * (0.5 + 0.5 * sc) * 0.55 * tail
L += mix + arp * sc * 0.18 * ((t >= DROP) & (t < END)); R += mix * 0.95 + arp * sc * 0.22 * ((t >= DROP) & (t < END))
rs = sweep_noise(1.6, 400, 9000, 0.8) * (T(1.6) / 1.6) ** 2.2 * 0.25
add(L, rs, DROP - 1.6); add(R, rs, DROP - 1.6)
tt = T(1.4); boom = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-tt * 9)) / SR) * np.exp(-tt * 3.2) * 0.8
for at in (DROP, END):
    add(L, boom, at); add(R, boom, at)
env = np.clip(t / 0.05, 0, 1) * np.clip((DUR - t) / 0.8, 0, 1)
M = np.stack([L * env, R * env], 1); M = M / np.abs(M).max() * 0.89
wavfile.write(a.out, SR, (M * 32767).astype(np.int16))
print('música ok →', a.out, f'{DUR:.1f}s drop {DROP:.1f}s fin {END:.1f}s')
