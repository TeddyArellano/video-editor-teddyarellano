# Compara la captura de la vista previa con el still de Remotion (ambos a 270x480).
# El <video> de Chromium (vista previa) y el extractor de cuadros de Remotion (render) manejan el color del video un poco
# distinto: un corrimiento GLOBAL de brillo de unos pocos niveles. Se reporta aparte ("brillo") y se compensa antes de medir
# la fidelidad de la composición (gráficos, posiciones, cuadro exacto).
import sys, json
import numpy as np
from PIL import Image, ImageFilter
# desenfoque leve: la captura (≈590 px) y el still (1080 px) tienen distinta nitidez en los bordes; aquí importa la composición
abrir = lambda f: np.asarray(Image.open(f).convert('RGB').resize((270, 480), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.5)), dtype=float)
a, b = abrir(sys.argv[1]), abrir(sys.argv[2])
brillo = np.median((a - b).reshape(-1, 3), axis=0)
d = np.abs(a - brillo - b).mean(axis=2)
print(json.dumps({'brillo': [round(float(x), 1) for x in brillo], 'media': round(float(d.mean()), 2), 'p99': round(float(np.percentile(d, 99)), 1), 'malos': round(float((d > 40).mean() * 100), 2)}))
