# Seguimiento de Teddy + zoom automático con ENCUADRE FIJO. Se corre DESPUÉS de `reel datos` (desde proyecto_remotion):
#   ~/.reels-toolkit/venv/bin/python edicion/seguimiento.py
# 1) quita el "de" que sobra tras el fix "ocurre"→"curé mi" (Whisper oyó "no ocurre de"; se dijo "no curé mi");
# 2) sigue la silueta (Vision personmatte; el detector de caras lo pierde de perfil/lejos): data.track = centro de la cara, data.head = coronilla;
# 3) data.zt = zoom por cuadro para que Teddy mida SIEMPRE lo mismo en pantalla (encuadre de referencia: cara ≈ 0.111 de la altura, cuerpo ≈ 0.68):
#    zoom = 0.111 / tamaño_de_cara_en_la_toma, entre 1.0 y ZMAX, suavizado dentro de cada clip (nunca a través de un corte).
import json, subprocess, shutil, sys, numpy as np
from pathlib import Path
from PIL import Image
from scipy import ndimage

import hashlib; T = Path("/private/tmp/claude-501") / ("seg_" + hashlib.md5(str(Path.cwd()).encode()).hexdigest()[:8]); T.mkdir(parents=True, exist_ok=True); BIN = Path.home() / ".reels-toolkit/bin"
OBJ = 0.111      # tamaño de cara objetivo (fracción de la altura de pantalla)
ZMAX = 3.0       # más que esto el corte (1440×2560) se ve blando
RAT = 0.152      # cara / altura de la silueta, medido en las tomas donde se ven las dos
P = Path("src/data.json"); d = json.load(open(P)); n = d["n"]
E = json.load(open("edicion/edl_final.json"))

w = d["words"]
d["words"] = [x for i, x in enumerate(w) if not (x["text"] == "de" and i > 0 and w[i-1]["text"] == "curé mi")]

def run(*a): subprocess.run([str(x) for x in a], check=True, capture_output=True)
if "--nuevo" in sys.argv or not (T / "pmh").exists():
    for sub in ("ffh", "pmh", "tiles", "tm"): shutil.rmtree(T / sub, ignore_errors=True)
    (T / "ffh").mkdir(parents=True); (T / "tiles").mkdir(parents=True)
    run("ffmpeg", "-v", "error", "-i", "public/cut.mp4", "-vf", "fps=5,scale=1080:1920", "-q:v", "3", T / "ffh/%05d.jpg")
    run(BIN / "personmatte", T / "ffh", T / "pmh", 270, 480)
    run(BIN / "faces", T / "ffh", T / "faces_full.json")

def biggest(a, minpx=30):
    lab, k = ndimage.label(a); best, bs = None, 0
    for j, sl in enumerate(ndimage.find_objects(lab), 1):
        h, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start; sz = int((lab[sl] == j).sum())
        if sz >= minpx and h >= 1.2 * ww and sl[0].start < 0.6 * a.shape[0] and sz > bs: best, bs = (lab == j), sz
    return best

files = sorted((T / "pmh").glob("*.png")); src = sorted((T / "ffh").glob("*.jpg"))
mat = [biggest(np.array(Image.open(f))[:, :, 3] > 128) for f in files]
# teselas ampliadas ×2 de los cuadros donde Vision no ve a nadie (está muy lejos)
if "--nuevo" in sys.argv or not (T / "tm").exists():
    for i, m in enumerate(mat):
        if m is None:
            im = Image.open(src[i])
            for t, x0 in enumerate((0, 270, 540)):
                im.crop((x0, 150, x0 + 540, 1110)).resize((1080, 1920), Image.LANCZOS).save(T / "tiles" / f"{i:05d}_{t}.jpg", quality=92)
    run(BIN / "personmatte", T / "tiles", T / "tm", 270, 480)
    run(BIN / "faces", T / "tiles", T / "faces_tiles.json")
