"""Todos los SFX de /editar-reel, sintetizados (sin derechos de autor).

Uso:  python synth_sfx.py <carpeta_salida>

Limpios (entrevistas, unboxing, promo):
  whoosh, whoosh2, pop, click, impact, riser, glitch, cash (caja registradora), beep (censura 1 kHz)
Comedia (humor, TikTok):
  ding (contador), boom (tipo vine boom), scratch (disco rayado), crickets (grillos), coin (moneda 8-bit),
  boing, tada, ffwd (adelantar cinta → cámara rápida), trombone (trombón triste)
Vlog / tensión (IEEE ESCOM):
  shutter (obturador de cámara, ráfagas de fotos), tension_reloj (tic-tac que se acelera + zumbido, 1.3 s),
  succion (barrido en reversa que termina en seco, 0.55 s), braam (golpe grave de tráiler + sub que cae, 1.9 s)
Teclado (AWS SCD):
  tecla1–tecla4 (tecla mecánica; 2 por letra al "escribir" un comentario), tecla_enter (enviar)
"""
import os
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

OUT = sys.argv[1] if len(sys.argv) > 1 else 'public/sfx'
os.makedirs(OUT, exist_ok=True)
SR = 44100
rng = np.random.default_rng(7)
T = lambda d: np.arange(int(d * SR)) / SR
lp = lambda x, f: sosfilt(butter(2, f, 'lowpass', fs=SR, output='sos'), x)
hp = lambda x, f: sosfilt(butter(2, f, 'highpass', fs=SR, output='sos'), x)
bp = lambda x, a, b: sosfilt(butter(2, [a, b], 'bandpass', fs=SR, output='sos'), x)
sq = lambda f, t: np.sign(np.sin(2 * np.pi * f * t))


def save(n, x, pk=0.85):
    x = np.asarray(x, dtype=float)
    x = x / (np.abs(x).max() + 1e-9) * pk
    wavfile.write(f'{OUT}/{n}.wav', SR, (np.stack([x, x], 1) * 32767).astype(np.int16))


def sweep_noise(d, f0, f1, bw=0.6, chunks=40):
    n = int(d * SR); noise = rng.standard_normal(n + SR); out = np.zeros(n)
    edges = np.linspace(0, n, chunks + 1).astype(int)
    for i in range(chunks):
        f = f0 * (f1 / f0) ** (i / chunks)
        lo, hi = max(30, f * (1 - bw / 2)), min(SR / 2 - 100, f * (1 + bw / 2))
        out[edges[i]:edges[i + 1]] = bp(noise[:edges[i + 1] + 2000], lo, hi)[edges[i]:edges[i + 1]]
    return out


# ---------- limpios ----------
d = 0.45; t = T(d)
save('whoosh', sweep_noise(d, 300, 3500) * np.sin(np.pi * t / d) ** 2 * np.exp(-t * 1.5), 0.8)
save('whoosh2', sweep_noise(0.35, 2500, 250) * np.sin(np.pi * T(0.35) / 0.35) ** 1.5, 0.75)
d = 0.12; t = T(d)
save('pop', np.sin(2 * np.pi * np.cumsum(500 + 900 * t / d) / SR) * np.exp(-t * 35) + 0.2 * hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 120), 0.7)
t = T(0.05)
save('click', hp(rng.standard_normal(len(t)), 2000) * np.exp(-t * 250) + np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 150), 0.6)
t = T(1.4)
save('impact', np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-t * 9)) / SR) * np.exp(-t * 3.2)
     + 0.5 * lp(rng.standard_normal(len(t)), 5000) * np.exp(-t * 40) + 0.25 * lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 4), 0.95)
