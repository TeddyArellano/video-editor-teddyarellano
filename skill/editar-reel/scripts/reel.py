#!/usr/bin/env python3
"""reel — pipeline de edición de Reels/TikTok verticales (skill /editar-reel).

Siempre con el Python del toolkit:   ~/.reels-toolkit/venv/bin/python ~/.claude/skills/editar-reel/scripts/reel.py <comando> ...
(alias recomendado en la skill: REEL="~/.reels-toolkit/venv/bin/python ~/.claude/skills/editar-reel/scripts/reel.py")

Comandos (en orden de uso):
  nuevo <carpeta> --estilo E [--nombre "Título"] [--marca M]   crea <carpeta>/proyecto_remotion
  inventario -p P                 duración, HDR, hora, hojas de contacto; recorte_x para clips horizontales
  sdr -p P [clips…]               HDR (HLG/PQ) → SDR BT.709 con tone-mapping de Apple
  audio -p P CLIP mic.wav         sincroniza un micrófono externo (correlación) y lo usa en vez del de la cámara
  transcribir -p P [clips…] [--prompt "nombres"]   Whisper DTW + inicios por energía + anti-bucles → edicion/palabras/
  tomas -p P [clips…]             SUGERENCIAS: tomas repetidas, repeticiones para 'quitar', logística
  buscar -p P "frase" [--clip X]  índices y tiempos de una frase
  edl -p P                        edicion/plan.json → edicion/edl.json (cortes en los límites reales de la voz)
  cortar -p P [--verificar]       master sincronizado + quitar silencios (iterativo) → public/cut.mp4
  niveles -p P [--aplicar]        LUFS por sección → gain_db sugerido
  logos -p P "Empresa" …          logos oficiales (Wikidata/Wikimedia) → public/logos/
  qr -p P foto.HEIC [--nombre x]  lee, recorta y verifica un QR → public/qr/
  broll -p P CLIP --de s --dur 3  toma de apoyo vertical → public/broll/
  datos -p P                      edl_final + eventos.json + estilo.json + caras → src/data.json
  zooms -p P [--todos]            propone cx/cy de los zooms (manos del sujeto) + imagen de verificación
  cuadricula -p P t1 t2 …         cuadros con cuadrícula 0.1 para centrar a mano
  recorte -p P [--frames 120]     recortes de la persona para gancho "detrás" → public/hookfg/
  revisar -p P f1 f2 …            stills de Remotion con zona segura y centro → edicion/revision/
  enfasis -p P [--umbral 0.55]   SUGERENCIAS: palabras con énfasis en la voz (volumen/tono/duración) → eventos.enfasis
  render -p P [--borrador] [--nota "..."] [--salida x.mp4]   borrador rápido o final verificado (con versiones)
  proxy -p P                      public/cut_proxy.mp4 (540x960) para una vista previa fluida
  notas -p P [--marcar ID --respuesta "…"]   notas de Reel Studio (edicion/notas.json): listar / marcar aplicadas
  extras -p P [--frame N]         subtítulos .srt + portada .jpg junto al video
  revision -p P [--video-url U --artifact A]   página de revisión con notas por código de tiempo
  dividir -p P --partes "a,b" "c,d" --nombres "T1" "T2"   un proyecto por parte
  marca -p P ID                   aplica un kit de marca (colores + logos)
  actualizar -p P                 copia la plantilla nueva de la skill al proyecto (con respaldo)
  limpiar -p P                    borra la caché pesada del proyecto
  prueba                          prueba de humo de toda la skill con un clip sintético (~35 s)
P = carpeta proyecto_remotion (o la carpeta del material que lo contiene).

--json (o REEL_JSON=1) en cualquier comando: la salida sale como líneas JSON {"tipo": ok|aviso|error|siguiente|progreso|info,
"msg": …, "pct": 0–100} para Reel Studio (la app). El código de salida no cambia (0 = bien, 1 = error).
"""
import argparse
import concurrent.futures as cf
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
TK = Path.home() / '.reels-toolkit'
BIN = TK / 'bin'
MODEL = TK / 'models' / 'ggml-large-v3-turbo.bin'
NODE_MODULES = TK / 'remotion' / 'node_modules'
FPS, SR, W, H = 30, 48000, 1080, 1920
CUT_W = int(os.environ.get('REEL_CUT_W', '1440'))  # ancho del corte (cut.mp4); 2160 = corte 4K para zooms fuertes sin pixelarse
CUT_H = CUT_W * 16 // 9
VIDEO_EXT = {'.mov', '.mp4', '.m4v'}
IMG_EXT = {'.heic', '.jpg', '.jpeg', '.png'}

# márgenes de la EDL (segundos)
PAD_IN, PAD_OUT, GAP_SPLIT, MERGE_GAP = 0.14, 0.12, 0.30, 0.25


# ---------------------------------------------------------------- utilidades
def run(cmd, **kw):
    return subprocess.run([str(c) for c in cmd], check=True, **kw)


def ff(*args):
    run(['ffmpeg', '-nostdin', '-v', 'error', '-y', *args])


def probe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', str(path)],
                       capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def jload(p, default=None):
    p = Path(p)
    if not p.exists():
        if default is not None:
            return default
        sys.exit(f"✗ falta {p}")
    return json.loads(p.read_text())


def jsave(p, obj, indent=1):
    """escritura atómica (archivo temporal + rename): quien lea en paralelo (Reel Studio, otro reel) nunca ve un JSON a medias"""
    p = Path(p)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_name(f".{p.name}.{os.getpid()}.tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=indent))
    os.replace(tmp, p)


class Candado:
    """candado por proyecto (flock): dos `reel datos` a la vez (Claude Code + Reel Studio) se esperan en lugar de chocar"""

    def __init__(self, pr, nombre):
        self.f = pr.cache / f'{nombre}.lock'

    def __enter__(self):
        import fcntl
        self.fh = open(self.f, 'w')
        fcntl.flock(self.fh, fcntl.LOCK_EX)
        return self

    def __exit__(self, *a):
        import fcntl
        fcntl.flock(self.fh, fcntl.LOCK_UN)
        self.fh.close()


def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r"[^\w*]+", '', s)


def need_toolkit():
    if not MODEL.exists() or not (BIN / 'faces').exists() or not NODE_MODULES.exists():
        sys.exit("✗ toolkit incompleto: corre  zsh ~/.claude/skills/editar-reel/setup.sh")


def progreso(i, n, msg=''):
    """línea de avance "… [i/n] msg"; con --json sale como {"tipo": "progreso", "pct": …}"""
    print(f"… [{i}/{n}] {msg}".rstrip(), flush=True)


class SalidaJSON:
    """Envuelve stdout: cada línea de texto se convierte en un objeto JSON según su prefijo (✓ ✗ ⚠ → …)."""
    TIPOS = {'✓': 'ok', '✗': 'error', '⚠': 'aviso', '→': 'siguiente', '…': 'progreso'}

    def __init__(self, real):
        self.real, self.buf = real, ''

    def write(self, t):
        self.buf += t
        while '\n' in self.buf:
            linea, self.buf = self.buf.split('\n', 1)
            self.emitir(linea)
        return len(t)

    def emitir(self, linea, tipo=None):
        if not linea.strip():
            return
        s = linea.strip()
        tipo = tipo or self.TIPOS.get(s[0], 'info')
        if tipo == 'info' and s.startswith('siguiente'):
            tipo = 'siguiente'
        obj = {"tipo": tipo, "msg": s.lstrip('✓✗⚠→… ').strip() if tipo != 'info' else linea.rstrip()}
        m = re.match(r'^…\s*\[(\d+)/(\d+)\]', s)
        if m:
            obj['pct'] = round(100 * int(m.group(1)) / max(1, int(m.group(2))), 1)
        self.real.write(json.dumps(obj, ensure_ascii=False) + '\n')
        self.real.flush()

    def flush(self):
        if self.buf:
            self.emitir(self.buf)
            self.buf = ''
        self.real.flush()

    def isatty(self):
        return False

    def fileno(self):
        return self.real.fileno()


JSON_MODE = False


