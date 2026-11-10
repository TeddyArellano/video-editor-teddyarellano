// Proyectos de /editar-reel: abrir, estado, recientes y vigilancia de cambios hechos por otros (Claude, reel.py).
import {app} from 'electron';
import chokidar, {type FSWatcher} from 'chokidar';
import {execFile} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {ARCHIVOS, type Archivo, type CambioArchivo, type ProyectoInfo, type Reciente, type Snapshot} from '../shared/tipos';
import {hashArchivo, leerJSON} from './archivos';
import {baseDe, dejarDeServir, servirProyecto} from './medios';
import {TOOLKIT, entorno, plantillaDir} from './rutas';

type Abierto = {id: string; ruta: string; vigilante: FSWatcher};
export const abiertos = new Map<string, Abierto>();
export const propias = new Set<string>(); // "<archivo>:<hash>" escritos por la app

// acepta la carpeta proyecto_remotion o la del material que la contiene
export const normalizarRuta = (ruta: string): string => {
  const r = fs.realpathSync(path.resolve(ruta)); // igual que Path.resolve() de reel.py (/var → /private/var)
  if (fs.existsSync(path.join(r, 'edicion', 'proyecto.json'))) return r;
  if (fs.existsSync(path.join(r, 'proyecto_remotion', 'edicion', 'proyecto.json'))) return path.join(r, 'proyecto_remotion');
  throw new Error(`${r} no es un proyecto de editar-reel (falta edicion/proyecto.json)`);
};

// mismo id que reel.py (proyecto.json → id, o md5 de la ruta para proyectos que aún no lo tienen)
// Si falta, se guarda en proyecto.json como lo haría reel.py (conservando la fecha del archivo, que `transcribir` compara):
// así el id no cambia a media sesión cuando reel.py lo escriba.
export const idDe = (ruta: string): string => {
  const f = path.join(ruta, 'edicion', 'proyecto.json');
  const cfg = (leerJSON(f)?.contenido ?? {}) as {id?: string};
  if (cfg.id) return cfg.id;
  const id = crypto.createHash('md5').update(fs.realpathSync(ruta)).digest('hex').slice(0, 10);
  const st = fs.statSync(f);
  fs.writeFileSync(f, JSON.stringify({...cfg, id}, null, 1));
  fs.utimesSync(f, st.atime, st.mtime);
  return id;
};

const mtime = (f: string) => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0);

const componentesPropios = (ruta: string): string[] => {
  const out: string[] = [];
  const pl = path.join(plantillaDir(), 'src');
  const revisar = (rel: string) => {
    const a = path.join(ruta, 'src', rel);
    const b = path.join(pl, rel);
    if (!fs.existsSync(a)) return;
    if (!fs.existsSync(b) || fs.readFileSync(a, 'utf8') !== fs.readFileSync(b, 'utf8')) out.push(rel);
  };
  for (const f of ['Reel.tsx', 'Root.tsx', 'theme.ts']) revisar(f);
  const comps = path.join(ruta, 'src', 'components');
  if (fs.existsSync(comps)) for (const f of fs.readdirSync(comps)) if (/\.tsx?$/.test(f)) revisar(path.join('components', f));
  return out;
};

export const infoDe = (ruta: string): ProyectoInfo => {
  const cfg = (leerJSON(path.join(ruta, 'edicion', 'proyecto.json'))?.contenido ?? {}) as Record<string, string>;
  const id = idDe(ruta);
  const pal = path.join(ruta, 'edicion', 'palabras');
  const clips = fs.existsSync(pal) ? fs.readdirSync(pal).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort() : [];
  const cut = path.join(ruta, 'public', 'cut.mp4');
  const proxy = path.join(ruta, 'public', 'cut_proxy.mp4');
  const carpeta = cfg.fuentes ?? path.dirname(ruta);
  return {
    id,
    ruta,
    carpeta,
    nombre: cfg.nombre ?? path.basename(carpeta),
    estilo: cfg.estilo ?? '',
    base: baseDe(id),
    versionCorte: Math.round(Math.max(mtime(cut), mtime(proxy))),
    clips,
    estado: {
      transcrito: clips.length > 0,
      plan: fs.existsSync(path.join(ruta, 'edicion', 'plan.json')),
      cortado: fs.existsSync(cut),
      datos: fs.existsSync(path.join(ruta, 'src', 'data.json')) && fs.existsSync(cut),
      borrador: fs.existsSync(path.join(ruta, 'edicion', 'borrador.mp4')),
      final: fs.existsSync(path.join(carpeta, `${cfg.nombre}.mp4`)),
      proxy: fs.existsSync(proxy) && mtime(proxy) >= mtime(cut),
      componentesPropios: componentesPropios(ruta),
    },
  };
};

export const snapshot = (ruta: string): Snapshot => {
  const archivos = {} as Snapshot['archivos'];
  for (const a of ARCHIVOS) archivos[a] = leerJSON(path.join(ruta, a));
  return {info: infoDe(ruta), archivos};
};