FF = json.load(open(T / "faces_full.json"))
FT = json.load(open(T / "faces_tiles.json"))
names = sorted(x.name for x in (T / "tiles").glob("*.jpg"))
CARAS = {}
for nm, fr in zip(names, FT):
    i, t = int(nm[:5]), int(nm[6])
    for (u, v, sz) in fr: CARAS.setdefault(i, []).append(((t * 270 + u * 540) / 1080, (150 + v * 960) / 1920, sz * 0.5))

# clip fuente de cada cuadro (el zoom y los huecos se resuelven dentro de cada clip)
src_of = np.empty(n, dtype=object)
for p in E: src_of[p["start"]:p["start"] + p["frames"]] = p["src"]
# posiciones medidas a mano en las tomas diminutas donde nadie detecta nada: clip → (x_ini, x_fin, coronilla, cara)
MANUAL = {"IMG_2056": (0.47, 0.47, 0.445, 0.465), "IMG_2057": (0.47, 0.49, 0.460, 0.480)}

m = len(files)
hx, hy, fx, fy, sz = [np.nan] * m, [np.nan] * m, [np.nan] * m, [np.nan] * m, [np.nan] * m
for i in range(m):
    if mat[i] is not None:
        ys, xs = np.nonzero(mat[i]); top, bot = ys.min(), ys.max(); ph = max(1, bot - top); cab = ys < top + 0.12 * ph
        hx[i] = fx[i] = xs[cab].mean() / 270; hy[i] = top / 480; fy[i] = (top + 0.08 * ph) / 480; sz[i] = RAT * ph / 480
    else:
        best = None
        for t, x0 in enumerate((0, 270, 540)):
            f = T / "tm" / f"{i:05d}_{t}.png"
            if f.exists():
                mm = biggest(np.array(Image.open(f))[:, :, 3] > 128, 40)
                if mm is not None:
                    ys, xs = np.nonzero(mm)
                    if best is None or len(ys) > best[0]:
                        top, bot = ys.min(), ys.max(); ph = max(1, bot - top); cab = ys < top + 0.12 * ph
                        best = (len(ys), (x0 + xs[cab].mean() * 2) / 1080, (150 + top * 2) / 1920, ph * 2 / 1920)
        if best:
            hx[i] = fx[i] = best[1]; hy[i] = best[2]; fy[i] = best[2] + 0.08 * best[3]; sz[i] = RAT * best[3]
        elif i in CARAS:
            c = CARAS[i][0]; hx[i] = fx[i] = c[0]; hy[i] = c[1] - c[2]; fy[i] = c[1]; sz[i] = c[2] * 0.9
    if i < len(FF) and FF[i]:
        sz[i] = max(x[2] for x in FF[i])      # cuando la cara se detecta, su tamaño medido manda
# huecos con posición manual (por clip)
for i in range(m):
    f0 = min(n - 1, i * 6)
    if np.isnan(hx[i]) and src_of[f0] in MANUAL:
        x0, x1, ht, fc = MANUAL[src_of[f0]]; idx = [j for j in range(m) if src_of[min(n - 1, j * 6)] == src_of[f0]]
        x = x0 + (x1 - x0) * (idx.index(i) / max(1, len(idx) - 1)); hx[i] = fx[i] = x; hy[i] = ht; fy[i] = fc; sz[i] = 0.03

tt = np.arange(m) / 5.0
seg = np.array([src_of[min(n - 1, i * 6)] for i in range(m)])
def fill(v):
    # huecos: se rellenan con los vecinos DEL MISMO CLIP (nunca con la toma anterior, que era otra posición)
    v = np.array(v, dtype=float); o = v.copy()
    for sg in set(seg):
        mk = seg == sg; ok = mk & ~np.isnan(v)
        if ok.any(): o[mk] = np.interp(tt[mk], tt[ok], v[ok])
    ok = ~np.isnan(o)
    return np.interp(tt, tt[ok], o[ok]) if (~ok).any() else o