class Proyecto:
    def __init__(self, p):
        p = Path(p).expanduser().resolve()
        if not (p / 'edicion' / 'proyecto.json').exists() and (p / 'proyecto_remotion' / 'edicion' / 'proyecto.json').exists():
            p = p / 'proyecto_remotion'
        if not (p / 'edicion' / 'proyecto.json').exists():
            sys.exit(f"✗ {p} no es un proyecto de /editar-reel (falta edicion/proyecto.json). Usa: reel nuevo <carpeta>")
        self.P = p
        self.ed = p / 'edicion'
        self.cfg = jload(self.ed / 'proyecto.json')
        self.fuentes = Path(self.cfg['fuentes'])
        # id de caché ESTABLE (guardado en proyecto.json): mover o renombrar la carpeta ya no pierde la caché.
        # Proyectos viejos: se toma el id que tenían (md5 de la ruta) y se guarda una sola vez.
        if not self.cfg.get('id'):
            self.cfg['id'] = hashlib.md5(str(p).encode()).hexdigest()[:10]
            st = (self.ed / 'proyecto.json').stat()
            jsave(self.ed / 'proyecto.json', self.cfg)
            os.utime(self.ed / 'proyecto.json', ns=(st.st_atime_ns, st.st_mtime_ns))  # transcribir compara esta fecha
        self.cache = TK / 'cache' / self.cfg['id']
        self.cache.mkdir(parents=True, exist_ok=True)

    def videos(self):
        return sorted(f for f in self.fuentes.iterdir() if f.suffix.lower() in VIDEO_EXT and not f.name.startswith('.')
                      and not f.name.startswith(self.cfg.get('nombre', '\0')))

    def fuente(self, stem):
        for f in self.fuentes.iterdir():
            if f.stem == stem and f.suffix.lower() in VIDEO_EXT:
                return f
        sys.exit(f"✗ no encuentro el clip {stem} en {self.fuentes}")

    def sdr(self, stem):
        """SDR del clip: el de la caché del proyecto (proyectos viejos) o el global, compartido por todos los proyectos
        que usan el mismo archivo fuente (así `dividir` o una copia del proyecto nunca caen al HDR crudo, que se ve gris)."""
        own = self.cache / 'sdr' / f'{stem}.mp4'
        if own.exists() and own.stat().st_size > 0:
            return own
        return self.sdr_global(stem)

    def sdr_global(self, stem):
        src = next((f for f in self.fuentes.iterdir() if f.stem == stem and f.suffix.lower() in VIDEO_EXT), None)
        key = hashlib.md5(str(src.resolve() if src else self.fuentes / stem).encode()).hexdigest()[:12]
        return TK / 'cache' / 'sdr_global' / f'{stem}_{key}.mp4'

    def palabras(self, stem):
        return jload(self.ed / 'palabras' / f'{stem}.json')

    def wav16(self, stem):
        """audio 16 kHz mono del clip (el que se transcribe); se regenera si la caché se limpió"""
        wav = self.cache / 'wav' / f'{stem}.wav'
        if not wav.exists():
            wav.parent.mkdir(exist_ok=True)
            aud, off = self.audio(stem)
            if off >= 0:
                ff('-ss', off, '-i', aud, '-vn', '-ac', '1', '-ar', '16000', wav)
            else:
                ff('-i', aud, '-vn', '-ac', '1', '-ar', '16000', '-af', f'adelay={round(-off * 1000)}', wav)
        return wav

    def energia(self, stem):
        """envolvente en dB cada 10 ms + piso de ruido (para elegir puntos de corte en los valles entre palabras)"""
        import numpy as np
        if not hasattr(self, '_env'):
            self._env = {}
        if stem not in self._env:
            raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(self.wav16(stem)), '-f', 's16le', '-'],
                                 capture_output=True, check=True).stdout
            x = np.frombuffer(raw, np.int16).astype(float) / 32768
            fr = x[: len(x) // 160 * 160].reshape(-1, 160)
            db = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
            self._env[stem] = (db, float(np.percentile(db, 10)))
        return self._env[stem]

    def valle(self, stem, t0, t1, prefer):
        """mejor punto de corte en [t0, t1]: el valle de energía más cercano a `prefer`; None si todo es voz continua"""
        import numpy as np
        db, floor = self.energia(stem)
        a, b = max(0, int(t0 * 100)), min(len(db), int(t1 * 100))
        if b - a < 2:
            return None
        seg = db[a:b]
        lo = seg.min()
        if lo > floor + 22:  # sin hueco: voz continua (palabras pegadas)
            return None
        cand = np.where(seg <= lo + 3)[0]
        k = cand[np.argmin(np.abs(cand - (prefer * 100 - a)))]
        return (a + k) / 100

    def _voz(self, stem, t0, t1):
        """máscara de voz cada 10 ms en [t0, t1] con umbral relativo al ruido local (sirve en ferias ruidosas)"""
        import numpy as np
        db, _ = self.energia(stem)
        a, b = max(0, int(t0 * 100)), min(len(db), int(t1 * 100))
        ctx = db[max(0, a - 100):min(len(db), b + 100)]
        floor = np.percentile(ctx, 15) if len(ctx) else -60
        return a, db[a:b] > floor + 8

    def inicio_voz(self, stem, t, limite):
        """camina hacia atrás desde t mientras haya voz (huecos ≤ 80 ms se toleran: sílabas); devuelve donde empieza
        la voz que lleva a la palabra, sin pasar de `limite`. None si no hay silencio claro (habla continua)."""
        a, v = self._voz(stem, limite, t + 0.03)
        if len(v) < 3:
            return None
        i, gap = len(v) - 1, 0
        while i >= 0:
            gap = 0 if v[i] else gap + 1
            if gap >= 9:  # 90 ms de silencio: ahí terminó lo anterior
                return (a + i + gap) / 100
            i -= 1
        return None

    def fin_voz(self, stem, t, limite):
        """camina hacia adelante desde t mientras haya voz; devuelve dónde termina (antes de `limite`)"""
        a, v = self._voz(stem, t - 0.03, limite)
        i, gap = 0, 0
        while i < len(v):
            gap = 0 if v[i] else gap + 1
            if gap >= 10:  # 100 ms de silencio
                return (a + i - gap + 1) / 100
            i += 1
        return None

    def recorte_x(self, stem):
        return float(self.cfg.get('recorte_x', {}).get(stem, 0.5))

    def audio(self, stem):
        """(archivo, offset): audio externo sincronizado (reel audio) o el de la cámara. t_externo = t_cámara + offset"""
        ext = self.cfg.get('audio_externo', {}).get(stem)
        return (Path(ext['archivo']), float(ext['offset'])) if ext else (self.fuente(stem), 0.0)

    def guardar_cfg(self):
        jsave(self.ed / 'proyecto.json', self.cfg)


# ---------------------------------------------------------------- nuevo
def aplicar_marca(P, marca):
    d = SKILL / 'marcas' / marca
    if not (d / 'marca.json').exists():
        sys.exit(f"✗ marca '{marca}' no existe. Disponibles: {', '.join(p.parent.name for p in (SKILL / 'marcas').glob('*/marca.json'))}")
    m = jload(d / 'marca.json')
    est = jload(P / 'src' / 'estilo.json')
    est.setdefault('colores', {}).update(m.get('colores', {}))
    for k, f in m.get('fuentes', {}).items():
        if k in est and isinstance(est[k], dict):
            est[k]['fuente'] = f
    est['marca'] = marca
    jsave(P / 'src' / 'estilo.json', est)
    (P / 'public' / 'marca').mkdir(parents=True, exist_ok=True)
    for name, f in m.get('logos', {}).items():
        shutil.copy(d / f, P / 'public' / 'marca' / f"{name}{Path(f).suffix}")
    print(f"✓ marca '{m.get('nombre', marca)}': colores {list(m.get('colores', {}))} · logos en public/marca/: "
          f"{', '.join(n + Path(f).suffix for n, f in m.get('logos', {}).items())}" + (f" · creador: {m['creador']}" if m.get('creador') else ''))


def cmd_marca(a):
    aplicar_marca(Proyecto(a.proyecto).P, a.marca)


def cmd_nuevo(a):
    carpeta = Path(a.carpeta).expanduser().resolve()
    est = SKILL / 'estilos' / f'{a.estilo}.json'
    if not est.exists():
        sys.exit(f"✗ estilo '{a.estilo}' no existe. Disponibles: {', '.join(p.stem for p in (SKILL / 'estilos').glob('*.json') if '.' not in p.stem)}")
    dest = Path(a.destino).resolve() if a.destino else carpeta / 'proyecto_remotion'
    if dest.exists() and any(dest.iterdir()) and not a.forzar:
        sys.exit(f"✗ {dest} ya existe. Usa --destino otra_carpeta o --forzar")
    tpl = SKILL / 'plantilla_remotion'
    shutil.copytree(tpl, dest, dirs_exist_ok=True, ignore=shutil.ignore_patterns('node_modules', 'out', '.DS_Store'))
    nm = dest / 'node_modules'
    if nm.is_symlink() or nm.exists():
        nm.unlink() if nm.is_symlink() else shutil.rmtree(nm)
    nm.symlink_to(NODE_MODULES)
    shutil.copy(est, dest / 'src' / 'estilo.json')
    ej = SKILL / 'estilos' / f'{a.estilo}.eventos.json'
    (dest / 'edicion').mkdir(exist_ok=True)
    if ej.exists():
        shutil.copy(ej, dest / 'edicion' / 'eventos.ejemplo.json')
    nombre = a.nombre or carpeta.name
    jsave(dest / 'edicion' / 'proyecto.json', {"fuentes": str(carpeta), "estilo": a.estilo, "nombre": nombre, **({"marca": a.marca} if a.marca else {})})
    if a.marca:
        aplicar_marca(dest, a.marca)
    print(f"✓ proyecto en {dest}\n  estilo: {a.estilo} | video final: {nombre}.mp4\n  siguiente: reel inventario -p \"{dest}\"")


# ---------------------------------------------------------------- inventario
def cmd_inventario(a):
    pr = Proyecto(a.proyecto)
    (pr.ed / 'hojas').mkdir(exist_ok=True)
    inv = []

    def one(f):
        d = probe(f)
        v = next((s for s in d['streams'] if s['codec_type'] == 'video'), None)
        if not v:
            return None
        rot = 0
        for sd in v.get('side_data_list', []):
            rot = int(sd.get('rotation', rot) or 0)
        w, h = v['width'], v['height']
        if abs(rot) == 90:
            w, h = h, w
        dur = float(d['format']['duration'])
        tags = d['format'].get('tags', {})
        if 'Lavf' in tags.get('encoder', '') or 'Lavf' in v.get('tags', {}).get('encoder', ''):
            return {"clip": f.stem, "render": True}  # video ya exportado con FFmpeg/Remotion, no es material de cámara
        info = {"clip": f.stem, "archivo": f.name, "dur": round(dur, 2), "w": w, "h": h, "vertical": h > w,
                "fps": v.get('r_frame_rate'), "hdr": v.get('color_transfer') in ('arib-std-b67', 'smpte2084'),
                "transfer": v.get('color_transfer'), "hora": tags.get('com.apple.quicktime.creationdate', tags.get('creation_time', '')),
                "audio": any(s['codec_type'] == 'audio' for s in d['streams'])}
        n = max(4, min(20, math.ceil(dur / 2)))
        ff('-i', f, '-vf', f"fps={n / dur:.5f},scale=-2:200,tile={n}x1", '-frames:v', '1', pr.ed / 'hojas' / f'{f.stem}.jpg')
        return info

    with cf.ThreadPoolExecutor(4) as ex:
        res = [x for x in ex.map(one, pr.videos()) if x]
    inv = [x for x in res if not x.get('render')]
    renders = [x['clip'] for x in res if x.get('render')]
    inv.sort(key=lambda x: x['hora'])
    # clips horizontales: sugiere qué parte recortar (centro de las caras) → proyecto.json "recorte_x"
    for x in inv:
        if x['vertical'] or x['clip'] in pr.cfg.get('recorte_x', {}):
            continue
        fr = pr.cache / f"hz_{x['clip']}"
        fr.mkdir(exist_ok=True)
        f = pr.fuente(x['clip'])
        for k in range(6):
            ff('-ss', x['dur'] * (k + 0.5) / 6, '-i', f, '-frames:v', '1', '-vf', 'scale=640:-2', fr / f'{k}.jpg')
        run([BIN / 'faces', fr, fr / 'f.json'], capture_output=True)
        xs = [max(fs, key=lambda q: q[2])[0] for fs in jload(fr / 'f.json') if fs]
        shutil.rmtree(fr)
        rx = round(sorted(xs)[len(xs) // 2], 3) if xs else 0.5
        pr.cfg.setdefault('recorte_x', {})[x['clip']] = rx
        x['recorte_x'] = rx
        print(f"  {x['clip']} es horizontal → recorte_x={rx} (centro de las caras; cámbialo en edicion/proyecto.json si hace falta)")
    pr.guardar_cfg()
    imgs = [f.name for f in pr.fuentes.iterdir() if f.suffix.lower() in IMG_EXT]
    jsave(pr.ed / 'inventario.json', {"videos": inv, "imagenes": imgs, "renders_ignorados": renders})
    print(f"{'clip':<14}{'dur':>7}  {'res':<10}{'HDR':<5}hora")
    for x in inv:
        print(f"{x['clip']:<14}{x['dur']:>7.1f}  {x['w']}x{x['h']:<5}{'sí' if x['hdr'] else 'no':<5}{x['hora'][:19]}"
              + ("" if x['vertical'] else "  ⚠ horizontal"))
    if imgs:
        print("imágenes:", ', '.join(imgs))
    if renders:
        print("ignorados (renders previos):", ', '.join(renders))
    print(f"hojas de contacto: {pr.ed / 'hojas'}")
    if any(x['hdr'] for x in inv):
        print("→ hay clips HDR: corre  reel sdr -p …")


# ---------------------------------------------------------------- sdr
def cmd_sdr(a):
    need_toolkit()
    pr = Proyecto(a.proyecto)
    inv = jload(pr.ed / 'inventario.json')['videos']
    clips = a.clips or [x['clip'] for x in inv if x['hdr']]
    (TK / 'cache' / 'sdr_global').mkdir(parents=True, exist_ok=True)

    def one(stem):
        if pr.sdr(stem).exists() and pr.sdr(stem).stat().st_size > 0:
            return f"{stem}: ya estaba"
        out = pr.sdr_global(stem)
        r = subprocess.run([BIN / 'hdr_a_sdr', pr.fuente(stem), out, str(pr.recorte_x(stem))], capture_output=True, text=True)
        return f"{stem}: {r.stdout.strip() or r.stderr.strip()}"

    with cf.ThreadPoolExecutor(2) as ex:
        for i, msg in enumerate(ex.map(one, clips), 1):
            progreso(i, len(clips), 'SDR')
            print(msg)


# ---------------------------------------------------------------- transcribir / buscar
def whisper_words(js):
    words = []
    for seg in js['transcription']:
        for tk in seg['tokens']:
            t = tk['text']
            if t.startswith('[_') or not t.strip():
                continue
            st = tk.get('t_dtw', -1)
            st = st / 100 if st is not None and st >= 0 else tk['offsets']['from'] / 1000
            en = tk['offsets']['to'] / 1000
            if t.startswith(' ') or not words:
                words.append([t.strip(), round(st, 3), round(en, 3)])
            else:
                words[-1][0] += t
    # el 'to' de Whisper es impreciso (suele quedar ~0.4 s antes del inicio DTW): el fin de palabra se estima como
    # min(inicio de la siguiente, inicio + 0.08·letras + 0.25)
    for i, w in enumerate(words):
        est = w[1] + 0.08 * len(w[0]) + 0.25
        nxt = words[i + 1][1] if i + 1 < len(words) else est
        w[2] = round(max(w[1] + 0.06, min(est, nxt)), 3)
    return words


def loop_words(words):
    """palabras que parecen alucinación en bucle de Whisper: la misma frase repetida ≥4 veces seguidas
    o ≥10 palabras seguidas casi sin avanzar en el tiempo"""
    nw = [norm(w[0]) for w in words]
    bad = set()
    for n in (1, 2, 3, 4):
        i = 0
        while i + n <= len(nw):
            k = 1
            while i + (k + 1) * n <= len(nw) and nw[i + k * n:i + (k + 1) * n] == nw[i:i + n]:
                k += 1
            if k >= 4 and (n > 1 or k >= 6):
                bad.update(range(i, i + k * n))
                i += k * n
            else:
                i += 1
    run_ = []
    for i in range(1, len(words)):
        if words[i][1] - words[i - 1][1] < 0.03:
            run_.append(i)
        else:
            if len(run_) >= 10:
                bad.update(run_)
            run_ = []
    if len(run_) >= 10:
        bad.update(run_)
    return bad


def refine_onsets(words, wav):
    """Whisper (DTW) a veces pone una palabra que sigue a una pausa larga en un clic/ruido anterior. Si la palabra
    'empieza' en silencio, se mueve al primer inicio de voz sostenido (≥ 60 ms a +20 dB sobre el ruido de fondo)."""
    import numpy as np
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(wav), '-f', 's16le', '-ac', '1', '-ar', '16000', '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(float) / 32768
    hop = 160  # 10 ms
    fr = x[: len(x) // hop * hop].reshape(-1, hop)
    db = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
    floor = np.percentile(db, 10)
    voiced = db > floor + 20
    sus = np.convolve(voiced.astype(int), np.ones(6, int), 'same') >= 6  # 60 ms seguidos
    moved = 0
    for i, w in enumerate(words):
        a = int(w[1] * 100)
        nxt = int(words[i + 1][1] * 100) if i + 1 < len(words) else len(sus)
        if a >= len(sus) or sus[a:a + 25].any():
            continue  # ya empieza con voz
        on = np.argmax(sus[a:nxt]) if sus[a:nxt].any() else -1
        if on > 0:
            w[1] = round((a + on - 3) / 100, 3)  # 30 ms antes del inicio
            moved += 1
    for i, w in enumerate(words):  # recalcula fines
        est = w[1] + 0.08 * len(w[0]) + 0.25
        nx = words[i + 1][1] if i + 1 < len(words) else est
        w[2] = round(max(w[1] + 0.06, min(est, nx)), 3)
    return moved


def cmd_transcribir(a):
    need_toolkit()
    pr = Proyecto(a.proyecto)
    inv = jload(pr.ed / 'inventario.json', {"videos": []})['videos']
    clips = a.clips or [x['clip'] for x in inv] or [f.stem for f in pr.videos()]
    (pr.cache / 'wav').mkdir(exist_ok=True)
    (pr.ed / 'palabras').mkdir(exist_ok=True)
    prompt = a.prompt or pr.cfg.get('prompt', '')
    for k, stem in enumerate(clips):
        progreso(k, len(clips), f'transcribiendo {stem}')
        wav = pr.cache / 'wav' / f'{stem}.wav'
        aud, off = pr.audio(stem)
        if not wav.exists() or wav.stat().st_mtime < pr.ed.joinpath('proyecto.json').stat().st_mtime:
            if off >= 0:
                ff('-ss', off, '-i', aud, '-vn', '-ac', '1', '-ar', '16000', wav)
            else:  # el externo empezó después que la cámara: rellena el inicio
                ff('-i', aud, '-vn', '-ac', '1', '-ar', '16000', '-af', f'adelay={round(-off * 1000)}', wav)
        base = pr.cache / 'wav' / f'w_{stem}'
        cmd = ['whisper-cli', '-m', MODEL, '-f', wav, '-l', 'es', '-t', '8', '-nfa', '-dtw', 'large.v3.turbo', '-ojf', '-of', base, '-np']
        if prompt:
            cmd += ['--prompt', prompt]
        run(cmd, capture_output=True)
        words = whisper_words(jload(f'{base}.json'))
        bad = loop_words(words)
        if len(bad) >= 8:  # Whisper se quedó en bucle: reintenta sin contexto entre segmentos y conserva lo más limpio
            cmd2 = [f'{base}_mc0' if c == base else c for c in cmd] + ['-mc', '0']
            run(cmd2, capture_output=True)
            w2 = whisper_words(jload(f'{base}_mc0.json'))
            bad2 = loop_words(w2)
            print(f"  {stem}: bucle de Whisper ({len(bad)} palabras repetidas) → reintento sin contexto: {len(bad2)}")
            if len(bad2) < len(bad):
                words, bad = w2, bad2
        if bad:
            print(f"  ⚠ {stem}: quedan {len(bad)} palabras sospechosas de alucinación (índices {min(bad)}–{max(bad)}); no las uses en el plan")
        moved = refine_onsets(words, wav)
        jsave(pr.ed / 'palabras' / f'{stem}.json', words, indent=None)
        # versión legible: una línea por frase / pausa, con índice y tiempo de la primera palabra
        lines, cur = [], []
        for i, w in enumerate(words):
            if cur and (w[1] - words[i - 1][2] > 0.5 or len(cur) >= 12):
                lines.append(cur); cur = []
            cur.append(i)
            if re.search(r'[.?!]$', w[0]):
                lines.append(cur); cur = []
        if cur:
            lines.append(cur)
        txt = [f"# {stem}  ({len(words)} palabras)  formato: [índice_inicial–índice_final] tiempo_inicio  texto"]
        for ln in lines:
            txt.append(f"[{ln[0]:>4}–{ln[-1]:<4}] {words[ln[0]][1]:7.2f}  " + ' '.join(words[i][0] for i in ln))
        (pr.ed / 'palabras' / f'{stem}.txt').write_text('\n'.join(txt) + '\n')
        print(f"✓ {stem}: {len(words)} palabras → edicion/palabras/{stem}.txt" + (f"  ({moved} inicios corregidos por energía)" if moved else ""))


def cmd_buscar(a):
    pr = Proyecto(a.proyecto)
    q = [norm(x) for x in a.frase.split() if norm(x)]
    files = [pr.ed / 'palabras' / f'{a.clip}.json'] if a.clip else sorted((pr.ed / 'palabras').glob('*.json'))
    for f in files:
        w = jload(f)
        nw = [norm(x[0]) for x in w]
        for i in range(len(w) - len(q) + 1):
            if all(nw[i + k] == q[k] for k in range(len(q))):
                j = i + len(q) - 1
                ctx = ' '.join(x[0] for x in w[max(0, i - 4):j + 5])
                print(f"{f.stem}  [{i}–{j}]  {w[i][1]:.2f}–{w[j][2]:.2f}s   …{ctx}…")


# ---------------------------------------------------------------- edl
def word_end(w):
    return min(w[2], w[1] + 0.08 * len(w[0]) + 0.25)


def cmd_edl(a):
    pr = Proyecto(a.proyecto)
    plan = jload(pr.ed / 'plan.json')
    out = []
    bloque = 0
    for pz in plan['piezas']:
        W_ = pr.palabras(pz['src'])
        quitar = set(pz.get('quitar', []))
        idx = [i for i in range(pz['de'], pz['a'] + 1) if i not in quitar]
        runs, cur = [], []
        for i in idx:
            if cur and (i != cur[-1] + 1 or W_[i][1] - word_end(W_[cur[-1]]) > GAP_SPLIT):
                runs.append((cur, i != cur[-1] + 1)); cur = []
            cur.append(i)
        if cur:
            runs.append((cur, False))
        pieces = []
        for r, _ in runs:
            f, l = r[0], r[-1]
            tin = W_[f][1] - PAD_IN
            if f > 0:  # nunca dentro de la palabra anterior
                tin = min(max(tin, word_end(W_[f - 1]) + 0.02), W_[f][1] - 0.03)
            tout = word_end(W_[l]) + PAD_OUT
            if l + 1 < len(W_):
                tout = min(tout, W_[l + 1][1] - 0.10)
            # afina con la energía real: busca dónde empieza/termina de verdad la voz (Whisper suele marcar tarde
            # palabras como "Porque" y el fin de palabra es una estimación). Nunca invade la palabra vecina.
            prev_s = W_[f - 1][1] + 0.1 if f > 0 else 0
            on = pr.inicio_voz(pz['src'], W_[f][1] + 0.02, max(prev_s, W_[f][1] - 0.6))
            if on is not None:
                tin = max(prev_s, on - 0.05)
            nxt_s = W_[l + 1][1] - 0.04 if l + 1 < len(W_) else W_[l][2] + 0.6
            off = pr.fin_voz(pz['src'], W_[l][1] + 0.1, min(nxt_s, W_[l][2] + 0.35))
            if off is not None:  # duración mínima plausible: las sílabas finales suaves no se cortan
                tout = min(nxt_s, max(off + 0.07, W_[l][1] + 0.055 * len(W_[l][0]) + 0.1))
            pieces.append({"src": pz['src'], "in": round(max(0, tin), 3), "out": round(tout, 3), "first": f, "last": l})
        if pieces:  # ajuste manual cuando la verificación muestra una sílaba cortada ("mas_inicio": 0.25 s, "mas_final": 0.2 s)
            pieces[0]['in'] = round(max(0, pieces[0]['in'] - pz.get('mas_inicio', 0)), 3)
            pieces[-1]['out'] = round(pieces[-1]['out'] + pz.get('mas_final', 0), 3)
        merged = []
        for p in pieces:  # fusiona microcortes solo si no hay palabras quitadas en medio
            if merged and p['first'] == merged[-1]['last'] + 1 and p['in'] - merged[-1]['out'] < MERGE_GAP:
                merged[-1]['out'] = p['out']; merged[-1]['last'] = p['last']
            else:
                merged.append(p)
        for k, p in enumerate(merged):
            ws = [W_[i] for i in range(p['first'], p['last'] + 1) if i not in quitar]
            # bloque nuevo en cada pieza del plan y donde se quitaron palabras: ahí los subtítulos se parten
            if k == 0 or p['first'] != merged[k - 1]['last'] + 1:
                bloque += 1
            out.append({"src": p['src'], "in": p['in'], "out": p['out'], "sec": pz.get('sec', 'main'), "bloque": bloque,
                        "speed": pz.get('speed', 1.0), "gain_db": pz.get('gain_db', 0.0), "words": ws,
                        "text": ' '.join(x[0] for x in ws)})
    jsave(pr.ed / 'edl.json', out)
    tot = sum((p['out'] - p['in']) / p['speed'] for p in out)
    print(f"✓ edl: {len(out)} tramos, ~{tot:.1f} s → edicion/edl.json")


# ---------------------------------------------------------------- cortar (master sincronizado + tighten)
def piece_files(pr, p):
    # la clave incluye si hay SDR: si no, un tramo armado con el HDR original se reusaría aunque luego se corra `reel sdr` (se veía gris)
    key = hashlib.md5(json.dumps(['v2', p['src'], p['in'], p['out'], p['speed'], p.get('gain_db', 0), p['frames'],
                                  pr.cfg.get('audio_externo', {}).get(p['src']), pr.recorte_x(p['src']), pr.sdr(p['src']).exists()] + ([CUT_W] if CUT_W != 1440 else [])).encode()).hexdigest()[:12]
    d = pr.cache / 'seg'
    d.mkdir(exist_ok=True)
    return d / f'{key}.mp4', d / f'{key}.wav'


def build_piece(pr, p):
    vo, ao = piece_files(pr, p)
    n, sp = p['frames'], p['speed']
    d, src_d = n / FPS, p['out'] - p['in']
    tags = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
    if not vo.exists():
        sdr = pr.sdr(p['src'])
        if sdr.exists():
            vin, vf = sdr, f"setpts=PTS/{sp},fps={FPS}"
        else:
            rx = pr.recorte_x(p['src'])
            vin, vf = pr.fuente(p['src']), (f"setpts=PTS/{sp},fps={FPS},scale={CUT_W}:{CUT_H}:force_original_aspect_ratio=increase:flags=lanczos,"
                                            f"crop={CUT_W}:{CUT_H}:x='min(max(0,iw*{rx}-{CUT_W // 2}),iw-{CUT_W})'")
        ff('-ss', p['in'], '-t', src_d + 0.2, '-i', vin, '-frames:v', n, '-an', '-vf', vf, '-c:v', 'libx264', '-preset', 'medium',
           '-crf', '16', '-pix_fmt', 'yuv420p', '-g', '15', *tags, vo)
    if not ao.exists():
        # aresample PRIMERO: atrim cuenta muestras a la frecuencia de entrada (fuentes a 44.1/22 kHz se desincronizaban)
        af = f"aresample={SR}," + (f"atempo={sp}," if sp != 1 else "") + (f"volume={p['gain_db']}dB,alimiter=limit=0.95:attack=1:release=60:level=disabled," if p.get('gain_db') else "")
        aud, off = pr.audio(p['src'])
        ff('-ss', p['in'] + off, '-t', src_d + 0.2, '-i', aud, '-vn', '-ac', '2', '-ar', SR, '-af',
           f"{af}apad,atrim=end_sample={round(d * SR)},afade=t=in:d=0.008,afade=t=out:st={d - 0.008}:d=0.008", '-c:a', 'pcm_s16le', ao)


def build_master(pr, E, out):
    t = 0
    for p in E:
        p.setdefault('speed', 1.0)
        p['frames'] = max(1, round((p['out'] - p['in']) * FPS / p['speed']))
        p['start'] = t
        t += p['frames']
    with cf.ThreadPoolExecutor(4) as ex:
        list(ex.map(lambda p: build_piece(pr, p), E))
    lst = pr.cache / 'lst'
    lst.mkdir(exist_ok=True)
    (lst / 'v.txt').write_text(''.join(f"file '{piece_files(pr, p)[0]}'\n" for p in E))
    (lst / 'a.txt').write_text(''.join(f"file '{piece_files(pr, p)[1]}'\n" for p in E))
    ff('-f', 'concat', '-safe', '0', '-i', lst / 'v.txt', '-c', 'copy', lst / 'video.mp4')
    ff('-f', 'concat', '-safe', '0', '-i', lst / 'a.txt', '-c', 'copy', lst / 'audio.wav')
    ff('-i', lst / 'video.mp4', '-i', lst / 'audio.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k',
       '-movflags', '+faststart', out)
    return t


def silences(path, db=-40, dmin=0.35, start=0.0):
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'info', '-ss', str(start), '-i', str(path), '-vn', '-af', f'silencedetect=noise={db}dB:d={dmin}',
                        '-f', 'null', '-'], capture_output=True, text=True).stderr
    st = [float(x) + start for x in re.findall(r'silence_start: ([-\d.]+)', r)]
    en = [float(x) + start for x in re.findall(r'silence_end: ([-\d.]+)', r)]
    return list(zip(st, en + [None] * (len(st) - len(en))))


def tighten(E, sil, keep=0.12, dmin=0.35):
    """Parte los tramos dentro de cada silencio > dmin (dejando `keep` de aire). Si el silencio cruza el límite entre
    dos tramos, recorta la cola del primero y la cabeza del segundo (cada uno conserva `keep`)."""
    out, removed = [], 0.0
    for p in E:
        sp = p['speed']
        a_cut, b_cut = p['start'] / FPS, (p['start'] + p['frames']) / FPS
        cuts = []  # (inicio, fin) en tiempo de la fuente a eliminar
        for s, e in sil:
            e = b_cut if e is None else e
            if e - s <= dmin:
                continue
            s2, e2 = max(s, a_cut), min(e, b_cut)
            if e2 - s2 <= 0.03:
                continue
            lo_c = s2 + (0 if s2 <= a_cut + 1e-3 else keep)   # toca el inicio del tramo → se puede recortar desde el borde
            hi_c = e2 - (0 if e2 >= b_cut - 1e-3 else keep)   # toca el final del tramo
            if s2 <= a_cut + 1e-3:
                hi_c = e2 - keep / 2   # deja medio `keep` antes de la voz siguiente
            if e2 >= b_cut - 1e-3:
                lo_c = s2 + keep / 2
            if hi_c - lo_c > 0.04:
                cuts.append(((lo_c - a_cut) * sp + p['in'], (hi_c - a_cut) * sp + p['in']))
        cur, segs = p['in'], []
        for lo, hi in sorted(cuts):
            if lo > cur + 0.05:
                segs.append((cur, lo))
            removed += max(0, hi - max(lo, cur)) / sp
            cur = max(cur, hi)
        if p['out'] > cur + 0.05:
            segs.append((cur, p['out']))
        for s, e in segs:
            ws = [w for w in p['words'] if s - 0.15 <= w[1] < e]
            if not ws and (e - s) / sp < 0.6:   # pedacito sin voz (respiración, ruido)
                removed += (e - s) / sp
                continue
            q = {k: v for k, v in p.items() if k not in ('start', 'frames')}
            q.update({'in': round(s, 3), 'out': round(e, 3), 'words': ws, 'text': ' '.join(w[0] for w in ws)})
            out.append(q)
    return out, removed


def cmd_cortar(a):
    pr = Proyecto(a.proyecto)
    E = jload(pr.ed / 'edl.json')
    out = pr.P / 'public' / 'cut.mp4'
    out.parent.mkdir(exist_ok=True)
    for it in range(a.iter + 1):
        progreso(it, a.iter + 1, f'pasada {it + 1}')
        n = build_master(pr, E, out)
        sil = [s for s in silences(out, a.db, a.min) if (s[1] or n / FPS) - s[0] > a.min]
        print(f"  pasada {it + 1}: {len(E)} tramos, {n / FPS:.1f} s, silencios > {a.min}s: {len(sil)}")
        if not sil or it == a.iter:
            break
        E, rem = tighten(E, sil, a.keep, a.min)
        print(f"    quitando {rem:.2f} s de pausas")
        if rem < 0.01:
            print("    ⚠ quedan silencios que no se pueden quitar sin cortar voz; revísalos a mano (edicion/edl.json)")
            break
    jsave(pr.ed / 'edl_final.json', E)
    print(f"✓ public/cut.mp4  {n} cuadros ({n / FPS:.1f} s) | edicion/edl_final.json")
    if pr.cfg.get('lentes'):
        quitar_reflejo(pr, pr.cfg['lentes'].get('sec', 'intro'), pr.cfg['lentes'].get('fuerza', 0.88))
    if a.verificar:
        wav = pr.cache / 'verif.wav'
        ff('-i', out, '-vn', '-ac', '1', '-ar', '16000', wav)
        r = run(['whisper-cli', '-m', MODEL, '-f', wav, '-l', 'es', '-t', '8', '-np'], capture_output=True, text=True)
        (pr.ed / 'verificacion.txt').write_text(r.stdout)
        print("— transcripción del corte (revisa que se lea corrido y sin sílabas cortadas):\n" + r.stdout)


def quitar_reflejo(pr, sec, fuerza=0.88):
    """Quita el reflejo azul (antirreflejante) de los lentes en una sección de public/cut.mp4 (Rocket Revolution: la intro del creador
    con zoom ×1.4 lo hacía muy notorio). Detecta la cara por cuadro (Apple Vision) y, SOLO en una elipse en la zona de los ojos,
    baja la saturación de los píxeles azules; el resto del cuadro no se toca. Conversión explícita BT.709 (con BT.601 o sin
    etiquetas el video sale gris). El audio se copia tal cual."""
    import numpy as np
    from PIL import Image
    cut = pr.P / 'public' / 'cut.mp4'
    E = jload(pr.ed / 'edl_final.json')
    tr = [x for x in E if x.get('sec') == sec]
    if not tr:
        print(f"  ⚠ lentes: no hay sección '{sec}'"); return
    a0, fin = min(x['start'] for x in tr), max(x['start'] + x['frames'] for x in tr)
    v = next(x for x in probe(cut)['streams'] if x['codec_type'] == 'video')
    w, h = v['width'], v['height']
    tmp = pr.cache / 'lentes'
    shutil.rmtree(tmp, ignore_errors=True)
    (tmp / 'a').mkdir(parents=True); (tmp / 'p').mkdir()
    ff('-i', cut, '-vf', f"select='between(n,{a0},{fin - 1})',scale=in_color_matrix=bt709:in_range=tv,format=rgb24", '-vsync', '0', tmp / 'a' / '%05d.png')
    fs = sorted((tmp / 'a').glob('*.png'))
    for f in fs:
        Image.open(f).resize((w // 4, h // 4)).save(tmp / 'p' / (f.stem + '.jpg'))
    run([BIN / 'faces', tmp / 'p', tmp / 'f.json'], capture_output=True)
    F = jload(tmp / 'f.json')
    def fill(vals):
        v2 = np.array(vals, float); ok = ~np.isnan(v2); i = np.arange(len(v2))
        if not ok.any():
            return np.full(len(v2), np.nan)
        v2 = np.interp(i, i[ok], v2[ok]); k = np.exp(-0.5 * (np.arange(-4, 5) / 2.0) ** 2); k /= k.sum()
        return np.convolve(np.pad(v2, 4, mode='edge'), k, mode='valid')
    best = [max(fr, key=lambda q: q[2]) if fr else (np.nan, np.nan, np.nan) for fr in F]
    cx, cy, cs = (fill([b[j] for b in best]) for j in range(3))
    yy, xx = np.mgrid[0:h, 0:w]
    for i, f in enumerate(fs):
        if np.isnan(cx[i]):
            continue
        im = np.array(Image.open(f).convert('RGB'))
        fw = cs[i] * w
        ex, ey = cx[i] * w, cy[i] * h - 0.12 * fw          # los ojos, un poco arriba del centro de la cara
        m = (((xx - ex) / (0.75 * fw)) ** 2 + ((yy - ey) / (0.32 * fw)) ** 2) <= 1.0
        hsv = np.array(Image.fromarray(im).convert('HSV')).astype(np.float32)
        H, S = hsv[..., 0], hsv[..., 1]
        azul = m & (H >= 125) & (H <= 190) & (S > 25)      # PIL: H 0–255 ≈ 175°–270°
        hsv[..., 1] = S * (1 - fuerza * np.clip((S - 25) / 40, 0, 1) * azul)
        out = np.array(Image.fromarray(np.round(hsv).astype(np.uint8), 'HSV').convert('RGB'))
        Image.fromarray(np.where(azul[..., None], out, im).astype(np.uint8)).save(f)
    tags = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
    n_total = int(round(float(probe(cut)['format']['duration']) * FPS))
    seg = tmp / 'seg.mp4'
    ff('-framerate', FPS, '-i', tmp / 'a' / '%05d.png', '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
       '-c:v', 'libx264', '-crf', '14', '-g', '15', *tags, seg)
    partes = []
    if a0 > 0:
        partes.append(tmp / 'antes.mp4')
        ff('-i', cut, '-frames:v', a0, '-an', '-c:v', 'libx264', '-crf', '14', '-g', '15', '-pix_fmt', 'yuv420p', *tags, partes[-1])
    partes.append(seg)
    if fin < n_total:
        partes.append(tmp / 'resto.mp4')
        ff('-ss', f'{fin / FPS:.4f}', '-i', cut, '-an', '-c:v', 'libx264', '-crf', '14', '-g', '15', '-pix_fmt', 'yuv420p', *tags, partes[-1])
    (tmp / 'l.txt').write_text(''.join(f"file '{x}'\n" for x in partes))
    ff('-f', 'concat', '-safe', '0', '-i', tmp / 'l.txt', '-c', 'copy',
       '-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0', tmp / 'v.mp4')
    ff('-i', tmp / 'v.mp4', '-i', cut, '-map', '0:v', '-map', '1:a', '-c', 'copy', '-shortest', *tags, tmp / 'cut.mp4')
    shutil.move(str(tmp / 'cut.mp4'), cut)
    shutil.rmtree(tmp)
    print(f"✓ lentes: reflejo azul quitado en '{sec}' ({fin - a0} cuadros); se reaplica solo en cada  reel cortar")


def cmd_lentes(a):
    pr = Proyecto(a.proyecto)
    if a.quitar:
        pr.cfg.pop('lentes', None); pr.guardar_cfg(); print("✓ lentes desactivado (corre  reel cortar  para volver al original)"); return
    pr.cfg['lentes'] = {'sec': a.sec, 'fuerza': a.fuerza}
    pr.guardar_cfg()
    quitar_reflejo(pr, a.sec, a.fuerza)


# ---------------------------------------------------------------- datos
def cut_words(E, fix):
    words, prev_bloque = [], None
    for p in E:
        ws = p['words']
        tc = lambda t: p['start'] / FPS + max(0.0, t - p['in']) / p['speed']
        pend = (p['start'] + p['frames']) / FPS
        for j, w in enumerate(ws):
            st = tc(w[1])
            en = tc(ws[j + 1][1]) if j + 1 < len(ws) else pend
            txt = w[0]
            k = norm(txt)
            for a, b in fix.items():
                if norm(a) == k:
                    txt = re.sub(r'^([¿¡]?).*?([.,?!…]*)$', lambda m: m.group(1) + b + m.group(2), txt)
            wd = {"text": txt, "start": round(min(st, pend - 0.05), 3), "end": round(min(en, st + 1.2, pend), 3), "sec": p['sec']}
            if j == 0 and words and p.get('bloque') != prev_bloque:
                wd['corte'] = True  # empieza una frase de otro tramo: los subtítulos no la juntan con la anterior
            words.append(wd)
        prev_bloque = p.get('bloque')
    return words


class Anchors:
    """Resuelve un ancla de tiempo: número (s del corte) | "palabra" | "sec:palabra" | "sec:palabra#n" | {"palabra","sec","n","offset"}."""

    def __init__(self, words, secs):
        self.words, self.secs = words, secs

    def t(self, an, default_off=0.0):
        if an is None:
            return None
        off = default_off
        if isinstance(an, (int, float)):
            return float(an)
        if isinstance(an, dict):
            if 't' in an:
                return float(an['t']) + an.get('offset', 0)
            word, sec, n, off = an['palabra'], an.get('sec'), an.get('n', 0), an.get('offset', off)
        else:
            m = re.match(r'^(?:([\w-]+):)?(.+?)(?:#(\d+))?$', an.strip())
            sec, word, n = m.group(1), m.group(2), int(m.group(3) or 0)
        q = [norm(x) for x in word.split()]
        hits = []
        for i in range(len(self.words) - len(q) + 1):
            if sec and self.words[i]['sec'] != sec:
                continue
            if all(norm(self.words[i + k]['text']) == q[k] for k in range(len(q))):
                hits.append(self.words[i]['start'])
        if not hits and len(q) == 1 and len(q[0]) >= 4:  # respaldo: palabra dentro de un token ("unos llaveritos" tras un fix)
            hits = [w['start'] for w in self.words if (not sec or w['sec'] == sec) and q[0] in norm(w['text'])]
        if len(hits) <= n:
            raise KeyError(f"{an!r} (coincidencias: {len(hits)})")
        return hits[n] + off

    def f(self, an, off=0.0):
        return round(self.t(an, off) * FPS)


def face_track(pr, n, secs, cfg_secs, caras_def=None):
    """Seguimiento de caras del corte. Se guarda en caché (track.json) con la huella de cut.mp4 + secciones + caras:
    si nada de eso cambió (p. ej. solo se movió un texto en Reel Studio), `datos` no vuelve a analizar el video (~1 s)."""
    cut = pr.P / 'public' / 'cut.mp4'
    st = cut.stat()
    huella = hashlib.md5(json.dumps([st.st_size, st.st_mtime_ns, n, secs, {k: v.get('caras') for k, v in cfg_secs.items()}, caras_def],
                                    sort_keys=True, default=str).encode()).hexdigest()
    tj = pr.cache / 'track.json'
    if tj.exists():
        c = json.loads(tj.read_text())
        if c.get('huella') == huella:
            return c['x'], c['y']
    tx, ty = _face_track(pr, n, secs, cfg_secs, caras_def)
    tj.write_text(json.dumps({'huella': huella, 'x': tx, 'y': ty}))
    return tx, ty


def _face_track(pr, n, secs, cfg_secs, caras_def=None):
    import tempfile
    frames = Path(tempfile.mkdtemp(prefix='ffc_', dir=pr.cache))  # carpeta propia: nunca choca con otro proceso
    ff('-i', pr.P / 'public' / 'cut.mp4', '-vf', 'fps=5,scale=540:960', '-q:v', '4', frames / '%05d.jpg')
    fj = frames / 'faces.json'
    run([BIN / 'faces', frames, fj], capture_output=True)
    F = jload(fj)
    import numpy as np
    tt = np.arange(len(F)) / 5
    xs, ys, sec_of = [], [], []
    for i, fr in enumerate(F):
        f = i * 6
        s = next((x for x in secs if x['a'] <= f < x['b']), secs[-1])
        k = cfg_secs.get(s['id'], {}).get('caras', caras_def if caras_def else (1 if (s is secs[0] and len(secs) > 1) else 2))
        fs = sorted([x for x in fr if x[2] > 0.035], key=lambda x: -x[2])[:k]
        sec_of.append(s['id'])
        if fs:
            xx = [x[0] for x in fs]
            xs.append((min(xx) + max(xx)) / 2); ys.append(float(np.mean([x[1] for x in fs])))
        else:
            xs.append(np.nan); ys.append(np.nan)
    xs, ys = np.array(xs), np.array(ys)
    ok = ~np.isnan(xs)
    if not ok.any():
        xs[:], ys[:] = 0.5, 0.35
    else:
        xs = np.interp(tt, tt[ok], xs[ok]); ys = np.interp(tt, tt[ok], ys[ok])
    sec_of = np.array(sec_of)

    def smooth(v):  # gaussiano σ≈0.9 s sin cruzar secciones
        o = np.empty_like(v)
        for i, c in enumerate(tt):
            m = sec_of == sec_of[i]
            wgt = np.exp(-0.5 * ((tt[m] - c) / 0.9) ** 2)
            o[i] = (wgt * v[m]).sum() / wgt.sum()
        return o

    xs, ys = smooth(xs), smooth(ys)
    shutil.rmtree(frames)
    return (np.interp(np.arange(n) / FPS, tt, xs).round(4).tolist(), np.interp(np.arange(n) / FPS, tt, ys).round(4).tolist())


def cmd_datos(a):
    need_toolkit()
    pr = Proyecto(a.proyecto)
    with Candado(pr, 'datos'):
        _datos(pr)


def _datos(pr):
    E = jload(pr.ed / 'edl_final.json')
    ev = jload(pr.ed / 'eventos.json', {})
    est = jload(pr.P / 'src' / 'estilo.json')
    n = E[-1]['start'] + E[-1]['frames']
    words = cut_words(E, ev.get('fix', {}))
    secs = []
    for p in E:
        if secs and secs[-1]['id'] == p['sec']:
            secs[-1]['b'] = p['start'] + p['frames']
        else:
            secs.append({"id": p['sec'], "a": p['start'], "b": p['start'] + p['frames']})
    cfg_secs = ev.get('secciones', {})
    for i, s in enumerate(secs):
        c = cfg_secs.get(s['id'], {})
        s.update({"zoom": c.get('zoom', 1.0 if (i == 0 and len(secs) > 1) else 1.12), "color": c.get('color'),
                  "contador": c.get('contador')})
    A = Anchors(words, secs)
    # valida todas las anclas antes de seguir (lista completa de las que no existen en el corte)
    bad = []
    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in ('en', 'hasta', 'monedas') and v is not None:
                    for an in (v if isinstance(v, list) else [v]):  # intro_espacio.en es una lista de anclas
                        try:
                            A.t(an)
                        except KeyError as e:
                            bad.append(str(e))
                elif isinstance(v, (dict, list)):
                    walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk({k: v for k, v in ev.items() if k not in ('objetos', 'enfasis', 'cortes')})
    for it in ev.get('objetos', []) + ev.get('cortes', []) + [e if isinstance(e, str) else e['en'] for e in ev.get('enfasis', [])]:
        try:
            A.t(it)
        except KeyError as e:
            bad.append(str(e))
    if bad:
        sys.exit("✗ anclas que no están en el corte (revisa edicion/verificacion.txt o data words):\n  " + "\n  ".join(bad))
    sec_end = lambda f: next((s['b'] for s in secs if s['a'] <= f < s['b']), n)
    fast = []
    for p in E:
        if p['speed'] != 1:
            if fast and fast[-1][1] == p['start']:
                fast[-1][1] = p['start'] + p['frames']; fast[-1][2] = max(fast[-1][2], p['speed'])
            else:
                fast.append([p['start'], p['start'] + p['frames'], p['speed']])  # 3er valor: velocidad (la insignia muestra "x8")

    hl = set(norm(x) for x in ev.get('resaltar', []))
    items = []
    for it in ev.get('objetos', []):
        f = A.f(it)
        sec = next((s['id'] for s in secs if s['a'] <= f < s['b']), secs[-1]['id'])
        items.append({"sec": sec, "f": f})
        for w in words:  # resalta la palabra del objeto
            if abs(round(w['start'] * FPS) - f) <= 1:
                w['key'] = True
    for w in words:
        if norm(w['text']) in hl:
            w['key'] = True
    # énfasis: palabras que el narrador carga (volumen/tono) o que llevan el sentido → salen solas, grandes y con golpe
    enf_sfx = []
    for e in ev.get('enfasis', []):
        an = e['en'] if isinstance(e, dict) else e
        f = A.f(an, e.get('offset', 0) if isinstance(e, dict) else 0)
        for w in words:
            if abs(round(w['start'] * FPS) - f) <= 1:
                w['enf'] = True
                w['key'] = True
        if isinstance(e, dict) and e.get('sfx'):
            enf_sfx.append((f, e['sfx'], e.get('vol', 0.18)))

    # cortes manuales de subtítulos (Reel Studio): la palabra empieza un bloque nuevo
    for an in ev.get('cortes', []):
        f = A.f(an)
        for w in words:
            if abs(round(w['start'] * FPS) - f) <= 1:
                w['corte'] = True

    zooms = []
    for z in ev.get('zooms', []):
        a0 = A.f(z['en'], z.get('offset', -0.15))
        b0 = A.f(z['hasta']) if z.get('hasta') is not None else a0 + round(z.get('dur', 1.7) * FPS)
        b0 = min(b0, sec_end(a0) - 4)
        zooms.append({"a": a0, "b": b0, "cx": z.get('cx', 0.5), "cy": z.get('cy', 0.5), "z": z.get('z', est.get('camara', {}).get('zoom_objeto', 1.5))})
    zooms.sort(key=lambda z: z['a'])

    def span(e, dur_def):
        a0 = A.f(e['en'], e.get('offset', 0))
        b0 = A.f(e['hasta']) if e.get('hasta') is not None else a0 + round(e.get('dur', dur_def) * FPS)
        return a0, b0

    # posición libre (Reel Studio): dx/dy en px, escala y rot se copian tal cual; "ev" = índice en la lista de eventos.json
    libre = lambda x, j: {**{k: x[k] for k in ('dx', 'dy', 'escala', 'rot') if k in x}, 'ev': j}
    names = [dict(zip(('a', 'b'), span(x, 3.0)), nombre=x['nombre'], sub=x.get('sub', ''), color=x.get('color'), **libre(x, j)) for j, x in enumerate(ev.get('nombres', []))]
    labels = [dict(zip(('a', 'b'), span(x, 3.0)), texto=x['texto'], color=x.get('color'), **libre(x, j)) for j, x in enumerate(ev.get('etiquetas', []))]
    images = [dict(zip(('a', 'b'), span(x, 2.5)), src=x['src'], pos=x.get('pos', 'arriba'), ancho=x.get('ancho', 420),
                   titulo=x.get('titulo'), texto=x.get('texto'), tarjeta=x.get('tarjeta', True), **({'top': x['top']} if 'top' in x else {}), **libre(x, j))
              for j, x in enumerate(ev.get('imagenes', []))]
    broll = [dict(zip(('a', 'b'), span(x, 2.5)), src=x['src'], ev=j) for j, x in enumerate(ev.get('broll', []))]
    montos = [dict(zip(('a', 'b'), span(x, 2.5)), texto=x['texto'], **{k: x[k] for k in ('top', 'size', 'color', 'sub') if k in x}, **libre(x, j))
              for j, x in enumerate(ev.get('montos', []))]
    emojis = [dict(zip(('a', 'b'), span(x, 2.0)), emoji=x['emoji'], texto=x.get('texto'), **libre(x, j)) for j, x in enumerate(ev.get('emojis', []))]
    calendario = [dict(zip(('a', 'b'), span(x, 2.5)), dia=str(x['dia']), mes=x['mes'], **{k: x[k] for k in ('texto', 'top', 'color') if k in x}, **libre(x, j))
                  for j, x in enumerate(ev.get('calendario', []))]
    trans = []
    for t in ev.get('transiciones', []):
        s = next(x for x in secs if x['id'] == t['antes_de'])
        prev = secs[max(0, secs.index(s) - 1)]
        trans.append({"f": s['a'] - 2, "texto": t.get('texto', ''), "a": t.get('color_a', prev.get('color')),
                      "b": t.get('color_b', s.get('color')), "len": 22})

    hook = ev.get('gancho')
    hook_end = round(hook['dur'] * FPS) if hook and hook.get('dur') else (secs[0]['b'] if hook and len(secs) > 1 else (90 if hook else 0))
    if hook and not hook.get('dur') and (ev.get('intro_espacio') or hook.get('tras_intro')) and len(secs) > 2:
        hook_end = secs[1]['b']  # intro del creador (sección 1) → la pregunta (sección 2) es el gancho
    # nada se encima con el gancho: lo que empezaría durante el gancho espera a que termine (misma duración)
    if hook:
        for lst in (names, labels, images, montos, emojis, calendario):
            for x in lst:
                if x['a'] < hook_end:
                    d0 = x['b'] - x['a']
                    x['a'], x['b'] = hook_end + 4, hook_end + 4 + d0
    # SFX: manuales + automáticos según el estilo
    auto = est.get('sfx_auto', {})
    sfx = []
    add = lambda f, src, v, ln=45: sfx.append({"f": int(f), "src": src, "v": v, "len": ln})
    for s in ev.get('sfx', []):
        add(A.f(s['en'], s.get('offset', 0)), s['sfx'], s.get('vol', 0.4), round(s.get('dur', 1.5) * FPS))
    for f, src, v in enf_sfx:
        add(f, src, v)
    if auto.get('objeto'):
        for it in items:
            add(it['f'], auto['objeto'], auto.get('objeto_vol', 0.32))
    if auto.get('zoom'):
        for z in zooms:
            add(z['a'] - 2, auto['zoom'], auto.get('zoom_vol', 0.16))
    for a0, b0, *_ in fast:
        add(a0 - 6, 'ffwd', 0.4); add(b0 - 4, 'pop', 0.3)
    if auto.get('transicion'):
        for t in trans:
            add(t['f'], auto['transicion'], 0.45)
    for x in montos:
        add(x['a'], 'cash', 0.35)
    if auto.get('aparece'):
        for x in names + labels + images + emojis + calendario:
            add(x['a'], auto['aparece'], auto.get('aparece_vol', 0.3))
    for c in ev.get('censura', []):  # beep + subtítulo P***
        a0 = A.f(c['en'], -0.1)
        add(a0, 'beep', 0.5, round(c.get('dur', 0.6) * FPS))
    if hook:
        for el in hook.get('elementos', []):
            if el.get('en') is not None:
                el['at'] = A.f(el['en'])
        for s in hook.get('sfx', []):
            add(s['f'], s['sfx'], s.get('vol', 0.35))
    sfx = [s for s in sfx if 0 <= s['f'] < n]
    for s in sfx:
        s['len'] = min(s['len'], n - s['f'])
    hookfg = len(list((pr.P / 'public' / 'hookfg').glob('*.png'))) if (pr.P / 'public' / 'hookfg').exists() else 0
    tx, ty = face_track(pr, n, secs, cfg_secs, est.get('camara', {}).get('caras'))
    intro3d = None
    ie = ev.get('intro_espacio')
    if ie:
        s3 = next(x for x in secs if x['id'] == ie.get('sec', secs[0]['id']))
        hs = [el['at'] for el in (hook or {}).get('elementos', []) if el.get('at') is not None and el['at'] >= s3['b'] - 2]
        fin = (min(hs) - 6) if hs else s3['b']
        en = ie.get('en', [])
        intro3d = {"sec": s3['id'], "fin": fin, "titulo": ie.get('titulo', ['SEMANA MUNDIAL', 'DEL ESPACIO']), "hud": ie.get('hud', ''),
                   "t": [A.f(x) for x in en] + [None] * (3 - len(en)), "monedas": A.f(ie['monedas']) if ie.get('monedas') else None,
                   "planeta": ie.get('planeta', True), "cohete": ie.get('cohete', True), "warp": ie.get('warp', True)}
    data = {"n": n, "words": words, "secs": secs, "track": {"x": tx, "y": ty}, "fast": fast, "items": items, "zooms": zooms,
            "names": names, "labels": labels, "images": images, "broll": broll, "transitions": trans, "sfx": sfx,
            "hook": hook, "hookEnd": hook_end, "hookfg": hookfg, "cierre": ev.get('cierre'), "musica": ev.get('musica'),
            "montos": montos, "emojis": emojis, "calendario": calendario, "intro3d": intro3d}
    if intro3d:
        c = capa_path(pr, data)
        if (pr.P / 'public' / c).exists():
            intro3d['capa'] = c  # capa 3D ya renderizada para exactamente estos datos: se reusa
    jsave(pr.P / 'src' / 'data.json', data, indent=None)
    print(f"✓ src/data.json  {n} cuadros ({n / FPS:.1f} s) | secciones {[(s['id'], round(s['a'] / FPS, 1), round(s['b'] / FPS, 1)) for s in secs]}")
    if zooms:
        print("  zooms (s del corte; centra con  reel cuadricula -p P <t> …):", ' '.join(f"{(z['a'] + z['b']) / 2 / FPS:.1f}" for z in zooms))
    print(f"  objetos {len(items)} · zooms {len(zooms)} · sfx {len(sfx)} · nombres {len(names)} · etiquetas {len(labels)} · imágenes {len(images)} · cámara rápida {[(round(x / FPS, 1), round(y / FPS, 1)) for x, y, *_ in fast]}")




# ---------------------------------------------------------------- capas pre-renderizadas (3D)
def capa_path(pr, data):
    """Nombre de la capa 3D según lo que la define: código del componente + datos de la intro + palabras de esa sección.
    Si nada de eso cambia, la capa se reusa en cada render (el 3D es lo más lento de renderizar)."""
    i3 = {k: v for k, v in (data.get('intro3d') or {}).items() if k != 'capa'}
    comp = (pr.P / 'src' / 'components' / 'IntroEspacio.tsx')
    words = [w for w in data['words'] if w.get('sec') == i3.get('sec')]
    key = hashlib.md5((comp.read_text() if comp.exists() else '').encode() + json.dumps([i3, words], sort_keys=True).encode()).hexdigest()[:10]
    return f'capas/intro3d_{key}.mov'


def render_capas(pr, forzar=False):
    data = jload(pr.P / 'src' / 'data.json')
    i3 = data.get('intro3d')
    if not i3:
        return False
    c = capa_path(pr, data)
    out = pr.P / 'public' / c
    if out.exists() and not forzar:
        print(f"  capa 3D reusada: public/{c}")
    else:
        out.parent.mkdir(parents=True, exist_ok=True)
        for old in out.parent.glob('intro3d_*.mov'):
            old.unlink()
        i3.pop('capa', None); jsave(pr.P / 'src' / 'data.json', data, indent=None)
        print(f"… capa 3D (una sola vez, ProRes 4444 con transparencia, {i3['fin'] + 12} cuadros)")
        run(['npx', 'remotion', 'render', 'src/index.ts', 'Capa3D', out, '--codec=prores', '--prores-profile=4444',
             '--pixel-format=yuva444p10le', '--image-format=png', '--log=error'], cwd=pr.P)
    data['intro3d']['capa'] = c
    jsave(pr.P / 'src' / 'data.json', data, indent=None)
    return True


def cmd_capas(a):
    pr = Proyecto(a.proyecto)
    if not render_capas(pr, a.forzar):
        print("  (este proyecto no tiene intro_espacio en eventos.json)")


# ---------------------------------------------------------------- ayudas (sugieren; Claude decide)
LOGISTICA = ['ya', 'ya estas', 'sigue grabando', 'esta grabando', 'esperate', 'otra vez', 'de nuevo', 'repetimos', 'repito', 'corta', 'corte',
             'va', 'listo', 'empezamos', 'desde el principio', 'me equivoque', 'perdon', 'mande', 'como', 'que dije', 'puedo decir']


def cmd_tomas(a):
    """Reporte por clip: frases repetidas (tomas), palabras repetidas seguidas (arranques fallidos) y frases de logística.
    Es una SUGERENCIA para escribir plan.json: Claude sigue leyendo y decidiendo."""
    pr = Proyecto(a.proyecto)
    clips = a.clips or sorted(p.stem for p in (pr.ed / 'palabras').glob('*.json'))
    rep_all = []
    for stem in clips:
        W_ = pr.palabras(stem)
        nw = [norm(w[0]) for w in W_]
        out = [f"# {stem}"]
        # 1) enunciados (separados por pausas reales o fin de oración) y grupos de enunciados parecidos = tomas de lo mismo
        import difflib
        utt, cur = [], []
        for i, w in enumerate(W_):
            if cur and (w[1] - W_[i - 1][2] > 0.45 or re.search(r'[.?!]$', W_[i - 1][0])):
                utt.append(cur); cur = []
            cur.append(i)
        if cur:
            utt.append(cur)
        utt = [u for u in utt if len(u) >= 3]
        toks = [[nw[i] for i in u] for u in utt]
        sim = lambda x, y: difflib.SequenceMatcher(None, x, y).ratio()
        group = list(range(len(utt)))
        for x in range(len(utt)):
            for y in range(x + 1, len(utt)):
                a_, b_ = toks[x], toks[y]
                short, long_ = sorted((a_, b_), key=len)
                prefix = len(short) >= 3 and long_[:len(short)] == short
                if sim(a_, b_) >= 0.6 or prefix or difflib.SequenceMatcher(None, short, long_).find_longest_match(0, len(short), 0, len(long_)).size >= max(4, int(len(short) * 0.8)):
                    gx, gy = group[x], group[y]
                    group = [gx if g == gy else g for g in group]
        clusters = {}
        for k, g in enumerate(group):
            clusters.setdefault(g, []).append(k)
        reps = [v for v in clusters.values() if len(v) > 1]
        if reps:
            out.append("## frases repetidas (tomas de lo mismo) — normalmente la ÚLTIMA completa y fluida es la buena")
            for v in sorted(reps):
                best = max(v, key=lambda k: (len(utt[k]) >= 0.8 * max(len(utt[q]) for q in v), k))
                for n_, k in enumerate(v):
                    u = utt[k]
                    mark = "  ← sugerida" if k == best else ""
                    out.append(f"  toma {n_ + 1}: [{u[0]}–{u[-1]}] {W_[u[0]][1]:6.2f}s  {' '.join(W_[i][0] for i in u)}{mark}")
                out.append("")
        # 2) arranques fallidos: misma palabra o par de palabras repetidas seguidas ("unas pastillas, unas pastillas")
        fs = []
        for i in range(len(nw) - 1):
            for n in (1, 2, 3):
                if i + 2 * n <= len(nw) and nw[i:i + n] == nw[i + n:i + 2 * n] and all(len(x) > 1 for x in nw[i:i + n]):
                    if fs and i <= fs[-1][1] + 1:  # repeticiones encadenadas ("sí, sí, sí") → un solo rango
                        fs[-1] = (fs[-1][0], max(fs[-1][1], i + n - 1))
                    elif not fs or i > fs[-1][1]:
                        fs.append((i, i + n - 1))
                    break
        if fs:
            out.append("## repeticiones seguidas (candidatas a 'quitar')")
            for i, j in fs:
                out.append(f"  quitar [{i}–{j}]  {W_[i][1]:.2f}s  …{' '.join(w[0] for w in W_[max(0, i - 3):j + 2 * (j - i + 1) + 3])}…")
        # 3) logística / habla al equipo
        lg = []
        for i in range(len(nw)):
            for L in LOGISTICA:
                q = L.split()
                if nw[i:i + len(q)] == q and (len(q) > 1 or (i + 1 < len(W_) and W_[i + 1][1] - W_[i][1] > 0.8) or W_[i][0].endswith('?')):
                    lg.append((i, i + len(q) - 1, L)); break
        if lg:
            out.append("## posible logística (no va en el video)")
            for i, j, L in lg:
                out.append(f"  [{i}–{j}] {W_[i][1]:.2f}s  «{' '.join(w[0] for w in W_[max(0, i - 2):j + 3])}»")
        if len(out) == 1:
            out.append("  (sin hallazgos)")
        rep_all += out + ['']
    txt = '\n'.join(rep_all)
    (pr.ed / 'tomas.txt').write_text(txt)
    print(txt + f"→ guardado en edicion/tomas.txt (sugerencias; confirma leyendo el .txt de cada clip)")


def cmd_zooms(a):
    """Sugiere cx/cy de cada zoom (manos detectadas en varios cuadros del tramo) y genera una imagen con una cruz en el
    punto propuesto para verificarlo de un vistazo. Solo rellena zooms sin cx/cy (o todos con --todos)."""
    import numpy as np
    pr = Proyecto(a.proyecto)
    evp = pr.ed / 'eventos.json'
    ev = jload(evp)
    data = jload(pr.P / 'src' / 'data.json')
    words, secs = data['words'], data['secs']
    A = Anchors(words, secs)
    cut = pr.P / 'public' / 'cut.mp4'
    d = pr.cache / 'zz'
    imgs = []
    for k, z in enumerate(ev.get('zooms', [])):
        a0 = A.t(z['en'], z.get('offset', -0.15))
        b0 = A.t(z['hasta']) if z.get('hasta') is not None else a0 + z.get('dur', 1.7)
        if a.todos or 'cx' not in z or 'cy' not in z or z.get('auto'):
            if d.exists():
                shutil.rmtree(d)
            d.mkdir()
            ts = [a0 + (b0 - a0) * f for f in (0.3, 0.5, 0.7, 0.9)]
            for i, t in enumerate(ts):
                ff('-ss', t, '-i', cut, '-frames:v', '1', '-vf', 'scale=540:960', d / f'{i}.jpg')
            H_ = json.loads(run([BIN / 'hands'] + [d / f'{i}.jpg' for i in range(len(ts))], capture_output=True, text=True).stdout or '{}')
            run([BIN / 'faces', d, d / 'f.json'], capture_output=True)
            FC = jload(d / 'f.json', [])
            sec = next((x for x in secs if x['a'] <= a0 * FPS < x['b']), secs[-1])['id']
            lado = ev.get('secciones', {}).get(sec, {}).get('sujeto', 'centro')
            pts = []
            for i in range(len(ts)):
                faces = sorted([f for f in (FC[i] if i < len(FC) else []) if f[2] > 0.035], key=lambda f: -f[2])[:3]
                if lado == 'izquierda' and faces:
                    subj = min(faces, key=lambda f: f[0])
                elif lado == 'derecha' and faces:
                    subj = max(faces, key=lambda f: f[0])
                else:
                    subj = min(faces, key=lambda f: abs(f[0] - 0.5)) if faces else [0.5, 0.35, 0.1]
                for h in H_.get(f'{i}.jpg', []):
                    if h[2] < 0.3:
                        continue
                    near_face = any(((h[0] - f[0]) ** 2 + ((h[1] - f[1]) * 16 / 9) ** 2) ** 0.5 < 0.13 for f in faces)
                    below = h[1] > subj[1] + 0.06 and abs(h[0] - subj[0]) < 0.28
                    if below and not near_face:
                        pts.append(h)
            if pts:
                cx, cy = float(np.median([h[0] for h in pts])), float(np.median([h[1] for h in pts]))
                z.update({"cx": round(cx, 3), "cy": round(min(0.75, cy), 3), "auto": True})
            else:
                z.update({"cx": z.get('cx', 0.5), "cy": z.get('cy', 0.5), "auto": True})
                print(f"  zoom {k}: sin manos claras del sujeto; revisa a mano")
        # imagen de verificación con cruz
        t = (a0 + b0) / 2
        o = pr.cache / f'zc{k}.png'
        x, y = int(z['cx'] * 360), int(z['cy'] * 640)
        ff('-ss', t, '-i', cut, '-frames:v', '1', '-vf',
           f"scale=360:640,drawbox=x={x - 60}:y={y - 60}:w=120:h=120:color=yellow@0.9:t=3,drawbox=x={x - 1}:y={y - 12}:w=3:h=24:color=red:t=fill,"
           f"drawbox=x={x - 12}:y={y - 1}:w=24:h=3:color=red:t=fill", o)
        imgs.append(o)
        print(f"  zoom {k}: {z['en']!s:<22} t={t:5.1f}s  cx={z['cx']} cy={z['cy']}" + ("  (auto)" if z.get('auto') else ""))
    jsave(evp, ev)
    if imgs:
        (pr.ed / 'revision').mkdir(exist_ok=True)
        tile(imgs, pr.ed / 'revision' / 'zooms.png', min(4, len(imgs)))
        print(f"✓ edicion/revision/zooms.png — el recuadro amarillo ≈ lo que se verá en el zoom. Corrige cx/cy en eventos.json si no cae en el objeto,"
              f" quita \"auto\" y corre  reel datos")


def cmd_niveles(a):
    """Mide el volumen (LUFS) de cada sección del corte y sugiere gain_db para emparejar personas (solo ganancia)."""
    pr = Proyecto(a.proyecto)
    E = jload(pr.ed / 'edl_final.json')
    cut = pr.P / 'public' / 'cut.mp4'
    secs = {}
    for p in E:
        s0 = secs.setdefault(p['sec'], [p['start'], p['start'] + p['frames']])
        s0[1] = p['start'] + p['frames']
    res = {}
    for sec, (f0, f1) in secs.items():
        r = subprocess.run(['ffmpeg', '-nostdin', '-ss', str(f0 / FPS), '-to', str(f1 / FPS), '-i', str(cut), '-af', 'ebur128', '-f', 'null', '-'],
                           capture_output=True, text=True).stderr
        m = re.findall(r'I:\s+(-?[\d.]+) LUFS', r)
        if m:
            res[sec] = float(m[-1])
    ref = sorted(res.values())[len(res) // 2]
    plan = jload(pr.ed / 'plan.json')
    print(f"{'sección':<14}{'LUFS':>7}{'sugerido':>10}")
    changed = False
    for sec, L in res.items():
        g = round(ref - L, 1)
        g = g if abs(g) >= 1.5 else 0.0
        print(f"{sec:<14}{L:>7.1f}{g:>+9.1f} dB")
        if a.aplicar and g:
            for pz in plan['piezas']:
                if pz.get('sec', 'main') == sec:
                    pz['gain_db'] = round(pz.get('gain_db', 0) + g, 1); changed = True
    if a.aplicar and changed:
        jsave(pr.ed / 'plan.json', plan)
        print("✓ gain_db aplicado en plan.json → corre  reel edl  y  reel cortar")
    elif not a.aplicar:
        print("(diferencias < 1.5 dB se ignoran; usa --aplicar para escribirlo en plan.json)")


# ---------------------------------------------------------------- audio externo
def _env(path, start=0.0, dur=240.0, sr=1000):
    """envolvente de energía (1 kHz) para sincronizar por correlación"""
    import numpy as np
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', str(max(0, start)), '-t', str(dur), '-i', str(path), '-vn', '-ac', '1',
                          '-ar', '8000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(float)
    x = np.abs(x[: len(x) // 8 * 8]).reshape(-1, 8).mean(1)
    x = np.log1p(x)
    return x - x.mean()


def cmd_audio(a):
    """Sincroniza el audio de un micrófono externo con un clip de cámara (correlación de envolventes) y lo usa en vez del de la cámara."""
    import numpy as np
    pr = Proyecto(a.proyecto)
    ext = Path(a.archivo).expanduser().resolve() if Path(a.archivo).expanduser().exists() else pr.fuentes / a.archivo
    if a.offset is None:
        cam, mic = _env(pr.fuente(a.clip), 0, 240), _env(ext, 0, 600)
        n = 1 << int(np.ceil(np.log2(len(cam) + len(mic))))
        xc = np.fft.irfft(np.fft.rfft(mic, n) * np.conj(np.fft.rfft(cam, n)), n)
        lags = np.concatenate([np.arange(0, len(mic)), np.arange(-len(cam) + 1, 0)])
        vals = np.concatenate([xc[:len(mic)], xc[n - len(cam) + 1:]])
        i = int(np.argmax(vals))
        off = lags[i] / 1000.0
        rest = vals[np.abs(lags - lags[i]) > 500]  # mejor coincidencia fuera de ±0.5 s del pico
        conf = vals[i] / (rest.max() + 1e-9) if rest.size and rest.max() > 0 else 9.9
        print(f"offset {off:+.3f} s (t_externo = t_cámara {off:+.3f}) · confianza {conf:.1f}x" + ("" if conf > 1.3 else "  ⚠ baja: verifica o pasa --offset"))
    else:
        off = a.offset
    pr.cfg.setdefault('audio_externo', {})[a.clip] = {"archivo": str(ext), "offset": round(off, 3)}
    pr.guardar_cfg()
    print(f"✓ {a.clip} usará el audio de {ext.name}. Vuelve a correr transcribir (ese clip) → edl → cortar.")


# ---------------------------------------------------------------- logos / qr / broll / dividir
def _http(url, tries=4):
    import time
    import urllib.request
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "editar-reel/1.0 (video personal; contacto local)"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except Exception:
            time.sleep(3 + 3 * i)
    return None


def _wiki(host, **params):
    import time
    import urllib.parse
    params.update(format="json")
    raw = _http(f"https://{host}/w/api.php?" + urllib.parse.urlencode(params))
    time.sleep(1.0)
    return json.loads(raw) if raw else {}


def _thumb(host, title, width=1200):
    d = _wiki(host, action="query", titles=title, prop="imageinfo", iiprop="url", iiurlwidth=width)
    for p in d.get("query", {}).get("pages", {}).values():
        if "imageinfo" in p:
            return p["imageinfo"][0].get("thumburl") or p["imageinfo"][0]["url"]
    return None


def cmd_logos(a):
    """Logos oficiales desde Wikimedia (Wikipedia es/en → imágenes con 'logo'; si no, búsqueda en Commons).
    'Nombre' o 'Nombre=File:Archivo exacto.svg'. Guarda PNG recortado en public/logos/<slug>.png."""
    from PIL import Image
    pr = Proyecto(a.proyecto)
    out = pr.P / 'public' / 'logos'
    out.mkdir(parents=True, exist_ok=True)
    src = jload(out / 'fuentes.json', {})
    for item in a.empresas:
        name, _, forced = item.partition('=')
        slug = re.sub(r'[^a-z0-9]+', '-', norm(name)).strip('-') or 'logo'
        url = _thumb("commons.wikimedia.org", forced) if forced else None
        # 1) Wikidata P154 (logo oficial; preferido el de rango 'preferred', si no el más reciente)
        if not url:
            for lang in ('es', 'en'):
                ents = _wiki("www.wikidata.org", action="wbsearchentities", search=name, language=lang, limit=3, type="item").get('search', [])
                for e in ents:
                    cl = []
                    for prop in ('P154', 'P158', 'P94'):  # logo · sello (instituciones) · escudo
                        cl = _wiki("www.wikidata.org", action="wbgetclaims", entity=e['id'], property=prop).get('claims', {}).get(prop, [])
                        if cl:
                            break
                    if not cl:
                        continue
                    pref = [c for c in cl if c.get('rank') == 'preferred'] or [c for c in cl if c.get('rank') != 'deprecated'] or cl
                    fname = pref[-1]['mainsnak'].get('datavalue', {}).get('value')
                    if fname:
                        url = _thumb("commons.wikimedia.org", "File:" + fname)
                        print(f"  {name}: Wikidata {e['id']} ({e.get('label', '')}: {e.get('description', '')}) → {fname}")
                        break
                if url:
                    break
        # 2) imágenes 'logo' del artículo de Wikipedia (sin íconos genéricos de Wikimedia)
        GENERIC = ('wikidata', 'commons-logo', 'wikiquote', 'wiktionary', 'wikisource', 'wikinews', 'wikibooks', 'wikiversity', 'wikivoyage',
                   'wikispecies', 'edit-', 'oojs', 'disambig', 'padlock', 'question_book', 'ambox', 'portal', 'flag', 'symbol_', 'increase', 'decrease')
        for lang in ('es', 'en'):
            if url:
                break
            sr = _wiki(f"{lang}.wikipedia.org", action="query", list="search", srsearch=name, srlimit=1)
            hits = sr.get("query", {}).get("search", [])
            if not hits:
                continue
            d = _wiki(f"{lang}.wikipedia.org", action="query", titles=hits[0]['title'], prop="images", imlimit=80, redirects=1)
            imgs = [i["title"] for p in d.get("query", {}).get("pages", {}).values() for i in p.get("images", [])
                    if not any(g in i["title"].lower() for g in GENERIC)]
            key = norm(name.split()[0])
            cand = [i for i in imgs if 'logo' in i.lower() and key in norm(i)]  # el nombre debe coincidir (evita logos de otras marcas del artículo)
            for c in cand:
                url = _thumb(f"{lang}.wikipedia.org", c)
                if url:
                    break
        # 3) búsqueda en Commons, solo archivos cuyo nombre contenga el de la empresa
        if not url:
            d = _wiki("commons.wikimedia.org", action="query", list="search", srsearch=f"{name} logo", srnamespace=6, srlimit=8)
            for h in [h for h in d.get("query", {}).get("search", []) if norm(name.split()[0]) in norm(h['title'])]:
                url = _thumb("commons.wikimedia.org", h['title'])
                if url:
                    break
        data = _http(url) if url else None
        if not data:
            print(f"✗ {name}: no encontrado (prueba 'Nombre=File:Archivo.svg' de commons.wikimedia.org)")
            continue
        tmp = out / f'{slug}.orig'
        tmp.write_bytes(data)
        im = Image.open(tmp).convert('RGBA')
        bb = im.getchannel('A').getbbox()  # quita margen transparente (si no, el logo se ve chiquito)
        if bb:
            im = im.crop(bb)
        im.save(out / f'{slug}.png')
        tmp.unlink()
        src[slug] = url
        print(f"✓ {name} → public/logos/{slug}.png  ({im.width}x{im.height})  {url}")
    jsave(out / 'fuentes.json', src)
    print("→ revisa visualmente cada logo (Read) antes de usarlo; si es incorrecto usa 'Nombre=File:…'")


def cmd_qr(a):
    """Lee a dónde lleva el QR de una foto, lo recorta cuadrado con margen, lo escala a 900x900 y verifica que se lea."""
    from PIL import Image
    pr = Proyecto(a.proyecto)
    foto = Path(a.foto) if Path(a.foto).exists() else pr.fuentes / a.foto
    if foto.suffix.lower() == '.heic':
        jpg = pr.cache / (foto.stem + '.jpg')
        run(['sips', '-s', 'format', 'jpeg', foto, '--out', jpg], capture_output=True)
        foto = jpg
    r = run([BIN / 'qrbox', foto], capture_output=True, text=True).stdout.strip().splitlines()
    if not r:
        sys.exit(f"✗ no se detectó QR en {foto.name}")
    im = Image.open(foto).convert('RGB')
    out_dir = pr.P / 'public' / 'qr'
    out_dir.mkdir(parents=True, exist_ok=True)
    seen, uniq = set(), []
    for line in r:  # el mismo QR puede detectarse dos veces
        pay = line.rsplit(' ', 1)[-1]
        if pay not in seen:
            seen.add(pay); uniq.append(line)
    r = uniq
    for k, line in enumerate(r):
        m = re.match(r'^(.*?) (-?\d+\.\d+) (-?\d+\.\d+) (-?\d+\.\d+) (-?\d+\.\d+) ?(.*)$', line)
        if not m:
            continue
        x, y, w, h = map(float, m.group(2, 3, 4, 5))
        payload = m.group(6)
        cx, cy, side = (x + w / 2) * im.width, (y + h / 2) * im.height, max(w * im.width, h * im.height) * (1 + 2 * a.margen)
        box = tuple(int(v) for v in (cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2))
        name = (a.nombre or foto.stem) + (f'_{k}' if len(r) > 1 else '')
        dst = out_dir / f'{name}.jpg'
        im.crop(box).resize((900, 900), Image.LANCZOS).save(dst, quality=95)
        chk = run([BIN / 'qrscan', dst], capture_output=True, text=True).stdout.strip()
        ok = payload and payload in chk
        print(f"{'✓' if ok else '⚠'} public/qr/{dst.name}  → {payload}" + ("" if ok else f"   (relectura: {chk})"))
    print("→ escribe el texto de la tarjeta según el destino (formulario → 'REGÍSTRATE AQUÍ', WhatsApp → 'MANDA TU CV POR WHATSAPP'…)")


def cmd_broll(a):
    """Prepara una toma de apoyo: (HDR→SDR), recorte vertical 1080x1920, 30 fps, sin audio → public/broll/<nombre>.mp4"""
    pr = Proyecto(a.proyecto)
    f = pr.fuente(a.clip)
    v = next(s for s in probe(f)['streams'] if s['codec_type'] == 'video')
    vin = f
    if v.get('color_transfer') in ('arib-std-b67', 'smpte2084'):
        sdr = pr.sdr(a.clip)
        if not sdr.exists():
            sdr.parent.mkdir(exist_ok=True)
            run([BIN / 'hdr_a_sdr', f, sdr], capture_output=True)
        vin = sdr
    out = pr.P / 'public' / 'broll' / f"{a.nombre or a.clip}.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    ff('-ss', a.de, '-t', a.dur, '-i', vin, '-an', '-vf',
       'fps=30,scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920', '-c:v', 'libx264', '-crf', '17',
       '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', out)
    print(f"✓ public/broll/{out.name}  ({a.dur} s) → en eventos.json: " + json.dumps({"broll": [{"en": "<ancla>", "dur": a.dur, "src": f"broll/{out.name}"}]}, ensure_ascii=False))


def cmd_dividir(a):
    """Divide un proyecto en varios videos por secciones. Cada parte es un proyecto nuevo con su plan filtrado y una copia de
    eventos.json (ajusta su gancho: cada video necesita el suyo, y la pregunta debe oírse al inicio de cada uno)."""
    pr = Proyecto(a.proyecto)
    plan = jload(pr.ed / 'plan.json')
    ev = jload(pr.ed / 'eventos.json', {})
    if len(a.nombres) != len(a.partes):
        sys.exit("✗ pasa un --nombres por cada parte")
    for secs, nombre in zip(a.partes, a.nombres):
        keep = [x.strip() for x in secs.split(',')]
        plain = ''.join(c for c in unicodedata.normalize('NFD', nombre.lower()) if unicodedata.category(c) != 'Mn')
        slug = re.sub(r'[^a-z0-9]+', '_', plain).strip('_')
        dest = pr.P.parent / f"{pr.P.name}_{slug}"
        shutil.copytree(pr.P, dest, dirs_exist_ok=True, symlinks=True,
                        ignore=shutil.ignore_patterns('cut.mp4', 'cut_proxy.mp4', 'versiones', 'respaldo', 'revision', 'borrador.mp4', 'hookfg'))
        p2 = {**plan, "piezas": [x for x in plan['piezas'] if x.get('sec', 'main') in keep]}
        missing = set(keep) - {x.get('sec', 'main') for x in p2['piezas']}
        if missing:
            sys.exit(f"✗ secciones sin piezas: {missing}")
        jsave(dest / 'edicion' / 'plan.json', p2)
        e2 = json.loads(json.dumps(ev))
        e2['secciones'] = {k: v for k, v in ev.get('secciones', {}).items() if k in keep}
        # quita los eventos anclados a secciones que no van en esta parte
        otras = {x.get('sec', 'main') for x in plan['piezas']} - set(keep)
        def ajena(an):
            if isinstance(an, str):
                return an.split(':', 1)[0] in otras if ':' in an else False
            return isinstance(an, dict) and an.get('sec') in otras
        quitados = 0
        for k, v in list(e2.items()):
            if isinstance(v, list):
                nv = [x for x in v if not (ajena(x) or (isinstance(x, dict) and (ajena(x.get('en')) or ajena(x.get('hasta')))))]
                quitados += len(v) - len(nv)
                e2[k] = nv
        for el in (e2.get('gancho') or {}).get('elementos', []):
            if ajena(el.get('en')):
                el.pop('en')  # entra por cuadro (`at`); el gancho de esta parte hay que reescribirlo de todos modos
        jsave(dest / 'edicion' / 'eventos.json', e2)
        # la parte usa los mismos clips SDR del proyecto original (si no, `cortar` tomaría el HDR crudo del iPhone)
        sdr_dst = TK / 'cache' / hashlib.md5(str(dest.resolve()).encode()).hexdigest()[:10] / 'sdr'
        sdr_dst.parent.mkdir(parents=True, exist_ok=True)
        if (pr.cache / 'sdr').exists() and not sdr_dst.exists():
            sdr_dst.symlink_to(pr.cache / 'sdr', target_is_directory=True)
        cfg = {**pr.cfg, "nombre": nombre, "id": hashlib.md5(str(dest.resolve()).encode()).hexdigest()[:10]}  # caché propia
        jsave(dest / 'edicion' / 'proyecto.json', cfg)
        for stale in ('edl.json', 'edl_final.json', 'cambios.md', 'verificacion.txt'):
            (dest / 'edicion' / stale).unlink(missing_ok=True)
        print(f"✓ {dest.name}: secciones {keep} → '{nombre}.mp4'  ({quitados} eventos de otras secciones quitados)")
    print("→ en cada parte: ajusta gancho/eventos (las anclas de otras secciones fallarán en `datos` y te lo dirá), luego edl → cortar → datos → render")


# ---------------------------------------------------------------- revisión
def tile(imgs, out, cols=4):
    rows = math.ceil(len(imgs) / cols)
    inputs = sum([['-i', str(i)] for i in imgs], [])
    pad = cols * rows - len(imgs)
    fc = ''.join(f'[{i}]scale=360:640[s{i}];' for i in range(len(imgs)))
    fc += ''.join(f'color=c=black:s=360x640:d=1[p{k}];' for k in range(pad))
    labels = [f'[s{i}]' for i in range(len(imgs))] + [f'[p{k}]' for k in range(pad)]
    rws = []
    for r in range(rows):
        fc += ''.join(labels[r * cols:(r + 1) * cols]) + (f'hstack={cols}[r{r}];' if cols > 1 else f'null[r{r}];')
        rws.append(f'[r{r}]')
    fc += ''.join(rws) + (f'vstack={rows}' if rows > 1 else 'null')
    ff(*inputs, '-filter_complex', fc, '-frames:v', '1', out)


def cmd_cuadricula(a):
    pr = Proyecto(a.proyecto)
    d = pr.ed / 'revision'
    d.mkdir(exist_ok=True)
    imgs = []
    for k, t in enumerate(a.tiempos):
        o = pr.cache / f'g{k}.png'
        ff('-ss', t, '-i', pr.P / 'public' / 'cut.mp4', '-frames:v', '1', '-vf',
           "scale=360:640,drawgrid=w=36:h=64:t=1:c=white@0.4,drawgrid=w=180:h=320:t=2:c=red@0.8", o)
        imgs.append(o)
    out = d / 'cuadricula.png'
    tile(imgs, out, min(4, len(imgs)))
    print(f"✓ {out}\n  cada celda blanca = 0.1 (x de izq. a der., y de arriba a abajo); líneas rojas = 0.5. Orden: {', '.join(a.tiempos)}")


def remotion_still(pr, f, out):
    run(['npx', 'remotion', 'still', 'src/index.ts', 'Reel', out, f'--frame={f}', '--color-space=bt709', '--log=error'],
        cwd=pr.P, capture_output=True)


def cmd_revisar(a):
    pr = Proyecto(a.proyecto)
    d = pr.ed / 'revision'
    d.mkdir(exist_ok=True)
    imgs = []
    guide = ("drawbox=x=0:y=0:w=1080:h=250:color=red@0.25:t=fill,drawbox=x=905:y=0:w=175:h=1920:color=red@0.18:t=fill,"
             "drawbox=x=0:y=0:w=125:h=1920:color=red@0.18:t=fill,drawbox=x=0:y=1500:w=1080:h=420:color=red@0.25:t=fill,"
             "drawbox=x=539:y=0:w=2:h=1920:color=cyan@0.8:t=fill")
    for f in a.frames:
        o = pr.cache / f's{f}.png'
        remotion_still(pr, f, o)
        if not a.sin_guias:
            ff('-i', o, '-vf', guide, pr.cache / f'sg{f}.png')
            o = pr.cache / f'sg{f}.png'
        imgs.append(o)
    out = d / 'stills.jpg'
    tile(imgs, out, min(4, len(imgs)))
    print(f"✓ {out}  (cuadros {', '.join(map(str, a.frames))}; rojo = zona que tapa la app, línea cian = centro)")


def cmd_recorte(a):
    need_toolkit()
    pr = Proyecto(a.proyecto)
    src = pr.cache / 'hookframes'
    if src.exists():
        shutil.rmtree(src)
    src.mkdir()
    ff('-i', pr.P / 'public' / 'cut.mp4', '-frames:v', a.frames, '-vf', f'scale={W}:{H}', '-start_number', '0', src / '%04d.png')
    out = pr.P / 'public' / 'hookfg'
    if out.exists():
        shutil.rmtree(out)
    run([BIN / 'personmatte', src, out, W, H], capture_output=True)
    shutil.rmtree(src)
    print(f"✓ {len(list(out.glob('*.png')))} recortes en public/hookfg (vuelve a correr  reel datos)")


# ---------------------------------------------------------------- render
def loudness(path):
    r = subprocess.run(['ffmpeg', '-nostdin', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    summ = r[r.rfind('Summary'):]
    I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1))
    pk = re.search(r'Peak:\s+(-?[\d.]+|-inf) dBFS', summ)
    return I, (float(pk.group(1)) if pk and pk.group(1) != '-inf' else None)


def remotion_render(args, cwd):
    """npx remotion render …; con --json lee el avance de Remotion ("Rendered 120/900") y lo emite como progreso"""
    if not JSON_MODE:
        return run(['npx', 'remotion', 'render', *args, '--log=error'], cwd=cwd)
    p = subprocess.Popen([str(c) for c in ['npx', 'remotion', 'render', *args, '--log=verbose']], cwd=cwd,
                         stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    ultimo, cola = -1, []
    for linea in p.stdout:
        cola = (cola + [linea])[-30:]
        m = re.search(r'(?:Rendered|Encoded)\s+(\d+)/(\d+)', linea)
        if m:
            i, n = int(m.group(1)), int(m.group(2))
            pct = int(100 * i / max(1, n))
            if pct != ultimo:
                ultimo = pct
                progreso(i, n, 'render' if 'Rendered' in linea else 'codificando')
    if p.wait() != 0:
        sys.stderr.write(''.join(cola))
        raise subprocess.CalledProcessError(p.returncode, 'remotion render')


def cmd_render(a):
    need_toolkit()
    pr = Proyecto(a.proyecto)
    raw = pr.cache / 'raw.mp4'
    import datetime
    render_capas(pr)  # la capa 3D se renderiza una vez y se reusa (borrador y final)
    if a.borrador:
        # borrador rápido para aprobar el corte: mitad de resolución, sin verificación completa
        out = pr.ed / 'borrador.mp4'
        hacer_proxy(pr)
        print("… borrador (540x960, proxy)")
        remotion_render(['src/index.ts', 'Reel', raw, '--codec=h264', '--crf=26', '--scale=0.5',
                         '--color-space=bt709', '--props={"proxy":true}'], cwd=pr.P)
        I, _ = loudness(raw)
        ff('-i', raw, '-c:v', 'copy', '-af', f"volume={round(a.lufs - I, 2)}dB,alimiter=limit=0.89:attack=1:release=60:level=disabled",
           '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out)
        raw.unlink()
        print(f"✓ borrador: {out}  ({float(probe(out)['format']['duration']):.1f} s)")
        return
    print("… render Remotion (bt709" + (", 4K 2160x3840" if a.k4 else "") + ")")
    # REEL_HW=1: codificador de hardware (VideoToolbox) + 8 hilos → 4K ~2× más rápido en Apple Silicon (M5: 240 cuadros 4K en ~20 s)
    calidad = (['--hardware-acceleration=if-possible', '--concurrency=8', f"--video-bitrate={'80M' if a.k4 else '25M'}"]
               if os.environ.get('REEL_HW') == '1' else ['--crf=17'])
    remotion_render(['src/index.ts', 'Reel', raw, '--codec=h264', *calidad, '--audio-bitrate=320k',
                     '--color-space=bt709', *(['--scale=2'] if a.k4 else [])], cwd=pr.P)
    I, _ = loudness(raw)
    g = round(a.lufs - I, 2)
    name = a.salida or (pr.cfg['nombre'] + (' 4K' if a.k4 else '') + '.mp4')
    final = pr.fuentes / name
    # historial: la versión anterior pasa a P/versiones/ (se guardan las últimas 3)
    vdir = pr.P / 'versiones'
    hist = pr.ed / 'cambios.md'
    n_ver = 1 + sum(1 for l in (hist.read_text().splitlines() if hist.exists() else []) if l.startswith('## v'))
    if final.exists():
        vdir.mkdir(exist_ok=True)
        shutil.move(str(final), vdir / f"{final.stem} v{n_ver - 1}.mp4")
        olds = sorted(vdir.glob(f"{final.stem} v*.mp4"), key=lambda f: int(re.search(r' v(\d+)\.mp4$', f.name).group(1)))
        for f in olds[:-3]:
            f.unlink()
    ff('-i', raw, '-c:v', 'copy', '-af', f"volume={g}dB,alimiter=limit=0.89:attack=1:release=60:level=disabled", '-c:a', 'aac',
       '-b:a', '320k', '-movflags', '+faststart', final)
    raw.unlink()
    I2, pk = loudness(final)
    d = probe(final)
    v = next(s for s in d['streams'] if s['codec_type'] == 'video')
    dur = float(d['format']['duration'])
    data = jload(pr.P / 'src' / 'data.json')
    cierre = (data.get('cierre') or {}).get('dur', 0) if data.get('cierre') else 0
    sil = [s for s in silences(final) if s[0] < dur - cierre - 0.2]
    with open(hist, 'a') as fh:
        fh.write(f"## v{n_ver} · {datetime.datetime.now():%Y-%m-%d %H:%M} · {dur:.1f} s · {I2:.1f} LUFS\n{a.nota or '(sin nota)'}\n\n")
    print(f"✓ {final}  (v{n_ver})\n  duración {dur:.1f} s · {I2:.1f} LUFS · pico {pk} dBFS (ganancia {g:+.1f} dB) · "
          f"color {v.get('color_primaries')}/{v.get('color_transfer')} · {v['width']}x{v['height']}")
    print("  silencios > 0.35 s: " + ("ninguno ✓" if not sil else ', '.join(f"{s:.1f}–{(e or dur):.1f}" for s, e in sil) + "  ⚠ revisar"))
    if v.get('color_primaries') != 'bt709':
        print("  ⚠ el color no quedó bt709")
    if n_ver > 1:
        print(f"  versión anterior en {vdir}  · historial: edicion/cambios.md")


def hacer_proxy(pr, forzar=False):
    """public/cut_proxy.mp4: corte a 540x960 con GOP corto (busca rápido en la vista previa y en el borrador)"""
    cut, proxy = pr.P / 'public' / 'cut.mp4', pr.P / 'public' / 'cut_proxy.mp4'
    if forzar or not proxy.exists() or proxy.stat().st_mtime < cut.stat().st_mtime:
        ff('-i', cut, '-vf', 'scale=540:960', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-g', '15', '-c:a', 'copy', proxy)
    return proxy


def cmd_proxy(a):
    pr = Proyecto(a.proyecto)
    if not (pr.P / 'public' / 'cut.mp4').exists():
        sys.exit("✗ falta public/cut.mp4 (corre cortar)")
    p = hacer_proxy(pr, True)
    print(f"✓ {p.relative_to(pr.P)}  (540x960, vista previa fluida)")


def cmd_extras(a):
    """Entregables extra junto al video: subtítulos .srt (mismos bloques que en pantalla) y portada .jpg (gancho completo)."""
    pr = Proyecto(a.proyecto)
    data = jload(pr.P / 'src' / 'data.json')
    est = jload(pr.P / 'src' / 'estilo.json')['subtitulos']
    base = pr.fuentes / pr.cfg['nombre']
    # --- SRT (frases completas, más cómodo para subir a TikTok/YouTube que los bloques de 1–3 palabras)
    words = data['words']
    blocks, cur = [], []
    for i, w in enumerate(words):
        txt = ' '.join(x['text'] for x in cur)
        if cur and (w['sec'] != words[i - 1]['sec'] or w.get('corte') or len(txt) + len(w['text']) > 42
                    or (len(txt) >= 18 and w['start'] - words[i - 1]['end'] > 0.25)):
            blocks.append(cur); cur = []
        cur.append(w)
        txt = ' '.join(x['text'] for x in cur)
        if re.search(r'[.?!]$', w['text']) or (re.search(r',$', w['text']) and len(txt) >= 18):
            blocks.append(cur); cur = []
    if cur:
        blocks.append(cur)
    def ts(t):
        ms = int(round(t * 1000))
        return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
    lines = []
    for k, b in enumerate(blocks):
        end = min(b[-1]['end'] + 0.2, blocks[k + 1][0]['start'] if k + 1 < len(blocks) else b[-1]['end'] + 0.2)
        t = ' '.join(x['text'] for x in b).rstrip(',')
        if k == 0 or re.search(r'[.?!]$', blocks[k - 1][-1]['text']) or b[0].get('corte'):  # mayúscula solo al iniciar oración
            t = re.sub(r'^([¿¡]?)(\w)', lambda m: m.group(1) + m.group(2).upper(), t)
        lines += [str(k + 1), f"{ts(b[0]['start'])} --> {ts(end)}", t, '']
    srt = base.with_name(base.name + '.srt')
    srt.write_text('\n'.join(lines))
    print(f"✓ {srt.name}  ({len(blocks)} subtítulos)")
    # --- portada: el gancho ya completo (o --frame)
    f = a.frame if a.frame is not None else max(0, (data.get('hookEnd') or 45) - 12)
    png = pr.cache / 'portada.png'
    remotion_still(pr, f, png)
    jpg = base.with_name(base.name + ' - portada.jpg')
    ff('-i', png, '-q:v', '2', jpg)
    print(f"✓ {jpg.name}  (cuadro {f}; otro con --frame N)")
    print("→ escribe también el texto del post en '" + base.name + " - post.txt' (2–3 opciones de caption + hashtags)")


def cmd_prueba(a):
    """Prueba de humo de toda la skill con un clip sintético (voz de macOS en español + patrón de prueba).
    Úsalo después de modificar la skill: si todo sale ✓, el pipeline completo funciona."""
    import time
    t0 = time.time()
    d = TK / 'cache' / 'autoprueba'
    if d.exists():
        shutil.rmtree(d)
    (d / 'material').mkdir(parents=True)
    me = [sys.executable, __file__]
    res = []

    def step(name, cmd, check=None):
        t = time.time()
        r = subprocess.run([str(c) for c in cmd], capture_output=True, text=True)
        ok = r.returncode == 0 and (check(r.stdout) if check else True)
        res.append((name, ok, time.time() - t))
        print(f"{'✓' if ok else '✗'} {name:<14} {time.time() - t:5.1f} s")
        if not ok:
            print((r.stdout + r.stderr)[-1500:])
            raise SystemExit(1)
        return r.stdout

    voces = subprocess.run(['say', '-v', '?'], capture_output=True, text=True).stdout
    voz = next((l.split('  ')[0].strip() for l in voces.splitlines() if 'es_MX' in l), None) or 'Paulina'
    texto = ("Hola, hoy vamos a ver. [[slnc 1200]] Hoy vamos a ver qué traigo en mi mochila. [[slnc 900]] "
             "Tengo un cuaderno, [[slnc 700]] un lápiz y una botella de agua. [[slnc 1500]] Y ya es todo.")
    step('voz (say)', ['say', '-v', voz, '-o', d / 'voz.aiff', texto])
    step('clip', ['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=s=1080x1920:r=30', '-i', d / 'voz.aiff',
                  '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-fflags', '+bitexact', '-flags:v', '+bitexact', '-metadata', 'encoder=camara',
                  d / 'material' / 'CLIP01.mov'])  # bitexact: sin etiqueta Lavf (si no, inventario lo toma por un render)
    P = d / 'material' / 'proyecto_remotion'
    step('nuevo', [*me, 'nuevo', d / 'material', '--estilo', 'humor-comparacion', '--nombre', 'autoprueba'])
    step('inventario', [*me, 'inventario', '-p', P],
         lambda o: any(v['clip'] == 'CLIP01' for v in jload(P / 'edicion' / 'inventario.json')['videos']))  # el clip cuenta como material
    step('transcribir', [*me, 'transcribir', '-p', P, '--prompt', 'mochila, cuaderno, lápiz'], lambda o: 'palabras' in o)
    W_ = jload(P / 'edicion' / 'palabras' / 'CLIP01.json')
    nw = [norm(w[0]) for w in W_]
    hoy = [i for i, w in enumerate(nw) if w == 'hoy']
    if len(hoy) < 2:
        print("✗ transcripción inesperada:", ' '.join(w[0] for w in W_)); raise SystemExit(1)
    jsave(P / 'edicion' / 'plan.json', {"piezas": [{"src": "CLIP01", "de": hoy[1], "a": len(W_) - 1, "sec": "main"}]})
    step('tomas', [*me, 'tomas', '-p', P], lambda o: 'toma' in o)
    step('edl', [*me, 'edl', '-p', P])
    step('cortar', [*me, 'cortar', '-p', P, '--verificar'], lambda o: 'cuaderno' in o.lower())
    jsave(P / 'edicion' / 'eventos.json', {
        "secciones": {"main": {"zoom": 1.0, "caras": 1, "contador": {"label": "PRUEBA", "color": "#2F80ED"}}},
        "gancho": {"top": 820, "dur": 1.5, "elementos": [{"tipo": "texto", "texto": "AUTOPRUEBA", "fuente": "Lilita One", "size": 120}]},
        "fix": {"lópez": "lápiz"}, "objetos": ["cuaderno", "botella"], "zooms": [{"en": "cuaderno", "dur": 1.2, "cx": 0.5, "cy": 0.5}],
        "sfx": [{"en": "todo", "sfx": "boom", "vol": 0.4}], "etiquetas": [{"en": "mochila", "dur": 1.5, "texto": "ETIQUETA"}]})
    step('datos', [*me, 'datos', '-p', P], lambda o: 'objetos 2' in o)
    step('revisar', [*me, 'revisar', '-p', P, '20', '90'])
    step('borrador', [*me, 'render', '-p', P, '--borrador'], lambda o: 'borrador' in o)
    step('render', [*me, 'render', '-p', P, '--nota', 'autoprueba'], lambda o: 'ninguno ✓' in o and 'bt709/bt709' in o)
    step('extras', [*me, 'extras', '-p', P])
    step('limpiar', [*me, 'limpiar', '-p', P])
    print(f"✓ AUTOPRUEBA OK — {len(res)} pasos en {time.time() - t0:.0f} s  (resultado: {d / 'material' / 'autoprueba.mp4'})")


def cmd_revision(a):
    """Prepara la página de revisión (borrador + notas con código de tiempo que Claude lee con ArtifactData).
    Primera vez: genera el HTML con el video pendiente → Claude lo publica (capabilities db+user+assets), sube el
    video como asset y vuelve a correr este comando con --video-url y --artifact para republicar con el video."""
    import datetime
    pr = Proyecto(a.proyecto)
    d = pr.ed / 'revision'
    d.mkdir(exist_ok=True)
    bor = pr.ed / 'borrador.mp4'
    if not bor.exists() or a.renderizar:
        cmd_render(argparse.Namespace(proyecto=a.proyecto, borrador=True, lufs=-14.0, salida=None, nota=None))
    web = d / 'borrador_web.mp4'
    dur = float(probe(bor)['format']['duration'])
    if not web.exists() or web.stat().st_mtime < bor.stat().st_mtime:
        kbps = int(min(2500, (17 * 8 * 1024) / dur - 128))  # ≤ ~17 MiB (límite de assets: 20 MiB)
        ff('-i', bor, '-c:v', 'libx264', '-preset', 'medium', '-b:v', f'{kbps}k', '-maxrate', f'{int(kbps * 1.3)}k', '-bufsize', f'{kbps * 2}k',
           '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', web)
    hist = pr.ed / 'cambios.md'
    version = a.version or (1 + sum(1 for l in (hist.read_text().splitlines() if hist.exists() else []) if l.startswith('## v')))
    if a.artifact:
        pr.cfg['revision_url'] = a.artifact
        pr.guardar_cfg()
    cfg = {"titulo": f"Revisión · {pr.cfg['nombre']}", "version": version, "video_url": a.video_url or "__VIDEO__", "duracion": round(dur, 2),
           "fps": FPS, "nota": a.nota or f"Borrador v{version} ({dur:.0f} s). Pausa donde quieras un cambio y deja una nota: queda guardada en ese cuadro exacto.",
           "creado": f"{datetime.datetime.now():%Y-%m-%d %H:%M}"}
    tpl = (SKILL / 'revision' / 'plantilla.html').read_text()
    html = tpl.replace('__TITULO__', f"Revisión {pr.cfg['nombre']}"[:60]).replace('__CFG__', json.dumps(cfg, ensure_ascii=False).replace('</', '<\\/'))
    out = d / 'revision.html'
    out.write_text(html)
    mb = web.stat().st_size / 1048576
    print(f"✓ {out}\n✓ {web}  ({mb:.1f} MB, {dur:.1f} s)")
    if not a.video_url:
        print("→ siguiente (Claude): 1) Artifact publish file_path=revision.html con capabilities {db:{}, user:{}, assets:{}}, icon 'video'"
              "\n                     2) Artifact publish url=<artifact> file_path=borrador_web.mp4 asset=true  → url del video"
              f"\n                     3) reel revision -p \"{pr.P}\" --video-url <url> --artifact <artifact>  y republica revision.html al mismo url"
              + (f"\n  (este proyecto ya tiene página: {pr.cfg['revision_url']})" if pr.cfg.get('revision_url') else ''))
    else:
        print(f"→ republica {out} en {pr.cfg.get('revision_url', '<artifact>')}. Notas: ArtifactData list collection 'comentarios';"
              " al aplicar una: update estado='aplicado' y respuesta='qué se hizo'.")


def cmd_actualizar(a):
    """Copia la plantilla actual de la skill (componentes, tema, SFX) a un proyecto existente.
    No toca data.json ni estilo.json. Lo que se reemplaza queda respaldado en edicion/respaldo/<fecha>/."""
    import datetime
    import filecmp
    pr = Proyecto(a.proyecto)
    tpl = SKILL / 'plantilla_remotion'
    bk = pr.ed / 'respaldo' / f"{datetime.datetime.now():%Y%m%d-%H%M%S}"
    changed = []
    for f in tpl.rglob('*'):
        rel = f.relative_to(tpl)
        if f.is_dir() or rel.name in ('data.json', 'estilo.json', 'vlog.json') or 'node_modules' in rel.parts:
            continue
        dst = pr.P / rel
        if dst.exists() and filecmp.cmp(f, dst, shallow=False):
            continue
        if dst.exists():
            (bk / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(dst, bk / rel)
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(f, dst)
        changed.append(str(rel))
    print(f"✓ {len(changed)} archivos actualizados" + (f" (respaldo en {bk})" if bk.exists() else ""))
    for c in changed:
        print("  ", c)


def cmd_notas(a):
    """Notas de revisión de Reel Studio (edicion/notas.json): listarlas y marcarlas como aplicadas con una respuesta."""
    pr = Proyecto(a.proyecto)
    f = pr.ed / 'notas.json'
    notas = jload(f, [])
    if a.marcar:
        hits = [n for n in notas if str(n.get('id', '')).startswith(a.marcar)]
        if len(hits) != 1:
            sys.exit(f"✗ {len(hits)} notas coinciden con '{a.marcar}' (usa más caracteres del id)")
        n = hits[0]
        n['estado'] = 'pendiente' if a.reabrir else 'aplicado'
        if a.respuesta:
            n['respuesta'] = a.respuesta
        jsave(f, notas, indent=2)
        print(f"✓ nota {n['id'][:8]} → {n['estado']}" + (f": {a.respuesta}" if a.respuesta else ''))
        return
    pend = sorted([n for n in notas if n.get('estado') != 'aplicado'], key=lambda n: n.get('t', 0))
    hechas = [n for n in notas if n.get('estado') == 'aplicado']
    print(f"notas: {len(pend)} pendientes · {len(hechas)} aplicadas  (edicion/notas.json)")
    for n in pend + ([] if not a.todas else sorted(hechas, key=lambda n: n.get('t', 0))):
        t = float(n.get('t', 0))
        print(f"  [{str(n.get('id', ''))[:8]}] {int(t // 60)}:{t % 60:05.2f}  cuadro {round(t * FPS)}  {n.get('estado', 'pendiente')}  {n.get('texto', '')}"
              + (f"  → {n['respuesta']}" if n.get('respuesta') else ''))
    if pend:
        print("→ aplica cada una y márcala:  reel notas -p P --marcar <id> --respuesta \"qué hiciste\"")


def cmd_limpiar(a):
    pr = Proyecto(a.proyecto)
    sz = sum(f.stat().st_size for f in pr.cache.rglob('*') if f.is_file()) / 1e9
    shutil.rmtree(pr.cache)
    print(f"✓ caché borrada ({sz:.2f} GB): {pr.cache}")


# ---------------------------------------------------------------- énfasis (sugiere; Claude decide con el guion)
def cmd_enfasis(a):
    """Puntúa cada palabra del corte por énfasis acústico (volumen + tono + duración vs. sus vecinas) → candidatas a "enfasis"."""
    import numpy as np
    import wave
    pr = Proyecto(a.proyecto)
    D = jload(pr.P / 'src' / 'data.json')
    src = pr.P / 'public' / ('cut_voz.mp4' if (pr.P / 'public' / 'cut_voz.mp4').exists() else 'cut.mp4')
    wav = pr.cache / 'enfasis.wav'
    ff('-i', src, '-vn', '-ac', '1', '-ar', '16000', wav)
    w = wave.open(str(wav)); x = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768; sr = 16000
    def f0(seg):
        seg = seg - seg.mean()
        if len(seg) < 800 or np.sqrt((seg ** 2).mean()) < 0.01:
            return np.nan
        fr = []
        for i in range(0, len(seg) - 640, 320):
            c = seg[i:i + 640]; ac = np.correlate(c, c, 'full')[639:]
            lo, hi = int(sr / 400), int(sr / 70); k = lo + int(np.argmax(ac[lo:hi]))
            if ac[k] > 0.4 * ac[0]:
                fr.append(sr / k)
        return float(np.median(fr)) if fr else np.nan
    rows = []
    for wd in D['words']:
        seg = x[int(wd['start'] * sr):int(min(wd['end'], wd['start'] + 0.8) * sr)]
        rows.append((wd, 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9) if len(seg) else -90, f0(seg), wd['end'] - wd['start']))
    R = np.array([r[1] for r in rows]); Pp = np.array([r[2] for r in rows]); Du = np.array([r[3] for r in rows])
    z = lambda v, arr, lo, hi: (v - np.nanmean(arr[lo:hi])) / (np.nanstd(arr[lo:hi]) + 1e-6)
    print("palabra            sec       s      score   (*** fuerte · * medio; ignora artículos/conectores y decide con el sentido)")
    for k, (wd, r, p, du) in enumerate(rows):
        lo, hi = max(0, k - 6), min(len(rows), k + 7)
        zp = 0 if np.isnan(p) else z(p, Pp, lo, hi)
        sc = 0.45 * z(r, R, lo, hi) + 0.35 * (0 if np.isnan(zp) else zp) + 0.2 * z(du, Du, lo, hi)
        if sc > a.umbral and len(norm(wd['text'])) > 2:
            print(f"{wd['text']:<18} {wd['sec']:<8} {wd['start']:6.2f}  {sc:+.2f} {'***' if sc > 0.9 else '*'}")


# ---------------------------------------------------------------- CLI
def main():
    ap = argparse.ArgumentParser(prog='reel', description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    s = sp.add_parser('nuevo'); s.add_argument('carpeta'); s.add_argument('--estilo', required=True); s.add_argument('--nombre')
    s.add_argument('--destino'); s.add_argument('--forzar', action='store_true'); s.add_argument('--marca'); s.set_defaults(fn=cmd_nuevo)
    s = sp.add_parser('marca'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('marca'); s.set_defaults(fn=cmd_marca)
    for name, fn in (('inventario', cmd_inventario), ('datos', cmd_datos), ('edl', cmd_edl), ('limpiar', cmd_limpiar), ('actualizar', cmd_actualizar),
                     ('proxy', cmd_proxy)):
        s = sp.add_parser(name); s.add_argument('-p', '--proyecto', required=True); s.set_defaults(fn=fn)
    s = sp.add_parser('sdr'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('clips', nargs='*'); s.set_defaults(fn=cmd_sdr)
    s = sp.add_parser('transcribir'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('clips', nargs='*')
    s.add_argument('--prompt'); s.set_defaults(fn=cmd_transcribir)
    s = sp.add_parser('buscar'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('frase'); s.add_argument('--clip'); s.set_defaults(fn=cmd_buscar)
    s = sp.add_parser('cortar'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('--verificar', action='store_true')
    s.add_argument('--iter', type=int, default=3); s.add_argument('--db', type=float, default=-40); s.add_argument('--min', type=float, default=0.35)
    s.add_argument('--keep', type=float, default=0.12); s.set_defaults(fn=cmd_cortar)
    s = sp.add_parser('cuadricula'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('tiempos', nargs='+'); s.set_defaults(fn=cmd_cuadricula)
    s = sp.add_parser('revisar'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('frames', nargs='+', type=int)
    s.add_argument('--sin-guias', action='store_true'); s.set_defaults(fn=cmd_revisar)
    s = sp.add_parser('recorte'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('--frames', type=int, default=120); s.set_defaults(fn=cmd_recorte)
    s = sp.add_parser('enfasis'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('--umbral', type=float, default=0.55); s.set_defaults(fn=cmd_enfasis)
    s = sp.add_parser('render'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('--salida'); s.add_argument('--lufs', type=float, default=-12.0)
    s.add_argument('--borrador', action='store_true', help='render rápido a 540x960 en edicion/borrador.mp4')
    s.add_argument('--4k', dest='k4', action='store_true', help='final a 2160x3840 (solo con el visto bueno; ~4× más lento)')
    s.add_argument('--nota', help='qué cambió en esta versión (va a edicion/cambios.md)')
    s.set_defaults(fn=cmd_render)
    s = sp.add_parser('prueba'); s.set_defaults(fn=cmd_prueba)
    s = sp.add_parser('notas', help='notas de revisión de Reel Studio (edicion/notas.json)')
    s.add_argument('-p', '--proyecto', required=True); s.add_argument('--marcar', help='id (o inicio del id) de la nota')
    s.add_argument('--respuesta'); s.add_argument('--reabrir', action='store_true'); s.add_argument('--todas', action='store_true')
    s.set_defaults(fn=cmd_notas)
    s = sp.add_parser('lentes', help='quita el reflejo azul de los lentes en una sección (se reaplica en cada cortar)')
    s.add_argument('-p', '--proyecto', required=True); s.add_argument('--sec', default='intro'); s.add_argument('--fuerza', type=float, default=0.88)
    s.add_argument('--quitar', action='store_true'); s.set_defaults(fn=cmd_lentes)
    s = sp.add_parser('capas', help='pre-renderiza la intro 3D (intro_espacio) como capa transparente reutilizable')
    s.add_argument('-p', '--proyecto', required=True); s.add_argument('--forzar', action='store_true'); s.set_defaults(fn=cmd_capas)
    s = sp.add_parser('tomas'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('clips', nargs='*'); s.set_defaults(fn=cmd_tomas)
    s = sp.add_parser('zooms'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('--todos', action='store_true'); s.set_defaults(fn=cmd_zooms)
    s = sp.add_parser('niveles'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('--aplicar', action='store_true'); s.set_defaults(fn=cmd_niveles)
    s = sp.add_parser('revision'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('--video-url'); s.add_argument('--artifact')
    s.add_argument('--version', type=int); s.add_argument('--nota'); s.add_argument('--renderizar', action='store_true'); s.set_defaults(fn=cmd_revision)
    s = sp.add_parser('extras'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('--frame', type=int); s.set_defaults(fn=cmd_extras)
    s = sp.add_parser('audio'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('clip'); s.add_argument('archivo')
    s.add_argument('--offset', type=float); s.set_defaults(fn=cmd_audio)
    s = sp.add_parser('logos'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('empresas', nargs='+'); s.set_defaults(fn=cmd_logos)
    s = sp.add_parser('qr'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('foto'); s.add_argument('--nombre')
    s.add_argument('--margen', type=float, default=0.32); s.set_defaults(fn=cmd_qr)
    s = sp.add_parser('broll'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('clip'); s.add_argument('--de', type=float, required=True)
    s.add_argument('--dur', type=float, default=3.0); s.add_argument('--nombre'); s.set_defaults(fn=cmd_broll)
    s = sp.add_parser('dividir'); s.add_argument('-p', '--proyecto', required=True); s.add_argument('--partes', nargs='+', required=True, help='"intro,p1,p2" "p3,p4"')
    s.add_argument('--nombres', nargs='+', required=True); s.set_defaults(fn=cmd_dividir)
    global JSON_MODE
    argv = sys.argv[1:]
    if '--json' in argv or os.environ.get('REEL_JSON') == '1':
        argv = [x for x in argv if x != '--json']
        JSON_MODE = True
    a = ap.parse_args(argv)
    if not JSON_MODE:
        return a.fn(a)
    out = SalidaJSON(sys.stdout)
    sys.stdout = out
    try:
        a.fn(a)
        out.flush()
    except SystemExit as e:
        out.flush()
        if e.code not in (None, 0):
            if isinstance(e.code, str):
                for linea in e.code.splitlines():
                    out.emitir(linea, 'error' if linea.strip().startswith('✗') else 'info')
            raise SystemExit(1)
    except subprocess.CalledProcessError as e:
        out.flush()
        out.emitir(f"✗ falló un proceso externo: {e.cmd if isinstance(e.cmd, str) else ' '.join(map(str, e.cmd))[:300]}", 'error')
        raise SystemExit(1)


if __name__ == '__main__':
    main()