// ---------------------------------------------------------------- recientes
const fRecientes = () => path.join(app.getPath('userData'), 'recientes.json');
// el registro lo escribe reel.py cada vez que la skill toca un proyecto: así aparece aunque nunca se haya abierto en la app
const fRegistro = () => process.env.REEL_REGISTRO || path.join(TOOLKIT, 'proyectos.json');
const leerLista = <T>(f: string): T[] => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8')) as T[];
  } catch {
    return [];
  }
};
const existe = (r: {ruta: string}) => fs.existsSync(path.join(r.ruta, 'edicion', 'proyecto.json'));
export const recientes = (): Reciente[] => {
  const m = new Map<string, Reciente>();
  for (const r of leerLista<Reciente>(fRecientes())) m.set(r.ruta, {...r, editado: r.editado ?? 0});
  for (const r of leerLista<Omit<Reciente, 'abierto'>>(fRegistro())) {
    const a = m.get(r.ruta);
    m.set(r.ruta, {ruta: r.ruta, nombre: r.nombre, estilo: r.estilo, abierto: a?.abierto ?? 0, editado: Math.max(r.editado ?? 0, a?.editado ?? 0)});
  }
  return [...m.values()].filter(existe).sort((a, b) => Math.max(b.abierto, b.editado) - Math.max(a.abierto, a.editado));
};
const anotarReciente = (info: ProyectoInfo) => {
  const propios = leerLista<Reciente>(fRecientes()).filter((r) => r.ruta !== info.ruta);
  const l = [{ruta: info.ruta, nombre: info.nombre, abierto: Date.now(), editado: 0, estilo: info.estilo}, ...propios].slice(0, 200);
  fs.mkdirSync(path.dirname(fRecientes()), {recursive: true});
  fs.writeFileSync(fRecientes(), JSON.stringify(l, null, 2));
};

// avisa a la biblioteca cuando la skill registra un video con la app abierta
let vigiaRegistro: FSWatcher | null = null;
export const vigilarRegistro = (avisar: () => void) => {
  vigiaRegistro?.close();
  vigiaRegistro = chokidar.watch(fRegistro(), {ignoreInitial: true, awaitWriteFinish: {stabilityThreshold: 150, pollInterval: 50}});
  vigiaRegistro.on('add', avisar).on('change', avisar);
};
export const dejarDeVigilarRegistro = () => vigiaRegistro?.close();

// póster de la tarjeta: un cuadro del corte, en caché mientras el video no cambie (de uno en uno: ffmpeg es pesado)
let filaMiniaturas: Promise<unknown> = Promise.resolve();
export const miniatura = (ruta: string): Promise<string | null> => {
  const hacer = async () => {
    const video = ['cut_proxy.mp4', 'cut.mp4'].map((x) => path.join(ruta, 'public', x)).find((x) => fs.existsSync(x));
    if (!video) return null;
    const dir = path.join(app.getPath('userData'), 'miniaturas');
    const f = path.join(dir, `${crypto.createHash('md5').update(`${ruta}:${mtime(video)}`).digest('hex')}.jpg`);
    if (!fs.existsSync(f)) {
      fs.mkdirSync(dir, {recursive: true});
      await new Promise<void>((ok, mal) =>
        execFile('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-ss', '1.2', '-i', video, '-frames:v', '1', '-vf', 'scale=270:-2', '-q:v', '5', f], {env: entorno(), timeout: 20_000}, (e) => (e ? mal(e) : ok())),
      );
    }
    return `data:image/jpeg;base64,${fs.readFileSync(f).toString('base64')}`;
  };
  const r = filaMiniaturas.then(hacer, hacer).catch(() => null);
  filaMiniaturas = r;
  return r;
};

// ---------------------------------------------------------------- abrir / cerrar
export const abrir = (rutaIn: string, avisar: (c: CambioArchivo) => void): Snapshot => {
  const ruta = normalizarRuta(rutaIn);
  const id = idDe(ruta);
  if (!abiertos.has(id)) {
    servirProyecto(id, ruta, infoDe(ruta).carpeta);
    const vigilados = new Set<string>([...ARCHIVOS.map((a) => path.join(ruta, a)), path.join(ruta, 'public', 'cut.mp4')]);
    const vigilante = chokidar.watch([path.join(ruta, 'edicion'), path.join(ruta, 'src'), path.join(ruta, 'public')], {
      depth: 0,
      ignoreInitial: true,
      awaitWriteFinish: {stabilityThreshold: 250, pollInterval: 50},
    });
    const alCambiar = (f: string) => {
      if (!vigilados.has(f)) return;
      const rel = path.relative(ruta, f) as Archivo | 'public/cut.mp4';
      const h = rel === 'public/cut.mp4' ? String(mtime(f)) : hashArchivo(f);
      if (h && propias.has(`${f}:${h}`)) return; // lo escribió la app
      avisar({proyecto: id, archivo: rel, hash: h});
    };
    vigilante.on('add', alCambiar).on('change', alCambiar).on('unlink', alCambiar);
    abiertos.set(id, {id, ruta, vigilante});
  }
  const s = snapshot(ruta);
  anotarReciente(s.info);
  return s;
};

export const cerrar = async (id: string) => {
  const a = abiertos.get(id);
  if (!a) return;
  await a.vigilante.close();
  abiertos.delete(id);
  dejarDeServir(id);
};

export const rutaDe = (id: string): string => {
  const a = abiertos.get(id);
  if (!a) throw new Error(`proyecto ${id} no está abierto`);
  return a.ruta;
};