def smooth(v, s=0.45):
    o = np.empty_like(v)
    for i, c in enumerate(tt):
        mk = seg == seg[i]; k = np.exp(-0.5 * ((tt[mk] - c) / s) ** 2); o[i] = (k * v[mk]).sum() / k.sum()
    return o
tn = np.arange(n) / 30.0
up = lambda v: np.interp(tn, tt, smooth(fill(v))).round(4).tolist()
d["track"] = {"x": up(fx), "y": up(fy)}
d["head"] = {"x": up(hx), "y": up(hy)}

# zoom por cuadro: objetivo / tamaño de cara, suavizado SOLO dentro de cada clip
z5 = np.clip(OBJ / np.maximum(0.015, fill(sz)), 1.0, ZMAX)
zs = np.empty(m)
for i, c in enumerate(tt):
    mk = seg == seg[i]; k = np.exp(-0.5 * ((tt[mk] - c) / 0.8) ** 2); zs[i] = (k * np.log(z5[mk])).sum() / k.sum()
d["zt"] = np.interp(tn, tt, np.exp(zs)).round(3).tolist()

# Tomas donde NO sales en cuadro (señalas la pantalla): la cámara se centra en la pantalla de la presentación en vez de seguirte.
# data.pantalla = {k: 0..1 (cuánto manda la pantalla, con rampa suave), cx, cy, z}; Camera.tsx lo mezcla; Captions.tsx baja los subtítulos.
PANTALLA = [(3.4, 6.4), (27.2, 29.0)]      # segundos del video final
# CENTRO: la cámara apunta a la audiencia (tampoco sales): plano completo, sin zoom
CENTRO = [(33.0, 39.4), (48.2, 50.6), (53.2, 55.4)]
sel = np.zeros(m, bool)
for a, b in PANTALLA + CENTRO: sel |= (tt >= a) & (tt < b)
pcx, pcy, pw = np.full(m, np.nan), np.full(m, np.nan), np.full(m, np.nan)
for i in np.nonzero(sel)[0]:
    if any(a <= tt[i] < b for a, b in CENTRO):
        pcx[i], pcy[i], pw[i] = 0.5, 0.5, 0.8; continue
    hsv = np.array(Image.open(src[i]).resize((135, 240)).convert("HSV")).astype(float)
    mk = (hsv[:, :, 2] > 160) & (hsv[:, :, 1] < 90); mk[:25] = False
    lab, _ = ndimage.label(mk); bb, ba = None, 0
    for j, sl in enumerate(ndimage.find_objects(lab), 1):
        a_ = int((lab[sl] == j).sum())
        if a_ > ba: ba, bb = a_, sl
    if bb is not None and ba > 1500:
        pcx[i] = (bb[1].start + bb[1].stop) / 2 / 135; pcy[i] = (bb[0].start + bb[0].stop) / 2 / 240; pw[i] = (bb[1].stop - bb[1].start) / 135
fx_ = lambda v: np.interp(tn, tt, smooth(fill(v), 0.3))
kk = np.zeros(n)
for a, b in PANTALLA + CENTRO: kk[(tn >= a) & (tn < b)] = 1
kk = ndimage.gaussian_filter1d(kk, 6)
if sel.any():
    d["pantalla"] = {"k": kk.round(3).tolist(), "cx": fx_(pcx).round(4).tolist(), "cy": fx_(pcy).round(4).tolist(),
                     "z": np.clip(0.8 / np.maximum(0.3, fx_(pw)), 1.0, 1.6).round(3).tolist()}
else:
    d.pop("pantalla", None)
json.dump(d, open(P, "w"), ensure_ascii=False)
print("seguimiento ok · zoom", round(min(d["zt"]), 2), "–", round(max(d["zt"]), 2), "· silueta/cara en", sum(1 for x in hx if not np.isnan(x)), "de", m)
