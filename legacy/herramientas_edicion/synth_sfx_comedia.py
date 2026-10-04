"""SFX estilo TikTok/humor sintetizados (sin derechos de autor). Usado en "Qué lleva en su mochila".

Uso:  python synth_sfx_comedia.py public/sfx
Genera: ding (contador), boom (tipo vine boom), scratch (disco rayado), crickets (grillos), coin (moneda 8-bit),
        boing (resorte de caricatura), tada (fanfarria), ffwd (adelantar cinta, para cámara rápida), trombone (trombón triste).
pop / whoosh / whoosh2 / cash / beep / impact están en synth_sfx_musica.py.
"""
import os
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

OUT = sys.argv[1] if len(sys.argv) > 1 else 'public/sfx'
os.makedirs(OUT, exist_ok=True)
SR = 44100
rng = np.random.default_rng(11)
T = lambda d: np.arange(int(d * SR)) / SR
lp = lambda x, f: sosfilt(butter(2, f, 'lowpass', fs=SR, output='sos'), x)
bp = lambda x, a, b: sosfilt(butter(2, [a, b], 'bandpass', fs=SR, output='sos'), x)
sq = lambda f, t: np.sign(np.sin(2 * np.pi * f * t))


def save(n, x, pk=0.85):
    x = x / np.abs(x).max() * pk
    wavfile.write(f'{OUT}/{n}.wav', SR, (np.stack([x, x], 1) * 32767).astype(np.int16))


# vine-boom: golpe grave que baja de tono con cola larga
t = T(1.6); f = 40 + 90 * np.exp(-t * 7)
boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
boom += 0.35 * lp(rng.standard_normal(len(t)), 300) * np.exp(-t * 3) + 0.4 * np.tanh(3 * np.sin(2 * np.pi * np.cumsum(f * 2) / SR)) * np.exp(-t * 5)
save('boom', boom, 0.95)
# disco rayado: ruido con banda que sube y baja rápido
t = T(0.55); x = rng.standard_normal(len(t)); out = np.zeros_like(t); n = len(t); ch = 22
for i in range(ch):
    a, b = int(i * n / ch), int((i + 1) * n / ch)
    fc = 600 + 2800 * abs(np.sin(np.pi * (i / ch) * 2.2))
    out[a:b] = bp(x[:b + 500], fc * 0.7, min(fc * 1.4, 20000))[a:b]
save('scratch', out * np.sin(np.pi * t / 0.55) ** 0.6, 0.7)
# grillos (silencio incómodo)
t = T(2.2); c = np.zeros_like(t)
for start in np.arange(0.05, 2.1, 0.42):
    for k in range(4):
        tt = t - (start + k * 0.045); on = (tt >= 0) & (tt < 0.03)
        c += on * np.sin(2 * np.pi * 4600 * tt) * np.sin(np.pi * np.clip(tt / 0.03, 0, 1))
save('crickets', c, 0.5)
# ding corto para cada objeto del contador
t = T(0.25)
save('ding', np.sin(2 * np.pi * 1760 * t) * np.exp(-t * 30) + 0.4 * np.sin(2 * np.pi * 2640 * t) * np.exp(-t * 40), 0.55)
# moneda 8-bit (B5 -> E6)
t = T(0.45); x = np.where(t < 0.08, sq(988, t), sq(1319, t)) * np.exp(-np.clip(t - 0.08, 0, None) * 6)
save('coin', lp(x, 6000), 0.45)
# boing de caricatura
t = T(0.7); f = 220 + 180 * np.exp(-t * 5) * (1 + 0.35 * np.sin(2 * np.pi * 14 * t))
save('boing', np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.5), 0.7)
# fanfarria "ta-da"
brass = lambda f, t: sum(np.sign(np.sin(2 * np.pi * f * h * t)) * (0.6 ** h) for h in (1, 2, 3))
t = T(1.1); x = np.zeros_like(t)
for at, chord, ln in ((0.0, [523, 659, 784], 0.16), (0.2, [659, 784, 1047], 0.9)):
    tt = t - at; on = (tt >= 0) & (tt < ln)
    for f in chord:
        x += on * brass(f, np.clip(tt, 0, None)) * np.exp(-np.clip(tt, 0, None) * 2.2)
save('tada', lp(x, 4500), 0.55)
# adelantar cinta (entrada a cámara rápida)
t = T(0.6); f = 300 * np.exp(t * 3.2)
x = 0.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * bp(rng.standard_normal(len(t)), 1500, 6000)
save('ffwd', x * np.sin(np.pi * t / 0.6), 0.45)
# trombón triste (wah wah wah waaah)
t = T(2.0); x = np.zeros_like(t)
for i, (f, at, ln) in enumerate(((392, 0, 0.35), (370, 0.38, 0.35), (349, 0.76, 0.35), (330, 1.14, 0.85))):
    tt = t - at; on = (tt >= 0) & (tt < ln)
    ff = f * (1 + (0.03 * np.sin(2 * np.pi * 6 * np.clip(tt, 0, None)) if i == 3 else 0))
    x += on * sum(np.sin(2 * np.pi * np.cumsum(np.where(on, ff, 0)) / SR * h) * (0.5 ** h) for h in (1, 2, 3, 4)) * np.exp(-np.clip(tt, 0, None) * 1.5)
save('trombone', lp(x, 2500), 0.6)
print('ok →', OUT)