d = 1.6; t = T(d)
save('riser', sweep_noise(d, 400, 9000, 0.8) * (t / d) ** 2.2 + np.sin(2 * np.pi * np.cumsum(200 * 8 ** (t / d)) / SR) * (t / d) ** 3 * 0.25, 0.7)
t = T(0.3)
g = np.sign(np.sin(2 * np.pi * np.cumsum(np.repeat(rng.uniform(80, 900, 15), len(t) // 15 + 1)[:len(t)]) / SR))
g = g * np.repeat(rng.integers(0, 2, 30), len(t) // 30 + 1)[:len(t)] * np.exp(-t * 6)
save('glitch', lp(g + 0.5 * rng.standard_normal(len(t)), 6000), 0.5)
t = T(0.9)  # caja registradora: clic mecánico + campana
bell = sum(np.sin(2 * np.pi * f * t) * a for f, a in ((2093, 1), (2637, 0.6), (3136, 0.4))) * np.exp(-np.clip(t - 0.12, 0, None) * 5) * (t > 0.12)
save('cash', bell + 0.6 * hp(rng.standard_normal(len(t)), 2500) * (np.exp(-t * 60) + np.exp(-np.clip(t - 0.06, 0, None) * 60) * (t > 0.06)), 0.6)
t = T(1.0)
save('beep', np.sin(2 * np.pi * 1000 * t) * np.clip(np.minimum(t, 1 - t) / 0.005, 0, 1), 0.5)

# ---------- comedia ----------
t = T(1.6); f = 40 + 90 * np.exp(-t * 7)
save('boom', np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) + 0.35 * lp(rng.standard_normal(len(t)), 300) * np.exp(-t * 3)
     + 0.4 * np.tanh(3 * np.sin(2 * np.pi * np.cumsum(f * 2) / SR)) * np.exp(-t * 5), 0.95)
t = T(0.55); x = rng.standard_normal(len(t)); out = np.zeros_like(t); n = len(t); ch = 22
for i in range(ch):
    a, b = int(i * n / ch), int((i + 1) * n / ch)
    fc = 600 + 2800 * abs(np.sin(np.pi * (i / ch) * 2.2))
    out[a:b] = bp(x[:b + 500], fc * 0.7, min(fc * 1.4, 20000))[a:b]
save('scratch', out * np.sin(np.pi * t / 0.55) ** 0.6, 0.7)
t = T(2.2); c = np.zeros_like(t)
for start in np.arange(0.05, 2.1, 0.42):
    for k in range(4):
        tt = t - (start + k * 0.045); on = (tt >= 0) & (tt < 0.03)
        c += on * np.sin(2 * np.pi * 4600 * tt) * np.sin(np.pi * np.clip(tt / 0.03, 0, 1))
save('crickets', c, 0.5)
t = T(0.25)
save('ding', np.sin(2 * np.pi * 1760 * t) * np.exp(-t * 30) + 0.4 * np.sin(2 * np.pi * 2640 * t) * np.exp(-t * 40), 0.55)
t = T(0.45)
save('coin', lp(np.where(t < 0.08, sq(988, t), sq(1319, t)) * np.exp(-np.clip(t - 0.08, 0, None) * 6), 6000), 0.45)
t = T(0.7); f = 220 + 180 * np.exp(-t * 5) * (1 + 0.35 * np.sin(2 * np.pi * 14 * t))
save('boing', np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.5), 0.7)
brass = lambda f, t: sum(np.sign(np.sin(2 * np.pi * f * h * t)) * (0.6 ** h) for h in (1, 2, 3))
t = T(1.1); x = np.zeros_like(t)
for at, chord, ln in ((0.0, [523, 659, 784], 0.16), (0.2, [659, 784, 1047], 0.9)):
    tt = t - at; on = (tt >= 0) & (tt < ln)
    for f in chord:
        x += on * brass(f, np.clip(tt, 0, None)) * np.exp(-np.clip(tt, 0, None) * 2.2)
save('tada', lp(x, 4500), 0.55)
t = T(0.6); f = 300 * np.exp(t * 3.2)
save('ffwd', (0.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * bp(rng.standard_normal(len(t)), 1500, 6000)) * np.sin(np.pi * t / 0.6), 0.45)
t = T(2.0); x = np.zeros_like(t)
for i, (f, at, ln) in enumerate(((392, 0, 0.35), (370, 0.38, 0.35), (349, 0.76, 0.35), (330, 1.14, 0.85))):
    tt = t - at; on = (tt >= 0) & (tt < ln)
    ff = f * (1 + (0.03 * np.sin(2 * np.pi * 6 * np.clip(tt, 0, None)) if i == 3 else 0))
    x += on * sum(np.sin(2 * np.pi * np.cumsum(np.where(on, ff, 0)) / SR * h) * (0.5 ** h) for h in (1, 2, 3, 4)) * np.exp(-np.clip(tt, 0, None) * 1.5)
save('trombone', lp(x, 2500), 0.6)

# ---- vlog / tensión
t = T(0.35)
def _click(t0, amp, dec):
    x = np.zeros_like(t); m = t >= t0; tt = t[m] - t0
    n = np.convolve(rng.standard_normal(m.sum()), np.ones(4) / 4, 'same')
    x[m] = amp * n * np.exp(-tt / dec) + amp * 0.6 * np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt / (dec * 0.6)); return x
save('shutter', _click(0, 0.9, 0.006) + _click(0.012, 0.4, 0.03) + _click(0.085, 0.8, 0.007) + _click(0.095, 0.3, 0.025), 0.9)
D = 1.3; t = T(D); x = np.zeros_like(t); tk, k, iv = 0.0, 0, 0.27
while tk < D - 0.02:
    n0 = int(tk * SR); tt = np.arange(int(0.035 * SR)) / SR
    c = (np.sin(2 * np.pi * (2600 if k % 2 == 0 else 1900) * tt) * 0.7 + rng.standard_normal(len(tt)) * 0.5) * np.exp(-tt / 0.006)
    e = min(len(x), n0 + len(tt)); x[n0:e] += (0.55 + 0.45 * tk / D) * c[:e - n0]
    tk += iv; iv = max(0.085, iv * 0.86); k += 1
save('tension_reloj', x + (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 110.4 * t)) * (0.08 + 0.32 * (t / D) ** 2) * (1 + 0.25 * np.sin(2 * np.pi * 6 * t)), 0.8)
D = 0.55; t = T(D); x = rng.standard_normal(len(t)) * (t / D) ** 2.5; y = np.zeros_like(x)
for i, ch in enumerate(np.array_split(np.arange(len(x)), 20)):
    y[ch] = lp(x, 300 + 7000 * ((i + 1) / 20) ** 2)[ch]
save('succion', y, 0.75)
D = 1.9; t = T(D); saw = lambda f: 2 * ((f * t) % 1) - 1
br = np.tanh(sum(saw(f * d) for f in (49, 73.5, 98) for d in (0.993, 1.0, 1.007)) * 0.6) * np.minimum(1, t / 0.015) * np.exp(-t / 0.75)
sub = np.sin(2 * np.pi * np.cumsum(62 * np.exp(-t / 0.5) + 34) / SR) * np.exp(-t / 0.65) * 1.3
save('braam', lp(br, 700) + sub + rng.standard_normal(len(t)) * np.exp(-t / 0.018) * 0.9, 0.95)
print('sfx ok →', OUT, sorted(os.listdir(OUT)))

# Teclado mecánico (AWS Student Community Day: caja de comentario que escribe "AMAZON").
# Chasquido agudo del switch + "thock" grave de la tecla tocando fondo + rebote. tecla1–4 varían; tecla_enter es más fuerte.
def _tecla(seed, fuerte=False):
    r = np.random.default_rng(seed); t = T(0.14 if fuerte else 0.09); n = len(t)
    click = bp(r.standard_normal(n), 2500, 9000) * np.exp(-t / 0.004)
    thock = np.sin(2 * np.pi * (180 + r.uniform(-25, 25)) * t) * np.exp(-t / (0.03 if fuerte else 0.018))
    body = bp(r.standard_normal(n), 400, 1800) * np.exp(-t / 0.012)
    d = int(SR * r.uniform(0.018, 0.03)); reb = np.zeros(n); reb[d:] = (bp(r.standard_normal(n), 3000, 8000) * np.exp(-t / 0.002))[:n - d] * 0.35
    return click * 0.9 + thock * (1.0 if fuerte else 0.55) + body * 0.5 + reb
for i in range(4):
    save(f'tecla{i + 1}', _tecla(11 + i), 0.9)
save('tecla_enter', _tecla(99, fuerte=True), 0.9)
