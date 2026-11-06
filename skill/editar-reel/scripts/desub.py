#!/usr/bin/env python3
# Borra subtítulos quemados (blanco/amarillo con contorno negro) de un video YA EDITADO, cuadro por cuadro (inpainting OpenCV).
# Validado con el unboxing de Google Cloud Summit (oct 2026): subtítulos en y≈1180–1240 de 1080x1920 → franja 1140 1290.
# uso: ~/.reels-toolkit/venv/bin/python desub.py entrada.mp4 salida.mp4 inicio dur [y0 y1]
# Para usarlo como clip del vlog, escribe la salida en la caché global con la clave que espera vlog.py:
#   ~/.reels-toolkit/cache/sdr_global/<NOMBRE>_<md5(fuentes/NOMBRE)[:12]>.mp4   (y en vlog.json → montaje usa "NOMBRE")
# Límites: texto blanco sobre fondo blanco (bolsa, pared) NO se borra; queda una mancha leve donde estaba el texto,
# que nuestros subtítulos tapan casi siempre. Evita tramos con etiquetas arriba o tarjetas de nombre del video original.
import cv2, numpy as np, sys, subprocess
src, dst, ss, dur = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
y0, y1 = (int(sys.argv[5]), int(sys.argv[6])) if len(sys.argv) > 6 else (1060, 1200)
cap = cv2.VideoCapture(src); cap.set(cv2.CAP_PROP_POS_MSEC, ss * 1000)
W, H = int(cap.get(3)), int(cap.get(4)); n = int(round(dur * 30))
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', '30', '-i', '-',
                      '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709',
                      '-color_trc', 'bt709', '-colorspace', 'bt709', dst], stdin=subprocess.PIPE)
for _ in range(n):
    ok, fr = cap.read()
    if not ok: break
    band = fr[y0:y1]
    hsv = cv2.cvtColor(band, cv2.COLOR_BGR2HSV)
    white = (hsv[..., 1] < 50) & (hsv[..., 2] > 215)
    yellow = (hsv[..., 0] > 15) & (hsv[..., 0] < 35) & (hsv[..., 1] > 120) & (hsv[..., 2] > 200)
    m = (white | yellow).astype(np.uint8) * 255
    # solo trazos de texto: deben tener contorno oscuro cerca
    dark = (hsv[..., 2] < 60).astype(np.uint8) * 255
    near = cv2.dilate(dark, np.ones((9, 9), np.uint8))
    m = cv2.bitwise_and(m, near)
    # une las letras en renglones y expande para cubrir contorno y sombra
    rows = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((25, 41), np.uint8))
    cnts, _ = cv2.findContours(rows, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    mask = np.zeros_like(m)
    for c in cnts:
        x, y, w, h = cv2.boundingRect(c)
        if w > 60 and 20 < h < 120 and cv2.countNonZero(m[y:y + h, x:x + w]) > 150:
            cv2.rectangle(mask, (x - 18, y - 16), (x + w + 18, y + h + 20), 255, -1)
    if mask.any():
        full = np.zeros(fr.shape[:2], np.uint8); full[y0:y1] = mask
        fr = cv2.inpaint(fr, full, 9, cv2.INPAINT_NS)
    p.stdin.write(fr.tobytes())
p.stdin.close(); p.wait()
